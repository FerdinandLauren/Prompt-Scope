import "server-only";
import type { z } from "zod";
import type { AiModelSummary } from "@/types/ai";
import type { AiProviderAdapter, AdapterCall } from "@/lib/ai/providers/adapter";
import type { GeneratedText, TokenUsage } from "@/lib/ai/structured";
import { AiError, normalizeProviderError } from "@/lib/ai/errors";
import { runStructuredAttempt } from "@/lib/ai/structured";
import { toOpenAiJsonSchema } from "@/lib/ai/schemas";
import type { ResolvedProvider } from "@/lib/ai/providers/config";

const DEFAULT_TIMEOUT_MS = 90_000;
const MODEL_PROBE_TIMEOUT_MS = 10_000;
const GENERATE_TIMEOUT_MS = 45_000;

/**
 * Some OpenAI-compatible gateways reject `response_format`. That is remembered
 * per provider/model so the next request skips the doomed first attempt.
 */
const schemaUnsupported = new Set<string>();

function schemaKey(provider: ResolvedProvider, model: string) {
  return `${provider.id}:${provider.baseUrl ?? ""}:${model}`;
}

function requireConfig(provider: ResolvedProvider) {
  if (!provider.baseUrl) {
    throw new AiError("invalid_request", `${provider.meta.label} has no usable base URL.`, {
      retryable: false,
      detail: provider.configError ?? "base URL missing",
    });
  }
  if (!provider.key) {
    throw new AiError("missing_api_key", `No ${provider.meta.label} API key is configured.`, {
      retryable: false,
    });
  }
  return { baseUrl: provider.baseUrl, key: provider.key };
}

function retryAfterMs(headers: Headers): number | undefined {
  const raw = headers.get("retry-after")?.trim();
  if (!raw) return undefined;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);

  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

async function readError(response: Response, key: string): Promise<AiError> {
  const raw = await response.text().catch(() => "");
  let message = raw.slice(0, 2_000);
  try {
    const payload = JSON.parse(raw) as {
      error?: { message?: string; code?: string; type?: string };
      message?: string;
    };
    message = payload.error?.message || payload.message || message;
  } catch {
    // Keep the plain body; it is still redacted before it reaches a log.
  }

  const normalized = normalizeProviderError(
    Object.assign(new Error(message || `HTTP ${response.status}`), {
      status: response.status,
      retryAfterMs: retryAfterMs(response.headers),
    }),
    [key],
  );
  return normalized;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AiError("timeout", "The provider did not respond in time.", {
        retryable: true,
        cause: error,
      });
    }
    throw new AiError("network", "The provider could not be reached.", {
      retryable: true,
      cause: error,
    });
  } finally {
    clearTimeout(timer);
  }
}

type ChatPayload = {
  choices?: Array<{
    message?: { content?: string | Array<{ type?: string; text?: string }> };
    delta?: { content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string; type?: string; code?: string };
};

function textFrom(payload: ChatPayload): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text ?? ""))
      .join("");
  }
  return "";
}

function usageFrom(payload: ChatPayload): TokenUsage | undefined {
  const usage = payload.usage;
  if (!usage) return undefined;
  const inputTokens = usage.prompt_tokens ?? null;
  const outputTokens = usage.completion_tokens ?? null;
  const totalTokens =
    usage.total_tokens ??
    (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
  if (inputTokens === null && outputTokens === null && totalTokens === null) return undefined;
  return { inputTokens, outputTokens, totalTokens };
}

function assertComplete(payload: ChatPayload, label: string) {
  const reason = payload.choices?.[0]?.finish_reason;
  if (reason === "length") {
    throw new AiError("invalid_response", `${label}: the provider response was truncated.`, {
      retryable: false,
      detail: "The provider stopped at max_tokens before the response was complete.",
    });
  }
  if (reason === "content_filter") {
    throw new AiError("invalid_response", `${label}: the provider filtered the response.`, {
      retryable: false,
    });
  }
}

function chatUrl(baseUrl: string) {
  return `${baseUrl}/chat/completions`;
}

function modelsUrl(baseUrl: string) {
  return `${baseUrl}/models`;
}

async function postChat(
  call: AdapterCall,
  body: Record<string, unknown>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ChatPayload> {
  const { baseUrl, key } = requireConfig(call.provider);

  const response = await fetchWithTimeout(
    chatUrl(baseUrl),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );

  if (!response.ok) throw await readError(response, key);

  try {
    return (await response.json()) as ChatPayload;
  } catch (error) {
    throw new AiError("invalid_response", `${call.label}: the provider response was not JSON.`, {
      retryable: false,
      cause: error,
    });
  }
}

function baseBody(
  call: Pick<AdapterCall, "model" | "systemInstruction">,
  prompt: string,
  temperature: number,
  maxTokens: number,
): Record<string, unknown> {
  return {
    model: call.model,
    messages: [
      { role: "system", content: call.systemInstruction },
      { role: "user", content: prompt },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };
}

async function chat(
  call: AdapterCall,
  prompt: string,
  schemaBody?: Record<string, unknown>,
): Promise<ChatPayload> {
  const body = { ...baseBody(call, prompt, call.temperature, call.maxOutputTokens), ...schemaBody };
  const key = schemaKey(call.provider, call.model);

  if (schemaBody && schemaUnsupported.has(key)) {
    delete body.response_format;
  }

  try {
    return await postChat(call, body);
  } catch (error) {
    const normalized = normalizeProviderError(error, [call.provider.key]);
    const unsupported =
      schemaBody &&
      normalized.code === "invalid_request" &&
      /response_format|json_schema|json schema|response format|unsupported/i.test(
        normalized.detail ?? "",
      );

    if (unsupported) {
      schemaUnsupported.add(key);
      // Without `response_format`, the prompt itself must ask for JSON.
      const fallbackBody = {
        ...baseBody(
          {
            model: call.model,
            systemInstruction: `${call.systemInstruction}\n\nReturn only the complete JSON object requested by the user. Do not add commentary or code fences.`,
          },
          prompt,
          call.temperature,
          call.maxOutputTokens,
        ),
      };
      return postChat(call, fallbackBody);
    }
    throw normalized;
  }
}

async function generateText(call: AdapterCall): Promise<GeneratedText> {
  const payload = await chat(call, call.userPrompt);
  const text = textFrom(payload);
  if (!text.trim()) {
    throw new AiError("invalid_response", `${call.label}: the provider returned an empty response.`);
  }
  assertComplete(payload, call.label);
  return { text, usage: usageFrom(payload) };
}

async function generateStructured<T>(
  call: AdapterCall,
  schema: z.ZodType<T>,
  validate?: (data: T) => string | null,
) {
  const jsonSchema = toOpenAiJsonSchema(schema);

  return runStructuredAttempt<T>({
    userPrompt: call.userPrompt,
    schema,
    label: call.label,
    validate,
    generate: async (prompt) => {
      const payload = await chat(call, prompt, {
        response_format: {
          type: "json_schema",
          json_schema: {
            name: `promptscope_${call.label}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64),
            schema: jsonSchema,
          },
        },
      });
      assertComplete(payload, call.label);
      return { text: textFrom(payload), usage: usageFrom(payload) };
    },
  });
}

async function listModels(provider: ResolvedProvider, timeoutMs: number): Promise<AiModelSummary[]> {
  const { baseUrl, key } = requireConfig(provider);
  const response = await fetchWithTimeout(
    modelsUrl(baseUrl),
    {
      method: "GET",
      headers: { authorization: `Bearer ${key}`, accept: "application/json" },
    },
    timeoutMs,
  );

  if (!response.ok) throw await readError(response, key);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new AiError("invalid_response", "The provider model list was not JSON.", {
      retryable: false,
      cause: error,
    });
  }

  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    throw new AiError("invalid_response", "The provider model list was not recognised.", {
      retryable: false,
    });
  }

  return data
    .filter((entry): entry is { id: string; context_window?: number } =>
      Boolean(entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string"),
    )
    .map((entry) => ({
      id: entry.id,
      label: entry.id,
      contextWindow:
        typeof entry.context_window === "number" && entry.context_window > 0
          ? entry.context_window
          : null,
      maxOutputTokens: null,
      complexity: ["simple", "medium", "high"] as AiModelSummary["complexity"],
      source: "discovered" as const,
    }));
}

async function verify(
  call: Omit<AdapterCall, "systemInstruction" | "userPrompt" | "label" | "temperature">,
) {
  const { baseUrl, key } = requireConfig(call.provider);
  let confirmed = false;

  // The model list is a cheap proof that the base URL, key and account are
  // accepted. A gateway without /models still gets the generation check.
  const probe = await fetchWithTimeout(
    modelsUrl(baseUrl),
    { method: "GET", headers: { authorization: `Bearer ${key}`, accept: "application/json" } },
    MODEL_PROBE_TIMEOUT_MS,
  ).catch((error: unknown) => {
    if (error instanceof AiError && error.code === "timeout") return null;
    throw error;
  });

  if (probe) {
    if (!probe.ok) {
      if (probe.status !== 404 && probe.status !== 405) throw await readError(probe, key);
    } else {
      confirmed = true;
    }
  }

  const payload = await postChat(
    {
      ...call,
      systemInstruction: "You are a connectivity check.",
      userPrompt: "Reply with the single word: ok",
      temperature: 0,
      label: "verify",
    },
    {
      model: call.model,
      messages: [
        { role: "system", content: "You are a connectivity check." },
        { role: "user", content: "Reply with the single word: ok" },
      ],
      temperature: 0,
      max_tokens: 96,
      stream: false,
    },
    GENERATE_TIMEOUT_MS,
  ).catch((error: unknown) => {
    const normalized = normalizeProviderError(error, [call.provider.key]);
    if (confirmed && normalized.code === "timeout") return { slow: true } as const;
    if (confirmed && normalized.code === "provider_overloaded") return { busy: true } as const;
    throw normalized;
  });

  if ("slow" in payload && payload.slow) return { model: call.model, slow: true };
  if ("busy" in payload && payload.busy) return { model: call.model, busy: true };

  if (!textFrom(payload as ChatPayload).trim()) {
    throw new AiError("invalid_response", "The provider returned an empty verification response.");
  }

  return { model: call.model };
}

/** Splits one decoded SSE block into content deltas. Kept pure for tests. */
export function extractSseDeltas(block: string): { deltas: string[]; done: boolean } {
  const deltas: string[] = [];
  let done = false;

  for (const line of block.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data) continue;
    if (data === "[DONE]") {
      done = true;
      continue;
    }
    try {
      const payload = JSON.parse(data) as ChatPayload;
      const delta = payload.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) deltas.push(delta);
    } catch {
      // A malformed SSE frame is ignored; the validated call is non-streaming.
    }
  }

  return { deltas, done };
}

async function* streamText(call: Parameters<NonNullable<AiProviderAdapter["streamText"]>>[0]) {
  const { baseUrl, key } = requireConfig(call.provider);
  const response = await fetchWithTimeout(
    chatUrl(baseUrl),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        accept: "text/event-stream",
      },
      body: JSON.stringify({
        ...baseBody(call, call.userPrompt, call.temperature ?? 0.4, call.maxOutputTokens ?? 4_096),
        stream: true,
      }),
    },
    call.timeoutMs,
  );

  if (!response.ok) throw await readError(response, key);
  if (!response.body) {
    throw new AiError("invalid_response", "The provider did not return a stream.", {
      retryable: false,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const parsed = extractSseDeltas(block);
      for (const delta of parsed.deltas) yield delta;
      if (parsed.done) return;
    }
  }

  const tail = extractSseDeltas(buffer);
  for (const delta of tail.deltas) yield delta;
}

export const openAiCompatibleAdapter: AiProviderAdapter = {
  generateText,
  generateStructured,
  verify,
  listModels,
  streamText,
};

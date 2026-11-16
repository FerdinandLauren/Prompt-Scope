import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import { openAiCompatibleAdapter, extractSseDeltas } from "@/lib/ai/providers/openai-compatible";
import { PROVIDER_META, VIKEY_DOCUMENTED_MODELS } from "@/lib/ai/providers/meta";
import type { ResolvedProvider } from "@/lib/ai/providers/config";
import type { AdapterCall } from "@/lib/ai/providers/adapter";

const KEY = "vk-test-key-0123456789";

function provider(overrides: Partial<ResolvedProvider> = {}): ResolvedProvider {
  return {
    meta: PROVIDER_META.vikey,
    id: "vikey",
    key: KEY,
    keySource: "browser",
    enabled: true,
    model: "vikey/test-model",
    baseUrl: "https://api.vikey.ai/v1",
    models: VIKEY_DOCUMENTED_MODELS,
    configError: null,
    ...overrides,
  };
}

function call(overrides: Partial<AdapterCall> = {}): AdapterCall {
  return {
    provider: provider(),
    model: "vikey/test-model",
    systemInstruction: "You are a test system instruction.",
    userPrompt: "Return the structured answer.",
    temperature: 0.2,
    maxOutputTokens: 512,
    label: "test",
    timeoutMs: 5_000,
    ...overrides,
  };
}

function jsonResponse(payload: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function completion(content: string, usage?: { prompt: number; completion: number; total: number }) {
  return jsonResponse({
    choices: [{ message: { content }, finish_reason: "stop" }],
    usage: usage
      ? {
          prompt_tokens: usage.prompt,
          completion_tokens: usage.completion,
          total_tokens: usage.total,
        }
      : undefined,
  });
}

function fetchMock(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const mock = vi.fn(handler);
  vi.stubGlobal("fetch", mock);
  return mock;
}

const schema = z.object({ ok: z.boolean(), note: z.string() });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("openai-compatible adapter", () => {
  it("sends an authenticated chat request and returns validated JSON with usage", async () => {
    const mock = fetchMock(async () =>
      completion(JSON.stringify({ ok: true, note: "ready" }), {
        prompt: 11,
        completion: 7,
        total: 18,
      }),
    );

    const result = await openAiCompatibleAdapter.generateStructured(call(), schema);

    expect(result.data).toEqual({ ok: true, note: "ready" });
    expect(result.usage).toEqual({ inputTokens: 11, outputTokens: 7, totalTokens: 18 });

    const [url, init] = mock.mock.calls[0]!;
    expect(url).toBe("https://api.vikey.ai/v1/chat/completions");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toMatchObject({
      authorization: `Bearer ${KEY}`,
      "content-type": "application/json",
    });

    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe("vikey/test-model");
    expect(body.messages).toEqual([
      { role: "system", content: "You are a test system instruction." },
      { role: "user", content: "Return the structured answer." },
    ]);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.schema).toBeTruthy();
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(512);
  });

  it("repairs an invalid JSON answer once before failing", async () => {
    const mock = fetchMock(async () => completion("not json at all"));

    await expect(openAiCompatibleAdapter.generateStructured(call(), schema)).rejects.toMatchObject({
      code: "invalid_response",
    });

    expect(mock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse((mock.mock.calls[1]![1] as RequestInit).body as string);
    expect(retryBody.messages[1].content).toContain("not valid JSON");
  });

  it("maps 429 with Retry-After to a retryable, redacted rate limit", async () => {
    fetchMock(async () =>
      jsonResponse(
        { error: { message: `Rate limit reached for ${KEY}`, type: "rate_limit_error" } },
        { status: 429, headers: { "retry-after": "4" } },
      ),
    );

    const error = await openAiCompatibleAdapter
      .generateStructured(call(), schema)
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(AiError);
    const aiError = error as AiError;
    expect(aiError.code).toBe("rate_limit");
    expect(aiError.retryable).toBe(true);
    expect(aiError.retryAfterMs).toBe(4_000);
    expect(aiError.detail ?? "").not.toContain(KEY);
    expect(aiError.detail ?? "").toContain("***");
  });

  it("drops response_format when a gateway rejects the schema and still validates the answer", async () => {
    let calls = 0;
    const mock = fetchMock(async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse(
          { error: { message: "response_format is not supported", type: "invalid_request_error" } },
          { status: 400 },
        );
      }
      return completion(JSON.stringify({ ok: false, note: "fallback" }));
    });

    const result = await openAiCompatibleAdapter.generateStructured(
      call({ model: "vikey/schema-free-model" }),
      schema,
    );
    expect(result.data).toEqual({ ok: false, note: "fallback" });

    const retryBody = JSON.parse((mock.mock.calls[1]![1] as RequestInit).body as string);
    expect(retryBody.response_format).toBeUndefined();
    expect(retryBody.messages[0].content).toContain("Return only the complete JSON object");
  });

  it("lists only well-formed models and keeps reported context windows", async () => {
    fetchMock(async () =>
      jsonResponse({
        object: "list",
        data: [
          { id: "vikey/agent-gpt", object: "model", context_window: 1_000_000 },
          { id: "openai/gpt-6.1-sol" },
          { nope: true },
        ],
      }),
    );

    const models = await openAiCompatibleAdapter.listModels(provider(), 5_000);

    expect(models.map((model) => model.id)).toEqual(["vikey/agent-gpt", "openai/gpt-6.1-sol"]);
    expect(models[0]!.contextWindow).toBe(1_000_000);
    expect(models[0]!.source).toBe("discovered");
  });

  it("verifies with the model list and a tiny generation", async () => {
    const mock = fetchMock(async (url) => {
      if (url.endsWith("/models")) {
        return jsonResponse({ data: [{ id: "vikey/test-model" }] });
      }
      return completion("ok");
    });

    const result = await openAiCompatibleAdapter.verify({
      provider: provider(),
      model: "vikey/test-model",
      maxOutputTokens: 96,
      thinkingLevel: "LOW",
      timeoutMs: 5_000,
    });

    expect(result).toEqual({ model: "vikey/test-model" });
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("rejects a missing base URL before calling the network", async () => {
    const mock = fetchMock(async () => completion("{}"));

    const error = await openAiCompatibleAdapter
      .generateStructured(
        call({ provider: provider({ baseUrl: null, configError: "Dattio requires a base URL." }) }),
        schema,
      )
      .catch((thrown: unknown) => thrown);

    expect((error as AiError).code).toBe("invalid_request");
    expect(mock).not.toHaveBeenCalled();
  });
});

describe("SSE parsing for streaming transport", () => {
  it("collects content deltas and the done marker", () => {
    const block = [
      "data: {\"choices\":[{\"delta\":{\"content\":\"Hel\"}}]}",
      "data: {\"choices\":[{\"delta\":{\"content\":\"lo\"}}]}",
      "data: [DONE]",
    ].join("\n");

    expect(extractSseDeltas(block)).toEqual({ deltas: ["Hel", "lo"], done: true });
  });

  it("ignores malformed frames instead of failing the stream", () => {
    expect(extractSseDeltas("data: not-json\ndata: {\"choices\":[]}")).toEqual({
      deltas: [],
      done: false,
    });
  });
});

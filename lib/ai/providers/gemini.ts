import "server-only";
import { ThinkingLevel } from "@google/genai";
import type { z } from "zod";
import type { AiModelSummary } from "@/types/ai";
import type { AiProviderAdapter, AdapterCall } from "@/lib/ai/providers/adapter";
import type { GeneratedText, TokenUsage } from "@/lib/ai/structured";
import { AiError, normalizeProviderError } from "@/lib/ai/errors";
import { getProvider } from "@/lib/ai/client";
import { toGeminiJsonSchema } from "@/lib/ai/schemas";
import { runStructuredAttempt } from "@/lib/ai/structured";
import { withTimeout } from "@/lib/ai/timeout";
import type { ResolvedProvider } from "@/lib/ai/providers/config";

type GeminiResponse = {
  text?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  candidates?: Array<{ finishReason?: string }>;
};

function usageFrom(response: GeminiResponse): TokenUsage | undefined {
  const usage = response.usageMetadata;
  if (!usage) return undefined;
  return {
    inputTokens: usage.promptTokenCount ?? null,
    outputTokens: usage.candidatesTokenCount ?? null,
    totalTokens:
      usage.totalTokenCount ??
      (usage.promptTokenCount !== undefined && usage.candidatesTokenCount !== undefined
        ? usage.promptTokenCount + usage.candidatesTokenCount
        : null),
  };
}

function assertNotTruncated(response: GeminiResponse, label: string) {
  if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    throw new AiError("invalid_response", `${label}: the provider response was truncated.`, {
      retryable: false,
      detail: "Gemini stopped at MAX_TOKENS before the response was complete.",
    });
  }
}

function providerFor(provider: ResolvedProvider) {
  return getProvider(provider.keySource === "browser" ? provider.key : undefined);
}

function thinkingConfig(level: AdapterCall["thinkingLevel"]) {
  return { thinkingLevel: level === "HIGH" ? ThinkingLevel.HIGH : ThinkingLevel.LOW };
}

async function request(
  call: AdapterCall,
  prompt: string,
  config: Record<string, unknown>,
): Promise<GeminiResponse> {
  const ai = providerFor(call.provider);
  return (await withTimeout(
    ai.models.generateContent({
      model: call.model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: call.systemInstruction,
        temperature: call.temperature,
        maxOutputTokens: call.maxOutputTokens,
        thinkingConfig: thinkingConfig(call.thinkingLevel),
        ...config,
      },
    }),
    call.timeoutMs,
  )) as GeminiResponse;
}

async function generateText(call: AdapterCall): Promise<GeneratedText> {
  const response = await request(call, call.userPrompt, {});
  const text = response.text ?? "";
  if (!text.trim()) {
    throw new AiError("invalid_response", `${call.label}: the provider returned an empty response.`);
  }
  assertNotTruncated(response, call.label);
  return { text, usage: usageFrom(response) };
}

async function generateStructured<T>(
  call: AdapterCall,
  schema: z.ZodType<T>,
  validate?: (data: T) => string | null,
) {
  const responseJsonSchema = toGeminiJsonSchema(schema);

  return runStructuredAttempt<T>({
    userPrompt: call.userPrompt,
    schema,
    label: call.label,
    validate,
    generate: async (prompt) => {
      const response = await request(call, prompt, {
        responseMimeType: "application/json",
        responseJsonSchema,
      });
      assertNotTruncated(response, call.label);
      return { text: response.text ?? "", usage: usageFrom(response) };
    },
  });
}

async function verify(
  call: Omit<AdapterCall, "systemInstruction" | "userPrompt" | "label" | "temperature">,
) {
  const ai = providerFor(call.provider);
  let confirmed = false;

  try {
    // A metadata read proves the key is accepted and the model exists without
    // spending generation tokens.
    await withTimeout(ai.models.get({ model: call.model }), 10_000);
    confirmed = true;

    const response = (await withTimeout(
      ai.models.generateContent({
        model: call.model,
        contents: [{ role: "user", parts: [{ text: "Reply with the single word: ok" }] }],
        config: {
          maxOutputTokens: 96,
          temperature: 0,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
      45_000,
    )) as GeminiResponse;

    if (!response.text?.trim()) {
      throw new AiError("invalid_response", "The provider returned an empty verification response.");
    }

    return { model: call.model };
  } catch (error) {
    const normalized = normalizeProviderError(error, [call.provider.key]);
    if (confirmed && normalized.code === "timeout") {
      return { model: call.model, slow: true };
    }
    if (confirmed && normalized.code === "provider_overloaded") {
      return { model: call.model, busy: true };
    }
    throw normalized;
  }
}

export const geminiAdapter: AiProviderAdapter = {
  generateText,
  generateStructured,
  verify,
  async listModels(provider: ResolvedProvider): Promise<AiModelSummary[]> {
    return provider.models;
  },
};

import "server-only";
import { ThinkingLevel } from "@google/genai";
import { AiError, normalizeProviderError } from "@/lib/ai/errors";
import { getFallbackModelId, getModelId, getProvider } from "@/lib/ai/client";
import { toGeminiJsonSchema } from "@/lib/ai/schemas";
import type { z } from "zod";

/**
 * Gemini 3.x models think before answering and a structured, multi-thousand
 * token response can take a while on a cold call. This budget only stops a
 * request that never settles.
 */
const REQUEST_TIMEOUT_MS = 90_000;

export type StructuredRequest<T> = {
  systemInstruction: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  temperature: number;
  maxOutputTokens: number;
  label: string;
  /**
   * Gemini 3 models think at medium level by default. Thinking tokens count
   * against `maxOutputTokens`, so the default is lowered to keep structured
   * responses fast and complete.
   */
  thinkingLevel?: ThinkingLevel;
  validate?: (data: T) => string | null;
};

export type StructuredResult<T> = {
  data: T;
  model: string;
  text: string;
};

function extractJson(text: string): unknown {
  const trimmed = text.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    throw new AiError("invalid_response", "The provider response was not valid JSON.", {
      retryable: false,
    });
  }
}
/**
 * One structured call to Gemini, with a single controlled recovery retry when
 * the returned JSON does not satisfy the schema. Missing values are never
 * invented: an unrepairable response becomes an explicit error.
 */
export async function callStructured<T>({
  systemInstruction,
  userPrompt,
  schema,
  temperature,
  maxOutputTokens,
  label,
  thinkingLevel = ThinkingLevel.LOW,
  validate,
}: StructuredRequest<T>, browserApiKey?: string): Promise<StructuredResult<T>> {
  const ai = getProvider(browserApiKey);
  const primaryModel = getModelId();
  const responseJsonSchema = toGeminiJsonSchema(schema);

  const attempt = async (
    model: string,
    prompt: string,
    isRetry: boolean,
  ): Promise<StructuredResult<T>> => {
    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          temperature,
          maxOutputTokens,
          thinkingConfig: { thinkingLevel },
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      }),
      REQUEST_TIMEOUT_MS,
    );

    const text = response.text;
    if (!text || !text.trim()) {
      throw new AiError("invalid_response", `${label}: the provider returned an empty response.`);
    }

    const parsed = (() => {
      try {
        return { ok: true as const, value: schema.safeParse(extractJson(text)) };
      } catch {
        // Unparseable output is treated as a validation failure so the single
        // controlled recovery attempt still applies.
        return { ok: false as const, value: null };
      }
    })();

    if (!parsed.ok) {
      if (!isRetry) {
        return attempt(
          model,
          `${prompt}

Your previous response was not valid JSON. Return only the complete JSON object that matches the schema, with no commentary and no code fences.`,
          true,
        );
      }
      throw new AiError("invalid_response", `${label}: the provider response was not valid JSON.`, {
        retryable: false,
      });
    }

    const validation = parsed.value!;
    const customIssue = validation.success ? validate?.(validation.data) ?? null : null;

    if (!validation.success || customIssue) {
      if (!isRetry) {
        const issues = validation.success
          ? customIssue
          : validation.error.issues
              .slice(0, 6)
              .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
              .join("; ");

        return attempt(
          model,
          `${prompt}

Your previous response did not satisfy the required structure. Correct these problems and return the complete JSON object again:
${issues}`,
          true,
        );
      }

      throw new AiError(
        "invalid_response",
        `${label}: the provider response could not be validated.`,
        { retryable: false },
      );
    }

    return { data: validation.data, model, text };
  };

  const secrets = [browserApiKey, process.env.GEMINI_API_KEY];

  try {
    return await attempt(primaryModel, userPrompt, false);
  } catch (error) {
    const normalized = normalizeProviderError(error, secrets);
    const fallbackModel = getFallbackModelId();

    // A busy model is temporary and says nothing about the request. Try the
    // configured fallback once instead of making the user resubmit.
    if (
      normalized.code === "provider_overloaded" &&
      fallbackModel &&
      fallbackModel !== primaryModel
    ) {
      try {
        return await attempt(fallbackModel, userPrompt, false);
      } catch (fallbackError) {
        throw normalizeProviderError(fallbackError, secrets);
      }
    }

    throw normalized;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new AiError("timeout", "The provider request timed out.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

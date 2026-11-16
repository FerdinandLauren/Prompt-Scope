import "server-only";
import { AiError, normalizeProviderError } from "@/lib/ai/errors";
import { getModelId, getProvider } from "@/lib/ai/client";
import { toGeminiJsonSchema } from "@/lib/ai/schemas";
import type { z } from "zod";

const REQUEST_TIMEOUT_MS = 45_000;

export type StructuredRequest<T> = {
  systemInstruction: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  temperature: number;
  maxOutputTokens: number;
  label: string;
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
  validate,
}: StructuredRequest<T>, browserApiKey?: string): Promise<StructuredResult<T>> {
  const ai = getProvider(browserApiKey);
  const model = getModelId();
  const responseJsonSchema = toGeminiJsonSchema(schema);

  const attempt = async (prompt: string, isRetry: boolean): Promise<StructuredResult<T>> => {
    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          temperature,
          maxOutputTokens,
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

  try {
    return await attempt(userPrompt, false);
  } catch (error) {
    throw normalizeProviderError(error, [browserApiKey, process.env.GEMINI_API_KEY]);
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

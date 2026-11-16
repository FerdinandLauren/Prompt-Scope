import "server-only";
import { AiError } from "@/lib/ai/errors";
import type { z } from "zod";

export type TokenUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type GeneratedText = {
  text: string;
  usage?: TokenUsage;
};

export type StructuredOutcome<T> = {
  data: T;
  text: string;
  usage?: TokenUsage;
};

export function extractJson(text: string): unknown {
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

type StructuredAttemptInput<T> = {
  userPrompt: string;
  schema: z.ZodType<T>;
  label: string;
  validate?: (data: T) => string | null;
  generate: (prompt: string) => Promise<GeneratedText>;
};

/**
 * Shared validation loop for every adapter. One controlled recovery retry is
 * allowed when the first answer is not valid JSON or does not satisfy the
 * schema. Missing values are never invented: an unrepairable answer becomes an
 * explicit error.
 */
export async function runStructuredAttempt<T>({
  userPrompt,
  schema,
  label,
  validate,
  generate,
}: StructuredAttemptInput<T>): Promise<StructuredOutcome<T>> {
  const attempt = async (prompt: string, isRetry: boolean): Promise<StructuredOutcome<T>> => {
    const response = await generate(prompt);
    const text = response.text;

    if (!text || !text.trim()) {
      throw new AiError("invalid_response", `${label}: the provider returned an empty response.`);
    }

    const parsed = (() => {
      try {
        return { ok: true as const, value: schema.safeParse(extractJson(text)) };
      } catch {
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

    return { data: validation.data, text, usage: response.usage };
  };

  return attempt(userPrompt, false);
}

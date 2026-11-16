import "server-only";
import { ThinkingLevel } from "@google/genai";
import type { z } from "zod";
import type { AiTask, ProviderId, TaskComplexity } from "@/types/ai";
import type { AiRequestContext } from "@/lib/ai/providers/config";
import { contextFromBrowserKey } from "@/lib/ai/providers/config";
import { executeStructured } from "@/lib/ai/router";

export type StructuredRequest<T> = {
  systemInstruction: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  temperature: number;
  maxOutputTokens: number;
  label: string;
  /** Routing task. Defaults to the operation encoded in `label`. */
  task?: AiTask;
  /** Routing complexity. Defaults to a conservative estimate from the budget. */
  complexity?: TaskComplexity;
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
  provider: ProviderId;
};

function normalizeContext(source?: string | AiRequestContext): AiRequestContext {
  if (!source) return contextFromBrowserKey();
  return typeof source === "string" ? contextFromBrowserKey(source) : source;
}

function taskFromLabel(label: string): AiTask {
  if (label === "discover" || label === "generate" || label === "analyze" || label === "improve") {
    return label;
  }
  return "verify";
}

/**
 * One structured call through the multi-provider engine. The same request,
 * schema and validation run on every provider; the router decides which
 * provider and model to try and which failures are eligible for a fallback.
 */
export async function callStructured<T>(
  request: StructuredRequest<T>,
  source?: string | AiRequestContext,
): Promise<StructuredResult<T>> {
  const context = normalizeContext(source);
  const task = request.task ?? taskFromLabel(request.label);
  const complexity =
    request.complexity ?? (request.maxOutputTokens >= 6_000 ? "high" : "medium");

  return executeStructured(
    {
      systemInstruction: request.systemInstruction,
      userPrompt: request.userPrompt,
      schema: request.schema,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
      label: request.label,
      task,
      complexity,
      thinkingLevel:
        request.thinkingLevel === ThinkingLevel.HIGH
          ? "HIGH"
          : request.thinkingLevel === ThinkingLevel.LOW
            ? "LOW"
            : "LOW",
      validate: request.validate,
    },
    context,
  );
}

import "server-only";
import { getAiStatus } from "@/lib/ai/client";
import { callStructured } from "@/lib/ai/provider";
import type { AiRequestContext } from "@/lib/ai/providers/config";
import { improvementResponseSchema } from "@/lib/ai/schemas";
import { buildImprovementInstruction, buildImprovementPrompt } from "@/lib/ai/prompts";
import { demoImprove } from "@/lib/ai/demo/improve";
import { getEvaluationDimensions } from "@/config/evaluation-rubric";
import type { EvaluationSnapshot, PromptImprovement } from "@/types/evaluation";

export type ImproveInput = {
  originalPrompt: string;
  category: string;
  rubricVersion: string;
  priorities: string[];
  additionalInstructions: string;
  analysis?: {
    summary: string;
    weaknesses: Array<{ dimension: string; severity: string; problem: string; suggestion: string }>;
  };
};

/**
 * Priorities arrive from the browser, so they are mapped back to known
 * dimensions and anything unrecognised is dropped.
 */
export function normalizePriorities(priorities: string[], category?: string): string[] {
  const known = new Map<string, string>();
  for (const dimension of getEvaluationDimensions(category)) {
    known.set(dimension.key.toLowerCase(), dimension.label);
    known.set(dimension.label.toLowerCase(), dimension.label);
  }
  const result: string[] = [];
  for (const priority of priorities) {
    const match = known.get(priority.trim().toLowerCase());
    if (match && !result.includes(match)) result.push(match);
  }
  return result.slice(0, 8);
}

export async function improvePrompt(
  input: ImproveInput,
  browserApiKey?: string | AiRequestContext,
): Promise<PromptImprovement> {
  const status = getAiStatus(browserApiKey);
  const priorities = normalizePriorities(input.priorities, input.category);

  if (status.mode === "demo") {
    return demoImprove({
      originalPrompt: input.originalPrompt,
      category: input.category,
      rubricVersion: input.rubricVersion,
      priorities,
    });
  }

  const { data } = await callStructured(
    {
      systemInstruction: buildImprovementInstruction(input.category),
      userPrompt: buildImprovementPrompt({
        originalPrompt: input.originalPrompt,
        analysis: input.analysis,
        priorities,
        additionalInstructions: input.additionalInstructions,
        category: input.category,
      }),
      schema: improvementResponseSchema,
      temperature: 0.4,
      maxOutputTokens: 6144,
      label: "improve",
      task: "improve",
      complexity: "high",
      validate: (payload) =>
        payload.improvedPrompt.trim().length < 80
          ? "improvedPrompt must contain the full revised prompt"
          : null,
    },
    browserApiKey,
  );

  return {
    improvedPrompt: data.improvedPrompt,
    summary: data.summary,
    changes: data.changes,
    preservedRequirements: data.preservedRequirements,
    assumptions: data.assumptions,
    remainingLimitations: data.remainingLimitations,
    source: "live",
  };
}

export function analysisGuidanceFromSnapshot(snapshot: EvaluationSnapshot) {
  return {
    summary: snapshot.summary,
    weaknesses: snapshot.weaknesses.map((weakness) => ({
      dimension: weakness.dimension,
      severity: weakness.severity,
      problem: weakness.problem,
      suggestion: weakness.suggestion,
    })),
  };
}

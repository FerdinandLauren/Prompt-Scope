import "server-only";
import { getAiStatus } from "@/lib/ai/client";
import { callStructured } from "@/lib/ai/provider";
import { improvementResponseSchema } from "@/lib/ai/schemas";
import { buildImprovementInstruction, buildImprovementPrompt } from "@/lib/ai/prompts";
import { demoImprove } from "@/lib/ai/demo/improve";
import { evaluationDimensions } from "@/config/evaluation-rubric";
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
export function normalizePriorities(priorities: string[]): string[] {
  const known = new Map(
    evaluationDimensions.map((dimension) => [dimension.label.toLowerCase(), dimension.label as string]),
  );
  const result: string[] = [];
  for (const priority of priorities) {
    const match = known.get(priority.trim().toLowerCase());
    if (match && !result.includes(match)) result.push(match);
  }
  return result.slice(0, 8);
}

export async function improvePrompt(input: ImproveInput): Promise<PromptImprovement> {
  const status = getAiStatus();
  const priorities = normalizePriorities(input.priorities);

  if (status.mode === "demo") {
    return demoImprove({
      originalPrompt: input.originalPrompt,
      category: input.category,
      rubricVersion: input.rubricVersion,
      priorities,
    });
  }

  const { data } = await callStructured({
    systemInstruction: buildImprovementInstruction(),
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
    validate: (payload) =>
      payload.improvedPrompt.trim().length < 80 ? "improvedPrompt must contain the full revised prompt" : null,
  });

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

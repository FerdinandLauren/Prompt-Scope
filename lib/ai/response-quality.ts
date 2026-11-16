import type { EvaluationResponse } from "@/lib/ai/schemas";

/**
 * Minimal semantic guardrails that catch the most common invalid structured
 * responses before they reach the UI. These are validated server-side and are
 * intentionally conservative: they never invent replacement values.
 */
export function rejectionMessage(payload: EvaluationResponse): string | null {
  if (payload.dimensions.some((dimension) => !Number.isInteger(dimension.score))) {
    return "every dimension score must be an integer";
  }
  if (payload.weaknesses.some((weakness) => weakness.evidence && weakness.evidence.length > 400)) {
    return "weakness evidence must stay under 400 characters";
  }
  return null;
}

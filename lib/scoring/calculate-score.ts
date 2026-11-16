import { evaluationDimensions } from "@/config/evaluation-rubric";
import type { DimensionKey } from "@/types/evaluation";

export type DimensionScoreMap = Record<DimensionKey, number>;

/**
 * The server is the only place that turns dimension scores into an overall
 * score. It never trusts a model-generated total.
 */
export function calculateOverallScore(scores: DimensionScoreMap): number {
  const values = evaluationDimensions.map((dimension) => scores[dimension.key]);

  for (const value of values) {
    if (!Number.isFinite(value)) {
      throw new Error("Every dimension must have a finite score.");
    }
    if (value < 0 || value > 100) {
      throw new Error("Every dimension score must stay within 0–100.");
    }
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / evaluationDimensions.length);
}

export function averageScores(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

/**
 * A small, deterministic fingerprint used to detect stale evaluations in the
 * UI. This is not a security hash; it only compares prompt identity.
 */
export function fingerprintPrompt(text: string): string {
  let hash = 0x811c9dc5;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

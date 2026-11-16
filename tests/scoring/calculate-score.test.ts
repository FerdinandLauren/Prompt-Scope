import { describe, expect, it } from "vitest";
import { evaluationDimensions } from "@/config/evaluation-rubric";
import { averageScores, calculateOverallScore, fingerprintPrompt } from "@/lib/scoring/calculate-score";
import type { DimensionKey } from "@/types/evaluation";

function scores(values: number[]): Record<DimensionKey, number> {
  return Object.fromEntries(
    evaluationDimensions.map((dimension, index) => [dimension.key, values[index]!]),
  ) as Record<DimensionKey, number>;
}

const allDimensions = evaluationDimensions.map((dimension) => dimension.key);

describe("calculateOverallScore", () => {
  it("averages the eight dimensions and rounds to the nearest integer", () => {
    // MASTER example: 45, 60, 55, 40, 50, 35, 75, 50 → 410 / 8 = 51.25 → 51
    expect(calculateOverallScore(scores([45, 60, 55, 40, 50, 35, 75, 50]))).toBe(51);
  });

  it("rounds halves up rather than truncating", () => {
    // 0,0,0,0,0,0,0,1 → 0.125 → 0
    expect(calculateOverallScore(scores([0, 0, 0, 0, 0, 0, 0, 1]))).toBe(0);
    // 1,1,1,1,1,1,1,2 → 1.125 → 1
    expect(calculateOverallScore(scores([1, 1, 1, 1, 1, 1, 1, 2]))).toBe(1);
    // 0,0,1,0,0,0,0,0 → 0.125
    expect(calculateOverallScore(scores([0, 0, 1, 0, 0, 0, 0, 0]))).toBe(0);
  });

  it("returns 100 only when every dimension is 100", () => {
    expect(calculateOverallScore(scores([100, 100, 100, 100, 100, 100, 100, 99]))).toBe(100);
    expect(calculateOverallScore(scores([100, 100, 100, 100, 100, 100, 100, 96]))).toBe(100);
    expect(calculateOverallScore(scores([100, 100, 100, 100, 100, 100, 100, 95]))).toBe(99);
  });

  it("rejects out-of-range dimension scores instead of clamping silently", () => {
    expect(() => calculateOverallScore(scores([101, 0, 0, 0, 0, 0, 0, 0]))).toThrow(/0–100/);
    expect(() => calculateOverallScore(scores([-1, 0, 0, 0, 0, 0, 0, 0]))).toThrow(/0–100/);
  });

  it("rejects non-finite values", () => {
    expect(() => calculateOverallScore(scores([Number.NaN, 0, 0, 0, 0, 0, 0, 0]))).toThrow();
    expect(() => calculateOverallScore(scores([Number.POSITIVE_INFINITY, 0, 0, 0, 0, 0, 0, 0]))).toThrow();
  });

  it("scores exactly the eight rubric dimensions", () => {
    expect(allDimensions).toEqual([
      "clarity",
      "context",
      "specificity",
      "visual_direction",
      "composition",
      "typography",
      "constraints",
      "output_definition",
    ]);
  });
});

describe("averageScores", () => {
  it("rounds a numeric average and handles an empty list", () => {
    expect(averageScores([70, 80, 90])).toBe(80);
    expect(averageScores([70, 80])).toBe(75);
    expect(averageScores([])).toBe(0);
  });
});

describe("fingerprintPrompt", () => {
  it("is stable for identical text regardless of line endings and padding", () => {
    const a = fingerprintPrompt("Design a dashboard");
    const b = fingerprintPrompt("  Design a dashboard  ");
    const c = fingerprintPrompt("Design a dashboard\r\n");
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it("changes when the prompt changes", () => {
    expect(fingerprintPrompt("Design a dashboard")).not.toBe(fingerprintPrompt("Design a report"));
  });

  it("returns an 8 character hex string", () => {
    expect(fingerprintPrompt("anything")).toMatch(/^[0-9a-f]{8}$/);
  });
});

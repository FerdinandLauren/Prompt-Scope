import { describe, expect, it } from "vitest";
import { evaluationDimensions } from "@/config/evaluation-rubric";
import { compareSnapshots, signed } from "@/lib/scoring/compare-scores";
import type { DimensionKey, EvaluationSnapshot } from "@/types/evaluation";

function snapshot(
  values: number[],
  overrides: Partial<EvaluationSnapshot> = {},
): EvaluationSnapshot {
  const dimensions = Object.fromEntries(
    evaluationDimensions.map((dimension, index) => [dimension.key, values[index]!]),
  ) as Record<DimensionKey, number>;

  return {
    id: "snapshot",
    overallScore: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    rubricVersion: "visual-uiux-v1",
    category: "ui_ux",
    createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    source: "demo",
    dimensions,
    dimensionDetails: evaluationDimensions.map((dimension, index) => ({
      key: dimension.key,
      label: dimension.label,
      score: values[index]!,
      explanation: `${dimension.label} explanation`,
    })),
    summary: "summary",
    strengths: [],
    weaknesses: [],
    missingInformation: [],
    contradictions: [],
    recommendations: [],
    promptHash: "00000000",
    ...overrides,
  };
}

describe("compareSnapshots", () => {
  it("computes per-dimension and overall differences", () => {
    const original = snapshot([40, 50, 60, 70, 80, 90, 30, 20]);
    const improved = snapshot([60, 50, 60, 70, 80, 90, 30, 20]);
    const comparison = compareSnapshots(original, improved);

    expect(comparison.overallChange).toBe(comparison.improvedOverall - comparison.originalOverall);
    const clarity = comparison.dimensions.find((dimension) => dimension.key === "clarity");
    expect(clarity?.change).toBe(20);
    expect(comparison.improved).toEqual(["clarity"]);
    expect(comparison.declined).toEqual([]);
    expect(comparison.unchanged).toHaveLength(7);
  });

  it("reports declines and unchanged dimensions honestly", () => {
    const original = snapshot([80, 80, 80, 80, 80, 80, 80, 80]);
    const improved = snapshot([60, 80, 40, 80, 80, 80, 80, 80]);
    const comparison = compareSnapshots(original, improved);

    expect(comparison.overallChange).toBeLessThan(0);
    expect(comparison.declined.sort()).toEqual(["clarity", "specificity"]);
    expect(comparison.improved).toEqual([]);
    expect(comparison.unchanged).toHaveLength(6);
  });

  it("treats an identical revision as zero change", () => {
    const values = [55, 65, 45, 70, 60, 50, 80, 40];
    const comparison = compareSnapshots(snapshot(values), snapshot(values));
    expect(comparison.overallChange).toBe(0);
    expect(comparison.improved).toHaveLength(0);
    expect(comparison.declined).toHaveLength(0);
    expect(comparison.unchanged).toHaveLength(8);
  });

  it("flags a rubric mismatch instead of comparing across rubrics", () => {
    const comparison = compareSnapshots(
      snapshot([50, 50, 50, 50, 50, 50, 50, 50]),
      snapshot([60, 60, 60, 60, 60, 60, 60, 60], { rubricVersion: "visual-uiux-v2" }),
    );
    expect(comparison.rubricMatches).toBe(false);
    expect(comparison.warnings.join(" ")).toMatch(/rubric/i);
  });

  it("flags a category mismatch", () => {
    const comparison = compareSnapshots(
      snapshot([50, 50, 50, 50, 50, 50, 50, 50]),
      snapshot([50, 50, 50, 50, 50, 50, 50, 50], { category: "visual_design" }),
    );
    expect(comparison.warnings.join(" ")).toMatch(/categor/i);
  });

  it("matches the arithmetic shown in the interface for every dimension", () => {
    const original = snapshot([45, 60, 55, 40, 50, 35, 75, 50]);
    const improved = snapshot([90, 85, 90, 85, 90, 80, 85, 90]);
    const comparison = compareSnapshots(original, improved);

    for (const dimension of comparison.dimensions) {
      expect(dimension.change).toBe(dimension.improved - dimension.original);
    }
    expect(comparison.overallChange).toBe(comparison.improvedOverall - comparison.originalOverall);
    // 51.25 → 51 and 86.875 → 87, so the displayed difference is 36, not 43.
    expect(comparison.originalOverall).toBe(51);
    expect(comparison.improvedOverall).toBe(87);
    expect(comparison.overallChange).toBe(36);
  });
});

describe("signed", () => {
  it("prefixes positive values and leaves negatives and zero alone", () => {
    expect(signed(5)).toBe("+5");
    expect(signed(0)).toBe("0");
    expect(signed(-7)).toBe("-7");
  });
});

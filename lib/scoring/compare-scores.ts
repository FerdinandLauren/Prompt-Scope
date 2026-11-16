import type { DimensionKey, EvaluationSnapshot, ScoreComparison } from "@/types/evaluation";
import { evaluationDimensions } from "@/config/evaluation-rubric";

export function compareSnapshots(
  original: EvaluationSnapshot,
  improved: EvaluationSnapshot,
): ScoreComparison {
  const warnings: string[] = [];

  if (original.rubricVersion !== improved.rubricVersion) {
    warnings.push(
      `Rubric versions differ (${original.rubricVersion} vs ${improved.rubricVersion}); score changes are not directly comparable.`,
    );
  }
  if (original.category !== improved.category) {
    warnings.push(
      `Categories differ (${original.category} vs ${improved.category}); dimension meanings may differ.`,
    );
  }

  const dimensions = evaluationDimensions.map((dimension) => {
    const originalScore = original.dimensions[dimension.key as DimensionKey] ?? 0;
    const improvedScore = improved.dimensions[dimension.key as DimensionKey] ?? 0;
    const detail =
      improved.dimensionDetails.find((item) => item.key === dimension.key) ??
      original.dimensionDetails.find((item) => item.key === dimension.key);

    return {
      key: dimension.key,
      label: dimension.label,
      original: originalScore,
      improved: improvedScore,
      change: improvedScore - originalScore,
      explanation: detail?.explanation ?? "",
    };
  });

  return {
    originalOverall: original.overallScore,
    improvedOverall: improved.overallScore,
    overallChange: improved.overallScore - original.overallScore,
    dimensions,
    improved: dimensions.filter((item) => item.change > 0).map((item) => item.key),
    declined: dimensions.filter((item) => item.change < 0).map((item) => item.key),
    unchanged: dimensions.filter((item) => item.change === 0).map((item) => item.key),
    rubricMatches: original.rubricVersion === improved.rubricVersion,
    warnings,
  };
}

export function signed(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

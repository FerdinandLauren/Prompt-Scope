import "server-only";
import { RUBRIC_VERSION } from "@/config/app";
import { getDimension } from "@/config/evaluation-rubric";
import { getAiStatus } from "@/lib/ai/client";
import { heuristicEvaluate } from "@/lib/ai/analyzer/heuristic";
import { callStructured } from "@/lib/ai/provider";
import { evaluationResponseSchema, hasAllDimensions } from "@/lib/ai/schemas";
import { buildAnalysisInstruction, buildAnalysisPrompt } from "@/lib/ai/prompts";
import { calculateOverallScore, fingerprintPrompt } from "@/lib/scoring/calculate-score";
import type { DimensionKey, EvaluationSnapshot } from "@/types/evaluation";
import { rejectionMessage } from "@/lib/ai/response-quality";

export type AnalyzeInput = {
  prompt: string;
  title?: string;
  category: string;
  rubricVersion: string;
};

export async function analyzePrompt({
  prompt,
  title,
  category,
  rubricVersion,
}: AnalyzeInput): Promise<EvaluationSnapshot> {
  const status = getAiStatus();

  if (status.mode === "demo") {
    return heuristicEvaluate({
      prompt,
      category,
      rubricVersion,
      title,
      id: crypto.randomUUID(),
    });
  }

  const { data, model } = await callStructured({
    systemInstruction: buildAnalysisInstruction(),
    userPrompt: buildAnalysisPrompt({ prompt, category, title }),
    schema: evaluationResponseSchema,
    temperature: 0.2,
    maxOutputTokens: 4096,
    label: "analyze",
    validate: (payload) => {
      if (!hasAllDimensions(payload)) {
        return "dimensions must include all eight keys exactly once";
      }
      return rejectionMessage(payload);
    },
  });

  const dimensions = Object.fromEntries(
    data.dimensions.map((dimension) => [dimension.key, dimension.score]),
  ) as Record<DimensionKey, number>;

  const dimensionDetails = data.dimensions.map((dimension) => ({
    key: dimension.key,
    label: getDimension(dimension.key).label,
    score: dimension.score,
    explanation: dimension.explanation,
  }));

  return {
    id: crypto.randomUUID(),
    overallScore: calculateOverallScore(dimensions),
    rubricVersion: rubricVersion || RUBRIC_VERSION,
    category,
    createdAt: new Date().toISOString(),
    source: "live",
    dimensions,
    dimensionDetails,
    summary: data.summary,
    strengths: data.strengths,
    weaknesses: data.weaknesses.map((weakness) => ({
      ...weakness,
      evidence: weakness.evidence?.trim() || undefined,
    })),
    missingInformation: data.missingInformation,
    contradictions: data.contradictions,
    recommendations: data.recommendations,
    promptHash: fingerprintPrompt(prompt),
    model,
  };
}

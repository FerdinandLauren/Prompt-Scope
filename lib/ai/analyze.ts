import "server-only";
import { getRubricVersionForCategory } from "@/config/evaluation-rubric";
import { getDimension } from "@/config/evaluation-rubric";
import { getAiStatus } from "@/lib/ai/client";
import { heuristicEvaluate } from "@/lib/ai/analyzer/heuristic";
import { callStructured } from "@/lib/ai/provider";
import type { AiRequestContext } from "@/lib/ai/providers/config";
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

export async function analyzePrompt(
  { prompt, title, category, rubricVersion }: AnalyzeInput,
  browserApiKey?: string | AiRequestContext,
): Promise<EvaluationSnapshot> {
  const status = getAiStatus(browserApiKey);

  if (status.mode === "demo") {
    return heuristicEvaluate({
      prompt,
      category,
      rubricVersion: rubricVersion || getRubricVersionForCategory(category),
      title,
      id: crypto.randomUUID(),
    });
  }

  const { data, model } = await callStructured(
    {
      systemInstruction: buildAnalysisInstruction(category),
      userPrompt: buildAnalysisPrompt({ prompt, category, title, rubricVersion }),
      schema: evaluationResponseSchema,
      temperature: 0.2,
      maxOutputTokens: 4096,
      label: "analyze",
      task: "analyze",
      complexity: "medium",
      validate: (payload) => {
        if (!hasAllDimensions(payload)) {
          return "dimensions must include all eight keys exactly once";
        }
        return rejectionMessage(payload);
      },
    },
    browserApiKey,
  );

  const dimensions = Object.fromEntries(
    data.dimensions.map((dimension) => [dimension.key, dimension.score]),
  ) as Record<DimensionKey, number>;

  const dimensionDetails = data.dimensions.map((dimension) => ({
    key: dimension.key,
    label: getDimension(dimension.key, category).label,
    score: dimension.score,
    explanation: dimension.explanation,
  }));

  return {
    id: crypto.randomUUID(),
    overallScore: calculateOverallScore(dimensions),
    rubricVersion: rubricVersion || getRubricVersionForCategory(category),
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

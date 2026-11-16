import type { GeneratedPrompt } from "@/types/prompt";

export type DimensionKey =
  | "clarity"
  | "context"
  | "specificity"
  | "visual_direction"
  | "composition"
  | "typography"
  | "constraints"
  | "output_definition";

export type DimensionScore = {
  key: DimensionKey;
  label: string;
  score: number;
  explanation: string;
};

export type WeaknessSeverity = "low" | "medium" | "high";

export type Weakness = {
  dimension: DimensionKey;
  severity: WeaknessSeverity;
  problem: string;
  evidence?: string;
  suggestion: string;
};

export type Strength = {
  title: string;
  description: string;
};

export type EvaluationSnapshot = {
  id: string;
  overallScore: number;
  rubricVersion: string;
  category: string;
  createdAt: string;
  source: "live" | "demo";
  dimensions: Record<DimensionKey, number>;
  dimensionDetails: DimensionScore[];
  summary: string;
  strengths: Strength[];
  weaknesses: Weakness[];
  missingInformation: string[];
  contradictions: string[];
  recommendations: string[];
  promptHash: string;
  model?: string;
};

export type ImprovementChange = {
  dimension: DimensionKey | "structure";
  change: string;
  reason: string;
};

export type PromptImprovement = {
  improvedPrompt: string;
  summary: string;
  changes: ImprovementChange[];
  preservedRequirements: string[];
  assumptions: string[];
  remainingLimitations: string[];
  source: "live" | "demo";
};

export type GeneratedPromptResult = GeneratedPrompt;

export type ComparisonRecord = {
  id: string;
  createdAt: string;
  sessionId: string;
  originalVersionId: string;
  improvedVersionId: string;
  originalPrompt: string;
  improvedPrompt: string;
  original: EvaluationSnapshot;
  improved: EvaluationSnapshot;
  improvement: PromptImprovement | null;
};

export type DimensionComparison = {
  key: DimensionKey;
  label: string;
  original: number;
  improved: number;
  change: number;
  explanation: string;
};

export type ScoreComparison = {
  originalOverall: number;
  improvedOverall: number;
  overallChange: number;
  dimensions: DimensionComparison[];
  improved: DimensionKey[];
  declined: DimensionKey[];
  unchanged: DimensionKey[];
  rubricMatches: boolean;
  warnings: string[];
};

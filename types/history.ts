import type { EvaluationSnapshot, PromptImprovement } from "@/types/evaluation";
import type { PromptConfiguration, PromptVersion } from "@/types/prompt";

export type PromptSession = {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  currentVersionId: string;
  versions: PromptVersion[];
  configuration?: PromptConfiguration;
  /** Latest comparison produced from this session, if any. */
  lastComparison?: {
    originalVersionId: string;
    improvedVersionId: string;
    original: EvaluationSnapshot;
    improved: EvaluationSnapshot;
    improvement: PromptImprovement | null;
  };
};

export type SessionSummary = {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  latestScore: number | null;
  latestVersionId: string;
  hasComparison: boolean;
};

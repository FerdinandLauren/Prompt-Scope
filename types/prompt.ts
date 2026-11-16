import type { CategoryId } from "@/config/app";
import type { EvaluationSnapshot } from "@/types/evaluation";
import type { ProjectBrief, PromptDepth, TargetAgentId } from "@/types/guided";

export type SliderKey =
  | "creativity"
  | "precision"
  | "visualHierarchy"
  | "composition"
  | "typography"
  | "detail"
  | "consistency"
  | "exploration";

export type PromptSliders = Record<SliderKey, number>;

export type PromptConfiguration = {
  category: CategoryId;
  objective: string;
  audience: string;
  context: string;
  visualPreferences: string[];
  outputRequirements: string[];
  constraints: string[];
  sliders: PromptSliders;
  /** Guided Mode additions; optional so stored sessions stay valid. */
  depth?: PromptDepth;
  targetAgent?: TargetAgentId;
  brief?: ProjectBrief;
};

export type GeneratedPromptSection = {
  heading: string;
  content: string;
};

export type GeneratedPrompt = {
  title: string;
  category: CategoryId;
  prompt: string;
  explanation: string;
  sections: GeneratedPromptSection[];
  assumptions: string[];
  recommendations: string[];
  source: "live" | "demo" | "draft";
  depth?: PromptDepth;
  targetAgent?: TargetAgentId;
};

export type PromptVersionSource = "generated" | "manual" | "improved" | "restored";

export type PromptVersion = {
  id: string;
  versionNumber: number;
  promptText: string;
  createdAt: string;
  source: PromptVersionSource;
  label?: string;
  configuration?: PromptConfiguration;
  evaluation?: EvaluationSnapshot;
};

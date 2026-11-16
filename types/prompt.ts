import type { CategoryId } from "@/config/app";
import type { EvaluationSnapshot } from "@/types/evaluation";

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

import type { DimensionKey } from "@/types/evaluation";

export type PromptDepth = "concise" | "balanced" | "detailed" | "comprehensive";

export type TargetAgentId =
  | "general"
  | "coding"
  | "design"
  | "research"
  | "automation"
  | "writing"
  | "custom";

export type Complexity = "simple" | "moderate" | "complex";

/**
 * "user"        — supplied by the person.
 * "assumption"  — accepted AI recommendation, still provisional.
 * "recommendation" — suggested by PromptScope, not yet accepted.
 */
export type BriefSectionSource = "user" | "assumption" | "recommendation";

export type BriefSection = {
  id: string;
  heading: string;
  content: string;
  source: BriefSectionSource;
};

export type ProjectBrief = {
  title: string;
  objective: string;
  summary: string;
  category: string;
  complexity: Complexity;
  sections: BriefSection[];
  assumptions: string[];
  unknowns: string[];
  confirmedAt?: string;
};

export type DiscoveryQuestion = {
  id: string;
  question: string;
  why: string;
  options: string[];
  allowUnknown: boolean;
  target: string;
};

export type DiscoveryAnswerStatus = "answered" | "unknown" | "skipped";

export type DiscoveryAnswer = {
  questionId: string;
  question: string;
  answer: string;
  status: DiscoveryAnswerStatus;
};

export type DiscoveryUnderstanding = {
  summary: string;
  objective: string;
  category: string;
  categoryLabel: string;
  categoryConfidence: number;
  categoryReason: string;
  complexity: Complexity;
  explicitRequirements: string[];
  constraints: string[];
  missingInformation: string[];
  ambiguities: string[];
  technicalConsiderations: string[];
};

export type DiscoveryRecommendation = {
  questionId: string;
  question: string;
  recommendation: string;
  rationale: string;
  tradeoffs: string[];
  recordedAsAssumption: boolean;
};

export type DiscoveryTurn = {
  source: "live" | "demo";
  understanding: DiscoveryUnderstanding;
  /** The single next question, or null when there is enough information. */
  question: DiscoveryQuestion | null;
  /** Populated when the last answer was "I don't know". */
  recommendation: DiscoveryRecommendation | null;
  brief: ProjectBrief;
  enoughInformation: boolean;
  answered: number;
  budget: number;
};

export type DiscoveryInput = {
  idea: string;
  category?: string;
  answers: DiscoveryAnswer[];
  budget?: number;
};

export type { DimensionKey };

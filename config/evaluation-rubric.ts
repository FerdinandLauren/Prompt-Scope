import type { DimensionKey } from "@/types/evaluation";

export const RUBRIC_VERSION = "visual-uiux-v1";

export const evaluationDimensions = [
  {
    key: "clarity",
    label: "Clarity",
    short: "Clarity",
    description: "Whether the instructions are understandable, ordered, and unambiguous.",
    guidance:
      "Reward a readable objective, direct verbs, logical order, and language that cannot be read two ways. Penalize vague mood words carrying the whole brief, contradictions, and instructions that require guessing.",
  },
  {
    key: "context",
    label: "Context",
    short: "Context",
    description: "Whether sufficient project background, audience, and purpose are supplied.",
    guidance:
      "Reward a named audience, product purpose, usage environment, and relevant existing constraints. Penalize briefs that could apply to any project.",
  },
  {
    key: "specificity",
    label: "Specificity",
    short: "Specific",
    description: "Whether requirements are detailed enough to guide a concrete output.",
    guidance:
      "Reward concrete content, components, quantities, states, breakpoints, and named deliverables. Penalize adjectives with no operational meaning.",
  },
  {
    key: "visual_direction",
    label: "Visual Direction",
    short: "Visual",
    description: "Whether the desired style, mood, palette, and references are sufficiently defined.",
    guidance:
      "Reward a coherent direction with intentional references, colour behavior, imagery stance, and mood. Penalize lists of contradictory style labels or a single generic adjective such as 'modern'.",
  },
  {
    key: "composition",
    label: "Composition",
    short: "Layout",
    description: "Whether layout, hierarchy, grid, spacing, and responsive expectations are clear.",
    guidance:
      "Reward a stated focal point, reading order, alignment system, spacing rhythm, and responsive behavior. Penalize layout instructions that leave every spatial decision open.",
  },
  {
    key: "typography",
    label: "Typography",
    short: "Type",
    description: "Whether type roles, scale, readability, and fallback behavior are specified.",
    guidance:
      "Reward distinct display/body/metadata roles, scale, weight, measure, and legibility requirements. A prompt with no typographic instruction should not score highly here.",
  },
  {
    key: "constraints",
    label: "Constraints",
    short: "Limits",
    description: "Whether limits, exclusions, and required conditions are explicit and consistent.",
    guidance:
      "Reward must/avoid/only statements, accessibility and responsiveness requirements, and explicit exclusions. Penalize constraints that conflict with the stated direction.",
  },
  {
    key: "output_definition",
    label: "Output Definition",
    short: "Output",
    description: "Whether the deliverable, format, and response expectations are defined.",
    guidance:
      "Reward a named deliverable, format, level of fidelity, and response structure. Penalize prompts that do not say what the model should return.",
  },
] as const satisfies ReadonlyArray<{
  key: DimensionKey;
  label: string;
  short: string;
  description: string;
  guidance: string;
}>;

export const dimensionKeys = evaluationDimensions.map((dimension) => dimension.key);

export function getDimension(key: DimensionKey) {
  return evaluationDimensions.find((dimension) => dimension.key === key) ?? evaluationDimensions[0];
}

export const severityGuidance = [
  "high: a major issue that materially prevents a useful output.",
  "medium: a gap that will cause avoidable revision work.",
  "low: a minor improvement opportunity.",
].join("\n");

export const scoreBands = [
  { min: 0, max: 39, label: "Needs significant improvement", tone: "high" as const },
  { min: 40, max: 59, label: "Developing", tone: "medium" as const },
  { min: 60, max: 79, label: "Good foundation", tone: "low" as const },
  { min: 80, max: 100, label: "Strong prompt", tone: "positive" as const },
];

export function getScoreBand(score: number) {
  return scoreBands.find((band) => score >= band.min && score <= band.max) ?? scoreBands[0];
}

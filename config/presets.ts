import type { PromptConfiguration, SliderKey, PromptSliders } from "@/types/prompt";

export const sliderDefinitions: Array<{
  key: SliderKey;
  label: string;
  description: string;
}> = [
  {
    key: "creativity",
    label: "Creativity",
    description: "How experimental the visual direction should be.",
  },
  {
    key: "precision",
    label: "Precision",
    description: "How tightly the output should follow explicit instructions.",
  },
  {
    key: "visualHierarchy",
    label: "Visual hierarchy",
    description: "Emphasis on focal order and information priority.",
  },
  {
    key: "composition",
    label: "Composition",
    description: "Emphasis on layout balance, grid, and spatial rhythm.",
  },
  {
    key: "typography",
    label: "Typography",
    description: "Emphasis on type roles, scale, and readability.",
  },
  {
    key: "detail",
    label: "Detail level",
    description: "How much component and state detail is expected.",
  },
  {
    key: "consistency",
    label: "Consistency",
    description: "Priority on a repeatable component and token system.",
  },
  {
    key: "exploration",
    label: "Exploration",
    description: "Room for alternative interpretations of the brief.",
  },
];

export const defaultSliders: PromptSliders = {
  creativity: 58,
  precision: 74,
  visualHierarchy: 72,
  composition: 68,
  typography: 64,
  detail: 62,
  consistency: 70,
  exploration: 50,
};

export const presets: Array<{
  id: string;
  label: string;
  description: string;
  values: PromptSliders;
}> = [
  {
    id: "balanced",
    label: "Balanced",
    description: "A measured mix of creativity and precision.",
    values: defaultSliders,
  },
  {
    id: "creative",
    label: "Creative exploration",
    description: "More room for unusual concepts and alternatives.",
    values: {
      creativity: 88,
      precision: 44,
      visualHierarchy: 62,
      composition: 72,
      typography: 52,
      detail: 54,
      consistency: 46,
      exploration: 92,
    },
  },
  {
    id: "precision",
    label: "Precision focus",
    description: "Tight instruction-following, structure, and repeatability.",
    values: {
      creativity: 36,
      precision: 93,
      visualHierarchy: 82,
      composition: 78,
      typography: 68,
      detail: 80,
      consistency: 92,
      exploration: 28,
    },
  },
  {
    id: "visual",
    label: "Visual excellence",
    description: "Hierarchy, composition, typography, and detail lead.",
    values: {
      creativity: 66,
      precision: 82,
      visualHierarchy: 93,
      composition: 91,
      typography: 89,
      detail: 86,
      consistency: 88,
      exploration: 54,
    },
  },
];

export const visualPreferenceOptions = [
  "Minimalist",
  "Modern",
  "Editorial",
  "Corporate",
  "Futuristic",
  "Experimental",
  "Brutalist",
  "Warm",
  "High contrast",
  "Playful",
] as const;

export const outputRequirementOptions = [
  "Desktop website",
  "Mobile application",
  "Landing page",
  "Dashboard",
  "Design concept",
  "UI component",
  "Design system",
] as const;

export const constraintOptions = [
  "Responsive",
  "Accessible contrast",
  "Avoid excessive elements",
  "Clear navigation",
  "Readable typography",
  "Consistent spacing",
  "No stock imagery",
  "Dark interface",
] as const;

export const emptyConfiguration: PromptConfiguration = {
  category: "ui_ux",
  objective: "",
  audience: "",
  context: "",
  visualPreferences: [],
  outputRequirements: [],
  constraints: [],
  sliders: defaultSliders,
};

export function getPresetValues(id: string): PromptSliders {
  return presets.find((preset) => preset.id === id)?.values ?? defaultSliders;
}

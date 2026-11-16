export const APP_NAME = "PromptScope";
export const APP_VERSION = "1.0.0";

export const navigation = [
  { href: "/", label: "Dashboard", icon: "dashboard" as const },
  { href: "/builder", label: "Prompt Builder", icon: "builder" as const },
  { href: "/analyzer", label: "Prompt Analyzer", icon: "analyzer" as const },
  { href: "/comparison", label: "Comparisons", icon: "comparison" as const },
  { href: "/history", label: "Prompt History", icon: "history" as const },
];

export const systemNavigation = [
  { href: "/settings", label: "Settings", icon: "settings" as const },
  { href: "/docs", label: "Documentation", icon: "docs" as const },
];

export const categories = [
  {
    id: "ui_ux",
    label: "UI/UX Design",
    shortLabel: "UI/UX",
    description: "Interfaces, product screens, dashboards, and interaction systems.",
    available: true,
  },
  {
    id: "visual_design",
    label: "Visual Design",
    shortLabel: "Visual",
    description: "Editorial layouts, brand systems, art direction, and campaign visuals.",
    available: true,
  },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export function getCategory(id: string) {
  return categories.find((category) => category.id === id) ?? categories[0];
}

export const RUBRIC_VERSION = "visual-uiux-v1";

export const PROMPT_LIMITS = {
  min: 24,
  max: 12_000,
} as const;

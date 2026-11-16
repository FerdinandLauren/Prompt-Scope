export const APP_NAME = "PromptScope";
export const APP_VERSION = "2.0.0";

/**
 * "Turn your ideas into instructions AI can understand and execute."
 *
 * Navigation stays deliberately small. Guided discovery lives inside the
 * existing Prompt Builder rather than becoming a separate destination.
 */
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

export { categories, categoryGroups, getCategory } from "@/config/domains";
export type { CategoryId, CategoryGroupId, DomainFamily } from "@/config/domains";

/**
 * The design-family rubric remains the historical default so stored sessions
 * and comparisons keep their original meaning. Category-specific rubrics are
 * resolved through `getRubricVersionForCategory`.
 */
export const RUBRIC_VERSION = "visual-uiux-v1";

/**
 * Generated prompts for agent work are legitimately long. The analyzer accepts
 * them in full instead of truncating the text a user is trying to diagnose.
 */
export const PROMPT_LIMITS = {
  min: 24,
  max: 40_000,
} as const;

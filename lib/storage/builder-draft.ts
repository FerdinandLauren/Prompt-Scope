import { emptyConfiguration, sliderDefinitions } from "@/config/presets";
import { CATEGORY_IDS } from "@/config/domains";
import type { PromptConfiguration } from "@/types/prompt";
import type { DiscoveryAnswer, ProjectBrief, PromptDepth, TargetAgentId } from "@/types/guided";

export type BuilderMode = "guided" | "advanced";

export type GuidedStep = "idea" | "interview" | "brief" | "tuning" | "output";

export type BuilderDraft = {
  mode: BuilderMode;
  configuration: PromptConfiguration;
  /** Guided-progress fields. Persisted separately from the configuration. */
  guided: {
    step: GuidedStep;
    idea: string;
    answers: DiscoveryAnswer[];
    brief: ProjectBrief | null;
    budget: number;
    depth: PromptDepth;
    targetAgent: TargetAgentId;
    briefConfirmed: boolean;
    /** Empty string means "let PromptScope detect the category". */
    categoryHint: string;
  };
};

const STORAGE_KEY = "promptscope.builder.v2";
export const BUILDER_DRAFT_EVENT = "promptscope:builder-draft";

export const defaultGuidedState: BuilderDraft["guided"] = {
  step: "idea",
  idea: "",
  answers: [],
  brief: null,
  budget: 5,
  depth: "balanced",
  targetAgent: "general",
  briefConfirmed: false,
  categoryHint: "",
};

export const defaultBuilderDraft: BuilderDraft = {
  mode: "guided",
  configuration: emptyConfiguration,
  guided: defaultGuidedState,
};

const modes: BuilderMode[] = ["guided", "advanced"];
const depths: PromptDepth[] = ["concise", "balanced", "detailed", "comprehensive"];
const agents: TargetAgentId[] = ["general", "coding", "design", "research", "automation", "writing", "custom"];
const steps: GuidedStep[] = ["idea", "interview", "brief", "tuning", "output"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

/**
 * Draft data comes from localStorage and may be stale, edited, or corrupted.
 * Everything is validated against the current shape before it is trusted.
 */
export function sanitizeConfiguration(value: unknown): PromptConfiguration {
  if (!isRecord(value)) return emptyConfiguration;
  const category = typeof value.category === "string" && (CATEGORY_IDS as readonly string[]).includes(value.category)
    ? (value.category as PromptConfiguration["category"])
    : "ui_ux";

  const sliders = sliderDefinitions.reduce(
    (result, definition) => {
      const raw = isRecord(value.sliders) ? value.sliders[definition.key] : undefined;
      const numeric = typeof raw === "number" && Number.isFinite(raw) ? raw : emptyConfiguration.sliders[definition.key];
      result[definition.key] = Math.max(0, Math.min(100, Math.round(numeric)));
      return result;
    },
    {} as PromptConfiguration["sliders"],
  );

  return {
    category,
    objective: typeof value.objective === "string" ? value.objective.slice(0, 1200) : "",
    audience: typeof value.audience === "string" ? value.audience.slice(0, 400) : "",
    context: typeof value.context === "string" ? value.context.slice(0, 3000) : "",
    visualPreferences: asStringArray(value.visualPreferences, 10),
    outputRequirements: asStringArray(value.outputRequirements, 8),
    constraints: asStringArray(value.constraints, 12),
    sliders,
    depth: depths.includes(value.depth as PromptDepth) ? (value.depth as PromptDepth) : undefined,
    targetAgent: agents.includes(value.targetAgent as TargetAgentId)
      ? (value.targetAgent as TargetAgentId)
      : undefined,
    brief: isRecord(value.brief) ? (value.brief as unknown as ProjectBrief) : undefined,
  };
}

function sanitizeAnswers(value: unknown): DiscoveryAnswer[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .filter((entry) => typeof entry.questionId === "string" && typeof entry.question === "string")
    .map((entry): DiscoveryAnswer => ({
      questionId: String(entry.questionId).slice(0, 100),
      question: String(entry.question).slice(0, 400),
      answer: typeof entry.answer === "string" ? entry.answer.slice(0, 1500) : "",
      status:
        entry.status === "unknown" || entry.status === "skipped" ? entry.status : "answered",
    }))
    .slice(0, 24);
}

function sanitizeGuided(value: unknown): BuilderDraft["guided"] {
  if (!isRecord(value)) return defaultGuidedState;
  return {
    step: steps.includes(value.step as GuidedStep) ? (value.step as GuidedStep) : "idea",
    idea: typeof value.idea === "string" ? value.idea.slice(0, 2000) : "",
    answers: sanitizeAnswers(value.answers),
    brief: isRecord(value.brief) ? (value.brief as unknown as ProjectBrief) : null,
    budget: typeof value.budget === "number" && value.budget >= 3 && value.budget <= 12 ? Math.round(value.budget) : 5,
    depth: depths.includes(value.depth as PromptDepth) ? (value.depth as PromptDepth) : "balanced",
    targetAgent: agents.includes(value.targetAgent as TargetAgentId)
      ? (value.targetAgent as TargetAgentId)
      : "general",
    briefConfirmed: value.briefConfirmed === true,
    categoryHint:
      typeof value.categoryHint === "string" && (CATEGORY_IDS as readonly string[]).includes(value.categoryHint)
        ? value.categoryHint
        : "",
  };
}

export function readBuilderDraft(): BuilderDraft {
  if (typeof window === "undefined") return defaultBuilderDraft;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBuilderDraft;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return defaultBuilderDraft;
    return {
      mode: modes.includes(parsed.mode as BuilderMode) ? (parsed.mode as BuilderMode) : "guided",
      configuration: sanitizeConfiguration(parsed.configuration),
      guided: sanitizeGuided(parsed.guided),
    };
  } catch {
    return defaultBuilderDraft;
  }
}

let snapshot: BuilderDraft | null = null;

/**
 * `useSyncExternalStore` requires a stable reference between updates, so the
 * last written draft is cached until the storage event says otherwise.
 */
export function getBuilderDraftSnapshot(): BuilderDraft {
  if (typeof window === "undefined") return defaultBuilderDraft;
  if (!snapshot) snapshot = readBuilderDraft();
  return snapshot;
}

export function getBuilderDraftServerSnapshot(): BuilderDraft {
  return defaultBuilderDraft;
}

export function subscribeBuilderDraft(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(BUILDER_DRAFT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(BUILDER_DRAFT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function writeBuilderDraft(next: BuilderDraft) {
  if (typeof window === "undefined") {
    snapshot = next;
    return;
  }
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // A full or blocked localStorage must not break the builder.
  }
  window.dispatchEvent(new Event(BUILDER_DRAFT_EVENT));
}

export function updateBuilderDraft(updater: (current: BuilderDraft) => BuilderDraft) {
  writeBuilderDraft(updater(getBuilderDraftSnapshot()));
}

export function clearBuilderDraft() {
  if (typeof window === "undefined") return;
  snapshot = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(BUILDER_DRAFT_EVENT));
  } catch {
    // ignore
  }
}

/**
 * Configuration handed from Guided Mode to Advanced Mode. The brief, depth,
 * and target agent survive so the user does not lose their work on switch.
 */
export function configurationFromBrief(
  base: PromptConfiguration,
  brief: ProjectBrief,
  depth: PromptDepth,
  targetAgent: TargetAgentId,
): PromptConfiguration {
  const sectionText = (pattern: RegExp) =>
    brief.sections
      .filter((section) => pattern.test(section.heading))
      .map((section) => section.content.trim())
      .filter(Boolean)
      .join("\n");

  const requirements = brief.sections
    .filter((section) => /requirement|what it must do|scope/i.test(section.heading))
    .flatMap((section) => section.content.split("\n"))
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter((line) => line.length > 3)
    .slice(0, 8);

  return {
    ...base,
    category: brief.category as PromptConfiguration["category"],
    objective: brief.objective,
    audience: sectionText(/audience|target users|reader|stakeholders/i).slice(0, 400),
    context: [brief.summary, sectionText(/background|problem|overview/i)].filter(Boolean).join("\n\n").slice(0, 3000),
    visualPreferences: base.visualPreferences,
    outputRequirements: base.outputRequirements.length
      ? base.outputRequirements
      : brief.sections
          .filter((section) => /deliverable|output/i.test(section.heading))
          .flatMap((section) => section.content.split("\n"))
          .map((line) => line.replace(/^[-*\s]+/, "").trim())
          .filter((line) => line.length > 3)
          .slice(0, 8),
    constraints: base.constraints.length ? base.constraints : requirements.slice(0, 8),
    depth,
    targetAgent,
    brief,
  };
}

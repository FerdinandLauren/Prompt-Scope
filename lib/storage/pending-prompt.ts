import type { GeneratedPrompt, PromptConfiguration } from "@/types/prompt";
import { CATEGORY_IDS, type CategoryId } from "@/config/domains";

const PENDING_KEY = "promptscope.pending.v1";

function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && (CATEGORY_IDS as readonly string[]).includes(value);
}


export const PENDING_PROMPT_KEY = PENDING_KEY;

export type PendingPrompt = {
  prompt: string;
  title: string;
  category: PromptConfiguration["category"];
  configuration?: PromptConfiguration;
  generated?: GeneratedPrompt;
  sessionId?: string;
  versionId?: string;
  createdAt: string;
};

export function savePendingPrompt(pending: PendingPrompt) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    window.dispatchEvent(new Event("promptscope:handoff"));
  } catch {
    // Session storage may be unavailable; navigation still works without the handoff.
  }
}

export function readPendingPrompt(): PendingPrompt | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingPrompt>;
    if (!parsed.prompt || typeof parsed.prompt !== "string") return null;
    return {
      prompt: parsed.prompt,
      title: parsed.title ?? "Untitled prompt",
      category: isCategoryId(parsed.category) ? parsed.category : "ui_ux",
      configuration: parsed.configuration,
      generated: parsed.generated,
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : undefined,
      versionId: typeof parsed.versionId === "string" ? parsed.versionId : undefined,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearPendingPrompt() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
    window.dispatchEvent(new Event("promptscope:handoff"));
  } catch {
    // ignore
  }
}

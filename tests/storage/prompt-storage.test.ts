import { beforeAll, beforeEach, describe, expect, it } from "vitest";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length() {
    return this.map.size;
  }

  clear() {
    this.map.clear();
  }

  getItem(key: string) {
    return this.map.get(key) ?? null;
  }

  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.map.delete(key);
  }

  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
}

const storage = new MemoryStorage();

beforeAll(() => {
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: storage,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
    },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
});

const {
  addVersion,
  createSession,
  deleteSession,
  deleteVersion,
  duplicateSessionAsNew,
  exportSessions,
  getSession,
  listSessionSummaries,
  setVersionEvaluation,
  updateVersionText,
  clearSessions,
} = await import("@/lib/storage/prompt-storage");

const evaluation = (score: number) => ({
  id: `snap-${score}`,
  overallScore: score,
  rubricVersion: "visual-uiux-v1",
  category: "ui_ux",
  createdAt: new Date().toISOString(),
  source: "demo" as const,
  dimensions: {
    clarity: score,
    context: score,
    specificity: score,
    visual_direction: score,
    composition: score,
    typography: score,
    constraints: score,
    output_definition: score,
  },
  dimensionDetails: [],
  summary: "summary",
  strengths: [],
  weaknesses: [],
  missingInformation: [],
  contradictions: [],
  recommendations: [],
  promptHash: "00000000",
});

describe("prompt history storage", () => {
  beforeEach(() => {
    clearSessions();
  });

  it("creates a session with version 1 as the current version", () => {
    const session = createSession({
      title: "Churn dashboard",
      category: "ui_ux",
      promptText: "Design a calm analytics dashboard.",
      source: "generated",
    });

    expect(session.versions).toHaveLength(1);
    expect(session.versions[0]!.versionNumber).toBe(1);
    expect(session.currentVersionId).toBe(session.versions[0]!.id);
    expect(getSession(session.id)?.title).toBe("Churn dashboard");
  });

  it("appends versions in order and moves the current pointer", () => {
    const session = createSession({
      title: "Session",
      category: "ui_ux",
      promptText: "Version one prompt text.",
      source: "generated",
    });

    const updated = addVersion({
      sessionId: session.id,
      promptText: "Version two prompt text.",
      source: "improved",
      evaluation: evaluation(70),
      label: "Improved revision",
    });

    expect(updated.versions.map((version) => version.versionNumber)).toEqual([1, 2]);
    expect(updated.currentVersionId).toBe(updated.versions[1]!.id);
    expect(updated.versions[1]!.evaluation?.overallScore).toBe(70);
  });

  it("keeps earlier versions unchanged when a new version is added", () => {
    const session = createSession({
      title: "Session",
      category: "ui_ux",
      promptText: "Original prompt.",
      source: "manual",
      evaluation: evaluation(40),
    });

    addVersion({
      sessionId: session.id,
      promptText: "Improved prompt.",
      source: "improved",
      evaluation: evaluation(80),
    });

    const stored = getSession(session.id)!;
    expect(stored.versions[0]!.promptText).toBe("Original prompt.");
    expect(stored.versions[0]!.evaluation?.overallScore).toBe(40);
    expect(stored.versions[1]!.evaluation?.overallScore).toBe(80);
  });

  it("records an evaluation snapshot on an existing version without adding one", () => {
    const session = createSession({
      title: "Session",
      category: "ui_ux",
      promptText: "Prompt to evaluate.",
      source: "generated",
    });

    const updated = setVersionEvaluation(session.id, session.currentVersionId, evaluation(58))!;
    expect(updated.versions).toHaveLength(1);
    expect(updated.versions[0]!.evaluation?.overallScore).toBe(58);
  });

  it("invalidates only the edited version's evaluation and keeps the text history", () => {
    const session = createSession({
      title: "Session",
      category: "ui_ux",
      promptText: "First text.",
      source: "manual",
      evaluation: evaluation(50),
    });
    const second = addVersion({
      sessionId: session.id,
      promptText: "Second text.",
      source: "improved",
      evaluation: evaluation(75),
    });

    updateVersionText(session.id, second.versions[1]!.id, "Second text, edited manually.");

    const stored = getSession(session.id)!;
    expect(stored.versions[0]!.evaluation?.overallScore).toBe(50);
    expect(stored.versions[0]!.promptText).toBe("First text.");
    expect(stored.versions[1]!.promptText).toBe("Second text, edited manually.");
    expect(stored.versions[1]!.evaluation).toBeUndefined();
  });

  it("refuses to delete the last remaining version", () => {
    const session = createSession({
      title: "Session",
      category: "ui_ux",
      promptText: "Only version.",
      source: "manual",
    });
    expect(() => deleteVersion(session.id, session.currentVersionId)).toThrow(/at least one version/i);
  });

  it("moves the current pointer when the current version is deleted", () => {
    const session = createSession({
      title: "Session",
      category: "ui_ux",
      promptText: "v1",
      source: "manual",
    });
    const withSecond = addVersion({ sessionId: session.id, promptText: "v2", source: "improved" });
    const updated = deleteVersion(session.id, withSecond.versions[1]!.id)!;

    expect(updated.versions).toHaveLength(1);
    expect(updated.currentVersionId).toBe(updated.versions[0]!.id);
  });

  it("deletes a whole session and reports an empty summary list", () => {
    const session = createSession({
      title: "Session",
      category: "ui_ux",
      promptText: "Prompt.",
      source: "manual",
    });
    deleteSession(session.id);
    expect(getSession(session.id)).toBeNull();
    expect(listSessionSummaries()).toHaveLength(0);
  });

  it("summarises the latest score from the current version only", () => {
    const session = createSession({
      title: "Session",
      category: "ui_ux",
      promptText: "v1",
      source: "manual",
      evaluation: evaluation(30),
    });
    addVersion({ sessionId: session.id, promptText: "v2", source: "manual" });

    const summary = listSessionSummaries().find((item) => item.id === session.id)!;
    expect(summary.versionCount).toBe(2);
    expect(summary.latestScore).toBeNull();
  });

  it("tolerates corrupted storage instead of crashing", () => {
    storage.setItem("promptscope.sessions.v1", "{not json");
    expect(listSessionSummaries()).toEqual([]);

    storage.setItem("promptscope.sessions.v1", JSON.stringify([{ nope: true }, 42]));
    expect(listSessionSummaries()).toEqual([]);
  });

  it("drops snapshots that do not look like evaluations", () => {
    storage.setItem(
      "promptscope.sessions.v1",
      JSON.stringify([
        {
          id: "s1",
          title: "Broken",
          category: "ui_ux",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          currentVersionId: "v1",
          versions: [
            {
              id: "v1",
              versionNumber: 1,
              promptText: "text",
              createdAt: new Date().toISOString(),
              source: "manual",
              evaluation: { nonsense: true },
            },
          ],
        },
      ]),
    );

    const summaries = listSessionSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]!.latestScore).toBeNull();
  });

  it("duplicates a session with fresh ids so the copy is independent", () => {
    const session = createSession({
      title: "Original",
      category: "ui_ux",
      promptText: "Prompt.",
      source: "manual",
    });
    const copy = duplicateSessionAsNew(session);
    expect(copy.id).not.toBe(session.id);
    expect(copy.title).toMatch(/copy/i);
    expect(copy.versions[0]!.id).not.toBe(session.versions[0]!.id);
    expect(listSessionSummaries()).toHaveLength(2);
  });

  it("exports a versioned snapshot of the library", () => {
    createSession({
      title: "Exported",
      category: "ui_ux",
      promptText: "Prompt.",
      source: "manual",
    });
    const exported = JSON.parse(exportSessions());
    expect(exported.version).toBe(1);
    expect(exported.sessions).toHaveLength(1);
    expect(exported.exportedAt).toBeTruthy();
  });
});

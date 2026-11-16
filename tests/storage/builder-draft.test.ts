import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { emptyConfiguration } from "@/config/presets";
import type { ProjectBrief } from "@/types/guided";

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
  clearBuilderDraft,
  configurationFromBrief,
  defaultBuilderDraft,
  getBuilderDraftSnapshot,
  readBuilderDraft,
  sanitizeConfiguration,
  updateBuilderDraft,
  writeBuilderDraft,
} = await import("@/lib/storage/builder-draft");

const STORAGE_KEY = "promptscope.builder.v2";

const brief: ProjectBrief = {
  title: "Support refund console",
  objective: "Give support agents a single place to review and approve refund requests.",
  summary: "Internal console for the support team.",
  category: "backend",
  complexity: "moderate",
  sections: [
    {
      id: "audience",
      heading: "Target users",
      content: "Support agents handling 60 refunds a day",
      source: "user",
    },
    {
      id: "requirements",
      heading: "What it must do",
      content: "- List refund requests\n- Approve within role limits\n- Show decision history",
      source: "user",
    },
    {
      id: "deliverables",
      heading: "Deliverables",
      content: "- API contract\n- Admin screen",
      source: "user",
    },
  ],
  assumptions: ["Refunds above 500 need manager approval"],
  unknowns: ["Which payment provider is authoritative"],
};

describe("builder draft persistence", () => {
  beforeEach(() => {
    storage.clear();
    clearBuilderDraft();
  });

  it("starts from a complete default draft", () => {
    expect(defaultBuilderDraft.mode).toBe("guided");
    expect(defaultBuilderDraft.guided.step).toBe("idea");
    expect(defaultBuilderDraft.guided.depth).toBe("balanced");
    expect(defaultBuilderDraft.guided.targetAgent).toBe("general");
    expect(defaultBuilderDraft.configuration.category).toBe("ui_ux");
  });

  it("round-trips a written draft", () => {
    writeBuilderDraft({
      mode: "advanced",
      configuration: { ...emptyConfiguration, category: "backend", objective: "Ship an inventory API" },
      guided: {
        ...defaultBuilderDraft.guided,
        step: "brief",
        idea: "Inventory API",
        budget: 7,
        depth: "detailed",
        targetAgent: "coding",
        brief,
        briefConfirmed: true,
        categoryHint: "backend",
      },
    });

    const restored = readBuilderDraft();
    expect(restored.mode).toBe("advanced");
    expect(restored.configuration.category).toBe("backend");
    expect(restored.configuration.objective).toBe("Ship an inventory API");
    expect(restored.guided.step).toBe("brief");
    expect(restored.guided.budget).toBe(7);
    expect(restored.guided.depth).toBe("detailed");
    expect(restored.guided.targetAgent).toBe("coding");
    expect(restored.guided.briefConfirmed).toBe(true);
    expect(restored.guided.categoryHint).toBe("backend");
    expect(restored.guided.brief?.sections).toHaveLength(3);
  });

  it("returns defaults for missing or corrupted storage", () => {
    expect(readBuilderDraft()).toEqual(defaultBuilderDraft);

    storage.setItem(STORAGE_KEY, "{not json");
    expect(readBuilderDraft()).toEqual(defaultBuilderDraft);

    storage.setItem(STORAGE_KEY, JSON.stringify("a string"));
    expect(readBuilderDraft()).toEqual(defaultBuilderDraft);
  });

  it("repairs out-of-range values instead of trusting them", () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: "sideways",
        configuration: {
          category: "made_up",
          objective: "x".repeat(5_000),
          sliders: { precision: 900, creativity: -40, detail: "high" },
        },
        guided: {
          step: "elsewhere",
          idea: "y".repeat(5_000),
          budget: 200,
          depth: "cosmic",
          targetAgent: "robot",
          answers: [{ questionId: "q1", question: "Q?", answer: "A", status: "bogus" }],
        },
      }),
    );

    const restored = readBuilderDraft();
    expect(restored.mode).toBe("guided");
    expect(restored.configuration.category).toBe("ui_ux");
    expect(restored.configuration.objective).toHaveLength(1_200);
    expect(restored.configuration.sliders.precision).toBe(100);
    expect(restored.configuration.sliders.creativity).toBe(0);
    expect(restored.configuration.sliders.detail).toBe(emptyConfiguration.sliders.detail);
    expect(restored.guided.step).toBe("idea");
    expect(restored.guided.idea).toHaveLength(2_000);
    expect(restored.guided.budget).toBe(5);
    expect(restored.guided.depth).toBe("balanced");
    expect(restored.guided.targetAgent).toBe("general");
    expect(restored.guided.answers[0]?.status).toBe("answered");
  });

  it("exposes a stable snapshot and updates it through updateBuilderDraft", () => {
    const first = getBuilderDraftSnapshot();
    expect(getBuilderDraftSnapshot()).toBe(first);

    updateBuilderDraft((current) => ({ ...current, mode: "advanced" }));
    const second = getBuilderDraftSnapshot();
    expect(second).not.toBe(first);
    expect(second.mode).toBe("advanced");
    expect(readBuilderDraft().mode).toBe("advanced");
  });

  it("clears the draft and its cached snapshot", () => {
    writeBuilderDraft({ ...defaultBuilderDraft, mode: "advanced" });
    clearBuilderDraft();

    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(readBuilderDraft()).toEqual(defaultBuilderDraft);
    expect(getBuilderDraftSnapshot()).toEqual(defaultBuilderDraft);
  });
});

describe("sanitizeConfiguration", () => {
  it("accepts a valid category and normalises optional fields", () => {
    const configuration = sanitizeConfiguration({
      category: "backend",
      objective: "Build it",
      audience: "Ops",
      visualPreferences: ["Minimal", 42, "  ", "Editorial"],
      depth: "detailed",
      targetAgent: "coding",
    });

    expect(configuration.category).toBe("backend");
    expect(configuration.visualPreferences).toEqual(["Minimal", "Editorial"]);
    expect(configuration.depth).toBe("detailed");
    expect(configuration.targetAgent).toBe("coding");
  });

  it("drops unknown depth and agent ids", () => {
    const configuration = sanitizeConfiguration({
      category: "ui_ux",
      depth: "infinite",
      targetAgent: "intern",
    });

    expect(configuration.depth).toBeUndefined();
    expect(configuration.targetAgent).toBeUndefined();
  });
});

describe("configurationFromBrief", () => {
  it("carries the brief into the advanced configuration with depth and agent", () => {
    const configuration = configurationFromBrief(emptyConfiguration, brief, "detailed", "coding");

    expect(configuration.category).toBe("backend");
    expect(configuration.objective).toBe(brief.objective);
    expect(configuration.audience).toContain("Support agents");
    expect(configuration.context).toContain(brief.summary);
    expect(configuration.depth).toBe("detailed");
    expect(configuration.targetAgent).toBe("coding");
    expect(configuration.brief).toBe(brief);
  });

  it("derives requirements and deliverables when none were configured", () => {
    const configuration = configurationFromBrief(emptyConfiguration, brief, "balanced", "general");

    expect(configuration.constraints.length).toBeGreaterThan(0);
    expect(configuration.constraints.join(" ")).toContain("List refund requests");
    expect(configuration.outputRequirements.join(" ")).toMatch(/API contract|Admin screen/);
  });

  it("preserves existing manual constraints and output requirements", () => {
    const configuration = configurationFromBrief(
      {
        ...emptyConfiguration,
        constraints: ["Must run on-premise"],
        outputRequirements: ["Markdown report"],
        visualPreferences: ["Editorial"],
      },
      brief,
      "concise",
      "writing",
    );

    expect(configuration.constraints).toEqual(["Must run on-premise"]);
    expect(configuration.outputRequirements).toEqual(["Markdown report"]);
    expect(configuration.visualPreferences).toEqual(["Editorial"]);
    expect(configuration.depth).toBe("concise");
    expect(configuration.targetAgent).toBe("writing");
  });
});

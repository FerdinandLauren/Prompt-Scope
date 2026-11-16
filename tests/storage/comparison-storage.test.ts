import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { evaluationDimensions } from "@/config/evaluation-rubric";
import type { ComparisonRecord } from "@/types/evaluation";
import type { DimensionKey, EvaluationSnapshot } from "@/types/evaluation";

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
});

const { clearComparisons, comparisonsSnapshot, deleteComparison, getComparison, listComparisons, saveComparison } =
  await import("@/lib/storage/comparison-storage");

function snapshot(score: number, createdAt: string): EvaluationSnapshot {
  return {
    id: `snap-${score}`,
    overallScore: score,
    rubricVersion: "visual-uiux-v1",
    category: "ui_ux",
    createdAt,
    source: "demo",
    dimensions: Object.fromEntries(
      evaluationDimensions.map((dimension) => [dimension.key, score]),
    ) as Record<DimensionKey, number>,
    dimensionDetails: [],
    summary: "summary",
    strengths: [],
    weaknesses: [],
    missingInformation: [],
    contradictions: [],
    recommendations: [],
    promptHash: "00000000",
  };
}

function record(id: string, createdAt: string): ComparisonRecord {
  return {
    id,
    createdAt,
    title: `Comparison ${id}`,
    category: "ui_ux",
    rubricVersion: "visual-uiux-v1",
    originalPrompt: "original prompt text",
    improvedPrompt: "improved prompt text",
    original: snapshot(40, createdAt),
    improved: snapshot(70, createdAt),
    improvement: null,
  };
}

describe("comparison storage", () => {
  beforeEach(() => {
    clearComparisons();
  });

  it("saves a comparison and reads it back", () => {
    saveComparison(record("a", "2026-01-01T00:00:00.000Z"));
    expect(listComparisons()).toHaveLength(1);
    expect(getComparison("a")?.improved.overallScore).toBe(70);
  });

  it("returns the newest comparison first", () => {
    saveComparison(record("old", "2026-01-01T00:00:00.000Z"));
    saveComparison(record("new", "2026-03-01T00:00:00.000Z"));
    expect(listComparisons().map((item) => item.id)).toEqual(["new", "old"]);
  });

  it("replaces a record with the same id instead of duplicating it", () => {
    saveComparison(record("same", "2026-01-01T00:00:00.000Z"));
    saveComparison(record("same", "2026-02-01T00:00:00.000Z"));
    expect(listComparisons()).toHaveLength(1);
  });

  it("deletes a single record", () => {
    saveComparison(record("a", "2026-01-01T00:00:00.000Z"));
    saveComparison(record("b", "2026-01-02T00:00:00.000Z"));
    deleteComparison("a");
    expect(listComparisons().map((item) => item.id)).toEqual(["b"]);
  });

  it("returns a stable array reference between reads so React can compare snapshots", () => {
    saveComparison(record("a", "2026-01-01T00:00:00.000Z"));
    const first = comparisonsSnapshot();
    const second = comparisonsSnapshot();
    expect(first).toBe(second);
  });

  it("tolerates corrupted storage", () => {
    storage.setItem("promptscope.comparisons.v1", "}}not json");
    expect(listComparisons()).toEqual([]);
    expect(comparisonsSnapshot()).toEqual([]);
  });

  it("ignores entries that are not comparisons", () => {
    storage.setItem(
      "promptscope.comparisons.v1",
      JSON.stringify([{ id: "x" }, { id: "y", originalPrompt: 1, improvedPrompt: 2 }, null]),
    );
    expect(listComparisons()).toEqual([]);
  });

  it("keeps at most twenty records", () => {
    for (let index = 0; index < 24; index += 1) {
      saveComparison(record(`r${index}`, `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`));
    }
    expect(listComparisons().length).toBeLessThanOrEqual(20);
  });
});

"use client";

import type { ComparisonRecord } from "@/types/evaluation";

const KEY = "promptscope.comparisons.v1";
const MAX_RECORDS = 20;
const EVENT = "promptscope:comparisons";

function read(): ComparisonRecord[] {
  return comparisonsSnapshot();
}

function isRecord(value: unknown): value is ComparisonRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ComparisonRecord>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.originalPrompt === "string" &&
    typeof candidate.improvedPrompt === "string" &&
    Boolean(candidate.original && candidate.improved)
  );
}

let cachedRaw: string | null = null;
let cachedRecords: ComparisonRecord[] = [];

/**
 * Returns a stable array reference for the current stored value, which is what
 * useSyncExternalStore requires to avoid infinite re-renders.
 */
export function comparisonsSnapshot(): ComparisonRecord[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedRecords;

  cachedRaw = raw;
  const parsed = parseRecords(raw);
  cachedRecords = parsed.length > 0 ? parsed : EMPTY;
  return cachedRecords;
}

const EMPTY: ComparisonRecord[] = [];

function parseRecords(raw: string | null): ComparisonRecord[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return (parsed.filter(isRecord) as ComparisonRecord[]).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  } catch {
    return EMPTY;
  }
}

function write(records: ComparisonRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  window.dispatchEvent(new Event(EVENT));
}

export function listComparisons(): ComparisonRecord[] {
  return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getComparison(id: string): ComparisonRecord | null {
  return read().find((record) => record.id === id) ?? null;
}

export function saveComparison(record: ComparisonRecord) {
  const existing = read().filter((item) => item.id !== record.id);
  write([record, ...existing]);
}

export function deleteComparison(id: string) {
  write(read().filter((record) => record.id !== id));
}

export function clearComparisons() {
  write([]);
}

export function subscribeToComparisons(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

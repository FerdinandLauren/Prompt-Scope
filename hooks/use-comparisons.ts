"use client";

import { useSyncExternalStore } from "react";
import { comparisonsSnapshot, subscribeToComparisons } from "@/lib/storage/comparison-storage";
import type { ComparisonRecord } from "@/types/evaluation";

const EMPTY: ComparisonRecord[] = [];

/** Reads saved comparisons without a hydration mismatch. */
export function useComparisons() {
  return useSyncExternalStore(subscribeToComparisons, comparisonsSnapshot, () => EMPTY);
}

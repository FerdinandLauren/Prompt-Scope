"use client";

import { useSyncExternalStore } from "react";
import { PENDING_PROMPT_KEY, readPendingPrompt } from "@/lib/storage/pending-prompt";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener("promptscope:handoff", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener("promptscope:handoff", onChange);
  };
}

let cachedRaw: string | null = null;
let cachedValue: ReturnType<typeof readPendingPrompt> = null;

function getSnapshot() {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PENDING_PROMPT_KEY);
  } catch {
    return cachedValue;
  }

  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  cachedValue = readPendingPrompt();
  return cachedValue;
}

function getServerSnapshot() {
  return null;
}

/**
 * Reads the builder handoff from session storage without a hydration mismatch:
 * the server snapshot is always empty, and the browser snapshot is replaced
 * after hydration.
 */
export function usePendingPrompt() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

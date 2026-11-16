"use client";

import { useSyncExternalStore } from "react";
import { readPendingPrompt } from "@/lib/storage/pending-prompt";

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

function getSnapshot() {
  const next = readPendingPrompt();
  return next ?? null;
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

export function notifyPendingPromptChanged() {
  for (const listener of listeners) listener();
}

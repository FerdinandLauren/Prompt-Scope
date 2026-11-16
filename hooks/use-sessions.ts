"use client";

import { useSyncExternalStore } from "react";
import { sessionsSnapshot, subscribeToSessions } from "@/lib/storage/prompt-storage";
import type { PromptSession } from "@/types/history";

const EMPTY: PromptSession[] = [];

/** Reads saved sessions without a hydration mismatch. */
export function useSessions() {
  return useSyncExternalStore(subscribeToSessions, sessionsSnapshot, () => EMPTY);
}

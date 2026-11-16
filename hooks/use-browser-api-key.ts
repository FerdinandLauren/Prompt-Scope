"use client";

import { useSyncExternalStore } from "react";
import {
  browserKeySnapshot,
  clearBrowserApiKey,
  saveBrowserApiKey,
  subscribeToBrowserKey,
  type BrowserKeySnapshot,
} from "@/lib/storage/browser-api-key";

const EMPTY: BrowserKeySnapshot = { hasKey: false, remembered: false, masked: "" };

/**
 * Reads the browser API key state without a hydration mismatch, and exposes the
 * save/clear actions. The key itself is never returned to components.
 */
export function useBrowserApiKey() {
  const snapshot = useSyncExternalStore(subscribeToBrowserKey, browserKeySnapshot, () => EMPTY);
  return {
    hasKey: snapshot.hasKey,
    remembered: snapshot.remembered,
    masked: snapshot.masked,
    save: saveBrowserApiKey,
    clear: clearBrowserApiKey,
  };
}

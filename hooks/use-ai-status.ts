"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getJson } from "@/lib/api/client";
import { browserKeySnapshot, subscribeToBrowserKey } from "@/lib/storage/browser-api-key";
import type { AiStatus } from "@/types/settings";

const FALLBACK: AiStatus = { mode: "demo", model: null, configured: false, source: "none" };

// One shared request per configuration change, no matter how many badges are mounted.
let statusPromise: Promise<AiStatus> | null = null;

function loadStatus(): Promise<AiStatus> {
  if (!statusPromise) {
    statusPromise = getJson<AiStatus>("/api/ai/status").then((result) =>
      result.ok ? result.data : FALLBACK,
    );
  }
  return statusPromise;
}

function browserKeySignature() {
  const snapshot = browserKeySnapshot();
  return `${snapshot.hasKey ? "key" : "none"}:${snapshot.remembered ? "remembered" : "session"}`;
}

export function useAiStatus() {
  const keySignature = useSyncExternalStore(subscribeToBrowserKey, browserKeySignature, () => "none");
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    let active = true;
    statusPromise = null;
    loadStatus().then((next) => {
      if (active) setStatus(next);
    });
    return () => {
      active = false;
    };
  }, [keySignature]);

  return { status: status ?? FALLBACK, loading: status === null };
}

/** Clears the shared cache so the next read reflects a changed configuration. */
export function resetAiStatusCache() {
  statusPromise = null;
}

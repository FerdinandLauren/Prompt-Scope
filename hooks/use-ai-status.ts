"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getJson } from "@/lib/api/client";
import { PROVIDER_IDS } from "@/types/ai";
import {
  providerKeySnapshot,
  subscribeToProviderKeys,
} from "@/lib/storage/provider-api-key";
import { aiConfigSnapshot, subscribeToAiConfig } from "@/lib/storage/ai-providers";
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

/** Covered by `subscribeToProviderKeys`, including the legacy Gemini key. */
function providerSignature() {
  return PROVIDER_IDS.map((provider) => {
    const snapshot = providerKeySnapshot(provider);
    return `${provider}:${snapshot.hasKey ? "key" : "none"}:${snapshot.remembered ? "remembered" : "session"}`;
  }).join("|");
}

function configSignature() {
  return JSON.stringify(aiConfigSnapshot());
}

export function useAiStatus() {
  const keySignature = useSyncExternalStore(subscribeToProviderKeys, providerSignature, () => "none");
  const routingSignature = useSyncExternalStore(subscribeToAiConfig, configSignature, () => "none");
  const [nonce, setNonce] = useState(0);
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
  }, [keySignature, routingSignature, nonce]);

  /** Re-reads status after an action that changes health but not configuration. */
  function refresh() {
    setNonce((current) => current + 1);
  }

  return { status: status ?? FALLBACK, loading: status === null, refresh };
}

/** Clears the shared cache so the next read reflects a changed configuration. */
export function resetAiStatusCache() {
  statusPromise = null;
}

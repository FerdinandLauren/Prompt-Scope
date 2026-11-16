"use client";

import { useSyncExternalStore } from "react";
import { PROVIDER_IDS, type AiClientConfig, type ProviderId } from "@/types/ai";
import {
  aiConfigSnapshot,
  DEFAULT_AI_CONFIG,
  saveAiConfig,
  subscribeToAiConfig,
  withProviderPreference,
  withRoutingPreference,
} from "@/lib/storage/ai-providers";
import {
  clearProviderApiKey,
  providerKeySnapshot,
  saveProviderApiKey,
  subscribeToProviderKeys,
  type ProviderKeySnapshot,
} from "@/lib/storage/provider-api-key";

/** Key state for every provider, without exposing the keys themselves. */
export function useProviderKeys(): Record<ProviderId, ProviderKeySnapshot> {
  const signature = useSyncExternalStore(
    subscribeToProviderKeys,
    () =>
      PROVIDER_IDS.map((provider) => {
        const snapshot = providerKeySnapshot(provider);
        return `${provider}:${snapshot.hasKey}:${snapshot.remembered}:${snapshot.masked}`;
      }).join("|"),
    () => "server",
  );
  void signature;

  return Object.fromEntries(
    PROVIDER_IDS.map((provider) => [provider, providerKeySnapshot(provider)]),
  ) as Record<ProviderId, ProviderKeySnapshot>;
}

export function useAiConfig() {
  const config = useSyncExternalStore(
    subscribeToAiConfig,
    aiConfigSnapshot,
    () => DEFAULT_AI_CONFIG,
  );

  return {
    config,
    save(next: AiClientConfig) {
      return saveAiConfig(next);
    },
    setProvider(provider: ProviderId, patch: Parameters<typeof withProviderPreference>[2]) {
      return saveAiConfig(withProviderPreference(config, provider, patch));
    },
    setRouting(patch: Parameters<typeof withRoutingPreference>[1]) {
      return saveAiConfig(withRoutingPreference(config, patch));
    },
  };
}

export function useProviderKeyActions() {
  return { save: saveProviderApiKey, clear: clearProviderApiKey };
}

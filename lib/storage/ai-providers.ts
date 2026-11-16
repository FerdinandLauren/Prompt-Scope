import type { AiClientConfig, AiProviderPreference, AiRoutingPreference, ProviderId } from "@/types/ai";
import { sanitizeClientConfig } from "@/lib/ai/providers/preferences";

/**
 * Non-secret AI preferences. Provider keys live in a separate module and are
 * never written here.
 */

export const AI_CONFIG_STORAGE_KEY = "promptscope.ai.providers.v1";
export const AI_CONFIG_EVENT = "promptscope:ai-config";

export const DEFAULT_ROUTING: Required<Pick<AiRoutingPreference, "mode" | "preferredProvider" | "fallbackOrder" | "fallbackEnabled">> & {
  manual: AiRoutingPreference["manual"];
} = {
  mode: "auto_fallback",
  preferredProvider: "auto",
  fallbackOrder: ["gemini", "vikey", "dattio"],
  fallbackEnabled: true,
  manual: null,
};

const DEFAULT_CONFIG: AiClientConfig = Object.freeze({
  providers: {},
  routing: { ...DEFAULT_ROUTING, fallbackOrder: [...DEFAULT_ROUTING.fallbackOrder] },
}) as AiClientConfig;

export const DEFAULT_AI_CONFIG = DEFAULT_CONFIG;

let cachedSignature: string | null = null;
let cachedConfig: AiClientConfig = DEFAULT_CONFIG;

function deviceStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function aiConfigSnapshot(): AiClientConfig {
  const raw = deviceStore()?.getItem(AI_CONFIG_STORAGE_KEY) ?? null;
  if (raw === cachedSignature) return cachedConfig;

  cachedSignature = raw;
  if (!raw) {
    cachedConfig = DEFAULT_CONFIG;
    return cachedConfig;
  }

  try {
    cachedConfig = sanitizeClientConfig(JSON.parse(raw));
  } catch {
    cachedConfig = DEFAULT_CONFIG;
  }
  return cachedConfig;
}

export function subscribeToAiConfig(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(AI_CONFIG_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(AI_CONFIG_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AI_CONFIG_EVENT));
}

export function saveAiConfig(next: AiClientConfig): { ok: boolean; error?: string } {
  const store = deviceStore();
  if (!store) return { ok: false, error: "This browser is not allowing local storage." };

  const sanitized = sanitizeClientConfig(next);
  try {
    store.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
    notify();
    return { ok: true };
  } catch {
    return { ok: false, error: "AI preferences could not be saved in this browser." };
  }
}

export function updateAiConfig(
  updater: (current: AiClientConfig) => AiClientConfig,
): { ok: boolean; error?: string } {
  return saveAiConfig(updater(aiConfigSnapshot()));
}

export function withProviderPreference(
  config: AiClientConfig,
  provider: ProviderId,
  patch: AiProviderPreference,
): AiClientConfig {
  return {
    ...config,
    providers: {
      ...config.providers,
      [provider]: { ...config.providers?.[provider], ...patch },
    },
  };
}

export function withRoutingPreference(
  config: AiClientConfig,
  patch: AiRoutingPreference,
): AiClientConfig {
  return {
    ...config,
    routing: {
      ...DEFAULT_ROUTING,
      ...config.routing,
      ...patch,
      fallbackOrder: patch.fallbackOrder ?? config.routing?.fallbackOrder ?? DEFAULT_ROUTING.fallbackOrder,
      manual: patch.manual !== undefined ? patch.manual : config.routing?.manual ?? null,
    },
  };
}

function sameOrder(a: readonly ProviderId[], b: readonly ProviderId[]) {
  return a.length === b.length && a.every((provider, index) => provider === b[index]);
}

function isDefaultRouting(routing: AiRoutingPreference | undefined): boolean {
  if (!routing) return true;
  return (
    (routing.mode ?? DEFAULT_ROUTING.mode) === DEFAULT_ROUTING.mode &&
    (routing.preferredProvider ?? DEFAULT_ROUTING.preferredProvider) ===
      DEFAULT_ROUTING.preferredProvider &&
    sameOrder(routing.fallbackOrder ?? DEFAULT_ROUTING.fallbackOrder, DEFAULT_ROUTING.fallbackOrder) &&
    (routing.fallbackEnabled ?? DEFAULT_ROUTING.fallbackEnabled) ===
      DEFAULT_ROUTING.fallbackEnabled &&
    (routing.manual ?? null) === null
  );
}

/** Header value for `/api/ai/*` requests. Omitted while everything is default. */
export function aiConfigHeaderValue(): string | null {
  const snapshot = aiConfigSnapshot();
  const hasProviders = Object.keys(snapshot.providers ?? {}).length > 0;
  if (!hasProviders && isDefaultRouting(snapshot.routing)) return null;
  return JSON.stringify(snapshot);
}

export function clearAiConfig() {
  deviceStore()?.removeItem(AI_CONFIG_STORAGE_KEY);
  notify();
}

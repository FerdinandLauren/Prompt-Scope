import { isUsableApiKey, maskApiKey } from "@/lib/security/browser-api-key";
import { PROVIDER_IDS, type ProviderId } from "@/types/ai";
import {
  BROWSER_KEY_EVENT,
  clearBrowserApiKey,
  getBrowserApiKey,
  saveBrowserApiKey,
  subscribeToBrowserKey,
} from "@/lib/storage/browser-api-key";

/**
 * Per-provider browser key storage. Gemini keeps using the existing keys and
 * security model, so an already-saved key continues to work unchanged. Other
 * provider keys use the same session-first / opt-in-device policy.
 */

export const PROVIDER_KEY_EVENT = "promptscope:provider-keys";

export type ProviderKeySnapshot = {
  hasKey: boolean;
  remembered: boolean;
  masked: string;
};

const EMPTY: ProviderKeySnapshot = { hasKey: false, remembered: false, masked: "" };

function storageKeys(provider: ProviderId) {
  return {
    session: `promptscope.providerKey.${provider}.session`,
    device: `promptscope.providerKey.${provider}.device.v1`,
  };
}

function sessionStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function deviceStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROVIDER_KEY_EVENT));
}

export function getProviderApiKey(provider: ProviderId): string | null {
  if (provider === "gemini") return getBrowserApiKey();

  const keys = storageKeys(provider);
  const session = sessionStore()?.getItem(keys.session) ?? null;
  if (isUsableApiKey(session)) return session.trim();
  const device = deviceStore()?.getItem(keys.device) ?? null;
  return isUsableApiKey(device) ? device.trim() : null;
}

/** Only keys that travel in the multi-provider header (Gemini keeps its own). */
export function getAdditionalProviderKeys(): Partial<Record<ProviderId, string>> {
  const result: Partial<Record<ProviderId, string>> = {};
  for (const provider of PROVIDER_IDS) {
    if (provider === "gemini") continue;
    const key = getProviderApiKey(provider);
    if (key) result[provider] = key;
  }
  return result;
}

const cache = new Map<ProviderId, { signature: string; snapshot: ProviderKeySnapshot }>();

export function providerKeySnapshot(provider: ProviderId): ProviderKeySnapshot {
  if (provider === "gemini") {
    // Reuse the legacy snapshot logic but keep this module's shape.
    const legacy = getBrowserApiKey();
    const sessionRaw = sessionStore()?.getItem("promptscope.browserApiKey.session") ?? null;
    const deviceRaw = deviceStore()?.getItem("promptscope.browserApiKey.device.v1") ?? null;
    const cached = cache.get(provider);
    const signature = `${sessionRaw ?? ""}|${deviceRaw ?? ""}`;
    if (cached && cached.signature === signature) return cached.snapshot;
    const snapshot: ProviderKeySnapshot = legacy
      ? { hasKey: true, remembered: !isUsableApiKey(sessionRaw), masked: maskApiKey(legacy) }
      : EMPTY;
    cache.set(provider, { signature, snapshot });
    return snapshot;
  }

  const keys = storageKeys(provider);
  const sessionRaw = sessionStore()?.getItem(keys.session) ?? null;
  const deviceRaw = deviceStore()?.getItem(keys.device) ?? null;
  const signature = `${sessionRaw ?? ""}|${deviceRaw ?? ""}`;
  const cached = cache.get(provider);
  if (cached && cached.signature === signature) return cached.snapshot;

  const active = isUsableApiKey(sessionRaw)
    ? sessionRaw.trim()
    : isUsableApiKey(deviceRaw)
      ? deviceRaw.trim()
      : null;
  const snapshot: ProviderKeySnapshot = active
    ? {
        hasKey: true,
        remembered: !isUsableApiKey(sessionRaw) && isUsableApiKey(deviceRaw),
        masked: maskApiKey(active),
      }
    : EMPTY;
  cache.set(provider, { signature, snapshot });
  return snapshot;
}

export function subscribeToProviderKeys(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const unsubscribeLegacy = subscribeToBrowserKey(listener);
  window.addEventListener(PROVIDER_KEY_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    unsubscribeLegacy();
    window.removeEventListener(PROVIDER_KEY_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function saveProviderApiKey(
  provider: ProviderId,
  key: string,
  remember: boolean,
): { ok: boolean; error?: string } {
  if (provider === "gemini") return saveBrowserApiKey(key, remember);

  const trimmed = key.trim();
  if (!isUsableApiKey(trimmed)) {
    return {
      ok: false,
      error: "Paste a valid API key (no placeholder text, at most 256 characters).",
    };
  }

  const session = sessionStore();
  const device = deviceStore();
  if (!session || !device) {
    return { ok: false, error: "This browser is not allowing local storage, so the key cannot be kept." };
  }

  const keys = storageKeys(provider);
  try {
    if (remember) {
      device.setItem(keys.device, trimmed);
      session.removeItem(keys.session);
    } else {
      session.setItem(keys.session, trimmed);
      device.removeItem(keys.device);
    }
    notify();
    return { ok: true };
  } catch {
    return { ok: false, error: "The key could not be saved in this browser." };
  }
}

export function clearProviderApiKey(provider: ProviderId) {
  if (provider === "gemini") {
    clearBrowserApiKey();
    return;
  }
  const keys = storageKeys(provider);
  sessionStore()?.removeItem(keys.session);
  deviceStore()?.removeItem(keys.device);
  notify();
}

export { BROWSER_KEY_EVENT };

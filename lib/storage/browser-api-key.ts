import { isUsableApiKey, maskApiKey } from "@/lib/security/browser-api-key";

const SESSION_KEY = "promptscope.browserApiKey.session";
const DEVICE_KEY = "promptscope.browserApiKey.device.v1";
export const BROWSER_KEY_EVENT = "promptscope:browser-key";

export type BrowserKeySnapshot = {
  hasKey: boolean;
  remembered: boolean;
  masked: string;
};

const EMPTY: BrowserKeySnapshot = { hasKey: false, remembered: false, masked: "" };

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

export function getBrowserApiKey(): string | null {
  const sessionKey = sessionStore()?.getItem(SESSION_KEY) ?? null;
  if (isUsableApiKey(sessionKey)) return sessionKey.trim();
  const deviceKey = deviceStore()?.getItem(DEVICE_KEY) ?? null;
  return isUsableApiKey(deviceKey) ? deviceKey.trim() : null;
}

let cachedSignature: string | null = null;
let cachedSnapshot: BrowserKeySnapshot = EMPTY;

export function browserKeySnapshot(): BrowserKeySnapshot {
  const sessionRaw = sessionStore()?.getItem(SESSION_KEY) ?? null;
  const deviceRaw = deviceStore()?.getItem(DEVICE_KEY) ?? null;
  const signature = `${sessionRaw ?? ""}|${deviceRaw ?? ""}`;
  if (signature === cachedSignature) return cachedSnapshot;

  cachedSignature = signature;
  const active = isUsableApiKey(sessionRaw) ? sessionRaw.trim() : isUsableApiKey(deviceRaw) ? deviceRaw.trim() : null;
  const remembered = !isUsableApiKey(sessionRaw) && isUsableApiKey(deviceRaw);

  cachedSnapshot = active
    ? { hasKey: true, remembered, masked: maskApiKey(active) }
    : EMPTY;
  return cachedSnapshot;
}

export function subscribeToBrowserKey(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(BROWSER_KEY_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(BROWSER_KEY_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BROWSER_KEY_EVENT));
}

export function saveBrowserApiKey(key: string, remember: boolean): { ok: boolean; error?: string } {
  const trimmed = key.trim();
  if (!isUsableApiKey(trimmed)) {
    return {
      ok: false,
      error: "Paste a valid Gemini API key (at least 20 characters, no placeholder text).",
    };
  }

  const session = sessionStore();
  const device = deviceStore();
  if (!session || !device) {
    return { ok: false, error: "This browser is not allowing local storage, so the key cannot be kept." };
  }

  try {
    if (remember) {
      device.setItem(DEVICE_KEY, trimmed);
      session.removeItem(SESSION_KEY);
    } else {
      session.setItem(SESSION_KEY, trimmed);
      device.removeItem(DEVICE_KEY);
    }
    notify();
    return { ok: true };
  } catch {
    return { ok: false, error: "The key could not be saved in this browser." };
  }
}

export function clearBrowserApiKey() {
  sessionStore()?.removeItem(SESSION_KEY);
  deviceStore()?.removeItem(DEVICE_KEY);
  notify();
}

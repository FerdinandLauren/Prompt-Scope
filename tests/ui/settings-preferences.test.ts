import { beforeAll, beforeEach, describe, expect, it } from "vitest";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
}

const session = new MemoryStorage();
const local = new MemoryStorage();
let systemDark = true;
const listeners = { media: new Set<() => void>() };

beforeAll(() => {  Object.defineProperty(globalThis, "sessionStorage", { value: session, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: local, configurable: true });
  Object.defineProperty(globalThis, "window", {
    value: {
      sessionStorage: session,
      localStorage: local,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
      matchMedia: (query: string) => ({
        matches: query.includes("dark") ? systemDark : !systemDark,
        media: query,
        addEventListener: (_: string, cb: () => void) => listeners.media.add(cb),
        removeEventListener: (_: string, cb: () => void) => listeners.media.delete(cb),
        addListener: (cb: () => void) => listeners.media.add(cb),
        removeListener: (cb: () => void) => listeners.media.delete(cb),
        onchange: null,
        dispatchEvent: () => true,
      }),
    },
    configurable: true,
    writable: true,
  });
});

const apiKeyStore = await import("@/lib/storage/browser-api-key");
const themeStore = await import("@/lib/theme/theme");

const VALID_KEY = "AQ.test-only-browser-key-0000";

describe("browser API key storage", () => {
  beforeEach(() => {
    session.clear();
    local.clear();
  });

  it("starts empty", () => {
    expect(apiKeyStore.getBrowserApiKey()).toBeNull();
    expect(apiKeyStore.browserKeySnapshot()).toEqual({ hasKey: false, remembered: false, masked: "" });
  });

  it("stores a session-only key by default and keeps nothing on the device", () => {
    const result = apiKeyStore.saveBrowserApiKey(VALID_KEY, false);
    expect(result.ok).toBe(true);
    expect(apiKeyStore.getBrowserApiKey()).toBe(VALID_KEY);
    expect(apiKeyStore.browserKeySnapshot()).toEqual({
      hasKey: true,
      remembered: false,
      masked: `••••••••${VALID_KEY.slice(-4)}`,
    });
    expect(local.length).toBe(0);
  });

  it("persists to the device only when remember is requested", () => {
    apiKeyStore.saveBrowserApiKey(VALID_KEY, true);
    const state = apiKeyStore.browserKeySnapshot();
    expect(state.remembered).toBe(true);
    expect(local.length).toBeGreaterThan(0);
    expect(session.length).toBe(0);
  });

  it("rejects unusable input with a readable message", () => {
    const blank = apiKeyStore.saveBrowserApiKey("   ", false);
    expect(blank.ok).toBe(false);
    expect(blank.error).toMatch(/paste|key/i);

    const placeholder = apiKeyStore.saveBrowserApiKey("your_api_key", true);
    expect(placeholder.ok).toBe(false);
    expect(apiKeyStore.getBrowserApiKey()).toBeNull();
  });

  it("clears both session and device copies", () => {
    apiKeyStore.saveBrowserApiKey(VALID_KEY, true);
    apiKeyStore.clearBrowserApiKey();
    expect(apiKeyStore.getBrowserApiKey()).toBeNull();
    expect(local.length).toBe(0);
    expect(session.length).toBe(0);
  });

  it("returns a stable snapshot reference so React cannot loop", () => {
    apiKeyStore.saveBrowserApiKey(VALID_KEY, false);
    expect(apiKeyStore.browserKeySnapshot()).toBe(apiKeyStore.browserKeySnapshot());
  });

  it("never exposes the key through the snapshot", () => {
    apiKeyStore.saveBrowserApiKey(VALID_KEY, false);
    expect(JSON.stringify(apiKeyStore.browserKeySnapshot())).not.toContain(VALID_KEY);
  });
});

describe("theme preference storage", () => {
  beforeEach(() => {
    local.clear();
    systemDark = true;
  });

  it("defaults to the system preference", () => {
    expect(themeStore.getStoredThemePreference()).toBe("system");
  });

  it("persists an explicit choice and ignores invalid values", () => {
    themeStore.saveThemePreference("light");
    expect(themeStore.getStoredThemePreference()).toBe("light");
    local.setItem(themeStore.THEME_STORAGE_KEY, "neon");
    expect(themeStore.getStoredThemePreference()).toBe("system");
  });

  it("resolves the system preference from the media query", () => {
    expect(themeStore.resolveThemePreference("system", true)).toBe("dark");
    expect(themeStore.resolveThemePreference("system", false)).toBe("light");
    expect(themeStore.resolveThemePreference("light", true)).toBe("light");
    expect(themeStore.resolveThemePreference("dark", false)).toBe("dark");
    expect(themeStore.getSystemTheme()).toBe("dark");
  });

  it("ships a pre-hydration script that matches the storage key", () => {
    expect(themeStore.THEME_INIT_SCRIPT).toContain(themeStore.THEME_STORAGE_KEY);
    expect(themeStore.THEME_INIT_SCRIPT).toContain("dataset.theme");
    expect(themeStore.THEME_INIT_SCRIPT).toContain("prefers-color-scheme");
  });

  it("returns a stable preference snapshot", () => {
    expect(themeStore.themeSnapshot()).toBe(themeStore.themeSnapshot());
  });
});

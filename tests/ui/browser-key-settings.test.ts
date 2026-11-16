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

beforeAll(() => {
  Object.defineProperty(globalThis, "window", {
    value: {
      sessionStorage: session,
      localStorage: local,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
    },
    configurable: true,
    writable: true,
  });
});

const { aiRequestHeaders } = await import("@/lib/api/client");
const { describeKeySource } = await import("@/lib/settings/key-source");
const { saveBrowserApiKey, clearBrowserApiKey } = await import("@/lib/storage/browser-api-key");
const { BROWSER_API_KEY_HEADER } = await import("@/lib/security/browser-api-key");

const VALID_KEY = "AQ.test-only-browser-key-0000";

describe("aiRequestHeaders", () => {
  beforeEach(() => {
    session.clear();
    local.clear();
    clearBrowserApiKey();
  });

  it("adds nothing when no browser key is stored", () => {
    expect(aiRequestHeaders("/api/ai/analyze")).toEqual({});
  });

  it("attaches the dedicated header for AI routes only", () => {
    saveBrowserApiKey(VALID_KEY, false);
    const headers = aiRequestHeaders("/api/ai/analyze");
    expect(headers[BROWSER_API_KEY_HEADER]).toBe(VALID_KEY);
    expect(aiRequestHeaders("/api/ai/status")[BROWSER_API_KEY_HEADER]).toBe(VALID_KEY);
    expect(aiRequestHeaders("/api/other")).toEqual({});
    expect(aiRequestHeaders("https://example.com/api/ai/analyze")).toEqual({});
  });

  it("keeps extra headers and does not mutate them", () => {
    saveBrowserApiKey(VALID_KEY, true);
    const extra = { "content-type": "application/json" };
    const headers = aiRequestHeaders("/api/ai/generate", extra);
    expect(headers["content-type"]).toBe("application/json");
    expect(headers[BROWSER_API_KEY_HEADER]).toBe(VALID_KEY);
    expect(extra).toEqual({ "content-type": "application/json" });
  });
});

describe("describeKeySource", () => {
  it("describes the environment source as the preferred configuration", () => {
    const described = describeKeySource({
      mode: "live",
      model: "gemini-3.8-flash",
      configured: true,
      source: "environment",
    });
    expect(described.label).toBe("Live AI mode");
    expect(described.detail.toLowerCase()).toContain("server");
  });

  it("describes a browser key as temporary and clearly attributed", () => {
    const described = describeKeySource({
      mode: "live",
      model: "gemini-3.8-flash",
      configured: true,
      source: "browser",
    });
    expect(described.label).toBe("Live AI mode");
    expect(described.tone).toBe("browser");
    expect(described.detail.toLowerCase()).toContain("browser");
  });

  it("describes demo mode when nothing is configured", () => {
    const described = describeKeySource({
      mode: "demo",
      model: null,
      configured: false,
      source: "none",
    });
    expect(described.label).toBe("Demo mode");
    expect(described.tone).toBe("demo");
    expect(described.detail.length).toBeGreaterThan(10);
  });
});

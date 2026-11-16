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
  Object.defineProperty(globalThis, "sessionStorage", { value: session, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: local, configurable: true });
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

const {
  PROVIDER_KEYS_HEADER,
  AI_CONFIG_HEADER,
  BROWSER_API_KEY_HEADER,
} = await import("@/lib/security/browser-api-key");
const {
  clearProviderApiKey,
  getAdditionalProviderKeys,
  getProviderApiKey,
  providerKeySnapshot,
  saveProviderApiKey,
} = await import("@/lib/storage/provider-api-key");
const { aiConfigHeaderValue, saveAiConfig } = await import("@/lib/storage/ai-providers");
const { sanitizeClientConfig } = await import("@/lib/ai/providers/preferences");
const { aiRequestHeaders } = await import("@/lib/api/client");

const VIKEY_KEY = "vk-live-key-abcd6789";
const GEMINI_KEY = "AQ.gemini-browser-key-0000";

beforeEach(() => {
  session.clear();
  local.clear();
});

describe("per-provider browser keys", () => {
  it("stores a non-Gemini key in session storage by default and exposes only a mask", () => {
    const result = saveProviderApiKey("vikey", VIKEY_KEY, false);
    expect(result.ok).toBe(true);

    expect(session.getItem("promptscope.providerKey.vikey.session")).toBe(VIKEY_KEY);
    expect(local.getItem("promptscope.providerKey.vikey.device.v1")).toBeNull();

    const snapshot = providerKeySnapshot("vikey");
    expect(snapshot).toEqual({ hasKey: true, remembered: false, masked: "••••••••6789" });
    expect(snapshot.masked).not.toContain(VIKEY_KEY);
    expect(getProviderApiKey("vikey")).toBe(VIKEY_KEY);
  });

  it("moves the key to device storage only after opt-in", () => {
    saveProviderApiKey("vikey", VIKEY_KEY, true);

    expect(local.getItem("promptscope.providerKey.vikey.device.v1")).toBe(VIKEY_KEY);
    expect(session.getItem("promptscope.providerKey.vikey.session")).toBeNull();
    expect(providerKeySnapshot("vikey").remembered).toBe(true);

    saveProviderApiKey("vikey", VIKEY_KEY, false);
    expect(session.getItem("promptscope.providerKey.vikey.session")).toBe(VIKEY_KEY);
    expect(local.getItem("promptscope.providerKey.vikey.device.v1")).toBeNull();
  });

  it("delegates the Gemini key to the existing legacy storage", () => {
    saveProviderApiKey("gemini", GEMINI_KEY, false);

    expect(session.getItem("promptscope.browserApiKey.session")).toBe(GEMINI_KEY);
    expect(getProviderApiKey("gemini")).toBe(GEMINI_KEY);
    expect(providerKeySnapshot("gemini")).toMatchObject({ hasKey: true, remembered: false });

    // Gemini keeps its dedicated header; only other providers travel in JSON.
    expect(getAdditionalProviderKeys()).toEqual({});
  });

  it("rejects placeholders and clears both storage locations", () => {
    expect(saveProviderApiKey("vikey", "your_api_key", false).ok).toBe(false);
    expect(saveProviderApiKey("vikey", " short ", false).ok).toBe(true);

    saveProviderApiKey("vikey", VIKEY_KEY, true);
    clearProviderApiKey("vikey");
    expect(session.getItem("promptscope.providerKey.vikey.session")).toBeNull();
    expect(local.getItem("promptscope.providerKey.vikey.device.v1")).toBeNull();
    expect(providerKeySnapshot("vikey").hasKey).toBe(false);
  });

  it("adds provider keys and non-secret config only to this application's AI routes", () => {
    saveProviderApiKey("vikey", VIKEY_KEY, false);
    saveProviderApiKey("gemini", GEMINI_KEY, false);
    saveAiConfig({ providers: { vikey: { model: "vikey/agent-gpt" } } });

    const headers = aiRequestHeaders("/api/ai/analyze");
    expect(headers[BROWSER_API_KEY_HEADER]).toBe(GEMINI_KEY);
    expect(JSON.parse(headers[PROVIDER_KEYS_HEADER]!)).toEqual({ vikey: VIKEY_KEY });
    expect(JSON.parse(headers[AI_CONFIG_HEADER]!)).toMatchObject({
      providers: { vikey: { model: "vikey/agent-gpt" } },
    });

    expect(aiRequestHeaders("https://example.com/api/ai/analyze")).toEqual({});
  });

  it("omits the config header while everything is default", () => {
    saveProviderApiKey("vikey", VIKEY_KEY, false);
    expect(aiConfigHeaderValue()).toBeNull();
    expect(aiRequestHeaders("/api/ai/status")[AI_CONFIG_HEADER]).toBeUndefined();
  });
});

describe("AI preference sanitisation", () => {
  it("keeps https and localhost base URLs and drops anything else", () => {
    const config = sanitizeClientConfig({
      providers: {
        vikey: { baseUrl: "https://api.vikey.ai/v1/" },
        dattio: { baseUrl: "http://example.com/v1", model: "dattio/model" },
      },
      routing: { mode: "auto_fallback" },
    });

    expect(config.providers?.vikey?.baseUrl).toBe("https://api.vikey.ai/v1");
    expect(config.providers?.dattio?.baseUrl).toBeUndefined();
    expect(config.providers?.dattio?.model).toBe("dattio/model");

    const localConfig = sanitizeClientConfig({
      providers: { dattio: { baseUrl: "http://localhost:11434/v1" } },
    });
    expect(localConfig.providers?.dattio?.baseUrl).toBe("http://localhost:11434/v1");
  });

  it("drops unknown providers, unknown routing values and credentials in URLs", () => {
    const config = sanitizeClientConfig({
      providers: { madeup: { model: "x" }, vikey: { model: "vikey/agent-gpt" } },
      routing: { mode: "chaos", preferredProvider: "madeup", fallbackOrder: ["vikey", "vikey"] },
      extra: true,
    });

    expect(config.providers).toEqual({ vikey: { model: "vikey/agent-gpt" } });
    expect(config.routing?.mode).toBeUndefined();
    expect(config.routing?.preferredProvider).toBeUndefined();
    expect(config.routing?.fallbackOrder).toEqual(["vikey"]);

    const withCredentials = sanitizeClientConfig({
      providers: { dattio: { baseUrl: "https://user:pass@example.com/v1" } },
    });
    expect(withCredentials.providers?.dattio?.baseUrl).toBeUndefined();
  });
});

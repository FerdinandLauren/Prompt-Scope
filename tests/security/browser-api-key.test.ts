import { describe, expect, it } from "vitest";
import {
  BROWSER_API_KEY_HEADER,
  MAX_BROWSER_API_KEY_LENGTH,
  isUsableApiKey,
  maskApiKey,
  resolveBrowserApiKey,
} from "@/lib/security/browser-api-key";

const VALID_KEY = "AQ.test-only-browser-key-0000";

describe("isUsableApiKey", () => {
  it("accepts a realistic Gemini key", () => {
    expect(isUsableApiKey(VALID_KEY)).toBe(true);
    expect(isUsableApiKey(`  ${VALID_KEY}  `)).toBe(true);
  });

  it("rejects empty, whitespace and non-string values", () => {
    expect(isUsableApiKey("")).toBe(false);
    expect(isUsableApiKey("   ")).toBe(false);
    expect(isUsableApiKey(null)).toBe(false);
    expect(isUsableApiKey(undefined)).toBe(false);
    expect(isUsableApiKey(42)).toBe(false);
    expect(isUsableApiKey({})).toBe(false);
  });

  it("rejects the placeholders shipped in the example file", () => {
    expect(isUsableApiKey("your_api_key")).toBe(false);
    expect(isUsableApiKey("CHANGEME")).toBe(false);
    expect(isUsableApiKey("paste-key-here")).toBe(false);
  });

  it("rejects values above the configured maximum", () => {
    expect(isUsableApiKey("A".repeat(MAX_BROWSER_API_KEY_LENGTH + 1))).toBe(false);
    expect(isUsableApiKey("A".repeat(MAX_BROWSER_API_KEY_LENGTH))).toBe(true);
  });
});

describe("resolveBrowserApiKey", () => {
  it("reads the dedicated header when it is usable", () => {
    const request = new Request("http://localhost/api/ai/analyze", {
      headers: { [BROWSER_API_KEY_HEADER]: VALID_KEY },
    });
    expect(resolveBrowserApiKey(request)).toBe(VALID_KEY);
  });

  it("returns undefined when the header is missing, blank or a placeholder", () => {
    expect(resolveBrowserApiKey(new Request("http://localhost/api/ai/analyze"))).toBeUndefined();
    expect(
      resolveBrowserApiKey(
        new Request("http://localhost/api/ai/analyze", { headers: { [BROWSER_API_KEY_HEADER]: "  " } }),
      ),
    ).toBeUndefined();
    expect(
      resolveBrowserApiKey(
        new Request("http://localhost/api/ai/analyze", {
          headers: { [BROWSER_API_KEY_HEADER]: "your_api_key" },
        }),
      ),
    ).toBeUndefined();
  });

  it("trims the value so accidental whitespace does not break the provider", () => {
    const request = new Request("http://localhost/api/ai/analyze", {
      headers: { [BROWSER_API_KEY_HEADER]: ` ${VALID_KEY} ` },
    });
    expect(resolveBrowserApiKey(request)).toBe(VALID_KEY);
  });
});

describe("maskApiKey", () => {
  it("never returns the complete key", () => {
    const masked = maskApiKey(VALID_KEY);
    expect(masked).not.toContain(VALID_KEY);
    expect(masked.endsWith(VALID_KEY.slice(-4))).toBe(true);
    expect(masked.startsWith("••••")).toBe(true);
  });

  it("fully masks short values and returns empty for blank input", () => {
    expect(maskApiKey("abc")).toBe("••••••••");
    expect(maskApiKey("         ")).toBe("");
  });
});

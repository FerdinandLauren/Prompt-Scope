import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { evaluationDimensions } from "@/config/evaluation-rubric";
import { AiError } from "@/lib/ai/errors";
import { __setProviderForTests, getAiStatus, getProvider } from "@/lib/ai/client";
import { callStructured } from "@/lib/ai/provider";
import { analyzePrompt } from "@/lib/ai/analyze";
import { evaluationResponseSchema } from "@/lib/ai/schemas";
import { BROWSER_API_KEY_HEADER, resolveBrowserApiKey } from "@/lib/security/browser-api-key";

const ENV_KEY = "env-key-0123456789";
const BROWSER_KEY = "AQ.BrowserKey0123456789";
const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

function evaluationPayload() {
  return {
    summary: "Objective stated, direction thin.",
    dimensions: evaluationDimensions.map((dimension) => ({
      key: dimension.key,
      score: 55,
      explanation: `${dimension.label} partially specified.`,
    })),
    strengths: [],
    weaknesses: [],
    missingInformation: [],
    contradictions: [],
    recommendations: [],
  };
}

function stubProvider() {
  const calls: Array<{ model: string }> = [];
  __setProviderForTests({
    models: {
      generateContent: async (params: { model: string }) => {
        calls.push({ model: params.model });
        return { text: JSON.stringify(evaluationPayload()) };
      },
    },
  } as never);
  return calls;
}

describe("request-scoped browser keys", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
  });

  afterEach(() => {
    __setProviderForTests(null);
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    process.env.GEMINI_MODEL = originalModel;
  });

  it("reports demo mode with no key from either source", () => {
    const status = getAiStatus();
    expect(status.mode).toBe("demo");
    expect(status.source).toBe("none");
    expect(status.configured).toBe(false);
  });

  it("reports the environment source when only the environment key exists", () => {
    process.env.GEMINI_API_KEY = ENV_KEY;
    const status = getAiStatus();
    expect(status.mode).toBe("live");
    expect(status.source).toBe("environment");
    expect(status.model).toBe("gemini-3.8-flash");
  });

  it("reports the browser source when a browser key is supplied and no environment key exists", () => {
    const status = getAiStatus(BROWSER_KEY);
    expect(status.mode).toBe("live");
    expect(status.source).toBe("browser");
  });

  it("lets an explicitly supplied browser key override the environment key", () => {
    process.env.GEMINI_API_KEY = ENV_KEY;
    const status = getAiStatus(BROWSER_KEY);
    expect(status.source).toBe("browser");
    expect(status.mode).toBe("live");
  });

  it("never includes a key in the status payload", () => {
    process.env.GEMINI_API_KEY = ENV_KEY;
    const serialized = JSON.stringify(getAiStatus(BROWSER_KEY));
    expect(serialized).not.toContain(BROWSER_KEY);
    expect(serialized).not.toContain(ENV_KEY);
  });

  it("ignores a malformed or oversized header", () => {
    const headerKey = resolveBrowserApiKey(
      new Request("http://localhost/api/ai/analyze", {
        headers: { [BROWSER_API_KEY_HEADER]: "x".repeat(400) },
      }),
    );
    expect(headerKey).toBeUndefined();
    expect(getAiStatus(headerKey).source).toBe("none");
    expect(getAiStatus(undefined).mode).toBe("demo");
  });

  it("caches the environment provider and never replaces it with a browser key", () => {
    process.env.GEMINI_API_KEY = ENV_KEY;
    const first = getProvider();
    expect(getProvider()).toBe(first);

    const browserInstance = getProvider(BROWSER_KEY);
    expect(browserInstance).not.toBe(first);
    expect(getProvider()).toBe(first);
  });

  it("throws a configuration error when neither source provides a key", () => {
    expect(() => getProvider()).toThrow(AiError);
    try {
      getProvider();
    } catch (error) {
      expect((error as AiError).code).toBe("missing_api_key");
    }
  });

  it("passes the browser key through a full structured call", async () => {
    const calls = stubProvider();
    const result = await analyzePrompt(
      {
        prompt: "Design a calm analytics dashboard for operations leads with a 12-column grid.",
        category: "ui_ux",
        rubricVersion: "visual-uiux-v1",
      },
      BROWSER_KEY,
    );

    expect(calls).toHaveLength(1);
    expect(result.source).toBe("live");
    expect(result.dimensionDetails).toHaveLength(8);
  });

  it("redacts the key from provider failures", async () => {
    __setProviderForTests({
      models: {
        generateContent: async () => {
          throw Object.assign(new Error(`Request failed for key ${BROWSER_KEY} at upstream`), {
            status: 500,
          });
        },
      },
    } as never);

    const error = await callStructured(
      {
        systemInstruction: "system",
        userPrompt: "prompt",
        schema: evaluationResponseSchema,
        temperature: 0,
        maxOutputTokens: 16,
        label: "test",
      },
      BROWSER_KEY,
    ).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(AiError);
    const detail = (error as AiError).detail ?? "";
    expect(detail).not.toContain(BROWSER_KEY);
    expect(detail).toContain("***");
  });
});

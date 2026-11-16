import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __setProviderForTests } from "@/lib/ai/client";
import { verifyConnection } from "@/lib/ai/verify";
import { AiError } from "@/lib/ai/errors";

const VALID_KEY = "AQ.test-only-browser-key-0000";
const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

type Stub = {
  get?: () => Promise<unknown>;
  generateContent?: (args: { model: string; config?: Record<string, unknown> }) => Promise<unknown>;
};

function stubProvider(stub: Stub = {}) {
  const probeCalls: Array<{ model: string }> = [];
  const generateCalls: Array<{ model: string; config?: Record<string, unknown> }> = [];

  __setProviderForTests({
    models: {
      get: async (args: { model: string }) => {
        probeCalls.push(args);
        return stub.get ? stub.get() : { name: `models/${args.model}` };
      },
      generateContent: async (args: { model: string; config?: Record<string, unknown> }) => {
        generateCalls.push(args);
        return stub.generateContent ? stub.generateContent(args) : { text: "ok" };
      },
    },
  } as never);

  return { probeCalls, generateCalls };
}

afterEach(() => {
  __setProviderForTests(null);
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalModel;
});

describe("verifyConnection", () => {
  beforeEach(() => {
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
  });

  it("confirms the key and model, then proves a tiny generation works", async () => {
    const { probeCalls, generateCalls } = stubProvider();

    const result = await verifyConnection(VALID_KEY);

    expect(result).toEqual({ model: "gemini-3.8-flash", source: "browser" });
    expect(JSON.stringify(result)).not.toContain(VALID_KEY);
    expect(probeCalls).toEqual([{ model: "gemini-3.8-flash" }]);

    const config = generateCalls[0]?.config ?? {};
    expect(config.thinkingConfig).toEqual({ thinkingLevel: "LOW" });
    // The token cap must leave room for the answer, not only for thinking.
    expect(Number(config.maxOutputTokens)).toBeGreaterThanOrEqual(64);
  });

  it("fails clearly when no key is available at all", async () => {
    delete process.env.GEMINI_API_KEY;
    const error = await verifyConnection(undefined).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).code).toBe("missing_api_key");
  });

  it("maps a rejected key to invalid_api_key without echoing the key", async () => {
    stubProvider({
      get: async () => {
        throw Object.assign(new Error(`API key not valid: ${VALID_KEY}`), { status: 403 });
      },
    });

    const error = await verifyConnection(VALID_KEY).catch((thrown: unknown) => thrown);
    expect((error as AiError).code).toBe("invalid_api_key");
    expect((error as AiError).detail ?? "").not.toContain(VALID_KEY);
  });

  it("reports an unavailable model instead of a generic provider error", async () => {
    stubProvider({
      get: async () => {
        throw Object.assign(new Error("models/gemini-9-not-real is not found"), { status: 404 });
      },
    });

    const error = await verifyConnection(VALID_KEY).catch((thrown: unknown) => thrown);
    expect((error as AiError).code).toBe("model_unavailable");
  });

  it("keeps the key when only the test generation is slow", async () => {
    stubProvider({
      generateContent: async () => {
        throw new AiError("timeout", "The provider did not respond in time.");
      },
    });

    await expect(verifyConnection(VALID_KEY)).resolves.toEqual({
      model: "gemini-3.8-flash",
      source: "browser",
      slow: true,
    });
  });

  it("keeps the key when the test model is busy", async () => {
    stubProvider({
      generateContent: async () => {
        throw Object.assign(new Error("This model is currently experiencing high demand"), {
          status: 503,
        });
      },
    });

    await expect(verifyConnection(VALID_KEY)).resolves.toEqual({
      model: "gemini-3.8-flash",
      source: "browser",
      busy: true,
    });
  });

  it("still fails when the metadata probe itself times out", async () => {
    stubProvider({
      get: async () => {
        throw new AiError("timeout", "The provider did not respond in time.");
      },
    });

    const error = await verifyConnection(VALID_KEY).catch((thrown: unknown) => thrown);
    expect((error as AiError).code).toBe("timeout");
  });

  it("treats an empty test answer as an invalid response", async () => {
    stubProvider({ generateContent: async () => ({ text: "   " }) });

    const error = await verifyConnection(VALID_KEY).catch((thrown: unknown) => thrown);
    expect((error as AiError).code).toBe("invalid_response");
  });
});

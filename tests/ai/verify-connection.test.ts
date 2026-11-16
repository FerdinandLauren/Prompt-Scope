import { describe, expect, it } from "vitest";
import { __setProviderForTests } from "@/lib/ai/client";
import { verifyConnection } from "@/lib/ai/verify";
import { AiError } from "@/lib/ai/errors";

const VALID_KEY = "AQ.test-only-browser-key-0000";
const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

describe("verifyConnection", () => {
  it("reports the model and source when the provider answers", async () => {
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    __setProviderForTests({
      models: { generateContent: async () => ({ text: "ok" }) },
    } as never);

    const result = await verifyConnection(VALID_KEY);
    expect(result).toEqual({ model: "gemini-3.8-flash", source: "browser" });
    expect(JSON.stringify(result)).not.toContain(VALID_KEY);

    __setProviderForTests(null);
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    process.env.GEMINI_MODEL = originalModel;
  });

  it("fails clearly when no key is available at all", async () => {
    delete process.env.GEMINI_API_KEY;
    const error = await verifyConnection(undefined).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).code).toBe("missing_api_key");

    if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
  });

  it("maps a rejected key to a configuration error without echoing the key", async () => {
    __setProviderForTests({
      models: {
        generateContent: async () => {
          throw Object.assign(new Error(`API key not valid: ${VALID_KEY}`), { status: 403 });
        },
      },
    } as never);

    const error = await verifyConnection(VALID_KEY).catch((thrown: unknown) => thrown);
    expect((error as AiError).code).toBe("missing_api_key");
    expect((error as AiError).detail ?? "").not.toContain(VALID_KEY);

    __setProviderForTests(null);
  });
});

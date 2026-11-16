import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { __setProviderForTests } from "@/lib/ai/client";
import { callStructured } from "@/lib/ai/provider";
import { AiError } from "@/lib/ai/errors";
import { __resetProviderHealthForTests, providerHealth } from "@/lib/ai/providers/health";
import { __resetUsageForTests, usageSummary } from "@/lib/ai/providers/usage";
import type { AiRequestContext } from "@/lib/ai/providers/config";

const ENV = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL,
  VIKEY_API_KEY: process.env.VIKEY_API_KEY,
  VIKEY_MODEL: process.env.VIKEY_MODEL,
  VIKEY_BASE_URL: process.env.VIKEY_BASE_URL,
  DATTIO_API_KEY: process.env.DATTIO_API_KEY,
  DATTIO_BASE_URL: process.env.DATTIO_BASE_URL,
  DATTIO_MODEL: process.env.DATTIO_MODEL,
};

const GEMINI_KEY = "gemini-key-0123456789";
const VIKEY_KEY = "vikey-key-0123456789";
const VIKEY_URL = "https://vikey.test/v1";

const schema = z.object({ ok: z.boolean() });

type GeminiCall = {
  model: string;
  contents: Array<{ parts: Array<{ text: string }> }>;
  config: { systemInstruction?: string; responseMimeType?: string };
};

function stubGemini(handler?: (call: GeminiCall) => unknown) {
  const calls: GeminiCall[] = [];
  __setProviderForTests({
    models: {
      generateContent: async (params: GeminiCall) => {
        calls.push(params);
        if (handler) return handler(params);
        return {
          text: JSON.stringify({ ok: true }),
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3, totalTokenCount: 8 },
        };
      },
    },
  } as never);
  return calls;
}

function jsonResponse(payload: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function vikeyFailure(status: number, message: string, headers: Record<string, string> = {}) {
  return jsonResponse({ error: { message } }, { status, headers });
}

function stubFetch(handler: () => Response) {
  const mock = vi.fn(async () => handler());
  vi.stubGlobal("fetch", mock);
  return mock;
}

function context(routing: NonNullable<AiRequestContext["config"]["routing"]>): AiRequestContext {
  return { keys: {}, config: { routing } };
}

function request() {
  return {
    systemInstruction: "Keep this system instruction exactly.",
    userPrompt: "Keep this user prompt exactly.",
    schema,
    temperature: 0.1,
    maxOutputTokens: 100,
    label: "test",
    task: "generate" as const,
    complexity: "medium" as const,
  };
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = GEMINI_KEY;
  process.env.GEMINI_MODEL = "gemini-test-model";
  process.env.GEMINI_FALLBACK_MODEL = "none";
  process.env.VIKEY_API_KEY = VIKEY_KEY;
  process.env.VIKEY_MODEL = "vikey/test-model";
  process.env.VIKEY_BASE_URL = VIKEY_URL;
  delete process.env.DATTIO_API_KEY;
  delete process.env.DATTIO_BASE_URL;
  delete process.env.DATTIO_MODEL;
  __resetProviderHealthForTests();
  __resetUsageForTests();
});

afterEach(() => {
  __setProviderForTests(null);
  for (const [name, value] of Object.entries(ENV)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  __resetProviderHealthForTests();
  __resetUsageForTests();
});

describe("multi-provider routing", () => {
  it("switches to the next provider on a transient failure and preserves the request", async () => {
    stubFetch(() => vikeyFailure(500, "upstream exploded"));
    const geminiCalls = stubGemini();

    const result = await callStructured(
      request(),
      context({
        mode: "auto_fallback",
        preferredProvider: "vikey",
        fallbackOrder: ["vikey", "gemini"],
        fallbackEnabled: true,
      }),
    );

    expect(result.provider).toBe("gemini");
    expect(result.data).toEqual({ ok: true });
    expect(geminiCalls).toHaveLength(1);
    expect(geminiCalls[0]!.contents[0]!.parts[0]!.text).toBe("Keep this user prompt exactly.");
    expect(geminiCalls[0]!.config.systemInstruction).toBe(
      "Keep this system instruction exactly.",
    );

    const usage = usageSummary();
    expect(usage.requests).toBe(2);
    expect(usage.failures).toBe(1);
    expect(usage.successes).toBe(1);
    expect(usage.reportedTokens).toBe(8);
    expect(usage.recordsWithoutUsage).toBe(1);
    expect(usage.byProvider.map((row) => row.provider)).toEqual(["vikey", "gemini"]);

    expect(providerHealth("vikey", { enabled: true, configured: true }).status).toBe(
      "temporarily_unavailable",
    );
    expect(providerHealth("gemini", { enabled: true, configured: true }).status).toBe("connected");
  });

  it("never falls back for a rejected key", async () => {
    const fetch = stubFetch(() => vikeyFailure(401, "Invalid API key"));
    const geminiCalls = stubGemini();

    const error = await callStructured(
      request(),
      context({
        mode: "auto_fallback",
        preferredProvider: "vikey",
        fallbackOrder: ["vikey", "gemini"],
        fallbackEnabled: true,
      }),
    ).catch((thrown: unknown) => thrown);

    expect((error as AiError).code).toBe("invalid_api_key");
    expect(geminiCalls).toHaveLength(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("uses one provider in automatic mode and does not switch on failure", async () => {
    stubFetch(() => vikeyFailure(429, "slow down"));
    const geminiCalls = stubGemini();

    const error = await callStructured(
      request(),
      context({
        mode: "auto",
        preferredProvider: "vikey",
        fallbackOrder: ["vikey", "gemini"],
        fallbackEnabled: true,
      }),
    ).catch((thrown: unknown) => thrown);

    expect((error as AiError).code).toBe("rate_limit");
    expect(geminiCalls).toHaveLength(0);
  });

  it("honours a manual provider with fallback disabled", async () => {
    const fetch = stubFetch(() => vikeyFailure(500, "should not be called"));
    const geminiCalls = stubGemini();

    const result = await callStructured(
      request(),
      context({
        mode: "manual",
        preferredProvider: "auto",
        fallbackOrder: ["gemini", "vikey"],
        fallbackEnabled: false,
        manual: { provider: "gemini" },
      }),
    );

    expect(result.provider).toBe("gemini");
    expect(geminiCalls).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows a manual provider to fall back when the user enabled it", async () => {
    stubFetch(() => vikeyFailure(500, "gateway down"));
    const geminiCalls = stubGemini();

    const result = await callStructured(
      request(),
      context({
        mode: "manual",
        preferredProvider: "auto",
        fallbackOrder: ["gemini", "vikey"],
        fallbackEnabled: true,
        manual: { provider: "vikey" },
      }),
    );

    expect(result.provider).toBe("gemini");
    expect(geminiCalls).toHaveLength(1);
  });

  it("retries a busy Gemini model with its configured fallback model", async () => {
    process.env.GEMINI_FALLBACK_MODEL = "gemini-test-fallback";
    delete process.env.VIKEY_API_KEY;

    const calls = stubGemini((params) => {
      if (params.model === "gemini-test-model") {
        throw Object.assign(new Error("The model is overloaded."), { status: 503 });
      }
      return { text: JSON.stringify({ ok: true }) };
    });

    const result = await callStructured(
      request(),
      context({
        mode: "auto_fallback",
        preferredProvider: "auto",
        fallbackOrder: ["gemini"],
        fallbackEnabled: true,
      }),
    );

    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("gemini-test-fallback");
    expect(calls.map((entry) => entry.model)).toEqual([
      "gemini-test-model",
      "gemini-test-fallback",
    ]);
  });

  it("does not wait when Retry-After is longer than the bounded budget", async () => {
    delete process.env.GEMINI_API_KEY;
    const fetch = stubFetch(() =>
      vikeyFailure(429, "Rate limit reached", { "retry-after": "120" }),
    );

    const error = await callStructured(
      request(),
      context({
        mode: "auto_fallback",
        preferredProvider: "vikey",
        fallbackOrder: ["vikey"],
        fallbackEnabled: true,
      }),
    ).catch((thrown: unknown) => thrown);

    expect((error as AiError).code).toBe("rate_limit");
    expect((error as AiError).retryAfterMs).toBe(120_000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reports a missing key instead of inventing a provider", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.VIKEY_API_KEY;

    const error = await callStructured(request(), context({ mode: "auto_fallback" })).catch(
      (thrown: unknown) => thrown,
    );

    expect((error as AiError).code).toBe("missing_api_key");
  });

  it("reports a configuration problem when keys exist but no provider is usable", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.VIKEY_API_KEY;
    process.env.DATTIO_API_KEY = "dattio-key-0123456789";
    process.env.DATTIO_MODEL = "dattio/test-model";
    delete process.env.DATTIO_BASE_URL;

    const error = await callStructured(
      request(),
      context({ mode: "auto_fallback", fallbackOrder: ["dattio"] }),
    ).catch((thrown: unknown) => thrown);

    expect((error as AiError).code).toBe("unsupported_capability");
  });
});

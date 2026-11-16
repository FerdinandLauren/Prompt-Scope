import { describe, expect, it } from "vitest";
import { AiError, normalizeProviderError, userMessageForCode } from "@/lib/ai/errors";

function providerError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

describe("normalizeProviderError", () => {
  it("maps rate limiting to a retryable rate_limit error", () => {
    const error = normalizeProviderError(providerError(429, "Resource exhausted"));
    expect(error.code).toBe("rate_limit");
    expect(error.status).toBe(429);
    expect(error.retryable).toBe(true);
  });

  it("distinguishes a quota problem from a plain rate limit", () => {
    const error = normalizeProviderError(providerError(429, "Quota exceeded for free tier"));
    expect(error.code).toBe("quota_exceeded");
  });

  it("treats 401 and 403 as a rejected key that must not be retried", () => {
    for (const status of [401, 403]) {
      const error = normalizeProviderError(providerError(status, "permission denied"));
      expect(error.code).toBe("invalid_api_key");
      expect(error.retryable).toBe(false);
    }
  });

  it("treats a bad API key reported as 400 as a key problem, not user input", () => {
    const error = normalizeProviderError(providerError(400, "API key not valid"));
    expect(error.code).toBe("invalid_api_key");
  });

  it("treats other 400 responses as invalid requests", () => {
    const error = normalizeProviderError(providerError(400, "Invalid argument"));
    expect(error.code).toBe("invalid_request");
    expect(error.retryable).toBe(false);
  });

  it("treats 404 as a model availability problem so an unavailable model is visible", () => {
    const error = normalizeProviderError(providerError(404, "model not found"));
    expect(error.code).toBe("model_unavailable");
    expect(error.retryable).toBe(false);
  });

  it("separates a busy model from other provider errors", () => {
    const error = normalizeProviderError(providerError(503, "This model is experiencing high demand"));
    expect(error.code).toBe("provider_overloaded");
    expect(error.retryable).toBe(true);
  });

  it("retries server errors and timeouts but not validation failures", () => {
    expect(normalizeProviderError(providerError(500, "internal")).retryable).toBe(true);
    expect(normalizeProviderError(new Error("request timed out")).code).toBe("timeout");
    expect(normalizeProviderError(new Error("fetch failed")).code).toBe("network");
    expect(normalizeProviderError(new Error("weird")).code).toBe("provider_error");
  });

  it("passes existing AiErrors through unchanged", () => {
    const original = new AiError("invalid_response", "validation");
    expect(normalizeProviderError(original)).toBe(original);
  });

  it("exposes a safe user message for every code and never the provider text", () => {
    const error = normalizeProviderError(providerError(500, "internal stack trace at /srv/app/secret.ts:42"));
    const message = userMessageForCode[error.code];
    expect(message).toBeTruthy();
    expect(message).not.toMatch(/stack trace/);
    expect(message).not.toMatch(/secret/);
    expect(message.length).toBeGreaterThan(10);
  });
});

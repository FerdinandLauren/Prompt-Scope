import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetProviderHealthForTests,
  providerHealth,
  recordProviderFailure,
  recordProviderSuccess,
} from "@/lib/ai/providers/health";
import { __resetUsageForTests, recordUsage, usageSummary } from "@/lib/ai/providers/usage";

beforeEach(() => {
  __resetProviderHealthForTests();
  __resetUsageForTests();
});

afterEach(() => {
  __resetProviderHealthForTests();
  __resetUsageForTests();
  vi.useRealTimers();
});

describe("provider health", () => {
  it("marks a configured provider as untested until a real call succeeds", () => {
    expect(providerHealth("vikey", { enabled: true, configured: true })).toMatchObject({
      status: "untested",
      lastSuccessAt: null,
      successRate: null,
      latencyMs: null,
    });
  });

  it("reports disabled and not-configured states before any history", () => {
    expect(providerHealth("vikey", { enabled: false, configured: true }).status).toBe("disabled");
    expect(providerHealth("vikey", { enabled: true, configured: false }).status).toBe(
      "not_configured",
    );
  });

  it("turns a success into connected and computes a success rate and latency", () => {
    recordProviderSuccess("vikey", 120);
    recordProviderSuccess("vikey", 180);
    recordProviderFailure("vikey", "timeout", 1_000);

    const health = providerHealth("vikey", { enabled: true, configured: true });
    expect(health.status).toBe("temporarily_unavailable");
    expect(health.successRate).toBe(67);
    expect(health.latencyMs).toBe(150);
    expect(health.lastErrorCode).toBe("timeout");
  });

  it("recovers to connected after a later success", () => {
    recordProviderFailure("vikey", "provider_error", 10);
    recordProviderSuccess("vikey", 30);
    expect(providerHealth("vikey", { enabled: true, configured: true }).status).toBe("connected");
  });

  it("reports a rejected key as a connection failure", () => {
    recordProviderFailure("gemini", "invalid_api_key", 10);
    expect(providerHealth("gemini", { enabled: true, configured: true }).status).toBe(
      "connection_failed",
    );
  });

  it("honours a rate-limit cooldown and clears it when it expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    recordProviderFailure("vikey", "rate_limit", 10, 60_000);
    expect(providerHealth("vikey", { enabled: true, configured: true }).status).toBe("rate_limited");

    vi.advanceTimersByTime(61_000);
    const later = providerHealth("vikey", { enabled: true, configured: true });
    expect(later.status).toBe("temporarily_unavailable");
  });
});

describe("usage ledger", () => {
  it("records reported tokens and marks missing usage as unavailable", () => {
    recordUsage({
      provider: "gemini",
      model: "gemini-test",
      task: "analyze",
      latencyMs: 120,
      ok: true,
      usage: { inputTokens: 100, outputTokens: 40, totalTokens: 140 },
    });
    recordUsage({
      provider: "gemini",
      model: "gemini-test",
      task: "verify",
      latencyMs: 20,
      ok: false,
      errorCode: "timeout",
    });

    const summary = usageSummary();
    expect(summary.requests).toBe(2);
    expect(summary.successes).toBe(1);
    expect(summary.failures).toBe(1);
    expect(summary.reportedTokens).toBe(140);
    expect(summary.recordsWithoutUsage).toBe(1);

    expect(summary.byProvider).toHaveLength(1);
    expect(summary.byProvider[0]).toMatchObject({
      provider: "gemini",
      requests: 2,
      successes: 1,
      failures: 1,
      inputTokens: 100,
      outputTokens: 40,
      totalTokens: 140,
      avgLatencyMs: 70,
    });
  });

  it("keeps providers separate and lists the most recent records newest first", () => {
    recordUsage({
      provider: "gemini",
      model: "gemini-test",
      task: "generate",
      latencyMs: 10,
      ok: true,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    });
    recordUsage({
      provider: "vikey",
      model: "vikey/test",
      task: "improve",
      latencyMs: 30,
      ok: false,
      errorCode: "provider_error",
    });

    const summary = usageSummary();
    expect(summary.byProvider.map((row) => row.provider)).toEqual(["gemini", "vikey"]);
    expect(summary.recent[0]).toMatchObject({ provider: "vikey", status: "failure" });
    expect(summary.recent[1]).toMatchObject({ provider: "gemini", usageSource: "reported" });
  });

  it("bounds the ledger instead of growing without limit", () => {
    for (let index = 0; index < 205; index += 1) {
      recordUsage({
        provider: "gemini",
        model: "gemini-test",
        task: "test",
        latencyMs: 1,
        ok: true,
      });
    }

    const summary = usageSummary();
    expect(summary.requests).toBe(200);
    expect(summary.recent).toHaveLength(12);
    expect(summary.recordsWithoutUsage).toBe(200);
  });
});

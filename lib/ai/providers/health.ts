import "server-only";
import type { ProviderId, ProviderStatus } from "@/types/ai";

/**
 * Lightweight, in-process provider health. It is built only from real request
 * outcomes; a key existing is never treated as proof that a provider works.
 * The data resets when the server process restarts.
 */

type Sample = { at: number; ok: boolean; latencyMs: number };

type HealthEntry = {
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastErrorCode: string | null;
  /** Explicit ordering; timestamps can collide inside the same millisecond. */
  lastOutcome: "success" | "failure" | null;
  rateLimitedUntil: number | null;
  samples: Sample[];
};

const MAX_SAMPLES = 20;
const TRANSIENT_WINDOW_MS = 2 * 60_000;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 30_000;
const MAX_RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;

const entries = new Map<ProviderId, HealthEntry>();

function entryFor(provider: ProviderId): HealthEntry {
  let entry = entries.get(provider);
  if (!entry) {
    entry = {
      lastSuccessAt: null,
      lastFailureAt: null,
      lastErrorCode: null,
      lastOutcome: null,
      rateLimitedUntil: null,
      samples: [],
    };
    entries.set(provider, entry);
  }
  return entry;
}

const TRANSIENT_CODES = new Set([
  "rate_limit",
  "quota_exceeded",
  "provider_overloaded",
  "provider_error",
  "timeout",
  "network",
]);

const CONNECTION_CODES = new Set([
  "invalid_api_key",
  "model_unavailable",
  "invalid_request",
  "insufficient_balance",
  "missing_api_key",
]);

export function recordProviderSuccess(provider: ProviderId, latencyMs: number) {
  const entry = entryFor(provider);
  const now = Date.now();
  entry.lastSuccessAt = now;
  entry.lastOutcome = "success";
  entry.rateLimitedUntil = null;
  entry.samples.push({ at: now, ok: true, latencyMs });
  if (entry.samples.length > MAX_SAMPLES) entry.samples.shift();
}

export function recordProviderFailure(
  provider: ProviderId,
  code: string,
  latencyMs: number,
  retryAfterMs?: number,
) {
  const entry = entryFor(provider);
  const now = Date.now();
  entry.lastFailureAt = now;
  entry.lastErrorCode = code;
  entry.lastOutcome = "failure";
  entry.samples.push({ at: now, ok: false, latencyMs });
  if (entry.samples.length > MAX_SAMPLES) entry.samples.shift();

  if (code === "rate_limit" || code === "quota_exceeded") {
    const cooldown = Math.min(
      MAX_RATE_LIMIT_COOLDOWN_MS,
      Math.max(DEFAULT_RATE_LIMIT_COOLDOWN_MS, retryAfterMs ?? 0),
    );
    entry.rateLimitedUntil = now + cooldown;
  }
}

export type ProviderHealthSnapshot = {
  status: ProviderStatus;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastErrorCode: string | null;
  latencyMs: number | null;
  successRate: number | null;
};

export function providerHealth(
  provider: ProviderId,
  options: { enabled: boolean; configured: boolean },
): ProviderHealthSnapshot {
  const entry = entries.get(provider);
  const now = Date.now();

  const lastSuccessAt = entry?.lastSuccessAt ?? null;
  const lastFailureAt = entry?.lastFailureAt ?? null;
  const samples = entry?.samples ?? [];
  const successful = samples.filter((sample) => sample.ok);
  const successRate = samples.length > 0 ? successful.length / samples.length : null;
  const latencyMs =
    successful.length > 0
      ? Math.round(successful.reduce((sum, sample) => sum + sample.latencyMs, 0) / successful.length)
      : null;

  let status: ProviderStatus;
  if (!options.enabled) status = "disabled";
  else if (!options.configured) status = "not_configured";
  else if (entry?.rateLimitedUntil && entry.rateLimitedUntil > now) status = "rate_limited";
  else if (entry?.lastOutcome === "success") status = "connected";
  else if (
    lastFailureAt &&
    now - lastFailureAt < TRANSIENT_WINDOW_MS &&
    TRANSIENT_CODES.has(entry?.lastErrorCode ?? "")
  ) {
    status = "temporarily_unavailable";
  } else if (lastFailureAt && CONNECTION_CODES.has(entry?.lastErrorCode ?? "")) {
    status = "connection_failed";
  } else if (lastSuccessAt) status = "connected";
  else status = "untested";

  return {
    status,
    lastSuccessAt: lastSuccessAt ? new Date(lastSuccessAt).toISOString() : null,
    lastFailureAt: lastFailureAt ? new Date(lastFailureAt).toISOString() : null,
    lastErrorCode: entry?.lastErrorCode ?? null,
    latencyMs,
    successRate: successRate === null ? null : Math.round(successRate * 100),
  };
}

/** Test seam: keeps provider health from leaking between suites. */
export function __resetProviderHealthForTests() {
  entries.clear();
}

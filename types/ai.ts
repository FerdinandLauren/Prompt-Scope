/**
 * Shared, non-secret AI types. This module is importable from the browser, so
 * it must never contain provider keys or server-only code.
 */

export const PROVIDER_IDS = ["gemini", "vikey", "dattio"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type RoutingMode = "manual" | "auto" | "auto_fallback";

export type KeySource = "environment" | "browser" | "none";

export type AiTask = "discover" | "generate" | "analyze" | "improve" | "verify";

export type TaskComplexity = "simple" | "medium" | "high";

/**
 * What a provider is known to support. `structuredOutput: "native"` means the
 * provider accepts a response schema; `"adapter"` means the adapter asks for
 * JSON and validates it with Zod on the way out.
 */
export type ProviderCapabilities = {
  structuredOutput: "native" | "adapter";
  streaming: boolean;
  toolCalling: boolean;
  usageReporting: boolean;
  modelListing: "dynamic" | "static";
};

export type AiModelSummary = {
  id: string;
  label: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  /** Task complexities this model is configured for. */
  complexity: TaskComplexity[];
  /** Where the id came from: official docs, this install's config, or a live list. */
  source: "documented" | "configured" | "discovered";
};

/** Non-secret per-provider preferences stored in the browser. */
export type AiProviderPreference = {
  enabled?: boolean;
  model?: string;
  baseUrl?: string;
};

/** Non-secret routing preferences stored in the browser. */
export type AiRoutingPreference = {
  mode?: RoutingMode;
  preferredProvider?: ProviderId | "auto";
  fallbackOrder?: ProviderId[];
  /** Manual mode only: whether configured alternatives may be tried. */
  fallbackEnabled?: boolean;
  manual?: { provider: ProviderId; model?: string } | null;
};

export type AiClientConfig = {
  providers?: Partial<Record<ProviderId, AiProviderPreference>>;
  routing?: AiRoutingPreference;
};

export type ProviderStatus =
  | "connected"
  | "not_configured"
  | "connection_failed"
  | "rate_limited"
  | "temporarily_unavailable"
  | "disabled"
  | "untested";

export type AiProviderSummary = {
  id: ProviderId;
  label: string;
  enabled: boolean;
  configured: boolean;
  keySource: "environment" | "browser" | "none";
  status: ProviderStatus;
  model: string | null;
  baseUrl: string | null;
  capabilities: ProviderCapabilities;
  models: AiModelSummary[];
  /** False for providers without verified public documentation. */
  verified: boolean;
  docsUrl: string | null;
  note?: string;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastErrorCode: string | null;
  latencyMs: number | null;
  successRate: number | null;
};

export type AiUsageRecord = {
  id: string;
  provider: ProviderId;
  model: string;
  task: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  /** Reported by the provider, or unavailable. Estimated values are never invented. */
  usageSource: "reported" | "unavailable";
  latencyMs: number;
  status: "success" | "failure";
  errorCode: string | null;
  at: string;
};

export type AiUsageSummary = {
  /** Usage is held in this server process and resets when it restarts. */
  since: string;
  requests: number;
  successes: number;
  failures: number;
  reportedTokens: number;
  recordsWithoutUsage: number;
  byProvider: Array<{
    provider: ProviderId;
    requests: number;
    successes: number;
    failures: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    avgLatencyMs: number | null;
  }>;
  recent: AiUsageRecord[];
};

import type { AiProviderSummary, KeySource, ProviderId, RoutingMode } from "@/types/ai";

export type { KeySource, ProviderId, RoutingMode } from "@/types/ai";

export type AiMode = "live" | "demo";

export type AiStatus = {
  mode: AiMode;
  model: string | null;
  configured: boolean;
  source: KeySource;
  /** Provider that would serve the next request, when one is configured. */
  provider?: ProviderId | null;
  routing?: RoutingMode;
  providers?: AiProviderSummary[];
};

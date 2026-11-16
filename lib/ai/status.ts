import "server-only";
import type { AiProviderSummary } from "@/types/ai";
import type { AiStatus } from "@/types/settings";
import {
  EMPTY_AI_CONTEXT,
  contextFromBrowserKey,
  isAiRequestContext,
  orderReadyProviders,
  resolveProviders,
  resolveRouting,
  type AiRequestContext,
} from "@/lib/ai/providers/config";
import { providerHealth } from "@/lib/ai/providers/health";

function asContext(source?: string | AiRequestContext): AiRequestContext {
  if (!source) return EMPTY_AI_CONTEXT;
  if (typeof source === "string") return contextFromBrowserKey(source);
  return isAiRequestContext(source) ? source : EMPTY_AI_CONTEXT;
}

/**
 * Reports the active mode, the provider/model that would serve the next
 * request, per-provider health and routing. Keys are never included.
 */
export function getAiStatus(source?: string | AiRequestContext): AiStatus {
  const context = asContext(source);
  const providers = resolveProviders(context);
  const routing = resolveRouting(context);
  const ordered = orderReadyProviders(providers, routing);
  const primary = ordered[0];

  const summaries: AiProviderSummary[] = providers.map((provider) => {
    const configured = Boolean(provider.key) && !provider.configError;
    const health = providerHealth(provider.id, {
      enabled: provider.enabled,
      configured,
    });

    return {
      id: provider.id,
      label: provider.meta.label,
      enabled: provider.enabled,
      configured,
      keySource: provider.keySource,
      status: health.status,
      model: provider.model || null,
      baseUrl: provider.baseUrl,
      capabilities: provider.meta.capabilities,
      models: provider.models,
      verified: provider.meta.verified,
      docsUrl: provider.meta.docsUrl,
      note:
        provider.configError && (provider.key || provider.model)
          ? provider.configError
          : provider.meta.note,
      lastSuccessAt: health.lastSuccessAt,
      lastFailureAt: health.lastFailureAt,
      lastErrorCode: health.lastErrorCode,
      latencyMs: health.latencyMs,
      successRate: health.successRate,
    };
  });

  return {
    mode: primary ? "live" : "demo",
    model: primary?.model ?? null,
    configured: Boolean(primary),
    source: primary?.keySource ?? "none",
    provider: primary?.id ?? null,
    routing: routing.mode,
    providers: summaries,
  };
}

import "server-only";
import { z } from "zod";
import { PROVIDER_IDS, type AiClientConfig, type ProviderId } from "@/types/ai";
import {
  AI_CONFIG_HEADER,
  MAX_AI_CONFIG_BYTES,
  MAX_PROVIDER_KEYS_BYTES,
  PROVIDER_KEYS_HEADER,
  isUsableApiKey,
  resolveBrowserApiKey,
} from "@/lib/security/browser-api-key";
import {
  GEMINI_DEFAULT_FALLBACK_MODEL,
  GEMINI_DEFAULT_MODEL,
  PROVIDER_META,
  PROVIDER_ORDER,
  VIKEY_DEFAULT_BASE_URL,
  VIKEY_DEFAULT_MODEL,
  VIKEY_DOCUMENTED_MODELS,
  type ProviderMeta,
} from "@/lib/ai/providers/meta";
import type { AiModelSummary, KeySource, RoutingMode } from "@/types/ai";
import { normalizeBaseUrl, sanitizeClientConfig } from "@/lib/ai/providers/preferences";

const providerKeysSchema = z.object({
  gemini: z.string().optional(),
  vikey: z.string().optional(),
  dattio: z.string().optional(),
});

export type AiRequestContext = {
  /** Secrets live in this object for the lifetime of one request only. */
  keys: Partial<Record<ProviderId, string>>;
  config: AiClientConfig;
};

export const EMPTY_AI_CONTEXT: AiRequestContext = { keys: {}, config: {} };

function readHeader(request: Request, name: string, maxBytes: number): string | null {
  const value = request.headers.get(name);
  if (!value) return null;
  if (value.length > maxBytes) return null;
  return value;
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Only usable keys are kept. Unknown fields and oversized values are dropped
 * rather than trusted, so a malformed header degrades to "not configured".
 */
export function parseProviderKeys(raw: string | null): Partial<Record<ProviderId, string>> {
  const parsed = providerKeysSchema.safeParse(parseJson(raw));
  if (!parsed.success) return {};

  const keys: Partial<Record<ProviderId, string>> = {};
  for (const id of PROVIDER_IDS) {
    const value = parsed.data[id];
    if (isUsableApiKey(value)) keys[id] = value.trim();
  }
  return keys;
}

export function parseAiConfig(raw: string | null): AiClientConfig {
  return sanitizeClientConfig(parseJson(raw));
}

/**
 * Reads the request-scoped provider configuration. The legacy Gemini header is
 * still honoured, so existing saved browser keys keep working unchanged.
 */
export function resolveAiContext(request: Request): AiRequestContext {
  const keys = parseProviderKeys(readHeader(request, PROVIDER_KEYS_HEADER, MAX_PROVIDER_KEYS_BYTES));
  const legacyGemini = resolveBrowserApiKey(request);
  if (legacyGemini) keys.gemini = legacyGemini;

  return {
    keys,
    config: parseAiConfig(readHeader(request, AI_CONFIG_HEADER, MAX_AI_CONFIG_BYTES)),
  };
}

/** Used by tests and internal callers that pass a single Gemini browser key. */
export function contextFromBrowserKey(browserApiKey?: string): AiRequestContext {
  return {
    keys: isUsableApiKey(browserApiKey) ? { gemini: browserApiKey.trim() } : {},
    config: {},
  };
}

export function isAiRequestContext(value: unknown): value is AiRequestContext {
  return (
    typeof value === "object" &&
    value !== null &&
    "keys" in value &&
    typeof (value as AiRequestContext).keys === "object"
  );
}

export type ResolvedProvider = {
  meta: ProviderMeta;
  id: ProviderId;
  key: string | undefined;
  keySource: KeySource;
  enabled: boolean;
  model: string;
  baseUrl: string | null;
  models: AiModelSummary[];
  /** Set when the user supplied a base URL that is not usable. */
  configError: string | null;
};

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function geminiModels(configuredModel: string): AiModelSummary[] {
  const fallback = env("GEMINI_FALLBACK_MODEL");
  const extras = (env("GEMINI_MODELS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const ids = [
    configuredModel,
    ...(fallback && fallback !== "none" ? [fallback] : []),
    ...extras,
  ];

  return [...new Set(ids)].map((id) => ({
    id,
    label: id,
    contextWindow: null,
    maxOutputTokens: null,
    complexity: ["simple", "medium", "high"],
    source: "configured" as const,
  }));
}

function vikeyModels(configuredModel: string): AiModelSummary[] {
  const documented = VIKEY_DOCUMENTED_MODELS.map((model) => ({ ...model }));
  if (documented.some((model) => model.id === configuredModel)) return documented;
  return [
    {
      id: configuredModel,
      label: configuredModel,
      contextWindow: null,
      maxOutputTokens: null,
      complexity: ["simple", "medium", "high"],
      source: "configured",
    },
    ...documented,
  ];
}

export function resolveProviders(context: AiRequestContext): ResolvedProvider[] {
  return PROVIDER_ORDER.map((id) => {
    const meta = PROVIDER_META[id];
    const preference = context.config.providers?.[id];
    const browserKey = context.keys[id];

    const envKey =
      id === "gemini"
        ? env("GEMINI_API_KEY")
        : id === "vikey"
          ? env("VIKEY_API_KEY")
          : env("DATTIO_API_KEY");

    const key = isUsableApiKey(browserKey) ? browserKey.trim() : isUsableApiKey(envKey) ? envKey : undefined;
    const keySource: KeySource = isUsableApiKey(browserKey)
      ? "browser"
      : isUsableApiKey(envKey)
        ? "environment"
        : "none";

    const configuredModel =
      id === "gemini"
        ? preference?.model || env("GEMINI_MODEL") || GEMINI_DEFAULT_MODEL
        : id === "vikey"
          ? preference?.model || env("VIKEY_MODEL") || VIKEY_DEFAULT_MODEL
          : preference?.model || env("DATTIO_MODEL") || "";

    const configuredBaseUrl =
      id === "gemini"
        ? null
        : id === "vikey"
          ? preference?.baseUrl || env("VIKEY_BASE_URL") || VIKEY_DEFAULT_BASE_URL
          : preference?.baseUrl || env("DATTIO_BASE_URL") || null;

    let baseUrl: string | null = null;
    let configError: string | null = null;
    if (id !== "gemini") {
      if (!configuredBaseUrl) {
        configError = `${meta.label} requires a base URL.`;
      } else {
        baseUrl = normalizeBaseUrl(configuredBaseUrl);
        if (!baseUrl) configError = `${meta.label} has an invalid base URL.`;
      }
    }

    const models =
      id === "gemini"
        ? geminiModels(configuredModel)
        : id === "vikey"
          ? vikeyModels(configuredModel)
          : configuredModel
            ? [
                {
                  id: configuredModel,
                  label: configuredModel,
                  contextWindow: null,
                  maxOutputTokens: null,
                  complexity: ["simple", "medium", "high"] as AiModelSummary["complexity"],
                  source: "configured" as const,
                },
              ]
            : [];

    return {
      meta,
      id,
      key,
      keySource,
      enabled: preference?.enabled !== false,
      model: configuredModel,
      baseUrl,
      models,
      configError,
    };
  });
}

export type ResolvedRouting = {
  mode: RoutingMode;
  preferredProvider: ProviderId | "auto";
  fallbackOrder: ProviderId[];
  fallbackEnabled: boolean;
  manual: { provider: ProviderId; model?: string } | null;
};

function envMode(): RoutingMode {
  const value = env("AI_ROUTING_MODE");
  return value === "manual" || value === "auto" || value === "auto_fallback"
    ? value
    : "auto_fallback";
}

function envProviderOrder(): ProviderId[] {
  const configured = (env("AI_PROVIDER_ORDER") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is ProviderId => PROVIDER_ORDER.includes(value as ProviderId));
  return configured.length > 0 ? [...new Set(configured)] : PROVIDER_ORDER;
}

export function resolveRouting(context: AiRequestContext): ResolvedRouting {
  const preference = context.config.routing;
  const fallbackEnabledEnv = env("AI_FALLBACK_ENABLED");

  const preferredEnv = env("AI_PREFERRED_PROVIDER");
  const preferredProvider =
    preference?.preferredProvider ??
    (PROVIDER_ORDER.includes(preferredEnv as ProviderId)
      ? (preferredEnv as ProviderId)
      : "auto");

  const manualProvider = env("AI_MANUAL_PROVIDER");
  const manual: ResolvedRouting["manual"] =
    preference?.manual ??
    (PROVIDER_ORDER.includes(manualProvider as ProviderId)
      ? {
          provider: manualProvider as ProviderId,
          ...(env("AI_MANUAL_MODEL") ? { model: env("AI_MANUAL_MODEL") } : {}),
        }
      : null);

  return {
    mode: preference?.mode ?? envMode(),
    preferredProvider,
    fallbackOrder: preference?.fallbackOrder?.length ? preference.fallbackOrder : envProviderOrder(),
    fallbackEnabled:
      preference?.fallbackEnabled ??
      (fallbackEnabledEnv ? fallbackEnabledEnv !== "false" : true),
    manual,
  };
}

export function providerHasKey(provider: ResolvedProvider): boolean {
  return Boolean(provider.key);
}

/** A provider is usable only when enabled, keyed, and configured correctly. */
export function providerIsReady(provider: ResolvedProvider): boolean {
  if (!provider.enabled || !provider.key || provider.configError) return false;
  if (provider.id !== "gemini" && !provider.baseUrl) return false;
  return Boolean(provider.model);
}

/**
 * Orders usable providers for the selected strategy.
 *
 * - manual: the chosen provider, plus configured alternatives only when the
 *   user enabled fallback;
 * - auto: the single best provider and no cross-provider switch;
 * - auto_fallback: every usable provider in preference order.
 */
export function orderReadyProviders(
  providers: ResolvedProvider[],
  routing: ResolvedRouting,
): ResolvedProvider[] {
  const ready = providers.filter(providerIsReady);
  const rank = (provider: ResolvedProvider) => {
    if (routing.preferredProvider !== "auto" && provider.id === routing.preferredProvider) {
      return -1;
    }
    const index = routing.fallbackOrder.indexOf(provider.id);
    return index === -1 ? PROVIDER_ORDER.length : index;
  };
  const sorted = [...ready].sort((a, b) => rank(a) - rank(b));

  if (routing.mode === "manual") {
    // With no explicit selection, use the single best provider rather than
    // silently behaving like automatic fallback.
    if (!routing.manual) return sorted.slice(0, 1);
    const manual = sorted.filter((provider) => provider.id === routing.manual?.provider);
    if (manual.length === 0) return [];
    if (!routing.fallbackEnabled) return manual;
    return [...manual, ...sorted.filter((provider) => provider.id !== routing.manual?.provider)];
  }

  return routing.mode === "auto" ? sorted.slice(0, 1) : sorted;
}

export const DEFAULT_GEMINI_MODEL = GEMINI_DEFAULT_MODEL;
export const DEFAULT_GEMINI_FALLBACK_MODEL = GEMINI_DEFAULT_FALLBACK_MODEL;

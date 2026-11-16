import {
  PROVIDER_IDS,
  type AiClientConfig,
  type AiProviderPreference,
  type AiRoutingPreference,
  type ProviderId,
} from "@/types/ai";

/**
 * Non-secret AI preferences shared by the Settings UI and the route handlers.
 * Secrets never pass through this module. Validation is deliberately
 * field-by-field: one bad value must not discard the rest of the user's
 * configuration.
 */

const PROVIDER_ID_SET = new Set<string>(PROVIDER_IDS);
const MAX_MODEL_LENGTH = 160;
const MAX_BASE_URL_LENGTH = 320;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asProviderId(value: unknown): ProviderId | null {
  return typeof value === "string" && PROVIDER_ID_SET.has(value) ? (value as ProviderId) : null;
}

export function normalizeBaseUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_BASE_URL_LENGTH) return null;

  try {
    const url = new URL(trimmed);
    const isLocal =
      url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
    // Plain HTTP is only accepted for a local gateway such as a self-hosted
    // OpenAI-compatible server. Credentials embedded in a URL are rejected.
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) return null;
    if (url.username || url.password) return null;
    return trimmed.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function sanitizeProvider(raw: unknown): AiProviderPreference | null {
  if (!isRecord(raw)) return null;

  const next: AiProviderPreference = {};
  if (typeof raw.enabled === "boolean") next.enabled = raw.enabled;

  if (typeof raw.model === "string") {
    const model = raw.model.trim();
    if (model && model.length <= MAX_MODEL_LENGTH) next.model = model;
  }

  if (raw.baseUrl !== undefined) {
    const baseUrl = normalizeBaseUrl(raw.baseUrl);
    if (baseUrl) next.baseUrl = baseUrl;
  }

  return next;
}

function sanitizeRouting(raw: unknown): AiRoutingPreference | null {
  if (!isRecord(raw)) return null;

  const next: AiRoutingPreference = {};

  if (raw.mode === "manual" || raw.mode === "auto" || raw.mode === "auto_fallback") {
    next.mode = raw.mode;
  }

  if (raw.preferredProvider === "auto") next.preferredProvider = "auto";
  else {
    const preferred = asProviderId(raw.preferredProvider);
    if (preferred) next.preferredProvider = preferred;
  }

  if (Array.isArray(raw.fallbackOrder)) {
    const order = raw.fallbackOrder
      .map(asProviderId)
      .filter((id): id is ProviderId => id !== null);
    if (order.length > 0) next.fallbackOrder = [...new Set(order)];
  }

  if (typeof raw.fallbackEnabled === "boolean") next.fallbackEnabled = raw.fallbackEnabled;

  if (raw.manual === null) {
    next.manual = null;
  } else if (isRecord(raw.manual)) {
    const provider = asProviderId(raw.manual.provider);
    if (provider) {
      next.manual = {
        provider,
        ...(typeof raw.manual.model === "string" &&
        raw.manual.model.trim() &&
        raw.manual.model.trim().length <= MAX_MODEL_LENGTH
          ? { model: raw.manual.model.trim() }
          : {}),
      };
    }
  }

  return next;
}

/**
 * Validates and normalizes a config object from either a request header or
 * browser storage. Unknown fields are dropped, never trusted, while recognised
 * fields that are valid are kept.
 */
export function sanitizeClientConfig(input: unknown): AiClientConfig {
  if (!isRecord(input)) return {};

  const config: AiClientConfig = {};

  if (isRecord(input.providers)) {
    const providers: NonNullable<AiClientConfig["providers"]> = {};
    for (const id of PROVIDER_IDS) {
      const preference = sanitizeProvider(input.providers[id]);
      if (preference) providers[id] = preference;
    }
    if (Object.keys(providers).length > 0) config.providers = providers;
  }

  const routing = sanitizeRouting(input.routing);
  if (routing) config.routing = routing;

  return config;
}

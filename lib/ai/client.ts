import "server-only";
import { GoogleGenAI } from "@google/genai";
import { AiError } from "@/lib/ai/errors";
import { isUsableApiKey } from "@/lib/security/browser-api-key";
import type { AiStatus } from "@/types/settings";

export type { AiMode, AiStatus, KeySource } from "@/types/settings";

export const DEFAULT_MODEL = "gemini-3.8-flash";

export function getEnvironmentApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return isUsableApiKey(key) ? key : undefined;
}

export function getModelId(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * Configuration priority: an explicitly supplied browser key wins, because the
 * user entered it deliberately in Settings. Otherwise the server environment
 * key is used. Without either, the application runs in Demo Mode.
 */
export function resolveActiveKey(browserApiKey?: string): {
  key: string | undefined;
  source: AiStatus["source"];
} {
  if (isUsableApiKey(browserApiKey)) return { key: browserApiKey.trim(), source: "browser" };
  const environmentKey = getEnvironmentApiKey();
  if (environmentKey) return { key: environmentKey, source: "environment" };
  return { key: undefined, source: "none" };
}

export function getAiStatus(browserApiKey?: string): AiStatus {
  const { key, source } = resolveActiveKey(browserApiKey);
  return {
    mode: key ? "live" : "demo",
    model: key ? getModelId() : null,
    configured: Boolean(key),
    source,
  };
}

let environmentClient: GoogleGenAI | null = null;
let providerOverride: GoogleGenAI | null = null;

/**
 * Returns a provider for the active key. The environment key uses one cached
 * instance; a browser key produces a request-scoped instance so a user-supplied
 * key can never become the process-wide provider.
 */
export function getProvider(browserApiKey?: string): GoogleGenAI {
  const { key, source } = resolveActiveKey(browserApiKey);

  if (!key) {
    throw new AiError("missing_api_key", "No Gemini API key is configured for this request.", {
      retryable: false,
    });
  }

  if (providerOverride) return providerOverride;

  if (source === "browser") {
    return new GoogleGenAI({ apiKey: key });
  }

  if (!environmentClient) {
    environmentClient = new GoogleGenAI({ apiKey: key });
  }
  return environmentClient;
}

/** Test seam: allows suites to inject a stub provider. */
export function __setProviderForTests(next: GoogleGenAI | null) {
  providerOverride = next;
  environmentClient = next;
}

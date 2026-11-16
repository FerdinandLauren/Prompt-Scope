import type { AiModelSummary, ProviderCapabilities, ProviderId } from "@/types/ai";

/**
 * Provider facts that are safe to ship to the browser. Anything here must be
 * backed by this application's configuration or by official provider docs.
 */

export const GEMINI_DEFAULT_MODEL = "gemini-3.6-flash";
export const GEMINI_DEFAULT_FALLBACK_MODEL = "gemini-4-hydrogen";

/** Verified at https://docs.vikey.ai/base-url/ */
export const VIKEY_DEFAULT_BASE_URL = "https://api.vikey.ai/v1";
/** Documented auto-routing model: https://docs.vikey.ai/api/models/ */
export const VIKEY_DEFAULT_MODEL = "vikey/agent-gpt";

export type ProviderMeta = {
  id: ProviderId;
  label: string;
  defaultBaseUrl: string | null;
  docsUrl: string | null;
  /** True only when official public documentation could be verified. */
  verified: boolean;
  capabilities: ProviderCapabilities;
  note?: string;
};

export const PROVIDER_META: Record<ProviderId, ProviderMeta> = {
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    defaultBaseUrl: null,
    docsUrl: "https://ai.google.dev/gemini-api/docs",
    verified: true,
    capabilities: {
      structuredOutput: "native",
      streaming: true,
      toolCalling: true,
      usageReporting: true,
      modelListing: "static",
    },
  },
  vikey: {
    id: "vikey",
    label: "Vikey",
    defaultBaseUrl: VIKEY_DEFAULT_BASE_URL,
    docsUrl: "https://docs.vikey.ai",
    verified: true,
    capabilities: {
      // Vikey documents OpenAI-style response_format for models that support
      // it; the adapter asks for a schema and always validates with Zod.
      structuredOutput: "adapter",
      streaming: true,
      toolCalling: true,
      usageReporting: true,
      modelListing: "dynamic",
    },
  },
  dattio: {
    id: "dattio",
    label: "Dattio",
    // No official endpoint could be verified. Nothing is fabricated: the base
    // URL must be supplied in Settings or through DATTIO_BASE_URL.
    defaultBaseUrl: null,
    docsUrl: null,
    verified: false,
    capabilities: {
      structuredOutput: "adapter",
      streaming: false,
      toolCalling: false,
      usageReporting: false,
      modelListing: "dynamic",
    },
    note: "No verified public Dattio API documentation was found. This is an opt-in OpenAI-compatible adapter; supply the base URL and model from your Dattio account.",
  },
};

/**
 * Model ids that appear in Vikey's official documentation. Availability still
 * depends on the user's key, so these are never described as "available"
 * until the provider itself confirms them.
 */
export const VIKEY_DOCUMENTED_MODELS: AiModelSummary[] = [
  {
    id: "vikey/agent-gpt",
    label: "Vikey Auto (light / medium / heavy)",
    contextWindow: 1_000_000,
    maxOutputTokens: null,
    complexity: ["simple", "medium", "high"],
    source: "documented",
  },
  {
    id: "openai/gpt-6.1-sol",
    label: "GPT-6.1 Sol via Vikey",
    contextWindow: 1_000_000,
    maxOutputTokens: null,
    complexity: ["medium", "high"],
    source: "documented",
  },
  {
    id: "anthropic/claude-sonnet-5.5",
    label: "Claude Sonnet 5.5 via Vikey",
    contextWindow: null,
    maxOutputTokens: null,
    complexity: ["medium", "high"],
    source: "documented",
  },
  {
    id: "vikey/agent-coding",
    label: "Vikey Auto Coding",
    contextWindow: null,
    maxOutputTokens: null,
    complexity: ["medium", "high"],
    source: "documented",
  },
  {
    id: "vikey/agent-mocin",
    label: "Vikey Auto Mocin",
    contextWindow: null,
    maxOutputTokens: null,
    complexity: ["simple", "medium"],
    source: "documented",
  },
  {
    id: "vikey/plan",
    label: "Vikey Token Plan",
    contextWindow: null,
    maxOutputTokens: null,
    complexity: ["simple", "medium", "high"],
    source: "documented",
  },
];

export const PROVIDER_ORDER: ProviderId[] = ["gemini", "vikey", "dattio"];

export function isProviderId(value: unknown): value is ProviderId {
  return value === "gemini" || value === "vikey" || value === "dattio";
}

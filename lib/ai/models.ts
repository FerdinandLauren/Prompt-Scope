import "server-only";
import type { AiModelSummary, ProviderId } from "@/types/ai";
import {
  resolveProviders,
  type AiRequestContext,
  type ResolvedProvider,
} from "@/lib/ai/providers/config";
import { geminiAdapter } from "@/lib/ai/providers/gemini";
import { openAiCompatibleAdapter } from "@/lib/ai/providers/openai-compatible";
import { AiError } from "@/lib/ai/errors";

const MODEL_LIST_TIMEOUT_MS = 15_000;

export type ProviderModelList = {
  provider: ProviderId;
  source: "dynamic" | "static";
  models: AiModelSummary[];
};

/**
 * Lists models for one provider. OpenAI-compatible providers are asked live;
 * Gemini returns the models this installation is configured for, because an
 * unverified id is never presented as available.
 */
export async function listProviderModels(
  providerId: ProviderId,
  context: AiRequestContext,
): Promise<ProviderModelList> {
  const provider = resolveProviders(context).find((entry) => entry.id === providerId);
  if (!provider) {
    throw new AiError("invalid_request", "Unknown provider.", { retryable: false });
  }
  return listModelsFor(provider);
}

async function listModelsFor(provider: ResolvedProvider): Promise<ProviderModelList> {
  if (!provider.key) {
    const message = `No ${provider.meta.label} API key is configured.`;
    throw new AiError("missing_api_key", message, { retryable: false, safeMessage: message });
  }
  if (provider.configError) {
    throw new AiError("invalid_request", provider.configError, {
      retryable: false,
      safeMessage: provider.configError,
    });
  }

  if (provider.id === "gemini") {
    return { provider: provider.id, source: "static", models: provider.models };
  }

  const models = await openAiCompatibleAdapter.listModels(provider, MODEL_LIST_TIMEOUT_MS);
  return { provider: provider.id, source: "dynamic", models };
}

/** Kept for symmetry with the adapter registry. */
export function adapterFor(providerId: ProviderId) {
  return providerId === "gemini" ? geminiAdapter : openAiCompatibleAdapter;
}

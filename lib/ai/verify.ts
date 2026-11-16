import "server-only";
import type { ProviderId } from "@/types/ai";
import type { AiStatus } from "@/types/settings";
import {
  contextFromBrowserKey,
  orderReadyProviders,
  resolveProviders,
  resolveRouting,
  type AiRequestContext,
} from "@/lib/ai/providers/config";
import { geminiAdapter } from "@/lib/ai/providers/gemini";
import { openAiCompatibleAdapter } from "@/lib/ai/providers/openai-compatible";
import { recordProviderFailure, recordProviderSuccess } from "@/lib/ai/providers/health";
import { recordUsage } from "@/lib/ai/providers/usage";
import { AiError, normalizeProviderError } from "@/lib/ai/errors";

export type VerifyResult = {
  model: string;
  source: AiStatus["source"];
  provider?: ProviderId;
  /**
   * Set when the key and the model were confirmed, but the small test
   * generation ran out of time. The key is still valid; the warning only says
   * that the provider was slow.
   */
  slow?: boolean;
  /**
   * Set when the key and model were confirmed, but the model answered 503 for
   * the test generation. The key is valid; the model is only busy.
   */
  busy?: boolean;
};

function asContext(source?: string | AiRequestContext): AiRequestContext {
  if (!source) return contextFromBrowserKey();
  return typeof source === "string" ? contextFromBrowserKey(source) : source;
}

/**
 * Performs the smallest provider call that proves the configured key works.
 * For Gemini that is a metadata probe plus a tiny generation; for
 * OpenAI-compatible providers it is a model-list check plus a tiny generation.
 * Only the model and key source are returned; the key is never returned.
 */
export async function verifyConnection(
  source?: string | AiRequestContext,
  providerId?: ProviderId,
): Promise<VerifyResult> {
  const context = asContext(source);
  const providers = resolveProviders(context);
  const routing = resolveRouting(context);

  const target = providerId
    ? providers.find((provider) => provider.id === providerId)
    : orderReadyProviders(providers, routing)[0] ??
      providers.find((provider) => Boolean(provider.key));

  if (!target) {
    throw new AiError("missing_api_key", "No API key is configured to test.", {
      retryable: false,
      safeMessage: "No API key is configured to test.",
    });
  }
  if (!target.key) {
    const message = `No ${target.meta.label} API key is configured.`;
    throw new AiError("missing_api_key", message, { retryable: false, safeMessage: message });
  }
  if (target.configError) {
    throw new AiError("invalid_request", target.configError, {
      retryable: false,
      safeMessage: target.configError,
    });
  }
  if (!target.model) {
    const message = `${target.meta.label} has no model configured.`;
    throw new AiError("model_unavailable", message, { retryable: false, safeMessage: message });
  }

  const adapter = target.id === "gemini" ? geminiAdapter : openAiCompatibleAdapter;
  const startedAt = Date.now();

  try {
    const result = await adapter.verify({
      provider: target,
      model: target.model,
      maxOutputTokens: 96,
      thinkingLevel: "LOW",
      timeoutMs: 45_000,
    });

    const latencyMs = Date.now() - startedAt;
    recordProviderSuccess(target.id, latencyMs);
    recordUsage({
      provider: target.id,
      model: target.model,
      task: "verify",
      latencyMs,
      ok: true,
    });

    const base: VerifyResult = { model: result.model, source: target.keySource };
    if (result.slow) base.slow = true;
    if (result.busy) base.busy = true;
    // Existing callers expect exactly { model, source } for Gemini; the
    // provider field is additive for the multi-provider UI.
    return target.id === "gemini" ? base : { ...base, provider: target.id };
  } catch (error) {
    const normalized = normalizeProviderError(error, [
      target.key,
      ...Object.values(context.keys),
      process.env.GEMINI_API_KEY,
      process.env.VIKEY_API_KEY,
      process.env.DATTIO_API_KEY,
    ]);

    recordProviderFailure(
      target.id,
      normalized.code,
      Date.now() - startedAt,
      normalized.retryAfterMs,
    );
    recordUsage({
      provider: target.id,
      model: target.model,
      task: "verify",
      latencyMs: Date.now() - startedAt,
      ok: false,
      errorCode: normalized.code,
    });

    throw normalized;
  }
}

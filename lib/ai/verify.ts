import { ThinkingLevel } from "@google/genai";
import { AiError, normalizeProviderError } from "@/lib/ai/errors";
import { getModelId, getProvider, resolveActiveKey } from "@/lib/ai/client";
import type { AiStatus } from "@/types/settings";

/**
 * Reading the model metadata is cheap, so a short budget is enough to catch a
 * rejected key or an unknown model quickly.
 */
const MODEL_PROBE_TIMEOUT_MS = 10_000;

/**
 * Gemini 3.x models think before they answer and a cold first call can be slow,
 * so a one-word check still needs more than a few seconds. Thinking is pinned to
 * LOW below; this budget only guards against a request that never settles.
 */
const GENERATE_TIMEOUT_MS = 45_000;

export type VerifyResult = {
  model: string;
  source: AiStatus["source"];
  /**
   * Set when the key and the model were confirmed, but the small test
   * generation ran out of time. The key is still valid; the warning only says
   * that the provider was slow.
   */
  slow?: boolean;
};

/**
 * Performs two minimal provider calls to confirm that the configured key works.
 * The first call proves the key is accepted and the model exists; the second one
 * proves the key may actually generate text. Only the model and the key source
 * are returned; the key is never returned.
 */
export async function verifyConnection(browserApiKey?: string): Promise<VerifyResult> {
  const { key, source } = resolveActiveKey(browserApiKey);
  if (!key) {
    throw new AiError("missing_api_key", "No API key is configured to test.", { retryable: false });
  }

  const model = getModelId();
  const ai = getProvider(browserApiKey);
  let keyAndModelConfirmed = false;

  try {
    // Step 1: a metadata read. It costs no generation tokens, normally answers
    // in under a second, and fails clearly for a rejected key or a bad model id.
    await withTimeout(ai.models.get({ model }), MODEL_PROBE_TIMEOUT_MS);
    keyAndModelConfirmed = true;

    // Step 2: a real but tiny generation. Thinking is pinned to LOW because the
    // default (medium on gemini-3.8-flash) can spend the whole token budget on
    // reasoning and make a trivial check look like a hang.
    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: "Reply with the single word: ok" }] }],
        config: {
          maxOutputTokens: 96,
          temperature: 0,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
      GENERATE_TIMEOUT_MS,
    );

    const text = response.text?.trim();
    if (!text) {
      throw new AiError("invalid_response", "The provider returned an empty verification response.");
    }

    return { model, source };
  } catch (error) {
    const normalized = normalizeProviderError(error, [browserApiKey, process.env.GEMINI_API_KEY]);

    // The key and model are already proven. A slow test answer is not a key
    // problem, so keep the key and report the latency instead of rejecting it.
    if (keyAndModelConfirmed && normalized.code === "timeout") {
      return { model, source, slow: true };
    }

    throw normalized;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new AiError("timeout", "The provider did not respond in time.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

import { AiError, normalizeProviderError } from "@/lib/ai/errors";
import { getModelId, getProvider, resolveActiveKey } from "@/lib/ai/client";
import type { AiStatus } from "@/types/settings";

const VERIFY_TIMEOUT_MS = 20_000;

export type VerifyResult = {
  model: string;
  source: AiStatus["source"];
};

/**
 * Performs one minimal provider call to confirm that the configured key works.
 * It returns only the model and the key source; the key is never returned.
 */
export async function verifyConnection(browserApiKey?: string): Promise<VerifyResult> {  const { key, source } = resolveActiveKey(browserApiKey);
  if (!key) {
    throw new AiError("missing_api_key", "No API key is configured to test.", { retryable: false });
  }

  const model = getModelId();
  const ai = getProvider(browserApiKey);

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: "Reply with the single word: ok" }] }],
        config: { maxOutputTokens: 16, temperature: 0 },
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new AiError("timeout", "The provider did not respond in time.")),
          VERIFY_TIMEOUT_MS,
        );
      }),
    ]);

    const text = response.text?.trim();
    if (!text) {
      throw new AiError("invalid_response", "The provider returned an empty verification response.");
    }

    return { model, source };
  } catch (error) {
    throw normalizeProviderError(error, [browserApiKey, process.env.GEMINI_API_KEY]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

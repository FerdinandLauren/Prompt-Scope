export const BROWSER_API_KEY_HEADER = "x-promptscope-api-key";

/**
 * Provider keys beyond Gemini travel in one JSON header. Each value is still a
 * secret: it is read only by this application's own server routes and is never
 * returned to the browser or written to a log.
 */
export const PROVIDER_KEYS_HEADER = "x-promptscope-provider-keys";
/** Non-secret provider and routing preferences (models, base URLs, mode). */
export const AI_CONFIG_HEADER = "x-promptscope-ai-config";

export const MAX_BROWSER_API_KEY_LENGTH = 256;
export const MAX_PROVIDER_KEYS_BYTES = 4_096;
export const MAX_AI_CONFIG_BYTES = 8_192;

const PLACEHOLDERS = new Set(["your_api_key", "changeme", "paste-key-here"]);

export function isUsableApiKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const key = value.trim();
  if (!key || key.length > MAX_BROWSER_API_KEY_LENGTH) return false;
  return !PLACEHOLDERS.has(key.toLowerCase());
}

export function resolveBrowserApiKey(request: Request): string | undefined {
  const value = request.headers.get(BROWSER_API_KEY_HEADER)?.trim();
  return isUsableApiKey(value) ? value : undefined;
}

export function maskApiKey(value: string): string {
  const key = value.trim();
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `••••••••${key.slice(-4)}`;
}

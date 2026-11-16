export const BROWSER_API_KEY_HEADER = "x-promptscope-api-key";
export const MAX_BROWSER_API_KEY_LENGTH = 256;

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

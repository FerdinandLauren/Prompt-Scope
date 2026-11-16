export type AiErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "model_unavailable"
  | "invalid_request"
  | "invalid_response"
  | "rate_limit"
  | "quota_exceeded"
  | "timeout"
  | "network"
  | "provider_error"
  | "provider_overloaded"
  | "throttled";

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  /**
   * Raw provider detail, kept for server-side logging only. It is never
   * returned to the browser: routes send `userMessageForCode[code]`.
   */
  readonly detail?: string;

  constructor(
    code: AiErrorCode,
    message: string,
    options: { status?: number; retryable?: boolean; cause?: unknown; detail?: string } = {},
  ) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.status = options.status ?? statusForCode(code);
    this.retryable = options.retryable ?? (code === "rate_limit" || code === "network" || code === "timeout");
    this.detail = options.detail;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

function statusForCode(code: AiErrorCode): number {
  switch (code) {
    case "invalid_request":
      return 400;
    case "missing_api_key":
      return 503;
    case "invalid_api_key":
      return 401;
    case "model_unavailable":
      return 404;
    case "throttled":
    case "rate_limit":
      return 429;
    case "quota_exceeded":
      return 429;
    case "timeout":
      return 504;
    case "provider_overloaded":
      return 503;
    case "invalid_response":
      return 502;
    default:
      return 502;
  }
}

export const userMessageForCode: Record<AiErrorCode, string> = {
  missing_api_key:
    "Live AI mode is not configured. Add GEMINI_API_KEY to .env.local, or continue in Demo Mode.",
  invalid_api_key:
    "The Gemini API key was rejected. Copy the whole key from Google AI Studio again and make sure the Generative Language API is enabled for its project.",
  model_unavailable:
    "The configured Gemini model is not available to this key. Set GEMINI_MODEL to a model your key can use, such as gemini-3.8-flash.",
  invalid_request: "The request was rejected. Check the fields and try again.",
  invalid_response:
    "The model returned a response the application could not validate. Nothing was saved. Try again.",
  rate_limit: "The provider rate limit was reached. Wait a moment before retrying.",
  quota_exceeded: "The provider usage quota for this API key has been reached.",
  timeout:
    "The provider did not respond in time. Check the connection and try again; a proxy or firewall can slow the first request.",
  network: "The provider could not be reached. Check the connection and retry.",
  provider_error: "The provider returned an error. Your input is preserved; try again.",
  provider_overloaded:
    "Gemini is receiving too many requests for this model right now. Wait a moment and try again, or set GEMINI_MODEL to a quieter model such as gemini-3.5-flash-lite.",
  throttled: "Too many requests from this session. Wait a moment before sending another.",
};

/**
 * Converts any thrown value into a safe, non-leaking AiError. The provider's
 * own text is preserved in `detail` for server logs, with any supplied secret
 * redacted, and is never sent to the browser.
 */
export function normalizeProviderError(error: unknown, secrets: Array<string | undefined> = []): AiError {
  if (error instanceof AiError) return error;

  const raw = redactSecrets(error instanceof Error ? error.message : String(error), secrets);
  const status = extractStatus(error, raw);
  const lower = raw.toLowerCase();
  const message = status
    ? `Provider request failed with status ${status}.`
    : "Provider request failed.";
  const detail = status ? `${status}: ${raw}` : raw;
  const base = { status, detail, cause: error } as const;

  if (status === 429) {
    if (lower.includes("quota") || lower.includes("billing") || lower.includes("free tier")) {
      return new AiError("quota_exceeded", message, base);
    }
    return new AiError("rate_limit", message, base);
  }
  if (status === 401 || status === 403) {
    return new AiError("invalid_api_key", message, { ...base, retryable: false });
  }
  if (status === 400) {
    if (lower.includes("api key") || lower.includes("api_key") || lower.includes("credential")) {
      return new AiError("invalid_api_key", message, { ...base, retryable: false });
    }
    return new AiError("invalid_request", message, { ...base, retryable: false });
  }
  if (status === 404) {
    return new AiError("model_unavailable", message, { ...base, retryable: false });
  }
  if (status === 503) {
    return new AiError("provider_overloaded", message, { ...base, retryable: true });
  }
  if (status >= 500) {
    // Provider-side failures are usually transient, so they may be retried once.
    return new AiError("provider_error", message, { ...base, retryable: true });
  }
  if (lower.includes("timeout") || lower.includes("aborted") || lower.includes("timed out")) {
    return new AiError("timeout", message, { ...base, status: 0 });
  }
  if (lower.includes("fetch failed") || lower.includes("enotfound") || lower.includes("network")) {
    return new AiError("network", message, { ...base, status: 0 });
  }

  return new AiError("provider_error", message, base);
}

function extractStatus(error: unknown, message: string): number {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { status?: unknown; code?: unknown; httpStatus?: unknown };
    for (const value of [candidate.status, candidate.httpStatus, candidate.code]) {
      const parsed = Number(value);
      if (Number.isInteger(parsed) && parsed >= 100 && parsed < 600) return parsed;
    }
  }
  const match = message.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? Number(match[1]) : 0;
}

/**
 * Removes API keys from text destined for logs. Accepts the explicit secrets of
 * the current request plus the general shapes of Google API keys.
 */
export function redactSecrets(text: string, secrets: Array<string | undefined> = []): string {
  let result = text;
  for (const secret of secrets) {
    const value = secret?.trim();
    if (value && value.length >= 8) {
      result = result.split(value).join("***");
    }
  }
  return result
    .replace(/\bAIza[0-9A-Za-z_-]{10,}/g, "***")
    .replace(/\bAQ\.[0-9A-Za-z._-]{10,}/g, "***");
}

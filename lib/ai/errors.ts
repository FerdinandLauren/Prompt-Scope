export type AiErrorCode =
  | "missing_api_key"
  | "invalid_request"
  | "invalid_response"
  | "rate_limit"
  | "quota_exceeded"
  | "timeout"
  | "network"
  | "provider_error"
  | "throttled";

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor(
    code: AiErrorCode,
    message: string,
    options: { status?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.status = options.status ?? statusForCode(code);
    this.retryable = options.retryable ?? (code === "rate_limit" || code === "network" || code === "timeout");
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

function statusForCode(code: AiErrorCode): number {
  switch (code) {
    case "invalid_request":
      return 400;
    case "missing_api_key":
      return 503;
    case "throttled":
    case "rate_limit":
      return 429;
    case "quota_exceeded":
      return 429;
    case "timeout":
      return 504;
    case "invalid_response":
      return 502;
    default:
      return 502;
  }
}

export const userMessageForCode: Record<AiErrorCode, string> = {
  missing_api_key:
    "Live AI mode is not configured. Add GEMINI_API_KEY to .env.local, or continue in Demo Mode.",
  invalid_request: "The request was rejected. Check the fields and try again.",
  invalid_response:
    "The model returned a response the application could not validate. Nothing was saved. Try again.",
  rate_limit: "The provider rate limit was reached. Wait a moment before retrying.",
  quota_exceeded: "The provider usage quota for this API key has been reached.",
  timeout: "The provider did not respond in time. Your input is preserved; try again.",
  network: "The provider could not be reached. Check the connection and retry.",
  provider_error: "The provider returned an error. Your input is preserved; try again.",
  throttled: "Too many requests from this session. Wait a moment before sending another.",
};

/**
 * Converts any thrown value into a safe, non-leaking AiError. Raw provider
 * messages never reach the browser.
 */
export function normalizeProviderError(error: unknown): AiError {
  if (error instanceof AiError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const status = extractStatus(error, message);
  const lower = message.toLowerCase();

  if (status === 429) {
    if (lower.includes("quota") || lower.includes("billing") || lower.includes("free tier")) {
      return new AiError("quota_exceeded", message, { status, cause: error });
    }
    return new AiError("rate_limit", message, { status, cause: error });
  }
  if (status === 401 || status === 403) {
    return new AiError("missing_api_key", message, { status, retryable: false, cause: error });
  }
  if (status === 400) {
    if (lower.includes("api key") || lower.includes("api_key") || lower.includes("credential")) {
      return new AiError("missing_api_key", message, { status, retryable: false, cause: error });
    }
    return new AiError("invalid_request", message, { status, retryable: false, cause: error });
  }
  if (status === 404) {
    return new AiError(
      "provider_error",
      `The configured model is unavailable: ${message}`,
      { status, retryable: false, cause: error },
    );
  }
  if (status >= 500) {
    return new AiError("provider_error", message, { status, cause: error });
  }
  if (lower.includes("timeout") || lower.includes("aborted") || lower.includes("timed out")) {
    return new AiError("timeout", message, { cause: error });
  }
  if (lower.includes("fetch failed") || lower.includes("enotfound") || lower.includes("network")) {
    return new AiError("network", message, { cause: error });
  }

  return new AiError("provider_error", message, { cause: error });
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

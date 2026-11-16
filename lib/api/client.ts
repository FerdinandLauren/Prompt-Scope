import { getBrowserApiKey } from "@/lib/storage/browser-api-key";
import { BROWSER_API_KEY_HEADER } from "@/lib/security/browser-api-key";

export type ApiError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/**
 * Headers for an application request. A stored browser key is attached only to
 * this application's own AI routes, never to third-party hosts.
 */
export function aiRequestHeaders(
  url: string,
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (!url.startsWith("/api/ai/")) return headers;

  const key = getBrowserApiKey();
  if (key) headers[BROWSER_API_KEY_HEADER] = key;
  return headers;
}

const NETWORK_ERROR: ApiError = {
  code: "network",
  message: "The application could not reach its own server. Check the connection and retry.",
};

async function parse<T>(response: Response): Promise<ApiResult<T>> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      error: {
        code: "invalid_response",
        message: "The server response could not be read. Try again.",
      },
    };
  }

  if (payload && typeof payload === "object" && "ok" in payload) {
    return payload as ApiResult<T>;
  }

  return {
    ok: false,
    error: { code: "invalid_response", message: "The server response was not recognised." },
  };
}

export async function postJson<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: aiRequestHeaders(url, { "content-type": "application/json" }),
      body: JSON.stringify(body),
      signal,
    });
    return await parse<T>(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, error: { code: "aborted", message: "The request was cancelled." } };
    }
    return { ok: false, error: NETWORK_ERROR };
  }
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, { headers: aiRequestHeaders(url), signal, cache: "no-store" });
    return await parse<T>(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, error: { code: "aborted", message: "The request was cancelled." } };
    }
    return { ok: false, error: NETWORK_ERROR };
  }
}

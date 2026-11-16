export type ApiError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

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
      headers: { "content-type": "application/json" },
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
    const response = await fetch(url, { signal, cache: "no-store" });
    return await parse<T>(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, error: { code: "aborted", message: "The request was cancelled." } };
    }
    return { ok: false, error: NETWORK_ERROR };
  }
}

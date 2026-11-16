import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AiError, normalizeProviderError, userMessageForCode } from "@/lib/ai/errors";
import { assertWithinRateLimit, clientIdentifierFromHeaders } from "@/lib/ai/throttle";
import { firstIssue } from "@/lib/validation/schemas";

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; fields?: Record<string, string> };
};

const MAX_BODY_BYTES = 200_000;

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, init);
}

export function apiFailure(code: string, message: string, status: number, fields?: Record<string, string>) {
  return NextResponse.json<ApiFailure>({ ok: false, error: { code, message, fields } }, { status });
}

export function failureFromError(error: unknown) {
  if (error instanceof AiError) {
    // Keep the redacted provider detail in the server log for diagnosis; the
    // browser only ever receives a safe, application-authored message.
    if (error.detail) console.error(`[promptscope] ${error.code}:`, error.detail);
    return apiFailure(error.code, error.safeMessage ?? userMessageForCode[error.code], error.status);
  }

  const normalized = normalizeProviderError(error);
  // Log the provider detail server-side only; the browser receives the safe message.
  console.error(`[promptscope] ${normalized.code}:`, normalized.detail ?? normalized.message);
  return apiFailure(normalized.code, userMessageForCode[normalized.code], normalized.status);
}

export async function readValidatedBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse<ApiFailure> }> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: apiFailure("invalid_request", "The request body is too large.", 413),
    };
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return {
      ok: false,
      response: apiFailure("invalid_request", "The request body must be valid JSON.", 400),
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      response: apiFailure(
        "invalid_request",
        userMessageForCode.invalid_request,
        400,
        firstIssue(parsed.error),
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

export function guardRateLimit(request: Request) {
  try {
    assertWithinRateLimit(clientIdentifierFromHeaders(request.headers));
    return null;
  } catch (error) {
    return failureFromError(error);
  }
}

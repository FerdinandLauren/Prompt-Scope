import "server-only";
import { AiError } from "@/lib/ai/errors";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000;

function windowMs() {
  const configured = Number(process.env.AI_RATE_LIMIT_WINDOW_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : 60_000;
}

function maxRequests() {
  const configured = Number(process.env.AI_RATE_LIMIT_MAX);
  return Number.isFinite(configured) && configured > 0 ? configured : 12;
}

/**
 * Small in-process sliding-window limiter. It protects a single server
 * instance from runaway retries; production deployments should also rely on
 * platform-level rate limiting. Both the window and the ceiling are
 * configurable through the environment for local testing.
 */
export function assertWithinRateLimit(identifier: string) {
  const now = Date.now();
  const WINDOW_MS = windowMs();
  const MAX_REQUESTS_PER_WINDOW = maxRequests();

  if (buckets.size > MAX_KEYS) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }

  const existing = buckets.get(identifier);
  if (!existing || existing.resetAt < now) {
    buckets.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    const seconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    throw new AiError(
      "throttled",
      `Too many AI requests. Try again in about ${seconds} seconds.`,
      { retryable: true },
    );
  }

  existing.count += 1;
}

export function clientIdentifierFromHeaders(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "local";
}

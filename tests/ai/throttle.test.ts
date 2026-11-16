import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertWithinRateLimit, clientIdentifierFromHeaders } from "@/lib/ai/throttle";
import { AiError } from "@/lib/ai/errors";

const original = { max: process.env.AI_RATE_LIMIT_MAX, window: process.env.AI_RATE_LIMIT_WINDOW_MS };

function freshIdentifier() {
  return `test-${Math.random().toString(36).slice(2)}`;
}

describe("assertWithinRateLimit", () => {
  beforeEach(() => {
    process.env.AI_RATE_LIMIT_MAX = "3";
    process.env.AI_RATE_LIMIT_WINDOW_MS = "60000";
  });

  afterEach(() => {
    process.env.AI_RATE_LIMIT_MAX = original.max;
    process.env.AI_RATE_LIMIT_WINDOW_MS = original.window;
  });

  it("allows requests up to the configured ceiling", () => {
    const id = freshIdentifier();
    expect(() => assertWithinRateLimit(id)).not.toThrow();
    expect(() => assertWithinRateLimit(id)).not.toThrow();
    expect(() => assertWithinRateLimit(id)).not.toThrow();
  });

  it("blocks with a retryable throttled error once the ceiling is reached", () => {
    const id = freshIdentifier();
    for (let index = 0; index < 3; index += 1) assertWithinRateLimit(id);

    let thrown: unknown;
    try {
      assertWithinRateLimit(id);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AiError);
    expect((thrown as AiError).code).toBe("throttled");
    expect((thrown as AiError).status).toBe(429);
    expect((thrown as AiError).message).toMatch(/wait|try again/i);
  });

  it("keeps separate buckets for separate clients", () => {
    const first = freshIdentifier();
    const second = freshIdentifier();
    for (let index = 0; index < 3; index += 1) assertWithinRateLimit(first);
    expect(() => assertWithinRateLimit(second)).not.toThrow();
  });

  it("resets after the window elapses", () => {
    process.env.AI_RATE_LIMIT_WINDOW_MS = "1";
    const id = freshIdentifier();
    for (let index = 0; index < 3; index += 1) assertWithinRateLimit(id);
    expect(() => assertWithinRateLimit(id)).toThrow();

    const start = Date.now();
    while (Date.now() - start < 5) {
      // Busy-wait past the configured window without adding a timer dependency.
    }
    expect(() => assertWithinRateLimit(id)).not.toThrow();
  });

  it("falls back to a safe default when the environment value is nonsense", () => {
    process.env.AI_RATE_LIMIT_MAX = "not-a-number";
    const id = freshIdentifier();
    for (let index = 0; index < 12; index += 1) assertWithinRateLimit(id);
    expect(() => assertWithinRateLimit(id)).toThrow();
  });
});

describe("clientIdentifierFromHeaders", () => {
  it("prefers the first forwarded address", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(clientIdentifierFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip and then to a local identifier", () => {
    expect(clientIdentifierFromHeaders(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIdentifierFromHeaders(new Headers())).toBe("local");
  });
});

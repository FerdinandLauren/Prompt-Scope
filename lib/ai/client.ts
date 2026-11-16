import "server-only";
import { GoogleGenAI } from "@google/genai";

export const DEFAULT_MODEL = "gemini-3.8-flash";

export type AiMode = "live" | "demo";

export type AiStatus = {
  mode: AiMode;
  model: string | null;
  configured: boolean;
};

function readApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return undefined;
  // Guard against placeholder values copied from the example file.
  if (["", "your_api_key", "changeme", "paste-key-here"].includes(key.toLowerCase())) return undefined;
  return key;
}

export function getModelId(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function getAiStatus(): AiStatus {
  const configured = Boolean(readApiKey());
  return {
    mode: configured ? "live" : "demo",
    model: configured ? getModelId() : null,
    configured,
  };
}

let client: GoogleGenAI | null = null;

/**
 * Single server-side provider instance. It is created lazily so a missing key
 * degrades to Demo Mode instead of breaking module evaluation.
 */
export function getProvider(): GoogleGenAI {
  const apiKey = readApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** Test seam: allows suites to inject a stub provider. */
export function __setProviderForTests(next: GoogleGenAI | null) {
  client = next;
}

import "server-only";
import type { z } from "zod";
import type { AiTask, ProviderId, TaskComplexity } from "@/types/ai";
import {
  orderReadyProviders,
  resolveProviders,
  resolveRouting,
  type AiRequestContext,
  type ResolvedProvider,
  type ResolvedRouting,
} from "@/lib/ai/providers/config";
import { geminiAdapter } from "@/lib/ai/providers/gemini";
import { openAiCompatibleAdapter } from "@/lib/ai/providers/openai-compatible";
import type { AiProviderAdapter } from "@/lib/ai/providers/adapter";
import { recordProviderFailure, recordProviderSuccess } from "@/lib/ai/providers/health";
import { recordUsage } from "@/lib/ai/providers/usage";
import { AiError, isFallbackEligible, normalizeProviderError } from "@/lib/ai/errors";
import type { StructuredOutcome } from "@/lib/ai/structured";

const REQUEST_TIMEOUT_MS = 90_000;
const MAX_ROUNDS = 2;
const BASE_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5_000;
/** A long Retry-After is a signal to switch provider, not to make the user wait. */
const MAX_RETRY_AFTER_MS = 10_000;

export type RouterRequest<T> = {
  systemInstruction: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  temperature: number;
  maxOutputTokens: number;
  label: string;
  task: AiTask;
  complexity: TaskComplexity;
  thinkingLevel?: "LOW" | "HIGH";
  validate?: (data: T) => string | null;
  timeoutMs?: number;
};

export type RoutedResult<T> = StructuredOutcome<T> & {
  provider: ProviderId;
  model: string;
};

type Candidate = {
  provider: ResolvedProvider;
  model: string;
};

/** The fields a plan needs; keeps the router generic over the response type. */
type PlanInput = Pick<
  RouterRequest<unknown>,
  "systemInstruction" | "userPrompt" | "maxOutputTokens"
>;

function adapterFor(id: ProviderId): AiProviderAdapter {
  return id === "gemini" ? geminiAdapter : openAiCompatibleAdapter;
}

function secretsFor(context: AiRequestContext, providers: ResolvedProvider[]): string[] {
  return [
    ...Object.values(context.keys),
    ...providers.map((provider) => provider.key),
    process.env.GEMINI_API_KEY,
    process.env.VIKEY_API_KEY,
    process.env.DATTIO_API_KEY,
  ].filter((value): value is string => Boolean(value));
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Drops a model only when its documented limits are known and too small. An
 * unknown limit is not treated as a small one.
 */
function modelFits(provider: ResolvedProvider, model: string, request: PlanInput) {
  const info = provider.models.find((entry) => entry.id === model);
  if (!info) return true;
  if (info.maxOutputTokens !== null && info.maxOutputTokens < request.maxOutputTokens) return false;
  if (
    info.contextWindow !== null &&
    estimateTokens(request.systemInstruction + request.userPrompt) > info.contextWindow
  ) {
    return false;
  }
  return true;
}

function buildPlan(
  providers: ResolvedProvider[],
  routing: ResolvedRouting,
  request: PlanInput,
): Candidate[] {
  const ordered = orderReadyProviders(providers, routing);
  const plan: Candidate[] = [];

  for (const provider of ordered) {
    const manualModel =
      routing.mode === "manual" && routing.manual?.provider === provider.id
        ? routing.manual.model
        : undefined;
    const model = manualModel || provider.model;
    if (!model) continue;
    if (!modelFits(provider, model, request)) continue;
    plan.push({ provider, model });
  }

  return plan;
}

/** The extra Gemini model attempt that existed before multi-provider routing. */
function geminiModelFallback(candidate: Candidate, tried: Set<string>): Candidate | null {
  if (candidate.provider.id !== "gemini") return null;
  const next = candidate.provider.models.find(
    (model) => model.id !== candidate.model && !tried.has(`${candidate.provider.id}:${model.id}`),
  );
  return next ? { provider: candidate.provider, model: next.id } : null;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function retryDelay(errors: AiError[], round: number): number | null {
  const retryAfter = errors
    .map((error) => error.retryAfterMs)
    .filter((value): value is number => value !== undefined);

  if (retryAfter.length > 0) {
    const requested = Math.max(...retryAfter);
    if (requested > MAX_RETRY_AFTER_MS) return null;
    return Math.max(requested, BASE_RETRY_DELAY_MS);
  }

  // Bounded exponential backoff with a little jitter. There is one retry round
  // today, so this starts at the base delay rather than growing unboundedly.
  const backoff = Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** round);
  return backoff + Math.floor(Math.random() * 200);
}

async function attempt<T>(
  candidate: Candidate,
  request: RouterRequest<T>,
  secrets: string[],
): Promise<RoutedResult<T>> {
  const adapter = adapterFor(candidate.provider.id);
  const startedAt = Date.now();

  try {
    const outcome = await adapter.generateStructured(
      {
        provider: candidate.provider,
        model: candidate.model,
        systemInstruction: request.systemInstruction,
        userPrompt: request.userPrompt,
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
        label: request.label,
        thinkingLevel: request.thinkingLevel,
        timeoutMs: request.timeoutMs ?? REQUEST_TIMEOUT_MS,
      },
      request.schema,
      request.validate,
    );

    const latencyMs = Date.now() - startedAt;
    recordProviderSuccess(candidate.provider.id, latencyMs);
    recordUsage({
      provider: candidate.provider.id,
      model: candidate.model,
      task: request.task,
      latencyMs,
      ok: true,
      usage: outcome.usage,
    });

    return { ...outcome, provider: candidate.provider.id, model: candidate.model };
  } catch (error) {
    const normalized = normalizeProviderError(error, secrets);
    const latencyMs = Date.now() - startedAt;
    recordProviderFailure(
      candidate.provider.id,
      normalized.code,
      latencyMs,
      normalized.retryAfterMs,
    );
    recordUsage({
      provider: candidate.provider.id,
      model: candidate.model,
      task: request.task,
      latencyMs,
      ok: false,
      errorCode: normalized.code,
    });
    throw normalized;
  }
}

/**
 * Runs one structured request through the configured providers.
 *
 * The request object is never rewritten between providers: the same system
 * instruction, user prompt, schema, depth-derived output budget and semantic
 * validation apply to every attempt. A fallback response therefore has to pass
 * exactly the same checks as the primary one.
 */
export async function executeStructured<T>(
  request: RouterRequest<T>,
  context: AiRequestContext,
): Promise<RoutedResult<T>> {
  const providers = resolveProviders(context);
  const routing = resolveRouting(context);
  const plan = buildPlan(providers, routing, request);
  const secrets = secretsFor(context, providers);

  if (plan.length === 0) {
    const anyKey = providers.some((provider) => provider.key);
    if (!anyKey) {
      throw new AiError("missing_api_key", "No AI provider is configured for this request.", {
        retryable: false,
      });
    }
    throw new AiError(
      "unsupported_capability",
      "No configured provider can satisfy this task's capability requirements.",
      { retryable: false },
    );
  }

  const failures: AiError[] = [];

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const triedThisRound = new Set<string>();

    for (const candidate of plan) {
      const key = `${candidate.provider.id}:${candidate.model}`;
      if (triedThisRound.has(key)) continue;
      triedThisRound.add(key);

      try {
        return await attempt(candidate, request, secrets);
      } catch (error) {
        const normalized = error instanceof AiError ? error : normalizeProviderError(error, secrets);
        if (!isFallbackEligible(normalized)) throw normalized;
        failures.push(normalized);

        // A busy model within the same provider gets one quieter model, which
        // preserves the previous Gemini 503 behaviour.
        if (
          normalized.code === "provider_overloaded" &&
          (routing.mode === "auto_fallback" || routing.fallbackEnabled)
        ) {
          const fallback = geminiModelFallback(candidate, triedThisRound);
          if (fallback) {
            triedThisRound.add(`${fallback.provider.id}:${fallback.model}`);
            try {
              return await attempt(fallback, request, secrets);
            } catch (fallbackError) {
              const next =
                fallbackError instanceof AiError
                  ? fallbackError
                  : normalizeProviderError(fallbackError, secrets);
              if (!isFallbackEligible(next)) throw next;
              failures.push(next);
            }
          }
        }
      }
    }

    const last = failures.at(-1);
    if (round === MAX_ROUNDS - 1 || !last) break;

    const wait = retryDelay(failures, round);
    if (wait === null) break;

    // The next round may retry transient failures only. Permanent errors were
    // already thrown above, so clearing the trail keeps the final error honest.
    failures.length = 0;
    await delay(wait);
  }

  throw failures.at(-1) ?? new AiError("provider_error", "Every configured provider failed.");
}

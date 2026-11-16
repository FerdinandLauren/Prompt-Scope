import "server-only";
import type { AiUsageRecord, AiUsageSummary, ProviderId } from "@/types/ai";

/**
 * In-process usage ledger. It records only what a provider actually reports:
 * missing token counts stay `null` and are counted as "without usage" instead
 * of being estimated. The ledger resets when the server restarts.
 */

const MAX_RECORDS = 200;
const startedAt = new Date().toISOString();

const records: AiUsageRecord[] = [];

let sequence = 0;

export type UsageInput = {
  provider: ProviderId;
  model: string;
  task: string;
  latencyMs: number;
  ok: boolean;
  errorCode?: string;
  usage?: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
};

export function recordUsage(input: UsageInput): AiUsageRecord {
  const usage = input.usage;
  const reported =
    usage !== undefined &&
    (usage.inputTokens !== null || usage.outputTokens !== null || usage.totalTokens !== null);

  const record: AiUsageRecord = {
    id: `usage_${Date.now().toString(36)}_${(sequence += 1).toString(36)}`,
    provider: input.provider,
    model: input.model,
    task: input.task,
    inputTokens: reported ? usage.inputTokens : null,
    outputTokens: reported ? usage.outputTokens : null,
    totalTokens: reported ? usage.totalTokens : null,
    usageSource: reported ? "reported" : "unavailable",
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    status: input.ok ? "success" : "failure",
    errorCode: input.ok ? null : input.errorCode ?? "provider_error",
    at: new Date().toISOString(),
  };

  records.push(record);
  if (records.length > MAX_RECORDS) records.splice(0, records.length - MAX_RECORDS);
  return record;
}

export function usageSummary(): AiUsageSummary {
  type Row = {
    provider: ProviderId;
    requests: number;
    successes: number;
    failures: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latencies: number[];
  };

  const byProvider = new Map<ProviderId, Row>();

  for (const record of records) {
    let row = byProvider.get(record.provider);
    if (!row) {
      row = {
        provider: record.provider,
        requests: 0,
        successes: 0,
        failures: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        latencies: [],
      };
      byProvider.set(record.provider, row);
    }
    row.requests += 1;
    if (record.status === "success") row.successes += 1;
    else row.failures += 1;
    row.inputTokens += record.inputTokens ?? 0;
    row.outputTokens += record.outputTokens ?? 0;
    row.totalTokens += record.totalTokens ?? 0;
    row.latencies.push(record.latencyMs);
  }

  const providerRows = [...byProvider.values()].map((row) => ({
    provider: row.provider,
    requests: row.requests,
    successes: row.successes,
    failures: row.failures,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    totalTokens: row.totalTokens,
    avgLatencyMs:
      row.latencies.length > 0
        ? Math.round(row.latencies.reduce((sum, value) => sum + value, 0) / row.latencies.length)
        : null,
  }));

  return {
    since: startedAt,
    requests: records.length,
    successes: records.filter((record) => record.status === "success").length,
    failures: records.filter((record) => record.status === "failure").length,
    reportedTokens: records.reduce((sum, record) => sum + (record.totalTokens ?? 0), 0),
    recordsWithoutUsage: records.filter((record) => record.usageSource === "unavailable").length,
    byProvider: providerRows,
    recent: records.slice(-12).reverse(),
  };
}

/** Test seam. */
export function __resetUsageForTests() {
  records.length = 0;
}

"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { useAiConfig, useProviderKeyActions, useProviderKeys } from "@/hooks/use-ai-providers";
import { useAiStatus } from "@/hooks/use-ai-status";
import { getJson, postJson } from "@/lib/api/client";
import { PROVIDER_IDS, type AiProviderSummary, type AiUsageSummary, type ProviderId, type RoutingMode } from "@/types/ai";
import { PROVIDER_META } from "@/lib/ai/providers/meta";
import { DEFAULT_ROUTING } from "@/lib/storage/ai-providers";

const STATUS_LABEL: Record<AiProviderSummary["status"], string> = {
  connected: "Connected",
  not_configured: "Not configured",
  connection_failed: "Connection failed",
  rate_limited: "Rate limited",
  temporarily_unavailable: "Temporarily unavailable",
  disabled: "Disabled",
  untested: "Not yet tested",
};

const STATUS_TONE: Record<AiProviderSummary["status"], "neutral" | "live" | "medium" | "high" | "low"> = {
  connected: "live",
  not_configured: "neutral",
  connection_failed: "high",
  rate_limited: "medium",
  temporarily_unavailable: "medium",
  disabled: "neutral",
  untested: "low",
};

const MODE_LABEL: Record<RoutingMode, string> = {
  manual: "Manual",
  auto: "Automatic",
  auto_fallback: "Automatic + fallback",
};

function fallbackProvider(provider: ProviderId): AiProviderSummary {
  const meta = PROVIDER_META[provider];
  return {
    id: provider,
    label: meta.label,
    enabled: true,
    configured: false,
    keySource: "none",
    status: "untested",
    model: null,
    baseUrl: meta.defaultBaseUrl,
    capabilities: meta.capabilities,
    models: [],
    verified: meta.verified,
    docsUrl: meta.docsUrl,
    note: meta.note,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastErrorCode: null,
    latencyMs: null,
    successRate: null,
  };
}

type Feedback = { tone: "success" | "error" | "demo"; text: string };

export function AiProvidersPanel() {
  const { status, refresh } = useAiStatus();
  const keys = useProviderKeys();
  const { config, setProvider, setRouting } = useAiConfig();
  const { save, clear } = useProviderKeyActions();
  const { showToast } = useToast();

  const [usage, setUsage] = useState<AiUsageSummary | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<ProviderId, string>>>({});
  const [modelDrafts, setModelDrafts] = useState<Partial<Record<ProviderId, string>>>({});
  const [baseUrlDrafts, setBaseUrlDrafts] = useState<Partial<Record<ProviderId, string>>>({});
  const [remember, setRemember] = useState<Partial<Record<ProviderId, boolean>>>({});
  const [visible, setVisible] = useState<Partial<Record<ProviderId, boolean>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Partial<Record<ProviderId, Feedback>>>({});
  const [remoteModels, setRemoteModels] = useState<Partial<Record<ProviderId, string[]>>>({});

  const effective = status;
  const providers = effective.providers?.length
    ? effective.providers
    : PROVIDER_IDS.map(fallbackProvider);

  const mode = config.routing?.mode ?? effective.routing ?? "auto_fallback";
  const preferredProvider = config.routing?.preferredProvider ?? "auto";
  const fallbackOrder = config.routing?.fallbackOrder ?? DEFAULT_ROUTING.fallbackOrder;
  const fallbackEnabled = config.routing?.fallbackEnabled ?? DEFAULT_ROUTING.fallbackEnabled;
  const manual = config.routing?.manual ?? null;

  async function reloadUsage() {
    const result = await getJson<AiUsageSummary>("/api/ai/usage");
    if (result.ok) setUsage(result.data);
  }

  useEffect(() => {
    let active = true;
    void getJson<AiUsageSummary>("/api/ai/usage").then((result) => {
      if (active && result.ok) setUsage(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

  function updateFeedback(provider: ProviderId, next: Feedback | undefined) {
    setFeedback((current) => ({ ...current, [provider]: next }));
  }

  async function testProvider(provider: ProviderId) {
    setBusy(`test:${provider}`);
    updateFeedback(provider, undefined);

    const result = await postJson<{ model: string; source: string; slow?: boolean; busy?: boolean }>(
      "/api/ai/verify",
      { provider },
    );
    setBusy(null);

    if (!result.ok) {
      updateFeedback(provider, { tone: "error", text: result.error.message });
      showToast(`${PROVIDER_META[provider].label} did not verify.`, "error");
    } else {
      const extra = result.data.busy
        ? " The key is valid, but the model is busy right now."
        : result.data.slow
          ? " The key is valid, but the test answer was slow."
          : "";
      updateFeedback(provider, {
        tone: result.data.busy || result.data.slow ? "demo" : "success",
        text: `Connected with ${result.data.model}.${extra}`,
      });
      showToast(`${PROVIDER_META[provider].label} connection verified.`, "success");
    }

    refresh();
    await reloadUsage();
  }

  async function saveAndTest(provider: ProviderId) {
    const key = drafts[provider]?.trim() ?? "";
    if (!key) return;

    const saved = save(provider, key, Boolean(remember[provider]));
    if (!saved.ok) {
      updateFeedback(provider, { tone: "error", text: saved.error ?? "The key could not be saved." });
      return;
    }

    setDrafts((current) => ({ ...current, [provider]: "" }));
    await testProvider(provider);
  }

  async function refreshModels(provider: ProviderId) {
    setBusy(`models:${provider}`);
    updateFeedback(provider, undefined);

    const result = await postJson<{ models: Array<{ id: string }>; source: string }>(
      "/api/ai/models",
      { provider },
    );
    setBusy(null);

    if (!result.ok) {
      updateFeedback(provider, { tone: "error", text: result.error.message });
      return;
    }

    setRemoteModels((current) => ({
      ...current,
      [provider]: result.data.models.map((model) => model.id),
    }));
    updateFeedback(provider, {
      tone: "success",
      text:
        result.data.models.length > 0
          ? `${result.data.models.length} model${result.data.models.length === 1 ? "" : "s"} reported by the provider.`
          : "The provider returned no models for this key.",
    });
  }

  function updateProviderField(provider: ProviderId, patch: { model?: string; baseUrl?: string; enabled?: boolean }) {
    const next = { ...patch };
    if (patch.model !== undefined) next.model = patch.model.trim() || undefined;
    if (patch.baseUrl !== undefined) next.baseUrl = patch.baseUrl.trim() || undefined;
    const saved = setProvider(provider, next);
    if (!saved.ok) showToast(saved.error ?? "Preferences could not be saved.", "error");
  }

  function moveFallback(provider: ProviderId, direction: -1 | 1) {
    const index = fallbackOrder.indexOf(provider);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= fallbackOrder.length) return;
    const next = [...fallbackOrder];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setRouting({ fallbackOrder: next });
  }

  const manualProvider = providers.find((provider) => provider.id === manual?.provider) ?? providers[0];

  return (
    <div className="space-y-5">
      <div className="rounded-[10px] border border-line bg-bg-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-3.5">
          <div className="flex items-center gap-2">
            <KeyRound size={14} strokeWidth={1.7} className="text-ink-3" aria-hidden="true" />
            <h3 className="text-[12.5px] font-medium text-ink">Supported providers</h3>
          </div>
          <Badge tone={mode === "auto_fallback" ? "live" : "neutral"}>{MODE_LABEL[mode]}</Badge>
        </div>

        <div className="divide-y divide-line-soft">
          {providers.map((provider) => {
            const meta = PROVIDER_META[provider.id];
            const keyState = keys[provider.id];
            const note = feedback[provider.id];
            const models = [
              ...new Set([
                ...provider.models.map((model) => model.id),
                ...(remoteModels[provider.id] ?? []),
                ...(provider.model ? [provider.model] : []),
              ]),
            ];
            const isBusy = busy?.endsWith(provider.id) ?? false;

            return (
              <div key={provider.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-medium text-ink">{meta.label}</span>
                    <Badge tone={STATUS_TONE[provider.status]}>{STATUS_LABEL[provider.status]}</Badge>
                    {provider.keySource === "browser" ? <Badge tone="low">Browser key</Badge> : null}
                    {provider.keySource === "environment" ? <Badge tone="low">Server key</Badge> : null}
                    {!provider.verified ? <Badge tone="demo">Docs unverified</Badge> : null}
                  </div>
                  <label className="flex items-center gap-2 text-[11.5px] text-ink-2">
                    <input
                      type="checkbox"
                      checked={provider.enabled}
                      onChange={(event) => updateProviderField(provider.id, { enabled: event.target.checked })}
                      className="h-3.5 w-3.5 accent-[var(--orange)]"
                    />
                    Enabled
                  </label>
                </div>

                {provider.note ? (
                  <p className="mt-1.5 max-w-[92ch] text-[11px] leading-[1.6] text-ink-3">{provider.note}</p>
                ) : null}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mono-label mb-1 block" htmlFor={`model-${provider.id}`}>
                      Model
                    </label>
                    <input
                      id={`model-${provider.id}`}
                      list={`models-${provider.id}`}
                      value={modelDrafts[provider.id] ?? provider.model ?? ""}
                      onChange={(event) =>
                        setModelDrafts((current) => ({ ...current, [provider.id]: event.target.value }))
                      }
                      onBlur={(event) => updateProviderField(provider.id, { model: event.target.value })}
                      placeholder={meta.defaultBaseUrl ? "model id" : "model id required"}
                      spellCheck={false}
                      className="h-9 w-full rounded-[6px] border border-line bg-bg px-3 font-mono text-[11.5px] text-ink placeholder:text-ink-3 focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/15"
                    />
                    <datalist id={`models-${provider.id}`}>
                      {models.map((model) => (
                        <option key={model} value={model} />
                      ))}
                    </datalist>
                  </div>

                  {provider.id !== "gemini" ? (
                    <div>
                      <label className="mono-label mb-1 block" htmlFor={`base-url-${provider.id}`}>
                        Base URL
                      </label>
                      <input
                        id={`base-url-${provider.id}`}
                        value={baseUrlDrafts[provider.id] ?? config.providers?.[provider.id]?.baseUrl ?? provider.baseUrl ?? ""}
                        onChange={(event) =>
                          setBaseUrlDrafts((current) => ({ ...current, [provider.id]: event.target.value }))
                        }
                        onBlur={(event) => updateProviderField(provider.id, { baseUrl: event.target.value })}
                        placeholder={meta.defaultBaseUrl ?? "https://…/v1"}
                        spellCheck={false}
                        className="h-9 w-full rounded-[6px] border border-line bg-bg px-3 font-mono text-[11.5px] text-ink placeholder:text-ink-3 focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/15"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="mt-3">
                  {provider.id === "gemini" ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[7px] border border-line bg-bg px-3 py-2.5">
                      <div>
                        <div className="mono-label">Gemini key</div>
                        <div className="mt-0.5 font-mono text-[11.5px] text-ink-2">
                          {keyState.hasKey ? keyState.masked : "Managed in the API key section above."}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void testProvider("gemini")}
                          disabled={isBusy}
                          className={buttonClass({ variant: "secondary", size: "sm" })}
                        >
                          {isBusy ? "Testing…" : "Test connection"}
                        </button>
                        {keyState.hasKey ? (
                          <button
                            type="button"
                            onClick={() => {
                              clear("gemini");
                              showToast("Browser Gemini key removed.", "info");
                              refresh();
                            }}
                            className={buttonClass({ variant: "danger", size: "sm" })}
                          >
                            <Trash2 size={12} aria-hidden="true" /> Clear
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {keyState.hasKey ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[7px] border border-line bg-bg px-3 py-2.5">
                          <div>
                            <div className="mono-label">Saved key</div>
                            <div className="mt-0.5 font-mono text-[11.5px] text-ink-2">{keyState.masked}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void testProvider(provider.id)}
                              disabled={isBusy}
                              className={buttonClass({ variant: "secondary", size: "sm" })}
                            >
                              {isBusy ? "Testing…" : "Test connection"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                clear(provider.id);
                                showToast(`${meta.label} key removed.`, "info");
                                refresh();
                              }}
                              className={buttonClass({ variant: "danger", size: "sm" })}
                            >
                              <Trash2 size={12} aria-hidden="true" /> Clear
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative flex-1">
                          <input
                            type={visible[provider.id] ? "text" : "password"}
                            value={drafts[provider.id] ?? ""}
                            onChange={(event) =>
                              setDrafts((current) => ({ ...current, [provider.id]: event.target.value }))
                            }
                            autoComplete="off"
                            spellCheck={false}
                            aria-label={`${meta.label} API key`}
                            placeholder={`${meta.label} API key`}
                            className="h-9 w-full rounded-[6px] border border-line bg-bg px-3 pr-10 font-mono text-[11.5px] text-ink placeholder:text-ink-3 focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/15"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setVisible((current) => ({ ...current, [provider.id]: !current[provider.id] }))
                            }
                            aria-label={visible[provider.id] ? "Hide the key" : "Show the key"}
                            className="absolute right-1 top-0.5 flex h-8 w-8 items-center justify-center rounded-[4px] text-ink-3 hover:bg-surface hover:text-ink"
                          >
                            {visible[provider.id] ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => void saveAndTest(provider.id)}
                          disabled={isBusy || !(drafts[provider.id]?.trim().length ?? 0)}
                          className={buttonClass({ variant: "primary", size: "sm", className: "sm:w-[150px]" })}
                        >
                          {isBusy ? "Verifying…" : keyState.hasKey ? "Replace & test" : "Save & test"}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-[11px] text-ink-3">
                          <input
                            type="checkbox"
                            checked={Boolean(remember[provider.id])}
                            onChange={(event) =>
                              setRemember((current) => ({ ...current, [provider.id]: event.target.checked }))
                            }
                            className="h-3.5 w-3.5 accent-[var(--orange)]"
                          />
                          Remember on this device (otherwise this browser session only)
                        </label>
                        <button
                          type="button"
                          onClick={() => void refreshModels(provider.id)}
                          disabled={isBusy || !keyState.hasKey}
                          className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 hover:text-ink disabled:opacity-45"
                        >
                          <RefreshCw size={11} aria-hidden="true" /> Refresh models
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {note ? (
                  <Notice tone={note.tone} className="mt-2.5">
                    {note.text}
                  </Notice>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="border-t border-line-soft px-5 py-3.5">
          <p className="flex items-start gap-2 text-[11px] leading-[1.6] text-ink-3">
            <ShieldAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            Keys are sent only to this application&apos;s own server routes for the request that needs them. Server
            environment keys never reach the browser; browser keys stay in this browser&apos;s storage until you clear
            them.
          </p>
        </div>
      </div>

      <div className="rounded-[10px] border border-line bg-bg-raised">
        <div className="border-b border-line-soft px-5 py-3.5">
          <h3 className="text-[12.5px] font-medium text-ink">Routing</h3>
          <p className="mt-1 text-[11px] leading-[1.6] text-ink-3">
            Task complexity, capability, availability and your preference decide the provider. The active strategy is
            shown above.
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Routing mode">
            {(Object.keys(MODE_LABEL) as RoutingMode[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => {
                  if (value === "manual" && !manual) {
                    const provider =
                      preferredProvider !== "auto"
                        ? preferredProvider
                        : providers.find((entry) => entry.configured)?.id ?? "gemini";
                    const model = providers.find((entry) => entry.id === provider)?.model ?? undefined;
                    setRouting({ mode: value, manual: { provider, ...(model ? { model } : {}) } });
                    return;
                  }
                  setRouting({ mode: value });
                }}
                className={buttonClass({
                  variant: mode === value ? "primary" : "secondary",
                  size: "sm",
                })}
              >
                {MODE_LABEL[value]}
                {value === "auto_fallback" ? " · recommended" : ""}
              </button>
            ))}
          </div>

          <p className="max-w-[92ch] text-[11px] leading-[1.6] text-ink-3">
            {mode === "manual"
              ? "Manual uses the provider and model you choose. Alternatives are tried only when fallback is enabled."
              : mode === "auto"
                ? "Automatic picks one provider for each task. It does not switch providers when a call fails."
                : "Automatic with fallback picks the best provider and tries the others on rate limits, 5xx, timeouts and network failures."}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mono-label mb-1 block" htmlFor="preferred-provider">
                Preferred provider
              </label>
              <select
                id="preferred-provider"
                value={preferredProvider}
                onChange={(event) =>
                  setRouting({ preferredProvider: event.target.value as typeof preferredProvider })
                }
                className="h-9 w-full rounded-[6px] border border-line bg-bg px-2.5 text-[12px] text-ink focus:border-orange focus:outline-none"
              >
                <option value="auto">Automatic</option>
                {PROVIDER_IDS.map((provider) => (
                  <option key={provider} value={provider}>
                    {PROVIDER_META[provider].label}
                  </option>
                ))}
              </select>
            </div>

            {mode === "manual" ? (
              <>
                <div>
                  <label className="mono-label mb-1 block" htmlFor="manual-provider">
                    Manual provider
                  </label>
                  <select
                    id="manual-provider"
                    value={manual?.provider ?? manualProvider?.id ?? "gemini"}
                    onChange={(event) => {
                      const provider = event.target.value as ProviderId;
                      const model = providers.find((entry) => entry.id === provider)?.model ?? undefined;
                      setRouting({ manual: { provider, model } });
                    }}
                    className="h-9 w-full rounded-[6px] border border-line bg-bg px-2.5 text-[12px] text-ink focus:border-orange focus:outline-none"
                  >
                    {PROVIDER_IDS.map((provider) => (
                      <option key={provider} value={provider}>
                        {PROVIDER_META[provider].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mono-label mb-1 block" htmlFor="manual-model">
                    Manual model
                  </label>
                  <input
                    id="manual-model"
                    value={manual?.model ?? ""}
                    onChange={(event) =>
                      setRouting({
                        manual: {
                          provider: manual?.provider ?? manualProvider?.id ?? "gemini",
                          model: event.target.value,
                        },
                      })
                    }
                    placeholder={manualProvider?.model ?? "model id"}
                    spellCheck={false}
                    className="h-9 w-full rounded-[6px] border border-line bg-bg px-3 font-mono text-[11.5px] text-ink placeholder:text-ink-3 focus:border-orange focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 self-end text-[11.5px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={fallbackEnabled}
                    onChange={(event) => setRouting({ fallbackEnabled: event.target.checked })}
                    className="h-3.5 w-3.5 accent-[var(--orange)]"
                  />
                  Allow fallback when manual fails
                </label>
              </>
            ) : null}
          </div>

          <div>
            <div className="mono-label mb-2">Fallback order</div>
            <ul className="divide-y divide-line-soft rounded-[7px] border border-line">
              {fallbackOrder.map((provider, index) => (
                <li key={provider} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="flex items-center gap-2 text-[12px] text-ink-2">
                    <span className="font-mono text-[9px] text-ink-3">{String(index + 1).padStart(2, "0")}</span>
                    {PROVIDER_META[provider].label}
                    {index === 0 ? <Badge tone="low">first</Badge> : null}
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      aria-label={`Move ${PROVIDER_META[provider].label} up`}
                      disabled={index === 0}
                      onClick={() => moveFallback(provider, -1)}
                      className={buttonClass({ variant: "ghost", size: "icon", className: "h-7 w-7" })}
                    >
                      <ArrowUp size={12} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${PROVIDER_META[provider].label} down`}
                      disabled={index === fallbackOrder.length - 1}
                      onClick={() => moveFallback(provider, 1)}
                      className={buttonClass({ variant: "ghost", size: "icon", className: "h-7 w-7" })}
                    >
                      <ArrowDown size={12} aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] leading-[1.5] text-ink-3">
              Only enabled providers with a verified key are used. A provider that is disabled here is never sent your
              content.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-line bg-bg-raised">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-5 py-3.5">
          <div>
            <h3 className="text-[12.5px] font-medium text-ink">Usage</h3>
            <p className="mt-1 text-[11px] leading-[1.5] text-ink-3">
              Since this server process started ({usage ? new Date(usage.since).toLocaleString() : "loading…"}). Resets
              on restart; stored in memory only.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              refresh();
              void reloadUsage();
            }}
            className={buttonClass({ variant: "ghost", size: "sm" })}
          >
            <RefreshCw size={12} aria-hidden="true" /> Refresh
          </button>
        </div>

        {usage ? (
          <div className="space-y-4 px-5 py-4">
            <dl className="grid gap-px overflow-hidden rounded-[7px] border border-line bg-line sm:grid-cols-4">
              {[
                { label: "Requests", value: usage.requests },
                { label: "Success", value: usage.successes },
                { label: "Failures", value: usage.failures },
                { label: "Reported tokens", value: usage.reportedTokens },
              ].map((item) => (
                <div key={item.label} className="bg-bg-raised px-3 py-2.5">
                  <dt className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-3">{item.label}</dt>
                  <dd className="mt-1 font-mono text-[16px] leading-none text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>

            {usage.byProvider.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line-soft">
                      {["Provider", "Requests", "OK", "Failed", "Tokens", "Avg latency"].map((heading) => (
                        <th
                          key={heading}
                          className="py-1.5 pr-3 font-mono text-[8.5px] font-medium uppercase tracking-[0.1em] text-ink-3"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usage.byProvider.map((row) => (
                      <tr key={row.provider} className="border-b border-line-soft last:border-0">
                        <td className="py-2 pr-3 text-[11.5px] text-ink-2">{PROVIDER_META[row.provider].label}</td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-ink-2">{row.requests}</td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-ink-2">{row.successes}</td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-ink-2">{row.failures}</td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-ink-2">
                          {row.totalTokens > 0 ? row.totalTokens : "unavailable"}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-ink-2">
                          {row.avgLatencyMs === null ? "—" : `${row.avgLatencyMs} ms`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[11.5px] text-ink-3">No AI requests recorded by this server yet.</p>
            )}

            {usage.recordsWithoutUsage > 0 ? (
              <p className="text-[11px] leading-[1.5] text-ink-3">
                {usage.recordsWithoutUsage} request{usage.recordsWithoutUsage === 1 ? "" : "s"} returned no token
                usage. Those are shown as unavailable and are never estimated.
              </p>
            ) : null}

            {usage.recent.length > 0 ? (
              <ul className="divide-y divide-line-soft rounded-[7px] border border-line">
                {usage.recent.map((record) => (
                  <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span className="flex flex-wrap items-center gap-2 text-[11px] text-ink-2">
                      <Badge tone={record.status === "success" ? "live" : "high"}>
                        {record.status === "success" ? "ok" : "failed"}
                      </Badge>
                      <span>{PROVIDER_META[record.provider].label}</span>
                      <span className="font-mono text-[10px] text-ink-3">{record.model}</span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">{record.task}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-ink-3">
                      <span>
                        {record.totalTokens === null
                          ? "tokens unavailable"
                          : `${record.inputTokens ?? "?"} in / ${record.outputTokens ?? "?"} out`}
                      </span>
                      <span>{record.latencyMs} ms</span>
                      <span>{new Date(record.at).toLocaleTimeString()}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="px-5 py-4">
            <p className="text-[11.5px] text-ink-3">Usage has not loaded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

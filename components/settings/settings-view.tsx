"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { ModeBadge } from "@/components/system/mode-badge";
import { BrowserKeyPanel } from "@/components/settings/browser-key-panel";
import { AiProvidersPanel } from "@/components/settings/ai-providers-panel";
import { ThemeSegmentedControl } from "@/components/theme/theme-toggle";
import { useAiStatus } from "@/hooks/use-ai-status";
import { useSessions } from "@/hooks/use-sessions";
import { useComparisons } from "@/hooks/use-comparisons";
import { APP_VERSION } from "@/config/app";
import { evaluationDimensions } from "@/config/evaluation-rubric";
import { categories, categoryGroups } from "@/config/domains";
import { clearSessions } from "@/lib/storage/prompt-storage";
import { clearComparisons } from "@/lib/storage/comparison-storage";
import { clearPendingPrompt } from "@/lib/storage/pending-prompt";
import { postJson } from "@/lib/api/client";

export function SettingsView() {
  const { status, loading } = useAiStatus();
  const sessions = useSessions();
  const comparisons = useComparisons();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [connection, setConnection] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const versionCount = sessions.reduce((total, session) => total + session.versions.length, 0);

  async function testConnection() {
    setChecking(true);
    const result = await postJson<{ model: string; source: string }>("/api/ai/verify", {});
    setChecking(false);
    if (!result.ok) {
      setConnection(result.error.message);
      return;
    }
    setConnection(
      `Provider reachable with ${result.data.model} using the ${result.data.source === "browser" ? "browser" : "server"} key.`,
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pb-20 sm:px-8 sm:pb-24 lg:px-14">
      <WorkspaceHeader
        title="Settings"
        section="System"
        description="AI providers and routing, analysis mode, appearance, workspace inventory, local data controls, and the privacy terms of this application."
        meta={<ModeBadge showModel />}
      />

      <section className="py-7">
        <h2 className="mono-label mb-3">Appearance</h2>
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-[10px] border border-line bg-bg-raised px-6 py-5">
          <div>
            <div className="text-[12.5px] font-medium text-ink">Color theme</div>
            <p className="mt-1 max-w-[64ch] text-[11.5px] leading-[1.6] text-ink-3">
              System follows your operating system. Your choice is remembered in this browser.
            </p>
          </div>
          <ThemeSegmentedControl />
        </div>
      </section>

      <section className="pb-7">
        <h2 className="mono-label mb-3">API key</h2>
        <BrowserKeyPanel />
      </section>

      <section className="pb-7">
        <h2 className="mono-label mb-3">AI Providers &amp; Models</h2>
        <AiProvidersPanel />
      </section>

      <section className="py-2">
        <h2 className="mono-label mb-3">Analysis mode</h2>
        <div className="rounded-[10px] border border-line bg-bg-raised">
          <div className="grid gap-px bg-line sm:grid-cols-4">
            <div className="bg-bg-raised px-4 py-4">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-3">Mode</div>
              <div className="mt-1.5 text-[13px] text-ink">
                {loading ? "Checking…" : status.mode === "live" ? "Live AI mode" : "Demo mode"}
              </div>
            </div>
            <div className="bg-bg-raised px-4 py-4">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-3">Key source</div>
              <div className="mt-1.5 text-[12px] text-ink-2">
                {status.source === "browser"
                  ? "Browser key"
                  : status.source === "environment"
                    ? "Server environment"
                    : "None"}
              </div>
            </div>
            <div className="bg-bg-raised px-4 py-4">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-3">Model</div>
              <div className="mt-1.5 font-mono text-[12px] text-ink-2">{status.model ?? "not configured"}</div>
            </div>
            <div className="bg-bg-raised px-4 py-4">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-3">Rubric profiles</div>
              <div className="mt-1.5 font-mono text-[12px] text-ink-2">
                {categoryGroups.length} families · {categories.length} categories
              </div>
            </div>
          </div>
          <div className="border-t border-line-soft px-4 py-4">
            <p className="max-w-[86ch] text-[12px] leading-[1.65] text-ink-2">
              Live mode sends your idea, prompt, or revision to the configured AI provider through a server-side route.
              Whichever key is active — a server environment variable or a key you saved above — it is read only on the
              server for that request and is never returned to the browser. Automatic routing picks a provider per task;
              Automatic with fallback can switch providers on rate limits, provider errors, timeouts, and network
              failures. Demo Mode evaluates prompts locally with a deterministic rule engine and labels every result as
              demo data. The rubric adapts to the selected category: the eight axis keys stay stable, but their labels,
              descriptions, and scoring guidance change with the domain.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={testConnection}
                disabled={checking}
                className={buttonClass({ variant: "secondary", size: "sm" })}
              >
                {checking ? "Checking…" : "Test configuration"}
              </button>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                Calls /api/ai/verify
              </span>
            </div>
            {connection ? (
              <Notice tone={status.mode === "live" ? "success" : "demo"} className="mt-3">
                {connection}
              </Notice>
            ) : null}
          </div>
        </div>
      </section>

      <section className="py-2">
        <h2 className="mono-label mb-3">Workspace inventory</h2>
        <dl className="grid gap-px overflow-hidden rounded-[8px] border border-line bg-line sm:grid-cols-4">
          {[
            { label: "Sessions", value: sessions.length },
            { label: "Versions", value: versionCount },
            { label: "Comparisons", value: comparisons.length },
            { label: "Rubric dimensions", value: evaluationDimensions.length },
          ].map((item) => (
            <div key={item.label} className="bg-bg-raised px-4 py-4">
              <dt className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-3">{item.label}</dt>
              <dd className="mt-2 font-mono text-[22px] leading-none tracking-[-0.04em] text-ink">
                {String(item.value).padStart(2, "0")}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="py-7">
        <h2 className="mono-label mb-3">Local data</h2>
        <div className="rounded-[10px] border border-line bg-bg-raised px-4 py-4">
          <p className="max-w-[80ch] text-[12px] leading-[1.65] text-ink-2">
            Prompt history, versions, evaluation snapshots, and saved comparisons are stored in this browser&apos;s
            localStorage. They are not uploaded to any server, and they are not available on other devices. Clearing
            site data removes them permanently.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(true);
              }}
              className={buttonClass({ variant: "danger", size: "sm" })}
            >
              <Trash2 size={13} aria-hidden="true" />
              Clear local data
            </button>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"} · {comparisons.length}{" "}
              {comparisons.length === 1 ? "comparison" : "comparisons"}
            </span>
          </div>
        </div>
      </section>

      <section className="pb-7">
        <h2 className="mono-label mb-3">Privacy</h2>
        <ul className="divide-y divide-line-soft border-y border-line-soft">
          {[
            "In Live mode, prompt text is transmitted to the AI provider that serves the request, under that provider's terms.",
            "Do not submit confidential business information, personal data, or credentials in a prompt.",
            "Demo Mode does not transmit prompt text to any provider.",
            "Scores are model-assisted diagnostics, not a scientific measurement of prompt quality.",
            "A key entered in Settings is sent only to this application's own server route, is never written to a log or database, and stays in this browser unless you clear it.",
          ].map((item) => (
            <li key={item} className="py-2.5 text-[12px] leading-[1.6] text-ink-2">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
          PromptScope v{APP_VERSION}
        </span>
        <Badge tone="neutral">Local workspace</Badge>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Clear all local data?"
        description="This removes every saved session, version, evaluation snapshot, and comparison from this browser. It cannot be undone."
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className={buttonClass({ variant: "ghost", size: "md" })}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                clearSessions();
                clearComparisons();
                clearPendingPrompt();
                setConfirmOpen(false);
                showToast("Local prompt data cleared.", "info");
              }}
              className={buttonClass({ variant: "danger", size: "md" })}
            >
              Clear everything
            </button>
          </>
        }
      >
        <p className="text-[12.5px] leading-[1.65] text-ink-2">
          Consider exporting or copying any prompt you still need first — there is no cloud backup in this version.
        </p>
      </Modal>
    </div>
  );
}

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
import { useAiStatus } from "@/hooks/use-ai-status";
import { useSessions } from "@/hooks/use-sessions";
import { useComparisons } from "@/hooks/use-comparisons";
import { APP_VERSION, RUBRIC_VERSION } from "@/config/app";
import { evaluationDimensions } from "@/config/evaluation-rubric";
import { clearSessions } from "@/lib/storage/prompt-storage";
import { clearComparisons } from "@/lib/storage/comparison-storage";
import { clearPendingPrompt } from "@/lib/storage/pending-prompt";
import { getJson } from "@/lib/api/client";

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
    const result = await getJson<{ mode: string; model: string | null; configured: boolean }>(
      "/api/ai/status",
    );
    setChecking(false);
    if (!result.ok) {
      setConnection(result.error.message);
      return;
    }
    setConnection(
      result.data.configured
        ? `Live mode is available. Model: ${result.data.model}.`
        : "No API key is configured, so the app is running in Demo Mode. Live calls are disabled until GEMINI_API_KEY is set.",
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 pb-16 sm:px-8 lg:px-12">
      <WorkspaceHeader
        title="Settings"
        section="System"
        description="Analysis mode, workspace inventory, local data controls, and the privacy terms of this application."
        meta={<ModeBadge showModel />}
      />

      <section className="py-7">
        <h2 className="mono-label mb-3">Analysis mode</h2>
        <div className="rounded-[10px] border border-line bg-bg-raised">
          <div className="grid gap-px bg-line sm:grid-cols-3">
            <div className="bg-bg-raised px-4 py-3.5">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-3">Mode</div>
              <div className="mt-1.5 text-[13px] text-ink">
                {loading ? "Checking…" : status.mode === "live" ? "Live AI mode" : "Demo mode"}
              </div>
            </div>
            <div className="bg-bg-raised px-4 py-3.5">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-3">Model</div>
              <div className="mt-1.5 font-mono text-[12px] text-ink-2">{status.model ?? "not configured"}</div>
            </div>
            <div className="bg-bg-raised px-4 py-3.5">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-3">Rubric</div>
              <div className="mt-1.5 font-mono text-[12px] text-ink-2">{RUBRIC_VERSION}</div>
            </div>
          </div>
          <div className="border-t border-line-soft px-4 py-4">
            <p className="max-w-[80ch] text-[12px] leading-[1.65] text-ink-2">
              Live mode sends your prompt to Google Gemini through a server-side route. The API key is read only on the
              server and is never included in the browser bundle. Demo Mode evaluates prompts locally with a
              deterministic rule engine and labels every result as demo data.
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
                Reads the server route only
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
            "In Live mode, prompt text is transmitted to Google Gemini for processing under Google's terms.",
            "Do not submit confidential business information, personal data, or credentials in a prompt.",
            "Demo Mode does not transmit prompt text to any provider.",
            "Scores are model-assisted diagnostics, not a scientific measurement of prompt quality.",
            "API keys live in server-side environment variables and are never logged or returned to the browser.",
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

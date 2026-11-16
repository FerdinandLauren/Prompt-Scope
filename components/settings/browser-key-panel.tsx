"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, KeyRound, ShieldAlert, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { useBrowserApiKey } from "@/hooks/use-browser-api-key";
import { useAiStatus } from "@/hooks/use-ai-status";
import { describeKeySource } from "@/lib/settings/key-source";
import { postJson } from "@/lib/api/client";
import { isUsableApiKey } from "@/lib/security/browser-api-key";
import { cn } from "@/lib/utils";

type VerifyResponse = { model: string; source: "environment" | "browser" | "none" };

export function BrowserKeyPanel() {
  const { hasKey, remembered, masked, save, clear } = useBrowserApiKey();
  const { status } = useAiStatus();
  const { showToast } = useToast();

  const [draft, setDraft] = useState("");
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<string | null>(null);

  const described = describeKeySource(status);
  const draftLooksUsable = isUsableApiKey(draft.trim());

  async function verifyAndSave() {
    const key = draft.trim();
    if (!isUsableApiKey(key)) {
      setError("Paste a valid Gemini API key. Placeholders and very short values are rejected.");
      return;
    }

    setError(null);
    setVerifying(true);
    setVerified(null);

    // The key is only sent to this application's own verify route, and it is
    // saved only after the provider confirms that it works.
    const previous = draft;
    const saved = save(key, remember);
    if (!saved.ok) {
      setVerifying(false);
      setError(saved.error ?? "The key could not be saved.");
      return;
    }

    const result = await postJson<VerifyResponse>("/api/ai/verify", {});
    setVerifying(false);

    if (!result.ok) {
      clear();
      setDraft(previous);
      setError(
        `${result.error.message} The key was not kept, so the previous configuration is still in use.`,
      );
      showToast("The key could not be verified. Check it and try again.", "error");
      return;
    }

    setVerified(`Connected with ${result.data.model}.`);
    setDraft("");
    showToast(
      remember ? "Key verified and remembered on this device." : "Key verified for this browser session.",
      "success",
    );
  }

  async function testActiveKey() {
    setError(null);
    setVerifying(true);
    setVerified(null);

    const result = await postJson<VerifyResponse>("/api/ai/verify", {});
    setVerifying(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setVerified(`Connected with ${result.data.model}.`);
  }

  return (
    <div className="rounded-[10px] border border-line bg-bg-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-3.5">
        <div className="flex items-center gap-2">
          <KeyRound size={14} strokeWidth={1.7} className="text-ink-3" aria-hidden="true" />
          <h3 className="text-[12.5px] font-medium text-ink">Gemini API key</h3>
        </div>
        <Badge tone={described.tone === "browser" ? "medium" : described.tone}>
          {status.source === "browser"
            ? remembered
              ? "Browser key · remembered"
              : "Browser key · this session"
            : status.source === "environment"
              ? "Server key"
              : "No key"}
        </Badge>
      </div>

      <div className="space-y-4 px-5 py-5">
        <p className="max-w-[86ch] text-[12px] leading-[1.65] text-ink-2">{described.detail}</p>

        {hasKey ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[7px] border border-line bg-bg px-3.5 py-3">
            <div className="min-w-0">
              <div className="mono-label">Active browser key</div>
              <div className="mt-1 font-mono text-[12px] text-ink-2">{masked}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={testActiveKey}
                disabled={verifying}
                className={buttonClass({ variant: "secondary", size: "sm" })}
              >
                {verifying ? "Testing…" : "Test connection"}
              </button>
              <button
                type="button"
                onClick={() => {
                  clear();
                  setVerified(null);
                  setError(null);
                  showToast("Browser key removed. The server configuration, if any, is active again.", "info");
                }}
                className={buttonClass({ variant: "danger", size: "sm" })}
              >
                <Trash2 size={12} aria-hidden="true" />
                Clear key
              </button>
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="browser-api-key" className="mb-2 block text-[12px] font-medium text-ink-2">
            {hasKey ? "Replace with a different key" : "Paste your key"}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <input
                id="browser-api-key"
                type={visible ? "text" : "password"}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError(null);
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="AQ.…"
                className="h-10 w-full rounded-[6px] border border-line bg-bg px-3 pr-11 font-mono text-[12.5px] text-ink placeholder:text-ink-3 focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/15"
              />
              <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? "Hide the key" : "Show the key"}
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-[4px] text-ink-3 hover:bg-surface hover:text-ink"
              >
                {visible ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
              </button>
            </div>
            <button
              type="button"
              onClick={verifyAndSave}
              disabled={verifying || !draftLooksUsable}
              aria-busy={verifying}
              className={buttonClass({ variant: "primary", size: "lg", className: "sm:w-[190px]" })}
            >
              {verifying ? "Verifying…" : "Verify and use"}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] leading-[1.5] text-ink-3">
            The key is sent only to this application&apos;s own server route to reach Gemini. It is never written to a
            server log, a database, or this repository.
          </p>
        </div>

        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 accent-[var(--orange)]"
          />
          <span>
            <span className="text-[12px] text-ink-2">Remember this key on this device</span>
            <span className="mt-0.5 block text-[11px] leading-[1.5] text-ink-3">
              Off by default. When off, the key disappears when this browser session ends.
            </span>
          </span>
        </label>

        {remember ? (
          <Notice tone="demo" title="Stored in this browser">
            A remembered key is kept in this browser&apos;s local storage, so it survives a reload but can be read by
            anything running on this origin. Do not use this on a shared or public computer.
          </Notice>
        ) : null}

        {error ? (
          <Notice tone="error" title="Key problem">
            {error}
          </Notice>
        ) : null}

        {verified ? (
          <Notice tone="success" title="Connection verified">
            <span className="flex items-center gap-2">
              <Check size={12} aria-hidden="true" />
              {verified}
            </span>
          </Notice>
        ) : null}

        <div
          className={cn(
            "flex items-start gap-2.5 rounded-[7px] border border-line-soft bg-bg px-3.5 py-3",
          )}
        >
          <ShieldAlert size={13} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
          <p className="text-[11.5px] leading-[1.6] text-ink-3">
            Prefer the server environment variable for production: it never reaches the browser at all. A browser key
            is the convenient option for local use, and any key pasted into a public chat should be revoked and
            replaced.
          </p>
        </div>
      </div>
    </div>
  );
}

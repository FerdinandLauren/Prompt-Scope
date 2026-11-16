"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, Search } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { SessionDetail } from "@/components/history/session-detail";
import { useSessions } from "@/hooks/use-sessions";
import { getCategory } from "@/config/app";
import { savePendingPrompt } from "@/lib/storage/pending-prompt";
import { saveComparison } from "@/lib/storage/comparison-storage";
import {
  addVersion,
  deleteSession,
  deleteVersion,
  listSessionSummaries,
  setCurrentVersion,
  updateVersionText,
} from "@/lib/storage/prompt-storage";
import { cn, formatDate, relativeDate, truncate } from "@/lib/utils";
import type { SessionSummary } from "@/types/history";
import type { ComparisonRecord } from "@/types/evaluation";

type SortKey = "recent" | "score" | "title";

export function HistoryView() {
  const sessions = useSessions();
  const { showToast } = useToast();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summaries: SessionSummary[] = listSessionSummaries()
    .filter((summary) => {
      if (!query.trim()) return true;
      const needle = query.trim().toLowerCase();
      return (
        summary.title.toLowerCase().includes(needle) ||
        summary.category.toLowerCase().includes(needle) ||
        sessions
          .find((session) => session.id === summary.id)
          ?.versions.some((version) => version.promptText.toLowerCase().includes(needle))
      );
    })
    .sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "score") return (b.latestScore ?? -1) - (a.latestScore ?? -1);
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  const openSession = sessions.find((session) => session.id === openId) ?? null;

  function handleAnalyze(promptText: string, title: string, sessionId?: string, versionId?: string) {
    savePendingPrompt({
      prompt: promptText,
      title,
      category: "ui_ux",
      sessionId,
      versionId,
      createdAt: new Date().toISOString(),
    });
    setOpenId(null);
    router.push("/analyzer");
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-12">
      <WorkspaceHeader
        title="Prompt History"
        description="A local library of prompts, their versions, and the evaluation snapshot recorded for each version."
        meta={
          <Badge tone="neutral">
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
          </Badge>
        }
        actions={
          <>
            <Link href="/builder" className={buttonClass({ variant: "secondary", size: "md" })}>
              Build a prompt
            </Link>
            <Link href="/analyzer" className={buttonClass({ variant: "primary", size: "md" })}>
              Analyze a prompt
            </Link>
          </>
        }
      />

      {error ? (
        <Notice tone="error" title="Local storage problem" className="mt-5">
          {error}
        </Notice>
      ) : null}

      {sessions.length === 0 ? (
        <div className="py-10">
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[10px] border border-dashed border-line px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-bg">
              <History size={20} strokeWidth={1.4} className="text-ink-3" aria-hidden="true" />
            </div>
            <h2 className="mt-5 font-display text-[23px] font-medium tracking-[-0.02em]">The library is empty.</h2>
            <p className="mt-2 max-w-[52ch] text-[12.5px] leading-[1.6] text-ink-3">
              Save a generated prompt or an evaluated prompt and it will appear here with every version preserved.
              History lives in this browser only.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/builder" className={buttonClass({ variant: "primary", size: "md" })}>
                Build the first prompt
              </Link>
              <Link href="/analyzer" className={buttonClass({ variant: "secondary", size: "md" })}>
                Analyze an existing prompt
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 border-b border-line-soft py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-[320px]">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles, versions, or text"
                aria-label="Search prompt history"
                className="h-9 w-full rounded-[6px] border border-line bg-bg-raised pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-3 focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/15"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="mono-label mr-1">Sort</span>
              {(
                [
                  ["recent", "Recent"],
                  ["score", "Score"],
                  ["title", "Title"],
                ] as Array<[SortKey, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSort(key)}
                  aria-pressed={sort === key}
                  className={cn(
                    "h-8 rounded-[5px] border px-2.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors duration-150",
                    sort === key ? "border-[var(--accent-border)] bg-[var(--accent-bg)] text-ink" : "border-line text-ink-3 hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2">
            <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-line-soft px-2 py-2.5 sm:grid-cols-[minmax(0,1fr)_110px_120px_92px_76px]">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">Prompt</span>
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 sm:block">
                Category
              </span>
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 sm:block">
                Modified
              </span>
              <span className="hidden text-right font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 sm:block">
                Versions
              </span>
              <span className="text-right font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">Score</span>
            </div>

            <ul>
              {summaries.map((summary) => (
                <li key={summary.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(summary.id)}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-line-soft px-2 py-3.5 text-left transition-colors duration-150 hover:bg-surface/50 sm:grid-cols-[minmax(0,1fr)_110px_120px_92px_76px]"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-ink">{summary.title}</span>
                        {summary.hasComparison ? <Badge tone="live">compared</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-ink-3">
                        {truncate(
                          sessions
                            .find((session) => session.id === summary.id)
                            ?.versions.at(-1)?.promptText ?? "",
                          96,
                        )}
                      </span>
                      <span className="mt-1 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 sm:hidden">
                        <span>{getCategory(summary.category).shortLabel}</span>
                        <span>{relativeDate(summary.updatedAt)}</span>
                        <span>{summary.versionCount} versions</span>
                      </span>
                    </span>
                    <span className="hidden text-[11.5px] text-ink-2 sm:block">
                      {getCategory(summary.category).label}
                    </span>
                    <span className="hidden font-mono text-[10.5px] text-ink-3 sm:block">
                      {relativeDate(summary.updatedAt)}
                    </span>
                    <span className="hidden font-mono text-[11.5px] tabular text-ink-2 sm:block sm:text-right">
                      {summary.versionCount}
                    </span>
                    <span className="text-right font-mono text-[13px] tabular">
                      {summary.latestScore !== null ? (
                        <span className="text-ink">{summary.latestScore}</span>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {summaries.length === 0 ? (
              <p className="px-2 py-8 text-center text-[12.5px] text-ink-3">
                No saved prompt matches “{query}”.
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
              {summaries.length} of {sessions.length} shown
            </span>
            <span className="text-[11px] text-ink-3">
              Latest score is the evaluation recorded for the current version. Older versions keep their own snapshot.
            </span>
          </div>
        </>
      )}

      {openSession ? (
        <SessionDetail
          session={openSession}
          onClose={() => setOpenId(null)}
          onDelete={() => {
            deleteSession(openSession.id);
            setOpenId(null);
          }}
          onSetCurrent={(versionId) => setCurrentVersion(openSession.id, versionId)}
          onRestore={(versionId) => {
            const version = openSession.versions.find((item) => item.id === versionId);
            if (!version) return;
            try {
              addVersion({
                sessionId: openSession.id,
                promptText: version.promptText,
                source: "restored",
                label: `Restored from v${version.versionNumber}`,
              });
              showToast(`Version ${version.versionNumber} restored as a new version.`);
            } catch (restoreError) {
              setError(restoreError instanceof Error ? restoreError.message : "Restore failed.");
            }
          }}
          onDeleteVersion={(versionId) => {
            try {
              deleteVersion(openSession.id, versionId);
            } catch (deleteError) {
              setError(deleteError instanceof Error ? deleteError.message : "Delete failed.");
            }
          }}
          onRenameVersion={(versionId, label) => {
            const version = openSession.versions.find((item) => item.id === versionId);
            if (!version) return;
            updateVersionText(openSession.id, versionId, version.promptText, label);
            showToast(label ? `Version labelled “${label}”.` : "Version label cleared.");
          }}
          onAnalyze={(promptText, title, versionId) =>
            handleAnalyze(promptText, title, openSession.id, versionId)
          }
          onSaveEditedVersion={(promptText, basedOnVersion) => {
            try {
              addVersion({
                sessionId: openSession.id,
                promptText,
                source: "manual",
                label: `Edited from v${basedOnVersion}`,
              });
              showToast("Edited prompt saved as a new version. Earlier versions are unchanged.");
            } catch (editError) {
              setError(editError instanceof Error ? editError.message : "The edit could not be saved.");
            }
          }}
          onCompareVersions={(originalVersionId, improvedVersionId) => {
            const original = openSession.versions.find((version) => version.id === originalVersionId);
            const improved = openSession.versions.find((version) => version.id === improvedVersionId);
            if (!original?.evaluation || !improved?.evaluation) return;
            try {
              const id = crypto.randomUUID();
              const record: ComparisonRecord = {
                id,
                createdAt: new Date().toISOString(),
                title: `${openSession.title} · v${original.versionNumber} → v${improved.versionNumber}`,
                category: openSession.category,
                rubricVersion: improved.evaluation.rubricVersion,
                originalPrompt: original.promptText,
                improvedPrompt: improved.promptText,
                original: original.evaluation,
                improved: improved.evaluation,
                improvement: null,
                sessionId: openSession.id,
              };
              saveComparison(record);
              setOpenId(null);
              router.push("/comparison");
              showToast("Comparison created from the two saved versions.");
            } catch (compareError) {
              setError(compareError instanceof Error ? compareError.message : "The comparison could not be saved.");
            }
          }}
        />
      ) : null}

      <div className="mt-8 flex items-start justify-between gap-4 border-t border-line-soft pt-4">
        <p className="max-w-[70ch] text-[11px] leading-[1.6] text-ink-3">
          Local storage is scoped to this browser and device. Clearing site data removes the library. Cloud sync is
          planned for a later version.
        </p>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
          {sessions.length > 0 ? `Latest ${formatDate(sessions[0]!.updatedAt)}` : "No data"}
        </span>
      </div>
    </div>
  );
}

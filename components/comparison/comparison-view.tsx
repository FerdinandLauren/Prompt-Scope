"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { ComparisonPanel } from "@/components/improvement/improvement-workflow";
import { useComparisons } from "@/hooks/use-comparisons";
import { compareSnapshots } from "@/lib/scoring/compare-scores";
import { deleteComparison } from "@/lib/storage/comparison-storage";
import { cn, formatDate, relativeDate, truncate } from "@/lib/utils";
import type { ComparisonRecord } from "@/types/evaluation";

export function ComparisonView() {
  const records = useComparisons();
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-[1560px] px-5 pb-20 sm:px-8 sm:pb-24 lg:px-14">
      <WorkspaceHeader
        title="Comparisons"
        description="Original and improved evaluations under the same rubric. Declines and unchanged dimensions are reported as measured."
        meta={
          <Badge tone={records.length > 0 ? "neutral" : "neutral"}>
            {records.length} saved
          </Badge>
        }
      />

      {records.length === 0 ? (
        <div className="py-10">
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[10px] border border-dashed border-line px-6 py-12 text-center">
            <h2 className="font-display text-[23px] font-medium tracking-[-0.02em]">No comparisons recorded yet.</h2>
            <p className="mt-2 max-w-[52ch] text-[12.5px] leading-[1.6] text-ink-3">
              Analyze a prompt, then use Improve &amp; re-evaluate. When both snapshots exist, save the comparison and
              it will appear here with its radar chart and dimension changes.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/analyzer" className={buttonClass({ variant: "primary", size: "md" })}>
                Open the analyzer
              </Link>
              <Link href="/builder" className={buttonClass({ variant: "secondary", size: "md" })}>
                Build a prompt
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-10 py-9 lg:grid-cols-12 lg:gap-12">
          <aside className="min-w-0 lg:col-span-4">
            <div className="mb-3 flex items-center justify-between border-b border-line-soft pb-2.5">
              <h2 className="mono-label">Recorded comparisons</h2>
              <span className="font-mono text-[9px] text-ink-3">{records.length}</span>
            </div>
            <ul className="space-y-1.5">
              {records.map((record) => {
                const comparison = compareSnapshots(record.original, record.improved);
                const active = selected?.id === record.id;
                return (
                  <li key={record.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(record.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "w-full rounded-[7px] border px-3.5 py-3 text-left transition-[border-color,background-color] duration-150",
                        active ? "border-[var(--accent-border)] bg-[var(--accent-bg)]" : "border-line bg-bg-raised hover:border-[var(--line-strong)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-[12.5px] font-medium text-ink">
                          {truncate(record.title, 44)}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-mono text-[12px] tabular",
                            comparison.overallChange > 0
                              ? "text-green"
                              : comparison.overallChange < 0
                                ? "text-[var(--danger-text)]"
                                : "text-ink-3",
                          )}
                        >
                          {comparison.overallChange > 0 ? "+" : ""}
                          {comparison.overallChange}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                        <span>{record.category}</span>
                        <span>
                          {record.original.overallScore} → {record.improved.overallScore}
                        </span>
                        <span>{relativeDate(record.createdAt)}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="min-w-0 lg:col-span-8">
            {selected ? <ComparisonDetail record={selected} onDelete={() => {
              deleteComparison(selected.id);
              setSelectedId(null);
              showToast("Comparison removed from local storage.", "info");
            }} /> : null}
          </section>
        </div>
      )}
    </div>
  );
}

function ComparisonDetail({ record, onDelete }: { record: ComparisonRecord; onDelete: () => void }) {
  const comparison = compareSnapshots(record.original, record.improved);

  return (
    <div className="space-y-5">
      <div className="rounded-[10px] border border-line bg-bg-raised">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-6 py-5">
          <div className="min-w-0">
            <h2 className="font-display text-[19px] font-medium tracking-[-0.02em]">
              {truncate(record.title, 80)}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
              <span>{record.category}</span>
              <span>{record.rubricVersion}</span>
              <span>{formatDate(record.createdAt, "long")}</span>
            </div>
          </div>
          <button type="button" onClick={onDelete} className={buttonClass({ variant: "danger", size: "sm" })}>
            <Trash2 size={12} aria-hidden="true" />
            Delete
          </button>
        </div>

        <div className="px-5 py-5">
          <ComparisonPanel
            comparison={comparison}
            original={record.original}
            improved={record.improved}
            category={record.category}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[10px] border border-line bg-bg-raised">
          <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
            <h3 className="mono-label">Original prompt</h3>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-rose">Preserved</span>
          </div>
          <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap px-6 py-5 font-mono text-[11.5px] leading-[1.7] text-ink-2">
            {record.originalPrompt}
          </pre>
        </div>
        <div className="rounded-[10px] border border-line bg-bg-raised">
          <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
            <h3 className="mono-label">Improved prompt</h3>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-orange">Revised</span>
          </div>
          <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap px-6 py-5 font-mono text-[11.5px] leading-[1.7] text-ink-2">
            {record.improvedPrompt}
          </pre>
        </div>
      </div>

      {record.improvement ? (
        <div className="rounded-[10px] border border-line bg-bg-raised px-6 py-5">
          <h3 className="mono-label">Recorded improvement summary</h3>
          <p className="mt-2 text-[12.5px] leading-[1.65] text-ink-2">{record.improvement.summary}</p>
          {record.improvement.remainingLimitations.length > 0 ? (
            <Notice tone="demo" title="Known limitations at revision time" className="mt-3">
              <ul className="space-y-1">
                {record.improvement.remainingLimitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

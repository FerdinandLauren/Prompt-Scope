"use client";

import { Check, CircleAlert, Info, Quote } from "lucide-react";
import { ScopeMark } from "@/components/brand/scope-mark";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { getScoreBand, getDimension } from "@/config/evaluation-rubric";
import { useToast } from "@/components/ui/toast";
import { cn, copyText, formatDate } from "@/lib/utils";
import type { EvaluationSnapshot, WeaknessSeverity } from "@/types/evaluation";

const severityTone: Record<WeaknessSeverity, "high" | "medium" | "low"> = {
  high: "high",
  medium: "medium",
  low: "low",
};

const severityLabel: Record<WeaknessSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function scoreColor(score: number) {
  if (score >= 80) return "var(--green)";
  if (score >= 60) return "var(--amber)";
  if (score >= 40) return "var(--orange)";
  return "var(--red)";
}

export function EvaluationResults({
  snapshot,
  title,
  category,
  originalPrompt,
  onAnalyzeAgain,
  onImprove,
  actions,
}: {
  snapshot: EvaluationSnapshot;
  title?: string;
  category: string;
  originalPrompt: string;
  onAnalyzeAgain?: () => void;
  onImprove?: () => void;
  actions?: React.ReactNode;
}) {
  const { showToast } = useToast();
  const band = getScoreBand(snapshot.overallScore);
  const strong = snapshot.dimensionDetails.filter((dimension) => dimension.score >= 70).length;

  return (
    <div className="enter-rise space-y-4">
      <div className="rounded-[10px] border border-line bg-bg-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="mono-label">Evaluation</span>
            <span className="text-[12px] text-ink-2">{title || "Untitled prompt"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={snapshot.source === "live" ? "live" : "demo"}>
              {snapshot.source === "live" ? "Live model" : "Demo data"}
            </Badge>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
              {snapshot.rubricVersion}
            </span>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex items-end gap-3">
              <span
                className="font-mono text-[52px] leading-none tracking-[-0.05em]"
                style={{ color: scoreColor(snapshot.overallScore) }}
              >
                {snapshot.overallScore}
              </span>
              <span className="pb-1 font-mono text-[12px] text-ink-3">/ 100</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={band.tone}>{band.label}</Badge>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                {strong}/8 dimensions above 70
              </span>
            </div>
            <p className="mt-3 max-w-[70ch] text-[12.5px] leading-[1.65] text-ink-2">{snapshot.summary}</p>
            {onImprove ? (
              <button
                type="button"
                onClick={onImprove}
                className={buttonClass({ variant: "secondary", size: "sm", className: "mt-3" })}
              >
                Improve this prompt
                <span aria-hidden="true">↓</span>
              </button>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
              <span>{category}</span>
              <span>{formatDate(snapshot.createdAt, "long")}</span>
              {snapshot.model ? <span>{snapshot.model}</span> : <span>rule-based evaluator</span>}
              <span>fingerprint {snapshot.promptHash}</span>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <ScopeMark
              size={148}
              progress={snapshot.overallScore}
              className="text-ink-3"
              label={`Overall score ${snapshot.overallScore} out of 100`}
            />
          </div>
        </div>
      </div>

      <section className="rounded-[10px] border border-line bg-bg-raised">
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
          <h2 className="mono-label">Dimensions</h2>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">0—100</span>
        </div>
        <ul>
          {snapshot.dimensionDetails.map((dimension) => (
            <li
              key={dimension.key}
              className="grid grid-cols-[minmax(96px,132px)_1fr_44px] items-start gap-3 border-b border-line-soft px-5 py-3.5 last:border-b-0"
            >
              <div>
                <div className="text-[12px] font-medium text-ink">{dimension.label}</div>
                <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-3">
                  {getScoreBand(dimension.score).label}
                </div>
              </div>
              <div className="min-w-0">
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--track)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${dimension.score}%`, background: scoreColor(dimension.score) }}
                  />
                </div>
                <p className="mt-2 text-[11.5px] leading-[1.6] text-ink-2">{dimension.explanation}</p>
              </div>
              <div className="text-right font-mono text-[14px] tabular text-ink">{dimension.score}</div>
            </li>
          ))}
        </ul>
      </section>

      {snapshot.weaknesses.length > 0 ? (
        <section className="rounded-[10px] border border-line bg-bg-raised">
          <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
            <h2 className="mono-label">Weaknesses</h2>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
              {snapshot.weaknesses.length} findings
            </span>
          </div>
          <ol className="divide-y divide-line-soft">
            {snapshot.weaknesses.map((weakness, index) => (
              <li key={`${weakness.dimension}-${index}`} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9px] text-ink-3">{String(index + 1).padStart(2, "0")}</span>
                  <Badge tone={severityTone[weakness.severity]}>{severityLabel[weakness.severity]}</Badge>
                  <span className="text-[12px] font-medium text-ink">
                    {getDimension(weakness.dimension).label}
                  </span>
                </div>
                <p className="mt-2 max-w-[80ch] text-[12.5px] leading-[1.6] text-ink-2">{weakness.problem}</p>
                {weakness.evidence ? (
                  <blockquote className="mt-2.5 flex gap-2 rounded-[6px] border border-line-soft bg-bg px-3 py-2">
                    <Quote size={11} className="mt-1 shrink-0 text-ink-3" aria-hidden="true" />
                    <p className="font-mono text-[11px] leading-[1.6] text-ink-3">{weakness.evidence}</p>
                  </blockquote>
                ) : null}
                <p className="mt-2.5 flex gap-2 text-[12px] leading-[1.6] text-ink-2">
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-orange">
                    Fix
                  </span>
                  <span>{weakness.suggestion}</span>
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="rounded-[10px] border border-line bg-bg-raised px-5 py-4">
          <div className="flex items-center gap-2">
            <Check size={13} className="text-green" aria-hidden="true" />
            <span className="text-[12.5px] text-ink">
              No weaknesses were reported for this prompt under the current rubric.
            </span>
          </div>
        </section>
      )}

      <div className={snapshot.strengths.length > 0 ? "grid gap-4 md:grid-cols-2" : "grid gap-4"}>
        {snapshot.strengths.length > 0 ? (
          <section className="rounded-[10px] border border-line bg-bg-raised">
            <div className="border-b border-line-soft px-5 py-3">
              <h2 className="mono-label">Strengths</h2>
            </div>
            <ul className="divide-y divide-line-soft">
              {snapshot.strengths.map((strength) => (
                <li key={strength.title} className="px-5 py-3.5">
                  <div className="flex items-start gap-2">
                    <Check size={12} className="mt-1 shrink-0 text-green" aria-hidden="true" />
                    <div>
                      <div className="text-[12px] font-medium text-ink">{strength.title}</div>
                      <p className="mt-1 text-[11.5px] leading-[1.6] text-ink-2">{strength.description}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-[10px] border border-line bg-bg-raised">
          <div className="border-b border-line-soft px-5 py-3">
            <h2 className="mono-label">Missing information</h2>
          </div>
          {snapshot.missingInformation.length > 0 ? (
            <ul className="divide-y divide-line-soft">
              {snapshot.missingInformation.map((item) => (
                <li key={item} className="flex items-center gap-2 px-5 py-3">
                  <Info size={11} className="shrink-0 text-ink-3" aria-hidden="true" />
                  <span className="text-[12px] text-ink-2">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-[12px] text-ink-3">
              Every tracked information category is present in this prompt.
            </p>
          )}
        </section>
      </div>

      {snapshot.contradictions.length > 0 ? (
        <section className="rounded-[10px] border border-[var(--danger-border)] bg-[var(--danger-surface)] px-5 py-4">
          <h2 className="mono-label text-[var(--danger-text)]">Potential contradictions</h2>
          <ul className="mt-2.5 space-y-2">
            {snapshot.contradictions.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[12.5px] leading-[1.6] text-ink-2">
                <CircleAlert size={13} className="mt-0.5 shrink-0 text-[var(--danger-text)]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {snapshot.recommendations.length > 0 ? (
        <section className="rounded-[10px] border border-line bg-bg-raised">
          <div className="border-b border-line-soft px-5 py-3">
            <h2 className="mono-label">Recommendations</h2>
          </div>
          <ol className="divide-y divide-line-soft">
            {snapshot.recommendations.map((item, index) => (
              <li key={item} className="flex gap-3 px-5 py-3.5">
                <span className="font-mono text-[9px] text-ink-3">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-[12.5px] leading-[1.6] text-ink-2">{item}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
        {actions}
        <button
          type="button"
          onClick={async () => {
            try {
              await copyText(originalPrompt);
              showToast("Evaluated prompt copied.");
            } catch {
              showToast("Could not access the clipboard.", "error");
            }
          }}
          className={buttonClass({ variant: "secondary", size: "md" })}
        >
          Copy evaluated prompt
        </button>
        {onAnalyzeAgain ? (
          <button type="button" onClick={onAnalyzeAgain} className={buttonClass({ variant: "ghost", size: "md" })}>
            Analyze again
          </button>
        ) : null}
        <span className={cn("ml-auto text-[10.5px] text-ink-3")}>
          Scores are model-assisted diagnostics, not a universal standard.
        </span>
      </div>
    </div>
  );
}

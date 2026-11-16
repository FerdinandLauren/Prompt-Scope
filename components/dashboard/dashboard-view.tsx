"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BarChart3, History, ScanSearch, SlidersHorizontal } from "lucide-react";
import { ScopeMark } from "@/components/brand/scope-mark";
import { ModeBadge } from "@/components/system/mode-badge";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { buttonClass } from "@/components/ui/button";
import { useSessions } from "@/hooks/use-sessions";
import { useComparisons } from "@/hooks/use-comparisons";
import { getCategory } from "@/config/app";
import { getScoreBand } from "@/config/evaluation-rubric";
import { compareSnapshots } from "@/lib/scoring/compare-scores";
import { cn, relativeDate, truncate } from "@/lib/utils";

const quickActions = [
  {
    title: "Build from a direction",
    description: "Configure the objective, audience, visual intent, and eight focus parameters.",
    href: "/builder",
    icon: SlidersHorizontal,
    meta: "Generate",
  },
  {
    title: "Diagnose an existing prompt",
    description: "Paste a prompt and receive eight dimension scores, evidence, and ranked weaknesses.",
    href: "/analyzer",
    icon: ScanSearch,
    meta: "Analyze",
  },
  {
    title: "Review comparisons",
    description: "Read original versus improved snapshots under the same rubric, including declines.",
    href: "/comparison",
    icon: BarChart3,
    meta: "Compare",
  },
];

const workflow = [
  { step: "01", title: "Direction", detail: "Define intent before text." },
  { step: "02", title: "Diagnosis", detail: "Name the weak instructions." },
  { step: "03", title: "Improvement", detail: "Revise without losing intent." },
  { step: "04", title: "Comparison", detail: "Verify the measured change." },
];

export function DashboardView() {
  const sessions = useSessions();
  const comparisons = useComparisons();
  const [showAll, setShowAll] = useState(false);

  const analysedCount = sessions.reduce(
    (total, session) => total + session.versions.filter((version) => version.evaluation).length,
    0,
  );
  const improvedCount = sessions.reduce(
    (total, session) => total + session.versions.filter((version) => version.source === "improved").length,
    0,
  );

  const recent = sessions.slice(0, showAll ? 8 : 4);

  // Prefer a saved comparison record; otherwise use the newest session that
  // recorded a before-and-after evaluation.
  const sessionComparison = (() => {
    for (const session of sessions) {
      if (session.lastComparison) {
        return {
          id: session.id,
          createdAt: session.lastComparison.improved.createdAt,
          title: session.title,
          rubricVersion: session.lastComparison.improved.rubricVersion,
          original: session.lastComparison.original,
          improved: session.lastComparison.improved,
        };
      }
    }
    return null;
  })();

  const latestComparison = comparisons[0] ?? sessionComparison;
  const latestSession = sessions[0] ?? null;
  const latestEvaluation =
    latestSession?.versions.find((version) => version.id === latestSession.currentVersionId)?.evaluation ??
    latestSession?.versions.at(-1)?.evaluation ??
    null;

  const stats = [
    { label: "Prompts saved", value: sessions.length },
    { label: "Versions evaluated", value: analysedCount },
    { label: "Improvements recorded", value: improvedCount },
  ];

  const spotlight = latestComparison
    ? {
        score: latestComparison.improved.overallScore,
        label: getScoreBand(latestComparison.improved.overallScore).label,
        caption: `Latest comparison · ${relativeDate(latestComparison.createdAt)}`,
        change: compareSnapshots(latestComparison.original, latestComparison.improved).overallChange,
      }
    : latestEvaluation
      ? {
          score: latestEvaluation.overallScore,
          label: getScoreBand(latestEvaluation.overallScore).label,
          caption: `Latest evaluation · ${relativeDate(latestEvaluation.createdAt)}`,
          change: null,
        }
      : null;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-12">
      <div className="flex items-center justify-between border-b border-line-soft py-5">
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
          <span>Workspace</span>
          <span className="text-line">/</span>
          <span className="text-ink-2">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <ModeBadge />
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3 sm:inline">
            rubric visual-uiux-v1
          </span>
        </div>
      </div>

      <section className="grid gap-10 border-b border-line-soft py-10 lg:grid-cols-12 lg:gap-14 lg:py-14">
        <div className="flex flex-col justify-center lg:col-span-7">
          <p className="max-w-[32ch] font-mono text-[10px] uppercase leading-[1.6] tracking-[0.15em] text-orange">
            Prompt direction &amp; evaluation studio
          </p>
          <h1 className="mt-5 max-w-[13ch] font-display text-[clamp(44px,6.6vw,82px)] font-medium leading-[0.96] tracking-[-0.045em] text-balance">
            Make every prompt more intentional.
          </h1>
          <p className="mt-6 max-w-[52ch] text-[15px] leading-[1.7] text-ink-2">
            Build, analyze, and improve prompts with clarity. Every change is measured against the same
            eight-dimension rubric — including the changes that do not help.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <Link href="/builder" className={buttonClass({ variant: "primary", size: "lg" })}>
              Start a prompt
              <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link href="/analyzer" className={buttonClass({ variant: "secondary", size: "lg" })}>
              <ScanSearch size={15} strokeWidth={1.8} aria-hidden="true" />
              Analyze existing
            </Link>
            <Link href="/analyzer?sample=1" className={buttonClass({ variant: "ghost", size: "lg" })}>
              Load a sample
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5">
          <Panel className="relative h-full min-h-[330px] overflow-hidden">
            <div className="instrument-grid absolute inset-0" aria-hidden="true" />
            <div className="relative flex h-full min-h-[330px] flex-col">
              <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
                <span className="mono-label">{spotlight ? "Latest measurement" : "Latest evaluation"}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">8 axes / 0—100</span>
              </div>
              <div className="relative flex flex-1 flex-col items-center justify-center py-7">
                <ScopeMark
                  size={196}
                  progress={spotlight?.score ?? 0}
                  className="text-ink-3"
                  label={spotlight ? `Latest score ${spotlight.score} out of 100` : "No evaluation loaded"}
                />
                {!spotlight ? (
                  <div className="absolute inset-x-0 bottom-5 flex justify-center">
                    <span className="rounded-[4px] border border-line bg-bg/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                      Awaiting first analysis
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-2 border-t border-line-soft">
                <div className="border-r border-line-soft px-5 py-3.5">
                  <div className="mono-label">Score</div>
                  <div className="mt-1 font-mono text-[24px] leading-none tracking-[-0.04em] text-ink">
                    {spotlight ? spotlight.score : "—"}
                    <span className="ml-1 text-[11px] text-ink-3">/100</span>
                  </div>
                </div>
                <div className="px-5 py-3.5">
                  <div className="mono-label">Verdict</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[11px] text-ink-2">{spotlight ? spotlight.label : "Not evaluated"}</span>
                    {spotlight?.change !== null && spotlight?.change !== undefined ? (
                      <Badge tone={spotlight.change > 0 ? "positive" : spotlight.change < 0 ? "negative" : "neutral"}>
                        {spotlight.change > 0 ? `+${spotlight.change}` : spotlight.change}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                    {spotlight ? spotlight.caption : "Local workspace only"}
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </section>

      <section className="grid gap-10 border-b border-line-soft py-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <div className="mb-4 flex items-end justify-between border-b border-line-soft pb-3">
            <h2 className="text-[13px] font-medium text-ink">Start here</h2>
            <span className="mono-label">3 routes</span>
          </div>
          <div className="divide-y divide-line-soft border-y border-line-soft">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group grid grid-cols-[32px_1fr_auto] items-start gap-4 py-4 transition-colors duration-150 hover:bg-surface/50 sm:grid-cols-[36px_1fr_auto] sm:px-2"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-line bg-bg-raised text-ink-3 transition-colors duration-150 group-hover:border-[#3b424a] group-hover:text-orange">
                    <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-ink">{action.title}</span>
                      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-ink-3">
                        {action.meta}
                      </span>
                    </span>
                    <span className="mt-1 block max-w-[58ch] text-[12px] leading-[1.55] text-ink-3">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight
                    size={14}
                    strokeWidth={1.7}
                    className="mt-2 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="mb-4 flex items-end justify-between border-b border-line-soft pb-3">
            <h2 className="text-[13px] font-medium text-ink">Activity</h2>
            <span className="mono-label">From local history</span>
          </div>
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-[6px] border border-line bg-line">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-bg-raised px-3 py-4">
                <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-ink-3">{stat.label}</dt>
                <dd
                  className={cn(
                    "mt-2 font-mono text-[24px] leading-none tracking-[-0.04em]",
                    stat.value > 0 ? "text-ink" : "text-ink-3",
                  )}
                >
                  {String(stat.value).padStart(2, "0")}
                </dd>
              </div>
            ))}
          </dl>

          {recent.length === 0 ? (
            <div className="mt-6 flex min-h-[150px] flex-col justify-between rounded-[8px] border border-dashed border-line p-5">
              <div>
                <h3 className="text-[13px] font-medium text-ink">No recent prompts</h3>
                <p className="mt-1.5 max-w-[44ch] text-[12px] leading-[1.6] text-ink-3">
                  Saved sessions, their latest scores, and the newest comparison surface here. Nothing is fabricated
                  to fill the space.
                </p>
              </div>
              <Link
                href="/history"
                className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:text-orange"
              >
                <History size={13} strokeWidth={1.7} aria-hidden="true" />
                Open prompt history
              </Link>
            </div>
          ) : (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="mono-label">Recent prompts</h3>
                <Link href="/history" className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 hover:text-ink">
                  View all
                </Link>
              </div>
              <ul className="divide-y divide-line-soft border-y border-line-soft">
                {recent.map((session) => {
                  const current =
                    session.versions.find((version) => version.id === session.currentVersionId) ??
                    session.versions.at(-1);
                  return (
                    <li key={session.id} className="flex items-center justify-between gap-4 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] text-ink">{session.title}</span>
                        <span className="mt-0.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                          <span>{getCategory(session.category).shortLabel}</span>
                          <span>{relativeDate(session.updatedAt)}</span>
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[13px] tabular text-ink-2">
                        {current?.evaluation ? current.evaluation.overallScore : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {sessions.length > recent.length ? (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className={buttonClass({ variant: "ghost", size: "sm", className: "mt-3" })}
                >
                  Show {Math.min(8, sessions.length) - recent.length} more
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {latestComparison ? (
        <section className="border-b border-line-soft py-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line-soft pb-3">
            <h2 className="text-[13px] font-medium text-ink">Quick comparison preview</h2>
            <Link href="/comparison" className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 hover:text-ink">
              Open comparisons
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {(() => {
              const comparison = compareSnapshots(latestComparison.original, latestComparison.improved);
              return [
                { label: "Original", value: comparison.originalOverall, tone: "flat" as const },
                { label: "Improved", value: comparison.improvedOverall, tone: "flat" as const },
                { label: "Change", value: comparison.overallChange, tone: "delta" as const },
              ].map((item) => (
                <div key={item.label} className="border-t border-line pt-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">{item.label}</div>
                  <div
                    className={cn(
                      "mt-2 font-mono text-[30px] leading-none tracking-[-0.04em]",
                      item.tone === "delta" && item.value > 0 && "text-green",
                      item.tone === "delta" && item.value < 0 && "text-[#f0a1a5]",
                      item.tone === "delta" && item.value === 0 && "text-ink-3",
                      item.tone === "flat" && "text-ink",
                    )}
                  >
                    {item.tone === "delta" && item.value > 0 ? `+${item.value}` : item.value}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-3">
                    {item.tone === "delta"
                      ? item.value > 0
                        ? "measured improvement"
                        : item.value < 0
                          ? "measured decline"
                          : "no measured change"
                      : getScoreBand(item.value).label}
                  </div>
                </div>
              ));
            })()}
          </div>
          <p className="mt-4 max-w-[86ch] text-[11px] leading-[1.6] text-ink-3">
            {truncate(latestComparison.title, 70)} · {latestComparison.rubricVersion} ·{" "}
            {relativeDate(latestComparison.createdAt)}
          </p>
        </section>
      ) : null}

      <section className="py-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-ink">The loop</h2>
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
            Direction → verified change
          </span>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-[8px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {workflow.map((item) => (
            <li key={item.step} className="bg-bg p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-ink-3">{item.step}</span>
                <span className="h-px w-8 bg-line" aria-hidden="true" />
              </div>
              <h3 className="mt-6 font-display text-[20px] font-medium tracking-[-0.02em] text-ink">{item.title}</h3>
              <p className="mt-1.5 text-[12px] leading-[1.55] text-ink-3">{item.detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { LoadingLine, Notice } from "@/components/ui/notice";
import { PromptEditor } from "@/components/ui/prompt-editor";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { useToast } from "@/components/ui/toast";
import { evaluationDimensions, getScoreBand } from "@/config/evaluation-rubric";
import { postJson, type ApiError } from "@/lib/api/client";
import { saveComparison } from "@/lib/storage/comparison-storage";
import { addVersion } from "@/lib/storage/prompt-storage";
import { ScopeRadar } from "@/components/visualization/scope-radar";
import { DeltaPill, signed } from "@/components/comparison/delta-pill";
import { compareSnapshots } from "@/lib/scoring/compare-scores";
import { getDimension } from "@/config/evaluation-rubric";
import { cn } from "@/lib/utils";
import type { DimensionKey, EvaluationSnapshot, PromptImprovement, ScoreComparison } from "@/types/evaluation";

type Stage = "idle" | "improving" | "revised" | "evaluating" | "compared";

export function ImprovementWorkflow({
  originalPrompt,
  originalSnapshot,
  category,
  title,
  sessionId,
  versionLabel = "Improved revision",
}: {
  originalPrompt: string;
  originalSnapshot: EvaluationSnapshot;
  category: string;
  title?: string;
  sessionId?: string;
  versionLabel?: string;
}) {
  const { showToast } = useToast();
  const weakDimensions = originalSnapshot.dimensionDetails
    .filter((dimension) => dimension.score < 70)
    .sort((a, b) => a.score - b.score)
    .map((dimension) => dimension.label);

  const [priorities, setPriorities] = useState<string[]>(weakDimensions.slice(0, 3));
  const [instructions, setInstructions] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [improvement, setImprovement] = useState<PromptImprovement | null>(null);
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [improvedSnapshot, setImprovedSnapshot] = useState<EvaluationSnapshot | null>(null);
  const [comparison, setComparison] = useState<ScoreComparison | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function handleImprove() {
    setError(null);
    setStage("improving");

    const response = await postJson<PromptImprovement>("/api/ai/improve", {
      originalPrompt,
      category,
      rubricVersion: originalSnapshot.rubricVersion,
      priorities,
      additionalInstructions: instructions,
      analysis: {
        overallScore: originalSnapshot.overallScore,
        summary: originalSnapshot.summary,
        weaknesses: originalSnapshot.weaknesses.map((weakness) => ({
          dimension: weakness.dimension,
          severity: weakness.severity,
          problem: weakness.problem,
          suggestion: weakness.suggestion,
        })),
        dimensions: originalSnapshot.dimensions,
      },
    });

    if (!response.ok) {
      setError(response.error);
      setStage("idle");
      showToast(response.error.message, "error");
      return;
    }

    setImprovement(response.data);
    setImprovedPrompt(response.data.improvedPrompt);
    setStage("revised");
    showToast(
      response.data.source === "live"
        ? "Revised prompt ready. Review the changes before evaluating."
        : "Demo Mode produced a structured revision. Review it before evaluating.",
      response.data.source === "live" ? "success" : "info",
    );
  }

  async function handleEvaluateImproved() {
    setError(null);
    setStage("evaluating");

    const response = await postJson<EvaluationSnapshot>("/api/ai/analyze", {
      prompt: improvedPrompt,
      title: `${title || "Untitled prompt"} — improved`,
      category,
      rubricVersion: originalSnapshot.rubricVersion,
    });

    if (!response.ok) {
      setError(response.error);
      setStage("revised");
      showToast(response.error.message, "error");
      return;
    }

    const next = compareSnapshots(originalSnapshot, response.data);
    setImprovedSnapshot(response.data);
    setComparison(next);
    setStage("compared");
    showToast(`Improved prompt scored ${response.data.overallScore}/100 under the same rubric.`, "info");
  }

  function handleSaveComparison() {
    if (!improvedSnapshot) return;
    const id = crypto.randomUUID();
    saveComparison({
      id,
      createdAt: new Date().toISOString(),
      title: title || "Untitled prompt",
      category,
      rubricVersion: originalSnapshot.rubricVersion,
      originalPrompt,
      improvedPrompt,
      original: originalSnapshot,
      improved: improvedSnapshot,
      improvement,
    });
    setSavedId(id);
    showToast("Comparison saved to local storage.");
  }

  return (
    <section
      id="improve-workflow"
      className="scroll-mt-6 rounded-[10px] border border-line bg-bg-raised"
      aria-labelledby="improvement-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 id="improvement-heading" className="mono-label">
            Improve &amp; re-evaluate
          </h2>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
            same rubric as the original
          </span>
        </div>
        <Badge tone="neutral">Original preserved</Badge>
      </div>

      <div className="px-6 py-5">
        {stage === "idle" || stage === "improving" ? (
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-[12px] font-medium text-ink-2">Improvement priorities</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                  {priorities.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {evaluationDimensions.map((dimension) => (
                  <ToggleChip
                    key={dimension.key}
                    label={dimension.label}
                    active={priorities.includes(dimension.label)}
                    onClick={() =>
                      setPriorities((current) =>
                        current.includes(dimension.label)
                          ? current.filter((item) => item !== dimension.label)
                          : [...current, dimension.label].slice(0, 8),
                      )
                    }
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-[1.5] text-ink-3">
                The weakest dimensions are preselected. The improver may still address others.
              </p>
            </div>

            <div>
              <label htmlFor="improve-instructions" className="mb-2 block text-[12px] font-medium text-ink-2">
                Additional instructions
              </label>
              <textarea
                id="improve-instructions"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                maxLength={800}
                rows={3}
                placeholder="Keep the original tone. Do not change the product description."
                className="w-full resize-y rounded-[6px] border border-line bg-bg px-3 py-2.5 text-[12.5px] leading-[1.6] text-ink placeholder:text-ink-3 focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/15"
              />
              <div className="mt-1 text-right font-mono text-[9px] text-ink-3">{instructions.length} / 800</div>
            </div>

            {error ? (
              <Notice tone="error" title="Improvement failed">
                {error.message} The original prompt is unchanged.
              </Notice>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleImprove}
                disabled={stage === "improving"}
                className={buttonClass({ variant: "primary", size: "lg", className: "min-w-[150px]" })}
                aria-busy={stage === "improving"}
              >
                {stage === "improving" ? "Improving…" : "Improve prompt"}
                <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
              {stage === "improving" ? <LoadingLine label="Revising without losing intent" /> : null}
            </div>
          </div>
        ) : null}

        {improvement && stage !== "idle" && stage !== "improving" ? (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="min-w-0">
                <PromptEditor
                  id="original-prompt-readonly"
                  label="Original prompt"
                  value={originalPrompt}
                  readOnly
                  minHeight={220}
                  labelRight={<Badge tone="negative">Original</Badge>}
                  hint="Preserved exactly as evaluated. It is never overwritten."
                />
              </div>
              <div className="min-w-0">
                <PromptEditor
                  id="improved-prompt"
                  label="Improved prompt"
                  value={improvedPrompt}
                  onChange={(value) => {
                    setImprovedPrompt(value);
                    if (stage === "compared") setStage("revised");
                  }}
                  minHeight={220}
                  labelRight={<Badge tone="positive">Revised</Badge>}
                  hint="Edit freely. Any change requires re-evaluating before comparison."
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[8px] border border-line bg-bg">
                <div className="border-b border-line-soft px-4 py-2.5">
                  <h3 className="mono-label">Improvement summary</h3>
                </div>
                <p className="px-4 py-3 text-[12.5px] leading-[1.65] text-ink-2">{improvement.summary}</p>
                <div className="border-t border-line-soft px-4 py-3">
                  <h4 className="mono-label">Changes made</h4>
                  <ul className="mt-2 space-y-2">
                    {improvement.changes.map((change, index) => (
                      <li key={`${change.dimension}-${index}`} className="flex gap-2.5">
                        <span className="mt-0.5 shrink-0 rounded-[3px] border border-line px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-3">
                          {change.dimension === "structure"
                            ? "Structure"
                            : getDimension(change.dimension).label}
                        </span>
                        <span>
                          <span className="block text-[12px] leading-[1.55] text-ink-2">{change.change}</span>
                          <span className="mt-0.5 block text-[11px] leading-[1.5] text-ink-3">{change.reason}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-5">
                {improvement.preservedRequirements.length > 0 ? (
                  <div className="rounded-[8px] border border-line bg-bg px-4 py-3">
                    <h3 className="mono-label">Preserved requirements</h3>
                    <ul className="mt-2 space-y-1.5">
                      {improvement.preservedRequirements.map((item) => (
                        <li key={item} className="text-[12px] leading-[1.55] text-ink-2">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {improvement.assumptions.length > 0 ? (
                  <div className="rounded-[8px] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-4 py-3">
                    <h3 className="mono-label text-amber">Assumptions instead of invented facts</h3>
                    <ul className="mt-2 space-y-1.5">
                      {improvement.assumptions.map((item) => (
                        <li key={item} className="text-[12px] leading-[1.55] text-ink-2">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {improvement.remainingLimitations.length > 0 ? (
                  <div className="rounded-[8px] border border-line bg-bg px-4 py-3">
                    <h3 className="mono-label">Remaining limitations</h3>
                    <ul className="mt-2 space-y-1.5">
                      {improvement.remainingLimitations.map((item) => (
                        <li key={item} className="text-[12px] leading-[1.55] text-ink-2">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            {error ? (
              <Notice tone="error" title="Evaluation failed">
                {error.message} The revised prompt is preserved.
              </Notice>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
              <button
                type="button"
                onClick={handleEvaluateImproved}
                disabled={stage === "evaluating" || improvedPrompt.trim().length < 24}
                className={buttonClass({ variant: "primary", size: "md" })}
                aria-busy={stage === "evaluating"}
              >
                {stage === "evaluating" ? "Evaluating…" : "Evaluate improved prompt"}
              </button>
              <button type="button" onClick={handleImprove} className={buttonClass({ variant: "secondary", size: "md" })}>
                Revise again
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage("idle");
                  setImprovement(null);
                  setImprovedPrompt("");
                  setImprovedSnapshot(null);
                  setComparison(null);
                  setSavedId(null);
                }}
                className={buttonClass({ variant: "ghost", size: "md" })}
              >
                Reset improvement
              </button>
              {stage === "evaluating" ? <LoadingLine label="Re-scoring eight dimensions" /> : null}
            </div>
          </div>
        ) : null}
      </div>

      {comparison && improvedSnapshot ? (
        <div className="border-t border-line px-5 py-5">
          <ComparisonPanel
            comparison={comparison}
            original={originalSnapshot}
            improved={improvedSnapshot}
            onSave={handleSaveComparison}
            saved={Boolean(savedId)}
            onSaveVersion={
              sessionId
                ? () => {
                    try {
                      addVersion({
                        sessionId,
                        promptText: improvedPrompt,
                        source: "improved",
                        label: versionLabel,
                        evaluation: improvedSnapshot,
                        comparison: {
                          originalVersionId: "",
                          improvedVersionId: "",
                          original: originalSnapshot,
                          improved: improvedSnapshot,
                          improvement,
                        },
                      });
                      showToast("Improved prompt saved as a new version in history.");
                    } catch (versionError) {
                      showToast(
                        versionError instanceof Error ? versionError.message : "The version could not be saved.",
                        "error",
                      );
                    }
                  }
                : undefined
            }
          />
        </div>
      ) : null}
    </section>
  );
}

export function ComparisonPanel({
  comparison,
  original,
  improved,
  onSave,
  saved,
  onSaveVersion,
  compact = false,
}: {
  comparison: ScoreComparison;
  original: EvaluationSnapshot;
  improved: EvaluationSnapshot;
  onSave?: () => void;
  saved?: boolean;
  onSaveVersion?: () => void;
  compact?: boolean;
}) {
  const overallTone = comparison.overallChange > 0 ? "positive" : comparison.overallChange < 0 ? "negative" : "flat";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="mono-label">Before &amp; after</h2>
        <div className="flex items-center gap-2">
          <Badge tone={improved.source === "live" ? "live" : "demo"}>
            {improved.source === "live" ? "Live model" : "Demo data"}
          </Badge>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
            {comparison.rubricMatches ? `Rubric ${improved.rubricVersion}` : "Rubric mismatch"}
          </span>
        </div>
      </div>

      {comparison.warnings.length > 0 ? (
        <Notice tone="demo" title="Comparison caveat">
          <ul className="space-y-1">
            {comparison.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="rounded-[8px] border border-line bg-bg px-4 py-4">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[6px] border border-line bg-line">
            <ScoreCell label="Original" value={original.overallScore} band={getScoreBand(original.overallScore).label} />
            <ScoreCell label="Improved" value={improved.overallScore} band={getScoreBand(improved.overallScore).label} />
            <div className="bg-bg px-3 py-3">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-3">Change</div>
              <div
                className={cn(
                  "mt-1.5 font-mono text-[24px] leading-none tracking-[-0.04em]",
                  overallTone === "positive" && "text-green",
                  overallTone === "negative" && "text-[var(--danger-text)]",
                  overallTone === "flat" && "text-ink-3",
                )}
              >
                {signed(comparison.overallChange)}
              </div>
              <div className="mt-1 text-[10px] text-ink-3">
                {comparison.overallChange > 0
                  ? "measured improvement"
                  : comparison.overallChange < 0
                    ? "measured decline"
                    : "no measured change"}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <ScopeRadar original={original} improved={improved} height={compact ? 260 : 300} compact={compact} />
          </div>
        </div>

        <div className="rounded-[8px] border border-line bg-bg">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
            <h3 className="mono-label">Dimension changes</h3>
            <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.1em]">
              <span className="text-green">{comparison.improved.length} up</span>
              <span className="text-[var(--danger-text)]">{comparison.declined.length} down</span>
              <span className="text-ink-3">{comparison.unchanged.length} flat</span>
            </div>
          </div>
          <ul>
            {comparison.dimensions.map((dimension) => (
              <li
                key={dimension.key}
                className="grid grid-cols-[minmax(84px,120px)_1fr_auto] items-center gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0"
              >
                <span className="text-[12px] text-ink-2">{dimension.label}</span>
                <div className="flex items-center gap-2">
                  <span className="w-7 text-right font-mono text-[11px] tabular text-ink-3">{dimension.original}</span>
                  <span className="text-ink-3" aria-hidden="true">
                    →
                  </span>
                  <span className="w-7 font-mono text-[11px] tabular text-ink">{dimension.improved}</span>
                  <div className="ml-1 h-[3px] min-w-[40px] flex-1 overflow-hidden rounded-full bg-[var(--track)]">
                    <div
                      className="h-full rounded-full transition-[width] duration-500 ease-out"
                      style={{
                        width: `${Math.min(100, Math.abs(dimension.change) * 3)}%`,
                        background:
                          dimension.change > 0
                            ? "var(--green)"
                            : dimension.change < 0
                              ? "var(--red)"
                              : "var(--ink-3)",
                      }}
                    />
                  </div>
                </div>
                <DeltaPill change={dimension.change} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-[8px] border border-line bg-bg px-4 py-3">
          <h3 className="mono-label">Newly addressed</h3>
          {comparison.improved.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {comparison.improved.map((key) => (
                <li
                  key={key}
                  className="rounded-[3px] border border-[var(--ok-border)] bg-[var(--ok-bg)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-green"
                >
                  {getDimension(key as DimensionKey).label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-ink-3">No dimension improved in this revision.</p>
          )}
        </div>

        <div className="rounded-[8px] border border-line bg-bg px-4 py-3">
          <h3 className="mono-label">Still needs attention</h3>
          {improved.weaknesses.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {improved.weaknesses.slice(0, 4).map((weakness, index) => (                <li key={`${weakness.dimension}-${index}`} className="flex items-start gap-2">
                  <Badge tone={weakness.severity === "high" ? "high" : weakness.severity === "medium" ? "medium" : "low"}>
                    {weakness.severity}
                  </Badge>
                  <span className="text-[11.5px] leading-[1.55] text-ink-2">
                    <span className="text-ink">{getDimension(weakness.dimension).label}:</span> {weakness.problem}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-ink-3">
              The revised prompt has no reported weaknesses under the current rubric.
            </p>
          )}
        </div>
      </div>

      {onSave || onSaveVersion ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saved}
              className={buttonClass({ variant: saved ? "secondary" : "primary", size: "md" })}
            >
              {saved ? "Saved to comparisons" : "Save comparison"}
            </button>
          ) : null}
          {onSaveVersion ? (
            <button type="button" onClick={onSaveVersion} className={buttonClass({ variant: "secondary", size: "md" })}>
              Save improved as new version
            </button>
          ) : null}
          <span className="text-[11px] text-ink-3">
            {onSaveVersion
              ? "The original version stays untouched; the revision is appended to the session."
              : "Saved comparisons stay in this browser and appear on the Comparisons page."}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ScoreCell({ label, value, band }: { label: string; value: number; band: string }) {
  return (
    <div className="bg-bg px-3 py-3">
      <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-3">{label}</div>
      <div className="mt-1.5 font-mono text-[24px] leading-none tracking-[-0.04em] text-ink">{value}</div>
      <div className="mt-1 text-[10px] text-ink-3">{band}</div>
    </div>
  );
}

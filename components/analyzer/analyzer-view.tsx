"use client";

import { useMemo, useState } from "react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { LabeledInput, Select } from "@/components/ui/field";
import { LoadingLine, Notice } from "@/components/ui/notice";
import { PromptEditor } from "@/components/ui/prompt-editor";
import { useToast } from "@/components/ui/toast";
import { categories, PROMPT_LIMITS, RUBRIC_VERSION } from "@/config/app";
import { postJson, type ApiError } from "@/lib/api/client";
import { analyzeRequestSchema, firstIssue } from "@/lib/validation/schemas";
import { fingerprintPrompt } from "@/lib/scoring/calculate-score";
import { EvaluationResults } from "@/components/analyzer/evaluation-results";
import { ImprovementWorkflow } from "@/components/improvement/improvement-workflow";
import { SAMPLE_PROMPTS } from "@/config/samples";
import { usePendingPrompt } from "@/hooks/use-pending-prompt";
import type { EvaluationSnapshot } from "@/types/evaluation";

type Phase = "idle" | "analyzing" | "ready" | "error";

export function AnalyzerView() {
  const { showToast } = useToast();
  const pending = usePendingPrompt();
  const [dismissedHandoff, setDismissedHandoff] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("ui_ux");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<EvaluationSnapshot | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const handoffVisible = Boolean(pending) && dismissedHandoff !== pending?.createdAt;

  const stale = useMemo(() => {
    if (!result) return false;
    return result.promptHash !== fingerprintPrompt(prompt);
  }, [prompt, result]);

  async function handleAnalyze() {
    const parsed = analyzeRequestSchema.safeParse({
      prompt,
      title: title || undefined,
      category,
      rubricVersion: RUBRIC_VERSION,
    });

    if (!parsed.success) {
      const issues = firstIssue(parsed.error);
      setFieldError(issues.prompt ?? issues["prompt"]);
      showToast("Enter a prompt before analyzing.", "error");
      return;
    }

    setFieldError(undefined);
    setError(null);
    setPhase("analyzing");

    const response = await postJson<EvaluationSnapshot>("/api/ai/analyze", parsed.data);

    if (!response.ok) {
      setError(response.error);
      setPhase("error");
      return;
    }

    setResult(response.data);
    setPhase("ready");
    showToast(
      response.data.source === "live"
        ? `Evaluation complete. Overall score ${response.data.overallScore}/100.`
        : `Demo evaluation complete. Rule-based score ${response.data.overallScore}/100.`,
      response.data.source === "live" ? "success" : "info",
    );
  }

  function handleClear() {
    setPrompt("");
    setTitle("");
    setResult(null);
    setError(null);
    setPhase("idle");
    setFieldError(undefined);
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-12">
      <WorkspaceHeader
        title="Prompt Analyzer"
        description="Score a prompt across eight dimensions, with evidence for every weakness and no fabricated findings."
        meta={<Badge tone="neutral">Rubric {RUBRIC_VERSION}</Badge>}
      />

      <div className="grid gap-8 py-7 lg:grid-cols-12 lg:gap-10">
        <section className="min-w-0 lg:col-span-5">
          <div className="lg:sticky lg:top-6">
            {handoffVisible && pending ? (
              <Notice
                tone="info"
                title="A prompt was handed over from the builder"
                className="mb-4"
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt(pending.prompt);
                      setTitle(pending.title === "Untitled prompt" ? "" : pending.title);
                      setCategory(pending.category);
                      setResult(null);
                      setPhase("idle");
                      setFieldError(undefined);
                      setDismissedHandoff(pending.createdAt);
                      showToast("Builder prompt loaded into the analyzer.");
                    }}
                    className={buttonClass({ variant: "secondary", size: "sm" })}
                  >
                    Load prompt
                  </button>
                }
              >
                {pending.prompt.length.toLocaleString()} characters ready to evaluate. Loading replaces the current
                input.
              </Notice>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <LabeledInput
                label="Prompt title"
                hint="Optional label for the history entry."
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Churn dashboard brief"
                maxLength={160}
              />
              <div>
                <label
                  htmlFor="analyzer-category"
                  className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-ink-2"
                >
                  Category
                </label>
                <Select
                  id="analyzer-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <PromptEditor
                id="analyzer-prompt"
                label="Prompt to evaluate"
                value={prompt}
                onChange={setPrompt}
                placeholder="Paste the prompt you want to diagnose…"
                maxLength={PROMPT_LIMITS.max}
                minHeight={320}
                error={fieldError}
                hint={`Minimum ${PROMPT_LIMITS.min} characters so the eight dimensions can be judged.`}
                footer={
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                    {prompt.length >= PROMPT_LIMITS.min ? "Ready" : `Need ${PROMPT_LIMITS.min - prompt.length} more`}
                  </span>
                }
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={phase === "analyzing" || prompt.trim().length < PROMPT_LIMITS.min}
                className={buttonClass({ variant: "primary", size: "lg", className: "min-w-[150px]" })}
                aria-busy={phase === "analyzing"}
              >
                {phase === "analyzing" ? "Analyzing…" : "Analyze prompt"}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className={buttonClass({ variant: "secondary", size: "lg" })}
              >
                Clear input
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrompt(SAMPLE_PROMPTS[0].prompt);
                  setTitle(SAMPLE_PROMPTS[0].title);
                  setCategory(SAMPLE_PROMPTS[0].category);
                  setResult(null);
                  setPhase("idle");
                }}
                className={buttonClass({ variant: "ghost", size: "lg" })}
              >
                Load sample
              </button>
            </div>

            {phase === "analyzing" ? (
              <div className="mt-4 rounded-[7px] border border-line bg-bg-raised px-4 py-3.5">
                <LoadingLine label="Scoring eight dimensions" />
                <p className="mt-2 text-[11px] leading-[1.5] text-ink-3">
                  The prompt is sent to the configured provider for evaluation. Nothing is saved until you choose to
                  save it.
                </p>
              </div>
            ) : null}

            {phase === "error" && error ? (
              <Notice
                tone="error"
                title="Analysis failed"
                className="mt-4"
                action={
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    className={buttonClass({ variant: "secondary", size: "sm" })}
                  >
                    Retry
                  </button>
                }
              >
                {error.message} Your prompt is preserved.
              </Notice>
            ) : null}

            <div className="mt-5 rounded-[7px] border border-line bg-bg-raised px-4 py-3.5">
              <p className="text-[11px] leading-[1.6] text-ink-3">
                Scores are a model-assisted diagnostic, not a universal measurement of prompt quality. Prompts are
                transmitted to the configured AI provider in Live mode. Do not submit confidential business
                information or sensitive personal data.
              </p>
            </div>

            {stale ? (
              <Notice tone="demo" title="The prompt changed since this evaluation" className="mt-4">
                Results below belong to the previous text. Analyze again to evaluate the current version.
              </Notice>
            ) : null}
          </div>
        </section>

        <section className="min-w-0 lg:col-span-7">
          {result ? (
            <div className="space-y-4">
              <EvaluationResults
                snapshot={result}
                title={title || undefined}
                category={category}
                originalPrompt={prompt}
                onAnalyzeAgain={handleAnalyze}
                onImprove={() =>
                  document.getElementById("improve-workflow")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              />
              <ImprovementWorkflow
                originalPrompt={prompt}
                originalSnapshot={result}
                category={category}
                title={title || undefined}
              />
            </div>
          ) : phase === "analyzing" ? (
            <AnalysisSkeleton />
          ) : (
            <EmptyAnalysis />
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyAnalysis() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[10px] border border-dashed border-line px-6 py-12 text-center">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => (
          <span
            key={index}
            className="h-8 w-[3px] rounded-full bg-[#242a30]"
            style={{ height: `${18 + (index % 4) * 6}px` }}
          />
        ))}
      </div>
      <h2 className="mt-6 font-display text-[23px] font-medium tracking-[-0.02em]">
        The diagnostic view opens here.
      </h2>
      <p className="mt-2 max-w-[46ch] text-[12.5px] leading-[1.6] text-ink-3">
        You will get an overall score, eight dimension readings with explanations, ranked weaknesses with evidence,
        missing information, contradictions, and recommendations.
      </p>
      <div className="mt-6 grid w-full max-w-[420px] grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-line bg-line sm:grid-cols-4">
        {["Clarity", "Context", "Specificity", "Visual", "Composition", "Typography", "Constraints", "Output"].map(
          (label) => (
            <div key={label} className="bg-bg-raised px-2 py-2.5">
              <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-3">{label}</div>
              <div className="mt-1.5 font-mono text-[13px] text-ink-3">—</div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="rounded-[10px] border border-line bg-bg-raised p-5">
        <div className="h-3 w-24 animate-pulse rounded-full bg-[#232a31]" />
        <div className="mt-4 h-14 w-40 animate-pulse rounded-[6px] bg-[#232a31]" />
        <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-[#1d232a]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-[8px] border border-line bg-bg-raised" />
        ))}
      </div>
    </div>
  );
}

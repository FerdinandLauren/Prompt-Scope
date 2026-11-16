"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleHelp,
  Compass,
  Lightbulb,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Field, LabeledInput, LabeledTextarea, Select } from "@/components/ui/field";
import { LoadingLine, Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { PromptWorkspace } from "@/components/builder/prompt-workspace";
import { SavePromptDialog } from "@/components/history/session-detail";
import {
  agentProfiles,
  categories,
  categoryGroups,
  getAgentProfile,
  getCategory,
  getComplexityRecommendation,
  getPromptDepth,
  promptDepths,
  type CategoryId,
} from "@/config/domains";
import { buildDraftPrompt } from "@/lib/prompt/draft";
import { demoDiscover } from "@/lib/ai/demo/discover";
import { postJson, type ApiError } from "@/lib/api/client";
import { savePendingPrompt } from "@/lib/storage/pending-prompt";
import { createSession } from "@/lib/storage/prompt-storage";
import { configurationFromBrief, type BuilderDraft, type GuidedStep } from "@/lib/storage/builder-draft";
import { cn, deriveTitle } from "@/lib/utils";
import { firstIssue, promptConfigurationSchema } from "@/lib/validation/schemas";
import type { GeneratedPrompt, PromptConfiguration } from "@/types/prompt";
import type {
  BriefSection,
  DiscoveryAnswer,
  DiscoveryTurn,
  ProjectBrief,
  PromptDepth,
  TargetAgentId,
} from "@/types/guided";

const steps: Array<{ id: GuidedStep; label: string; detail: string }> = [
  { id: "idea", label: "Idea", detail: "Your words" },
  { id: "interview", label: "Questions", detail: "One at a time" },
  { id: "brief", label: "Brief", detail: "Review and edit" },
  { id: "tuning", label: "Depth & agent", detail: "Shape the prompt" },
  { id: "output", label: "Prompt", detail: "Use it anywhere" },
];

const exampleCategories: CategoryId[] = ["ui_ux", "full_stack", "content_creation"];

const sourceTone = {
  user: { tone: "positive" as const, label: "Your input" },
  assumption: { tone: "medium" as const, label: "Assumption" },
  recommendation: { tone: "neutral" as const, label: "Suggestion" },
};

function SectionLabel({ index, label, detail }: { index: string; label: string; detail?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-5 border-b border-line-soft pb-2.5">
      <h2 className="flex items-baseline gap-2.5 text-[12px] font-medium text-ink">
        <span className="font-mono text-[9px] tracking-[0.1em] text-ink-3">{index}</span>
        {label}
      </h2>
      {detail ? (
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">{detail}</span>
      ) : null}
    </div>
  );
}

function StepRail({ step }: { step: GuidedStep }) {
  const activeIndex = steps.findIndex((item) => item.id === step);

  return (
    <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-5" aria-label="Guided builder progress">
      {steps.map((item, index) => {
        const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
        return (
          <li
            key={item.id}
            aria-current={state === "active" ? "step" : undefined}
            className={cn(
              "rounded-[6px] border px-3 py-2.5 transition-colors duration-150",
              state === "active" && "border-[var(--accent-border)] bg-[var(--accent-bg)]",
              state === "done" && "border-line bg-bg-raised",
              state === "pending" && "border-line-soft bg-transparent",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "font-mono text-[9px] uppercase tracking-[0.12em]",
                  state === "active" ? "text-ink" : "text-ink-3",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              {state === "done" ? <Check size={11} className="text-green" aria-hidden="true" /> : null}
            </div>
            <div className={cn("mt-1 text-[11.5px] font-medium", state === "pending" ? "text-ink-3" : "text-ink")}>
              {item.label}
            </div>
            <div className="mt-0.5 truncate text-[10px] text-ink-3">{item.detail}</div>
          </li>
        );
      })}
    </ol>
  );
}

function UnderstandingPanel({ turn }: { turn: DiscoveryTurn }) {
  const { understanding } = turn;
  const confidence = Math.round(understanding.categoryConfidence);

  return (
    <div className="rounded-[8px] border border-line bg-bg-raised">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-4 py-2.5">
        <span className="mono-label">What PromptScope understood</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="low">{understanding.categoryLabel}</Badge>
          <Badge tone={confidence >= 70 ? "positive" : confidence >= 45 ? "medium" : "neutral"}>
            {confidence}% fit
          </Badge>
          <Badge tone="neutral">{understanding.complexity}</Badge>
        </div>
      </div>
      <div className="space-y-3 px-4 py-3.5">
        <p className="text-[12.5px] leading-[1.65] text-ink-2">{understanding.summary}</p>
        <p className="text-[11px] leading-[1.55] text-ink-3">{understanding.categoryReason}</p>

        {understanding.explicitRequirements.length > 0 ? (
          <div>
            <div className="mono-label mb-1.5">Stated requirements</div>
            <ul className="space-y-1">
              {understanding.explicitRequirements.map((item) => (
                <li key={item} className="flex gap-2 text-[11.5px] leading-[1.5] text-ink-2">
                  <span className="text-green">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {understanding.ambiguities.length > 0 ? (
          <div>
            <div className="mono-label mb-1.5">Needs clarifying</div>
            <ul className="space-y-1">
              {understanding.ambiguities.map((item) => (
                <li key={item} className="flex gap-2 text-[11.5px] leading-[1.5] text-amber">
                  <span>~</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Disclosure title="Technical considerations" description={`${understanding.technicalConsiderations.length}`}>
          <ul className="space-y-1.5">
            {understanding.technicalConsiderations.map((item) => (
              <li key={item} className="flex gap-2 text-[11.5px] leading-[1.55] text-ink-2">
                <span className="text-ink-3">—</span>
                {item}
              </li>
            ))}
          </ul>
        </Disclosure>

        {understanding.missingInformation.length > 0 ? (
          <Disclosure title="Still missing" description={`${understanding.missingInformation.length}`}>
            <div className="flex flex-wrap gap-1.5">
              {understanding.missingInformation.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-[4px] border border-line bg-surface px-2 py-1 text-[10.5px] text-ink-2"
                >
                  {item}
                </span>
              ))}
            </div>
          </Disclosure>
        ) : null}

        <p className="border-t border-line-soft pt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
          {turn.source === "live" ? "Live discovery" : "Demo discovery — deterministic, local"} · {turn.answered} answered
          · soft budget {turn.budget}
        </p>
      </div>
    </div>
  );
}

export function GuidedBuilder({
  configuration,
  onConfigurationChange,
  initialGuided,
  onGuidedChange,
  onSwitchMode,
}: {
  configuration: PromptConfiguration;
  onConfigurationChange: (next: PromptConfiguration) => void;
  initialGuided: BuilderDraft["guided"];
  onGuidedChange: (next: BuilderDraft["guided"]) => void;
  onSwitchMode: (mode: "advanced") => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<GuidedStep>(initialGuided.briefConfirmed ? "tuning" : initialGuided.step);
  const [idea, setIdea] = useState(initialGuided.idea || configuration.objective);
  const [answers, setAnswers] = useState<DiscoveryAnswer[]>(initialGuided.answers);
  const [budget, setBudget] = useState(initialGuided.budget);
  const [brief, setBrief] = useState<ProjectBrief | null>(initialGuided.brief);
  const [briefConfirmed, setBriefConfirmed] = useState(initialGuided.briefConfirmed);
  const [depth, setDepth] = useState<PromptDepth>(initialGuided.depth);
  const [targetAgent, setTargetAgent] = useState<TargetAgentId>(initialGuided.targetAgent);
  const [categoryHint, setCategoryHint] = useState(initialGuided.categoryHint);

  const [turn, setTurn] = useState<DiscoveryTurn | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [loading, setLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<ApiError | null>(null);
  const [recommendationDismissed, setRecommendationDismissed] = useState(false);

  const [generated, setGenerated] = useState<GeneratedPrompt | null>(null);
  const [promptText, setPromptText] = useState("");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<ApiError | null>(null);
  const [formError, setFormError] = useState("");

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);

  const configurationRef = useRef(configuration);
  configurationRef.current = configuration;

  const hydrated = useRef(false);
  const category = useMemo(
    () => getCategory(brief?.category ?? categoryHint ?? configuration.category),
    [brief?.category, categoryHint, configuration.category],
  );
  const recommendedDepth = useMemo(
    () => getComplexityRecommendation(brief?.complexity ?? "moderate"),
    [brief?.complexity],
  );
  const agent = getAgentProfile(targetAgent);

  useEffect(() => {
    onGuidedChange({
      step,
      idea,
      answers,
      brief,
      budget,
      depth,
      targetAgent,
      briefConfirmed,
      categoryHint,
    });
  }, [step, idea, answers, brief, budget, depth, targetAgent, briefConfirmed, categoryHint, onGuidedChange]);

  useEffect(() => {
    if (!brief) return;
    onConfigurationChange(configurationFromBrief(configurationRef.current, brief, depth, targetAgent));
  }, [brief, depth, targetAgent, onConfigurationChange]);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (initialGuided.answers.length > 0 && initialGuided.idea.trim()) {
      void runDiscovery(initialGuided.answers, initialGuided.idea, initialGuided.categoryHint);
    }
    // Intentionally runs once per mount; later answers go through submitAnswer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runDiscovery(
    list: DiscoveryAnswer[],
    ideaValue = idea,
    hint = categoryHint,
    options: { silent?: boolean } = {},
  ) {
    const trimmed = ideaValue.trim();
    if (trimmed.length < 3) {
      setFormError("Describe your idea in at least a few words first.");
      return;
    }

    setLoading(true);
    setDiscoveryError(null);
    setFormError("");

    const result = await postJson<DiscoveryTurn>("/api/ai/discover", {
      idea: trimmed,
      category: hint || undefined,
      answers: list,
      budget,
    });

    setLoading(false);

    if (!result.ok) {
      // Discovery failing must not destroy the user's work. The deterministic
      // engine runs locally and is clearly labelled as demo output.
      const fallback = demoDiscover({
        idea: trimmed,
        category: hint || undefined,
        answers: list,
        budget,
      });
      setDiscoveryError(result.error);
      setTurn(fallback);
      setBrief(fallback.brief);
      setRecommendationDismissed(false);
      setStep(fallback.recommendation ? "interview" : fallback.enoughInformation ? "brief" : "interview");
      if (!options.silent) showToast("Discovery could not reach the provider. Demo discovery is shown instead.", "error");
      return;
    }

    setTurn(result.data);
    setBrief(result.data.brief);
    setRecommendationDismissed(false);
    setStep(
      result.data.recommendation
        ? "interview"
        : result.data.enoughInformation || !result.data.question
          ? "brief"
          : "interview",
    );
  }

  function startDiscovery() {
    if (idea.trim().length < 3) {
      setFormError("Describe your idea in at least a few words first.");
      return;
    }
    setAnswers([]);
    void runDiscovery([]);
  }

  function chooseOption(option: string) {
    setAnswerText(option);
  }

  async function submitAnswer(status: DiscoveryAnswer["status"]) {
    const question = turn?.question;
    if (!question) return;

    const value = status === "answered" ? answerText.trim() : status === "unknown" ? "I don't know" : "Skipped";
    if (status === "answered" && value.length < 2) {
      showToast("Type an answer, choose a suggestion, or say you don't know.", "error");
      return;
    }

    const nextAnswers: DiscoveryAnswer[] = [
      ...answers,
      { questionId: question.id, question: question.question, answer: value, status },
    ];
    setAnswers(nextAnswers);
    setAnswerText("");
    setRecommendationDismissed(false);
    await runDiscovery(nextAnswers);
  }

  function continueAfterRecommendation() {
    setRecommendationDismissed(true);
    if (!turn?.question || turn.enoughInformation) {
      setStep("brief");
    }
  }

  function skipToBrief() {
    if (!turn && !brief) return;
    if (brief) {
      setStep("brief");
    }
  }

  function updateBriefSection(id: string, patch: Partial<BriefSection>) {
    setBrief((current) =>
      current
        ? {
            ...current,
            sections: current.sections.map((section) => (section.id === id ? { ...section, ...patch } : section)),
          }
        : current,
    );
  }

  function addBriefSection() {
    setBrief((current) =>
      current
        ? {
            ...current,
            sections: [
              ...current.sections,
              {
                id: `custom-${Date.now()}`,
                heading: "Additional requirement",
                content: "",
                source: "user",
              },
            ],
          }
        : current,
    );
  }

  function removeBriefSection(id: string) {
    setBrief((current) =>
      current ? { ...current, sections: current.sections.filter((section) => section.id !== id) } : current,
    );
  }

  function updateBriefList(key: "assumptions" | "unknowns", index: number, value: string) {
    setBrief((current) =>
      current
        ? {
            ...current,
            [key]: current[key].map((item, itemIndex) => (itemIndex === index ? value : item)),
          }
        : current,
    );
  }

  function removeBriefListItem(key: "assumptions" | "unknowns", index: number) {
    setBrief((current) =>
      current ? { ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) } : current,
    );
  }

  function addBriefListItem(key: "assumptions" | "unknowns") {
    setBrief((current) =>
      current ? { ...current, [key]: [...current[key], key === "unknowns" ? "Open question" : "Assumption"] } : current,
    );
  }

  function confirmBrief() {
    if (!brief) return;
    if (brief.sections.every((section) => !section.content.trim())) {
      showToast("Add at least one requirement before continuing.", "error");
      return;
    }
    if (brief.objective.trim().length < 12) {
      showToast("Give the objective at least 12 characters so the prompt has a direction.", "error");
      return;
    }
    setBriefConfirmed(true);
    setStep("tuning");
    onConfigurationChange(configurationFromBrief(configuration, brief, depth, targetAgent));
  }

  async function generate() {
    if (!brief) return;
    const nextConfiguration = configurationFromBrief(configuration, brief, depth, targetAgent);
    const parsed = promptConfigurationSchema.safeParse(nextConfiguration);
    if (!parsed.success) {
      setFormError(Object.values(firstIssue(parsed.error))[0] ?? "Complete the brief before generating.");
      showToast("Complete the brief before generating.", "error");
      return;
    }

    setFormError("");
    setGenerationError(null);
    setGenerating(true);
    onConfigurationChange(nextConfiguration);

    const result = await postJson<GeneratedPrompt>("/api/ai/generate", {
      configuration: parsed.data,
    });

    setGenerating(false);

    if (!result.ok) {
      const draft = buildDraftPrompt(parsed.data);
      setGenerated(draft);
      setPromptText(draft.prompt);
      setTitle(draft.title || brief.title);
      setGenerationError(result.error);
      setStep("output");
      showToast("The provider did not respond. A local draft is shown and clearly labelled.", "error");
      return;
    }

    setGenerated(result.data);
    setPromptText(result.data.prompt);
    setTitle(result.data.title);
    setSavedSessionId(null);
    setStep("output");
    showToast(
      result.data.source === "live"
        ? "Prompt generated. Review and edit before analysis."
        : "Demo Mode composed a structured prompt from your brief.",
      result.data.source === "live" ? "success" : "info",
    );
  }

  function openAnalyzer() {
    if (!promptText.trim() || !brief) return;
    const nextConfiguration = configurationFromBrief(configuration, brief, depth, targetAgent);
    savePendingPrompt({
      prompt: promptText,
      title: title || generated?.title || brief.title,
      category: brief.category as PromptConfiguration["category"],
      configuration: nextConfiguration,
      generated: generated ?? undefined,
      createdAt: new Date().toISOString(),
    });
    router.push("/analyzer");
  }

  function handleSave(sessionTitle: string) {
    if (!brief) return;
    try {
      const nextConfiguration = configurationFromBrief(configuration, brief, depth, targetAgent);
      const session = createSession({
        title: sessionTitle,
        category: brief.category,
        promptText,
        source: generated?.source === "live" || generated?.source === "demo" ? "generated" : "manual",
        label:
          generated?.source === "demo" ? "Demo data" : generated?.source === "draft" ? "Local draft" : "Guided generation",
        configuration: nextConfiguration,
      });
      setTitle(sessionTitle);
      setSavedSessionId(session.id);
      setSaveDialogOpen(false);
      showToast("Prompt saved to history as version 1.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The prompt could not be saved.", "error");
    }
  }

  function reset() {
    setStep("idea");
    setIdea("");
    setAnswers([]);
    setBrief(null);
    setTurn(null);
    setBriefConfirmed(false);
    setCategoryHint("");
    setDepth("balanced");
    setTargetAgent("general");
    setGenerated(null);
    setPromptText("");
    setTitle("");
    setSavedSessionId(null);
    setDiscoveryError(null);
    setGenerationError(null);
    setFormError("");
    setAnswerText("");
    showToast("Guided session reset. Your saved history is untouched.", "info");
  }

  const question = turn?.question ?? null;
  const showRecommendation = Boolean(turn?.recommendation) && !recommendationDismissed;

  return (
    <div className="py-8 sm:py-9">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <StepRail step={step} />
        <button
          type="button"
          onClick={reset}
          className={buttonClass({ variant: "ghost", size: "sm", className: "shrink-0 self-start" })}
        >
          <RotateCcw size={13} strokeWidth={1.7} aria-hidden="true" />
          Start over
        </button>
      </div>

      {discoveryError ? (
        <Notice tone="demo" title="Demo discovery used" className="mb-5">
          {discoveryError.message} The deterministic engine below runs locally, so the workflow can continue. Anything
          produced here is labelled as demo data, not a live model response.
        </Notice>
      ) : null}

      {step === "idea" ? (
        <section className="enter-rise">
          <SectionLabel index="01" label="Describe your idea" detail="Plain language is enough" />
          <div className="rounded-[8px] border border-line bg-bg-raised p-5 sm:p-6">
            <LabeledTextarea
              id="guided-idea"
              label="What are you trying to make or improve?"
              hint="Write it the way you would explain it to a colleague. PromptScope will ask follow-up questions instead of guessing."
              value={idea}
              onChange={(event) => {
                setIdea(event.target.value);
                setFormError("");
              }}
              placeholder="I want a dashboard that helps our operations team spot churn risk before the weekly review. I'm not sure which screens we need yet."
              maxLength={2000}
              rows={6}
              error={formError || undefined}
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Category"
                hint="Optional. Leave it on detect if you are not sure — the brief can be corrected later."
              >
                <Select
                  value={categoryHint}
                  onChange={(event) => setCategoryHint(event.target.value)}
                  aria-label="Category"
                >
                  <option value="">Detect automatically</option>
                  {categoryGroups.map((group) => (
                    <optgroup key={group.id} label={group.label}>
                      {categories
                        .filter((item) => item.group === group.id)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </Select>
              </Field>

              <Field
                label="Question budget"
                hint="A soft limit, not a target. The interview stops earlier when the brief is strong enough."
              >
                <Select
                  value={String(budget)}
                  onChange={(event) => setBudget(Number(event.target.value))}
                  aria-label="Question budget"
                >
                  <option value="3">Short — up to 3 questions</option>
                  <option value="5">Standard — up to 5 questions</option>
                  <option value="7">Thorough — up to 7 questions</option>
                  <option value="9">Deep — up to 9 questions</option>
                </Select>
              </Field>
            </div>

            <div className="mt-5 border-t border-line-soft pt-4">
              <div className="mono-label mb-2">Need a starting point?</div>
              <div className="flex flex-wrap gap-1.5">
                {exampleCategories.map((id) => {
                  const item = getCategory(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setIdea(item.exampleIdea);
                        setCategoryHint(id);
                      }}
                      className="rounded-[5px] border border-line bg-bg px-2.5 py-1.5 text-left text-[11px] leading-[1.45] text-ink-2 transition-colors duration-150 hover:border-[var(--line-strong)] hover:text-ink"
                    >
                      <span className="font-medium">{item.shortLabel}</span>
                      <span className="ml-1.5 text-ink-3">{item.exampleIdea.split(" ").slice(0, 7).join(" ")}…</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={startDiscovery}
                disabled={loading}
                className={buttonClass({ variant: "primary", size: "lg" })}
                aria-busy={loading}
              >
                {loading ? "Reading your idea…" : "Understand my idea"}
                <Compass size={15} strokeWidth={1.8} aria-hidden="true" />
              </button>
              {loading ? <LoadingLine label="Mapping intent and domain" /> : null}
            </div>

            <p className="mt-4 border-t border-line-soft pt-3 text-[10.5px] leading-[1.5] text-ink-3">
              Your idea is sent to the configured provider only when Live Mode is active. In Demo Mode everything runs
              locally and is labelled as demo data.
            </p>
          </div>
        </section>
      ) : null}

      {step === "interview" && turn ? (
        <section className="enter-rise space-y-4">
          <SectionLabel
            index="02"
            label="A few questions"
            detail={`${turn.answered} of ${turn.budget} soft budget`}
          />
          <UnderstandingPanel turn={turn} />

          {showRecommendation && turn.recommendation ? (
            <div className="rounded-[8px] border border-[var(--warn-border)] bg-[var(--warn-bg)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[12px] font-medium text-ink">
                  <Lightbulb size={14} className="text-amber" aria-hidden="true" />
                  PromptScope recommends
                </span>
                <Badge tone="medium">Recorded as an assumption</Badge>
              </div>
              <p className="mt-2 text-[12.5px] leading-[1.65] text-ink">
                <span className="font-medium">For “{turn.recommendation.question}”:</span>{" "}
                {turn.recommendation.recommendation}
              </p>
              <p className="mt-1.5 text-[11.5px] leading-[1.55] text-ink-2">{turn.recommendation.rationale}</p>
              {turn.recommendation.tradeoffs.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {turn.recommendation.tradeoffs.map((item) => (
                    <li key={item} className="flex gap-2 text-[11px] leading-[1.5] text-ink-2">
                      <span className="text-ink-3">–</span>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={continueAfterRecommendation}
                  className={buttonClass({ variant: "primary", size: "sm" })}
                >
                  <Check size={12} aria-hidden="true" />
                  Keep this assumption
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecommendationDismissed(true);
                    setAnswerText("");
                    if (!turn.question) setStep("brief");
                  }}
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  Answer it myself instead
                </button>
              </div>
            </div>
          ) : null}

          {question ? (
            <div className="rounded-[8px] border border-line bg-bg-raised p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="mono-label">Question {turn.answered + 1}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                  {turn.source === "live" ? "Live" : "Demo"}
                </span>
              </div>
              <h3 className="mt-2 font-display text-[19px] font-medium leading-[1.35] tracking-[-0.02em] text-ink">
                {question.question}
              </h3>
              <p className="mt-1.5 text-[11.5px] leading-[1.55] text-ink-3">{question.why}</p>

              {question.options.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => chooseOption(option)}
                      aria-pressed={answerText === option}
                      className={cn(
                        "rounded-[5px] border px-2.5 py-1.5 text-[11.5px] leading-[1.4] transition-colors duration-150",
                        answerText === option
                          ? "border-[var(--accent-border)] bg-[var(--accent-bg)] text-ink"
                          : "border-line bg-bg text-ink-2 hover:border-[var(--line-strong)] hover:text-ink",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-4">
                <LabeledTextarea
                  id={`guided-answer-${question.id}`}
                  label="Your answer"
                  hint="Free text is always accepted. Short answers are fine."
                  value={answerText}
                  onChange={(event) => setAnswerText(event.target.value)}
                  placeholder="Type your answer…"
                  maxLength={1500}
                  rows={3}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void submitAnswer("answered")}
                  disabled={loading}
                  className={buttonClass({ variant: "primary", size: "md" })}
                >
                  Continue
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void submitAnswer("unknown")}
                  disabled={loading}
                  className={buttonClass({ variant: "secondary", size: "md" })}
                >
                  <CircleHelp size={14} aria-hidden="true" />
                  I don&apos;t know
                </button>
                <button
                  type="button"
                  onClick={() => void submitAnswer("skipped")}
                  disabled={loading}
                  className={buttonClass({ variant: "ghost", size: "md" })}
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={skipToBrief}
                  className={buttonClass({ variant: "ghost", size: "md", className: "ml-auto" })}
                >
                  Review brief now
                </button>
              </div>

              {loading ? (
                <div className="mt-3 border-t border-line-soft pt-3">
                  <LoadingLine label="Updating the brief" />
                </div>
              ) : null}
              {formError ? (
                <p className="mt-2 text-[11px] text-[var(--danger-text)]" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[8px] border border-line bg-bg-raised p-5">
              <h3 className="text-[13px] font-medium text-ink">The brief is ready to review.</h3>
              <p className="mt-1 text-[11.5px] leading-[1.55] text-ink-3">
                There is enough information to draft a useful prompt. Anything PromptScope assumed is marked.
              </p>
              <button
                type="button"
                onClick={() => setStep("brief")}
                className={buttonClass({ variant: "primary", size: "md", className: "mt-3" })}
              >
                Review project brief
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      ) : null}

      {step === "brief" && brief ? (
        <section className="enter-rise space-y-4">
          <SectionLabel
            index="03"
            label="Project brief"
            detail={`${brief.sections.length} sections · ${brief.assumptions.length} assumptions`}
          />

          <Notice tone="info" title="This is the source of truth for the prompt">
            Edit anything that is wrong. <span className="text-ink">Your input</span> is treated as fact,{" "}
            <span className="text-amber">assumptions</span> stay provisional, and{" "}
            <span className="text-ink">open questions</span> are carried into the prompt instead of invented.
          </Notice>

          <div className="rounded-[8px] border border-line bg-bg-raised p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <LabeledInput
                label="Brief title"
                value={brief.title}
                onChange={(event) => setBrief({ ...brief, title: event.target.value })}
                maxLength={160}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <Select
                    value={brief.category}
                    onChange={(event) =>
                      setBrief({ ...brief, category: event.target.value as CategoryId })
                    }
                    aria-label="Brief category"
                  >
                    {categoryGroups.map((group) => (
                      <optgroup key={group.id} label={group.label}>
                        {categories
                          .filter((item) => item.group === group.id)
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </Select>
                </Field>
                <Field label="Complexity">
                  <Select
                    value={brief.complexity}
                    onChange={(event) =>
                      setBrief({ ...brief, complexity: event.target.value as ProjectBrief["complexity"] })
                    }
                    aria-label="Brief complexity"
                  >
                    <option value="simple">Simple</option>
                    <option value="moderate">Moderate</option>
                    <option value="complex">Complex</option>
                  </Select>
                </Field>
              </div>
            </div>

            <div className="mt-4">
              <LabeledTextarea
                label="Objective"
                value={brief.objective}
                onChange={(event) => setBrief({ ...brief, objective: event.target.value })}
                maxLength={1200}
                rows={3}
                hint="The outcome the work must achieve, in the user's own words."
              />
            </div>

            <div className="mt-4">
              <LabeledTextarea
                label="Summary"
                value={brief.summary}
                onChange={(event) => setBrief({ ...brief, summary: event.target.value })}
                maxLength={2000}
                rows={2}
                hint="A short orientation for the receiving agent."
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {brief.sections.map((section, index) => {
              const meta = sourceTone[section.source];
              return (
                <div key={section.id} className="rounded-[7px] border border-line bg-bg-raised p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[9px] text-ink-3">{String(index + 1).padStart(2, "0")}</span>
                    <input
                      value={section.heading}
                      onChange={(event) => updateBriefSection(section.id, { heading: event.target.value })}
                      maxLength={90}
                      aria-label={`Section ${index + 1} heading`}
                      className="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent pb-0.5 text-[12.5px] font-medium text-ink focus:border-orange focus:outline-none"
                    />
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <Select
                      value={section.source}
                      onChange={(event) =>
                        updateBriefSection(section.id, { source: event.target.value as BriefSection["source"] })
                      }
                      aria-label={`Source for ${section.heading}`}
                      className="h-7 w-[132px] text-[11px]"
                    >
                      <option value="user">Your input</option>
                      <option value="assumption">Assumption</option>
                      <option value="recommendation">Suggestion</option>
                    </Select>
                    <button
                      type="button"
                      onClick={() => removeBriefSection(section.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-[4px] text-ink-3 hover:bg-surface hover:text-[var(--danger-text)]"
                      aria-label={`Remove ${section.heading}`}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                    </button>
                  </div>
                  <textarea
                    value={section.content}
                    onChange={(event) => updateBriefSection(section.id, { content: event.target.value })}
                    maxLength={4000}
                    rows={2}
                    aria-label={`${section.heading} details`}
                    className="mt-2.5 block w-full resize-y rounded-[5px] border border-line bg-bg px-2.5 py-2 text-[12px] leading-[1.6] text-ink placeholder:text-ink-3 focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/15"
                    placeholder="Add the concrete detail the receiving agent needs…"
                  />
                </div>
              );
            })}
          </div>

          <button type="button" onClick={addBriefSection} className={buttonClass({ variant: "secondary", size: "sm" })}>
            <Plus size={13} aria-hidden="true" />
            Add section
          </button>

          <div className="grid gap-4 lg:grid-cols-2">
            {(["assumptions", "unknowns"] as const).map((key) => (
              <div key={key} className="rounded-[7px] border border-line bg-bg-raised p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-ink">
                    {key === "assumptions" ? "Assumptions to confirm" : "Open questions"}
                  </span>
                  <Badge tone={key === "assumptions" ? "medium" : "neutral"}>{brief[key].length}</Badge>
                </div>
                <p className="mt-1 text-[10.5px] leading-[1.5] text-ink-3">
                  {key === "assumptions"
                    ? "Carried into the prompt as provisional. Never presented as confirmed requirements."
                    : "Kept explicit so the receiving agent asks instead of inventing an answer."}
                </p>
                <ul className="mt-2.5 space-y-1.5">
                  {brief[key].map((item, index) => (
                    <li key={`${key}-${index}`} className="flex items-start gap-1.5">
                      <input
                        value={item}
                        onChange={(event) => updateBriefList(key, index, event.target.value)}
                        maxLength={500}
                        aria-label={`${key} item ${index + 1}`}
                        className="h-7 min-w-0 flex-1 rounded-[4px] border border-line bg-bg px-2 text-[11.5px] text-ink focus:border-orange focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeBriefListItem(key, index)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-ink-3 hover:bg-surface hover:text-[var(--danger-text)]"
                        aria-label={`Remove ${key} item ${index + 1}`}
                      >
                        <Trash2 size={11} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => addBriefListItem(key)}
                  className={buttonClass({ variant: "ghost", size: "sm", className: "mt-2" })}
                >
                  <Plus size={12} aria-hidden="true" />
                  Add
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
            <button type="button" onClick={confirmBrief} className={buttonClass({ variant: "primary", size: "lg" })}>
              <BadgeCheck size={15} strokeWidth={1.8} aria-hidden="true" />
              Confirm brief — choose depth
            </button>
            {turn?.question ? (
              <button
                type="button"
                onClick={() => setStep("interview")}
                className={buttonClass({ variant: "ghost", size: "md" })}
              >
                <ArrowLeft size={13} aria-hidden="true" />
                Back to questions
              </button>
            ) : null}
            <span className="ml-auto text-[10.5px] text-ink-3">Confirmation unlocks depth and target agent selection.</span>
          </div>
        </section>
      ) : null}

      {step === "tuning" && brief ? (
        <section className="enter-rise space-y-6">
          <div>
            <SectionLabel index="04" label="Prompt depth" detail={`Recommended: ${getPromptDepth(recommendedDepth).label}`} />
            <div className="grid gap-2 sm:grid-cols-2">
              {promptDepths.map((profile) => {
                const active = depth === profile.id;
                return (
                  <label
                    key={profile.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-[7px] border p-3.5 transition-[border-color,background-color] duration-150",
                      active
                        ? "border-[var(--accent-border)] bg-[var(--accent-bg)]"
                        : "border-line bg-bg-raised hover:border-[var(--line-strong)]",
                    )}
                  >
                    <input
                      type="radio"
                      name="guided-depth"
                      value={profile.id}
                      checked={active}
                      onChange={() => setDepth(profile.id)}
                      className="mt-0.5 h-3.5 w-3.5 accent-[var(--orange)]"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-ink">
                        {profile.label}
                        {profile.id === recommendedDepth ? <Badge tone="medium">Recommended</Badge> : null}
                      </span>
                      <span className="mt-1 block text-[11px] leading-[1.5] text-ink-3">{profile.summary}</span>
                      <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                        up to {profile.sectionLimit === 99 ? "all" : profile.sectionLimit} sections
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <SectionLabel index="05" label="Target agent" detail={agent.label} />
            <div className="grid gap-2 sm:grid-cols-2">
              {agentProfiles.map((profile) => {
                const active = targetAgent === profile.id;
                return (
                  <label
                    key={profile.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-[7px] border p-3.5 transition-[border-color,background-color] duration-150",
                      active
                        ? "border-[var(--accent-border)] bg-[var(--accent-bg)]"
                        : "border-line bg-bg-raised hover:border-[var(--line-strong)]",
                    )}
                  >
                    <input
                      type="radio"
                      name="guided-agent"
                      value={profile.id}
                      checked={active}
                      onChange={() => setTargetAgent(profile.id)}
                      className="mt-0.5 h-3.5 w-3.5 accent-[var(--orange)]"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-ink">
                        {profile.label}
                        {profile.id === "coding" ? <Badge tone="low">Repo-aware</Badge> : null}
                      </span>
                      <span className="mt-1 block text-[11px] leading-[1.5] text-ink-3">{profile.description}</span>
                      <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                        usually {getPromptDepth(profile.recommendedDepth).label}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {targetAgent === "coding" && depth === "concise" ? (
            <Notice tone="demo" title="Coding agents need room to verify">
              Concise prompts can still request inspection, planning, implementation, verification, and a final report, but
              Detailed or Comprehensive depth usually prevents the agent from skipping verification.
            </Notice>
          ) : null}

          <div className="rounded-[7px] border border-line bg-bg-raised p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[12px] font-medium text-ink">Ready to compose the prompt</div>
                <p className="mt-0.5 max-w-[62ch] text-[11px] leading-[1.5] text-ink-3">
                  The brief stays attached. Confirmed requirements are treated as facts;{" "}
                  {brief.assumptions.length} assumption{brief.assumptions.length === 1 ? "" : "s"} and{" "}
                  {brief.unknowns.length} open question{brief.unknowns.length === 1 ? "" : "s"} are carried separately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={generating}
                className={buttonClass({ variant: "primary", size: "lg", className: "min-w-[190px]" })}
                aria-busy={generating}
              >
                {generating ? "Composing…" : "Generate prompt"}
                <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            {generating ? (
              <div className="mt-3 border-t border-line-soft pt-3">
                <LoadingLine label={`Writing a ${getPromptDepth(depth).label.toLowerCase()} prompt`} />
              </div>
            ) : null}
            {formError ? (
              <p className="mt-2 text-[11px] text-[var(--danger-text)]" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
              <button
                type="button"
                onClick={() => setStep("brief")}
                className={buttonClass({ variant: "ghost", size: "sm" })}
              >
                <ArrowLeft size={12} aria-hidden="true" />
                Back to brief
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode("advanced")}
                className={buttonClass({ variant: "ghost", size: "sm" })}
              >
                <Wand2 size={12} aria-hidden="true" />
                Fine-tune in Advanced Mode
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {step === "output" && brief ? (
        <section className="enter-rise space-y-3">
          <SectionLabel index="06" label="Your prompt" detail={category.label} />
          {generationError ? (
            <Notice tone="error" title="Generation failed — local draft shown">
              {generationError.message} The draft below is assembled locally and labelled as a local draft.
            </Notice>
          ) : null}

          <PromptWorkspace
            prompt={promptText}
            title={title}
            generated={generated}
            depthLabel={getPromptDepth(depth).label}
            agentLabel={getAgentProfile(targetAgent).label}
            onPromptChange={(value) => setPromptText(value)}
            onTitleChange={setTitle}
            onRegenerate={() => void generate()}
            regenerating={generating}
            onBack={() => setStep("tuning")}
            backLabel="Depth & agent"
            onSave={() => setSaveDialogOpen(true)}
            onAnalyze={openAnalyzer}
            savedSessionId={savedSessionId}
            saveDisabled={!promptText.trim()}
            idPrefix="guided-prompt"
          />
        </section>
      ) : null}

      {step !== "idea" && step !== "interview" && step !== "brief" && step !== "tuning" && step !== "output" ? (
        <Notice tone="info" title="Ready when you are">
          Start with your idea.
        </Notice>
      ) : null}

      <SavePromptDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        defaultTitle={title || brief?.title || deriveTitle(promptText)}
        category={category.label}
        versionCount={1}
        onSave={handleSave}
      />
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  CircleDot,
  Plus,
  RotateCcw,
  ScanSearch,
  Sparkles,
  X,
} from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { LabeledInput, LabeledTextarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PromptEditor } from "@/components/ui/prompt-editor";
import { Slider } from "@/components/ui/slider";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { useToast } from "@/components/ui/toast";
import { DirectionProfile } from "@/components/builder/direction-profile";
import { categories, getCategory } from "@/config/app";
import {
  constraintOptions,
  defaultSliders,
  emptyConfiguration,
  outputRequirementOptions,
  presets,
  sliderDefinitions,
  visualPreferenceOptions,
} from "@/config/presets";
import { buildDraftPrompt } from "@/lib/prompt/draft";
import { savePendingPrompt } from "@/lib/storage/pending-prompt";
import { cn } from "@/lib/utils";
import { firstIssue, promptConfigurationSchema } from "@/lib/validation/schemas";
import type { GeneratedPrompt, PromptConfiguration, SliderKey } from "@/types/prompt";

function SectionLabel({ index, label, detail }: { index: string; label: string; detail?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line-soft pb-2.5">
      <h2 className="flex items-baseline gap-2.5 text-[12px] font-medium text-ink">
        <span className="font-mono text-[9px] tracking-[0.1em] text-ink-3">{index}</span>
        {label}
      </h2>
      {detail ? <span className="mono-label">{detail}</span> : null}
    </div>
  );
}

export function BuilderView() {
  const router = useRouter();
  const { showToast } = useToast();
  const [configuration, setConfiguration] = useState<PromptConfiguration>(emptyConfiguration);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customConstraint, setCustomConstraint] = useState("");
  const [generated, setGenerated] = useState<GeneratedPrompt | null>(null);
  const [promptText, setPromptText] = useState("");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const category = getCategory(configuration.category);

  const selectedPreset = useMemo(() => {
    const match = presets.find((preset) =>
      sliderDefinitions.every(
        (definition) => preset.values[definition.key as SliderKey] === configuration.sliders[definition.key as SliderKey],
      ),
    );
    return match?.id ?? null;
  }, [configuration.sliders]);

  const completion = useMemo(() => {
    const checks = [
      configuration.objective.trim().length >= 12,
      configuration.audience.trim().length > 0,
      configuration.context.trim().length > 0,
      configuration.visualPreferences.length > 0,
      configuration.outputRequirements.length > 0,
      configuration.constraints.length > 0,
    ];
    return { done: checks.filter(Boolean).length, total: checks.length };
  }, [configuration]);

  function update<K extends keyof PromptConfiguration>(key: K, value: PromptConfiguration[K]) {
    setConfiguration((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[String(key)]) return current;
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }

  function setSlider(key: SliderKey, value: number) {
    setConfiguration((current) => ({ ...current, sliders: { ...current.sliders, [key]: value } }));
  }

  function applyPreset(id: string) {
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;
    setConfiguration((current) => ({ ...current, sliders: { ...preset.values } }));
    showToast(`${preset.label} preset applied to eight parameters.`, "info");
  }

  function toggleValue(key: "visualPreferences" | "outputRequirements" | "constraints", value: string) {
    const current = configuration[key];
    const limit = key === "visualPreferences" ? 10 : key === "outputRequirements" ? 8 : 12;
    if (!current.includes(value) && current.length >= limit) {
      showToast(`Choose up to ${limit} options in this group.`, "error");
      return;
    }
    update(
      key,
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function addCustomConstraint() {
    const value = customConstraint.trim();
    if (!value) return;
    if (configuration.constraints.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setCustomConstraint("");
      return;
    }
    if (configuration.constraints.length >= 12) {
      showToast("Choose up to 12 constraints.", "error");
      return;
    }
    update("constraints", [...configuration.constraints, value]);
    setCustomConstraint("");
  }

  function handleGenerate() {
    const parsed = promptConfigurationSchema.safeParse(configuration);
    if (!parsed.success) {
      const nextErrors = firstIssue(parsed.error);
      setErrors(nextErrors);
      showToast("Complete the required direction fields before generating.", "error");
      if (nextErrors.objective) document.getElementById("objective")?.focus();
      return;
    }

    setErrors({});
    setGenerating(true);
    // Milestone 2 preview: this is a local, deterministic draft — never labelled as AI.
    window.requestAnimationFrame(() => {
      const draft = buildDraftPrompt(parsed.data);
      setGenerated(draft);
      setPromptText(draft.prompt);
      setTitle(draft.title);
      setGenerating(false);
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Structured draft created from your direction. Edit any part before analysis.", "success");
    });
  }

  function resetConfiguration() {
    setConfiguration(emptyConfiguration);
    setCustomConstraint("");
    setErrors({});
    setGenerated(null);
    setPromptText("");
    setTitle("");
    showToast("Direction reset to defaults.", "info");
  }

  function openAnalyzer() {
    if (!promptText.trim()) return;
    savePendingPrompt({
      prompt: promptText,
      title: title || generated?.title || "Untitled prompt",
      category: configuration.category,
      configuration,
      generated: generated ?? undefined,
      createdAt: new Date().toISOString(),
    });
    router.push("/analyzer");
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-12">
      <WorkspaceHeader
        title="Prompt Builder"
        description="Define the direction first. Configuration is local until you generate; the prompt remains editable after it is built."
        actions={
          <>
            <span className="hidden items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3 sm:flex">
              <CircleDot size={11} className="text-orange" aria-hidden="true" />
              {completion.done}/{completion.total} direction signals
            </span>
            <button type="button" onClick={resetConfiguration} className={buttonClass({ variant: "ghost", size: "sm" })}>
              <RotateCcw size={13} strokeWidth={1.7} aria-hidden="true" />
              Reset
            </button>
          </>
        }
      />

      <div className="grid gap-8 py-7 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-7">
          <section>
            <SectionLabel index="01" label="Category" detail="Initial scope" />
            <fieldset>
              <legend className="sr-only">Prompt category</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((item) => {
                  const active = configuration.category === item.id;
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-[7px] border p-3.5 transition-[border-color,background-color] duration-150",
                        active
                          ? "border-[#5a402b] bg-[#1a1510]"
                          : "border-line bg-bg-raised hover:border-[#3b424a]",
                      )}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={item.id}
                        checked={active}
                        onChange={() => update("category", item.id)}
                        className="mt-0.5 h-3.5 w-3.5 accent-[#FF9B54]"
                      />
                      <span>
                        <span className="flex items-center gap-2 text-[12px] font-medium text-ink">
                          {item.label}
                          {active ? <Badge tone="medium">Active</Badge> : null}
                        </span>
                        <span className="mt-1 block text-[11px] leading-[1.5] text-ink-3">
                          {item.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </section>

          <section className="mt-7">
            <SectionLabel index="02" label="Objective" detail="Required" />
            <LabeledTextarea
              id="objective"
              label="What should the AI design?"
              hint="State the deliverable and the job it must do. Be concrete, not promotional."
              value={configuration.objective}
              onChange={(event) => update("objective", event.target.value)}
              placeholder="Design a calm analytics dashboard for a subscription operations team…"
              maxLength={600}
              required
              error={errors.objective}
              rows={4}
            />
          </section>

          <section className="mt-7">
            <SectionLabel index="03" label="Context" detail="Optional" />
            <div className="rounded-[7px] border border-line bg-bg-raised px-4">
              <Disclosure title="Audience and project background" description="Improves context accuracy">
                <div className="grid gap-4 pt-1 sm:grid-cols-2">
                  <LabeledInput
                    label="Target audience"
                    value={configuration.audience}
                    onChange={(event) => update("audience", event.target.value)}
                    placeholder="Operations leads at a B2B SaaS company"
                    maxLength={240}
                    hint="Who is this for?"
                    error={errors.audience}
                  />
                  <div className="sm:col-span-2">
                    <LabeledTextarea
                      label="Design context"
                      value={configuration.context}
                      onChange={(event) => update("context", event.target.value)}
                      placeholder="The product helps teams review subscription churn. It needs to feel trustworthy, not playful…"
                      maxLength={1500}
                      hint="Purpose, environment, existing brand, or constraints that change the direction."
                      error={errors.context}
                      rows={3}
                    />
                  </div>
                </div>
              </Disclosure>
              <Disclosure title="Visual direction" description={`${configuration.visualPreferences.length} selected`}>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {visualPreferenceOptions.map((option) => (
                    <ToggleChip
                      key={option}
                      label={option}
                      active={configuration.visualPreferences.includes(option)}
                      onClick={() => toggleValue("visualPreferences", option)}
                    />
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] leading-[1.5] text-ink-3">
                  Pick two to four. The generated prompt will treat these as direction, not a finished palette.
                </p>
              </Disclosure>
              <Disclosure title="Output requirements" description={`${configuration.outputRequirements.length} selected`}>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {outputRequirementOptions.map((option) => (
                    <ToggleChip
                      key={option}
                      label={option}
                      active={configuration.outputRequirements.includes(option)}
                      onClick={() => toggleValue("outputRequirements", option)}
                    />
                  ))}
                </div>
              </Disclosure>
              <Disclosure title="Additional constraints" description={`${configuration.constraints.length} selected`}>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {constraintOptions.map((option) => (
                    <ToggleChip
                      key={option}
                      label={option}
                      active={configuration.constraints.includes(option)}
                      onClick={() => toggleValue("constraints", option)}
                    />
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={customConstraint}
                    onChange={(event) => setCustomConstraint(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustomConstraint();
                      }
                    }}
                    placeholder="Add a specific constraint"
                    aria-label="Custom constraint"
                    maxLength={120}
                    className="h-8 min-w-0 flex-1 rounded-[5px] border border-line bg-bg px-2.5 text-[12px] text-ink placeholder:text-ink-3 focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/15"
                  />
                  <button
                    type="button"
                    onClick={addCustomConstraint}
                    className={buttonClass({ variant: "secondary", size: "sm" })}
                  >
                    <Plus size={13} aria-hidden="true" />
                    Add
                  </button>
                </div>
                {configuration.constraints.length > 0 ? (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Selected constraints">
                    {configuration.constraints.map((constraint) => (
                      <li
                        key={constraint}
                        className="inline-flex h-7 items-center gap-1.5 rounded-[4px] border border-line bg-surface px-2 text-[11px] text-ink-2"
                      >
                        {constraint}
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              "constraints",
                              configuration.constraints.filter((item) => item !== constraint),
                            )
                          }
                          className="text-ink-3 hover:text-ink"
                          aria-label={`Remove ${constraint}`}
                        >
                          <X size={10} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Disclosure>
            </div>
          </section>

          <section className="mt-7">
            <SectionLabel index="04" label="Focus parameters" detail="0—100 each" />
            <div className="rounded-[7px] border border-line bg-bg-raised p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[12px] font-medium text-ink">Presets</div>
                  <p className="mt-0.5 text-[11px] text-ink-3">Set all eight parameters at once.</p>
                </div>
                <Badge tone={selectedPreset ? "medium" : "neutral"}>
                  {selectedPreset ? presets.find((preset) => preset.id === selectedPreset)?.label : "Custom"}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {presets.map((preset) => {
                  const active = selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      aria-pressed={active}
                      title={preset.description}
                      className={cn(
                        "group relative flex flex-col gap-2 rounded-[5px] border px-2.5 py-2 text-left transition-[border-color,background-color,color] duration-150",
                        active
                          ? "border-[#5a402b] bg-[#1a1510]"
                          : "border-line bg-bg hover:border-[#3b424a] hover:bg-surface",
                      )}
                    >
                      <span className="flex h-6 items-end gap-[2px]" aria-hidden="true">
                        {sliderDefinitions.map((definition) => (
                          <span
                            key={definition.key}
                            className={cn(
                              "w-[3px] rounded-[1px]",
                              active ? "bg-orange" : "bg-[#3a4149] group-hover:bg-[#4a525b]",
                            )}
                            style={{ height: `${Math.max(12, preset.values[definition.key as SliderKey] * 0.24)}px` }}
                          />
                        ))}
                      </span>
                      <span className={cn("text-[11px] leading-[1.25]", active ? "text-ink" : "text-ink-2")}>
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid gap-x-7 sm:grid-cols-2">
                {sliderDefinitions.map((definition) => (
                  <Slider
                    key={definition.key}
                    id={`slider-${definition.key}`}
                    label={definition.label}
                    description={definition.description}
                    value={configuration.sliders[definition.key as SliderKey]}
                    defaultValue={defaultSliders[definition.key as SliderKey]}
                    onChange={(value) => setSlider(definition.key as SliderKey, value)}
                  />
                ))}
              </div>
            </div>
          </section>

          <div className="mt-7 rounded-[7px] border border-line bg-bg-raised p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[12px] font-medium text-ink">Ready to compose?</div>
                <p className="mt-0.5 max-w-[54ch] text-[11px] leading-[1.5] text-ink-3">
                  This milestone builds a structured local draft from your configuration. AI generation uses the
                  same interface when the provider is connected.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className={buttonClass({ variant: "primary", size: "lg", className: "min-w-[170px]" })}
                aria-busy={generating}
              >
                {generating ? "Composing…" : "Generate prompt"}
                <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            {errors.objective ? (
              <p className="mt-2 text-[11px] text-[#f0a1a5]" role="alert">
                {errors.objective}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="min-w-0 lg:col-span-5">
          <div ref={previewRef} className="scroll-mt-6 lg:sticky lg:top-6">
            <div className="rounded-[8px] border border-line bg-bg-raised">
              <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
                <span className="mono-label">Direction profile</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                  {selectedPreset ? "Preset" : "Custom"}
                </span>
              </div>
              <div className="flex justify-center py-4">
                <DirectionProfile sliders={configuration.sliders} size={210} />
              </div>
              <div className="grid grid-cols-2 border-t border-line-soft sm:grid-cols-4">
                {[
                  ["Hierarchy", configuration.sliders.visualHierarchy],
                  ["Type", configuration.sliders.typography],
                  ["Detail", configuration.sliders.detail],
                  ["Consistency", configuration.sliders.consistency],
                ].map(([label, value]) => (
                  <div key={String(label)} className="border-r border-line-soft px-3 py-2.5 last:border-r-0">
                    <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-3">{label}</div>
                    <div className="mt-1 font-mono text-[14px] tabular text-ink-2">
                      {String(value).padStart(3, "0")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[12px] font-medium text-ink">Prompt output</h2>
                <div className="flex items-center gap-2">
                  <Badge tone={generated?.source === "draft" ? "medium" : "neutral"}>
                    {generated ? "Local draft" : "Not generated"}
                  </Badge>
                  <span className="font-mono text-[9px] text-ink-3">{category.shortLabel}</span>
                </div>
              </div>

              {!generated ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[8px] border border-dashed border-line px-6 py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-bg">
                    <ScanSearch size={20} strokeWidth={1.4} className="text-ink-3" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 font-display text-[21px] font-medium tracking-[-0.02em]">
                    Your prompt will take shape here.
                  </h3>
                  <p className="mt-2 max-w-[38ch] text-[12px] leading-[1.6] text-ink-3">
                    Complete the objective, then generate. The draft includes objective, audience, direction,
                    composition, typography, constraints, output requirements, and calibration.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                    {["Editable", "Copyable", "Ready to analyze"].map((item) => (
                      <span key={item} className="flex items-center gap-1.5">
                        <Check size={10} className="text-green" aria-hidden="true" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="enter-rise space-y-3">
                  <div>
                    <label htmlFor="prompt-title" className="sr-only">
                      Prompt title
                    </label>
                    <input
                      id="prompt-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={160}
                      className="w-full border-0 border-b border-line-soft bg-transparent pb-2 font-display text-[21px] font-medium tracking-[-0.02em] text-ink focus:border-orange focus:outline-none"
                      placeholder="Prompt title"
                    />
                  </div>

                  {generated.source === "draft" ? (
                    <Notice tone="demo" title="Local draft — not an AI response">
                      This preview is assembled from your configuration. Provider generation replaces it when a Gemini
                      key is configured.
                    </Notice>
                  ) : null}

                  <PromptEditor
                    id="builder-prompt"
                    label="Editable prompt"
                    value={promptText}
                    onChange={setPromptText}
                    minHeight={340}
                    hint="Edit freely. The original draft remains in this workspace until you reset."
                  />

                  {generated.assumptions.length > 0 || generated.recommendations.length > 0 ? (
                    <div className="rounded-[7px] border border-line bg-bg-raised px-3.5 py-2">
                      {generated.assumptions.length > 0 ? (
                        <Disclosure title="Assumptions" description={`${generated.assumptions.length}`}>
                          <ul className="space-y-1.5 text-[11.5px] leading-[1.55] text-ink-2">
                            {generated.assumptions.map((item) => (
                              <li key={item} className="flex gap-2">
                                <span className="text-ink-3">—</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </Disclosure>
                      ) : null}
                      {generated.recommendations.length > 0 ? (
                        <Disclosure title="Recommended considerations" description={`${generated.recommendations.length}`}>
                          <ul className="space-y-1.5 text-[11.5px] leading-[1.55] text-ink-2">
                            {generated.recommendations.map((item) => (
                              <li key={item} className="flex gap-2">
                                <span className="text-ink-3">—</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </Disclosure>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={openAnalyzer} className={buttonClass({ variant: "primary", size: "md" })}>
                      <ScanSearch size={14} strokeWidth={1.8} aria-hidden="true" />
                      Analyze prompt
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className={buttonClass({ variant: "secondary", size: "md" })}
                    >
                      Rebuild draft
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGenerated(null);
                        setPromptText("");
                        setTitle("");
                      }}
                      className={buttonClass({ variant: "ghost", size: "md" })}
                    >
                      Clear output
                    </button>
                    <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                      <span className="h-1 w-1 rounded-full bg-green" aria-hidden="true" />
                      Editable
                    </span>
                  </div>

                  <div className="border-t border-line-soft pt-3">
                    <Disclosure title="Prompt structure" description={`${generated.sections.length} sections`}>
                      <ol className="space-y-2">
                        {generated.sections.map((section, index) => (
                          <li key={section.heading} className="grid grid-cols-[20px_1fr] gap-2 text-[11.5px]">
                            <span className="font-mono text-[9px] text-ink-3">0{index + 1}</span>
                            <span>
                              <span className="text-ink-2">{section.heading}</span>
                              <span className="mt-0.5 block truncate text-[11px] text-ink-3">{section.content}</span>
                            </span>
                          </li>
                        ))}
                      </ol>
                    </Disclosure>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-start justify-between gap-4 border-t border-line-soft pt-3">
              <p className="max-w-[46ch] text-[10.5px] leading-[1.5] text-ink-3">
                Generated prompts are instructions, not executed code. Review the output before use.
              </p>
              <a
                href="/docs"
                className="inline-flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 hover:text-ink"
              >
                How scoring works
                <ArrowUpRight size={11} aria-hidden="true" />
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

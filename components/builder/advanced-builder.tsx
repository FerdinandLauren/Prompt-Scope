"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Field, LabeledInput, LabeledTextarea, Select } from "@/components/ui/field";
import { Notice, LoadingLine } from "@/components/ui/notice";
import { Slider } from "@/components/ui/slider";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { useToast } from "@/components/ui/toast";
import { DirectionProfile } from "@/components/builder/direction-profile";
import { PromptWorkspace } from "@/components/builder/prompt-workspace";
import { categories, categoryGroups, getCategory } from "@/config/app";
import {
  agentProfiles,
  getAgentProfile,
  getPromptDepth,
  promptDepths,
} from "@/config/domains";
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
import { postJson, type ApiError } from "@/lib/api/client";
import { savePendingPrompt } from "@/lib/storage/pending-prompt";
import { createSession } from "@/lib/storage/prompt-storage";
import { SavePromptDialog } from "@/components/history/session-detail";
import { deriveTitle } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { firstIssue, promptConfigurationSchema } from "@/lib/validation/schemas";
import type { GeneratedPrompt, PromptConfiguration, SliderKey } from "@/types/prompt";
import type { PromptDepth, TargetAgentId } from "@/types/guided";

function SectionLabel({ index, label, detail }: { index: string; label: string; detail?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-5 border-b border-line-soft pb-2.5">
      <h2 className="flex items-baseline gap-2.5 text-[12px] font-medium text-ink">
        <span className="font-mono text-[9px] tracking-[0.1em] text-ink-3">{index}</span>
        {label}
      </h2>
      {detail ? <span className="mono-label">{detail}</span> : null}
    </div>
  );
}

export function AdvancedBuilder({
  configuration,
  onConfigurationChange,
  onSwitchMode,
}: {
  configuration: PromptConfiguration;
  onConfigurationChange: (next: PromptConfiguration) => void;
  onSwitchMode: (mode: "guided") => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customConstraint, setCustomConstraint] = useState("");
  const [generated, setGenerated] = useState<GeneratedPrompt | null>(null);
  const [generationError, setGenerationError] = useState<ApiError | null>(null);
  const [promptText, setPromptText] = useState("");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
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
    onConfigurationChange({ ...configuration, [key]: value });
    setErrors((current) => {
      if (!current[String(key)]) return current;
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }

  function setSlider(key: SliderKey, value: number) {
    onConfigurationChange({ ...configuration, sliders: { ...configuration.sliders, [key]: value } });
  }

  function applyPreset(id: string) {
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;
    onConfigurationChange({ ...configuration, sliders: { ...preset.values } });
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

  async function handleGenerate() {
    const parsed = promptConfigurationSchema.safeParse(configuration);
    if (!parsed.success) {
      const nextErrors = firstIssue(parsed.error);
      setErrors(nextErrors);
      showToast("Complete the required direction fields before generating.", "error");
      if (nextErrors.objective) document.getElementById("objective")?.focus();
      return;
    }

    setErrors({});
    setGenerationError(null);
    setGenerating(true);

    const result = await postJson<GeneratedPrompt>("/api/ai/generate", {
      configuration: parsed.data,
    });

    setGenerating(false);

    if (!result.ok) {
      // The local composer is always available, so a provider failure is recoverable.
      setGenerationError(result.error);
      showToast(result.error.message, "error");
      return;
    }

    setGenerated(result.data);
    setPromptText(result.data.prompt);
    setTitle(result.data.title);
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(
      result.data.source === "live"
        ? "Prompt generated. Review and edit before analysis."
        : "Demo Mode composed a structured prompt from your direction.",
      result.data.source === "live" ? "success" : "info",
    );
  }

  function useLocalDraft() {
    const parsed = promptConfigurationSchema.safeParse(configuration);
    if (!parsed.success) return;
    const draft = buildDraftPrompt(parsed.data);
    setGenerated(draft);
    setPromptText(draft.prompt);
    setTitle(draft.title);
    setGenerationError(null);
    showToast("Local draft created. It is labelled as a local draft, not an AI response.", "info");
  }

  function resetConfiguration() {
    onConfigurationChange(emptyConfiguration);
    setCustomConstraint("");
    setErrors({});
    setGenerated(null);
    setGenerationError(null);
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

  function handleSavePrompt(sessionTitle: string) {
    try {
      const session = createSession({
        title: sessionTitle,
        category: configuration.category,
        promptText,
        source: generated?.source === "draft" ? "manual" : "generated",
        label: generated?.source === "draft" ? "Local draft" : generated?.source === "demo" ? "Demo data" : "Generated",
        configuration,
      });
      setTitle(sessionTitle);
      setSaveDialogOpen(false);
      setSavedSessionId(session.id);
      showToast("Prompt saved to history as version 1.");
    } catch (saveError) {
      showToast(saveError instanceof Error ? saveError.message : "The prompt could not be saved.", "error");
    }
  }

  return (
    <div className="py-8 sm:py-9">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line-soft pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
            {completion.done}/{completion.total} direction signals
          </span>
          <button
            type="button"
            onClick={() => onSwitchMode("guided")}
            className={buttonClass({ variant: "ghost", size: "sm" })}
          >
            Guided Mode instead
          </button>
        </div>
        <button type="button" onClick={resetConfiguration} className={buttonClass({ variant: "ghost", size: "sm" })}>
          <RotateCcw size={13} strokeWidth={1.7} aria-hidden="true" />
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-14">
        <div className="min-w-0">
          <section>
            <SectionLabel index="01" label="Category" detail="Initial scope" />
            <Field label="Category" hint={category.description}>
              <Select
                value={configuration.category}
                onChange={(event) => update("category", event.target.value as PromptConfiguration["category"])}
                aria-label="Prompt category"
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
          </section>

          <section className="mt-10">
            <SectionLabel index="02" label="Objective" detail="Required" />
            <LabeledTextarea
              id="objective"
              label="What should the AI produce or change?"
              hint="State the deliverable and the job it must do. Be concrete, not promotional."
              value={configuration.objective}
              onChange={(event) => update("objective", event.target.value)}
              placeholder="Design a calm analytics dashboard for a subscription operations team…"
              maxLength={1200}
              required
              error={errors.objective}
              rows={4}
            />
          </section>

          <section className="mt-10">
            <SectionLabel
              index="03"
              label="Prompt shape"
              detail={`${getPromptDepth(configuration.depth).label} · ${getAgentProfile(configuration.targetAgent).label}`}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Depth" hint="How much implementable detail the prompt should contain.">
                <Select
                  value={configuration.depth ?? "balanced"}
                  onChange={(event) => update("depth", event.target.value as PromptDepth)}
                  aria-label="Prompt depth"
                >
                  {promptDepths.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label} — {profile.summary}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Target agent" hint="The receiving AI. Coding agents add inspection and verification sections.">
                <Select
                  value={configuration.targetAgent ?? "general"}
                  onChange={(event) => update("targetAgent", event.target.value as TargetAgentId)}
                  aria-label="Target agent"
                >
                  {agentProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </section>

          <section className="mt-10">
            <SectionLabel index="04" label="Context" detail="Optional" />
            <div className="rounded-[8px] border border-line-soft bg-bg-raised px-5">
              <Disclosure title="Audience and project background" description="Improves context accuracy">
                <div className="grid gap-5 pt-1 sm:grid-cols-2">
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

          <section className="mt-10">
            <SectionLabel index="05" label="Focus parameters" detail="0-100 each" />
            <div className="rounded-[7px] border border-line bg-bg-raised p-5">
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
                          ? "border-[var(--accent-border)] bg-[var(--accent-bg)]"
                          : "border-line bg-bg hover:border-[var(--line-strong)] hover:bg-surface",
                      )}
                    >
                      <span className="flex h-6 items-end gap-[2px]" aria-hidden="true">
                        {sliderDefinitions.map((definition) => (
                          <span
                            key={definition.key}
                            className={cn(
                              "w-[3px] rounded-[1px]",
                              active ? "bg-orange" : "bg-[var(--bar)] group-hover:bg-[var(--bar-hover)]",
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

              <div className="mt-2 grid gap-x-10 sm:grid-cols-2">
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

          <div className="mt-10 rounded-[7px] border border-line bg-bg-raised p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[12px] font-medium text-ink">Ready to compose?</div>
                <p className="mt-0.5 max-w-[54ch] text-[11px] leading-[1.5] text-ink-3">
                  Generation runs on the server. Without a configured key, Demo Mode composes the prompt locally
                  and labels it as demo data.
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
            {generating ? (
              <div className="mt-3 border-t border-line-soft pt-3">
                <LoadingLine label="Composing structured prompt" />
              </div>
            ) : null}
            {generationError ? (
              <Notice
                tone="error"
                title="Generation failed"
                className="mt-3"
                action={
                  <button
                    type="button"
                    onClick={useLocalDraft}
                    className={buttonClass({ variant: "secondary", size: "sm" })}
                  >
                    Use local draft
                  </button>
                }
              >
                {generationError.message} Your configuration is unchanged.
              </Notice>
            ) : null}
            {errors.objective ? (
              <p className="mt-2 text-[11px] text-[var(--danger-text)]" role="alert">
                {errors.objective}
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <section>
            <SectionLabel index="06" label="Direction profile" detail={selectedPreset ? "Preset" : "Custom"} />
            <div className="rounded-[8px] border border-line bg-bg-raised">
              <div className="flex justify-center py-6 sm:py-7">
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
          </section>

          <div ref={previewRef} className="mt-12 scroll-mt-6">
            <SectionLabel
              index="07"
              label="Prompt output"
              detail={`${category.shortLabel}${generated ? ` · ${generated.sections.length} sections` : ""}`}
            />

            {!generated ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[8px] border border-dashed border-line px-6 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-bg">
                  <Sparkles size={20} strokeWidth={1.4} className="text-ink-3" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-display text-[21px] font-medium tracking-[-0.02em]">
                  Your prompt will take shape here.
                </h3>
                <p className="mt-2 max-w-[42ch] text-[12px] leading-[1.6] text-ink-3">
                  Complete the objective, choose a depth and target agent, then generate. The result is editable,
                  section-copyable, exportable, saveable, and ready for analysis.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                  {["Editable", "Copyable", "Exportable", "Ready to analyze"].map((item) => (
                    <span key={item} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-green" aria-hidden="true" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <PromptWorkspace
                prompt={promptText}
                title={title}
                generated={generated}
                depthLabel={configuration.depth ? getPromptDepth(configuration.depth).label : undefined}
                agentLabel={configuration.targetAgent ? getAgentProfile(configuration.targetAgent).label : undefined}
                onPromptChange={setPromptText}
                onTitleChange={setTitle}
                onRegenerate={handleGenerate}
                regenerating={generating}
                onSave={() => setSaveDialogOpen(true)}
                onAnalyze={openAnalyzer}
                savedSessionId={savedSessionId}
                saveDisabled={!promptText.trim()}
                idPrefix="advanced-prompt"
              />
            )}

            <div className="mt-5 flex items-start justify-between gap-5 border-t border-line-soft pt-3">
              <p className="max-w-[46ch] text-[10.5px] leading-[1.5] text-ink-3">
                Generated prompts are instructions, not executed code. Review the output before use.
              </p>
              <Link
                href="/docs"
                className="inline-flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 hover:text-ink"
              >
                How scoring works
              </Link>
            </div>
          </div>
        </div>
      </div>

      <SavePromptDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        defaultTitle={title || generated?.title || deriveTitle(promptText)}
        category={category.label}
        versionCount={1}
        onSave={handleSavePrompt}
      />
    </div>
  );
}

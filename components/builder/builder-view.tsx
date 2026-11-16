"use client";

import { useCallback, useSyncExternalStore } from "react";
import { CircleDot, Compass, SlidersHorizontal } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Badge } from "@/components/ui/badge";
import { GuidedBuilder } from "@/components/builder/guided-builder";
import { AdvancedBuilder } from "@/components/builder/advanced-builder";
import {
  getBuilderDraftServerSnapshot,
  getBuilderDraftSnapshot,
  subscribeBuilderDraft,
  updateBuilderDraft,
  type BuilderDraft,
  type BuilderMode,
} from "@/lib/storage/builder-draft";
import { cn } from "@/lib/utils";
import type { PromptConfiguration } from "@/types/prompt";

const modeCopy: Record<BuilderMode, { label: string; description: string; icon: typeof Compass }> = {
  guided: {
    label: "Guided",
    description: "Turn an incomplete idea into a brief, then into a prompt.",
    icon: Compass,
  },
  advanced: {
    label: "Advanced",
    description: "Control every parameter directly.",
    icon: SlidersHorizontal,
  },
};

export function BuilderView() {
  const draft = useSyncExternalStore(
    subscribeBuilderDraft,
    getBuilderDraftSnapshot,
    getBuilderDraftServerSnapshot,
  );

  const handleGuidedChange = useCallback((guided: BuilderDraft["guided"]) => {
    updateBuilderDraft((current) => ({ ...current, guided }));
  }, []);

  const handleConfigurationChange = useCallback((configuration: PromptConfiguration) => {
    updateBuilderDraft((current) => ({ ...current, configuration }));
  }, []);

  const handleMode = useCallback((mode: BuilderMode) => {
    updateBuilderDraft((current) => ({ ...current, mode }));
  }, []);

  const mode = draft.mode;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-20 sm:px-8 sm:pb-24 lg:px-10">
      <WorkspaceHeader
        title="Prompt Builder"
        description={
          mode === "guided"
            ? "Describe the idea, answer a few focused questions, review the brief, then choose how deep the prompt should go."
            : "Set the category, objective, depth, target agent, and parameters yourself. The prompt stays editable and local until you generate."
        }
        actions={
          <span className="hidden items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3 sm:flex">
            <CircleDot size={11} className="text-orange" aria-hidden="true" />
            {mode === "guided" ? "Guided discovery" : "Direct control"}
          </span>
        }
      />

      <div className="flex flex-col gap-3 border-b border-line-soft py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Builder mode" className="inline-flex rounded-[6px] border border-line p-0.5">
            {(Object.keys(modeCopy) as BuilderMode[]).map((item) => {
              const config = modeCopy[item];
              const Icon = config.icon;
              const active = mode === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleMode(item)}
                  className={cn(
                    "flex h-7 items-center gap-1.5 rounded-[4px] px-2.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors duration-150",
                    active ? "bg-surface text-ink" : "text-ink-3 hover:text-ink-2",
                  )}
                >
                  <Icon size={11} aria-hidden="true" />
                  {config.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] leading-[1.5] text-ink-3">{modeCopy[mode].description}</p>
        </div>
        <Badge tone="neutral">Switching modes keeps your configuration</Badge>
      </div>

      <div className={mode === "guided" ? undefined : "hidden"}>
        <GuidedBuilder
          configuration={draft.configuration}
          onConfigurationChange={handleConfigurationChange}
          initialGuided={draft.guided}
          onGuidedChange={handleGuidedChange}
          onSwitchMode={handleMode}
        />
      </div>

      <div className={mode === "advanced" ? undefined : "hidden"}>
        <AdvancedBuilder
          configuration={draft.configuration}
          onConfigurationChange={handleConfigurationChange}
          onSwitchMode={handleMode}
        />
      </div>
    </div>
  );
}

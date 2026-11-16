"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  PencilLine,
  RotateCw,
  Save,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Notice } from "@/components/ui/notice";
import { PromptEditor } from "@/components/ui/prompt-editor";
import { useToast } from "@/components/ui/toast";
import { PROMPT_LIMITS } from "@/config/app";
import { copyText, cn } from "@/lib/utils";
import type { GeneratedPrompt } from "@/types/prompt";

export type PromptSectionView = {
  id: string;
  heading: string;
  body: string;
};

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "prompt"
  );
}

/**
 * Sections are taken from the current text, not from the originally generated
 * list, so copying a section still works after the user edits the prompt.
 */
export function splitPromptSections(prompt: string): PromptSectionView[] {
  const lines = prompt.replace(/\r\n/g, "\n").split("\n");
  const sections: PromptSectionView[] = [];
  let current: PromptSectionView | null = null;
  const preface: string[] = [];

  for (const line of lines) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) {
      if (current) sections.push(current);
      current = { id: `section-${sections.length + 1}`, heading: match[1]!, body: "" };
      continue;
    }

    if (current) {
      current.body = current.body ? `${current.body}\n${line}` : line;
    } else {
      preface.push(line);
    }
  }

  if (current) sections.push(current);

  const prefaceText = preface.join("\n").replace(/^#\s+.*$/m, "").trim();
  if (prefaceText) {
    sections.unshift({ id: "overview", heading: "Overview", body: prefaceText });
  }

  if (sections.length === 0) {
    return [{ id: "prompt", heading: "Prompt", body: prompt.trim() }];
  }

  return sections.map((section, index) => ({
    ...section,
    id: `${section.id}-${index + 1}`,
    body: section.body.trim(),
  }));
}

function InlineBlocks({ body }: { body: string }) {
  const blocks = useMemo(() => {
    const result: Array<{ type: "paragraph" | "list" | "ordered"; items: string[]; text?: string }> = [];
    const paragraphs = body.split(/\n{2,}/);

    for (const paragraph of paragraphs) {
      const lines = paragraph.split("\n").filter((line) => line.trim().length > 0);
      if (lines.length === 0) continue;

      if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
        result.push({
          type: "list",
          items: lines.map((line) => line.replace(/^\s*[-*]\s+/, "")),
        });
        continue;
      }

      if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
        result.push({
          type: "ordered",
          items: lines.map((line) => line.replace(/^\s*\d+\.\s+/, "")),
        });
        continue;
      }

      result.push({ type: "paragraph", items: [], text: paragraph.trim() });
    }

    return result;
  }, [body]);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) =>
        block.type === "paragraph" ? (
          <p key={index} className="whitespace-pre-wrap text-[12.5px] leading-[1.75] text-ink-2">
            {block.text}
          </p>
        ) : block.type === "list" ? (
          <ul key={index} className="space-y-1.5 pl-1">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex gap-2.5 text-[12.5px] leading-[1.6] text-ink-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--bar)]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <ol key={index} className="space-y-1.5 pl-1">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="grid grid-cols-[20px_1fr] gap-2 text-[12.5px] leading-[1.6] text-ink-2">
                <span className="font-mono text-[10px] text-ink-3">{String(itemIndex + 1).padStart(2, "0")}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        ),
      )}
    </div>
  );
}

export function PromptWorkspace({
  prompt,
  title,
  generated,
  depthLabel,
  agentLabel,
  onPromptChange,
  onTitleChange,
  onRegenerate,
  regenerating,
  onBack,
  backLabel,
  onSave,
  onAnalyze,
  savedSessionId,
  saveDisabled,
  idPrefix = "prompt-workspace",
  footer,
}: {
  prompt: string;
  title: string;
  generated: GeneratedPrompt | null;
  depthLabel?: string;
  agentLabel?: string;
  onPromptChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onRegenerate: () => void;
  regenerating?: boolean;
  onBack?: () => void;
  backLabel?: string;
  onSave: () => void;
  onAnalyze: () => void;
  savedSessionId?: string | null;
  saveDisabled?: boolean;
  idPrefix?: string;
  footer?: React.ReactNode;
}) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const sections = useMemo(() => splitPromptSections(prompt), [prompt]);

  async function handleCopyAll() {
    try {
      await copyText(prompt);
      showToast("Full prompt copied to clipboard.");
    } catch {
      showToast("Could not access the clipboard. Select the text and copy manually.", "error");
    }
  }

  async function handleCopySection(section: PromptSectionView) {
    try {
      await copyText(`## ${section.heading}\n\n${section.body}`);
      setCopiedSection(section.id);
      window.setTimeout(() => setCopiedSection((current) => (current === section.id ? null : current)), 1600);
      showToast(`Copied “${section.heading}”.`);
    } catch {
      showToast("Could not access the clipboard. Select the text and copy manually.", "error");
    }
  }

  function handleExport() {
    try {
      const blob = new Blob([prompt], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${slugify(title || "prompt")}.md`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      showToast("Prompt exported as Markdown.");
    } catch {
      showToast("The prompt could not be exported.", "error");
    }
  }

  function jumpTo(id: string) {
    document.getElementById(`${idPrefix}-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const source = generated?.source;
  const sectionsCount = generated?.sections.length ?? sections.length;

  return (
    <div className="enter-rise space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {onBack ? (
            <button type="button" onClick={onBack} className={buttonClass({ variant: "ghost", size: "sm" })}>
              <ArrowLeft size={13} strokeWidth={1.8} aria-hidden="true" />
              {backLabel ?? "Back"}
            </button>
          ) : null}
          <Badge tone={!source ? "neutral" : source === "live" ? "live" : "demo"}>
            {!source
              ? "Not generated"
              : source === "live"
                ? "Model output"
                : source === "demo"
                  ? "Demo data"
                  : "Local draft"}
          </Badge>
          {depthLabel ? <Badge tone="low">{depthLabel} depth</Badge> : null}
          {agentLabel ? <Badge tone="low">{agentLabel}</Badge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-[5px] border border-line p-0.5" role="group" aria-label="Prompt view mode">
            {(["read", "edit"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                aria-pressed={mode === option}
                className={cn(
                  "flex h-6 items-center gap-1.5 rounded-[3px] px-2 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors duration-150",
                  mode === option ? "bg-surface text-ink" : "text-ink-3 hover:text-ink-2",
                )}
              >
                {option === "read" ? <FileText size={11} aria-hidden="true" /> : <PencilLine size={11} aria-hidden="true" />}
                {option}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleCopyAll} className={buttonClass({ variant: "secondary", size: "sm" })}>
            <Copy size={12} aria-hidden="true" />
            Copy full
          </button>
          <button type="button" onClick={handleExport} className={buttonClass({ variant: "secondary", size: "sm" })}>
            <Download size={12} aria-hidden="true" />
            Markdown
          </button>
        </div>
      </div>

      {source === "draft" ? (
        <Notice tone="demo" title="Local draft — not an AI response">
          This version is assembled from your brief and configuration. Generate with a configured provider to replace it
          with a tailored prompt.
        </Notice>
      ) : source === "demo" ? (
        <Notice tone="demo" title="DEMO DATA — composed locally">
          Demo Mode built this prompt deterministically from your brief. No request was sent to a provider, so nothing
          here was written by a live model.
        </Notice>
      ) : source === "live" ? (
        <Notice tone="success" title="Generated by the configured model">
          Review every requirement before use. The prompt stays editable, and your edits are what get copied or
          analyzed.
        </Notice>
      ) : null}

      <div>
        <label htmlFor={`${idPrefix}-title`} className="sr-only">
          Prompt title
        </label>
        <input
          id={`${idPrefix}-title`}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          maxLength={160}
          className="w-full border-0 border-b border-line-soft bg-transparent pb-2 font-display text-[21px] font-medium tracking-[-0.02em] text-ink focus:border-orange focus:outline-none"
          placeholder="Prompt title"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label="Prompt outline" className="order-last lg:order-first">
          <div className="rounded-[7px] border border-line bg-bg-raised">
            <div className="flex items-center justify-between border-b border-line-soft px-3 py-2">
              <span className="mono-label">Outline</span>
              <span className="font-mono text-[9px] tabular text-ink-3">{sectionsCount}</span>
            </div>
            <ol className="max-h-[420px] overflow-y-auto p-1.5">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <div className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => jumpTo(section.id)}
                      className="flex min-w-0 flex-1 items-baseline gap-2 rounded-[4px] px-2 py-1.5 text-left transition-colors duration-150 hover:bg-surface"
                    >
                      <span className="font-mono text-[9px] text-ink-3">{String(index + 1).padStart(2, "0")}</span>
                      <span className="truncate text-[11px] text-ink-2 group-hover:text-ink">{section.heading}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopySection(section)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] text-ink-3 opacity-0 transition-opacity duration-150 hover:bg-surface hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label={`Copy section ${section.heading}`}
                    >
                      {copiedSection === section.id ? (
                        <Check size={11} className="text-green" aria-hidden="true" />
                      ) : (
                        <Copy size={11} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="min-w-0 space-y-3">
          {mode === "edit" ? (
            <PromptEditor
              id={`${idPrefix}-editor`}
              label="Editable prompt"
              value={prompt}
              onChange={onPromptChange}
              minHeight={460}
              maxLength={PROMPT_LIMITS.max}
              hint="Edit freely. Copy, export, and analysis all use the current text."
            />
          ) : (
            <div className="space-y-5 rounded-[8px] border border-line bg-bg-raised px-5 py-5 sm:px-6">
              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={`${idPrefix}-${section.id}`}
                  className="scroll-mt-6 border-t border-line-soft pt-4 first:border-t-0 first:pt-0"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="flex items-baseline gap-2 text-[12px] font-medium text-ink">
                      <span className="font-mono text-[9px] text-ink-3">{String(index + 1).padStart(2, "0")}</span>
                      {section.heading}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleCopySection(section)}
                      className="flex h-6 items-center gap-1.5 rounded-[4px] px-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 transition-colors duration-150 hover:bg-surface hover:text-ink"
                      aria-label={`Copy section ${section.heading}`}
                    >
                      {copiedSection === section.id ? <Check size={11} className="text-green" /> : <Copy size={11} />}
                      {copiedSection === section.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <InlineBlocks body={section.body} />
                </section>
              ))}
            </div>
          )}

          {generated &&
          (generated.assumptions.length > 0 || generated.recommendations.length > 0) ? (
            <div className="rounded-[7px] border border-line bg-bg-raised px-3.5 py-1">
              {generated.assumptions.length > 0 ? (
                <Disclosure title="Assumptions to confirm" description={`${generated.assumptions.length}`}>
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

          <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
            <button type="button" onClick={onAnalyze} className={buttonClass({ variant: "primary", size: "md" })}>
              <ScanSearch size={14} strokeWidth={1.8} aria-hidden="true" />
              Analyze prompt
            </button>
            {savedSessionId ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[var(--ok-border)] bg-[var(--ok-bg)] px-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-green">
                <Check size={11} aria-hidden="true" />
                Saved
              </span>
            ) : (
              <button
                type="button"
                onClick={onSave}
                disabled={saveDisabled || !prompt.trim()}
                className={buttonClass({ variant: "secondary", size: "md" })}
              >
                <Save size={13} aria-hidden="true" />
                Save to history
              </button>
            )}
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenerating}
              className={buttonClass({ variant: "secondary", size: "md" })}
              aria-busy={regenerating}
            >
              <RotateCw size={13} className={regenerating ? "animate-spin" : undefined} aria-hidden="true" />
              {regenerating ? "Regenerating…" : "Regenerate"}
            </button>
            <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
              <Sparkles size={10} className="text-orange" aria-hidden="true" />
              Editable · Copyable
            </span>
          </div>

          {footer}
        </div>
      </div>
    </div>
  );
}

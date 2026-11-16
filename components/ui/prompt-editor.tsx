"use client";

import { useRef, useState } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { cn, copyText } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export function PromptEditor({
  id,
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  error,
  hint,
  minHeight = 260,
  maxLength = 12_000,
  labelRight,
  className,
  footer,
}: {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  error?: string;
  hint?: string;
  minHeight?: number;
  maxLength?: number;
  labelRight?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const lines = value ? value.split("\n").length : 0;
  const chars = value.length;

  async function handleCopy() {
    if (!value) return;
    try {
      await copyText(value);
      setCopied(true);
      showToast("Prompt copied to clipboard.");
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      showToast("Could not access the clipboard. Select the text and copy manually.", "error");
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[8px] border bg-bg-raised transition-[border-color] duration-150",
        error ? "border-[var(--danger-border)]" : "border-line focus-within:border-[var(--line-strong)]",
        className,
      )}
    >
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-line-soft px-3 py-1.5">
        <label htmlFor={id} className="mono-label text-ink-2">
          {label}
        </label>
        <div className="flex items-center gap-1">
          {labelRight}
          <span className="mr-1 font-mono text-[9px] tabular text-ink-3">
            {lines} ln / {chars} ch
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            className="flex h-7 items-center gap-1.5 rounded-[4px] px-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 transition-colors duration-150 hover:bg-surface hover:text-ink disabled:opacity-40"
            aria-label="Copy prompt text"
          >
            {copied ? <Check size={12} className="text-green" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          {!readOnly && onChange && value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex h-7 w-7 items-center justify-center rounded-[4px] text-ink-3 transition-colors duration-150 hover:bg-surface hover:text-[var(--danger-text)]"
              aria-label="Clear prompt text"
            >
              <Trash2 size={12} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <textarea
        id={id}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange?.(event.target.value)}
        className="block w-full resize-y bg-transparent px-4 py-4 font-mono text-[12.5px] leading-[1.75] text-ink placeholder:font-sans placeholder:text-[13px] placeholder:leading-[1.6] placeholder:text-ink-3 focus:outline-none read-only:text-ink-2"
        style={{ minHeight }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        spellCheck={false}
      />

      {error || hint || footer ? (
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-2 border-t border-line-soft px-3 py-1.5">
          <span
            id={error ? `${id}-error` : `${id}-hint`}
            className={cn("text-[10.5px] leading-[1.45]", error ? "text-[var(--danger-text)]" : "text-ink-3")}
            role={error ? "alert" : undefined}
          >
            {error ?? hint}
          </span>
          {footer}
        </div>
      ) : null}
    </div>
  );
}

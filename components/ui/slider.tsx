"use client";

import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function Slider({
  id,
  label,
  value,
  defaultValue,
  description,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: number;
  defaultValue: number;
  description: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const display = String(value).padStart(3, "0");
  const dirty = value !== defaultValue;

  return (
    <div className="group py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <label htmlFor={id} className="text-[12px] font-medium text-ink">
            {label}
          </label>
          <p className="mt-0.5 text-[11px] leading-[1.45] text-ink-3">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <output
            htmlFor={id}
            className="font-mono text-[15px] tabular tracking-[-0.03em] text-ink"
            aria-live="polite"
          >
            {display}
          </output>
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            disabled={!dirty || disabled}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-[4px] text-ink-3 transition-[opacity,color,background-color] duration-150",
              dirty ? "opacity-100 hover:bg-surface hover:text-ink" : "pointer-events-none opacity-0",
            )}
            aria-label={`Reset ${label} to ${defaultValue}`}
          >
            <RotateCcw size={11} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="scope-range mt-1.5"
        style={{ "--range-progress": `${value}%` } as React.CSSProperties}
        aria-valuetext={`${value} out of 100`}
      />
      <div className="flex justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-ink-3">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}

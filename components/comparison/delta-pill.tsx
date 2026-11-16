"use client";

import { cn } from "@/lib/utils";
import type { DimensionKey, ScoreComparison } from "@/types/evaluation";

export function changeTone(change: number) {
  if (change > 0) return "positive" as const;
  if (change < 0) return "negative" as const;
  return "flat" as const;
}

export function compareColor(comparison: ScoreComparison, key: DimensionKey) {
  const change = comparison.dimensions.find((dimension) => dimension.key === key)?.change ?? 0;
  if (change > 0) return "var(--green)";
  if (change < 0) return "var(--red)";
  return "var(--ink-3)";
}

export function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export function DeltaPill({ change, className }: { change: number; className?: string }) {
  const tone = changeTone(change);
  return (
    <span
      className={cn(
        "inline-flex h-[20px] min-w-[42px] items-center justify-center rounded-[3px] border px-1.5 font-mono text-[10px] tabular",
        tone === "positive" && "border-[#244434] bg-[#101d16] text-green",
        tone === "negative" && "border-[#5b2b2e] bg-[#241416] text-[#f0a1a5]",
        tone === "flat" && "border-line bg-surface text-ink-3",
        className,
      )}
      aria-label={`Change ${signed(change)}`}
    >
      {signed(change)}
    </span>
  );
}

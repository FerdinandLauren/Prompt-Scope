"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToggleChip({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] transition-[background-color,border-color,color] duration-150 ease-out",
        active
          ? "border-[#5a402b] bg-[#21180f] text-ink"
          : "border-line bg-transparent text-ink-2 hover:border-[#3b424a] hover:bg-surface hover:text-ink",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-3 w-3 items-center justify-center rounded-[2px] border transition-colors duration-150",
          active ? "border-orange bg-orange text-bg" : "border-[#3e454d]",
        )}
        aria-hidden="true"
      >
        {active ? <Check size={9} strokeWidth={3} /> : null}
      </span>
      {label}
    </button>
  );
}

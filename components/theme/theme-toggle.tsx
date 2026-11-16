"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/lib/theme/theme-types";

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeSegmentedControl({ className }: { className?: string }) {
  const { preference, setPreference } = useThemePreference();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[6px] border border-line bg-bg-raised p-0.5",
        className,
      )}
      role="group"
      aria-label="Color theme"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreference(option.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2.5 text-[11.5px] transition-colors duration-150",
              active
                ? "bg-[var(--accent-bg)] text-ink"
                : "text-ink-3 hover:bg-surface hover:text-ink-2",
            )}
          >
            <Icon size={13} strokeWidth={1.7} aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ThemeQuickToggle({ className }: { className?: string }) {
  const { resolvedTheme, setPreference } = useThemePreference();
  const next = resolvedTheme === "dark" ? "light" : "dark";
  const Icon = resolvedTheme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-[6px] text-ink-3 transition-colors duration-150 hover:bg-surface hover:text-ink",
        className,
      )}
    >
      <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
    </button>
  );
}

import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "demo" | "live" | "high" | "medium" | "low" | "positive" | "negative";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[20px] items-center gap-1.5 rounded-[3px] border px-1.5 font-mono text-[9px] font-medium uppercase leading-none tracking-[0.12em]",
        tone === "neutral" && "border-line text-ink-3",
        tone === "demo" && "border-[var(--warn-border)] bg-[var(--warn-bg-alt)] text-amber",
        tone === "live" && "border-[var(--ok-border)] bg-[var(--ok-bg)] text-green",
        tone === "high" && "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]",
        tone === "medium" && "border-[var(--warn-border)] bg-[var(--warn-bg-alt)] text-amber",
        tone === "low" && "border-line bg-surface text-ink-2",
        tone === "positive" && "border-[var(--ok-border)] bg-[var(--ok-bg)] text-green",
        tone === "negative" && "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

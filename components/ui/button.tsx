import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export function buttonClass({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-[6px] border font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45",
    variant === "primary" &&
      "border-orange bg-orange text-[var(--on-accent)] hover:border-[var(--orange-hover)] hover:bg-[var(--orange-hover)]",
    variant === "secondary" &&
      "border-line bg-transparent text-ink hover:border-[var(--line-strong)] hover:bg-surface",
    variant === "ghost" &&
      "border-transparent bg-transparent text-ink-2 hover:bg-surface hover:text-ink",
    variant === "danger" &&
      "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)] hover:border-[var(--danger-border-hover)] hover:bg-[var(--danger-bg-hover)]",
    size === "sm" && "h-8 px-3 text-[12px]",
    size === "md" && "h-9 px-3.5 text-[13px]",
    size === "lg" && "h-10 px-4 text-[13px]",
    size === "icon" && "h-9 w-9 p-0",
    className,
  );
}

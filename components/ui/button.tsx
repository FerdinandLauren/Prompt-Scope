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
      "border-orange bg-orange text-[#0B0C0E] hover:border-[#ffab6d] hover:bg-[#ffab6d]",
    variant === "secondary" &&
      "border-line bg-transparent text-ink hover:border-[#3b424a] hover:bg-surface",
    variant === "ghost" &&
      "border-transparent bg-transparent text-ink-2 hover:bg-surface hover:text-ink",
    variant === "danger" &&
      "border-[#5b2b2e] bg-[#2a1618] text-[#f0a1a5] hover:border-[#7a3a3e] hover:bg-[#341b1d]",
    size === "sm" && "h-8 px-3 text-[12px]",
    size === "md" && "h-9 px-3.5 text-[13px]",
    size === "lg" && "h-10 px-4 text-[13px]",
    size === "icon" && "h-9 w-9 p-0",
    className,
  );
}

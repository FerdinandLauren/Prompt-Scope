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
        tone === "demo" && "border-[#53462a] bg-[#1f1a10] text-amber",
        tone === "live" && "border-[#244434] bg-[#101d16] text-green",
        tone === "high" && "border-[#5b2b2e] bg-[#241416] text-[#f0a1a5]",
        tone === "medium" && "border-[#53462a] bg-[#1f1a10] text-amber",
        tone === "low" && "border-line bg-surface text-ink-2",
        tone === "positive" && "border-[#244434] bg-[#101d16] text-green",
        tone === "negative" && "border-[#5b2b2e] bg-[#241416] text-[#f0a1a5]",
        className,
      )}
    >
      {children}
    </span>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { useAiStatus } from "@/hooks/use-ai-status";
import { cn } from "@/lib/utils";

export function ModeBadge({ className, showModel = false }: { className?: string; showModel?: boolean }) {
  const { status, loading } = useAiStatus();

  if (loading) {
    return (
      <span
        className={cn(
          "inline-flex h-[20px] items-center rounded-[3px] border border-line px-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3",
          className,
        )}
      >
        Checking mode
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Badge tone={status.mode === "live" ? "live" : "demo"}>
        {status.mode === "live" ? "Live AI mode" : "Demo mode"}
      </Badge>
      {showModel && status.model ? (
        <span className="font-mono text-[9px] text-ink-3">{status.model}</span>
      ) : null}
    </span>
  );
}

"use client";

import { describeKeySource } from "@/lib/settings/key-source";
import { Badge } from "@/components/ui/badge";
import { useAiStatus } from "@/hooks/use-ai-status";
import { cn } from "@/lib/utils";

export function ModeBadge({
  className,
  showModel = false,
  showDetail = false,
}: {
  className?: string;
  showModel?: boolean;
  showDetail?: boolean;
}) {
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

  const described = describeKeySource(status);

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Badge tone={described.tone === "browser" ? "medium" : described.tone}>
        {described.label}
      </Badge>
      {showModel && status.model ? (
        <span className="font-mono text-[9px] text-ink-3">{status.model}</span>
      ) : null}
      {showDetail ? <span className="text-[11px] leading-[1.5] text-ink-3">{described.detail}</span> : null}
    </span>
  );
}

import { Check, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: "info" | "success" | "error" | "demo";
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "success" ? Check : tone === "error" ? TriangleAlert : Info;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[8px] border px-3.5 py-3",
        tone === "error" && "border-[var(--danger-border)] bg-[var(--danger-surface)]",
        tone === "success" && "border-[var(--ok-border)] bg-[var(--ok-bg-alt)]",
        tone === "demo" && "border-[var(--warn-border)] bg-[var(--warn-bg)]",
        tone === "info" && "border-line bg-bg-raised",
        className,
      )}
      role={tone === "error" ? "alert" : undefined}
    >
      <Icon
        size={14}
        strokeWidth={1.8}
        className={cn(
          "mt-0.5 shrink-0",
          tone === "error" && "text-[var(--danger-text)]",
          tone === "success" && "text-green",
          tone === "demo" && "text-amber",
          tone === "info" && "text-ink-3",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        {title ? <div className="text-[12px] font-medium text-ink">{title}</div> : null}
        {children ? <div className="text-[12px] leading-[1.6] text-ink-2">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function LoadingLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <div className="relative h-[2px] w-24 overflow-hidden rounded-full bg-[var(--track)]">
        <div className="scan-line absolute inset-y-0 w-1/3 bg-orange" />
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2">{label}</span>
    </div>
  );
}

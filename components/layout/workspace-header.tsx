import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspaceHeader({
  title,
  description,
  section = "Workspace",
  actions,
  meta,
  className,
}: {
  title: string;
  description?: string;
  section?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-line-soft", className)}>
      <div className="flex items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
          <span>{section}</span>
          <ChevronRight size={10} aria-hidden="true" />
          <span className="truncate text-ink-2">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">{meta}</div>
      </div>
      <div className="flex flex-col justify-between gap-4 pb-5 md:flex-row md:items-end">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-medium leading-[1.1] tracking-[-0.025em] text-ink">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-[72ch] text-[12.5px] leading-[1.6] text-ink-2">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

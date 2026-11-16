import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Disclosure({
  title,
  description,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details className={cn("group border-t border-line-soft", className)} open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <div>
          <span className="text-[12px] font-medium text-ink-2 group-open:text-ink">{title}</span>
          {description ? (
            <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
              {description}
            </span>
          ) : null}
        </div>
        <ChevronDown
          size={14}
          strokeWidth={1.6}
          className="shrink-0 text-ink-3 transition-transform duration-200 ease-out group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

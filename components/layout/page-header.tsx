import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description: string;
  section?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  section = "Workspace",
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("border-b border-line-soft pb-8 pt-8 lg:pt-10", className)}>
      <div className="mb-5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        <span>{section}</span>
        <ChevronRight size={11} aria-hidden="true" />
        <span className="text-ink-2">{title}</span>
      </div>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-[720px]">
          <h1 className="font-display text-[clamp(30px,4vw,46px)] font-medium leading-[1.05] tracking-[-0.03em] text-ink">
            {title}
          </h1>
          <p className="mt-3 max-w-[62ch] text-[14px] leading-[1.65] text-ink-2">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? <div className="mt-6">{meta}</div> : null}
    </header>
  );
}

export function PageFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12", className)}>
      {children}
    </div>
  );
}

import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  label,
  actions,
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
  actions?: React.ReactNode;
  as?: "section" | "div" | "article" | "aside";
}) {
  return (
    <Tag className={cn("rounded-[10px] border border-line bg-bg-raised", className)}>
      {label || actions ? (
        <div className="flex h-11 items-center justify-between gap-4 border-b border-line-soft px-4">
          <span className="mono-label">{label}</span>
          {actions}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}

export function SectionHeading({
  title,
  detail,
  actions,
  className,
}: {
  title: string;
  detail?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-6 border-b border-line-soft pb-3", className)}>
      <div>
        <h2 className="text-[13px] font-medium text-ink">{title}</h2>
        {detail ? <p className="mt-1 text-[11px] leading-[1.5] text-ink-3">{detail}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function DataRow({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-6 py-2.5", className)}>
      <span className="text-[12px] text-ink-3">{label}</span>
      <span className="text-right font-mono text-[11px] tabular text-ink-2">{value}</span>
    </div>
  );
}

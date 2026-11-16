import Link from "next/link";

export function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-start justify-center rounded-[10px] border border-dashed border-line px-6 py-10 sm:px-10">
      <div className="mono-label">No data</div>
      <h2 className="mt-3 max-w-[30ch] font-display text-[24px] font-medium leading-[1.15] tracking-[-0.02em]">
        {title}
      </h2>
      <p className="mt-3 max-w-[58ch] text-[13px] leading-[1.65] text-ink-2">{description}</p>
      <Link
        href={href}
        className="mt-6 inline-flex h-9 items-center rounded-[6px] border border-line px-3.5 text-[12px] font-medium text-ink transition-colors duration-150 hover:border-ink-3 hover:bg-surface"
      >
        {action} →
      </Link>
    </div>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-start justify-center px-5 sm:px-8 lg:px-12">
      <div className="mono-label">Error 404</div>
      <h1 className="mt-3 font-display text-[44px] font-medium tracking-[-0.03em]">This route is out of scope.</h1>
      <p className="mt-3 text-[14px] text-ink-2">The page you requested does not exist in this workspace.</p>
      <Link
        href="/"
        className="mt-6 inline-flex h-9 items-center rounded-[6px] bg-orange px-4 text-[13px] font-medium text-bg"
      >
        Return to dashboard
      </Link>
    </div>
  );
}

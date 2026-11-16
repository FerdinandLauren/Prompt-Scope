import Link from "next/link";
import { ArrowUpRight, ScanSearch } from "lucide-react";
import { PageFrame, PageHeader } from "@/components/layout/page-header";
import { ScopeMark } from "@/components/brand/scope-mark";

const quickActions = [
  {
    title: "Create a prompt",
    description: "Set a direction and generate a structured prompt.",
    href: "/builder",
  },
  {
    title: "Analyze a prompt",
    description: "Score an existing prompt against eight dimensions.",
    href: "/analyzer",
  },
  {
    title: "Open history",
    description: "Review saved versions and past evaluations.",
    href: "/history",
  },
];

export default function DashboardPage() {
  return (
    <PageFrame>
      <PageHeader
        title="Dashboard"
        description="Make every prompt more intentional. Build, analyze, and improve your prompts with clarity."
      />

      <section className="grid gap-10 py-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <div className="mono-label">Prompt direction & evaluation studio</div>
          <h2 className="mt-4 max-w-[14ch] font-display text-[clamp(40px,6vw,76px)] font-medium leading-[0.98] tracking-[-0.04em] text-balance">
            From experimentation to measured improvement.
          </h2>
          <p className="mt-6 max-w-[54ch] text-[15px] leading-[1.7] text-ink-2">
            Define what you want AI to make, diagnose the instructions, and verify every improvement
            against the same eight-dimension rubric.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/builder"
              className="inline-flex h-10 items-center gap-2 rounded-[6px] bg-orange px-4 text-[13px] font-medium text-bg transition-colors duration-150 hover:bg-[#ffab6d] active:scale-[0.99]"
            >
              Build a prompt
              <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link
              href="/analyzer"
              className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-line px-4 text-[13px] font-medium text-ink transition-colors duration-150 hover:border-ink-3 hover:bg-surface"
            >
              <ScanSearch size={15} strokeWidth={1.8} aria-hidden="true" />
              Analyze a prompt
            </Link>
          </div>
        </div>

        <div className="relative min-h-[280px] overflow-hidden rounded-[10px] border border-line bg-bg-raised lg:col-span-5">
          <div className="instrument-grid absolute inset-0" aria-hidden="true" />
          <div className="relative flex h-full flex-col justify-between p-6">
            <div className="flex items-center justify-between">
              <span className="mono-label">Instrument / idle</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                8 axes · 0—100
              </span>
            </div>
            <div className="flex items-center justify-center py-6">
              <ScopeMark size={172} className="text-ink-3" progress={0} label="No evaluation loaded" />
            </div>
            <div className="flex items-end justify-between border-t border-line-soft pt-4">
              <div>
                <div className="mono-label">Latest score</div>
                <div className="mt-1 font-mono text-[28px] tracking-[-0.04em] text-ink-3">—<span className="ml-1 text-[12px] text-ink-3">/ 100</span></div>
              </div>
              <span className="rounded-[4px] border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                Awaiting analysis
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line-soft py-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-ink">Quick actions</h2>
          <span className="mono-label">03 routes</span>
        </div>
        <div className="grid gap-px overflow-hidden rounded-[8px] border border-line bg-line sm:grid-cols-3">
          {quickActions.map((action, index) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex min-h-[120px] flex-col justify-between bg-bg p-5 transition-colors duration-150 hover:bg-surface"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] text-ink-3">0{index + 1}</span>
                <ArrowUpRight
                  size={15}
                  className="text-ink-3 transition-colors duration-150 group-hover:text-orange"
                  aria-hidden="true"
                />
              </div>
              <div>
                <div className="text-[14px] font-medium text-ink">{action.title}</div>
                <div className="mt-1 text-[12px] leading-[1.5] text-ink-3">{action.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 border-t border-line-soft py-8 md:grid-cols-3">
        {[
          { label: "Prompts created", value: "0" },
          { label: "Prompts analyzed", value: "0" },
          { label: "Improvements recorded", value: "0" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-end justify-between border-b border-line-soft pb-3">
            <span className="text-[12px] text-ink-3">{stat.label}</span>
            <span className="font-mono text-[26px] leading-none tracking-[-0.04em] text-ink-2">{stat.value}</span>
          </div>
        ))}
      </section>

      <section className="border-t border-line-soft py-8">
        <div className="flex flex-col items-start justify-between gap-4 rounded-[8px] border border-dashed border-line px-6 py-10 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[15px] font-medium text-ink">No prompts in this workspace yet.</h2>
            <p className="mt-1 max-w-[52ch] text-[13px] leading-[1.6] text-ink-3">
              Start with a direction, or paste a prompt you already use. Recent activity and the latest
              comparison will appear here.
            </p>
          </div>
          <Link href="/builder" className="shrink-0 text-[13px] font-medium text-orange hover:text-[#ffb37a]">
            Start with a direction →
          </Link>
        </div>
      </section>
    </PageFrame>
  );
}

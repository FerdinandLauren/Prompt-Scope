import Link from "next/link";
import { PageFrame, PageHeader } from "@/components/layout/page-header";
import { ModeBadge } from "@/components/system/mode-badge";
import { Badge } from "@/components/ui/badge";
import { evaluationDimensions, scoreBands } from "@/config/evaluation-rubric";
import { PROMPT_LIMITS, RUBRIC_VERSION } from "@/config/app";

export const metadata = {
  title: "Documentation",
};

const workflow = [
  {
    step: "01",
    title: "Direction",
    body: "Configure objective, audience, context, visual preferences, output requirements, constraints, and eight focus parameters in the Prompt Builder.",
  },
  {
    step: "02",
    title: "Generation",
    body: "The server composes a structured prompt. In Live mode this is a Gemini call constrained by a JSON schema; in Demo Mode it is composed locally from the same configuration.",
  },
  {
    step: "03",
    title: "Diagnosis",
    body: "The Analyzer scores eight dimensions independently. The server calculates the overall score; a model-reported total is never trusted.",
  },
  {
    step: "04",
    title: "Improvement",
    body: "The Improver revises the prompt while preserving the original. The revised prompt is re-evaluated under the identical rubric before any comparison is shown.",
  },
  {
    step: "05",
    title: "Comparison",
    body: "Both snapshots are stored separately. The radar chart and dimension table plot the real scores, including declines and unchanged dimensions.",
  },
  {
    step: "06",
    title: "History",
    body: "Sessions, versions, and evaluation snapshots are saved locally. Editing or restoring a prompt appends a version; earlier versions are never overwritten.",
  },
];

const endpoints = [
  { method: "POST", path: "/api/ai/generate", body: "configuration", result: "structured prompt" },
  { method: "POST", path: "/api/ai/analyze", body: "prompt, category, rubricVersion", result: "evaluation snapshot" },
  {
    method: "POST",
    path: "/api/ai/improve",
    body: "originalPrompt, priorities, analysis guidance",
    result: "revised prompt and change list",
  },
  { method: "GET", path: "/api/ai/status", body: "—", result: "mode and configured model" },
];

export default function DocsPage() {
  return (
    <PageFrame className="max-w-[1200px]">
      <PageHeader
        title="Documentation"
        section="System"
        description="How PromptScope measures prompts, what the numbers mean, and how Live and Demo modes differ."
        meta={<Badge tone="neutral">Rubric {RUBRIC_VERSION}</Badge>}
        actions={<ModeBadge showModel />}
      />

      <section className="grid gap-10 py-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <h2 className="mono-label mb-3">The workflow</h2>
          <ol className="divide-y divide-line-soft border-y border-line-soft">
            {workflow.map((item) => (
              <li key={item.step} className="grid grid-cols-[28px_1fr] gap-3 py-3.5">
                <span className="font-mono text-[10px] text-ink-3">{item.step}</span>
                <div>
                  <div className="text-[13px] font-medium text-ink">{item.title}</div>
                  <p className="mt-1 max-w-[68ch] text-[12px] leading-[1.65] text-ink-2">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="lg:col-span-5">
          <h2 className="mono-label mb-3">Score bands</h2>
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {scoreBands.map((band) => (
              <li key={band.label} className="flex items-center justify-between gap-4 py-2.5">
                <span className="font-mono text-[11px] tabular text-ink-2">
                  {band.min}–{band.max}
                </span>
                <Badge tone={band.tone}>{band.label}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] leading-[1.6] text-ink-3">
            Bands are product guidance for reading a score, not a universal standard of prompt quality.
          </p>

          <h2 className="mono-label mb-3 mt-8">Scoring rules</h2>
          <div className="rounded-[8px] border border-line bg-bg-raised px-4 py-3.5">
            <p className="font-mono text-[11.5px] leading-[1.7] text-ink-2">
              overallScore = round(sum(dimensionScores) / 8)
            </p>
            <ul className="mt-3 space-y-1.5 text-[11.5px] leading-[1.6] text-ink-2">
              <li>All eight dimensions use a 0–100 integer scale.</li>
              <li>The server recalculates the overall score from the returned dimensions.</li>
              <li>Dimension deltas are improved − original, and may be negative.</li>
              <li>Both snapshots must share the rubric version before a comparison is drawn.</li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="border-t border-line-soft py-8">
        <h2 className="mono-label mb-3">The eight dimensions</h2>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {evaluationDimensions.map((dimension) => (
            <li key={dimension.key} className="border-t border-line-soft pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12.5px] font-medium text-ink">{dimension.label}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                  {dimension.key}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-[1.6] text-ink-2">{dimension.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line-soft py-8">
        <h2 className="mono-label mb-3">Server routes</h2>

        <ul className="divide-y divide-line-soft border-y border-line-soft sm:hidden">
          {endpoints.map((endpoint) => (
            <li key={endpoint.path} className="py-3">
              <div className="flex items-center gap-2">
                <span className="rounded-[3px] border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                  {endpoint.method}
                </span>
                <span className="font-mono text-[11.5px] text-ink">{endpoint.path}</span>
              </div>
              <dl className="mt-2 grid grid-cols-[86px_1fr] gap-x-3 gap-y-1">
                <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">Request</dt>
                <dd className="text-[11.5px] leading-[1.5] text-ink-2">{endpoint.body}</dd>
                <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">Result</dt>
                <dd className="text-[11.5px] leading-[1.5] text-ink-2">{endpoint.result}</dd>
              </dl>
            </li>
          ))}
        </ul>

        <div className="hidden sm:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 text-left font-mono text-[9px] font-normal uppercase tracking-[0.1em] text-ink-3">
                  Method
                </th>
                <th scope="col" className="py-2 text-left font-mono text-[9px] font-normal uppercase tracking-[0.1em] text-ink-3">
                  Route
                </th>
                <th scope="col" className="py-2 text-left font-mono text-[9px] font-normal uppercase tracking-[0.1em] text-ink-3">
                  Request
                </th>
                <th scope="col" className="py-2 text-left font-mono text-[9px] font-normal uppercase tracking-[0.1em] text-ink-3">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint) => (
                <tr key={endpoint.path} className="border-b border-line-soft">
                  <td className="py-2.5 font-mono text-[11px] text-ink-3">{endpoint.method}</td>
                  <td className="py-2.5 font-mono text-[11.5px] text-ink">{endpoint.path}</td>
                  <td className="py-2.5 text-[11.5px] text-ink-2">{endpoint.body}</td>
                  <td className="py-2.5 text-[11.5px] text-ink-2">{endpoint.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-[80ch] text-[11.5px] leading-[1.6] text-ink-3">
          Every route validates its request with a schema, applies a per-IP rate limit, and validates the provider
          response before it reaches the interface. Requests over {PROMPT_LIMITS.max.toLocaleString()} characters are
          rejected.
        </p>
      </section>

      <section className="border-t border-line-soft py-8">
        <h2 className="mono-label mb-3">Live mode and demo mode</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[8px] border border-line bg-bg-raised px-4 py-3.5">
            <Badge tone="live">Live AI mode</Badge>
            <p className="mt-3 text-[12px] leading-[1.65] text-ink-2">
              Active when a usable key is available. <span className="font-mono">GEMINI_API_KEY</span> in the server
              environment is the default; you can also save a key from Settings for this browser. Prompts are sent to
              the configured Gemini model with structured JSON output. Model responses are validated against a schema;
              an unrepairable response becomes an explicit error rather than a guessed result.
            </p>
          </div>
          <div className="rounded-[8px] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-4 py-3.5">
            <Badge tone="demo">Demo mode</Badge>
            <p className="mt-3 text-[12px] leading-[1.65] text-ink-2">
              Active when no key is configured. Prompts are evaluated locally by a deterministic rule engine that
              inspects the text for real signals — audience, measured values, named components, type roles,
              constraints, contradictions. Results are labelled <span className="font-mono">DEMO DATA</span> and no
              request leaves the server.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-line-soft py-8">
        <h2 className="mono-label mb-3">Known limitations</h2>
        <ul className="divide-y divide-line-soft border-y border-line-soft">
          {[
            "Scores are model-assisted assessments; the same prompt may score differently across runs or models.",
            "Demo Mode uses a rule engine, so its explanations are keyword-driven rather than semantic.",
            "History, versions, and comparisons live in this browser's localStorage only.",
            "A key saved from Settings is readable by anything running on this origin; the server environment variable is safer for production.",
            "Only the Visual Design and UI/UX categories are implemented; others are planned.",
            "API availability depends on the provider, your quota, and the configured model.",
          ].map((item) => (
            <li key={item} className="py-2.5 text-[12px] leading-[1.6] text-ink-2">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft py-5">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
          Direction before generation · diagnosis before improvement
        </span>
        <div className="flex items-center gap-2">
          <Link href="/builder" className="text-[12px] font-medium text-ink-2 hover:text-orange">
            Open the builder
          </Link>
          <span className="text-ink-3">·</span>
          <Link href="/analyzer" className="text-[12px] font-medium text-ink-2 hover:text-orange">
            Open the analyzer
          </Link>
        </div>
      </div>
    </PageFrame>
  );
}

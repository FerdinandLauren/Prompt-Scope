# PromptScope — Architecture

## 1. System shape

```
Browser (client components)
  │  fetch, JSON envelope { ok, data } | { ok, error }
  ▼
Next.js route handlers  app/api/ai/*        ← request schema validation, rate limit
  │
  ▼
AI provider layer       lib/ai/*            ← instruction building, provider call, response validation
  │                                          discovery orchestration (live → demo fallback)
  ├── live  → @google/genai → Gemini → structured JSON (schema-constrained)
  └── demo  → lib/ai/demo/{discover,improve}, lib/ai/analyzer/heuristic → deterministic engines
  │
  ▼
Business logic          lib/scoring/*, lib/prompt/draft.ts  ← overall score, comparison, draft composer
  │
  ▼
Interface               components/builder/*, components/*   ← guided flow, results, radar, comparison, history
  │
  ▼
Local persistence       lib/storage/*       ← localStorage sessions, comparisons, handoff, builder draft
```

The browser never computes an overall score. The server never trusts a score that arrives from the
browser or a total that arrives from a model. The browser holds no key by default; a key entered in
Settings is kept in browser storage by explicit user choice and travels only to this application's
own AI routes, where it is used for that request alone.

## 2. Directory map

| Path | Responsibility |
|---|---|
| `app/` | Routes and route handlers. Pages are thin; views live in `components/`. |
| `app/api/ai/{discover,generate,analyze,improve,status,verify}/route.ts` | HTTP boundary: validate, throttle, delegate, normalise errors. |
| `components/layout/` | Shell, navigation, workspace headers. |
| `components/builder/` | Guided builder, advanced builder, prompt workspace, and the tab switch that shares one draft. |
| `components/theme/` | Theme segmented control and the quick light/dark toggle. |
| `components/settings/` | Settings view and the browser key panel. |
| `components/ui/` | Design-system primitives (button, field, slider, prompt editor, modal, notice, toast, disclosure). |
| `components/analyzer/` | Analyzer workspace and the evaluation result surface. |
| `components/improvement/` | Improve → re-evaluate → compare workflow and the shared comparison panel. |
| `components/visualization/` | Recharts radar built from stored evaluations. |
| `components/history/` | Library list and the session/version dialog. |
| `components/comparison/` | Saved comparison records. |
| `config/domains.ts` | Single source of truth: 20 categories, 5 groups, rubric copy, section templates, depths, agents, question seeds, missing-information signals. |
| `config/` | App constants, slider definitions and presets, rubric axes, sample prompts. |
| `lib/ai/` | Provider client, discovery orchestration, structured-call wrapper, instructions, schemas, error normalisation, throttling, demo engines. |
| `lib/prompt/draft.ts` | Local depth/agent/brief-aware draft composer used by Demo Mode and the live-failure fallback. |
| `lib/security/` | Browser key header name, validation and masking, shared by client and server. |
| `lib/settings/` | Copy that describes the active key source. |
| `lib/theme/` | Theme preference storage, resolution and the pre-paint script. |
| `lib/scoring/` | Score calculation, comparison maths, prompt fingerprints. |
| `lib/storage/` | localStorage adapters with corrupt-data tolerance and `useSyncExternalStore`-safe snapshots. |
| `lib/validation/` | Zod schemas shared by the client form and the server boundary. |
| `types/` | Prompt, guided, evaluation and history models. |
| `tests/` | Vitest suites and the `server-only` stub used outside Next.js. |
| `scripts/` | Puppeteer QA harnesses (guided flow, live API, screenshots, keyboard, motion). |

## 3. AI integration

**Key resolution.** `lib/ai/client.ts` resolves the active key for each request with a fixed priority:

1. a usable browser key supplied in the `x-promptscope-api-key` header;
2. the server environment key `GEMINI_API_KEY`;
3. no key, which switches the request to Demo Mode.

An environment key uses one cached provider instance. A browser key builds a request-scoped instance
and never replaces the process-wide provider, so one visitor's key cannot serve another visitor's
request. `app/api/ai/status` reports the mode, model and source (`environment`, `browser` or `none`)
without ever returning the key. `app/api/ai/verify` performs one minimal call so Settings can confirm a
key before it is kept. `lib/security/browser-api-key.ts` validates the header and masks the value;
`lib/api/client.ts` attaches the stored key only to this application's own `/api/ai/*` URLs. A missing
or placeholder key switches the whole application to Demo Mode; `server-only` guards the AI modules so
they can never be bundled into client code.

**One structured call path.** `lib/ai/provider.ts#callStructured`:

1. converts the operation's Zod schema to a JSON Schema (dropping keywords the provider does not
   support) and sends `responseMimeType: application/json` with `responseJsonSchema`;
2. applies a 45-second timeout;
3. parses the response, tolerating code fences or surrounding prose;
4. validates with the same Zod schema, plus an optional semantic check;
5. on failure, retries **once** with the specific validation problems appended to the instruction;
6. on a second failure, throws `invalid_response` rather than fabricating values.

**Four operations.** `discover.ts`, `generate.ts`, `analyze.ts` and `improve.ts` hold the domain rules:

- Discovery returns one turn: an understanding of the idea, at most one question, an optional
  recommendation with trade-offs, and a labelled project brief. `lib/ai/discover.ts` calls the live
  operation and falls back to `lib/ai/demo/discover.ts`, always declaring `source: "live" | "demo"`.
- Generation returns a prompt, its sections, assumptions and recommendations. It is shaped by the
  category family's section templates, the selected depth, the target agent's operating agreement and
  the project brief.
- Analysis returns eight dimension scores with explanations, strengths, weaknesses, missing
  information, contradictions and recommendations. The overall score is computed by
  `lib/scoring/calculate-score.ts`.
- Improvement returns the revised prompt plus a change list, preserved requirements, assumptions and
  remaining limitations.

**Domain configuration.** `config/domains.ts` owns the taxonomy. `getPromptSections(category)` returns
the family's section template, `getEvaluationDimensions(category)` returns the eight keyed dimensions
with family labels plus category overrides, `getQuestionSeeds(category)` returns the demo interview bank,
and `getAgentProfile(agent)` returns the operating agreement and extra sections. Adding a category is a
data change, not a workflow change.

**Instructions.** `lib/ai/prompts.ts` carries the rubric, the severity guidance, and the rules that
forbid inventing evidence, rewarding length, or producing an overall score.

**Errors.** `lib/ai/errors.ts` maps provider failures to a small closed set of codes with retryability
and a safe user message per code. Raw provider text is kept in `detail` for server logs only, with the
request's keys and Google key shapes redacted before anything is written.

**Throttling.** `lib/ai/throttle.ts` is a per-process sliding window (default 12 requests per 60 s per
client identifier), configurable through `AI_RATE_LIMIT_MAX` and `AI_RATE_LIMIT_WINDOW_MS`.

## 4. Evaluation and scoring

The rubric is versioned per domain family: `visual-uiux-v1`, `software-v1`, `ai-data-v1`,
`business-v1`, `content-v1`. The eight axis keys are identical across families; only labels,
descriptions and scoring guidance change, with optional per-category overrides. Every snapshot stores
the version, the category, the timestamp, the dimension map, the per-dimension explanations, the source
(`live` / `demo`) and a prompt fingerprint so the interface can tell when a prompt changed after
evaluation.

Overall score = round(mean of the eight dimension scores). Deltas are `improved − original` for both
dimensions and the overall. A comparison refuses to treat a rubric or category mismatch as a
measurement and shows a caveat instead. Length alone never raises a score: signals reward evidence,
coverage and specificity.

## 5. Demo Mode

`lib/ai/analyzer/heuristic.ts` is a real, deterministic evaluator, not placeholder data. Each
domain family supplies its own dimension copy and missing-information signals; the engine combines a
baseline with weighted text signals (audience, product, purpose, measurable values, named components,
type roles, colour behaviour, explicit limits, deliverable naming…) and an explanation that names what
was and was not found. A saturating curve gives diminishing returns so repetition cannot reach a
perfect score, brevity is penalised, conflicting instruction pairs are reported as contradictions, and
evidence is quoted only when the prompt actually contains vague wording.

`lib/ai/demo/discover.ts` is the deterministic guided interview. It detects category and complexity
from bilingual cues, skips seeds whose topic the idea already covers, asks one prioritised question at a
time, honours the soft budget, records unknown answers as assumptions with the seed's recommendation,
routes uncertainty clauses to ambiguities, and keeps unresolved areas as open questions. It is
idempotent: identical input produces identical output.

`lib/ai/demo/improve.ts` restructures the original prompt, preserves it verbatim, and converts
anything the evaluator could not find into explicit confirmation questions.

`lib/prompt/draft.ts` composes a local prompt from the configuration, brief, depth and agent. It is used
when Demo Mode generates and when a live generation fails. It labels itself `draft` and its explanation
states that it is not an AI response.

Every Demo Mode result is labelled `DEMO DATA` / `Demo discovery`.

## 6. Persistence

Two versioned localStorage data keys, both with corrupt-data tolerance and cached snapshots:

- `promptscope.sessions.v1` — sessions with an ordered version list. Adding, restoring or editing a
  prompt appends a version; the original version keeps its text and its evaluation snapshot.
- `promptscope.comparisons.v1` — before/after records capped at 20.

One builder draft key:

- `promptscope.builder.v2` — the shared Guided/Advanced draft: mode, configuration, guided step, idea,
  budget, answers, brief, confirmation flag, category hint, depth, agent and generated prompt. It is
  sanitised on read (unknown categories, steps, depths and agents repaired; text capped; budgets
  clamped) and exposed through a stable `useSyncExternalStore` snapshot so both tabs stay in sync.

Two preference keys:

- `promptscope.theme.v1` — `system`, `light` or `dark`. A pre-paint script in `app/layout.tsx` applies
  it to `<html data-theme>` before hydration, so there is no flash and no mismatch.
- `promptscope.browserApiKey.session` and `promptscope.browserApiKey.device.v1` — a key entered in
  Settings. The session copy is the default; the device copy exists only after the user ticks
  “remember this key”, and the UI states the risk before it is stored.

`sessionStorage` carries the builder→analyzer handoff, including the session and version ids when the
prompt came from history, so a new evaluation attaches to the existing version instead of creating a
duplicate session. The handoff is read through `useSyncExternalStore` with a server snapshot of
`null`, which avoids hydration mismatches.

## 7. Interface decisions

- **Two builder modes, one draft.** `components/builder/builder-view.tsx` renders Guided and Advanced
  tabs. Both mount against the same `lib/storage/builder-draft.ts` store, so switching tabs preserves the
  idea, brief, tuning and generated prompt. Guided is the default.
- **Guided state machine.** `components/builder/guided-builder.tsx` owns the five steps and calls
  `/api/ai/discover` once per idea or answer. A failed call falls back to `demoDiscover` and marks the
  turn as demo. The brief is editable before confirmation; generation uses the confirmed brief.
- **Output workspace.** `components/builder/prompt-workspace.tsx` renders the generated prompt with an
  outline, per-section copy, copy-all, Markdown export, save, analyze, regenerate and compare. The
  `source` badge (`live` / `demo` / `draft`) is always visible.
- **Design tokens** live in `app/globals.css`: `:root` is the dark studio, `[data-theme="light"]` is the
  warm paper theme, and both define the same semantic names (grounds, lines, ink, accent, status
  pairs). Components read tokens, so the two themes stay correct by construction. Three type roles
  remain (Space Grotesk display, Inter body, JetBrains Mono for measurements).
- **The aperture mark** (`components/brand/scope-mark.tsx`) is the one signature device: a circle with
  eight ticks, one per dimension, with a progress arc. It appears as the logo, the dashboard
  instrument and the score ring.
- **Structure over containers**: hairline rules, aligned numbers and negative space instead of a card
  around every section.
- **Motion is small and purposeful**: one entrance per view, 150–220 ms UI transitions on a strong
  ease-out curve, chart transitions only when the data changes, and `prefers-reduced-motion` reducing
  movement to a near-instant fade.
- **States are designed**: idle, submitting, success, error and empty states exist for AI operations,
  charts and the library; error messages name the problem and the recovery, and never discard input.

## 8. Known technical constraints

- The builder draft survives reloads, but transient request state (an in-flight discovery call) does not.
- History is device-local and capped (50 sessions, 20 comparisons).
- A browser key is only as safe as the browser profile that holds it. It is readable by any script on
  the origin, so the environment variable remains the recommended production configuration.
- The rate limiter is in-process, so it does not coordinate across instances.
- Live Gemini calls can take 30–90 seconds and may return provider 429/504; the UI falls back to demo
  discovery or a local draft with an explicit label.
- Demo Mode's reasoning is rule-based; its interview is scripted from a seeded bank and it is honest
  about being a heuristic, never presenting itself as a model response.
- Prompt analysis is capped at 40,000 characters.

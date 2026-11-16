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
  │
  ├── live  → @google/genai → Gemini → structured JSON (schema-constrained)
  └── demo  → lib/ai/analyzer/heuristic → deterministic rule engine
  │
  ▼
Business logic          lib/scoring/*       ← overall score, comparison, fingerprints
  │
  ▼
Interface               components/*        ← results, radar, comparison, history
  │
  ▼
Local persistence       lib/storage/*       ← localStorage sessions, comparisons, handoff
```

The browser never computes an overall score. The server never trusts a score that arrives from the
browser or a total that arrives from a model. The browser holds no key by default; a key entered in
Settings is kept in browser storage by explicit user choice and travels only to this application's
own AI routes, where it is used for that request alone.

## 2. Directory map

| Path | Responsibility |
|---|---|
| `app/` | Routes and route handlers. Pages are thin; views live in `components/`. |
| `app/api/ai/{generate,analyze,improve,status,verify}/route.ts` | HTTP boundary: validate, throttle, delegate, normalise errors. |
| `components/layout/` | Shell, navigation, workspace headers. |
| `components/theme/` | Theme segmented control and the quick light/dark toggle. |
| `components/settings/` | Settings view and the browser key panel. |
| `components/ui/` | Design-system primitives (button, field, slider, prompt editor, modal, notice, toast, disclosure). |
| `components/analyzer/` | Analyzer workspace and the evaluation result surface. |
| `components/improvement/` | Improve → re-evaluate → compare workflow and the shared comparison panel. |
| `components/visualization/` | Recharts radar built from stored evaluations. |
| `components/history/` | Library list and the session/version dialog. |
| `components/comparison/` | Saved comparison records. |
| `config/` | Categories, slider definitions and presets, the evaluation rubric, sample prompts, app constants. |
| `lib/ai/` | Provider client, structured-call wrapper, instructions, schemas, error normalisation, throttling, demo engine. |
| `lib/security/` | Browser key header name, validation and masking, shared by client and server. |
| `lib/settings/` | Copy that describes the active key source. |
| `lib/theme/` | Theme preference storage, resolution and the pre-paint script. |
| `lib/scoring/` | Score calculation, comparison maths, prompt fingerprints. |
| `lib/storage/` | localStorage adapters with corrupt-data tolerance and `useSyncExternalStore`-safe snapshots. |
| `lib/validation/` | Zod schemas shared by the client form and the server boundary. |
| `types/` | Prompt, evaluation, and history models. |
| `tests/` | Vitest suites and the `server-only` stub used outside Next.js. |
| `scripts/` | Puppeteer QA harnesses (screenshots, flows, keyboard, motion). |

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

**Three operations.** `generate.ts`, `analyze.ts` and `improve.ts` hold the domain rules:

- Generation returns a prompt, its sections, assumptions and recommendations.
- Analysis returns eight dimension scores with explanations, strengths, weaknesses, missing
  information, contradictions and recommendations. The overall score is computed by
  `lib/scoring/calculate-score.ts`.
- Improvement returns the revised prompt plus a change list, preserved requirements, assumptions and
  remaining limitations.

**Instructions.** `lib/ai/prompts.ts` carries the rubric, the severity guidance, and the rules that
forbid inventing evidence, rewarding length, or producing an overall score.

**Errors.** `lib/ai/errors.ts` maps provider failures to a small closed set of codes with retryability
and a safe user message per code. Raw provider text is kept in `detail` for server logs only, with the
request's keys and Google key shapes redacted before anything is written.

**Throttling.** `lib/ai/throttle.ts` is a per-process sliding window (default 12 requests per 60 s per
client identifier), configurable through `AI_RATE_LIMIT_MAX` and `AI_RATE_LIMIT_WINDOW_MS`.

## 4. Evaluation and scoring

The rubric (`config/evaluation-rubric.ts`) is versioned: `visual-uiux-v1` defines the eight
dimensions and their banding. Every snapshot stores the version, the category, the timestamp, the
dimension map, the per-dimension explanations, the source (`live` / `demo`) and a prompt fingerprint
so the interface can tell when a prompt changed after evaluation.

Overall score = round(mean of the eight dimension scores). Deltas are `improved − original` for both
dimensions and the overall. A comparison refuses to treat a rubric or category mismatch as a
measurement and shows a caveat instead.

## 5. Demo Mode

`lib/ai/analyzer/heuristic.ts` is a real, deterministic evaluator, not placeholder data. Each
dimension has a baseline plus weighted signals (audience, product, purpose, measurable values, named
components, type roles, colour behaviour, explicit limits, deliverable naming…) and an explanation
that names what was and was not found. A saturating curve gives diminishing returns so repetition
cannot reach a perfect score, brevity is penalised, conflicting instruction pairs are reported as
contradictions, and evidence is quoted only when the prompt actually contains vague wording.

`lib/ai/demo/improve.ts` restructures the original prompt, preserves it verbatim, and converts
anything the evaluator could not find into explicit confirmation questions. Every Demo Mode result is
labelled `DEMO DATA`.

## 6. Persistence

Two versioned localStorage data keys, both with corrupt-data tolerance and cached snapshots:

- `promptscope.sessions.v1` — sessions with an ordered version list. Adding, restoring or editing a
  prompt appends a version; the original version keeps its text and its evaluation snapshot.
- `promptscope.comparisons.v1` — before/after records capped at 20.

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

- Client state for the analyzer and builder is component state; a page reload clears unsaved work.
- History is device-local and capped (50 sessions, 20 comparisons).
- A browser key is only as safe as the browser profile that holds it. It is readable by any script on
  the origin, so the environment variable remains the recommended production configuration.
- The rate limiter is in-process, so it does not coordinate across instances.
- Demo Mode's reasoning is rule-based; it is honest about being a heuristic and never presents itself
  as a model response.

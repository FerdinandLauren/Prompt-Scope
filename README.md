# PromptScope

**An AI-powered Prompt Direction & Evaluation Studio.**

PromptScope turns prompt engineering from trial-and-error into a measured workflow: define a
direction, generate a structured prompt, diagnose it against a fixed eight-dimension rubric, improve
it without losing the original intent, and compare the two versions with real evaluation data.

> **From prompt experimentation to measurable prompt optimization.**

---

## The problem

Generative AI is a strong brainstorming partner but a poor mind-reader. When a prompt is vague, the
model has no way to know which part is wrong, and the person writing it has no way to tell either.
Most prompt tools generate more text; almost none of them help you understand what is already
effective, what is missing, what contradicts itself, or whether the revision actually helped.

## What PromptScope does

| Stage | What you get |
|---|---|
| **Direction** | A configuration studio: category, objective, audience, context, visual preferences, output requirements, constraints, and eight focus parameters with presets. |
| **Generation** | A structured prompt with objective, direction, composition, typography, constraints, output requirements and calibration notes — composed by Gemini in Live mode, or locally in Demo Mode. |
| **Diagnosis** | Eight dimension scores with an explanation each, an overall score calculated by the application, ranked weaknesses with severity and quoted evidence, missing information, contradictions and recommendations. |
| **Improvement** | A revised prompt that preserves the original verbatim, plus a change list, preserved requirements, assumptions instead of invented facts, and remaining limitations. |
| **Comparison** | A radar chart and a dimension table built from the stored evaluations, showing increases, declines and unchanged dimensions honestly. |
| **History** | Sessions with ordered versions and their evaluation snapshots, stored in the browser. Editing or restoring a prompt appends a version; nothing is overwritten. |

## Screens

- **Dashboard** — the current measurement, quick routes into the workflow, activity derived from local
  history, and a comparison preview when one exists.
- **Prompt Builder** — configuration on the left, live direction profile and editable prompt on the right.
- **Prompt Analyzer** — prompt input, then the diagnostic surface with the score ring, dimension bars,
  weaknesses, strengths, missing information, contradictions and recommendations.
- **Comparisons** — every saved before/after record with its radar chart and delta table.
- **Prompt History** — a searchable library with a detail dialog for versions, evaluations and
  comparison.
- **Settings** — mode, configuration test, workspace inventory, local data controls and privacy.
- **Documentation** — the workflow, score bands, scoring rules, the eight dimensions and the routes.

## Technology

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 with CSS custom-property tokens |
| Charts | Recharts (radar) |
| AI | `@google/genai` — official Google Gen AI SDK |
| Validation | Zod (request bodies, AI responses, shared with the client form) |
| Testing | Vitest, plus Puppeteer harnesses for flows, keyboard, motion and screenshots |
| Storage | Browser `localStorage` / `sessionStorage` |

A full walkthrough is in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Live AI Mode and Demo Mode

- **Live AI Mode** activates automatically when `GEMINI_API_KEY` is present. Prompts are sent to
  Google Gemini through server-side route handlers with schema-constrained JSON output.
- **Demo Mode** activates when no key is configured. Prompts are scored locally by a deterministic
  rule engine that inspects the text for real signals — audience, measurable values, named components,
  type roles, constraints, contradictions. Every result is labelled **DEMO DATA** and no request
  leaves the server.

Both modes use the same rubric, the same schema and the same interface. Two prompts evaluated in the
same mode are always comparable.

## Getting started

```bash
git clone https://github.com/FerdinandLauren/Prompt-Scope.git
cd Prompt-Scope
npm install
cp .env.example .env.local     # optional: add GEMINI_API_KEY for Live AI Mode
npm run dev
```

Open <http://localhost:3000>. With no key, the app runs in Demo Mode and everything works: the sample
prompts, the analyzer, the improver, the radar comparison and history.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm test` | Vitest suite (120 tests) |
| `npm run check` | Typecheck + lint + tests |

### Environment variables

```env
GEMINI_API_KEY=        # from https://aistudio.google.com/apikey — leave empty for Demo Mode
GEMINI_MODEL=gemini-3.8-flash
AI_RATE_LIMIT_MAX=12
AI_RATE_LIMIT_WINDOW_MS=60000
```

`.env.local` is git-ignored. Never commit a real key. See
[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the full variable reference.

## The eight dimensions

| Dimension | What it evaluates |
|---|---|
| Clarity | Whether the instructions are understandable, ordered and unambiguous |
| Context | Whether project background, audience and purpose are supplied |
| Specificity | Whether requirements are detailed enough to guide a concrete output |
| Visual Direction | Whether style, mood, palette and references are defined |
| Composition | Whether layout, hierarchy, grid, spacing and responsive behaviour are clear |
| Typography | Whether type roles, scale and readability are specified |
| Constraints | Whether limits, exclusions and required conditions are explicit |
| Output Definition | Whether the deliverable, format and response expectations are defined |

Overall score = the rounded mean of the eight dimensions, calculated by the server. Bands: 0–39 needs
significant improvement · 40–59 developing · 60–79 good foundation · 80–100 strong prompt.

Score deltas are `improved − original` and may be negative. An improved prompt is not guaranteed to
score higher, and when it does not, the application says so.

## Project structure

```text
app/                    routes and /api/ai route handlers
components/             layout, ui primitives, analyzer, improvement, visualization, history, comparison
config/                 categories, slider presets, evaluation rubric, sample prompts
lib/ai/                 provider client, structured calls, instructions, schemas, errors, throttle, demo engine
lib/scoring/            overall score, comparison maths, prompt fingerprint
lib/storage/            localStorage adapters (sessions, comparisons, handoff)
lib/validation/         shared Zod schemas
hooks/                  local-data and status hooks
tests/                  vitest suites
scripts/                puppeteer QA harnesses
docs/                   architecture, deployment, testing report
```

## Quality

- **120 tests** across scoring, comparison maths, request validation, the analyzer engine, evidence
  honesty, the live provider path, error mapping, schemas, throttling, storage and the demo improver.
- **Lighthouse 100** for accessibility and best practices on every route, including the populated
  comparison view.
- Keyboard operable throughout, with visible focus rings, dialogs that trap and release focus, and
  reduced-motion support.
- No horizontal overflow at 1440, 900 or 390 px.
- Full evidence is in [`docs/TESTING.md`](./docs/TESTING.md).

## Security and privacy

- The Gemini key is read only in server modules guarded by `server-only` and is never in the browser
  bundle.
- Route handlers validate every request body, cap its size, and apply a per-client rate limit.
- The server never trusts a score sent from the browser or a total sent by a model.
- Provider failures are logged server-side with raw detail, while the browser receives a safe message
  and a code.
- In Live mode prompt text is transmitted to Google Gemini for processing; do not submit confidential
  business information or personal data. Demo Mode transmits nothing.
- Scores are model-assisted diagnostics, not a universal measurement of prompt quality.

## Known limitations

- Evaluations vary between runs and models; treat a score as a diagnostic, not a constant.
- Demo Mode reasons over keywords and structure, so its explanations are pattern-driven.
- History, versions and comparisons live in one browser profile; there is no cloud sync or export to
  a server.
- Only the Visual Design and UI/UX categories are implemented; the architecture keeps categories and
  rubrics separable for more.
- Live availability depends on the provider, your quota and the configured model.

## Roadmap

- **1.5** — Content Creation and Software Development categories with their own rubrics; custom
  criteria; richer version diffing.
- **2.0** — accounts and cloud history, provider comparison, exportable reports.
- **3.0** — benchmarking across prompts, organisation rubrics, team workspaces.

## Documentation

| Document | Contents |
|---|---|
| [`MASTER.md`](./MASTER.md) | The product requirements, milestones and design specification this build follows |
| [`PRODUCT.md`](./PRODUCT.md) | Durable product truth: users, jobs, principles, non-goals |
| [`DESIGN.md`](./DESIGN.md) | Visual direction, palette, type, components, motion rules |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System shape, module responsibilities, data flow |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Deployment steps, environment variables, operations |
| [`docs/TESTING.md`](./docs/TESTING.md) | Test inventory, QA evidence, security checks, limitations |

## License

Developed as an academic and portfolio project. See the repository for details.

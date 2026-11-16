# PromptScope

**A guided prompt-engineering and AI-agent instruction studio.**

PromptScope turns a rough idea into a prompt you can defend. Describe what you want in plain language,
answer a short adaptive interview, review the project brief it builds, choose how much depth and which
kind of agent should receive the prompt, then generate a structured prompt. From there the same eight-
dimension analyzer, improver and comparison tools measure whether a revision actually helped.

> **From a vague idea to a measurable, reusable prompt.**

---

## The problem

Generative AI is a strong brainstorming partner but a poor mind-reader. When a prompt is vague, the
model has no way to know which part is wrong, and the person writing it has no way to tell either.
Most prompt tools generate more text; almost none of them help you understand what is already
effective, what is missing, what contradicts itself, or whether the revision actually helped.

Prompting an agent (especially a coding agent) adds a second problem: the agent needs an operating
agreement — what to inspect, what it may change, how to verify, what to report — and a generic
"build me an app" prompt does not contain one.

## What PromptScope does

| Stage | What you get |
|---|---|
| **Guided discovery** | Plain-language idea → intent/domain detection → one question at a time → an editable, labelled project brief → depth and target-agent selection → a generated prompt. |
| **Advanced direction** | The full configuration studio for people who already know what they want: category, objective, audience, context, preferences, output requirements, constraints, and eight focus parameters with presets. |
| **Generation** | A domain-shaped prompt built from category sections and agent sections; composed by Gemini in Live mode, or locally in Demo Mode. |
| **Diagnosis** | Eight dimension scores with an explanation each, an overall score calculated by the application, ranked weaknesses with severity and quoted evidence, missing information, contradictions and recommendations. |
| **Improvement** | A revised prompt that preserves the original verbatim, plus a change list, preserved requirements, assumptions instead of invented facts, and remaining limitations. |
| **Comparison** | A radar chart and a dimension table built from the stored evaluations, showing increases, declines and unchanged dimensions honestly. |
| **History** | Sessions with ordered versions and their evaluation snapshots, stored in the browser. Editing or restoring a prompt appends a version; nothing is overwritten. |

### The guided flow in detail

1. **Idea** — type what you want to make or improve, or load a sample for any of the 20 categories. Set a
   soft question budget (3–12).
2. **Understanding** — PromptScope states the detected domain, complexity, explicit requirements,
   ambiguities and missing information, and asks one question at a time with a short "why this matters".
3. **Interview** — answer in free text or pick a suggestion. **I don't know** returns a recommendation with
   rationale and trade-offs, recorded as an *assumption*, never as a confirmed requirement. **Skip** leaves
   the area open. Questions are prioritised, never repeated, and the interview stops when the budget is
   reached or enough information exists.
4. **Brief** — an editable project brief. Every section is labelled **Your input**, **Assumption** or
   **Recommendation**, and unresolved areas appear under **Open questions**. Edit any section, then confirm.
5. **Tuning** — choose one of four depths and one of seven target agents. PromptScope recommends a depth
   from brief complexity and shows when an agent usually needs more detail.
6. **Prompt** — the full prompt with an outline, per-section copy, copy-all, Markdown export, save to
   history, analyze, regenerate, and compare against an earlier version.

Assumptions are shown as assumptions everywhere they appear — in the brief, in the prompt, and in the
analyzer. PromptScope never presents a recommendation as something you confirmed.

## Categories, rubrics and agents

Twenty categories across five groups. Each group supplies its own rubric copy and prompt section
templates; the eight evaluation axis **keys stay stable**, so stored results and comparisons remain valid.

| Group | Categories | Rubric version |
|---|---|---|
| Design & Interfaces | UI/UX Design, Visual Design, Product Design, Design System | `visual-uiux-v1` |
| Software Engineering | Frontend, Backend, Full-Stack, Mobile, Software Engineering, API Development | `software-v1` |
| AI & Data | AI Application, Machine Learning, Data Analytics, AI Agent | `ai-data-v1` |
| Business & Operations | Business Analysis, Workflow Automation, Operations | `business-v1` |
| Content & Research | Content Creation, Technical Writing, Research & Education | `content-v1` |

Example: the axis key `visual_direction` is *Visual Direction* for design work and *Architecture* for a
backend prompt. Clarity and specificity keep the same meaning everywhere.

**Depths** — Concise, Balanced, Detailed, Comprehensive. Each adds real detail (assumptions, open
questions, uncertainty policy, verification) rather than repeating the same lines.

**Target agents** — General Assistant, Coding / Software Agent, Design / UI-UX Agent, Research Agent,
Workflow Automation Agent, Content / Writing Agent, Custom Agent. The coding agent profile covers
repository inspection, an implementation plan, implementation rules, verification, and a final report,
and it forbids commit, push, deploy or destructive commands unless you explicitly ask for them.

## Screens

- **Dashboard** — the current measurement, quick routes into the workflow, activity derived from local
  history, and a comparison preview when one exists.
- **Prompt Builder** — **Guided** (default) and **Advanced** tabs that share one draft. Switching tabs
  keeps your idea, brief, depth, agent and generated prompt.
- **Prompt Analyzer** — prompt input, then the diagnostic surface with the score ring, domain-labelled
  dimension bars, weaknesses, strengths, missing information, contradictions and recommendations.
- **Comparisons** — every saved before/after record with its radar chart and delta table.
- **Prompt History** — a searchable library with a detail dialog for versions, evaluations and
  comparison.
- **Settings** — appearance (system, light or dark), **AI Providers & Models** (per-provider keys,
  enable/disable, model, base URL, preferred provider, routing mode, fallback order, connectivity tests,
  health and usage), the Gemini key panel with verification, mode details, workspace inventory, local
  data controls and privacy.
- **Documentation** — the guided workflow, the domain rubric table, score bands, scoring rules and the
  routes.

The interface ships in a dark studio theme and a light paper theme, both driven by the same semantic
tokens. The toggle lives in the sidebar and in Settings; the choice follows the system by default and
is remembered per browser.

## Technology

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 with CSS custom-property tokens |
| Charts | Recharts (radar) |
| AI | `@google/genai` for Gemini, plus an OpenAI-compatible HTTP adapter for Vikey (verified) and Dattio (opt-in, unverified) |
| Validation | Zod (request bodies, AI responses, shared with the client form) |
| Testing | Vitest, plus Puppeteer harnesses for the guided flow, keyboard, motion and screenshots |
| Storage | Browser `localStorage` / `sessionStorage` |

A full walkthrough is in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Live AI Mode, Demo Mode and Draft fallback

- **Live AI Mode** activates when at least one provider key is usable. Discovery, generation, analysis
  and improvement go through server-side route handlers to **Gemini**, **Vikey**, or an **OpenAI-compatible
  Dattio** endpoint you configure. Keys come from the environment by default; you can also save a key per
  provider in **Settings**.
- **Routing** is chosen in Settings:
  - **Manual** — a single configured provider and model.
  - **Automatic** — the best available provider for the task; it does not switch mid-task.
  - **Automatic with fallback** (default) — switches provider on a rate limit, provider error, overload,
    timeout or network failure, while keeping the same prompt, system instruction and validation.
    Rejected keys, bad requests, unknown models and invalid output are reported instead of retried.
- **Demo Mode** activates when no provider is usable. Discovery and generation are produced locally by a
  deterministic engine; analysis is scored by a deterministic rule engine that inspects the text for real
  signals — audience, measurable values, named components, type roles, constraints, contradictions. Every
  result is labelled **DEMO DATA** or **Demo discovery**, and no request leaves the server.
- **Draft fallback** happens when Live generation fails mid-flow. PromptScope composes a local draft prompt
  and labels it **Local draft — not an AI response**, so a failure never looks like model output.

Both modes use the same rubric, the same schema and the same interface. Two prompts evaluated in the same
mode are always comparable.

## Getting started

```bash
git clone https://github.com/FerdinandLauren/Prompt-Scope.git
cd Prompt-Scope
npm install
cp .env.example .env.local     # optional: add GEMINI_API_KEY for Live AI Mode
npm run dev
```

Open <http://localhost:3000>. With no key, the app runs in Demo Mode and everything works: the guided
flow, the sample ideas, the analyzer, the improver, the radar comparison and history.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm test` | Vitest suite (293 tests) |
| `npm run check` | Typecheck + lint + tests |

The browser QA harnesses need a running app and Chrome:

```bash
node scripts/qa-guided-flow.mjs    # Demo Mode end-to-end guided flow + analyzer handoff + mobile
node scripts/qa-guided-live.mjs    # Live Mode discovery/generation API + guided UI
```

### Environment variables

```env
# Gemini (preserved from the original integration)
GEMINI_API_KEY=        # from https://aistudio.google.com/apikey — leave empty for Demo Mode
GEMINI_MODEL=gemini-3.6-flash
GEMINI_FALLBACK_MODEL=gemini-4-hydrogen

# Vikey — verified OpenAI-compatible provider
VIKEY_API_KEY=
VIKEY_BASE_URL=https://api.vikey.ai/v1
VIKEY_MODEL=vikey/agent-gpt

# Dattio — unverified; supply your own base URL and model
DATTIO_API_KEY=
DATTIO_BASE_URL=
DATTIO_MODEL=

# Routing (Settings overrides these)
AI_ROUTING_MODE=auto_fallback
AI_PROVIDER_ORDER=gemini,vikey,dattio
AI_PREFERRED_PROVIDER=auto
AI_FALLBACK_ENABLED=true

# In-process limiter
AI_RATE_LIMIT_MAX=12
AI_RATE_LIMIT_WINDOW_MS=60000
```

`.env.local` is git-ignored. Never commit a real key. See
[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the full variable reference.

### Using a key from the interface

Open **Settings → AI Providers & Models** and save a key per provider, choose a model, optionally set a
base URL (Dattio and self-hosted gateways), then use **Test connection**. Keys default to
`sessionStorage`, so they disappear when the session ends. Ticking **Remember this key on this device**
moves that provider's key to `localStorage` after showing the trade-off. **Clear key** removes both
copies and the server environment configuration takes over again.

The legacy **Settings → Gemini API key** panel still works and operates on the same Gemini storage, so an
existing saved key keeps working without re-entry.

Keys travel only to this application's own `/api/ai/*` routes — Gemini in `x-promptscope-api-key`, other
providers in `x-promptscope-provider-keys` — and non-secret preferences in `x-promptscope-ai-config`.
They are used for that request, never replace the process-wide configuration, and are redacted from error
detail. The environment variable remains the recommended production configuration because it never reaches
the browser at all.

## The eight dimensions

The keys are fixed; the labels and guidance adapt to the selected category group (design labels shown).

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
score higher, and when it does not, the application says so. Length alone never raises a score: the
rubric rewards evidence, coverage and specificity, not word count.

## API routes

| Route | Purpose |
|---|---|
| `POST /api/ai/discover` | One guided discovery turn: `{ idea, category?, answers, budget? }` → understanding, next question, labelled brief, optional recommendation. |
| `POST /api/ai/generate` | Compose a prompt from a configuration (with optional `depth`, `targetAgent`, `brief`). |
| `POST /api/ai/analyze` | Score a prompt against the domain-aware rubric. |
| `POST /api/ai/improve` | Revise a prompt while preserving intent, constraints and unknowns. |
| `GET /api/ai/status` | Active mode, provider, model, key sources, per-provider health and routing. |
| `POST /api/ai/verify` | Validate a provider's key and model before it is saved (defaults to Gemini). |
| `POST /api/ai/models` | Models reported by a provider, with documented ids as fallback. |
| `GET /api/ai/usage` | In-process request, failure, latency and reported-token totals. |

Every request body is validated with Zod, capped at 40,000 characters of prompt text, and limited to
12 requests per minute per client by default.

## Project structure

```text
app/                    routes and /api/ai route handlers
components/builder/     guided builder, advanced builder, prompt workspace, shared tabs
components/             layout, ui primitives, analyzer, improvement, visualization, history, comparison, settings
config/                 domains (categories, rubrics, depths, agents, sections, seeds), app, rubric, presets, samples
lib/ai/                 router, provider adapters, structured calls, health/usage, discovery, schemas, errors, throttle, demo engine
lib/ai/providers/       config resolution, provider metadata, Gemini and OpenAI-compatible adapters
lib/prompt/             local draft composer (depth + agent aware)
lib/security/           browser key and provider-key headers, validation and masking
lib/settings/           copy describing the active key source
lib/theme/              theme preference storage, resolution, pre-paint script
lib/scoring/            overall score, comparison maths, prompt fingerprint
lib/storage/            localStorage adapters (sessions, comparisons, handoff, builder draft, keys, AI preferences)
lib/validation/         shared Zod schemas
hooks/                  local-data, status, key, theme and builder-draft hooks
tests/                  vitest suites
scripts/                puppeteer QA harnesses
docs/                   architecture, deployment, testing report
```

`config/domains.ts` is the single source of truth for the taxonomy. Adding a category means adding one
definition, its rubric copy, section templates and question seeds — the builder, analyzer, improver and
docs all read from it.

## Quality

- **293 tests** across config/domain integrity, discovery behaviour, draft composition by depth and
  agent, builder-draft persistence, scoring, comparison maths, request validation, the analyzer engine,
  evidence honesty, the live provider path, request-scoped keys, connection verification, error
  mapping, schemas, throttling, storage, settings, theme tokens, the OpenAI-compatible adapter,
  multi-provider routing, provider health/usage and provider-key storage.
- **Theme contrast is tested, not eyeballed:** both palettes must clear WCAG AA (7:1 for body text,
  4.5:1 for metadata and status pairs) or the suite fails.
- **Lighthouse 100** for accessibility and best practices on the audited routes, including the
  populated comparison view. An axe-core scan of all seven routes in both themes reports 0 violations,
  re-confirmed after the guided builder landed.
- **Guided flow QA** passes end to end in Demo Mode: sample fill, discovery, unknown → recommendation,
  interview, labelled brief, depth/agent tuning, 58 section-copy buttons, save dialog, tab switching
  that preserves work, analyzer handoff, and a 390 px mobile pass with no horizontal overflow.
- **Live Mode QA** verified a real Gemini discovery turn and generation, plus explicit fallback labels
  when the provider timed out or rate-limited.
- Keyboard operable throughout, with visible focus rings, dialogs that trap and release focus, and
  reduced-motion support.
- No horizontal overflow at 1440, 900 or 390 px, in either theme.
- Full evidence is in [`docs/TESTING.md`](./docs/TESTING.md).

## Security and privacy

- The server key is read only in server modules guarded by `server-only` and is never in the browser
  bundle.
- A key entered in Settings stays in the browser, is sent only to this application's own AI routes,
  and is used for that request alone. It is never logged, stored on the server, or committed.
- Keys are stored per provider; Gemini keeps the original storage key, so an existing saved key remains
  valid. Server environment keys are preferred in production and never reach the browser.
- Route handlers validate every request body, cap its size, and apply a per-client rate limit.
- The server never trusts a score sent from the browser or a total sent by a model.
- Provider failures are logged server-side with raw detail redacted, while the browser receives a safe
  message and a code.
- In Live mode prompt text is transmitted to the provider that serves the request, under that provider's
  terms; do not submit confidential business information or personal data. Demo Mode transmits nothing.
- Scores are model-assisted diagnostics, not a universal measurement of prompt quality.

## Known limitations

- Evaluations vary between runs and models; treat a score as a diagnostic, not a constant.
- Demo Mode reasons over keywords and structure, so its explanations are pattern-driven. Its interview is
  scripted from a seeded question bank, not a live semantic model.
- The guided interview is adaptive within a bounded set of seeded questions and never invents facts it was
  not told. Unknown areas stay open instead of being guessed.
- PromptScope records assumptions but cannot verify that an assumption is true for your project. Review
  the brief before generating.
- Coding-agent prompts instruct the agent to inspect, plan, verify and report. PromptScope does not run
  your code, tests, migrations or deployments.
- History, versions, builder drafts and comparisons live in one browser profile; there is no cloud sync.
- Live availability depends on the provider, your quota and the configured model. Live calls can take
  30–90 seconds and can fail; the UI falls back with an explicit label.
- Provider health and usage are per server process and reset on restart. Tokens are shown only when a
  provider reports them; they are not estimated.
- Vikey was implemented against its published documentation but has not been exercised with a real key
  here. Dattio publishes no verifiable API documentation, so it is opt-in, unverified, and requires a
  base URL and model from your account.
- Prompt text sent to the analyzer is capped at 40,000 characters.

## Roadmap

- **2.1** — richer version diffing, per-section regeneration, and saved brief templates.
- **2.2** — custom rubrics and organisation-level prompt standards.
- **3.0** — accounts and cloud history, provider comparison, exportable reports, team workspaces.

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

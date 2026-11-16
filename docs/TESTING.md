# PromptScope — Testing & QA report

Verified 16 November 2026. Every number below came from a command that was actually run against this repository; nothing here is projected.

## 1. Automated tests

```bash
npm test        # vitest, 293 tests, 26 files
npm run typecheck
npm run lint
npm run build
```

| Suite | File | Tests | What it proves |
|---|---|---|---|
| Domain configuration | `tests/config/domains.test.ts` | 23 | Exactly 20 categories in 5 groups, unique ids and labels, every family mapped to its rubric version, the same eight axis keys everywhere, renames applied without changing keys, 4 ordered depths, 7 agent profiles, coding-agent inspection/plan/verification/report and no unrequested git or deploy, non-empty section templates and seeds. |
| Guided discovery | `tests/ai/discovery.test.ts` | 17 | Discovery is deterministic and demo-labelled; one question per turn with a reason; design/software/content/Indonesian detection; explicit category override; no repeated questions; soft-budget stop; unknown → labelled recommendation with matching trade-offs; assumptions persist after the interview moves on; skipped answers stay out of requirements; uncertainty is routed to ambiguities; unresolved areas become open questions. |
| Draft composition | `tests/ai/draft-depth.test.ts` | 10 | Draft output is labelled `draft`; increasing depth adds length without duplicate headings; concise omits open questions and detailed adds them plus an uncertainty policy; assumptions are provisional at every depth; coding drafts contain inspection, plan, implementation rules, verification and final report; design drafts adapt the working agreement; concise coding triggers a depth recommendation. |
| Builder draft storage | `tests/storage/builder-draft.test.ts` | 11 | Default draft shape; round-trip of mode, configuration, guided step, idea, budget, depth, agent, brief and confirmation; corrupt data degrades to defaults; out-of-range values are repaired; stable snapshot identity for `useSyncExternalStore`; clear removes both storage and cache; sanitisation of unknown depth/agent; brief → configuration carries objective, audience, context, depth, agent and brief. |
| Scoring | `tests/scoring/calculate-score.test.ts` | 10 | Overall score = mean of the eight dimensions, rounded; out-of-range or non-finite values throw instead of being clamped; fingerprints are stable across whitespace and line endings. |
| Comparison | `tests/scoring/compare-scores.test.ts` | 7 | Deltas equal `improved − original` per dimension; declines and unchanged dimensions are reported as measured; rubric and category mismatches are flagged, not compared; the displayed overall change equals the difference of the rounded overalls. |
| Request validation | `tests/validation/schemas.test.ts` | 25 | Objective is required with a floor; all 20 categories accepted; optional depth/agent/brief keep legacy payloads valid; unknown depth/agent rejected; brief requires sections and a real objective, rejects unknown sources/categories, defaults assumptions and unknowns; discovery accepts accumulated answers, defaults answers, bounds the budget and answer count, rejects unknown statuses, and rejects short or overlong ideas; a browser-supplied `overallScore` is dropped rather than trusted. |
| Analyzer engine | `tests/ai/heuristic-analyzer.test.ts` | 13 | All eight dimensions return integers in range; overall score matches the shared formula; evaluation is deterministic; ordering holds (vague < average < structured); brevity is penalised; repeated signal words cannot reach a perfect score. |
| Evidence honesty | `tests/ai/evidence.test.ts` | 4 | A well-specified prompt yields no fabricated weakness; quoted evidence is verbatim from the prompt; no evidence is attached when the prompt contains no vague wording; a "detected but thin" dimension never claims the signal is missing. |
| Live provider | `tests/ai/live-provider.test.ts` | 15 | Live mode is detected without exposing the key; the request uses structured JSON with a schema and the rubric; the server computes the overall score even when the model returns its own; a malformed response triggers exactly one retry with corrective feedback; an empty response, a 429, a rejected key and a missing model each map to a distinct, non-leaking error. |
| Provider errors | `tests/ai/errors.test.ts` | 11 | Mapping for 429 / quota / 401 / 403 / 400 / 404 / 5xx / timeout / network; retryability is derived correctly; user-facing messages never contain provider text; normalised provider errors are never marked safe to display verbatim. |
| Provider schemas | `tests/ai/schemas.test.ts` | 11 | Structural validation of AI output; duplicate or missing dimensions are rejected; unsupported JSON-Schema keywords are stripped before the request while enums and required fields survive. |
| Rate limiting | `tests/ai/throttle.test.ts` | 7 | Requests are allowed up to the ceiling, then blocked with a retryable `throttled` error; buckets are per client; the window resets; a nonsense env value falls back to the safe default. |
| Demo improver | `tests/ai/demo-improve.test.ts` | 11 | The original text is preserved verbatim; missing facts become confirmation questions, never inventions; the change list covers the dimensions it touched; the revision scores higher on clarity *and* still reports remaining weaknesses. |
| History storage | `tests/storage/prompt-storage.test.ts` | 13 | Versions append with new ids; earlier versions keep their text and snapshots; editing invalidates only that version's evaluation; the last version cannot be deleted; deleting the current version moves the pointer; corrupted JSON degrades to an empty library. |
| Comparison storage | `tests/storage/comparison-storage.test.ts` | 8 | Newest-first ordering, id replacement, deletion, corrupted JSON tolerance, and a stable snapshot reference (so React's `useSyncExternalStore` cannot loop). |
| Browser key contract | `tests/security/browser-api-key.test.ts` | 9 | Header name is single-sourced; blank, placeholder and oversized values are rejected; the mask never returns the full key. |
| Request-scoped keys | `tests/ai/browser-key-provider.test.ts` | 10 | A browser key wins for its own request while the environment client stays cached; the status payload never contains either key; provider errors redact the key; a full analyze call passes it through. |
| Connection verification | `tests/ai/verify-connection.test.ts` | 9 | The verify path reports model and source only, fails cleanly with no key, names the provider that is missing a key, distinguishes a rejected key from an unavailable model, keeps the key when only the test generation is slow, and never echoes the key. |
| Key and theme preferences | `tests/ui/settings-preferences.test.ts` | 12 | Session storage is the default; the device copy appears only after opt-in; clear removes both; theme falls back to `system`, rejects invalid values, and the pre-paint script matches the storage key. |
| Settings integration | `tests/ui/browser-key-settings.test.ts` | 6 | The key header is attached to `/api/ai/*` only, never third-party URLs; extra headers are preserved; source copy distinguishes server, browser and demo. |
| Theme tokens | `tests/ui/theme-tokens.test.ts` | 16 | Both blocks define every semantic token; light is genuinely light; foreground/background pairs clear WCAG AA in both themes. |
| OpenAI-compatible adapter | `tests/ai/openai-compatible.test.ts` | 9 | Bearer auth and chat/completions shape; structured JSON returned with token usage; one repair retry on invalid JSON; 429 + Retry-After maps to a retryable redacted error; a gateway that rejects `response_format` is retried without it; model listing filters malformed entries; verify calls models then a tiny generation; a missing base URL fails before the network; SSE deltas are parsed defensively. |
| Multi-provider routing | `tests/ai/router.test.ts` | 9 | A transient failure switches provider while preserving the system instruction and prompt verbatim; a rejected key never falls back; `auto` never switches; `manual` honours its provider with fallback off and switches only when enabled; the busy Gemini model still retries its fallback model; an over-budget Retry-After is not waited on; missing keys report `missing_api_key`; a configured-but-unusable provider reports `unsupported_capability`. |
| Health and usage | `tests/ai/health-usage.test.ts` | 9 | Untested versus connected; disabled and not-configured states; success rate and average latency; recovery after a later success; rejected key → connection failure; rate-limit cooldown expiry; usage records reported tokens and marks absent usage unavailable; providers are kept separate; the ledger is bounded at 200 records and 12 recent entries. |
| Provider settings | `tests/ui/ai-provider-settings.test.ts` | 8 | Per-provider keys default to session storage and move only on opt-in; Gemini delegates to the legacy key; placeholders are rejected and clear removes both copies; keys and non-secret config attach only to own `/api/ai/*` URLs; the config header stays absent while everything is default; base URLs require https or localhost; unknown providers/routing values are dropped while valid siblings survive; fallback order is deduplicated. |

**Result:** 293 passed / 293. TypeScript: no errors. ESLint: no errors or warnings. Production build: clean,
including `/api/ai/discover`, `/api/ai/models` and `/api/ai/usage`.

Three defects were found by these tests and fixed rather than worked around:

1. A non-JSON model response threw before the recovery retry could run.
2. Raw provider text was retained in the thrown error message; it is now kept in a separate `detail`
   field used only for server logs.
3. Provider health compared timestamps, so a failure recorded in the same millisecond as an earlier
   success was reported as `connected`. Ordering is now tracked explicitly.

During the guided work the discovery tests also caught an unknown answer being replaced by a generic
"Not decided yet" once the interview advanced; the seed recommendation now persists, and uncertainty
clauses are excluded from explicit requirements.

## 2. End-to-end flow checks (headless Chromium)

Run with `node scripts/qa-<name>.mjs` against `npm run dev`.

| Script | Flow verified | Result |
|---|---|---|
| `qa-guided-flow.mjs` | Guided default tab; sample fill; discovery; unknown → recommendation → accepted assumption; interview to brief; provenance labels and open questions; depth and coding-agent selection; generated prompt with demo badge, outline, 58 section-copy buttons; save dialog; Guided ↔ Advanced switching that preserves the objective and generated work; analyzer handoff with domain labels; 390 px mobile pass. | Pass, zero console errors, no horizontal overflow |
| `qa-guided-live.mjs` | Live status; live discovery call (one turn); live generation; guided UI showing the live badge and a real question. | Pass once the provider answered; earlier attempts returned provider 429/504 and the UI fell back with labels |
| `qa-builder-flow.mjs` | Empty submit is blocked and focused; preset applies exact values; chips toggle; generate produces a structured prompt; mobile has no overflow; a slider is operable from the keyboard. | Pass, no console errors |
| `qa-analyzer-flow.mjs` | Analyze is disabled until input is valid; sample loads; all result sections render; DEMO DATA badge present. | Pass |
| `qa-analyzer-cases.mjs` | A contradictory brief reports contradictions; a structured brief does not. | 4 contradictions detected in the conflicting brief, 0 in the clean one |
| `qa-comparison-flow.mjs` | Analyze → improve → re-evaluate → compare → save → reload. | Radar renders, 8 dimension rows, original preserved at 135 chars, comparison survives reload; API calls all 200 |
| `qa-history-flow.mjs` | Save session; append improved version; restore; reload; delete. | Version sources `manual → improved → restored`; both evaluations stored under the same rubric; 0/1 session counts correct after delete |
| `qa-history-deep.mjs` | Builder → save → analyze a saved version → improve → append → view evaluation → edit as new version → compare versions. | `versions: 3` (`generated, improved, manual`), evaluations linked to the original version, comparison record created from v1 → v2 |
| `qa-keyboard-motion.mjs` | Skip link, tab order, slider keys (Arrow/Home/End), disclosure Enter, chip Space, modal focus + Escape, reduced motion, focus rings. | All pass; focus ring is 2px orange at 3px offset; reduced motion converts the entrance to a 0.01ms fade |
| `qa-screenshots.mjs` | Every route at 1440 / 900 / 390 px, checking scroll width and element overflow. | No page overflow at any width; the mobile docs route overflow found during the audit was fixed by stacking the table instead of shrinking it |
| `qa-theme-density.mjs` | Both themes on all seven routes at 1440, light mode at 390, reduced motion, a live switch with no reload, and persistence across a reload. | Theme applied before paint on every route, `color-scheme` matches, no console errors, no horizontal overflow (1440 → `scrollWidth` 1440, 390 → 390), reduced-motion entrance is `0.01ms`, choice survives a reload |
| `qa-final-visuals.mjs` | Seeds a session, an improved version and a comparison, then captures both themes plus generated builder and populated analyzer screens. | Screenshots consistent across themes; seeded store reports 1 session and 1 comparison |
| `qa-axe-a11y.mjs` | axe-core (WCAG 2.0/2.1 A + AA) on all seven routes in dark and light. | 0 violations across 14 runs |
| `qa-settings-key-flow.mjs` | Settings key panel: reveal, remember warning, synthetic-key rejection, blank-submit guard, privacy copy. | Synthetic key is rejected and not retained in either storage; warning appears only after opt-in; blank submit is disabled |

### Guided-flow evidence in detail

`qa-guided-flow.mjs` reported, step by step:

| Step | Observed |
|---|---|
| Initial | Guided tab selected, idea field present, question-budget select present, step rail shows Questions and Brief |
| Sample fill | Idea length 97 characters |
| Discovery | Question 1 rendered, understanding panel shown, demo label shown |
| Recommendation | "PromptScope recommends" shown after **I don't know**; **Keep this assumption** accepted it |
| Interview | 2 answers, then brief ready (budget 5) |
| Brief | Visible, `Your input` label, `Assumption` label, `Open questions` present |
| Tuning | Four depth options and seven agent options rendered; Detailed and Coding selected |
| Output | Generated; source label present; DEMO DATA notice; Detailed depth badge; Coding / Software Agent badge; outline; Repository Inspection, Verification and Final Report sections; 22,391 characters of page text |
| Copy | 58 `Copy section` buttons; Markdown export present |
| Save | Dialog opened |
| Mode switch | Advanced visible, objective preserved, Guided hidden; switching back preserved the generated prompt |
| Analyzer handoff | Notice shown, prompt loaded, backend category labelled |
| Analysis | Dimensions, `visual-uiux-v1` rubric, design labels, weaknesses and missing information all rendered with the demo badge |
| Mobile | `scrollWidth` 390 at `innerWidth` 390; guided copy visible |

`qa-guided-live.mjs` separately confirmed `mode: "live"` with `gemini-3.6-flash`, a live discovery turn
(`source: "live"`, ~78 s), and a live generation (`source: "live"`, 4,508 characters, 11 sections,
balanced depth, design agent, no placeholder text). The first attempt returned provider 429/504; the UI
surfaced the failure and fell back to labelled demo output rather than pretending it was live.

## 3. Accessibility

Lighthouse (via the in-app browser) on `/`, `/builder`, `/analyzer` (empty), `/analyzer` (with a DEMO DATA result), `/history`, `/settings`, `/docs`:

- Accessibility: **100** on every route.
- Best practices: **100**.
- SEO: **100**.

Re-run against the production build (`next start`) after the theme and density work: accessibility **100**
and best practices **100** on all seven routes. The mobile best-practices pass initially failed the
legible-font audit (`45.96%` of analyzer text was under 12px); 11px metadata is now 12px below 640px,
and the audit is clean.

The first accessibility pass scored 96: the metadata token `#686F78` measured 3.85:1 against the page ground. The token is now `#7C838C`, which clears 4.5:1 on every surface in the palette, and the audit is 100 on the densest page.

Manual keyboard checks (evidence in `qa-keyboard-motion.mjs`): the skip link is the first stop, all navigation and controls are reachable in order, sliders respond to arrow/Home/End keys, disclosures open with Enter, chips toggle with Space, dialogs move focus inside and close with Escape, and severity is always expressed with text as well as colour.

### Theme contrast

`tests/ui/theme-tokens.test.ts` computes WCAG contrast from the real token values in `app/globals.css`
and fails the suite below AA. Body text (`--ink` on `--bg`) holds 7:1; metadata, status pairs, accent
labels and severity colours hold 4.5:1 in both the dark studio and the light paper theme. The light
palette was adjusted twice because the test caught real shortfalls: `--ink-3` measured 4.44:1 on the
light surface, and the first orange (`#B4500E`) was too close to the ground for comfortable reading.

Theme QA (`scripts/qa-theme-density.mjs`) confirms the pre-paint script sets `data-theme` and
`color-scheme` before hydration, that switching themes repaints without a reload, that the choice
survives a reload, and that the layout has no horizontal overflow in either theme at 1440 and 390 px.

Single-column workspace QA for the builder and analyzer exercised the complete analyzer flow
(analyze → improve → re-evaluate) and the builder generate flow at 1440, 900 and 390 px in both
themes. Every pass reported zero horizontal overflow and zero console errors, and the evaluation
card rendered below the prompt input rather than beside it.

An axe-core scan (`scripts/qa-axe-a11y.mjs`) reports **0 violations** across all seven routes in both
themes. It caught one real defect the token test could not see: an unlayered `a { color: inherit }`
rule sat above Tailwind's utility layer, so primary links (dashboard, empty states) kept the near-white
body colour instead of `--on-accent` and measured 1.87:1 on orange in dark mode, 3.4:1 in light. The
rule was removed — Tailwind preflight already handles anchor colour — and the scan is clean.

The same scan, re-run after the guided builder landed, caught a second real defect: the active step
number used `text-orange` on the light accent background and measured **4.44:1** at 9px, just under AA.
It now uses `text-ink`, and the re-run reports 0 violations across 14 route/theme combinations.

## 4. Security

| Check | Command | Result |
|---|---|---|
| No key in the client bundle | scan of `.next/static/chunks/*.js` for `AIza…`, `AQ.…`, provider endpoints | No key value and no provider endpoint. `GEMINI_API_KEY` appears only as UI copy in the setup notice. |
| No secrets tracked | `git ls-files \| grep -i env` | Only `.env.example` |
| Env file ignored | `git check-ignore -v .env.local` | Matched by `.gitignore` |
| No key-shaped strings committed | `git grep -E "AIza[0-9A-Za-z_-]{10,}"` and `git grep -E "AQ\.[0-9A-Za-z._-]{10,}"` | No matches |
| Provider errors do not leak | `tests/ai/errors.test.ts`, `tests/ai/openai-compatible.test.ts`, `tests/ai/live-provider.test.ts`, `tests/ai/browser-key-provider.test.ts` | Raw provider text lives in `detail` for server logs; request keys and known key shapes are replaced with `***`; the browser receives `userMessageForCode[code]`, or an application-authored `safeMessage` that never contains provider text |
| Browser key stays request-scoped | `tests/ai/browser-key-provider.test.ts` | The environment provider instance is never replaced by a browser key; status never contains the key |
| Provider keys are scoped and masked | `tests/ui/ai-provider-settings.test.ts`, `tests/security/browser-api-key.test.ts` | Keys travel in `x-promptscope-provider-keys` only to own `/api/ai/*` URLs; snapshots expose a mask, never the key; secrets are never stored in the preference key |
| Browser key is opt-in on disk | `tests/ui/settings-preferences.test.ts` | Session storage by default; device storage only after the user ticks remember; clear removes both |
| Input is validated server-side | `tests/validation/schemas.test.ts`, live endpoint checks | `400` with field errors for a short prompt; `413`-class body limit; browser-supplied scores are discarded |

## 5. Endpoint checks (live HTTP)

| Request | Observed |
|---|---|
| `GET /api/ai/status` | `{ mode: "demo", configured: false, source: "none", model: null }` without a key; `{ mode: "live", configured: true, source: "environment", provider, routing, providers[] }` with one; `source: "browser"` when the request carries a usable key; each provider carries its own status, model and key source |
| `POST /api/ai/models` | Models reported by the selected provider, or documented ids when the provider does not list them; a provider that cannot list models degrades to its documented set instead of failing the page |
| `GET /api/ai/usage` | In-process request/failure/latency counters and token totals only where providers reported them; resets on restart; never includes a key |
| `POST /api/ai/verify` | `{ model, source }` (plus `slow: true` when only the test generation timed out) when the provider answers; `missing_api_key`, `invalid_api_key` or `model_unavailable` for a configuration problem; the key is never in the response |
| `POST /api/ai/discover` | `{ source: "demo" }` in Demo Mode with one question and a brief; `{ source: "live" }` with a real Gemini turn; provider timeout returns a labelled error so the client falls back to demo discovery |
| `POST /api/ai/generate` | Structured prompt, `source: "demo"` in Demo Mode or `"live"` with a key; `depth` and `targetAgent` echoed back |
| `POST /api/ai/analyze` | Eight dimensions, server-calculated overall, weaknesses, contradictions, domain-labelled dimensions |
| `POST /api/ai/analyze` with a 5-character prompt | `400 invalid_request` with a field message |
| `POST /api/ai/analyze` with more than 40,000 characters | `400 invalid_request`; the limit is shared with the client editor |
| 13th request inside a minute | `429 throttled` with a retry message — the limiter was proven by a test run hitting it |

## 6. Calibration evidence for Demo Mode

The same three prompts, scored by the local rule engine (reproducible):

| Prompt | Overall | Notes |
|---|---|---|
| `Design a modern dashboard for our app. It should look clean and professional, and use nice colors.` | 14 | Every requirement dimension is in the "needs significant improvement" band |
| `Design a modern minimalist dashboard for a fintech app. Use a dark interface with warm accent colours…` | 25 | Direction recognised, still thin |
| The structured landing-page brief in `config/samples.ts` | 75 | Strong foundation, no fabricated weaknesses |

Ordering is monotonic and no dimension reaches 100 from repetition alone.

## 7. Documented limitations

- Scores are model-assisted diagnostics; the same prompt can score differently across runs or models.
- Demo Mode reasons over keywords and structure, so its explanations are pattern-driven, not semantic.
  Its guided interview is scripted from a seeded question bank rather than generated semantically.
- The guided interview is adaptive within a bounded seed set. It cannot know facts that were never
  described, and it records assumptions rather than verifying them.
- Coding-agent prompts ask an agent to inspect, plan, verify and report; PromptScope does not run code,
  tests, migrations or deployments.
- History, versions, builder drafts and comparisons live in `localStorage` of one browser profile; there
  is no cloud sync.
- Live availability depends on the provider, the account quota and the configured model. Live discovery
  and generation can take 30–90 seconds and may fail; fallbacks are labelled.
- Prompt text sent to the analyzer is capped at 40,000 characters.
- The rate limiter is per process; a multi-instance deployment should also rely on platform-level limits.
- Provider health and usage are per process and reset on restart. They are an operational view, not an
  invoice; token counts are shown only when a provider reports them.
- Vikey was verified against its published docs but has not been exercised with a real key in this
  environment. Dattio has no verifiable public documentation, so it is opt-in and unverified; PromptScope
  does not guess its endpoint, model or request format.
- Route handlers are covered through module-level tests plus live HTTP checks rather than an automated
  server harness.

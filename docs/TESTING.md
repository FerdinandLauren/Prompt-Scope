# PromptScope — Testing & QA report

Verified 16 November 2026. Every number below came from a command that was actually run against this repository; nothing here is projected.

## 1. Automated tests

```bash
npm test        # vitest, 180 tests, 18 files
npm run typecheck
npm run lint
```

| Suite | File | Tests | What it proves |
|---|---|---|---|
| Scoring | `tests/scoring/calculate-score.test.ts` | 10 | Overall score = mean of the eight dimensions, rounded; out-of-range or non-finite values throw instead of being clamped; fingerprints are stable across whitespace and line endings. |
| Comparison | `tests/scoring/compare-scores.test.ts` | 7 | Deltas equal `improved − original` per dimension; declines and unchanged dimensions are reported as measured; rubric and category mismatches are flagged, not compared; the displayed overall change equals the difference of the rounded overalls. |
| Request validation | `tests/validation/schemas.test.ts` | 14 | Objective is required with a floor; slugs are constrained; slider values must be whole numbers in 0–100 with all eight keys present; list caps hold; a browser-supplied `overallScore` is dropped rather than trusted. |
| Analyzer engine | `tests/ai/heuristic-analyzer.test.ts` | 13 | All eight dimensions return integers in range; overall score matches the shared formula; evaluation is deterministic; ordering holds (vague < average < structured); brevity is penalised; repeated signal words cannot reach a perfect score. |
| Evidence honesty | `tests/ai/evidence.test.ts` | 4 | A well-specified prompt yields no fabricated weakness; quoted evidence is verbatim from the prompt; no evidence is attached when the prompt contains no vague wording; a "detected but thin" dimension never claims the signal is missing. |
| Live provider | `tests/ai/live-provider.test.ts` | 13 | Live mode is detected without exposing the key; the request uses structured JSON with a schema and the rubric; the server computes the overall score even when the model returns its own; a malformed response triggers exactly one retry with corrective feedback; an empty response, a 429, a rejected key and a missing model each map to a distinct, non-leaking error. |
| Provider errors | `tests/ai/errors.test.ts` | 9 | Mapping for 429 / quota / 401 / 403 / 400 / 404 / 5xx / timeout / network; retryability is derived correctly; user-facing messages never contain provider text. |
| Provider schemas | `tests/ai/schemas.test.ts` | 11 | Structural validation of AI output; duplicate or missing dimensions are rejected; unsupported JSON-Schema keywords are stripped before the request while enums and required fields survive. |
| Rate limiting | `tests/ai/throttle.test.ts` | 7 | Requests are allowed up to the ceiling, then blocked with a retryable `throttled` error; buckets are per client; the window resets; a nonsense env value falls back to the safe default. |
| Demo improver | `tests/ai/demo-improve.test.ts` | 11 | The original text is preserved verbatim; missing facts become confirmation questions, never inventions; the change list covers the dimensions it touched; the revision scores higher on clarity *and* still reports remaining weaknesses. |
| History storage | `tests/storage/prompt-storage.test.ts` | 13 | Versions append with new ids; earlier versions keep their text and snapshots; editing invalidates only that version's evaluation; the last version cannot be deleted; deleting the current version moves the pointer; corrupted JSON degrades to an empty library. |
| Comparison storage | `tests/storage/comparison-storage.test.ts` | 8 | Newest-first ordering, id replacement, deletion, corrupted JSON tolerance, and a stable snapshot reference (so React's `useSyncExternalStore` cannot loop). |
| Browser key contract | `tests/security/browser-api-key.test.ts` | 9 | Header name is single-sourced; blank, placeholder and oversized values are rejected; the mask never returns the full key. |
| Request-scoped keys | `tests/ai/browser-key-provider.test.ts` | 10 | A browser key wins for its own request while the environment client stays cached; the status payload never contains either key; provider errors redact the key; a full analyze call passes it through. |
| Connection verification | `tests/ai/verify-connection.test.ts` | 7 | The verify path reports model and source only, fails cleanly with no key, distinguishes a rejected key from an unavailable model, keeps the key when only the test generation is slow, and never echoes the key. |
| Key and theme preferences | `tests/ui/settings-preferences.test.ts` | 12 | Session storage is the default; the device copy appears only after opt-in; clear removes both; theme falls back to `system`, rejects invalid values, and the pre-paint script matches the storage key. |
| Settings integration | `tests/ui/browser-key-settings.test.ts` | 6 | The key header is attached to `/api/ai/*` only, never third-party URLs; extra headers are preserved; source copy distinguishes server, browser and demo. |
| Theme tokens | `tests/ui/theme-tokens.test.ts` | 16 | Both blocks define every semantic token; light is genuinely light; foreground/background pairs clear WCAG AA in both themes. |

**Result:** 180 passed / 180. TypeScript: no errors. ESLint: no errors or warnings.

Two defects were found by these tests and fixed rather than worked around:

1. A non-JSON model response threw before the recovery retry could run.
2. Raw provider text was retained in the thrown error message; it is now kept in a separate `detail` field used only for server logs.

## 2. End-to-end flow checks (headless Chromium)

Run with `node scripts/qa-<name>.mjs` against `npm run dev`.

| Script | Flow verified | Result |
|---|---|---|
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

An axe-core scan (`scripts/qa-axe-a11y.mjs`) reports **0 violations** across all seven routes in both
themes. It caught one real defect the token test could not see: an unlayered `a { color: inherit }`
rule sat above Tailwind's utility layer, so primary links (dashboard, empty states) kept the near-white
body colour instead of `--on-accent` and measured 1.87:1 on orange in dark mode, 3.4:1 in light. The
rule was removed — Tailwind preflight already handles anchor colour — and the scan is clean.

## 4. Security

| Check | Command | Result |
|---|---|---|
| No key in the client bundle | scan of `.next/static/chunks/*.js` for `AIza…`, `AQ.…`, provider endpoints | No key value and no provider endpoint. `GEMINI_API_KEY` appears only as UI copy in the setup notice. |
| No secrets tracked | `git ls-files \| grep -i env` | Only `.env.example` |
| Env file ignored | `git check-ignore -v .env.local` | Matched by `.gitignore` |
| No key-shaped strings committed | `git grep -E "AIza[0-9A-Za-z_-]{10,}"` and `git grep -E "AQ\.[0-9A-Za-z._-]{10,}"` | No matches |
| Provider errors do not leak | `tests/ai/errors.test.ts`, `tests/ai/live-provider.test.ts`, `tests/ai/browser-key-provider.test.ts` | Raw provider text lives in `detail` for server logs; the request key and Google key shapes are replaced with `***`; the browser receives `userMessageForCode[code]` |
| Browser key stays request-scoped | `tests/ai/browser-key-provider.test.ts` | The environment provider instance is never replaced by a browser key; status never contains the key |
| Browser key is opt-in on disk | `tests/ui/settings-preferences.test.ts` | Session storage by default; device storage only after the user ticks remember; clear removes both |
| Input is validated server-side | `tests/validation/schemas.test.ts`, live endpoint checks | `400` with field errors for a short prompt; `413`-class body limit; browser-supplied scores are discarded |

## 5. Endpoint checks (live HTTP)

| Request | Observed |
|---|---|
| `GET /api/ai/status` | `{ mode: "demo", configured: false, source: "none", model: null }` without a key; `{ mode: "live", configured: true, source: "environment" }` with one; `source: "browser"` when the request carries a usable `x-promptscope-api-key` header |
| `POST /api/ai/verify` | `{ model, source }` (plus `slow: true` when only the test generation timed out) when the provider answers; `missing_api_key`, `invalid_api_key` or `model_unavailable` for a configuration problem; the key is never in the response |
| `POST /api/ai/generate` | Structured prompt, `source: "demo"` |
| `POST /api/ai/analyze` | Eight dimensions, server-calculated overall, weaknesses, contradictions |
| `POST /api/ai/analyze` with a 5-character prompt | `400 invalid_request` with a field message |
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
- History, versions and comparisons live in `localStorage` of one browser profile; there is no cloud sync.
- Only the Visual Design and UI/UX categories are implemented.
- Live availability depends on the provider, the account quota and the configured model.
- The rate limiter is per process; a multi-instance deployment should also rely on platform-level limits.
- Route handlers are covered through module-level tests plus live HTTP checks rather than an automated server harness.

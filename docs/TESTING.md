# PromptScope — Testing & QA report

Milestone 7. Every number below came from a command that was actually run against this repository; nothing here is projected.

## 1. Automated tests

```bash
npm test        # vitest, 120 tests, 12 files
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

**Result:** 120 passed / 120. TypeScript: no errors. ESLint: no errors or warnings.

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

## 3. Accessibility

Lighthouse (via the in-app browser) on `/`, `/builder`, `/analyzer` (empty), `/analyzer` (with a DEMO DATA result), `/history`, `/settings`, `/docs`:

- Accessibility: **100** on every route.
- Best practices: **100**.
- SEO: **100**.

The first accessibility pass scored 96: the metadata token `#686F78` measured 3.85:1 against the page ground. The token is now `#7C838C`, which clears 4.5:1 on every surface in the palette, and the audit is 100 on the densest page.

Manual keyboard checks (evidence in `qa-keyboard-motion.mjs`): the skip link is the first stop, all navigation and controls are reachable in order, sliders respond to arrow/Home/End keys, disclosures open with Enter, chips toggle with Space, dialogs move focus inside and close with Escape, and severity is always expressed with text as well as colour.

## 4. Security

| Check | Command | Result |
|---|---|---|
| No key in the client bundle | scan of `.next/static/chunks/*.js` for `AIza…`, provider endpoints | Only the string `GEMINI_API_KEY` appears, as UI copy in the setup notice. No key value, no provider endpoint. |
| No secrets tracked | `git ls-files \| grep env` | Only `.env.example` |
| Env file ignored | `git check-ignore -v .env.local` | Matched by `.gitignore` |
| No key-shaped strings committed | `git grep -E "AIza[0-9A-Za-z_-]{10,}"` | No matches |
| Provider errors do not leak | `tests/ai/errors.test.ts`, `tests/ai/live-provider.test.ts` | Raw provider text lives in `detail` for server logs; the browser receives `userMessageForCode[code]` |
| Input is validated server-side | `tests/validation/schemas.test.ts`, live endpoint checks | `400` with field errors for a short prompt; `413`-class body limit; browser-supplied scores are discarded |

## 5. Endpoint checks (live HTTP)

| Request | Observed |
|---|---|
| `GET /api/ai/status` | `{ mode: "demo", configured: false }` without a key; `{ mode: "live", model: "gemini-3.8-flash" }` with one |
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

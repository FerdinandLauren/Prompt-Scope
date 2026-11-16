# Hybrid API Key, Light Mode, and UX Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a secure hybrid browser API-key flow, persistent light/dark/system theming, and a less cramped responsive workspace without committing or embedding the user's testing key.

**Architecture:** Keep the existing server-side Gemini boundary but add request-scoped browser-key resolution. Environment configuration remains the default; a browser key is passed through a dedicated header, held in sessionStorage by default, and optionally persisted in localStorage after explicit opt-in. Add a client theme provider that applies `data-theme` and CSS semantic tokens, then refine shared layout tokens and dense surfaces rather than rewriting feature behavior.

**Tech Stack:** Next.js App Router, TypeScript, React client hooks, `@google/genai`, Zod, Tailwind/CSS tokens, Vitest, Puppeteer QA.

**Spec:** `docs/superpowers/specs/2026-11-16-hybrid-api-key-light-mode-ux-design.md`

## Global Constraints

- Never commit, hardcode, log, or bundle the user's API key.
- Keep Gemini calls server-side and preserve Demo Mode when no key is available.
- Environment key has priority; browser key is request-scoped and never stored server-side.
- Browser-key persistence is off by default and requires explicit opt-in warning.
- Existing scoring, rubric, history, comparison, and structured AI validation behavior must remain unchanged.
- Theme must support `system`, `light`, and `dark`, with reduced-motion support preserved.
- Desktop, tablet, and 390px mobile layouts must have no horizontal overflow.
- Every task ends with focused tests, then `npm run typecheck`, `npm run lint`, and a meaningful commit.

## Review Focus

- Browser-key override with an empty or malformed header must fall back safely to Demo Mode or the environment key; test in Task 2.
- A persisted browser key must not be readable from the server filesystem, logs, or client build as a literal; test in Task 2 and Task 6.
- Theme switching before hydration must not flash or mismatch markup; test in Task 4.
- Light semantic colors must preserve contrast for body, metadata, controls, status badges, charts, and focus rings; test in Task 5.
- Settings, Builder, Analyzer, Comparison, History, and Docs must remain usable at 390px without overflow after spacing changes; test in Task 6.

---

### Task 1: Define browser-key and theme contracts

**Files:**
- Create: `lib/security/browser-api-key.ts`
- Create: `types/settings.ts`
- Create: `lib/theme/theme-types.ts`
- Test: `tests/security/browser-api-key.test.ts`

**Interfaces:**
- Produces `BROWSER_API_KEY_HEADER: "x-promptscope-api-key"`.
- Produces `isUsableApiKey(value: unknown): value is string`.
- Produces `maskApiKey(value: string): string`.
- Produces `resolveBrowserApiKey(request: Request): string | undefined` with a length limit and placeholder rejection.
- Produces `ThemePreference = "system" | "light" | "dark"`.
- Produces `BrowserKeyPreference = { key: string; remember: boolean }`.

- [ ] **Step 1: Write failing security tests**

Test `isUsableApiKey` for valid-looking values, empty strings, whitespace, placeholders, and values above the configured maximum; test header extraction and masking without returning the complete key.

- [ ] **Step 2: Run the focused test**

Run: `npx vitest run tests/security/browser-api-key.test.ts`
Expected: FAIL because the security module does not exist.

- [ ] **Step 3: Implement the contracts**

Use a 256-character maximum, reject `your_api_key`, `changeme`, `paste-key-here`, and blank values case-insensitively. Mask with only the last four characters visible.

- [ ] **Step 4: Run the focused test**

Run: `npx vitest run tests/security/browser-api-key.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/security/browser-api-key.ts types/settings.ts lib/theme/theme-types.ts tests/security/browser-api-key.test.ts
git commit -m "feat: define secure browser key and theme contracts"
```

---

### Task 2: Add request-scoped Gemini key resolution

**Files:**
- Modify: `lib/ai/client.ts`
- Modify: `lib/ai/provider.ts`
- Modify: `lib/api/handler.ts`
- Modify: `app/api/ai/status/route.ts`
- Modify: `app/api/ai/generate/route.ts`
- Modify: `app/api/ai/analyze/route.ts`
- Modify: `app/api/ai/improve/route.ts`
- Test: `tests/ai/browser-key-provider.test.ts`

**Interfaces:**
- `getAiStatus(request?: Request): AiStatus` reports `source: "environment" | "browser" | "none"` and never returns a key.
- `getProvider(browserApiKey?: string): GoogleGenAI` uses the request key only when no environment key is available or when the route explicitly allows a temporary override; do not replace the process singleton for browser keys.
- `callStructured(request: StructuredRequest<T>, browserApiKey?: string)` passes the resolved key to `getProvider`.
- `guardRateLimit` continues to run before provider resolution.

- [ ] **Step 1: Write failing provider-resolution tests**

Cover: environment key wins by default; valid browser header works when env is absent; malformed/oversized header is ignored; no key returns Demo status; browser key is never included in status JSON; browser-key provider calls do not mutate the global environment provider singleton; a provider error does not echo the header.

- [ ] **Step 2: Run the focused test**

Run: `npx vitest run tests/ai/browser-key-provider.test.ts`
Expected: FAIL because request-aware resolution is not implemented.

- [ ] **Step 3: Implement request-aware provider plumbing**

Resolve the header once in each route, pass it through the operation into `callStructured`, and keep the existing env-only singleton path intact. The status route must report `source` only. Do not log the key.

- [ ] **Step 4: Run provider and existing AI tests**

Run: `npx vitest run tests/ai/browser-key-provider.test.ts tests/ai/live-provider.test.ts tests/ai/errors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ai lib/api/handler.ts app/api/ai tests/ai/browser-key-provider.test.ts
git commit -m "feat: support request-scoped browser Gemini keys"
```

---

### Task 3: Build client key storage and theme preference hooks

**Files:**
- Create: `hooks/use-browser-api-key.ts`
- Create: `hooks/use-theme-preference.ts`
- Create: `components/theme/theme-provider.tsx`
- Create: `components/theme/theme-toggle.tsx`
- Modify: `app/layout.tsx`
- Test: `tests/ui/settings-preferences.test.ts`

**Interfaces:**
- `useBrowserApiKey()` returns `{ key, hasKey, remembered, setKey(key, remember), clearKey, header }`.
- `useThemePreference()` returns `{ preference, resolvedTheme, setPreference }`.
- `ThemeProvider` applies `data-theme="light|dark"` to `<html>` and avoids hydration mismatch by using an inline pre-hydration preference reader.
- `ThemeToggle` exposes a labelled `system/light/dark` control with keyboard support.

- [ ] **Step 1: Write failing hook/contract tests**

Test session-only key storage, opt-in localStorage persistence, clear behavior, header generation, default system preference, explicit theme changes, and stable server snapshot behavior.

- [ ] **Step 2: Run the focused test**

Run: `npx vitest run tests/ui/settings-preferences.test.ts`
Expected: FAIL because hooks/provider do not exist.

- [ ] **Step 3: Implement the hooks and provider**

Use `sessionStorage` by default and localStorage only when `remember=true`. Never expose raw key in rendered text. Apply theme before paint through a tiny inline script or equivalent root attribute strategy, then synchronize with React.

- [ ] **Step 4: Run focused and type tests**

Run: `npx vitest run tests/ui/settings-preferences.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks components/theme app/layout.tsx tests/ui/settings-preferences.test.ts
git commit -m "feat: add browser key storage and theme preferences"
```

---

### Task 4: Add Settings API-key flow and theme controls

**Files:**
- Create: `components/settings/browser-key-panel.tsx`
- Modify: `components/settings/settings-view.tsx`
- Modify: `components/system/mode-badge.tsx`
- Modify: `components/layout/app-shell.tsx`
- Modify: `lib/api/client.ts`
- Test: `tests/ui/browser-key-settings.test.ts`

**Interfaces:**
- `BrowserKeyPanel` consumes `useBrowserApiKey`, status source, and `postJson`; it renders masked key state, show/hide, remember checkbox, warning, test connection, and clear action.
- `postJson` accepts optional headers while preserving existing call sites.
- All AI client calls attach the browser key header only when a browser key exists.

- [ ] **Step 1: Write failing Settings behavior tests**

Test user can enter a key, sees masked state, default remember is false, remember warning appears only when selected, clear removes it, test connection calls `/api/ai/status`, and ModeBadge reports environment/browser/demo source without rendering the key.

- [ ] **Step 2: Run the focused test**

Run: `npx vitest run tests/ui/browser-key-settings.test.ts`
Expected: FAIL because the panel and request-header support do not exist.

- [ ] **Step 3: Implement the panel and wire all AI requests**

Use plain security copy: browser persistence is convenient but not recommended on shared devices. Environment source remains visibly preferred. Add the `ThemeToggle` to Settings and desktop/mobile shell locations.

- [ ] **Step 4: Run UI/security checks**

Run: `npx vitest run tests/ui/browser-key-settings.test.ts tests/security/browser-api-key.test.ts && npm run lint`
Expected: PASS with no key in rendered output or logs.

- [ ] **Step 5: Commit**

```bash
git add components/settings components/system components/layout lib/api/client.ts tests/ui/browser-key-settings.test.ts
 git commit -m "feat: add practical browser key settings and theme controls"
```

---

### Task 5: Implement light semantic tokens and component theming

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `app/icon.svg`
- Modify: `DESIGN.md`
- Test: `tests/ui/theme-tokens.test.ts`

**Interfaces:**
- `[data-theme="dark"]` and `[data-theme="light"]` define semantic variables for background, surface, borders, text, accents, status colors, chart series, focus rings, inputs, and scrollbar.
- Existing components consume semantic variables instead of hardcoded dark-only fills where those fills affect surfaces/statuses.

- [ ] **Step 1: Write failing token tests**

Assert light and dark token blocks exist, accent/status variables are defined in both, and no light surface uses insufficient text token combinations according to the documented contrast assertions.

- [ ] **Step 2: Run the focused test**

Run: `npx vitest run tests/ui/theme-tokens.test.ts`
Expected: FAIL before light tokens exist.

- [ ] **Step 3: Implement theme token blocks**

Use a warm paper background for light mode, charcoal ink, quiet borders, orange primary action, rose original series, green positive, amber caution and red negative. Replace repeated hardcoded colors in shared primitives and major screens with semantic variables where practical; do not restructure unrelated component files.

- [ ] **Step 4: Run tests and Lighthouse**

Run: `npx vitest run tests/ui/theme-tokens.test.ts && npm run build`
Then run Lighthouse accessibility on `/`, `/builder`, `/analyzer`, `/comparison`, `/history`, `/settings`, `/docs` in both themes.
Expected: all routes remain at 100 accessibility and no contrast regression.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx app/icon.svg DESIGN.md tests/ui/theme-tokens.test.ts components
 git commit -m "feat: add accessible light and dark theme tokens"
```

---

### Task 6: Reduce UX density and responsive stacking

**Files:**
- Modify: `components/layout/page-header.tsx`
- Modify: `components/dashboard/dashboard-view.tsx`
- Modify: `components/builder/builder-view.tsx`
- Modify: `components/analyzer/analyzer-view.tsx`
- Modify: `components/improvement/improvement-workflow.tsx`
- Modify: `components/comparison/comparison-view.tsx`
- Modify: `components/history/history-view.tsx`
- Modify: `components/settings/settings-view.tsx`
- Modify: `app/docs/page.tsx`
- Modify: `app/globals.css`
- Test: `scripts/qa-theme-density.mjs`

**Interfaces:**
- No business logic changes; preserve existing props and route behavior.
- Shared page frame may grow to `max-w-[1560px]`; feature views may use a `density`/spacing class only if it reduces duplication.

- [ ] **Step 1: Write the QA assertions**

Extend the browser harness to capture light and dark screenshots at 1440/900/390, assert `scrollWidth === innerWidth`, assert Settings API panel and theme toggle are reachable, and ensure the builder/analyzer primary actions remain visible after the first viewport.

- [ ] **Step 2: Run the baseline harness**

Run: `node scripts/qa-theme-density.mjs`
Expected: baseline captures existing density and any overflow before changes.

- [ ] **Step 3: Apply layout refinement**

Increase section vertical rhythm, widen desktop workspaces, reduce repeated nested borders, add breathing room between analyzer result blocks, let comparison/history rows breathe, and keep mobile controls full-width or stacked intentionally. Do not add decorative cards or continuous animations.

- [ ] **Step 4: Run visual/interaction checks**

Run: `node scripts/qa-theme-density.mjs scripts/qa-keyboard-motion.mjs` (or the two commands separately), `npm run typecheck`, `npm run lint`, `npm test`.
Expected: no overflow, no console errors, keyboard and reduced-motion checks remain passing.

- [ ] **Step 5: Commit**

```bash
git add components app/globals.css scripts/qa-theme-density.mjs
 git commit -m "refactor: give workspace layouts more breathing room"
```

---

### Task 7: Update docs, env example, security tests, and final verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `docs/TESTING.md`
- Modify: `DESIGN.md`
- Test: `tests/security/browser-key-provider.test.ts`
- Test: `tests/ui/settings-preferences.test.ts`

- [ ] **Step 1: Update public documentation**

Document the hybrid priority order, session-only default, explicit localStorage warning, clear-key behavior, theme preference, and the fact that the user-provided testing key is not committed or embedded. Keep `.env.example` key-free.

- [ ] **Step 2: Run the complete test battery**

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
node scripts/qa-builder-flow.mjs
node scripts/qa-analyzer-flow.mjs
node scripts/qa-comparison-flow.mjs
node scripts/qa-history-deep.mjs
node scripts/qa-keyboard-motion.mjs
node scripts/qa-theme-density.mjs
```

Expected: all tests pass, no console errors, no horizontal overflow, build succeeds, and client-bundle secret scan finds no key values.

- [ ] **Step 3: Scan for secrets**

Run client bundle scan, `git grep` for `AIza`, `git ls-files` for env files, and verify `.env.local` remains ignored.
Expected: no user key, no key-shaped value, only `.env.example` tracked.

- [ ] **Step 4: Commit and push**

```bash
git add .env.example README.md docs DESIGN.md tests
 git commit -m "docs: document hybrid key setup and theme preferences"
 git push origin main
```

- [ ] **Step 5: Verify final repository state**

Run: `git status --porcelain`, `git rev-parse HEAD`, `git rev-parse origin/main`, `git remote -v`.
Expected: clean tree, local HEAD equals remote `main`, official remote unchanged.

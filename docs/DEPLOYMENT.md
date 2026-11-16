# PromptScope — Deployment

PromptScope is a standard Next.js App Router application. It has no database and no background jobs,
so a single deployment target plus one environment variable is enough.

## 1. Requirements

- Node.js 20.9 or newer (developed on Node 24).
- A Gemini API key only if you want Live AI Mode. Without one the app runs in Demo Mode.

## 2. Build check before deploying

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

All four must pass. The build output should list the four `ƒ` API routes and the static pages.

## 3. Vercel

1. Import the repository at <https://vercel.com/new>.
2. Framework preset: **Next.js**. Build command and output are detected automatically.
3. Add environment variables for the Production (and Preview) environment:

   | Name | Value | Required |
   |---|---|---|
   | `GEMINI_API_KEY` | key from Google AI Studio | for Live AI Mode |
   | `GEMINI_MODEL` | e.g. `gemini-3.6-flash` | optional, has a default |
   | `GEMINI_FALLBACK_MODEL` | e.g. `gemini-4-hydrogen` | optional, has a default |
   | `AI_RATE_LIMIT_MAX` | requests per window per IP | optional, default `12` |
   | `AI_RATE_LIMIT_WINDOW_MS` | window length in ms | optional, default `60000` |

4. Deploy. The key is read by the server only; it is never sent to the browser.
5. Verify after the first deploy:
   - `GET /api/ai/status` returns `{ "ok": true, "data": { "mode": "live", ... } }` when a key is set,
     and `"mode": "demo"` when it is not.
   - The dashboard badge reads **Live AI mode** or **Demo mode** accordingly.
   - One analyze request returns eight dimensions and an overall score.

## 4. Any Node host

```bash
npm ci
npm run build
npm run start           # serves on :3000
```

Run behind a reverse proxy that terminates TLS and forwards the client address, because the limiter
keys on `x-forwarded-for` / `x-real-ip`.

## 5. Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Enables Live AI Mode. Empty, missing or a placeholder string leaves the app in Demo Mode. | unset |
| `GEMINI_MODEL` | Gemini model id used for all three operations. Must support structured JSON output. | `gemini-3.6-flash` |
| `GEMINI_FALLBACK_MODEL` | Used once when the primary model answers 503 (high demand). Set to `none` to disable. | `gemini-4-hydrogen` |
| `AI_RATE_LIMIT_MAX` | Per-client request ceiling inside the window. | `12` |
| `AI_RATE_LIMIT_WINDOW_MS` | Window length in milliseconds. | `60000` |

Local development uses `.env.local`, which is git-ignored. Never commit a real key.

The environment key is the recommended configuration. A user can also paste a key into **Settings →
Gemini API key**; that key lives only in their browser, travels in the `x-promptscope-api-key` header
to this application's own `/api/ai/*` routes, and is used for that request only. It is never written to
a server log, a database, or the repository, and it never replaces the environment key for other
visitors. If a deployment must reject browser keys, block that header at the proxy or remove the
Settings panel; the environment key continues to work normally.

## 6. Operational notes

- The model may be retired by the provider; if calls begin failing, update `GEMINI_MODEL` and
  redeploy. Model availability is listed at <https://ai.google.dev/gemini-api/docs/models>.
- Provider errors are logged server-side with their raw detail and returned to the browser as a safe
  message plus a code, so a provider incident does not require reading the application logs to
  explain the state to a user.
- The in-process rate limiter protects one instance only. For multiple instances, also enable the
  platform's own rate limiting (for example a Vercel WAF rule on `/api/ai/*`).
- No prompt text is written to the server filesystem or to any server log; only the error detail from
  a provider failure is logged.

## 7. Rollback

Every milestone is a separate commit on `main`. To roll back a deployment, redeploy the previous
commit from the Vercel dashboard. Local user data lives in the browser and is unaffected by a
deployment change.

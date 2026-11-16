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

All four must pass. The build output should list the six `ƒ` API routes (`discover`, `generate`,
`analyze`, `improve`, `status`, `verify`) and the static pages.

## 3. Vercel

1. Import the repository at <https://vercel.com/new>.
2. Framework preset: **Next.js**. Build command and output are detected automatically.
3. Add environment variables for the Production (and Preview) environment:

   | Name | Value | Required |
   |---|---|---|
   | `GEMINI_API_KEY` | key from Google AI Studio | for Gemini Live AI Mode |
   | `GEMINI_MODEL` | e.g. `gemini-3.6-flash` | optional, has a default |
   | `GEMINI_FALLBACK_MODEL` | e.g. `gemini-4-hydrogen` | optional, has a default |
   | `VIKEY_API_KEY` | key from Vikey | optional |
   | `VIKEY_MODEL` | e.g. `vikey/agent-gpt` | optional, has a default |
   | `DATTIO_API_KEY` | key from Dattio | optional, unverified |
   | `DATTIO_BASE_URL` | your Dattio OpenAI-compatible base URL | required for Dattio |
   | `DATTIO_MODEL` | model from your Dattio account | required for Dattio |
   | `AI_ROUTING_MODE` | `manual`, `auto` or `auto_fallback` | optional, default `auto_fallback` |
   | `AI_PROVIDER_ORDER` | comma-separated provider ids | optional, default `gemini,vikey,dattio` |
   | `AI_RATE_LIMIT_MAX` | requests per window per IP | optional, default `12` |
   | `AI_RATE_LIMIT_WINDOW_MS` | window length in ms | optional, default `60000` |

4. Deploy. The key is read by the server only; it is never sent to the browser.
5. Verify after the first deploy:
   - `GET /api/ai/status` returns `{ "ok": true, "data": { "mode": "live", ... } }` when a key is set,
     and `"mode": "demo"` when it is not.
   - The dashboard badge reads **Live AI mode** or **Demo mode** accordingly.
   - One discover request returns a question and `source: "live"` (or a labelled fallback).
   - One generate request returns a prompt with `depth`, `targetAgent` and `source`.
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
| `GEMINI_API_KEY` | Enables Gemini Live AI Mode. Empty, missing or a placeholder string leaves Gemini unavailable. | unset |
| `GEMINI_MODEL` | Gemini model id used for all structured operations. Must support structured JSON output. | `gemini-3.6-flash` |
| `GEMINI_FALLBACK_MODEL` | Used once when the primary Gemini model answers 503 (high demand). Set to `none` to disable. | `gemini-4-hydrogen` |
| `GEMINI_MODELS` | Extra Gemini model ids for the Settings picker, comma separated. | unset |
| `VIKEY_API_KEY` | Enables Vikey (OpenAI-compatible, verified docs). | unset |
| `VIKEY_BASE_URL` | Vikey base URL. Must be https. | `https://api.vikey.ai/v1` |
| `VIKEY_MODEL` | Vikey model id. | `vikey/agent-gpt` |
| `DATTIO_API_KEY` | Enables the opt-in Dattio adapter. | unset |
| `DATTIO_BASE_URL` | Required for Dattio; no endpoint is guessed because no official docs were verifiable. | unset |
| `DATTIO_MODEL` | Required for Dattio; use a model from your account. | unset |
| `AI_ROUTING_MODE` | `manual`, `auto` or `auto_fallback`. Settings overrides it per browser. | `auto_fallback` |
| `AI_PROVIDER_ORDER` | Comma-separated automatic/fallback order (`gemini`, `vikey`, `dattio`). | `gemini,vikey,dattio` |
| `AI_PREFERRED_PROVIDER` | `auto` or a provider id. | `auto` |
| `AI_FALLBACK_ENABLED` | `true` or `false`; whether a transient failure may switch providers. | `true` |
| `AI_MANUAL_PROVIDER` | Provider id for manual mode. | unset |
| `AI_MANUAL_MODEL` | Model id for manual mode. | unset |
| `AI_RATE_LIMIT_MAX` | Per-client request ceiling inside the window. | `12` |
| `AI_RATE_LIMIT_WINDOW_MS` | Window length in milliseconds. | `60000` |

Local development uses `.env.local`, which is git-ignored. Never commit a real key.

The environment keys are the recommended configuration. A user can also save a key per provider in
**Settings → AI Providers & Models**; those keys live only in their browser, travel to this
application's own `/api/ai/*` routes, and are used for that request only. They are never written to a
server log, a database, or the repository. Never write a browser-entered key into an environment file.
If a deployment must reject browser keys, block the provider headers at the proxy or remove the Settings
panel; the environment configuration continues to work normally.

## 6. Operational notes

- A model may be retired by its provider; if calls begin failing, update the matching `*_MODEL`
  variable and redeploy. Model availability is listed at
  <https://ai.google.dev/gemini-api/docs/models> for Gemini and <https://docs.vikey.ai> for Vikey.
- Provider health and usage counters are in-process and reset on restart; they are an operational view,
  not billing. Token totals appear only when a provider reports them.
- Dattio has no verifiable public API documentation. Its adapter is opt-in and requires both
  `DATTIO_BASE_URL` and `DATTIO_MODEL`; without them the provider stays unavailable rather than guessing.
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

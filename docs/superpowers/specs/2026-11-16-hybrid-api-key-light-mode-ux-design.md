# Hybrid API Key, Light Mode, and UX Density Design

## Intent

Make PromptScope easier to configure and more comfortable to use without weakening the existing server-side AI boundary.

## Goals

- Support a temporary browser-session Gemini API key from Settings.
- Offer explicit opt-in device persistence with a security warning and clear action.
- Keep environment configuration as the preferred and higher-priority source.
- Never commit or embed the user-provided key.
- Add a persistent light/dark/system theme choice.
- Reduce perceived density across workspace surfaces while preserving the editorial instrument identity.
- Keep all existing scoring, AI validation, history, comparison, and Demo Mode behavior unchanged.

## Non-goals

- No authentication, user accounts, server database, or cloud key vault.
- No permanent server-side storage of browser-provided keys.
- No change to the evaluation rubric or scoring formula.
- No provider key in client bundles or logs.

## Security model

Configuration source priority:

1. `GEMINI_API_KEY` server environment key.
2. `x-promptscope-api-key` request header from the browser session/device key.
3. Demo Mode.

The browser key is held in memory/sessionStorage by default. Device persistence is opt-in localStorage and is clearly described as less secure. The client exposes only mode/configured/model status, never the key. API routes validate the header shape and provider requests are scoped to that request; a browser key must not replace the process-wide server provider singleton.

Key UX:

- Settings has a masked input, show/hide toggle, source indicator, "Test connection", "Use for this session", "Remember on this device" checkbox, and "Clear browser key".
- Environment-key mode shows that the server key is active and disables browser-key replacement unless the user explicitly chooses a temporary override.
- Errors never echo the key.
- Documentation explains that browser persistence is convenient but vulnerable to browser compromise and should not be used on shared devices.

## Theme model

`system` is the initial default and resolves to the OS preference. User selection `light` or `dark` is persisted in localStorage. A client theme provider applies a `data-theme` attribute to `<html>` without hydration mismatch. CSS tokens include both worlds; semantic states remain readable in both. Theme toggle is available in the shell and Settings.

## UX/layout direction

- Main desktop content max width increases from 1440 to 1560 where useful; gutters remain deliberate.
- Workspace header and section rhythm gain vertical breathing room.
- Builder and analyzer use a single vertical desktop column: input and direction first, evaluation directly below it, improvement last. Horizontal splits inside results are limited to paired comparisons.
- Mobile uses intentional stacking and a compact header/bottom navigation.
- Light Mode uses warm paper-white ground, charcoal text, restrained borders, and the same orange/rose data semantics.
- No new decorative animation; theme changes are short color transitions and respect reduced motion.

## Validation

- Unit tests for key source resolution, header validation, mode status, and no-key leakage.
- Browser tests for Settings key flow, clear action, theme persistence, dark/light screenshots, and no overflow at 390/900/1440.
- Existing 120-test suite, typecheck, lint, build, Lighthouse, keyboard and QA flows remain passing.

## Rollback

The change is isolated in its own milestone commit. Removing browser-key support returns the provider to environment-only behavior; removing theme attributes returns the dark token set. Existing history/local data remains compatible.

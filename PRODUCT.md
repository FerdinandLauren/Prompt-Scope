# PRODUCT.md — PromptScope

## Product

PromptScope is an AI-powered Prompt Direction & Evaluation Studio. It turns prompt engineering from trial-and-error into a measured workflow: define a direction, generate a structured prompt, diagnose it against a fixed rubric, improve it without losing intent, and compare the before and after with real evaluation data.

Initial domain: visual design and UI/UX prompt engineering. The architecture keeps categories and rubrics separable so other domains can be added later.

## Primary users

Designers, students, content creators, developers, and AI users who write prompts regularly but cannot tell which parts are weak, missing, vague, or contradictory. They want a second opinion that explains itself, not another text generator.

## Jobs to be done

1. **Build a prompt from intent.** Configure objective, audience, context, visual preferences, output, constraints, and eight focus sliders. Generate a structured prompt that preserves the user's requirements.
2. **Diagnose an existing prompt.** Paste a prompt and receive scores for Clarity, Context, Specificity, Visual Direction, Composition, Typography, Constraints, and Output Definition, with evidence and severity-ranked weaknesses.
3. **Improve and verify.** Ask AI to improve the prompt, re-evaluate it under the same rubric, and compare both snapshots honestly — including unchanged or lower scores.
4. **Keep a record.** Save sessions, preserve original and improved versions, revisit evaluations, and continue improving later.

## Product principles

- Direction before generation.
- Diagnosis before improvement.
- Preserve intent during optimization.
- Measure changes transparently; never force a positive result.
- Keep the user in control: every output is editable.
- Make AI legible: every score is explained, and every weakness cites the prompt where possible.

## Modes

- **Live AI Mode:** active when `GEMINI_API_KEY` is configured server-side. Prompts are sent to Google Gemini.
- **Demo Mode:** automatic fallback with no key. Uses deterministic heuristic sample output. It is visibly marked `DEMO DATA` and never claims a live model produced it.

## Non-goals for v1

Authentication, payments, teams, marketplace, image generation, multiple providers, cloud sync, and additional prompt domains. localStorage is the v1 persistence layer.

## Privacy

Live prompts are transmitted to Google Gemini for processing. The interface advises users not to submit confidential business information or sensitive personal data. API keys stay server-side. Demo Mode does not transmit prompt text.

## Definition of done

The complete journey works: build → generate → analyze → improve → re-evaluate → compare → save → revisit. Scoring and comparison math are tested. Demo Mode works without a key. API secrets never reach the browser or Git. The app is responsive, accessible, documented, and deployable.

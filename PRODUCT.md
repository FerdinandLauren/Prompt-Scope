# PRODUCT.md — PromptScope

## Product

PromptScope is a guided prompt-engineering and AI-agent instruction studio. It turns prompt engineering
from trial-and-error into a measured workflow: describe an idea, answer a short adaptive interview,
review a labelled project brief, choose a depth and a target agent, generate a structured prompt,
diagnose it against a domain-aware rubric, improve it without losing intent, and compare the before and
after with real evaluation data.

PromptScope covers twenty prompt domains across five groups — design, software, AI/data, business and
content — and seven target-agent profiles, including a coding agent that inspects, plans, verifies and
reports. The architecture keeps categories, rubrics, section templates and question seeds separable in
one configuration file so the taxonomy can grow without rewriting the workflow.

## Primary users

People who write prompts regularly but cannot tell which parts are weak, missing, vague, contradictory
or merely assumed: designers, developers, students, analysts, content creators, operators, and anyone
handing work to an AI agent. They want a second opinion that explains itself and a brief they can check,
not another text generator.

Two entry points serve them:

- **Beginners** who have an idea but not the vocabulary use the **Guided** flow. They should never need to
  know what a "composition constraint" or "output definition" is to produce a strong prompt.
- **Experienced users** who already know their requirements use **Advanced** and configure everything
  directly.

## Jobs to be done

1. **Turn an idea into a prompt.** Describe the goal in plain language. PromptScope detects the domain and
   complexity, asks one question at a time, and converts the answers into a first draft without requiring
   prompt-engineering vocabulary.
2. **Understand before generating.** See what PromptScope understood, which requirements are explicit,
   which are ambiguous, what is still unknown, and which choices are assumptions rather than facts.
3. **Shape the output.** Review and edit the project brief, choose one of four depths and one of seven
   target agents, then generate a prompt whose structure matches the work.
4. **Diagnose an existing prompt.** Paste a prompt and receive scores for eight dimensions, with evidence
   and severity-ranked weaknesses. The labels adapt to the domain, the eight keys do not.
5. **Improve and verify.** Ask AI to improve the prompt, re-evaluate it under the same rubric, and compare
   both snapshots honestly — including unchanged or lower scores.
6. **Keep a record.** Save sessions, preserve original and improved versions, revisit evaluations, and
   continue improving later.

## Guided-flow requirements

- One question at a time, with a short explanation of why the answer matters.
- Free-text answers, suggested options, **I don't know**, and **Skip**.
- "I don't know" returns a recommendation with rationale and trade-offs. It is recorded as an assumption.
- Skipped or unanswered areas become open questions, not invented facts.
- A configurable soft budget (3–12). The interview stops when the budget is reached or enough
  information exists.
- No repeated questions. Questions are ordered by how much they change the result.
- A brief that is reviewable, editable, revisable and confirmable before generation.
- Four depths: Concise, Balanced, Detailed, Comprehensive — each adding real detail, not repetition.
- Seven target agents: General, Coding, Design, Research, Workflow Automation, Content, Custom.
- A coding-agent prompt covers repository inspection, planning, implementation constraints, verification
  and final reporting, and never commits, pushes, deploys or runs destructive commands unless asked.

## Product principles

- **Ask before assuming.** Unknowns stay unknown until the user accepts a recommendation.
- **Label provenance.** Every brief section is user input, an assumption, or a recommendation. Never blur
  the three.
- **Plain language first.** Beginner-friendly wording, with technical detail available on request.
- **Direction before generation. Diagnosis before improvement.**
- **Preserve intent during optimization.** Constraints, structure, assumptions and remaining unknowns
  survive a revision.
- **Measure changes transparently; never force a positive result.** Length alone never raises a score.
- **Keep the user in control: every output is editable.**
- **Make AI legible.** Every score is explained, and every weakness cites the prompt where possible.
- **Fail loudly and honestly.** A fallback is labelled as a fallback, never passed off as model output.

## Modes

- **Live AI Mode:** active when `GEMINI_API_KEY` is configured server-side. Discovery, generation,
  analysis and improvement are sent to Google Gemini.
- **Demo Mode:** automatic fallback with no key. Uses deterministic discovery, generation and heuristic
  analysis. It is visibly marked `DEMO DATA` / `Demo discovery` and never claims a live model produced it.
- **Draft fallback:** if live generation fails, PromptScope composes a local draft and labels it
  `Local draft — not an AI response`.

## Non-goals

Authentication, payments, teams, marketplace, image generation, multiple providers, cloud sync, and
running the generated code or deployment. localStorage is the persistence layer.

## Privacy

Live prompts and guided answers are transmitted to Google Gemini for processing. The interface advises
users not to submit confidential business information or sensitive personal data. API keys stay
server-side unless the user explicitly saves one in this browser, and are never logged or committed.
Demo Mode does not transmit prompt text.

## Definition of done

The complete journey works in both Guided and Advanced mode:
idea → understanding → interview → brief → depth/agent → generate → analyze → improve → re-evaluate →
compare → save → revisit. Assumptions are labelled and never presented as confirmed requirements.
Scoring and comparison math are tested. Demo Mode works without a key. API secrets never reach the
browser bundle or Git. The app is responsive, accessible, documented, and deployable.

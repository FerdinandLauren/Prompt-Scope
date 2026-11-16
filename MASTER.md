# PROMPTSCOPE
## MASTER PROJECT DOCUMENT
### Product Requirements Document (PRD) · Development Plan · Design Specification

**Project Name:** PromptScope  
**Product Type:** AI-Powered Web Application  
**Category:** AI Prompt Engineering / Productivity / Developer Tools  
**Document Version:** 2.0
**Status:** Implemented
**Primary AI Provider:** Google Gemini API
**Primary Development Stack:** Next.js, TypeScript, Tailwind CSS, Recharts
**Initial Target Domain:** Visual Design & UI/UX Prompt Engineering
**Current Scope:** 20 categories across 5 domain groups, 7 target-agent profiles, 4 prompt depths

---

## Revision 2.0 — Guided Prompt Engineering Platform

Version 1.0 specified a direction-and-evaluation studio for visual design prompts. Version 2.0 keeps
that toolset intact and adds a guided front door plus a broader domain model.

**What changed**

- **Guided Prompt Builder (default).** Idea → understanding → adaptive interview → editable project
  brief → depth/agent selection → generated prompt. Beginners no longer need prompt-engineering
  vocabulary to start.
- **Advanced Builder retained.** The original Module 1 configuration studio is still available as the
  **Advanced** tab. Both tabs share one persisted draft, so switching never loses work.
- **Twenty categories, five groups.** Design, Software, AI & Data, Business, Content. `config/domains.ts`
  is the single source of truth for categories, rubric copy, section templates and question seeds.
- **Domain-aware rubrics.** The eight evaluation axis keys are unchanged. Each family supplies its own
  labels, descriptions and scoring guidance, with per-category overrides where useful. Rubric versions:
  `visual-uiux-v1`, `software-v1`, `ai-data-v1`, `business-v1`, `content-v1`.
- **Four depths.** Concise, Balanced, Detailed, Comprehensive. Depth adds real detail — assumptions,
  open questions, uncertainty policy, verification — instead of repeating lines.
- **Seven target agents.** General, Coding, Design, Research, Workflow Automation, Content, Custom. The
  coding profile covers repository inspection, planning, implementation rules, verification and a final
  report, and forbids unrequested commit, push, deploy or destructive commands.
- **Discovery API.** `POST /api/ai/discover` returns one turn at a time and always declares
  `source: "live" | "demo"`.
- **Honest fallbacks.** Demo discovery/generation is labelled `DEMO DATA`; a failed live generation falls
  back to a local draft labelled `Local draft — not an AI response`.
- **Brief provenance.** Every brief section is `user`, `assumption` or `recommendation`. Unknown answers
  persist the seed's recommendation and are explicitly marked "confirm or replace this assumption".

The v1.0 modules, scoring bands, design system, security rules and non-goals below remain in force.

---

# PART I — PROJECT OVERVIEW

## 1. Project Background

Generative AI has become an increasingly useful tool for brainstorming, designing, writing, and developing applications. However, the quality of its output depends heavily on the instructions provided by users.

Many users struggle to create effective prompts. They often spend considerable time experimenting with different instructions, adding unnecessary details, changing parameters, and repeatedly regenerating results without understanding what is actually wrong with their prompts.

This creates what can be described as the AI Drag problem.

Generative AI is an incredible brainstorming partner, but it lacks spatial rhythm, typographic nuance, and structural taste. When users spend hours fighting prompt parameters just to get an aligned layout, they are falling into the AI Drag trap.

The problem is not simply that users do not know how to write prompts. They often do not know:

- Which parts of their prompts are already effective.
- Which information is missing.
- Which instructions are too vague.
- Whether their requirements contradict each other.
- What improvements would make their prompts more useful.
- Whether the revised prompt is actually better than the original.

Most conventional prompt generators focus on generating text. They rarely provide a systematic evaluation process that helps users understand and measure prompt quality.

PromptScope is designed to address this problem.

## 2. Product Vision

PromptScope is an AI-powered Prompt Direction & Evaluation Studio that helps users create, analyze, improve, and compare prompts through a structured and measurable workflow.

It combines three essential capabilities:

1. Prompt Direction — helping users define what they want AI to accomplish.
2. Prompt Diagnosis — identifying weaknesses and opportunities for improvement.
3. Prompt Optimization — improving prompts and measuring their development.

Instead of treating prompt engineering as random experimentation, PromptScope turns it into a structured process.

Users will be able to configure their preferences using interactive sliders, generate prompts based on their objectives, evaluate existing prompts, receive actionable recommendations, and compare their prompt quality before and after improvement through visual analytics.

## 3. Project Objectives

The primary objectives are:

- Build an actual functional AI-powered web application.
- Help users create structured prompts based on their objectives.
- Provide an interactive prompt configuration experience.
- Evaluate prompt quality using a consistent evaluation framework.
- Explain weaknesses instead of displaying scores alone.
- Generate actionable improvement recommendations.
- Automatically improve existing prompts.
- Visualize prompt quality using radar charts.
- Compare original and improved prompts.
- Maintain prompt history and revision records.
- Demonstrate practical AI integration and application development capabilities.

## 4. Product Positioning

**PromptScope is not just another AI prompt generator.**

Its central differentiator is the ability to evaluate and measure prompt development.

The application should help users understand why a prompt needs improvement, not simply replace it with another version.

Core positioning:

"From prompt experimentation to measurable prompt optimization."

## 5. Target Users

### Primary Users

People who frequently use Generative AI but struggle to formulate effective instructions.

Examples:

- UI/UX designers.
- Visual designers.
- Product designers.
- Students.
- Content creators.
- AI enthusiasts.
- Developers who use AI-assisted coding tools.

### Secondary Users

People who want to understand prompt engineering more systematically.

Examples:

- Business analysts.
- Product managers.
- Researchers.
- Professionals experimenting with AI automation.

## 6. Initial Product Scope

Release 1.0 focused on Visual Design & UI/UX Prompt Engineering because that domain provides a clear
opportunity to evaluate visual instructions, hierarchy, composition, typography, and output
specifications.

Release 2.0 keeps that depth and widens the scope to twenty categories in five groups:

| Group | Categories |
|---|---|
| Design & Interfaces | UI/UX Design, Visual Design, Product Design, Design System |
| Software Engineering | Frontend, Backend, Full-Stack, Mobile, Software Engineering, API Development |
| AI & Data | AI Application, Machine Learning, Data Analytics, AI Agent |
| Business & Operations | Business Analysis, Workflow Automation, Operations |
| Content & Research | Content Creation, Technical Writing, Research & Education |

Every category has its own description, example idea, rubric copy, section template and question seeds.
The eight evaluation axis keys are shared so stored evaluations remain comparable across categories.

The application architecture must remain extensible so additional domains can be introduced later.
Potential future domains:

- Marketing.
- Legal and compliance.
- Finance.

Do not present a category as functional until its definition exists in `config/domains.ts`.

---

# PART II — PRODUCT REQUIREMENTS DOCUMENT (PRD)

## 7. Core Functional Modules

PromptScope consists of six primary modules: the guided builder, the advanced direction builder, the
analyzer, the improver, quality visualization, and history.

### MODULE 0 — Guided Prompt Builder

**Purpose:**

Turn a plain-language idea into a reviewed brief and a structured prompt, without requiring the user to
know prompt-engineering vocabulary.

**Flow:**

1. **Idea.** Free-text idea, optional sample, and a soft question budget (3–12).
2. **Understanding.** Detect category, complexity, explicit requirements, ambiguities and missing
   information. Show what was understood before asking anything.
3. **Interview.** One question at a time, each with a short "why". Accept free text, suggestions,
   **I don't know**, or **Skip**. Never repeat a question. Stop at the budget or when enough information
   exists.
4. **Brief.** An editable project brief whose sections are labelled `Your input`, `Assumption` or
   `Recommendation`, with unresolved areas under `Open questions`. The user can edit and must confirm.
5. **Tuning.** Choose one of four depths and one of seven target agents, with a recommendation derived
   from brief complexity.
6. **Prompt.** Editable prompt with outline, per-section copy, copy-all, Markdown export, save, analyze,
   regenerate and compare.

**Rules:**

- An unknown answer yields a recommendation with rationale and trade-offs, recorded as an assumption.
- Skipped answers leave the area open; they are never converted into requirements.
- Uncertainty clauses ("I'm not sure which screens") belong in ambiguities, not explicit requirements.
- The brief is the source of truth for generation; editing it changes the prompt.
- Demo discovery is deterministic and labelled. It never claims a live model produced it.

---

### MODULE 1 — Prompt Direction Builder (Advanced)

**Purpose:**

Help users construct structured prompts by defining their objectives, context, preferences, and desired output characteristics.

Users should not have to write a complete prompt from scratch.

#### 7.1.1 Input Configuration

The Prompt Builder should provide the following fields:

**A. Prompt Category**

Categories are grouped in five families (Design, Software, AI & Data, Business, Content) and enumerated
in `config/domains.ts`. All twenty are functional. A category always carries its group, rubric version,
section templates and question seeds with it.

**B. Prompt Depth (guided)**

Optional `depth` field: `concise`, `balanced`, `detailed`, `comprehensive`. Defaults to a
complexity-based recommendation when omitted.

**C. Target Agent (guided)**

Optional `targetAgent` field: `general`, `coding`, `design`, `research`, `automation`, `writing`,
`custom`. Agent profiles add an operating agreement and extra sections.

**D. Project Brief (guided)**

Optional `brief` field. When present it supplies objective, audience, context, requirements,
constraints, deliverables, assumptions and unknowns. The composer prefers brief content over the
equivalent manual fields.

**E. Project Objective**

Users describe what they want AI to create.

Examples:

- Design a modern SaaS dashboard.
- Create a professional landing page.
- Develop a minimalist mobile application interface.
- Generate an editorial website layout.

**F. Target Audience**

Examples:

- General consumers.
- Enterprise professionals.
- Students.
- Developers.
- Business owners.

**G. Design Context**

Users can explain the background of their project, including the purpose and intended environment.

**H. Visual Preferences**

Allow users to describe the visual direction.

Examples:

- Minimalist.
- Modern.
- Editorial.
- Corporate.
- Futuristic.
- Experimental.
- Brutalist.

**I. Output Requirements**

Examples:

- Desktop website.
- Mobile application.
- Landing page.
- Dashboard.
- Design concept.
- UI component.

**J. Additional Constraints**

Allow users to define specific requirements and limitations.

Examples:

- Must be responsive.
- Avoid excessive visual elements.
- Use a clear navigation hierarchy.
- Prioritize readability.
- Maintain consistent spacing.

#### 7.1.2 Interactive Focus Sliders

Provide an interactive slider interface with values ranging from 0 to 100.

Required parameters:

| Parameter | Description |
|---|---|
| Creativity | Determines how experimental the generated direction should be. |
| Precision | Prioritizes adherence to instructions. |
| Visual Hierarchy | Emphasizes the organization and importance of visual elements. |
| Composition | Controls the emphasis on layout balance and spatial arrangement. |
| Typography | Emphasizes typography, readability, and font hierarchy. |
| Detail Level | Controls the expected level of detail. |
| Consistency | Prioritizes consistency across design elements. |
| Exploration | Allows more room for alternative creative interpretations. |

Each slider must include:

- Parameter name.
- Current numerical value.
- Short explanation.
- Interactive slider control.
- Optional reset functionality.

Provide recommended presets:

**Balanced**
A balanced combination of creativity and precision.

**Creative Exploration**
Prioritizes creativity and exploration.

**Precision Focus**
Prioritizes precision, structure, and consistency.

**Visual Excellence**
Prioritizes hierarchy, composition, typography, and detail.

Preset values must be defined centrally and remain editable.

The slider values represent user preferences. They must not be confused with prompt quality scores generated by the evaluator.

#### 7.1.3 Prompt Generation

When users submit their configuration:

1. Validate all required inputs.
2. Construct a structured request for the AI provider.
3. Send the request to the server-side AI integration.
4. Generate a structured prompt.
5. Return the result to the application.
6. Display the generated prompt.
7. Allow the user to copy, edit, analyze, or save it.

The generated prompt must preserve the user's intention.

The AI should avoid introducing unsupported project requirements.

Expected generation output:

- Generated prompt.
- Prompt title.
- Prompt category.
- Short explanation.
- Assumptions, if any.
- Prompt sections.
- Recommended additional considerations.

---

### MODULE 2 — Prompt Analyzer

**Purpose:**

Evaluate existing prompts and identify their weaknesses.

Users should be able to paste their own prompts or select previously generated prompts.

#### 7.2.1 Analyzer Input

Required components:

- Prompt title, optional.
- Prompt text, required.
- Prompt category.
- Analyze button.
- Clear input button.

#### 7.2.2 Evaluation Dimensions

Use a standardized evaluation framework.

For the initial Visual Design & UI/UX domain, evaluate the following eight dimensions:

| Dimension | What It Evaluates |
|---|---|
| Clarity | Whether the instructions are understandable and unambiguous. |
| Context | Whether sufficient project background is provided. |
| Specificity | Whether requirements are detailed enough. |
| Visual Direction | Whether the desired visual style is sufficiently defined. |
| Composition | Whether layout and hierarchy expectations are clear. |
| Typography | Whether typography and readability requirements are specified. |
| Constraints | Whether limitations and required conditions are defined consistently. |
| Output Definition | Whether the expected deliverable and format are clearly explained. |

Each dimension receives a score from 0 to 100.

The evaluation must include a written explanation.

#### 7.2.3 Analyzer Results

Display:

**A. Overall Score**

A diagnostic score representing the prompt's evaluated quality.

**B. Dimension Scores**

Individual scores for all eight evaluation dimensions.

**C. Strengths**

Identify aspects of the prompt that are already effective.

**D. Weaknesses**

Identify missing, vague, incomplete, or contradictory instructions.

**E. Recommendations**

Provide actionable suggestions for each important weakness.

**F. Missing Information**

Explain which contextual information could improve the prompt.

**G. Potential Contradictions**

Identify conflicting instructions where applicable.

Each weakness should contain:

- Affected dimension.
- Severity: Low, Medium, or High.
- Problem description.
- Supporting evidence from the original prompt when available.
- Recommended improvement.

The analyzer must never invent a problem that is not supported by the supplied prompt.

If information is insufficient to evaluate a particular aspect, explain that limitation.

---

### MODULE 3 — AI Prompt Improver

**Purpose:**

Transform an existing prompt into an improved, better-structured version.

#### 7.3.1 Input

The improver receives:

- Original prompt.
- Analyzer results.
- User-selected improvement priorities.
- Additional instructions from the user.

#### 7.3.2 Improvement Process

The AI must:

1. Understand the original objective.
2. Identify the most important weaknesses.
3. Preserve the original intention.
4. Preserve explicit user requirements.
5. Incorporate relevant recommendations.
6. Improve clarity and structure.
7. Remove unnecessary ambiguity.
8. Resolve contradictions where the intended meaning is clear.
9. Identify assumptions rather than silently inventing missing facts.
10. Produce an improved prompt.

#### 7.3.3 Improvement Output

Display:

- Original Prompt.
- Improvement Summary.
- Changes Made.
- Improved Prompt.
- Additional Recommendations.

Users must be able to edit the improved prompt manually.

Provide actions:

- Copy Improved Prompt.
- Analyze Again.
- Compare Results.
- Save New Version.
- Restore Previous Version.

The application must never overwrite the original prompt automatically.

---

### MODULE 4 — Prompt Quality Visualization

**Purpose:**

Provide a visual understanding of prompt quality.

Visualization is a central product feature, not merely a decorative dashboard element.

#### 7.4.1 Radar Chart

Use a radar chart to display all eight evaluation dimensions.

The chart should include:

- Eight evaluation axes.
- Scale from 0 to 100.
- Clearly distinguishable data series.
- Hover tooltips.
- Dimension labels.
- Numerical score information.

Visualize the original prompt and improved prompt using separate data series.

#### 7.4.2 Before & After Comparison

Display two evaluation snapshots:

**Original Evaluation**
The evaluation of the prompt before improvement.

**Improved Evaluation**
The evaluation of the revised prompt.

The comparison should include:

- Overall score.
- Individual dimension scores.
- Radar chart comparison.
- Score changes.
- Newly improved aspects.
- Remaining weaknesses.

#### 7.4.3 Score Calculation

Use a weighted average of evaluation dimensions.

For the initial release, use equal weights unless a documented domain-specific weighting is introduced.

Formula:

Overall Score = Sum of all dimension scores / Number of dimensions.

Round the result to the nearest integer.

Individual dimension scores must remain within 0–100.

Example:

Original:

Clarity: 45  
Context: 60  
Specificity: 55  
Visual Direction: 40  
Composition: 50  
Typography: 35  
Constraints: 75  
Output Definition: 50

Improved:

Clarity: 90  
Context: 85  
Specificity: 90  
Visual Direction: 85  
Composition: 90  
Typography: 80  
Constraints: 85  
Output Definition: 90

The overall score must be calculated from the actual returned dimensions.

Do not manually fabricate score improvements.

**Important Evaluation Rule:**

The before-and-after comparison must use:

- The same evaluation dimensions.
- The same scoring rubric.
- The same rubric version.
- The same category.
- The same evaluator configuration wherever possible.

An improved prompt is not guaranteed to receive a higher score.

If a revision introduces new weaknesses, the application must display them honestly.

The score represents a model-assisted diagnostic assessment, not a universal scientific measurement of prompt quality.

---

### MODULE 5 — Prompt History

**Purpose:**

Allow users to review their previous prompt activities.

Each saved prompt should support multiple versions.

#### 7.5.1 History Data

Store:

- Prompt ID.
- Prompt title.
- Category.
- Original prompt.
- Improved prompt versions.
- Creation timestamp.
- Last modified timestamp.
- Evaluation results.
- Rubric version.
- Associated prompt configuration.

#### 7.5.2 User Actions

Users should be able to:

- View a saved prompt.
- Open its evaluation results.
- Compare versions.
- Copy previous versions.
- Edit a saved prompt.
- Delete a prompt.
- Continue improving an existing prompt.

For the MVP, local persistence is acceptable.

Database synchronization can be introduced in a later milestone.

---

## 8. Non-Functional Requirements

### 8.1 Performance

- Interface interactions should feel responsive.
- Avoid unnecessary API requests.
- Prevent duplicate submissions.
- Use loading indicators during AI processing.
- Avoid repeatedly evaluating unchanged prompts.
- Keep chart rendering efficient.
- Handle large prompt inputs gracefully.

### 8.2 Reliability

- Validate user inputs.
- Validate AI responses.
- Handle invalid JSON.
- Handle API timeouts.
- Handle quota and rate-limit errors.
- Handle missing API configuration.
- Provide recoverable error messages.
- Preserve user input after failed requests.

### 8.3 Security

- API keys must remain server-side.
- Never expose Gemini API keys in frontend code.
- Never commit API keys to GitHub.
- Use environment variables.
- Validate API request bodies.
- Apply input-size limits.
- Add basic request throttling.
- Avoid logging sensitive prompt content unnecessarily.
- Sanitize rendered user content.
- Do not execute generated prompts as code.

### 8.4 Privacy

The application must explain that prompts are sent to the configured AI provider for processing.

Users should be advised not to submit confidential business information or sensitive personal data.

The application should not claim that submitted prompts remain private from the AI provider unless the provider's actual terms support that claim.

### 8.5 Accessibility

- All controls must be keyboard accessible.
- Use readable text contrast.
- Provide labels for sliders.
- Avoid using color as the only indicator.
- Provide textual score information alongside charts.
- Support appropriate responsive behavior.

### 8.6 Responsiveness

Support:

- Desktop.
- Tablet.
- Mobile.

The desktop experience should receive the highest design priority, while mobile must remain fully usable.

---

## 9. MVP Scope

The first release must include:

1. Main application dashboard.
2. Prompt Direction Builder.
3. Eight configurable sliders.
4. Prompt Generator powered by Gemini.
5. Prompt Analyzer powered by Gemini.
6. Prompt Improver powered by Gemini.
7. Radar chart visualization.
8. Before-and-after comparison.
9. Copy functionality.
10. Prompt history with local persistence.
11. Error handling.
12. Demo Mode when no API key is configured.

### Out of Scope for MVP

Do not implement these unless the core product is already working:

- User subscriptions.
- Payment integration.
- Team collaboration.
- Advanced user permissions.
- Public prompt marketplace.
- Prompt sharing community.
- Fine-tuning custom AI models.
- AI image generation.
- Multiple AI providers.
- Complex analytics.
- Enterprise integrations.
- Full authentication infrastructure.

These are possible future expansions.

---

# PART III — DEVELOPMENT PLAN

## 10. Development Philosophy

Build PromptScope incrementally.

Do not attempt to implement all features in a single development step.

Prioritize a working product over a large but incomplete interface.

Every milestone must produce a functional result.

Use modular architecture so the AI integration, scoring system, visualization, and user interface can evolve independently.

## 11. Recommended Technology Stack

### Frontend

**Next.js**
Use the App Router architecture.

**TypeScript**
Use TypeScript throughout the application.

**Tailwind CSS**
Use for styling and responsive layouts.

**shadcn/ui**
May be used for accessible UI primitives when useful.

**Lucide React**
Use for interface icons.

**Recharts**
Use for radar chart and comparison visualization.

### Backend

Use Next.js server-side route handlers.

AI operations must be executed through backend endpoints.

### AI Integration

**Primary Provider: Google Gemini API**

Use the official Google Gen AI JavaScript/TypeScript SDK.

Package:

`@google/genai`

Use the current stable SDK and verify its official documentation before implementing provider-specific code.

Required AI operations:

- Generate Prompt.
- Analyze Prompt.
- Improve Prompt.

Use structured JSON output for predictable response handling.

Use Zod to validate AI responses.

Do not rely on unstructured model responses for chart calculations or application state.

### Database and Storage

**MVP:**

Use browser localStorage for basic prompt history.

**Future Version:**

Supabase PostgreSQL can be introduced for:

- User authentication.
- Cloud-based prompt history.
- Cross-device synchronization.
- User preferences.

Do not introduce unnecessary database complexity in the initial release.

### Deployment

Use Vercel for deployment.

Store production API keys in the deployment platform's environment variables.

---

## 12. Project Architecture

Recommended initial project structure:

```text
promptscope/
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   │
│   ├── dashboard/
│   │   └── page.tsx
│   │
│   ├── builder/
│   │   └── page.tsx
│   │
│   ├── analyzer/
│   │   └── page.tsx
│   │
│   ├── comparison/
│   │   └── page.tsx
│   │
│   ├── history/
│   │   └── page.tsx
│   │
│   └── api/
│       └── ai/
│           ├── generate/
│           │   └── route.ts
│           │
│           ├── analyze/
│           │   └── route.ts
│           │
│           └── improve/
│               └── route.ts
│
├── components/
│   ├── layout/
│   ├── navigation/
│   ├── dashboard/
│   ├── builder/
│   ├── analyzer/
│   ├── visualization/
│   ├── comparison/
│   ├── history/
│   └── shared/
│
├── lib/
│   ├── ai/
│   │   ├── client.ts
│   │   ├── provider.ts
│   │   ├── generate.ts
│   │   ├── analyze.ts
│   │   ├── improve.ts
│   │   ├── prompts.ts
│   │   └── schemas.ts
│   │
│   ├── scoring/
│   │   ├── dimensions.ts
│   │   ├── calculate-score.ts
│   │   └── compare-scores.ts
│   │
│   ├── storage/
│   │   └── prompt-storage.ts
│   │
│   ├── validation/
│   │   └── schemas.ts
│   │
│   └── utils.ts
│
├── hooks/
│
├── types/
│   ├── prompt.ts
│   ├── evaluation.ts
│   └── ai.ts
│
├── config/
│   ├── app.ts
│   ├── presets.ts
│   └── evaluation-rubric.ts
│
├── public/
│
├── tests/
│   ├── scoring/
│   ├── validation/
│   └── api/
│
├── docs/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

The exact structure can be adjusted based on the implementation, but maintain clear separation between UI, business logic, AI integration, validation, and storage.

---

## 13. AI Integration Architecture

### 13.1 Integration Strategy

PromptScope does not require a self-trained AI model.

It uses Gemini as an external AI service.

The application communicates with Gemini through server-side API routes.

Architecture:

```text
USER
  |
  v
PROMPTSCOPE FRONTEND
  |
  v
NEXT.JS API ROUTES
  |
  v
INPUT VALIDATION
  |
  v
AI PROVIDER SERVICE
  |
  v
GEMINI API
  |
  v
STRUCTURED JSON RESPONSE
  |
  v
RESPONSE VALIDATION
  |
  v
APPLICATION BUSINESS LOGIC
  |
  v
FRONTEND VISUALIZATION
```

### 13.2 Environment Variables

Create `.env.example`:

```env
GEMINI_API_KEY=
GEMINI_MODEL=
```

The actual `.env.local` must remain private and must never be committed to the repository.

The model identifier must be configurable using `GEMINI_MODEL`.

Do not hardcode an outdated or discontinued model identifier.

Verify currently available models through official Google documentation and AI Studio before configuring the application.

### 13.3 AI Provider Service

Create a centralized AI provider module.

Responsibilities:

- Initialize the Gemini SDK.
- Read API configuration from server environment variables.
- Send requests to Gemini.
- Apply request-specific instructions.
- Handle API errors.
- Return normalized results.
- Validate structured outputs.

Do not initialize the Gemini client in browser components.

Do not duplicate provider initialization across multiple routes.

### 13.4 Structured Output

All three main AI operations should return predictable JSON structures.

Use supported structured-output functionality provided by the official Gemini SDK.

Use Zod schemas to validate responses before they reach the UI.

If a response is invalid:

1. Attempt a controlled validation recovery.
2. Retry at most once where appropriate.
3. Return a clear error if the result remains invalid.
4. Never fabricate missing evaluation values.

### 13.5 Prompt Generation Response

Expected conceptual structure:

```json
{
  "title": "Modern SaaS Dashboard",
  "category": "ui_ux",
  "prompt": "Complete generated prompt text...",
  "sections": [
    {
      "heading": "Objective",
      "content": "..."
    },
    {
      "heading": "Visual Direction",
      "content": "..."
    },
    {
      "heading": "Layout and Composition",
      "content": "..."
    },
    {
      "heading": "Typography",
      "content": "..."
    },
    {
      "heading": "Constraints",
      "content": "..."
    },
    {
      "heading": "Output Requirements",
      "content": "..."
    }
  ],
  "assumptions": [],
  "recommendations": []
}
```

### 13.6 Prompt Analyzer Response

Expected conceptual structure:

```json
{
  "overallScore": 65,
  "rubricVersion": "visual-uiux-v1",
  "summary": "The prompt has a clear objective but needs more specific design requirements.",
  "dimensions": [
    {
      "key": "clarity",
      "label": "Clarity",
      "score": 80,
      "explanation": "The main objective is understandable."
    }
  ],
  "strengths": [
    {
      "title": "Clear objective",
      "description": "The intended output is identified."
    }
  ],
  "weaknesses": [
    {
      "dimension": "context",
      "severity": "high",
      "problem": "Insufficient project context.",
      "evidence": "Relevant excerpt from the supplied prompt.",
      "suggestion": "Explain the intended audience and business objective."
    }
  ],
  "missingInformation": [
    "Target audience"
  ],
  "contradictions": [],
  "recommendations": [
    "Add clearer output requirements."
  ]
}
```

The example shows the desired response structure, not mandatory score values.

All eight evaluation dimensions must be included in the actual implementation.

### 13.7 Prompt Improver Response

Expected conceptual structure:

```json
{
  "improvedPrompt": "Complete improved prompt...",
  "summary": "The prompt was reorganized and clarified.",
  "changes": [
    {
      "dimension": "context",
      "change": "Added a dedicated context section.",
      "reason": "The original prompt did not sufficiently explain the project."
    }
  ],
  "preservedRequirements": [
    "Original project objective"
  ],
  "assumptions": [],
  "remainingLimitations": []
}
```

### 13.8 AI Error Handling

Handle these situations:

**Missing API Key**

Display that AI features are not configured.

Provide instructions for setting up the environment variable.

**Quota Exceeded**

Explain that the provider's usage limit has been reached.

**Rate Limit**

Prevent uncontrolled retries and communicate when another attempt may be possible.

**Network Error**

Display a recoverable error and preserve the input.

**Invalid AI Response**

Explain that the response could not be processed.

**Timeout**

Stop waiting after a reasonable server-side timeout and allow the user to retry.

Never display raw secrets, stack traces, or internal provider errors in production UI.

### 13.9 Demo Mode

The application must remain usable without a Gemini API key.

Implement a separate Demo Mode.

In Demo Mode:

- Use clearly identified sample data.
- Allow users to explore the interface.
- Show example generated prompts.
- Show example analysis results.
- Display example radar charts.
- Demonstrate before-and-after comparison.

Demo Mode must not pretend that sample results were generated by a live AI request.

Display a visible "DEMO DATA" indicator.

When a valid Gemini API key is configured, enable Live AI Mode.

---

## 14. API Endpoint Specifications

### POST /api/ai/discover

Purpose:

Advance the guided discovery flow by one turn.

Request:

```json
{
  "idea": "A booking website for a small yoga studio",
  "category": "ui_ux",
  "answers": [
    { "questionId": "design-audience", "question": "Who is it for?", "answer": "Studio members", "status": "answered" },
    { "questionId": "design-platform", "question": "Where will people use it?", "answer": "I don't know", "status": "unknown" }
  ],
  "budget": 5
}
```

Response:

```ts
type DiscoveryTurn = {
  source: "live" | "demo";
  understanding: { category; categoryLabel; complexity; summary; explicitRequirements; ambiguities; missingInformation };
  question: { id; question; why; options; allowUnknown; target } | null;
  recommendation: { questionId; recommendation; rationale; tradeoffs; recordedAsAssumption } | null;
  brief: { title; objective; summary; category; complexity; sections; assumptions; unknowns };
  answered: number;
  budget: number;
  enoughInformation: boolean;
};
```

`source` is required so the UI can label demo turns. At most one question is returned per turn.

### POST /api/ai/generate

Purpose:

Generate a prompt from user configuration.

Request:

```json
{
  "category": "ui_ux",
  "objective": "Create a SaaS dashboard",
  "audience": "Business professionals",
  "context": "A dashboard for managing business operations",
  "visualPreferences": ["Modern", "Minimalist"],
  "outputRequirements": ["Desktop dashboard"],
  "constraints": ["Responsive", "Readable"],
  "sliders": {
    "creativity": 70,
    "precision": 90,
    "visualHierarchy": 90,
    "composition": 85,
    "typography": 80,
    "detail": 70,
    "consistency": 95,
    "exploration": 40
  },
  "depth": "detailed",
  "targetAgent": "coding",
  "brief": {
    "title": "Operations dashboard",
    "objective": "Give the operations team a weekly churn review surface.",
    "summary": "Internal tool, one team, weekly cadence.",
    "category": "ui_ux",
    "complexity": "moderate",
    "sections": [],
    "assumptions": [],
    "unknowns": []
  }
}
```

`depth`, `targetAgent` and `brief` are optional so pre-2.0 clients keep working.

Response:

A validated structured generation result, including `source` (`live` | `demo` | `draft`), `depth`,
`targetAgent`, prompt sections and recommendations.

### POST /api/ai/analyze

Purpose:

Analyze an existing prompt.

Request:

```json
{
  "prompt": "Original prompt text...",
  "category": "ui_ux",
  "rubricVersion": "visual-uiux-v1"
}
```

`category` selects the rubric family. The server ignores an unknown rubric version and uses the version
attached to the category. Prompt text is capped at 40,000 characters.

Response:

A validated evaluation result containing all required dimensions, explanations, strengths, weaknesses, and recommendations.

### POST /api/ai/improve

Purpose:

Improve an existing prompt.

Request:

```json
{
  "originalPrompt": "Original prompt...",
  "analysis": {},
  "priorities": [
    "Clarity",
    "Composition",
    "Typography"
  ],
  "additionalInstructions": ""
}
```

Response:

A validated improved prompt and structured improvement summary.

The API must validate incoming requests independently. Do not trust analysis objects or scores sent directly from the browser.

For important operations, retrieve or reconstruct trusted information from the current server-side request context.

---

## 15. Scoring System Implementation

Create a centralized evaluation configuration.

The eight keys are fixed. Labels, descriptions and guidance come from the selected category's family
profile, with optional per-category overrides. This keeps stored scores comparable while letting a
backend prompt be judged on architecture and reliability instead of visual direction.

Example:

```ts
export const evaluationDimensions = [
  "clarity",
  "context",
  "specificity",
  "visual_direction",
  "composition",
  "typography",
  "constraints",
  "output_definition",
] as const;
```

All dimensions use a 0–100 integer scale.

The evaluator should provide a score and explanation for every dimension.

The backend calculates the overall score rather than blindly trusting a model-generated total.

Formula:

```text
overallScore =
  sum(dimensionScores) / numberOfDimensions
```

Round to the nearest integer.

Score labels can be:

- 0–39: Needs Significant Improvement.
- 40–59: Developing.
- 60–79: Good Foundation.
- 80–100: Strong Prompt.

These labels are product guidance, not universal standards.

### Comparison Logic

For each dimension:

```text
scoreChange =
  improvedScore - originalScore
```

For the overall score:

```text
overallImprovement =
  improvedOverallScore - originalOverallScore
```

Interpretation:

- Positive: Score increased.
- Zero: No measured change.
- Negative: Score decreased.

Never force the comparison to show positive improvement.

Store each evaluation snapshot separately.

Store the evaluation rubric version so historical results can be interpreted correctly.

---

## 16. Data Models

Initial TypeScript models should include:

### ProjectBrief (guided)

```ts
type ProjectBrief = {
  title: string;
  objective: string;
  summary: string;
  category: string;
  complexity: "simple" | "moderate" | "complex";
  sections: Array<{
    id: string;
    heading: string;
    content: string;
    source: "user" | "assumption" | "recommendation";
  }>;
  assumptions: string[];
  unknowns: string[];
  confirmedAt?: string;
};

type DiscoveryTurn = {
  source: "live" | "demo";
  understanding: {
    category: string;
    categoryLabel: string;
    complexity: "simple" | "moderate" | "complex";
    summary: string;
    explicitRequirements: string[];
    ambiguities: string[];
    missingInformation: string[];
  };
  question: DiscoveryQuestion | null;
  recommendation: DiscoveryRecommendation | null;
  brief: ProjectBrief;
  answered: number;
  budget: number;
  enoughInformation: boolean;
};
```

### BuilderDraft (guided + advanced, one persisted object)

```ts
type BuilderDraft = {
  mode: "guided" | "advanced";
  configuration: PromptConfiguration;
  guided: {
    step: "idea" | "interview" | "brief" | "tuning" | "prompt";
    idea: string;
    budget: number;
    depth: PromptDepth;
    targetAgent: TargetAgentId;
    answers: DiscoveryAnswer[];
    brief: ProjectBrief | null;
    briefConfirmed: boolean;
    categoryHint: string;
    generated: GeneratedPrompt | null;
  };
};
```

### PromptSession

```ts
type PromptSession = {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  currentVersionId: string;
  versions: PromptVersion[];
};
```

### PromptVersion

```ts
type PromptVersion = {
  id: string;
  versionNumber: number;
  promptText: string;
  createdAt: string;
  source: "generated" | "manual" | "improved";
  configuration?: PromptConfiguration;
  evaluation?: EvaluationSnapshot;
};
```

### PromptConfiguration

```ts
type PromptConfiguration = {
  category: string;
  objective: string;
  audience: string;
  context: string;
  visualPreferences: string[];
  outputRequirements: string[];
  constraints: string[];
  sliders: {
    creativity: number;
    precision: number;
    visualHierarchy: number;
    composition: number;
    typography: number;
    detail: number;
    consistency: number;
    exploration: number;
  };
  // Optional in 2.0 so stored pre-2.0 configurations remain valid.
  depth?: "concise" | "balanced" | "detailed" | "comprehensive";
  targetAgent?: "general" | "coding" | "design" | "research" | "automation" | "writing" | "custom";
  brief?: ProjectBrief;
};
```

### EvaluationSnapshot

```ts
type EvaluationSnapshot = {
  id: string;
  overallScore: number;
  rubricVersion: string;
  createdAt: string;
  dimensions: Record<string, number>;
  summary: string;
  strengths: string[];
  weaknesses: Weakness[];
};
```

The final implementation may use more detailed nested types for strengths and weaknesses.

Use stable identifiers and preserve historical versions.

---

## 17. Development Milestones

### MILESTONE 0 — Project Foundation

Objective:

Create the initial project infrastructure.

Tasks:

- Inspect the existing repository.
- Confirm the runtime environment.
- Initialize Next.js.
- Configure TypeScript.
- Install required dependencies.
- Configure Tailwind CSS.
- Set up project aliases.
- Create the initial directory structure.
- Create `.env.example`.
- Configure Git ignore rules.
- Create a basic README.

Deliverables:

- Working application.
- Clean initial architecture.
- No API secrets committed.
- Successful development server startup.

Acceptance Criteria:

- Application runs locally.
- TypeScript configuration works.
- Styling system is functional.
- Basic navigation works.

### MILESTONE 1 — Interface & Design System

Objective:

Build the visual foundation.

Tasks:

- Establish theme and design tokens.
- Build sidebar navigation.
- Build dashboard layout.
- Build reusable cards.
- Build button components.
- Build form controls.
- Build slider components.
- Build prompt editor components.
- Build responsive layouts.
- Add application loading and empty states.

Deliverables:

- Functional application shell.
- Dashboard UI.
- Reusable design system.

Acceptance Criteria:

- All navigation links work.
- Components are reusable.
- Layout works on desktop and mobile.
- No major visual overflow.

### MILESTONE 2 — Prompt Builder

Objective:

Implement prompt configuration and generation interface.

Tasks:

- Build category selector.
- Build objective input.
- Build context input.
- Build audience input.
- Build visual preferences.
- Build output requirement selector.
- Build constraints input.
- Build eight focus sliders.
- Build presets.
- Build configuration validation.
- Build prompt preview.
- Build local configuration state.

Deliverables:

- Complete interactive Prompt Builder.

Acceptance Criteria:

- Slider values update correctly.
- Presets change slider values.
- Input validation works.
- Configuration can be reviewed before submission.

### MILESTONE 3 — Gemini API Integration

Objective:

Connect the application to a real AI provider.

Tasks:

- Integrate official Google Gen AI SDK.
- Configure server-side API client.
- Create provider abstraction.
- Implement generation prompts.
- Implement structured output.
- Implement Zod validation.
- Implement `/api/ai/generate`.
- Implement `/api/ai/analyze`.
- Implement `/api/ai/improve`.
- Implement API error normalization.
- Implement basic request throttling.
- Implement Demo Mode.
- Implement Live AI Mode.

Deliverables:

- Working AI integration.

Acceptance Criteria:

- AI generation works with valid configuration.
- API keys remain server-side.
- Invalid requests are rejected.
- Invalid responses are handled.
- Demo Mode remains available without a key.
- Provider errors do not break the application.

### MILESTONE 4 — Analyzer & Scoring Engine

Objective:

Build the evaluation system.

Tasks:

- Create evaluation dimensions.
- Create the initial evaluation rubric.
- Define AI evaluation instructions.
- Implement evaluation schema.
- Implement analyzer result UI.
- Implement scoring calculation.
- Implement strengths display.
- Implement weaknesses display.
- Implement recommendations.
- Implement missing information display.
- Implement contradiction detection.

Deliverables:

- Functional Prompt Analyzer.

Acceptance Criteria:

- All eight dimensions receive valid scores.
- All scores remain within 0–100.
- Overall score is calculated by the application.
- Invalid output does not reach visualization components.
- Evaluation results include useful explanations.

### MILESTONE 5 — Prompt Improvement & Visualization

Objective:

Implement the core differentiation of PromptScope.

Tasks:

- Build improvement request workflow.
- Preserve original prompt.
- Generate improved prompt.
- Record change explanations.
- Create radar chart component.
- Create comparison interface.
- Implement before-and-after data binding.
- Calculate dimension score changes.
- Calculate overall score changes.
- Display remaining weaknesses.

Deliverables:

- Functional Before & After Comparison.

Acceptance Criteria:

- Original and improved prompts remain separately available.
- Both prompts are evaluated using the same rubric version.
- Chart uses actual evaluation data.
- Comparison values are calculated correctly.
- No artificial positive score changes are introduced.

### MILESTONE 6 — History & Persistence

Objective:

Provide basic prompt history.

Tasks:

- Implement localStorage persistence.
- Save prompt sessions.
- Save prompt versions.
- Save evaluation snapshots.
- Load previous sessions.
- Implement editing.
- Implement deletion.
- Implement version comparison.

Deliverables:

- Functional Prompt History.

Acceptance Criteria:

- Saved data persists across browser reloads.
- Prompt versions remain accessible.
- Updating a prompt does not destroy previous versions.
- Deleted entries are handled consistently.

### MILESTONE 7 — Testing & Quality Assurance

Objective:

Verify product reliability.

Tasks:

- Test navigation.
- Test all form validations.
- Test all slider interactions.
- Test AI generation.
- Test AI analysis.
- Test AI improvement.
- Test scoring logic.
- Test radar charts.
- Test comparison logic.
- Test localStorage.
- Test Demo Mode.
- Test missing API key behavior.
- Test provider error handling.
- Test responsive layouts.
- Run lint and TypeScript checks.
- Resolve critical bugs.

Deliverables:

- Stable MVP.
- Test report.
- Documented limitations.

Acceptance Criteria:

- Main user journey works from beginning to end.
- No critical runtime errors.
- No exposed API secrets.
- No broken primary navigation.
- Scoring and comparison calculations pass tests.

### MILESTONE 8 — Deployment & Documentation

Objective:

Prepare the application for public demonstration.

Tasks:

- Prepare production environment.
- Configure deployment variables.
- Deploy to Vercel.
- Verify production routes.
- Verify AI integration.
- Verify Demo Mode.
- Write setup documentation.
- Write feature documentation.
- Write architecture documentation.
- Write environment setup instructions.
- Document limitations.

Deliverables:

- Deployed PromptScope application.
- GitHub-ready repository.
- Complete README.
- Technical documentation.

Acceptance Criteria:

- Production application works.
- AI configuration is secure.
- Demo Mode works.
- Setup instructions are reproducible.

### MILESTONE 9 — Guided Prompt Engineering Platform (2.0)

Objective:

Move from a configuration-first generator to a guided platform that works for beginners and covers
multiple domains without weakening the evaluation system.

Tasks:

- Add `config/domains.ts` as the single taxonomy and rubric source for 20 categories.
- Add guided types, discovery API, demo discovery engine and local draft composer.
- Build the guided builder: idea, understanding, interview, brief, tuning, prompt workspace.
- Keep the advanced builder as a second tab sharing one persisted draft.
- Add depth and target-agent profiles, including a coding operating agreement.
- Make the analyzer and improver domain-aware while preserving the eight axis keys.
- Add fallback labelling for demo and local-draft output.
- Extend validation, storage and test coverage; add browser QA harnesses for demo and live flows.
- Update product, design, architecture, testing and README documentation.

Deliverables:

- Guided and Advanced modes in one builder.
- Domain-aware rubrics and prompt structures.
- Clearly labelled demo and draft fallbacks.

Acceptance Criteria:

- The guided flow completes end to end in Demo Mode and in Live Mode.
- Assumptions and open questions are never presented as confirmed requirements.
- Every generated prompt and evaluation declares its source.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and `npm run check` pass.

---

# PART IV — DESIGN SPECIFICATION

## 18. Design Direction

PromptScope should have a distinctive visual identity.

The design should feel like a professional AI creative analysis workstation, not a generic AI chatbot interface.

Visual references:

- Editorial design systems.
- Professional design critique dashboards.
- Modern developer tools.
- Data visualization interfaces.
- Minimalist creative workspaces.

The visual identity should communicate precision, intelligence, creativity, and clarity.

### 18.1 Visual Principles

**1. Dark Editorial Aesthetic**

Use a deep charcoal background instead of pure black.

**2. Data-Driven Interface**

Use charts, measurements, and structured information as important visual elements.

**3. Controlled Visual Energy**

Use orange, yellow, and pink accents to highlight important data and interactions.

**4. Clear Hierarchy**

Titles, descriptions, scores, and actions should have distinct visual priorities.

**5. Minimal but Expressive**

Avoid unnecessary decoration and excessive gradients.

**6. Professional Typography**

Typography must be carefully selected and consistently implemented.

---

## 19. Color System

Suggested design tokens:

### Background

```css
--background: #111111;
--background-secondary: #191919;
--surface: #202020;
--surface-elevated: #272727;
```

### Borders

```css
--border: #353535;
--border-subtle: #292929;
```

### Text

```css
--text-primary: #F3F0EA;
--text-secondary: #A6A29B;
--text-muted: #74716B;
```

### Accent

```css
--accent-orange: #FF9C42;
--accent-yellow: #FFD15C;
--accent-pink: #FF65A7;
```

### Semantic Colors

```css
--success: #5BCB91;
--warning: #E9B85C;
--danger: #E66B72;
--info: #78A9E8;
```

Use the accent colors selectively.

Do not make every component colorful.

Radar charts may use a warm gradient-inspired visual treatment, but must remain readable and accessible.

---

## 20. Typography

Recommended typography direction:

- Primary Typeface: Inter or Geist.
- Display Typeface: Space Grotesk.
- Monospace Typeface: JetBrains Mono.

Usage:

**Display**
Large page titles and important headlines.

**Sans-serif**
Interface content, form labels, and descriptions.

**Monospace**
Scores, metadata, dimensions, status information, and technical details.

Typography should feel intentional and editorial.

Do not use excessive font sizes or unnecessary font weights.

---

## 21. Application Navigation

Use a left sidebar on desktop.

Recommended navigation:

```text
PROMPTSCOPE

WORKSPACE
- Dashboard
- Prompt Builder
- Prompt Analyzer
- Comparisons
- Prompt History

SYSTEM
- Settings
- Documentation
```

The sidebar should provide clear navigation and active-state indicators.

On mobile, use a compact navigation pattern that does not consume excessive screen space.

---

## 22. Dashboard Design

The dashboard should provide an overview of the user's prompt activities.

Components:

### A. Welcome Section

Display a simple welcome message.

Example:

"Make every prompt more intentional."

Supporting text:

"Build, analyze, and improve your prompts with clarity."

### B. Quick Actions

Provide direct access to:

- Create New Prompt.
- Analyze Existing Prompt.
- View Prompt History.

### C. Activity Overview

Display:

- Total prompts created.
- Total prompts analyzed.
- Total improvements.
- Recent prompt activity.

For MVP, values may be derived from local history.

### D. Recent Prompts

Show recently created or modified prompts.

Each entry should include:

- Prompt title.
- Category.
- Last modified.
- Latest evaluation score, if available.

### E. Quick Comparison Preview

Where available, display a compact summary of the latest before-and-after evaluation.

Do not show fabricated productivity statistics.

---

## 23. Prompt Builder Design

The Builder should be a structured workspace.

Recommended layout:

**Left Panel — Configuration**

Contains:

- Category selection.
- Objective.
- Context.
- Target audience.
- Visual direction.
- Output requirements.
- Constraints.
- Focus sliders.

**Right Panel — Prompt Preview**

Contains:

- Generated prompt preview.
- Prompt structure.
- Copy action.
- Generate action.
- Analyze action.

The preview should update when a generation request succeeds.

The user must be able to edit the resulting prompt.

Avoid overwhelming the interface by displaying every control at maximum visual intensity.

Use collapsible sections for optional settings.

### Slider Interaction

Each slider should show:

- Label.
- Current value.
- Short explanation.
- Interactive track.
- Optional reset.

Presets should be easy to access.

Use a consistent visual treatment for all sliders.

---

## 24. Prompt Analyzer Design

The Analyzer page should prioritize understanding.

Recommended layout:

**Top Section**

- Page title.
- Prompt text editor.
- Category selector.
- Analyze button.

**Result Section**

- Overall score.
- Radar chart.
- Dimension score cards.
- Strengths.
- Weaknesses.
- Recommendations.
- Missing information.
- Potential contradictions.

The user should immediately understand the most important weaknesses.

Use severity indicators:

- High: Major issue.
- Medium: Needs attention.
- Low: Minor improvement opportunity.

Use text labels alongside colors.

The Analyzer must not present an overall score without explaining its meaning.

---

## 25. Prompt Improver Design

Display original and improved prompts in a comparison-friendly interface.

Recommended desktop layout:

```text
ORIGINAL PROMPT
        |
        | AI IMPROVEMENT
        v
IMPROVED PROMPT
```

Prefer a side-by-side layout on wide screens.

On smaller screens, display the sections vertically.

Include:

- Original prompt editor.
- Improvement summary.
- Improved prompt editor.
- Copy button.
- Save new version.
- Analyze again.

Clearly indicate which version is original and which is improved.

---

## 26. Visualization Design

Radar chart is one of the most important components of PromptScope.

Use Recharts.

### Chart Requirements

- Eight axes.
- 0–100 range.
- Responsive sizing.
- Tooltips.
- Clearly differentiated series.
- Readable axis labels.
- Accessible textual score details.

### Before-and-After Visual Treatment

Suggested visual distinction:

- Original: muted gray or pink.
- Improved: warm orange or yellow.

Avoid excessive glow that compromises chart readability.

Display individual score changes near the chart or in an accompanying comparison list.

Do not rely on the chart alone to communicate the result.

---

## 27. Comparison Page

The comparison page should answer three questions:

1. What was the original prompt quality?
2. What changed after improvement?
3. Which weaknesses still need attention?

Recommended structure:

**A. Summary**

Original Score | Improved Score | Difference

**B. Radar Chart**

Compare all evaluation dimensions.

**C. Dimension Analysis**

For each dimension, show:

- Original score.
- Improved score.
- Difference.
- Short explanation.

**D. Improvement Summary**

Display the most meaningful changes.

**E. Remaining Issues**

Show weaknesses that were not resolved.

The page must support situations where the improved score is unchanged or lower.

---

## 28. Prompt History Design

History should resemble a lightweight document library.

Each saved prompt should be displayed as a clean entry.

Include:

- Prompt title.
- Category.
- Date.
- Latest score.
- Number of versions.

Allow users to open the detail view.

The detail view should provide access to all versions and evaluation snapshots.

Avoid unnecessary complex folder systems in the MVP.

---

## 29. Interaction States

Every important interactive component must have appropriate states.

### Buttons

- Default.
- Hover.
- Active.
- Disabled.
- Loading.

### Inputs

- Default.
- Focus.
- Error.
- Disabled.

### AI Operations

- Idle.
- Submitting.
- Processing.
- Success.
- Error.

### Prompt Evaluation

- Not evaluated.
- Evaluating.
- Evaluated.
- Evaluation failed.

### Charts

- Loading.
- Populated.
- Empty.
- Error.

Empty states should explain what action the user can take next.

Loading states should communicate the current operation.

Avoid leaving users with blank screens during AI processing.

---

## 30. Responsive Design

### Desktop

- Full sidebar.
- Multi-column layouts.
- Side-by-side comparison.
- Large radar chart.

### Tablet

- Reduced sidebar width.
- Flexible grid layouts.
- Carefully adjusted chart dimensions.

### Mobile

- Compact navigation.
- Single-column layouts.
- Full-width text editors.
- Touch-friendly sliders.
- Stacked comparison sections.
- No horizontal overflow.

The interface must remain comfortable to use on mobile devices.

---

# PART V — USER EXPERIENCE & PRODUCT FLOW

## 31. Primary User Journey

The main user journey:

```text
START
  |
  v
DASHBOARD
  |
  v
PROMPT BUILDER
  |
  v
CONFIGURE OBJECTIVE
  |
  v
ADJUST FOCUS SLIDERS
  |
  v
GENERATE PROMPT
  |
  v
REVIEW GENERATED PROMPT
  |
  v
ANALYZE PROMPT
  |
  v
VIEW EVALUATION
  |
  v
REVIEW WEAKNESSES
  |
  v
IMPROVE PROMPT
  |
  v
EVALUATE IMPROVED VERSION
  |
  v
COMPARE BEFORE & AFTER
  |
  v
SAVE PROMPT
  |
  v
PROMPT HISTORY
```

A second user journey should support people who already have a prompt:

```text
DASHBOARD
  |
  v
PROMPT ANALYZER
  |
  v
PASTE EXISTING PROMPT
  |
  v
ANALYZE
  |
  v
REVIEW WEAKNESSES
  |
  v
IMPROVE
  |
  v
COMPARE RESULTS
  |
  v
SAVE
```

The user must not be forced to use the Prompt Builder before accessing the Analyzer.

---

# PART VI — QUALITY ASSURANCE

## 32. Functional Testing

Test these main features:

**Prompt Builder**
- Slider interaction.
- Slider presets.
- Input validation.
- Prompt generation.
- Prompt editing.
- Copy functionality.

**Analyzer**
- Prompt input validation.
- API request.
- Eight dimension evaluations.
- Overall score calculation.
- Weakness display.
- Recommendation display.

**Improver**
- Original prompt preservation.
- Improved prompt generation.
- Change explanation.
- New version creation.

**Visualization**
- Actual evaluation data.
- Correct radar chart mapping.
- Correct comparison calculation.
- Empty states.
- Responsive chart.

**History**
- Save.
- Load.
- Edit.
- Delete.
- Version preservation.

## 33. Security Testing

Verify:

- API keys are not present in frontend bundles.
- API keys are not committed to Git.
- Server routes validate input.
- Invalid requests are rejected.
- Provider errors do not expose secrets.
- User-controlled content is rendered safely.
- API requests are limited appropriately.

## 34. Performance Testing

Verify:

- Dashboard loading.
- Navigation responsiveness.
- Slider interaction.
- Prompt editor behavior.
- Radar chart rendering.
- AI loading state.
- Large prompt handling.

## 35. Definition of Done

The MVP is considered complete when:

1. Users can create a prompt.
2. Users can configure all eight focus sliders.
3. Prompt generation works through Gemini API.
4. Users can analyze existing prompts.
5. The Analyzer returns all eight evaluation dimensions.
6. Overall scores are calculated correctly.
7. Users can request AI improvements.
8. Original prompts remain preserved.
9. Improved prompts can be evaluated.
10. Before-and-after radar charts display actual results.
11. Users can see which dimensions improved or declined.
12. Prompt history persists locally.
13. Demo Mode works without an API key.
14. API keys remain protected.
15. Core features work on desktop and mobile.
16. Technical documentation is complete.
17. The application can be deployed successfully.

---

# PART VII — DEVELOPMENT RULES FOR THE AI CODING AGENT

## 36. General Instructions

You are acting as the engineering team responsible for building PromptScope.

Treat this document as the primary source of truth for product requirements, architecture, development planning, and design direction.

Your responsibility is to build a functional, maintainable, and visually polished application.

Do not treat this project as a simple UI prototype.

The application must have working business logic and actual AI integration.

### 36.1 Repository Inspection

Before writing implementation code:

1. Inspect the existing repository.
2. Identify the current framework and dependencies.
3. Check existing files.
4. Identify reusable components.
5. Identify potential conflicts.
6. Prepare an implementation approach.

Do not overwrite existing work without understanding its purpose.

### 36.2 Implementation Priority

Follow this order:

1. Project foundation.
2. Design system.
3. Dashboard.
4. Prompt Builder.
5. Gemini API infrastructure.
6. Prompt Analyzer.
7. Scoring engine.
8. Prompt Improver.
9. Visualization.
10. Prompt History.
11. Testing.
12. Deployment preparation.

### 36.3 Code Quality

- Use TypeScript.
- Avoid unnecessary `any`.
- Create reusable components.
- Separate UI from business logic.
- Separate AI integration from application logic.
- Validate API requests and responses.
- Use centralized configuration.
- Avoid duplicated code.
- Handle loading and error states.
- Write meaningful comments where useful.
- Use clear naming conventions.
- Keep dependencies reasonably small.

### 36.4 AI Integration Rules

- Use the official Google Gen AI SDK.
- Keep API keys server-side.
- Use structured responses.
- Validate AI output using schemas.
- Do not fabricate scores.
- Do not assume every AI response is valid.
- Do not expose raw internal errors.
- Use a configurable model identifier.
- Implement Demo Mode.
- Clearly distinguish Demo Mode from Live AI Mode.

### 36.5 Design Rules

- Follow the dark editorial design direction.
- Prioritize visual hierarchy.
- Use consistent spacing.
- Avoid generic dashboard templates.
- Avoid excessive gradients.
- Avoid unnecessary animations.
- Ensure charts are readable.
- Avoid oversized UI elements.
- Maintain responsive behavior.
- Provide meaningful empty, loading, and error states.

### 36.6 Development Discipline

After completing each milestone:

1. Run the application.
2. Check the implemented features.
3. Run TypeScript checks.
4. Run linting.
5. Run relevant tests.
6. Fix discovered problems.
7. Update documentation.
8. Report the completed work.
9. Identify remaining tasks.

Do not claim a feature is complete if it only has a visual implementation without functioning logic.

If an implementation decision conflicts with this document, explain the conflict and recommend a solution before changing the scope.

If a requirement is technically infeasible, document the limitation and propose the closest practical alternative.

Do not silently remove requirements.

---

# PART VIII — DOCUMENTATION REQUIREMENTS

## 37. README.md

The final repository must include a comprehensive README.

It should contain:

- Project introduction.
- Problem statement.
- Product objectives.
- Feature overview.
- Technology stack.
- Architecture overview.
- Installation instructions.
- Environment setup.
- Gemini API setup.
- Development instructions.
- Demo Mode instructions.
- Deployment instructions.
- Known limitations.
- Future development roadmap.

## 38. Environment Setup

Document these variables:

```env
GEMINI_API_KEY=
GEMINI_MODEL=
```

Explain where to obtain the API key through Google AI Studio.

Explain that the key belongs in `.env.local`.

Never include a real API key in documentation.

## 39. Architecture Documentation

Document:

- Frontend architecture.
- Backend API structure.
- AI provider integration.
- Evaluation process.
- Scoring calculation.
- Visualization logic.
- Prompt versioning.
- Local persistence.

## 40. Known Limitations

Explicitly document:

- AI evaluations are model-assisted assessments.
- Scores are not universal measurements.
- Model responses may vary.
- API access depends on provider availability and account quotas.
- Demo Mode uses deterministic sample data; its interview is scripted from a seeded bank.
- History, builder drafts and comparisons are stored locally.
- Guided assumptions are recorded but cannot be verified for the user's project.
- Coding-agent prompts do not run code, tests or deployments.
- Live calls can take 30–90 seconds and may fail; fallbacks are labelled.

---

# PART IX — FUTURE ROADMAP

## 41. Version 1.0 — Core PromptScope (shipped)

- Prompt Builder.
- Gemini Integration.
- Prompt Analyzer.
- Prompt Improver.
- Radar Chart.
- Before-and-After Comparison.
- Prompt History.
- Demo Mode.

## 42. Version 2.0 — Guided Prompt Engineering Platform (shipped)

- Guided builder: idea → understanding → interview → brief → depth/agent → prompt.
- Advanced builder retained in a shared-tab workspace.
- 20 categories across 5 groups with domain-aware rubrics.
- 4 depths and 7 target-agent profiles.
- Discovery API and deterministic demo discovery.
- Labelled demo and local-draft fallbacks.

## 43. Version 2.1 — Workspace Depth

Potential features:

- Richer version diffing.
- Per-section regeneration.
- Saved brief templates.
- Custom evaluation criteria.
- Enhanced prompt version comparison.

## 44. Version 3.0 — Prompt Intelligence Platform

Potential features:

- Multiple AI providers and provider comparison.
- Prompt benchmarking and historical quality analytics.
- Organization-specific evaluation rubrics.
- User accounts, cloud history and team workspaces.
- Exportable reports.
- Enterprise prompt governance.

Future features must not delay the completion of the current release.

---

# PART X — FINAL PRODUCT DEFINITION

## 45. What PromptScope Must Become

PromptScope should become a functional AI-powered workspace where users can move through the entire prompt engineering process.

It should not simply generate text.

It should help users understand their objectives, translate those objectives into structured prompts, identify weaknesses, improve instructions, and visualize the results.

The most important product differentiator is the connection between prompt generation, prompt diagnosis, prompt improvement, and measurable comparison.

The application must provide a coherent experience across all four stages.

## 46. Core Product Principles

**Direction Before Generation**

Help users define what they actually want before generating a prompt.

**Diagnosis Before Improvement**

Understand the weaknesses before modifying the prompt.

**Preserve Intent During Optimization**

An improved prompt must still accomplish the user's original objective.

**Measure Changes Transparently**

Show real evaluation results, including negative or unchanged results.

**Make AI Understandable**

Explain why recommendations are provided.

**Keep Users in Control**

Allow users to edit prompts and decide which recommendations to apply.

## 47. Final Product Statement

PromptScope is an AI-powered Prompt Direction & Evaluation Studio designed to transform prompt engineering from trial-and-error experimentation into a structured and measurable workflow.

By combining configurable prompt generation, intelligent evaluation, actionable recommendations, AI-assisted improvement, and visual performance comparison, PromptScope helps users create more intentional and well-structured prompts.

**The objective is not simply to help users write better prompts. It is to help them understand, evaluate, and continuously improve the way they communicate with AI.**

---

# END OF MASTER DOCUMENT

**Project:** PromptScope
**Document:** MASTER.md
**Version:** 2.0
**Development Status:** Implemented — see `docs/TESTING.md` for current verification
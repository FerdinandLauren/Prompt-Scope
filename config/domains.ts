import type { DimensionKey } from "@/types/evaluation";
import type { Complexity, PromptDepth, TargetAgentId } from "@/types/guided";

/**
 * PromptScope domain architecture.
 *
 * Evaluation axes keep stable keys so stored history and comparisons remain
 * interpretable, while every domain supplies its own labels and guidance for
 * those axes. A design rubric asks about typography; a backend rubric asks
 * about security and reliability in the same axis slot.
 */

export const CATEGORY_IDS = [
  "ui_ux",
  "visual_design",
  "product_design",
  "design_system",
  "frontend",
  "backend",
  "full_stack",
  "mobile",
  "software_engineering",
  "api_development",
  "ai_application",
  "machine_learning",
  "data_analytics",
  "ai_agent",
  "business_analysis",
  "workflow_automation",
  "operations",
  "content_creation",
  "technical_writing",
  "research_education",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];
export type CategoryGroupId = "design" | "software" | "ai_data" | "business" | "content";
export type DomainFamily = CategoryGroupId;

export type DimensionProfile = {
  key: DimensionKey;
  label: string;
  short: string;
  description: string;
  guidance: string;
};

type DimensionCopy = Omit<DimensionProfile, "key">;

export type SectionTemplate = {
  heading: string;
  guidance: string;
};

export type QuestionSeed = {
  id: string;
  question: string;
  why: string;
  options: string[];
  target: string;
  /** Used by the deterministic demo engine to avoid asking answered questions. */
  detect: string;
  recommendation: string;
};

export type CategoryDefinition = {
  id: CategoryId;
  label: string;
  shortLabel: string;
  group: CategoryGroupId;
  family: DomainFamily;
  description: string;
  exampleIdea: string;
  keywords: string[];
  available: true;
  rubricVersion: string;
  dimensionOverrides?: Partial<Record<DimensionKey, Partial<DimensionCopy>>>;
};

export const categoryGroups: Array<{ id: CategoryGroupId; label: string; description: string }> = [
  {
    id: "design",
    label: "Design & Interfaces",
    description: "UI/UX, visual systems, product design, and design systems.",
  },
  {
    id: "software",
    label: "Software Development",
    description: "Frontend, backend, full-stack, mobile, APIs, and engineering work.",
  },
  {
    id: "ai_data",
    label: "AI & Data",
    description: "AI applications, machine learning, agents, and analytics.",
  },
  {
    id: "business",
    label: "Business & Operations",
    description: "Business analysis, workflows, and operational processes.",
  },
  {
    id: "content",
    label: "Content & Knowledge",
    description: "Writing, documentation, research, and education.",
  },
];

export const categories: CategoryDefinition[] = [
  {
    id: "ui_ux",
    label: "UI/UX Design",
    shortLabel: "UI/UX",
    group: "design",
    family: "design",
    description: "Interfaces, product screens, dashboards, and interaction systems.",
    exampleIdea: "I want a calm analytics dashboard for an operations team, but I am not sure which screens I need.",
    keywords: ["ui", "ux", "dashboard", "interface", "app", "website", "screen", "desain", "tampilan", "dasbor"],
    available: true,
    rubricVersion: "visual-uiux-v1",
  },
  {
    id: "visual_design",
    label: "Visual Design",
    shortLabel: "Visual",
    group: "design",
    family: "design",
    description: "Editorial layouts, brand systems, art direction, and campaign visuals.",
    exampleIdea: "I want a bold editorial landing page with an original visual identity.",
    keywords: ["visual", "brand", "campaign", "poster", "editorial", "identity", "merek", "poster", "kampanye"],
    available: true,
    rubricVersion: "visual-uiux-v1",
  },
  {
    id: "product_design",
    label: "Product Design",
    shortLabel: "Product",
    group: "design",
    family: "design",
    description: "End-to-end product flows, wireframes, prototypes, and usability decisions.",
    exampleIdea: "I need a booking flow for a small studio, from discovery to confirmation.",
    keywords: ["product design", "flow", "prototype", "wireframe", "journey", "booking", "alur", "prototipe"],
    available: true,
    rubricVersion: "visual-uiux-v1",
  },
  {
    id: "design_system",
    label: "Design Systems",
    shortLabel: "System",
    group: "design",
    family: "design",
    description: "Tokens, component libraries, documentation, and governance.",
    exampleIdea: "I want a component library and token system for a multi-product company.",
    keywords: ["design system", "component library", "tokens", "komponen", "sistem desain", "guideline"],
    available: true,
    rubricVersion: "visual-uiux-v1",
  },
  {
    id: "frontend",
    label: "Frontend Development",
    shortLabel: "Frontend",
    group: "software",
    family: "software",
    description: "React/Vue interfaces, routing, state, accessibility, and client performance.",
    exampleIdea: "I need a responsive React dashboard with filters, charts, and loading states.",
    keywords: ["frontend", "react", "vue", "next.js", "css", "component", "browser", "antarmuka", "halaman"],
    available: true,
    rubricVersion: "software-v1",
    dimensionOverrides: {
      composition: {
        label: "Component Architecture",
        short: "Components",
        description: "Whether routing, state, components, and data flow are specified.",
        guidance:
          "Reward named routes, component boundaries, state ownership, data fetching, and loading/error states. Penalize a UI brief with no architecture at all.",
      },
      typography: {
        label: "Accessibility & Performance",
        short: "Quality",
        description: "Whether accessibility, responsiveness, and performance expectations are defined.",
        guidance:
          "Reward keyboard access, semantics, contrast, responsive breakpoints, and performance budgets. Penalize visual-only briefs that ignore behaviour.",
      },
    },
  },
  {
    id: "backend",
    label: "Backend Development",
    shortLabel: "Backend",
    group: "software",
    family: "software",
    description: "Services, business logic, databases, authentication, and reliability.",
    exampleIdea: "I need an inventory API with role-based access and stock movement history.",
    keywords: ["backend", "api", "server", "database", "postgres", "service", "endpoint", "basis data", "layanan"],
    available: true,
    rubricVersion: "software-v1",
    dimensionOverrides: {
      composition: {
        label: "Data & Services",
        short: "Data",
        description: "Whether data models, service boundaries, APIs, and integrations are specified.",
        guidance:
          "Reward schemas, relationships, endpoints, transactions, and integration contracts. Penalize requests that name a feature but no data model.",
      },
      typography: {
        label: "Security & Reliability",
        short: "Reliability",
        description: "Whether auth, validation, error handling, observability, and testing are covered.",
        guidance:
          "Reward roles, permission checks, validation, retries, logging, and tests. Penalize a backend brief with no failure model.",
      },
    },
  },
  {
    id: "full_stack",
    label: "Full-Stack Development",
    shortLabel: "Full-stack",
    group: "software",
    family: "software",
    description: "End-to-end products spanning UI, API, data, security, and deployment.",
    exampleIdea: "I want a small business inventory app with a dashboard, roles, and monthly reports.",
    keywords: ["full stack", "fullstack", "end to end", "web app", "saas", "aplikasi web", "sistem", "inventaris"],
    available: true,
    rubricVersion: "software-v1",
    dimensionOverrides: {
      composition: {
        label: "Data Flow & Contracts",
        short: "Data flow",
        description: "Whether UI, API, database, and integration contracts connect coherently.",
        guidance:
          "Reward a described request lifecycle, API contract, persistence model, and error path. Penalize disconnected feature lists.",
      },
      typography: {
        label: "Security & Operations",
        short: "Operations",
        description: "Whether auth, deployment, monitoring, and testing are addressed.",
        guidance:
          "Reward roles, secrets handling, environment configuration, deployment, and verification. Penalize production concerns left implicit.",
      },
    },
  },
  {
    id: "mobile",
    label: "Mobile Development",
    shortLabel: "Mobile",
    group: "software",
    family: "software",
    description: "Native or cross-platform apps, navigation, offline behaviour, and store readiness.",
    exampleIdea: "I want an offline-first expense tracker for Android and iOS.",
    keywords: ["mobile", "android", "ios", "react native", "flutter", "offline", "aplikasi mobile", "ponsel"],
    available: true,
    rubricVersion: "software-v1",
    dimensionOverrides: {
      composition: {
        label: "Screens & Navigation",
        short: "Screens",
        description: "Whether screen inventory, navigation, state, and offline behaviour are defined.",
        guidance:
          "Reward named screens, navigation model, local persistence, sync, and device states. Penalize web briefs copied to mobile without adaptation.",
      },
      typography: {
        label: "Platform & Performance",
        short: "Platform",
        description: "Whether platform conventions, permissions, and performance limits are covered.",
        guidance:
          "Reward touch targets, safe areas, permissions, startup time, and store constraints. Penalize ignoring platform behaviour.",
      },
    },
  },
  {
    id: "software_engineering",
    label: "Software Engineering",
    shortLabel: "Engineering",
    group: "software",
    family: "software",
    description: "Refactoring, architecture changes, reliability, and maintainability work.",
    exampleIdea: "I need to refactor a legacy billing module without breaking existing behaviour.",
    keywords: ["refactor", "legacy", "architecture", "maintain", "codebase", "migration", "teknis", "kode"],
    available: true,
    rubricVersion: "software-v1",
    dimensionOverrides: {
      visual_direction: {
        label: "Architecture & Constraints",
        short: "Architecture",
        description: "Whether the existing system, boundaries, and technical constraints are described.",
        guidance:
          "Reward current architecture, dependencies, constraints, and non-goals. Penalize a rewrite request with no understanding of the codebase.",
      },
      typography: {
        label: "Safety & Verification",
        short: "Safety",
        description: "Whether regression risk, testing, rollout, and rollback are covered.",
        guidance:
          "Reward tests, incremental rollout, rollback, and observability. Penalize risky changes with no verification plan.",
      },
    },
  },
  {
    id: "api_development",
    label: "API Development",
    shortLabel: "API",
    group: "software",
    family: "software",
    description: "Contracts, versioning, validation, auth, and integration documentation.",
    exampleIdea: "I need a REST API for orders with pagination, webhooks, and API-key access.",
    keywords: ["rest", "graphql", "webhook", "openapi", "endpoint", "payload", "integrasi", "kontrak api"],
    available: true,
    rubricVersion: "software-v1",
    dimensionOverrides: {
      visual_direction: {
        label: "Contract & Versioning",
        short: "Contract",
        description: "Whether resources, request/response shapes, versioning, and compatibility are defined.",
        guidance:
          "Reward resource models, status codes, versioning, pagination, and idempotency. Penalize endpoints named without a contract.",
      },
      composition: {
        label: "Integration & Auth",
        short: "Integration",
        description: "Whether authentication, authorization, rate limits, and consumers are specified.",
        guidance:
          "Reward auth models, scopes, quotas, webhook delivery, and consumer expectations. Penalize an API brief with no security model.",
      },
      typography: {
        label: "Errors & Operations",
        short: "Operations",
        description: "Whether error contracts, observability, and documentation are addressed.",
        guidance:
          "Reward error shapes, logging, monitoring, and docs. Penalize happy-path-only specifications.",
      },
    },
  },
  {
    id: "ai_application",
    label: "AI Applications",
    shortLabel: "AI app",
    group: "ai_data",
    family: "ai_data",
    description: "LLM products, retrieval, guardrails, prompts, and human review.",
    exampleIdea: "I want an assistant that answers questions from our internal policy documents.",
    keywords: ["ai", "llm", "chatbot", "assistant", "rag", "prompt", "asisten", "kecerdasan buatan"],
    available: true,
    rubricVersion: "ai-data-v1",
    dimensionOverrides: {
      visual_direction: {
        label: "AI Method & Model",
        short: "Method",
        description: "Whether the model approach, retrieval, and prompting strategy are defined.",
        guidance:
          "Reward a named approach, context strategy, model constraints, and fallback. Penalize 'use AI' with no method.",
      },
      composition: {
        label: "Data & Evaluation",
        short: "Evaluation",
        description: "Whether data sources, evaluation criteria, and quality measurement are specified.",
        guidance:
          "Reward source inventory, test sets, metrics, and human review. Penalize unmeasured quality claims.",
      },
      typography: {
        label: "Safety & Reliability",
        short: "Safety",
        description: "Whether privacy, guardrails, failure handling, and cost controls are covered.",
        guidance:
          "Reward injection defence, PII handling, refusal behaviour, latency, and cost limits. Penalize trust without controls.",
      },
    },
  },
  {
    id: "machine_learning",
    label: "Machine Learning",
    shortLabel: "ML",
    group: "ai_data",
    family: "ai_data",
    description: "Problem framing, datasets, training, evaluation, and deployment.",
    exampleIdea: "I want to predict customer churn from product usage and support data.",
    keywords: ["machine learning", "model", "training", "dataset", "prediction", "klasifikasi", "prediksi"],
    available: true,
    rubricVersion: "ai-data-v1",
    dimensionOverrides: {
      visual_direction: {
        label: "Problem & Model",
        short: "Model",
        description: "Whether the prediction target, baseline, and model approach are defined.",
        guidance:
          "Reward label definition, baselines, candidate approaches, and constraints. Penalize algorithm-first briefs with no problem framing.",
      },
      composition: {
        label: "Data & Evaluation",
        short: "Evaluation",
        description: "Whether data sources, splits, metrics, and leakage risks are addressed.",
        guidance:
          "Reward dataset provenance, preprocessing, validation strategy, and metric choice. Penalize accuracy-only evaluation.",
      },
    },
  },
  {
    id: "data_analytics",
    label: "Data Analytics",
    shortLabel: "Analytics",
    group: "ai_data",
    family: "ai_data",
    description: "Business questions, data preparation, metrics, and reporting.",
    exampleIdea: "I want to understand why monthly retention dropped and what to report to leadership.",
    keywords: ["analytics", "dashboard data", "report", "metric", "sql", "insight", "laporan", "metrik", "analisis"],
    available: true,
    rubricVersion: "ai-data-v1",
    dimensionOverrides: {
      visual_direction: {
        label: "Analytical Method",
        short: "Method",
        description: "Whether the business question, hypotheses, and analysis method are defined.",
        guidance:
          "Reward a precise question, segmentation, comparison period, and method. Penalize chart requests with no decision attached.",
      },
      composition: {
        label: "Data Preparation",
        short: "Data",
        description: "Whether sources, joins, definitions, and data quality are specified.",
        guidance:
          "Reward table sources, metric definitions, joins, and exclusions. Penalize undefined metrics.",
      },
      typography: {
        label: "Validation & Reporting",
        short: "Validation",
        description: "Whether checks, caveats, and the reporting format are covered.",
        guidance:
          "Reward sanity checks, confidence, caveats, and audience-appropriate reporting. Penalize conclusions without validation.",
      },
    },
  },
  {
    id: "ai_agent",
    label: "AI Agent Development",
    shortLabel: "Agent",
    group: "ai_data",
    family: "ai_data",
    description: "Tool-using agents, planning, permissions, and operational guardrails.",
    exampleIdea: "I want an agent that triages support tickets and drafts replies for review.",
    keywords: ["agent", "tool", "automation ai", "workflow ai", "function calling", "agen", "otomatis"],
    available: true,
    rubricVersion: "ai-data-v1",
    dimensionOverrides: {
      visual_direction: {
        label: "Agent Role & Tools",
        short: "Agent",
        description: "Whether the agent's responsibilities, tools, and decision boundaries are defined.",
        guidance:
          "Reward scope, tool inventory, permissions, and escalation. Penalize open-ended autonomy without boundaries.",
      },
      composition: {
        label: "Planning & Evaluation",
        short: "Planning",
        description: "Whether the task loop, state, evaluation, and stopping conditions are specified.",
        guidance:
          "Reward planning steps, memory, success checks, and termination. Penalize an agent brief with no control loop.",
      },
    },
  },
  {
    id: "business_analysis",
    label: "Business Analysis",
    shortLabel: "Business",
    group: "business",
    family: "business",
    description: "Process analysis, requirements, rules, stakeholders, and documentation.",
    exampleIdea: "I want to improve our purchase request process and document the new workflow.",
    keywords: ["business", "process", "stakeholder", "requirement", "sop", "procurement", "proses", "bisnis", "pembelian"],
    available: true,
    rubricVersion: "business-v1",
    dimensionOverrides: {
      visual_direction: {
        label: "Stakeholders & Process",
        short: "Process",
        description: "Whether stakeholders, current process, and target process are described.",
        guidance:
          "Reward named roles, as-is steps, bottlenecks, and to-be state. Penalize a request that jumps to a solution.",
      },
      composition: {
        label: "Business Rules",
        short: "Rules",
        description: "Whether rules, exceptions, approvals, and data are explicit.",
        guidance:
          "Reward decision rules, thresholds, exceptions, and ownership. Penalize rules that exist only in someone's head.",
      },
      typography: {
        label: "Evidence & Acceptance",
        short: "Evidence",
        description: "Whether success measures, evidence, and acceptance criteria are defined.",
        guidance:
          "Reward measurable outcomes, evidence sources, and sign-off criteria. Penalize qualitative claims with no measure.",
      },
    },
  },
  {
    id: "workflow_automation",
    label: "Workflow Automation",
    shortLabel: "Automation",
    group: "business",
    family: "business",
    description: "Triggers, conditions, integrations, retries, and monitoring.",
    exampleIdea: "I want to automate invoice approval and sync approved invoices to accounting.",
    keywords: ["automation", "workflow", "trigger", "zapier", "integrasi", "otomasi", "alur kerja", "approval"],
    available: true,
    rubricVersion: "business-v1",
    dimensionOverrides: {
      visual_direction: {
        label: "Triggers & Integrations",
        short: "Triggers",
        description: "Whether triggers, systems, and integration contracts are defined.",
        guidance:
          "Reward event sources, payloads, systems of record, and ownership. Penalize 'automate everything' with no trigger.",
      },
      composition: {
        label: "Workflow Logic",
        short: "Logic",
        description: "Whether conditions, mapping, ordering, and exceptions are specified.",
        guidance:
          "Reward branches, transformations, approvals, and edge cases. Penalize a happy-path diagram only.",
      },
      typography: {
        label: "Failure & Monitoring",
        short: "Monitoring",
        description: "Whether retries, alerts, idempotency, and auditability are covered.",
        guidance:
          "Reward retry policy, dead-letter handling, alerts, and audit logs. Penalize automations that fail silently.",
      },
    },
  },
  {
    id: "operations",
    label: "Operations Management",
    shortLabel: "Operations",
    group: "business",
    family: "business",
    description: "Operational systems, SOPs, capacity, quality, and continuous improvement.",
    exampleIdea: "I need a standard operating procedure for onboarding new warehouse staff.",
    keywords: ["operations", "sop", "inventory", "warehouse", "quality", "operasional", "gudang", "prosedur"],
    available: true,
    rubricVersion: "business-v1",
    dimensionOverrides: {
      visual_direction: {
        label: "Operating Context",
        short: "Context",
        description: "Whether the operating environment, roles, and constraints are described.",
        guidance:
          "Reward site, roles, volume, constraints, and current pain. Penalize generic best-practice requests.",
      },
      composition: {
        label: "Procedure & Controls",
        short: "Controls",
        description: "Whether steps, controls, handoffs, and escalation paths are explicit.",
        guidance:
          "Reward sequenced steps, ownership, checkpoints, and escalation. Penalize undocumented handoffs.",
      },
    },
  },
  {
    id: "content_creation",
    label: "Content Creation",
    shortLabel: "Content",
    group: "content",
    family: "content",
    description: "Articles, campaigns, scripts, and audience-focused writing.",
    exampleIdea: "I want a launch article for a new budgeting feature, aimed at small business owners.",
    keywords: ["content", "article", "blog", "copy", "script", "campaign", "artikel", "konten", "tulisan"],
    available: true,
    rubricVersion: "content-v1",
    dimensionOverrides: {
      visual_direction: {
        label: "Audience & Voice",
        short: "Voice",
        description: "Whether the audience, intent, and tone are clearly defined.",
        guidance:
          "Reward a named reader, desired response, and voice constraints. Penalize 'engaging content' with no audience.",
      },
      composition: {
        label: "Structure & Evidence",
        short: "Structure",
        description: "Whether the argument, sections, and supporting evidence are specified.",
        guidance:
          "Reward an outline, proof points, sources, and call to action. Penalize structure left entirely to the model.",
      },
      typography: {
        label: "Format & Craft",
        short: "Craft",
        description: "Whether length, format, readability, and factual limits are covered.",
        guidance:
          "Reward format, length range, terminology, and fact constraints. Penalize claims that cannot be verified.",
      },
    },
  },
  {
    id: "technical_writing",
    label: "Technical Writing",
    shortLabel: "Docs",
    group: "content",
    family: "content",
    description: "Documentation, guides, references, and release communication.",
    exampleIdea: "I need onboarding documentation for developers integrating with our API.",
    keywords: ["documentation", "technical writing", "guide", "reference", "readme", "dokumentasi", "panduan"],
    available: true,
    rubricVersion: "content-v1",
    dimensionOverrides: {
      visual_direction: {
        label: "Reader & Task",
        short: "Reader",
        description: "Whether the reader's role, prior knowledge, and task are defined.",
        guidance:
          "Reward reader expertise, task context, and prerequisites. Penalize documentation with no audience.",
      },
      composition: {
        label: "Structure & Accuracy",
        short: "Accuracy",
        description: "Whether the document structure, examples, and source of truth are specified.",
        guidance:
          "Reward task-based sections, runnable examples, and canonical sources. Penalize invented commands or APIs.",
      },
    },
  },
  {
    id: "research_education",
    label: "Research & Education",
    shortLabel: "Research",
    group: "content",
    family: "content",
    description: "Research plans, literature reviews, lessons, and learning materials.",
    exampleIdea: "I want a research plan on how remote teams adopt asynchronous communication.",
    keywords: ["research", "study", "literature", "course", "lesson", "education", "riset", "penelitian", "edukasi"],
    available: true,
    rubricVersion: "content-v1",
    dimensionOverrides: {
      visual_direction: {
        label: "Question & Method",
        short: "Method",
        description: "Whether the research question, scope, and method are defined.",
        guidance:
          "Reward a focused question, method, and boundaries. Penalize a broad topic with no design.",
      },
      composition: {
        label: "Sources & Analysis",
        short: "Sources",
        description: "Whether sources, inclusion criteria, and analysis approach are specified.",
        guidance:
          "Reward source types, selection criteria, synthesis method, and limitations. Penalize unsupported claims.",
      },
      typography: {
        label: "Reporting & Rigour",
        short: "Rigour",
        description: "Whether citations, limitations, and output format are covered.",
        guidance:
          "Reward citation style, uncertainty, and deliverable format. Penalize confident conclusions from no evidence.",
      },
    },
  },
];

export function getCategory(id: string): CategoryDefinition {
  return categories.find((category) => category.id === id) ?? categories[0]!;
}

export function getCategoryGroup(id: string) {
  const category = getCategory(id);
  return categoryGroups.find((group) => group.id === category.group) ?? categoryGroups[0]!;
}

export function getCategoriesByGroup(group: CategoryGroupId) {
  return categories.filter((category) => category.group === group);
}

export function getRubricVersion(categoryId?: string) {
  return categoryId ? getCategory(categoryId).rubricVersion : "visual-uiux-v1";
}

const designDimensions: Record<DimensionKey, DimensionCopy> = {
  clarity: {
    label: "Clarity",
    short: "Clarity",
    description: "Whether the instructions are understandable, ordered, and unambiguous.",
    guidance:
      "Reward a readable objective, direct verbs, logical order, and language that cannot be read two ways. Penalize vague mood words carrying the whole brief, contradictions, and instructions that require guessing.",
  },
  context: {
    label: "Context",
    short: "Context",
    description: "Whether sufficient project background, audience, and purpose are supplied.",
    guidance:
      "Reward a named audience, product purpose, usage environment, and relevant existing constraints. Penalize briefs that could apply to any project.",
  },
  specificity: {
    label: "Specificity",
    short: "Specific",
    description: "Whether requirements are detailed enough to guide a concrete output.",
    guidance:
      "Reward concrete content, components, quantities, states, breakpoints, and named deliverables. Penalize adjectives with no operational meaning.",
  },
  visual_direction: {
    label: "Visual Direction",
    short: "Visual",
    description: "Whether the desired style, mood, palette, and references are sufficiently defined.",
    guidance:
      "Reward a coherent direction with intentional references, colour behaviour, imagery stance, and mood. Penalize lists of contradictory style labels or a single generic adjective such as 'modern'.",
  },
  composition: {
    label: "Composition",
    short: "Layout",
    description: "Whether layout, hierarchy, grid, spacing, and responsive expectations are clear.",
    guidance:
      "Reward a stated focal point, reading order, alignment system, spacing rhythm, and responsive behaviour. Penalize layout instructions that leave every spatial decision open.",
  },
  typography: {
    label: "Typography",
    short: "Type",
    description: "Whether type roles, scale, readability, and fallback behaviour are specified.",
    guidance:
      "Reward distinct display/body/metadata roles, scale, weight, measure, and legibility requirements. A prompt with no typographic instruction should not score highly here.",
  },
  constraints: {
    label: "Constraints",
    short: "Limits",
    description: "Whether limits, exclusions, and required conditions are explicit and consistent.",
    guidance:
      "Reward must/avoid/only statements, accessibility and responsiveness requirements, and explicit exclusions. Penalize constraints that conflict with the stated direction.",
  },
  output_definition: {
    label: "Output Definition",
    short: "Output",
    description: "Whether the deliverable, format, and response expectations are defined.",
    guidance:
      "Reward a named deliverable, format, level of fidelity, and response structure. Penalize prompts that do not say what the model should return.",
  },
};

const softwareDimensions: Record<DimensionKey, DimensionCopy> = {
  ...designDimensions,
  visual_direction: {
    label: "Architecture",
    short: "Architecture",
    description: "Whether system structure, boundaries, state, and technology decisions are defined.",
    guidance:
      "Reward named layers, modules, frameworks, boundaries, data ownership, and trade-offs. Penalize feature lists that never describe how the system is put together.",
  },
  composition: {
    label: "Data & Integration",
    short: "Data",
    description: "Whether data models, APIs, state, and integrations are specified.",
    guidance:
      "Reward schemas, relationships, request/response contracts, state ownership, and integration failure paths. Penalize a spec that cannot be implemented without inventing the data model.",
  },
  typography: {
    label: "Security & Reliability",
    short: "Reliability",
    description: "Whether auth, permissions, validation, errors, observability, and testing are covered.",
    guidance:
      "Reward role checks, validation, error handling, logging, tests, and operational limits. Penalize a confident spec with no failure or security model.",
  },
};

const aiDataDimensions: Record<DimensionKey, DimensionCopy> = {
  ...designDimensions,
  visual_direction: {
    label: "Method & Model",
    short: "Method",
    description: "Whether the analytical or AI approach, model choice, and constraints are defined.",
    guidance:
      "Reward a named approach, model or method rationale, context strategy, baselines, and fallback. Penalize 'use AI' or 'analyse the data' with no method.",
  },
  composition: {
    label: "Data & Evaluation",
    short: "Evaluation",
    description: "Whether data sources, preparation, metrics, and evaluation are specified.",
    guidance:
      "Reward source inventory, preparation, splits, metrics, and human review. Penalize unmeasured quality claims.",
  },
  typography: {
    label: "Safety & Reliability",
    short: "Safety",
    description: "Whether privacy, guardrails, failure handling, and operating limits are covered.",
    guidance:
      "Reward privacy handling, injection or leakage defences, refusal behaviour, latency and cost limits. Penalize trust without controls.",
  },
};

const businessDimensions: Record<DimensionKey, DimensionCopy> = {
  ...designDimensions,
  visual_direction: {
    label: "Stakeholders & Process",
    short: "Process",
    description: "Whether stakeholders, current process, and target process are described.",
    guidance:
      "Reward named roles, as-is steps, bottlenecks, and the intended to-be state. Penalize a solution request that never describes the process.",
  },
  composition: {
    label: "Business Rules",
    short: "Rules",
    description: "Whether rules, exceptions, approvals, and ownership are explicit.",
    guidance:
      "Reward decision rules, thresholds, exceptions, handoffs, and ownership. Penalize rules that remain implicit.",
  },
  typography: {
    label: "Evidence & Acceptance",
    short: "Evidence",
    description: "Whether success measures, evidence, and acceptance criteria are defined.",
    guidance:
      "Reward measurable outcomes, evidence sources, and sign-off criteria. Penalize qualitative claims with no measure.",
  },
};

const contentDimensions: Record<DimensionKey, DimensionCopy> = {
  ...designDimensions,
  visual_direction: {
    label: "Audience & Voice",
    short: "Voice",
    description: "Whether the audience, intent, and tone are clearly defined.",
    guidance:
      "Reward a named reader, desired response, and voice constraints. Penalize 'engaging content' with no audience.",
  },
  composition: {
    label: "Structure & Evidence",
    short: "Structure",
    description: "Whether the argument, sections, and supporting evidence are specified.",
    guidance:
      "Reward an outline, proof points, sources, and a call to action. Penalize structure left entirely to the model.",
  },
  typography: {
    label: "Format & Craft",
    short: "Craft",
    description: "Whether length, format, readability, and factual limits are covered.",
    guidance:
      "Reward format, length range, terminology, and fact constraints. Penalize claims that cannot be verified.",
  },
};

const familyDimensions: Record<DomainFamily, Record<DimensionKey, DimensionCopy>> = {
  design: designDimensions,
  software: softwareDimensions,
  ai_data: aiDataDimensions,
  business: businessDimensions,
  content: contentDimensions,
};

export function getEvaluationDimensions(categoryId?: string): DimensionProfile[] {
  const category = categoryId ? getCategory(categoryId) : categories[0]!;
  return (Object.keys(familyDimensions[category.family]) as DimensionKey[]).map((key) => ({
    key,
    ...familyDimensions[category.family][key],
    ...category.dimensionOverrides?.[key],
  }));
}

export function getDimension(key: DimensionKey, categoryId?: string): DimensionProfile {
  return getEvaluationDimensions(categoryId).find((dimension) => dimension.key === key) ?? getEvaluationDimensions(categoryId)[0]!;
}

export function getDimensionLabel(key: DimensionKey, categoryId?: string) {
  return getDimension(key, categoryId).label;
}

/* ------------------------------------------------------------------ */
/* Prompt depth                                                       */
/* ------------------------------------------------------------------ */

export const promptDepths: Array<{
  id: PromptDepth;
  label: string;
  summary: string;
  guidance: string;
  sectionLimit: number;
}> = [
  {
    id: "concise",
    label: "Concise",
    summary: "The essential request in a short, direct brief.",
    guidance:
      "Keep only the sections needed to act. Use short imperative statements, name the deliverable, and omit optional depth.",
    sectionLimit: 6,
  },
  {
    id: "balanced",
    label: "Balanced",
    summary: "A professional brief with objectives, scope, requirements, and output.",
    guidance:
      "Cover objective, audience, scope, core requirements, constraints, and deliverables. Add detail where it changes implementation.",
    sectionLimit: 12,
  },
  {
    id: "detailed",
    label: "Detailed",
    summary: "Implementation-ready requirements, edge cases, and validation.",
    guidance:
      "Add architecture, workflows, edge cases, error handling, testing, and acceptance criteria. Prefer verifiable rules over prose.",
    sectionLimit: 20,
  },
  {
    id: "comprehensive",
    label: "Comprehensive",
    summary: "A full project instruction set for an AI agent to execute.",
    guidance:
      "Include every relevant section: scope, roles, requirements, architecture, data, security, performance, edge cases, testing, acceptance criteria, phases, deliverables, and reporting. Do not pad with repetition.",
    sectionLimit: 99,
  },
];

export function getPromptDepth(id?: string) {
  return promptDepths.find((depth) => depth.id === id) ?? promptDepths[1]!;
}

/* ------------------------------------------------------------------ */
/* Target AI agent profiles                                           */
/* ------------------------------------------------------------------ */

export type AgentProfile = {
  id: TargetAgentId;
  label: string;
  description: string;
  recommendedDepth: PromptDepth;
  operatingRules: string[];
  sections: SectionTemplate[];
};

export const agentProfiles: AgentProfile[] = [
  {
    id: "general",
    label: "General AI Assistant",
    description: "A capable assistant that needs clear context and an explicit deliverable.",
    recommendedDepth: "balanced",
    operatingRules: [
      "State assumptions explicitly instead of filling gaps silently.",
      "Ask a focused question only when a missing fact would materially change the result.",
      "Return the requested deliverable in the structure defined below.",
    ],
    sections: [{ heading: "Response Expectations", guidance: "Define the response structure, level of detail, and what to do with missing information." }],
  },
  {
    id: "coding",
    label: "Coding / Software Agent",
    description: "An agent that can inspect a repository, edit files, run checks, and report results.",
    recommendedDepth: "comprehensive",
    operatingRules: [
      "Inspect the existing repository, conventions, and dependencies before changing code.",
      "Preserve existing functionality and avoid unnecessary rewrites.",
      "Implement in small, reviewable steps and handle loading, empty, error, and edge states.",
      "Run the relevant type check, lint, tests, and build; report exact results.",
      "Never commit, push, deploy, or run destructive commands unless explicitly requested.",
      "Finish with a report of changed files, tests run, incomplete work, and known limitations.",
    ],
    sections: [
      { heading: "Repository Inspection", guidance: "Instruct the agent to read the codebase, identify reusable components, and note risks before editing." },
      { heading: "Implementation Plan", guidance: "Require a short plan that maps requirements to files, modules, and phases." },
      { heading: "Implementation Rules", guidance: "State conventions to follow, files to preserve, and behaviour that must not regress." },
      { heading: "Verification", guidance: "Require type checking, linting, tests, build, and manual verification of the real workflow." },
      { heading: "Final Report", guidance: "Require a summary of changes, files affected, commands run, remaining limitations, and no unrequested git operations." },
    ],
  },
  {
    id: "design",
    label: "UI/UX Design Agent",
    description: "An agent that produces flows, layouts, components, and design rationale.",
    recommendedDepth: "detailed",
    operatingRules: [
      "Establish the user goal and reading order before visual decisions.",
      "Use a consistent spacing, type, and colour system rather than one-off styling.",
      "Describe interaction states and responsive behaviour, not only the default screen.",
      "Explain the main design decisions and the trade-offs behind them.",
    ],
    sections: [
      { heading: "Design Process", guidance: "Require information architecture, flows, and hierarchy before visual execution." },
      { heading: "Interaction States", guidance: "Name default, hover, focus, active, disabled, loading, empty, and error states." },
      { heading: "Design Rationale", guidance: "Ask for a short explanation of hierarchy, type, colour, and responsive decisions." },
    ],
  },
  {
    id: "research",
    label: "Research & Analysis Agent",
    description: "An agent that gathers evidence, analyses it, and reports with citations.",
    recommendedDepth: "detailed",
    operatingRules: [
      "Separate verified evidence from inference and opinion.",
      "Cite the source for every factual claim and state when evidence is unavailable.",
      "Describe method, inclusion criteria, and limitations before conclusions.",
      "Prefer a clear decision or answer over a summary of everything found.",
    ],
    sections: [
      { heading: "Method", guidance: "Define the research question, sources, inclusion criteria, and analysis approach." },
      { heading: "Evidence Standard", guidance: "Require citations, dates, and a clear distinction between fact and inference." },
      { heading: "Limitations", guidance: "Require explicit gaps, uncertainty, and what would change the conclusion." },
    ],
  },
  {
    id: "automation",
    label: "Workflow Automation Agent",
    description: "An agent that designs or builds triggers, conditions, actions, and integrations.",
    recommendedDepth: "detailed",
    operatingRules: [
      "Name the trigger, systems of record, and owner for every step.",
      "Define conditions, data mapping, and what happens when a dependency fails.",
      "Require idempotency, retries, alerts, and an audit trail for irreversible actions.",
      "Do not invent credentials, endpoints, or field names.",
    ],
    sections: [
      { heading: "Workflow Map", guidance: "Require trigger, steps, branches, approvals, and terminal states." },
      { heading: "Failure Handling", guidance: "Define retries, fallbacks, alerts, dead-letter handling, and manual recovery." },
      { heading: "Monitoring", guidance: "Define logs, metrics, ownership, and how success is verified." },
    ],
  },
  {
    id: "writing",
    label: "Content & Writing Agent",
    description: "An agent that writes for a named audience with evidence and a defined format.",
    recommendedDepth: "balanced",
    operatingRules: [
      "Write for the named reader, not for a generic audience.",
      "State the communication objective and the action the reader should take.",
      "Do not invent facts, quotes, statistics, or sources.",
      "Follow the requested structure, length, and terminology.",
    ],
    sections: [
      { heading: "Editorial Brief", guidance: "Define audience, objective, key message, voice, and required evidence." },
      { heading: "Structure", guidance: "Require an outline before drafting and a clear call to action." },
      { heading: "Factual Constraints", guidance: "Require verification, source citations, and explicit unknowns." },
    ],
  },
  {
    id: "custom",
    label: "Custom AI Agent",
    description: "A custom target whose role and operating rules you define in the brief.",
    recommendedDepth: "detailed",
    operatingRules: [
      "Follow the role, permissions, and boundaries stated in the brief.",
      "Ask before acting when a required fact or permission is missing.",
      "Report what was done, what was not done, and any remaining uncertainty.",
    ],
    sections: [{ heading: "Custom Agent Rules", guidance: "Describe the agent's role, tools, permissions, boundaries, and reporting format." }],
  },
];

export function getAgentProfile(id?: string) {
  return agentProfiles.find((profile) => profile.id === id) ?? agentProfiles[0]!;
}

/* ------------------------------------------------------------------ */
/* Domain prompt section templates                                    */
/* ------------------------------------------------------------------ */

const designSections: SectionTemplate[] = [
  { heading: "Project Identity", guidance: "Name the product, the deliverable, and the design surface." },
  { heading: "Role and Responsibilities", guidance: "Define the designer's role and what is in and out of scope." },
  { heading: "Project Background", guidance: "Summarize the product, audience, and situation." },
  { heading: "Problem Statement", guidance: "State the user problem the design must solve." },
  { heading: "Main Objectives", guidance: "List measurable design objectives in priority order." },
  { heading: "Project Scope", guidance: "Name the screens, flows, and deliverables included and excluded." },
  { heading: "Target Audience", guidance: "Describe primary and secondary users and their context." },
  { heading: "User Roles", guidance: "List roles and what each can see or do." },
  { heading: "User Stories", guidance: "Write user stories with a clear actor, action, and outcome." },
  { heading: "Functional Requirements", guidance: "Specify what the interface must let people do." },
  { heading: "Non-Functional Requirements", guidance: "Cover accessibility, performance, content, and quality expectations." },
  { heading: "User Workflows", guidance: "Describe the primary flow step by step, including success and failure." },
  { heading: "UI/UX Requirements", guidance: "Define navigation, hierarchy, content density, and interaction behaviour." },
  { heading: "Visual Direction", guidance: "Define style, colour behaviour, imagery, and mood without contradicting the brand." },
  { heading: "Composition and Hierarchy", guidance: "State the focal point, reading order, grid, and spacing rhythm." },
  { heading: "Typography", guidance: "Define type roles, scale, weight, measure, and legibility." },
  { heading: "Interaction and States", guidance: "Cover default, hover, focus, active, disabled, loading, empty, and error states." },
  { heading: "Responsive Behaviour", guidance: "Describe how the layout reflows at named breakpoints." },
  { heading: "Accessibility", guidance: "Require keyboard access, semantics, contrast, focus, and reduced motion." },
  { heading: "Constraints and Exclusions", guidance: "List limits, existing systems, and things to avoid." },
  { heading: "Deliverables", guidance: "Name the requested artifacts and fidelity." },
  { heading: "Validation and Acceptance Criteria", guidance: "Define how the design will be judged as complete." },
];

const softwareSections: SectionTemplate[] = [
  { heading: "Project Identity", guidance: "Name the product, repository, and change being requested." },
  { heading: "Role and Responsibilities", guidance: "Define the engineering role and ownership boundaries." },
  { heading: "Project Background", guidance: "Summarize the product, users, and current system state." },
  { heading: "Problem Statement", guidance: "State the concrete problem and why it matters." },
  { heading: "Main Objectives", guidance: "List the outcomes the implementation must achieve." },
  { heading: "Project Scope", guidance: "State included and excluded work, and preserve existing behaviour." },
  { heading: "Target Users", guidance: "Name the people who use the system and their technical context." },
  { heading: "User Roles and Permissions", guidance: "Define roles, access boundaries, and administrative actions." },
  { heading: "User Stories", guidance: "Describe actor, action, and expected result for each core flow." },
  { heading: "Functional Requirements", guidance: "Specify features, inputs, outputs, and state changes." },
  { heading: "Non-Functional Requirements", guidance: "Cover performance, accessibility, reliability, and maintainability." },
  { heading: "User Workflows", guidance: "Describe the primary flow and its error branches." },
  { heading: "System Architecture", guidance: "Define layers, modules, dependencies, and the reasoning behind them." },
  { heading: "Frontend Requirements", guidance: "Define routes, components, state, forms, and loading/error states." },
  { heading: "Backend Requirements", guidance: "Define services, business logic, jobs, and integration points." },
  { heading: "Data Model", guidance: "Define entities, fields, relationships, constraints, and migrations." },
  { heading: "API Contracts", guidance: "Define endpoints, request and response shapes, status codes, and pagination." },
  { heading: "Validation and Business Rules", guidance: "Define input validation, permissions, and domain rules." },
  { heading: "Authentication and Authorization", guidance: "Define sign-in, sessions, roles, and protected resources." },
  { heading: "Security", guidance: "Cover secrets, injection, authorization, data exposure, and abuse limits." },
  { heading: "Performance", guidance: "Set measurable latency, bundle, query, and scale expectations." },
  { heading: "Accessibility", guidance: "Require keyboard access, semantics, contrast, and screen-reader behaviour." },
  { heading: "Edge Cases and Error Handling", guidance: "Enumerate empty, invalid, duplicate, concurrent, and failure states." },
  { heading: "Testing Strategy", guidance: "Define unit, integration, and end-to-end coverage plus manual verification." },
  { heading: "Acceptance Criteria", guidance: "Write verifiable conditions for done." },
  { heading: "Documentation", guidance: "State what must be documented for users and maintainers." },
  { heading: "Implementation Phases", guidance: "Break the work into ordered, reviewable phases." },
  { heading: "Deliverables", guidance: "Name code, tests, docs, and any migration artifacts." },
  { heading: "Constraints and Exclusions", guidance: "List technology, time, compatibility, and non-goals." },
];

const aiDataSections: SectionTemplate[] = [
  { heading: "Project Identity", guidance: "Name the AI or data product and the decision it supports." },
  { heading: "Role and Responsibilities", guidance: "Define the analyst or AI engineer's role and boundaries." },
  { heading: "Project Background", guidance: "Summarize the business context and current approach." },
  { heading: "Problem Statement", guidance: "State the decision or question and the cost of getting it wrong." },
  { heading: "Main Objectives", guidance: "List measurable outcomes, including quality and trust." },
  { heading: "Project Scope", guidance: "State what is included, excluded, and explicitly out of scope." },
  { heading: "Users and Decisions", guidance: "Name who uses the output and what decision they make." },
  { heading: "Data Sources", guidance: "List systems, files, ownership, freshness, and access constraints." },
  { heading: "Data Quality and Preparation", guidance: "Define cleaning, missing data, joins, leakage, and validation." },
  { heading: "Method or Model", guidance: "Define the method, baseline, model, retrieval, or prompt strategy." },
  { heading: "AI Integration", guidance: "Describe provider boundaries, context, tools, and fallback behaviour." },
  { heading: "Evaluation Metrics", guidance: "Define quantitative and qualitative measures, including human review." },
  { heading: "Failure Handling", guidance: "Cover low confidence, empty data, provider failure, and escalation." },
  { heading: "Privacy and Security", guidance: "Cover PII, retention, access, injection, and data residency." },
  { heading: "Workflow", guidance: "Describe the end-to-end flow from input to reviewed output." },
  { heading: "Outputs and Reporting", guidance: "Define the deliverable, format, and audience." },
  { heading: "Validation", guidance: "Require sanity checks, backtesting, or evaluation before release." },
  { heading: "Acceptance Criteria", guidance: "Write measurable conditions for done." },
  { heading: "Deliverables", guidance: "Name code, models, reports, dashboards, and documentation." },
  { heading: "Constraints and Limitations", guidance: "List data, cost, latency, policy, and ethical limits." },
];

const businessSections: SectionTemplate[] = [
  { heading: "Project Identity", guidance: "Name the process or business change and its owner." },
  { heading: "Role and Responsibilities", guidance: "Define the analyst's role and decision authority." },
  { heading: "Business Context", guidance: "Summarize the organization, operating environment, and trigger for change." },
  { heading: "Problem Statement", guidance: "State the current pain, its cost, and who feels it." },
  { heading: "Main Objectives", guidance: "List business outcomes in priority order." },
  { heading: "Project Scope", guidance: "State what is included, excluded, and dependent on others." },
  { heading: "Stakeholders", guidance: "Name roles, responsibilities, interests, and decision makers." },
  { heading: "Current Process (As-Is)", guidance: "Describe the current steps, handoffs, systems, and bottlenecks." },
  { heading: "Target Process (To-Be)", guidance: "Describe the intended flow and what changes." },
  { heading: "Business Rules", guidance: "Define thresholds, approvals, exceptions, and ownership." },
  { heading: "Functional Requirements", guidance: "Specify what the process or system must do." },
  { heading: "Non-Functional Requirements", guidance: "Cover service levels, auditability, compliance, and usability." },
  { heading: "User Stories", guidance: "Write actor, action, and business outcome stories." },
  { heading: "Data and Systems", guidance: "List records, systems of record, and reporting needs." },
  { heading: "Risks and Controls", guidance: "Name risks, controls, owners, and escalation paths." },
  { heading: "Success Measures", guidance: "Define measurable before/after indicators." },
  { heading: "Acceptance Criteria", guidance: "Write conditions that stakeholders can verify." },
  { heading: "Deliverables", guidance: "Name process maps, requirements, SOPs, and reports." },
  { heading: "Constraints and Assumptions", guidance: "List policy, budget, staffing, and unresolved decisions." },
];

const contentSections: SectionTemplate[] = [
  { heading: "Project Identity", guidance: "Name the piece, channel, and owner." },
  { heading: "Role and Responsibilities", guidance: "Define the writer's role and editorial boundaries." },
  { heading: "Communication Objective", guidance: "State what the reader should know, feel, or do." },
  { heading: "Background", guidance: "Summarize the context and why this piece exists now." },
  { heading: "Audience", guidance: "Describe the reader's role, knowledge, and motivation." },
  { heading: "Key Message", guidance: "State the one idea the reader must retain." },
  { heading: "Scope", guidance: "State what the piece covers and deliberately excludes." },
  { heading: "Structure", guidance: "Define the opening, sections, sequence, and call to action." },
  { heading: "Required Information and Evidence", guidance: "List facts, examples, quotes, and sources that must appear." },
  { heading: "Tone and Voice", guidance: "Describe formality, vocabulary, rhythm, and phrases to avoid." },
  { heading: "Formatting and Length", guidance: "Define channel format, headings, length range, and links." },
  { heading: "Sources and Factual Constraints", guidance: "Require citations and forbid invented facts or statistics." },
  { heading: "Review Process", guidance: "Define reviewers, approval, and revision expectations." },
  { heading: "Deliverables", guidance: "Name the final file, variants, and metadata." },
  { heading: "Acceptance Criteria", guidance: "Write verifiable conditions for a publishable draft." },
  { heading: "Constraints and Exclusions", guidance: "List legal, brand, accessibility, and deadline constraints." },
];

const familySections: Record<DomainFamily, SectionTemplate[]> = {
  design: designSections,
  software: softwareSections,
  ai_data: aiDataSections,
  business: businessSections,
  content: contentSections,
};

export function getPromptSections(categoryId?: string) {
  const category = categoryId ? getCategory(categoryId) : categories[0]!;
  return familySections[category.family];
}

/* ------------------------------------------------------------------ */
/* Demo discovery question bank                                       */
/* ------------------------------------------------------------------ */

const designQuestions: QuestionSeed[] = [
  {
    id: "design-audience",
    question: "Who will use this, and what are they trying to get done?",
    why: "The audience determines hierarchy, density, language, and which actions deserve emphasis.",
    options: ["Only me", "My team", "Customers or the public", "Multiple organizations", "I am not sure yet"],
    target: "Target Audience",
    detect: "\\b(for|users?|team|customers?|audience|pengguna|untuk|pelanggan)\\b",
    recommendation: "Start with one primary audience and one secondary audience; design the first screen around the primary one.",
  },
  {
    id: "design-platform",
    question: "Where will people use it?",
    why: "A website, a mobile app, and a desktop tool need different navigation and density decisions.",
    options: ["Website", "Mobile application", "Desktop application", "Both website and mobile", "I need a recommendation"],
    target: "Platform Requirements",
    detect: "\\b(website|mobile|android|ios|desktop|tablet|web app|situs|ponsel)\\b",
    recommendation: "Choose a responsive web app first if the audience is unknown; it reaches the widest set of users without two builds.",
  },
  {
    id: "design-core-flow",
    question: "What is the single most important thing someone must be able to do?",
    why: "Naming the primary task gives the design a focal point instead of a collection of screens.",
    options: ["Find information", "Create or edit something", "Review and decide", "Buy or convert", "I am not sure yet"],
    target: "User Workflows",
    detect: "\\b(find|search|create|edit|review|decide|buy|book|track|manage|kelola|lihat|cari)\\b",
    recommendation: "Optimize the first screen for the primary task, and move secondary tools behind progressive disclosure.",
  },
  {
    id: "design-scope",
    question: "Which screens or deliverables do you expect in the first version?",
    why: "Scope decides whether this is a concept, a single flow, or a complete product surface.",
    options: ["One screen", "A short flow (2–4 screens)", "A complete product area", "A design system", "I need a recommendation"],
    target: "Project Scope",
    detect: "\\b(screen|page|flow|dashboard|component|design system|halaman|layar)\\b",
    recommendation: "Start with the primary flow and one supporting screen; expand after the core interaction is validated.",
  },
  {
    id: "design-constraints",
    question: "Are there existing brand, accessibility, or technical constraints we must respect?",
    why: "Constraints prevent a beautiful direction that cannot be built or does not fit the product.",
    options: ["Existing brand guidelines", "WCAG AA accessibility", "Must work on low-end devices", "No constraints yet", "I am not sure"],
    target: "Constraints and Exclusions",
    detect: "\\b(brand|wcag|accessible|accessibility|existing|constraint|merek|aksesibilitas)\\b",
    recommendation: "Adopt WCAG AA, a 4.5:1 text contrast minimum, and a 360px responsive floor as default constraints.",
  },
  {
    id: "design-references",
    question: "What should the result feel like, and is there a reference you like?",
    why: "A concrete reference communicates mood faster than adjectives such as 'modern'.",
    options: ["Calm and minimal", "Editorial and confident", "Technical and precise", "Warm and human", "I have a reference to share"],
    target: "Visual Direction",
    detect: "\\b(minimal|editorial|technical|warm|bold|calm|reference|style|gaya|minimalis)\\b",
    recommendation: "Choose one primary mood and one supporting material cue; avoid stacking more than three style adjectives.",
  },
];

const softwareQuestions: QuestionSeed[] = [
  {
    id: "software-users",
    question: "Who uses the system, and do they need different levels of access?",
    why: "Roles determine authentication, permissions, navigation, and data visibility.",
    options: ["Only me", "One team with equal access", "Admins and regular users", "Multiple organizations", "I am not sure yet"],
    target: "User Roles and Permissions",
    detect: "\\b(admin|role|permission|access|user|customer|team|akses|peran|pengguna)\\b",
    recommendation: "Start with two roles — administrator and member — and add finer permissions only when a workflow requires them.",
  },
  {
    id: "software-core-flow",
    question: "What is the core workflow the first version must support end to end?",
    why: "A complete vertical slice proves the architecture better than a long list of half-built features.",
    options: ["Create and manage records", "Search and report", "Approve a request", "Sync with another system", "I need a recommendation"],
    target: "User Workflows",
    detect: "\\b(create|manage|search|report|approve|sync|track|workflow|kelola|laporan|setujui)\\b",
    recommendation: "Build one complete workflow first: create, view, edit, list, and handle failure for the same record type.",
  },
  {
    id: "software-stack",
    question: "Do you already have a preferred technology stack or an existing codebase?",
    why: "An existing stack is a hard constraint; a new project can choose the simplest maintainable option.",
    options: ["Existing project and stack", "Please recommend a stack", "Next.js and TypeScript", "Another stack I will describe", "I do not know"],
    target: "System Architecture",
    detect: "\\b(next\\.js|react|node|python|django|laravel|postgres|mysql|supabase|firebase|stack|codebase)\\b",
    recommendation: "Use Next.js, TypeScript, and PostgreSQL for a typical full-stack product; they cover server rendering, APIs, and relational data with one deployment path.",
  },
  {
    id: "software-data",
    question: "What information must be stored, and where does it come from?",
    why: "The data model and integrations are usually the largest source of hidden scope.",
    options: ["Users and their records", "Orders or transactions", "Documents and files", "Data from another system", "I am not sure yet"],
    target: "Data Model",
    detect: "\\b(data|database|record|order|invoice|inventory|document|stock|database|data|stok)\\b",
    recommendation: "Model the core entity, its owner, its status, and its timestamps first; add history and attachments only when needed.",
  },
  {
    id: "software-security",
    question: "How sensitive is the data, and what security or compliance rules apply?",
    why: "Security requirements change authentication, logging, retention, and hosting choices.",
    options: ["Public, non-sensitive", "Internal business data", "Personal customer data", "Regulated data", "I am not sure"],
    target: "Security",
    detect: "\\b(security|secure|privacy|personal|pii|compliance|gdpr|auth|keamanan|privasi)\\b",
    recommendation: "Assume internal business data by default: enforce server-side authorization, validate every input, and avoid storing secrets in the client.",
  },
  {
    id: "software-scale",
    question: "How many users or records do you expect in the first year?",
    why: "Scale expectations determine whether to optimize queries, add caching, or keep the architecture simple.",
    options: ["Under 100 users", "A few hundred", "Thousands", "Tens of thousands", "I do not know"],
    target: "Performance",
    detect: "\\b(users?|scale|thousand|million|concurrent|performance|pengguna)\\b",
    recommendation: "Design for a few hundred active users first, keep queries indexed, and measure before adding caching or queues.",
  },
  {
    id: "software-deliverable",
    question: "What should the AI agent deliver: a plan, a prototype, or the working implementation?",
    why: "The expected deliverable changes how much detail and verification the instruction must require.",
    options: ["Architecture and plan", "A working prototype", "The complete implementation", "A review of existing code", "I need a recommendation"],
    target: "Deliverables",
    detect: "\\b(deliver|build|implement|prototype|plan|review|mvp|kerjakan|bangun)\\b",
    recommendation: "Ask for a working vertical slice with tests and a short report; a plan alone cannot prove the system works.",
  },
];

const aiDataQuestions: QuestionSeed[] = [
  {
    id: "ai-decision",
    question: "What decision or output should this AI or analysis support?",
    why: "The decision defines the quality bar, the metrics, and what counts as a useful answer.",
    options: ["Answer questions", "Classify or predict", "Summarize documents", "Recommend an action", "I am not sure yet"],
    target: "Users and Decisions",
    detect: "\\b(answer|classif|predict|summar|recommend|decide|question|jawab|prediksi|ringkas)\\b",
    recommendation: "Start with one well-defined decision and a human review step; expand autonomy only after measured accuracy.",
  },
  {
    id: "ai-data-sources",
    question: "What data or documents should it use, and who owns them?",
    why: "Source quality, access, and freshness determine what the system can honestly claim.",
    options: ["Internal documents", "A database or warehouse", "Public web content", "User-provided input", "I am not sure"],
    target: "Data Sources",
    detect: "\\b(documents?|database|warehouse|csv|pdf|api|source|dataset|dokumen|sumber|data)\\b",
    recommendation: "Begin with a small, owned, versioned dataset; record its source and refresh date in every answer.",
  },
  {
    id: "ai-method",
    question: "Do you have a preferred model or method, or should we recommend one?",
    why: "The method determines cost, latency, privacy, and how the result can be evaluated.",
    options: ["Use a hosted LLM", "Retrieval over my documents", "Train a custom model", "A statistical analysis", "Please recommend"],
    target: "Method or Model",
    detect: "\\b(llm|gpt|gemini|model|rag|retrieval|train|regression|classifier|model|metode)\\b",
    recommendation: "Use retrieval over your own documents with a hosted model first; it is cheaper to validate than training a custom model.",
  },
  {
    id: "ai-evaluation",
    question: "How will you know the output is good enough?",
    why: "Without an evaluation set and metric, quality claims are opinion rather than evidence.",
    options: ["A labelled test set", "Human review of samples", "Task success rate", "I have not decided"],
    target: "Evaluation Metrics",
    detect: "\\b(accuracy|precision|recall|eval|metric|test set|human review|akurasi|evaluasi)\\b",
    recommendation: "Create 30–50 representative examples with expected answers, then track accuracy plus a human review sample.",
  },
  {
    id: "ai-privacy",
    question: "Does the data include personal, confidential, or regulated information?",
    why: "Privacy constraints affect where data can be processed, logged, and retained.",
    options: ["No sensitive data", "Internal business data", "Personal customer data", "Regulated data", "I am not sure"],
    target: "Privacy and Security",
    detect: "\\b(privacy|personal|pii|confidential|regulated|gdpr|sensitive|privasi|rahasia)\\b",
    recommendation: "Minimize collected data, redact identifiers before sending it to a provider, and define a retention period.",
  },
  {
    id: "ai-output",
    question: "What should the final output look like, and who reviews it?",
    why: "Output format and review ownership determine the interface and the acceptance criteria.",
    options: ["A chat answer with citations", "A structured report", "A dashboard", "An automated action", "I am not sure"],
    target: "Outputs and Reporting",
    detect: "\\b(report|dashboard|chat|citation|export|review|output|laporan|dasbor)\\b",
    recommendation: "Return a structured answer with sources and confidence, plus a named human owner for review.",
  },
];

const businessQuestions: QuestionSeed[] = [
  {
    id: "business-stakeholders",
    question: "Who is involved in this process, and who owns the decision?",
    why: "Stakeholders and ownership determine approvals, handoffs, and what the documentation must prove.",
    options: ["One team", "Several departments", "Management and staff", "External partners", "I am not sure"],
    target: "Stakeholders",
    detect: "\\b(team|department|manager|staff|stakeholder|owner|approval|tim|departemen|pemilik)\\b",
    recommendation: "Name one accountable owner per step and keep approvals to the smallest number of roles that still satisfies control requirements.",
  },
  {
    id: "business-current",
    question: "How does the process work today, step by step?",
    why: "The current process reveals the real bottlenecks and the workarounds that a new design must preserve or remove.",
    options: ["Mostly manual", "Email and spreadsheets", "An existing system", "A mix of tools", "I can describe it"],
    target: "Current Process (As-Is)",
    detect: "\\b(current|today|manual|email|spreadsheet|existing|process|sekarang|manual|proses)\\b",
    recommendation: "Map the current steps with the system and owner for each handoff before proposing changes.",
  },
  {
    id: "business-bottleneck",
    question: "Where does the process break down or waste the most time?",
    why: "A target process should fix a named bottleneck, not redesign everything at once.",
    options: ["Waiting for approvals", "Missing or duplicated data", "Manual re-entry", "Unclear ownership", "I am not sure"],
    target: "Problem Statement",
    detect: "\\b(slow|delay|bottleneck|duplicate|rework|waiting|error|lambat|antre|masalah)\\b",
    recommendation: "Measure the two slowest handoffs first; fixing approval wait time usually beats adding another dashboard.",
  },
  {
    id: "business-rules",
    question: "What rules, thresholds, or exceptions must the process enforce?",
    why: "Business rules are the difference between a diagram and an operable process.",
    options: ["Approval above a value", "Role-based authority", "Compliance checks", "No formal rules yet", "I can describe them"],
    target: "Business Rules",
    detect: "\\b(rule|threshold|limit|approval|exception|policy|aturan|batas|kebijakan)\\b",
    recommendation: "Write rules as testable statements with a threshold, an owner, and an exception path.",
  },
  {
    id: "business-success",
    question: "How will you measure whether the new process is better?",
    why: "A measurable baseline protects the project from becoming a documentation exercise.",
    options: ["Cycle time", "Error or rework rate", "Cost per request", "Satisfaction", "I am not sure"],
    target: "Success Measures",
    detect: "\\b(measure|metric|time|cost|error|satisfaction|kpi|ukur|waktu|biaya)\\b",
    recommendation: "Baseline cycle time and rework rate before the change, then compare the same measures after one month.",
  },
  {
    id: "business-deliverable",
    question: "What should the final deliverable be?",
    why: "A process map, a requirements document, and an SOP serve different audiences.",
    options: ["Process map", "Business requirements", "SOP and training", "A software specification", "I need a recommendation"],
    target: "Deliverables",
    detect: "\\b(document|sop|requirements|map|specification|training|dokumen|prosedur)\\b",
    recommendation: "Produce a one-page process map plus a requirements table; add the SOP only after the process is agreed.",
  },
];

const contentQuestions: QuestionSeed[] = [
  {
    id: "content-audience",
    question: "Who is the reader, and what do they already know?",
    why: "The reader's knowledge determines vocabulary, depth, and what counts as a useful explanation.",
    options: ["General public", "Customers", "Technical practitioners", "Internal team", "I am not sure"],
    target: "Audience",
    detect: "\\b(audience|reader|customer|developer|team|public|pembaca|pelanggan|pengguna)\\b",
    recommendation: "Write for one primary reader with basic domain knowledge; explain jargon on first use instead of writing two versions.",
  },
  {
    id: "content-objective",
    question: "What should the reader know, feel, or do after reading?",
    why: "A communication objective turns a topic into a piece with a measurable effect.",
    options: ["Understand a concept", "Take a specific action", "Trust a claim", "Learn a procedure", "I am not sure"],
    target: "Communication Objective",
    detect: "\\b(understand|learn|action|buy|sign up|trust|goal|tujuan|pahami|pelajari)\\b",
    recommendation: "Choose one primary action and one supporting belief; remove sections that do not serve either.",
  },
  {
    id: "content-evidence",
    question: "What facts, examples, or sources must the piece include?",
    why: "Evidence requirements prevent the model from inventing statistics or quotes.",
    options: ["Internal data I will provide", "Public sources to cite", "Product documentation", "No factual claims", "I am not sure"],
    target: "Required Information and Evidence",
    detect: "\\b(data|source|citation|example|quote|evidence|sumber|kutipan|contoh)\\b",
    recommendation: "Provide the source list and mark every statistical claim as requiring a citation.",
  },
  {
    id: "content-format",
    question: "What format and length do you need?",
    why: "Channel and length determine structure, heading density, and how much evidence fits.",
    options: ["Short article (600–900 words)", "Long guide (1,500+ words)", "Landing page copy", "Script or presentation", "I need a recommendation"],
    target: "Formatting and Length",
    detect: "\\b(words?|article|guide|landing|script|presentation|format|kata|artikel|panduan)\\b",
    recommendation: "Use a 700–900 word article with a short introduction, three evidence-led sections, and one call to action.",
  },
  {
    id: "content-voice",
    question: "What tone should the writing use?",
    why: "Voice is part of the product experience; a mismatched tone can undermine accurate content.",
    options: ["Clear and neutral", "Warm and conversational", "Authoritative and formal", "Playful", "I have a brand voice guide"],
    target: "Tone and Voice",
    detect: "\\b(tone|voice|formal|casual|playful|brand|nada|gaya bahasa)\\b",
    recommendation: "Use clear, neutral prose with short sentences; add warmth through examples rather than exclamation marks.",
  },
  {
    id: "content-sources",
    question: "Are there claims or topics the piece must avoid?",
    why: "Explicit exclusions keep the output legally and factually safe.",
    options: ["No unverified statistics", "Avoid competitor comparisons", "No pricing claims", "No exclusions", "I can list them"],
    target: "Sources and Factual Constraints",
    detect: "\\b(avoid|do not|no claims|competitor|legal|compliance|hindari|jangan)\\b",
    recommendation: "Forbid invented statistics, quotes, and competitor claims; require a source or an explicit unknown.",
  },
];

const familyQuestions: Record<DomainFamily, QuestionSeed[]> = {
  design: designQuestions,
  software: softwareQuestions,
  ai_data: aiDataQuestions,
  business: businessQuestions,
  content: contentQuestions,
};

export function getQuestionSeeds(categoryId?: string) {
  const category = categoryId ? getCategory(categoryId) : categories[0]!;
  return familyQuestions[category.family];
}

/* ------------------------------------------------------------------ */
/* Domain-aware missing-information and analysis signals              */
/* ------------------------------------------------------------------ */

const designMissing = [
  { pattern: "\\b(audience|users?|customers?|team|persona|operations leads)\\b", label: "Target audience" },
  { pattern: "\\b(objective|goal|purpose|so that|in order to|because|used for|helps?|review)\\b", label: "Project purpose and context" },
  { pattern: "\\b(colou?rs?|palette|tone|hue|charcoal|orange|amber|yellow|pink|red|green|blue|purple|teal|neutrals?|monochrome|dark|light|white|black|bright|warm|cool|accent)\\b", label: "Colour direction" },
  { pattern: "\\b(typeface|font|typograph|grotesk|monospace|serif|sans[- ]serif|type scale)\\b", label: "Typography requirements" },
  { pattern: "\\b(grid|layout|composition|spacing|hierarchy|alignment|focal|reading order|whitespace)\\b", label: "Layout and hierarchy expectations" },
  { pattern: "\\b(responsive|mobile|tablet|breakpoint|360px)\\b", label: "Responsive behaviour" },
  { pattern: "\\b(accessible|accessibility|contrast|wcag|focus ring|keyboard)\\b", label: "Accessibility requirements" },
  { pattern: "\\b(return|output|format|deliverable|deliver|section by section|rationale)\\b", label: "Expected output format" },
  { pattern: "\\b(must|avoid|do not|don't|never|limit|only)\\b", label: "Explicit constraints" },
];

const softwareMissing = [
  { pattern: "\\b(users?|roles?|admin|permissions?|customers?|team)\\b", label: "Users and access roles" },
  { pattern: "\\b(flow|workflow|create|edit|list|search|approve|manage)\\b", label: "Core workflow" },
  { pattern: "\\b(stack|framework|react|next\\.js|node|python|php|laravel|django)\\b", label: "Technology stack" },
  { pattern: "\\b(data|database|schema|table|record|model|postgres|mysql)\\b", label: "Data model" },
  { pattern: "\\b(api|endpoint|contract|request|response|integration)\\b", label: "API or integration contract" },
  { pattern: "\\b(auth|authentication|authorization|login|session|permission)\\b", label: "Authentication and authorization" },
  { pattern: "\\b(error|validation|retry|fallback|edge case|failure)\\b", label: "Error handling and edge cases" },
  { pattern: "\\b(test|coverage|verification|acceptance|build|lint)\\b", label: "Testing and acceptance criteria" },
  { pattern: "\\b(return|output|deliverable|format|report)\\b", label: "Expected deliverable" },
];

const aiDataMissing = [
  { pattern: "\\b(decision|question|outcome|predict|classif|answer|recommend)\\b", label: "Decision or output" },
  { pattern: "\\b(data|documents?|source|dataset|warehouse|api|pdf)\\b", label: "Data sources" },
  { pattern: "\\b(model|method|llm|rag|retrieval|regression|classifier)\\b", label: "Method or model" },
  { pattern: "\\b(metric|accuracy|precision|recall|evaluation|test set|human review|measure)\\b", label: "Evaluation metrics" },
  { pattern: "\\b(privacy|pii|confidential|security|retention|access)\\b", label: "Privacy and access rules" },
  { pattern: "\\b(failure|fallback|confidence|escalation|error|refusal)\\b", label: "Failure handling" },
  { pattern: "\\b(report|dashboard|output|format|citation)\\b", label: "Expected output format" },
];

const businessMissing = [
  { pattern: "\\b(stakeholder|owner|role|department|manager|team)\\b", label: "Stakeholders and ownership" },
  { pattern: "\\b(current|today|manual|existing|process|workflow)\\b", label: "Current process" },
  { pattern: "\\b(problem|bottleneck|delay|error|rework|cost)\\b", label: "Problem and bottleneck" },
  { pattern: "\\b(rule|threshold|approval|exception|policy)\\b", label: "Business rules" },
  { pattern: "\\b(measure|metric|kpi|cycle time|cost|quality)\\b", label: "Success measures" },
  { pattern: "\\b(document|sop|requirements|process map|specification)\\b", label: "Expected deliverable" },
  { pattern: "\\b(risk|control|compliance|audit)\\b", label: "Risks and controls" },
];

const contentMissing = [
  { pattern: "\\b(audience|reader|customer|developer|team|public)\\b", label: "Target audience" },
  { pattern: "\\b(objective|goal|action|understand|learn|trust|do after)\\b", label: "Communication objective" },
  { pattern: "\\b(source|citation|evidence|data|example|quote)\\b", label: "Evidence and sources" },
  { pattern: "\\b(format|length|words|article|guide|script|channel)\\b", label: "Format and length" },
  { pattern: "\\b(tone|voice|formal|casual|playful|neutral)\\b", label: "Tone and voice" },
  { pattern: "\\b(avoid|do not|constraint|legal|brand|deadline)\\b", label: "Explicit constraints" },
  { pattern: "\\b(deliverable|draft|publish|review|approval)\\b", label: "Deliverable and review" },
];

const familyMissing: Record<DomainFamily, Array<{ pattern: string; label: string }>> = {
  design: designMissing,
  software: softwareMissing,
  ai_data: aiDataMissing,
  business: businessMissing,
  content: contentMissing,
};

export function getMissingChecks(categoryId?: string) {
  const category = categoryId ? getCategory(categoryId) : categories[0]!;
  return familyMissing[category.family];
}

export function getComplexityRecommendation(complexity: Complexity): PromptDepth {
  if (complexity === "complex") return "comprehensive";
  if (complexity === "moderate") return "detailed";
  return "balanced";
}

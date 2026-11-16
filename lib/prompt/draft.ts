import { categories, getCategory } from "@/config/app";
import {
  getAgentProfile,
  getComplexityRecommendation,
  getPromptDepth,
  getPromptSections,
} from "@/config/domains";
import type {
  GeneratedPrompt,
  GeneratedPromptSection,
  PromptConfiguration,
  SliderKey,
} from "@/types/prompt";
import type { BriefSection, ProjectBrief, PromptDepth, TargetAgentId } from "@/types/guided";
import type { AgentProfile, DomainFamily, SectionTemplate } from "@/config/domains";

const sliderInstructions: Record<SliderKey, { high: string; low: string }> = {
  creativity: {
    high: "Explore a non-obvious visual concept; avoid category defaults.",
    low: "Stay within proven patterns; prioritize clarity over novelty.",
  },
  precision: {
    high: "Follow every explicit requirement exactly and do not add unrequested elements.",
    low: "Interpret the brief loosely where a stronger design decision is possible.",
  },
  visualHierarchy: {
    high: "State the primary focal point, the reading order, and the relative weight of secondary content.",
    low: "Keep hierarchy suggestions light; allow the composition to establish emphasis.",
  },
  composition: {
    high: "Specify grid, alignment, spacing rhythm, and how the layout reflows across breakpoints.",
    low: "Leave layout arrangement open while keeping alignment coherent.",
  },
  typography: {
    high: "Define type roles, scale steps, weights, line length, and fallback behavior.",
    low: "Draw attention to legibility without prescribing a full type system.",
  },
  detail: {
    high: "Describe component states, content density, edge cases, and interaction detail.",
    low: "Keep component detail concise and focus on the overall direction.",
  },
  consistency: {
    high: "Require reusable tokens and one consistent component language.",
    low: "Allow local variation where it serves the composition.",
  },
  exploration: {
    high: "Include one alternative direction alongside the primary concept, with a clear trade-off.",
    low: "Commit to a single primary direction.",
  },
};

const familyAgent: Record<DomainFamily, TargetAgentId> = {
  design: "design",
  software: "coding",
  ai_data: "research",
  business: "automation",
  content: "writing",
};

type ComposeContext = {
  config: PromptConfiguration;
  brief?: ProjectBrief;
  category: ReturnType<typeof getCategory>;
  depth: PromptDepth;
  agent: AgentProfile;
  objective: string;
  audience: string;
  context: string;
  features: string[];
  constraints: string[];
  outputs: string[];
  preferences: string[];
  unknowns: string[];
};

function titleFromObjective(objective: string, category: string) {
  const clean = objective.replace(/\s+/g, " ").trim();
  if (!clean) return `Untitled ${getCategory(category).label} prompt`;
  const words = clean.split(" ").slice(0, 8).join(" ");
  const title = words.length < clean.length ? `${words}…` : words;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function listOrFallback(items: string[], fallback: string) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
}

function depthIndex(depth: PromptDepth) {
  return ["concise", "balanced", "detailed", "comprehensive"].indexOf(depth);
}

function atLeast(depth: PromptDepth, minimum: PromptDepth) {
  return depthIndex(depth) >= depthIndex(minimum);
}

function briefSection(brief: ProjectBrief | undefined, ...keys: string[]): BriefSection | null {
  if (!brief) return null;
  return (
    brief.sections.find((section) => {
      const heading = section.heading.toLowerCase();
      return keys.some((key) => heading.includes(key.toLowerCase())) && section.content.trim().length > 0;
    }) ?? null
  );
}

function briefText(context: ComposeContext, ...keys: string[]) {
  const section = briefSection(context.brief, ...keys);
  if (!section) return null;
  return section.source === "user"
    ? section.content.trim()
    : `${section.content.trim()}\n\n(Provisional: this was recommended by PromptScope. Confirm it before relying on it.)`;
}

function requirements(context: ComposeContext) {
  if (context.features.length > 0) return listOrFallback(context.features, "Confirm the core requirements.");
  return "- Confirm the concrete requirements with the user before producing final work. Do not invent features.";
}

function assumptionsBlock(context: ComposeContext) {
  const items = [...(context.brief?.assumptions ?? [])];
  if (!context.audience) items.push("The primary audience was not specified; confirm it before production.");
  if (!context.context) {
    items.push("Project context was not supplied; the prompt asks for confirmation where it would change the direction.");
  }
  return items;
}

function unknownsBlock(context: ComposeContext) {
  const items = [...context.unknowns];
  if (context.brief) items.push(...context.brief.unknowns);
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

/**
 * Rank the domain outline so a concise prompt keeps the sections that actually
 * change the work, instead of blindly taking the first six headings.
 */
function sectionRank(heading: string) {
  const value = heading.toLowerCase();
  if (/project identity|role and responsibilities/.test(value)) return 0;
  if (/objective|communication objective/.test(value)) return 1;
  if (/problem statement|background/.test(value)) return 2;
  if (/scope/.test(value)) return 3;
  if (/audience|users and decisions|target users|stakeholders|reader/.test(value)) return 4;
  if (/requirement/.test(value)) return 5;
  if (/workflow|user story|current process|target process/.test(value)) return 6;
  if (/architecture|data model|data sources|api contract|method or model|business rules|structure/.test(value)) {
    return 7;
  }
  if (/design|visual direction|tone and voice|key message|navigation/.test(value)) return 8;
  if (/constraint|risk|privacy|security|authentication/.test(value)) return 9;
  if (/edge|error|failure|monitor/.test(value)) return 10;
  if (/test|validation|acceptance|success|evaluation/.test(value)) return 11;
  if (/deliverable|output|report|formatting|documentation/.test(value)) return 12;
  if (/phase|implementation plan|review/.test(value)) return 13;
  return 14;
}

function selectSections(templates: SectionTemplate[], depth: PromptDepth) {
  const limit = getPromptDepth(depth).sectionLimit;
  if (templates.length <= limit) return templates;
  const ranked = [...templates]
    .map((section, index) => ({ section, index, rank: sectionRank(section.heading) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit);
  return ranked.sort((a, b) => a.index - b.index).map((item) => item.section);
}

function normalizedAgentSections(context: ComposeContext): Array<{ heading: string; guidance: string }> {
  if (context.depth !== "concise") return context.agent.sections;

  const merged = context.agent.operatingRules.map((rule) => `- ${rule}`).join("\n");
  return [
    {
      heading: context.agent.id === "coding" ? "How to Work" : "Working Agreement",
      guidance: merged,
    },
  ];
}

function sectionContent(heading: string, context: ComposeContext): string {
  const h = heading.toLowerCase();
  const { depth, agent } = context;
  const detailed = atLeast(depth, "detailed");
  const comprehensive = atLeast(depth, "comprehensive");
  const briefValue = (...keys: string[]) => briefText(context, ...keys);

  if (/project identity/.test(h)) {
    return [
      `${context.objective}`,
      ``,
      `Deliverable owner: ${agent.label}.`,
      `Working depth: ${getPromptDepth(depth).label}.`,
      context.brief?.summary ? `\n${context.brief.summary}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (/role and responsibilities/.test(h)) {
    return [
      `Act as ${agent.label}. ${agent.description}`,
      ``,
      `Responsibilities:`,
      agent.operatingRules.map((rule) => `- ${rule}`).join("\n"),
      comprehensive
        ? `\nBoundaries:\n- Do not expand scope beyond the confirmed requirements.\n- Do not invent facts, data, or brand decisions to fill a gap.\n- Surface a blocking question instead of guessing.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (/problem statement|business context|project background/.test(h)) {
    const problem = briefValue("problem", "overview", "summary");
    return (
      problem ||
      `${context.context || "No project context was supplied."}\n\nConfirm the concrete problem being solved and who experiences it before producing the deliverable.`
    );
  }

  if (/main objectives|communication objective/.test(h)) {
    return [
      `The primary objective is: ${context.objective}`,
      context.brief?.summary ? `\nContext: ${context.brief.summary}` : "",
      detailed ? `\nSuccess means the deliverable can be used without the receiving team re-deriving the requirements.` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (/project scope|^scope$/.test(h)) {
    const scope = briefValue("scope", "overview");
    return [
      scope ||
        `- Included: the work needed to achieve the objective above.\n- Excluded: unrelated features, rewrites, and changes that were not requested.`,
      `- Preserve every confirmed requirement and existing behaviour that is not explicitly in scope for change.`,
    ].join("\n");
  }

  if (/target audience|audience$|target users|users and decisions/.test(h)) {
    return context.audience
      ? [
          `Primary audience: ${context.audience}`,
          detailed
            ? `Secondary audience: identify one secondary group only if their needs change the work; otherwise keep the primary audience as the decision driver.`
            : "",
          `Every requirement must be justified by what this audience needs to accomplish.`,
        ]
          .filter(Boolean)
          .join("\n")
      : `No primary audience was specified.\n\nConfirm who uses this, their context, and the decision or task they need to complete before finalising the work.`;
  }

  if (/user roles|roles and permissions|stakeholders/.test(h)) {
    return (
      briefValue("users", "roles", "stakeholders", "audience") ||
      `- Identify each role and what it can view, create, edit, approve, or delete.\n- Enforce permissions on the server, not only in the interface.\n- Confirm the role model before implementation.`
    );
  }

  if (/user stories/.test(h)) {
    const features = context.features.length
      ? context.features
      : ["Complete the primary workflow from start to finish"];
    return features
      .slice(0, 6)
      .map((feature, index) => `${index + 1}. As a user, I want ${feature.toLowerCase()}, so that I can complete the stated objective.`)
      .join("\n");
  }

  if (/functional requirements/.test(h)) {
    return `${requirements(context)}\n\nFor each requirement: define the input, the expected result, the empty state, and the failure state.${
      detailed ? "\nReject ambiguous requirements and ask for a concrete rule rather than inventing one." : ""
    }`;
  }

  if (/non-functional requirements/.test(h)) {
    return [
      `- Accessibility: keyboard access, visible focus, semantic structure, and readable contrast.`,
      `- Reliability: define behaviour for empty, loading, partial, and failed data.`,
      `- Maintainability: follow the existing project conventions and avoid unnecessary rewrites.`,
      comprehensive
        ? `- Performance: state measurable limits (for example first meaningful paint, API latency, query count) instead of "fast".\n- Security: validate input at trust boundaries and keep secrets server-side.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (/user workflows|workflow|current process|target process/.test(h)) {
    return (
      `${briefValue("workflow", "process", "flow") ?? "Describe the primary workflow end to end."}

Steps to specify:
1. Entry point and trigger.
2. Each action, its owner, and the system that records it.
3. Success state and visible confirmation.
4. Failure state, recovery, and escalation.
5. What must never happen.${detailed ? "\nAlso cover concurrent edits, duplicate submissions, and abandoned sessions." : ""}`
    );
  }

  if (/system architecture|architecture|design process|method$/.test(h)) {
    return (
      briefValue("technical", "architecture", "method") ||
      `- Identify the parts that must exist and how they communicate.\n- Prefer the smallest architecture that satisfies the confirmed requirements.\n- Respect the existing stack and conventions; do not introduce a new framework without a stated reason.\n- Record trade-offs and assumptions explicitly.${detailed ? "\n- Name the boundaries: data ownership, request flow, failure boundaries, and deployment surface." : ""}`
    );
  }

  if (/frontend requirements/.test(h)) {
    return `- Routes and screens: list each route and its purpose.\n- Component boundaries: separate layout, data, and display concerns.\n- State: identify what is local, server-owned, or URL-driven.\n- Forms: validation, disabled states, inline errors, and submission feedback.\n- Loading, empty, error, and success states for every data view.\n- Responsive behaviour and keyboard access are requirements, not polish.`;
  }

  if (/backend requirements/.test(h)) {
    return `- Services and business logic: name each operation and its validation rules.\n- Authorization: check it on the server for every sensitive operation.\n- Transactions: define what must succeed or fail atomically.\n- Jobs and integrations: retries, idempotency, and dead-letter handling.\n- Logging: record enough to diagnose failure without storing secrets or personal data.`;
  }

  if (/data model|data and systems|data sources|data quality|data preparation/.test(h)) {
    return (
      briefValue("data", "information") ||
      `- List the core entities, their fields, and their relationships.\n- Define required, optional, and unique fields.\n- Define ownership, timestamps, and status transitions.\n- Define retention and deletion rules.\n- Confirm the data model before implementation; do not invent fields the user has not described.`
    );
  }

  if (/api contract|api specifications|api$/.test(h)) {
    return `- For each endpoint: method, path, purpose, authentication, and permissions.\n- Request and response shapes, including validation errors.\n- Status codes and a consistent error format.\n- Pagination, filtering, and sorting where lists can grow.\n- Idempotency for retried writes and webhook delivery.\n- Version or compatibility strategy for consumers.`;
  }

  if (/validation and business rules|business rules/.test(h)) {
    return `- Write each rule as a testable statement: condition, result, and owner.\n- Define thresholds, exceptions, and approval authority.\n- Validate input at the boundary and re-check authorization server-side.\n- Reject invalid states with a message that tells the user what to correct.\n- Record any rule that is still unconfirmed as a question, not an assumption.`;
  }

  if (/authentication|authorization/.test(h)) {
    return `- Define sign-in, session lifetime, and sign-out behaviour.\n- Define roles and the exact permissions for each role.\n- Protect server routes and data access, not only navigation.\n- Handle expired sessions, revoked access, and failed sign-in without leaking whether an account exists.\n- Never place secrets or privileged tokens in client code.`;
  }

  if (/security|privacy|risks and controls/.test(h)) {
    return `- Validate every external input and encode output where it is rendered.\n- Keep credentials and provider keys server-side only.\n- Apply least privilege to data access and administrative actions.\n- Avoid logging personal or secret data.\n- Define abuse limits such as rate limits and file-size caps where relevant.\n- List known risks with an owner and a mitigation.${
      detailed ? "\n- State what would require a security review before release." : ""
    }`;
  }

  if (/performance/.test(h)) {
    return `- Define measurable targets for the paths that matter.\n- Avoid unnecessary client bundles, queries, and re-renders.\n- Index the fields used for filtering and sorting.\n- Measure before adding caching or background jobs.\n- Report any target that could not be verified.`;
  }

  if (/accessibility/.test(h)) {
    return `- Every interactive control must be reachable and operable by keyboard.\n- Provide visible focus states and meaningful labels.\n- Use semantic landmarks and headings in a logical order.\n- Maintain readable contrast and do not rely on colour alone.\n- Respect reduced-motion preferences.\n- Verify the primary flow without a mouse.`;
  }

  if (/interaction and states|interaction states|ui\/ux requirements/.test(h)) {
    return `- Default, hover, focus, active, disabled, loading, empty, error, and success states.\n- Feedback for every action that takes longer than a moment.\n- Clear hierarchy for primary, secondary, and destructive actions.\n- Confirmation for irreversible actions.\n- Copy that tells the user what happened and what to do next.`;
  }

  if (/visual direction|tone and voice|audience & voice|operating context|stakeholders & process|method or model|agent role/.test(h)) {
    const stated = briefValue("design", "visual", "tone", "style", "voice", "preferences");
    const preferences = context.preferences.length
      ? `Direction selected by the user: ${context.preferences.join(", ")}.\nInterpret these choices consistently and do not add unrelated style adjectives.`
      : "";
    if (stated || preferences) {
      return [preferences, stated].filter(Boolean).join("\n\n");
    }
    return `- Derive one coherent direction from the objective and audience.\n- Name the mood, material stance, and colour behaviour.\n- Avoid stacking contradictory style adjectives.\n- When a reference is unavailable, state the intended feeling and the decisions it implies.`;
  }

  if (/composition|hierarchy|structure|information architecture|navigation/.test(h)) {
    return `- State the primary focal point and the intended reading order.\n- Use a consistent alignment and spacing system.\n- Group related content and separate unrelated content.\n- Keep the primary action visually unambiguous.\n- Describe how the layout adapts at smaller widths rather than shrinking everything.`;
  }

  if (/typography|formatting and length|format and craft|evidence standard|reporting & rigour/.test(h)) {
    return `- Define distinct roles for primary, supporting, and metadata text.\n- Use an intentional scale, weight range, and comfortable line length.\n- Keep contrast and legibility above decoration.\n- Define the expected length or format where the channel requires it.`;
  }

  if (/responsive/.test(h)) {
    return `- Define breakpoints from the content, not from a device list.\n- Preserve the primary action and reading order at every width.\n- Avoid horizontal scrolling and clipped content.\n- Test at a narrow mobile width, a tablet width, and a wide desktop width.`;
  }

  if (/edge cases|error handling|failure handling/.test(h)) {
    return `Enumerate and handle:
- Empty and first-run states.
- Invalid, missing, duplicate, and oversized input.
- Concurrent edits and stale data.
- Network failure, timeout, and provider failure.
- Partial success where only some records or steps complete.
- Permission denied and expired session.
- Recovery: what the user sees and what they can retry.${comprehensive ? "\nFor each case, define the expected message and whether the operation is retried, rolled back, or escalated." : ""}`;
  }

  if (/testing strategy|validation$|evaluation metrics|validation and acceptance/.test(h)) {
    return `- Unit tests for validation, permissions, and business rules.\n- Integration tests for the primary workflow and its failure branches.\n- End-to-end or manual verification of the real user flow.\n- Type checking, linting, and a production build where the stack supports them.\n- An evaluation set or acceptance sample for AI and data work.\n- Report exact commands and results, including anything that failed.`;
  }

  if (/acceptance criteria|success measures/.test(h)) {
    return `The work is complete when:
1. Every confirmed requirement has a verifiable result.
2. The primary workflow succeeds end to end.
3. Empty, loading, error, and permission states behave as specified.
4. Accessibility and responsive requirements are checked.
5. Automated checks pass, and manual verification is recorded.
6. Remaining assumptions and unknowns are reported instead of hidden.`;
  }

  if (/documentation|review process/.test(h)) {
    return `- Document how to run, verify, and use the result.\n- Record decisions, assumptions, and remaining limitations.\n- Update existing documentation instead of creating a contradictory parallel version.\n- Name the reviewer or approval step before publication or release.`;
  }

  if (/implementation phases|implementation plan/.test(h)) {
    return `1. Inspect and understand the existing material; list constraints and risks.\n2. Produce a short plan mapping requirements to concrete changes or sections.\n3. Implement in reviewable phases, preserving existing behaviour.\n4. Verify each phase before moving on.\n5. Report what is complete, what is untested, and what remains unknown.`;
  }

  if (/deliverables|outputs and reporting|formatting/.test(h)) {
    return listOrFallback(
      context.outputs,
      "Confirm the deliverable format and fidelity before producing the final output.",
    );
  }

  if (/sources and factual constraints|required information|sources & evidence|evidence/.test(h)) {
    return `- Use only supplied or verifiable sources.\n- Cite the source for every factual claim.\n- State explicitly when evidence is unavailable.\n- Never invent statistics, quotes, users, or competitor claims.\n- Separate fact, inference, and recommendation.`;
  }

  if (/editorial brief|key message/.test(h)) {
    return (
      briefValue("objective", "message", "audience", "tone") ||
      `- State the one idea the reader must retain.\n- Name the action the reader should take.\n- Define the voice and the phrases to avoid.\n- List the evidence that must appear.`
    );
  }

  if (/constraints|exclusions|limitations|assumptions/.test(h)) {
    return `${listOrFallback(context.constraints, "No additional constraints were supplied. Confirm any hard limits before proceeding.")}

Do not add requirements, data, or dependencies that the user did not supply or explicitly accept.`;
  }

  if (/repository inspection/.test(h)) {
    return `Before changing code:
- Read the project structure, configuration, and existing documentation.
- Identify the conventions, components, and utilities to reuse.
- Trace the affected flow and its tests.
- List risks, unknowns, and files that must not be disturbed.
- Do not rewrite working code merely to match personal preference.`;
  }

  if (/implementation rules|implementation plan/.test(h)) {
    return `- Map each requirement to files and modules before editing.
- Keep changes small and reviewable.
- Preserve existing public behaviour unless the requirement explicitly changes it.
- Handle loading, empty, error, permission, and edge states.
- Follow the project's existing naming, styling, and data patterns.
- Do not add dependencies without stating why.`;
  }

  if (/verification/.test(h)) {
    return `Run the checks the project actually provides, for example:
- Type checking.
- Linting.
- Unit and integration tests.
- Production build.
- Manual verification of the real workflow in a browser or runtime.
Report exact commands and outcomes. Do not claim a check passed unless it was run.`;
  }

  if (/final report/.test(h)) {
    return `Finish with a concise report:
- What was implemented, and where.
- Files or modules changed.
- Commands run and their results.
- What could not be completed or verified.
- Known limitations and assumptions still in force.
- Do not commit, push, deploy, or run destructive operations unless the user explicitly asks.`;
  }

  if (/response expectations|working agreement|custom agent rules|design rationale|monitoring/.test(h)) {
    return context.agent.operatingRules.map((rule) => `- ${rule}`).join("\n");
  }

  if (/required information|project scope/.test(h)) {
    return briefValue("scope", "information") || `- Confirm the information required before starting.\n- Do not invent missing details.`;
  }

  return (
    briefValue(h.split(" ").slice(0, 2).join(" ")) ||
    `Address this section concretely. If the information is not available, write an explicit question instead of inventing an answer.`
  );
}

function composePrompt(context: ComposeContext) {
  const templates = selectSections(getPromptSections(context.category.id), context.depth);
  const agentSections = normalizedAgentSections(context);
  const sections: GeneratedPromptSection[] = [];
  const blocks: string[] = [`# ${titleFromObjective(context.objective, context.category.id)}`, ""];

  for (const template of templates) {
    const content = sectionContent(template.heading, context);
    blocks.push(`## ${template.heading}`, content, "");
    sections.push({ heading: template.heading, content: summarize(content) });
  }

  for (const template of agentSections) {
    const content = sectionContent(template.heading, context);
    blocks.push(`## ${template.heading}`, content, "");
    sections.push({ heading: template.heading, content: summarize(content) });
  }

  const assumptions = assumptionsBlock(context);
  const unknowns = unknownsBlock(context);

  const activeSliders = (Object.entries(context.config.sliders) as Array<[SliderKey, number]>)
    .filter(([, value]) => value >= 70 || value <= 35)
    .map(([key, value]) => {
      const rule = sliderInstructions[key];
      return `- ${value >= 70 ? rule.high : rule.low}`;
    });

  if (activeSliders.length > 0) {
    const content = [
      ...activeSliders,
      "- These are user preferences, not permission to invent missing project facts.",
    ].join("\n");
    blocks.push(`## Focus Parameters`, content, "");
    sections.push({ heading: "Focus Parameters", content: summarize(content) });
  }

  if (assumptions.length > 0) {
    const content = assumptions.map((item) => `- ${item}`).join("\n");
    blocks.push(`## Assumptions to Confirm`, content, "");
    sections.push({ heading: "Assumptions to Confirm", content: summarize(content) });
  }

  if (unknowns.length > 0 && atLeast(context.depth, "detailed")) {
    const content = unknowns.map((item) => `- ${item}`).join("\n");
    blocks.push(`## Open Questions`, content, "");
    sections.push({ heading: "Open Questions", content: summarize(content) });
  }

  if (atLeast(context.depth, "detailed")) {
    const content = `Before starting, inspect the supplied material and confirm any blocking gap. Do not invent requirements, data, credentials, or user needs. If a missing fact would materially change the result, ask one focused question and continue with the confirmed parts.`;
    blocks.push(`## Uncertainty Policy`, content, "");
    sections.push({ heading: "Uncertainty Policy", content: summarize(content) });
  }

  return { prompt: blocks.join("\n").trim(), sections };
}

function summarize(content: string) {
  const clean = content.replace(/\s+/g, " ").trim();
  return clean.length > 240 ? `${clean.slice(0, 237)}…` : clean;
}

export function buildDraftPrompt(config: PromptConfiguration): GeneratedPrompt {
  const category = getCategory(config.category);
  const brief = config.brief;
  const objective = (brief?.objective || config.objective).trim();
  const audience = (config.audience || briefSection(brief, "audience")?.content || "").trim();
  const context = (config.context || briefSection(brief, "background", "context", "overview")?.content || "").trim();
  const targetAgent = config.targetAgent ?? familyAgent[category.family];
  const agent = getAgentProfile(targetAgent);
  const depth =
    config.depth ??
    (targetAgent === "coding" || targetAgent === "automation"
      ? "detailed"
      : getComplexityRecommendation(brief?.complexity ?? "moderate"));

  const features = brief
    ? brief.sections
        .filter((section) => /function|feature|requirement/i.test(section.heading) && section.content.trim())
        .flatMap((section) => section.content.split(/\n|;|•/))
        .map((item) => item.replace(/^[-*\d.\s]+/, "").trim())
        .filter((item) => item.length > 3)
        .slice(0, 10)
    : [];

  const constraints = Array.from(
    new Set([
      ...config.constraints,
      ...(brief?.sections
        .filter((section) => /constraint|limit|security|privacy/i.test(section.heading))
        .flatMap((section) => section.content.split(/\n/))
        .map((item) => item.replace(/^[-*\s]+/, "").trim())
        .filter((item) => item.length > 3) ?? []),
    ]),
  ).slice(0, 14);

  const outputs = Array.from(
    new Set([
      ...config.outputRequirements,
      ...(brief?.sections
        .filter((section) => /deliverable|output/i.test(section.heading))
        .flatMap((section) => section.content.split(/\n/))
        .map((item) => item.replace(/^[-*\s]+/, "").trim())
        .filter((item) => item.length > 3) ?? []),
    ]),
  ).slice(0, 8);

  const contextBlock: ComposeContext = {
    config,
    brief,
    category,
    depth,
    agent,
    objective,
    audience,
    context,
    features,
    constraints,
    outputs,
    preferences: config.visualPreferences,
    unknowns: brief?.unknowns ?? [],
  };

  const composed = composePrompt(contextBlock);
  const assumptions = assumptionsBlock(contextBlock);
  const recommendations: string[] = [];

  if (config.visualPreferences.length === 0 && category.family === "design") {
    recommendations.push("Add two or three visual references or adjectives to narrow the direction.");
  }
  if (config.outputRequirements.length === 0) {
    recommendations.push("Name the deliverable so the model knows exactly what to return.");
  }
  if (targetAgent === "coding" && depthIndex(depth) < depthIndex("detailed")) {
    recommendations.push("Coding agents usually need Detailed or Comprehensive depth to inspect, plan, verify, and report.");
  }
  if (unknownsBlock(contextBlock).length > 0) {
    recommendations.push(
      `Resolve or explicitly accept the remaining unknowns: ${unknownsBlock(contextBlock).slice(0, 3).join("; ")}.`,
    );
  }
  if (agent.recommendedDepth !== depth && depthIndex(depth) < depthIndex(agent.recommendedDepth)) {
    recommendations.push(`${agent.label} work is usually strongest at ${getPromptDepth(agent.recommendedDepth).label} depth.`);
  }

  return {
    title: brief?.title?.trim() || titleFromObjective(objective, config.category),
    category: config.category,
    prompt: composed.prompt,
    explanation: `A local draft assembled from your ${category.label} configuration for a ${agent.label} at ${getPromptDepth(depth).label} depth. It is not an AI response — generate with the provider to create a tailored prompt.`,
    sections: composed.sections,
    assumptions: Array.from(new Set(assumptions)).slice(0, 10),
    recommendations: Array.from(new Set(recommendations)).slice(0, 6),
    source: "draft",
    depth,
    targetAgent: agent.id,
  };
}

export function categoryOptionsForPrompt() {
  return categories.filter((category) => category.available);
}

export function draftTitle(config: PromptConfiguration) {
  return config.brief?.title?.trim() || titleFromObjective(config.objective, config.category);
}

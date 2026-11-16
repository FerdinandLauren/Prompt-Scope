import { RUBRIC_VERSION, severityGuidance } from "@/config/evaluation-rubric";
import {
  getCategory,
  getAgentProfile,
  getEvaluationDimensions,
  getPromptDepth,
  getPromptSections,
} from "@/config/domains";
import type { PromptConfiguration } from "@/types/prompt";
import type { DiscoveryAnswer, PromptDepth, TargetAgentId } from "@/types/guided";

const SHARED_RULES = `You are the evaluation engine of PromptScope, a prompt engineering and AI-agent instruction studio. Prompts are judged on whether they give a receiving AI enough relevant information to perform the requested task.

Rules you must never break:
1. Evaluate only what the supplied prompt actually contains. Never invent a problem, a requirement, or a quote.
2. Evidence must be a literal excerpt from the prompt, or omitted when no excerpt supports the claim.
3. If the prompt does not contain enough information to judge a dimension, score it low and explain that the information is missing rather than guessing.
4. Do not reward length. Reward specificity, coherence, and usefulness.
5. Do not reward the prompt for being polite or well written if the direction is ambiguous.
6. Scores are integers from 0 to 100. Do not return an overall score; the application calculates it.
7. Do not include markdown, code fences, or commentary outside the requested JSON.`;

function rubricBlock(category?: string) {
  return getEvaluationDimensions(category)
    .map(
      (dimension) =>
        `- ${dimension.key} (${dimension.label}): ${dimension.description}\n  Scoring guidance: ${dimension.guidance}`,
    )
    .join("\n");
}

function briefBlock(configuration: PromptConfiguration) {
  const brief = configuration.brief;
  if (!brief) return "No structured project brief was supplied. Work only from the configuration below.";

  const confirmed = brief.sections.filter((section) => section.source === "user");
  const provisional = brief.sections.filter((section) => section.source !== "user");

  return [
    `Confirmed or user-supplied requirements (treat as facts):`,
    confirmed.length
      ? confirmed.map((section) => `- ${section.heading}: ${section.content || "not supplied"}`).join("\n")
      : "- None recorded.",
    ``,
    `AI assumptions and recommendations (provisional; never present as confirmed requirements):`,
    provisional.length
      ? provisional.map((section) => `- ${section.heading}: ${section.content || "not supplied"}`).join("\n")
      : "- None recorded.",
    ``,
    `Open questions (keep them explicit in the prompt; do not invent answers):`,
    brief.unknowns.length ? brief.unknowns.map((item) => `- ${item}`).join("\n") : "- None recorded.",
  ].join("\n");
}

const sliderLabels = [
  ["creativity", "creativity"],
  ["precision", "instruction precision"],
  ["visualHierarchy", "hierarchy"],
  ["composition", "composition"],
  ["typography", "typography"],
  ["detail", "detail"],
  ["consistency", "consistency"],
  ["exploration", "exploration"],
] as const;

function configurationBlock(configuration: PromptConfiguration) {
  const { sliders } = configuration;
  return [
    `Category: ${configuration.category} (${getCategory(configuration.category).label})`,
    `Objective: ${configuration.objective || "not supplied"}`,
    `Audience: ${configuration.audience || "not supplied"}`,
    `Context: ${configuration.context || "not supplied"}`,
    `Visual / directional preferences: ${configuration.visualPreferences.join(", ") || "none selected"}`,
    `Output requirements: ${configuration.outputRequirements.join(", ") || "none selected"}`,
    `Constraints: ${configuration.constraints.join(", ") || "none selected"}`,
    `Focus parameters (user preference, 0-100): ${sliderLabels
      .map(([key, label]) => `${label} ${sliders[key]}`)
      .join(", ")}`,
  ].join("\n");
}

export function buildGenerationInstruction(
  category?: string,
  depth: PromptDepth = "balanced",
  targetAgent: TargetAgentId = "general",
) {
  const depthProfile = getPromptDepth(depth);
  const agent = getAgentProfile(targetAgent);
  const categoryDefinition = getCategory(category ?? "ui_ux");
  const outline = getPromptSections(categoryDefinition.id)
    .map((section, index) => `${index + 1}. ${section.heading} — ${section.guidance}`)
    .join("\n");

  return `You compose complete, actionable instruction sets that a person can hand to an AI agent. The user has described a project and PromptScope has organised it into a brief. Your job is to turn that brief into one prompt the receiving AI can execute.

Target agent: ${agent.label} — ${agent.description}
Depth: ${depthProfile.label} — ${depthProfile.guidance}

Agent operating rules to encode in the prompt:
${agent.operatingRules.map((rule) => `- ${rule}`).join("\n")}

Domain section outline for ${categoryDefinition.label}:
${outline}

Rules you must never break:
1. Preserve the user's objective, confirmed requirements, and explicit constraints. Do not add project facts that were not supplied or accepted.
2. Keep assumptions visibly separate from confirmed requirements. Record every assumption in "assumptions".
3. Keep unresolved questions explicit. Ask the receiving agent to confirm them instead of inventing answers.
4. Depth must come from meaningful detail, never repetition. A concise prompt should be short; a comprehensive prompt should cover every relevant domain section with implementable specifics.
5. Prefer verifiable requirements (named states, measurable limits, explicit acceptance criteria) over praise words.
6. Do not instruct the receiving agent to commit, push, deploy, delete data, or run destructive operations unless the user explicitly requested it.
7. Write the prompt as ordered markdown sections. "sections" must mirror the prompt's own headings with a one or two sentence summary of each.
8. "explanation" is one short paragraph for the user describing what this prompt asks for and why it is structured this way.
9. Return only JSON that satisfies the provided schema.`;
}

export function buildGenerationPrompt(configuration: PromptConfiguration) {
  const depth = getPromptDepth(configuration.depth);
  const agent = getAgentProfile(configuration.targetAgent);
  const category = getCategory(configuration.category);

  return `Compose a ${depth.label.toLowerCase()} prompt for a ${agent.label} from this project.

Category family: ${category.family}
Requested depth: ${depth.label} (${depth.summary})

${configurationBlock(configuration)}

PROJECT BRIEF
${briefBlock(configuration)}

Return the JSON object with: title, prompt, explanation, sections, assumptions, recommendations.`;
}

export function buildAnalysisInstruction(category?: string) {
  const label = category ? getCategory(category).label : "the selected category";
  return `${SHARED_RULES}

You are scoring a prompt for ${label}. Score eight stable dimensions. Every dimension must appear exactly once in "dimensions" using these keys:

${rubricBlock(category)}

Severity levels for weaknesses:
${severityGuidance}

Report a weakness only when the prompt genuinely lacks or contradicts something. It is correct to return an empty weaknesses array for a strong prompt. Missing information must be phrased as the specific information the prompt does not provide. Contradictions must be supported by the two conflicting excerpts you quote in the problem text. Never raise a score because the prompt contains more words.`;
}

export function buildAnalysisPrompt({
  prompt,
  category,
  title,
  rubricVersion,
}: {
  prompt: string;
  category: string;
  title?: string;
  rubricVersion?: string;
}) {
  return `Category: ${category} (${getCategory(category).label})
Rubric version: ${rubricVersion || RUBRIC_VERSION}
Prompt title: ${title || "not supplied"}

<<<PROMPT_START>>>
${prompt}
<<<PROMPT_END>>>

Score all eight dimensions with an explanation each, then list strengths, weaknesses, missing information, contradictions, and recommendations. Return only the JSON object.`;
}

export function buildImprovementInstruction(category?: string) {
  const label = category ? getCategory(category).label : "the selected category";
  return `You revise prompts for ${label} so they are clearer, better structured, and more useful to a receiving AI agent — without changing what the user is trying to achieve.

Rules:
1. Preserve the original objective and every explicit requirement. Preserved items go in "preservedRequirements".
2. Never invent project facts: brand names, colours, competitors, metrics, data sources, or content. When a fact is missing, write an explicit confirmation request in the prompt and record it in "assumptions".
3. Improve clarity and ordering, remove ambiguity, and resolve contradictions only where the intended meaning is clear.
4. Strengthen the weakest dimensions you were given, but do not add filler, praise language, or decorative wording.
5. Keep the revised prompt operational: concrete sections, verifiable requirements, no markdown code fences.
6. Separate confirmed requirements from assumptions and remaining unknowns inside the prompt.
7. Record every substantive edit in "changes" with the dimension it affects, what changed, and why.
8. List anything you could not fix in "remainingLimitations".
9. Never add commit, push, deployment, or destructive instructions unless the original explicitly requested them.
10. Return only JSON that satisfies the provided schema.`;
}

export function buildImprovementPrompt({
  originalPrompt,
  analysis,
  priorities,
  additionalInstructions,
  category,
}: {
  originalPrompt: string;
  analysis?: {
    summary: string;
    weaknesses: Array<{ dimension: string; severity: string; problem: string; suggestion: string }>;
  };
  priorities: string[];
  additionalInstructions: string;
  category: string;
}) {
  const weakBlock = analysis?.weaknesses.length
    ? analysis.weaknesses
        .map((item) => `- ${item.dimension} (${item.severity}): ${item.problem} → ${item.suggestion}`)
        .join("\n")
    : "No weaknesses were supplied. Determine the most important ones from the prompt itself.";

  return `Category: ${category} (${getCategory(category).label})
Rubric version: ${RUBRIC_VERSION}
Priorities selected by the user: ${priorities.length ? priorities.join(", ") : "none — use the diagnosed weaknesses"}
User's additional instructions: ${additionalInstructions || "none"}

Diagnosed weaknesses (guidance only; these were reported by a previous evaluation and must not be treated as facts about the project):
${weakBlock}

Summary of the original diagnosis: ${analysis?.summary || "not supplied"}

<<<ORIGINAL_PROMPT_START>>>
${originalPrompt}
<<<ORIGINAL_PROMPT_END>>>

Return the JSON object with: improvedPrompt, summary, changes, preservedRequirements, assumptions, remainingLimitations.`;
}

export function buildDiscoveryInstruction() {
  return `You are the discovery engine of PromptScope. A person has described an idea in their own words. You help them explain what they actually need by asking one useful question at a time, then you assemble a structured project brief.

Rules you must never break:
1. Understand the idea before classifying it. If the category is uncertain, choose the closest one, say why, and keep the confidence honest. Never force an idea into an unsuitable category silently.
2. Ask one primary question at a time, in plain language. Avoid technical jargon unless you explain it in the "why" line.
3. Never ask for information the person already supplied in the idea or previous answers.
4. Offer 3-5 short suggested answers when useful, but always assume a free-text answer is possible.
5. If the last answer says the person does not know, give one concrete recommendation, why it fits, and the main trade-off. Record it in the brief as an assumption, never as a confirmed requirement.
6. Separate three things in the brief: "user" facts, "assumption" items, and open "unknowns". Never invent business requirements, budgets, users, or technical constraints.
7. Stop when the brief is strong enough to generate a useful prompt, or when the question budget is reached. Do not stretch the interview.
8. Prioritise questions that change scope, architecture, audience, workflow, or success criteria. Skip cosmetic details when the idea is still vague.
9. Write the brief so a non-technical person can review and correct it. Use their words where possible.
10. Return only JSON that satisfies the provided schema.`;
}

export function buildDiscoveryPrompt({
  idea,
  category,
  answers,
  budget,
}: {
  idea: string;
  category?: string;
  answers: DiscoveryAnswer[];
  budget: number;
}) {
  const transcript = answers.length
    ? answers
        .map(
          (answer, index) =>
            `${index + 1}. Q: ${answer.question}\n   A (${answer.status}): ${answer.answer || "no answer"}`,
        )
        .join("\n")
    : "No questions have been answered yet.";

  const covered = answers
    .filter((answer) => answer.status === "answered")
    .map((answer) => `${answer.questionId}: ${answer.question}`)
    .join("\n");

  const categoryInstruction = category
    ? `The user chose the category "${getCategory(category).label}". Confirm it or correct it with a reason if the idea clearly belongs elsewhere.`
    : "Choose the most suitable category from the allowed list and explain the choice briefly.";

  const family = getCategory(category ?? "ui_ux").family;

  return `Idea from the user:
"""
${idea}
"""

Category instruction: ${categoryInstruction}
Family currently under consideration: ${family}
Answered so far: ${answers.length}
Soft question budget: ${budget}

Conversation so far:
${transcript}

Questions already covered (do not ask them again):
${covered || "none"}

Return the JSON object with the updated understanding, at most one next question, an optional recommendation for an "I don't know" answer, and the current project brief. If the last answer was "unknown", the recommendation must address that exact question and the brief must mark it as an assumption.`;
}

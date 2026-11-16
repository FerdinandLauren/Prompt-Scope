import { evaluationDimensions, RUBRIC_VERSION, severityGuidance } from "@/config/evaluation-rubric";
import type { PromptConfiguration } from "@/types/prompt";

const SHARED_RULES = `You are the evaluation engine of PromptScope, a prompt direction and evaluation studio for visual design and UI/UX prompt engineering.

Rules you must never break:
1. Evaluate only what the supplied prompt actually contains. Never invent a problem, a requirement, or a quote.
2. Evidence must be a literal excerpt from the prompt, or omitted when no excerpt supports the claim.
3. If the prompt does not contain enough information to judge a dimension, score it low and explain that the information is missing rather than guessing.
4. Do not reward length. Reward specificity, coherence, and usefulness.
5. Do not reward the prompt for being polite or well written if the design direction is ambiguous.
6. Scores are integers from 0 to 100. Do not return an overall score; the application calculates it.
7. Do not include markdown, code fences, or commentary outside the requested JSON.`;

function rubricBlock() {
  return evaluationDimensions
    .map(
      (dimension) =>
        `- ${dimension.key} (${dimension.label}): ${dimension.description}\n  Scoring guidance: ${dimension.guidance}`,
    )
    .join("\n");
}

function configurationBlock(configuration: PromptConfiguration) {
  const { sliders } = configuration;
  return [
    `Category: ${configuration.category}`,
    `Objective: ${configuration.objective || "not supplied"}`,
    `Audience: ${configuration.audience || "not supplied"}`,
    `Context: ${configuration.context || "not supplied"}`,
    `Visual preferences: ${configuration.visualPreferences.join(", ") || "none selected"}`,
    `Output requirements: ${configuration.outputRequirements.join(", ") || "none selected"}`,
    `Constraints: ${configuration.constraints.join(", ") || "none selected"}`,
    `Focus sliders (user preference, 0-100): creativity ${sliders.creativity}, precision ${sliders.precision}, visual hierarchy ${sliders.visualHierarchy}, composition ${sliders.composition}, typography ${sliders.typography}, detail ${sliders.detail}, consistency ${sliders.consistency}, exploration ${sliders.exploration}`,
  ].join("\n");
}

export function buildGenerationInstruction() {
  return `You compose structured design prompts for a professional tool. The user configures a direction and you write one prompt they can hand to a design-oriented AI model.

Rules:
1. Preserve the user's stated intention and every explicit requirement. Do not add project facts the user did not supply.
2. When something essential is missing, write an explicit instruction asking the model to confirm it, and record it in "assumptions".
3. The focus sliders express user preference, not quality. Honour them: high values must visibly change the instructions, low values must relax them.
4. Write the prompt in ordered markdown sections: objective, audience and context, visual direction, composition and hierarchy, typography, constraints, output requirements, and calibration notes. Include a section only when it carries real content or a confirmation request.
5. Be concrete and operational. Prefer verifiable requirements ("a 12-column grid", "contrast ratio at or above 4.5:1") over vague praise ("beautiful", "amazing").
6. "sections" must mirror the prompt's own headings with a one or two sentence summary of each.
7. "explanation" is one short paragraph for the user describing what this prompt asks for and why it is structured this way.
8. Return only JSON that satisfies the provided schema.`;
}

export function buildGenerationPrompt(configuration: PromptConfiguration) {
  return `Compose a design prompt from this configuration.

${configurationBlock(configuration)}

Return the JSON object with: title, prompt, explanation, sections, assumptions, recommendations.`;
}

export function buildAnalysisInstruction() {
  return `${SHARED_RULES}

You score eight dimensions. Every dimension must appear exactly once in "dimensions" using these keys:

${rubricBlock()}

Severity levels for weaknesses:
${severityGuidance}

Report a weakness only when the prompt genuinely lacks or contradicts something. It is correct to return an empty weaknesses array for a strong prompt. Missing information must be phrased as the specific information the prompt does not provide. Contradictions must be supported by the two conflicting excerpts you quote in the problem text.`;
}

export function buildAnalysisPrompt({
  prompt,
  category,
  title,
}: {
  prompt: string;
  category: string;
  title?: string;
}) {
  return `Category: ${category}
Rubric version: ${RUBRIC_VERSION}
Prompt title: ${title || "not supplied"}

<<<PROMPT_START>>>
${prompt}
<<<PROMPT_END>>>

Score all eight dimensions with an explanation each, then list strengths, weaknesses, missing information, contradictions, and recommendations. Return only the JSON object.`;
}

export function buildImprovementInstruction() {
  return `You revise design prompts so they are clearer, better structured, and more useful — without changing what the user is trying to achieve.

Rules:
1. Preserve the original objective and every explicit requirement. Preserved items go in "preservedRequirements".
2. Never invent project facts: brand names, colours, competitors, metrics, or content. When a fact is missing, write an explicit confirmation request in the prompt and record it in "assumptions".
3. Improve clarity and ordering, remove ambiguity, and resolve contradictions only where the intended meaning is clear.
4. Strengthen the weakest dimension(s) you were given, but do not add filler, praise language, or decorative wording.
5. Keep the revised prompt operational: concrete sections, verifiable requirements, no markdown code fences.
6. Record every substantive edit in "changes" with the dimension it affects, what changed, and why.
7. List anything you could not fix in "remainingLimitations".
8. Return only JSON that satisfies the provided schema.`;
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

  return `Category: ${category}
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

import "server-only";
import { getCategory, getComplexityRecommendation } from "@/config/domains";
import { getAiStatus } from "@/lib/ai/client";
import { demoDiscover } from "@/lib/ai/demo/discover";
import { buildDiscoveryInstruction, buildDiscoveryPrompt } from "@/lib/ai/prompts";
import { callStructured } from "@/lib/ai/provider";
import type { AiRequestContext } from "@/lib/ai/providers/config";
import { discoveryResponseSchema, type DiscoveryResponse } from "@/lib/ai/schemas";
import type {
  BriefSection,
  DiscoveryAnswer,
  DiscoveryInput,
  DiscoveryQuestion,
  DiscoveryRecommendation,
  DiscoveryTurn,
  ProjectBrief,
} from "@/types/guided";

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function budgetFor(input: DiscoveryInput) {
  if (input.budget) return input.budget;
  return 6;
}

function mapBrief(data: DiscoveryResponse): ProjectBrief {
  const sections: BriefSection[] = data.brief.sections.map((section, index) => ({
    id: `${slug(section.heading) || "section"}-${index + 1}`,
    heading: section.heading,
    content: section.content,
    source: section.source,
  }));

  return {
    title: data.brief.title,
    objective: data.objective,
    summary: data.summary,
    category: data.category,
    complexity: data.complexity,
    sections,
    assumptions: data.brief.assumptions,
    unknowns: data.brief.unknowns,
  };
}

function nextQuestion(data: DiscoveryResponse, input: DiscoveryInput): DiscoveryQuestion | null {
  if (!data.nextQuestion) return null;

  const question = data.nextQuestion;
  const normalized = normalizeText(question.question);
  const alreadyAsked = input.answers.some((answer) => normalizeText(answer.question) === normalized);
  if (alreadyAsked) return null;

  return {
    id: `${slug(question.target) || "question"}-${input.answers.length + 1}`,
    question: question.question,
    why: question.why,
    options: question.options,
    allowUnknown: true,
    target: question.target,
  };
}

function recommendationFor(
  data: DiscoveryResponse,
  input: DiscoveryInput,
): DiscoveryRecommendation | null {
  const last = input.answers.at(-1);
  if (!last || last.status !== "unknown" || !data.recommendation) return null;

  return {
    questionId: last.questionId,
    question: last.question,
    recommendation: data.recommendation.recommendation,
    rationale: data.recommendation.rationale,
    tradeoffs: data.recommendation.tradeoffs,
    recordedAsAssumption: true,
  };
}

/**
 * One structured discovery call per idea or answer. The conversation is sent
 * in full so the model can avoid repeating a question; the server still drops
 * an exact duplicate defensively.
 */
export async function discoverStep(
  input: DiscoveryInput,
  browserApiKey?: string | AiRequestContext,
): Promise<DiscoveryTurn> {
  const status = getAiStatus(browserApiKey);

  if (status.mode === "demo") {
    return demoDiscover(input);
  }

  const category = input.category;
  const budget = budgetFor(input);

  const { data } = await callStructured(
    {
      systemInstruction: buildDiscoveryInstruction(),
      userPrompt: buildDiscoveryPrompt({ idea: input.idea, category, answers: input.answers, budget }),
      schema: discoveryResponseSchema,
      temperature: 0.4,
      maxOutputTokens: 4_096,
      label: "discover",
      task: "discover",
      complexity: "medium",
      validate: (payload) => {
        if (payload.brief.sections.length === 0) return "brief must contain at least one section";
        if (payload.categoryConfidence < 0 || payload.categoryConfidence > 100) return "invalid confidence";
        return null;
      },
    },
    browserApiKey,
  );

  const question = nextQuestion(data, input);
  const recommendation = recommendationFor(data, input);
  const brief = mapBrief(data);

  // An unknown answer must never be presented as a user fact. Enforce the
  // assumption marker even if the model forgot it.
  if (recommendation) {
    const marker = `${recommendation.question}: ${recommendation.recommendation}`;
    if (!brief.assumptions.some((item) => normalizeText(item).includes(normalizeText(recommendation.question)))) {
      brief.assumptions.push(`${marker} (assumption, not confirmed)`);
    }
  }

  const enoughInformation =
    data.enoughInformation || input.answers.length >= budget || !question;

  return {
    source: "live",
    understanding: {
      summary: data.summary,
      objective: data.objective,
      category: data.category,
      categoryLabel: getCategory(data.category).label,
      categoryConfidence: data.categoryConfidence,
      categoryReason: data.categoryReason,
      complexity: data.complexity,
      explicitRequirements: data.explicitRequirements,
      constraints: data.constraints,
      missingInformation: data.missingInformation,
      ambiguities: data.ambiguities,
      technicalConsiderations: data.technicalConsiderations,
    },
    question: enoughInformation ? null : question,
    recommendation,
    brief,
    enoughInformation,
    answered: input.answers.length,
    budget,
  };
}

export function recommendedDepthFor(category: string, complexity: ProjectBrief["complexity"]) {
  if (complexity === "complex") return getComplexityRecommendation(complexity);
  if (complexity === "moderate") return getComplexityRecommendation(complexity);
  return getCategory(category).family === "software" ? "detailed" : "balanced";
}

export type { DiscoveryAnswer };

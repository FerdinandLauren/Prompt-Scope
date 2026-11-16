import "server-only";
import { getDimension } from "@/config/evaluation-rubric";
import { heuristicEvaluate } from "@/lib/ai/analyzer/heuristic";
import type { EvaluationSnapshot, ImprovementChange, PromptImprovement } from "@/types/evaluation";

/**
 * Demo improvement restructures the original prompt and converts anything the
 * rule-based evaluator could not find into explicit confirmation questions. It
 * never invents project facts.
 */
export function demoImprove({
  originalPrompt,
  category,
  rubricVersion,
  priorities,
}: {
  originalPrompt: string;
  category: string;
  rubricVersion: string;
  priorities: string[];
}): PromptImprovement {
  const text = originalPrompt.replace(/\r\n/g, "\n").trim();
  const analysis: EvaluationSnapshot = heuristicEvaluate({ prompt: text, category, rubricVersion });
  const words = text.split(/\s+/).filter(Boolean).length;
  const missing = analysis.missingInformation;
  const weakKeys = analysis.dimensionDetails
    .filter((dimension) => dimension.score < 70)
    .sort((a, b) => a.score - b.score)
    .map((dimension) => dimension.key);
  const weakLabels = analysis.dimensionDetails
    .filter((dimension) => weakKeys.includes(dimension.key))
    .map((dimension) => dimension.label);

  const prioritizedLabels = priorities.length ? priorities : weakLabels.slice(0, 3);

  const openQuestions = missing.length
    ? missing.map(
        (item) =>
          `- ${item}: not specified in the original prompt — confirm this before the design is produced.`,
      )
    : ["- No tracked information category is missing; confirm the deliverable format before production."];

  const improvedPrompt = `## Objective
${firstMeaningfulLine(text) || "Confirm the objective: the original prompt did not state one explicitly."}

## Original instructions (preserved)
${text}

## Open questions to confirm before design
${openQuestions.join("\n")}

## Direction calibration
${
  prioritizedLabels.length
    ? prioritizedLabels.map((label) => `- Strengthen ${label.toLowerCase()} in this revision.`).join("\n")
    : "- Confirm which dimension matters most before revising further."
}

## Required output
- Return the design deliverable requested for this category.
- State the primary focal point, the reading order, and how the layout reflows at smaller widths.
- List every assumption you made instead of inventing project facts.

## Constraints
- Do not add brands, metrics, content, or requirements that were not supplied.
- Keep every preserved instruction above unchanged in meaning.`;

  const allChanges: ImprovementChange[] = [
    {
      dimension: "structure",
      change: `Reorganised ${words} words of instructions into labelled sections with an explicit preserved-instructions block.`,
      reason: "A predictable structure makes the instruction order visible and prevents requirements from being dropped.",
    },
    ...prioritizedLabels.map((label) => ({
      dimension: getDimension(
        analysis.dimensionDetails.find((dimension) => dimension.label === label)?.key ?? "clarity",
      ).key,
      change: `Added an explicit calibration instruction for ${label.toLowerCase()}.`,
      reason: `The rule-based evaluation scored ${label.toLowerCase()} below the useful threshold.`,
    })),
    {
      dimension: "output_definition",
      change:
        "Added a required output section covering focal point, reading order, responsive behaviour, and assumptions.",
      reason: "The original prompt left the expected response format open.",
    },
  ];

  const changes: ImprovementChange[] = allChanges.slice(0, 8);

  return {
    improvedPrompt,
    summary:
      "The original instructions were preserved inside a structured frame, missing information became explicit confirmation questions, and the output requirements were made concrete.",
    changes,
    preservedRequirements: [firstMeaningfulLine(text) || text.slice(0, 120)].filter(Boolean),
    assumptions: missing.length
      ? missing.map(
          (item) =>
            `${item} still has to be confirmed by the user; the revised prompt asks for it rather than deciding it.`,
        )
      : ["The original intent was preserved as written; no new facts were introduced."],
    remainingLimitations: [
      "Demo Mode revises structure and specificity; it does not rewrite prose the way a language model does.",
      "Anything absent from the original prompt remains an open question, not a decision.",
    ],
    source: "demo",
  };
}

function firstMeaningfulLine(text: string) {
  return (
    text
      .split("\n")
      .map((line) => line.replace(/^#+\s*/, "").trim())
      .find((line) => line.length > 12) ?? ""
  );
}

import { categories, getCategory } from "@/config/app";
import type { PromptConfiguration, GeneratedPrompt, SliderKey } from "@/types/prompt";

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

export function buildDraftPrompt(config: PromptConfiguration): GeneratedPrompt {
  const category = getCategory(config.category);
  const objective = config.objective.trim();
  const audience = config.audience.trim();
  const context = config.context.trim();
  const assumptions: string[] = [];
  const recommendations: string[] = [];

  if (!audience) assumptions.push("The primary audience was not specified; confirm it before visual exploration.");
  if (!context) assumptions.push("Project context was not supplied; the prompt asks for confirmation where it would change the direction.");
  if (config.visualPreferences.length === 0) {
    recommendations.push("Add two or three visual references or adjectives to narrow the direction.");
  }
  if (config.outputRequirements.length === 0) {
    recommendations.push("Name the deliverable so the model knows whether it is designing a page, component, or system.");
  }

  const activeSliders = (Object.entries(config.sliders) as Array<[SliderKey, number]>)
    .filter(([, value]) => value >= 70 || value <= 35)
    .map(([key, value]) => {
      const rule = sliderInstructions[key];
      return `- ${value >= 70 ? rule.high : rule.low}`;
    });

  const directionLines = config.visualPreferences.length
    ? config.visualPreferences.map((item) => `- ${item}`).join("\n")
    : "- Not specified. Derive a coherent direction from the objective and context; confirm the intended mood before committing.";

  const constraints = [
    ...config.constraints,
    config.audience ? "" : "Confirm the primary audience before production.",
    config.context ? "" : "Ask for missing project context rather than inventing it.",
  ].filter(Boolean);

  const prompt = `# ${titleFromObjective(objective, config.category)}

## Objective
${objective || "No objective supplied. Ask for the project objective before designing."}

## Audience and context
${audience ? `- Primary audience: ${audience}` : "- Primary audience: not specified — confirm before visual exploration."}
${context ? `- Project context: ${context}` : "- Project context: not supplied. Ask for the purpose, environment, and constraints that would change the design."}

## Visual direction
${directionLines}

## Composition and hierarchy
- Establish a clear focal point and a deliberate reading order.
- Use a consistent spacing rhythm and aligned edges.
- State how the composition should adapt at smaller widths.

## Typography
- Define distinct roles for display, body, and metadata text.
- Set an intentional scale, weight range, and comfortable measure.
- Keep contrast and legibility above decorative effect.

## Constraints
${constraints.length ? constraints.map((item) => `- ${item}`).join("\n") : "- No additional constraints were supplied."}

## Output requirements
${listOrFallback(config.outputRequirements, "Confirm the deliverable format before producing the final output.")}

## Direction calibration
${activeSliders.length ? activeSliders.join("\n") : "- Keep the direction measured: clarity first, expression where it earns attention."}

## Response format
Return the design direction and the requested deliverable in a clear, structured form. Explain the main visual decisions. Do not add project facts that were not supplied.`;

  return {
    title: titleFromObjective(objective, config.category),
    category: config.category,
    prompt,
    explanation: `A local draft assembled from your ${category.label} configuration. It is not an AI response — generate with the provider to create a tailored prompt.`,
    sections: [
      { heading: "Objective", content: objective || "Not supplied." },
      { heading: "Audience and context", content: [audience, context].filter(Boolean).join("\n") || "Not supplied." },
      { heading: "Visual direction", content: config.visualPreferences.join(", ") || "Not specified." },
      {
        heading: "Constraints",
        content: config.constraints.join(", ") || "No additional constraints.",
      },
      {
        heading: "Output requirements",
        content: config.outputRequirements.join(", ") || "Not specified.",
      },
    ],
    assumptions,
    recommendations,
    source: "draft",
  };
}

export function categoryOptionsForPrompt() {
  return categories.filter((category) => category.available);
}

import { describe, expect, it } from "vitest";
import { demoImprove } from "@/lib/ai/demo/improve";
import { heuristicEvaluate } from "@/lib/ai/analyzer/heuristic";
import { buildDraftPrompt } from "@/lib/prompt/draft";
import { defaultSliders } from "@/config/presets";
import type { PromptConfiguration } from "@/types/prompt";

const ORIGINAL = "Design a modern dashboard for our app. It should look clean and professional.";

describe("demoImprove", () => {
  const result = demoImprove({
    originalPrompt: ORIGINAL,
    category: "ui_ux",
    rubricVersion: "visual-uiux-v1",
    priorities: ["Clarity", "Typography"],
  });

  it("preserves the original instructions verbatim", () => {
    expect(result.improvedPrompt).toContain(ORIGINAL);
    expect(result.preservedRequirements.join(" ")).toContain("Design a modern dashboard");
  });

  it("turns missing information into explicit confirmation questions instead of inventing facts", () => {
    expect(result.improvedPrompt).toMatch(/Open questions to confirm/i);
    expect(result.improvedPrompt).toMatch(/not specified in the original prompt/i);
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.assumptions.join(" ")).toMatch(/confirm/i);
  });

  it("reports the dimensions it deliberately strengthened", () => {
    const dimensions = result.changes.map((change) => change.dimension);
    expect(dimensions).toContain("structure");
    expect(dimensions).toContain("clarity");
    expect(dimensions).toContain("typography");
    expect(result.changes.every((change) => change.change.length > 5 && change.reason.length > 5)).toBe(true);
  });

  it("states the expected output so the deliverable is defined", () => {
    expect(result.improvedPrompt).toMatch(/Required output/);
    expect(result.improvedPrompt).toMatch(/Do not add brands, metrics, content/i);
  });

  it("is labelled as demo data and lists its own limitations", () => {
    expect(result.source).toBe("demo");
    expect(result.remainingLimitations.length).toBeGreaterThan(0);
  });

  it("produces a revision the same evaluator scores higher on clarity than the original", () => {
    const before = heuristicEvaluate({ prompt: ORIGINAL, category: "ui_ux", rubricVersion: "visual-uiux-v1" });
    const after = heuristicEvaluate({
      prompt: result.improvedPrompt,
      category: "ui_ux",
      rubricVersion: "visual-uiux-v1",
    });

    expect(after.dimensions.clarity).toBeGreaterThan(before.dimensions.clarity);
    expect(after.dimensions.output_definition).toBeGreaterThan(before.dimensions.output_definition);
  });

  it("still flags what remains unresolved rather than claiming a complete fix", () => {
    const after = heuristicEvaluate({
      prompt: result.improvedPrompt,
      category: "ui_ux",
      rubricVersion: "visual-uiux-v1",
    });
    // Colour and audience were never supplied, so questions remain in the text.
    expect(result.improvedPrompt).toMatch(/Colour direction|Target audience/);
    expect(after.weaknesses.length).toBeGreaterThan(0);
  });
});

describe("buildDraftPrompt", () => {
  const configuration: PromptConfiguration = {
    category: "ui_ux",
    objective: "Design a calm analytics dashboard for a subscription operations team.",
    audience: "Operations leads",
    context: "Weekly churn review",
    visualPreferences: ["Minimalist", "Editorial"],
    outputRequirements: ["Desktop dashboard"],
    constraints: ["Responsive", "Accessible contrast"],
    sliders: { ...defaultSliders, precision: 95, exploration: 10 },
  };

  const draft = buildDraftPrompt(configuration);

  it("carries the user's objective, audience, and selections into the prompt", () => {
    expect(draft.prompt).toContain(configuration.objective);
    expect(draft.prompt).toContain("Operations leads");
    expect(draft.prompt).toContain("Minimalist");
    expect(draft.prompt).toContain("Responsive");
    expect(draft.prompt).toContain("Desktop dashboard");
  });

  it("translates extreme slider values into instructions", () => {
    expect(draft.prompt).toMatch(/Follow every explicit requirement exactly/i);
    expect(draft.prompt).toMatch(/Commit to a single primary direction/i);
  });

  it("asks for confirmation instead of inventing what is missing", () => {
    const thin = buildDraftPrompt({
      ...configuration,
      audience: "",
      context: "",
      visualPreferences: [],
      outputRequirements: [],
      constraints: [],
    });
    expect(thin.prompt).toMatch(/not specified/i);
    expect(thin.assumptions.length).toBeGreaterThan(0);
    expect(thin.recommendations.length).toBeGreaterThan(0);
  });

  it("labels itself as a local draft rather than an AI response", () => {
    expect(draft.source).toBe("draft");
    expect(draft.explanation).toMatch(/not an AI response/i);
    expect(draft.sections.length).toBeGreaterThan(3);
    expect(draft.category).toBe("ui_ux");
  });
});

import { describe, expect, it } from "vitest";
import {
  analyzeRequestSchema,
  firstIssue,
  generateRequestSchema,
  improveRequestSchema,
  promptConfigurationSchema,
} from "@/lib/validation/schemas";
import { defaultSliders } from "@/config/presets";

const validConfiguration = {
  category: "ui_ux",
  objective: "Design a calm analytics dashboard for a churn review workflow.",
  audience: "Operations leads",
  context: "Weekly review",
  visualPreferences: ["Minimalist"],
  outputRequirements: ["Desktop dashboard"],
  constraints: ["Responsive"],
  sliders: defaultSliders,
};

describe("promptConfigurationSchema", () => {
  it("accepts a complete configuration", () => {
    expect(promptConfigurationSchema.safeParse(validConfiguration).success).toBe(true);
  });

  it("requires an objective of a useful length", () => {
    const tooShort = promptConfigurationSchema.safeParse({ ...validConfiguration, objective: "dashboard" });
    expect(tooShort.success).toBe(false);
    expect(firstIssue(tooShort.error!).objective).toMatch(/12 characters/);
  });

  it("rejects an unknown category", () => {
    expect(
      promptConfigurationSchema.safeParse({ ...validConfiguration, category: "marketing" }).success,
    ).toBe(false);
  });

  it("rejects slider values outside 0–100 and non-integers", () => {
    const tooHigh = promptConfigurationSchema.safeParse({
      ...validConfiguration,
      sliders: { ...defaultSliders, creativity: 101 },
    });
    const fractional = promptConfigurationSchema.safeParse({
      ...validConfiguration,
      sliders: { ...defaultSliders, precision: 50.5 },
    });
    const negative = promptConfigurationSchema.safeParse({
      ...validConfiguration,
      sliders: { ...defaultSliders, detail: -1 },
    });

    expect(tooHigh.success).toBe(false);
    expect(fractional.success).toBe(false);
    expect(negative.success).toBe(false);
  });

  it("requires every slider key", () => {
    const partial = { ...defaultSliders } as Partial<typeof defaultSliders>;
    delete partial.exploration;
    expect(
      promptConfigurationSchema.safeParse({ ...validConfiguration, sliders: partial }).success,
    ).toBe(false);
  });

  it("caps selection lists", () => {
    const tooMany = promptConfigurationSchema.safeParse({
      ...validConfiguration,
      visualPreferences: Array.from({ length: 11 }, (_, index) => `style-${index}`),
    });
    expect(tooMany.success).toBe(false);
  });

  it("applies empty defaults for optional text fields", () => {
    const parsed = promptConfigurationSchema.parse({
      category: "ui_ux",
      objective: "Design a calm analytics dashboard.",
      sliders: defaultSliders,
    });
    expect(parsed.audience).toBe("");
    expect(parsed.visualPreferences).toEqual([]);
  });
});

describe("generateRequestSchema", () => {
  it("wraps the configuration and rejects a missing one", () => {
    expect(generateRequestSchema.safeParse({ configuration: validConfiguration }).success).toBe(true);
    expect(generateRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("analyzeRequestSchema", () => {
  it("enforces the prompt length window", () => {
    expect(
      analyzeRequestSchema.safeParse({
        prompt: "short",
        category: "ui_ux",
        rubricVersion: "visual-uiux-v1",
      }).success,
    ).toBe(false);

    expect(
      analyzeRequestSchema.safeParse({
        prompt: "x".repeat(12_001),
        category: "ui_ux",
        rubricVersion: "visual-uiux-v1",
      }).success,
    ).toBe(false);

    expect(
      analyzeRequestSchema.safeParse({
        prompt: "Design a calm analytics dashboard for operations leads.",
        category: "ui_ux",
        rubricVersion: "visual-uiux-v1",
      }).success,
    ).toBe(true);
  });

  it("requires a rubric version so snapshots stay interpretable", () => {
    expect(
      analyzeRequestSchema.safeParse({
        prompt: "Design a calm analytics dashboard for operations leads.",
        category: "ui_ux",
      }).success,
    ).toBe(false);
  });

  it("does not accept a model-supplied overall score", () => {
    const parsed = analyzeRequestSchema.parse({
      prompt: "Design a calm analytics dashboard for operations leads.",
      category: "ui_ux",
      rubricVersion: "visual-uiux-v1",
      overallScore: 99,
      dimensions: { clarity: 100 },
    });
    expect(parsed).not.toHaveProperty("overallScore");
    expect(parsed).not.toHaveProperty("dimensions");
  });
});

describe("improveRequestSchema", () => {
  it("accepts optional guidance and rejects invalid severities", () => {
    const base = {
      originalPrompt: "Design a modern dashboard for our app with a clear hierarchy.",
      category: "ui_ux",
      rubricVersion: "visual-uiux-v1",
    };

    expect(improveRequestSchema.safeParse(base).success).toBe(true);
    expect(
      improveRequestSchema.safeParse({
        ...base,
        analysis: {
          overallScore: 40,
          summary: "thin",
          weaknesses: [{ dimension: "clarity", severity: "critical", problem: "p", suggestion: "s" }],
        },
      }).success,
    ).toBe(false);
  });

  it("defaults priorities and instructions to safe empties", () => {
    const parsed = improveRequestSchema.parse({
      originalPrompt: "Design a modern dashboard for our app with a clear hierarchy.",
      category: "ui_ux",
      rubricVersion: "visual-uiux-v1",
    });
    expect(parsed.priorities).toEqual([]);
    expect(parsed.additionalInstructions).toBe("");
  });
});

describe("firstIssue", () => {
  it("returns one message per field path", () => {
    const result = promptConfigurationSchema.safeParse({
      ...validConfiguration,
      objective: "x",
      visualPreferences: Array.from({ length: 11 }, (_, index) => `style-${index}`),
    });
    const issues = firstIssue(result.error!);
    expect(issues.objective).toBeTruthy();
    expect(issues.visualPreferences).toBeTruthy();
  });
});

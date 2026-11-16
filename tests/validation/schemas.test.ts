import { describe, expect, it } from "vitest";
import {
  analyzeRequestSchema,
  discoveryRequestSchema,
  firstIssue,
  generateRequestSchema,
  improveRequestSchema,
  projectBriefSchema,
  promptConfigurationSchema,
} from "@/lib/validation/schemas";
import { defaultSliders } from "@/config/presets";
import { PROMPT_LIMITS } from "@/config/app";
import { CATEGORY_IDS } from "@/config/domains";

const validBrief = {
  title: "Refund review console",
  objective: "Give support agents one place to review and approve refund requests.",
  summary: "Internal console for a support team.",
  category: "backend",
  complexity: "moderate",
  sections: [
    { id: "audience", heading: "Target users", content: "Support agents", source: "user" },
    { id: "requirements", heading: "What it must do", content: "List and approve requests", source: "user" },
  ],
  assumptions: ["Refunds above 500 need manager approval"],
  unknowns: ["Which payment provider is authoritative"],
};

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

  it("accepts every declared category", () => {
    for (const category of CATEGORY_IDS) {
      expect(promptConfigurationSchema.safeParse({ ...validConfiguration, category }).success).toBe(true);
    }
  });

  it("accepts optional depth, target agent, and brief without breaking legacy payloads", () => {
    const legacy = promptConfigurationSchema.parse(validConfiguration);
    expect(legacy.depth).toBeUndefined();
    expect(legacy.targetAgent).toBeUndefined();
    expect(legacy.brief).toBeUndefined();

    const guided = promptConfigurationSchema.safeParse({
      ...validConfiguration,
      category: "backend",
      depth: "detailed",
      targetAgent: "coding",
      brief: validBrief,
    });
    expect(guided.success).toBe(true);
  });

  it("rejects unknown depth or target agent values", () => {
    expect(
      promptConfigurationSchema.safeParse({ ...validConfiguration, depth: "epic" }).success,
    ).toBe(false);
    expect(
      promptConfigurationSchema.safeParse({ ...validConfiguration, targetAgent: "intern" }).success,
    ).toBe(false);
  });
});

describe("projectBriefSchema", () => {
  it("accepts a labelled brief", () => {
    expect(projectBriefSchema.safeParse(validBrief).success).toBe(true);
  });

  it("requires at least one section and a real objective", () => {
    expect(projectBriefSchema.safeParse({ ...validBrief, sections: [] }).success).toBe(false);
    expect(projectBriefSchema.safeParse({ ...validBrief, objective: "short" }).success).toBe(false);
  });

  it("rejects unknown section sources and categories", () => {
    expect(
      projectBriefSchema.safeParse({
        ...validBrief,
        sections: [{ ...validBrief.sections[0], source: "model" }],
      }).success,
    ).toBe(false);
    expect(projectBriefSchema.safeParse({ ...validBrief, category: "marketing" }).success).toBe(false);
  });

  it("defaults assumptions and unknowns to empty lists", () => {
    const parsed = projectBriefSchema.parse({
      ...validBrief,
      assumptions: undefined,
      unknowns: undefined,
    });
    expect(parsed.assumptions).toEqual([]);
    expect(parsed.unknowns).toEqual([]);
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
        prompt: "x".repeat(PROMPT_LIMITS.max + 1),
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

describe("discoveryRequestSchema", () => {
  it("accepts an idea with accumulated answers", () => {
    const parsed = discoveryRequestSchema.safeParse({
      idea: "Design a booking site for a yoga studio.",
      category: "ui_ux",
      answers: [
        { questionId: "design-platform", question: "Where will people use it?", answer: "Website", status: "answered" },
        { questionId: "design-audience", question: "Who is it for?", answer: "I don't know", status: "unknown" },
      ],
      budget: 5,
    });

    expect(parsed.success).toBe(true);
  });

  it("defaults answers and rejects an idea that is too short", () => {
    const parsed = discoveryRequestSchema.parse({ idea: "Yoga booking website" });
    expect(parsed.answers).toEqual([]);

    expect(discoveryRequestSchema.safeParse({ idea: "hi" }).success).toBe(false);
    expect(discoveryRequestSchema.safeParse({ idea: "x".repeat(2001) }).success).toBe(false);
  });

  it("bounds the soft budget and the answer count", () => {
    expect(
      discoveryRequestSchema.safeParse({ idea: "Yoga booking website", budget: 2 }).success,
    ).toBe(false);
    expect(
      discoveryRequestSchema.safeParse({ idea: "Yoga booking website", budget: 13 }).success,
    ).toBe(false);
    expect(
      discoveryRequestSchema.safeParse({
        idea: "Yoga booking website",
        answers: Array.from({ length: 25 }, (_, index) => ({
          questionId: `q-${index}`,
          question: "Question?",
          answer: "Answer",
          status: "answered",
        })),
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown answer status", () => {
    expect(
      discoveryRequestSchema.safeParse({
        idea: "Yoga booking website",
        answers: [{ questionId: "q1", question: "Q?", answer: "A", status: "maybe" }],
      }).success,
    ).toBe(false);
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

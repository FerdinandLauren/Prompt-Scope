import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluationDimensions } from "@/config/evaluation-rubric";
import { AiError } from "@/lib/ai/errors";
import { __setProviderForTests, getAiStatus } from "@/lib/ai/client";
import { analyzePrompt } from "@/lib/ai/analyze";
import { generatePrompt } from "@/lib/ai/generate";
import { improvePrompt } from "@/lib/ai/improve";
import { defaultSliders } from "@/config/presets";

const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

function validEvaluationPayload(score = 72, mutate?: (payload: Record<string, unknown>) => void) {
  const payload: Record<string, unknown> = {
    summary: "The prompt states an objective but leaves the visual direction thin.",
    dimensions: evaluationDimensions.map((dimension) => ({
      key: dimension.key,
      score,
      explanation: `${dimension.label} is partially specified.`,
    })),
    strengths: [{ title: "Clear objective", description: "The deliverable is named." }],
    weaknesses: [
      {
        dimension: "visual_direction",
        severity: "medium",
        problem: "The style is named but not described.",
        evidence: "modern and clean",
        suggestion: "Name a palette behaviour and a mood.",
      },
    ],
    missingInformation: ["Target audience"],
    contradictions: [],
    recommendations: ["Add a colour direction."],
  };
  mutate?.(payload);
  return payload;
}

function stubProvider(handler: (params: unknown) => unknown) {
  const calls: unknown[] = [];
  __setProviderForTests({
    models: {
      generateContent: async (params: unknown) => {
        calls.push(params);
        return handler(params);
      },
    },
  } as never);
  return calls;
}

function responseWith(payload: unknown) {
  return { text: JSON.stringify(payload) };
}

function providerFailure(status: number, message: string) {
  return () => {
    throw Object.assign(new Error(message), { status });
  };
}

const ANALYZE_INPUT = {
  prompt: "Design a calm analytics dashboard for operations leads with a 12-column grid and WCAG AA contrast.",
  category: "ui_ux",
  rubricVersion: "visual-uiux-v1",
};

describe("live AI mode", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key-not-real";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
  });

  afterEach(() => {
    __setProviderForTests(null);
    process.env.GEMINI_API_KEY = originalKey;
    process.env.GEMINI_MODEL = originalModel;
    vi.restoreAllMocks();
  });

  it("reports live mode and the configured model without exposing the key", () => {
    const status = getAiStatus();
    expect(status.mode).toBe("live");
    expect(status.configured).toBe(true);
    expect(status.model).toBe("gemini-3.8-flash");
    expect(JSON.stringify(status)).not.toContain("test-key-not-real");
  });

  it("falls back to demo mode when the key is empty or a placeholder", () => {
    process.env.GEMINI_API_KEY = "";
    expect(getAiStatus().mode).toBe("demo");
    process.env.GEMINI_API_KEY = "your_api_key";
    expect(getAiStatus().mode).toBe("demo");
    process.env.GEMINI_API_KEY = "test-key-not-real";
    expect(getAiStatus().mode).toBe("live");
  });

  it("requests structured JSON with the rubric and a response schema", async () => {
    const calls = stubProvider(() => responseWith(validEvaluationPayload()));
    await analyzePrompt(ANALYZE_INPUT);

    expect(calls).toHaveLength(1);
    const params = calls[0] as {
      model: string;
      contents: Array<{ parts: Array<{ text: string }> }>;
      config: { responseMimeType: string; responseJsonSchema: unknown; systemInstruction: string };
    };

    expect(params.model).toBe("gemini-3.8-flash");
    expect(params.config.responseMimeType).toBe("application/json");
    expect(params.config.responseJsonSchema).toBeTruthy();
    expect(params.config.systemInstruction).toMatch(/clarity/i);
    expect(params.config.systemInstruction).toMatch(/never/i);
    expect(params.contents[0]!.parts[0]!.text).toContain(ANALYZE_INPUT.prompt);
  });

  it("calculates the overall score on the server instead of trusting the model", async () => {
    const calls = stubProvider(() =>
      responseWith(validEvaluationPayload(0, (payload) => {
        // A model that tries to influence the total: the app must ignore it.
        (payload as Record<string, unknown>).overallScore = 100;
      })),
    );

    const snapshot = await analyzePrompt(ANALYZE_INPUT);
    expect(calls).toHaveLength(1);
    expect(snapshot.overallScore).toBe(0);
    expect(snapshot.source).toBe("live");
    expect(snapshot.model).toBe("gemini-3.8-flash");
    expect(snapshot.rubricVersion).toBe("visual-uiux-v1");
    expect(snapshot.dimensionDetails).toHaveLength(8);
    expect(snapshot.weaknesses[0]!.evidence).toBe("modern and clean");
  });

  it("retries once when the response omits a dimension, then fails cleanly", async () => {
    const calls = stubProvider(() =>
      responseWith(
        validEvaluationPayload(60, (payload) => {
          (payload.dimensions as unknown[]).pop();
        }),
      ),
    );

    await expect(analyzePrompt(ANALYZE_INPUT)).rejects.toMatchObject({
      code: "invalid_response",
      retryable: false,
    });
    expect(calls).toHaveLength(2);
    const retryPrompt = ((calls[1] as { contents: Array<{ parts: Array<{ text: string }> }> }).contents[0]!.parts[0]!)
      .text;
    expect(retryPrompt).toMatch(/did not satisfy the required structure/i);
  });

  it("recovers when the retry returns a valid payload", async () => {
    let attempt = 0;
    const calls = stubProvider(() => {
      attempt += 1;
      if (attempt === 1) return { text: "I cannot produce JSON right now." };
      return responseWith(validEvaluationPayload(81));
    });

    const snapshot = await analyzePrompt(ANALYZE_INPUT);
    expect(calls).toHaveLength(2);
    expect(snapshot.overallScore).toBe(81);
  });

  it("rejects an empty provider response without inventing scores", async () => {
    stubProvider(() => ({ text: "   " }));
    await expect(analyzePrompt(ANALYZE_INPUT)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("normalises provider failures and never leaks the raw message", async () => {
    stubProvider(providerFailure(429, "Resource exhausted for project 12345"));
    const error = await analyzePrompt(ANALYZE_INPUT).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).code).toBe("rate_limit");
    expect((error as AiError).message).not.toContain("12345");
  });

  it("treats a rejected key as a configuration problem, not a user error", async () => {
    stubProvider(providerFailure(403, "API key not valid. Please pass a valid API key."));
    const error = await analyzePrompt(ANALYZE_INPUT).catch((thrown: unknown) => thrown);
    expect((error as AiError).code).toBe("missing_api_key");
    expect((error as AiError).retryable).toBe(false);
  });

  it("classifies an unavailable model as a provider error", async () => {
    stubProvider(providerFailure(404, "models/gemini-9-not-real is not found"));
    const error = await analyzePrompt(ANALYZE_INPUT).catch((thrown: unknown) => thrown);
    expect((error as AiError).code).toBe("provider_error");
  });

  it("generates prompts from the provider and marks the source as live", async () => {
    const calls = stubProvider(() =>
      responseWith({
        title: "Calm churn dashboard",
        prompt: "# Calm churn dashboard\n\n## Objective\nDesign a calm analytics dashboard for operations leads.\n\n## Composition\nOne 12-column grid with an 8px spacing rhythm and a single focal metric.",
        explanation: "A structured brief for a calm analytics dashboard.",
        sections: [
          { heading: "Objective", content: "Design a calm analytics dashboard." },
          { heading: "Composition", content: "One 12-column grid." },
        ],
        assumptions: ["Typography was not specified."],
        recommendations: ["Confirm the palette."],
      }),
    );

    const generated = await generatePrompt({
      category: "ui_ux",
      objective: "Design a calm analytics dashboard for a subscription operations team.",
      audience: "Operations leads",
      context: "Weekly churn review",
      visualPreferences: ["Minimalist"],
      outputRequirements: ["Desktop dashboard"],
      constraints: ["Responsive"],
      sliders: defaultSliders,
    });

    expect(calls).toHaveLength(1);
    expect(generated.source).toBe("live");
    expect(generated.title).toBe("Calm churn dashboard");
    expect(generated.prompt).toMatch(/^# Calm churn dashboard/);
    expect(generated.sections).toHaveLength(2);
  });

  it("improves a prompt from the provider and marks the source as live", async () => {
    stubProvider(() =>
      responseWith({
        improvedPrompt:
          "## Objective\nDesign a calm analytics dashboard for operations leads.\n\n## Constraints\nResponsive, WCAG AA, keyboard focus rings.",
        summary: "The objective was made explicit and constraints were grouped.",
        changes: [
          { dimension: "clarity", change: "Stated the objective as one sentence.", reason: "It was implied." },
        ],
        preservedRequirements: ["Calm analytics dashboard"],
        assumptions: [],
        remainingLimitations: [],
      }),
    );

    const improvement = await improvePrompt({
      originalPrompt: ANALYZE_INPUT.prompt,
      category: "ui_ux",
      rubricVersion: "visual-uiux-v1",
      priorities: ["Clarity", "Nonsense dimension"],
      additionalInstructions: "",
    });

    expect(improvement.source).toBe("live");
    expect(improvement.changes).toHaveLength(1);
    expect(improvement.preservedRequirements).toContain("Calm analytics dashboard");
  });

  it("drops priority labels that are not real dimensions before prompting the model", async () => {
    const calls = stubProvider(() =>
      responseWith({
        improvedPrompt: "## Objective\nDesign a calm analytics dashboard for operations leads, clearly structured.",
        summary: "Tightened the opening.",
        changes: [{ dimension: "structure", change: "Grouped sections.", reason: "Readability." }],
        preservedRequirements: [],
        assumptions: [],
        remainingLimitations: [],
      }),
    );

    await improvePrompt({
      originalPrompt: ANALYZE_INPUT.prompt,
      category: "ui_ux",
      rubricVersion: "visual-uiux-v1",
      priorities: ["Clarity", "Vibes", "Nonsense dimension"],
      additionalInstructions: "",
    });

    const prompt = ((calls[0] as { contents: Array<{ parts: Array<{ text: string }> }> }).contents[0]!.parts[0]!)
      .text;
    expect(prompt).toContain("Clarity");
    expect(prompt).not.toContain("Vibes");
    expect(prompt).not.toContain("Nonsense dimension");
  });
});

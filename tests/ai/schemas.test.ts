import { describe, expect, it } from "vitest";
import { evaluationResponseSchema, hasAllDimensions, toGeminiJsonSchema } from "@/lib/ai/schemas";
import { evaluationDimensions } from "@/config/evaluation-rubric";

function validEvaluation() {
  return {
    summary: "A clear objective with a thin visual direction.",
    dimensions: evaluationDimensions.map((dimension) => ({
      key: dimension.key,
      score: 60,
      explanation: `${dimension.label} is described but needs more detail.`,
    })),
    strengths: [{ title: "Clear objective", description: "The intended output is identified." }],
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
}

describe("evaluationResponseSchema", () => {
  it("accepts a well-formed evaluation", () => {
    expect(evaluationResponseSchema.safeParse(validEvaluation()).success).toBe(true);
  });

  it("rejects a response that omits a dimension", () => {
    const partial = validEvaluation();
    partial.dimensions = partial.dimensions.slice(0, 7);
    expect(evaluationResponseSchema.safeParse(partial).success).toBe(false);
  });

  it("rejects out-of-range and non-integer dimension scores", () => {
    const tooHigh = validEvaluation();
    tooHigh.dimensions[0]!.score = 101;
    expect(evaluationResponseSchema.safeParse(tooHigh).success).toBe(false);

    const fractional = validEvaluation();
    fractional.dimensions[1]!.score = 60.5;
    expect(evaluationResponseSchema.safeParse(fractional).success).toBe(false);
  });

  it("rejects an unknown dimension key", () => {
    const unknown = validEvaluation();
    unknown.dimensions[0]!.key = "vibes" as never;
    expect(evaluationResponseSchema.safeParse(unknown).success).toBe(false);
  });

  it("rejects an invalid severity", () => {
    const invalid = validEvaluation();
    invalid.weaknesses[0]!.severity = "critical" as never;
    expect(evaluationResponseSchema.safeParse(invalid).success).toBe(false);
  });

  it("does not require an overall score, because the server calculates it", () => {
    const withoutTotal = validEvaluation();
    expect(withoutTotal).not.toHaveProperty("overallScore");
    expect(evaluationResponseSchema.safeParse(withoutTotal).success).toBe(true);
  });
});

describe("hasAllDimensions", () => {
  it("accepts exactly one entry per dimension", () => {
    expect(hasAllDimensions(evaluationResponseSchema.parse(validEvaluation()))).toBe(true);
  });

  it("rejects duplicate dimension keys", () => {
    const duplicated = evaluationResponseSchema.parse({
      ...validEvaluation(),
      dimensions: Array.from({ length: 8 }, () => ({
        key: "clarity" as const,
        score: 50,
        explanation: "Same dimension repeated for every slot.",
      })),
    });
    expect(hasAllDimensions(duplicated)).toBe(false);
  });
});

describe("toGeminiJsonSchema", () => {
  it("drops keywords the provider does not support", () => {
    const schema = toGeminiJsonSchema(evaluationResponseSchema);
    const serialized = JSON.stringify(schema);

    expect(serialized).not.toContain("$schema");
    expect(serialized).not.toContain("minLength");
    expect(serialized).not.toContain("maxLength");
    expect(serialized).not.toContain("propertyNames");
  });

  it("keeps the structure the provider needs to constrain the response", () => {
    const schema = toGeminiJsonSchema(evaluationResponseSchema) as {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };

    expect(schema.type).toBe("object");
    expect(Object.keys(schema.properties ?? {})).toEqual(
      expect.arrayContaining([
        "summary",
        "dimensions",
        "strengths",
        "weaknesses",
        "missingInformation",
        "contradictions",
        "recommendations",
      ]),
    );
    expect(schema.required).toContain("dimensions");
  });

  it("preserves enum constraints for severity", () => {
    const serialized = JSON.stringify(toGeminiJsonSchema(evaluationResponseSchema));
    expect(serialized).toContain('"low"');
    expect(serialized).toContain('"medium"');
    expect(serialized).toContain('"high"');
  });
});

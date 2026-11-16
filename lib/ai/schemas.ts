import { z } from "zod";
import { dimensionKeys } from "@/config/evaluation-rubric";
import { CATEGORY_IDS } from "@/config/domains";

export const dimensionKeySchema = z.enum([
  "clarity",
  "context",
  "specificity",
  "visual_direction",
  "composition",
  "typography",
  "constraints",
  "output_definition",
]);

const scoreSchema = z
  .number({ message: "Scores must be numbers." })
  .int("Scores must be whole numbers.")
  .min(0, "Scores cannot be below 0.")
  .max(100, "Scores cannot exceed 100.");

export const generationResponseSchema = z.object({
  title: z.string().trim().min(2).max(160),
  prompt: z.string().trim().min(80),
  explanation: z.string().trim().min(8).max(1200),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().min(2).max(90),
        content: z.string().trim().min(2).max(4000),
      }),
    )
    .min(2)
    .max(40),
  assumptions: z.array(z.string().trim().min(2).max(500)).max(12),
  recommendations: z.array(z.string().trim().min(2).max(500)).max(12),
});

const dimensionEntrySchema = z.object({
  key: dimensionKeySchema,
  score: scoreSchema,
  explanation: z.string().trim().min(4).max(900),
});

export const evaluationResponseSchema = z.object({
  summary: z.string().trim().min(8).max(1500),
  dimensions: z.array(dimensionEntrySchema).min(8).max(8),
  strengths: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(120),
        description: z.string().trim().min(4).max(600),
      }),
    )
    .max(8),
  weaknesses: z
    .array(
      z.object({
        dimension: dimensionKeySchema,
        severity: z.enum(["low", "medium", "high"]),
        problem: z.string().trim().min(4).max(600),
        evidence: z.string().trim().max(400).optional(),
        suggestion: z.string().trim().min(4).max(600),
      }),
    )
    .max(10),
  missingInformation: z.array(z.string().trim().min(2).max(200)).max(10),
  contradictions: z.array(z.string().trim().min(2).max(400)).max(6),
  recommendations: z.array(z.string().trim().min(4).max(400)).max(10),
});

const briefTextSchema = z.string().trim().min(1).max(500);

export const discoveryResponseSchema = z.object({
  summary: z.string().trim().min(8).max(1400),
  objective: z.string().trim().min(8).max(700),
  category: z.enum(CATEGORY_IDS),
  categoryReason: z.string().trim().max(500),
  categoryConfidence: scoreSchema,
  complexity: z.enum(["simple", "moderate", "complex"]),
  explicitRequirements: z.array(briefTextSchema).max(14),
  constraints: z.array(briefTextSchema).max(12),
  missingInformation: z.array(briefTextSchema).max(14),
  ambiguities: z.array(briefTextSchema).max(10),
  technicalConsiderations: z.array(briefTextSchema).max(10),
  nextQuestion: z
    .object({
      question: z.string().trim().min(5).max(320),
      why: z.string().trim().max(500),
      options: z.array(z.string().trim().min(1).max(140)).max(6),
      target: z.string().trim().min(2).max(90),
    })
    .nullable(),
  recommendation: z
    .object({
      recommendation: z.string().trim().min(4).max(600),
      rationale: z.string().trim().max(700),
      tradeoffs: z.array(z.string().trim().min(1).max(400)).max(5),
    })
    .nullable(),
  enoughInformation: z.boolean(),
  brief: z.object({
    title: z.string().trim().min(1).max(160),
    sections: z
      .array(
        z.object({
          heading: z.string().trim().min(1).max(90),
          content: z.string().trim().max(3000),
          source: z.enum(["user", "assumption", "recommendation"]),
        }),
      )
      .min(1)
      .max(24),
    assumptions: z.array(briefTextSchema).max(14),
    unknowns: z.array(briefTextSchema).max(14),
  }),
});

export const improvementResponseSchema = z.object({
  improvedPrompt: z.string().trim().min(80),
  summary: z.string().trim().min(8).max(1200),
  changes: z
    .array(
      z.object({
        dimension: z.enum([
          "clarity",
          "context",
          "specificity",
          "visual_direction",
          "composition",
          "typography",
          "constraints",
          "output_definition",
          "structure",
        ]),
        change: z.string().trim().min(4).max(400),
        reason: z.string().trim().min(4).max(400),
      }),
    )
    .min(1)
    .max(12),
  preservedRequirements: z.array(z.string().trim().min(2).max(300)).max(10),
  assumptions: z.array(z.string().trim().min(2).max(400)).max(8),
  remainingLimitations: z.array(z.string().trim().min(2).max(400)).max(8),
});

export type GenerationResponse = z.infer<typeof generationResponseSchema>;
export type EvaluationResponse = z.infer<typeof evaluationResponseSchema>;
export type ImprovementResponse = z.infer<typeof improvementResponseSchema>;
export type DiscoveryResponse = z.infer<typeof discoveryResponseSchema>;

/** Confirms all eight dimensions appear exactly once. */
export function hasAllDimensions(response: EvaluationResponse) {
  const keys = new Set(response.dimensions.map((entry) => entry.key));
  return dimensionKeys.every((key) => keys.has(key)) && keys.size === dimensionKeys.length;
}

/**
 * Gemini's structured output supports a documented subset of JSON Schema.
 * Drop keywords outside that subset instead of failing the request.
 */
export function toGeminiJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return cleanJsonSchema(schema, new Set([
    "$schema",
    "propertyNames",
    "minLength",
    "maxLength",
    "pattern",
    "default",
    "examples",
    "format",
  ]));
}

/**
 * OpenAI-compatible `response_format` accepts JSON Schema, but gateways vary.
 * The adapter still treats a schema rejection as a recoverable condition.
 */
export function toOpenAiJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return cleanJsonSchema(
    schema,
    new Set(["$schema", "examples", "format", "propertyNames"]),
  );
}

function cleanJsonSchema(schema: z.ZodType, unsupported: Set<string>): Record<string, unknown> {
  const generated = z.toJSONSchema(schema, {
    target: "draft-7",
    io: "output",
    unrepresentable: "any",
  }) as Record<string, unknown>;

  const clean = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(clean);
    if (node && typeof node === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (unsupported.has(key)) continue;
        result[key] = clean(value);
      }
      return result;
    }
    return node;
  };

  return clean(generated) as Record<string, unknown>;
}

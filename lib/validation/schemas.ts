import { z } from "zod";
import { PROMPT_LIMITS } from "@/config/app";
import { CATEGORY_IDS } from "@/config/domains";
import { sliderDefinitions } from "@/config/presets";

export const categorySchema = z.enum(CATEGORY_IDS);

export const promptDepthSchema = z.enum(["concise", "balanced", "detailed", "comprehensive"]);

export const targetAgentSchema = z.enum([
  "general",
  "coding",
  "design",
  "research",
  "automation",
  "writing",
  "custom",
]);

export const complexitySchema = z.enum(["simple", "moderate", "complex"]);

export const sliderValueSchema = z
  .number({ message: "Slider values must be numbers." })
  .int("Slider values must be whole numbers.")
  .min(0, "Slider values cannot be below 0.")
  .max(100, "Slider values cannot exceed 100.");

const sliderShape = Object.fromEntries(
  sliderDefinitions.map((definition) => [definition.key, sliderValueSchema]),
) as {
  [K in (typeof sliderDefinitions)[number]["key"]]: typeof sliderValueSchema;
};

export const slidersSchema = z.object(sliderShape);

export const briefSourceSchema = z.enum(["user", "assumption", "recommendation"]);

export const briefSectionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  heading: z.string().trim().min(1).max(90),
  content: z.string().trim().max(4000, "Keep a brief section under 4000 characters.").default(""),
  source: briefSourceSchema,
});

export const projectBriefSchema = z.object({
  title: z.string().trim().min(1).max(160),
  objective: z.string().trim().min(8, "Describe the objective in at least 8 characters.").max(1200),
  summary: z.string().trim().max(2000).default(""),
  category: categorySchema,
  complexity: complexitySchema,
  sections: z.array(briefSectionSchema).min(1).max(28),
  assumptions: z.array(z.string().trim().min(1).max(500)).max(16).default([]),
  unknowns: z.array(z.string().trim().min(1).max(500)).max(16).default([]),
  confirmedAt: z.string().trim().max(40).optional(),
});

export const promptConfigurationSchema = z.object({
  category: categorySchema,
  objective: z
    .string()
    .trim()
    .min(12, "Describe the objective in at least 12 characters.")
    .max(1200, "Keep the objective under 1200 characters."),
  audience: z.string().trim().max(400, "Keep the audience under 400 characters.").default(""),
  context: z
    .string()
    .trim()
    .max(3000, "Keep the context under 3000 characters.")
    .default(""),
  visualPreferences: z.array(z.string().trim().min(1).max(80)).max(10, "Choose up to 10 visual preferences.").default([]),
  outputRequirements: z
    .array(z.string().trim().min(1).max(80))
    .max(8, "Choose up to 8 output requirements.")
    .default([]),
  constraints: z.array(z.string().trim().min(1).max(160)).max(12, "Choose up to 12 constraints.").default([]),
  sliders: slidersSchema,
  depth: promptDepthSchema.optional(),
  targetAgent: targetAgentSchema.optional(),
  brief: projectBriefSchema.optional(),
});

export const generateRequestSchema = z.object({
  configuration: promptConfigurationSchema,
});

export const promptTextSchema = z
  .string()
  .trim()
  .min(PROMPT_LIMITS.min, `Enter at least ${PROMPT_LIMITS.min} characters so the prompt can be evaluated.`)
  .max(PROMPT_LIMITS.max, `Prompts are limited to ${PROMPT_LIMITS.max} characters.`);

export const analyzeRequestSchema = z.object({
  prompt: promptTextSchema,
  title: z.string().trim().max(160).optional(),
  category: categorySchema,
  rubricVersion: z.string().trim().min(1).max(64),
});

export const improvementChangeSchema = z.object({
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
  change: z.string().trim().min(1).max(400),
  reason: z.string().trim().min(1).max(400),
});

export const improveRequestSchema = z.object({
  originalPrompt: promptTextSchema,
  category: categorySchema,
  rubricVersion: z.string().trim().min(1).max(64),
  priorities: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  additionalInstructions: z.string().trim().max(800, "Keep additional instructions under 800 characters.").default(""),
  analysis: z
    .object({
      overallScore: z.number().min(0).max(100),
      summary: z.string().max(2000).default(""),
      weaknesses: z
        .array(
          z.object({
            dimension: z.string().max(40),
            severity: z.enum(["low", "medium", "high"]),
            problem: z.string().max(600),
            suggestion: z.string().max(600),
          }),
        )
        .max(12)
        .default([]),
      dimensions: z.record(z.string().max(40), z.number().min(0).max(100)).default({}),
    })
    .optional(),
});

export const discoveryAnswerSchema = z.object({
  questionId: z.string().trim().min(1).max(100),
  question: z.string().trim().min(1).max(400),
  answer: z.string().trim().max(1500).default(""),
  status: z.enum(["answered", "unknown", "skipped"]),
});

export const discoveryRequestSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(3, "Describe your idea in at least 3 characters.")
    .max(2000, "Keep the idea under 2000 characters so it can be understood in one pass."),
  category: categorySchema.optional(),
  answers: z.array(discoveryAnswerSchema).max(24).default([]),
  budget: z.number().int().min(3).max(12).optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type ImproveRequest = z.infer<typeof improveRequestSchema>;
export type DiscoveryRequest = z.infer<typeof discoveryRequestSchema>;

export function firstIssue(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "form";
    if (!result[path]) result[path] = issue.message;
  }
  return result;
}

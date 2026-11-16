import { z } from "zod";
import { PROMPT_LIMITS } from "@/config/app";
import { sliderDefinitions } from "@/config/presets";

export const categorySchema = z.enum(["ui_ux", "visual_design"]);

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

export const promptConfigurationSchema = z.object({
  category: categorySchema,
  objective: z
    .string()
    .trim()
    .min(12, "Describe the objective in at least 12 characters.")
    .max(600, "Keep the objective under 600 characters."),
  audience: z.string().trim().max(240, "Keep the audience under 240 characters.").default(""),
  context: z
    .string()
    .trim()
    .max(1500, "Keep the context under 1500 characters.")
    .default(""),
  visualPreferences: z.array(z.string().trim().min(1).max(60)).max(10, "Choose up to 10 visual preferences.").default([]),
  outputRequirements: z
    .array(z.string().trim().min(1).max(60))
    .max(8, "Choose up to 8 output requirements.")
    .default([]),
  constraints: z.array(z.string().trim().min(1).max(120)).max(12, "Choose up to 12 constraints.").default([]),
  sliders: slidersSchema,
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
  priorities: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
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

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type ImproveRequest = z.infer<typeof improveRequestSchema>;

export function firstIssue(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "form";
    if (!result[path]) result[path] = issue.message;
  }
  return result;
}

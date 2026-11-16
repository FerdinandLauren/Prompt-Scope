import "server-only";
import { callStructured } from "@/lib/ai/provider";
import { generationResponseSchema } from "@/lib/ai/schemas";
import { buildGenerationInstruction, buildGenerationPrompt } from "@/lib/ai/prompts";
import { demoGenerate } from "@/lib/ai/demo/generate";
import { getAiStatus } from "@/lib/ai/client";
import type { GeneratedPrompt, PromptConfiguration } from "@/types/prompt";

export async function generatePrompt(configuration: PromptConfiguration): Promise<GeneratedPrompt> {
  const status = getAiStatus();

  if (status.mode === "demo") {
    return demoGenerate(configuration);
  }

  const { data } = await callStructured({
    systemInstruction: buildGenerationInstruction(),
    userPrompt: buildGenerationPrompt(configuration),
    schema: generationResponseSchema,
    temperature: 0.7,
    maxOutputTokens: 4096,
    label: "generate",
  });

  return {
    title: data.title,
    category: configuration.category,
    prompt: data.prompt,
    explanation: data.explanation,
    sections: data.sections,
    assumptions: data.assumptions,
    recommendations: data.recommendations,
    source: "live",
  };
}

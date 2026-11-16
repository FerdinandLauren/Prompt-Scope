import "server-only";
import { callStructured } from "@/lib/ai/provider";
import { generationResponseSchema } from "@/lib/ai/schemas";
import { buildGenerationInstruction, buildGenerationPrompt } from "@/lib/ai/prompts";
import { demoGenerate } from "@/lib/ai/demo/generate";
import { getAiStatus } from "@/lib/ai/client";
import type { GeneratedPrompt, PromptConfiguration } from "@/types/prompt";
import type { PromptDepth } from "@/types/guided";

const tokensByDepth: Record<PromptDepth, number> = {
  concise: 2_560,
  balanced: 4_096,
  detailed: 6_144,
  comprehensive: 8_192,
};

export async function generatePrompt(
  configuration: PromptConfiguration,
  browserApiKey?: string,
): Promise<GeneratedPrompt> {
  const status = getAiStatus(browserApiKey);

  if (status.mode === "demo") {
    return demoGenerate(configuration);
  }

  const depth = configuration.depth ?? "balanced";
  const targetAgent = configuration.targetAgent ?? "general";

  const { data } = await callStructured(
    {
      systemInstruction: buildGenerationInstruction(configuration.category, depth, targetAgent),
      userPrompt: buildGenerationPrompt(configuration),
      schema: generationResponseSchema,
      temperature: 0.6,
      maxOutputTokens: tokensByDepth[depth],
      label: "generate",
    },
    browserApiKey,
  );

  return {
    title: data.title,
    category: configuration.category,
    prompt: data.prompt,
    explanation: data.explanation,
    sections: data.sections,
    assumptions: data.assumptions,
    recommendations: data.recommendations,
    source: "live",
    depth,
    targetAgent,
  };
}

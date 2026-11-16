import "server-only";
import { buildDraftPrompt } from "@/lib/prompt/draft";
import type { GeneratedPrompt, PromptConfiguration } from "@/types/prompt";

/**
 * Demo generation reuses the deterministic, structured draft composer. It is
 * real composed text derived from the user's configuration, but it is not a
 * model response and the UI labels it as demo data.
 */
export function demoGenerate(configuration: PromptConfiguration): GeneratedPrompt {
  const draft = buildDraftPrompt(configuration);

  return {
    ...draft,
    source: "demo",
    explanation: `${draft.explanation} Demo Mode composed this structure locally: the same sections a live model writes, with no request sent to any provider.`,
    recommendations: [
      ...draft.recommendations,
      "Add a Gemini API key to generate a tailored prompt from the same configuration.",
    ].slice(0, 6),
  };
}

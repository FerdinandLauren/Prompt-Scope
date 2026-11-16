import "server-only";
import type { AiModelSummary } from "@/types/ai";
import type { ResolvedProvider } from "@/lib/ai/providers/config";
import type { GeneratedText, StructuredOutcome, TokenUsage } from "@/lib/ai/structured";
import type { z } from "zod";

export type AdapterCall = {
  provider: ResolvedProvider;
  model: string;
  systemInstruction: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  label: string;
  thinkingLevel?: "LOW" | "HIGH";
  timeoutMs: number;
};

export type AdapterStreamCall = Omit<AdapterCall, "temperature" | "maxOutputTokens"> & {
  temperature?: number;
  maxOutputTokens?: number;
};

export type AiProviderAdapter = {
  generateText(call: AdapterCall): Promise<GeneratedText>;
  generateStructured<T>(
    call: AdapterCall,
    schema: z.ZodType<T>,
    validate?: (data: T) => string | null,
  ): Promise<StructuredOutcome<T>>;
  /** Confirms the key and model with the smallest call the provider offers. */
  verify(call: Omit<AdapterCall, "systemInstruction" | "userPrompt" | "label" | "temperature">): Promise<{
    model: string;
    slow?: boolean;
    busy?: boolean;
  }>;
  listModels(provider: ResolvedProvider, timeoutMs: number): Promise<AiModelSummary[]>;
  streamText?(call: AdapterStreamCall): AsyncGenerator<string>;
};

export type { TokenUsage };

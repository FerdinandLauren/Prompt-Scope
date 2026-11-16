export type KeySource = "environment" | "browser" | "none";

export type AiMode = "live" | "demo";

export type AiStatus = {
  mode: AiMode;
  model: string | null;
  configured: boolean;
  source: KeySource;
};

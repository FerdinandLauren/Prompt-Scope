import type { AiStatus } from "@/types/settings";

export type KeySourceDescription = {
  label: string;
  tone: "live" | "demo" | "browser";
  detail: string;
};

/**
 * Copy for the mode badge, Settings and documentation. It describes where the
 * active key comes from; it never contains the key.
 */
export function describeKeySource(status: AiStatus): KeySourceDescription {
  if (status.source === "browser") {
    return {
      label: "Live AI mode",
      tone: "browser",
      detail: "Using the API key saved in this browser. The server key, if any, is not used for your requests.",
    };
  }

  if (status.source === "environment") {
    return {
      label: "Live AI mode",
      tone: "live",
      detail: "Using the server-side environment key. This is the recommended configuration.",
    };
  }

  return {
    label: "Demo mode",
    tone: "demo",
    detail: "No API key is configured, so prompts are evaluated locally by the rule engine.",
  };
}

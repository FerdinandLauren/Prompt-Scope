"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/api/client";

export type AiStatus = {
  mode: "live" | "demo";
  model: string | null;
  configured: boolean;
};

const FALLBACK: AiStatus = { mode: "demo", model: null, configured: false };

export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getJson<AiStatus>("/api/ai/status", controller.signal).then((result) => {
      if (!active) return;
      setStatus(result.ok ? result.data : FALLBACK);
      setLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return { status, loading };
}

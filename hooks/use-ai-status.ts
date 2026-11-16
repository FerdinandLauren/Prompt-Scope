"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/api/client";

export type AiStatus = {
  mode: "live" | "demo";
  model: string | null;
  configured: boolean;
};

const FALLBACK: AiStatus = { mode: "demo", model: null, configured: false };

// One shared request per page load, no matter how many badges are mounted.
let statusPromise: Promise<AiStatus> | null = null;

function loadStatus(): Promise<AiStatus> {
  if (!statusPromise) {
    statusPromise = getJson<AiStatus>("/api/ai/status").then((result) =>
      result.ok ? result.data : FALLBACK,
    );
  }
  return statusPromise;
}

export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    let active = true;
    loadStatus().then((next) => {
      if (active) setStatus(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return { status: status ?? FALLBACK, loading: status === null };
}

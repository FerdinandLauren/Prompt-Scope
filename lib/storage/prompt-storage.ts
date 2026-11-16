"use client";

import type { EvaluationSnapshot, PromptImprovement } from "@/types/evaluation";
import type { PromptConfiguration, PromptVersion, PromptVersionSource } from "@/types/prompt";
import type { PromptSession, SessionSummary } from "@/types/history";

const KEY = "promptscope.sessions.v1";
const MAX_SESSIONS = 50;
const EVENT = "promptscope:sessions";

const EMPTY: PromptSession[] = [];
let cachedRaw: string | null = null;
let cachedSessions: PromptSession[] = EMPTY;

function isSnapshot(value: unknown): value is EvaluationSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EvaluationSnapshot>;
  return typeof candidate.overallScore === "number" && typeof candidate.rubricVersion === "string";
}

function isVersion(value: unknown): value is PromptVersion {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PromptVersion>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.promptText === "string" &&
    typeof candidate.versionNumber === "number"
  );
}

function isSession(value: unknown): value is PromptSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PromptSession>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    Array.isArray(candidate.versions) &&
    candidate.versions.some(isVersion)
  );
}

function parse(raw: string | null): PromptSession[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const sessions = (parsed.filter(isSession) as PromptSession[]).map((session) => ({
      ...session,
      versions: session.versions.filter(isVersion).map((version) => ({
        ...version,
        evaluation: isSnapshot(version.evaluation) ? version.evaluation : undefined,
      })),
    }));
    return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return EMPTY;
  }
}

export function sessionsSnapshot(): PromptSession[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedSessions;

  cachedRaw = raw;
  const next = parse(raw);
  cachedSessions = next.length > 0 ? next : EMPTY;
  return cachedSessions;
}

function persist(sessions: PromptSession[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage may be full or blocked; the caller surfaces a message.
    throw new Error("The local workspace could not be written to.");
  }
}

export function subscribeToSessions(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function listSessions(): PromptSession[] {
  return sessionsSnapshot();
}

export function getSession(id: string): PromptSession | null {
  return sessionsSnapshot().find((session) => session.id === id) ?? null;
}

export function summariseSession(session: PromptSession): SessionSummary {
  const latest = session.versions.find((version) => version.id === session.currentVersionId) ?? session.versions[0];
  return {
    id: session.id,
    title: session.title,
    category: session.category,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    versionCount: session.versions.length,
    latestScore: latest?.evaluation?.overallScore ?? null,
    latestVersionId: latest?.id ?? "",
    hasComparison: Boolean(session.lastComparison),
  };
}

export function listSessionSummaries(): SessionSummary[] {
  return sessionsSnapshot().map(summariseSession);
}

type CreateArgs = {
  title: string;
  category: string;
  promptText: string;
  source: PromptVersionSource;
  label?: string;
  configuration?: PromptConfiguration;
  evaluation?: EvaluationSnapshot;
};

export function createSession(args: CreateArgs): PromptSession {
  const now = new Date().toISOString();
  const version: PromptVersion = {
    id: crypto.randomUUID(),
    versionNumber: 1,
    promptText: args.promptText,
    createdAt: now,
    source: args.source,
    label: args.label,
    configuration: args.configuration,
    evaluation: args.evaluation,
  };

  const session: PromptSession = {
    id: crypto.randomUUID(),
    title: args.title,
    category: args.category,
    createdAt: now,
    updatedAt: now,
    currentVersionId: version.id,
    versions: [version],
    configuration: args.configuration,
  };

  try {
    persist([session, ...sessionsSnapshot()]);
  } catch (error) {
    throw error instanceof Error ? error : new Error("The session could not be saved.");
  }
  return session;
}

type AddVersionArgs = {
  sessionId: string;
  promptText: string;
  source: PromptVersionSource;
  label?: string;
  evaluation?: EvaluationSnapshot;
  configuration?: PromptConfiguration;
  comparison?: {
    originalVersionId: string;
    improvedVersionId: string;
    original: EvaluationSnapshot;
    improved: EvaluationSnapshot;
    improvement: PromptImprovement | null;
  };
};

export function addVersion(args: AddVersionArgs): PromptSession {
  const sessions = sessionsSnapshot();
  const session = sessions.find((item) => item.id === args.sessionId);
  if (!session) throw new Error("That session no longer exists.");

  const nextNumber = session.versions.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1;
  const version: PromptVersion = {
    id: crypto.randomUUID(),
    versionNumber: nextNumber,
    promptText: args.promptText,
    createdAt: new Date().toISOString(),
    source: args.source,
    label: args.label,
    configuration: args.configuration,
    evaluation: args.evaluation,
  };

  const updated: PromptSession = {
    ...session,
    currentVersionId: version.id,
    updatedAt: version.createdAt,
    versions: [...session.versions, version],
    configuration: args.configuration ?? session.configuration,
    lastComparison: args.comparison ?? session.lastComparison,
  };

  persist(sessions.map((item) => (item.id === updated.id ? updated : item)));
  return updated;
}

export function setVersionEvaluation(sessionId: string, versionId: string, evaluation: EvaluationSnapshot) {
  const sessions = sessionsSnapshot();
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return null;

  const updated: PromptSession = {
    ...session,
    updatedAt: new Date().toISOString(),
    versions: session.versions.map((version) =>
      version.id === versionId ? { ...version, evaluation } : version,
    ),
  };

  persist(sessions.map((item) => (item.id === updated.id ? updated : item)));
  return updated;
}

export function updateVersionText(sessionId: string, versionId: string, promptText: string, label?: string) {
  const sessions = sessionsSnapshot();
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return null;

  const updated: PromptSession = {
    ...session,
    updatedAt: new Date().toISOString(),
    versions: session.versions.map((version) =>
      version.id === versionId
        ? {
            ...version,
            promptText,
            label: label ?? version.label,
            // Editing invalidates the stored evaluation for this version only.
            evaluation: promptText === version.promptText ? version.evaluation : undefined,
          }
        : version,
    ),
  };

  persist(sessions.map((item) => (item.id === updated.id ? updated : item)));
  return updated;
}

export function updateSessionTitle(sessionId: string, title: string) {
  const sessions = sessionsSnapshot();
  const updated = sessions.map((session) =>
    session.id === sessionId ? { ...session, title, updatedAt: new Date().toISOString() } : session,
  );
  persist(updated);
}

export function setCurrentVersion(sessionId: string, versionId: string) {
  const sessions = sessionsSnapshot();
  const updated = sessions.map((session) =>
    session.id === sessionId
      ? { ...session, currentVersionId: versionId, updatedAt: new Date().toISOString() }
      : session,
  );
  persist(updated);
}

export function deleteVersion(sessionId: string, versionId: string) {
  const sessions = sessionsSnapshot();
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  if (session.versions.length <= 1) throw new Error("A session must keep at least one version.");

  const remaining = session.versions.filter((version) => version.id !== versionId);
  const updated: PromptSession = {
    ...session,
    versions: remaining,
    currentVersionId:
      session.currentVersionId === versionId
        ? (remaining.at(-1)?.id ?? remaining[0]!.id)
        : session.currentVersionId,
    updatedAt: new Date().toISOString(),
  };

  persist(sessions.map((item) => (item.id === updated.id ? updated : item)));
  return updated;
}

export function deleteSession(sessionId: string) {
  persist(sessionsSnapshot().filter((session) => session.id !== sessionId));
}

export function clearSessions() {
  persist([]);
}

export function duplicateSessionAsNew(session: PromptSession): PromptSession {
  const now = new Date().toISOString();
  const versions = session.versions.map((version) => ({ ...version, id: crypto.randomUUID() }));
  const clone: PromptSession = {
    id: crypto.randomUUID(),
    title: `${session.title} (copy)`,
    category: session.category,
    createdAt: now,
    updatedAt: now,
    currentVersionId: versions.at(-1)!.id,
    versions,
    configuration: session.configuration,
  };
  persist([clone, ...sessionsSnapshot()]);
  return clone;
}

export function exportSessions() {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), sessions: sessionsSnapshot() }, null, 2);
}

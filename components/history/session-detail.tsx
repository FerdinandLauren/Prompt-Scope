"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getScoreBand } from "@/config/evaluation-rubric";
import { cn, formatDate, relativeDate, truncate } from "@/lib/utils";
import type { PromptSession } from "@/types/history";
import type { EvaluationSnapshot } from "@/types/evaluation";

const sourceTone: Record<string, "neutral" | "demo" | "live" | "positive"> = {
  generated: "positive",
  improved: "live",
  manual: "neutral",
  restored: "demo",
};

export function EvaluationDetailsInline({ evaluation }: { evaluation: EvaluationSnapshot }) {
  const band = getScoreBand(evaluation.overallScore);
  return (
    <div className="mt-3 rounded-[7px] border border-line bg-bg-raised px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[24px] leading-none tracking-[-0.04em] text-ink">
          {evaluation.overallScore}
        </span>
        <Badge tone={band.tone}>{band.label}</Badge>
        <Badge tone={evaluation.source === "live" ? "live" : "demo"}>
          {evaluation.source === "live" ? "Live model" : "Demo data"}
        </Badge>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
          {evaluation.rubricVersion} · {formatDate(evaluation.createdAt, "long")}
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-[1.6] text-ink-2">{evaluation.summary}</p>

      <div className="mt-3 border-t border-line-soft pt-2.5">
        <h4 className="mono-label">Dimensions</h4>
        <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {evaluation.dimensionDetails.map((dimension) => (
            <li key={dimension.key} className="flex items-center gap-2">
              <span className="w-[92px] shrink-0 text-[11.5px] text-ink-2">{dimension.label}</span>
              <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#232a31]">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${dimension.score}%`,
                    background:
                      dimension.score >= 80
                        ? "var(--green)"
                        : dimension.score >= 60
                          ? "var(--amber)"
                          : dimension.score >= 40
                            ? "var(--orange)"
                            : "var(--red)",
                  }}
                />
              </span>
              <span className="w-6 text-right font-mono text-[11px] tabular text-ink">{dimension.score}</span>
            </li>
          ))}
        </ul>
      </div>

      {evaluation.weaknesses.length > 0 ? (
        <div className="mt-3 border-t border-line-soft pt-2.5">
          <h4 className="mono-label">Reported weaknesses</h4>
          <ul className="mt-2 space-y-2">
            {evaluation.weaknesses.slice(0, 4).map((weakness, index) => (
              <li key={`${weakness.dimension}-${index}`} className="flex items-start gap-2">
                <Badge tone={weakness.severity === "high" ? "high" : weakness.severity === "medium" ? "medium" : "low"}>
                  {weakness.severity}
                </Badge>
                <span className="text-[11.5px] leading-[1.55] text-ink-2">
                  <span className="text-ink">{weakness.dimension.replace(/_/g, " ")}:</span> {weakness.problem}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {evaluation.missingInformation.length > 0 ? (
        <div className="mt-3 border-t border-line-soft pt-2.5">
          <h4 className="mono-label">Missing information</h4>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {evaluation.missingInformation.map((item) => (
              <li
                key={item}
                className="rounded-[3px] border border-line px-1.5 py-0.5 text-[10.5px] text-ink-2"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function SavePromptDialog({
  open,
  onClose,
  defaultTitle,
  category,
  versionCount,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  defaultTitle: string;
  category: string;
  versionCount: number;
  onSave: (title: string) => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [error, setError] = useState<string | undefined>();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save to history"
      description="Sessions and versions are stored in this browser only. Nothing is uploaded."
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass({ variant: "ghost", size: "md" })}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (title.trim().length < 2) {
                setError("Give the prompt a title of at least 2 characters.");
                return;
              }
              onSave(title.trim());
            }}
            className={buttonClass({ variant: "primary", size: "md" })}
          >
            Save prompt
          </button>
        </>
      }
    >
      <label htmlFor="session-title" className="mb-2 block text-[12px] font-medium text-ink-2">
        Prompt title
      </label>
      <input
        id="session-title"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          setError(undefined);
        }}
        maxLength={120}
        className="h-9 w-full rounded-[6px] border border-line bg-bg-raised px-3 text-[13px] text-ink focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/15"
      />
      {error ? (
        <p className="mt-1.5 text-[11px] text-[#f0a1a5]" role="alert">
          {error}
        </p>
      ) : null}
      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-line bg-line">
        <div className="bg-bg px-3 py-2.5">
          <dt className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-3">Category</dt>
          <dd className="mt-1 text-[12px] text-ink-2">{category}</dd>
        </div>
        <div className="bg-bg px-3 py-2.5">
          <dt className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-3">Versions</dt>
          <dd className="mt-1 font-mono text-[12px] text-ink-2">{versionCount}</dd>
        </div>
      </dl>
    </Modal>
  );
}

export function SessionDetail({
  session,
  onClose,
  onDelete,
  onSetCurrent,
  onRestore,
  onDeleteVersion,
  onRenameVersion,
  onAnalyze,
  onSaveEditedVersion,
  onCompareVersions,
}: {
  session: PromptSession;
  onClose: () => void;
  onDelete: () => void;
  onSetCurrent: (versionId: string) => void;
  onRestore: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onRenameVersion: (versionId: string, label: string) => void;
  onAnalyze: (promptText: string, title: string, versionId: string) => void;
  onSaveEditedVersion: (promptText: string, basedOnVersion: number) => void;
  onCompareVersions: (originalVersionId: string, improvedVersionId: string) => void;
}) {
  const { showToast } = useToast();
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const versions = [...session.versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const currentVersion = session.versions.find((version) => version.id === session.currentVersionId) ?? versions[0];

  // Compare against the current version when it carries an evaluation, otherwise
  // against the most recent evaluated version so any evaluated pair is comparable.
  const referenceVersion = currentVersion?.evaluation
    ? currentVersion
    : versions.find((version) => version.evaluation);

  return (
    <Modal
      open
      onClose={onClose}
      width="lg"
      title={truncate(session.title, 70)}
      description={`${session.versions.length} version${session.versions.length === 1 ? "" : "s"} · created ${formatDate(
        session.createdAt,
        "long",
      )}`}
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              onDelete();
              showToast("Session deleted from local history.", "info");
            }}
            className={buttonClass({ variant: "danger", size: "md" })}
          >
            <Trash2 size={13} aria-hidden="true" />
            Delete session
          </button>
          <button type="button" onClick={onClose} className={buttonClass({ variant: "secondary", size: "md" })}>
            Close
          </button>
        </>
      }
    >
      <ol className="space-y-3">
        {versions.map((version) => {
          const isCurrent = version.id === session.currentVersionId;
          const evaluation = version.evaluation;
          return (
            <li
              key={version.id}
              className={cn(
                "rounded-[8px] border px-4 py-3.5",
                isCurrent ? "border-[#5a402b] bg-[#1a1510]" : "border-line bg-bg",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] tabular text-ink">v{version.versionNumber}</span>
                  <Badge tone={sourceTone[version.source] ?? "neutral"}>{version.source}</Badge>
                  {isCurrent ? <Badge tone="medium">Current</Badge> : null}
                  <span className="text-[11px] text-ink-3">{relativeDate(version.createdAt)}</span>
                  {version.label ? <span className="text-[11px] text-ink-2">{version.label}</span> : null}
                </div>
                <div className="flex items-center gap-2">
                  {evaluation ? (
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[13px] tabular text-ink">{evaluation.overallScore}</span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                        {getScoreBand(evaluation.overallScore).label}
                      </span>
                    </span>
                  ) : (
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                      Not evaluated
                    </span>
                  )}
                </div>
              </div>

              <pre className="mt-2.5 max-h-[180px] overflow-auto whitespace-pre-wrap font-mono text-[11.5px] leading-[1.7] text-ink-2">
                {version.promptText}
              </pre>

              {renameId === version.id ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`rename-${version.id}`}>
                    Version label
                  </label>
                  <input
                    id={`rename-${version.id}`}
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    maxLength={80}
                    placeholder="Version label"
                    className="h-8 min-w-[180px] flex-1 rounded-[5px] border border-line bg-bg-raised px-2.5 text-[12px] text-ink focus:border-orange focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onRenameVersion(version.id, renameValue.trim());
                      setRenameId(null);
                    }}
                    className={buttonClass({ variant: "primary", size: "sm" })}
                  >
                    Save label
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenameId(null)}
                    className={buttonClass({ variant: "ghost", size: "sm" })}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}

              {editId === version.id ? (
                <div className="mt-3">
                  <label htmlFor={`edit-${version.id}`} className="mb-1.5 block text-[11px] text-ink-3">
                    Edit this prompt. Saving creates a new version and keeps v{version.versionNumber} unchanged.
                  </label>
                  <textarea
                    id={`edit-${version.id}`}
                    value={editValue}
                    onChange={(event) => setEditValue(event.target.value)}
                    rows={6}
                    className="w-full resize-y rounded-[6px] border border-line bg-bg-raised px-3 py-2.5 font-mono text-[11.5px] leading-[1.7] text-ink focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/15"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (editValue.trim().length < 24) {
                          showToast("The edited prompt needs at least 24 characters.", "error");
                          return;
                        }
                        onSaveEditedVersion(editValue, version.versionNumber);
                        setEditId(null);
                      }}
                      className={buttonClass({ variant: "primary", size: "sm" })}
                    >
                      Save as new version
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className={buttonClass({ variant: "ghost", size: "sm" })}
                    >
                      Cancel editing
                    </button>
                  </div>
                </div>
              ) : null}

              {detailsId === version.id && evaluation ? (
                <EvaluationDetailsInline evaluation={evaluation} />
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard
                      ?.writeText(version.promptText)
                      .then(() => showToast(`Version ${version.versionNumber} copied.`))
                      .catch(() => showToast("Could not access the clipboard.", "error"));
                  }}
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => onAnalyze(version.promptText, `${session.title} v${version.versionNumber}`, version.id)}
                  className={buttonClass({ variant: "secondary", size: "sm" })}
                >
                  Analyze this version
                </button>
                {evaluation ? (
                  <button
                    type="button"
                    onClick={() => setDetailsId(detailsId === version.id ? null : version.id)}
                    aria-expanded={detailsId === version.id}
                    className={buttonClass({ variant: "secondary", size: "sm" })}
                  >
                    {detailsId === version.id ? "Hide evaluation" : "View evaluation"}
                  </button>
                ) : null}
                {evaluation && referenceVersion?.evaluation && version.id !== referenceVersion.id ? (
                  <button
                    type="button"
                    onClick={() => onCompareVersions(version.id, referenceVersion.id)}
                    className={buttonClass({ variant: "ghost", size: "sm" })}
                  >
                    Compare with v{referenceVersion.versionNumber}
                    {referenceVersion.id === currentVersion?.id ? "" : " (latest evaluated)"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setEditId(version.id);
                    setEditValue(version.promptText);
                  }}
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  Edit as new version
                </button>
                {!isCurrent ? (
                  <button
                    type="button"
                    onClick={() => onSetCurrent(version.id)}
                    className={buttonClass({ variant: "ghost", size: "sm" })}
                  >
                    Set as current
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRestore(version.id)}
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  Restore as new version
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenameId(version.id);
                    setRenameValue(version.label ?? "");
                  }}
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  Label
                </button>
                {session.versions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteVersion(version.id);
                      showToast(`Version ${version.versionNumber} deleted.`, "info");
                    }}
                    className={buttonClass({ variant: "ghost", size: "sm", className: "text-[#f0a1a5]" })}
                  >
                    <X size={12} aria-hidden="true" />
                    Delete version
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Modal>
  );
}

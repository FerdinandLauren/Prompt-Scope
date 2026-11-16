"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { getEvaluationDimensions } from "@/config/evaluation-rubric";
import type { DimensionKey, EvaluationSnapshot } from "@/types/evaluation";
import { cn } from "@/lib/utils";

type ChartDatum = {
  key: DimensionKey;
  axis: string;
  label: string;
  original?: number;
  improved?: number;
  single?: number;
};

function buildData(
  snapshots: Array<{ series: "original" | "improved" | "single"; snapshot: EvaluationSnapshot }>,
  category?: string,
) {
  return getEvaluationDimensions(category).map<ChartDatum>((dimension) => {
    const datum: ChartDatum = {
      key: dimension.key,
      axis: dimension.short,
      label: dimension.label,
    };

    for (const entry of snapshots) {
      const score = entry.snapshot.dimensions[dimension.key as DimensionKey] ?? 0;
      if (entry.series === "original") datum.original = score;
      if (entry.series === "improved") datum.improved = score;
      if (entry.series === "single") datum.single = score;
    }

    return datum;
  });
}

export function ScopeRadar({
  original,
  improved,
  single,
  category,
  height = 380,
  className,
  compact = false,
}: {
  original?: EvaluationSnapshot;
  improved?: EvaluationSnapshot;
  single?: EvaluationSnapshot;
  category?: string;
  height?: number;
  className?: string;
  compact?: boolean;
}) {
  const series = [
    ...(original ? [{ series: "original" as const, snapshot: original }] : []),
    ...(improved ? [{ series: "improved" as const, snapshot: improved }] : []),
    ...(single ? [{ series: "single" as const, snapshot: single }] : []),
  ];

  const data = buildData(series, category);
  const showLegend = Boolean(original || improved);

  return (
    <div className={cn("w-full", className)}>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={data}
            margin={{ top: 18, right: 42, bottom: 18, left: 42 }}
            outerRadius={compact ? "60%" : "64%"}
          >
            <PolarGrid stroke="var(--line)" strokeWidth={1} radialLines />
            <PolarAngleAxis
              dataKey="axis"
              tick={{
                fill: "var(--ink-3)",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
              }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={6} />

            {original ? (
              <Radar
                name="Original"
                dataKey="original"
                stroke="var(--rose)"
                strokeWidth={1.25}
                strokeDasharray="4 4"
                fill="var(--rose)"
                fillOpacity={0.06}
                isAnimationActive
                animationDuration={380}
              />
            ) : null}

            {improved ? (
              <Radar
                name="Improved"
                dataKey="improved"
                stroke="var(--orange)"
                strokeWidth={1.5}
                fill="var(--orange)"
                fillOpacity={0.12}
                isAnimationActive
                animationDuration={380}
              />
            ) : null}

            {single ? (
              <Radar
                name="Score"
                dataKey="single"
                stroke="var(--orange)"
                strokeWidth={1.5}
                fill="var(--orange)"
                fillOpacity={0.12}
                isAnimationActive
                animationDuration={380}
              />
            ) : null}

            <Tooltip
              content={({ payload, label }) => {
                if (!payload?.length) return null;
                const datum = payload[0]?.payload as ChartDatum | undefined;
                return (
                  <div className="rounded-[5px] border border-line bg-surface px-3 py-2 shadow-[0_8px_24px_var(--shadow-soft)]">
                    <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                      {datum?.label ?? label}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {payload.map((entry) => (
                        <div key={String(entry.dataKey)} className="flex items-center gap-2 text-[11px]">
                          <span
                            className="h-[2px] w-3 rounded-full"
                            style={{ background: entry.color }}
                            aria-hidden="true"
                          />
                          <span className="text-ink-3">{entry.name}</span>
                          <span className="ml-auto font-mono tabular text-ink">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {showLegend ? (
        <div className="mt-2 flex items-center justify-center gap-5">
          <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
            <span className="h-[2px] w-4 rounded-full bg-rose" aria-hidden="true" />
            Original
          </span>
          <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
            <span className="h-[2px] w-4 rounded-full bg-orange" aria-hidden="true" />
            Improved
          </span>
        </div>
      ) : null}
    </div>
  );
}

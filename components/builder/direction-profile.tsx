"use client";

import type { PromptSliders, SliderKey } from "@/types/prompt";
import { sliderDefinitions } from "@/config/presets";

/**
 * A compact eight-axis profile of the focus sliders. It mirrors the aperture
 * mark's axis language so the builder and the analyzer share one visual system.
 */
export function DirectionProfile({
  sliders,
  size = 168,
  compare,
}: {
  sliders: PromptSliders;
  size?: number;
  compare?: PromptSliders;
}) {
  const center = 100;
  const radius = 74;

  const point = (value: number, index: number, scale = 1) => {
    const angle = (index * Math.PI) / 4 - Math.PI / 2;
    const distance = (value / 100) * radius * scale;
    return [center + Math.cos(angle) * distance, center + Math.sin(angle) * distance] as const;
  };

  const polygon = (values: PromptSliders) =>
    sliderDefinitions
      .map((definition, index) => point(values[definition.key as SliderKey], index).join(","))
      .join(" ");

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className="overflow-visible"
      role="img"
      aria-label={`Direction profile: ${sliderDefinitions
        .map((definition) => `${definition.label} ${sliders[definition.key as SliderKey]}`)
        .join(", ")}`}
    >
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          points={sliderDefinitions
            .map((_, index) => point(100, index, ring).join(","))
            .join(" ")}
          fill="none"
          stroke="var(--line)"
          strokeWidth="0.75"
        />
      ))}

      {sliderDefinitions.map((definition, index) => {
        const [x, y] = point(100, index);
        return <line key={definition.key} x1={center} y1={center} x2={x} y2={y} stroke="var(--line-soft)" strokeWidth="0.75" />;
      })}

      {compare ? (
        <polygon points={polygon(compare)} fill="none" stroke="var(--rose)" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
      ) : null}

      <polygon points={polygon(sliders)} fill="color-mix(in srgb, var(--orange) 12%, transparent)" stroke="var(--orange)" strokeWidth="1.25" />

      {sliderDefinitions.map((definition, index) => {
        const [x, y] = point(sliders[definition.key as SliderKey], index);
        return <circle key={definition.key} cx={x} cy={y} r="1.9" fill="var(--orange)" />;
      })}

      {sliderDefinitions.map((definition, index) => {
        const [x, y] = point(100, index, 1.16);
        return (
          <text
            key={definition.key}
            x={x}
            y={y}
            textAnchor={x > center + 4 ? "start" : x < center - 4 ? "end" : "middle"}
            dominantBaseline="middle"
            fill="var(--ink-3)"
            style={{ fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            {definition.label.split(" ")[0]}
          </text>
        );
      })}
    </svg>
  );
}

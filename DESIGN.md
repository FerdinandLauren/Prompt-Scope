# DESIGN.md — PromptScope

## Direction

**An optical instrument for language.** PromptScope should feel like a calibrated analysis instrument in a quiet studio: dark, precise, editorial, and warm at the point of measurement. The visual idea comes from the product's name — a scope — not from generic "AI dashboard" chrome.

- Data is the light. Warm orange marks the current measurement; muted rose marks the earlier state.
- Technical metadata behaves like instrument markings: small, monospaced, aligned, never decorative noise.
- Structure comes from hairlines, alignment, and negative space — not from wrapping every section in a card.
- Futuristic means exact, not neon. No glow storms, no glass everywhere, no gradient decoration.

## Signature element

The **aperture mark**: a circle with eight radial ticks (one per evaluation dimension), a fine crosshair, and a warm arc for the current score. It appears as the logo, the dashboard instrument, score rings, and the chart's axis language. It is the one memorable device; everything around it stays disciplined.

## Palette

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0B0C0E` | page ground |
| `--bg-raised` | `#101216` | quiet section ground |
| `--surface` | `#14171B` | panel surface |
| `--surface-2` | `#191D22` | elevated control |
| `--line` | `#292E34` | structural hairline |
| `--line-soft` | `#1F2429` | internal rule |
| `--ink` | `#F2F3F5` | primary text |
| `--ink-2` | `#A0A6AE` | secondary text |
| `--ink-3` | `#686F78` | metadata / disabled |
| `--orange` | `#FF9B54` | current measurement, primary action |
| `--amber` | `#F2C879` | scores, demo marker |
| `--rose` | `#E98DB2` | original series, secondary highlight |
| `--green` | `#65C99A` | resolved / positive |
| `--red` | `#E4777D` | negative / high severity |

Colour budget: under ~5% of a screen. Orange is reserved for the primary action and the current data series. Status colour always ships with a text label.

## Type

- **Display:** Space Grotesk 500/600. Page titles, the dashboard statement, large scores. Tight tracking at large sizes (`-0.03em`).
- **Body:** Inter 400/500. Interface copy, descriptions, inputs. Measures stay under 74ch.
- **Technical:** JetBrains Mono 400/500. Scores, dimensions, dates, IDs, slider values, metadata labels. Uppercase only for short technical tags, never long sentences.
- Scale: 12 / 13 / 14 / 16 / 18 / 24 / 32 / 44 / clamp(48–78). Line heights: 1.1 display, 1.55 body.

## Layout

- Desktop: 248px fixed sidebar; content column max 1440px with 48px gutters. Asymmetry where useful: a 7/5 split for hero and analysis, a 6/6 builder.
- Tablet: 208px rail; gutters 32px; grids collapse to 1 column below 960px.
- Mobile: compact top bar and bottom navigation, 20px gutters, 44px touch targets, single column. Charts resize rather than overflow.
- Spacing rhythm: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. More space above a heading than below it.
- Radii: 6px controls, 10px panels, 999px only for status dots and score rings. No universal pill/card language.

## Components

- **Buttons:** 38px default, 6px radius, 1px border; primary is warm orange with near-black text. Press feedback at pointer-down. Loading replaces the label with a measured progress line, not a spinning novelty.
- **Inputs:** flat surface, 1px line, orange focus ring at 2px offset; error text beneath, never colour alone.
- **Sliders:** thin 2px track, 12px thumb with a fine outer ring, value in mono on the right, preset row above. Keyboard accessible via native range input.
- **Panels:** one hairline border, no shadow. Section headers use a short mono label and a rule to the edge.
- **Lists/tables:** rules and alignment; numeric columns right-aligned and tabular; no zebra stripes.
- **Weaknesses:** indexed rows with severity text tags (`HIGH`, `MEDIUM`, `LOW`) and evidence set in a quieter mono block.
- **Charts:** thin 1px lines, faint radial grid, 0–100 fixed scale, original = dashed rose, improved = solid orange with 10% fill. Tooltip is a plain bordered box. Text scores always accompany the chart.

## Motion

- One authored entrance per page: content is visible by default; the result/score reveals with a 220–320ms opacity + 8px rise. No scattered section animations.
- UI transitions: 150–220ms, `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out). No `ease-in`.
- Slider feedback is immediate; no transition on the value.
- Chart series transition 300–400ms because the data itself changed.
- `prefers-reduced-motion`: remove translation, keep short opacity/colour changes. Hover motion gated behind `(hover: hover) and (pointer: fine)`.

## Copy

Plain, specific, calm. Controls name their action ("Generate prompt", "Analyze prompt", "Improve & re-evaluate"). Errors name the problem and the recovery. Empty states invite the next action. No fake productivity claims, no "unlock the power" language. Scores are "model-assisted diagnostics", not universal truth.

## Accessibility floor

- Keyboard-operable controls with visible focus.
- Contrast: body/secondary ≥ 4.5:1; large text ≥ 3:1.
- Every chart has a textual dimension table.
- Severity and status always have words.
- Native range inputs for sliders; labelled textareas.
- Reduced motion respected; no horizontal overflow at 360px.

## Avoid

Generic sidebar + KPI cards, icons in tinted circles, hero metrics with sparklines, gradient washes, glowing borders, glassmorphism, pill buttons everywhere, all-caps eyebrow above every heading, random accent colours, oversized empty cards, and motion added for its own sake.

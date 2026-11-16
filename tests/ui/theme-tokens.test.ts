import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");

function blockFor(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) return {};
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const tokens: Record<string, string> = {};
  for (const match of body.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[match[1]!] = match[2]!;
  }
  return tokens;
}

const dark = blockFor(":root {");
const light = blockFor('[data-theme="light"] {');

function channel(value: number) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

const REQUIRED_TOKENS = [
  "bg",
  "bg-raised",
  "surface",
  "surface-2",
  "line",
  "line-soft",
  "ink",
  "ink-2",
  "ink-3",
  "orange",
  "orange-hover",
  "amber",
  "rose",
  "green",
  "red",
  "on-accent",
  "danger-text",
  "danger-bg",
  "danger-border",
  "warn-bg",
  "warn-border",
  "ok-bg",
  "ok-border",
  "accent-bg",
  "accent-border",
  "line-strong",
  "track",
  "track-strong",
  "bar",
  "bar-hover",
];

describe("theme token blocks", () => {
  it("defines the dark palette on :root", () => {
    expect(Object.keys(dark).length).toBeGreaterThan(20);
    expect(dark.bg).toBeTruthy();
  });

  it("defines a light palette that is genuinely light", () => {
    expect(Object.keys(light).length).toBeGreaterThan(20);
    expect(luminance(light.bg!)).toBeGreaterThan(0.6);
    expect(luminance(dark.bg!)).toBeLessThan(0.05);
  });

  it("defines every semantic token in both themes", () => {
    for (const token of REQUIRED_TOKENS) {
      expect(dark[token], `dark --${token}`).toBeTruthy();
      expect(light[token], `light --${token}`).toBeTruthy();
    }
  });

  it("sets color-scheme per theme", () => {
    expect(css).toMatch(/color-scheme:\s*dark/);
    expect(css).toMatch(/color-scheme:\s*light/);
  });
});

describe("contrast floor", () => {
  const pairs: Array<[string, string, number]> = [
    ["ink", "bg", 7],
    ["ink-2", "bg", 4.5],
    ["ink-3", "bg", 4.5],
    ["ink-3", "surface", 4.5],
    ["ink-3", "bg-raised", 4.5],
    ["on-accent", "orange", 4.5],
    ["danger-text", "danger-bg", 4.5],
    ["green", "ok-bg", 4.5],
    ["amber", "warn-bg", 4.5],
    ["rose", "bg", 4.5],
    ["red", "bg", 4.5],
    ["orange", "bg", 4.5],
  ];

  for (const [foreground, background, minimum] of pairs) {
    it(`${foreground} on ${background} is at least ${minimum}:1 in both themes`, () => {
      const darkRatio = contrast(dark[foreground]!, dark[background]!);
      const lightRatio = contrast(light[foreground]!, light[background]!);
      expect(darkRatio, `dark ${foreground}/${background} = ${darkRatio.toFixed(2)}`).toBeGreaterThanOrEqual(
        minimum,
      );
      expect(
        lightRatio,
        `light ${foreground}/${background} = ${lightRatio.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(minimum);
    });
  }
});

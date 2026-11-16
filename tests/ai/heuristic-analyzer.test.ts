import { describe, expect, it } from "vitest";
import { heuristicEvaluate, heuristicWordCount } from "@/lib/ai/analyzer/heuristic";
import { evaluationDimensions } from "@/config/evaluation-rubric";
import { calculateOverallScore } from "@/lib/scoring/calculate-score";

const WEAK = "Design a modern dashboard for our app. It should look clean and professional, and use nice colors.";

const MID =
  "Design a modern minimalist dashboard for a fintech app. Use a dark interface with warm accent colours and a clear visual hierarchy. It should be responsive.";

const STRONG = `Objective: design a landing page for a subscription analytics product that helps operations teams review weekly churn.

Audience: operations leads at B2B SaaS companies with 200-2000 employees. They are data-literate and sceptical of marketing claims.

Visual direction: editorial and restrained. Deep charcoal background, warm orange used only for one primary action and the single highlighted metric.

Composition: a strong left-aligned headline block in the first viewport with the product panel on the right. One consistent 12-column grid, spacing rhythm in 8px steps, section padding 96px on desktop.

Typography: one grotesk family. Headline at 56px with tight tracking, body at 16px with 1.6 line height and a 68 character measure, metadata in a monospace face at 11px uppercase.

Constraints: responsive down to 360px wide, WCAG AA contrast for all text, keyboard-focusable controls with visible focus rings, avoid carousels, avoid auto-playing motion.

Output requirements: return the page structure section by section with the copy written out, then a short rationale for the hierarchy decisions.`;

const evaluate = (prompt: string) =>
  heuristicEvaluate({ prompt, category: "ui_ux", rubricVersion: "visual-uiux-v1" });

describe("heuristicEvaluate", () => {
  it("returns all eight dimensions within 0–100", () => {
    for (const prompt of [WEAK, MID, STRONG]) {
      const snapshot = evaluate(prompt);
      expect(snapshot.dimensionDetails).toHaveLength(8);
      expect(snapshot.dimensionDetails.map((dimension) => dimension.key)).toEqual(
        evaluationDimensions.map((dimension) => dimension.key),
      );
      for (const dimension of snapshot.dimensionDetails) {
        expect(Number.isInteger(dimension.score)).toBe(true);
        expect(dimension.score).toBeGreaterThanOrEqual(0);
        expect(dimension.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("calculates the overall score from the dimensions, matching the shared formula", () => {
    const snapshot = evaluate(STRONG);
    expect(snapshot.overallScore).toBe(calculateOverallScore(snapshot.dimensions));
  });

  it("is deterministic for identical input", () => {
    const first = evaluate(STRONG);
    const second = evaluate(STRONG);
    expect(first.dimensions).toEqual(second.dimensions);
    expect(first.overallScore).toBe(second.overallScore);
  });

  it("ranks a structured prompt above a vague one", () => {
    const weak = evaluate(WEAK).overallScore;
    const mid = evaluate(MID).overallScore;
    const strong = evaluate(STRONG).overallScore;

    expect(weak).toBeLessThan(mid);
    expect(mid).toBeLessThan(strong);
    expect(weak).toBeLessThan(40);
    expect(strong).toBeGreaterThan(60);
  });

  it("penalises brevity rather than rewarding it", () => {
    const short = evaluate("Design a dashboard.");
    const long = evaluate(STRONG);
    expect(short.overallScore).toBeLessThan(long.overallScore);
    expect(heuristicWordCount("one two three")).toBe(3);
  });

  it("never returns a perfect score for a repeated signal alone", () => {
    const repeated = evaluate(`Design design design design. Must must must. Layout layout layout layout.`);
    for (const dimension of repeated.dimensionDetails) {
      expect(dimension.score).toBeLessThan(100);
    }
  });

  it("only reports a weakness for what is genuinely absent", () => {
    const snapshot = evaluate(STRONG);
    const visual = snapshot.weaknesses.find((weakness) => weakness.dimension === "visual_direction");
    if (visual) {
      // Style and colour are present in the prompt, so the weakness must not claim they are missing.
      expect(visual.problem).not.toMatch(/no coherent visual direction/i);
    }
    const typography = snapshot.weaknesses.find((weakness) => weakness.dimension === "typography");
    expect(typography).toBeUndefined();
  });

  it("only attaches evidence that exists in the prompt", () => {
    const noVagueWords = evaluate(STRONG);
    for (const weakness of noVagueWords.weaknesses) {
      expect(weakness.evidence).toBeUndefined();
    }
  });

  it("detects contradictions that are actually present", () => {
    const contradictory = evaluate(
      "Create a brand page that feels minimalist and quiet, but also maximalist and richly decorated.",
    );
    expect(contradictory.contradictions.length).toBeGreaterThan(0);
    expect(contradictory.contradictions[0]).toMatch(/minimal/i);

    expect(evaluate(STRONG).contradictions).toHaveLength(0);
  });

  it("lists the information the prompt does not provide", () => {
    const snapshot = evaluate(WEAK);
    expect(snapshot.missingInformation).toContain("Typography requirements");
    expect(snapshot.missingInformation).toContain("Accessibility requirements");
    expect(evaluate(STRONG).missingInformation).toHaveLength(0);
  });

  it("records severity bands that match the reported score", () => {
    const snapshot = evaluate(WEAK);
    for (const weakness of snapshot.weaknesses) {
      const dimension = snapshot.dimensionDetails.find((item) => item.key === weakness.dimension);
      expect(dimension).toBeDefined();
      if (dimension!.score < 40) expect(weakness.severity).toBe("high");
      else if (dimension!.score < 58) expect(weakness.severity).toBe("medium");
      else expect(weakness.severity).toBe("low");
    }
  });

  it("labels every result as demo data with a rubric version and fingerprint", () => {
    const snapshot = evaluate(STRONG);
    expect(snapshot.source).toBe("demo");
    expect(snapshot.rubricVersion).toBe("visual-uiux-v1");
    expect(snapshot.promptHash).toMatch(/^[0-9a-f]{8}$/);
    expect(snapshot.model).toBeUndefined();
  });

  it("produces explanations for every dimension", () => {
    const snapshot = evaluate(MID);
    for (const dimension of snapshot.dimensionDetails) {
      expect(dimension.explanation.length).toBeGreaterThan(10);
      expect(dimension.label).toBeTruthy();
    }
    expect(snapshot.summary).toMatch(/demo/i);
  });
});

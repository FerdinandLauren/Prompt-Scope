import { describe, expect, it } from "vitest";
import { heuristicEvaluate } from "@/lib/ai/analyzer/heuristic";

// A long but vague brief: it has enough length to avoid the brevity penalty and
// plenty of undefined adjectives, so the evidence path is exercised.
const LONG_VAGUE = `Please design something nice and modern for our project. Make it look professional and clean,
with a good layout and pleasant colours and a nice feel overall.

It should be premium and modern and clean and look great. Make sure the whole thing feels nice and professional.
Add good spacing and a nice type treatment. Keep everything clean and modern and professional and pleasant.`;

const STRONG = `Objective: design a landing page for a subscription analytics product that helps operations teams review weekly churn.

Audience: operations leads at B2B SaaS companies with 200-2000 employees.

Visual direction: editorial and restrained. Deep charcoal background, warm orange used only for one primary action.

Composition: one consistent 12-column grid, spacing rhythm in 8px steps, section padding 96px on desktop.

Typography: one grotesk family. Headline at 56px with tight tracking, body at 16px with a 68 character measure.

Constraints: responsive down to 360px wide, WCAG AA contrast for all text, keyboard-focusable controls.

Output requirements: return the page structure section by section with the copy written out.`;

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

describe("weakness evidence", () => {
  it("never reports a weakness for a well-specified prompt without a real gap", () => {
    const snapshot = heuristicEvaluate({
      prompt: STRONG,
      category: "ui_ux",
      rubricVersion: "visual-uiux-v1",
    });
    for (const weakness of snapshot.weaknesses) {
      expect(weakness.problem.length).toBeGreaterThan(20);
      expect(weakness.suggestion.length).toBeGreaterThan(20);
      // Style and colour are present, so no weakness may claim they are absent.
      expect(weakness.problem).not.toMatch(/no coherent visual direction/i);
      expect(weakness.problem).not.toMatch(/typography is not addressed/i);
    }
  });

  it("quotes vague wording from the prompt, verbatim, when it cites evidence", () => {
    const snapshot = heuristicEvaluate({
      prompt: LONG_VAGUE,
      category: "ui_ux",
      rubricVersion: "visual-uiux-v1",
    });

    const withEvidence = snapshot.weaknesses.filter((weakness) => weakness.evidence);
    expect(withEvidence.length).toBeGreaterThan(0);

    for (const weakness of withEvidence) {
      const needle = collapse(weakness.evidence!.replace(/…/g, ""));
      expect(collapse(LONG_VAGUE)).toContain(needle);
      expect(weakness.evidence!.length).toBeLessThan(200);
    }
  });

  it("attaches no evidence when the prompt contains no vague wording", () => {
    const snapshot = heuristicEvaluate({
      prompt: STRONG,
      category: "ui_ux",
      rubricVersion: "visual-uiux-v1",
    });
    for (const weakness of snapshot.weaknesses) {
      expect(weakness.evidence).toBeUndefined();
    }
  });

  it("describes a detected-but-thin dimension without claiming the signal is missing", () => {
    const snapshot = heuristicEvaluate({
      prompt: `Objective: design a landing page. Audience: marketing leads. Use a warm palette.
Composition: 12-column grid with 8px spacing. Constraints: responsive and WCAG AA compliant.
Output: return the page section by section.`,
      category: "ui_ux",
      rubricVersion: "visual-uiux-v1",
    });

    for (const weakness of snapshot.weaknesses) {
      // Either it names what is absent, or it says the instructions are thin.
      expect(weakness.problem).toMatch(/does not address|not addressed|remain thin|does not provide|no /i);
    }
  });
});

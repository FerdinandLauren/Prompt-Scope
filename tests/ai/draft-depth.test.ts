import { describe, expect, it } from "vitest";
import { buildDraftPrompt } from "@/lib/prompt/draft";
import { defaultSliders } from "@/config/presets";
import type { PromptConfiguration } from "@/types/prompt";
import type { ProjectBrief, PromptDepth, TargetAgentId } from "@/types/guided";

const brief: ProjectBrief = {
  title: "Support refund console",
  objective: "Give support agents one place to review and approve refund requests.",
  summary: "An internal console for a support team that handles refunds every day.",
  category: "backend",
  complexity: "moderate",
  sections: [
    { id: "audience", heading: "Target users", content: "Support agents handling 60 refunds a day", source: "user" },
    {
      id: "requirements",
      heading: "What it must do",
      content: "- List refund requests\n- Approve within role limits\n- Show decision history",
      source: "user",
    },
    {
      id: "constraints",
      heading: "Constraints",
      content: "- Must run on the existing Postgres instance\n- No external messaging provider",
      source: "user",
    },
    { id: "deliverables", heading: "Deliverables", content: "- API contract\n- Admin screen", source: "user" },
    { id: "assumption-1", heading: "Approval limits", content: "Refunds above 500 need manager approval", source: "assumption" },
  ],
  assumptions: ["Refunds above 500 need manager approval (assumption, not confirmed)"],
  unknowns: ["Which payment provider is authoritative"],
};

const baseConfiguration: PromptConfiguration = {
  category: "backend",
  objective: brief.objective,
  audience: "Support agents",
  context: brief.summary,
  visualPreferences: [],
  outputRequirements: [],
  constraints: [],
  sliders: defaultSliders,
  brief,
};

function withShape(depth: PromptDepth, targetAgent: TargetAgentId): PromptConfiguration {
  return { ...baseConfiguration, depth, targetAgent };
}

describe("draft composition by depth", () => {
  it("labels itself as a local draft rather than a model response", () => {
    const draft = buildDraftPrompt(withShape("balanced", "coding"));

    expect(draft.source).toBe("draft");
    expect(draft.explanation).toMatch(/not an AI response/i);
  });

  it("adds meaningful detail as depth increases without repeating sections", () => {
    const depths: PromptDepth[] = ["concise", "balanced", "detailed", "comprehensive"];
    const drafts = depths.map((depth) => buildDraftPrompt(withShape(depth, "general")));

    for (let index = 1; index < drafts.length; index += 1) {
      expect(drafts[index]!.prompt.length).toBeGreaterThan(drafts[index - 1]!.prompt.length);
    }

    for (const draft of drafts) {
      const headings = draft.sections.map((section) => section.heading);
      expect(new Set(headings).size).toBe(headings.length);
      expect(draft.prompt).toContain(brief.objective);
    }
  });

  it("keeps concise output focused and saves open questions for detailed work", () => {
    const concise = buildDraftPrompt(withShape("concise", "general"));
    const detailed = buildDraftPrompt(withShape("detailed", "general"));

    expect(concise.prompt).not.toContain("## Open Questions");
    expect(detailed.prompt).toContain("## Open Questions");
    expect(detailed.prompt).toContain("Which payment provider is authoritative");
    expect(detailed.prompt).toContain("## Uncertainty Policy");
  });

  it("carries assumptions as provisional in every depth", () => {
    for (const depth of ["concise", "balanced", "detailed", "comprehensive"] as PromptDepth[]) {
      const draft = buildDraftPrompt(withShape(depth, "general"));
      expect(draft.prompt).toContain("## Assumptions to Confirm");
      expect(draft.prompt).toMatch(/assumption|confirm/i);
      expect(draft.assumptions.join(" ")).toMatch(/assumption/i);
    }
  });

  it("uses the brief title and category on the draft", () => {
    const draft = buildDraftPrompt(withShape("balanced", "general"));

    expect(draft.title).toBe(brief.title);
    expect(draft.category).toBe("backend");
    expect(draft.depth).toBe("balanced");
  });
});

describe("draft composition by target agent", () => {
  it("gives coding agents inspection, planning, implementation, verification, and reporting sections", () => {
    const draft = buildDraftPrompt(withShape("comprehensive", "coding"));
    const headings = draft.sections.map((section) => section.heading).join(" | ").toLowerCase();

    expect(headings).toContain("repository inspection");
    expect(headings).toContain("implementation plan");
    expect(headings).toContain("implementation rules");
    expect(headings).toContain("verification");
    expect(headings).toContain("final report");
    expect(draft.targetAgent).toBe("coding");
  });

  it("tells coding agents not to commit, push, or deploy unless asked", () => {
    const draft = buildDraftPrompt(withShape("detailed", "coding"));
    const prompt = draft.prompt.toLowerCase();

    expect(prompt).toContain("commit");
    expect(prompt).toContain("push");
    expect(prompt).toContain("deploy");
    expect(prompt).toMatch(/unless explicitly|do not|never/);
  });

  it("adapts the working agreement to a design agent", () => {
    const draft = buildDraftPrompt(withShape("detailed", "design"));
    const prompt = draft.prompt.toLowerCase();

    expect(draft.targetAgent).toBe("design");
    expect(prompt).not.toContain("repository inspection");
    expect(prompt).toContain("## design process");
  });

  it("warns when a coding agent is paired with concise depth", () => {
    const draft = buildDraftPrompt(withShape("concise", "coding"));

    expect(draft.recommendations.join(" ")).toMatch(/coding agents usually need detailed/i);
  });

  it("falls back to a family-appropriate agent when none is supplied", () => {
    const draft = buildDraftPrompt({ ...baseConfiguration, depth: undefined, targetAgent: undefined });

    expect(draft.targetAgent).toBeTruthy();
    expect(draft.depth).toBeTruthy();
  });
});

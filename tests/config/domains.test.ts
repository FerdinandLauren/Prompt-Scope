import { describe, expect, it } from "vitest";
import {
  CATEGORY_IDS,
  agentProfiles,
  categories,
  categoryGroups,
  getAgentProfile,
  getCategoriesByGroup,
  getCategory,
  getComplexityRecommendation,
  getDimension,
  getEvaluationDimensions,
  getPromptDepth,
  getPromptSections,
  getQuestionSeeds,
  getRubricVersion,
  promptDepths,
} from "@/config/domains";
import { dimensionKeys } from "@/config/evaluation-rubric";

describe("category taxonomy", () => {
  it("exposes exactly the twenty declared category ids", () => {
    expect(categories).toHaveLength(20);
    expect(categories.map((category) => category.id).sort()).toEqual([...CATEGORY_IDS].sort());
  });

  it("keeps ids and labels unique", () => {
    expect(new Set(categories.map((category) => category.id)).size).toBe(categories.length);
    expect(new Set(categories.map((category) => category.label)).size).toBe(categories.length);
  });

  it("places every category in a declared group with at least one member", () => {
    const groupIds = categoryGroups.map((group) => group.id);
    for (const category of categories) {
      expect(groupIds).toContain(category.group);
      expect(category.family).toBe(category.group);
    }
    for (const group of categoryGroups) {
      expect(getCategoriesByGroup(group.id).length).toBeGreaterThan(0);
    }
  });

  it("keeps the original design categories so stored history stays readable", () => {
    expect(getCategory("ui_ux").label).toBe("UI/UX Design");
    expect(getCategory("visual_design").label).toBe("Visual Design");
  });

  it("falls back to the first category for unknown ids", () => {
    expect(getCategory("not-a-category").id).toBe(categories[0]!.id);
  });

  it("gives every category an example idea and a description", () => {
    for (const category of categories) {
      expect(category.description.length).toBeGreaterThan(10);
      expect(category.exampleIdea.length).toBeGreaterThan(10);
      expect(category.shortLabel.length).toBeGreaterThan(0);
    }
  });
});

describe("rubric profiles", () => {
  const families: Record<string, string> = {
    design: "visual-uiux-v1",
    software: "software-v1",
    ai_data: "ai-data-v1",
    business: "business-v1",
    content: "content-v1",
  };

  it("maps each family to its own rubric version", () => {
    for (const category of categories) {
      expect(getRubricVersion(category.id)).toBe(families[category.family]);
    }
  });

  it("defaults to the design rubric when no category is supplied", () => {
    expect(getRubricVersion()).toBe("visual-uiux-v1");
  });

  it("returns the same eight axis keys for every category", () => {
    for (const category of categories) {
      const dimensions = getEvaluationDimensions(category.id);
      expect(dimensions).toHaveLength(8);
      expect(dimensions.map((dimension) => dimension.key).sort()).toEqual([...dimensionKeys].sort());
    }
  });

  it("renames the design-specific axes for software work without changing the keys", () => {
    const design = getEvaluationDimensions("ui_ux");
    const software = getEvaluationDimensions("backend");

    expect(getDimension("visual_direction", "ui_ux").label).toBe("Visual Direction");
    expect(getDimension("visual_direction", "backend").label).toBe("Architecture");
    expect(getDimension("typography", "backend").label).toBe("Security & Reliability");
    expect(getDimension("composition", "backend").label).toBe("Data & Services");

    expect(design.map((dimension) => dimension.key)).toEqual(software.map((dimension) => dimension.key));
    expect(design.find((dimension) => dimension.key === "visual_direction")!.label).not.toBe(
      software.find((dimension) => dimension.key === "visual_direction")!.label,
    );
  });

  it("keeps non-design axes such as clarity and specificity consistent", () => {
    expect(getDimension("clarity", "backend").label).toBe(getDimension("clarity", "ui_ux").label);
    expect(getDimension("specificity", "content_creation").label).toBe(
      getDimension("specificity", "ui_ux").label,
    );
  });

  it("gives every dimension description and scoring guidance", () => {
    for (const category of categories) {
      for (const dimension of getEvaluationDimensions(category.id)) {
        expect(dimension.description.length).toBeGreaterThan(20);
        expect(dimension.guidance.length).toBeGreaterThan(20);
      }
    }
  });
});

describe("prompt depth profiles", () => {
  it("offers the four documented depths in increasing order", () => {
    expect(promptDepths.map((depth) => depth.id)).toEqual(["concise", "balanced", "detailed", "comprehensive"]);
    for (let index = 1; index < promptDepths.length; index += 1) {
      expect(promptDepths[index]!.sectionLimit).toBeGreaterThan(promptDepths[index - 1]!.sectionLimit);
    }
  });

  it("falls back to balanced for unknown depth ids", () => {
    expect(getPromptDepth().id).toBe("balanced");
    expect(getPromptDepth("unknown").id).toBe("balanced");
    expect(getPromptDepth("comprehensive").id).toBe("comprehensive");
  });

  it("recommends depth from brief complexity", () => {
    expect(getComplexityRecommendation("simple")).toBe("balanced");
    expect(getComplexityRecommendation("moderate")).toBe("detailed");
    expect(getComplexityRecommendation("complex")).toBe("comprehensive");
  });
});

describe("target agent profiles", () => {
  it("covers the seven documented agent targets", () => {
    expect(agentProfiles.map((profile) => profile.id)).toEqual([
      "general",
      "coding",
      "design",
      "research",
      "automation",
      "writing",
      "custom",
    ]);
  });

  it("falls back to the general assistant for unknown ids", () => {
    expect(getAgentProfile().id).toBe("general");
    expect(getAgentProfile("unknown").id).toBe("general");
  });

  it("gives the coding agent inspection, planning, verification, and reporting sections", () => {
    const coding = getAgentProfile("coding");
    const headings = coding.sections.map((section) => section.heading.toLowerCase()).join(" | ");

    expect(headings).toContain("inspection");
    expect(headings).toContain("plan");
    expect(headings).toContain("verification");
    expect(headings).toContain("final report");
  });

  it("forbids unrequested git and deploy operations for coding agents", () => {
    const rules = getAgentProfile("coding").operatingRules.join(" ").toLowerCase();
    expect(rules).toContain("commit");
    expect(rules).toContain("push");
    expect(rules).toContain("deploy");
    expect(rules).toContain("unless explicitly requested");
  });
});

describe("prompt section templates and question seeds", () => {
  it("gives every category a non-empty section template", () => {
    for (const category of categories) {
      const sections = getPromptSections(category.id);
      expect(sections.length).toBeGreaterThan(2);
      for (const section of sections) {
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.guidance.length).toBeGreaterThan(10);
      }
    }
  });

  it("keeps section headings unique inside a family", () => {
    for (const category of categories) {
      const headings = getPromptSections(category.id).map((section) => section.heading);
      expect(new Set(headings).size).toBe(headings.length);
    }
  });

  it("asks software categories about implementation and verification", () => {
    const headings = getPromptSections("backend").map((section) => section.heading).join(" | ").toLowerCase();
    expect(headings).toMatch(/architecture|implementation/);
    expect(headings).toMatch(/test|verification|validation|acceptance/);
  });

  it("gives every category unique question seeds with recommendations", () => {
    for (const category of categories) {
      const seeds = getQuestionSeeds(category.id);
      expect(seeds.length).toBeGreaterThanOrEqual(3);
      expect(new Set(seeds.map((seed) => seed.id)).size).toBe(seeds.length);
      for (const seed of seeds) {
        expect(seed.question.length).toBeGreaterThan(10);
        expect(seed.why.length).toBeGreaterThan(10);
        expect(seed.recommendation.length).toBeGreaterThan(10);
        expect(seed.options.length).toBeGreaterThan(0);
      }
    }
  });
});

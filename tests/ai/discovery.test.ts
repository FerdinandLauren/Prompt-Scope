import { describe, expect, it } from "vitest";
import { demoDiscover } from "@/lib/ai/demo/discover";
import { getQuestionSeeds } from "@/config/domains";
import type { DiscoveryAnswer, DiscoveryTurn } from "@/types/guided";

const answer = (
  turn: DiscoveryTurn,
  text: string,
  status: DiscoveryAnswer["status"] = "answered",
): DiscoveryAnswer => ({
  questionId: turn.question!.id,
  question: turn.question!.question,
  answer: status === "answered" ? text : status === "unknown" ? "I don't know" : "Skipped",
  status,
});

function runToEnd(idea: string, budget = 3) {
  let turn = demoDiscover({ idea, answers: [], budget });
  const answers: DiscoveryAnswer[] = [];
  let guard = 0;

  while (turn.question && guard < 12) {
    answers.push(answer(turn, `Signal ${guard + 1}: dashboard with roles and export`));
    turn = demoDiscover({ idea, answers, budget });
    guard += 1;
  }

  return { turn, answers };
}

describe("deterministic discovery", () => {
  it("returns demo-sourced output that is stable across identical inputs", () => {
    const input = { idea: "I want a calm analytics dashboard for our operations team.", answers: [] };
    const first = demoDiscover(input);
    const second = demoDiscover(input);

    expect(first.source).toBe("demo");
    expect(second).toEqual(first);
  });

  it("asks exactly one question at a time and explains why", () => {
    const turn = demoDiscover({ idea: "Design a booking website for a small yoga studio.", answers: [] });

    expect(turn.question).not.toBeNull();
    expect(turn.question!.question.length).toBeGreaterThan(10);
    expect(turn.question!.why.length).toBeGreaterThan(10);
    expect(turn.question!.options.length).toBeGreaterThan(0);
    expect(turn.answered).toBe(0);
  });

  it("detects a design project and builds a brief in the same category", () => {
    const turn = demoDiscover({ idea: "I need a website for a yoga studio with class booking.", answers: [] });

    expect(turn.understanding.category).toBe("ui_ux");
    expect(turn.understanding.categoryLabel).toBe("UI/UX Design");
    expect(turn.brief.category).toBe("ui_ux");
    expect(turn.brief.objective.length).toBeGreaterThan(5);
    expect(turn.brief.sections.length).toBeGreaterThan(0);
  });

  it("detects a software project from backend vocabulary", () => {
    const turn = demoDiscover({
      idea: "Build an inventory REST API with role-based access, stock movements, and a Postgres database.",
      answers: [],
    });

    expect(["backend", "api_development", "full_stack"]).toContain(turn.understanding.category);
  });

  it("detects a content project", () => {
    const turn = demoDiscover({
      idea: "Write a blog post announcing our new pricing, aimed at existing customers.",
      answers: [],
    });

    expect(["content_creation", "technical_writing"]).toContain(turn.understanding.category);
  });

  it("handles Indonesian input without losing the detected domain", () => {
    const turn = demoDiscover({
      idea: "Saya ingin membuat aplikasi kasir untuk toko kecil dengan laporan penjualan harian.",
      answers: [],
    });

    expect(turn.brief.category).toBeTruthy();
    expect(turn.understanding.summary.length).toBeGreaterThan(10);
    expect(turn.question).not.toBeNull();
  });

  it("honours an explicit category override", () => {
    const turn = demoDiscover({
      idea: "Something vague that could be anything at all.",
      category: "research_education",
      answers: [],
    });

    expect(turn.understanding.category).toBe("research_education");
    expect(turn.brief.category).toBe("research_education");
  });

  it("never repeats a question that was already asked", () => {
    const idea = "Build an internal tool for support agents to review refund requests.";
    let turn = demoDiscover({ idea, answers: [], budget: 6 });
    const asked: string[] = [];
    const answers: DiscoveryAnswer[] = [];

    for (let index = 0; index < 4 && turn.question; index += 1) {
      asked.push(turn.question.id);
      answers.push(answer(turn, `Refund queue with approval limits, step ${index}`));
      turn = demoDiscover({ idea, answers, budget: 6 });
    }

    expect(new Set(asked).size).toBe(asked.length);
    if (turn.question) expect(asked).not.toContain(turn.question.id);
  });

  it("stops at the configured soft budget", () => {
    const { turn, answers } = runToEnd("Design a marketing site for a coffee roaster.", 3);

    expect(answers.length).toBeLessThanOrEqual(3);
    expect(turn.enoughInformation).toBe(true);
    expect(turn.question).toBeNull();
    expect(turn.budget).toBe(3);
  });

  it("skips topics the idea already covers instead of asking them again", () => {
    const idea =
      "Build a responsive booking website for a yoga studio with class schedule, instructor profiles, payment, email confirmation, admin dashboard, and mobile layout.";
    const turn = demoDiscover({ idea, answers: [], budget: 9 });

    // The idea already names the audience, the platform, and the deliverables,
    // so those seeded questions must not be asked first.
    expect(turn.question).not.toBeNull();
    expect(turn.question!.target).not.toBe("Target Audience");
    expect(turn.question!.target).not.toBe("Platform Requirements");
    expect(turn.brief.sections.map((section) => section.heading)).toContain("What it must do");
  });
});

describe("unknown answers and assumptions", () => {
  it("turns 'I don't know' into a labelled recommendation with trade-offs", () => {
    const first = demoDiscover({ idea: "Design a dashboard for our operations team.", answers: [] });
    const second = demoDiscover({
      idea: "Design a dashboard for our operations team.",
      answers: [answer(first, "I don't know", "unknown")],
      budget: 5,
    });

    expect(second.recommendation).not.toBeNull();
    expect(second.recommendation!.recordedAsAssumption).toBe(true);
    expect(second.recommendation!.recommendation.length).toBeGreaterThan(10);
    expect(second.recommendation!.rationale.length).toBeGreaterThan(10);
    expect(second.recommendation!.tradeoffs.length).toBeGreaterThan(0);
    expect(second.recommendation!.questionId).toBe(first.question!.id);
  });

  it("records an unknown answer as an assumption and never as a user fact", () => {
    const first = demoDiscover({ idea: "Design a dashboard for our operations team.", answers: [] });
    const second = demoDiscover({
      idea: "Design a dashboard for our operations team.",
      answers: [answer(first, "I don't know", "unknown")],
      budget: 5,
    });

    expect(second.brief.assumptions.length).toBeGreaterThan(0);
    expect(second.brief.assumptions.join(" ")).toMatch(/assumption/i);

    const assumptionSection = second.brief.sections.find((section) => section.source === "assumption");
    expect(assumptionSection).toBeDefined();
    expect(assumptionSection!.content).toMatch(/confirm|recommended|assumption/i);
  });

  it("keeps skipped answers out of confirmed requirements", () => {
    const first = demoDiscover({ idea: "Design a dashboard for our operations team.", answers: [] });
    const second = demoDiscover({
      idea: "Design a dashboard for our operations team.",
      answers: [answer(first, "Skipped", "skipped")],
      budget: 5,
    });

    const userSections = second.brief.sections.filter((section) => section.source === "user");
    const skippedText = first.question!.question;
    expect(userSections.every((section) => !section.content.includes(skippedText))).toBe(true);
    expect(second.recommendation).toBeNull();
  });

  it("keeps an accepted recommendation in the brief after later answers", () => {
    const idea = "Design a dashboard for our operations team.";
    const first = demoDiscover({ idea, answers: [], budget: 5 });
    const unknownAnswer = answer(first, "I don't know", "unknown");
    const second = demoDiscover({ idea, answers: [unknownAnswer], budget: 5 });
    const seedRecommendation = getQuestionSeeds(first.understanding.category).find(
      (seed) => seed.id === first.question!.id,
    )!.recommendation;

    expect(second.question).not.toBeNull();
    const third = demoDiscover({
      idea,
      answers: [unknownAnswer, answer(second, "The operations team reviews churn weekly")],
      budget: 5,
    });

    const assumptionSection = third.brief.sections.find((section) => section.source === "assumption");
    expect(assumptionSection).toBeDefined();
    expect(assumptionSection!.content).toContain(seedRecommendation);
    expect(assumptionSection!.content).not.toContain("Not decided yet");
    expect(third.brief.assumptions.join(" ")).toContain(seedRecommendation);
  });

  it("does not present an uncertainty as a stated requirement", () => {
    const turn = demoDiscover({
      idea: "I want a calm analytics dashboard for an operations team, but I'm not sure which screens I need yet.",
      answers: [],
    });

    expect(turn.understanding.explicitRequirements.length).toBeGreaterThan(0);
    expect(turn.understanding.explicitRequirements.join(" ")).not.toMatch(/not sure/i);
    expect(turn.understanding.ambiguities.join(" ")).toMatch(/uncertain/i);
  });

  it("pairs the recommendation with trade-offs that match it", () => {
    const platformSeed = getQuestionSeeds("ui_ux").find((seed) => seed.id === "design-platform")!;
    const turn = demoDiscover({
      idea: "Design a booking flow for a small studio.",
      answers: [
        {
          questionId: platformSeed.id,
          question: platformSeed.question,
          answer: "I don't know",
          status: "unknown",
        },
      ],
      budget: 5,
    });

    expect(turn.recommendation?.recommendation).toBe(platformSeed.recommendation);
    expect(turn.recommendation?.tradeoffs.length).toBeGreaterThan(0);
    expect(turn.recommendation?.tradeoffs.join(" ")).toMatch(/web|browser|mobile|device/i);
  });

  it("carries unanswered areas into open questions instead of inventing answers", () => {
    const turn = demoDiscover({
      idea: "Design a mobile app for tracking daily water intake.",
      answers: [],
    });

    expect(turn.brief.unknowns.length).toBeGreaterThan(0);
    expect(turn.brief.unknowns).toContain(turn.question!.target);
    expect(turn.understanding.missingInformation.length).toBeGreaterThan(0);
  });
});

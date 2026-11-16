import {
  categories,
  getCategory,
  getComplexityRecommendation,
  getQuestionSeeds,
  type CategoryId,
  type QuestionSeed,
} from "@/config/domains";
import type {
  BriefSection,
  Complexity,
  DiscoveryAnswer,
  DiscoveryInput,
  DiscoveryQuestion,
  DiscoveryRecommendation,
  DiscoveryTurn,
  ProjectBrief,
} from "@/types/guided";

const STRONG_CUES: Array<[CategoryId, RegExp]> = [
  ["design_system", /\b(design system|component library|design tokens|sistem desain|token desain)\b/gi],
  ["visual_design", /\b(brand|logo|poster|campaign|visual identity|merek|identitas visual|kampanye)\b/gi],
  ["product_design", /\b(user flow|prototype|wireframe|user journey|alur pengguna|prototipe)\b/gi],
  ["ui_ux", /\b(dashboard|interface|\bui\b|\bux\b|screen|desain antarmuka|tampilan|dasbor)\b/gi],
  ["api_development", /\b(rest api|graphql|webhook|openapi|endpoint|kontrak api)\b/gi],
  ["ai_agent", /\b(ai agent|autonomous agent|tool[- ]using agent|agen ai|agen otomatis)\b/gi],
  ["machine_learning", /\b(machine learning|train a model|dataset|prediksi|klasifikasi|model ml)\b/gi],
  ["data_analytics", /\b(analytics|analisis data|metrics?|metrik|insight|retention|churn|analisis)\b/gi],
  ["ai_application", /\b(ai|llm|chatbot|assistant|rag|asisten|kecerdasan buatan)\b/gi],
  ["workflow_automation", /\b(automate|automation|workflow|approval|trigger|otomasi|alur kerja|persetujuan)\b/gi],
  ["business_analysis", /\b(business process|purchase request|procurement|stakeholder|sop|proses bisnis|permintaan pembelian|pengadaan)\b/gi],
  ["operations", /\b(operations|warehouse|quality control|gudang|operasional|prosedur operasional)\b/gi],
  ["mobile", /\b(mobile|android|ios|flutter|react native|aplikasi mobile|ponsel)\b/gi],
  ["frontend", /\b(frontend|react|next\.?js|vue|tailwind|antarmuka web|halaman web)\b/gi],
  ["backend", /\b(backend|server|database|postgres|mysql|basis data|layanan api)\b/gi],
  [
    "full_stack",
    /\b(web app|web application|saas|full[- ]?stack|inventory|inventaris|expenses?|spending|budgeting|finance|financial|keuangan|pengeluaran|order|pesanan|management system|sistem manajemen|aplikasi web|manage (?:my|our|daily)|track (?:my|your|daily)|mengelola)\b/gi,
  ],
  ["software_engineering", /\b(refactor|legacy|codebase|migration|maintainability|refaktor|migrasi|arsitektur kode)\b/gi],
  ["technical_writing", /\b(documentation|technical writing|readme|dokumentasi|panduan teknis)\b/gi],
  ["content_creation", /\b(article|blog|copywriting|script|artikel|konten|tulisan|iklan|naskah)\b/gi],
  ["research_education", /\b(research|literature review|course|lesson|riset|penelitian|edukasi|kursus|materi belajar)\b/gi],
];

function countMatches(text: string, pattern: RegExp) {
  return (text.match(pattern) ?? []).length;
}

export function detectCategory(idea: string, preferred?: string): CategoryId {
  if (preferred && categories.some((category) => category.id === preferred)) {
    return preferred as CategoryId;
  }

  const text = idea.toLowerCase();
  const scores = new Map<CategoryId, number>();

  for (const [id, pattern] of STRONG_CUES) {
    const score = countMatches(text, pattern) * 4;
    if (score > 0) scores.set(id, (scores.get(id) ?? 0) + score);
  }

  for (const category of categories) {
    const keywordScore = category.keywords.reduce(
      (total, keyword) => total + (text.includes(keyword.toLowerCase()) ? 2 : 0),
      0,
    );
    if (keywordScore > 0) scores.set(category.id, (scores.get(category.id) ?? 0) + keywordScore);
  }

  let best: CategoryId = "ui_ux";
  let bestScore = 0;
  for (const category of categories) {
    const score = scores.get(category.id) ?? 0;
    if (score > bestScore) {
      best = category.id;
      bestScore = score;
    }
  }
  return best;
}

export function detectComplexity(idea: string, categoryId: string): Complexity {
  const text = idea.toLowerCase();
  const signals = [
    /\b(roles?|permissions?|admin|auth|login|sso|multi[- ]tenant)\b/g,
    /\b(database|data model|integration|api|sync|offline|webhook)\b/g,
    /\b(report|reporting|dashboard|analytics|approval|payment|billing|invoice)\b/g,
    /\b(compliance|privacy|security|audit|regulated)\b/g,
    /\b(multiple|several|many|different|berbagai|beberapa)\b/g,
  ];
  let score = signals.reduce((total, pattern) => total + countMatches(text, pattern), 0);
  if (text.length > 220) score += 2;
  else if (text.length > 100) score += 1;

  const family = getCategory(categoryId).family;
  if (family === "software" || family === "ai_data") score += 1;

  if (score >= 4) return "complex";
  if (score >= 2) return "moderate";
  return "simple";
}

function titleFromIdea(idea: string) {
  const clean = idea.replace(/\s+/g, " ").trim();
  const words = clean.split(" ").slice(0, 9).join(" ");
  const title = words.length < clean.length ? `${words}…` : words;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function objectiveFromIdea(idea: string) {
  const clean = idea.replace(/\s+/g, " ").trim();
  if (clean.length >= 12) return clean.slice(0, 700);
  return `Create ${clean}`.slice(0, 700);
}

function splitClauses(text: string) {
  return text
    .split(/\n|[.;!?]|,\s*(?:and|but|dan|tapi|serta)\s+/gi)
    .map((clause) => clause.replace(/^[-*\s]+/, "").trim())
    .filter((clause) => clause.length >= 8 && clause.length <= 300);
}

const REQUIREMENT_CUES =
  /\b(want|need|should|must|would like|track|manage|create|build|make|report|approve|search|sync|design|ingin|butuh|harus|membuat|mengelola|melacak|laporan|setujui|cari)\b/i;
const CONSTRAINT_CUES =
  /\b(must|must not|only|within|without|avoid|no more than|at least|budget|deadline|responsive|accessible|secure|wajib|tidak boleh|hanya|tanpa|anggaran|tenggat|responsif|aman)\b/i;
// "I want X but I'm not sure which screens" is not a requirement for X.
// Uncertain clauses are routed to ambiguities instead of being confirmed.
const UNCERTAINTY_CUES =
  /\b(not sure|unsure|don'?t know|do not know|no idea|maybe|perhaps|possibly|belum tahu|tidak yakin|bingung|ragu)\b/i;

function extractRequirements(idea: string, answers: DiscoveryAnswer[]) {
  const fromAnswers = answers
    .filter((answer) => answer.status === "answered" && answer.answer.trim())
    .flatMap((answer) => splitClauses(answer.answer).map((clause) => clause))
    .filter((clause) => !UNCERTAINTY_CUES.test(clause));
  const fromIdea = splitClauses(idea).filter(
    (clause) => REQUIREMENT_CUES.test(clause) && !UNCERTAINTY_CUES.test(clause),
  );
  return Array.from(new Set([...fromIdea, ...fromAnswers])).slice(0, 10);
}

function extractConstraints(idea: string, answers: DiscoveryAnswer[]) {
  const text = [idea, ...answers.filter((a) => a.status === "answered").map((a) => a.answer)].join("\n");
  return Array.from(new Set(splitClauses(text).filter((clause) => CONSTRAINT_CUES.test(clause)))).slice(0, 8);
}

const VAGUE_TERMS = ["modern", "nice", "better", "clean", "professional", "user-friendly", "easy", "simple", "menarik", "modern", "bagus", "mudah"];

function extractAmbiguities(idea: string) {
  const text = idea.toLowerCase();
  const found = VAGUE_TERMS.filter((term) => new RegExp(`\\b${term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(text));
  const uncertain = splitClauses(idea)
    .filter((clause) => UNCERTAINTY_CUES.test(clause))
    .map(
      (clause) =>
        `You flagged this as uncertain: "${clause}". Confirm it in the brief or keep it as an open question.`,
    );
  return [
    ...uncertain,
    ...Array.from(new Set(found)).map(
      (term) => `"${term}" is subjective here. Ask for a concrete reference, example, or measurable target.`,
    ),
  ].slice(0, 6);
}

const familyConsiderations: Record<string, string[]> = {
  design: [
    "Define the primary task and reading order before visual style.",
    "Decide whether the deliverable is a concept, a flow, or a production-ready interface.",
    "Accessibility and responsive behaviour change layout decisions; agree on them early.",
  ],
  software: [
    "Define the data model and access roles before building screens.",
    "Name the existing stack; a new project can choose the simplest maintainable option.",
    "Verification needs a runnable check: type check, lint, tests, and a real workflow.",
  ],
  ai_data: [
    "Name the decision the output supports before choosing a model or metric.",
    "Define where data comes from, who owns it, and how quality is measured.",
    "Plan human review and a safe failure path before increasing autonomy.",
  ],
  business: [
    "Map the current process and its slowest handoff before proposing a target process.",
    "Name one accountable owner per step and the rules that require approval.",
    "Choose a baseline measure so the improvement can be verified.",
  ],
  content: [
    "Name one primary reader and the action they should take.",
    "Decide what evidence is required; do not allow invented statistics or quotes.",
    "Agree on format and length before drafting.",
  ],
};

function technicalConsiderations(categoryId: string) {
  return familyConsiderations[getCategory(categoryId).family] ?? familyConsiderations.design;
}

function sectionForTarget(target: string): { id: string; heading: string } {
  const normalized = target.toLowerCase();
  const map: Array<[RegExp, { id: string; heading: string }]> = [
    [/audience|users and decisions|reader|stakeholder/, { id: "audience", heading: "Target users" }],
    [/roles|permissions|stakeholders/, { id: "users", heading: "Users and access" }],
    [/platform/, { id: "platform", heading: "Platform" }],
    [/workflow|process|flow/, { id: "workflow", heading: "Main workflow" }],
    [/scope/, { id: "scope", heading: "Scope" }],
    [/constraint|exclusion/, { id: "constraints", heading: "Constraints" }],
    [/visual|voice|style/, { id: "direction", heading: "Design and tone" }],
    [/architecture|stack|method|model/, { id: "technical", heading: "Technical preferences" }],
    [/data|sources/, { id: "data", heading: "Data and information" }],
    [/security|privacy/, { id: "security", heading: "Security and privacy" }],
    [/performance|scale/, { id: "performance", heading: "Scale expectations" }],
    [/evaluation|success|metric/, { id: "evaluation", heading: "How success is measured" }],
    [/deliverable|output|report|format/, { id: "deliverables", heading: "Deliverables" }],
    [/rules/, { id: "rules", heading: "Business rules" }],
    [/problem/, { id: "problem", heading: "Problem" }],
    [/evidence|sources/, { id: "evidence", heading: "Evidence requirements" }],
    [/message|objective/, { id: "message", heading: "Communication objective" }],
  ];
  return map.find(([pattern]) => pattern.test(normalized))?.[1] ?? { id: "notes", heading: target };
}

function findSeed(seeds: QuestionSeed[], questionId: string, question: string) {
  return (
    seeds.find((seed) => seed.id === questionId) ??
    seeds.find((seed) => seed.question.toLowerCase() === question.toLowerCase())
  );
}

const familyTradeoffs: Record<string, string[]> = {
  design: ["A safer pattern is faster to understand but less distinctive.", "A more expressive direction needs stronger art direction and testing."],
  software: ["A simpler stack ships sooner but may need revisiting at scale.", "A more capable stack adds operational cost and setup time."],
  ai_data: ["A hosted model is faster to validate but adds provider dependency and cost.", "A custom model can fit the domain better but needs data and evaluation effort."],
  business: ["A lighter process is easier to adopt but may miss control requirements.", "A stricter process improves control but adds approval time."],
  content: ["A narrower piece is easier to make credible but reaches fewer readers.", "A broader piece covers more ground but risks shallow evidence."],
};

const recommendationTradeoffs: Array<{ match: RegExp; tradeoffs: string[] }> = [
  {
    match: /responsive web app|web app/i,
    tradeoffs: [
      "One responsive build reaches desktop and mobile, but touch behaviour and breakpoints need explicit testing.",
      "A browser-first build has less native device access than a dedicated app.",
    ],
  },
  {
    match: /\b(mobile app|android|ios)\b/i,
    tradeoffs: [
      "Native navigation and gestures feel familiar, but reaching web users needs a second surface.",
      "Offline and device permissions add implementation and review work.",
    ],
  },
  {
    match: /primary audience|secondary audience/i,
    tradeoffs: [
      "Designing around one audience sharpens the first screen, but secondary users need a clear path later.",
      "Broadening the audience too early tends to flatten hierarchy.",
    ],
  },
  {
    match: /first screen|primary task/i,
    tradeoffs: [
      "Optimising the first screen for one task speeds the main flow, but secondary tools move behind progressive disclosure.",
    ],
  },
  {
    match: /\b(roles?|permissions?|rbac)\b/i,
    tradeoffs: [
      "Role checks protect sensitive actions, but add setup, testing, and admin surface.",
    ],
  },
  {
    match: /\b(small|first version|mvp|narrow)\b/i,
    tradeoffs: [
      "A small first version ships sooner, but edge cases and scale work move to a later pass.",
    ],
  },
];

function recommendationFor(seed: QuestionSeed | undefined, categoryId: string) {
  const family = getCategory(categoryId).family;
  const recommendation =
    seed?.recommendation ?? "Keep the first version deliberately small and confirm the choice before expanding scope.";
  const matched = recommendationTradeoffs.find((entry) => entry.match.test(recommendation));

  return {
    recommendation,
    rationale:
      seed?.why ??
      "The choice affects scope and implementation; a sensible default keeps the project moving without pretending it is confirmed.",
    tradeoffs: matched?.tradeoffs ?? familyTradeoffs[family] ?? familyTradeoffs.software!,
  };
}

function buildBrief({
  idea,
  categoryId,
  complexity,
  answers,
  seeds,
  recommendation,
  answeredCount,
  nextQuestion,
  budget,
}: {
  idea: string;
  categoryId: string;
  complexity: Complexity;
  answers: DiscoveryAnswer[];
  seeds: QuestionSeed[];
  recommendation: DiscoveryRecommendation | null;
  answeredCount: number;
  nextQuestion: DiscoveryQuestion | null;
  budget: number;
}): ProjectBrief {
  const category = getCategory(categoryId);
  const sections: BriefSection[] = [
    {
      id: "overview",
      heading: "Project overview",
      content: idea.trim(),
      source: "user",
    },
    {
      id: "objective",
      heading: "Main objective",
      content: objectiveFromIdea(idea),
      source: "user",
    },
  ];

  const grouped = new Map<string, { content: string[]; source: BriefSection["source"] }>();

  for (const answer of answers) {
    const seed = findSeed(seeds, answer.questionId, answer.question);
    if (!seed) continue;
    const target = sectionForTarget(seed.target);
    const current = grouped.get(target.id) ?? {
      content: [],
      source: "user" as BriefSection["source"],
    };

    if (answer.status === "answered" && answer.answer.trim()) {
      current.content.push(answer.answer.trim());
      if (current.source !== "assumption") current.source = "user";
    } else if (answer.status === "unknown") {
      const rec = answer.questionId === recommendation?.questionId ? recommendation : null;
      // The seed keeps its recommendation, so an accepted assumption survives
      // even after the interview moves on to later questions.
      const recommendationText = rec?.recommendation ?? seed.recommendation;
      current.content.push(
        `${recommendationText} (recommended; confirm or replace this assumption)`,
      );
      current.source = "assumption";
    }
    grouped.set(target.id, current);
  }

  const requirements = extractRequirements(idea, answers);
  if (requirements.length > 0) {
    grouped.set("requirements", {
      content: requirements,
      source: "user",
    });
  }

  const constraints = extractConstraints(idea, answers);
  if (constraints.length > 0) {
    grouped.set("constraints", {
      content: constraints,
      source: "user",
    });
  }

  const order = [
    "audience",
    "users",
    "workflow",
    "requirements",
    "scope",
    "platform",
    "data",
    "technical",
    "security",
    "performance",
    "direction",
    "message",
    "evaluation",
    "rules",
    "evidence",
    "problem",
    "deliverables",
    "constraints",
    "notes",
  ];

  const headings: Record<string, string> = {
    audience: "Target users",
    users: "Users and access",
    workflow: "Main workflow",
    requirements: "What it must do",
    scope: "Scope",
    platform: "Platform",
    data: "Data and information",
    technical: "Technical preferences",
    security: "Security and privacy",
    performance: "Scale expectations",
    direction: "Design and tone",
    message: "Communication objective",
    evaluation: "How success is measured",
    rules: "Business rules",
    evidence: "Evidence requirements",
    problem: "Problem",
    deliverables: "Deliverables",
    constraints: "Constraints",
    notes: "Additional notes",
  };

  for (const id of order) {
    const entry = grouped.get(id);
    if (!entry || entry.content.length === 0) continue;
    sections.push({
      id,
      heading: headings[id] ?? id,
      content: entry.content.join("\n"),
      source: entry.source,
    });
  }

  const assumptions = answers
    .filter((answer) => answer.status === "unknown")
    .map((answer) => {
      const seed = findSeed(seeds, answer.questionId, answer.question);
      const rec = answer.questionId === recommendation?.questionId ? recommendation : null;
      const recommendationText = rec?.recommendation ?? seed?.recommendation;
      return `${seed?.target ?? answer.question}: ${recommendationText ?? "No decision yet — confirm this before build."} (assumption, not confirmed)`;
    });

  if (constraints.length === 0) {
    assumptions.push("No explicit constraints were supplied yet; confirm budget, accessibility, and platform limits before build.");
  }

  const coveredTargets = new Set(
    answers
      .filter((answer) => answer.status === "answered")
      .map((answer) => {
        const seed = findSeed(seeds, answer.questionId, answer.question);
        return seed?.target ?? "";
      }),
  );

  const unknowns = seeds
    .filter((seed) => !coveredTargets.has(seed.target))
    .map((seed) => seed.target)
    .filter((target) => target !== nextQuestion?.target)
    .slice(0, 6);

  if (nextQuestion && !unknowns.includes(nextQuestion.target)) {
    unknowns.unshift(nextQuestion.target);
  }

  const summary = `${complexity.charAt(0).toUpperCase() + complexity.slice(1)} ${category.label.toLowerCase()} project. ${answeredCount} question${answeredCount === 1 ? "" : "s"} answered of a soft budget of ${budget}; ${unknowns.length} area${unknowns.length === 1 ? "" : "s"} still open.`;

  return {
    title: titleFromIdea(idea),
    objective: objectiveFromIdea(idea),
    summary,
    category: categoryId,
    complexity,
    sections,
    assumptions: Array.from(new Set(assumptions)).slice(0, 10),
    unknowns: Array.from(new Set(unknowns)).slice(0, 8),
  };
}

function questionFromSeed(seed: QuestionSeed): DiscoveryQuestion {
  return {
    id: seed.id,
    question: seed.question,
    why: seed.why,
    options: seed.options,
    allowUnknown: true,
    target: seed.target,
  };
}

function isCovered(seed: QuestionSeed, corpus: string) {
  try {
    return new RegExp(seed.detect, "i").test(corpus);
  } catch {
    return false;
  }
}

/**
 * Deterministic discovery used by Demo Mode. It reads the real idea and the
 * real answers; it does not simulate a model or fabricate project facts.
 */
export function demoDiscover(input: DiscoveryInput): DiscoveryTurn {
  const idea = input.idea.trim();
  const categoryId = detectCategory(idea, input.category);
  const category = getCategory(categoryId);
  const complexity = detectComplexity(idea, categoryId);
  const seeds = getQuestionSeeds(categoryId);
  const budget = input.budget ?? (complexity === "complex" ? 7 : complexity === "moderate" ? 5 : 3);
  const answers = input.answers;

  const askedIds = new Set(answers.map((answer) => answer.questionId));
  const corpus = [idea, ...answers.filter((a) => a.status === "answered").map((a) => a.answer)].join("\n");
  const nextSeed = seeds.find((seed) => !askedIds.has(seed.id) && !isCovered(seed, corpus));

  const minimumQuestions = complexity === "complex" ? 4 : complexity === "moderate" ? 3 : 2;
  const requirements = extractRequirements(idea, answers);
  const enoughInformation =
    answers.length >= budget ||
    (!nextSeed && answers.length >= minimumQuestions) ||
    (requirements.length >= 6 && answers.length >= 1);
  const question = enoughInformation ? null : questionFromSeed(nextSeed!);

  const last = answers.at(-1);
  let recommendation: DiscoveryRecommendation | null = null;
  if (last && last.status === "unknown") {
    const seed = findSeed(seeds, last.questionId, last.question);
    const rec = recommendationFor(seed, categoryId);
    recommendation = {
      questionId: last.questionId,
      question: last.question,
      recommendation: rec.recommendation,
      rationale: rec.rationale,
      tradeoffs: rec.tradeoffs,
      recordedAsAssumption: true,
    };
  }

  const brief = buildBrief({
    idea,
    categoryId,
    complexity,
    answers,
    seeds,
    recommendation,
    answeredCount: answers.length,
    nextQuestion: question,
    budget,
  });

  const constraints = extractConstraints(idea, answers);
  const ambiguities = extractAmbiguities(idea);

  const missingInformation = question ? [question.target, ...brief.unknowns.filter((item) => item !== question.target)] : brief.unknowns;

  const categoryConfidence = relevanceScore(idea, categoryId);

  return {
    source: "demo",
    understanding: {
      summary: `${category.label} looks like the closest fit. The project reads as ${complexity} complexity with ${requirements.length} stated requirement${requirements.length === 1 ? "" : "s"}.`,
      objective: objectiveFromIdea(idea),
      category: categoryId,
      categoryLabel: category.label,
      categoryConfidence,
      categoryReason: `Matched the idea against the ${category.label.toLowerCase()} vocabulary and the ${category.family} family. You can change this at any time.`,
      complexity,
      explicitRequirements: requirements,
      constraints,
      missingInformation: missingInformation.slice(0, 8),
      ambiguities,
      technicalConsiderations: technicalConsiderations(categoryId),
    },
    question,
    recommendation,
    brief,
    enoughInformation,
    answered: answers.length,
    budget,
  };
}

function relevanceScore(idea: string, categoryId: string) {
  const category = getCategory(categoryId);
  const text = idea.toLowerCase();
  let score = 46;
  for (const keyword of category.keywords) {
    if (text.includes(keyword.toLowerCase())) score += 9;
  }
  for (const [id, pattern] of STRONG_CUES) {
    if (id === categoryId && countMatches(text, pattern) > 0) score += 18;
  }
  return Math.max(35, Math.min(94, score));
}

export function demoRecommendedDepth(categoryId: string, complexity: Complexity) {
  const base = getComplexityRecommendation(complexity);
  const family = getCategory(categoryId).family;
  if (family === "software" && base === "balanced") return "detailed";
  return base;
}

import { getEvaluationDimensions, getScoreBand } from "@/config/evaluation-rubric";
import type {
  DimensionKey,
  DimensionScore,
  EvaluationSnapshot,
  Weakness,
  Strength,
} from "@/types/evaluation";
import { calculateOverallScore, fingerprintPrompt } from "@/lib/scoring/calculate-score";
import { getCategory, getMissingChecks, getRubricVersion as getCategoryRubricVersion } from "@/config/domains";

type Signal = { pattern: RegExp; label: string; weight: number };

type Rule = {
  baseline: number;
  signals: Signal[];
  missing: string;
  suggestion: string;
};

const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;

const rules: Record<DimensionKey, Rule> = {
  clarity: {
    baseline: 34,
    signals: [
      { pattern: /\b(design|create|build|produce|make|deliver|write|generate)\b/i, label: "an explicit action", weight: 12 },
      { pattern: /(^|\n)\s*(#|\d+\.|[-*])\s/m, label: "ordered structure", weight: 12 },
      { pattern: /\b(objective|goal|purpose|brief)\b/i, label: "a stated objective", weight: 10 },
      { pattern: /\b(should|must|avoid|prefer|do not|don't)\b/i, label: "directional verbs", weight: 8 },
    ],
    missing: "the prompt does not state a single clear action or order of operations",
    suggestion: "Open with one explicit objective sentence, then order the rest as short imperative statements.",
  },
  context: {
    baseline: 26,
    signals: [
      { pattern: /\b(audience|users?|customers?|team|persona|personas|demographic|stakeholders?)\b/i, label: "a named audience", weight: 14 },
      { pattern: /\b(product|platform|saas|app|application|service|company|brand|startup)\b/i, label: "the product being designed for", weight: 12 },
      { pattern: /\b(purpose|used for|so that|in order to|because|goal of|intended to)\b/i, label: "the purpose behind the design", weight: 12 },
      { pattern: /\b(internal|external|enterprise|consumer|b2b|b2c|marketplace|onboarding|checkout|analytics)\b/i, label: "the usage environment", weight: 10 },
      { pattern: /\b(existing|current|legacy|redesign|rebrand|from scratch)\b/i, label: "relationship to existing work", weight: 8 },
    ],
    missing: "there is no project background, audience, or usage environment",
    suggestion: "Add one paragraph naming the audience, the product, and the situation the design must serve.",
  },
  specificity: {
    baseline: 22,
    signals: [
      { pattern: /\b\d+(\.\d+)?\s*(px|rem|em|pt|%|cols?|columns?|rows?|items?|cards?|screens?|sections?|levels?|variants?)\b/gi, label: "measurable quantities", weight: 14 },
      { pattern: /\b(hover|focus|active|disabled|empty|loading|error|success|pressed|selected)\b/gi, label: "component states", weight: 12 },
      { pattern: /\b(nav(igation)?|sidebar|header|footer|hero|card|table|form|modal|chart|list|filter|tab)\b/gi, label: "named interface parts", weight: 10 },
      { pattern: /\b(desktop|tablet|mobile|breakpoint|responsive|wide screen)\b/gi, label: "target sizes", weight: 10 },
      { pattern: /\b(label|copy|heading|subheading|caption|button text|microcopy)\b/gi, label: "content detail", weight: 8 },
    ],
    missing: "requirements stay at the level of adjectives with no concrete decisions",
    suggestion: "Replace adjectives with decisions: named components, measurable spacing, breakpoints, and required states.",
  },
  visual_direction: {
    baseline: 24,
    signals: [
      {
        pattern:
          /\b(minimal(ist|ism)?|editorial|brutalist|corporate|futuristic|playful|warm|cool|cold|organic|geometric|soft|sharp|refined|restrained|quiet|bold|expressive|sleek|technical|retro|vintage|luxurious|premium|understated|high[- ]contrast|monochrome)\b/gi,
        label: "named style direction",
        weight: 14,
      },
      {
        pattern:
          /\b(colou?rs?|palette|tone|hue|saturation|accent|gradient|duotone|monochrome|neutrals?|charcoal|off[- ]white|cream|beige|black|white|grey|gray|orange|amber|yellow|pink|red|green|blue|purple|teal|warm|cool)\b/gi,
        label: "colour behaviour",
        weight: 13,
      },
      {
        pattern: /\b(mood|atmosphere|feeling|calm|energetic|serious|friendly|clinical|inviting|nostalgic|confident)\b/gi,
        label: "intended mood",
        weight: 10,
      },
      {
        pattern: /\b(photo(graphy)?|imagery|illustration|icon(ography|s)?|texture|pattern|material|3d|render|screenshot|no stock)\b/gi,
        label: "visual material",
        weight: 10,
      },
      { pattern: /\b(inspired by|reference|similar to|style of|in the manner of|like \w+)\b/gi, label: "a reference point", weight: 10 },
    ],
    missing: "no coherent visual direction is described",
    suggestion: "Describe the direction with two or three concrete anchors: style, colour behaviour, and mood.",
  },
  composition: {
    baseline: 22,
    signals: [
      { pattern: /\b(grid|columns?|layout|alignment|aligned|margin|gutter|padding|spacing|whitespace|negative space|rhythm)\b/gi, label: "layout and spacing rules", weight: 13 },
      { pattern: /\b(hierarchy|focal|focal point|primary|secondary|emphasis|priority|reading order|above the fold)\b/gi, label: "hierarchy expectations", weight: 13 },
      { pattern: /\b(section|panel|row|stack|side by side|asymmetric|symmetrical|centred|centered|left aligned)\b/gi, label: "composition structure", weight: 10 },
      { pattern: /\b(responsive|reflow|collapse|stack(s|ed)? on mobile|breakpoint)\b/gi, label: "responsive behaviour", weight: 10 },
    ],
    missing: "layout, hierarchy, and spatial rhythm are left entirely open",
    suggestion: "State the focal point, the reading order, the alignment system, and how the layout reflows on smaller screens.",
  },
  typography: {
    baseline: 18,
    signals: [
      { pattern: /\b(typeface|font|type scale|typograph(y|ic)|serif|sans[- ]serif|monospace|grotesk|display face)\b/gi, label: "typeface direction", weight: 15 },
      { pattern: /\b(font (size|weight)|font-size|weight|tracking|letter[- ]spacing|line[- ]height|leading|measure|line length)\b/gi, label: "type metrics", weight: 14 },
      { pattern: /\b(heading|subhead|body text|caption|label|metadata|display text|type roles?)\b/gi, label: "type roles", weight: 11 },
      { pattern: /\b(readab(le|ility)|legib(le|ility)|contrast)\b/gi, label: "readability requirements", weight: 9 },
    ],
    missing: "typography is not addressed at all",
    suggestion: "Define type roles, a scale, weights, and a readable measure; then add a legibility requirement.",
  },
  constraints: {
    baseline: 20,
    signals: [
      { pattern: /\b(must|must not|should not|avoid|do not|don't|never|only|limit|no more than|at least)\b/gi, label: "explicit limits", weight: 13 },
      { pattern: /\b(responsive|mobile[- ]first|touch|wcag|accessible|accessibility|contrast ratio|contrast|legible)\b/gi, label: "accessibility and responsiveness", weight: 12 },
      { pattern: /\b(keyboard|focus ring|focusable|screen reader|aria|semantic|reduced motion)\b/gi, label: "interaction accessibility", weight: 10 },
      { pattern: /\b(performance|load time|bundle|lightweight|fast|budget)\b/gi, label: "performance limits", weight: 9 },
      { pattern: /\b(without|exclude|excluded|no stock|no lorem|no carousel|no animation|placeholder-free|plain)\b/gi, label: "exclusions", weight: 9 },
    ],
    missing: "no limits, exclusions, or required conditions are stated",
    suggestion: "Add explicit must/avoid statements covering responsiveness, accessibility, and exclusions.",
  },
  output_definition: {
    baseline: 20,
    signals: [
      { pattern: /\b(landing page|dashboard|mobile app(lication)?|website|web app|screen|page|component library|design system|wireframe|mockup|prototype|specification|spec)\b/gi, label: "a named deliverable", weight: 15 },
      { pattern: /\b(return|output|provide|deliver|respond with|format|structure your answer|in markdown|as a list)\b/gi, label: "response expectations", weight: 13 },
      { pattern: /\b(low[- ]fidelity|high[- ]fidelity|pixel[- ]perfect|concept|final)\b/gi, label: "fidelity level", weight: 10 },
      { pattern: /\b(for each|for every|one per|per section|per screen)\b/gi, label: "repetition scope", weight: 8 },
    ],
    missing: "the prompt does not say what the model should return",
    suggestion: "Name the deliverable, its fidelity, and the format of the response.",
  },
};

type DomainRuleOverrides = Partial<Record<DimensionKey, Rule>>;

const domainRules: Record<string, DomainRuleOverrides> = {
  software: {
    visual_direction: {
      baseline: 22,
      signals: [
        { pattern: /\b(architecture|layer|module|service|boundary|monolith|microservice|framework|stack|monorepo)\b/gi, label: "an architecture decision", weight: 14 },
        { pattern: /\b(react|next\.?js|node|typescript|python|laravel|django|postgres|mysql|prisma|supabase)\b/gi, label: "named technology", weight: 12 },
        { pattern: /\b(component|repository|store|context|hook|route|controller|middleware)\b/gi, label: "implementation structure", weight: 11 },
        { pattern: /\b(trade-?off|constraint|existing|preserve|compatib|migration)\b/gi, label: "existing constraints", weight: 10 },
      ],
      missing: "no system structure or technology constraints are described",
      suggestion: "Name the layers, the existing stack, the boundaries to preserve, and the trade-off behind the chosen approach.",
    },
    composition: {
      baseline: 22,
      signals: [
        { pattern: /\b(data model|schema|entity|entities|table|field|relationship|foreign key)\b/gi, label: "a data model", weight: 14 },
        { pattern: /\b(api|endpoint|request|response|contract|payload|status code)\b/gi, label: "an API contract", weight: 13 },
        { pattern: /\b(state|store|cache|session|query|mutation)\b/gi, label: "state ownership", weight: 10 },
        { pattern: /\b(integration|webhook|sync|job|queue|third[- ]party)\b/gi, label: "integration behaviour", weight: 10 },
      ],
      missing: "the data model, API contract, and state ownership are not specified",
      suggestion: "Define the core entities, the request/response contract, who owns each piece of state, and what happens when an integration fails.",
    },
    typography: {
      baseline: 20,
      signals: [
        { pattern: /\b(auth|authentication|authorization|permission|role|session|token)\b/gi, label: "an access model", weight: 13 },
        { pattern: /\b(validation|validate|sanitize|reject|constraint)\b/gi, label: "input validation", weight: 11 },
        { pattern: /\b(error|exception|fallback|retry|timeout|failure|edge case)\b/gi, label: "failure handling", weight: 12 },
        { pattern: /\b(test|unit test|integration test|lint|type ?check|build)\b/gi, label: "verification", weight: 12 },
        { pattern: /\b(log|monitor|observability|audit|alert)\b/gi, label: "observability", weight: 8 },
      ],
      missing: "there is no security, failure, or verification model",
      suggestion: "Add authorization rules, validation, error and retry behaviour, logging, and the exact checks that prove the work.",
    },
  },
  ai_data: {
    visual_direction: {
      baseline: 22,
      signals: [
        { pattern: /\b(model|llm|retrieval|rag|embedding|classifier|regression|baseline)\b/gi, label: "a named method", weight: 14 },
        { pattern: /\b(approach|method|strategy|prompt|fine[- ]tun|training|algorithm)\b/gi, label: "an analytical approach", weight: 12 },
        { pattern: /\b(metric|accuracy|precision|recall|f1|latency|cost|confidence)\b/gi, label: "a quality target", weight: 11 },
        { pattern: /\b(fallback|human review|escalation|threshold|uncertainty)\b/gi, label: "a fallback path", weight: 10 },
      ],
      missing: "no AI or analytical method is defined",
      suggestion: "Name the method, the baseline it must beat, the quality target, and what happens when confidence is low.",
    },
    composition: {
      baseline: 22,
      signals: [
        { pattern: /\b(data source|dataset|warehouse|documents?|api|table|csv|pdf|database)\b/gi, label: "a data source", weight: 14 },
        { pattern: /\b(clean|prepare|join|missing|duplicate|leakage|split|preprocess)\b/gi, label: "data preparation", weight: 12 },
        { pattern: /\b(evaluation|test set|validation|metric|benchmark|human review)\b/gi, label: "an evaluation method", weight: 13 },
        { pattern: /\b(freshness|ownership|retention|lineage|version)\b/gi, label: "data governance", weight: 9 },
      ],
      missing: "the data sources, preparation, and evaluation method are not defined",
      suggestion: "List the sources and owners, how the data is prepared, the evaluation set, and the metric that decides success.",
    },
    typography: {
      baseline: 20,
      signals: [
        { pattern: /\b(privacy|pii|personal data|confidential|retention|redact)\b/gi, label: "privacy handling", weight: 13 },
        { pattern: /\b(guardrail|injection|refusal|safe|policy|moderation)\b/gi, label: "safety controls", weight: 12 },
        { pattern: /\b(fallback|failure|low confidence|escalation|timeout|rate limit)\b/gi, label: "failure handling", weight: 12 },
        { pattern: /\b(cost|latency|token|budget|monitor|log)\b/gi, label: "operating limits", weight: 10 },
      ],
      missing: "privacy, safety, failure, and cost limits are not addressed",
      suggestion: "Add data handling rules, guardrails, low-confidence behaviour, and measurable cost and latency limits.",
    },
  },
  business: {
    visual_direction: {
      baseline: 22,
      signals: [
        { pattern: /\b(stakeholder|owner|department|role|manager|approver)\b/gi, label: "named stakeholders", weight: 14 },
        { pattern: /\b(as[- ]is|to[- ]be|current process|target process|handoff|step)\b/gi, label: "a current and target process", weight: 14 },
        { pattern: /\b(bottleneck|delay|rework|pain|waiting|cost)\b/gi, label: "a named problem", weight: 11 },
        { pattern: /\b(policy|control|compliance|risk|audit)\b/gi, label: "governance context", weight: 9 },
      ],
      missing: "stakeholders and the current process are not described",
      suggestion: "Name the roles, map the as-is steps and handoffs, and state which bottleneck the change must fix.",
    },
    composition: {
      baseline: 22,
      signals: [
        { pattern: /\b(rule|threshold|limit|condition|exception|policy)\b/gi, label: "business rules", weight: 14 },
        { pattern: /\b(approval|authority|escalation|owner|sign[- ]off)\b/gi, label: "approval authority", weight: 12 },
        { pattern: /\b(handoff|sequence|step|workflow|process)\b/gi, label: "process sequence", weight: 11 },
        { pattern: /\b(exception|edge case|fallback|override)\b/gi, label: "exception handling", weight: 10 },
      ],
      missing: "rules, approvals, and exceptions remain implicit",
      suggestion: "Write each rule as a testable condition with an owner, an approval threshold, and an exception path.",
    },
    typography: {
      baseline: 20,
      signals: [
        { pattern: /\b(measure|metric|kpi|cycle time|cost|error rate|rework|satisfaction)\b/gi, label: "success measures", weight: 14 },
        { pattern: /\b(baseline|before|after|target|target state)\b/gi, label: "a baseline", weight: 11 },
        { pattern: /\b(acceptance|sign[- ]off|evidence|audit|report)\b/gi, label: "acceptance evidence", weight: 12 },
        { pattern: /\b(risk|control|mitigation|owner)\b/gi, label: "risks and controls", weight: 10 },
      ],
      missing: "success measures and acceptance evidence are not defined",
      suggestion: "Define a baseline and a target for the outcome, then state who accepts the result and on what evidence.",
    },
  },
  content: {
    visual_direction: {
      baseline: 22,
      signals: [
        { pattern: /\b(audience|reader|customer|developer|team|public|persona)\b/gi, label: "a named reader", weight: 14 },
        { pattern: /\b(tone|voice|formal|conversational|neutral|playful|authoritative)\b/gi, label: "voice direction", weight: 12 },
        { pattern: /\b(action|take away|call to action|understand|believe|trust)\b/gi, label: "a communication objective", weight: 12 },
        { pattern: /\b(brand|terminology|jargon|reading level|style guide)\b/gi, label: "language constraints", weight: 9 },
      ],
      missing: "the reader and communication objective are not defined",
      suggestion: "Name one primary reader, what they already know, and the single action or belief the piece must produce.",
    },
    composition: {
      baseline: 22,
      signals: [
        { pattern: /\b(outline|section|structure|opening|introduction|conclusion)\b/gi, label: "a content structure", weight: 14 },
        { pattern: /\b(evidence|source|citation|example|proof|data)\b/gi, label: "evidence requirements", weight: 13 },
        { pattern: /\b(key message|main point|argument|sequence)\b/gi, label: "a key message", weight: 11 },
        { pattern: /\b(call to action|next step|link|sign[- ]up)\b/gi, label: "a call to action", weight: 9 },
      ],
      missing: "structure and supporting evidence are left entirely open",
      suggestion: "Specify the outline, the key message of each section, the proof points, and the closing action.",
    },
    typography: {
      baseline: 20,
      signals: [
        { pattern: /\b(words?|word count|length|reading time|short|long)\b/gi, label: "a length target", weight: 12 },
        { pattern: /\b(format|channel|article|guide|script|landing page|email|presentation)\b/gi, label: "a format", weight: 12 },
        { pattern: /\b(readab|legib|heading|subheading|bullet|scan)\b/gi, label: "readability guidance", weight: 10 },
        { pattern: /\b(cite|source|do not invent|no unverified|factual|accuracy)\b/gi, label: "factual constraints", weight: 11 },
      ],
      missing: "format, length, and factual limits are not specified",
      suggestion: "Define the format, an appropriate length range, readability expectations, and the rule for unverified claims.",
    },
  },
};

function rulesFor(category: string): Record<DimensionKey, Rule> {
  const family = getCategory(category).family;
  const overrides = domainRules[family];
  return overrides ? { ...rules, ...overrides } : rules;
}

const conflictPairs: Array<{ a: RegExp; b: RegExp; message: string }> = [
  { a: /\bminimal(ist|ism)?\b/i, b: /\b(ornate|maximalist|opulent|richly decorated)\b/i, message: "The prompt asks for both a minimal and an ornate treatment." },
  { a: /\bdark\b/i, b: /\b(bright white|light background|white background)\b/i, message: "A dark treatment and a bright white background are requested together." },
  { a: /\bplayful\b/i, b: /\b(corporate|formal|serious|austere)\b/i, message: "Playful and formal tones are requested together." },
  { a: /\bbrutalist\b/i, b: /\b(soft|gentle|rounded|delicate)\b/i, message: "A brutalist direction conflicts with soft, rounded treatment." },
  { a: /\bmonochrome\b/i, b: /\b(colourful|colorful|vibrant palette|many colours|many colors)\b/i, message: "A monochrome palette and a colourful palette are requested together." },
  { a: /\bdense\b/i, b: /\b(spacious|generous whitespace|airy)\b/i, message: "A dense layout and generous whitespace are requested together." },
  { a: /\bstatic\b/i, b: /\b(animated|animation|motion-heavy)\b/i, message: "A static result and animation are requested together." },
];

const evidenceDimensions = new Set<DimensionKey>([
  "clarity",
  "specificity",
  "visual_direction",
  "composition",
  "typography",
]);

export type HeuristicInput = {
  prompt: string;
  category: string;
  rubricVersion?: string;
  title?: string;
  now?: Date;
  id?: string;
};

/**
 * Deterministic, rule-based evaluation. It is used only in Demo Mode, where the
 * UI labels every result as DEMO DATA. It analyses real text — it does not
 * fabricate random scores.
 */
export function heuristicEvaluate({
  prompt,
  category,
  rubricVersion = getCategoryRubricVersion(category),
  now = new Date(),
  id,
}: HeuristicInput): EvaluationSnapshot {
  const text = prompt.replace(/\r\n/g, "\n").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const brevityPenalty = wordCount < 35 ? 18 : wordCount < 70 ? 8 : 0;
  const dimensionsForCategory = getEvaluationDimensions(category);
  const activeRules = rulesFor(category);
  const missingChecks = getMissingChecks(category).map((check) => ({
    pattern: new RegExp(check.pattern, "i"),
    label: check.label,
  }));

  const dimensionDetails: DimensionScore[] = dimensionsForCategory.map((dimension) => {
    const rule = activeRules[dimension.key];
    const found: string[] = [];
    const absent: string[] = [];
    let points = 0;

    for (const signal of rule.signals) {
      const pattern = new RegExp(
        signal.pattern.source,
        signal.pattern.flags.includes("g") ? signal.pattern.flags : `${signal.pattern.flags}g`,
      );
      const occurrences = count(text, pattern);
      if (occurrences > 0) {
        found.push(signal.label);
        points += signal.weight * Math.min(2, occurrences) * 0.75;
      } else {
        absent.push(signal.label);
      }
    }

    // Diminishing returns: extra signals help, but a prompt cannot reach a
    // perfect score by repetition alone. The ceiling stays below 100.
    const SATURATION_K = 40;
    const CEILING = 98;
    let score = rule.baseline + (CEILING - rule.baseline) * (1 - Math.exp(-points / SATURATION_K));

    if (wordCount > 220) score += 2;
    score -= brevityPenalty;

    const finalScore = Math.max(0, Math.min(CEILING, Math.round(score)));

    const explanationParts: string[] = [];
    if (found.length) explanationParts.push(`Detected ${found.slice(0, 3).join(", ")}.`);
    if (absent.length) explanationParts.push(`No ${absent.slice(0, 2).join(" and no ")}.`);
    if (brevityPenalty > 0) {
      explanationParts.push(`The prompt is short (${wordCount} words), which limits how specific the instructions can be.`);
    }
    if (!found.length) explanationParts.push(rule.missing.charAt(0).toUpperCase() + rule.missing.slice(1) + ".");

    return {
      key: dimension.key,
      label: dimension.label,
      score: finalScore,
      explanation: explanationParts.join(" "),
    };
  });

  const dimensions = Object.fromEntries(
    dimensionDetails.map((dimension) => [dimension.key, dimension.score]),
  ) as Record<DimensionKey, number>;

  const strengths: Strength[] = dimensionDetails
    .filter((dimension) => dimension.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((dimension) => ({
      title: `${dimension.label} is comparatively strong`,
      description: dimension.explanation,
    }));

  const weaknesses: Weakness[] = dimensionDetails
    .filter((dimension) => dimension.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((dimension) => {
      const rule = activeRules[dimension.key];
      const severity = dimension.score < 40 ? "high" : dimension.score < 58 ? "medium" : "low";
      const found = rule.signals
        .filter((signal) => new RegExp(signal.pattern.source, "i").test(text))
        .map((signal) => signal.label);
      const absent = rule.signals
        .filter((signal) => !new RegExp(signal.pattern.source, "i").test(text))
        .map((signal) => signal.label);

      let problem: string;
      if (found.length === 0) {
        problem = `${dimension.label} scores ${dimension.score}: ${rule.missing}.`;
      } else if (absent.length > 0) {
        problem = `${dimension.label} scores ${dimension.score}: the prompt includes ${formatList(
          found.slice(0, 2),
        )}, but does not address ${formatList(absent.slice(0, 2))}.`;
      } else {
        problem = `${dimension.label} scores ${dimension.score}: every tracked signal is present, but the instructions remain thin for a reliable result.`;
      }

      return {
        dimension: dimension.key,
        severity,
        problem,
        // Cite vague wording only for dimensions that under-specification affects.
        evidence: evidenceDimensions.has(dimension.key) ? findVagueEvidence(text) : undefined,
        suggestion: rule.suggestion,
      };
    });

  const missingInformation = missingChecks
    .filter((check) => !check.pattern.test(text))
    .map((check) => check.label)
    .slice(0, 6);

  const contradictions = conflictPairs
    .filter((pair) => pair.a.test(text) && pair.b.test(text))
    .map((pair) => pair.message);

  const overallScore = calculateOverallScore(dimensions);
  const band = getScoreBand(overallScore);

  const recommendations = [
    ...weaknesses.slice(0, 3).map((weakness) => weakness.suggestion),
    missingInformation.length
      ? `Supply the missing information first: ${missingInformation.slice(0, 3).join(", ")}.`
      : "All tracked information categories are present; refine wording rather than adding sections.",
  ].slice(0, 4);

  const strongest = dimensionDetails.reduce((best, item) => (item.score > best.score ? item : best));
  const weakest = dimensionDetails.reduce((worst, item) => (item.score < worst.score ? item : worst));

  return {
    id: id ?? `demo-${Date.now().toString(36)}`,
    overallScore,
    rubricVersion,
    category,
    createdAt: now.toISOString(),
    source: "demo",
    dimensions,
    dimensionDetails,
    summary: `Demo Mode rule-based evaluation: ${band.label.toLowerCase()} at ${overallScore}/100. ${strongest.label} (${strongest.score}) is the strongest dimension and ${weakest.label} (${weakest.score}) needs the most work across ${wordCount} words.`,
    strengths,
    weaknesses,
    missingInformation,
    contradictions,
    recommendations,
    promptHash: fingerprintPrompt(text),
    model: undefined,
  };
}

function findVagueEvidence(text: string): string | undefined {
  const vague = /\b(nice|good|great|clean|professional|modern|beautiful|amazing|user-friendly|intuitive|whatever|etc)\b/i;
  const match = text.match(vague);
  if (match?.index === undefined) return undefined;

  const start = Math.max(0, match.index - 50);
  const end = Math.min(text.length, match.index + match[0].length + 50);
  const excerpt = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${excerpt}${end < text.length ? "…" : ""}`;
}

function formatList(items: string[]): string {
  if (items.length === 0) return "nothing";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function heuristicWordCount(prompt: string) {
  return prompt.split(/\s+/).filter(Boolean).length;
}

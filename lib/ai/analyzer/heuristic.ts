import { evaluationDimensions, getScoreBand } from "@/config/evaluation-rubric";
import type {
  DimensionKey,
  DimensionScore,
  EvaluationSnapshot,
  Weakness,
  Strength,
} from "@/types/evaluation";
import { calculateOverallScore, fingerprintPrompt } from "@/lib/scoring/calculate-score";
import { RUBRIC_VERSION } from "@/config/app";

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

const conflictPairs: Array<{ a: RegExp; b: RegExp; message: string }> = [
  { a: /\bminimal(ist|ism)?\b/i, b: /\b(ornate|maximalist|opulent|richly decorated)\b/i, message: "The prompt asks for both a minimal and an ornate treatment." },
  { a: /\bdark\b/i, b: /\b(bright white|light background|white background)\b/i, message: "A dark treatment and a bright white background are requested together." },
  { a: /\bplayful\b/i, b: /\b(corporate|formal|serious|austere)\b/i, message: "Playful and formal tones are requested together." },
  { a: /\bbrutalist\b/i, b: /\b(soft|gentle|rounded|delicate)\b/i, message: "A brutalist direction conflicts with soft, rounded treatment." },
  { a: /\bmonochrome\b/i, b: /\b(colourful|colorful|vibrant palette|many colours|many colors)\b/i, message: "A monochrome palette and a colourful palette are requested together." },
  { a: /\bdense\b/i, b: /\b(spacious|generous whitespace|airy)\b/i, message: "A dense layout and generous whitespace are requested together." },
  { a: /\bstatic\b/i, b: /\b(animated|animation|motion-heavy)\b/i, message: "A static result and animation are requested together." },
];

const missingChecks: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(audience|users?|customers?|team|persona|operations leads)\b/i, label: "Target audience" },
  { pattern: /\b(objective|goal|purpose|so that|in order to|because|used for|helps?|review)\b/i, label: "Project purpose and context" },
  {
    pattern:
      /\b(colou?rs?|palette|tone|hue|charcoal|orange|amber|yellow|pink|red|green|blue|purple|teal|neutrals?|monochrome|dark|light|white|black|bright|warm|cool|accent)\b/i,
    label: "Colour direction",
  },
  {
    pattern: /\b(typeface|font|typograph|grotesk|monospace|serif|sans[- ]serif|type scale)\b/i,
    label: "Typography requirements",
  },
  {
    pattern: /\b(grid|layout|composition|spacing|hierarchy|alignment|focal|reading order|whitespace)\b/i,
    label: "Layout and hierarchy expectations",
  },
  { pattern: /\b(responsive|mobile|tablet|breakpoint|360px)\b/i, label: "Responsive behaviour" },
  { pattern: /\b(accessible|accessibility|contrast|wcag|focus ring|keyboard)\b/i, label: "Accessibility requirements" },
  { pattern: /\b(return|output|format|deliverable|deliver|section by section|rationale)\b/i, label: "Expected output format" },
  { pattern: /\b(must|avoid|do not|don't|never|limit|only)\b/i, label: "Explicit constraints" },
];

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
  rubricVersion = RUBRIC_VERSION,
  now = new Date(),
  id,
}: HeuristicInput): EvaluationSnapshot {
  const text = prompt.replace(/\r\n/g, "\n").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const brevityPenalty = wordCount < 35 ? 18 : wordCount < 70 ? 8 : 0;

  const dimensionDetails: DimensionScore[] = evaluationDimensions.map((dimension) => {
    const rule = rules[dimension.key];
    const found: string[] = [];
    const absent: string[] = [];
    let score = rule.baseline;

    for (const signal of rule.signals) {
      const occurrences = count(text, new RegExp(signal.pattern.source, signal.pattern.flags.includes("g") ? signal.pattern.flags : `${signal.pattern.flags}g`));
      if (occurrences > 0) {
        found.push(signal.label);
        score += signal.weight * Math.min(2, occurrences) * 0.75;
      } else {
        absent.push(signal.label);
      }
    }

    if (wordCount > 220) score += 4;
    score -= brevityPenalty;

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

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
      const rule = rules[dimension.key];
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
        evidence:
          dimension.key === "clarity" || dimension.key === "visual_direction"
            ? findVagueEvidence(text)
            : undefined,
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

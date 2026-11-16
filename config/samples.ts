import type { CategoryId } from "@/config/app";

/**
 * Sample prompts used to explore the workflow. They are clearly presented as
 * samples; results produced from them are labelled DEMO DATA in Demo Mode.
 */
export const SAMPLE_PROMPTS: Array<{
  id: string;
  label: string;
  title: string;
  category: CategoryId;
  note: string;
  prompt: string;
}> = [
  {
    id: "weak-dashboard",
    label: "Vague dashboard brief",
    title: "Dashboard refresh",
    category: "ui_ux",
    note: "Typical weak prompt: intention is clear, direction is not.",
    prompt: `Design a modern dashboard for our app. It should look clean and professional, and use nice colors. Make it user-friendly and intuitive.`,
  },
  {
    id: "structured-landing",
    label: "Structured landing brief",
    title: "Analytics landing page",
    category: "visual_design",
    note: "A stronger prompt with context, direction, and output defined.",
    prompt: `Objective: design a landing page for a subscription analytics product that helps operations teams review weekly churn.

Audience: operations leads at B2B SaaS companies with 200-2000 employees. They are data-literate and sceptical of marketing claims.

Visual direction: editorial and restrained. Deep charcoal background, warm orange used only for one primary action and the single highlighted metric. No gradient washes, no stock photography; use a cropped product screenshot as the only image.

Composition: a strong left-aligned headline block in the first viewport with a live product panel on the right. Reading order: headline, proof line, primary action, supporting detail. One consistent 12-column grid, spacing rhythm in 8px steps, section padding 96px on desktop.

Typography: one grotesk family. Headline at 56px with tight tracking, body at 16px with 1.6 line height and a 68 character measure, metadata in a monospace face at 11px uppercase.

Constraints: responsive down to 360px wide, WCAG AA contrast for all text, keyboard-focusable controls with visible focus rings, avoid carousels, avoid auto-playing motion, keep the page under 300KB of images.

Output requirements: return the page structure section by section with the copy written out, then a short rationale for the hierarchy decisions.`,
  },
  {
    id: "contradictory",
    label: "Contradictory brief",
    title: "Brand page",
    category: "visual_design",
    note: "Shows contradiction detection: conflicting instructions in one brief.",
    prompt: `Create a brand page that feels minimalist and quiet, but also maximalist and richly decorated.

The interface should be dark with deep blacks, but also use a bright white background everywhere for clarity.

Keep the tone playful and informal, but maintain a formal, corporate and serious impression.

Use a monochrome palette only, and add plenty of vibrant colourful accents.

Return whatever you think looks best.`,
  },
];

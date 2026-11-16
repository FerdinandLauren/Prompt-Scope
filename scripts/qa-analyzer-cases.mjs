import puppeteer from "puppeteer-core";
import path from "node:path";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.QA_OUT_DIR ?? path.join(process.cwd(), ".qa-shots");

const CONTRADICTORY = `Create a brand page that feels minimalist and quiet, but also maximalist and richly decorated.

The interface should be dark with deep blacks, but also use a bright white background everywhere for clarity.

Keep the tone playful and informal, but maintain a formal, corporate and serious impression.

Use a monochrome palette only, and add plenty of vibrant colourful accents.`;

const STRONG = `Objective: design a landing page for a subscription analytics product that helps operations teams review weekly churn.

Audience: operations leads at B2B SaaS companies with 200-2000 employees. They are data-literate and sceptical of marketing claims.

Visual direction: editorial and restrained. Deep charcoal background, warm orange used only for one primary action and the single highlighted metric. No gradient washes, no stock photography.

Composition: a strong left-aligned headline block in the first viewport with a live product panel on the right. One consistent 12-column grid, spacing rhythm in 8px steps, section padding 96px on desktop.

Typography: one grotesk family. Headline at 56px with tight tracking, body at 16px with 1.6 line height and a 68 character measure, metadata in a monospace face at 11px uppercase.

Constraints: responsive down to 360px wide, WCAG AA contrast for all text, keyboard-focusable controls with visible focus rings, avoid carousels, avoid auto-playing motion.

Output requirements: return the page structure section by section with the copy written out, then a short rationale for the hierarchy decisions.`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

const report = { cases: [], errors: [] };

async function analyze(prompt, label, width = 1440) {
  const page = await browser.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push(message.text());
  });
  page.on("pageerror", (error) => report.errors.push(String(error)));
  await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/analyzer`, { waitUntil: "networkidle0" });
  await page.evaluate((text) => {
    const textarea = document.querySelector("#analyzer-prompt");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(textarea, text);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }, prompt);
  await new Promise((resolve) => setTimeout(resolve, 200));
  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Analyze prompt"),
    );
    if (target && !target.disabled) target.click();
  });
  await page
    .waitForFunction(() => (document.body.textContent ?? "").includes("Dimensions"), { timeout: 20_000 })
    .catch(() => null);
  await new Promise((resolve) => setTimeout(resolve, 700));

  const result = await page.evaluate(() => {
    const text = document.body.textContent ?? "";
    const scoreNode = Array.from(document.querySelectorAll("span")).find((node) =>
      /\/( 100)?$/.test(node.textContent ?? ""),
    );
    const overall = document.querySelector("span.font-mono");
    return {
      overallScore: overall?.textContent?.trim() ?? null,
      scoreNodeFound: Boolean(scoreNode),
      contradictions: text.includes("Potential contradictions"),
      contradictionCount: document.querySelectorAll("[class*='#1b1113'] li").length,
      weaknesses: document.querySelectorAll("ol li").length,
      missing: text.includes("Missing information"),
    };
  });

  await page.screenshot({ path: path.join(OUT, `analyzer-${label}.png`), fullPage: true });
  report.cases.push({ label, ...result });
  await page.close();
}

await analyze(CONTRADICTORY, "contradictory");
await analyze(STRONG, "strong");
await analyze(STRONG, "strong-mobile", 390);

await browser.close();
console.log(JSON.stringify(report, null, 2));

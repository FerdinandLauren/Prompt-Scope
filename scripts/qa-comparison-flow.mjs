import puppeteer from "puppeteer-core";
import path from "node:path";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.QA_OUT_DIR ?? path.join(process.cwd(), ".qa-shots");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

const report = { steps: [], errors: [], network: [] };

const page = await browser.newPage();
page.on("console", (message) => {
  if (message.type() === "error") report.errors.push(message.text());
});
page.on("pageerror", (error) => report.errors.push(String(error)));
page.on("response", async (response) => {
  if (response.url().includes("/api/ai/")) {
    report.network.push({ url: response.url().split("/api/ai/")[1], status: response.status() });
  }
});
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

await page.goto(`${BASE}/analyzer`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);

const clickByText = async (text) => {
  const clicked = await page.evaluate((needle) => {
    const target = Array.from(document.querySelectorAll("button")).find((button) =>
      (button.textContent ?? "").includes(needle),
    );
    if (!target || target.disabled) return false;
    target.click();
    return true;
  }, text);
  return clicked;
};

// 1. Analyze the contradictory sample.
await clickByText("Load sample");
await new Promise((resolve) => setTimeout(resolve, 200));
await clickByText("Analyze prompt");
await page.waitForFunction(() => document.body.textContent?.includes("Dimensions"), { timeout: 20_000 });
await new Promise((resolve) => setTimeout(resolve, 400));

const originalScore = await page.evaluate(() => {
  const node = Array.from(document.querySelectorAll("span")).find((span) =>
    /^\d{1,3}$/.test((span.textContent ?? "").trim()),
  );
  return node ? Number(node.textContent.trim()) : null;
});
report.steps.push({ step: "original-analyzed", originalScore });

// 2. Run the improver.
report.steps.push({ step: "improve-clicked", ok: await clickByText("Improve prompt") });
await page.waitForFunction(
  () => (document.querySelector("#improved-prompt")?.value ?? "").length > 100,
  { timeout: 20_000 },
);
await new Promise((resolve) => setTimeout(resolve, 300));
report.steps.push({
  step: "improved-ready",
  originalPreserved: await page.$eval("#original-prompt-readonly", (el) => el.value.length),
  improvedLength: await page.$eval("#improved-prompt", (el) => el.value.length),
  changes: await page.evaluate(
    () => document.querySelectorAll('[class*="line-soft"] li').length,
  ),
});

// 3. Evaluate the improved prompt and compare.
report.steps.push({ step: "evaluate-clicked", ok: await clickByText("Evaluate improved prompt") });
await page.waitForFunction(() => document.body.textContent?.includes("Before & after"), { timeout: 20_000 });
await new Promise((resolve) => setTimeout(resolve, 600));

const comparison = await page.evaluate(() => {
  const text = document.body.textContent ?? "";
  const dimRows = Array.from(document.querySelectorAll("li")).filter((li) =>
    /\d+\s*→\s*\d+/.test((li.textContent ?? "").replace(/\s+/g, " ")),
  );
  const scoreCells = Array.from(document.querySelectorAll("div"))
    .filter((div) => /^(Original|Improved|Change)$/.test((div.textContent ?? "").trim()))
    .map((div) => div.textContent?.trim());
  return {
    hasRadar: Boolean(document.querySelector("svg.recharts-surface")),
    hasBeforeAfter: text.includes("Before & after"),
    dimensionRows: dimRows.length,
    scoreCells,
    improvedCount: /(\d+) up/.exec(text)?.[1] ?? null,
    declinedCount: /(\d+) down/.exec(text)?.[1] ?? null,
    remainingIssues: text.includes("Still needs attention"),
    preservedNotice: text.includes("It is never overwritten"),
  };
});
report.steps.push({ step: "comparison", ...comparison });

await page.screenshot({ path: path.join(OUT, "comparison-flow-desktop.png"), fullPage: true });

// 4. Save and verify the comparisons page.
report.steps.push({ step: "save-clicked", ok: await clickByText("Save comparison") });
await new Promise((resolve) => setTimeout(resolve, 400));
await page.goto(`${BASE}/comparison`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
await new Promise((resolve) => setTimeout(resolve, 500));
const saved = await page.evaluate(() => {
  const text = document.body.textContent ?? "";
  return {
    records: document.querySelectorAll("aside li").length,
    hasRadar: Boolean(document.querySelector("svg.recharts-surface")),
    persisted: !text.includes("No comparisons recorded yet."),
    hasOriginalBlock: text.includes("Original prompt"),
    hasImprovedBlock: text.includes("Improved prompt"),
  };
});
report.steps.push({ step: "comparisons-page", ...saved });
await page.screenshot({ path: path.join(OUT, "comparison-page-desktop.png"), fullPage: true });

// 5. Reload to prove persistence, then check mobile.
await page.reload({ waitUntil: "networkidle0" });
const afterReload = await page.evaluate(() => {
  const text = document.body.textContent ?? "";
  return { persisted: !text.includes("No comparisons recorded yet.") };
});
report.steps.push({ step: "after-reload", ...afterReload });

const mobile = await browser.newPage();
await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await mobile.goto(`${BASE}/comparison`, { waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 600));
await mobile.screenshot({ path: path.join(OUT, "comparison-page-mobile.png"), fullPage: true });
report.steps.push({
  step: "mobile",
  scrollWidth: await mobile.evaluate(() => document.documentElement.scrollWidth),
  innerWidth: await mobile.evaluate(() => window.innerWidth),
});

await browser.close();
console.log(JSON.stringify(report, null, 2));

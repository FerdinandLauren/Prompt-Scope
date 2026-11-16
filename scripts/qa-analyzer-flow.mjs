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

const report = { steps: [], errors: [] };

async function newPage(width, height) {
  const page = await browser.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push(message.text());
  });
  page.on("pageerror", (error) => report.errors.push(String(error)));
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  return page;
}

const page = await newPage(1440, 1000);
await page.goto(`${BASE}/analyzer`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);

// Empty state and disabled analyze button.
report.steps.push({
  step: "initial",
  analyzeDisabled: await page.$eval("button ::-p-text(Analyze prompt)", (el) => el.disabled).catch(() => null),
  emptyVisible: await page.$eval("body", (el) => el.textContent?.includes("The diagnostic view opens here.") ?? false),
});

// Load the contradictory sample and analyze it.
await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const target = buttons.find((button) => button.textContent?.trim() === "Load sample");
  target?.click();
});
await new Promise((resolve) => setTimeout(resolve, 300));
report.steps.push({
  step: "sample-loaded",
  length: await page.$eval("#analyzer-prompt", (el) => el.value.length),
});

await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const target = buttons.find((button) => button.textContent?.includes("Analyze prompt"));
  if (target && !target.disabled) target.click();
});
await page.waitForFunction(
  () => (document.body.textContent ?? "").includes("Dimensions"),
  { timeout: 20_000 },
);
await new Promise((resolve) => setTimeout(resolve, 600));

const analysis = await page.evaluate(() => {
  const text = document.body.textContent ?? "";
  const score = document.querySelector('[style*="font-size"]')?.textContent ?? "";
  return {
    hasDimensions: text.includes("Dimensions"),
    hasWeaknesses: text.includes("Weaknesses"),
    hasMissing: text.includes("Missing information"),
    hasContradictions: text.includes("Potential contradictions"),
    hasRecommendations: text.includes("Recommendations"),
    demoBadge: text.includes("Demo data"),
    dimensionRows: document.querySelectorAll("ul li").length,
    scoreText: score.trim(),
  };
});
report.steps.push({ step: "analysis", ...analysis });

await page.screenshot({ path: path.join(OUT, "analyzer-desktop.png"), fullPage: true });

// Mobile pass.
const mobile = await newPage(390, 844);
await mobile.goto(`${BASE}/analyzer`, { waitUntil: "networkidle0" });
await mobile.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  buttons.find((button) => button.textContent?.trim() === "Load sample")?.click();
});
await new Promise((resolve) => setTimeout(resolve, 250));
await mobile.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const target = buttons.find((button) => button.textContent?.includes("Analyze prompt"));
  if (target && !target.disabled) target.click();
});
await mobile
  .waitForFunction(() => (document.body.textContent ?? "").includes("Dimensions"), { timeout: 20_000 })
  .catch(() => null);
await new Promise((resolve) => setTimeout(resolve, 500));
await mobile.screenshot({ path: path.join(OUT, "analyzer-mobile.png"), fullPage: true });
report.steps.push({
  step: "mobile",
  scrollWidth: await mobile.evaluate(() => document.documentElement.scrollWidth),
  innerWidth: await mobile.evaluate(() => window.innerWidth),
});

await browser.close();
console.log(JSON.stringify(report, null, 2));

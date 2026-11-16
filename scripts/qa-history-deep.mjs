import puppeteer from "puppeteer-core";
import path from "node:path";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

const report = { steps: [], errors: [] };
const page = await browser.newPage();
page.on("console", (message) => {
  if (message.type() === "error") report.errors.push(message.text());
});
page.on("pageerror", (error) => report.errors.push(String(error)));
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

const clickText = (needle) =>
  page.evaluate((text) => {
    const target = Array.from(document.querySelectorAll("button, a")).find((node) =>
      (node.textContent ?? "").includes(text),
    );
    if (!target || target.disabled) return false;
    target.click();
    return true;
  }, needle);

const readStore = () =>
  page.evaluate(() => {
    const sessions = JSON.parse(window.localStorage.getItem("promptscope.sessions.v1") ?? "[]");
    const comparisons = JSON.parse(window.localStorage.getItem("promptscope.comparisons.v1") ?? "[]");
    return {
      sessions: sessions.length,
      versions: sessions[0]?.versions?.length ?? 0,
      sources: (sessions[0]?.versions ?? []).map((version) => version.source),
      labels: (sessions[0]?.versions ?? []).map((version) => version.label ?? null),
      evaluated: (sessions[0]?.versions ?? []).filter((version) => version.evaluation).length,
      comparisons: comparisons.length,
      comparisonTitle: comparisons[0]?.title ?? null,
    };
  });

// Clean slate.
await page.goto(`${BASE}/history`, { waitUntil: "networkidle0" });
await page.evaluate(() => {
  window.localStorage.clear();
});
await page.reload({ waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);

// 1. Builder → save prompt (generated, unevaluated).
await page.goto(`${BASE}/builder`, { waitUntil: "networkidle0" });
await page.evaluate(() => {
  const textarea = document.querySelector("#objective");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  setter.call(
    textarea,
    "Design a calm analytics dashboard for a subscription operations team that reviews churn weekly.",
  );
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
});
await new Promise((resolve) => setTimeout(resolve, 200));
await clickText("Generate prompt");
await page.waitForFunction(() => (document.querySelector("#builder-prompt")?.value ?? "").length > 200, {
  timeout: 20_000,
});
await clickText("Save to history");
await page.waitForSelector("dialog[open]", { timeout: 5_000 });
await page.evaluate(() => {
  const input = document.querySelector("#session-title");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, "Churn dashboard direction");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await clickText("Save prompt");
await new Promise((resolve) => setTimeout(resolve, 400));
report.steps.push({ step: "builder-save", ...(await readStore()) });

// 2. History → analyze the saved version from the detail view.
await page.goto(`${BASE}/history`, { waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 300));
await page.evaluate(() => document.querySelector("ul li button")?.click());
await page.waitForSelector("dialog[open]", { timeout: 5_000 });
await new Promise((resolve) => setTimeout(resolve, 250));
report.steps.push({ step: "detail-open", analyzeClicked: await clickText("Analyze this version") });
await new Promise((resolve) => setTimeout(resolve, 800));
report.steps.push({
  step: "after-analyze-this-version",
  url: page.url(),
  hasHandoff: await page.evaluate(() => (document.body.textContent ?? "").includes("Load prompt")),
  bodySnippet: await page.evaluate(() => (document.body.textContent ?? "").slice(0, 200)),
});
try {
  await page.waitForFunction(() => document.body.textContent?.includes("Load prompt"), { timeout: 5_000 });
  await clickText("Load prompt");
  await new Promise((resolve) => setTimeout(resolve, 300));
  report.steps.push({
    step: "loaded-handoff",
    promptLength: await page.$eval("#analyzer-prompt", (el) => el.value.length),
  });
  const analyzeClicked = await clickText("Analyze prompt");
  report.steps.push({ step: "analyze-clicked", analyzeClicked });
  await page.waitForFunction(() => document.body.textContent?.includes("Dimensions"), { timeout: 25_000 });
} catch (flowError) {
  report.steps.push({
    step: "handoff-flow-failed",
    message: String(flowError).slice(0, 200),
    bodySnippet: await page.evaluate(() => (document.body.textContent ?? "").slice(-300)),
  });
}
await new Promise((resolve) => setTimeout(resolve, 500));
report.steps.push({
  step: "linked-evaluation",
  ...(await readStore()),
  savedBanner: await page.evaluate(() => (document.body.textContent ?? "").includes("Saved — open history")),
});

// 3. Improve and append the revision to the same session.
await clickText("Improve prompt");
await page.waitForFunction(() => (document.querySelector("#improved-prompt")?.value ?? "").length > 100, {
  timeout: 20_000,
});
await clickText("Evaluate improved prompt");
await page.waitForFunction(() => document.body.textContent?.includes("Before & after"), { timeout: 20_000 });
await new Promise((resolve) => setTimeout(resolve, 400));
await clickText("Save improved as new version");
await new Promise((resolve) => setTimeout(resolve, 500));
report.steps.push({ step: "appended-version", ...(await readStore()) });

// 4. Session detail: view evaluation, edit as new version, compare versions.
await page.goto(`${BASE}/history`, { waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 300));
await page.evaluate(() => document.querySelector("ul li button")?.click());
await page.waitForSelector("dialog[open]", { timeout: 5_000 });
await new Promise((resolve) => setTimeout(resolve, 250));
await clickText("View evaluation");
await new Promise((resolve) => setTimeout(resolve, 200));
report.steps.push({
  step: "view-evaluation",
  dimensionsShown: await page.evaluate(
    () => document.querySelectorAll("dialog ul li span[class*='w-']").length >= 8,
  ),
  hasSummary: await page.evaluate(() => (document.body.textContent ?? "").includes("Reported weaknesses")),
});

await clickText("Edit as new version");
await new Promise((resolve) => setTimeout(resolve, 200));
await page.evaluate(() => {
  const textareas = Array.from(document.querySelectorAll("dialog textarea"));
  const target = textareas.at(-1);
  if (!target) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  setter.call(target, `${target.value}\n\nAdditional instruction: keep the header fixed on scroll.`);
  target.dispatchEvent(new Event("input", { bubbles: true }));
});
await clickText("Save as new version");
await new Promise((resolve) => setTimeout(resolve, 400));
report.steps.push({ step: "edited-version", ...(await readStore()) });

await clickText("Compare with v");
await new Promise((resolve) => setTimeout(resolve, 800));
report.steps.push({
  step: "version-comparison",
  url: page.url(),
  ...(await readStore()),
  hasRadar: await page.evaluate(() => Boolean(document.querySelector("svg.recharts-surface"))),
});

// 5. Reload to prove persistence, then delete the session.
await page.reload({ waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 400));
report.steps.push({
  step: "persisted",
  hasRecord: await page.evaluate(() => (document.body.textContent ?? "").includes("Churn dashboard")),
});

await page.goto(`${BASE}/history`, { waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 300));
await page.evaluate(() => document.querySelector("ul li button")?.click());
await page.waitForSelector("dialog[open]", { timeout: 5_000 });
await clickText("Delete session");
await new Promise((resolve) => setTimeout(resolve, 400));
report.steps.push({
  step: "deleted",
  empty: await page.evaluate(() => (document.body.textContent ?? "").includes("The library is empty.")),
  ...(await readStore()),
});

await browser.close();
console.log(JSON.stringify(report, null, 2));

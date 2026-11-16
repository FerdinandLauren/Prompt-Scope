import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.QA_OUT_DIR ?? path.join(process.cwd(), ".qa-shots");

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

const report = { steps: [], errors: [] };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function newPage(width, height) {
  const page = await browser.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push(message.text());
  });
  page.on("pageerror", (error) => report.errors.push(String(error)));
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  return page;
}

async function clickText(page, text, { optional = false } = {}) {
  const clicked = await page.evaluate((needle) => {
    const candidates = Array.from(document.querySelectorAll("button, a"));
    const target = candidates.find((element) => (element.textContent ?? "").includes(needle));
    if (!target) return false;
    target.click();
    return true;
  }, text);
  if (!clicked && !optional) throw new Error(`No clickable element matching "${text}"`);
  return clicked;
}

async function waitForText(page, text, timeout = 20_000) {
  try {
    await page.waitForFunction(
      (needle) => (document.body.textContent ?? "").includes(needle),
      { timeout },
      text,
    );
    return true;
  } catch {
    return false;
  }
}

async function bodyText(page) {
  return page.evaluate(() => document.body.textContent ?? "");
}

const page = await newPage(1440, 1100);
await page.goto(`${BASE}/builder`, { waitUntil: "networkidle0" });
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);

const initial = await bodyText(page);
report.steps.push({
  step: "initial",
  guidedTabSelected: await page.evaluate(
    () => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.includes("Guided") ?? false,
  ),
  hasIdeaField: initial.includes("What are you trying to make or improve?"),
  hasBudgetSelect: initial.includes("Question budget"),
  stepRail: initial.includes("Questions") && initial.includes("Brief"),
});

// Pick the design sample so the flow starts from a realistic idea.
await clickText(page, "UI/UX");
await pause(200);
report.steps.push({
  step: "sample-filled",
  ideaLength: await page.$eval("#guided-idea", (el) => el.value.length).catch(() => 0),
});

await clickText(page, "Understand my idea");
const firstQuestion = await waitForText(page, "Question 1");
report.steps.push({
  step: "discovery",
  firstQuestion,
  understandingPanel: await waitForText(page, "What PromptScope understood"),
  demoLabel: (await bodyText(page)).includes("Demo discovery"),
});

// Unknown answer -> recommendation -> accepted assumption.
await clickText(page, "I don't know");
const recommendation = await waitForText(page, "PromptScope recommends");
await pause(300);
report.steps.push({ step: "recommendation", shown: recommendation });
await page.screenshot({ path: path.join(OUT, "guided-recommendation.png"), fullPage: true });
if (recommendation) await clickText(page, "Keep this assumption");

// Answer remaining questions until the brief is ready (bounded).
let answers = 0;
for (let index = 0; index < 10; index += 1) {
  const text = await bodyText(page);
  if (text.includes("The brief is ready to review.") || text.includes("Confirm brief")) break;
  const hasQuestion = /Question \d+/.test(text);
  if (!hasQuestion) break;

  const typed = await page.evaluate(() => {
    const textarea = document.querySelector('textarea[placeholder^="Type your answer"]');
    if (!textarea) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(textarea, "Weekly review with role-based approval and an export of the decision history.");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  });
  if (!typed) break;
  await pause(150);
  await clickText(page, "Continue");
  answers += 1;
  await pause(900);
}

report.steps.push({ step: "interview", answers, briefReady: (await bodyText(page)).includes("Confirm brief") || (await bodyText(page)).includes("Project brief") });

if (!(await bodyText(page)).includes("Confirm brief")) {
  await clickText(page, "Review brief now", { optional: true });
  await pause(400);
}
if (!(await bodyText(page)).includes("Confirm brief")) {
  await clickText(page, "Review project brief", { optional: true });
  await pause(400);
}

const briefText = await bodyText(page);
report.steps.push({
  step: "brief",
  visible: briefText.includes("Project brief"),
  labelsUserInput: briefText.includes("Your input"),
  labelsAssumption: briefText.includes("Assumption"),
  openQuestions: briefText.includes("Open questions"),
});
await page.screenshot({ path: path.join(OUT, "guided-brief.png"), fullPage: true });

await clickText(page, "Confirm brief");
await pause(400);
report.steps.push({
  step: "tuning",
  depthOptions: (await bodyText(page)).includes("Comprehensive"),
  agentOptions: (await bodyText(page)).includes("Coding / Software Agent"),
});

await page.evaluate(() => {
  const labels = Array.from(document.querySelectorAll("label"));
  const detailed = labels.find((label) => (label.textContent ?? "").startsWith("Detailed"));
  const radio = detailed?.querySelector('input[name="guided-depth"]');
  if (radio) radio.click();
});
await pause(150);
await page.evaluate(() => {
  const labels = Array.from(document.querySelectorAll("label"));
  const coding = labels.find((label) => (label.textContent ?? "").includes("Coding / Software Agent"));
  const radio = coding?.querySelector('input[name="guided-agent"]');
  if (radio) radio.click();
});
await pause(200);

await page.screenshot({ path: path.join(OUT, "guided-tuning.png"), fullPage: true });

await clickText(page, "Generate prompt");
const generated = await waitForText(page, "Copy full", 30_000);
await pause(500);

const outputText = await bodyText(page);
report.steps.push({
  step: "output",
  generated,
  sourceLabel: outputText.includes("Demo data") || outputText.includes("Local draft") || outputText.includes("Model output"),
  demoNotice: outputText.includes("DEMO DATA") || outputText.includes("Local draft"),
  depthBadge: outputText.includes("Detailed depth"),
  agentBadge: outputText.includes("Coding / Software Agent"),
  hasOutline: outputText.includes("Outline"),
  hasRepositoryInspection: outputText.includes("Repository Inspection"),
  hasVerification: outputText.includes("Verification"),
  hasFinalReport: outputText.includes("Final Report"),
  longPromptChars: await page.evaluate(() => {
    const text = document.body.textContent ?? "";
    return text.length;
  }),
});
await page.screenshot({ path: path.join(OUT, "guided-output.png"), fullPage: true });

// Section copy button exists and is labelled for accessibility.
report.steps.push({
  step: "copy-affordances",
  sectionCopyButtons: await page.$$eval('button[aria-label^="Copy section"]', (nodes) => nodes.length),
  hasExport: (await bodyText(page)).includes("Markdown"),
});

// Save to history dialog opens.
await clickText(page, "Save to history");
await pause(300);
report.steps.push({ step: "save-dialog", open: Boolean(await page.$("dialog[open]")) });
if (await page.$("dialog[open]")) {
  await clickText(page, "Cancel", { optional: true });
  await pause(200);
}

// Mode switch keeps the generated work.
await clickText(page, "Advanced");
await pause(300);
const advancedText = await bodyText(page);
report.steps.push({
  step: "mode-switch",
  advancedVisible: advancedText.includes("Prompt shape"),
  objectivePreserved: await page.evaluate(() => {
    const textarea = document.querySelector("#objective");
    return textarea instanceof HTMLTextAreaElement ? textarea.value.trim().length > 10 : false;
  }),
  guidedHidden: await page.evaluate(() => {
    const tab = document.querySelector('[role="tab"][aria-selected="true"]');
    return tab?.textContent?.includes("Advanced") ?? false;
  }),
});
await page.screenshot({ path: path.join(OUT, "guided-advanced-mode.png"), fullPage: true });

await clickText(page, "Guided");
await pause(400);
report.steps.push({
  step: "mode-switch-back",
  outputPreserved: (await bodyText(page)).includes("Copy full"),
});

// Analyze handoff.
await clickText(page, "Analyze prompt");
const analyzerReady = await waitForText(page, "Prompt Analyzer", 20_000);
await pause(500);
const loaded = await clickText(page, "Load prompt", { optional: true });
await pause(500);
report.steps.push({
  step: "analyzer-handoff",
  analyzerReady,
  handoffNotice: await waitForText(page, "handed over from the builder", 5_000),
  handoffLoaded: loaded,
  promptLength: await page.evaluate(() => {
    const textarea = document.querySelector("textarea");
    return textarea instanceof HTMLTextAreaElement ? textarea.value.length : 0;
  }),
  categoryLabel: (await bodyText(page)).includes("Backend") || (await bodyText(page)).includes("Full-Stack"),
});

await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const target = buttons.find((button) => (button.textContent ?? "").includes("Analyze prompt"));
  if (target && !target.disabled) target.click();
});
await waitForText(page, "Dimensions", 30_000);
await pause(600);
const analysisText = await bodyText(page);
report.steps.push({
  step: "analysis",
  hasDimensions: analysisText.includes("Dimensions"),
  rubricBadge: /Rubric\s+visual-uiux-v1/.test(analysisText),
  domainLabels: analysisText.includes("Visual Direction") && analysisText.includes("Typography"),
  hasWeaknesses: analysisText.includes("Weaknesses"),
  hasMissing: analysisText.includes("Missing information"),
  demoBadge: analysisText.includes("Demo data"),
});
await page.screenshot({ path: path.join(OUT, "guided-analysis.png"), fullPage: true });

// Mobile pass of the guided builder.
const mobile = await newPage(390, 844);
await mobile.goto(`${BASE}/builder`, { waitUntil: "networkidle0" });
await mobile.evaluate(() => document.fonts.ready);
await pause(400);
report.steps.push({
  step: "mobile",
  scrollWidth: await mobile.evaluate(() => document.documentElement.scrollWidth),
  innerWidth: await mobile.evaluate(() => window.innerWidth),
  guidedVisible: (await mobile.evaluate(() => document.body.textContent ?? "")).includes("Describe your idea"),
});
await mobile.screenshot({ path: path.join(OUT, "guided-mobile.png"), fullPage: true });

await browser.close();
console.log(JSON.stringify(report, null, 2));

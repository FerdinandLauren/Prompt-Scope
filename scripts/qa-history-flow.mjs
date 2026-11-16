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
const page = await browser.newPage();
page.on("console", (message) => {
  if (message.type() === "error") report.errors.push(message.text());
});
page.on("pageerror", (error) => report.errors.push(String(error)));
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.goto(`${BASE}/history`, { waitUntil: "networkidle0" });
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);

const clickText = (needle) =>
  page.evaluate((text) => {
    const target = Array.from(document.querySelectorAll("button, a")).find((node) =>
      (node.textContent ?? "").includes(text),
    );
    if (!target || target.disabled) return false;
    target.click();
    return true;
  }, needle);

report.steps.push({
  step: "empty-history",
  empty: await page.evaluate(() => (document.body.textContent ?? "").includes("The library is empty.")),
});

// Analyze a prompt, then save it.
await page.goto(`${BASE}/analyzer`, { waitUntil: "networkidle0" });
await clickText("Load sample");
await new Promise((resolve) => setTimeout(resolve, 200));
await clickText("Analyze prompt");
await page.waitForFunction(() => document.body.textContent?.includes("Dimensions"), { timeout: 20_000 });
await new Promise((resolve) => setTimeout(resolve, 300));
report.steps.push({ step: "analyzed", saveVisible: await clickText("Save to history") });

try {
  await page.waitForSelector("dialog[open]", { timeout: 5_000 });
} catch {
  report.steps.push({
    step: "save-dialog-missing",
    bodySnippet: await page.evaluate(() => (document.body.textContent ?? "").slice(-400)),
  });
}
report.steps.push({
  step: "dialog-state",
  open: await page.evaluate(() => Boolean(document.querySelector("dialog[open]"))),
  dialogExists: await page.evaluate(() => Boolean(document.querySelector("dialog"))),
});
await page.evaluate(() => {
  const input = document.querySelector("#session-title");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, "Dashboard refresh — round one");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await clickText("Save prompt");
await new Promise((resolve) => setTimeout(resolve, 500));
report.steps.push({
  step: "saved",
  confirmVisible: await page.evaluate(() => (document.body.textContent ?? "").includes("Saved — open history")),
});

// Improve and save the improved version into the same session.
await clickText("Improve prompt");
await page.waitForFunction(() => (document.querySelector("#improved-prompt")?.value ?? "").length > 100, {
  timeout: 20_000,
});
await clickText("Evaluate improved prompt");
await page.waitForFunction(() => document.body.textContent?.includes("Before & after"), { timeout: 20_000 });
await new Promise((resolve) => setTimeout(resolve, 400));
report.steps.push({ step: "version-saved", ok: await clickText("Save improved as new version") });
await new Promise((resolve) => setTimeout(resolve, 500));

// Inspect the history library.
await page.goto(`${BASE}/history`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
await new Promise((resolve) => setTimeout(resolve, 400));
const history = await page.evaluate(() => {
  const text = document.body.textContent ?? "";
  return {
    rows: document.querySelectorAll("ul li button").length,
    hasTitle: text.includes("Dashboard refresh — round one"),
    hasComparedBadge: text.includes("compared"),
    hasScore: /\b\d{1,3}\b/.test(text),
  };
});
report.steps.push({ step: "history-library", ...history });

// Open the session detail and exercise version actions.
await page.evaluate(() => {
  const row = document.querySelector("ul li button");
  row?.click();
});
try {
  await page.waitForSelector("dialog[open]", { timeout: 5_000 });
} catch {
  report.steps.push({
    step: "detail-dialog-missing",
    rows: await page.evaluate(() => document.querySelectorAll("ul li button").length),
    bodySnippet: await page.evaluate(() => (document.body.textContent ?? "").slice(0, 300)),
  });
}
await new Promise((resolve) => setTimeout(resolve, 300));
const detail = await page.evaluate(() => {
  const text = document.body.textContent ?? "";
  const stored = JSON.parse(window.localStorage.getItem("promptscope.sessions.v1") ?? "[]");
  return {
    versionCards: document.querySelectorAll("dialog ol > li").length,
    storedVersions: stored[0]?.versions?.length ?? 0,
    storedSources: (stored[0]?.versions ?? []).map((version) => version.source),
    storedScores: (stored[0]?.versions ?? []).map((version) => version.evaluation?.overallScore ?? null),
    storedRubrics: (stored[0]?.versions ?? []).map((version) => version.evaluation?.rubricVersion ?? null),
    hasComparisonRecord: Boolean(stored[0]?.lastComparison),
    hasCurrentBadge: text.includes("Current"),
    hasImprovedSource: text.includes("improved"),
    hasRestore: text.includes("Restore as new version"),
    hasSetCurrent: text.includes("Set as current"),
  };
});
report.steps.push({ step: "session-detail", ...detail });
await page.screenshot({ path: path.join(OUT, "history-detail.png"), fullPage: false });

// Restore and verify a version is appended, not overwritten.
await clickText("Restore as new version");
await new Promise((resolve) => setTimeout(resolve, 500));
const afterRestore = await page.evaluate(() => {
  const stored = JSON.parse(window.localStorage.getItem("promptscope.sessions.v1") ?? "[]");
  return {
    cardCount: document.querySelectorAll("dialog ol > li").length,
    storedVersions: stored[0]?.versions?.length ?? 0,
    storedSources: (stored[0]?.versions ?? []).map((version) => version.source),
  };
});
report.steps.push({ step: "after-restore", ...afterRestore });

// Close, reload and confirm persistence.
await page.evaluate(() => document.querySelector("dialog[open]")?.close());
await page.reload({ waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 400));
const afterReload = await page.evaluate(() => {
  const text = document.body.textContent ?? "";
  return {
    persisted: text.includes("Dashboard refresh — round one"),
    rows: document.querySelectorAll("ul li button").length,
  };
});
report.steps.push({ step: "after-reload", ...afterReload });
await page.screenshot({ path: path.join(OUT, "history-library.png"), fullPage: true });

// Dashboard should now reflect real activity.
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 500));
const dashboard = await page.evaluate(() => {
  const text = document.body.textContent ?? "";
  const stats = Array.from(document.querySelectorAll("dd")).map((node) => node.textContent?.trim());
  return {
    stats,
    hasRecent: text.includes("Recent prompts"),
    hasQuickPreview: text.includes("Quick comparison preview"),
    noPlaceholderZeros: !text.includes("No recent prompts"),
  };
});
report.steps.push({ step: "dashboard", ...dashboard });
await page.screenshot({ path: path.join(OUT, "dashboard-with-data.png"), fullPage: true });

// Deletion must also work.
await page.goto(`${BASE}/history`, { waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 400));
await page.evaluate(() => document.querySelector("ul li button")?.click());
try {
  await page.waitForSelector("dialog[open]", { timeout: 5_000 });
  await clickText("Delete session");
} catch {
  report.steps.push({
    step: "delete-dialog-missing",
    rows: await page.evaluate(() => document.querySelectorAll("ul li button").length),
  });
}
await new Promise((resolve) => setTimeout(resolve, 500));
report.steps.push({
  step: "after-delete",
  empty: await page.evaluate(() => (document.body.textContent ?? "").includes("The library is empty.")),
});

const mobile = await browser.newPage();
await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await mobile.goto(`${BASE}/history`, { waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 300));
report.steps.push({
  step: "mobile",
  scrollWidth: await mobile.evaluate(() => document.documentElement.scrollWidth),
  innerWidth: await mobile.evaluate(() => window.innerWidth),
});

await browser.close();
console.log(JSON.stringify(report, null, 2));

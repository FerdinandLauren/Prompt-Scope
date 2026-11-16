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

const clickText = (needle) =>
  page.evaluate((text) => {
    const target = Array.from(document.querySelectorAll("button, a")).find((node) =>
      (node.textContent ?? "").includes(text),
    );
    if (!target || target.disabled) return false;
    target.click();
    return true;
  }, needle);

// Seed one analysed session, an improved version and a saved comparison.
await page.goto(`${BASE}/history`, { waitUntil: "networkidle0" });
await page.evaluate(() => window.localStorage.clear());
await page.goto(`${BASE}/analyzer`, { waitUntil: "networkidle0" });
await clickText("Load sample");
await new Promise((resolve) => setTimeout(resolve, 250));
await clickText("Analyze prompt");
await new Promise((resolve) => setTimeout(resolve, 2500));
await clickText("Save to history");
await page.waitForSelector("dialog[open]", { timeout: 5000 });
await page.evaluate(() => {
  const input = document.querySelector("#session-title");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, "Dashboard refresh — round one");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await clickText("Save prompt");
await new Promise((resolve) => setTimeout(resolve, 500));
await clickText("Improve prompt");
await new Promise((resolve) => setTimeout(resolve, 2500));
await clickText("Evaluate improved prompt");
await new Promise((resolve) => setTimeout(resolve, 2500));
await clickText("Save improved as new version");
await new Promise((resolve) => setTimeout(resolve, 400));
await clickText("Save comparison");
await new Promise((resolve) => setTimeout(resolve, 400));

report.steps.push({
  step: "seeded",
  store: await page.evaluate(() => ({
    sessions: JSON.parse(window.localStorage.getItem("promptscope.sessions.v1") ?? "[]").length,
    comparisons: JSON.parse(window.localStorage.getItem("promptscope.comparisons.v1") ?? "[]").length,
  })),
});

for (const theme of ["dark", "light"]) {
  await page.evaluate((value) => {
    window.localStorage.setItem("promptscope.theme.v1", value);
  }, theme);

  for (const [route, name] of [
    ["/", "final-dashboard"],
    ["/comparison", "final-comparison"],
    ["/history", "final-history"],
    ["/docs", "final-docs"],
    ["/settings", "final-settings"],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await page.screenshot({ path: path.join(OUT, `${name}-${theme}.png`), fullPage: true });
    report.steps.push({
      step: `${name}-${theme}`,
      scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
      innerWidth: await page.evaluate(() => window.innerWidth),
    });
  }

  // The builder needs a generated prompt to show its real density.
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
  await new Promise((resolve) => setTimeout(resolve, 300));
  await page.screenshot({ path: path.join(OUT, `final-builder-generated-${theme}.png`), fullPage: true });
  report.steps.push({
    step: `final-builder-generated-${theme}`,
    scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
  });

  // Analyzer with a real result, which is the densest surface.
  await page.goto(`${BASE}/analyzer`, { waitUntil: "networkidle0" });
  await clickText("Load sample");
  await new Promise((resolve) => setTimeout(resolve, 250));
  await clickText("Analyze prompt");
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await page.screenshot({ path: path.join(OUT, `final-analyzer-${theme}.png`), fullPage: true });
  report.steps.push({
    step: `final-analyzer-${theme}`,
    scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
  });
}

const mobile = await browser.newPage();
await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await mobile.goto(`${BASE}/docs`, { waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 400));
await mobile.screenshot({ path: path.join(OUT, "final-docs-mobile.png"), fullPage: true });
report.steps.push({
  step: "docs-mobile",
  scrollWidth: await mobile.evaluate(() => document.documentElement.scrollWidth),
});

await browser.close();
console.log(JSON.stringify(report, null, 2));

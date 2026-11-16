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

// 1. Builder: validation, preset, chips, generate.
const page = await newPage(1440, 1000);
await page.goto(`${BASE}/builder`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);

// Submit empty to prove validation blocks generation.
await page.click("button ::-p-text(Generate prompt)").catch(async () => {
  const buttons = await page.$$("button");
  for (const button of buttons) {
    const text = await button.evaluate((el) => el.textContent ?? "");
    if (text.includes("Generate prompt")) {
      await button.click();
      break;
    }
  }
});
await new Promise((resolve) => setTimeout(resolve, 400));
report.steps.push({
  step: "empty-submit",
  emptyStateVisible: await page
    .$eval("body", (el) => el.textContent?.includes("Your prompt will take shape here.") ?? false)
    .catch(() => false),
  toastPresent: await page.$eval("body", (el) =>
    el.textContent?.includes("Complete the required direction fields") ?? false,
  ),
});

// Reset validation, then pick a preset and fill the objective.
const presetButtons = await page.$$("button[aria-pressed]");
for (const button of presetButtons) {
  const text = await button.evaluate((el) => el.textContent ?? "");
  if (text.includes("Visual excellence")) {
    await button.click();
    break;
  }
}
report.steps.push({
  step: "preset",
  sliders: await page.evaluate(() =>
    Array.from(document.querySelectorAll('input[type="range"]')).map((input) => input.value),
  ),
});

await page.evaluate(() => {
  const textarea = document.querySelector("#objective");
  if (textarea) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    ).set;
    setter.call(textarea, "Design a calm analytics dashboard for a subscription operations team that reviews churn weekly.");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
await new Promise((resolve) => setTimeout(resolve, 150));

// Open the visual direction disclosure and select two chips.
await page.evaluate(() => {
  const summaries = Array.from(document.querySelectorAll("summary"));
  const target = summaries.find((node) => node.textContent?.includes("Visual direction"));
  if (target && !target.closest("details").open) target.click();
});
await new Promise((resolve) => setTimeout(resolve, 200));

const chips = await page.$$("button[aria-pressed]");
let picked = 0;
for (const chip of chips) {
  const text = (await chip.evaluate((el) => el.textContent ?? "")).trim();
  if (["Minimalist", "Editorial", "Futuristic"].includes(text)) {
    await chip.click();
    picked += 1;
  }
}
report.steps.push({ step: "chips", picked });

// Generate the structured draft.
const generateButtons = await page.$$("button");
for (const button of generateButtons) {
  const text = await button.evaluate((el) => el.textContent ?? "");
  if (text.includes("Generate prompt")) {
    await button.click();
    break;
  }
}
await page.waitForFunction(
  () => (document.querySelector("#builder-prompt")?.value ?? "").length > 200,
  { timeout: 10_000 },
);
report.steps.push({
  step: "generate",
  promptLength: await page.$eval("#builder-prompt", (el) => el.value.length),
  title: await page.$eval("#prompt-title", (el) => el.value),
  draftNotice: await page.$eval("body", (el) => el.textContent?.includes("Local draft") ?? false),
});

await page.screenshot({ path: path.join(OUT, "builder-flow-desktop.png"), fullPage: true });

// 2. Mobile builder.
const mobile = await newPage(390, 844);
await mobile.goto(`${BASE}/builder`, { waitUntil: "networkidle0" });
await mobile.evaluate(() => document.fonts.ready);
await mobile.screenshot({ path: path.join(OUT, "builder-flow-mobile.png"), fullPage: true });
report.steps.push({
  step: "mobile-builder",
  scrollWidth: await mobile.evaluate(() => document.documentElement.scrollWidth),
  innerWidth: await mobile.evaluate(() => window.innerWidth),
});

// 3. Keyboard access: focus the first slider and change it with arrow keys.
const slider = await page.$('input[type="range"]');
await slider.focus();
const before = await slider.evaluate((el) => el.value);
for (let index = 0; index < 5; index += 1) await page.keyboard.press("ArrowRight");
const after = await slider.evaluate((el) => el.value);
report.steps.push({ step: "keyboard-slider", before, after });

await browser.close();
console.log(JSON.stringify(report, null, 2));

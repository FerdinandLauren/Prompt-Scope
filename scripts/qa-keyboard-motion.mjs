import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

const report = { steps: [], errors: [] };

async function newPage(width = 1440, height = 1000) {
  const page = await browser.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push(message.text());
  });
  page.on("pageerror", (error) => report.errors.push(String(error)));
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  return page;
}

const active = (page) =>
  page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return null;
    const style = getComputedStyle(element);
    return {
      tag: element.tagName.toLowerCase(),
      label:
        element.getAttribute("aria-label") ??
        element.getAttribute("id") ??
        (element.textContent ?? "").trim().slice(0, 40),
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      role: element.getAttribute("role"),
      type: element.getAttribute("type"),
    };
  });

// 1. Keyboard traversal of the app shell.
const page = await newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);

const first = await active(page);
await page.keyboard.press("Tab");
const second = await active(page);
report.steps.push({ step: "skip-link", first, second });

// Tab to the primary navigation and activate a link with Enter.
const trail = [];
for (let index = 0; index < 8; index += 1) {
  await page.keyboard.press("Tab");
  trail.push(await active(page));
}
report.steps.push({ step: "tab-trail", trail });

// 2. Slider operation on the builder (arrow keys, Home/End, focus ring).
await page.goto(`${BASE}/builder`, { waitUntil: "networkidle0" });
await page.evaluate(() => {
  const slider = document.querySelector("#slider-typography");
  slider?.focus();
});
const beforeSlider = await page.$eval("#slider-typography", (element) => element.value);
for (let index = 0; index < 5; index += 1) await page.keyboard.press("ArrowRight");
await page.keyboard.press("Home");
const afterHome = await page.$eval("#slider-typography", (element) => element.value);
await page.keyboard.press("End");
const afterEnd = await page.$eval("#slider-typography", (element) => element.value);
report.steps.push({
  step: "slider-keyboard",
  beforeSlider,
  afterHome,
  afterEnd,
  focusVisible: (await active(page)).outlineWidth,
});

// 3. Disclosure sections open with the keyboard.
await page.evaluate(() => {
  const summary = Array.from(document.querySelectorAll("summary")).find((node) =>
    node.textContent?.includes("Visual direction"),
  );
  summary?.focus();
});
await page.keyboard.press("Enter");
const opened = await page.evaluate(() => {
  const details = Array.from(document.querySelectorAll("details")).find((node) =>
    node.querySelector("summary")?.textContent?.includes("Visual direction"),
  );
  return details?.open ?? false;
});
report.steps.push({ step: "disclosure-keyboard", opened });

// 4. Chip toggle with Space.
const chipToggled = await page.evaluate(() => {
  const chip = Array.from(document.querySelectorAll("button[aria-pressed]")).find((node) =>
    node.textContent?.includes("Editorial"),
  );
  chip?.focus();
  return Boolean(chip);
});
await page.keyboard.press("Space");
const chipState = await page.evaluate(() =>
  Array.from(document.querySelectorAll("button[aria-pressed]"))
    .find((node) => node.textContent?.includes("Editorial"))
    ?.getAttribute("aria-pressed"),
);
report.steps.push({ step: "chip-keyboard", chipToggled, chipState });

// 5. Modal focus behaviour on the analyzer save dialog.
await page.goto(`${BASE}/analyzer`, { waitUntil: "networkidle0" });
await page.evaluate(() => {
  const target = Array.from(document.querySelectorAll("button")).find((node) =>
    node.textContent?.includes("Load sample"),
  );
  target?.click();
});
await new Promise((resolve) => setTimeout(resolve, 300));
await page.evaluate(() => {
  const target = Array.from(document.querySelectorAll("button")).find((node) =>
    node.textContent?.includes("Analyze prompt"),
  );
  if (target && !target.disabled) target.click();
});
await new Promise((resolve) => setTimeout(resolve, 2500));
const hasResult = await page.evaluate(() => (document.body.textContent ?? "").includes("Dimensions"));
report.steps.push({ step: "analyzer-result-for-modal", hasResult });

if (hasResult) {
  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll("button")).find((node) =>
      node.textContent?.includes("Save to history"),
    );
    target?.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
  const dialog = await page.evaluate(() => {
    const element = document.querySelector("dialog");
    return {
      open: element?.open ?? false,
      activeInsideDialog: element?.contains(document.activeElement) ?? false,
    };
  });
  await page.keyboard.press("Escape");
  await new Promise((resolve) => setTimeout(resolve, 300));
  const closed = await page.evaluate(() => !(document.querySelector("dialog")?.open ?? false));
  report.steps.push({ step: "modal-keyboard", ...dialog, escapeCloses: closed });
}

// 6. Reduced motion: movement is removed, content still renders.
const reduced = await newPage(1280, 900);
await reduced.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await reduced.goto(`${BASE}/builder`, { waitUntil: "networkidle0" });
const motion = await reduced.evaluate(() => {
  const probe = document.createElement("div");
  probe.className = "enter-rise";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const result = { animationName: style.animationName, animationDuration: style.animationDuration };
  probe.remove();
  return result;
});
report.steps.push({ step: "reduced-motion", ...motion });

// 7. Focus ring visibility on a primary action.
const ring = await reduced.evaluate(() => {
  const button = Array.from(document.querySelectorAll("button")).find((node) =>
    node.textContent?.includes("Generate prompt"),
  );
  if (!button) return null;
  button.focus();
  const style = getComputedStyle(button);
  return { outlineWidth: style.outlineWidth, outlineColor: style.outlineColor, outlineOffset: style.outlineOffset };
});
report.steps.push({ step: "focus-ring", ring });

await browser.close();
console.log(JSON.stringify(report, null, 2));

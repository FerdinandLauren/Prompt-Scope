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

async function newPage(theme, width, height, reducedMotion = false) {
  const page = await browser.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push(`${theme}: ${message.text()}`);
  });
  page.on("pageerror", (error) => report.errors.push(`${theme}: ${String(error)}`));
  if (reducedMotion) {
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  }
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((value) => {
    try {
      window.localStorage.setItem("promptscope.theme.v1", value);
    } catch {
      /* ignore */
    }
  }, theme);
  return page;
}

const routes = ["/", "/builder", "/analyzer", "/comparison", "/history", "/settings", "/docs"];

for (const theme of ["dark", "light"]) {
  const page = await newPage(theme, 1440, 1000);
  for (const route of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => ({
      appliedTheme: document.documentElement.dataset.theme,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflowing: Array.from(document.querySelectorAll("body *"))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return false;
          if (getComputedStyle(element).position === "fixed") return false;
          return rect.right > window.innerWidth + 1 || rect.left < -1;
        })
        .slice(0, 5)
        .map((element) => `${element.tagName.toLowerCase()}.${element.className}`.slice(0, 80)),
    }));
    report.steps.push({ theme, route, ...metrics });
    const slug = route === "/" ? "home" : route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    await page.screenshot({ path: path.join(OUT, `theme-${theme}-${slug}.png`), fullPage: true });
  }
  await page.close();
}

// Light mode on mobile and with reduced motion.
const mobile = await newPage("light", 390, 844);
await mobile.goto(`${BASE}/builder`, { waitUntil: "networkidle0" });
await mobile.screenshot({ path: path.join(OUT, "theme-light-builder-mobile.png"), fullPage: true });
report.steps.push({
  step: "light-mobile",
  scrollWidth: await mobile.evaluate(() => document.documentElement.scrollWidth),
  theme: await mobile.evaluate(() => document.documentElement.dataset.theme),
});
await mobile.close();

const reduced = await newPage("light", 1280, 900, true);
await reduced.goto(`${BASE}/analyzer`, { waitUntil: "networkidle0" });
report.steps.push({
  step: "light-reduced-motion",
  theme: await reduced.evaluate(() => document.documentElement.dataset.theme),
  animationDuration: await reduced.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "enter-rise";
    document.body.appendChild(probe);
    const duration = getComputedStyle(probe).animationDuration;
    probe.remove();
    return duration;
  }),
});
await reduced.close();

// Theme switching without a reload must repaint immediately, and the choice must
// survive a reload. This page is created without the storage seeding hook so the
// application's own persistence is what gets measured.
const switcher = await browser.newPage();
switcher.on("console", (message) => {
  if (message.type() === "error") report.errors.push(`switch: ${message.text()}`);
});
await switcher.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await switcher.goto(`${BASE}/settings`, { waitUntil: "networkidle0" });
await switcher.evaluate(() => window.localStorage.removeItem("promptscope.theme.v1"));
await switcher.reload({ waitUntil: "networkidle0" });
const before = await switcher.evaluate(() => document.documentElement.dataset.theme);
await switcher.evaluate(() => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (node) => node.textContent?.trim() === "Light",
  );
  button?.click();
});
await new Promise((resolve) => setTimeout(resolve, 400));
const after = await switcher.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  stored: window.localStorage.getItem("promptscope.theme.v1"),
  background: getComputedStyle(document.body).backgroundColor,
}));
await switcher.reload({ waitUntil: "networkidle0" });
const persisted = await switcher.evaluate(() => document.documentElement.dataset.theme);
report.steps.push({ step: "theme-switch", before, after, persisted });

// Switching back to dark must also persist.
await switcher.evaluate(() => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (node) => node.textContent?.trim() === "Dark",
  );
  button?.click();
});
await new Promise((resolve) => setTimeout(resolve, 300));
await switcher.reload({ waitUntil: "networkidle0" });
report.steps.push({
  step: "theme-switch-back",
  persisted: await switcher.evaluate(() => document.documentElement.dataset.theme),
});

await switcher.close();

await browser.close();
console.log(JSON.stringify(report, null, 2));

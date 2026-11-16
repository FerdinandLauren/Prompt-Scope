import puppeteer from "puppeteer-core";
import fs from "node:fs/promises";
import path from "node:path";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.QA_OUT_DIR ?? path.join(process.cwd(), ".qa-shots");

const routes = (process.env.QA_ROUTES ?? "/").split(",").filter(Boolean);
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 900, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

await fs.mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

const report = [];

for (const route of routes) {
  const slug = route === "/" ? "home" : route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  for (const viewport of viewports) {
    const page = await browser.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => {
      const width = window.innerWidth;
      const overflowing = [];
      for (const element of document.querySelectorAll("body *")) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        if (rect.right > width + 1 || rect.left < -1) {
          const style = getComputedStyle(element);
          if (style.position === "fixed") continue;
          overflowing.push({
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === "string" ? element.className.slice(0, 100) : "",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            text: (element.textContent ?? "").trim().slice(0, 60),
          });
        }
      }
      return {
        innerWidth: width,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        overflowing: overflowing.slice(0, 12),
      };
    });
    const file = path.join(OUT, `${slug}-${viewport.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.push({ route, viewport: viewport.name, file, errors, ...metrics });
    await page.close();
  }
}

await browser.close();
console.log(JSON.stringify(report, null, 2));

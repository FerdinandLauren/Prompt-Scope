import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const AXE_URL = process.env.AXE_URL ?? "https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

const report = { runs: [], errors: [] };

for (const theme of ["dark", "light"]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluateOnNewDocument((value) => {
    try {
      window.localStorage.setItem("promptscope.theme.v1", value);
    } catch {}
  }, theme);
  for (const route of ["/", "/builder", "/analyzer", "/settings", "/history", "/comparison", "/docs"]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
    await page.addScriptTag({ url: AXE_URL });
    const result = await page.evaluate(async () => {
      const outcome = await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      });
      return outcome.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
        help: violation.help,
      }));
    });
    report.runs.push({ theme, route, violations: result });
  }
  await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));

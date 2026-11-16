import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

const report = { steps: [], errors: [] };

async function post(path, body, timeout = 150_000) {
  const started = Date.now();
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  const json = await response.json();
  return { status: response.status, json, ms: Date.now() - started };
}

const status = await fetch(`${BASE}/api/ai/status`).then((response) => response.json());
report.steps.push({ step: "status", ...status.data });

const idea =
  "I need a booking website for a small yoga studio with class schedule, instructor profiles, and payment.";

const first = await post("/api/ai/discover", { idea, answers: [], budget: 4 });
report.steps.push({
  step: "discover-1",
  httpStatus: first.status,
  ok: first.json.ok,
  source: first.json.data?.source,
  hasQuestion: Boolean(first.json.data?.question),
  category: first.json.data?.understanding?.category,
  answered: first.json.data?.answered,
  ms: first.ms,
});

const data = first.json.data;
if (data?.question) {
  const second = await post("/api/ai/discover", {
    idea,
    answers: [
      { questionId: data.question.id, question: data.question.question, answer: "Website", status: "answered" },
    ],
    budget: 4,
  });
  report.steps.push({
    step: "discover-2",
    httpStatus: second.status,
    source: second.json.data?.source,
    hasQuestion: Boolean(second.json.data?.question),
    questionChanged: second.json.data?.question?.id !== data.question.id,
    sections: second.json.data?.brief?.sections?.length,
    ms: second.ms,
  });
}

const generation = await post("/api/ai/generate", {
  configuration: {
    category: "ui_ux",
    objective: "Design a booking website for a small yoga studio with class schedule and payment.",
    audience: "Studio members and the front-desk team",
    context: "Small studio, one location, weekly classes.",
    visualPreferences: ["Calm", "Editorial"],
    outputRequirements: ["Desktop and mobile screens"],
    constraints: ["Responsive", "Accessible contrast"],
    sliders: {
      creativity: 55,
      precision: 70,
      visualHierarchy: 65,
      composition: 60,
      typography: 60,
      detail: 65,
      consistency: 70,
      exploration: 40,
    },
    depth: "balanced",
    targetAgent: "design",
  },
});

report.steps.push({
  step: "generate",
  httpStatus: generation.status,
  ok: generation.json.ok,
  source: generation.json.data?.source,
  depth: generation.json.data?.depth,
  targetAgent: generation.json.data?.targetAgent,
  sections: generation.json.data?.sections?.length,
  promptChars: generation.json.data?.prompt?.length,
  hasPlaceholder: /\[insert|lorem ipsum|TODO:/i.test(generation.json.data?.prompt ?? ""),
  ms: generation.ms,
});

// Live UI pass: one discovery call through the guided builder.
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
page.on("pageerror", (error) => report.errors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") report.errors.push(message.text());
});
await page.setViewport({ width: 1440, height: 1000 });
await page.goto(`${BASE}/builder`, { waitUntil: "networkidle0" });
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });
await page.evaluate(() => {
  const textarea = document.querySelector("#guided-idea");
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(textarea, "I want a booking website for a small yoga studio, with class schedule and payment.");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.evaluate(() => {
  const button = Array.from(document.querySelectorAll("button")).find((item) =>
    (item.textContent ?? "").includes("Understand my idea"),
  );
  button?.click();
});

let firstQuestion = false;
try {
  await page.waitForFunction(() => /Question \d+/.test(document.body.textContent ?? ""), { timeout: 120_000 });
  firstQuestion = true;
} catch {
  firstQuestion = false;
}
const text = await page.evaluate(() => document.body.textContent ?? "");
report.steps.push({
  step: "live-ui",
  firstQuestion,
  liveBadge: text.includes("Live discovery") || text.includes("Live"),
  hasBriefLink: text.includes("The brief is ready to review.") || /Question \d+/.test(text),
});
await page.screenshot({
  path: "C:\\Users\\ASUS\\Downloads\\Prompt Scope\\.qa-shots\\guided-live-discovery.png",
  fullPage: true,
});

await browser.close();
console.log(JSON.stringify(report, null, 2));

import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

const page = await browser.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));
await page.setViewport({ width: 1280, height: 1000 });
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle0" });
await page.evaluate(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});
await page.reload({ waitUntil: "networkidle0" });

const report = {};

report.themeControl = await page.evaluate(() => {
  const group = document.querySelector('[role="group"][aria-label="Color theme"]');
  return group ? Array.from(group.querySelectorAll("button")).map((b) => b.textContent.trim()) : null;
});

// The input starts hidden and can be revealed.
report.inputType = await page.$eval("#browser-api-key", (el) => el.type);
await page.evaluate(() => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (node) => node.getAttribute("aria-label") === "Show the key",
  );
  button?.click();
});
report.revealedType = await page.$eval("#browser-api-key", (el) => el.type);

// The remember warning only appears after opting in.
report.warningBefore = await page.evaluate(() =>
  document.body.innerText.includes("Stored in this browser"),
);
await page.evaluate(() => {
  const checkbox = document.querySelector('input[type="checkbox"]');
  checkbox?.click();
});
report.warningAfter = await page.evaluate(() =>
  document.body.innerText.includes("Stored in this browser"),
);

// Verification must fail for a synthetic key and must not keep it.
await page.type("#browser-api-key", "AQ.qa-fake-key-000000000000");
report.verifyEnabled = await page.evaluate(() => {
  const button = Array.from(document.querySelectorAll("button")).find((node) =>
    node.textContent.includes("Verify and use"),
  );
  return button ? !button.disabled : null;
});
await page.evaluate(() => {
  const button = Array.from(document.querySelectorAll("button")).find((node) =>
    node.textContent.includes("Verify and use"),
  );
  button?.click();
});
await page.waitForFunction(
  () => document.body.innerText.includes("Key problem") || document.body.innerText.includes("Connection verified"),
  { timeout: 30_000 },
);
report.afterVerify = await page.evaluate(() => ({
  problem: document.body.innerText.includes("Key problem"),
  stillHasKey: document.body.innerText.includes("Active browser key"),
  sessionKey: window.sessionStorage.getItem("promptscope.browserApiKey.session"),
  deviceKey: window.localStorage.getItem("promptscope.browserApiKey.device.v1"),
}));

// A blank key cannot be submitted.
await page.evaluate(() => {
  const input = document.querySelector("#browser-api-key");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
report.blankDisabled = await page.evaluate(() => {
  const button = Array.from(document.querySelectorAll("button")).find((node) =>
    node.textContent.includes("Verify and use"),
  );
  return button?.disabled;
});

// The server key statement must not promise that all keys are server-side.
report.privacyCopy = await page.evaluate(() => {
  const bullet = Array.from(document.querySelectorAll("li")).find((node) =>
    node.textContent.includes("entered in Settings"),
  );
  return bullet?.textContent.trim() ?? null;
});

report.errors = errors;
await browser.close();
console.log(JSON.stringify(report, null, 2));

// Page-weight report for the built site (plan 03-05, D-10, D-11).
//
// Usage:  node scripts/measure-bundle.mjs <page URL> [--budget]
//         node scripts/measure-bundle.mjs --self-test
//
// It opens the page in Chromium (the @playwright/test already in the project, nothing new) at a
// 390 by 844 viewport, waits until the playground reports its tokenizer ready, records every
// response body and gzips each one at level 6 (what GitHub Pages serves is gzip, never brotli).
// A second pass scrolls the page so the lazy widgets load, to count all the JavaScript the page
// can ever load without pressing the BERT button.
//
// It is a REPORT: exit code 0 always, unless --budget is given, then non-zero when a limit is
// exceeded. The author chose "report only" (03-DECISIONS.md, item 4), so nothing in the project
// runs it with --budget.
import { gzipSync } from "node:zlib";

/** One kilobyte is 1000 bytes here, the same unit the research table used. */
export const KB = 1000;

/** The proposed limits, all in gzip bytes (03-RESEARCH.md, "Performance budget proposal"). */
export const LIMITS = {
  initialWithoutTokenizer: 200 * KB,
  initialWithGpt2: 800 * KB,
  javascriptAll: 80 * KB,
  html: 35 * KB,
};

export const GROUPS = ["html", "css", "js", "fonts", "other", "tokenizer"];
const GROUP_LABEL = {
  html: "HTML",
  css: "CSS",
  js: "JavaScript",
  fonts: "Fonts",
  other: "Other (icons, images)",
  tokenizer: "Tokenizer file",
};

/** Size of a body after gzip at level 6. */
export function gzipBytes(buffer) {
  return gzipSync(buffer, { level: 6 }).length;
}

/** Which table row a response belongs to. */
export function groupOf(url, contentType = "") {
  const path = new URL(url).pathname.toLowerCase();
  if (path.includes("/tokenizers/") && path.endsWith(".json")) return "tokenizer";
  if (/\.(woff2?|ttf|otf)$/.test(path) || /font\//.test(contentType)) return "fonts";
  if (/\.css$/.test(path) || /text\/css/.test(contentType)) return "css";
  if (/\.(m?js)$/.test(path) || /javascript/.test(contentType)) return "js";
  if (/text\/html/.test(contentType) || path.endsWith("/") || path.endsWith(".html")) return "html";
  return "other";
}

/** An empty accumulator: count, raw bytes and gzip bytes per group. */
export function emptyTotals() {
  return Object.fromEntries(GROUPS.map((g) => [g, { count: 0, raw: 0, gzip: 0 }]));
}

/** Add one response to the accumulator (a response is counted once, by URL). */
export function addResponse(totals, seen, { url, contentType, raw, gzip }) {
  if (seen.has(url)) return;
  seen.add(url);
  const g = totals[groupOf(url, contentType)];
  g.count += 1;
  g.raw += raw;
  g.gzip += gzip;
}

/** Sum of the chosen groups. */
export function sumGroups(totals, groups) {
  return groups.reduce(
    (acc, g) => ({ count: acc.count + totals[g].count, raw: acc.raw + totals[g].raw, gzip: acc.gzip + totals[g].gzip }),
    { count: 0, raw: 0, gzip: 0 },
  );
}

const NO_TOKENIZER = GROUPS.filter((g) => g !== "tokenizer");

/** The four numbers the limits are checked against. */
export function budgetNumbers(atLoad, afterScroll) {
  return {
    initialWithoutTokenizer: sumGroups(atLoad, NO_TOKENIZER).gzip,
    initialWithGpt2: sumGroups(atLoad, GROUPS).gzip,
    javascriptAll: afterScroll.js.gzip,
    html: atLoad.html.gzip,
  };
}

/** Compare the numbers with the limits. Each result: { key, measured, limit, pass }. */
export function evaluateBudget(numbers, limits = LIMITS) {
  return Object.keys(limits).map((key) => ({ key, measured: numbers[key], limit: limits[key], pass: numbers[key] <= limits[key] }));
}

const kb = (n) => (n / KB).toFixed(1);
const num = (n) => n.toLocaleString("en-US");

const BUDGET_LABEL = {
  initialWithoutTokenizer: "Initial load, without tokenizer files",
  initialWithGpt2: "Initial load, with gpt2.json",
  javascriptAll: "All JavaScript the page can load without BERT (after scrolling)",
  html: "HTML alone",
};

/** The markdown report. */
export function renderReport({ url, atLoad, afterScroll, bertGzip, budget }) {
  const lines = [];
  lines.push(`Page: ${url}`);
  lines.push(`Viewport 390 x 844, no scrolling for the first table; gzip level 6 (as GitHub Pages serves it).`);
  lines.push("");
  lines.push("| Item (loaded at page load, no scroll) | Files | Raw bytes | gzip bytes |");
  lines.push("|---|---:|---:|---:|");
  for (const g of NO_TOKENIZER) {
    lines.push(`| ${GROUP_LABEL[g]} | ${atLoad[g].count} | ${num(atLoad[g].raw)} | ${num(atLoad[g].gzip)} |`);
  }
  const sub = sumGroups(atLoad, NO_TOKENIZER);
  lines.push(`| **Subtotal without the tokenizer file** | ${sub.count} | ${num(sub.raw)} | **${num(sub.gzip)}** |`);
  lines.push(`| ${GROUP_LABEL.tokenizer} (gpt2.json, auto-load) | ${atLoad.tokenizer.count} | ${num(atLoad.tokenizer.raw)} | ${num(atLoad.tokenizer.gzip)} |`);
  const total = sumGroups(atLoad, GROUPS);
  lines.push(`| **Total at load** | ${total.count} | ${num(total.raw)} | **${num(total.gzip)}** |`);
  lines.push("");
  lines.push(`After scrolling the whole page (lazy widgets loaded): JavaScript ${afterScroll.js.count} files, ${num(afterScroll.js.gzip)} gzip bytes.`);
  if (bertGzip !== null) lines.push(`bert-uncased.json (only after its button is pressed): ${num(bertGzip)} gzip bytes (informational).`);
  lines.push("");
  lines.push("| Budget line (gzip) | Measured | Limit | Result |");
  lines.push("|---|---:|---:|---|");
  for (const r of budget) {
    lines.push(`| ${BUDGET_LABEL[r.key]} | ${kb(r.measured)} KB | ${kb(r.limit)} KB | ${r.pass ? "PASS" : "OVER BUDGET"} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function selfTest() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`self-test: ${msg}`);
  };
  const origin = "http://localhost:4431/tokens-explained";

  // groupOf
  assert(groupOf(`${origin}/`, "text/html; charset=utf-8") === "html", "the page is html");
  assert(groupOf(`${origin}/_astro/a.css`, "text/css") === "css", "css");
  assert(groupOf(`${origin}/_astro/client.AbC.js`, "text/javascript") === "js", "js");
  assert(groupOf(`${origin}/_astro/fonts/x.woff2`, "font/woff2") === "fonts", "font");
  assert(groupOf(`${origin}/tokenizers/gpt2.json`, "application/json") === "tokenizer", "tokenizer");
  assert(groupOf(`${origin}/favicon.svg`, "image/svg+xml") === "other", "icon");

  // gzipBytes: repeated text shrinks a lot, and the number is deterministic
  const body = Buffer.from("abc".repeat(1000));
  assert(gzipBytes(body) < 100, "repetitive data compresses");
  assert(gzipBytes(body) === gzipBytes(body), "gzip size is deterministic");

  // accumulation: a URL counted twice is counted once
  const totals = emptyTotals();
  const seen = new Set();
  addResponse(totals, seen, { url: `${origin}/_astro/a.js`, contentType: "text/javascript", raw: 1000, gzip: 400 });
  addResponse(totals, seen, { url: `${origin}/_astro/a.js`, contentType: "text/javascript", raw: 1000, gzip: 400 });
  addResponse(totals, seen, { url: `${origin}/`, contentType: "text/html", raw: 5000, gzip: 900 });
  addResponse(totals, seen, { url: `${origin}/tokenizers/gpt2.json`, contentType: "application/json", raw: 9000, gzip: 3000 });
  assert(totals.js.count === 1 && totals.js.gzip === 400, "duplicate response counted once");
  assert(sumGroups(totals, NO_TOKENIZER).gzip === 1300, "subtotal without tokenizer");
  assert(sumGroups(totals, GROUPS).gzip === 4300, "total with tokenizer");

  // budget arithmetic: the limit is inclusive, one byte over fails
  const at = (n) => ({ ...emptyTotals(), js: { count: 1, raw: n, gzip: n } });
  const ok = evaluateBudget(budgetNumbers(emptyTotals(), at(LIMITS.javascriptAll)));
  assert(ok.find((r) => r.key === "javascriptAll").pass, "exactly at the JavaScript limit passes");
  const over = evaluateBudget(budgetNumbers(emptyTotals(), at(LIMITS.javascriptAll + 1)));
  assert(!over.find((r) => r.key === "javascriptAll").pass, "one byte over the JavaScript limit fails");
  const wide = emptyTotals();
  wide.tokenizer.gzip = LIMITS.initialWithGpt2 + 1; // gitleaks:allow (self-test byte count, not a credential)
  const overTok = evaluateBudget(budgetNumbers(wide, emptyTotals()));
  assert(!overTok.find((r) => r.key === "initialWithGpt2").pass, "a big tokenizer file fails the with-gpt2 line");
  assert(overTok.find((r) => r.key === "initialWithoutTokenizer").pass, "a big tokenizer file does not fail the without line");

  // the report names the rows the document needs
  const report = renderReport({
    url: origin,
    atLoad: totals,
    afterScroll: totals,
    bertGzip: 190_756,
    budget: evaluateBudget(budgetNumbers(totals, totals)),
  });
  for (const want of ["Total at load", "Subtotal without the tokenizer file", "PASS"]) {
    assert(report.includes(want), `report contains "${want}"`);
  }
  console.log("measure-bundle self-test OK");
}

async function measure(url) {
  // Imported here so the self-test and the pure functions need no browser.
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const pending = [];
    const records = [];
    page.on("response", (response) => {
      pending.push(
        (async () => {
          try {
            const body = await response.body();
            records.push({
              url: response.url(),
              contentType: response.headers()["content-type"] ?? "",
              raw: body.length,
              gzip: gzipBytes(body),
            });
          } catch {
            // A redirect or an aborted request has no body; it adds no weight.
          }
        })(),
      );
    });
    await page.goto(url);
    const card = page.locator("[data-playground]");
    await card.waitFor({ state: "attached" });
    await page.waitForFunction(() => document.querySelector("[data-playground]")?.getAttribute("data-tokenizer") === "ready");
    await page.waitForLoadState("networkidle");
    await Promise.all(pending);

    const atLoad = emptyTotals();
    const seenAtLoad = new Set();
    for (const r of records) addResponse(atLoad, seenAtLoad, r);

    // Second pass: scroll to the bottom in steps so every client:visible widget loads.
    await page.evaluate(async () => {
      const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
      for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await Promise.all(pending);
    const afterScroll = emptyTotals();
    const seenAfter = new Set();
    for (const r of records) addResponse(afterScroll, seenAfter, r);

    // The BERT file is only informational: fetch it once and gzip it like the others.
    let bertGzip = null;
    try {
      const bertUrl = new URL("tokenizers/bert-uncased.json", url.endsWith("/") ? url : `${url}/`).href;
      const res = await context.request.get(bertUrl);
      if (res.ok()) bertGzip = gzipBytes(await res.body());
    } catch {
      bertGzip = null;
    }
    return { atLoad, afterScroll, bertGzip };
  } finally {
    await browser.close();
  }
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  try {
    selfTest();
  } catch (e) {
    console.error(String(e.message ?? e));
    process.exit(1);
  }
} else {
  const url = args.find((a) => !a.startsWith("--"));
  if (!url) {
    console.error("usage: node scripts/measure-bundle.mjs <page URL> [--budget] | --self-test");
    process.exit(2);
  }
  const { atLoad, afterScroll, bertGzip } = await measure(url);
  const budget = evaluateBudget(budgetNumbers(atLoad, afterScroll));
  console.log(renderReport({ url, atLoad, afterScroll, bertGzip, budget }));
  if (args.includes("--budget") && budget.some((r) => !r.pass)) process.exit(1);
}

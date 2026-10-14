import { readFileSync, statSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { openPlaygroundReady } from "./helpers.ts";

// SECONDARY, never gating (D-14, D-15 amended). Lighter release checks run once for the record:
// reflow at two zoom-equivalent widths, a print rendering, the dark scheme, and the CPU-throttled
// time until the playground is typable. Runs only through `npm run test:e2e:secondary` (the phone
// project, Chromium), so the spec overrides the phone's viewport and touch settings itself.
// Results are recorded in 03-HARDENING.md.

test.use({ isMobile: false, hasTouch: false, deviceScaleFactor: 1, viewport: { width: 1280, height: 800 } });

const POST = "what-is-a-token/";

/** Document-level horizontal overflow in CSS pixels (data tables in their own scroll region are exempt). */
const documentOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// WCAG 1.4.10 Reflow: 320 CSS px wide is 400 percent zoom on a 1280 px window; 640 is 200 percent.
for (const size of [
  { zoom: "200 percent", width: 640, height: 512 },
  { zoom: "400 percent", width: 320, height: 256 },
]) {
  test(`(a) reflow at ${size.zoom} zoom (${size.width} x ${size.height}): no horizontal scroll of the page`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await openPlaygroundReady(page, POST);
    expect(await documentOverflow(page)).toBeLessThanOrEqual(0);
    // Also with every lazy widget loaded and the playground table open.
    await page.locator("details[data-table] summary").click();
    for (const hook of ["data-stepper", "data-compare", "data-languages"]) {
      const card = page.locator(`[${hook}]`);
      await card.scrollIntoViewIfNeeded();
      await expect(card).toHaveAttribute("data-state", "ready");
    }
    expect(await documentOverflow(page)).toBeLessThanOrEqual(0);
  });
}

test("(b) print rendering produces a readable PDF of the post", async ({ page, browserName }, testInfo) => {
  test.skip(browserName !== "chromium", "page.pdf() is Chromium only");
  await page.emulateMedia({ media: "print" });
  await openPlaygroundReady(page, POST);
  const path = testInfo.outputPath("post-print.pdf");
  await page.pdf({ path, format: "A4", printBackground: false });
  const size = statSync(path).size;
  expect(size).toBeGreaterThan(0);
  // A PDF page is an object of /Type /Page (the page tree is /Type /Pages).
  const pages = (readFileSync(path).toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  expect(pages).toBeGreaterThanOrEqual(1);
  console.log(`print-pdf: ${path} (${size} bytes, ${pages} pages)`);
  testInfo.annotations.push({ type: "print-pdf", description: `${path}; ${size} bytes; ${pages} pages` });
});

test("(c) dark scheme: no horizontal overflow and no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.emulateMedia({ colorScheme: "dark" });
  await openPlaygroundReady(page, POST);
  for (const hook of ["data-stepper", "data-compare", "data-languages"]) {
    const card = page.locator(`[${hook}]`);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("data-state", "ready");
  }
  expect(await documentOverflow(page)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test("(d) time until the playground is typable under 4x CPU throttling (recorded, fails only above 15 s)", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "CPU throttling is a Chromium DevTools feature");
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const started = Date.now();
  await openPlaygroundReady(page, POST);
  const elapsed = Date.now() - started;
  await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  console.log(`throttled-time-to-ready-ms: ${elapsed}`);
  testInfo.annotations.push({ type: "throttled-time-to-ready-ms", description: String(elapsed) });
  expect(elapsed).toBeLessThan(15_000);
});

import { expect, test } from "@playwright/test";

// Project-agnostic smoke tests of the walking skeleton.

test("(a) without JavaScript the server-rendered card already shows chips", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("./");
  await expect(page.locator("[data-playground]")).toHaveAttribute("data-state", "loading");
  expect(await page.locator("[data-playground] [data-chip]").count()).toBeGreaterThan(0);
  await context.close();
});

test("(b) with JavaScript the island hydrates once the card is visible", async ({ page }) => {
  await page.goto("./");
  const card = page.locator("[data-playground]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(page.locator("#t")).not.toHaveAttribute("readonly", /.*/);
});

test("(c) typing an emoji gives partial-character chips and never U+FFFD", async ({ page }) => {
  await page.goto("./");
  const card = page.locator("[data-playground]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  const defaultCount = await page.locator("[data-playground] [data-chip]").count();
  await page.locator("#t").fill("\u{1F642}");
  await expect(page.locator('[data-playground] [data-chip][data-partial="true"]').first()).toBeVisible();
  await expect.poll(() => page.locator("[data-playground] [data-chip]").count()).not.toBe(defaultCount);
  const body = await page.evaluate(() => document.body.innerText);
  expect(body).not.toContain("�");
});

test("(d) the whole run has no failed requests and no console errors", async ({ page }) => {
  const failedResponses: string[] = [];
  const consoleErrors: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failedResponses.push(`${r.status()} ${r.url()}`);
  });
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  await page.goto("./");
  const card = page.locator("[data-playground]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  await page.locator("#t").fill("\u{1F642} hello");
  await expect(page.locator('[data-playground] [data-chip][data-partial="true"]').first()).toBeVisible();
  expect(failedResponses).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

import { expect, test } from "@playwright/test";

// Privacy promise (TOK-01, T-01-13): "Your text stays in your browser. Nothing is sent anywhere."

const isNetwork = (url: string) => /^https?:/i.test(url);

test("typing, examples, view toggles and the table make zero network requests; all loads are same-origin", async ({
  page,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));

  await page.goto("./");
  const card = page.locator("[data-playground]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  // Let any request still in flight after the island became ready settle.
  await page.waitForLoadState("networkidle");

  const loaded = urls.filter(isNetwork);
  const origin = new URL(page.url()).origin;
  expect(loaded.length).toBeGreaterThan(0);
  for (const url of loaded) expect(new URL(url).origin).toBe(origin);

  const before = urls.length;
  await page.locator("#t").fill("my secret text \u{1F642}");
  for (const id of ["rare-word", "numbers-dates", "emoji", "literature", "non-english"]) {
    await page.locator(`[data-example="${id}"]`).click();
  }
  await page.locator("[data-reset]").click();
  await page.getByText("Token IDs", { exact: true }).click();
  await page.locator("label", { hasText: "Peek under the hood" }).click();
  await page.getByText("Token text", { exact: true }).click();
  await page.locator("details[data-table] summary").click();
  await page.waitForTimeout(700);

  expect(urls.slice(before)).toEqual([]);

  const all = urls.filter(isNetwork);
  for (const url of all) expect(new URL(url).origin).toBe(origin);
});

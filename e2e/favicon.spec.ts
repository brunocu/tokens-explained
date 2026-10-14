import { expect, test } from "@playwright/test";

// Playwright's headless Chromium never fetches favicons, so smoke test (d) cannot see a
// missing icon, while real Chrome and Lighthouse log a 404 for /favicon.ico on the user-site
// root. This spec requests the declared icon itself. It is reusable against the live URL.

test("the page declares a base-aware icon and the icon answers 200 as SVG", async ({ page, baseURL }) => {
  await page.goto("./");
  const href = await page.locator('link[rel="icon"]').first().getAttribute("href");
  expect(href).toBeTruthy();
  const basePath = new URL(baseURL as string).pathname;
  expect(href as string).toMatch(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  const res = await page.request.get(new URL(href as string, page.url()).toString());
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/svg+xml");
});

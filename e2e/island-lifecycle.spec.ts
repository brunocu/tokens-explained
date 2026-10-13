import { expect, test } from "@playwright/test";

// The stepper card goes through the same lifecycle as the Phase 1 playground, driven by the
// one generalised watcher in BaseLayout (UI-SPEC: Island lifecycle).

test("(a) lifecycle: loading, failed after 8 s in view, recovery on late hydration", async ({ page }) => {
  test.setTimeout(30_000);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_astro/BpeStepper.*.js*", async (route) => {
    await gate;
    await route.continue();
  });
  // Firefox and WebKit hold the load event while the island script is pending; Chromium does not.
  await page.goto("what-is-a-token/", { waitUntil: "domcontentloaded" });
  const card = page.locator("[data-stepper]");
  await card.scrollIntoViewIfNeeded();

  await expect(card).toHaveAttribute("data-state", "loading");
  await expect(card.locator('[data-msg="loading"]')).toBeVisible();
  await expect(card.locator('[data-msg="failed"]')).toBeHidden();
  await expect(card.locator("[data-next]")).toBeDisabled();

  await expect(card).toHaveAttribute("data-state", "failed", { timeout: 12_000 });
  await expect(card.locator('[data-msg="failed"]')).toBeVisible();
  await expect(card.locator('[data-msg="loading"]')).toBeHidden();
  await expect(card.locator("[data-reload]")).toBeVisible();
  await expect(card.locator("[data-next]")).toBeDisabled();
  // The first step is still on the page as static text.
  await expect(card.locator("[data-why]")).toBeVisible();
  await expect(card.locator("[data-why]")).not.toBeEmpty();

  release();
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(card.locator("[data-status]")).toBeHidden();
  await expect(card.locator("[data-next]")).toBeEnabled();
});

test("(b) the Reload page button reloads the page", async ({ page }) => {
  test.setTimeout(30_000);
  // Astro retries a failed island import once with an `?astro-retry=` query, so match that URL too.
  const island = "**/_astro/BpeStepper.*.js*";
  await page.route(island, (route) => route.abort());
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-stepper]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "failed", { timeout: 12_000 });
  await page.unroute(island);
  await Promise.all([page.waitForEvent("load"), card.locator("[data-reload]").click()]);
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
});

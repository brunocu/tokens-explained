import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// WCAG 2.2 A and AA scans of the Phase 2 islands in both themes at 1280 px. Later plans append
// their own scans to this file. Phone width lives in phone-width.secondary.spec.ts.

const TAGS = ["wcag2a", "wcag2aa", "wcag22aa"];

async function scan(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" ; ")}`);
}

for (const scheme of ["light", "dark"] as const) {
  // Stage 3 is the first merge (boxed pairs, the pair table); stage 5 has a tie; stage 14 is the
  // last one, with the unseen-words panel (hexadecimal byte chips).
  for (const target of [2, 5, 13] as const) {
    test(`(stepper ${scheme}, stage ${target}) axe finds no WCAG 2.2 A or AA violation at 1280 px`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("what-is-a-token/");
      const card = page.locator("[data-stepper]");
      await card.scrollIntoViewIfNeeded();
      await expect(card).toHaveAttribute("data-state", "ready");
      for (let i = 0; i < target; i++) {
        const before = (await card.locator("[data-step-status]").textContent()) ?? "";
        await card.locator("[data-next]").click();
        // A merge stage fuses for about 300 ms before the stage changes.
        await expect(card.locator("[data-step-status]")).not.toHaveText(before);
      }
      await expect(card.locator("[data-step-status]")).toContainText(`Step ${target + 1} of 14:`);
      if (target === 13) await expect(card.locator("[data-final]")).toBeVisible();
      // Let the 350 ms pop-in finish so axe does not measure contrast mid-animation.
      await page.waitForTimeout(500);
      const summary = await scan(page);
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }
}

for (const scheme of ["light", "dark"] as const) {
  test(`(comparison ${scheme}, emoji, tables open) axe finds no WCAG 2.2 A or AA violation at 1280 px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("what-is-a-token/");
    const card = page.locator("[data-compare]");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("data-state", "ready");
    await card.locator("label.opt", { hasText: "An emoji" }).click();
    await expect(card.locator('input[type="radio"][value="emoji"]')).toBeChecked();
    await card.locator("details[data-alt-tables] summary").click();
    await card.locator("details[data-source] summary").click();
    await expect(card.locator("details[data-alt-tables] table")).toHaveCount(3);
    const summary = await scan(page);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

// The languages section: the static table and the "Look inside" island, with Arabic and then
// Chinese chosen and the table alternative open.
for (const scheme of ["light", "dark"] as const) {
  for (const language of [
    { id: "ar", label: "Arabic" },
    { id: "zh", label: "Chinese" },
  ] as const) {
    test(`(languages ${scheme}, ${language.label}) axe finds no WCAG 2.2 A or AA violation at 1280 px`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("what-is-a-token/");
      const island = page.locator("[data-languages]");
      await island.scrollIntoViewIfNeeded();
      await expect(island).toHaveAttribute("data-state", "ready");
      await island.locator("label.opt", { hasText: language.label }).click();
      await expect(island.locator(`input[type="radio"][value="${language.id}"]`)).toBeChecked();
      await island.locator("details[data-alt-tables] summary").click();
      await page.locator("details[data-sentence-sources] summary").click();
      await expect(island.locator("details[data-alt-tables] table")).toHaveCount(3);
      const results = await new AxeBuilder({ page }).withTags(TAGS).include('section[aria-labelledby="languages-heading"]').analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" ; ")}`);
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }
}

// The own-text block of the comparison card: ready (emoji text typed, tables open) and error.
for (const scheme of ["light", "dark"] as const) {
  test(`(own text ${scheme}, ready, emoji, tables open) axe finds no WCAG 2.2 A or AA violation at 1280 px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("what-is-a-token/");
    const card = page.locator("[data-compare]");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("data-state", "ready");
    const own = card.locator("[data-owntext]");
    await own.locator("[data-load]").click();
    await expect(own).toHaveAttribute("data-own-state", "ready");
    await own.locator("#own-text").fill("Great job \u{1F389} see you soon \u{1F642}");
    await own.locator("details[data-alt-tables] summary").click();
    await expect(own.locator("details[data-alt-tables] table")).toHaveCount(3);
    await expect(own.locator('[data-row="bert"] [data-special="true"]')).toHaveCount(2);
    const summary = await scan(page);
    expect(summary, summary.join("\n")).toEqual([]);
  });

  test(`(own text ${scheme}, error) axe finds no WCAG 2.2 A or AA violation at 1280 px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.route("**/tokenizers/bert-uncased.json", (route) => route.abort());
    await page.goto("what-is-a-token/");
    const card = page.locator("[data-compare]");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("data-state", "ready");
    const own = card.locator("[data-owntext]");
    await own.locator("[data-load]").click();
    await expect(own.locator("[data-own-error]")).toBeVisible();
    const summary = await scan(page);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

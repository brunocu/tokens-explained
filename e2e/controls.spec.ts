import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_TEXT, EXAMPLES } from "../src/core/examples.ts";
import { openPlaygroundReady as openReady, showTokenIds } from "./helpers.ts";

// Task 2 contract: example buttons, Reset text, and the two-line chip (text over ID) that every
// example and Reset leaves on screen. The Show control and the peek switch no longer exist (D-08).

const statValues = async (page: Page) =>
  page.locator("[data-stat-value]").allInnerTexts();

async function expectFocusAtEnd(page: Page, expected: string) {
  await expect(page.locator("#t")).toHaveValue(expected);
  const state = await page.evaluate(() => {
    const ta = document.querySelector("#t") as HTMLTextAreaElement;
    return {
      active: document.activeElement === ta,
      start: ta.selectionStart,
      end: ta.selectionEnd,
      length: ta.value.length,
    };
  });
  expect(state.active).toBe(true);
  expect(state.start).toBe(state.length);
  expect(state.end).toBe(state.length);
}

/** Every chip in the playground has a text line and a numeric ID line, and there is at least one. */
async function expectTwoLineChips(page: Page, what: string) {
  const chips = page.locator("[data-playground] [data-chip]");
  const count = await chips.count();
  expect(count, `${what}: chips on screen`).toBeGreaterThan(0);
  expect(await page.locator("[data-playground] [data-chip-main]").count(), `${what}: text lines`).toBe(count);
  const ids = await page.locator("[data-playground] [data-chip-id]").allInnerTexts();
  expect(ids.length, `${what}: ID lines`).toBe(count);
  for (const id of ids) expect(id.trim(), `${what}: ID line`).toMatch(/^\d+$/);
}

test("(a) every example button loads its text with focus and the caret at the end", async ({ page }) => {
  await openReady(page);
  expect(EXAMPLES.length).toBe(5);
  for (const example of EXAMPLES) {
    await page.locator(`[data-playground] [data-example="${example.id}"]`).click();
    await expectFocusAtEnd(page, example.text);
  }
});

test("(b) Reset text restores the default text with the same focus rule", async ({ page }) => {
  await openReady(page);
  await page.locator('[data-playground] [data-example="emoji"]').click();
  await expect(page.locator("#t")).not.toHaveValue(DEFAULT_TEXT);
  await page.locator("[data-playground] [data-reset]").click();
  await expectFocusAtEnd(page, DEFAULT_TEXT);
});

test("(c) after any example and after Reset text the chips are the two-line form with an ID line", async ({ page }) => {
  await openReady(page);
  await showTokenIds(page);
  await expectTwoLineChips(page, "default text");
  for (const example of EXAMPLES) {
    await page.locator(`[data-playground] [data-example="${example.id}"]`).click();
    await expect(page.locator("#t")).toHaveValue(example.text);
    await expectTwoLineChips(page, `example ${example.id}`);
  }
  await page.locator("[data-playground] [data-reset]").click();
  await expect(page.locator("#t")).toHaveValue(DEFAULT_TEXT);
  await expectTwoLineChips(page, "after Reset text");
});

test("(d) the ID on each chip equals the ID column of the table for the same token, and opening the table changes no count", async ({
  page,
}) => {
  await openReady(page);
  await showTokenIds(page);
  const details = page.locator("details[data-table]");
  const chipIds = () => page.locator("[data-playground] [data-chip-id]").allInnerTexts();
  const tableIds = () => details.locator("tbody tr td:nth-child(3)").evaluateAll((cells) => cells.map((c) => c.textContent?.trim() ?? ""));

  const beforeStats = await statValues(page);
  const beforeChips = await chipIds();
  expect(beforeChips.length).toBeGreaterThan(0);

  await details.locator("summary").click();
  await expect(details).toHaveAttribute("open", "");
  expect(await statValues(page)).toEqual(beforeStats);
  expect(await chipIds()).toEqual(beforeChips);

  // Same tokens, same order: the two lists are equal, and neither is empty.
  expect(await tableIds()).toEqual(beforeChips.map((id) => id.trim()));

  // Still true for an example whose tokens are cut mid-character (the emoji example).
  await page.locator('[data-playground] [data-example="emoji"]').click();
  await expect(page.locator('[data-playground] [data-chip][data-partial="true"]').first()).toBeVisible();
  const emojiChips = (await chipIds()).map((id) => id.trim());
  expect(emojiChips.length).toBeGreaterThan(0);
  expect(await tableIds()).toEqual(emojiChips);
  await expect(details.locator("tbody tr")).toHaveCount(emojiChips.length);
});

test("(e) with empty text the empty state shows and no console error is raised", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await openReady(page);
  await page.locator("#t").fill("");
  await expect(page.locator("[data-empty]")).toBeVisible();
  await page.locator("details[data-table] summary").click();
  await expect(page.locator("[data-empty]")).toBeVisible();
  expect(errors).toEqual([]);
});

test("(h) reduced motion removes every button transition", async ({ page }) => {
  await openReady(page);
  const duration = () =>
    page.locator("[data-playground] [data-example]").first().evaluate((el) => getComputedStyle(el).transitionDuration);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await duration()).toBe("0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await duration()).not.toBe("0s");
});

test("(i) every control is at least 44 by 44 CSS pixels", async ({ page }) => {
  await openReady(page);
  const targets = [
    ...(await page.locator("[data-playground] [data-example]").all()),
    page.locator("[data-playground] [data-reset]"),
    page.locator("[data-playground] details[data-table] summary"),
  ];
  expect(targets.length).toBe(7);
  for (const target of targets) {
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    // 0.01px of slack: Firefox reports a 44px box as 43.99997px.
    expect(box!.width).toBeGreaterThanOrEqual(43.99);
    expect(box!.height).toBeGreaterThanOrEqual(43.99);
  }
});

import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_TEXT, EXAMPLES } from "../src/core/examples.ts";

// Task 2 contract: example buttons, Reset text, the Show control and the Peek switch.

async function openReady(page: Page) {
  await page.goto("./");
  const card = page.locator("[data-playground]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
}

const statValues = async (page: Page) =>
  page.locator("[data-stat-value]").allInnerTexts();
const chipTexts = (page: Page) => page.locator("[data-playground] [data-chip]").allInnerTexts();
const idsLabel = (page: Page) => page.getByText("Token IDs", { exact: true });
const textLabel = (page: Page) => page.getByText("Token text", { exact: true });
const peekLabel = (page: Page) => page.locator("label", { hasText: "Peek under the hood" });

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

test("(a) every example button loads its text with focus and the caret at the end", async ({ page }) => {
  await openReady(page);
  expect(EXAMPLES.length).toBe(5);
  for (const example of EXAMPLES) {
    await page.locator(`[data-example="${example.id}"]`).click();
    await expectFocusAtEnd(page, example.text);
  }
});

test("(b) Reset text restores the default text with the same focus rule", async ({ page }) => {
  await openReady(page);
  await page.locator('[data-example="emoji"]').click();
  await expect(page.locator("#t")).not.toHaveValue(DEFAULT_TEXT);
  await page.locator("[data-reset]").click();
  await expectFocusAtEnd(page, DEFAULT_TEXT);
});

test("(c) examples and Reset keep Token IDs and Peek under the hood as they were", async ({ page }) => {
  await openReady(page);
  await idsLabel(page).click();
  await peekLabel(page).click();
  await page.locator('[data-example="numbers-dates"]').click();
  await expect(page.locator('input[name="view"][value="ids"]')).toBeChecked();
  await expect(page.locator("[data-peek]")).toBeChecked();
  await page.locator("[data-reset]").click();
  await expect(page.locator('input[name="view"][value="ids"]')).toBeChecked();
  await expect(page.locator("[data-peek]")).toBeChecked();
});

test("(d) Token IDs shows numeric ids, changes no counts and toggling back is identical", async ({ page }) => {
  await openReady(page);
  const beforeTexts = await chipTexts(page);
  const beforeStats = await statValues(page);
  const beforeCount = await page.locator("[data-playground] [data-chip]").count();

  await idsLabel(page).click();
  await expect(page.locator('input[name="view"][value="ids"]')).toBeChecked();
  const chips = page.locator("[data-playground] [data-chip]");
  expect(await chips.count()).toBe(beforeCount);
  for (let i = 0; i < beforeCount; i++) {
    await expect(chips.nth(i).locator("[data-chip-id]")).toHaveText(/^\d+$/);
  }
  expect(await statValues(page)).toEqual(beforeStats);

  await textLabel(page).click();
  await expect(page.locator('input[name="view"][value="text"]')).toBeChecked();
  expect(await chipTexts(page)).toEqual(beforeTexts);
  expect(await statValues(page)).toEqual(beforeStats);
});

test("(e) with empty text both views keep the empty state and raise no console error", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await openReady(page);
  await page.locator("#t").fill("");
  await expect(page.locator("[data-empty]")).toBeVisible();
  await idsLabel(page).click();
  await expect(page.locator("[data-empty]")).toBeVisible();
  await peekLabel(page).click();
  await textLabel(page).click();
  await expect(page.locator("[data-empty]")).toBeVisible();
  expect(errors).toEqual([]);
});

test("(f) Peek adds a hex line to normal chips; partial chips always show hex", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").fill("hi \u{1F642}");
  await expect(page.locator('[data-playground] [data-chip][data-partial="true"]').first()).toBeVisible();

  // Text mode, peek off: partial chips show hex once, as their main line.
  for (const chip of await page.locator('[data-playground] [data-chip][data-partial="true"]').all()) {
    await expect(chip.locator("[data-chip-bytes]")).toHaveCount(0);
    await expect(chip.locator("[data-chip-main]")).toHaveText(/^[0-9A-F]{2}( [0-9A-F]{2})*$/);
  }

  await peekLabel(page).click();
  for (const chip of await page.locator('[data-playground] [data-chip][data-partial="false"]').all()) {
    await expect(chip.locator("[data-chip-bytes]")).toHaveText(/^[0-9A-F]{2}( [0-9A-F]{2})*$/);
  }
  // Text mode, peek on: still no second hex line on partial chips.
  for (const chip of await page.locator('[data-playground] [data-chip][data-partial="true"]').all()) {
    await expect(chip.locator("[data-chip-bytes]")).toHaveCount(0);
  }

  await idsLabel(page).click();
  for (const chip of await page.locator('[data-playground] [data-chip][data-partial="true"]').all()) {
    await expect(chip.locator("[data-chip-id]")).toHaveText(/^\d+$/);
    await expect(chip.locator("[data-chip-bytes]")).toHaveText(/^[0-9A-F]{2}( [0-9A-F]{2})*$/);
  }
});

test("(g) the keyboard moves between views and toggles the peek switch", async ({ page }) => {
  await openReady(page);
  await page.locator('input[name="view"][value="text"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('input[name="view"][value="ids"]')).toBeChecked();
  await page.locator("[data-peek]").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("[data-peek]")).toBeChecked();
  await page.keyboard.press("Space");
  await expect(page.locator("[data-peek]")).not.toBeChecked();
});

test("(h) reduced motion removes every button transition", async ({ page }) => {
  await openReady(page);
  const duration = () =>
    page.locator("[data-example]").first().evaluate((el) => getComputedStyle(el).transitionDuration);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await duration()).toBe("0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await duration()).not.toBe("0s");
});

test("(i) every control is at least 44 by 44 CSS pixels", async ({ page }) => {
  await openReady(page);
  const targets = [
    ...(await page.locator("[data-example]").all()),
    page.locator("[data-reset]"),
    page.locator("label.seg").first(),
    page.locator("label.seg").nth(1),
    peekLabel(page),
  ];
  expect(targets.length).toBe(9);
  for (const target of targets) {
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

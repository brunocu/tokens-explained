import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

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
  test(`(comparison ${scheme}, emoji) axe finds no WCAG 2.2 A or AA violation at 1280 px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("what-is-a-token/");
    const card = page.locator("[data-compare]");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("data-state", "ready");
    await card.locator('button[data-example="emoji"]').click();
    await expect(card.locator("#compare-input")).toHaveValue(/\u{1F389}/u);
    const summary = await scan(page);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

// The languages widget: the counts table with the six texts, the picker and the results, with
// Arabic and then Chinese chosen.
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
      // The widget root holds everything: the table with the six texts, the picker, the results and the note.
      const results = await new AxeBuilder({ page }).withTags(TAGS).include("[data-languages]").analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" ; ")}`);
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }
}

// The typed-text states of the comparison card. GPT-2 is live on its own, so the states are: GPT-2
// ready with BERT idle (emoji text typed), both ready, a BERT failure, and a GPT-2 failure.
for (const scheme of ["light", "dark"] as const) {
  test(`(typed text ${scheme}, GPT-2 ready, BERT idle, emoji) axe finds no WCAG 2.2 A or AA violation at 1280 px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("what-is-a-token/");
    const card = page.locator("[data-compare]");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("data-state", "ready");
    await expect(card).toHaveAttribute("data-compare-gpt2", "ready");
    await expect(card).toHaveAttribute("data-compare-bert", "idle");
    await card.locator("#compare-input").fill("Great job \u{1F389} see you soon \u{1F642} and more");
    await expect(card.locator('[data-row="gpt2"] [data-char-frame]').first()).toBeAttached();
    await expect(card.locator("[data-row-count]")).toHaveCount(1);
    await expect(card.locator("[data-bert-pending]")).toBeVisible();
    const summary = await scan(page);
    expect(summary, summary.join("\n")).toEqual([]);
  });

  test(`(typed text ${scheme}, both ready, emoji) axe finds no WCAG 2.2 A or AA violation at 1280 px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("what-is-a-token/");
    const card = page.locator("[data-compare]");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("data-state", "ready");
    await expect(card).toHaveAttribute("data-compare-gpt2", "ready");
    await card.locator("[data-load]").click();
    await expect(card).toHaveAttribute("data-compare-bert", "ready");
    await card.locator("#compare-input").fill("Great job \u{1F389} see you soon \u{1F642}");
    await expect(card.locator("[data-row-count]")).toHaveCount(2);
    await expect(card.locator('[data-row="bert"] [data-special="true"]')).toHaveCount(2);
    await expect(card.locator("[data-legend]")).toBeVisible();
    const summary = await scan(page);
    expect(summary, summary.join("\n")).toEqual([]);
  });

  test(`(typed text ${scheme}, BERT error) axe finds no WCAG 2.2 A or AA violation at 1280 px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.route("**/tokenizers/bert-uncased.json", (route) => route.abort());
    await page.goto("what-is-a-token/");
    const card = page.locator("[data-compare]");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("data-state", "ready");
    await expect(card).toHaveAttribute("data-compare-gpt2", "ready");
    await card.locator("[data-load]").click();
    await expect(card.locator('[data-compare-error="bert"]')).toBeVisible();
    await expect(card.locator('[data-row="gpt2"]')).toBeVisible();
    const summary = await scan(page);
    expect(summary, summary.join("\n")).toEqual([]);
  });

  test(`(typed text ${scheme}, GPT-2 error) axe finds no WCAG 2.2 A or AA violation at 1280 px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    // The playground and the comparison card both ask for this file, so both show their error. The
    // card keeps the precomputed example rows on screen.
    await page.route("**/tokenizers/gpt2.json", (route) => route.abort());
    await page.goto("what-is-a-token/");
    const card = page.locator("[data-compare]");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("data-state", "ready");
    await expect(card.locator('[data-compare-error="gpt2"]')).toBeVisible();
    await expect(card.locator('[data-retry="gpt2"]')).toBeVisible();
    await expect(card.locator("[data-row]")).toHaveCount(2);
    const summary = await scan(page);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

// The token chips are a list for assistive technology: one list item per token, each with spoken text
// in a visually hidden span, and the visual glyphs hidden so nothing is read twice. Structure, roles
// and counts only (no exact prose).
const NOT_SPOKEN = ["␣", "↵", "⇥", "�"];

async function expectTokenList(scope: Locator, label: string): Promise<void> {
  const chips = scope.locator("[data-chip]");
  const chipCount = await chips.count();
  expect(chipCount, `${label}: chips on screen`).toBeGreaterThan(0);
  // Playwright role queries leave out aria-hidden content, so these counts prove the chips are exposed.
  expect(await scope.getByRole("list").count(), `${label}: lists`).toBeGreaterThanOrEqual(1);
  const items = scope.getByRole("listitem");
  expect(await items.count(), `${label}: list items`).toBe(chipCount);
  for (const text of await items.locator(".sr-only").allTextContents()) {
    expect(text.trim(), `${label}: spoken text`).not.toBe("");
    for (const glyph of NOT_SPOKEN) expect(text.includes(glyph), `${label}: U+${glyph.codePointAt(0)?.toString(16)} in "${text}"`).toBe(false);
  }
  expect(await items.locator(".sr-only").count(), `${label}: one spoken span per item`).toBe(chipCount);
  const hidden = await chips.evaluateAll((all) =>
    all.map((chip) => ({
      main: chip.querySelector("[data-chip-main]")?.closest('[aria-hidden="true"]') !== null,
      chip: chip.closest('[aria-hidden="true"]') !== null,
      list: chip.closest('[role="list"]')?.closest('[aria-hidden="true"]') !== null,
    })),
  );
  for (const state of hidden) expect(state, `${label}: visual text hidden, chip and list exposed`).toEqual({ main: true, chip: false, list: false });
}

test("(token list) comparison rows expose their chips as a list with spoken text", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-compare]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  await card.locator('button[data-example="emoji"]').click();
  await expect(card.locator("#compare-input")).toHaveValue(/\u{1F389}/u);
  const rows = card.locator("[data-row]");
  expect(await rows.count()).toBeGreaterThan(0);
  for (const row of await rows.all()) {
    const id = (await row.getAttribute("data-row")) ?? "row";
    await expectTokenList(row, `comparison ${id}`);
    const count = Number(await row.locator("[data-row-count]").textContent());
    expect(await row.getByRole("listitem").count(), `comparison ${id}: items equal the row count`).toBe(count);
  }
});

test("(token list) language rows expose their chips as a list with spoken text", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const island = page.locator("[data-languages]");
  await island.scrollIntoViewIfNeeded();
  await expect(island).toHaveAttribute("data-state", "ready");
  await island.locator("label.opt", { hasText: "Chinese" }).click();
  await expect(island.locator('input[type="radio"][value="zh"]')).toBeChecked();
  const rows = island.locator("[data-row]");
  expect(await rows.count()).toBeGreaterThan(0);
  for (const row of await rows.all()) {
    const id = (await row.getAttribute("data-row")) ?? "row";
    await expectTokenList(row, `languages ${id}`);
    const count = Number(await row.locator("[data-row-count]").textContent());
    expect(await row.getByRole("listitem").count(), `languages ${id}: items equal the row count`).toBe(count);
  }
});

test("(token list) the prose figure exposes its chips as a list with spoken text", async ({ page }) => {
  await page.goto("what-is-a-token/");
  await expectTokenList(page.locator('figure[data-figure="sample"]'), "prose figure");
});

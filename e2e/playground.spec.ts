import { expect, test, type Page } from "@playwright/test";
import { openPlaygroundReady as openReady } from "./helpers.ts";

// Task 1 contract: the shared display, counts, legend, split note and empty state.
// Also run by the secondary phone profile; it never gates there.

const statValue = (page: Page, name: string) => page.locator(`[data-stat="${name}"] [data-stat-value]`);

test("(a) without JavaScript the card shows chips, the legend and numeric counts", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("./");
  expect(await page.locator("[data-playground] [data-chip]").count()).toBeGreaterThan(0);
  await expect(page.locator("[data-playground] [data-legend]")).toContainText(
    "Hatched chips are raw bytes. Hatched chips in the same frame make up one character, which is shown in front of them.",
  );
  for (const name of ["tokens", "characters", "bytes", "words"]) {
    await expect(statValue(page, name)).toHaveText(/^\d+$/);
  }
  await context.close();
});

test("(b) typing updates characters, bytes, words and a token count equal to the chip count", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").fill("hello world");
  await expect(statValue(page, "characters")).toHaveText("11");
  await expect(statValue(page, "bytes")).toHaveText("11");
  await expect(statValue(page, "words")).toHaveText("2");
  const chips = await page.locator("[data-playground] [data-chip]").count();
  await expect(statValue(page, "tokens")).toHaveText(String(chips));
});

test("(b2) the Bytes count is the raw UTF-8 size of the text: it differs from the character count for non-English text and is the same in every tokenizer state", async ({
  page,
}) => {
  await openReady(page);
  const cases: Array<[string, number, number]> = [
    ["hello", 5, 5],
    ["\u{E9}", 1, 2],
    ["\u{7537}", 1, 3],
    ["\u{1F642}", 1, 4],
    ["Caf\u{E9} \u{7537}\u{5B50} \u{1F389}", 9, 17],
  ];
  for (const [text, characters, bytes] of cases) {
    await page.locator("#t").fill(text);
    await expect(statValue(page, "characters"), text).toHaveText(String(characters));
    await expect(statValue(page, "bytes"), text).toHaveText(String(bytes));
    // The same number the browser's own encoder gives for this exact text.
    const real = await page.evaluate((value) => new TextEncoder().encode(value).length, text);
    expect(real, text).toBe(bytes);
  }
  // The label is plain: the word Bytes, next to Characters.
  await expect(page.locator('[data-stat="bytes"] .stat-label')).toHaveText("Bytes");
  // The default text: bytes are at least the characters, and the bytes match the encoder.
  await page.locator("[data-playground] [data-reset]").click();
  const typed = await page.locator("#t").inputValue();
  const expected = await page.evaluate((value) => new TextEncoder().encode(value).length, typed);
  await expect(statValue(page, "bytes")).toHaveText(String(expected));
});

test("(c) a leading space shows as a whitespace glyph span", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").fill("hello world");
  expect(await page.locator("[data-playground] [data-ws]").count()).toBeGreaterThan(0);
});

test("(d) an emoji gives hatched hex chips, a split note and never U+FFFD", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").fill("\u{1F642}");
  const partial = page.locator('[data-playground] [data-chip][data-partial="true"]');
  await expect(partial.first()).toBeVisible();
  const texts = await partial.allInnerTexts();
  for (const t of texts) expect(t.trim()).toMatch(/^[0-9A-F]{2}( [0-9A-F]{2})*$/);
  await expect(statValue(page, "characters")).toHaveText("1");
  await expect(statValue(page, "bytes")).toHaveText("4");
  await expect(page.locator("[data-playground] [data-split-note]")).toBeVisible();
  await expect(page.locator("[data-playground] [data-split-note]")).toContainText(
    "1 character was split across several tokens. Each hatched chip holds a piece of it.",
  );
  const body = await page.evaluate(() => document.body.innerText);
  expect(body).not.toContain("�");
});

test("(e) empty text shows the empty state and zero counts", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").fill("");
  await expect(page.locator("[data-empty]")).toBeVisible();
  await expect(page.locator("[data-empty]")).toContainText("Nothing to split yet");
  for (const name of ["tokens", "characters", "bytes", "words"]) {
    await expect(statValue(page, name)).toHaveText("0");
  }
});

test("(f) a newline shows its glyph and forces a break in the chip flow", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").fill("a\nb");
  expect(await page.locator("[data-playground] [data-brk]").count()).toBeGreaterThanOrEqual(1);
  const chipTexts = await page.locator("[data-playground] [data-chip]").allInnerTexts();
  expect(chipTexts.some((t) => t.includes("↵"))).toBe(true);
});

test("(g) chips have a 2px outline, a 4px gap and an alternating palette", async ({ page }) => {
  await openReady(page);
  const chips = page.locator('[data-playground] [data-chip][data-partial="false"]');
  expect(await chips.count()).toBeGreaterThanOrEqual(5);
  const first = chips.first();
  expect(await first.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("2px");
  expect(await first.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("solid");
  const gap = await page.locator("[data-playground] .chips").evaluate((el) => getComputedStyle(el).columnGap);
  expect(gap).toBe("4px");
  const bg = (i: number) => chips.nth(i).evaluate((el) => getComputedStyle(el).backgroundColor);
  const [b0, b1, b4] = [await bg(0), await bg(1), await bg(4)];
  expect(b0).not.toBe(b1);
  expect(b0).toBe(b4);

  // R-01 (PD-06): partial chips sit inside a character frame, which owns the 2px solid outline.
  // The chips have no border of their own, and each later chip has a 2px dashed token cut.
  await page.locator("#t").fill("\u{1F642}");
  const partials = page.locator('[data-playground] [data-chip][data-partial="true"]');
  await expect(partials.first()).toBeVisible();
  const frame = page.locator("[data-playground] [data-char-frame]").first();
  expect(await frame.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("2px");
  expect(await frame.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("solid");
  expect(await partials.first().evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("0px");
  expect(await partials.nth(1).evaluate((el) => getComputedStyle(el).borderLeftStyle)).toBe("dashed");
  expect(await partials.nth(1).evaluate((el) => getComputedStyle(el).borderLeftWidth)).toBe("2px");
});

test("(h) the dark colour scheme gives the page its dark background", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(18, 18, 18)");
});

// R-01 combined-character note. Test (h) above is the dark scheme, so this one is (h2).
const SINGULAR_NOTE =
  "1 character on screen is built from several parts joined together. Each part is marked on its own.";
const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}";

test("(h2) a family emoji is five frames and one character, with a visible note that is not announced", async ({
  page,
}) => {
  await openReady(page);
  await page.locator("#t").fill(FAMILY);
  await expect(page.locator("[data-playground] [data-char-frame]")).toHaveCount(5);
  await expect(statValue(page, "characters")).toHaveText("1");
  const note = page.locator("[data-playground] [data-composite-note]");
  await expect(note).toBeVisible();
  await expect(note).toHaveText(SINGULAR_NOTE);
  // The note sits directly under the split note, and is a plain paragraph, not a live region.
  const order = await page.evaluate(() => {
    const split = document.querySelector("[data-playground] [data-split-note]");
    const composite = document.querySelector("[data-playground] [data-composite-note]");
    return {
      directlyAfter: split?.nextElementSibling === composite,
      role: composite?.getAttribute("role") ?? null,
      inLive: composite?.closest("[data-live]") !== null,
    };
  });
  expect(order).toEqual({ directlyAfter: true, role: null, inLive: false });

  // The live region still announces the counts and the split note, and never the new note.
  const live = page.locator("[data-live]");
  await expect(live).toContainText("1 character was split across several tokens.", { timeout: 3000 });
  await page.waitForTimeout(700);
  await expect(live).not.toContainText("parts joined together");
});

test("(i) a flag and a decomposed e with an accent show the singular note", async ({ page }) => {
  await openReady(page);
  const note = page.locator("[data-playground] [data-composite-note]");
  for (const text of ["\u{1F1EF}\u{1F1F5}", "é", "caf" + "é"]) {
    await page.locator("#t").fill(text);
    await expect(statValue(page, "characters")).toHaveText(text.startsWith("caf") ? "4" : "1");
    await expect(note).toHaveCount(1);
    await expect(note).toHaveText(SINGULAR_NOTE);
  }
});

test("(j) 日本語, a precomposed é, a line break and the default text show no combined-character note", async ({
  page,
}) => {
  await openReady(page);
  const note = page.locator("[data-playground] [data-composite-note]");
  await expect(note).toHaveCount(0);
  await page.locator("#t").fill("日本語");
  await expect(page.locator("[data-playground] [data-char-frame]")).toHaveCount(3);
  await expect(page.locator("[data-playground] [data-split-note]")).toContainText(
    "3 characters were split across several tokens.",
  );
  await expect(note).toHaveCount(0);
  for (const text of ["é", "a\r\nb", ""]) {
    await page.locator("#t").fill(text);
    await expect(note).toHaveCount(0);
  }
});

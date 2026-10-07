import { expect, test, type Page } from "@playwright/test";
import { REGRESSION_CORPUS } from "../src/core/fixtures/regression-corpus.ts";
import { openPlaygroundReady } from "./helpers.ts";

// The hostile-input corpus through the real DOM (FOUND-06, UI-SPEC backstop row) and
// the CPU-throttled freeze guard (T-01-17).

const FFFD = "�";

async function openReady(page: Page): Promise<void> {
  await openPlaygroundReady(page, "what-is-a-token/");
}

const SET_IN_PAGE = new Set(["lone-surrogate", "control-chars"]);

/**
 * Exact counts, re-derived from GPT-2's real output (D-01): the numbers belong to its merge list,
 * so they change if the tokenizer file ever does. The lone surrogate is the exception worth a
 * word: the browser turns it into U+FFFD (bytes EF BF BD) and GPT-2 holds that as one whole token.
 */
const EXACT: Record<string, { chips: number; partial?: number; characters?: number; splitNote?: boolean }> = {
  // Three characters of three bytes each, cut by GPT-2 into six pieces: two bytes, then one, three times.
  japanese: { chips: 6, partial: 6 },
  "zwj-family": { chips: 10, partial: 10, characters: 1 },
  "lone-surrogate": { chips: 1, partial: 0 },
  // "Great job 🎉 see you soon 🙂": only the party popper is cut up; GPT-2 keeps " 🙂" whole.
  "emoji-example": { chips: 9, partial: 3, splitNote: true },
};

const SINGULAR_NOTE =
  "1 character on screen is built from several parts joined together. Each part is marked on its own.";

/**
 * Frame counts, labels and the combined-character note for the corpus entries whose
 * result is fixed by the character structure alone (UI-SPEC R-01 Test impact).
 * `note` is checked only when given; devanagari conjunct grouping differs between engines.
 */
const FRAMES: Record<
  string,
  { frames: number; chips?: number; labels?: string[]; note?: boolean; noteText?: string; ltr?: boolean }
> = {
  japanese: { frames: 3, chips: 6, labels: ["日", "本", "語"] },
  chinese: { frames: 5, chips: 11 },
  flag: { frames: 2, chips: 6, note: true },
  "zwj-family": { frames: 5, chips: 10, note: true, noteText: SINGULAR_NOTE },
  devanagari: { frames: 6, chips: 12 },
  // GPT-2 holds U+FFFD, the zero-width space and the precomposed é as single whole tokens, so a
  // character that is a frame under a byte-per-chip display is not one here.
  "lone-surrogate": { frames: 0, chips: 1 },
  bom: { frames: 1, labels: ["hidden mark"] },
  "zero-width": { frames: 0, chips: 3 },
  "emoji-example": { frames: 1, labels: ["🎉"] },
  "cafe-precomposed": { frames: 0, chips: 3, note: false },
  // the dotted circle followed by the combining acute accent
  "cafe-decomposed": { frames: 1, labels: ["◌́"], note: true },
  // Only the last letter of each is cut: the earlier letters are whole two-byte tokens.
  "arabic-rtl": { frames: 1, labels: ["ح"], ltr: true },
  "hebrew-rtl": { frames: 1, labels: ["ם"], ltr: true },
};

const TABLE_FIRST_ROW: Record<string, string> = {
  japanese: "Bytes 1 to 2 of 3 of 日",
  bom: "Byte 1 of 3 of hidden mark",
};

for (const entry of REGRESSION_CORPUS) {
  test(`corpus ${entry.name}: chips, table rows and counts agree and no U+FFFD appears`, async ({ page }) => {
    await openReady(page);
    const textarea = page.locator("#t");
    if (SET_IN_PAGE.has(entry.name)) {
      // A lone surrogate may not survive the automation transport, and Firefox's fill() drops
      // NUL characters, so these values are built from UTF-16 code units inside the page.
      const units = Array.from({ length: entry.text.length }, (_, i) => entry.text.charCodeAt(i));
      await page.evaluate((codeUnits) => {
        const ta = document.querySelector("#t") as HTMLTextAreaElement;
        ta.value = String.fromCharCode(...codeUnits);
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }, units);
    } else {
      await textarea.fill(entry.text);
    }
    await page.locator("details[data-table] summary").click();

    const chips = page.locator("[data-playground] [data-chip]");
    const rows = page.locator("details[data-table] tbody tr");
    if (entry.text === "") {
      await expect(page.locator("[data-empty]")).toBeVisible();
      await expect(chips).toHaveCount(0);
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText("No tokens yet.");
    } else {
      const count = await chips.count();
      expect(count).toBeGreaterThan(0);
      await expect(rows).toHaveCount(count);
    }

    // Characters stat equals the grapheme count computed in the page from the textarea value.
    const expectedCharacters = await page.evaluate(() => {
      const value = (document.querySelector("#t") as HTMLTextAreaElement).value;
      return Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value)).length;
    });
    await expect(page.locator('[data-stat="characters"] [data-stat-value]')).toHaveText(String(expectedCharacters));

    // No replacement character anywhere in chips, table cells or the whole page text.
    for (const text of await chips.allInnerTexts()) expect(text).not.toContain(FFFD);
    for (const text of await page.locator("details[data-table] td").allInnerTexts()) expect(text).not.toContain(FFFD);
    expect(await page.evaluate(() => document.body.innerText)).not.toContain("�");

    const exact = EXACT[entry.name];
    if (exact) {
      if (exact.chips > 0) expect(await chips.count()).toBe(exact.chips);
      if (exact.partial !== undefined) {
        await expect(page.locator('[data-playground] [data-chip][data-partial="true"]')).toHaveCount(exact.partial);
      }
      if (exact.characters !== undefined) {
        await expect(page.locator('[data-stat="characters"] [data-stat-value]')).toHaveText(String(exact.characters));
      }
      if (exact.splitNote) await expect(page.locator("[data-playground] [data-split-note]")).toBeVisible();
    }

    // R-01: frames. Every hatched chip sits inside a frame; a frame or a label is never a chip.
    const frames = page.locator("[data-playground] [data-char-frame]");
    const labels = page.locator("[data-playground] [data-char-label]");
    const notes = page.locator("[data-playground] [data-composite-note]");
    const partialCount = await page.locator('[data-playground] [data-chip][data-partial="true"]').count();
    await expect(page.locator('[data-playground] [data-char-frame] [data-chip][data-partial="true"]')).toHaveCount(
      partialCount,
    );
    await expect(page.locator("[data-playground] [data-char-frame][data-chip], [data-playground] [data-char-label][data-chip]")).toHaveCount(0);
    for (const text of await labels.allInnerTexts()) expect(text).not.toContain(FFFD);

    if (/^[\x00-\x7f]*$/.test(entry.text)) {
      await expect(frames).toHaveCount(0);
      await expect(notes).toHaveCount(0);
    }

    const expected = FRAMES[entry.name];
    if (expected) {
      await expect(frames).toHaveCount(expected.frames);
      if (expected.chips !== undefined) {
        await expect(page.locator("[data-playground] [data-chip]")).toHaveCount(expected.chips);
      }
      if (expected.labels) {
        expect((await labels.allInnerTexts()).map((t) => t.trim())).toEqual(expected.labels);
      }
      if (expected.note === true) await expect(notes).toHaveCount(1);
      if (expected.note === false) await expect(notes).toHaveCount(0);
      if (expected.noteText) await expect(notes).toHaveText(expected.noteText);
      if (expected.ltr) {
        const directions = await frames.evaluateAll((els) => els.map((el) => getComputedStyle(el).direction));
        expect(directions).toEqual(Array(expected.frames).fill("ltr"));
      }
    }

    // R-01: the table names the byte and the character.
    const firstRow = TABLE_FIRST_ROW[entry.name];
    if (firstRow) await expect(rows.first()).toContainText(firstRow);
  });
}

test("freeze guard: 1,000 CJK characters render within the guard time under 4x CPU throttling", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CPU throttling is a Chromium DevTools feature");
  await openReady(page);
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const text = "日本語".repeat(333) + "日";
  expect(text.length).toBe(1000);

  const started = Date.now();
  await page.locator("#t").fill(text);
  await expect.poll(() => page.locator("[data-playground] [data-chip]").count(), { timeout: 20_000 }).toBe(2000);
  const elapsed = Date.now() - started;
  console.log(`throttled-render-ms: ${elapsed}`);
  test.info().annotations.push({ type: "throttled-render-ms", description: String(elapsed) });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  expect(elapsed).toBeLessThan(5000);
});

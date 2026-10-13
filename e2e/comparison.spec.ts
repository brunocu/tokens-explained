import { expect, test, type Locator, type Page } from "@playwright/test";
import fixture from "../src/core/compare/comparison.json" with { type: "json" };
import { DEFAULT_TEXT, EXAMPLES } from "../src/core/examples.ts";
import { expectCompareText, openPlaygroundReady } from "./helpers.ts";

// The comparison card in the built post: pick a text, see the same text cut by GPT-2 and BERT, one set
// of rows, from the precomputed fixture until the reader types (TOK-07, TOK-09). It is one widget with
// two columns: the picker and the text area on the left, the rows region (rows, legend, tables and
// provenance) and the note on the right, and there is no second block under it. What happens when the
// reader types, or loads BERT, is in comparison-load.spec.ts.

const ROW_ORDER = ["gpt2", "bert"] as const;
const EMOJI_TEXT = "Great job \u{1F389} see you soon \u{1F642}";
// U+FFFD, and the byte-map glyphs for a space and a new line that must never reach the page.
const FORBIDDEN = ["\u{FFFD}", "\u{0120}", "\u{010A}"];

type FixtureRows = Record<(typeof ROW_ORDER)[number], unknown[]>;
const fixtureById = new Map(
  (fixture.examples as unknown as Array<{ id: string; rows: FixtureRows }>).map((example) => [example.id, example]),
);
const countOf = (id: string, row: (typeof ROW_ORDER)[number]): number => (fixtureById.get(id)?.rows[row] ?? []).length;

async function openComparison(page: Page): Promise<Locator> {
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-compare]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  return card;
}

/** The result column: a header and a scroll region per tokenizer (GPT-2 above BERT), the legend and the note. */
const results = (card: Locator): Locator => card.locator(".widget-col").nth(1);
/** The table alternative: the card has exactly one. */

/** Pick an example the way a reader does: click its button under the text box. */
async function pick(card: Locator, id: string): Promise<void> {
  await card.locator(`button[data-example="${id}"]`).click();
  await expect(card.locator("#compare-input")).toHaveValue(EXAMPLES.find((example) => example.id === id)?.text ?? "");
}

test("(tracer) the first example shows two rows in order, GPT-2 then BERT; choosing 'An emoji' by keyboard swaps them", async ({ page }) => {
  const card = await openComparison(page);

  const buttons = card.locator("button[data-example]");
  await expect(buttons).toHaveCount(5);

  const rows = results(card).locator("[data-row]");
  await expect(rows).toHaveCount(2);
  expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute("data-row")))).toEqual([...ROW_ORDER]);
  for (const id of ROW_ORDER) {
    expect(await results(card).locator(`[data-row="${id}"] [data-chip]`).count(), id).toBeGreaterThan(0);
  }

  const before = await rows.allTextContents();

  // Keyboard only: focus the first example button, Tab until "An emoji" has focus, then press Enter.
  await buttons.first().focus();
  const emoji = card.locator('button[data-example="emoji"]');
  for (let i = 0; i < 4 && !(await emoji.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(emoji).toBeFocused();
  await page.keyboard.press("Enter");

  await expectCompareText(card, EMOJI_TEXT);
  await expect(rows).toHaveCount(2);
  const after = await rows.allTextContents();
  expect(after).not.toEqual(before);
  for (let i = 0; i < 2; i++) expect(after[i], ROW_ORDER[i]).not.toBe(before[i]);
});

test("(a) each of the five examples shows its text, the fixture counts and its note, with no forbidden glyph", async ({ page }) => {
  const card = await openComparison(page);
  expect(EXAMPLES).toHaveLength(5);
  for (const example of EXAMPLES) {
    await pick(card, example.id);
    await expectCompareText(card, example.text);
    for (const row of ROW_ORDER) {
      await expect(results(card).locator(`[data-row="${row}"] [data-row-count]`), `${example.id} ${row}`).toHaveText(
        String(countOf(example.id, row)),
      );
    }
    await expect(card.locator("[data-note]"), example.id).toBeVisible();
    const text = (await results(card).allTextContents()).join(" ");
    for (const glyph of FORBIDDEN) expect(text.includes(glyph), `${example.id} contains U+${glyph.codePointAt(0)?.toString(16)}`).toBe(false);
    // No start or end marker is ever shown in a BERT row.
    const bertChips = await results(card).locator('[data-row="bert"] [data-chip-main]').allTextContents();
    for (const chip of bertChips) expect(chip.trim(), example.id).not.toMatch(/^\[(CLS|SEP)\]$/);
  }
});

test("(b) the emoji example: [UNK] chips for BERT, hatched frames for GPT-2, and the legend", async ({ page }) => {
  const card = await openComparison(page);
  const legend = card.locator("[data-legend]");

  await pick(card, "emoji");
  const unk = results(card).locator('[data-row="bert"] [data-special="true"]');
  await expect(unk).toHaveCount(2);
  for (const text of await unk.locator("[data-chip-main]").allTextContents()) expect(text.trim()).toBe("[UNK]");
  const hatched = results(card).locator('[data-row="gpt2"] [data-char-frame] [data-chip][data-partial="true"]');
  expect(await hatched.count()).toBeGreaterThan(0);
  await expect(legend).toHaveCount(1);
  await expect(legend).toBeVisible();

  // Every example shows exactly as many [UNK] chips as the precomputed BERT row holds, and none of GPT-2's.
  for (const example of EXAMPLES) {
    await pick(card, example.id);
    const expected = (fixtureById.get(example.id)?.rows.bert ?? []).filter((t) => (t as { special?: boolean }).special === true).length;
    await expect(results(card).locator('[data-row="bert"] [data-special="true"]'), example.id).toHaveCount(expected);
    await expect(results(card).locator('[data-row="gpt2"] [data-special="true"]'), example.id).toHaveCount(0);
  }
});

test("(c) BERT shows ## pieces for the rare word and never a start or end marker", async ({ page }) => {
  const card = await openComparison(page);
  await pick(card, "rare-word");
  const chips = (await results(card).locator('[data-row="bert"] [data-chip-main]').allTextContents()).map((t) => t.trim());
  expect(chips.some((t) => t.startsWith("##"))).toBe(true);
  for (const t of chips) expect(t).not.toMatch(/\[(CLS|SEP)\]/);
});

test("(d) the row counts match the chips, and there are no table alternatives or source details in the card any more", async ({ page }) => {
  const card = await openComparison(page);
  await expect(card.locator("details")).toHaveCount(0);

  for (const id of ["numbers-dates", "emoji"]) {
    await pick(card, id);
    for (const row of ROW_ORDER) {
      const chips = await results(card).locator(`[data-row="${row}"] [data-chip]`).count();
      await expect(results(card).locator(`[data-row="${row}"] [data-row-count]`), `${id} ${row}`).toHaveText(String(chips));
    }
  }
  // Each row is a list for assistive technology with one list item per chip.
  for (const row of ROW_ORDER) {
    const scope = results(card).locator(`[data-row="${row}"]`);
    await expect(scope.getByRole("list")).toHaveCount(1);
    expect(await scope.getByRole("listitem").count(), row).toBe(await scope.locator("[data-chip]").count());
  }
});

test("(e) the licence notices file for the two tokenizer files is still served", async ({ page, baseURL }) => {
  const response = await page.request.get(new URL("tokenizers/NOTICE.md", baseURL).href);
  expect(response.status()).toBe(200);
  const text = await response.text();
  for (const needle of ["MIT", "Apache"]) expect(text, needle).toContain(needle);
});

test("(f) each picker change announces the example and the two counts once", async ({ page }) => {
  const card = await openComparison(page);
  // The card's own announcer; the own-text block has a separate one (data-own-live).
  const announce = card.locator(":scope > [data-announce]");
  await expect(announce).toHaveAttribute("role", "status");
  // Nothing is announced on load.
  await expect(announce).toHaveText("");

  for (const example of EXAMPLES.slice(1)) {
    await pick(card, example.id);
    const expected = `Showing ${example.label}. GPT-2: ${countOf(example.id, "gpt2")} tokens. BERT: ${countOf(example.id, "bert")} tokens.`;
    await expect(announce).toHaveText(expected);
  }
});

test("(g) lifecycle: loading, then failed with a reload button after 8 s in view, then recovery on late hydration", async ({ page }) => {
  test.setTimeout(30_000);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_astro/Comparison.*.js*", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("what-is-a-token/", { waitUntil: "domcontentloaded" });
  const card = page.locator("[data-compare]");
  await card.scrollIntoViewIfNeeded();

  await expect(card).toHaveAttribute("data-state", "loading");
  await expect(card.locator('[data-msg="loading"]')).toBeVisible();
  await expect(card.locator('[data-msg="failed"]')).toBeHidden();
  await expect(card.locator("button[data-example]").first()).toBeDisabled();

  await expect(card).toHaveAttribute("data-state", "failed", { timeout: 12_000 });
  await expect(card.locator('[data-msg="failed"]')).toBeVisible();
  await expect(card.locator("[data-reload]")).toBeVisible();
  await expect(results(card).locator("[data-row]")).toHaveCount(2);

  release();
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(card.locator("[data-status]")).toBeHidden();
  await expect(card.locator("button[data-example]").first()).toBeEnabled();
});

test("(h) without JavaScript the first example's rows, note and the explanation are present", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-compare]");
  await expect(results(card).locator("[data-row]")).toHaveCount(2);
  for (const id of ROW_ORDER) expect(await results(card).locator(`[data-row="${id}"] [data-chip]`).count(), id).toBeGreaterThan(0);
  await expect(card.locator("[data-note]")).toBeVisible();
  await expect(card.locator("[data-compare-text]")).toHaveText(DEFAULT_TEXT);
  // The note sits in <noscript>, which text matchers skip, so address it by its class.
  await expect(card.locator(".island-nojs")).toBeVisible();
  await expect(card.locator("[data-status]")).toBeHidden();
  await context.close();
});

test("(j) the card is one widget: one set of rows, one legend, one text area and no second 'own text' block", async ({
  page,
}) => {
  const card = await openComparison(page);
  // Wait until the text is editable, the state in which the old design showed everything twice.
  await expect(card).toHaveAttribute("data-compare-gpt2", "ready");
  await expect(card.locator("textarea")).toHaveCount(1);
  await expect(card.locator('[data-row="gpt2"]')).toHaveCount(1);
  await expect(card.locator('[data-row="bert"]')).toHaveCount(1);
  await expect(card.locator("[data-legend]")).toHaveCount(1);
  await expect(card.locator("details")).toHaveCount(0);
  await expect(card.locator("[data-compare-text]")).toHaveCount(0);
  await expect(card.locator("[data-owntext]")).toHaveCount(0);  // The rows are the default text's rows: the live GPT-2 row equals the precomputed one, and BERT's
  // row is precomputed too.
  for (const row of ROW_ORDER) {
    await expect(card.locator(`[data-row="${row}"] [data-row-count]`), row).toHaveText(String(fixture.defaultText[row].length));
  }
  // One note, the same for every text.
  await expect(card.locator("[data-note]")).toBeVisible();
  // Nothing in the card needs a button for GPT-2; the one load button is BERT's.
  await expect(card.locator("[data-load]")).toHaveCount(1);
  await expect(card.locator("[data-load]")).toBeVisible();
});

test("(k) the card sits under an h2 section heading with a lead-in paragraph between the two", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-compare]");
  // Found by structure (the nearest h2 before the card, the nearest paragraph after that h2).
  const heading = card.locator("xpath=preceding::h2[1]");
  await expect(heading).toBeVisible();
  await expect(heading).not.toBeEmpty();
  const leadIn = heading.locator("xpath=following::p[1]");
  await expect(leadIn).toBeVisible();
  await expect(leadIn).not.toBeEmpty();
  const headingY = (await heading.boundingBox())?.y ?? Number.NaN;
  const leadInY = (await leadIn.boundingBox())?.y ?? Number.NaN;
  const cardY = (await card.boundingBox())?.y ?? Number.NaN;
  expect(leadInY).toBeGreaterThan(headingY);
  expect(cardY).toBeGreaterThan(leadInY);
});

test("(i) after the page's GPT-2 download, using the picker requests nothing, and BERT is never requested", async ({
  page,
  baseURL,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  const tokenizerUrls = () => urls.filter((url) => url.includes("/tokenizers/"));
  const gpt2Url = new URL("tokenizers/gpt2.json", baseURL).href;

  // The playground downloads GPT-2 at page load and the own-text block shares that one request.
  await openPlaygroundReady(page, "what-is-a-token/");
  const card = page.locator("[data-compare]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  await page.waitForLoadState("networkidle");
  const settled = urls.length;
  expect(tokenizerUrls()).toEqual([gpt2Url]);

  for (const example of EXAMPLES) await pick(card, example.id);
  await page.waitForTimeout(500);

  // Not one request of any kind after the page settled, and the BERT file was never asked for.
  expect(urls.slice(settled)).toEqual([]);
  expect(tokenizerUrls()).toEqual([gpt2Url]);
  expect(urls.filter((url) => url.includes("bert"))).toEqual([]);
});

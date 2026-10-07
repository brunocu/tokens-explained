import { expect, test, type Locator, type Page } from "@playwright/test";
import fixture from "../src/core/compare/comparison.json" with { type: "json" };
import { NOTES } from "../src/core/compare/notes.ts";
import { EXAMPLES } from "../src/core/examples.ts";
import { expectCompareText, openPlaygroundReady } from "./helpers.ts";

// The comparison card in the built post: pick a text, see the same text cut by GPT-2 and BERT, one set
// of rows, from the precomputed fixture until the reader types (TOK-07, TOK-09). It is one widget: the
// text area, the rows, the note and the tables are all direct children of the card, and there is no
// second block under it. What happens when the reader types, or loads BERT, is in
// comparison-load.spec.ts.

const ROW_ORDER = ["gpt2", "bert"] as const;
const EMOJI_TEXT = "Great job \u{1F389} see you soon \u{1F642}";
const UNK_SENTENCE = "[UNK] means the tokenizer had no piece for that word or character and gave up.";
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

/** The rows and the legend. */
const results = (card: Locator): Locator => card.locator(":scope > .results");
/** The table alternative: the card has exactly one. */
const curatedTables = (card: Locator): Locator => card.locator("details[data-alt-tables]");

/** Pick an example the way a reader does: click its label in the picker. */
async function pick(card: Locator, id: string): Promise<void> {
  const label = EXAMPLES.find((example) => example.id === id)?.label ?? "";
  await card.locator("label.opt", { hasText: label }).click();
  await expect(card.locator(`input[type="radio"][value="${id}"]`)).toBeChecked();
}

test("(tracer) the first example shows two rows in order, GPT-2 then BERT; choosing 'An emoji' by keyboard swaps them", async ({ page }) => {
  const card = await openComparison(page);

  const radios = card.locator('input[type="radio"][name="compare-example"]');
  await expect(radios).toHaveCount(5);
  await expect(radios.first()).toBeChecked();

  const rows = results(card).locator("[data-row]");
  await expect(rows).toHaveCount(2);
  expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute("data-row")))).toEqual([...ROW_ORDER]);
  for (const id of ROW_ORDER) {
    expect(await results(card).locator(`[data-row="${id}"] [data-chip]`).count(), id).toBeGreaterThan(0);
  }

  const before = await rows.allTextContents();

  // Keyboard only: focus the checked radio, then arrow until "An emoji" is checked.
  await radios.first().focus();
  const emoji = card.locator('input[type="radio"][value="emoji"]');
  for (let i = 0; i < 4 && !(await emoji.isChecked()); i++) await page.keyboard.press("ArrowRight");
  await expect(emoji).toBeChecked();

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
    await expect(card.locator("[data-note]"), example.id).toHaveText(NOTES[example.id] as string);
    const text = (await results(card).textContent()) ?? "";
    for (const glyph of FORBIDDEN) expect(text.includes(glyph), `${example.id} contains U+${glyph.codePointAt(0)?.toString(16)}`).toBe(false);
    // No start or end marker is ever shown in a BERT row.
    const bertChips = await results(card).locator('[data-row="bert"] [data-chip]').allTextContents();
    for (const chip of bertChips) expect(chip.trim(), example.id).not.toMatch(/^\[(CLS|SEP)\]$/);
  }
});

test("(b) the emoji example: [UNK] chips for BERT, hatched frames for GPT-2, and the [UNK] sentence only here", async ({ page }) => {
  const card = await openComparison(page);
  const legend = results(card).locator("[data-legend]");

  await pick(card, "emoji");
  const unk = results(card).locator('[data-row="bert"] [data-special="true"]');
  await expect(unk).toHaveCount(2);
  for (const text of await unk.allTextContents()) expect(text.trim()).toBe("[UNK]");
  const hatched = results(card).locator('[data-row="gpt2"] [data-char-frame] [data-chip][data-partial="true"]');
  expect(await hatched.count()).toBeGreaterThan(0);
  await expect(legend).toHaveCount(1);
  await expect(legend).toContainText(UNK_SENTENCE);

  for (const example of EXAMPLES) {
    if (example.id === "emoji") continue;
    await pick(card, example.id);
    await expect(results(card).locator('[data-special="true"]'), example.id).toHaveCount(0);
    await expect(legend, example.id).not.toContainText("[UNK]");
  }
});

test("(c) BERT shows ## pieces for the rare word and never a start or end marker", async ({ page }) => {
  const card = await openComparison(page);
  await pick(card, "rare-word");
  const chips = (await results(card).locator('[data-row="bert"] [data-chip]').allTextContents()).map((t) => t.trim());
  expect(chips.some((t) => t.startsWith("##"))).toBe(true);
  for (const t of chips) expect(t).not.toMatch(/\[(CLS|SEP)\]/);
});

test("(d) the tables hold one row per chip, in two captioned tables inside one details", async ({ page }) => {
  const card = await openComparison(page);
  const details = curatedTables(card);
  await expect(details).toHaveCount(1);
  await expect(details.locator("summary")).toHaveText("View these results as tables");

  for (const id of ["numbers-dates", "emoji"]) {
    await pick(card, id);
    if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) await details.locator("summary").click();
    const tables = details.locator("table");
    await expect(tables).toHaveCount(2);
    await expect(tables.locator("caption")).toHaveText(["Tokens for GPT-2", "Tokens for BERT"]);
    for (let i = 0; i < 2; i++) {
      const row = ROW_ORDER[i] as (typeof ROW_ORDER)[number];
      const chips = await results(card).locator(`[data-row="${row}"] [data-chip]`).count();
      expect(await tables.nth(i).locator("tbody tr").count(), `${id} ${row}`).toBe(chips);
    }
  }
  // The chips themselves are hidden from assistive technology; the tables are the text form.
  await expect(results(card).locator('[data-row] [aria-hidden="true"]').first()).toBeAttached();
  expect(await details.locator("table").first().isVisible()).toBe(true);
});

test("(e) the source line shows the date, both commits and licences, and the licence notices link answers 200", async ({ page }) => {
  const card = await openComparison(page);
  const dated = card.locator("[data-precomputed]");
  await expect(dated).toContainText("precomputed on");
  await expect(dated).toContainText(fixture.meta.generatedAt);

  const source = card.locator("details[data-source]");
  await expect(source.locator("summary")).toHaveText("Where the tokenizer files come from");
  await source.locator("summary").click();
  const text = (await source.textContent()) ?? "";
  for (const needle of ["commit 607a30d", "commit 86b5e09", "MIT licence", "Apache-2.0 licence", "copied onto this site"]) {
    expect(text, needle).toContain(needle);
  }
  // Only the two tokenizers the page uses are described.
  expect(text.toLowerCase()).not.toContain("merge list");

  const link = source.getByRole("link", { name: "Licence notices" });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).not.toBeNull();
  const response = await page.request.get(new URL(href as string, page.url()).href);
  expect(response.status()).toBe(200);
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
  await expect(card.locator('input[type="radio"]').first()).toBeDisabled();

  await expect(card).toHaveAttribute("data-state", "failed", { timeout: 12_000 });
  await expect(card.locator('[data-msg="failed"]')).toContainText(
    "The comparison could not load. Check your connection, then reload the page. The first example is still shown below.",
  );
  await expect(card.locator("[data-reload]")).toBeVisible();
  await expect(results(card).locator("[data-row]")).toHaveCount(2);

  release();
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(card.locator("[data-status]")).toBeHidden();
  await expect(card.locator('input[type="radio"]').first()).toBeEnabled();
});

test("(h) without JavaScript the first example's rows, note and the explanation are present", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-compare]");
  await expect(results(card).locator("[data-row]")).toHaveCount(2);
  for (const id of ROW_ORDER) expect(await results(card).locator(`[data-row="${id}"] [data-chip]`).count(), id).toBeGreaterThan(0);
  await expect(card.locator("[data-note]")).toHaveText(NOTES["rare-word"] as string);
  await expect(card.locator("[data-compare-text]")).toHaveText(EXAMPLES[0]?.text as string);
  // The note sits in <noscript>, which text matchers skip, so address it by its class.
  const nojs = card.locator(".island-nojs");
  await expect(nojs).toBeVisible();
  await expect(nojs).toHaveText("Switching examples needs JavaScript. The first example is shown below.");
  await expect(card.locator("[data-status]")).toBeHidden();
  await context.close();
});

test("(j) the card is one widget: one set of rows, one legend, one tables list, one text area and no second 'own text' block", async ({
  page,
}) => {
  const card = await openComparison(page);
  // Wait until the text is editable, the state in which the old design showed everything twice.
  await expect(card).toHaveAttribute("data-compare-gpt2", "ready");
  await expect(card.locator("textarea")).toHaveCount(1);
  await expect(card.locator('[data-row="gpt2"]')).toHaveCount(1);
  await expect(card.locator('[data-row="bert"]')).toHaveCount(1);
  await expect(card.locator("[data-legend]")).toHaveCount(1);
  await expect(card.locator("details[data-alt-tables]")).toHaveCount(1);
  await expect(card.locator("[data-note]")).toHaveCount(1);
  await expect(card.locator("[data-compare-text]")).toHaveCount(0);
  await expect(card.getByRole("heading", { name: "Try your own text" })).toHaveCount(0);
  await expect(card.locator("[data-owntext]")).toHaveCount(0);
  // The rows are the example's rows: the live GPT-2 row equals the precomputed one.
  const first = EXAMPLES[0]?.id as string;
  for (const row of ROW_ORDER) {
    await expect(card.locator(`[data-row="${row}"] [data-row-count]`), row).toHaveText(String(countOf(first, row)));
  }
  // Nothing in the card needs a button for GPT-2; the only load button names BERT.
  await expect(card.locator("[data-load]")).toHaveCount(1);
  await expect(card.locator("[data-load]")).toContainText("BERT");
  await expect(card.locator("[data-load]")).not.toContainText("GPT-2");
});

test("(k) the section heading sets GPT-2 against other models, not 'real tokenizers' against each other", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const heading = page.getByRole("heading", { level: 2, name: "How does GPT-2 compare with other models?" });
  await expect(heading).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText("How do real tokenizers compare?");
  const section = page.locator('section[aria-labelledby="compare-heading"]');
  await expect(section.locator(":scope > p")).toContainText("Here it sits next to BERT");
});

test("(i) after the page's GPT-2 download, using the picker, the tables and the source details requests nothing, and BERT is never requested", async ({
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
  const tables = curatedTables(card);
  if (!(await tables.evaluate((el) => (el as HTMLDetailsElement).open))) await tables.locator("summary").click();
  await card.locator("details[data-source] summary").click();
  await page.waitForTimeout(500);

  // Not one request of any kind after the page settled, and the BERT file was never asked for.
  expect(urls.slice(settled)).toEqual([]);
  expect(tokenizerUrls()).toEqual([gpt2Url]);
  expect(urls.filter((url) => url.includes("bert"))).toEqual([]);
});

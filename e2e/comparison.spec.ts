import { expect, test, type Locator, type Page } from "@playwright/test";
import fixture from "../src/core/compare/comparison.json" with { type: "json" };
import { NOTES } from "../src/core/compare/notes.ts";
import { EXAMPLES } from "../src/core/examples.ts";

// The curated comparison card in the built post: pick a text, see the same text cut by the toy,
// GPT-2 and BERT, all from the precomputed fixture (TOK-07, TOK-09).

const ROW_ORDER = ["toy", "gpt2", "bert"] as const;
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

/** Pick an example the way a reader does: click its label in the picker. */
async function pick(card: Locator, id: string): Promise<void> {
  const label = EXAMPLES.find((example) => example.id === id)?.label ?? "";
  await card.locator("label.opt", { hasText: label }).click();
  await expect(card.locator(`input[type="radio"][value="${id}"]`)).toBeChecked();
}

test("(tracer) the first example shows three rows in order; choosing 'An emoji' by keyboard swaps them", async ({ page }) => {
  const card = await openComparison(page);

  const radios = card.locator('input[type="radio"][name="compare-example"]');
  await expect(radios).toHaveCount(5);
  await expect(radios.first()).toBeChecked();

  const rows = card.locator("[data-row]");
  await expect(rows).toHaveCount(3);
  expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute("data-row")))).toEqual([...ROW_ORDER]);
  for (const id of ROW_ORDER) {
    expect(await card.locator(`[data-row="${id}"] [data-chip]`).count(), id).toBeGreaterThan(0);
  }

  const before = await rows.allTextContents();

  // Keyboard only: focus the checked radio, then arrow until "An emoji" is checked.
  await radios.first().focus();
  const emoji = card.locator('input[type="radio"][value="emoji"]');
  for (let i = 0; i < 4 && !(await emoji.isChecked()); i++) await page.keyboard.press("ArrowRight");
  await expect(emoji).toBeChecked();

  await expect(card.locator("[data-compare-text]")).toHaveText(EMOJI_TEXT);
  await expect(rows).toHaveCount(3);
  const after = await rows.allTextContents();
  expect(after).not.toEqual(before);
  for (let i = 0; i < 3; i++) expect(after[i], ROW_ORDER[i]).not.toBe(before[i]);
});

test("(a) each of the five examples shows its text, the fixture counts and its note, with no forbidden glyph", async ({ page }) => {
  const card = await openComparison(page);
  expect(EXAMPLES).toHaveLength(5);
  for (const example of EXAMPLES) {
    await pick(card, example.id);
    await expect(card.locator("[data-compare-text]"), example.id).toHaveText(example.text);
    for (const row of ROW_ORDER) {
      await expect(card.locator(`[data-row="${row}"] [data-row-count]`), `${example.id} ${row}`).toHaveText(
        String(countOf(example.id, row)),
      );
    }
    await expect(card.locator("[data-note]"), example.id).toHaveText(NOTES[example.id] as string);
    const text = (await card.textContent()) ?? "";
    for (const glyph of FORBIDDEN) expect(text.includes(glyph), `${example.id} contains U+${glyph.codePointAt(0)?.toString(16)}`).toBe(false);
    // No start or end marker is ever shown in a BERT row.
    const bertChips = await card.locator('[data-row="bert"] [data-chip]').allTextContents();
    for (const chip of bertChips) expect(chip.trim(), example.id).not.toMatch(/^\[(CLS|SEP)\]$/);
  }
});

test("(b) the emoji example: [UNK] chips for BERT, hatched frames for the toy and GPT-2, and the [UNK] sentence only here", async ({
  page,
}) => {
  const card = await openComparison(page);
  const legend = card.locator("[data-legend]");

  await pick(card, "emoji");
  const unk = card.locator('[data-row="bert"] [data-special="true"]');
  await expect(unk).toHaveCount(2);
  for (const text of await unk.allTextContents()) expect(text.trim()).toBe("[UNK]");
  for (const row of ["toy", "gpt2"] as const) {
    const hatched = card.locator(`[data-row="${row}"] [data-char-frame] [data-chip][data-partial="true"]`);
    expect(await hatched.count(), row).toBeGreaterThan(0);
  }
  await expect(legend).toHaveCount(1);
  await expect(legend).toContainText(UNK_SENTENCE);

  for (const example of EXAMPLES) {
    if (example.id === "emoji") continue;
    await pick(card, example.id);
    await expect(card.locator('[data-special="true"]'), example.id).toHaveCount(0);
    await expect(legend, example.id).not.toContainText("[UNK]");
  }
});

test("(c) BERT shows ## pieces for the rare word and never a start or end marker", async ({ page }) => {
  const card = await openComparison(page);
  await pick(card, "rare-word");
  const chips = (await card.locator('[data-row="bert"] [data-chip]').allTextContents()).map((t) => t.trim());
  expect(chips.some((t) => t.startsWith("##"))).toBe(true);
  for (const t of chips) expect(t).not.toMatch(/\[(CLS|SEP)\]/);
});

test("(d) the tables hold one row per chip, in three captioned tables inside one details", async ({ page }) => {
  const card = await openComparison(page);
  const details = card.locator("details[data-alt-tables]");
  await expect(details).toHaveCount(1);
  await expect(details.locator("summary")).toHaveText("View these results as tables");

  for (const id of ["numbers-dates", "emoji"]) {
    await pick(card, id);
    if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) await details.locator("summary").click();
    const tables = details.locator("table");
    await expect(tables).toHaveCount(3);
    await expect(tables.locator("caption")).toHaveText([
      "Tokens for the toy tokenizer",
      "Tokens for GPT-2",
      "Tokens for BERT",
    ]);
    for (let i = 0; i < 3; i++) {
      const row = ROW_ORDER[i] as (typeof ROW_ORDER)[number];
      const chips = await card.locator(`[data-row="${row}"] [data-chip]`).count();
      expect(await tables.nth(i).locator("tbody tr").count(), `${id} ${row}`).toBe(chips);
    }
  }
  // The chips themselves are hidden from assistive technology; the tables are the text form.
  await expect(card.locator('[data-row] [aria-hidden="true"]').first()).toBeAttached();
  expect(await details.locator("table").first().isVisible()).toBe(true);
});

test("(e) the source line shows the date, both commits and licences, and the licence notices link answers 200", async ({ page }) => {
  const card = await openComparison(page);
  const dated = card.locator("[data-precomputed]");
  await expect(dated).toContainText("Precomputed on");
  await expect(dated).toContainText(fixture.meta.generatedAt);

  const source = card.locator("details[data-source]");
  await expect(source.locator("summary")).toHaveText("Where the tokenizer files come from");
  await source.locator("summary").click();
  const text = (await source.textContent()) ?? "";
  for (const needle of ["commit 607a30d", "commit 86b5e09", "MIT licence", "Apache-2.0 licence", "copied onto this site"]) {
    expect(text, needle).toContain(needle);
  }

  const link = source.getByRole("link", { name: "Licence notices" });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).not.toBeNull();
  const response = await page.request.get(new URL(href as string, page.url()).href);
  expect(response.status()).toBe(200);
});

test("(f) each picker change announces the example and the three counts once", async ({ page }) => {
  const card = await openComparison(page);
  const announce = card.locator("[data-announce]");
  await expect(announce).toHaveAttribute("role", "status");
  // Nothing is announced on load.
  await expect(announce).toHaveText("");

  for (const example of EXAMPLES.slice(1)) {
    await pick(card, example.id);
    const expected = `Showing ${example.label}. Toy tokenizer: ${countOf(example.id, "toy")} tokens. GPT-2: ${countOf(example.id, "gpt2")} tokens. BERT: ${countOf(example.id, "bert")} tokens.`;
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
  await expect(card.locator("[data-row]")).toHaveCount(3);

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
  await expect(card.locator("[data-row]")).toHaveCount(3);
  for (const id of ROW_ORDER) expect(await card.locator(`[data-row="${id}"] [data-chip]`).count(), id).toBeGreaterThan(0);
  await expect(card.locator("[data-note]")).toHaveText(NOTES["rare-word"] as string);
  await expect(card.locator("[data-compare-text]")).toHaveText(EXAMPLES[0]?.text as string);
  // The note sits in <noscript>, which text matchers skip, so address it by its class.
  const nojs = card.locator(".island-nojs");
  await expect(nojs).toBeVisible();
  await expect(nojs).toHaveText("Switching examples needs JavaScript. The first example is shown below.");
  await expect(card.locator("[data-status]")).toBeHidden();
  await context.close();
});

test("(i) loading, scrolling and using the picker never request a tokenizer file", async ({ page }) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  const card = await openComparison(page);
  for (const example of EXAMPLES) await pick(card, example.id);
  await page.waitForTimeout(500);
  expect(urls.length).toBeGreaterThan(0);
  expect(urls.filter((url) => url.includes("/tokenizers/"))).toEqual([]);
});

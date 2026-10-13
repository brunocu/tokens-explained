import { expect, test, type Locator, type Page } from "@playwright/test";
import fixture from "../src/core/compare/comparison.json" with { type: "json" };
import { DEFAULT_TEXT, EXAMPLES } from "../src/core/examples.ts";
import { expectCompareText, openPlaygroundReady } from "./helpers.ts";

// The live part of the comparison card, which is ONE widget with the precomputed examples: GPT-2 is
// live without a button (the card asks the same memoised loader as the playground, so the page makes
// one request for the file), the text area is editable in place, and BERT downloads only when the
// reader presses its own sized button. Typing and picking never cause a request (D-08, D-09, T-02-21).
// This spec is also run by `npm run check:base` under a non-root base, so every address is built from
// the page's own base.
//
// Two islands ask for the GPT-2 file: the playground and this card. Where a test blocks that file it
// says which island is being exercised.

const ROW_ORDER = ["gpt2", "bert"] as const;
type RowId = (typeof ROW_ORDER)[number];

type FixtureRows = Record<RowId, unknown[]>;
const fixtureById = new Map(
  (fixture.examples as unknown as Array<{ id: string; rows: FixtureRows }>).map((example) => [example.id, example]),
);
const countOf = (id: string, row: RowId): number => (fixtureById.get(id)?.rows[row] ?? []).length;

/** The card starts on the default text, not on an example (its GPT-2 count is precomputed too). */
const DEFAULT_GPT2_COUNT = (fixture.defaultText.gpt2 as unknown[]).length;

const FIRST = EXAMPLES[0] as (typeof EXAMPLES)[number];

async function openComparison(page: Page): Promise<Locator> {
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-compare]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  return card;
}

/** Pick an example the way a reader does: click its button under the text box. */
async function pick(card: Locator, id: string): Promise<void> {
  await card.locator(`button[data-example="${id}"]`).click();
  await expect(card.locator("#compare-input")).toHaveValue(EXAMPLES.find((example) => example.id === id)?.text ?? "");
}

/** The count of one row. */
const liveCount = (card: Locator, row: RowId): Locator => card.locator(`[data-row="${row}"] [data-row-count]`);

const BERT_SIZE = fixture.meta.download.bert.sizeLabelMb;
// U+FFFD, and the byte-map glyphs for a space and a new line that must never reach the page.
const FORBIDDEN = ["\u{FFFD}", "\u{0120}", "\u{010A}"];
const GPT2_ONLY_ANNOUNCEMENT = /^GPT-2: (\d+) tokens\.$/;
const ANNOUNCEMENT = /^GPT-2: (\d+) tokens\. BERT: (\d+) tokens\.$/;

test("(tracer) GPT-2 is live with no button, typing replaces the BERT row by a prompt, BERT downloads only on its click, and typing sends nothing", async ({
  page,
  baseURL,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  const tokenizerUrls = () => urls.filter((url) => url.includes("/tokenizers/"));
  const gpt2Url = new URL("tokenizers/gpt2.json", baseURL).href;
  const bertUrl = new URL("tokenizers/bert-uncased.json", baseURL).href;

  // The playground downloads GPT-2 at page load; the card shares that one request.
  await openPlaygroundReady(page, "what-is-a-token/");
  const card = page.locator("[data-compare]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(card).toHaveAttribute("data-compare-gpt2", "ready");
  await expect(card).toHaveAttribute("data-compare-bert", "idle");

  // On arrival the card shows the example with both rows (BERT's is precomputed), and the only button
  // is BERT's.
  await expect(card.locator("[data-row]")).toHaveCount(2);
  await expect(card.locator("[data-load]")).toHaveCount(1);
  await expect(card.locator("[data-load]")).toBeVisible();

  // Picking examples and waiting cause no request; the log holds the one GPT-2 file and no BERT file.
  await pick(card, "emoji");
  await pick(card, FIRST.id);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  expect(tokenizerUrls()).toEqual([gpt2Url]);

  // The text is the example's, and the live GPT-2 count equals the precomputed one.
  await expect(card.locator("#compare-input")).toHaveValue(FIRST.text);
  await expect(liveCount(card, "gpt2")).toHaveText(String(countOf(FIRST.id, "gpt2")));

  // Typing changes the GPT-2 row, takes the precomputed BERT row away (it was for the example, not for
  // this text) and sends nothing.
  const beforeTyping = urls.length;
  await card.locator("#compare-input").fill("Hello \u{1F642} world");
  // The BERT row keeps its header and says it is waiting; only the GPT-2 row holds tokens.
  await expect(card.locator("[data-row-count]")).toHaveCount(1);
  await expect(card.locator("[data-bert-pending]")).toBeVisible();
  await page.waitForTimeout(700);
  expect(urls.slice(beforeTyping)).toEqual([]);

  // One click, one new request, for the BERT file only; then both rows are live.
  await card.locator("#compare-input").fill(FIRST.text);
  await card.locator("[data-load]").click();
  await expect.poll(() => tokenizerUrls().length, { timeout: 15_000 }).toBe(2);
  await expect(card).toHaveAttribute("data-compare-bert", "ready");
  expect(tokenizerUrls()).toEqual([gpt2Url, bertUrl]);
  await expect(card.locator("[data-row]")).toHaveCount(2);
  for (const row of ROW_ORDER) {
    await expect(liveCount(card, row), row).toHaveText(String(countOf(FIRST.id, row)));
  }

  // Typing an emoji changes both rows and sends nothing.
  const before = urls.length;
  await card.locator("#compare-input").fill("Hello \u{1F642} world");
  await expect(card.locator('[data-row="bert"] [data-special="true"]')).toHaveCount(1);
  await page.waitForTimeout(700);
  expect(urls.slice(before)).toEqual([]);
  expect(tokenizerUrls()).toHaveLength(2);
});

/** Open the post and wait until the card shows GPT-2 live (no button was pressed). */
async function openReady(page: Page): Promise<Locator> {
  const card = await openComparison(page);
  await expect(card).toHaveAttribute("data-compare-gpt2", "ready");
  return card;
}

/** As openReady, then press the BERT button and wait until BERT is live. */
async function openBoth(page: Page): Promise<Locator> {
  const card = await openReady(page);
  await card.locator("[data-load]").click();
  await expect(card).toHaveAttribute("data-compare-bert", "ready");
  return card;
}

test("(a) the one button is BERT's and shows its size from the fixture", async ({ page }) => {
  const card = await openReady(page);
  await expect(card.locator("[data-load]")).toBeVisible();
  await expect(card.locator("[data-load]")).toContainText(BERT_SIZE);
  // GPT-2 needs no button: its box and its row are already there, and the card is not busy.
  await expect(card.locator("#compare-input")).toBeVisible();
  await expect(card.locator('[data-row="gpt2"]')).toBeVisible();
  await expect(card).not.toHaveAttribute("aria-busy", "true");
});

test("(b) while BERT is still coming the card shows a status, is aria-busy and has no spinner; GPT-2 stays live; then both rows are live", async ({
  page,
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/tokenizers/bert-uncased.json", async (route) => {
    await gate;
    await route.continue();
  });
  const card = await openReady(page);
  await card.locator("#compare-input").fill("some words of my own");
  await card.locator("[data-load]").click();

  await expect(card).toHaveAttribute("data-compare-bert", "loading");
  await expect(card).toHaveAttribute("aria-busy", "true");
  const status = card.locator('[data-compare-loading="bert"]');
  await expect(status).toHaveAttribute("role", "status");
  await expect(status).toContainText(BERT_SIZE);
  await expect(card.locator("[data-load]")).toHaveCount(0);
  // No spinner or progress element of any kind.
  await expect(card.locator('[role="progressbar"], progress, svg')).toHaveCount(0);
  // GPT-2 is not held up by BERT.
  await expect(card.locator('[data-row="gpt2"]')).toBeVisible();
  await expect(card.locator('[data-row="bert"] [data-row-count]')).toHaveCount(0);
  await expect(card.locator("[data-bert-pending]")).toBeVisible();

  release();
  await expect(card).toHaveAttribute("data-compare-bert", "ready");
  await expect(card).not.toHaveAttribute("aria-busy", "true");
  await expect(card.locator("[data-compare-loading]")).toHaveCount(0);
  await expect(card.locator(":scope > [data-announce]")).not.toBeEmpty();
  // Focus lands in the text box, since the button that was pressed is gone.
  await expect(card.locator("#compare-input")).toBeFocused();
  await expect(card.locator("[data-row]")).toHaveCount(2);
});

test("(c) a failed BERT download shows an error, keeps the live GPT-2 row, and Try again requests only the BERT file", async ({
  page,
  baseURL,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  const gpt2Url = new URL("tokenizers/gpt2.json", baseURL).href;
  const bertUrl = new URL("tokenizers/bert-uncased.json", baseURL).href;
  const count = (url: string) => urls.filter((u) => u === url).length;

  await page.route("**/tokenizers/bert-uncased.json", (route) => route.abort());
  const card = await openReady(page);
  await card.locator("[data-load]").click();

  await expect(card).toHaveAttribute("data-compare-bert", "error");
  await expect(card.locator('[data-compare-error="bert"]')).toBeVisible();
  await expect(card.locator('[data-retry="bert"]')).toBeVisible();
  await expect(card.locator('[data-retry="bert"]')).toBeFocused();
  // GPT-2 is untouched: still ready, still live, never asked for again. The example's precomputed
  // BERT row is still there for the unchanged text.
  await expect(card).toHaveAttribute("data-compare-gpt2", "ready");
  await expect(card.locator("[data-row]")).toHaveCount(2);
  await card.locator("#compare-input").fill("still live");
  await expect(card.locator("[data-row-count]")).toHaveCount(1);
  await expect(liveCount(card, "gpt2")).not.toHaveText("0");
  await card.locator("#compare-input").fill(FIRST.text);
  expect(count(gpt2Url)).toBe(1);
  expect(count(bertUrl)).toBe(1);

  await page.unroute("**/tokenizers/bert-uncased.json");
  await card.locator('[data-retry="bert"]').click();
  await expect(card).toHaveAttribute("data-compare-bert", "ready");
  // Only the file that failed was requested again.
  expect(count(gpt2Url)).toBe(1);
  expect(count(bertUrl)).toBe(2);
  for (const row of ROW_ORDER) await expect(liveCount(card, row), row).toHaveText(String(countOf(FIRST.id, row)));
});

test("(c2) when GPT-2 fails, the playground and the card each show their own message, the card keeps the example rows, and the card's retry also clears the playground silently", async ({
  page,
  baseURL,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  const gpt2Url = new URL("tokenizers/gpt2.json", baseURL).href;
  const count = () => urls.filter((u) => u === gpt2Url).length;

  // Both islands ask for this file: the playground and the comparison card. Blocking it exercises both.
  await page.route("**/tokenizers/gpt2.json", (route) => route.abort());
  const card = await openComparison(page);
  const playground = page.locator("[data-playground]");
  await expect(playground).toHaveAttribute("data-tokenizer", "failed");
  await expect(playground.locator("[data-tokenizer-load-error]")).toBeVisible();

  // The card shows its own error and Try again. The example text and both precomputed rows stay
  // on screen, the text is read-only, and BERT is not offered before GPT-2 works.
  await expect(card).toHaveAttribute("data-compare-gpt2", "error");
  await expect(card.locator('[data-compare-error="gpt2"]')).toBeVisible();
  await expect(card.locator('[data-retry="gpt2"]')).toBeVisible();
  await expect(card.locator("[data-compare-text]")).toHaveText(DEFAULT_TEXT);
  await expect(card.locator("textarea")).toHaveCount(0);
  await expect(card.locator("[data-row]")).toHaveCount(2);
  await expect(card.locator("[data-load]")).toHaveCount(0);
  expect(urls.filter((u) => u.includes("bert"))).toEqual([]);

  // The card's Try again asks for the GPT-2 file again and then makes the text editable.
  await page.unroute("**/tokenizers/gpt2.json");
  const before = count();
  await card.locator('[data-retry="gpt2"]').click();
  await expect(card).toHaveAttribute("data-compare-gpt2", "ready");
  expect(count()).toBe(before + 1);
  await expect(card.locator('[data-row="gpt2"]')).toBeVisible();
  await expect(card.locator("#compare-input")).toHaveValue(DEFAULT_TEXT);
  await expect(liveCount(card, "gpt2")).toHaveText(String(DEFAULT_GPT2_COUNT));
  await expect(card.locator("#compare-input")).toBeFocused();

  // The card's success also cleared the playground (G-02.1-3), silently and with no request of its own:
  // no click, no Try again button, no error, an editable textbox, nothing announced, focus still in the card.
  await expect(playground).toHaveAttribute("data-tokenizer", "ready");
  await expect(playground.locator("[data-tokenizer-retry]")).toHaveCount(0);
  await expect(playground.locator("[data-tokenizer-load-error]")).toHaveCount(0);
  await expect(playground.locator("textarea")).toBeEditable();
  await expect(playground.locator("[data-tokenizer-live]")).toHaveText("");
  await expect(playground.locator("textarea")).not.toBeFocused();
  await expect(card.locator("#compare-input")).toBeFocused();
  expect(count()).toBe(before + 1);
});

test("(c2b) a Try again in the playground clears the card's error too, without moving focus or announcing there", async ({
  page,
  baseURL,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  const gpt2Url = new URL("tokenizers/gpt2.json", baseURL).href;
  const count = () => urls.filter((u) => u === gpt2Url).length;

  await page.route("**/tokenizers/gpt2.json", (route) => route.abort());
  const card = await openComparison(page);
  const playground = page.locator("[data-playground]");
  await expect(playground).toHaveAttribute("data-tokenizer", "failed");
  await expect(card).toHaveAttribute("data-compare-gpt2", "error");

  await page.unroute("**/tokenizers/gpt2.json");
  const before = count();
  await playground.locator("[data-tokenizer-retry]").click();

  // The pressed widget announces and is usable.
  await expect(playground).toHaveAttribute("data-tokenizer", "ready");
  await expect(playground.locator("[data-tokenizer-live]")).not.toBeEmpty();

  // The card leaves its error without a click, silently: no message, no button, no announcement, no focus.
  await expect(card).toHaveAttribute("data-compare-gpt2", "ready");
  await expect(card.locator('[data-retry="gpt2"]')).toHaveCount(0);
  await expect(card.locator('[data-compare-error="gpt2"]')).toHaveCount(0);
  await expect(card.locator("#compare-input")).toBeVisible();
  await expect(card.locator("#compare-input")).not.toBeFocused();
  await expect(card.locator(":scope > [data-announce]")).toHaveText("");
  await expect(liveCount(card, "gpt2")).toHaveText(String(DEFAULT_GPT2_COUNT));
  expect(count()).toBe(before + 1);
});

test("(c2c) a retry that fails again leaves the other widget on its error", async ({ page }) => {
  await page.route("**/tokenizers/gpt2.json", (route) => route.abort());
  const card = await openComparison(page);
  const playground = page.locator("[data-playground]");
  await expect(playground).toHaveAttribute("data-tokenizer", "failed");
  await expect(card).toHaveAttribute("data-compare-gpt2", "error");

  // Still blocked: the playground's retry fails again and changes nothing in the card.
  await playground.locator("[data-tokenizer-retry]").click();
  await expect(playground).toHaveAttribute("data-tokenizer", "failed");
  await expect(playground.locator("[data-tokenizer-retry]")).toBeFocused();
  await expect(card).toHaveAttribute("data-compare-gpt2", "error");
  await expect(card.locator('[data-retry="gpt2"]')).toBeVisible();

  // Reachable again: the card's retry works and the playground follows without a click.
  await page.unroute("**/tokenizers/gpt2.json");
  await card.locator('[data-retry="gpt2"]').click();
  await expect(card).toHaveAttribute("data-compare-gpt2", "ready");
  await expect(playground).toHaveAttribute("data-tokenizer", "ready");
  await expect(playground.locator("[data-tokenizer-retry]")).toHaveCount(0);
});

test("(c3) a response that is not a file (404) is handled like a failed download, for either tokenizer", async ({ page }) => {
  // GPT-2 404: both islands that ask for the file (playground and card) fail.
  await page.route("**/tokenizers/gpt2.json", (route) => route.fulfill({ status: 404, body: "not found" }));
  const card = await openComparison(page);
  await expect(card.locator('[data-compare-error="gpt2"]')).toBeVisible();
  await expect(card.locator('[data-retry="gpt2"]')).toBeVisible();
  await expect(page.locator("[data-playground] [data-tokenizer-load-error]")).toBeVisible();

  // BERT 404: GPT-2 works, only the click-started BERT download fails.
  await page.unroute("**/tokenizers/gpt2.json");
  await page.route("**/tokenizers/bert-uncased.json", (route) => route.fulfill({ status: 404, body: "not found" }));
  const second = await openComparison(page);
  await expect(second).toHaveAttribute("data-compare-gpt2", "ready");
  await second.locator("[data-load]").click();
  await expect(second.locator('[data-compare-error="bert"]')).toBeVisible();
  await expect(second.locator('[data-retry="bert"]')).toBeVisible();
  await expect(second.locator('[data-row="gpt2"]')).toBeVisible();
});

test("(d) an emoji text shows partial characters, [UNK] and no replacement symbol; typed [CLS] and <|endoftext|> are one special chip each", async ({
  page,
}) => {
  const card = await openBoth(page);
  await card.locator("#compare-input").fill("Great job \u{1F389} see you soon");

  const hatched = card.locator('[data-row="gpt2"] [data-char-frame] [data-chip][data-partial="true"]');
  expect(await hatched.count()).toBeGreaterThan(0);
  const unk = card.locator('[data-row="bert"] [data-special="true"]');
  await expect(unk).toHaveCount(1);
  expect((await unk.first().locator("[data-chip-main]").textContent())?.trim()).toBe("[UNK]");
  await expect(card.locator("[data-legend]")).toBeVisible();
  const shown = (await card.locator('[role="region"][aria-label$=", scrollable"]').allTextContents()).join(" ");
  for (const glyph of FORBIDDEN) expect(shown.includes(glyph), `U+${glyph.codePointAt(0)?.toString(16)}`).toBe(false);

  await card.locator("#compare-input").fill("[CLS]");
  const special = card.locator('[data-row="bert"] [data-special="true"]');
  await expect(special).toHaveCount(1);
  expect((await special.first().locator("[data-chip-main]").textContent())?.trim()).toBe("[CLS]");

  // The typed end-of-text string is one special chip in the GPT-2 row.
  await card.locator("#compare-input").fill("<|endoftext|>");
  const marker = card.locator('[data-row="gpt2"] [data-special="true"]');
  await expect(marker).toHaveCount(1);
  expect((await marker.first().locator("[data-chip-main]").textContent())?.trim()).toBe("<|endoftext|>");

  // Ordinary text has no special chip.
  await card.locator("#compare-input").fill("plain words only");
  await expect(card.locator('[data-special="true"]')).toHaveCount(0);
});

test("(e) the limit message appears at 1,000 characters and not at 999", async ({ page }) => {
  const card = await openReady(page);
  await card.locator("#compare-input").fill("a".repeat(999));
  await expect(card.locator("[data-limit]")).toHaveCount(0);
  await card.locator("#compare-input").fill("a".repeat(1000));
  await expect(card.locator("[data-limit]")).toBeVisible();
  await card.locator("#compare-input").fill("a".repeat(999));
  await expect(card.locator("[data-limit]")).toHaveCount(0);
  await expect(card.locator("#compare-input")).toHaveAttribute("maxlength", "1000");
});

test("(f) one debounced announcement gives the GPT-2 count, and the BERT count once loaded, equal to the chips shown", async ({
  page,
}) => {
  const card = await openReady(page);
  const live = card.locator(":scope > [data-announce]");
  await expect(live).toHaveAttribute("role", "status");

  const observe = async (): Promise<void> => {
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const el = document.querySelector("[data-compare] > [data-announce]") as HTMLElement;
      const seen: string[] = [];
      (window as unknown as { __seen: string[] }).__seen = seen;
      new MutationObserver(() => seen.push(el.textContent ?? "")).observe(el, { childList: true, characterData: true, subtree: true });
    });
  };
  const seenMessages = () => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);

  // GPT-2 alone: two edits within 200 ms announce only the final text, with one count.
  await observe();
  await card.locator("#compare-input").fill("x");
  await page.waitForTimeout(100);
  await card.locator("#compare-input").fill("Unbelievable results, 2026!");
  await expect(live).toHaveText(GPT2_ONLY_ANNOUNCEMENT, { timeout: 3000 });
  await page.waitForTimeout(700);
  const first = await seenMessages();
  expect(first).toHaveLength(1);
  const gpt2Only = GPT2_ONLY_ANNOUNCEMENT.exec(first[0] as string);
  expect(gpt2Only).not.toBeNull();
  const gpt2Chips = await card.locator('[data-row="gpt2"] [data-chip]').count();
  expect(Number(gpt2Only?.[1])).toBe(gpt2Chips);

  // Once BERT is loaded the same single announcement carries both counts.
  await card.locator("[data-load]").click();
  await expect(card).toHaveAttribute("data-compare-bert", "ready");
  await observe();
  await card.locator("#compare-input").fill("x");
  await page.waitForTimeout(100);
  await card.locator("#compare-input").fill("Unbelievable results, 2026!");
  await expect(live).toHaveText(ANNOUNCEMENT, { timeout: 3000 });
  await page.waitForTimeout(700);
  const seen = await seenMessages();
  expect(seen).toHaveLength(1);

  const match = ANNOUNCEMENT.exec(seen[0] as string);
  expect(match).not.toBeNull();
  for (const [i, row] of ROW_ORDER.entries()) {
    const chips = await card.locator(`[data-row="${row}"] [data-chip]`).count();
    expect(Number(match?.[i + 1]), row).toBe(chips);
    await expect(liveCount(card, row), row).toHaveText(String(chips));
  }
});

test("(g) a tokenizer that throws replaces the rows by one clear message, the box stays usable, and the next valid input recovers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = TextEncoder.prototype.encode;
    TextEncoder.prototype.encode = function (this: TextEncoder, input?: string) {
      if ((window as unknown as { __breakEncoder?: boolean }).__breakEncoder) throw new Error("encoder broken");
      return original.call(this, input);
    };
  });
  const card = await openBoth(page);
  await page.evaluate(() => {
    (window as unknown as { __breakEncoder?: boolean }).__breakEncoder = true;
  });
  await card.locator("#compare-input").fill("something new");
  await expect(card.locator("[data-compare-failure]")).toBeVisible();
  await expect(card.locator("[data-row]")).toHaveCount(0);
  await expect(card.locator("#compare-input")).toBeEditable();

  await page.evaluate(() => {
    (window as unknown as { __breakEncoder?: boolean }).__breakEncoder = false;
  });
  await card.locator("#compare-input").fill("hello");
  await expect(card.locator("[data-compare-failure]")).toHaveCount(0);
  await expect(card.locator("[data-row]")).toHaveCount(2);
  expect(await card.locator('[data-row="gpt2"] [data-chip]').count()).toBeGreaterThan(0);
});

test("(h) each row is a list with one list item per chip and the row counts match the chips; the empty text shows the empty state", async ({
  page,
}) => {
  const card = await openBoth(page);
  await card.locator("#compare-input").fill("A \u{1F642} and numbers 12345");
  for (const row of ROW_ORDER) {
    const scope = card.locator(`[data-row="${row}"]`);
    await expect(scope.getByRole("list")).toHaveCount(1);
    expect(await scope.getByRole("listitem").count(), row).toBe(await scope.locator("[data-chip]").count());
  }

  // There is no table alternative any more: the row count is the check.
  await expect(card.locator("details[data-alt-tables]")).toHaveCount(0);
  for (const row of ROW_ORDER) {
    const chips = await card.locator(`[data-row="${row}"] [data-chip]`).count();
    await expect(liveCount(card, row), row).toHaveText(String(chips));
  }

  // Empty text: each row shows the empty state.
  await card.locator("#compare-input").fill("");
  await expect(card.locator("[data-empty]")).toHaveCount(2);
  await expect(card.locator("[data-empty] .empty-title").first()).toBeVisible();
  await expect(card.locator("[data-empty] .empty-body").first()).toBeVisible();
  for (const row of ROW_ORDER) await expect(liveCount(card, row), row).toHaveText("0");
});

test("(h2) after typing, before BERT is loaded, there is one row with tokens, for GPT-2, and BERT's row waits", async ({ page }) => {
  const card = await openReady(page);
  await card.locator("#compare-input").fill("A \u{1F642} and numbers 12345");
  await expect(card.locator("[data-row-count]")).toHaveCount(1);
  await expect(card.locator('[data-row="gpt2"] [data-row-count]')).toHaveCount(1);
  await expect(card.locator("[data-bert-pending]")).toBeVisible();
  const chips = await card.locator('[data-row="gpt2"] [data-chip]').count();
  await expect(liveCount(card, "gpt2")).toHaveText(String(chips));
});

test("(i) the ready card shows the privacy line linked to the box; the note is always shown; an example or Reset text brings the rows for a known text back", async ({
  page,
}) => {
  const card = await openReady(page);
  await expect(card.locator("label[for='compare-input']")).toBeVisible();
  const privacy = card.locator("#compare-privacy");
  await expect(privacy).toBeVisible();
  await expect(privacy).not.toBeEmpty();
  await expect(card.locator("#compare-input")).toHaveAttribute("aria-describedby", "compare-privacy");
  // One note, always shown.
  await expectCompareText(card, DEFAULT_TEXT);
  await expect(card.locator("[data-note]")).toBeVisible();
  await pick(card, FIRST.id);
  await expect(card.locator("[data-note]")).toBeVisible();
  for (const row of ROW_ORDER) await expect(liveCount(card, row), row).toHaveText(String(countOf(FIRST.id, row)));

  // Typing keeps the note; the old "use the example text again" button is gone.
  await card.locator("#compare-input").fill("my own words");
  await expect(card.locator("[data-note]")).toBeVisible();
  await expect(card.locator("[data-compare-reset]")).toHaveCount(0);

  // Reset text puts the default text back, with focus in the box and its precomputed rows.
  await card.locator("[data-reset]").click();
  await expect(card.locator("#compare-input")).toHaveValue(DEFAULT_TEXT);
  await expect(card.locator("#compare-input")).toBeFocused();
  await expect(liveCount(card, "gpt2")).toHaveText(String(DEFAULT_GPT2_COUNT));

  // Picking an example after typing replaces the typed text by the example.
  await card.locator("#compare-input").fill("my own words again");
  await pick(card, "emoji");
  await expect(card.locator("#compare-input")).toHaveValue(EXAMPLES.find((e) => e.id === "emoji")?.text as string);
  await expect(card.locator("[data-note]")).toBeVisible();
  for (const row of ROW_ORDER) await expect(liveCount(card, row), row).toHaveText(String(countOf("emoji", row)));
});

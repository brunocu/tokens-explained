import { expect, test, type Locator, type Page } from "@playwright/test";
import fixture from "../src/core/compare/comparison.json" with { type: "json" };
import { EXAMPLES } from "../src/core/examples.ts";

// The own-text block of the comparison card: an explicit button downloads GPT-2 and BERT, then the
// reader types anything and sees three live rows. No request happens before the click, exactly two
// after it, and none while typing (D-10, T-02-21). This spec is also run by `npm run check:base`
// under a non-root base, so every address is built from the page's own base.

const ROW_ORDER = ["toy", "gpt2", "bert"] as const;
type RowId = (typeof ROW_ORDER)[number];

type FixtureRows = Record<RowId, unknown[]>;
const fixtureById = new Map(
  (fixture.examples as unknown as Array<{ id: string; rows: FixtureRows }>).map((example) => [example.id, example]),
);
const countOf = (id: string, row: RowId): number => (fixtureById.get(id)?.rows[row] ?? []).length;

const FIRST = EXAMPLES[0] as (typeof EXAMPLES)[number];

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

/** The live count of one row inside the own-text block. */
const liveCount = (own: Locator, row: RowId): Locator => own.locator(`[data-row="${row}"] [data-row-count]`);

test("(tracer) nothing is requested before the click, exactly two files after it, and typing sends nothing", async ({ page, baseURL }) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  const tokenizerUrls = () => urls.filter((url) => url.includes("/tokenizers/"));

  const card = await openComparison(page);
  const own = card.locator("[data-owntext]");
  await expect(own).toHaveAttribute("data-own-state", "idle");
  await own.scrollIntoViewIfNeeded();
  await pick(card, "emoji");
  await pick(card, FIRST.id);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  expect(tokenizerUrls()).toEqual([]);

  const gpt2Url = new URL("tokenizers/gpt2.json", baseURL).href;
  const bertUrl = new URL("tokenizers/bert-uncased.json", baseURL).href;

  await own.locator("[data-load]").click();
  await expect.poll(() => tokenizerUrls().length, { timeout: 15_000 }).toBe(2);
  await expect(own).toHaveAttribute("data-own-state", "ready");
  expect([...tokenizerUrls()].sort()).toEqual([gpt2Url, bertUrl].sort());

  // Prefilled with the first example; the live counts equal the precomputed ones for all three.
  await expect(own.locator("#own-text")).toHaveValue(FIRST.text);
  for (const row of ROW_ORDER) {
    await expect(liveCount(own, row), row).toHaveText(String(countOf(FIRST.id, row)));
  }

  // Typing, including an emoji, changes the rows and sends nothing.
  const before = urls.length;
  await own.locator("#own-text").fill("Hello \u{1F642} world");
  await expect(own.locator('[data-row="bert"] [data-special="true"]')).toHaveCount(1);
  await page.waitForTimeout(700);
  expect(urls.slice(before)).toEqual([]);
  expect(tokenizerUrls()).toHaveLength(2);
});

const SIZE = fixture.meta.download.sizeLabelMb;
// U+FFFD, and the byte-map glyphs for a space and a new line that must never reach the page.
const FORBIDDEN = ["\u{FFFD}", "\u{0120}", "\u{010A}"];
const ANNOUNCEMENT = /^Toy tokenizer: (\d+) tokens\. GPT-2: (\d+) tokens\. BERT: (\d+) tokens\.$/;

/** Open the post, press the load button and wait until the own-text block is ready. */
async function openReadyOwn(page: Page): Promise<{ card: Locator; own: Locator }> {
  const card = await openComparison(page);
  const own = card.locator("[data-owntext]");
  await own.scrollIntoViewIfNeeded();
  await own.locator("[data-load]").click();
  await expect(own).toHaveAttribute("data-own-state", "ready");
  return { card, own };
}

test("(a) the button names the size, and the idle paragraph says nothing is downloaded until it is pressed", async ({ page }) => {
  const card = await openComparison(page);
  const own = card.locator("[data-owntext]");
  await expect(own.locator("[data-load]")).toHaveText(`Load GPT-2 and BERT (about ${SIZE} MB)`);
  await expect(own.locator("[data-load]")).toHaveText("Load GPT-2 and BERT (about 0.7 MB)");
  await expect(own.getByRole("heading", { name: "Try your own text" })).toBeVisible();
  await expect(own).toContainText(
    `Want to use your own text? This downloads two small tokenizer files, GPT-2 and BERT, once (about ${SIZE} MB in total). Nothing is downloaded until you press the button.`,
  );
  // Before the click there is nothing to type into.
  await expect(own.locator("#own-text")).toHaveCount(0);
});

test("(b) while a file is still coming the block says so, is aria-busy and has no spinner; then it is ready", async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/tokenizers/bert-uncased.json", async (route) => {
    await gate;
    await route.continue();
  });
  const card = await openComparison(page);
  const own = card.locator("[data-owntext]");
  await own.locator("[data-load]").click();

  await expect(own).toHaveAttribute("data-own-state", "loading");
  await expect(own).toHaveAttribute("aria-busy", "true");
  const status = own.locator("[data-own-loading]");
  await expect(status).toHaveAttribute("role", "status");
  await expect(status).toHaveText(`Downloading the GPT-2 and BERT tokenizers (about ${SIZE} MB)...`);
  await expect(own.locator("[data-load]")).toHaveCount(0);
  // No spinner or progress element of any kind.
  await expect(own.locator('[role="progressbar"], progress, svg')).toHaveCount(0);

  release();
  await expect(own).toHaveAttribute("data-own-state", "ready");
  await expect(own).not.toHaveAttribute("aria-busy", "true");
  await expect(own.locator("[data-own-loading]")).toHaveCount(0);
  await expect(own.locator("[data-own-live]")).toHaveText("Loaded. Type below.");
  // Focus lands in the text box, since the button that was pressed is gone.
  await expect(own.locator("#own-text")).toBeFocused();
});

test("(c) a failed download names the tokenizer, keeps the one that arrived, and Try again requests only the failed file", async ({
  page,
  baseURL,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  const gpt2Url = new URL("tokenizers/gpt2.json", baseURL).href;
  const bertUrl = new URL("tokenizers/bert-uncased.json", baseURL).href;
  const count = (url: string) => urls.filter((u) => u === url).length;

  await page.route("**/tokenizers/bert-uncased.json", (route) => route.abort());
  const card = await openComparison(page);
  const own = card.locator("[data-owntext]");
  await own.locator("[data-load]").click();

  await expect(own).toHaveAttribute("data-own-state", "error");
  await expect(own.locator("[data-own-error]")).toHaveText("The BERT tokenizer could not be downloaded. Check your connection and try again.");
  await expect(own.locator("[data-retry]")).toHaveText("Try again");
  await expect(own.locator("[data-retry]")).toBeFocused();
  expect(count(gpt2Url)).toBe(1);
  expect(count(bertUrl)).toBe(1);

  await page.unroute("**/tokenizers/bert-uncased.json");
  await own.locator("[data-retry]").click();
  await expect(own).toHaveAttribute("data-own-state", "ready");
  // Only the file that failed was requested again.
  expect(count(gpt2Url)).toBe(1);
  expect(count(bertUrl)).toBe(2);
  await expect(own.locator("#own-text")).toHaveValue(FIRST.text);
  for (const row of ROW_ORDER) await expect(liveCount(own, row), row).toHaveText(String(countOf(FIRST.id, row)));
});

test("(c2) the error sentence names GPT-2 alone when only that file fails, and the retry asks only for GPT-2", async ({ page, baseURL }) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  const bertUrl = new URL("tokenizers/bert-uncased.json", baseURL).href;

  await page.route("**/tokenizers/gpt2.json", (route) => route.abort());
  const card = await openComparison(page);
  const own = card.locator("[data-owntext]");
  await own.locator("[data-load]").click();
  await expect(own.locator("[data-own-error]")).toHaveText("The GPT-2 tokenizer could not be downloaded. Check your connection and try again.");

  // BERT arrived and is kept: a second failed attempt still names only GPT-2, and BERT is not asked for again.
  await own.locator("[data-retry]").click();
  await expect(own.locator("[data-own-error]")).toHaveText("The GPT-2 tokenizer could not be downloaded. Check your connection and try again.");
  expect(urls.filter((u) => u === bertUrl)).toHaveLength(1);
});

test("(c2b) the error sentence names both tokenizers when neither file arrives, and Try again asks for both", async ({ page }) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  await page.route("**/tokenizers/*.json", (route) => route.abort());
  const card = await openComparison(page);
  const own = card.locator("[data-owntext]");
  await own.locator("[data-load]").click();
  await expect(own.locator("[data-own-error]")).toHaveText(
    "The GPT-2 and BERT tokenizer could not be downloaded. Check your connection and try again.",
  );
  expect(urls.filter((u) => u.includes("/tokenizers/"))).toHaveLength(2);

  await own.locator("[data-retry]").click();
  await expect(own.locator("[data-own-error]")).toBeVisible();
  await expect.poll(() => urls.filter((u) => u.includes("/tokenizers/")).length).toBe(4);
});

test("(c3) a response that is not a file (404) is handled like a failed download", async ({ page }) => {
  await page.route("**/tokenizers/gpt2.json", (route) => route.fulfill({ status: 404, body: "not found" }));
  const card = await openComparison(page);
  const own = card.locator("[data-owntext]");
  await own.locator("[data-load]").click();
  await expect(own.locator("[data-own-error]")).toContainText("The GPT-2 tokenizer could not be downloaded.");
  await expect(own.locator("[data-retry]")).toBeVisible();
});

test("(d) an emoji text shows partial characters, [UNK] and no replacement symbol; typed [CLS] is one special chip", async ({ page }) => {
  const { own } = await openReadyOwn(page);
  await own.locator("#own-text").fill("Great job \u{1F389} see you soon");

  for (const row of ["toy", "gpt2"] as const) {
    const hatched = own.locator(`[data-row="${row}"] [data-char-frame] [data-chip][data-partial="true"]`);
    expect(await hatched.count(), row).toBeGreaterThan(0);
  }
  const unk = own.locator('[data-row="bert"] [data-special="true"]');
  await expect(unk).toHaveCount(1);
  expect((await unk.first().textContent())?.trim()).toBe("[UNK]");
  await expect(own.locator("[data-legend]")).toContainText("[UNK] means the tokenizer had no piece");
  const shown = (await own.textContent()) ?? "";
  for (const glyph of FORBIDDEN) expect(shown.includes(glyph), `U+${glyph.codePointAt(0)?.toString(16)}`).toBe(false);

  await own.locator("#own-text").fill("[CLS]");
  const special = own.locator('[data-row="bert"] [data-special="true"]');
  await expect(special).toHaveCount(1);
  expect((await special.first().textContent())?.trim()).toBe("[CLS]");

  // Ordinary text has no special chip, and the [UNK] sentence goes away with it.
  await own.locator("#own-text").fill("plain words only");
  await expect(own.locator('[data-special="true"]')).toHaveCount(0);
  await expect(own.locator("[data-legend]")).not.toContainText("[UNK]");
});

test("(e) the limit message appears at 1,000 characters and not at 999, worded for this box", async ({ page }) => {
  const { own } = await openReadyOwn(page);
  await own.locator("#own-text").fill("a".repeat(999));
  await expect(own.locator("[data-limit]")).toHaveCount(0);
  await own.locator("#own-text").fill("a".repeat(1000));
  await expect(own.locator("[data-limit]")).toHaveText(
    "That is the limit for this box: 1,000 characters. Delete some text to keep typing.",
  );
  await own.locator("#own-text").fill("a".repeat(999));
  await expect(own.locator("[data-limit]")).toHaveCount(0);
  await expect(own.locator("#own-text")).toHaveAttribute("maxlength", "1000");
});

test("(f) one debounced announcement gives the three counts, equal to the chips shown", async ({ page }) => {
  const { own } = await openReadyOwn(page);
  const live = own.locator("[data-own-live]");
  await expect(live).toHaveAttribute("role", "status");
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const el = document.querySelector("[data-owntext] [data-own-live]") as HTMLElement;
    const seen: string[] = [];
    (window as unknown as { __seen: string[] }).__seen = seen;
    new MutationObserver(() => seen.push(el.textContent ?? "")).observe(el, { childList: true, characterData: true, subtree: true });
  });

  // Two edits within 200 ms announce only the final text.
  await own.locator("#own-text").fill("x");
  await page.waitForTimeout(100);
  await own.locator("#own-text").fill("Unbelievable results, 2026!");
  await expect(live).toHaveText(ANNOUNCEMENT, { timeout: 3000 });
  await page.waitForTimeout(700);
  const seen = await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
  expect(seen).toHaveLength(1);

  const match = ANNOUNCEMENT.exec(seen[0] as string);
  expect(match).not.toBeNull();
  for (const [i, row] of ROW_ORDER.entries()) {
    const chips = await own.locator(`[data-row="${row}"] [data-chip]`).count();
    expect(Number(match?.[i + 1]), row).toBe(chips);
    await expect(liveCount(own, row), row).toHaveText(String(chips));
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
  const { own } = await openReadyOwn(page);
  await page.evaluate(() => {
    (window as unknown as { __breakEncoder?: boolean }).__breakEncoder = true;
  });
  await own.locator("#own-text").fill("something new");
  await expect(own.locator("[data-own-failure]")).toHaveText(
    "The tokenizers could not run on this text. Edit the text, or reload the page. Your text stays in your browser.",
  );
  await expect(own.locator("[data-row]")).toHaveCount(0);
  await expect(own.locator("#own-text")).toBeEditable();

  await page.evaluate(() => {
    (window as unknown as { __breakEncoder?: boolean }).__breakEncoder = false;
  });
  await own.locator("#own-text").fill("hello");
  await expect(own.locator("[data-own-failure]")).toHaveCount(0);
  await expect(own.locator("[data-row]")).toHaveCount(3);
  expect(await own.locator('[data-row="gpt2"] [data-chip]').count()).toBeGreaterThan(0);
});

test("(h) chips are hidden from assistive technology and the tables list the same counts; the empty text shows the empty state", async ({
  page,
}) => {
  const { own } = await openReadyOwn(page);
  await own.locator("#own-text").fill("A \u{1F642} and numbers 12345");
  for (const row of ROW_ORDER) {
    await expect(own.locator(`[data-row="${row}"] [aria-hidden="true"]`).first()).toBeAttached();
  }

  const details = own.locator("details[data-alt-tables]");
  await expect(details.locator("summary")).toHaveText("View your results as tables");
  await details.locator("summary").click();
  const tables = details.locator("table");
  await expect(tables).toHaveCount(3);
  await expect(tables.locator("caption")).toHaveText(["Tokens for the toy tokenizer", "Tokens for GPT-2", "Tokens for BERT"]);
  for (const [i, row] of ROW_ORDER.entries()) {
    const chips = await own.locator(`[data-row="${row}"] [data-chip]`).count();
    expect(await tables.nth(i).locator("tbody tr").count(), row).toBe(chips);
    await expect(liveCount(own, row), row).toHaveText(String(chips));
  }

  // Empty text: each row says there is nothing to split, with the own-text wording.
  await own.locator("#own-text").fill("");
  await expect(own.locator("[data-empty]")).toHaveCount(3);
  await expect(own.locator("[data-empty] .empty-title").first()).toHaveText("Nothing to split yet");
  await expect(own.locator("[data-empty] .empty-body").first()).toHaveText(
    "Type or paste some text above and it will be split into tokens here.",
  );
  for (const row of ROW_ORDER) await expect(liveCount(own, row), row).toHaveText("0");
});

test("(i) the ready block shows the privacy line linked to the box, and picker changes and typing never touch each other", async ({ page }) => {
  const { card, own } = await openReadyOwn(page);
  await expect(own.locator("label[for='own-text']")).toHaveText("Your text");
  const privacy = own.locator("#own-privacy");
  await expect(privacy).toHaveText("Your text stays in your browser. Nothing is sent anywhere.");
  await expect(own.locator("#own-text")).toHaveAttribute("aria-describedby", "own-privacy");
  await expect(own).toContainText("Counts here are computed in your browser with the downloaded files.");
  await expect(own.locator("[data-note]")).toHaveCount(0);
  await expect(own.locator("[data-source]")).toHaveCount(0);

  // Typing leaves the curated rows alone.
  const note = await card.locator("[data-note]").textContent();
  await own.locator("#own-text").fill("my own words");
  await expect(card.locator("[data-compare-text]")).toHaveText(FIRST.text);
  await expect(card.locator("[data-note]")).toHaveText(note ?? "");
  for (const row of ROW_ORDER) {
    await expect(card.locator(`[data-row="${row}"] [data-row-count]`).first(), row).toHaveText(String(countOf(FIRST.id, row)));
  }

  // A later picker change leaves the typed text alone.
  await pick(card, "emoji");
  await expect(own.locator("#own-text")).toHaveValue("my own words");
});

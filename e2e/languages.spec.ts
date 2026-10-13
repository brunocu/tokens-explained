import { expect, test, type Locator, type Page } from "@playwright/test";
import fixture from "../src/core/compare/comparison.json" with { type: "json" };
import { LANGUAGES } from "../src/core/compare/languages.ts";
import { openPlaygroundReady } from "./helpers.ts";

// The merged languages widget in the built post (TOK-08, TOK-09, phase 2.2 D-11 to D-13): the
// six-language counts table across the full width, the "Look inside" picker, the results for the chosen
// language, the six texts and the sources. The table, the English drill-down and the six texts are
// server-rendered, so the tracer and the static-part checks run with JavaScript off.

const ORDER = ["en", "es", "fr", "ru", "ar", "zh"] as const;
const TOKENIZERS = ["gpt2", "bert"] as const;

type Rows = Record<(typeof TOKENIZERS)[number], Array<{ special?: true }>>;
const languageById = new Map(
  (fixture.languages as unknown as Array<{ id: string; rows: Rows }>).map((entry) => [entry.id, entry]),
);
const countOf = (id: string, tokenizer: (typeof TOKENIZERS)[number]): number =>
  (languageById.get(id)?.rows[tokenizer] ?? []).length;
/** [UNK] is the only special token BERT produces here, so the special flag counts it. */
const unkOf = (id: string): number => (languageById.get(id)?.rows.bert ?? []).filter((token) => token.special === true).length;

const sentenceOf = (id: string): string => LANGUAGES.find((language) => language.id === id)?.sentence ?? "";
const nameOf = (id: string): string => LANGUAGES.find((language) => language.id === id)?.name ?? "";

/** The widget root: the table (with the six texts), the picker and the results are all inside it. */
const ROOT = "[data-languages]";
const root = (page: Page): Locator => page.locator(ROOT);
/** The scroll region that wraps the counts table (found by what it holds, not by its name). */
const TABLE_REGION = '[role="region"]:has([data-languages-table])';
/** The number as a whole word, so the "[UNK]" line is checked for its count and not for its wording. */
const wholeNumber = (n: number): RegExp => new RegExp(`\\b${n}\\b`);

/** Every assertion about the static parts, so the with-JavaScript and without-JavaScript runs share it. */
async function expectStaticParts(page: Page): Promise<void> {
  const table = root(page).locator("[data-languages-table]");

  // (a) the table has no bars: the numbers are the whole story.
  await expect(table.locator("td[data-count]")).toHaveCount(12);
  await expect(table.locator("[data-bar]")).toHaveCount(0);

  // (b) the [UNK] line appears once, in the Chinese BERT cell.
  const unkLines = table.locator("[data-unk-line]");
  await expect(unkLines).toHaveCount(1);
  const zhBert = table.locator('[data-lang-row="zh"] [data-count="bert"]');
  await expect(zhBert.locator("[data-unk-line]")).toHaveText(wholeNumber(unkOf("zh")));
  expect(await zhBert.locator(".number").textContent()).toBe(String(countOf("zh", "bert")));
  for (const id of ORDER) {
    if (id === "zh") continue;
    await expect(table.locator(`[data-lang-row="${id}"] [data-unk-line]`), id).toHaveCount(0);
  }

  // (c) the hand-written note.
  await expect(root(page).locator("[data-note]")).toBeVisible();

  // (d) the credit in the table caption: a link with rel noopener to the UN human rights office.
  const link = table.locator("caption").getByRole("link");
  await expect(link).toHaveCount(1);
  expect(await link.getAttribute("rel")).toContain("noopener");
  expect(await link.getAttribute("href")).toMatch(/^https:\/\/www\.ohchr\.org\//);
}

test("(tracer) six languages in order, each with two counts from the fixture, readable without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");

  const rows = page.locator("[data-languages-table] [data-lang-row]");
  await expect(rows).toHaveCount(6);
  expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute("data-lang-row")))).toEqual([...ORDER]);

  for (const id of ORDER) {
    const row = page.locator(`[data-lang-row="${id}"]`);
    await expect(row.locator("[data-count]")).toHaveCount(2);
    for (const tokenizer of TOKENIZERS) {
      const text = (await row.locator(`[data-count="${tokenizer}"] .number`).textContent()) ?? "";
      expect(text.trim(), `${id} ${tokenizer}`).toBe(String(countOf(id, tokenizer)));
    }
  }

  // The sentences sit in the last column of the table, which a reader without JavaScript still gets.
  // The Arabic text is right to left.
  const arabic = page.locator('[data-lang-row="ar"] [data-table-sentence]');
  await expect(arabic).toHaveAttribute("dir", "rtl");
  await expect(arabic).toHaveAttribute("lang", "ar");
  await expect(arabic).toHaveText(sentenceOf("ar"));
  await context.close();
});

test("(row headers) the first column holds the language name only, and the table is not wider than the widget", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("what-is-a-token/");
  for (const id of ORDER) {
    await expect(page.locator(`[data-lang-row="${id}"] th[scope="row"]`), id).toHaveText(nameOf(id));
  }
  // The first column is about 22 percent of the table.
  const widths = await page.locator("[data-languages-table]").evaluate((table) => ({
    table: table.getBoundingClientRect().width,
    first: (table.querySelector("thead th") as HTMLElement).getBoundingClientRect().width,
  }));
  expect(widths.first / widths.table).toBeGreaterThan(0.18);
  expect(widths.first / widths.table).toBeLessThan(0.26);
});

test("(bytes) a Bytes column gives each sentence's raw UTF-8 size, counted from the sentence itself, and it works without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");
  const table = page.locator("[data-languages-table]");
  // Five columns, in order: language, bytes, the two tokenizers, then the text itself.
  await expect(table.locator("thead th")).toHaveCount(5);
  await expect(table.locator("caption")).toBeVisible();

  const encoder = new TextEncoder();
  const sizes: number[] = [];
  const characters: number[] = [];
  for (const language of LANGUAGES) {
    const row = table.locator(`[data-lang-row="${language.id}"]`);
    const text = ((await row.locator("[data-bytes] .number").textContent()) ?? "").trim();
    const expected = encoder.encode(language.sentence).length;
    expect(text, language.id).toBe(String(expected));
    // The bytes cell is not a token count: no bar and no [UNK] line live in it.
    await expect(row.locator("[data-bytes] [data-bar]"), language.id).toHaveCount(0);
    sizes.push(expected);
    characters.push(Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(language.sentence)).length);
  }
  // Non-English text needs more bytes than characters, which is what the column is there to show;
  // and the number comes from the text, so Chinese (3 bytes a character) differs from the token counts.
  const byId = new Map(LANGUAGES.map((language, i) => [language.id, { bytes: sizes[i] as number, characters: characters[i] as number }]));
  expect((byId.get("zh") as { bytes: number; characters: number }).bytes).toBeGreaterThan((byId.get("zh") as { bytes: number; characters: number }).characters);
  expect((byId.get("ru") as { bytes: number; characters: number }).bytes).toBeGreaterThan((byId.get("ru") as { bytes: number; characters: number }).characters);
  await context.close();
});

test("(b) only the Chinese BERT cell has an [UNK] line, and it reads the fixture's count", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const lines = page.locator("[data-languages-table] [data-unk-line]");
  await expect(lines).toHaveCount(1);
  // The fixture was regenerated for GPT-2 and BERT; 25 of the 43 Chinese BERT pieces are [UNK].
  expect(unkOf("zh")).toBe(25);
  await expect(page.locator('[data-lang-row="zh"] [data-count="bert"] [data-unk-line]')).toHaveText(wholeNumber(unkOf("zh")));
});

test("(c) the note under the picker is shown", async ({ page }) => {
  await page.goto("what-is-a-token/");
  await expect(root(page).locator("[data-note]")).toBeVisible();
});

test("(d) the table caption credits its source with a link that opens safely", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const caption = root(page).locator("[data-languages-table] caption");
  await expect(caption).toBeVisible();
  const link = caption.getByRole("link");
  await expect(link).toHaveCount(1);
  expect(await link.getAttribute("rel")).toContain("noopener");
});

test("(e) every external link outside the References list has rel noopener and points at one of the two citation hosts", async ({ page }) => {
  await page.goto("what-is-a-token/");
  // The References list (plan 02-10) links to its own sources; the dist scan and the content test
  // police those hosts. This test keeps the languages widget to the two UDHR hosts.
  const external = await page.locator("a[href]:not(.references a)").evaluateAll((anchors) =>
    anchors
      .map((a) => ({ href: (a as HTMLAnchorElement).href, rel: a.getAttribute("rel") ?? "", origin: new URL((a as HTMLAnchorElement).href).origin }))
      // The post's one dictionary link on 男 is a plain Markdown link, not a widget link.
      .filter((a) => a.origin !== window.location.origin && a.href !== "https://en.wiktionary.org/wiki/%E7%94%B7"),
  );
  expect(external.length).toBeGreaterThan(0);
  for (const link of external) {
    expect(link.rel, link.href).toContain("noopener");
    expect(["https://www.ohchr.org", "https://www.un.org"], link.href).toContain(link.origin);
  }
});

test("(f) without JavaScript the [UNK] line, the note and the credit are all present", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");
  await expectStaticParts(page);
  await context.close();
});

test("(g) with JavaScript the same static parts are present", async ({ page }) => {
  await page.goto("what-is-a-token/");
  await expectStaticParts(page);
});

test("(six texts) the last column has the six texts in table order, each in its own language and direction, Arabic right to left", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const table = root(page).locator("[data-languages-table]");
  const cells = table.locator("[data-table-sentence]");
  await expect(cells).toHaveCount(6);
  expect(await table.locator("[data-lang-row]").evaluateAll((els) => els.map((el) => el.getAttribute("data-lang-row")))).toEqual([...ORDER]);
  for (const language of LANGUAGES) {
    const text = table.locator(`[data-lang-row="${language.id}"] [data-table-sentence]`);
    await expect(text, language.id).toHaveAttribute("lang", language.lang);
    await expect(text, language.id).toHaveAttribute("dir", language.dir);
    await expect(text, language.id).toHaveText(language.sentence);
  }
  await expect(table.locator('[data-lang-row="ar"] [data-table-sentence]')).toHaveCSS("direction", "rtl");
  await expect(table.locator('[data-lang-row="en"] [data-table-sentence]')).toHaveCSS("direction", "ltr");
});

test("(six texts) the page is free of horizontal scroll at every width", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const island = root(page);
  await island.scrollIntoViewIfNeeded();
  await expect(island).toHaveAttribute("data-state", "ready");
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, `document scroll width against client width at ${width}px`).toBeLessThanOrEqual(clientWidth);
  }
});

test("(table region) it never scrolls vertically, and from 1024px up it does not scroll sideways", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const island = root(page);
  await island.scrollIntoViewIfNeeded();
  const region = island.locator(TABLE_REGION);
  await expect(region).toHaveCount(1);
  for (const width of [1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const m = await region.evaluate((el) => ({
      vertical: el.scrollHeight - el.clientHeight,
      horizontal: el.scrollWidth - el.clientWidth,
    }));
    expect(m.vertical, `vertical scroll of the table region at ${width}px`).toBeLessThanOrEqual(1);
    expect(m.horizontal, `horizontal scroll of the table region at ${width}px`).toBeLessThanOrEqual(1);
  }
});

// ---- The "Look inside" picker and the results ----

const ROW_ORDER = ["gpt2", "bert"] as const;
// U+FFFD, and the byte-map glyphs for a space and a new line that must never reach the page.
const FORBIDDEN = ["\u{FFFD}", "\u{0120}", "\u{010A}"];

async function openInside(page: Page): Promise<Locator> {
  await page.goto("what-is-a-token/");
  const island = root(page);
  await island.scrollIntoViewIfNeeded();
  await expect(island).toHaveAttribute("data-state", "ready");
  return island;
}

/** Choose a language the way a reader does: click its label in the picker. */
async function choose(island: Locator, id: string): Promise<void> {
  await island.locator("label.opt", { hasText: nameOf(id) }).click();
  await expect(island.locator(`input[type="radio"][value="${id}"]`)).toBeChecked();
}

test("(inside a) English is chosen at load, both rows are in the server-rendered page and nothing is announced", async ({
  page,
  baseURL,
}) => {
  // The server-rendered page, before any script runs: English text, both rows, the English radio checked.
  const html = await (await page.request.get(new URL("what-is-a-token/", baseURL).href)).text();
  // The comparison widget above also has two rows, so count from the languages widget on.
  const fromLanguages = html.slice(html.search(/<[a-z]+[^>]*data-languages-table/));
  expect(fromLanguages.length, "the languages widget is in the static HTML").toBeLessThan(html.length);
  expect(fromLanguages.match(/data-row="(?:gpt2|bert)"/g)?.length, "token rows of the languages widget in the static HTML").toBe(2);
  expect(fromLanguages).toContain(sentenceOf("en"));

  const island = await openInside(page);
  const radios = island.locator('input[type="radio"][name="languages-inside"]');
  await expect(radios).toHaveCount(6);
  for (const id of ORDER) {
    if (id === "en") await expect(island.locator('input[type="radio"][value="en"]')).toBeChecked();
    else await expect(island.locator(`input[type="radio"][value="${id}"]`), id).not.toBeChecked();
  }
  const rows = island.locator("[data-row]");
  await expect(rows).toHaveCount(2);
  expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute("data-row")))).toEqual([...ROW_ORDER]);
  for (const row of ROW_ORDER) {
    await expect(island.locator(`[data-row="${row}"] [data-row-count]`), row).toHaveText(String(countOf("en", row)));
  }
  await expect(island.locator("legend")).toBeVisible();
  await expect(island.locator("[data-announce]")).toHaveText("");
});

test("(inside b) choosing Chinese by keyboard shows two rows, the fixture's [UNK] chips, the legend and the announcement", async ({
  page,
}) => {
  const island = await openInside(page);
  // The keyboard starts from the checked English radio.
  const english = island.locator('input[type="radio"][value="en"]');
  await english.focus();
  await expect(english).toBeChecked();
  const chinese = island.locator('input[type="radio"][value="zh"]');
  for (let i = 0; i < 6 && !(await chinese.isChecked()); i++) await page.keyboard.press("ArrowRight");
  await expect(chinese).toBeChecked();

  const rows = island.locator("[data-row]");
  await expect(rows).toHaveCount(2);
  expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute("data-row")))).toEqual([...ROW_ORDER]);
  for (const row of ROW_ORDER) {
    await expect(island.locator(`[data-row="${row}"] [data-row-count]`), row).toHaveText(String(countOf("zh", row)));
  }
  await expect(island.locator('[data-row="bert"] [data-special="true"]')).toHaveCount(unkOf("zh"));
  await expect(island.locator('[data-row="gpt2"] [data-special="true"]')).toHaveCount(0);
  await expect(island.locator("[data-legend]")).toBeVisible();

  const expected = `Showing ${nameOf("zh")}. GPT-2: ${countOf("zh", "gpt2")} tokens. BERT: ${countOf("zh", "bert")} tokens.`;
  await expect(island.locator("[data-announce]")).toHaveAttribute("role", "status");
  await expect(island.locator("[data-announce]")).toHaveText(expected);
});

test("(inside c) choosing Arabic reads right to left while the chips stay left to right, with no stray glyph", async ({ page }) => {
  const island = await openInside(page);
  await choose(island, "ar");
  await expect(island.locator('[data-lang-row="ar"] [data-table-sentence]')).toHaveCSS("direction", "rtl");

  const frames = island.locator("[data-char-frame]");
  const directions = await frames.evaluateAll((els) => els.map((el) => getComputedStyle(el).direction));
  expect(directions.length).toBeGreaterThan(0);
  for (const direction of directions) expect(direction).toBe("ltr");

  const text = (await island.textContent()) ?? "";
  for (const glyph of FORBIDDEN) expect(text.includes(glyph), `contains U+${glyph.codePointAt(0)?.toString(16)}`).toBe(false);
});

test("(inside d) every language shows the fixture counts, and each row count equals its chips", async ({ page }) => {
  const island = await openInside(page);
  for (const id of ORDER) {
    await choose(island, id);
    for (const row of ROW_ORDER) {
      await expect(island.locator(`[data-row="${row}"] [data-row-count]`), `${id} ${row}`).toHaveText(String(countOf(id, row)));
      expect(await island.locator(`[data-row="${row}"] [data-chip]`).count(), `${id} ${row}`).toBe(countOf(id, row));
    }
  }
  await expect(island.locator("details")).toHaveCount(0);
  // Each row is a list for assistive technology with one list item per chip.
  for (const row of ROW_ORDER) {
    const scope = island.locator(`[data-row="${row}"]`);
    await expect(scope.getByRole("list")).toHaveCount(1);
    expect(await scope.getByRole("listitem").count(), row).toBe(await scope.locator("[data-chip]").count());
  }
});

test("(inside e) each choice announces once; the legend is always shown", async ({ page }) => {
  const island = await openInside(page);
  const announce = island.locator("[data-announce]");
  // English is shown from the start, and the legend is already there.
  await expect(island.locator("[data-legend]")).toBeVisible();
  for (const id of ORDER) {
    // Choosing the language that is already shown fires no change, so English is chosen last.
    if (id === "en") continue;
    await choose(island, id);
    const expected = `Showing ${nameOf(id)}. GPT-2: ${countOf(id, "gpt2")} tokens. BERT: ${countOf(id, "bert")} tokens.`;
    await expect(announce, id).toHaveText(expected);
    await expect(island.locator("[data-legend]"), id).toBeVisible();
  }
  await choose(island, "en");
  await expect(announce).toHaveText(
    `Showing ${nameOf("en")}. GPT-2: ${countOf("en", "gpt2")} tokens. BERT: ${countOf("en", "bert")} tokens.`,
  );
});

test("(inside f) lifecycle: failed message and reload button after 8 s in view, while the counts table and English stay visible", async ({ page }) => {
  test.setTimeout(30_000);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_astro/LanguagesWidget.*.js*", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("what-is-a-token/", { waitUntil: "domcontentloaded" });
  const island = root(page);
  await island.scrollIntoViewIfNeeded();

  await expect(island).toHaveAttribute("data-state", "loading");
  await expect(island.locator('[data-msg="loading"]')).toBeVisible();
  await expect(island.locator('input[type="radio"]').first()).toBeDisabled();
  await expect(island.locator("[data-languages-table]")).toBeVisible();
  await expect(island.locator("[data-row]").first()).toBeVisible();

  await expect(island).toHaveAttribute("data-state", "failed", { timeout: 12_000 });
  await expect(island.locator('[data-msg="failed"]')).toBeVisible();
  await expect(island.locator("[data-reload]")).toBeVisible();
  await expect(island.locator("[data-languages-table]")).toBeVisible();
  await expect(island.locator("[data-row]").first()).toBeVisible();

  release();
  await expect(island).toHaveAttribute("data-state", "ready");
  await expect(island.locator("[data-status]")).toBeHidden();
  await expect(island.locator('input[type="radio"]').first()).toBeEnabled();
});

test("(inside g) without JavaScript the counts table and English are there and the picker shows its no-JavaScript note", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");
  await expect(page.locator("[data-languages-table]")).toBeVisible();
  await expect(page.locator("[data-languages] .island-nojs")).toBeVisible();
  await expect(page.locator("[data-languages] [data-lang-row=\"en\"] [data-table-sentence]")).toHaveText(sentenceOf("en"));
  await expect(page.locator("[data-languages] [data-row]")).toHaveCount(2);
  const radios = page.locator('[data-languages] input[type="radio"][name="languages-inside"]');
  await expect(radios).toHaveCount(6);
  for (let i = 0; i < 6; i++) await expect(radios.nth(i)).toBeDisabled();
  await expect(page.locator('[data-languages] input[type="radio"][value="en"]')).toBeChecked();
  await context.close();
});

test("(inside h) after the page's GPT-2 download, choosing languages requests nothing, and BERT is never requested", async ({
  page,
  baseURL,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  const tokenizerUrls = () => urls.filter((url) => url.includes("/tokenizers/"));
  const gpt2Url = new URL("tokenizers/gpt2.json", baseURL).href;

  // The playground downloads GPT-2 at page load; the languages view only reads the fixture.
  await openPlaygroundReady(page, "what-is-a-token/");
  const island = root(page);
  await island.scrollIntoViewIfNeeded();
  await expect(island).toHaveAttribute("data-state", "ready");
  await page.waitForLoadState("networkidle");
  const settled = urls.length;
  expect(tokenizerUrls()).toEqual([gpt2Url]);

  for (const id of ORDER) await choose(island, id);
  await page.waitForTimeout(500);
  expect(urls.slice(settled)).toEqual([]);
  expect(tokenizerUrls()).toEqual([gpt2Url]);
  expect(urls.filter((url) => url.includes("bert"))).toEqual([]);
});

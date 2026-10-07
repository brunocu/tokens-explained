import { expect, test, type Locator, type Page } from "@playwright/test";
import fixture from "../src/core/compare/comparison.json" with { type: "json" };
import { LANGUAGES } from "../src/core/compare/languages.ts";
import { LANGUAGES_NOTE } from "../src/core/compare/notes.ts";
import { openPlaygroundReady } from "./helpers.ts";

// The six-language counts table in the built post (TOK-08, TOK-09). The table is static HTML, so
// the tracer and the static-part checks run with JavaScript off.

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

const RETRIEVED = LANGUAGES.map((language) => language.retrieved).sort().at(-1) as string;

/** The static card: the table, its note and its sources (the island card comes later). */
const card = (page: Page) => page.locator("[data-languages-card]");

/** Every assertion about the static table, so the with-JavaScript and without-JavaScript runs share it. */
async function expectStaticParts(page: Page): Promise<void> {
  const table = card(page).locator("[data-languages-table]");

  // (a) bars: aria-hidden, and the widest one belongs to the cell with the largest count.
  const cells = await table.locator("td[data-count]").evaluateAll((tds) =>
    tds.map((td) => {
      const bar = td.querySelector("[data-bar]") as HTMLElement | null;
      const number = td.querySelector(".number")?.textContent ?? "";
      return {
        count: Number.parseInt(number, 10),
        hidden: bar?.getAttribute("aria-hidden") ?? null,
        width: bar?.getBoundingClientRect().width ?? -1,
      };
    }),
  );
  expect(cells).toHaveLength(12);
  for (const cell of cells) expect(cell.hidden).toBe("true");
  const widest = cells.reduce((best, cell) => (cell.width > best.width ? cell : best));
  const largest = Math.max(...cells.map((cell) => cell.count));
  expect(widest.count).toBe(largest);
  // Every bar is in proportion to its count, against the widest bar (one shared maximum).
  for (const cell of cells) {
    expect(cell.width / widest.width, `count ${cell.count}`).toBeCloseTo(cell.count / largest, 1);
  }

  // (b) the [UNK] line appears once, in the Chinese BERT cell.
  const unkLines = table.locator("[data-unk-line]");
  await expect(unkLines).toHaveCount(1);
  const zhBert = table.locator('[data-lang-row="zh"] [data-count="bert"]');
  await expect(zhBert.locator("[data-unk-line]")).toHaveText(`${unkOf("zh")} of these are [UNK]`);
  expect(await zhBert.locator(".number").textContent()).toBe(String(countOf("zh", "bert")));
  for (const id of ORDER) {
    if (id === "zh") continue;
    await expect(table.locator(`[data-lang-row="${id}"] [data-unk-line]`), id).toHaveCount(0);
  }

  // (c) the hand-written note.
  await expect(card(page).locator("[data-note]")).toHaveText(LANGUAGES_NOTE);

  // (d) the source line: dates from the data, a link with rel noopener.
  const source = card(page).locator("[data-source-line]");
  await expect(source).toContainText(`retrieved ${RETRIEVED}`);
  await expect(source).toContainText(`precomputed on ${fixture.meta.generatedAt}`);
  const link = source.getByRole("link", { name: "Universal Declaration of Human Rights" });
  await expect(link).toHaveCount(1);
  expect(await link.getAttribute("rel")).toContain("noopener");
  expect(await link.getAttribute("href")).toMatch(/^https:\/\/www\.ohchr\.org\//);

  // The details lists every language, with the PDF link only where one exists.
  const details = card(page).locator("details[data-sentence-sources]");
  await expect(details.locator("summary")).toHaveText("Where the sentences come from");
  await expect(details.locator("li")).toHaveCount(6);
  await expect(details.locator('a[href$=".pdf"]')).toHaveCount(5);
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

  const arabic = page.locator('[data-lang-row="ar"] [data-sentence]');
  await expect(arabic).toHaveAttribute("dir", "rtl");
  await expect(arabic).toHaveAttribute("lang", "ar");
  await context.close();
});

test("(bytes) a Bytes column gives each sentence's raw UTF-8 size, counted from the sentence itself, and it works without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");
  const table = page.locator("[data-languages-table]");
  // Columns, in order: Language, Bytes, then the two tokenizers.
  await expect(table.locator("thead th")).toHaveText(["Language", "Bytes", "GPT-2", "BERT (uncased)"]);
  await expect(table.locator("caption")).toContainText("The size of the text in bytes, then token counts for two tokenizers");

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

test("(a) bars are hidden from assistive technology and the widest belongs to the largest count", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const cells = await page.locator("[data-languages-table] td[data-count]").evaluateAll((tds) =>
    tds.map((td) => ({
      count: Number.parseInt(td.querySelector(".number")?.textContent ?? "", 10),
      hidden: td.querySelector("[data-bar]")?.getAttribute("aria-hidden") ?? null,
      width: td.querySelector("[data-bar]")?.getBoundingClientRect().width ?? -1,
    })),
  );
  expect(cells).toHaveLength(12);
  for (const cell of cells) expect(cell.hidden).toBe("true");
  const widest = cells.reduce((best, cell) => (cell.width > best.width ? cell : best));
  expect(widest.count).toBe(Math.max(...cells.map((cell) => cell.count)));
});

test("(b) only the Chinese BERT cell has an [UNK] line, and it reads the fixture's count", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const lines = page.locator("[data-languages-table] [data-unk-line]");
  await expect(lines).toHaveCount(1);
  // The fixture was regenerated for GPT-2 and BERT; 25 of the 43 Chinese BERT pieces are [UNK].
  expect(unkOf("zh")).toBe(25);
  await expect(page.locator('[data-lang-row="zh"] [data-count="bert"] [data-unk-line]')).toHaveText(`${unkOf("zh")} of these are [UNK]`);
});

test("(c) the note under the table is the hand-written note", async ({ page }) => {
  await page.goto("what-is-a-token/");
  await expect(card(page).locator("[data-note]")).toHaveText(LANGUAGES_NOTE);
  await expect(card(page).locator(".island-label", { hasText: "What to notice" })).toBeVisible();
});

test("(d) the source line carries both dates from the data and a link that opens safely", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const source = card(page).locator("[data-source-line]");
  await expect(source).toContainText(`retrieved ${RETRIEVED}`);
  await expect(source).toContainText(`precomputed on ${fixture.meta.generatedAt}`);
  await expect(source).toContainText(`precomputed on ${fixture.meta.generatedAt} with GPT-2 and BERT (uncased)`);
  await expect(source).toContainText("see where the tokenizer files come from above");
  const link = source.getByRole("link", { name: "Universal Declaration of Human Rights" });
  expect(await link.getAttribute("rel")).toContain("noopener");
});

test("(e) every external link outside the References list has rel noopener and points at one of the two citation hosts", async ({ page }) => {
  await page.goto("what-is-a-token/");
  // The References list (plan 02-10) links to its own sources; the dist scan and the content test
  // police those hosts. This test keeps the languages table to the two UDHR hosts.
  const external = await page.locator("a[href]:not(.references a)").evaluateAll((anchors) =>
    anchors
      .map((a) => ({ href: (a as HTMLAnchorElement).href, rel: a.getAttribute("rel") ?? "", origin: new URL((a as HTMLAnchorElement).href).origin }))
      // The post's one dictionary link on 男 is a plain Markdown link, not a table link.
      .filter((a) => a.origin !== window.location.origin && a.href !== "https://en.wiktionary.org/wiki/%E7%94%B7"),
  );
  expect(external.length).toBeGreaterThan(0);
  for (const link of external) {
    expect(link.rel, link.href).toContain("noopener");
    expect(["https://www.ohchr.org", "https://www.un.org"], link.href).toContain(link.origin);
  }
});

test("(f) without JavaScript the bars, the [UNK] line, the note and the sources are all present", async ({ browser, baseURL }) => {
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

// ---- The optional "Look inside" picker (island) ----

const ROW_ORDER = ["gpt2", "bert"] as const;
// U+FFFD, and the byte-map glyphs for a space and a new line that must never reach the page.
const FORBIDDEN = ["\u{FFFD}", "\u{0120}", "\u{010A}"];
const UNK_SENTENCE = "[UNK] means the tokenizer had no piece for that word or character and gave up.";
const SECTION = 'section[aria-labelledby="languages-heading"]';
const nameOf = (id: string): string => LANGUAGES.find((language) => language.id === id)?.name ?? "";

async function openInside(page: Page): Promise<Locator> {
  await page.goto("what-is-a-token/");
  const island = page.locator("[data-languages]");
  await island.scrollIntoViewIfNeeded();
  await expect(island).toHaveAttribute("data-state", "ready");
  return island;
}

/** Choose a language the way a reader does: click its label in the picker. */
async function choose(island: Locator, id: string): Promise<void> {
  await island.locator("label.opt", { hasText: nameOf(id) }).click();
  await expect(island.locator(`input[type="radio"][value="${id}"]`)).toBeChecked();
}

test("(inside a) at load no language is chosen and no token row is shown", async ({ page }) => {
  const island = await openInside(page);
  const radios = island.locator('input[type="radio"][name="languages-inside"]');
  await expect(radios).toHaveCount(6);
  for (let i = 0; i < 6; i++) await expect(radios.nth(i)).not.toBeChecked();
  await expect(island.locator("[data-row]")).toHaveCount(0);
  await expect(island.locator("legend")).toHaveText("Look inside");
  await expect(island.locator("[data-announce]")).toHaveText("");
});

test("(inside b) choosing Chinese by keyboard shows two rows, the fixture's [UNK] chips, the legend sentence and the announcement", async ({
  page,
}) => {
  const island = await openInside(page);
  const radios = island.locator('input[type="radio"][name="languages-inside"]');
  await radios.first().focus();
  const chinese = island.locator('input[type="radio"][value="zh"]');
  for (let i = 0; i < 6 && !(await chinese.isChecked()); i++) await page.keyboard.press("ArrowRight");
  await expect(chinese).toBeChecked();

  const rows = island.locator("[data-row]");
  await expect(rows).toHaveCount(2);
  expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute("data-row")))).toEqual([...ROW_ORDER]);
  await expect(island.locator("[data-languages-text]")).toHaveText(LANGUAGES.find((l) => l.id === "zh")?.sentence as string);
  for (const row of ROW_ORDER) {
    await expect(island.locator(`[data-row="${row}"] [data-row-count]`), row).toHaveText(String(countOf("zh", row)));
  }
  await expect(island.locator('[data-row="bert"] [data-special="true"]')).toHaveCount(unkOf("zh"));
  await expect(island.locator('[data-row="gpt2"] [data-special="true"]')).toHaveCount(0);
  await expect(island.locator("[data-legend]")).toContainText(UNK_SENTENCE);

  const expected = `Showing Chinese (Simplified). GPT-2: ${countOf("zh", "gpt2")} tokens. BERT: ${countOf("zh", "bert")} tokens.`;
  await expect(island.locator("[data-announce]")).toHaveAttribute("role", "status");
  await expect(island.locator("[data-announce]")).toHaveText(expected);
});

test("(inside c) choosing Arabic reads right to left while the chips stay left to right, with no stray glyph", async ({ page }) => {
  const island = await openInside(page);
  await choose(island, "ar");
  await expect(island.locator("[data-languages-text]")).toHaveCSS("direction", "rtl");
  await expect(island.locator("[data-languages-text]")).toHaveAttribute("lang", "ar");

  const frames = island.locator("[data-char-frame]");
  const directions = await frames.evaluateAll((els) => els.map((el) => getComputedStyle(el).direction));
  expect(directions.length).toBeGreaterThan(0);
  for (const direction of directions) expect(direction).toBe("ltr");

  const text = (await page.locator(SECTION).textContent()) ?? "";
  for (const glyph of FORBIDDEN) expect(text.includes(glyph), `contains U+${glyph.codePointAt(0)?.toString(16)}`).toBe(false);
});

test("(inside d) every language shows the fixture counts, and the table alternative has one row per chip", async ({ page }) => {
  const island = await openInside(page);
  const details = island.locator("details[data-alt-tables]");
  for (const id of ORDER) {
    await choose(island, id);
    for (const row of ROW_ORDER) {
      await expect(island.locator(`[data-row="${row}"] [data-row-count]`), `${id} ${row}`).toHaveText(String(countOf(id, row)));
    }
    if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) await details.locator("summary").click();
    const tables = details.locator("table");
    await expect(tables).toHaveCount(2);
    await expect(tables.locator("caption")).toHaveText(["Tokens for GPT-2", "Tokens for BERT"]);
    for (let i = 0; i < 2; i++) {
      const row = ROW_ORDER[i] as (typeof ROW_ORDER)[number];
      const chips = await island.locator(`[data-row="${row}"] [data-chip]`).count();
      expect(await tables.nth(i).locator("tbody tr").count(), `${id} ${row}`).toBe(chips);
    }
  }
  await expect(details.locator("summary")).toHaveText("View these results as tables");
  await expect(island.locator('[data-row] [aria-hidden="true"]').first()).toBeAttached();
});

test("(inside e) each choice announces once; the [UNK] sentence shows only where a row has [UNK]", async ({ page }) => {
  const island = await openInside(page);
  const announce = island.locator("[data-announce]");
  for (const id of ORDER) {
    await choose(island, id);
    const expected = `Showing ${nameOf(id)}. GPT-2: ${countOf(id, "gpt2")} tokens. BERT: ${countOf(id, "bert")} tokens.`;
    await expect(announce, id).toHaveText(expected);
    if (unkOf(id) > 0) await expect(island.locator("[data-legend]")).toContainText(UNK_SENTENCE);
    else await expect(island.locator("[data-legend]"), id).not.toContainText("[UNK]");
  }
});

test("(inside f) lifecycle: failed copy and Reload page after 8 s in view, while the counts table stays visible", async ({ page }) => {
  test.setTimeout(30_000);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_astro/LanguagesDemo.*.js*", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("what-is-a-token/", { waitUntil: "domcontentloaded" });
  const island = page.locator("[data-languages]");
  await island.scrollIntoViewIfNeeded();

  await expect(island).toHaveAttribute("data-state", "loading");
  await expect(island.locator('[data-msg="loading"]')).toHaveText("Getting the pieces view ready. The counts above already work.");
  await expect(island.locator('input[type="radio"]').first()).toBeDisabled();

  await expect(island).toHaveAttribute("data-state", "failed", { timeout: 12_000 });
  await expect(island.locator('[data-msg="failed"]')).toContainText(
    "The pieces view could not load. Check your connection, then reload the page. The counts above still work.",
  );
  await expect(island.locator("[data-reload]")).toBeVisible();
  await expect(island.locator("[data-reload]")).toHaveText("Reload page");
  await expect(page.locator("[data-languages-table]")).toBeVisible();

  release();
  await expect(island).toHaveAttribute("data-state", "ready");
  await expect(island.locator("[data-status]")).toBeHidden();
  await expect(island.locator('input[type="radio"]').first()).toBeEnabled();
});

test("(inside g) without JavaScript the counts table is there and the pieces view says it needs JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");
  await expect(page.locator("[data-languages-table]")).toBeVisible();
  await expect(page.locator("[data-languages] .island-nojs")).toHaveText("Seeing the pieces needs JavaScript.");
  await expect(page.locator("[data-languages] [data-row]")).toHaveCount(0);
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
  const island = page.locator("[data-languages]");
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

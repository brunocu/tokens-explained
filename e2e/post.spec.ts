import { expect, test } from "@playwright/test";
import { openPlaygroundReady } from "./helpers.ts";

// The post at its root-level URL (PD-01) and as the home page. Paths are relative to the
// configured baseURL, so the same spec works under any base.

/** Pathname the post must have: the configured base plus "what-is-a-token/". */
function expectedPostPath(baseURL: string | undefined): string {
  return new URL("what-is-a-token/", baseURL).pathname;
}

// The post holds one GPT-2 figure: the bridge figure (the stepper's own sentence), inside "A real
// tokenizer: GPT-2", before the playground. (The emoji figure after the playground was cut by the
// author in the final edits of plan 02.1-09.)
const BRIDGE_FIGURE = 'figure[data-figure="sample"]';

test("(a) the post has one H1 and, without JavaScript, prose chips and a text alternative", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  const response = await page.goto("what-is-a-token/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toBeVisible();
  const figure = page.locator(BRIDGE_FIGURE);
  expect(await figure.locator("[data-chip]").count()).toBeGreaterThan(0);
  // The figure is a list for assistive technology: one list item per chip, each with spoken text.
  const items = figure.getByRole("listitem");
  expect(await items.count()).toBe(await figure.locator("[data-chip]").count());
  for (const text of await items.locator(".sr-only").allTextContents()) expect(text.trim()).not.toBe("");
  await context.close();
});

test("(b) the playground section holds the island and it hydrates when scrolled into view", async ({ page }) => {
  await page.goto("what-is-a-token/");
  // Found by its root hook at page level, so the test holds before and after the section wrapper
  // is replaced by the widget's own root (phase 2.2).
  const card = page.locator("[data-playground]");
  await expect(card).toHaveCount(1);
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(card).toHaveAttribute("data-tokenizer", "ready");
});

test("(c) no response with status 400 or above and no console error", async ({ page }) => {
  const failed: string[] = [];
  const errors: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await openPlaygroundReady(page, "what-is-a-token/");
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});

test("(d) the home page and the post URL both return 200 and show the same H1", async ({ page }) => {
  const titles: string[] = [];
  for (const path of ["./", "what-is-a-token/"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1"), path).toHaveCount(1);
    await expect(page.locator("h1"), path).not.toBeEmpty();
    titles.push(((await page.locator("h1").textContent()) ?? "").trim());
    await expect(page.locator("[data-playground]"), path).toHaveCount(1);
  }
  expect(titles[0]).toBe(titles[1]);
});

test("(e) both pages carry a canonical link to the root-level post URL", async ({ page, baseURL }) => {
  const wantPath = expectedPostPath(baseURL);
  const hrefs: string[] = [];
  for (const path of ["./", "what-is-a-token/"]) {
    await page.goto(path);
    const href = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(href, path).not.toBeNull();
    expect((href as string).endsWith("/what-is-a-token/"), path).toBe(true);
    expect(new URL(href as string).pathname, path).toBe(wantPath);
    hrefs.push(href as string);
  }
  expect(hrefs[0]).toBe(hrefs[1]);
});

test("(f) the sections come in order: stepper, a real tokenizer, the playground, the takeaways, the comparison, the languages, the references", async ({ page }) => {
  await page.goto("what-is-a-token/");
  // Every h2 has a title. Which titles there are is the author's to edit.
  const texts = await page.locator("main h2").allTextContents();
  expect(texts.length).toBeGreaterThan(0);
  for (const text of texts) expect(text.trim()).not.toBe("");

  const y = async (locator: ReturnType<typeof page.locator>) => {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    return (box as { y: number }).y;
  };
  const stepper = await y(page.locator("[data-stepper]"));
  // Headings and paragraphs are found by where they sit, not by what they say: the heading of the
  // bridge figure's section, the paragraph right after the playground, the heading of the references.
  const demoTokenizer = await y(page.locator(BRIDGE_FIGURE).locator("xpath=preceding::h2[1]"));
  // The bridge figure comes after the GPT-2 heading and before the playground.
  const bridge = await y(page.locator(BRIDGE_FIGURE));
  const card = await y(page.locator("[data-playground]"));
  const takeaways = await y(page.locator("[data-playground]").locator("xpath=following::p[1]"));
  expect(demoTokenizer).toBeGreaterThan(stepper);
  expect(bridge).toBeGreaterThan(demoTokenizer);
  expect(bridge).toBeLessThan(card);
  expect(card).toBeLessThan(takeaways);

  // The comparison card sits below the list after the playground and above "References".
  const compare = await y(page.locator("[data-compare]"));
  const references = await y(page.locator("#refs").locator("xpath=preceding::h2[1]"));
  expect(compare).toBeGreaterThan(takeaways);
  expect(compare).toBeLessThan(references);

  // The languages table sits after the comparison card and before "References".
  const languages = await y(page.locator("[data-languages-table]"));
  expect(languages).toBeGreaterThan(compare);
  expect(languages).toBeLessThan(references);
});

test("(g) the post column has no links outside source notes, numbered cites and the References list (the only other link is the site name in the header)", async ({
  page,
}) => {
  await page.goto("what-is-a-token/");
  // Every anchor in the post column is a source note link, a numbered cite pointing at #bib-key
  // (generated by rehype-citation), or an entry of the generated bibliography (#refs); none is
  // loose in the prose.
  const outside = await page.locator("main a").evaluateAll((anchors) =>
    anchors
      .filter(
        (a) =>
          a.closest("[data-source]") === null &&
          // The credit link to the UN human rights office in the languages table caption.
          a.closest("[data-languages-table] caption") === null &&
          a.closest("#refs") === null &&
          // The one dictionary link on the character 男 in the list after the playground.
          a.getAttribute("href") !== "https://en.wiktionary.org/wiki/%E7%94%B7" &&
          !(a.closest("span.cites") !== null && /^#bib-[A-Za-z0-9]+$/.test(a.getAttribute("href") ?? "")),
      )
      .map((a) => a.outerHTML),
  );
  expect(outside).toEqual([]);
  await expect(page.locator("header.site-header a, .site-header a")).toHaveCount(1);
});

test("(g2) every cite number equals the position of the entry its link points at, the references are numbered in order of first citation, and every one is cited", async ({
  page,
}) => {
  await page.goto("what-is-a-token/");
  const entries = await page
    .locator("#refs .csl-entry")
    .evaluateAll((items) => items.map((el) => ({ id: el.id, label: (el.querySelector(".csl-left-margin")?.textContent ?? "").trim() })));
  expect(entries.length).toBeGreaterThan(0);
  const ids = entries.map((e) => e.id);
  expect(entries.map((e) => e.label)).toEqual(entries.map((_, i) => `${i + 1}.`));

  const cites = await page
    .locator("main span.cites a")
    .evaluateAll((anchors) => anchors.map((a) => ({ id: (a.getAttribute("href") ?? "").replace("#", ""), text: (a.textContent ?? "").trim() })));
  expect(cites.length).toBeGreaterThan(0);
  // Each link targets an existing entry, and the number the reader sees is that entry's 1-based
  // position. This catches a grouped citation whose numbers and links disagree.
  for (const cite of cites) {
    expect(ids, cite.id).toContain(cite.id);
    expect(cite.text, `cite to #${cite.id}`).toBe(String(ids.indexOf(cite.id) + 1));
  }
  // First citations appear in 1, 2, 3 ... order, and every reference is cited at least once.
  const firstSeen: string[] = [];
  for (const cite of cites) if (!firstSeen.includes(cite.id)) firstSeen.push(cite.id);
  expect(firstSeen).toEqual(ids);

  // Every reference links out over https to its source, safely.
  const links = await page
    .locator("#refs .csl-entry a")
    .evaluateAll((anchors) => anchors.map((a) => ({ href: (a as HTMLAnchorElement).href, rel: a.getAttribute("rel") ?? "" })));
  expect(links).toHaveLength(entries.length);
  for (const link of links) {
    expect(link.href.startsWith("https://"), link.href).toBe(true);
    expect(link.rel, link.href).toContain("noopener");
  }

  // No citation was left unresolved in the page text.
  expect(await page.locator("main").innerText()).not.toContain("[@");
});

test("(g3) following a citation lands on its reference", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const first = page.locator("main span.cites a").first();
  const target = ((await first.getAttribute("href")) ?? "").replace("#", "");
  await first.click();
  await expect(page.locator(`#${target}`)).toBeInViewport();
  expect(new URL(page.url()).hash).toBe(`#${target}`);
});

test("(h) without JavaScript the article text, prose chips and default playground chips are present", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");
  await expect(page.locator("article > p").first()).toBeVisible();
  expect(await page.locator(`${BRIDGE_FIGURE} [data-chip]`).count()).toBeGreaterThan(0);
  expect(await page.locator("[data-playground] [data-chip]").count()).toBeGreaterThan(0);
  await context.close();
});

test("(j) without JavaScript the post holds exactly one figure, the bridge figure, and it shows no character frame", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");
  await expect(page.locator("figure.token-figure")).toHaveCount(1);
  await expect(page.locator(BRIDGE_FIGURE)).toHaveCount(1);
  await expect(page.locator(`${BRIDGE_FIGURE} [data-char-frame]`)).toHaveCount(0);
  await context.close();
});

test("(l3) the bridge figure cuts the stepper's own sentence by GPT-2: one token per word, inside the real-tokenizer section before the playground", async ({
  page,
}) => {
  await page.goto("what-is-a-token/");
  const sample = page.locator('figure[data-figure="sample"]');
  await expect(sample).toHaveCount(1);
  await expect(sample.locator("[data-chip]").first()).toBeVisible();
  // Read both numbers from the caption and compare them; none is pinned here.
  const caption = ((await sample.locator("figcaption").textContent()) ?? "").trim();
  const match = /^(\d+) words?, (\d+) tokens?$/.exec(caption);
  expect(match, caption).not.toBeNull();
  const [, wordCount, tokenCount] = match as unknown as [string, string, string];
  expect(Number(tokenCount)).toBe(Number(wordCount));
  const box = async (locator: ReturnType<typeof page.locator>) => {
    const b = await locator.boundingBox();
    expect(b).not.toBeNull();
    return (b as { y: number }).y;
  };
  const stepper = await box(page.locator("[data-stepper]"));
  const sampleY = await box(sample);
  const heading = await box(sample.locator("xpath=preceding::h2[1]"));
  const playgroundY = await box(page.locator("[data-playground]"));
  expect(sampleY).toBeGreaterThan(stepper);
  expect(sampleY).toBeGreaterThan(heading);
  expect(sampleY).toBeLessThan(playgroundY);
  // The bridge figure is the only figure in the post.
  await expect(page.locator("figure.token-figure")).toHaveCount(1);
});

test("(l4) the letter t has two different ids in the prose, one from each engine", async ({ page }) => {
  await page.goto("what-is-a-token/");
  // Every figure that the prose reads from an engine is wrapped in [data-fact].
  const stepperId = ((await page.locator('[data-fact="byteOfT"]').first().textContent()) ?? "").trim();
  const gpt2Id = ((await page.locator('[data-fact="gpt2IdOfT"]').first().textContent()) ?? "").trim();
  expect(stepperId).toMatch(/^\d+$/);
  expect(gpt2Id).toMatch(/^\d+$/);
  expect(Number(stepperId)).not.toBe(Number(gpt2Id));
});

test("(l5) the GPT-2 tokenizer file size is read from the file and shown as a number", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const size = page.locator('[data-fact="gpt2FileMb"]').first();
  await expect(size).toBeVisible();
  await expect(size).toHaveText(/^\d+(\.\d+)?$/);
});

test("(l2) the numbers figure matches the quoted sentence, and the engine's figures read out in the prose", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const quote = ((await page.locator("blockquote").textContent()) ?? "").trim();
  expect(quote.length).toBeGreaterThan(0);
  // Each box of the numbers figure holds one character and its UTF-8 byte values, in the quote's order.
  const cells = page.locator("figure.text-numbers .cell");
  const characters = Array.from(quote);
  await expect(cells).toHaveCount(characters.length);
  const first = characters[0] as string;
  await expect(cells.first().locator(".ch")).toHaveText(first);
  await expect(cells.first().locator(".num")).toHaveText(Array.from(new TextEncoder().encode(first)).join(" "));
  // Figures derived from the stepper's engine read out in the prose (the vocabulary is 256 + 10 = 266).
  await expect(page.locator('[data-fact="vocabularySize"]').first()).toHaveText("266");
  await expect(page.locator('[data-fact="startPieces"]').first()).toHaveText("49");
  await expect(page.locator('[data-fact="endPieces"]').first()).toHaveText("20");
  await expect(page.locator("main")).not.toContainText("§");
});

test("(i) the failed-to-load message never shows while the comparison card is below the viewport", async ({ page }) => {
  // The playground hydrates at page load now (D-04), so the card that waits to be scrolled to is
  // the comparison card, which still hydrates only when it becomes visible.
  await page.setViewportSize({ width: 1280, height: 400 });
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-compare]");
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  expect((box as { y: number }).y).toBeGreaterThan(400);
  // The 8 s timer starts when the card first enters the viewport, so waiting longer than
  // 8 s without scrolling must leave the card loading and the failure message hidden.
  await page.waitForTimeout(9500);
  await expect(card).toHaveAttribute("data-state", "loading");
  await expect(page.locator('[data-compare] [data-msg="failed"]')).toBeHidden();
});

test("(m) the playground card is ready without scrolling to it (D-04)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 400 });
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-playground]");
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  // The card starts below the fold, and nothing here scrolls to it.
  expect((box as { y: number }).y).toBeGreaterThan(400);
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(card).toHaveAttribute("data-tokenizer", "ready");
});

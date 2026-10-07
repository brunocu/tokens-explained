import { expect, test } from "@playwright/test";

// The post at its root-level URL (PD-01) and as the home page. Paths are relative to the
// configured baseURL, so the same spec works under any base.

// The new article order of plan 02-10 (four of these headings come from the section wrappers).
const SECTION_HEADINGS = [
  "How does a computer store text?",
  "What is a language model, and why numbers?",
  "Why not feed in raw bytes?",
  "Tokens are not words",
  "How the numbers are assigned",
  "Why not just split on spaces, or on meaning?",
  "Build a vocabulary yourself",
  "What the step by step example showed",
  "The tokenizer behind the demos",
  "Try it yourself",
  "What you just saw",
  "How do real tokenizers compare?",
  "The same sentence in other languages",
  "References",
];

/** Pathname the post must have: the configured base plus "what-is-a-token/". */
function expectedPostPath(baseURL: string | undefined): string {
  return new URL("what-is-a-token/", baseURL).pathname;
}

test("(a) the post has one H1 and, without JavaScript, prose chips and a text alternative", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  const response = await page.goto("what-is-a-token/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText("What is a token?");
  const figure = page.locator("figure.toy-tokens").first();
  expect(await figure.locator("[data-chip]").count()).toBeGreaterThan(0);
  const alt = figure.locator(".sr-only");
  expect(((await alt.textContent()) ?? "").startsWith("Tokens for the example:")).toBe(true);
  await context.close();
});

test("(b) the playground section holds the island and it hydrates when scrolled into view", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const section = page.locator('section[aria-labelledby="try-heading"]');
  await expect(section.locator("[data-playground]")).toHaveCount(1);
  const card = section.locator("[data-playground]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
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
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-playground]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});

test("(d) the home page and the post URL both return 200 and show the same H1", async ({ page }) => {
  for (const path of ["./", "what-is-a-token/"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1"), path).toHaveText("What is a token?");
    await expect(page.locator("[data-playground]"), path).toHaveCount(1);
  }
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

test("(f) the headings are the four sections plus the playground, in order, with the card in the middle", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const texts = await page.locator("main h2").allTextContents();
  expect(texts.map((t) => t.trim())).toEqual(SECTION_HEADINGS);

  const y = async (locator: ReturnType<typeof page.locator>) => {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    return (box as { y: number }).y;
  };
  const stepper = await y(page.locator("[data-stepper]"));
  const demoTokenizer = await y(page.getByRole("heading", { name: "The tokenizer behind the demos", level: 2 }));
  // The first tokenizer visualization comes after the algorithm explanation and before the playground.
  const firstChips = await y(page.locator("figure.toy-tokens").first());
  const card = await y(page.locator("[data-playground]"));
  const saw = await y(page.getByRole("heading", { name: "What you just saw", level: 2 }));
  expect(demoTokenizer).toBeGreaterThan(stepper);
  expect(firstChips).toBeGreaterThan(demoTokenizer);
  expect(firstChips).toBeLessThan(card);
  expect(card).toBeLessThan(saw);

  // The comparison card sits below "What you just saw" and above "References".
  const compare = await y(page.locator("[data-compare]"));
  const references = await y(page.getByRole("heading", { name: "References", level: 2 }));
  expect(compare).toBeGreaterThan(saw);
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
  // Every anchor in the post column is a source note link, a numbered cite pointing at #ref-n, or
  // an entry of the References list (plan 02-10); none is loose in the prose.
  const outside = await page.locator("main a").evaluateAll((anchors) =>
    anchors
      .filter(
        (a) =>
          a.closest("[data-source]") === null &&
          a.closest("ol.references") === null &&
          // The one dictionary link on the character 男 in "What you just saw".
          a.getAttribute("href") !== "https://en.wiktionary.org/wiki/%E7%94%B7" &&
          !(a.classList.contains("cite") && /^#ref-\d+$/.test(a.getAttribute("href") ?? "")),
      )
      .map((a) => a.outerHTML),
  );
  expect(outside).toEqual([]);
  await expect(page.locator("header.site-header a, .site-header a")).toHaveCount(1);
});

test("(g2) every numbered cite points at a reference, the references are numbered in order of first citation, and every one is cited", async ({
  page,
}) => {
  await page.goto("what-is-a-token/");
  const refs = await page.locator("ol.references li").evaluateAll((items) => items.map((li) => li.id));
  expect(refs.length).toBeGreaterThan(0);
  expect(refs).toEqual(refs.map((_, i) => `ref-${i + 1}`));

  const hrefs = await page
    .locator("main a.cite")
    .evaluateAll((anchors) => anchors.map((a) => (a.getAttribute("href") ?? "").replace("#", "")));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const id of hrefs) expect(refs, id).toContain(id);
  // First citations appear in 1, 2, 3 ... order, and every reference is cited at least once.
  const firstSeen: string[] = [];
  for (const id of hrefs) if (!firstSeen.includes(id)) firstSeen.push(id);
  expect(firstSeen).toEqual(refs);

  // Every reference links out over https to its source, with an access date for the web sources.
  const links = await page.locator("ol.references li a").evaluateAll((anchors) => anchors.map((a) => (a as HTMLAnchorElement).href));
  expect(links).toHaveLength(refs.length);
  for (const href of links) expect(href.startsWith("https://"), href).toBe(true);
  await expect(page.locator("ol.references")).toContainText("Accessed: Oct. 6, 2026.");
});

test("(g3) following a citation lands on its reference", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const first = page.locator("main a.cite").first();
  const target = ((await first.getAttribute("href")) ?? "").replace("#", "");
  await first.click();
  await expect(page.locator(`#${target}`)).toBeInViewport();
  expect(new URL(page.url()).hash).toBe(`#${target}`);
});

test("(h) without JavaScript the article text, prose chips and default playground chips are present", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");
  await expect(page.getByText("A token is a small piece of text that a language model reads and writes.")).toBeVisible();
  expect(await page.locator("figure.toy-tokens [data-chip]").count()).toBeGreaterThan(0);
  expect(await page.locator("[data-playground] [data-chip]").count()).toBeGreaterThan(0);
  await context.close();
});

test("(j) without JavaScript the emoji figure shows one frame labelled with the emoji and the default figure none", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");
  const figures = page.locator("figure.toy-tokens");
  await expect(figures.locator("[data-char-frame]")).toHaveCount(1);
  await expect(figures.locator("[data-char-frame] [data-char-label]")).toHaveText("\u{1F389}");
  await expect(figures.first().locator("[data-char-frame]")).toHaveCount(0);
  await context.close();
});

test("(k) the visible post text explains the frames in plain words", async ({ page }) => {
  await page.goto("what-is-a-token/");
  await expect(
    page.getByText("Hatched chips inside one frame are the bytes of a single character, which is shown in front of them."),
  ).toBeVisible();
});

test("(l) the visible post text carries the softened claim and the three differences", async ({ page }) => {
  await page.goto("what-is-a-token/");
  await expect(
    page.getByText("Many everyday words are a single token, while rare words are split into several."),
  ).toBeVisible();
  // The Markdown pipeline turns the straight apostrophe into a curly one, so match either.
  await expect(page.getByText(/Compared with the tiny toy in the step by step example, real tokenizers differ in three ways\./)).toBeVisible();
});

test("(l2) the visible post shows the Garnett line with its credit, and the engine's numbers", async ({ page }) => {
  await page.goto("what-is-a-token/");
  await expect(page.locator("blockquote")).toContainText(
    "Happy families are all alike; every unhappy family is unhappy in its own way.",
  );
  await expect(page.getByText("translation by Constance Garnett")).toBeVisible();
  // Each box of the numbers figure holds one character and its byte; the first is H = 72.
  const cells = page.locator("figure.text-numbers .cell");
  // The Garnett sentence is 77 characters, spaces and punctuation included.
  await expect(cells).toHaveCount(77);
  await expect(cells.first().locator(".ch")).toHaveText("H");
  await expect(cells.first().locator(".num")).toHaveText("72");
  // Figures derived from the stepper's engine read out in the prose.
  await expect(page.getByText("so the vocabulary ended with 256 + 10 = 266 entries")).toBeVisible();
  await expect(page.getByText("The text, meanwhile, shrank from 49 tokens to 20.")).toBeVisible();
  await expect(page.getByText("Our rule is: the pair with the smaller numeric values win.")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("§");
});

test("(i) the failed-to-load message never shows while the card is below the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 400 });
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-playground]");
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  expect((box as { y: number }).y).toBeGreaterThan(400);
  // The 8 s timer starts when the card first enters the viewport, so waiting longer than
  // 8 s without scrolling must leave the card loading and the failure message hidden.
  await page.waitForTimeout(9500);
  await expect(card).toHaveAttribute("data-state", "loading");
  await expect(page.locator('[data-playground] [data-msg="failed"]')).toBeHidden();
});

import { expect, test } from "@playwright/test";

// The post at its root-level URL (PD-01) and as the home page. Paths are relative to the
// configured baseURL, so the same spec works under any base.

const SECTION_HEADINGS = [
  "A token is a piece of text",
  "Tokens are not words",
  "Try it yourself",
  "What you just saw",
  "How this tokenizer works",
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
  const notWords = await y(page.getByRole("heading", { name: "Tokens are not words", level: 2 }));
  const card = await y(page.locator("[data-playground]"));
  const saw = await y(page.getByRole("heading", { name: "What you just saw", level: 2 }));
  expect(card).toBeGreaterThan(notWords);
  expect(card).toBeLessThan(saw);
});

test("(g) the post column has no links (the only link is the site name in the header)", async ({ page }) => {
  await page.goto("what-is-a-token/");
  await expect(page.locator("main a")).toHaveCount(0);
  await expect(page.locator("header.site-header a, .site-header a")).toHaveCount(1);
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
  await expect(page.locator('[data-msg="failed"]')).toBeHidden();
});

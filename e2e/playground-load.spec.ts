import { expect, test, type Page } from "@playwright/test";
import { buildGpt2 } from "../src/core/buildTokenizer.ts";
import { chipText } from "../src/core/display.ts";
import { DEFAULT_TEXT, EXAMPLES } from "../src/core/examples.ts";

// Phase 2.1 tracer: the playground runs on GPT-2. The default text is server-rendered from the
// committed fixture, the island hydrates at page load and downloads the 0.5 MB file once, the
// textbox unlocks when it arrives, and a slow download never shows the failed state (D-04, D-05, D-07).
// Locators are scoped to [data-playground] because the same page holds other islands.

const card = (page: Page) => page.locator("[data-playground]");
const chips = (page: Page) => card(page).locator("[data-chip]");
const GPT2 = /tokenizers\/gpt2\.json$/;
const BERT = /tokenizers\/bert-uncased\.json$/;

test("(1) without JavaScript the card holds chips cut from the default text", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("./");
  expect(await chips(page).count()).toBeGreaterThan(0);
  expect(await page.locator("#t").inputValue()).toBe(DEFAULT_TEXT);
  await context.close();
});

test("(2) the textbox unlocks after the download, and exactly one GPT-2 request was made", async ({ page }) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));

  await page.goto("./");
  await card(page).scrollIntoViewIfNeeded();
  await expect(card(page)).toHaveAttribute("data-tokenizer", "ready");
  await expect(card(page)).toHaveAttribute("data-state", "ready");
  await expect(page.locator("#t")).toBeEditable();

  await page.locator("#t").fill("hello");
  await expect(chips(page)).toHaveCount(1);

  // A short settle instead of network idle: a late stray request would still be caught.
  await page.waitForTimeout(500);
  expect(urls.filter((url) => GPT2.test(url))).toHaveLength(1);
  expect(urls.filter((url) => BERT.test(url))).toHaveLength(0);
});

test("(3) a slow download never reads as failed; examples work from build-time tokens meanwhile", async ({ page }) => {
  await page.route(GPT2, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 9500));
    await route.continue();
  });

  await page.goto("./");
  await card(page).scrollIntoViewIfNeeded();
  await expect(card(page)).toHaveAttribute("data-state", "ready");
  await expect(card(page)).toHaveAttribute("data-tokenizer", "loading");
  await expect(page.locator("[data-tokenizer-status]")).toBeVisible();

  // Longer than the 8-second failure watcher in BaseLayout.astro.
  await page.waitForTimeout(9000);
  await expect(card(page)).toHaveAttribute("data-state", "ready");
  await expect(card(page)).toHaveAttribute("data-tokenizer", "loading");
  await expect(page.locator("#t")).toHaveAttribute("readonly", "");

  // An example button still works: its tokens come from the build-time props.
  const before = await chips(page).allInnerTexts();
  await page.locator('[data-playground] [data-example="emoji"]').click();
  await expect(page.locator("#t")).toHaveValue(/Great job/);
  expect(await chips(page).allInnerTexts()).not.toEqual(before);
  expect(await chips(page).count()).toBeGreaterThan(0);

  await expect(card(page)).toHaveAttribute("data-tokenizer", "ready", { timeout: 10_000 });
  await expect(page.locator("#t")).toBeEditable();
  await expect(page.locator("[data-tokenizer-status]")).toHaveCount(0);
});

test("(4) typing after the tokenizer is ready makes no further request", async ({ page }) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));

  await page.goto("./");
  await card(page).scrollIntoViewIfNeeded();
  await expect(card(page)).toHaveAttribute("data-tokenizer", "ready");
  await page.waitForTimeout(300);

  const before = urls.length;
  await page.locator("#t").fill("my secret text \u{1F642}");
  await page.locator('[data-playground] [data-example="numbers-dates"]').click();
  await page.locator("#t").fill("typing again");
  await page.waitForTimeout(700);
  expect(urls.slice(before)).toEqual([]);
});

// Plan 02.1-03: failure, retry, a 404, focus and the example buttons while the file is on its way
// (D-05, D-06, D-07). Expected chip text for the examples comes from the engine, not from memory.

/** The text a chip shows for each token GPT-2 produces for `text`, as the reader sees it. */
async function expectedChipTexts(text: string): Promise<string[]> {
  const gpt2 = await buildGpt2();
  return gpt2.tokenize(text).map((token) => chipText(token).trim());
}

// The text line of each chip; the second line of the two-line chip is its ID and is not part of this.
const shownChipTexts = async (page: Page) => (await chips(page).locator("[data-chip-main]").allInnerTexts()).map((t) => t.trim());

test("(6) with the file blocked the card is failed, keeps its chips, counts and legend, and stays locked", async ({ page }) => {
  await page.route(GPT2, (route) => route.abort("failed"));
  await page.goto("./");
  await card(page).scrollIntoViewIfNeeded();

  // The island is fine; only the download failed.
  await expect(card(page)).toHaveAttribute("data-state", "ready");
  await expect(card(page)).toHaveAttribute("data-tokenizer", "failed");
  await expect(page.locator("[data-tokenizer-load-error]")).toBeVisible();
  await expect(page.locator("[data-tokenizer-retry]")).toBeVisible();

  // The static default chips are still on screen, with their counts and the legend.
  expect(await shownChipTexts(page)).toEqual(await expectedChipTexts(DEFAULT_TEXT));
  await expect(card(page).locator('[data-stat="tokens"] [data-stat-value]')).toHaveText(
    String((await expectedChipTexts(DEFAULT_TEXT)).length),
  );
  await expect(card(page).locator('[data-stat="characters"] [data-stat-value]')).toHaveText(/^[1-9]\d*$/);
  await expect(card(page).locator("[data-legend]")).toBeVisible();
  await expect(page.locator("#t")).toHaveAttribute("readonly", "");

  // Example buttons still work: they are served from build-time tokens.
  const before = await shownChipTexts(page);
  await page.locator('[data-playground] [data-example="emoji"]').click();
  await expect(page.locator("#t")).toHaveValue(/Great job/);
  expect(await shownChipTexts(page)).not.toEqual(before);
  expect(await shownChipTexts(page)).toEqual(await expectedChipTexts(await page.locator("#t").inputValue()));
  await expect(card(page)).toHaveAttribute("data-tokenizer", "failed");
});

test("(7) Try again fetches the file once more and unlocks the textbox", async ({ page }) => {
  const requested: string[] = [];
  let blocked = true;
  await page.route(GPT2, async (route) => {
    requested.push(route.request().url());
    if (blocked) await route.abort("failed");
    else await route.continue();
  });
  await page.goto("./");
  await card(page).scrollIntoViewIfNeeded();
  await expect(card(page)).toHaveAttribute("data-tokenizer", "failed");
  expect(requested).toHaveLength(1);

  // The file becomes reachable; the reader presses Try again.
  blocked = false;
  await page.locator("[data-tokenizer-retry]").click();
  await expect(card(page)).toHaveAttribute("data-tokenizer", "ready");
  expect(requested).toHaveLength(2);

  await expect(page.locator("[data-tokenizer-load-error]")).toHaveCount(0);
  await expect(page.locator("[data-tokenizer-retry]")).toHaveCount(0);
  await expect(page.locator("#t")).toBeEditable();
  await page.locator("#t").fill("hello world");
  expect(await shownChipTexts(page)).toEqual(await expectedChipTexts("hello world"));
  await expect(page.locator("[data-tokenizer-live]")).not.toBeEmpty();

  // Typing and the examples after the retry cause no further request.
  await page.locator('[data-playground] [data-example="numbers-dates"]').click();
  await page.waitForTimeout(500);
  expect(requested).toHaveLength(2);
});

test("(8) a retry that fails again returns focus to Try again and keeps the card locked", async ({ page }) => {
  let attempts = 0;
  await page.route(GPT2, (route) => {
    attempts += 1;
    return route.abort("failed");
  });
  await page.goto("./");
  await card(page).scrollIntoViewIfNeeded();
  await expect(card(page)).toHaveAttribute("data-tokenizer", "failed");
  expect(attempts).toBe(1);

  await page.locator("[data-tokenizer-retry]").click();
  await expect.poll(() => attempts).toBe(2);
  await expect(page.locator("[data-tokenizer-retry]")).toBeFocused();
  await expect(card(page)).toHaveAttribute("data-tokenizer", "failed");
  await expect(page.locator("[data-tokenizer-load-error]")).toBeVisible();
  await expect(page.locator("#t")).toHaveAttribute("readonly", "");
});

test("(9) a 404 for the GPT-2 file ends in the same failed state as a blocked request", async ({ page }) => {
  await page.route(GPT2, (route) => route.fulfill({ status: 404, contentType: "text/plain", body: "not found" }));
  await page.goto("./");
  await card(page).scrollIntoViewIfNeeded();
  await expect(card(page)).toHaveAttribute("data-state", "ready");
  await expect(card(page)).toHaveAttribute("data-tokenizer", "failed");
  await expect(page.locator("[data-tokenizer-load-error]")).toBeVisible();
  await expect(page.locator("[data-tokenizer-retry]")).toBeVisible();
  await expect(page.locator("#t")).toHaveAttribute("readonly", "");
  expect(await shownChipTexts(page)).toEqual(await expectedChipTexts(DEFAULT_TEXT));
});

test("(10) while the file is delayed, each example button shows its tokens and Reset restores the default, with no new request", async ({
  page,
}) => {
  const requested: string[] = [];
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(GPT2, async (route) => {
    requested.push(route.request().url());
    await gate;
    await route.continue();
  });
  try {
    await page.goto("./");
    await card(page).scrollIntoViewIfNeeded();
    await expect(card(page)).toHaveAttribute("data-state", "ready");
    await expect(card(page)).toHaveAttribute("data-tokenizer", "loading");
    await expect(page.locator("#t")).toHaveAttribute("readonly", "");

    for (const example of EXAMPLES) {
      await page.locator(`[data-playground] [data-example="${example.id}"]`).click();
      await expect(page.locator("#t")).toHaveValue(example.text);
      expect(await shownChipTexts(page), example.id).toEqual(await expectedChipTexts(example.text));
      await expect(card(page)).toHaveAttribute("data-tokenizer", "loading");
    }

    await page.locator("[data-playground] [data-reset]").click();
    await expect(page.locator("#t")).toHaveValue(DEFAULT_TEXT);
    expect(await shownChipTexts(page)).toEqual(await expectedChipTexts(DEFAULT_TEXT));
    await expect(card(page)).toHaveAttribute("data-tokenizer", "loading");
    expect(requested).toHaveLength(1);
  } finally {
    release();
  }
  await expect(card(page)).toHaveAttribute("data-tokenizer", "ready");
  expect(requested).toHaveLength(1);
});

test("(5) a failed download shows a plain message and Try again; the textbox stays locked until a retry works", async ({ page }) => {
  let failures = 2;
  await page.route(GPT2, async (route) => {
    if (failures > 0) {
      failures -= 1;
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  await page.goto("./");
  await card(page).scrollIntoViewIfNeeded();
  await expect(card(page)).toHaveAttribute("data-tokenizer", "failed");
  // Distinct from the runtime error element (data-tokenizer-error), which is absent.
  await expect(page.locator("[data-tokenizer-load-error]")).toBeVisible();
  await expect(page.locator("[data-tokenizer-error]")).toHaveCount(0);
  await expect(page.locator("#t")).toHaveAttribute("readonly", "");
  expect(await chips(page).count()).toBeGreaterThan(0);
  await expect(page.locator('[data-playground] [data-example="emoji"]')).toBeEnabled();
  await expect(page.locator("[data-tokenizer-status]")).toHaveCount(0);
  // Focus is not moved on the first failure at page load.
  await expect(page.locator("[data-tokenizer-retry]")).not.toBeFocused();

  // A retry that fails again keeps the message and puts focus on the button.
  await page.locator("[data-tokenizer-retry]").click();
  await expect(page.locator("[data-tokenizer-retry]")).toBeFocused();
  await expect(card(page)).toHaveAttribute("data-tokenizer", "failed");
  await expect(page.locator("#t")).toHaveAttribute("readonly", "");

  // The next retry reaches the file: unlocked, message gone, ready announcement made.
  await page.locator("[data-tokenizer-retry]").click();
  await expect(card(page)).toHaveAttribute("data-tokenizer", "ready");
  await expect(page.locator("#t")).toBeEditable();
  await expect(page.locator("[data-tokenizer-load-error]")).toHaveCount(0);
  await expect(page.locator("[data-tokenizer-retry]")).toHaveCount(0);
  await expect(page.locator("[data-tokenizer-live]")).not.toBeEmpty();
});

import { expect, test, type Page } from "@playwright/test";
import { openPlaygroundReady as openReady } from "./helpers.ts";

// Task 3 contract: table alternative, live region, limit, error and lifecycle states, keyboard order.

const statValue = (page: Page, name: string) => page.locator(`[data-stat="${name}"] [data-stat-value]`);
const EMOJI = "\u{1F642}";
const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}";

test("(a) the table alternative is a native details with a real table that follows the text", async ({ page }) => {
  await openReady(page);
  const details = page.locator("details[data-table]");
  expect(await details.evaluate((el: HTMLDetailsElement) => el.open)).toBe(false);
  await expect(details.locator("summary")).toHaveText("View tokens as a table");

  await details.locator("summary").click();
  expect(await details.evaluate((el: HTMLDetailsElement) => el.open)).toBe(true);
  await expect(details.locator("caption")).toHaveText("Tokens in your text");
  const headers = details.locator('th[scope="col"]');
  await expect(headers).toHaveText(["#", "Token", "ID", "Bytes"]);
  const chips = await page.locator("[data-playground] [data-chip]").count();
  await expect(details.locator("tbody tr")).toHaveCount(chips);

  // Partial rows say which byte of which character they hold (UI-SPEC R-01).
  // GPT-2 cuts the four bytes of 🙂 (F0 9F 99 82) into two tokens of two bytes each.
  await page.locator("#t").fill(EMOJI);
  const rows = details.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator("td").nth(1)).toHaveText(`Bytes 1 to 2 of 4 of ${EMOJI}`);
  await expect(rows.nth(1).locator("td").nth(1)).toHaveText(`Bytes 3 to 4 of 4 of ${EMOJI}`);
  await expect(rows.nth(0).locator("td").nth(3)).toHaveText("F0 9F");
  await expect(rows.nth(1).locator("td").nth(3)).toHaveText("99 82");

  // Empty text: exactly one row.
  await page.locator("#t").fill("");
  await expect(details.locator("tbody tr")).toHaveCount(1);
  await expect(details.locator("tbody tr")).toHaveText("No tokens yet.");

  // Typing while open keeps it open.
  await page.locator("#t").fill("typing keeps it open");
  expect(await details.evaluate((el: HTMLDetailsElement) => el.open)).toBe(true);
  await expect(details.locator("tbody tr").first()).not.toHaveText("No tokens yet.");
});

test("(a2) the table names the byte and the character for each piece of 日本語", async ({ page }) => {
  await openReady(page);
  const details = page.locator("details[data-table]");
  await details.locator("summary").click();
  await page.locator("#t").fill("日本語");
  const rows = details.locator("tbody tr");
  // GPT-2 cuts each character into a two-byte piece and a one-byte piece: six rows.
  await expect(rows).toHaveCount(6);
  const expected = [
    "Bytes 1 to 2 of 3 of 日",
    "Byte 3 of 3 of 日",
    "Bytes 1 to 2 of 3 of 本",
    "Byte 3 of 3 of 本",
    "Bytes 1 to 2 of 3 of 語",
    "Byte 3 of 3 of 語",
  ];
  for (let k = 0; k < expected.length; k++) {
    await expect(rows.nth(k).locator("td").nth(1)).toHaveText(expected[k] as string);
  }
});

test("(b) a ZWJ family emoji counts as one character", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").fill(FAMILY);
  await expect(statValue(page, "characters")).toHaveText("1");
  const body = await page.evaluate(() => document.body.innerText);
  expect(body).not.toContain("�");
});

test("(c) the live region is empty on load and announces one debounced message", async ({ page }) => {
  await openReady(page);
  const live = page.locator("[data-live]");
  await expect(live).toHaveAttribute("role", "status");
  await expect(live).toHaveText("");

  await page.locator("#t").fill("a");
  await expect(live).toHaveText("1 token, 1 character, 1 byte, 1 word", { timeout: 3000 });

  await page.locator("#t").fill("hello world");
  await expect(live).toHaveText(/^\d+ tokens?, 11 characters, 11 bytes, 2 words$/, { timeout: 3000 });

  // Two edits within 200 ms announce only the final message.
  await page.evaluate(() => {
    const el = document.querySelector("[data-live]") as HTMLElement;
    const seen: string[] = [];
    (window as unknown as { __seen: string[] }).__seen = seen;
    new MutationObserver(() => seen.push(el.textContent ?? "")).observe(el, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
  await page.locator("#t").fill("x");
  await page.waitForTimeout(100);
  await page.locator("#t").fill("hello");
  await expect(live).toHaveText(/^\d+ tokens?, 5 characters, 5 bytes, 1 word$/, { timeout: 3000 });
  await page.waitForTimeout(700);
  const seen = await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
  expect(seen.length).toBe(1);
  expect(seen[0]).toMatch(/5 characters, 5 bytes, 1 word$/);
});

test("(c2) the split-character note is part of the announcement", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").fill(EMOJI);
  await expect(page.locator("[data-live]")).toContainText("1 character was split across several tokens.", {
    timeout: 3000,
  });
});

test("(d) the limit message appears at 1,000 characters and not at 999", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").fill("a".repeat(999));
  await expect(page.locator("[data-limit]")).toHaveCount(0);
  await page.locator("#t").fill("a".repeat(1000));
  await expect(page.locator("[data-limit]")).toHaveText(
    "That is the limit for this playground: 1,000 characters. Delete some text to keep typing.",
  );
  await page.locator("#t").fill("a".repeat(999));
  await expect(page.locator("[data-limit]")).toHaveCount(0);
});

test("(e) lifecycle: loading, failed after 8 s in view, recovery on late hydration", async ({ page }) => {
  test.setTimeout(30_000);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_astro/Playground.*.js", async (route) => {
    await gate;
    await route.continue();
  });
  // Firefox and WebKit hold the load event while the island script is pending; Chromium does not.
  await page.goto("./", { waitUntil: "domcontentloaded" });
  const card = page.locator("[data-playground]");
  await card.scrollIntoViewIfNeeded();

  await expect(card).toHaveAttribute("data-state", "loading");
  await expect(page.locator('[data-playground] [data-msg="loading"]')).toBeVisible();
  await expect(page.locator('[data-playground] [data-msg="failed"]')).toBeHidden();
  await expect(page.locator("#t")).toHaveAttribute("readonly", "");
  await expect(page.locator("[data-example]").first()).toBeDisabled();

  await expect(card).toHaveAttribute("data-state", "failed", { timeout: 12_000 });
  await expect(page.locator('[data-playground] [data-msg="failed"]')).toBeVisible();
  await expect(page.locator('[data-playground] [data-msg="failed"]')).toContainText(
    "The playground could not load. Check your connection, then reload the page. The example below still shows the default text.",
  );
  await expect(page.locator('[data-playground] [data-msg="loading"]')).toBeHidden();
  await expect(page.locator("[data-playground] [data-reload]")).toBeVisible();
  await expect(page.locator("#t")).toHaveAttribute("readonly", "");
  await expect(page.locator("[data-example]").first()).toBeDisabled();
  await expect(page.locator("[data-playground] [data-chip]").first()).toBeVisible();

  release();
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(card).toHaveAttribute("data-tokenizer", "ready");
  await expect(page.locator("[data-playground] [data-status]")).toBeHidden();
  await expect(page.locator("#t")).toBeEditable();
});

test("(e2) the Reload page button reloads the page", async ({ page }) => {
  test.setTimeout(30_000);
  // Astro retries a failed island import once with an `?astro-retry=` query, so match that URL too.
  const island = "**/_astro/Playground.*.js*";
  await page.route(island, (route) => route.abort());
  await page.goto("./");
  const card = page.locator("[data-playground]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "failed", { timeout: 12_000 });
  await page.unroute(island);
  await Promise.all([page.waitForEvent("load"), page.locator("[data-playground] [data-reload]").click()]);
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
});

test("(f) without JavaScript the no-JS note shows and the loading line is hidden", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("./");
  // getByText skips <noscript> content, so address the note by its class. The page also holds the
  // own-text block, which has its own .nojs note, so start at the playground.
  const note = page.locator("[data-playground] .nojs");
  await expect(note).toBeVisible();
  await expect(note).toHaveText("Typing needs JavaScript. The example below shows the default text.");
  await expect(page.locator("[data-playground] [data-status]")).toBeHidden();
  expect(await page.locator("[data-playground] [data-chip]").count()).toBeGreaterThan(0);
  await context.close();
});

test("(g) an unexpected tokenizer failure shows the error state and recovers", async ({ page }) => {
  // The patched encoder only throws once __breakEncoder is set, which happens after openReady has
  // seen data-tokenizer="ready" (RESEARCH G6). That keeps this test on the runtime error path
  // (data-tokenizer-error), not the download-failure path (data-tokenizer-load-error).
  await page.addInitScript(() => {
    const original = TextEncoder.prototype.encode;
    TextEncoder.prototype.encode = function (this: TextEncoder, input?: string) {
      if ((window as unknown as { __breakEncoder?: boolean }).__breakEncoder) throw new Error("encoder broken");
      return original.call(this, input);
    };
  });
  await openReady(page);
  await page.evaluate(() => {
    (window as unknown as { __breakEncoder?: boolean }).__breakEncoder = true;
  });
  await page.locator("#t").fill("something new");
  await expect(page.locator("[data-tokenizer-error]")).toHaveText(
    "The tokenizer could not run. Reload the page to try again. Your text stays in your browser.",
  );
  for (const name of ["tokens", "characters", "bytes", "words"]) {
    await expect(statValue(page, name)).toHaveText("0");
  }
  await expect(page.locator("#t")).toBeEditable();
  await expect(page.locator("[data-playground] [data-chip]")).toHaveCount(0);

  await page.evaluate(() => {
    (window as unknown as { __breakEncoder?: boolean }).__breakEncoder = false;
  });
  await page.locator("#t").fill("hello");
  await expect(page.locator("[data-tokenizer-error]")).toHaveCount(0);
  expect(await page.locator("[data-playground] [data-chip]").count()).toBeGreaterThan(0);
});

test("(h) Tab walks textarea, examples, Reset, the view control, Peek and the table summary in order", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").focus();
  const where = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "none";
      if (el.hasAttribute("data-example")) return `example:${el.getAttribute("data-example")}`;
      if (el.hasAttribute("data-reset")) return "reset";
      if (el.getAttribute("name") === "view") return `view:${(el as HTMLInputElement).value}`;
      if (el.hasAttribute("data-peek")) return "peek";
      if (el.tagName === "SUMMARY") return "summary";
      return el.tagName.toLowerCase();
    });
  const order: string[] = [];
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("Tab");
    order.push(await where());
  }
  expect(order).toEqual([
    "example:rare-word",
    "example:numbers-dates",
    "example:emoji",
    "example:literature",
    "example:non-english",
    "reset",
    "view:text",
    "peek",
    "summary",
  ]);
});

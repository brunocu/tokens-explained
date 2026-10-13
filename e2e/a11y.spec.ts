import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openPlaygroundReady } from "./helpers.ts";

// WCAG 2.2 A and AA scans of the finished post in both themes at 1280 px (FOUND-04),
// plus the structural checks axe does not make. Phone width lives in
// phone-width.secondary.spec.ts and never gates.

const TAGS = ["wcag2a", "wcag2aa", "wcag22aa"];
const EMOJI_TEXT = "Great job \u{1F389} see you soon \u{1F642}";

/** Put the page in the busiest state: partial chips present and the table open. */
async function prepare(page: Page): Promise<void> {
  await openPlaygroundReady(page, "what-is-a-token/");
  await page.locator("#t").fill(EMOJI_TEXT);
  await expect(page.locator('[data-playground] [data-chip][data-partial="true"]').first()).toBeVisible();
  await page.locator("details[data-table] summary").click();
  await expect(page.locator("details[data-table]")).toHaveAttribute("open", "");
}

for (const scheme of ["light", "dark"] as const) {
  test(`(${scheme}) axe finds no WCAG 2.2 A or AA violation at 1280 px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await prepare(page);
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" ; ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

// Frames and both label styles on screen: two CJK characters, a space, and the family emoji
// (man, zero-width joiner, woman, zero-width joiner, girl) whose joiners get name-style labels.
const FRAMES_TEXT = "男女 \u{1F468}‍\u{1F469}‍\u{1F467}";

for (const scheme of ["light", "dark"] as const) {
  test(`(${scheme}) axe finds no violation with frames, name labels and the table open`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await openPlaygroundReady(page, "what-is-a-token/");
    await page.locator("#t").fill(FRAMES_TEXT);
    await expect(page.locator("[data-playground] [data-char-frame]").first()).toBeVisible();
    // Both label styles are on screen: a character label and a name-style label.
    const labels = (await page.locator("[data-playground] [data-char-label]").allInnerTexts()).map((t) => t.trim());
    expect(labels).toContain("男");
    expect(labels.some((t) => /^[a-z ]+$/.test(t))).toBe(true);
    await page.locator("details[data-table] summary").click();
    await expect(page.locator("details[data-table]")).toHaveAttribute("open", "");
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" ; ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

// The playground's two download states (D-05, D-06, D-07): the status line while the file is on
// its way, and the message with Try again after it failed. Colour contrast of both is checked.
const GPT2_FILE = /tokenizers\/gpt2\.json$/;

for (const scheme of ["light", "dark"] as const) {
  test(`(${scheme}) axe finds no violation while the GPT-2 file is still downloading`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(GPT2_FILE, async (route) => {
      await gate;
      await route.continue();
    });
    try {
      await page.goto("what-is-a-token/");
      const card = page.locator("[data-playground]");
      await card.scrollIntoViewIfNeeded();
      await expect(card).toHaveAttribute("data-state", "ready");
      await expect(card).toHaveAttribute("data-tokenizer", "loading");
      await expect(page.locator("[data-tokenizer-status]")).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" ; ")}`);
      expect(summary, summary.join("\n")).toEqual([]);
    } finally {
      release();
    }
  });

  test(`(${scheme}) axe finds no violation when the GPT-2 file failed to download`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.route(GPT2_FILE, (route) => route.abort("failed"));
    await page.goto("what-is-a-token/");
    const card = page.locator("[data-playground]");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("data-tokenizer", "failed");
    await expect(page.locator("[data-tokenizer-load-error]")).toBeVisible();
    await expect(page.locator("[data-tokenizer-retry]")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" ; ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

test("(structure) one H1, no skipped heading level, lang en, one main, base-aware header link", async ({ page, baseURL }) => {
  await page.goto("what-is-a-token/");
  const levels = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((els) => els.map((el) => Number(el.tagName.slice(1))));
  expect(levels.filter((l) => l === 1)).toHaveLength(1);
  expect(levels[0]).toBe(1);
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i] as number, `heading ${i}`).toBeLessThanOrEqual((levels[i - 1] as number) + 1);
  }
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("main")).toHaveCount(1);
  const href = await page.locator(".site-header a").getAttribute("href");
  expect(href).toBe(new URL(baseURL as string).pathname);
});

test("(motion) under reduced motion no element has a nonzero animation or transition duration", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepare(page);
  const offenders = await page.evaluate(() => {
    const nonzero = (value: string) => value.split(",").some((part) => parseFloat(part) > 0);
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const style = getComputedStyle(el);
      if (nonzero(style.animationDuration) || nonzero(style.transitionDuration)) {
        bad.push(`${el.tagName.toLowerCase()}.${el.className}`);
      }
    }
    return bad;
  });
  expect(offenders).toEqual([]);
});

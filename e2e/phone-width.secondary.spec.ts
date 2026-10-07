import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openPlaygroundReady } from "./helpers.ts";

// SECONDARY, never gating (D-15 amended). Runs only through `npm run test:e2e:secondary`
// (the phone project); the three desktop projects ignore files named *.secondary.spec.ts.
// Results are recorded in the SUMMARY.

test.use({ viewport: { width: 360, height: 800 } });

const TAGS = ["wcag2a", "wcag2aa", "wcag22aa"];
const EMOJI_TEXT = "Great job \u{1F389} see you soon \u{1F642}";
const LONG_WORD = "The word floccinaucinihilipilification is almost never used.";

async function openReady(page: Page): Promise<void> {
  await openPlaygroundReady(page, "what-is-a-token/");
}

const overflowX = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const scheme of ["light", "dark"] as const) {
  test(`(a ${scheme}) axe finds no violation at 360 px with partial chips and the table open`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openReady(page);
    await page.locator("#t").fill(EMOJI_TEXT);
    await expect(page.locator('[data-playground] [data-chip][data-partial="true"]').first()).toBeVisible();
    await page.locator("details[data-table] summary").click();
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" ; ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

test("(b) the long word and 1,000 CJK characters cause no horizontal page scroll with the table open", async ({ page }) => {
  await openReady(page);
  await page.locator("details[data-table] summary").click();
  await page.locator("#t").fill(LONG_WORD);
  await expect(page.locator("[data-playground] [data-chip]").first()).toBeVisible();
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
  await page.locator("#t").fill("日本語".repeat(333) + "日");
  await expect.poll(() => page.locator("[data-playground] [data-chip]").count(), { timeout: 20_000 }).toBe(2000);
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
});

test("(d) frames at 360 px in Token IDs mode: no horizontal page scroll and every frame inside its chips container", async ({
  page,
}) => {
  await openReady(page);
  await page.getByText("Token IDs", { exact: true }).click();
  const inputs: Array<() => Promise<void>> = [
    async () => {
      await page.locator("#t").fill("日本語");
    },
    async () => {
      await page.locator('[data-example="emoji"]').click();
    },
  ];
  for (const apply of inputs) {
    await apply();
    await expect(page.locator("[data-playground] [data-char-frame]").first()).toBeVisible();
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
    const outside = await page.locator("[data-playground] [data-char-frame]").evaluateAll((frames) => {
      const bad: string[] = [];
      for (const frame of frames) {
        const container = frame.closest(".chips");
        if (container === null) {
          bad.push("no .chips container");
          continue;
        }
        const f = frame.getBoundingClientRect();
        const c = container.getBoundingClientRect();
        if (f.left < c.left - 0.5 || f.right > c.right + 0.5) bad.push(`${f.left}-${f.right} vs ${c.left}-${c.right}`);
      }
      return bad;
    });
    expect(outside).toEqual([]);
  }
});

test("(e) the stepper at a merge stage and at the end has no horizontal page scroll and its pair table scrolls inside its own wrapper", async ({
  page,
}) => {
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-stepper]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  // Stage 6 is merge 5: six tied rows, the widest table. Then the last stage, with the unseen words.
  for (let i = 0; i < 6; i++) {
    const before = (await card.locator("[data-step-status]").textContent()) ?? "";
    await card.locator("[data-next]").click();
    await expect(card.locator("[data-step-status]")).not.toHaveText(before);
  }
  await expect(card.locator("[data-pair-table]")).toBeVisible();
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
  await card.locator("[data-run]").click();
  await expect(card.locator("[data-final]")).toBeVisible();
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
  await card.locator("[data-reset]").click();
  for (let i = 0; i < 6; i++) {
    const before = (await card.locator("[data-step-status]").textContent()) ?? "";
    await card.locator("[data-next]").click();
    await expect(card.locator("[data-step-status]")).not.toHaveText(before);
  }
  const region = card.locator('[role="region"][aria-label="Pair counts, scrollable"]');
  await expect(region).toBeVisible();
  const box = await region.boundingBox();
  const inner = await card.boundingBox();
  expect(box).not.toBeNull();
  expect(inner).not.toBeNull();
  // The wrapper stays inside the card; whatever is wider than it scrolls within it.
  expect((box as { x: number; width: number }).x + (box as { width: number }).width).toBeLessThanOrEqual(
    (inner as { x: number; width: number }).x + (inner as { width: number }).width + 0.5,
  );
  expect(await region.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
});

test("(c) on the phone profile the post loads, the card is ready, chips are present and the console is clean", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await openReady(page);
  expect(await page.locator("[data-playground] [data-chip]").count()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

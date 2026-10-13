import { expect, test, type Locator, type Page } from "@playwright/test";

// SECONDARY, never gating (D-15 amended). Runs only through `npm run test:e2e:secondary`
// (the phone project); the three desktop projects ignore files named *.secondary.spec.ts.
// Results are recorded in the SUMMARY.
//
// Gaps G-02.2-1a and G-02.2-1b (UAT test 1): below 1024px the comparison widget's rows must
// flow at natural height without overlapping, and each language's sentence must sit on its own
// full-width line under that language's numbers.

test.use({ viewport: { width: 390, height: 844 } });

const TOLERANCE = 0.5;

type Box = { top: number; bottom: number; left: number; right: number; width: number; height: number };

/** The border box of every element a locator matches, in page coordinates. */
async function boxes(locator: Locator): Promise<Box[]> {
  return locator.evaluateAll((elements) =>
    elements.map((element) => {
      const r = element.getBoundingClientRect();
      return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, left: r.left, right: r.right, width: r.width, height: r.height };
    }),
  );
}

const overflowX = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("(a) comparison: the two rows are separate blocks at natural height, with no inner vertical scroll", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-compare]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(page.locator("[data-compare-gpt2]")).toHaveAttribute("data-state", "ready");

  const rows = card.locator('[role="group"][data-row]');
  expect(await rows.count()).toBe(2);
  const rowBoxes = await boxes(rows);
  const regions = card.locator('[role="group"][data-row] [role="region"]');
  expect(await regions.count()).toBe(2);
  const regionBoxes = await boxes(regions);

  // (1) consecutive rows do not overlap
  for (let i = 1; i < rowBoxes.length; i++) {
    expect(rowBoxes[i - 1]!.bottom, `row ${i - 1} bottom vs row ${i} top`).toBeLessThanOrEqual(rowBoxes[i]!.top + TOLERANCE);
  }
  // (2) each region lies inside its row
  for (let i = 0; i < rowBoxes.length; i++) {
    expect(regionBoxes[i]!.top, `region ${i} top`).toBeGreaterThanOrEqual(rowBoxes[i]!.top - TOLERANCE);
    expect(regionBoxes[i]!.bottom, `region ${i} bottom`).toBeLessThanOrEqual(rowBoxes[i]!.bottom + TOLERANCE);
  }
  // (3) no inner vertical scroll, (4) the region did not collapse
  const metrics = await regions.evaluateAll((elements) =>
    elements.map((element) => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight })),
  );
  for (let i = 0; i < metrics.length; i++) {
    expect(metrics[i]!.scrollHeight, `region ${i} scrollHeight vs clientHeight`).toBeLessThanOrEqual(metrics[i]!.clientHeight + 1);
    expect(regionBoxes[i]!.height, `region ${i} height`).toBeGreaterThanOrEqual(40);
  }
  // (5) no horizontal page scroll
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
});

test("(b) languages: each sentence has its own full-width line under its row of numbers", async ({ page }) => {
  await page.goto("what-is-a-token/");
  const widget = page.locator("[data-languages]");
  await widget.scrollIntoViewIfNeeded();
  await expect(widget).toHaveAttribute("data-state", "ready");

  const table = widget.locator("[data-languages-table]");
  const tableBox = (await boxes(table))[0]!;
  const rows = widget.locator("[data-lang-row]");
  expect(await rows.count()).toBe(6);
  const rowBoxes = await boxes(rows);

  for (let i = 0; i < 6; i++) {
    const row = rows.nth(i);
    const sentence = (await boxes(row.locator("[data-table-sentence]")))[0]!;
    // (1) wide enough to read
    expect(sentence.width, `row ${i} sentence width`).toBeGreaterThanOrEqual(240);
    expect(sentence.width, `row ${i} sentence vs table width`).toBeGreaterThanOrEqual(tableBox.width * 0.85);
    // (2) on a line of its own: at or below the bottom of the other cells
    const others = await boxes(row.locator("th, td:not([data-table-sentence])"));
    const maxBottom = Math.max(...others.map((b) => b.bottom));
    expect(sentence.top, `row ${i} sentence top vs other cells`).toBeGreaterThanOrEqual(maxBottom - TOLERANCE);
    // (4) none of the visible cells is clipped
    const clipped = await row.locator("th, td").evaluateAll((cells) =>
      cells.filter((cell) => cell.scrollWidth > cell.clientWidth + 1).map((cell) => cell.textContent?.trim().slice(0, 20) ?? ""),
    );
    expect(clipped, `row ${i} clipped cells`).toEqual([]);
  }
  // (3) consecutive rows do not overlap
  for (let i = 1; i < rowBoxes.length; i++) {
    expect(rowBoxes[i - 1]!.bottom, `row ${i - 1} bottom vs row ${i} top`).toBeLessThanOrEqual(rowBoxes[i]!.top + TOLERANCE);
  }
  // (5) Arabic keeps its direction
  const arabic = widget.locator('[data-table-sentence][lang="ar"]');
  await expect(arabic).toHaveAttribute("dir", "rtl");
  expect(await arabic.evaluate((el) => getComputedStyle(el).direction)).toBe("rtl");
  // (6) no sideways scroll in the table region or the page
  const region = widget.locator('[role="region"][aria-label="Token counts by language, scrollable"]');
  const regionMetrics = await region.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
  expect(regionMetrics.scrollWidth).toBeLessThanOrEqual(regionMetrics.clientWidth + 1);
  expect(await overflowX(page)).toBeLessThanOrEqual(0);

  // The Text header stays in the accessibility tree but takes no room (visually hidden).
  const headers = table.locator("thead th");
  expect(await headers.count()).toBe(5);
  const textHeader = (await boxes(table.locator("thead th.sentence-col")))[0]!;
  expect(textHeader.width).toBeLessThanOrEqual(2);
  expect(textHeader.height).toBeLessThanOrEqual(2);
});

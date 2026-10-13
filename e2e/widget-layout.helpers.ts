import { expect, type Locator, type Page } from "@playwright/test";

// Layout assertions shared by every widget of Post 1 (phase 2.2, D-14, UI-SPEC "Verification
// Hooks" 2 to 7; hook 1, the height equality across states, is added per widget by plans 02 to 06
// through `expectConstantHeight`). The assertions describe the finished layout, so they fail
// against the widgets as they were before the rework; each later plan turns its own widget green.
//
// All viewport sizes below are the ones named in the UI-SPEC. Every helper sets the viewport it
// needs and leaves it set, so a test that needs another size sets it afterwards.

/** The widget's reading-column neighbour used as the reference for width and centring. */
const PROSE_PARAGRAPH = "article > p";

/** Width of a widget in the two-column layout, from 1024px up (D-03). */
export const WIDGET_WIDTH = 960;
/** What a 960px widget hangs over the 632px text on each side: (960 - 632) / 2. */
export const OVERHANG = 164;
/** The widget's own padding (24px) plus its border (1px): the gap under its last column. */
export const BOTTOM_CHROME = 25;

export type WidgetEntry = {
  /** Leading tag of every test title, so a run can pick one widget with a grep. */
  tag: "@playground" | "@stepper" | "@compare" | "@languages";
  /** Root hook of the widget. */
  root: string;
  /**
   * True for a plain two-column widget whose columns are equal peers. False for the languages
   * widget, whose first band spans both columns; the column-order checks do not apply to it.
   */
  plainTwoColumn: boolean;
};

export const WIDGETS: readonly WidgetEntry[] = [
  { tag: "@playground", root: "[data-playground]", plainTwoColumn: true },
  { tag: "@stepper", root: "[data-stepper]", plainTwoColumn: true },
  { tag: "@compare", root: "[data-compare]", plainTwoColumn: true },
  { tag: "@languages", root: "[data-languages]", plainTwoColumn: false },
] as const;

/**
 * Go to the post, bring the widget into view and wait until it has hydrated. The playground has
 * two levels of readiness (island, then the GPT-2 download), as in `openPlaygroundReady`.
 * Returns the root locator.
 */
export async function openWidget(page: Page, entry: WidgetEntry): Promise<Locator> {
  await page.goto("what-is-a-token/");
  const root = page.locator(entry.root);
  await expect(root, `${entry.tag} root ${entry.root}`).toHaveCount(1);
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-state", "ready");
  if (entry.root === "[data-playground]") await expect(root).toHaveAttribute("data-tokenizer", "ready");
  return root;
}

async function setViewport(page: Page, width: number, height: number, root: Locator): Promise<void> {
  await page.setViewportSize({ width, height });
  await root.scrollIntoViewIfNeeded();
  await settle(page);
}

/** Let layout and style recalculation finish: two animation frames. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

type Box = { x: number; y: number; width: number; height: number };

async function boxOf(locator: Locator, what: string): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, `${what} has a box`).not.toBeNull();
  return box as Box;
}

/** Bounding-box height of a locator, in CSS pixels. */
export async function heightOf(locator: Locator): Promise<number> {
  return (await boxOf(locator, "the element")).height;
}

function near(actual: number, expected: number, tolerance: number, what: string): void {
  expect(Math.abs(actual - expected), `${what}: ${actual} should be within ${tolerance} of ${expected}`).toBeLessThanOrEqual(tolerance);
}

/**
 * D-03, hook 2. At 1440x900 and again at 1024x768 the root is 960px wide, centred on the first
 * prose paragraph of the article, and hangs 164px over it on each side.
 */
export async function expectBreakout(page: Page, root: Locator): Promise<void> {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
  ] as const) {
    await setViewport(page, width, height, root);
    const rootBox = await boxOf(root, "the widget root");
    const paragraph = await boxOf(page.locator(PROSE_PARAGRAPH).first(), "the first prose paragraph");
    const at = `at ${width}px`;
    near(rootBox.width, WIDGET_WIDTH, 1, `root width ${at}`);
    near(rootBox.x + rootBox.width / 2, paragraph.x + paragraph.width / 2, 1, `root centre against the paragraph centre ${at}`);
    near(paragraph.x - rootBox.x, OVERHANG, 2, `left overhang ${at}`);
    near(rootBox.x + rootBox.width - (paragraph.x + paragraph.width), OVERHANG, 2, `right overhang ${at}`);
  }
}

/** Geometry of the root's columns and of the overflow of the root and each column. */
async function columnsOf(root: Locator): Promise<{
  rootBottom: number;
  cols: Array<{ top: number; bottom: number; overflow: number }>;
  rootOverflow: number;
}> {
  return root.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const cols = [...el.querySelectorAll<HTMLElement>(".widget-col")].map((col) => {
      const r = col.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, overflow: col.scrollHeight - col.clientHeight };
    });
    return { rootBottom: rect.bottom, cols, rootOverflow: (el as HTMLElement).scrollHeight - (el as HTMLElement).clientHeight };
  });
}

/**
 * D-04, hook 3. At 1023x768 and 768x1024 the widget is as wide as the prose and as tall as its
 * content (its last column ends 25px above its bottom edge), nothing overflows vertically, and the
 * second column starts at or below the first column's bottom. At 1024x768 both columns start at
 * the same height. The column-order checks apply to plain two-column widgets only.
 */
export async function expectStacked(page: Page, root: Locator, plainTwoColumn: boolean): Promise<void> {
  for (const [width, height] of [
    [1023, 768],
    [768, 1024],
  ] as const) {
    await setViewport(page, width, height, root);
    const at = `at ${width}px`;
    const rootBox = await boxOf(root, "the widget root");
    const paragraph = await boxOf(page.locator(PROSE_PARAGRAPH).first(), "the first prose paragraph");
    near(rootBox.width, paragraph.width, 1, `stacked root width ${at}`);
    const geometry = await columnsOf(root);
    expect(geometry.cols.length, `.widget-col elements in the root ${at}`).toBeGreaterThanOrEqual(plainTwoColumn ? 2 : 1);
    const last = geometry.cols[geometry.cols.length - 1] as { bottom: number };
    near(geometry.rootBottom - last.bottom, BOTTOM_CHROME, 3, `gap under the last column ${at} (height is the content height)`);
    expect(geometry.rootOverflow, `vertical overflow of the root ${at}`).toBeLessThanOrEqual(1);
    for (const [i, col] of geometry.cols.entries()) expect(col.overflow, `vertical overflow of column ${i + 1} ${at}`).toBeLessThanOrEqual(1);
    if (plainTwoColumn) {
      const first = geometry.cols[0] as { bottom: number };
      const second = geometry.cols[1] as { top: number };
      expect(second.top, `second column top against first column bottom ${at}`).toBeGreaterThanOrEqual(first.bottom - 1);
    }
  }
  if (plainTwoColumn) {
    await setViewport(page, 1024, 768, root);
    const geometry = await columnsOf(root);
    expect(geometry.cols.length, ".widget-col elements in the root at 1024px").toBeGreaterThanOrEqual(2);
    const first = geometry.cols[0] as { top: number };
    const second = geometry.cols[1] as { top: number };
    near(second.top, first.top, 1, "both columns start at the same height at 1024px");
  }
}

/** Hook 4. The page never scrolls sideways at 768, 1023, 1024 and 1440. */
export async function expectNoHorizontalPageScroll(page: Page, root: Locator): Promise<void> {
  for (const width of [768, 1023, 1024, 1440]) {
    await setViewport(page, width, 900, root);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, `document scroll width against client width at ${width}px`).toBeLessThanOrEqual(clientWidth);
  }
}

/** Hook 5. At 1440x900 no column holds content taller than itself. */
export async function expectColumnsFit(page: Page, root: Locator): Promise<void> {
  await setViewport(page, 1440, 900, root);
  const geometry = await columnsOf(root);
  expect(geometry.cols.length, ".widget-col elements in the root").toBeGreaterThan(0);
  for (const [i, col] of geometry.cols.entries()) {
    expect(col.overflow, `column ${i + 1} content is taller than the column by ${col.overflow}px`).toBeLessThanOrEqual(1);
  }
}

/**
 * Hook 6. Every labelled scroll region in the root has a name ending ", scrollable", every
 * `.widget-scroll` is such a region, and Tab from the focusable element just before the first
 * region lands on that region.
 */
export async function expectScrollRegions(page: Page, root: Locator): Promise<void> {
  await setViewport(page, 1440, 900, root);
  const regions = root.locator('[role="region"][tabindex="0"]');
  const count = await regions.count();
  expect(count, 'regions with role="region" and tabindex="0" in the root').toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const label = await regions.nth(i).getAttribute("aria-label");
    expect(label, `aria-label of scroll region ${i + 1}`).toMatch(/, scrollable$/);
  }
  expect(await root.locator(".widget-scroll").count(), ".widget-scroll elements in the root").toBeGreaterThan(0);
  await expect(root.locator('.widget-scroll:not([role="region"][tabindex="0"])'), ".widget-scroll elements that are not labelled regions").toHaveCount(0);

  // The focusable element that comes just before the first region in tab order.
  const before = await regions.first().evaluateHandle((region) => {
    // Content of a closed <details> keeps client rects in Chromium but cannot take focus; only the
    // summary of a closed details is a tab stop. Without this filter a link inside a closed details of
    // the widget above would be taken for the element "just before" the region.
    const insideClosedDetails = (el: HTMLElement): boolean => {
      for (let node = el.parentElement; node !== null; node = node.parentElement) {
        if (node instanceof HTMLDetailsElement && !node.open && !(el.tagName === "SUMMARY" && el.parentElement === node)) return true;
      }
      return false;
    };
    const focusable = [
      ...document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && !insideClosedDetails(el));
    const at = focusable.indexOf(region as HTMLElement);
    return at > 0 ? (focusable[at - 1] as HTMLElement) : null;
  });
  const previous = before.asElement();
  expect(previous, "a focusable element before the first scroll region").not.toBeNull();
  await (previous as NonNullable<typeof previous>).focus();
  await page.keyboard.press("Tab");
  await expect(regions.first(), "Tab from the element before it reaches the first scroll region").toBeFocused();
}

export type HeightStep = {
  /** Names the state in a failure message. */
  label: string;
  /** Drives the widget into one state. */
  run: () => Promise<void>;
};

/**
 * Hook 1 for states that need a different page load (tokenizer loading, download failed, island
 * never hydrated), where there is no first height to carry between steps. Reads the declared
 * `--widget-h` from the root's computed style, parses it as pixels, and asserts the measured
 * border-box height equals it within 0.5px. The caller sets a two-column viewport first.
 */
export async function expectHeightEquals(root: Locator, page: Page, state = "this state"): Promise<void> {
  // No script runs in the page for the measurement itself (a page with JavaScript off cannot wait
  // for animation frames): the check retries until layout has settled, and fails with the last numbers.
  void page;
  const declared = await root.evaluate((el) => getComputedStyle(el).getPropertyValue("--widget-h").trim());
  expect(declared, `--widget-h declared on the root (${state})`).toMatch(/^\d+(\.\d+)?px$/);
  const expected = Number.parseFloat(declared);
  await expect
    .poll(async () => Math.abs((await heightOf(root)) - expected), {
      message: `widget height in ${state} against the declared --widget-h of ${declared}`,
      timeout: 3000,
    })
    .toBeLessThanOrEqual(0.5);
}

/**
 * Hook 1 (D-01): the widget's outer height is the same in every state. Records the height before
 * the first step and after every step, and asserts each equals the first within 0.5px, naming the
 * state that broke it. The caller sets a two-column viewport (1024px or wider) first.
 */
export async function expectConstantHeight(root: Locator, steps: readonly HeightStep[]): Promise<void> {
  const page = root.page();
  await settle(page);
  const first = await heightOf(root);
  for (const step of steps) {
    await step.run();
    await settle(page);
    const height = await heightOf(root);
    expect(Math.abs(height - first), `widget height is ${height}px after "${step.label}", expected ${first}px`).toBeLessThanOrEqual(0.5);
  }
}

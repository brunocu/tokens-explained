import { expect, test, type Locator, type Page } from "@playwright/test";
import { LANGUAGES } from "../src/core/compare/languages.ts";
import { EXAMPLES } from "../src/core/examples.ts";
import {
  expectBreakout,
  expectColumnsFit,
  expectConstantHeight,
  expectHeightEquals,
  expectNoHorizontalPageScroll,
  expectScrollRegions,
  expectStacked,
  heightOf,
  openWidget,
  settle,
  WIDGETS,
  type HeightStep,
} from "./widget-layout.helpers.ts";

// Layout contract of the four Post 1 widgets (phase 2.2, D-03, D-04, D-14; UI-SPEC "Verification
// Hooks" 2 to 7). Written before any widget is converted, so every tagged test is RED against the
// site as it was before the rework, on purpose. Each of plans 02.2-02 to 02.2-06 turns its own
// widget green by running only its tag, for example:
//   npx playwright test --project=chromium e2e/widget-layout.spec.ts --grep @playground
// The full suite is run again in plan 02.2-07. Nothing here is skipped or marked as expected to
// fail: a red test is the signal that a widget is not converted yet.
//
// The height equality across states (hook 1) is added per widget by plans 02 to 06 with
// `expectConstantHeight`, because the states differ for each widget.

for (const entry of WIDGETS) {
  test.describe(`${entry.tag} layout`, () => {
    test(`${entry.tag} the root is a section with an accessible name, and it is a region`, async ({ page }) => {
      const root = await openWidget(page, entry);
      await expect(root).toHaveJSProperty("tagName", "SECTION");
      await expect(root).toHaveAttribute("aria-label", /\S/);
      // A section with a name is a region landmark; the root is the only one with its hook.
      await expect(page.getByRole("region").and(page.locator(entry.root))).toHaveCount(1);
    });

    test(`${entry.tag} breakout: 960px wide and centred on the text at 1440 and 1024`, async ({ page }) => {
      const root = await openWidget(page, entry);
      await expectBreakout(page, root);
    });

    test(`${entry.tag} stacks below 1024px with an automatic height`, async ({ page }) => {
      const root = await openWidget(page, entry);
      await expectStacked(page, root, entry.plainTwoColumn);
    });

    test(`${entry.tag} the page never scrolls sideways at 768, 1023, 1024 and 1440`, async ({ page }) => {
      const root = await openWidget(page, entry);
      await expectNoHorizontalPageScroll(page, root);
    });

    test(`${entry.tag} no column holds content taller than itself at 1440`, async ({ page }) => {
      const root = await openWidget(page, entry);
      await expectColumnsFit(page, root);
    });

    test(`${entry.tag} every scroll region is labelled, focusable and reached by Tab`, async ({ page }) => {
      const root = await openWidget(page, entry);
      await expectScrollRegions(page, root);
    });
  });
}

test("the removed controls are gone and no replacement character is on the page", async ({ page }) => {
  const playground = WIDGETS[0];
  if (playground === undefined) throw new Error("the widget registry has no playground entry");
  await openWidget(page, playground);
  await page.setViewportSize({ width: 1440, height: 900 });

  await expect(page.locator('input[name="view"]'), 'the "Show" radio group').toHaveCount(0);
  await expect(page.locator("[data-peek]"), "the peek switch").toHaveCount(0);

  const text = (await page.locator("main").textContent()) ?? "";
  expect(text, "a U+FFFD replacement character is on the page").not.toContain("�");
});

// ---------------------------------------------------------------------------------------------
// The playground: height across states, chip format, no-JavaScript form (plan 02.2-03, D-01, D-14
// hooks 1 and 8). The root is the same element in every test, so the declared height is read from
// its computed `--widget-h` instead of being written into the tests.

const GPT2_FILE = /tokenizers\/gpt2\.json$/;
const PLAYGROUND_SCRIPT = "**/_astro/Playground.*.js*";
const HEX_LINE = /^[0-9A-F]{2}( [0-9A-F]{2})*$/;
/** Exactly 1,000 characters (the limit), made of ordinary words so every token is a normal one. */
const THOUSAND = "Tokenization splits unusual words into pieces, but common words stay whole. ".repeat(14).slice(0, 1000);

function playgroundEntry() {
  const entry = WIDGETS[0];
  if (entry === undefined || entry.tag !== "@playground") throw new Error("the widget registry has no playground entry first");
  return entry;
}

async function setSize(page: Page, root: Locator, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await root.scrollIntoViewIfNeeded();
  await settle(page);
}

/** Every designed state of a ready playground, in the order the reader could reach them. */
function playgroundSteps(page: Page, root: Locator): HeightStep[] {
  const textarea = page.locator("#t");
  const details = root.locator("details[data-table]");
  const steps: HeightStep[] = EXAMPLES.map((example) => ({
    label: `example "${example.label}"`,
    run: async () => {
      await root.locator(`[data-example="${example.id}"]`).click();
      await expect(textarea).toHaveValue(example.text);
    },
  }));
  steps.push(
    {
      label: "Reset text",
      run: async () => {
        await root.locator("[data-reset]").click();
        await expect(textarea).not.toHaveValue("");
      },
    },
    {
      label: "empty text",
      run: async () => {
        await textarea.fill("");
        await expect(root.locator("[data-empty]")).toBeVisible();
        await expect(root.locator('[data-stat="tokens"] [data-stat-value]')).toHaveText("0");
      },
    },
    {
      label: "a 1,000-character paste",
      run: async () => {
        await textarea.fill(THOUSAND);
        await expect(root.locator("[data-limit]")).toBeVisible();
        await expect(root.locator('[data-stat="characters"] [data-stat-value]')).toHaveText("1000");
      },
    },
    {
      label: "the table details open",
      run: async () => {
        await details.locator("summary").click();
        await expect(details).toHaveAttribute("open", "");
      },
    },
    {
      label: "the table details closed again",
      run: async () => {
        await details.locator("summary").click();
        await expect(details).not.toHaveAttribute("open", "");
      },
    },
  );
  return steps;
}

for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [1024, 768],
] as const) {
  test(`@playground the height is the declared height in every designed state at ${width}x${height}`, async ({ page }) => {
    const root = await openWidget(page, playgroundEntry());
    await setSize(page, root, width, height);
    await expectHeightEquals(root, page, `default text at ${width}x${height}`);
    await expectConstantHeight(root, playgroundSteps(page, root));
    await expectHeightEquals(root, page, `the last state at ${width}x${height}`);
  });
}

test("@playground the height is the declared height while the tokenizer is loading and once it is ready", async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(GPT2_FILE, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("what-is-a-token/");
    const root = page.locator("[data-playground]");
    await root.scrollIntoViewIfNeeded();
    await expect(root).toHaveAttribute("data-state", "ready");
    await expect(root).toHaveAttribute("data-tokenizer", "loading");
    await expect(root.locator("[data-tokenizer-status]")).toBeVisible();
    await expectHeightEquals(root, page, "the tokenizer loading");
  } finally {
    release();
  }
  const root = page.locator("[data-playground]");
  await expect(root).toHaveAttribute("data-tokenizer", "ready");
  await expect(root.locator("[data-tokenizer-status]")).toHaveCount(0);
  await expectHeightEquals(root, page, "the tokenizer ready");
});

test("@playground the height is the declared height when the download failed, and only the textarea gives way", async ({ page }) => {
  await page.route(GPT2_FILE, (route) => route.abort("failed"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("what-is-a-token/");
  const root = page.locator("[data-playground]");
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-tokenizer", "failed");
  const error = root.locator("[data-tokenizer-load-error]");
  const retry = root.locator("[data-tokenizer-retry]");
  await expect(error).toBeVisible();
  await expect(retry).toBeVisible();
  await expectHeightEquals(root, page, "the download failed with Try again");

  const textarea = page.locator("#t");
  const left = root.locator(".widget-col").first();
  const [leftBox, textareaBox, errorBox, retryBox] = await Promise.all([
    left.boundingBox(),
    textarea.boundingBox(),
    error.boundingBox(),
    retry.boundingBox(),
  ]);
  if (leftBox === null || textareaBox === null || errorBox === null || retryBox === null) throw new Error("a box is missing");
  expect(errorBox.y, "the error sits below the textarea").toBeGreaterThanOrEqual(textareaBox.y + textareaBox.height - 0.5);
  expect(retryBox.y, "Try again sits below the error").toBeGreaterThanOrEqual(errorBox.y + errorBox.height - 0.5);
  for (const [name, box] of [
    ["error", errorBox],
    ["Try again", retryBox],
  ] as const) {
    expect(box.y, `${name} starts inside the left column`).toBeGreaterThanOrEqual(leftBox.y - 0.5);
    expect(box.y + box.height, `${name} ends inside the left column`).toBeLessThanOrEqual(leftBox.y + leftBox.height + 0.5);
  }
  expect(textareaBox.height, "the textarea keeps at least 96px").toBeGreaterThanOrEqual(96 - 0.5);
  const overflowOf = () =>
    root.evaluate((el) => [...el.querySelectorAll<HTMLElement>(".widget-col")].map((c) => c.scrollHeight - c.clientHeight));
  for (const [i, o] of (await overflowOf()).entries()) expect(o, `column ${i + 1} overflow in the failed state`).toBeLessThanOrEqual(1);

  // The tallest left-column state: the message, Try again, the privacy line AND the limit message at
  // once. A reader cannot type while the file is missing (the box is read-only), so the text is set
  // the way a paste event would, and the input handler does the rest. This is the state the declared
  // height is sized for; here the textarea is squeezed down to its floor, and nothing may overflow.
  await page.evaluate((text) => {
    const box = document.querySelector<HTMLTextAreaElement>("#t");
    if (box === null) throw new Error("no textarea");
    box.value = text;
    box.dispatchEvent(new Event("input", { bubbles: true }));
  }, THOUSAND);
  await expect(root.locator("[data-limit]")).toBeVisible();
  await expect(retry).toBeVisible();
  await expectHeightEquals(root, page, "the download failed with the limit message as well");
  for (const [i, o] of (await overflowOf()).entries()) expect(o, `column ${i + 1} overflow with every note showing`).toBeLessThanOrEqual(1);
  const squeezed = await textarea.boundingBox();
  if (squeezed === null) throw new Error("the textarea has no box");
  expect(squeezed.height, "the textarea keeps at least 96px with every note showing").toBeGreaterThanOrEqual(96 - 0.5);
});

test("@playground the height is the declared height when the island never hydrates, and Reload page is in the left column", async ({ page }) => {
  test.setTimeout(45_000);
  await page.route(PLAYGROUND_SCRIPT, (route) => route.abort());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("what-is-a-token/", { waitUntil: "domcontentloaded" });
  const root = page.locator("[data-playground]");
  await root.scrollIntoViewIfNeeded();
  // The inline watcher gives up on the island after 8 seconds in view.
  await expect(root).toHaveAttribute("data-state", "failed", { timeout: 20_000 });
  await expectHeightEquals(root, page, "the island never hydrated");
  const reload = root.locator("[data-reload]");
  await expect(reload).toBeVisible();
  await expect(root.locator(".widget-col").first().locator("[data-reload]")).toBeVisible();
  const textareaBox = await page.locator("#t").boundingBox();
  if (textareaBox === null) throw new Error("the textarea has no box");
  expect(textareaBox.height, "the textarea keeps at least 96px").toBeGreaterThanOrEqual(96 - 0.5);
});

test("@playground every chip has a text line and an ID line, only partial chips show hex, and the chip count equals the table rows", async ({
  page,
}) => {
  const root = await openWidget(page, playgroundEntry());
  await setSize(page, root, 1440, 900);
  const details = root.locator("details[data-table]");
  await details.locator("summary").click();
  await root.locator("[data-show-ids]").check();
  for (const id of ["non-english", "emoji"]) {
    await root.locator(`[data-example="${id}"]`).click();
    await expect(root.locator("#t")).toHaveValue(EXAMPLES.find((e) => e.id === id)?.text ?? "");
    const chips = root.locator("[data-chip]");
    const count = await chips.count();
    expect(count, `${id}: chips on screen`).toBeGreaterThan(0);
    let partial = 0;
    for (let i = 0; i < count; i++) {
      const chip = chips.nth(i);
      const main = chip.locator("[data-chip-main]");
      const idLine = chip.locator("[data-chip-id]");
      await expect(main, `${id}: chip ${i + 1} has a text line`).toHaveCount(1);
      await expect(idLine, `${id}: chip ${i + 1} has an ID line`).toHaveCount(1);
      await expect(idLine, `${id}: chip ${i + 1} ID line`).toHaveText(/^\d+$/);
      await expect(chip.locator(":scope > *:not(.sr-only)"), `${id}: chip ${i + 1} has two lines and nothing else`).toHaveCount(2);
      if ((await chip.getAttribute("data-partial")) === "true") {
        partial += 1;
        await expect(main, `${id}: partial chip ${i + 1} shows hex on the top line`).toHaveText(HEX_LINE);
      } else {
        const top = ((await main.textContent()) ?? "").trim();
        expect(top, `${id}: whole chip ${i + 1} shows no hex on its top line`).not.toMatch(HEX_LINE);
        expect(top.length, `${id}: whole chip ${i + 1} top line is not empty`).toBeGreaterThan(0);
      }
    }
    expect(partial, `${id}: the example has partial chips and whole chips`).toBeGreaterThan(0);
    expect(partial, `${id}: the example has whole chips`).toBeLessThan(count);
    await expect(details.locator("tbody tr"), `${id}: chip count equals the table rows`).toHaveCount(count);
    expect(((await root.textContent()) ?? ""), `${id}: a U+FFFD replacement character is in the widget`).not.toContain("�");
  }
});

test("@playground without JavaScript the chips, counts and table are in the page, the controls are locked and the height is the declared height", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto("what-is-a-token/");
    const root = page.locator("[data-playground]");
    await root.scrollIntoViewIfNeeded();
    expect(await root.locator("[data-chip]").count(), "default chips").toBeGreaterThan(0);
    for (const name of ["tokens", "characters", "bytes"]) {
      await expect(root.locator(`[data-stat="${name}"] [data-stat-value]`)).toHaveText(/^\d+$/);
    }
    expect(await root.locator("details[data-table] tbody tr").count(), "table rows").toBeGreaterThan(0);
    await expect(page.locator("#t")).toHaveAttribute("readonly", "");
    for (const button of await root.locator("[data-example], [data-reset]").all()) await expect(button).toBeDisabled();
    await expectHeightEquals(root, page, "no JavaScript");
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------------------------
// The stepper: height across the 14 stages, the Next button's place, column fit, the compact chip
// and the recorded scroll state of its regions (plan 02.2-04, D-01, D-14 hooks 1 and 8).

const STEPPER_STAGES = 14;
const STEPPER_SCRIPT = "**/_astro/BpeStepper.*.js*";

function stepperEntry() {
  const entry = WIDGETS[1];
  if (entry === undefined || entry.tag !== "@stepper") throw new Error("the widget registry has no stepper entry second");
  return entry;
}

/** The current stage number (1 to 14) read from the stage line. */
async function stepperStage(root: Locator): Promise<number> {
  const text = (await root.locator("[data-step-status]").textContent()) ?? "";
  const match = /^Step (\d+) of /.exec(text);
  if (match === null) throw new Error(`the stage line says "${text}"`);
  return Number(match[1]);
}

/** One press of Next, waiting until the stage line moves on. Run under reduced motion, so no fuse. */
async function stepperNext(root: Locator): Promise<void> {
  const before = await stepperStage(root);
  await root.locator("[data-next]").click();
  await expect.poll(() => stepperStage(root)).toBe(before + 1);
}

/** Every designed way to move through the stepper: 13 presses of Next, Back to the start, Run to end, Reset. */
function stepperSteps(root: Locator): HeightStep[] {
  const steps: HeightStep[] = [];
  for (let stage = 2; stage <= STEPPER_STAGES; stage++) {
    steps.push({ label: `Next to stage ${stage} of ${STEPPER_STAGES}`, run: () => stepperNext(root) });
  }
  steps.push(
    {
      label: "Back to stage 1",
      run: async () => {
        for (let i = 0; i < STEPPER_STAGES - 1; i++) await root.locator("[data-back]").click();
        await expect.poll(() => stepperStage(root)).toBe(1);
      },
    },
    {
      label: "Run to end",
      run: async () => {
        await root.locator("[data-run]").click();
        await expect.poll(() => stepperStage(root)).toBe(STEPPER_STAGES);
      },
    },
    {
      label: "Reset",
      run: async () => {
        await root.locator("[data-reset]").click();
        await expect.poll(() => stepperStage(root)).toBe(1);
      },
    },
  );
  return steps;
}

for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [1024, 768],
] as const) {
  test(`@stepper the height is the declared height at all 14 stages, Back, Run to end and Reset at ${width}x${height}`, async ({ page }) => {
    // The fuse animation is bypassed here only: this test is about size, not motion.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const root = await openWidget(page, stepperEntry());
    await setSize(page, root, width, height);
    await expectHeightEquals(root, page, `stage 1 at ${width}x${height}`);
    await expectConstantHeight(root, stepperSteps(root));
    await expectHeightEquals(root, page, `the last state at ${width}x${height}`);
  });
}

test("@stepper the height is the declared height while the script loads and when it never loads", async ({ page }) => {
  test.setTimeout(45_000);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(STEPPER_SCRIPT, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("what-is-a-token/", { waitUntil: "domcontentloaded" });
    const root = page.locator("[data-stepper]");
    await root.scrollIntoViewIfNeeded();
    await expect(root).toHaveAttribute("data-state", "loading");
    await expectHeightEquals(root, page, "the script loading (the first stage server-rendered)");
    await expect(root.locator("[data-next]")).toBeDisabled();
    // The inline watcher gives up on the island after 8 seconds in view.
    await expect(root).toHaveAttribute("data-state", "failed", { timeout: 20_000 });
    await expectHeightEquals(root, page, "the script never loads");
    await expect(root.locator(".widget-col").first().locator("[data-reload]")).toBeVisible();
  } finally {
    release();
  }
  const root = page.locator("[data-stepper]");
  await expect(root).toHaveAttribute("data-state", "ready");
  await expectHeightEquals(root, page, "the script loaded late");
});

test("@stepper without JavaScript the first stage is in the page, Next is disabled and the height is the declared height", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto("what-is-a-token/");
    const root = page.locator("[data-stepper]");
    await root.scrollIntoViewIfNeeded();
    await expect(root.locator("[data-chars] [data-step-chip]")).toHaveCount(49);
    await expect(root.locator("[data-next]")).toBeDisabled();
    await expectHeightEquals(root, page, "no JavaScript");
  } finally {
    await context.close();
  }
});

test("@stepper the Next button stays in the same place at all 14 stages", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const root = await openWidget(page, stepperEntry());
  await setSize(page, root, 1440, 900);
  const buttons = ["[data-back]", "[data-next]", "[data-run]", "[data-reset]"];
  const tops = async () => {
    const out: number[] = [];
    for (const hook of buttons) {
      const box = await root.locator(hook).boundingBox();
      if (box === null) throw new Error(`${hook} has no box`);
      out.push(box.y - (await root.boundingBox().then((b) => b?.y ?? 0)));
    }
    return out;
  };
  const first = await tops();
  for (let stage = 2; stage <= STEPPER_STAGES; stage++) {
    await stepperNext(root);
    await settle(page);
    const now = await tops();
    for (const [i, top] of now.entries()) {
      expect(Math.abs(top - (first[i] as number)), `${buttons[i]} top at stage ${stage}: ${top}px against ${first[i]}px at stage 1`).toBeLessThanOrEqual(1);
    }
  }
});

test("@stepper no column holds content taller than itself at any of the 14 stages", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const root = await openWidget(page, stepperEntry());
  await setSize(page, root, 1440, 900);
  const overflow = () =>
    root.evaluate((el) => [...el.querySelectorAll<HTMLElement>(".widget-col")].map((c) => c.scrollHeight - c.clientHeight));
  for (let stage = 1; stage <= STEPPER_STAGES; stage++) {
    if (stage > 1) await stepperNext(root);
    await settle(page);
    for (const [i, o] of (await overflow()).entries()) {
      expect(o, `column ${i + 1} overflows by ${o}px at stage ${stage}`).toBeLessThanOrEqual(1);
    }
  }
});

test("@stepper a chip has a text line over an ID line and is about 46px high", async ({ page }) => {
  const root = await openWidget(page, stepperEntry());
  await setSize(page, root, 1440, 900);
  await root.locator("[data-next]").click();
  await expect.poll(() => stepperStage(root)).toBe(2);
  const chips = root.locator("[data-words] [data-step-chip]");
  const count = await chips.count();
  expect(count, "chips at stage 2").toBe(49);
  for (const index of [0, 10, 25, count - 1]) {
    const chip = chips.nth(index);
    await expect(chip.locator(".stack-chip-text"), `chip ${index + 1} has a text line`).toHaveCount(1);
    await expect(chip.locator(".stack-chip-id"), `chip ${index + 1} has an ID line`).toHaveText(/^\d+$/);
    await expect(chip.locator(":scope > *"), `chip ${index + 1} has two lines and nothing else`).toHaveCount(2);
    const height = await heightOf(chip);
    expect(Math.abs(height - 46), `chip ${index + 1} is ${height}px high`).toBeLessThanOrEqual(4);
  }
});

test("@stepper record: which regions scroll at each of the 14 stages (never fails on scroll)", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const root = await openWidget(page, stepperEntry());
  await setSize(page, root, 1440, 900);
  const rows: string[] = [];
  for (let stage = 1; stage <= STEPPER_STAGES; stage++) {
    if (stage > 1) await stepperNext(root);
    await settle(page);
    const result = await root.evaluate((el) => {
      const read = (name: string) => {
        const region = el.querySelector<HTMLElement>(`[role="region"][aria-label="${name}"]`);
        return region === null ? null : { scroll: region.scrollHeight, client: region.clientHeight };
      };
      return { words: read("The words, scrollable"), why: read("Explanation, scrollable"), pairs: read("Pair counts, scrollable") };
    });
    const show = (r: { scroll: number; client: number } | null) =>
      r === null ? "absent" : r.scroll > r.client + 1 ? `SCROLLS (${r.scroll}/${r.client})` : `fits (${r.scroll}/${r.client})`;
    rows.push(`stage ${stage}: words ${show(result.words)}; explanation ${show(result.why)}; pair table ${show(result.pairs)}`);
  }
  const table = rows.join("\n");
  console.log(`\n${testInfo.project.name} stepper region record\n${table}`);
  await testInfo.attach("stepper-region-record", { body: table, contentType: "text/plain" });
});

// ---------------------------------------------------------------------------------------------
// The comparison: height across the five examples, edited and emptied text, GPT-2 loading, error
// and ready, BERT idle, loading, ready and error, and both details open; the rows-fit guard and the
// recorded scroll state of the rows region (plan 02.2-05, D-01, D-02, D-14 hook 1).

const BERT_FILE = /tokenizers\/bert-uncased\.json$/;
const COMPARE_SCRIPT = "**/_astro/Comparison.*.js*";
const GPT2_REGION = '[role="region"][aria-label="GPT-2 tokens, scrollable"]';
const BERT_REGION = '[role="region"][aria-label="BERT tokens, scrollable"]';

function compareEntry() {
  const entry = WIDGETS[2];
  if (entry === undefined || entry.tag !== "@compare") throw new Error("the widget registry has no comparison entry third");
  return entry;
}

/** Open the comparison with GPT-2 downloaded, so the text box is editable. */
async function openCompareReady(page: Page): Promise<Locator> {
  const root = await openWidget(page, compareEntry());
  await expect(root).toHaveAttribute("data-compare-gpt2", "ready");
  return root;
}

/** Pick an example the way a reader does: click its label in the picker. */
async function compareChoose(root: Locator, id: string): Promise<void> {
  const example = EXAMPLES.find((e) => e.id === id);
  if (example === undefined) throw new Error(`no example ${id}`);
  await root.locator(`button[data-example="${id}"]`).click();
  await expect(root.locator("#compare-input")).toHaveValue(example.text);
}

/** Every designed state of a ready comparison, in the order the reader could reach them. */
function compareSteps(root: Locator): HeightStep[] {
  const input = root.locator("#compare-input");
  const steps: HeightStep[] = EXAMPLES.map((example) => ({
    label: `example "${example.label}"`,
    run: () => compareChoose(root, example.id),
  }));
  steps.push(
    {
      label: "edited text",
      run: async () => {
        await input.fill("Unbelievable results, 2026!");
        await expect(root.locator("[data-note]")).toHaveCount(1);
      },
    },
    {
      label: "the text box emptied",
      run: async () => {
        await input.fill("");
        await expect(root.locator('[data-row="gpt2"] [data-empty]')).toBeVisible();
        await expect(root.locator('[data-row="gpt2"] [data-empty]')).not.toBeEmpty();
      },
    },
    {
      label: "Reset text",
      run: async () => {
        await root.locator("[data-reset]").click();
        await expect(root.locator("[data-note]")).toHaveCount(1);
        await expect(input).not.toHaveValue("");
      },
    },
  );
  return steps;
}

for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [1024, 768],
] as const) {
  test(`@compare the height is the declared height across the examples, edited and emptied text and Reset text at ${width}x${height}`, async ({
    page,
  }) => {
    const root = await openCompareReady(page);
    await setSize(page, root, width, height);
    await expectHeightEquals(root, page, `the first example at ${width}x${height}`);
    await expectConstantHeight(root, compareSteps(root));
    await expectHeightEquals(root, page, `the last state at ${width}x${height}`);
  });
}

test("@compare the height is the declared height while the script loads and when it never loads", async ({ page }) => {
  test.setTimeout(45_000);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(COMPARE_SCRIPT, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("what-is-a-token/", { waitUntil: "domcontentloaded" });
    const root = page.locator("[data-compare]");
    await root.scrollIntoViewIfNeeded();
    await expect(root).toHaveAttribute("data-state", "loading");
    await expectHeightEquals(root, page, "the script loading (the first example server-rendered)");
    await expect(root.locator("button[data-example]").first()).toBeDisabled();
    await expect(root.locator('[data-row="gpt2"]')).toBeVisible();
    // The inline watcher gives up on the island after 8 seconds in view.
    await expect(root).toHaveAttribute("data-state", "failed", { timeout: 20_000 });
    await expectHeightEquals(root, page, "the script never loads");
    await expect(root.locator(".widget-col").first().locator("[data-reload]")).toBeVisible();
    await expect(root.locator(".widget-col").first().locator("[data-compare-text]")).toBeVisible();
  } finally {
    release();
  }
  const root = page.locator("[data-compare]");
  await expect(root).toHaveAttribute("data-state", "ready");
  await expectHeightEquals(root, page, "the script loaded late");
});

test("@compare without JavaScript the first example is in the page, the picker is locked and the height is the declared height", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto("what-is-a-token/");
    const root = page.locator("[data-compare]");
    await root.scrollIntoViewIfNeeded();
    await expect(root.locator("[data-row]")).toHaveCount(2);
    await expect(root.locator("[data-compare-text]")).toBeVisible();
    await expect(root.locator("button[data-example]").first()).toBeDisabled();
    await expectHeightEquals(root, page, "no JavaScript");
  } finally {
    await context.close();
  }
});

test("@compare the height is the declared height while GPT-2 loads and once it is ready", async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(GPT2_FILE, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("what-is-a-token/");
    const root = page.locator("[data-compare]");
    await root.scrollIntoViewIfNeeded();
    await expect(root).toHaveAttribute("data-state", "ready");
    await expect(root).toHaveAttribute("data-compare-gpt2", "loading");
    await expect(root.locator('[data-compare-loading="gpt2"]')).toBeVisible();
    await expectHeightEquals(root, page, "GPT-2 loading");
    const box = await root.locator("[data-compare-text]").boundingBox();
    expect(box?.height ?? 0, "the static text box keeps at least 96px").toBeGreaterThanOrEqual(96 - 0.5);
  } finally {
    release();
  }
  const root = page.locator("[data-compare]");
  await expect(root).toHaveAttribute("data-compare-gpt2", "ready");
  await expect(root.locator('[data-compare-loading="gpt2"]')).toHaveCount(0);
  await expectHeightEquals(root, page, "GPT-2 ready");
});

test("@compare the height is the declared height when the GPT-2 download failed, and only the text box gives way", async ({ page }) => {
  await page.route(GPT2_FILE, (route) => route.abort("failed"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("what-is-a-token/");
  const root = page.locator("[data-compare]");
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-compare-gpt2", "error");
  const error = root.locator('[data-compare-error="gpt2"]');
  const retry = root.locator('[data-retry="gpt2"]');
  await expect(error).toBeVisible();
  await expect(retry).toBeVisible();
  await expectHeightEquals(root, page, "GPT-2 failed with Try again");

  const left = root.locator(".widget-col").first();
  const [leftBox, textBox, errorBox, retryBox] = await Promise.all([
    left.boundingBox(),
    root.locator("[data-compare-text]").boundingBox(),
    error.boundingBox(),
    retry.boundingBox(),
  ]);
  if (leftBox === null || textBox === null || errorBox === null || retryBox === null) throw new Error("a box is missing");
  expect(errorBox.y, "the error sits below the text box").toBeGreaterThanOrEqual(textBox.y + textBox.height - 0.5);
  expect(retryBox.y, "Try again sits below the error").toBeGreaterThanOrEqual(errorBox.y + errorBox.height - 0.5);
  for (const [name, box] of [
    ["error", errorBox],
    ["Try again", retryBox],
  ] as const) {
    expect(box.y, `${name} starts inside the left column`).toBeGreaterThanOrEqual(leftBox.y - 0.5);
    expect(box.y + box.height, `${name} ends inside the left column`).toBeLessThanOrEqual(leftBox.y + leftBox.height + 0.5);
  }
  expect(textBox.height, "the text box keeps at least 96px").toBeGreaterThanOrEqual(96 - 0.5);
  const overflow = await root.evaluate((el) => [...el.querySelectorAll<HTMLElement>(".widget-col")].map((c) => c.scrollHeight - c.clientHeight));
  for (const [i, o] of overflow.entries()) expect(o, `column ${i + 1} overflow in the failed state`).toBeLessThanOrEqual(1);
});

test("@compare the height is the declared height with BERT idle, loading, ready and failed", async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const root = await (async () => {
    await page.route(BERT_FILE, async (route) => {
      await gate;
      await route.continue();
    });
    return openCompareReady(page);
  })();
  await setSize(page, root, 1440, 900);
  await expect(root).toHaveAttribute("data-compare-bert", "idle");
  await expect(root.locator("[data-load]")).toBeVisible();
  await expectHeightEquals(root, page, "BERT idle");

  await root.locator("[data-load]").click();
  await expect(root).toHaveAttribute("data-compare-bert", "loading");
  await expect(root.locator('[data-compare-loading="bert"]')).toBeVisible();
  await expectHeightEquals(root, page, "BERT loading");

  release();
  await expect(root).toHaveAttribute("data-compare-bert", "ready");
  await expect(root.locator("[data-load]")).toHaveCount(0);
  await expectHeightEquals(root, page, "BERT ready");
  // BERT ready with typed text: both rows are live.
  await root.locator("#compare-input").fill("Unbelievable results, 2026!");
  await expect(root.locator('[data-row="bert"]')).toBeVisible();
  await expectHeightEquals(root, page, "BERT ready with typed text");
});

test("@compare the height is the declared height when the BERT download failed, and Try again replaces the idle paragraph in place", async ({
  page,
}) => {
  await page.route(BERT_FILE, (route) => route.fulfill({ status: 404, body: "not found" }));
  const root = await openCompareReady(page);
  await setSize(page, root, 1440, 900);
  const idle = await root.locator(".bert").boundingBox();
  await root.locator("[data-load]").click();
  await expect(root).toHaveAttribute("data-compare-bert", "error");
  const error = root.locator('[data-compare-error="bert"]');
  await expect(error).toBeVisible();
  await expect(root.locator('[data-retry="bert"]')).toBeVisible();
  await expectHeightEquals(root, page, "BERT failed with Try again");
  const failed = await root.locator(".bert").boundingBox();
  if (idle === null || failed === null) throw new Error("the BERT block has no box");
  // The error and Try again take the idle paragraph's place in the same block: the idle paragraph is
  // gone, the block still ends at the same place, and only the text box above it gives way.
  await expect(root.locator(".bert .intro")).toHaveCount(0);
  await expect(root.locator(".bert").locator('[data-compare-error="bert"]')).toBeVisible();
  expect(Math.abs(failed.y + failed.height - (idle.y + idle.height)), "the BERT block ends where it ended when idle").toBeLessThanOrEqual(1);
  const overflow = await root.evaluate((el) => [...el.querySelectorAll<HTMLElement>(".widget-col")].map((c) => c.scrollHeight - c.clientHeight));
  for (const [i, o] of overflow.entries()) expect(o, `column ${i + 1} overflow in the BERT failed state`).toBeLessThanOrEqual(1);
});

test("@compare the page never scrolls sideways at 768, 1023, 1024 and 1440", async ({ page }) => {
  const root = await openCompareReady(page);
  await setSize(page, root, 1440, 900);
  await expectNoHorizontalPageScroll(page, root);
});

test("@compare the GPT-2 and BERT regions are stacked, have the same height, and keep their header outside the region", async ({ page }) => {
  const root = await openCompareReady(page);
  await setSize(page, root, 1440, 900);
  for (const example of EXAMPLES) {
    await compareChoose(root, example.id);
    await settle(page);
    const boxes = await root.evaluate(
      (el, selectors) => {
        const [gpt2, bert] = selectors.map((selector) => el.querySelector<HTMLElement>(selector));
        if (gpt2 == null || bert == null) return null;
        const a = gpt2.getBoundingClientRect();
        const b = bert.getBoundingClientRect();
        return {
          gpt2Height: a.height,
          bertHeight: b.height,
          gpt2Bottom: a.bottom,
          bertTop: b.top,
          // The row group is the region's parent, and its name and count sit outside the region.
          gpt2Rows: [gpt2.parentElement?.getAttribute("data-row")],
          bertRows: [bert.parentElement?.getAttribute("data-row")],
          headerInside: [...gpt2.querySelectorAll("[data-row-count], .island-label"), ...bert.querySelectorAll("[data-row-count], .island-label")].length,
          headerAbove: [gpt2, bert].map((region) => region.previousElementSibling?.className.includes("top") === true),
        };
      },
      [GPT2_REGION, BERT_REGION],
    );
    if (boxes === null) throw new Error(`${example.id}: a tokenizer region is missing`);
    expect(Math.abs(boxes.gpt2Height - boxes.bertHeight), `${example.id}: the two regions differ in height`).toBeLessThanOrEqual(1);
    expect(boxes.bertTop, `${example.id}: BERT sits below GPT-2`).toBeGreaterThanOrEqual(boxes.gpt2Bottom - 0.5);
    expect(boxes.gpt2Rows, example.id).toEqual(["gpt2"]);
    expect(boxes.bertRows, example.id).toEqual(["bert"]);
    expect(boxes.headerInside, `${example.id}: a header is inside a scroll region`).toBe(0);
    expect(boxes.headerAbove, `${example.id}: each header sits right above its region`).toEqual([true, true]);
  }
});

test("@compare record: whether each tokenizer region scrolls for each example (never fails on scroll)", async ({ page }, testInfo) => {
  const root = await openCompareReady(page);
  await setSize(page, root, 1440, 900);
  const lines: string[] = [];
  for (const example of EXAMPLES) {
    await compareChoose(root, example.id);
    await settle(page);
    const regions = await root.evaluate(
      (el, selectors) => {
        const note = el.querySelector<HTMLElement>("[data-note]");
        return {
          regions: selectors.map((selector) => {
            const node = el.querySelector<HTMLElement>(selector);
            return node === null ? null : { scroll: node.scrollHeight, client: node.clientHeight };
          }),
          noteHeight: note === null ? 0 : Math.round(note.getBoundingClientRect().height),
        };
      },
      [GPT2_REGION, BERT_REGION],
    );
    const [gpt2, bert] = regions.regions;
    if (gpt2 == null || bert == null) throw new Error(`${example.id}: a tokenizer region is missing`);
    const describe = (name: string, r: { scroll: number; client: number }): string =>
      `${name} ${r.scroll - r.client > 1 ? `SCROLLS by ${r.scroll - r.client}px (${r.scroll}/${r.client})` : `fits (${r.scroll}/${r.client})`}`;
    lines.push(`${example.id}: ${describe("GPT-2", gpt2)}; ${describe("BERT", bert)}; note ${regions.noteHeight}px high`);
  }
  const table = lines.join("\n");
  console.log(`\n${testInfo.project.name} comparison region record\n${table}`);
  await testInfo.attach("comparison-region-record", { body: table, contentType: "text/plain" });
});

// ---------------------------------------------------------------------------------------------
// The languages widget: height across the six chosen languages with each details open, the loading,
// never-hydrates and no-JavaScript states, the placement of the lower row under the table band, the
// fit guard and the recorded scroll state of the results region (plan 02.2-06, D-01, D-02, D-14
// hook 1).

const LANGUAGES_SCRIPT = "**/_astro/LanguagesWidget.*.js*";
const RESULTS_REGION = '[role="region"][aria-label="Pieces for the chosen language, scrollable"]';
const TABLE_REGION = '[role="region"][aria-label="Token counts by language, scrollable"]';

function languagesEntry() {
  const entry = WIDGETS[3];
  if (entry === undefined || entry.tag !== "@languages") throw new Error("the widget registry has no languages entry fourth");
  return entry;
}

/** Choose a language the way a reader does: click its label in the picker. */
async function languagesChoose(root: Locator, id: string): Promise<void> {
  const language = LANGUAGES.find((item) => item.id === id);
  if (language === undefined) throw new Error(`no language ${id}`);
  await root.locator("label.opt", { hasText: language.name }).click();
  await expect(root.locator(`input[type="radio"][value="${id}"]`)).toBeChecked();
  // Choosing the language already shown fires no change, so it announces nothing.
  if (id !== "en") await expect(root.locator("[data-announce]")).toContainText(`Showing ${language.name}.`);
}

/** Every designed state of a ready languages widget, in the order the reader could reach them. */
function languagesSteps(root: Locator): HeightStep[] {
  const steps: HeightStep[] = LANGUAGES.filter((language) => language.id !== "en").map((language) => ({
    label: `language "${language.name}"`,
    run: () => languagesChoose(root, language.id),
  }));
  // English last, so the longest rows meet the shortest and the widget returns to its first state.
  const english = LANGUAGES.find((language) => language.id === "en");
  if (english !== undefined) steps.push({ label: `language "${english.name}"`, run: () => languagesChoose(root, english.id) });
  return steps;
}

for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [1024, 768],
] as const) {
  test(`@languages the height is the declared height across the six languages at ${width}x${height}`, async ({
    page,
  }) => {
    const root = await openWidget(page, languagesEntry());
    await setSize(page, root, width, height);
    await expectHeightEquals(root, page, `English at ${width}x${height}`);
    await expectConstantHeight(root, languagesSteps(root));
    await expectHeightEquals(root, page, `the last state at ${width}x${height}`);
  });
}

test("@languages the height is the declared height while the script loads and when it never loads", async ({ page }) => {
  test.setTimeout(45_000);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(LANGUAGES_SCRIPT, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("what-is-a-token/", { waitUntil: "domcontentloaded" });
    const root = page.locator("[data-languages]");
    await root.scrollIntoViewIfNeeded();
    await expect(root).toHaveAttribute("data-state", "loading");
    await expectHeightEquals(root, page, "the script loading (English server-rendered)");
    await expect(root.locator('input[type="radio"]').first()).toBeDisabled();
    await expect(root.locator("[data-languages-table]")).toBeVisible();
    await expect(root.locator('[data-lang-row="en"] [data-table-sentence]')).toBeVisible();
    // The inline watcher gives up on the island after 8 seconds in view.
    await expect(root).toHaveAttribute("data-state", "failed", { timeout: 20_000 });
    await expectHeightEquals(root, page, "the script never loads");
    // The failed line and Reload page sit in the first band, with the table below them.
    const band = root.locator(".widget-col").first();
    await expect(band.locator("[data-reload]")).toBeVisible();
    await expect(band.locator("[data-languages-table]")).toBeVisible();
    await expect(root.locator('[data-lang-row="en"] [data-table-sentence]')).toBeVisible();
    await expect(root.locator('[data-row="gpt2"]')).toBeVisible();
    // The failed line and its button make the band taller, so the lower row is shorter. Nothing may
    // spill out of the card: a column's content stays inside the card's padding (24px).
    const spill = await root.evaluate((el) => {
      const own = el.getBoundingClientRect().bottom;
      return [...el.querySelectorAll<HTMLElement>(".widget-col")].map((col) => {
        const last = col.lastElementChild;
        return last === null ? 0 : Math.round(last.getBoundingClientRect().bottom - (own - 25));
      });
    });
    console.log(`languages failed state: bottom of each column's last child against the card's inner edge: ${spill.join(", ")}px`);
    for (const [i, over] of spill.entries()) expect(over, `column ${i + 1} spills ${over}px past the card's inner edge`).toBeLessThanOrEqual(0.5);
  } finally {
    release();
  }
  const root = page.locator("[data-languages]");
  await expect(root).toHaveAttribute("data-state", "ready");
  await expectHeightEquals(root, page, "the script loaded late");
});

test("@languages without JavaScript the table and English are in the page, the picker is locked and the height is the declared height", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto("what-is-a-token/");
    const root = page.locator("[data-languages]");
    await root.scrollIntoViewIfNeeded();
    await expect(root.locator("[data-lang-row]")).toHaveCount(6);
    await expect(root.locator("[data-row]")).toHaveCount(2);
    await expect(root.locator('[data-lang-row="en"] [data-table-sentence]')).toBeVisible();
    await expect(root.locator('input[type="radio"]').first()).toBeDisabled();
    await expect(root.locator('input[type="radio"][value="en"]')).toBeChecked();
    await expectHeightEquals(root, page, "no JavaScript");
  } finally {
    await context.close();
  }
});

test("@languages the picker and the results start at the same height, below the table band, at 1024 and 1440", async ({ page }) => {
  const root = await openWidget(page, languagesEntry());
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
  ] as const) {
    await setSize(page, root, width, height);
    const geometry = await root.evaluate(
      (el, selectors) => {
        const cols = [...el.querySelectorAll<HTMLElement>(".widget-col")];
        const top = (node: Element | null): number => (node === null ? Number.NaN : node.getBoundingClientRect().top);
        const bottom = (node: Element | null): number => (node === null ? Number.NaN : node.getBoundingClientRect().bottom);
        return {
          count: cols.length,
          bandBottom: bottom(cols[0] ?? null),
          tableBottom: bottom(el.querySelector(selectors.table)),
          pickerTop: top(el.querySelector("fieldset.picker")),
          leftTop: top(cols[1] ?? null),
          resultsTop: top(el.querySelector(selectors.results)),
          rightTop: top(cols[2] ?? null),
        };
      },
      { table: TABLE_REGION, results: RESULTS_REGION },
    );
    const at = `at ${width}px`;
    expect(geometry.count, `.widget-col elements ${at}`).toBe(3);
    expect(geometry.tableBottom, `the table region ends inside the band ${at}`).toBeLessThanOrEqual(geometry.bandBottom + 0.5);
    expect(Math.abs(geometry.pickerTop - geometry.resultsTop), `picker top against results top ${at}`).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.leftTop - geometry.rightTop), `left column top against right column top ${at}`).toBeLessThanOrEqual(1);
    expect(geometry.pickerTop, `the picker sits below the band ${at}`).toBeGreaterThanOrEqual(geometry.bandBottom - 0.5);
    expect(geometry.resultsTop, `the results sit below the band ${at}`).toBeGreaterThanOrEqual(geometry.bandBottom - 0.5);
  }
});

test("@languages the table, the picker and the note are fully visible, and so is the first English row", async ({ page }) => {
  const root = await openWidget(page, languagesEntry());
  await setSize(page, root, 1440, 900);
  await settle(page);
  const fit = await root.evaluate(
    (el, selectors) => {
      const cols = [...el.querySelectorAll<HTMLElement>(".widget-col")];
      const [band, left, right] = cols as [HTMLElement, HTMLElement, HTMLElement];
      const tableRegion = el.querySelector<HTMLElement>(selectors.table);
      const results = el.querySelector<HTMLElement>(selectors.results);
      const picker = el.querySelector<HTMLElement>("fieldset.picker");
      const note = el.querySelector<HTMLElement>("[data-note]");
      const gpt2 = el.querySelector<HTMLElement>('[data-row="gpt2"]');
      if (tableRegion === null || results === null || picker === null || note === null || gpt2 === null) return null;
      const visibleBottom = results.getBoundingClientRect().top + results.clientTop + results.clientHeight;
      return {
        columnOverflow: [band, left, right].map((col) => col.scrollHeight - col.clientHeight),
        tableRegionVertical: tableRegion.scrollHeight - tableRegion.clientHeight,
        tableRegionHorizontal: tableRegion.scrollWidth - tableRegion.clientWidth,
        pickerBelowLeftBottom: picker.getBoundingClientRect().bottom - left.getBoundingClientRect().bottom,
        noteBelowLeftBottom: note.getBoundingClientRect().bottom - left.getBoundingClientRect().bottom,
        scrollTop: results.scrollTop,
        gpt2BelowVisible: gpt2.getBoundingClientRect().bottom - visibleBottom,
        openDetails: el.querySelectorAll("details[open]").length,
      };
    },
    { table: TABLE_REGION, results: RESULTS_REGION },
  );
  if (fit === null) throw new Error("the table region, the results region, the picker, the note or the GPT-2 row is missing");
  expect(fit.openDetails, "every details is closed").toBe(0);
  for (const [i, overflow] of fit.columnOverflow.entries()) expect(overflow, `column ${i + 1} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
  expect(fit.tableRegionVertical, "the table region does not scroll vertically").toBeLessThanOrEqual(1);
  expect(fit.tableRegionHorizontal, "the table region does not scroll sideways at 1440px").toBeLessThanOrEqual(1);
  expect(fit.pickerBelowLeftBottom, "the picker ends inside the left column").toBeLessThanOrEqual(0.5);
  expect(fit.noteBelowLeftBottom, "the note ends inside the left column").toBeLessThanOrEqual(0.5);
  expect(fit.scrollTop, "the results region is at its top").toBe(0);
  expect(fit.gpt2BelowVisible, `the English GPT-2 row ends ${fit.gpt2BelowVisible}px below the visible part of the results region`).toBeLessThanOrEqual(0.5);
});

test("@languages the page never scrolls sideways at 768, 1023, 1024 and 1440 with Arabic chosen", async ({ page }) => {
  const root = await openWidget(page, languagesEntry());
  await setSize(page, root, 1440, 900);
  await languagesChoose(root, "ar");
  await expectNoHorizontalPageScroll(page, root);
});

// ---------------------------------------------------------------------------------------------
// The details sweep (plan 02.2-07, UI-SPEC hook 4 and UI Considerations "breakout and stacked
// range"): with EVERY details element of a widget open, the page does not scroll sideways at 768,
// 1023, 1024 and 1440, and from 1024px up the widget still has its declared height.

for (const entry of WIDGETS) {
  test(`${entry.tag} with every details element open the page never scrolls sideways at 768, 1023, 1024 and 1440 and the height is the declared height`, async ({
    page,
  }) => {
    const root = await openWidget(page, entry);
    await setSize(page, root, 1440, 900);
    const details = root.locator("details");
    // The stepper has no details element: for it the loop below opens nothing and the sweep still
    // checks the sideways scroll and the height at the four widths.
    const count = await details.count();
    // In document order, so a details nested in another is opened after its parent.
    for (let i = 0; i < count; i++) {
      const item = details.nth(i);
      if ((await item.getAttribute("open")) === null) await item.locator("> summary").click();
      await expect(item, `details ${i + 1} of ${count} is open`).toHaveAttribute("open", "");
    }
    for (const width of [768, 1023, 1024, 1440]) {
      await setSize(page, root, width, 900);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `document scroll width against client width at ${width}px with every details open`).toBeLessThanOrEqual(clientWidth);
      // Below 1024px the widget is as tall as its content; from 1024px it has its declared height.
      if (width >= 1024) await expectHeightEquals(root, page, `every details open at ${width}px`);
    }
  });
}

test("@languages record: whether the results region scrolls for each language (never fails on scroll)", async ({ page }, testInfo) => {
  const root = await openWidget(page, languagesEntry());
  await setSize(page, root, 1440, 900);
  const lines: string[] = [];
  const measure = (): Promise<{ scroll: number; client: number; gpt2Bottom: number; bertBottom: number } | null> =>
    root.evaluate((el, selector) => {
      const region = el.querySelector<HTMLElement>(selector);
      const gpt2 = el.querySelector<HTMLElement>('[data-row="gpt2"]');
      const bert = el.querySelector<HTMLElement>('[data-row="bert"]');
      if (region === null || gpt2 === null || bert === null) return null;
      const top = region.getBoundingClientRect().top + region.clientTop;
      return {
        scroll: region.scrollHeight,
        client: region.clientHeight,
        gpt2Bottom: Math.round(gpt2.getBoundingClientRect().bottom - top),
        bertBottom: Math.round(bert.getBoundingClientRect().bottom - top),
      };
    }, RESULTS_REGION);
  for (const language of LANGUAGES) {
    await languagesChoose(root, language.id);
    await settle(page);
    const region = await measure();
    if (region === null) throw new Error(`${language.id}: no results region`);
    const by = region.scroll - region.client;
    lines.push(
      `${language.id}: results region ${by > 1 ? `SCROLLS by ${by}px (${region.scroll}/${region.client})` : `fits (${region.scroll}/${region.client})`}; GPT-2 row ends ${region.gpt2Bottom}px, BERT row ends ${region.bertBottom}px from the region top`,
    );
  }
  const table = lines.join("\n");
  console.log(`\n${testInfo.project.name} languages region record\n${table}`);
  await testInfo.attach("languages-region-record", { body: table, contentType: "text/plain" });
});

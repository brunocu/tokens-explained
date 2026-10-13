import { expect, test, type Locator, type Page } from "@playwright/test";
import { SAMPLE_SENTENCE } from "../src/core/stepper.ts";

// The BPE stepper in the built post (sketch 001, variant D): the sentence from raw text to the
// finished pieces, the boxed winning pair, the fuse, the stop and the unseen words (TOK-05, TOK-06).
// Numbers here are the real trace of "the cat sat on the mat and the cat sat on the hat" with a
// budget of ten merges and the project's tie rule (highest count, then the smaller ids).

const STAGES = 14; // text with numbers, start, ten merges, stop, unseen
const MERGE_STAGE = (k: number) => 1 + k;
const STOP_STAGE = 12;
const WINNERS = ["a+t", "h+e", "t+he", "␣+the", "␣+c", "␣+o", "␣+s", "␣c+at", "␣o+n", "␣s+at"];
const COUNTS = [6, 4, 4, 3, 2, 2, 2, 2, 2, 2];
const TIED = [0, 1, 0, 0, 5, 4, 3, 2, 1, 0]; // rows marked Tied besides the winner
const PAIR_TOTALS = [17, 16, 15, 14, 13, 12, 11, 10, 9, 8];

/** The status line at a stage: only "Step N of 14:" is pinned, the name of the stage is copy. */
const status = (stage: number) => new RegExp(`^Step ${stage + 1} of ${STAGES}:`);
/** A number as a whole word, so a sentence is checked for the figure it states and not for its wording. */
const num = (n: number | string) => new RegExp(`\\b${n}\\b`);

async function openStepper(page: Page): Promise<Locator> {
  await page.goto("what-is-a-token/");
  const card = page.locator("[data-stepper]");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-state", "ready");
  return card;
}

/** One press of Next that waits for the stage to change (a merge stage fuses for a moment first). */
async function next(card: Locator): Promise<void> {
  const label = card.locator("[data-step-status]");
  const before = (await label.textContent()) ?? "";
  await card.locator("[data-next]").click();
  await expect(label).not.toHaveText(before);
}

async function goToStage(card: Locator, stage: number): Promise<void> {
  for (let i = 0; i < stage; i++) await next(card);
}

test("(a) at load the card is ready on the raw text: Next enabled, Back and Reset disabled, the characters, no table", async ({ page }) => {
  const card = await openStepper(page);
  await expect(card.locator("[data-step-status]")).toHaveText(status(0));
  await expect(card.locator("[data-next]")).toBeEnabled();
  await expect(card.locator("[data-back]")).toBeDisabled();
  await expect(card.locator("[data-reset]")).toBeDisabled();
  await expect(card.locator("[data-run]")).toBeEnabled();
  await expect(card.locator("[data-why]")).not.toBeEmpty();
  await expect(card.locator("[data-why]")).toHaveAttribute("role", "status");
  await expect(card.locator("[data-why]")).toHaveAttribute("aria-live", "polite");
  await expect(card.locator("[data-chars] [data-step-chip]")).toHaveCount(49);
  await expect(card.locator("[data-spoken]")).toHaveText(SAMPLE_SENTENCE);
  await expect(card.locator("[data-pair-table]")).toHaveCount(0);
  await expect(card.locator("[data-final]")).toHaveCount(0);
  await expect(card.locator("[data-stats]")).toHaveCount(0);
});

test("(b) the first stage is one continuous row: 116 under the first t, 49 values, no word groups", async ({ page }) => {
  const card = await openStepper(page);
  await expect(card.locator("[data-why]")).toContainText(num(49));
  await expect(card.locator("[data-step-chip]")).toHaveCount(49);
  const first = card.locator("[data-chars] [data-step-chip]").first();
  await expect(first).toHaveAttribute("data-id", "116");
  await expect(first).toContainText("t");
  await expect(first).toContainText("116");
  // The text is not cut into words here: one row, no word groups.
  await expect(card.locator("[data-word]")).toHaveCount(0);
  await expect(card.locator("[data-spoken]").first()).toHaveText(SAMPLE_SENTENCE);
  // Single bytes carry no learned-piece fill.
  await expect(card.locator("[data-step-chip][data-learned]")).toHaveCount(0);
});

test("(c) the first merge shows exactly the six boxed spots of a + t, the callout and the pair table", async ({ page }) => {
  const card = await openStepper(page);
  await goToStage(card, 1);
  await expect(card.locator("[data-step-status]")).toHaveText(status(1));
  await expect(card.locator("[data-pair-box]")).toHaveCount(0);
  await expect(card.locator("[data-why]")).toContainText(num(256));
  await expect(card.locator("[data-stats]")).toContainText("256");
  await expect(card.locator("[data-stats]")).toContainText("49");

  await next(card);
  await expect(card.locator("[data-step-status]")).toHaveText(status(2));
  await expect(card.locator("[data-pair-box]")).toHaveCount(6);
  // The callout names the winning pair and its new id, and the number of boxed spots.
  await expect(card.locator("[data-next-merge] h3")).toContainText("a + t");
  await expect(card.locator("[data-next-merge] h3")).toContainText(num(256));
  await expect(card.locator("[data-next-merge] p")).toContainText(num(6));
  await expect(card.locator('[data-pair][aria-current="true"]')).toHaveAttribute("data-pair", "a+t");
  // The table shows the top 5 of the 17 pairs (no caption any more), four columns.
  await expect(card.locator("[data-pair-table] tbody tr")).toHaveCount(5);
  await expect(card.locator("[data-pair-table] th")).toHaveCount(4);
  await expect(card.locator('[data-pair][data-outcome="merged"]')).toHaveCount(1);
  await expect(card.locator("[data-why]")).toContainText(num(6));
});

test("(d) all ten merges: winner, count, boxed spots, caption, exactly one Merged row", async ({ page }) => {
  const card = await openStepper(page);
  await goToStage(card, MERGE_STAGE(1));
  for (let k = 1; k <= 10; k++) {
    await expect(card.locator("[data-step-status]")).toHaveText(status(MERGE_STAGE(k)));
    await expect(card.locator('[data-pair][aria-current="true"]')).toHaveAttribute("data-pair", WINNERS[k - 1] as string);
    await expect(card.locator("[data-pair-box]")).toHaveCount(COUNTS[k - 1] as number);
    await expect(card.locator('[data-pair][data-outcome="merged"]')).toHaveCount(1);
    await expect(card.locator("[data-pair]").first()).toHaveAttribute("data-outcome", "merged");
    await expect(card.locator('[data-pair][data-outcome="tied"]')).toHaveCount(TIED[k - 1] as number);
    const total = PAIR_TOTALS[k - 1] as number;
    const shown = Math.max(5, (TIED[k - 1] as number) + 1);
    await expect(card.locator("[data-pair-table] tbody tr")).toHaveCount(Math.min(shown, total));
    if (k < 10) await next(card);
  }
});

test("(e) ties: a hatched bar on every tied row, and the deciding id is the smaller one", async ({ page }) => {
  const card = await openStepper(page);
  await goToStage(card, MERGE_STAGE(2));
  await expect(card.locator('[data-pair][data-outcome="tied"]')).toHaveCount(1);
  await expect(card.locator('[data-pair][data-outcome="tied"] .bar.tie')).toHaveCount(1);
  await expect(card.locator('[data-pair][data-outcome="merged"] .bar.tie')).toHaveCount(0);
  // The explanation names the id that decides the tie.
  await expect(card.locator("[data-why]")).toContainText(num(104));

  await goToStage(card, 3);
  await expect(card.locator("[data-step-status]")).toHaveText(status(MERGE_STAGE(5)));
  await expect(card.locator('[data-pair][data-outcome="tied"]')).toHaveCount(5);
  await expect(card.locator("[data-why]")).toContainText(num(99));
  // The winner's row is the first row; every other row of the table is tied.
  expect(await card.locator("[data-pair-table] [data-pair]").evaluateAll((rows) => rows.map((row) => row.getAttribute("data-outcome")))).toEqual([
    "merged",
    "tied",
    "tied",
    "tied",
    "tied",
    "tied",
  ]);

  await goToStage(card, 5);
  await expect(card.locator("[data-step-status]")).toHaveText(status(MERGE_STAGE(10)));
  await expect(card.locator('[data-pair][data-outcome="tied"]')).toHaveCount(0);
});

test("(f) the pieces made so far wear a double border, and learned pieces show their number", async ({ page }) => {
  const card = await openStepper(page);
  await goToStage(card, MERGE_STAGE(2));
  // Merge 1 made "at" (256): it is in six places and all of them are the newest piece.
  const fresh = card.locator('[data-words] [data-step-chip][data-new="true"]');
  await expect(fresh).toHaveCount(6);
  await expect(fresh.first()).toHaveAttribute("data-id", "256");
  await expect(fresh.first()).toContainText("at");
  await expect(fresh.first()).toContainText("256");
  await expect(card.locator('[data-words] [data-step-chip][data-id="256"][data-learned="true"]')).toHaveCount(6);

  // The newest piece wears a heavy double border; a learned piece wears its number; a single byte
  // has the plain 2px outline and no learned fill.
  const borders = await page.evaluate(() => {
    const read = (el: Element | null) => {
      if (el === null) return null;
      const style = getComputedStyle(el);
      return { style: style.borderTopStyle, width: style.borderTopWidth, id: el.querySelector(".stack-chip-id")?.textContent ?? "" };
    };
    return {
      fresh: read(document.querySelector('[data-stepper] [data-words] [data-step-chip][data-new="true"]')),
      byte: read(document.querySelector('[data-stepper] [data-words] [data-step-chip]:not([data-learned])')),
    };
  });
  expect(borders.fresh?.style).toBe("double");
  expect(borders.fresh?.width).toBe("4px");
  expect(borders.fresh?.id).toBe("256");
  expect(borders.byte?.style).toBe("solid");
  expect(borders.byte?.width).toBe("2px");
  await expect(card.locator('[data-words] [data-step-chip]:not([data-learned])').first()).not.toHaveAttribute("data-pal", /.*/);
});

test("(g) the stop stage reports 256 + 10 = 266 and the shrinking text", async ({ page }) => {
  const card = await openStepper(page);
  await goToStage(card, STOP_STAGE);
  await expect(card.locator("[data-step-status]")).toHaveText(status(STOP_STAGE));
  for (const figure of [10, 266, 49, 20]) await expect(card.locator("[data-why]"), String(figure)).toContainText(num(figure));
  await expect(card.locator("[data-stats] .stat").nth(0)).toContainText("266");
  await expect(card.locator("[data-stats] .stat").nth(1)).toContainText("20");
  await expect(card.locator("[data-stop]")).toContainText(num(20));
  await expect(card.locator("[data-step-chip]")).toHaveCount(20);
  await expect(card.locator("[data-next]")).toBeEnabled();
  await expect(card.locator("[data-final]")).toHaveCount(0);
});

test("(g2) Run to end lands on the last step, the unseen words, with Reset focused", async ({ page }) => {
  const card = await openStepper(page);
  await card.locator("[data-run]").click();
  await expect(card.locator("[data-step-status]")).toHaveText(status(STAGES - 1));
  await expect(card.locator("[data-run]")).toBeDisabled();
  await expect(card.locator("[data-next]")).toBeDisabled();
  await expect(card.locator("[data-reset]")).toBeFocused();
  await expect(card.locator("[data-final]")).toBeVisible();
});

test("(h) the unseen words: ' that' from known pieces, the cat emoji from raw bytes in hexadecimal", async ({ page }) => {
  const card = await openStepper(page);
  await card.locator("[data-run]").click();
  await expect(card.locator("[data-step-status]")).toHaveText(status(STAGES - 1));
  const panel = card.locator("[data-final]");
  await expect(panel).toBeVisible();
  await expect(panel.locator("h3")).toBeVisible();

  const that = panel.locator('[data-unseen-word=" that"] [data-step-chip]');
  await expect(that).toHaveCount(4);
  await expect(that.nth(0)).toHaveAttribute("data-id", "32");
  await expect(that.nth(3)).toHaveAttribute("data-id", "256");
  await expect(that.nth(3)).toContainText("at");

  const cat = panel.locator('[data-unseen-word=" \u{1F431}"] [data-step-chip]');
  await expect(cat).toHaveCount(5);
  await expect(cat.locator(".stack-chip-text")).toHaveText([/␣/, "F0", "9F", "90", "B1"]);
  await expect(cat.locator(".stack-chip-id")).toHaveText(["32", "240", "159", "144", "177"]);
  await expect(cat.locator("[data-learned]")).toHaveCount(0);
  await expect(panel).toContainText("240, 159, 144, 177");
  await expect(panel).toContainText("F0 9F 90 B1");

  await expect(card.locator("[data-next]")).toBeDisabled();
  await expect(card.locator("[data-reset]")).toBeFocused();
  await expect(card.locator("input, textarea, a")).toHaveCount(0);
});

test("(i) Back, Reset and focus: focus never falls to the page", async ({ page }) => {
  const card = await openStepper(page);
  await goToStage(card, STAGES - 1);
  await expect(card.locator("[data-reset]")).toBeFocused();

  await card.locator("[data-reset]").click();
  await expect(card.locator("[data-step-status]")).toHaveText(status(0));
  await expect(card.locator("[data-next]")).toBeFocused();

  await next(card);
  await card.locator("[data-back]").click();
  await expect(card.locator("[data-step-status]")).toHaveText(status(0));
  await expect(card.locator("[data-next]")).toBeFocused();

  await goToStage(card, 5);
  await card.locator("[data-reset]").click();
  await expect(card.locator("[data-next]")).toBeFocused();

  // Back in the middle keeps focus on Back (it stays enabled). Keyboard, because clicking a
  // button does not focus it in Safari.
  await goToStage(card, 3);
  await card.locator("[data-back]").focus();
  await page.keyboard.press("Enter");
  await expect(card.locator("[data-step-status]")).toHaveText(status(2));
  await expect(card.locator("[data-back]")).toBeFocused();
  // Going back from a merge stage shows the earlier state with its pair boxes again.
  await expect(card.locator("[data-pair-box]")).toHaveCount(6);
});

test("(j) keyboard only: Enter on Next runs through every stage", async ({ page }) => {
  const card = await openStepper(page);
  await card.locator("[data-next]").focus();
  for (let stage = 1; stage < STAGES; stage++) {
    await page.keyboard.press("Enter");
    await expect(card.locator("[data-step-status]")).toContainText(`Step ${stage + 1} of ${STAGES}:`);
  }
  await expect(card.locator("[data-reset]")).toBeFocused();
  await expect(card.locator("[data-final]")).toBeVisible();
});

test("(k) with motion allowed Next fuses the boxes first, and a second click during the fuse is ignored", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const card = await openStepper(page);
  await goToStage(card, MERGE_STAGE(1));
  const nextButton = card.locator("[data-next]");
  await nextButton.click();
  await nextButton.click({ noWaitAfter: true });
  await expect(card.locator("[data-step-status]")).toHaveText(status(MERGE_STAGE(2)));
  // Give a late second advance time to show up, then confirm there was only one step.
  await page.waitForTimeout(600);
  await expect(card.locator("[data-step-status]")).toHaveText(status(MERGE_STAGE(2)));
  // The new piece pops in with a running animation.
  const names = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-stepper] [data-step-chip][data-new="true"]')).map(
      (el) => getComputedStyle(el).animationName,
    ),
  );
  expect(names.length).toBeGreaterThan(0);
  expect(names.every((n) => n !== "none")).toBe(true);
});

test("(l) under reduced motion Next advances at once, nothing fuses and nothing animates", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const card = await openStepper(page);
  await goToStage(card, MERGE_STAGE(1));
  await card.locator("[data-next]").click();
  await expect(card.locator("[data-step-status]")).toHaveText(status(MERGE_STAGE(2)));
  const state = await page.evaluate(() => ({
    running: document.getAnimations().length,
    fusing: document.querySelectorAll("[data-stepper] .pairbox.fusing").length,
    names: Array.from(document.querySelectorAll('[data-stepper] [data-step-chip][data-new="true"]')).map(
      (el) => getComputedStyle(el).animationName,
    ),
  }));
  expect(state.names.length).toBeGreaterThan(0);
  expect(state.names.every((n) => n === "none")).toBe(true);
  expect(state.fusing).toBe(0);
  expect(state.running).toBe(0);
});

test("(m) the end-of-word mark is retired: no section sign anywhere in the stepper", async ({ page }) => {
  const card = await openStepper(page);
  for (let stage = 0; stage < STAGES; stage++) {
    expect(((await card.textContent()) ?? "").includes("§"), `stage ${stage}`).toBe(false);
    if (stage < STAGES - 1) await next(card);
  }
});

test("(n) stepping makes no request for a tokenizer file", async ({ page }) => {
  const card = await openStepper(page);
  // The playground on this page starts its GPT-2 download at page load (D-04), so wait for it to
  // finish first; what is asserted is that the stepper's own interaction asks for nothing.
  await expect(page.locator("[data-playground]")).toHaveAttribute("data-tokenizer", "ready");
  const urls: string[] = [];
  page.on("request", (r) => urls.push(r.url()));
  await card.locator("[data-run]").click();
  await card.locator("[data-reset]").click();
  await card.locator("[data-run]").click();
  expect(urls.filter((u) => u.includes("/tokenizers/"))).toEqual([]);
  expect(urls.filter((u) => /huggingface|\.co\//.test(u))).toEqual([]);
});

test("(o) a full run produces no console error and no page error", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  const card = await openStepper(page);
  await goToStage(card, STAGES - 1);
  for (let i = 0; i < STAGES - 1; i++) await card.locator("[data-back]").click();
  await card.locator("[data-run]").click();
  await card.locator("[data-reset]").click();
  expect(errors).toEqual([]);
});

test("(p) without JavaScript the first stage and the no-JS note are in the page", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("what-is-a-token/");
  // getByText skips <noscript> content, so address the note by its class.
  const note = page.locator("[data-stepper] .island-nojs");
  await expect(note).toBeVisible();
  await expect(page.locator("[data-stepper] [data-status]")).toBeHidden();
  await expect(page.locator("[data-stepper] [data-why]")).not.toBeEmpty();
  await expect(page.locator("[data-stepper] [data-chars] [data-step-chip]")).toHaveCount(49);
  await expect(page.locator("[data-stepper] [data-next]")).toBeDisabled();
  await context.close();
});

test("(q) every control is at least 44 by 44 px and the primary button is not the accent colour", async ({ page }) => {
  const card = await openStepper(page);
  for (const hook of ["[data-back]", "[data-next]", "[data-run]", "[data-reset]"]) {
    const box = await card.locator(hook).boundingBox();
    expect(box, hook).not.toBeNull();
    expect((box as { width: number }).width, hook).toBeGreaterThanOrEqual(44);
    expect((box as { height: number }).height, hook).toBeGreaterThanOrEqual(44);
  }
  const colours = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const nextButton = getComputedStyle(document.querySelector("[data-stepper] [data-next]") as Element);
    const probe = document.createElement("span");
    probe.style.color = root.getPropertyValue("--text");
    document.body.appendChild(probe);
    const text = getComputedStyle(probe).color;
    probe.remove();
    return { fill: nextButton.backgroundColor, text };
  });
  expect(colours.fill).toBe(colours.text);
});

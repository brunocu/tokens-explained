import { expect, test, type Page } from "@playwright/test";
import { EXAMPLES } from "../src/core/examples.ts";
import { openPlaygroundReady } from "./helpers.ts";

// UI-SPEC revision R-01: character frames, label cells and dashed token cuts in the
// shared display, as the reader sees them in the playground.

async function openReady(page: Page): Promise<void> {
  await openPlaygroundReady(page);
}

const statValue = (page: Page, name: string) => page.locator(`[data-stat="${name}"] [data-stat-value]`);
const frames = (page: Page) => page.locator("[data-playground] [data-char-frame]");
const chips = (page: Page) => page.locator("[data-playground] [data-chip]");
const idsLabel = (page: Page) => page.getByText("Token IDs", { exact: true });
const peekLabel = (page: Page) => page.locator("label", { hasText: "Peek under the hood" });

const css = (locator: ReturnType<Page["locator"]>, property: string) =>
  locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);

// GPT-2 cuts 男 (bytes E7 94 B7) after the second byte: one chip with two bytes, one with one.
test("(a) typing 男 shows one frame: label 男, two hatched chips, one dashed token cut", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").fill("男");
  await expect(frames(page)).toHaveCount(1);
  const frame = frames(page).first();

  const firstChild = frame.locator(":scope > *").first();
  await expect(firstChild).toHaveAttribute("data-char-label", "");
  await expect(firstChild).toHaveText("男");

  const partial = frame.locator('[data-chip][data-partial="true"]');
  await expect(partial).toHaveCount(2);
  expect((await partial.allInnerTexts()).map((t) => t.trim())).toEqual(["E7 94", "B7"]);

  // The frame and the label are never chips.
  await expect(page.locator("[data-char-frame][data-chip]")).toHaveCount(0);
  await expect(page.locator("[data-char-label][data-chip]")).toHaveCount(0);

  expect(await css(frame, "border-top-width")).toBe("2px");
  expect(await css(frame, "border-top-style")).toBe("solid");
  expect(await css(frame, "flex-wrap")).toBe("nowrap");
  expect(await css(frame, "direction")).toBe("ltr");
  expect(await css(firstChild, "unicode-bidi")).toBe("isolate");

  expect(await css(partial.nth(0), "border-left-width")).toBe("0px");
  expect(await css(partial.nth(0), "border-top-width")).toBe("0px");
  expect(await css(partial.nth(1), "border-left-width")).toBe("2px");
  expect(await css(partial.nth(1), "border-left-style")).toBe("dashed");

  await expect(statValue(page, "tokens")).toHaveText("2");
  await expect(statValue(page, "characters")).toHaveText("1");
  // Every token is exactly one chip, and every partial chip sits inside a frame.
  await expect(chips(page)).toHaveCount(2);
  await expect(page.locator('[data-playground] [data-char-frame] [data-chip][data-partial="true"]')).toHaveCount(
    await page.locator('[data-playground] [data-chip][data-partial="true"]').count(),
  );
});

test("(b) 日本語 gives three frames labelled 日, 本, 語 with the 4px chip gap between them", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").fill("日本語");
  await expect(frames(page)).toHaveCount(3);
  const labels = await page.locator("[data-playground] [data-char-label]").allInnerTexts();
  expect(labels.map((l) => l.trim())).toEqual(["日", "本", "語"]);
  // Six tokens: GPT-2 cuts each of the three characters into a two-byte piece and a one-byte piece.
  await expect(chips(page)).toHaveCount(6);

  const boxes = await frames(page).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top };
    }),
  );
  for (let i = 1; i < boxes.length; i++) {
    const a = boxes[i - 1];
    const b = boxes[i];
    if (a === undefined || b === undefined) throw new Error("missing frame box");
    expect(Math.abs(a.top - b.top)).toBeLessThan(1);
    const distance = b.left - a.right;
    expect(distance).toBeGreaterThan(3.5);
    expect(distance).toBeLessThan(4.5);
  }
});

test("(c) the default text and plain ASCII show no frames at all", async ({ page }) => {
  await openReady(page);
  expect(await chips(page).count()).toBeGreaterThan(0);
  await expect(frames(page)).toHaveCount(0);
  await page.locator("#t").fill("hello world");
  await expect(statValue(page, "characters")).toHaveText("11");
  await expect(frames(page)).toHaveCount(0);
  // Scoped to the playground: the post's static emoji figure legitimately carries a frame.
  await expect(page.locator("[data-playground] [data-char-label]")).toHaveCount(0);
});

test("(e) the non-English example gives three frames, six hatched chips and four whole chips, keeping the settings", async ({
  page,
}) => {
  await openReady(page);
  await idsLabel(page).click();
  await peekLabel(page).click();
  await page.locator('[data-example="non-english"]').click();

  const expected = EXAMPLES.find((e) => e.id === "non-english")!.text;
  await expect(page.locator("#t")).toHaveValue(expected);
  const state = await page.evaluate(() => {
    const ta = document.querySelector("#t") as HTMLTextAreaElement;
    return { active: document.activeElement === ta, start: ta.selectionStart, end: ta.selectionEnd, length: ta.value.length };
  });
  expect(state).toEqual({ active: true, start: state.length, end: state.length, length: state.length });

  // GPT-2 holds 女, ん, に and は as whole tokens and cuts only 男, こ and ち (the space is
  // swallowed by the first piece of こ, a hatched chip of bytes 20 E3 81).
  await expect(frames(page)).toHaveCount(3);
  const labels = await page.locator("[data-playground] [data-char-label]").allInnerTexts();
  expect(labels.map((l) => l.trim())).toEqual(["男", "こ", "ち"]);

  const partial = page.locator('[data-playground] [data-chip][data-partial="true"]');
  await expect(partial).toHaveCount(6);
  await expect(page.locator('[data-playground] [data-char-frame] [data-chip][data-partial="true"]')).toHaveCount(6);
  const plain = page.locator('[data-playground] [data-chip]:not([data-partial="true"])');
  await expect(plain).toHaveCount(4);
  await expect(plain.first()).not.toHaveAttribute("data-partial", "true");
  // Token IDs mode is kept: the four whole chips show the bytes of 女, ん, に and は.
  await expect(plain.locator("[data-chip-bytes]")).toHaveText(["E5 A5 B3", "E3 82 93", "E3 81 AB", "E3 81 AF"]);

  await expect(statValue(page, "characters")).toHaveText("8");
  await expect(page.locator("[data-composite-note]")).toHaveCount(0);
  await expect(page.locator('input[name="view"][value="ids"]')).toBeChecked();
  await expect(page.locator("[data-peek]")).toBeChecked();
});

test("(d) Token IDs mode and Peek leave the frames unchanged, with the label centred", async ({ page }) => {
  await openReady(page);
  await page.locator("#t").fill("男");
  await expect(frames(page)).toHaveCount(1);

  await idsLabel(page).click();
  await expect(frames(page)).toHaveCount(1);
  const inner = page.locator("[data-playground] [data-char-frame] [data-chip]");
  await expect(inner).toHaveCount(2);
  for (const chip of await inner.all()) {
    await expect(chip.locator("[data-chip-id]")).toHaveText(/^\d+$/);
    await expect(chip.locator("[data-chip-bytes]")).toHaveText(/^[0-9A-F]{2}( [0-9A-F]{2})*$/);
  }
  const centres = await frames(page).first().evaluate((frame) => {
    const label = frame.querySelector("[data-char-label]") as HTMLElement;
    const f = frame.getBoundingClientRect();
    const l = label.getBoundingClientRect();
    return { frame: f.top + f.height / 2, label: l.top + l.height / 2 };
  });
  expect(Math.abs(centres.frame - centres.label)).toBeLessThanOrEqual(2);

  await peekLabel(page).click();
  await expect(frames(page)).toHaveCount(1);
  await expect(chips(page)).toHaveCount(2);
});

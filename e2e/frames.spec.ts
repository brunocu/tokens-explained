import { expect, test, type Page } from "@playwright/test";
import { EXAMPLES } from "../src/core/examples.ts";
import { openPlaygroundReady, showTokenIds } from "./helpers.ts";

// UI-SPEC revision R-01: character frames, label cells and dashed token cuts in the
// shared display, as the reader sees them in the playground.

async function openReady(page: Page): Promise<void> {
  await openPlaygroundReady(page);
}

const statValue = (page: Page, name: string) => page.locator(`[data-stat="${name}"] [data-stat-value]`);
const frames = (page: Page) => page.locator("[data-playground] [data-char-frame]");
const chips = (page: Page) => page.locator("[data-playground] [data-chip]");

const css = (locator: ReturnType<Page["locator"]>, property: string) =>
  locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);

// GPT-2 cuts 男 (bytes E7 94 B7) after the second byte: one chip with two bytes, one with one.
test("(a) typing 男 shows one frame: label 男, two hatched chips, one dashed token cut", async ({ page }) => {
  await openReady(page);
  await showTokenIds(page);
  await page.locator("#t").fill("男");
  await expect(frames(page)).toHaveCount(1);
  const frame = frames(page).first();

  const firstChild = frame.locator(":scope > *").first();
  await expect(firstChild).toHaveAttribute("data-char-label", "");
  await expect(firstChild).toHaveText("男");

  const partial = frame.locator('[data-chip][data-partial="true"]');
  await expect(partial).toHaveCount(2);
  expect((await partial.locator("[data-chip-main]").allInnerTexts()).map((t) => t.trim())).toEqual(["E7 94", "B7"]);

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

test("(e) the non-English example gives twelve frames, 27 hatched chips and eight whole chips, each with its text and ID lines", async ({
  page,
}) => {
  await openReady(page);
  await showTokenIds(page);
  await page.locator('[data-playground] [data-example="non-english"]').click();

  const expected = EXAMPLES.find((e) => e.id === "non-english")!.text;
  await expect(page.locator("#t")).toHaveValue(expected);
  const state = await page.evaluate(() => {
    const ta = document.querySelector("#t") as HTMLTextAreaElement;
    return { active: document.activeElement === ta, start: ta.selectionStart, end: ta.selectionEnd, length: ta.value.length };
  });
  expect(state).toEqual({ active: true, start: state.length, end: state.length, length: state.length });

  // GPT-2 holds は, 、, 一, 大, に, し, た and 。 as whole tokens and cuts the other characters. The
  // frame of の国 names both characters, because the chip "の" + the first byte of 国 holds a whole の.
  await expect(frames(page)).toHaveCount(12);
  const labels = await page.locator("[data-playground] [data-char-label]").allInnerTexts();
  expect(labels.map((l) => l.replace(/\s+/g, ""))).toEqual(["長", "男", "昨", "年", "第", "志", "望", "の国", "立", "学", "合", "格"]);

  const partial = page.locator('[data-playground] [data-chip][data-partial="true"]');
  await expect(partial).toHaveCount(27);
  await expect(page.locator('[data-playground] [data-char-frame] [data-chip][data-partial="true"]')).toHaveCount(27);
  const plain = page.locator('[data-playground] [data-chip]:not([data-partial="true"])');
  await expect(plain).toHaveCount(8);
  await expect(plain.first()).not.toHaveAttribute("data-partial", "true");
  // The eight whole chips hold は, 、, 一, 大, に, し, た and 。: their text lines say so, they carry no hex line, and
  // each ID line equals the ID in the table alternative, whose Bytes column holds the bytes of that
  // same token (the bytes live in the table now, not on the chip).
  await expect(plain.locator("[data-chip-main]")).toHaveText(["は", "、", "一", "大", "に", "し", "た", "。"]);
  for (const whole of await plain.all()) await expect(whole.locator(":scope > *:not(.sr-only)"), "a whole chip has a text line and an ID line only").toHaveCount(2);
  for (const id of await plain.locator("[data-chip-id]").allInnerTexts()) expect(id.trim()).toMatch(/^\d+$/);
  await expect(plain.locator("[data-chip-id]")).toHaveCount(8);

  await page.locator("details[data-table] summary").click();
  const wholeRows = await page.locator("[data-playground] [data-chip]").evaluateAll((all, tableId) => {
    const rows = [...document.querySelectorAll(`${tableId} tbody tr`)];
    return all.flatMap((chip, i) => {
      if (chip.getAttribute("data-partial") === "true") return [];
      const cells = rows[i]?.querySelectorAll("td");
      return [
        {
          chipId: chip.querySelector("[data-chip-id]")?.textContent?.trim() ?? "",
          tableId: cells?.[2]?.textContent?.trim() ?? "",
          bytes: cells?.[3]?.textContent?.trim() ?? "",
        },
      ];
    });
  }, "details[data-table]");
  expect(wholeRows.map((r) => r.bytes)).toEqual(["E3 81 AF", "E3 80 81", "E4 B8 80", "E5 A4 A7", "E3 81 AB", "E3 81 97", "E3 81 9F", "E3 80 82"]);
  for (const row of wholeRows) expect(row.tableId).toBe(row.chipId);

  await expect(statValue(page, "characters")).toHaveText("21");
  await expect(page.locator("[data-composite-note]")).toHaveCount(0);
});

test("(d) the two-line chip leaves the frames unchanged, with the label centred", async ({ page }) => {
  await openReady(page);
  await showTokenIds(page);
  await page.locator("#t").fill("男");
  await expect(frames(page)).toHaveCount(1);

  const inner = page.locator("[data-playground] [data-char-frame] [data-chip]");
  await expect(inner).toHaveCount(2);
  for (const chip of await inner.all()) {
    // Partial chip: hex on the top line, the ID on the second line, no third line.
    await expect(chip.locator("[data-chip-main]")).toHaveText(/^[0-9A-F]{2}( [0-9A-F]{2})*$/);
    await expect(chip.locator("[data-chip-id]")).toHaveText(/^\d+$/);
    await expect(chip.locator(":scope > *:not(.sr-only)"), "a text line and an ID line only").toHaveCount(2);
  }
  const centres = await frames(page).first().evaluate((frame) => {
    const label = frame.querySelector("[data-char-label]") as HTMLElement;
    const f = frame.getBoundingClientRect();
    const l = label.getBoundingClientRect();
    return { frame: f.top + f.height / 2, label: l.top + l.height / 2 };
  });
  expect(Math.abs(centres.frame - centres.label)).toBeLessThanOrEqual(2);
  await expect(chips(page)).toHaveCount(2);
});

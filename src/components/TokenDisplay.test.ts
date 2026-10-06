import { describe, expect, it } from "vitest";
import { render } from "svelte/server";
import TokenDisplay from "./TokenDisplay.svelte";
import { tokenize } from "../core/toy.ts";
import type { Token } from "../core/types.ts";

// Server-rendered component tests with synthetic tokens (PD-05). The component only ever
// renders text through interpolation, so the string it produces is the thing under test.

const REPLACEMENT = String.fromCodePoint(0xfffd);

type Props = { tokens: Token[]; mode?: "text" | "ids"; showBytes?: boolean; legend?: boolean; emptyState?: boolean };

/** Rendered markup with SSR comments and the scoped svelte-xxxx class tokens removed. */
function html(props: Props): string {
  const { body } = render(TokenDisplay, { props: { legend: false, ...props } });
  return body.replace(/<!--[\s\S]*?-->/g, "").replace(/ svelte-[a-z0-9]+/g, "");
}

const tok = (bytes: number[], isPartial: boolean, id = 0): Token => ({ id, bytes: Uint8Array.from(bytes), isPartial });
/** One partial token per byte, the shape the toy gives non-ASCII text. */
const partials = (...bytes: number[]): Token[] => bytes.map((b, i) => tok([b], true, 1000 + i));
const utf8 = (text: string): number[] => Array.from(new TextEncoder().encode(text));

/** Every opening tag that carries the attribute `attr` (as a whole attribute name). */
const tagsWith = (markup: string, attr: string): string[] =>
  (markup.match(/<[a-z][^>]*>/g) ?? []).filter((tag) => new RegExp(`\\s${attr}(?=[\\s>=/])`).test(tag));

/** The inner HTML of the first span carrying `attr`, found by counting nested spans. */
function innerOf(markup: string, attr: string): string {
  const open = markup.match(new RegExp(`<span[^>]*\\s${attr}(?=[\\s>=/])[^>]*>`));
  if (open === null || open.index === undefined) throw new Error(`no element with ${attr}`);
  const start = open.index + open[0].length;
  let depth = 1;
  const tag = /<(\/?)span\b[^>]*>/g;
  tag.lastIndex = start;
  for (let m = tag.exec(markup); m !== null; m = tag.exec(markup)) {
    depth += m[1] === "/" ? -1 : 1;
    if (depth === 0) return markup.slice(start, m.index);
  }
  throw new Error(`unclosed element with ${attr}`);
}
const textOf = (inner: string): string => inner.replace(/<[^>]*>/g, "");

describe("TokenDisplay byte-line grouping (server-rendered)", () => {
  it("underlines two whole characters in one chip under Peek as two groups with one gap", () => {
    const out = html({ tokens: [tok([0xe6, 0x97, 0xa5, 0xe6, 0x9c, 0xac], false)], showBytes: true });
    expect(tagsWith(out, "data-ch")).toHaveLength(2);
    expect(Array.from(out.matchAll(/class="gap"/g))).toHaveLength(1);
    expect(textOf(innerOf(out, "data-chip-bytes"))).toBe("E6 97 A5 E6 9C AC");
  });

  it("keeps the group's own text and the data-ch attribute in step", () => {
    const out = html({ tokens: [tok([0xe6, 0x97, 0xa5, 0xe6, 0x9c, 0xac], false)], showBytes: true });
    expect(out).toContain('data-ch="E6 97 A5"');
    expect(out).toContain('data-ch="E6 9C AC"');
  });

  it("groups the two bytes of a partial chip in text mode and leaves the lone leftover byte plain", () => {
    const tokens = [tok([0xe7, 0x94], true, 1), tok([0xb7], true, 2)];
    const out = html({ tokens });
    expect(tagsWith(out, "data-ch")).toHaveLength(1);
    expect(out).toContain('data-ch="E7 94"');
    expect(textOf(innerOf(out, "data-chip-main"))).toBe("E7 94");
  });

  it("leaves an ASCII chip under Peek without a group and with the plain text", () => {
    const out = html({ tokens: [tok([0x48, 0x65, 0x6c], false)], showBytes: true });
    expect(tagsWith(out, "data-ch")).toHaveLength(0);
    expect(textOf(innerOf(out, "data-chip-bytes"))).toBe("48 65 6C");
  });

  it("groups in IDs mode too, on the bytes line", () => {
    const out = html({ tokens: [tok([0xe6, 0x97, 0xa5], false)], mode: "ids", showBytes: true });
    expect(out).toContain('data-ch="E6 97 A5"');
    expect(tagsWith(out, "data-chip-id")).toHaveLength(1);
  });
});

describe("TokenDisplay frames (server-rendered)", () => {
  it("renders 男女 as two frames around six chips, labelled 男 and 女, with no element both frame and chip", () => {
    const out = html({ tokens: partials(...utf8("男女")) });
    expect(tagsWith(out, "data-char-frame")).toHaveLength(2);
    expect(tagsWith(out, "data-chip")).toHaveLength(6);
    expect(tagsWith(out, "data-char-label")).toHaveLength(2);
    expect(out).toContain(">男</span>");
    expect(out).toContain(">女</span>");
    for (const tag of tagsWith(out, "data-chip")) expect(tag).not.toMatch(/data-char-(frame|label)/);
    for (const tag of tagsWith(out, "data-char-frame")) expect(tag).not.toMatch(/\sdata-chip(?=[\s>=/])/);
  });

  it("puts the label cell first inside the frame and marks only later chips as cuts", () => {
    const out = html({ tokens: partials(0xe7, 0x94, 0xb7) });
    const frameAt = out.indexOf("data-char-frame");
    const labelAt = out.indexOf("data-char-label");
    const firstChipAt = out.search(/\sdata-chip(?=[\s>=/])/);
    expect(frameAt).toBeGreaterThan(-1);
    expect(labelAt).toBeGreaterThan(frameAt);
    expect(firstChipAt).toBeGreaterThan(labelAt);
    const chipTags = tagsWith(out, "data-chip");
    expect(chipTags.map((t) => /class="[^"]*\bcut\b/.test(t))).toEqual([false, true, true]);
  });

  it("keeps the alternating palette index by token position: a, E7, 94, B7, b gives 0, 1, 2, 3, 0", () => {
    const tokens = [tok([0x61], false, 1), ...partials(0xe7, 0x94, 0xb7), tok([0x62], false, 2)];
    const out = html({ tokens });
    const pal = Array.from(out.matchAll(/data-pal="(\d)"/g), (m) => m[1]);
    expect(pal).toEqual(["0", "1", "2", "3", "0"]);
  });

  it("frames an invalid-only chip with data-invalid and the label invalid", () => {
    const out = html({ tokens: partials(0x94) });
    expect(tagsWith(out, "data-char-frame")).toHaveLength(1);
    expect(out).toContain('data-invalid="true"');
    expect(out).toMatch(/data-char-label(="")?><span class="lab" data-style="name">invalid<\/span>/);
  });

  it("does not mark an ordinary frame invalid", () => {
    expect(html({ tokens: partials(0xe7, 0x94, 0xb7) })).not.toContain("data-invalid");
  });

  it("labels EF BF BD cut into three tokens placeholder and never renders the replacement character", () => {
    for (const mode of ["text", "ids"] as const) {
      const out = html({ tokens: partials(0xef, 0xbf, 0xbd), mode, showBytes: true });
      expect(out).toContain("placeholder");
      expect(out).not.toContain(REPLACEMENT);
      expect(out).not.toContain("&#65533;");
    }
  });

  it("shows three labels and +2 more for a frame with five", () => {
    const tokens = [
      [0xe7, 0x94],
      [0xb7, 0xe5, 0xa5],
      [0xb3, 0xe6, 0x97],
      [0xa5, 0xe6, 0x9c],
      [0xac, 0xe8, 0xaa],
      [0x9e],
    ].map((bytes, i) => tok(bytes, true, 2000 + i));
    const out = html({ tokens });
    expect(tagsWith(out, "data-char-frame")).toHaveLength(1);
    expect(out).toContain("+2 more");
    for (const ch of ["男", "女", "日"]) expect(out).toContain(`>${ch}</span>`);
    for (const ch of ["本", "語"]) expect(out).not.toContain(`>${ch}</span>`);
    expect(Array.from(out.matchAll(/class="lab"/g))).toHaveLength(4);
  });

  it("renders the ID and the hex bytes inside every chip of a frame in IDs mode", () => {
    const out = html({ tokens: partials(0xe7, 0x94, 0xb7), mode: "ids" });
    expect(tagsWith(out, "data-char-frame")).toHaveLength(1);
    expect(tagsWith(out, "data-chip-id")).toHaveLength(3);
    expect(tagsWith(out, "data-chip-bytes")).toHaveLength(3);
  });

  it("renders no frame for ASCII-only tokens", () => {
    const out = html({ tokens: tokenize("hello world") });
    expect(out).not.toContain("data-char-frame");
    expect(out).not.toContain("data-char-label");
    expect(tagsWith(out, "data-chip").length).toBeGreaterThan(0);
  });

  it("renders no frame for the toy's output on the default-style sentence", () => {
    const out = html({ tokens: tokenize("The quick brown fox jumps over the lazy dog.") });
    expect(out).not.toContain("data-char-frame");
  });

  it("renders the toy's output for 日本語 as three frames of three chips", () => {
    const out = html({ tokens: tokenize("日本語") });
    expect(tagsWith(out, "data-char-frame")).toHaveLength(3);
    expect(tagsWith(out, "data-chip")).toHaveLength(9);
  });

  it("renders the empty state, and no frame, for an empty token list", () => {
    const out = html({ tokens: [] });
    expect(out).toContain("data-empty");
    expect(out).toContain("Nothing to split yet");
    expect(out).not.toContain("data-char-frame");
  });

  it("shows exactly the hex pair inside a one-byte partial chip, with no surrounding whitespace", () => {
    const out = html({ tokens: partials(0xe7, 0x94, 0xb7) });
    // Server rendering writes a valueless attribute as data-chip-main="", so accept both forms.
    for (const pair of ["E7", "94", "B7"]) {
      expect(out).toMatch(new RegExp(`data-chip-main(="")?>${pair}</span>`));
    }
  });

  it("renders the toy's output for 男女 and the party popper in IDs mode with no byte group (the rule is dormant)", () => {
    for (const text of ["男女", "\u{1f389}"]) {
      for (const showBytes of [false, true]) {
        const out = html({ tokens: tokenize(text), mode: "ids", showBytes });
        expect(tagsWith(out, "data-ch")).toHaveLength(0);
        expect(out).not.toContain('class="gap"');
      }
    }
  });

  it("never gives a frame or a label a handler, a tabindex or an aria role", () => {
    const out = html({ tokens: partials(0xe7, 0x94, 0xb7) });
    for (const tag of [...tagsWith(out, "data-char-frame"), ...tagsWith(out, "data-char-label")]) {
      expect(tag).not.toMatch(/\son[a-z]+=|tabindex|role=|title=/);
    }
  });
});

describe("TokenDisplay legend and combined-character note", () => {
  const render2 = (props: Record<string, unknown>): string =>
    render(TokenDisplay, { props: { tokens: partials(0xe7, 0x94, 0xb7), ...props } }).body.replace(/<!--[\s\S]*?-->/g, "");

  it("shows the R-01 sentence as the fourth legend item and keeps the three glyph items", () => {
    const out = render2({ legend: true });
    expect(out).toContain(
      "Hatched chips are raw bytes. Hatched chips in the same frame make up one character, which is shown in front of them.",
    );
    expect(out).toContain("space");
    expect(out).toContain("new line");
    expect(out).toContain("tab");
  });

  it("renders the note only when compositeCount is above zero, after the split note, as a plain paragraph", () => {
    expect(render2({ splitCount: 1 })).not.toContain("data-composite-note");
    expect(render2({ splitCount: 1, compositeCount: 0 })).not.toContain("data-composite-note");
    const one = render2({ splitCount: 1, compositeCount: 1 });
    expect(one).toContain("1 character on screen is built from several parts joined together. Each part is marked on its own.");
    expect(one.indexOf("data-split-note")).toBeLessThan(one.indexOf("data-composite-note"));
    expect(one).not.toMatch(/data-composite-note[^>]*role=/);
    expect(render2({ compositeCount: 3 })).toContain("3 characters on screen are built from several parts joined together.");
  });
});

import { describe, expect, it } from "vitest";
import { render } from "svelte/server";
import TokenDisplay from "./TokenDisplay.svelte";
import TokenLegend from "./TokenLegend.svelte";
import tokenDisplaySource from "./TokenDisplay.svelte?raw";
import { buildGpt2 } from "../core/buildTokenizer.ts";
import { idLabel } from "../core/display.ts";
import type { Token } from "../core/types.ts";

// Tests marked "GPT-2" below render real GPT-2 output (D-01). Top-level await keeps describe-time
// tokenising working.
const gpt2 = await buildGpt2();
const tokenize = (text: string): Token[] => gpt2.tokenize(text);

// Server-rendered component tests with synthetic tokens (PD-05). The component only ever
// renders text through interpolation, so the string it produces is the thing under test.

const REPLACEMENT = String.fromCodePoint(0xfffd);

// The removed hook and prop of the old bytes line (D-08). Written in pieces so a repository search for
// the old names finds no source line that still uses them; these two only say they are gone.
const REMOVED_HOOK = ["data", "chip", "bytes"].join("-");
const REMOVED_PROP = ["show", "Bytes"].join("");

type Props = { tokens: Token[]; stacked?: boolean; legend?: boolean; emptyState?: boolean };

/** Rendered markup with SSR comments and the scoped svelte-xxxx class tokens removed. */
function html(props: Props): string {
  const { body } = render(TokenDisplay, { props: { legend: false, ...props } });
  return body.replace(/<!--[\s\S]*?-->/g, "").replace(/ svelte-[a-z0-9]+/g, "");
}

const tok = (bytes: number[], isPartial: boolean, id = 0): Token => ({ id, bytes: Uint8Array.from(bytes), isPartial });
/** One partial token per byte: the worst case for a character cut into pieces. */
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
  it("groups the two bytes of a partial chip in the one-line form and leaves the lone leftover byte plain", () => {
    const tokens = [tok([0xe7, 0x94], true, 1), tok([0xb7], true, 2)];
    const out = html({ tokens });
    expect(tagsWith(out, "data-ch")).toHaveLength(1);
    expect(out).toContain('data-ch="E7 94"');
    expect(textOf(innerOf(out, "data-chip-main"))).toBe("E7 94");
  });

  it("keeps the group's own text and the data-ch attribute in step on a partial chip", () => {
    const out = html({ tokens: [tok([0xe7, 0x94], true, 1), tok([0xb7], true, 2)] });
    expect(innerOf(out, "data-ch")).toBe("E7 94");
    expect(out).toContain('data-ch="E7 94"');
  });

  it("groups on the top line of a stacked partial chip too, with the ID on the second line", () => {
    const out = html({ tokens: [tok([0xe7, 0x94], true, 7), tok([0xb7], true, 8)], stacked: true });
    expect(out).toContain('data-ch="E7 94"');
    expect(textOf(innerOf(out, "data-chip-main"))).toBe("E7 94");
    expect(textOf(innerOf(out, "data-chip-id"))).toBe("7");
  });
});

describe("TokenDisplay stacked chips: text over ID (D-08, D-09)", () => {
  // Test 1
  it("gives every normal chip a text line and an ID line equal to idLabel, and no hex line", () => {
    const tokens = [tok(utf8("hello"), false, 31373), tok(utf8(" world"), false, 995), tok(utf8("!"), false, 0)];
    const out = html({ tokens, stacked: true });
    expect(tagsWith(out, "data-chip")).toHaveLength(3);
    expect(tagsWith(out, "data-chip-main")).toHaveLength(3);
    expect(tagsWith(out, "data-chip-id")).toHaveLength(3);
    const ids = Array.from(out.matchAll(/data-chip-id(?:="")?>([^<]*)</g), (m) => m[1]);
    expect(ids).toEqual(tokens.map(idLabel));
    expect(tagsWith(out, "data-ch")).toHaveLength(0);
    expect(out).not.toContain(REMOVED_HOOK);
    expect(out).not.toMatch(/data-chip-main(?:="")?>[0-9A-F]{2}(?: [0-9A-F]{2})*</);
  });

  // Test 2
  it("puts the grouped hex on the top line of a partial chip and its ID below, inside the frame with the cut border", () => {
    const out = html({ tokens: partials(0xe7, 0x94, 0xb7), stacked: true });
    expect(tagsWith(out, "data-char-frame")).toHaveLength(1);
    expect(tagsWith(out, "data-chip")).toHaveLength(3);
    expect(tagsWith(out, "data-chip").map((t) => /class="[^"]*\bcut\b/.test(t))).toEqual([false, true, true]);
    for (const pair of ["E7", "94", "B7"]) expect(out).toMatch(new RegExp(`data-chip-main(="")?>${pair}</span>`));
    expect(Array.from(out.matchAll(/data-chip-id(?:="")?>([^<]*)</g), (m) => m[1])).toEqual(["1000", "1001", "1002"]);
    // The top line comes before the ID line inside each chip.
    expect(out.indexOf("data-chip-main")).toBeLessThan(out.indexOf("data-chip-id"));
  });

  // Test 3
  it("shows the ID line on a special chip in the stacked form and no second line in the one-line form", () => {
    const special: Token = { id: 50256, bytes: new TextEncoder().encode("<|endoftext|>"), isPartial: false, special: true };
    const unk: Token = { id: 100, bytes: new TextEncoder().encode("[UNK]"), isPartial: false, special: true };
    const stacked = html({ tokens: [special], stacked: true });
    expect(tagsWith(stacked, "data-chip")[0]).toContain('data-special="true"');
    expect(textOf(innerOf(stacked, "data-chip-id"))).toBe("50256");
    const oneLine = html({ tokens: [unk] });
    expect(tagsWith(oneLine, "data-chip")[0]).toContain('data-special="true"');
    expect(oneLine).toContain(">[UNK]</span>");
    expect(oneLine).not.toContain("data-chip-id");
  });

  // Test 4
  it("keeps the one-line form (comparison and language rows): no ID line, hex on one line for a partial chip", () => {
    const out = html({ tokens: [tok(utf8("hi"), false, 5), ...partials(0xe7, 0x94, 0xb7)] });
    expect(tagsWith(out, "data-chip")).toHaveLength(4);
    expect(tagsWith(out, "data-chip-main")).toHaveLength(4);
    expect(out).not.toContain("data-chip-id");
    expect(out).not.toContain(REMOVED_HOOK);
    for (const pair of ["E7", "94", "B7"]) expect(out).toMatch(new RegExp(`data-chip-main(="")?>${pair}</span>`));
    expect(out).not.toContain("stack-chip");
  });

  // Test 5
  it("never renders U+FFFD, including for lone continuation bytes, in either form", () => {
    const lists: Token[][] = [partials(0x94), partials(0xef, 0xbf, 0xbd), partials(0x80, 0x80, 0xbf), tokenize("\u{1f389} 日本語")];
    for (const tokens of lists) {
      for (const stacked of [false, true]) {
        const out = html({ tokens, stacked });
        expect(out).not.toContain(REPLACEMENT);
        expect(out).not.toContain("&#65533;");
      }
    }
  });

  // Test 6
  it("has no mode or bytes-peek input any more, and no bytes line", () => {
    expect(tokenDisplaySource).not.toMatch(new RegExp(`\\b${REMOVED_PROP}\\b`));
    expect(tokenDisplaySource).not.toMatch(/\bmode\b/);
    expect(tokenDisplaySource).not.toContain(REMOVED_HOOK);
    expect(tokenDisplaySource).not.toContain('"ids"');
  });

  // Test 7
  it("words the default empty state for the layout: no 'above'", () => {
    const out = html({ tokens: [] });
    expect(out).toContain("Nothing to split yet");
    expect(out).toContain("Type or paste some text, or pick an example, and it will be split into tokens here.");
    expect(out).not.toContain("above");
  });

  it("uses the shared stack-chip anatomy, regular size, only in the stacked form", () => {
    const stacked = html({ tokens: [tok(utf8("a"), false, 1)], stacked: true });
    expect(tagsWith(stacked, "data-chip")[0]).toMatch(/class="[^"]*\bstack-chip\b[^"]*\bstack-chip--regular\b/);
    expect(tagsWith(stacked, "data-chip-main")[0]).toMatch(/class="[^"]*\bstack-chip-text\b/);
    expect(tagsWith(stacked, "data-chip-id")[0]).toMatch(/class="[^"]*\bstack-chip-id\b/);
    expect(html({ tokens: [tok(utf8("a"), false, 1)] })).not.toContain("stack-chip");
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
    for (const stacked of [false, true]) {
      const out = html({ tokens: partials(0xef, 0xbf, 0xbd), stacked });
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

  it("renders the hex bytes on the top line and the ID below inside every chip of a frame in the stacked form", () => {
    const out = html({ tokens: partials(0xe7, 0x94, 0xb7), stacked: true });
    expect(tagsWith(out, "data-char-frame")).toHaveLength(1);
    expect(tagsWith(out, "data-chip-id")).toHaveLength(3);
    expect(tagsWith(out, "data-chip-main")).toHaveLength(3);
    expect(out).not.toContain(REMOVED_HOOK);
  });

  it("renders no frame for hand-built ASCII-only tokens", () => {
    const out = html({ tokens: [tok(utf8("hello"), false, 1), tok(utf8(" world"), false, 2)] });
    expect(out).not.toContain("data-char-frame");
    expect(out).not.toContain("data-char-label");
    expect(tagsWith(out, "data-chip")).toHaveLength(2);
  });

  it("GPT-2: renders no frame for the default-style sentence", () => {
    const out = html({ tokens: tokenize("The quick brown fox jumps over the lazy dog.") });
    expect(out).not.toContain("data-char-frame");
    expect(tagsWith(out, "data-chip").length).toBeGreaterThan(0);
  });

  it("GPT-2: renders 日本語 as three frames of two chips each (a two-byte piece and a one-byte piece)", () => {
    const out = html({ tokens: tokenize("日本語") });
    expect(tagsWith(out, "data-char-frame")).toHaveLength(3);
    expect(tagsWith(out, "data-chip")).toHaveLength(6);
    for (const ch of ["日", "本", "語"]) expect(out).toContain(`>${ch}</span>`);
    // Only the second chip of each frame is marked as a cut.
    expect(tagsWith(out, "data-chip").map((t) => /class="[^"]*\bcut\b/.test(t))).toEqual([false, true, false, true, false, true]);
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

  it("hand-built one-byte tokens in the stacked form never get an underlined byte group (a group needs two bytes in one chip)", () => {
    const out = html({ tokens: partials(...utf8("男女")), stacked: true });
    expect(tagsWith(out, "data-ch")).toHaveLength(0);
    expect(out).not.toContain('class="gap"');
  });

  it("GPT-2: the party popper in the stacked form shows hex and an ID on each of its three chips, grouping only the two-byte piece", () => {
    // GPT-2 cuts it into F0 9F, 8E and 89, so one chip holds two bytes of the character.
    const out = html({ tokens: tokenize("\u{1f389}"), stacked: true });
    expect(tagsWith(out, "data-char-frame")).toHaveLength(1);
    expect(tagsWith(out, "data-chip")).toHaveLength(3);
    expect(tagsWith(out, "data-chip-id")).toHaveLength(3);
    expect(tagsWith(out, "data-chip-main")).toHaveLength(3);
    expect(tagsWith(out, "data-ch")).toHaveLength(1);
    expect(out).toContain('data-ch="F0 9F"');
    expect(out).not.toContain('class="gap"');
    expect(out).not.toContain(REPLACEMENT);
  });

  it("GPT-2: 日本語 in the stacked form groups the two-byte piece of each character and leaves the one-byte piece plain", () => {
    const out = html({ tokens: tokenize("日本語"), stacked: true });
    expect(tagsWith(out, "data-chip-id")).toHaveLength(6);
    expect(tagsWith(out, "data-ch")).toHaveLength(3);
    expect(out).not.toContain(REPLACEMENT);
  });

  it("never gives a frame or a label a handler, a tabindex or an aria role", () => {
    const out = html({ tokens: partials(0xe7, 0x94, 0xb7) });
    for (const tag of [...tagsWith(out, "data-char-frame"), ...tagsWith(out, "data-char-label")]) {
      expect(tag).not.toMatch(/\son[a-z]+=|tabindex|role=|title=/);
    }
  });
});

describe("TokenDisplay as a semantic list (server-rendered)", () => {
  /** The inner text of every .sr-only span, in order. */
  const spokenTexts = (markup: string): string[] =>
    Array.from(markup.matchAll(/<span class="sr-only">([^<]*)<\/span>/g), (m) => m[1] as string);

  it("makes the chip row a list with one listitem per token, not hidden from assistive technology", () => {
    const tokens = tokenize("The quick brown fox");
    const out = html({ tokens });
    const rows = tagsWith(out, "role").filter((t) => t.includes('role="list"'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('class="chips"');
    expect(rows[0]).not.toContain("aria-hidden");
    expect(tagsWith(out, "role").filter((t) => t.includes('role="listitem"'))).toHaveLength(tokens.length);
    expect(tagsWith(out, "data-chip")).toHaveLength(tokens.length);
  });

  it("keeps one listitem per token when a split emoji is grouped into a character frame", () => {
    const tokens = [...tokenize("hi "), ...partials(...utf8("\u{1f389}")), ...tokenize(" ok")];
    const out = html({ tokens });
    expect(tagsWith(out, "data-char-frame")).toHaveLength(1);
    expect(tagsWith(out, "role").filter((t) => t.includes('role="listitem"'))).toHaveLength(tokens.length);
    expect(tagsWith(out, "data-chip")).toHaveLength(tokens.length);
  });

  it("gives every chip exactly one non-empty .sr-only span, last, with no replacement character", () => {
    for (const stacked of [false, true]) {
      const tokens = [...tokenize("a b"), ...partials(...utf8("\u{1f389}"))];
      const out = html({ tokens, stacked });
      const spoken = spokenTexts(out);
      expect(spoken).toHaveLength(tokens.length);
      for (const s of spoken) {
        expect(s.trim()).not.toBe("");
        expect(s).not.toContain(REPLACEMENT);
      }
      // The stacked form also speaks the ID that is shown on the second line.
      if (stacked) spoken.forEach((s, i) => expect(s).toContain(`ID ${idLabel(tokens[i] as Token)}`));
      for (const chip of out.split("data-chip ").slice(1)) {
        expect(chip.lastIndexOf("sr-only")).toBeGreaterThan(chip.indexOf("data-chip-main"));
      }
    }
  });

  it("hides the visual main, id and frame label spans from assistive technology", () => {
    const out = html({ tokens: partials(0xe7, 0x94, 0xb7), stacked: true });
    for (const attr of ["data-chip-main", "data-chip-id", "data-char-label"]) {
      const tags = tagsWith(out, attr);
      expect(tags.length).toBeGreaterThan(0);
      for (const tag of tags) expect(tag).toContain('aria-hidden="true"');
    }
    for (const tag of tagsWith(out, "data-chip")) expect(tag).not.toContain("aria-hidden");
  });

  it("renders no list role for an empty token list, with or without the empty state", () => {
    expect(html({ tokens: [] })).not.toContain('role="list"');
    expect(html({ tokens: [], emptyState: false })).not.toContain('role="list"');
  });
});

describe("TokenDisplay special chips (server-rendered)", () => {
  const special = (text: string, id = 100): Token => ({ id, bytes: new TextEncoder().encode(text), isPartial: false, special: true });

  it("marks a special token with data-special and shows its text, never hatched", () => {
    const out = html({ tokens: [special("[UNK]")] });
    const chips = tagsWith(out, "data-chip");
    expect(chips).toHaveLength(1);
    expect(chips[0]).toContain('data-special="true"');
    expect(chips[0]).toContain('data-partial="false"');
    expect(out).toContain(">[UNK]</span>");
    expect(out).not.toContain("data-char-frame");
    expect(out).not.toContain(REPLACEMENT);
  });

  it("leaves an ordinary token without the attribute", () => {
    const out = html({ tokens: [tok([0x68, 0x69], false, 5), ...partials(0xe7, 0x94, 0xb7)] });
    expect(out).not.toContain("data-special");
  });

  it("keeps the palette index by position around a special chip", () => {
    const out = html({ tokens: [tok([0x61], false, 1), special("[UNK]"), tok([0x62], false, 2)] });
    expect(Array.from(out.matchAll(/data-pal="(\d)"/g), (m) => m[1])).toEqual(["0", "1", "2"]);
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

  it("renders no legend when legend is false", () => {
    expect(render2({ legend: false })).not.toContain("data-legend");
  });

  it("keeps the user's line break between the glyph items and the hatched-chips sentence", () => {
    const out = render2({ legend: true });
    expect(out).toMatch(/tab<\/span>\s*<br\s*\/?>\s*<span class="item long[^"]*">Hatched chips are raw bytes/);
  });

  it("always shows the [UNK] sentence in the same item as the hatched sentence, whatever tokens are on screen", () => {
    const UNK = "[UNK] means the tokenizer had no token for that word or character and cannot represent it.";
    const plain = render(TokenLegend, { props: {} }).body.replace(/<!--[\s\S]*?-->/g, "");
    expect(plain).toContain("data-legend");
    expect(plain).toContain(UNK);
    expect(plain.indexOf("Hatched chips are raw bytes")).toBeLessThan(plain.indexOf(UNK));
    expect(plain).not.toContain("keeps whole");
    expect(render2({ legend: true, tokens: [tok([0x68, 0x69], false, 5)] })).toContain(UNK);
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

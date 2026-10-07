import { describe, expect, it } from "vitest";
import { byteLineSegments, groupBytes, isValidUtf8, labelFor, layoutChips, visibleLabels } from "./chars.ts";
import type { Grouping } from "./chars.ts";
import { hexBytes } from "./display.ts";
import { REGRESSION_CORPUS } from "./fixtures/regression-corpus.ts";
import { buildGpt2 } from "./buildTokenizer.ts";
import type { Token } from "./types.ts";

// The corpus block at the bottom runs on real GPT-2 output (D-01). Top-level await keeps
// describe-time tokenising working.
const gpt2 = await buildGpt2();
const tokenize = (text: string): Token[] => gpt2.tokenize(text);

// Build the forbidden character from its code point so no literal sits in this file.
const REPLACEMENT = String.fromCodePoint(0xfffd);

/** Tokens from byte arrays; the partial flag is not used by the grouping. */
const toks = (...parts: number[][]): Token[] =>
  parts.map((bytes, id) => ({ id, bytes: Uint8Array.from(bytes), isPartial: false }));

/** Every byte as its own token, a hand-built shape used by the unit cases above. */
const singles = (...bytes: number[]): Token[] => toks(...bytes.map((b) => [b]));

const utf8 = (text: string): number[] => Array.from(new TextEncoder().encode(text));

const name = (text: string) => ({ text, style: "name" as const });

const labelTexts = (g: Grouping): string[] => g.frames.map((f) => f.labels.map((l) => l.text).join("|"));

describe("groupBytes: one character as three one-byte tokens", () => {
  const g = groupBytes(singles(0xe7, 0x94, 0xb7));

  it("finds one multi-byte character over [0,3) labelled with itself", () => {
    expect(g.chars).toHaveLength(1);
    const c = g.chars[0];
    expect(c?.kind).toBe("multi");
    expect(c?.start).toBe(0);
    expect(c?.end).toBe(3);
    expect(c?.length).toBe(3);
    expect(c?.codePoint).toBe(0x7537);
    expect(c?.label).toEqual({ text: "男", style: "char" });
    expect(c?.firstToken).toBe(0);
    expect(c?.lastToken).toBe(2);
  });

  it("makes one frame over tokens 0 to 2", () => {
    expect(g.frames).toEqual([{ first: 0, last: 2, invalid: false, labels: [{ text: "男", style: "char" }] }]);
    expect(g.tokens.map((t) => t.frame)).toEqual([0, 0, 0]);
  });

  it("gives each token a piece with its byte number out of three", () => {
    expect(g.tokens.map((t) => t.pieces.map((p) => [p.first, p.last, p.from, p.to]))).toEqual([
      [[1, 1, 0, 1]],
      [[2, 2, 0, 1]],
      [[3, 3, 0, 1]],
    ]);
  });
});

describe("groupBytes: frames", () => {
  it("does not frame a character kept whole in one token", () => {
    const g = groupBytes(toks([0xe7, 0x94, 0xb7]));
    expect(g.frames).toEqual([]);
    expect(g.tokens[0]?.frame).toBeNull();
    expect(g.tokens[0]?.pieces).toHaveLength(1);
  });

  it("makes two frames for two characters and three for three", () => {
    expect(groupBytes(singles(...utf8("男女"))).frames).toHaveLength(2);
    expect(groupBytes(singles(...utf8("日本語"))).frames).toHaveLength(3);
  });

  it("frames the party popper cut as [F0 9F], [8E], [89] once, first piece bytes 1 to 2 of 4", () => {
    const g = groupBytes(toks([0xf0, 0x9f], [0x8e], [0x89]));
    expect(g.frames).toHaveLength(1);
    expect(g.frames[0]).toMatchObject({ first: 0, last: 2, invalid: false });
    const first = g.tokens[0]?.pieces[0];
    expect(first?.first).toBe(1);
    expect(first?.last).toBe(2);
    expect(first?.char.length).toBe(4);
  });

  it("gives an ASCII-only list no frames and no pieces, every character single", () => {
    const g = groupBytes(toks(utf8("hello"), utf8(" world")));
    expect(g.frames).toEqual([]);
    expect(g.tokens.every((t) => t.pieces.length === 0 && t.frame === null)).toBe(true);
    expect(g.chars.every((c) => c.kind === "single")).toBe(true);
    expect(g.chars).toHaveLength(11);
  });

  it("frames a stray continuation byte as invalid with the single label invalid", () => {
    const g = groupBytes(singles(0x94));
    expect(g.chars[0]?.kind).toBe("invalid");
    expect(g.chars[0]?.codePoint).toBeNull();
    expect(g.frames).toEqual([{ first: 0, last: 0, invalid: true, labels: [{ text: "invalid", style: "name" }] }]);
  });

  it("spans two tokens when a split character ends in the second and ASCII follows", () => {
    const g = groupBytes(toks([0xe5, 0xa5], [0xb3, 0x20, 0x74]));
    expect(g.frames).toHaveLength(1);
    expect(g.frames[0]).toMatchObject({ first: 0, last: 1 });
    const second = g.tokens[1];
    expect(second?.pieces).toHaveLength(1);
    expect(second?.pieces[0]).toMatchObject({ first: 3, last: 3, from: 0, to: 1 });
    // The two ASCII characters are in chars but never in pieces.
    expect(g.chars.filter((c) => c.kind === "single")).toHaveLength(2);
  });

  it("labels EF BF BD cut into three tokens as one placeholder frame", () => {
    const g = groupBytes(singles(0xef, 0xbf, 0xbd));
    expect(g.frames).toHaveLength(1);
    expect(g.frames[0]?.labels).toEqual([{ text: "placeholder", style: "name" }]);
  });

  it("never lets the replacement character into any label", () => {
    const cases = [
      singles(0xef, 0xbf, 0xbd),
      singles(0x94),
      singles(0xf5),
      singles(0xe7, 0x94),
      toks([0xe7, 0x94], [0xb7, 0xf5]),
      singles(...utf8("男\u{1f389}")),
    ];
    for (const tokens of cases) {
      const g = groupBytes(tokens);
      for (const c of g.chars) expect(c.label.text).not.toContain(REPLACEMENT);
      for (const f of g.frames) for (const l of f.labels) expect(l.text).not.toContain(REPLACEMENT);
    }
  });

  it("gives a token with no bytes no pieces and no frame", () => {
    const g = groupBytes(toks([], [0x41]));
    expect(g.tokens[0]).toEqual({ pieces: [], frame: null, partial: false });
    expect(g.frames).toEqual([]);
  });

  it("returns empty lists for no tokens", () => {
    expect(groupBytes([])).toEqual({ chars: [], tokens: [], frames: [] });
  });

  it("gives deep-equal results for the same input twice", () => {
    const tokens = singles(...utf8("男a\u{1f389}"));
    expect(groupBytes(tokens)).toEqual(groupBytes(tokens));
  });

  it("copies the partial flag from the token", () => {
    const g = groupBytes([{ id: 1, bytes: Uint8Array.of(0xe7), isPartial: true }]);
    expect(g.tokens[0]?.partial).toBe(true);
  });
});

describe("layoutChips", () => {
  const cases: Array<[string, Token[]]> = [
    ["one character", singles(0xe7, 0x94, 0xb7)],
    ["two characters", singles(...utf8("男女"))],
    ["mixed with ASCII", toks(utf8("hi "), [0xe7], [0x94], [0xb7], utf8("!"))],
    ["ASCII only", toks(utf8("hello"), utf8(" world"))],
    ["a stray byte", singles(0x41, 0x94, 0x42)],
    ["a zero-byte token", toks([], [0xe7], [0x94], [0xb7])],
    ["nothing", []],
  ];

  for (const [name, tokens] of cases) {
    it(`visits every token index exactly once and in order: ${name}`, () => {
      const items = layoutChips(groupBytes(tokens));
      const seen = items.flatMap((item) => (item.kind === "chip" ? [item.index] : item.indices));
      expect(seen).toEqual(tokens.map((_, i) => i));
    });
  }

  it("yields one frame item per frame with all of its indices", () => {
    const items = layoutChips(groupBytes(toks(utf8("a"), [0xe7], [0x94], [0xb7], utf8("b"))));
    expect(items.map((i) => i.kind)).toEqual(["chip", "frame", "chip"]);
    const frame = items[1];
    expect(frame?.kind === "frame" ? frame.indices : []).toEqual([1, 2, 3]);
  });

  it("yields a chip item for a whole multi-byte character in one token", () => {
    expect(layoutChips(groupBytes(toks([0xe7, 0x94, 0xb7])))).toEqual([{ kind: "chip", index: 0 }]);
  });

  it("gives the frame labels in order for two adjacent characters", () => {
    expect(labelTexts(groupBytes(singles(...utf8("男女"))))).toEqual(["男", "女"]);
  });
});

describe("labelFor: every row of the UI-SPEC Labels table", () => {
  const named: Array<[string, number, string]> = [
    ["joiner", 0x200d, "joiner"],
    ["hidden space", 0x200b, "hidden space"],
    ["hidden separator", 0x200c, "hidden separator"],
    ["emoji style", 0xfe0f, "emoji style"],
    ["text style", 0xfe0e, "text style"],
    ["BOM", 0xfeff, "hidden mark"],
    ["no-break space", 0xa0, "no-break space"],
    ["wide space", 0x3000, "wide space"],
    ["U+FFFD", 0xfffd, "placeholder"],
    ["em space (other space separator)", 0x2003, "space"],
    ["C1 control NEL", 0x85, "control character"],
    ["line separator", 0x2028, "hidden mark"],
    ["paragraph separator", 0x2029, "hidden mark"],
    ["right-to-left override", 0x202e, "hidden mark"],
    ["private use", 0xe000, "hidden mark"],
    ["unassigned", 0x378, "hidden mark"],
    ["soft hyphen (other format)", 0xad, "hidden mark"],
  ];
  for (const [what, cp, word] of named) {
    it(`${what} (U+${cp.toString(16).toUpperCase().padStart(4, "0")}) is the name label ${word}`, () => {
      expect(labelFor("multi", cp)).toEqual({ text: word, style: "name" });
    });
  }

  it("shows a combining mark as a dotted circle followed by the mark, in character style", () => {
    expect(labelFor("multi", 0x301)).toEqual({ text: "◌́", style: "char" });
    expect(labelFor("multi", 0x94d)).toEqual({ text: "◌्", style: "char" });
  });

  it("shows ordinary characters as themselves, in character style", () => {
    for (const cp of [0x7537, 0x1f389, 0xe9]) {
      expect(labelFor("multi", cp)).toEqual({ text: String.fromCodePoint(cp), style: "char" });
    }
  });

  it("labels an invalid byte invalid, whatever code point is passed", () => {
    expect(labelFor("invalid", null)).toEqual({ text: "invalid", style: "name" });
  });

  it("never renders a bidirectional control or format character as itself", () => {
    for (const cp of [0x202e, 0x202d, 0x2066, 0x200e, 0x200f, 0x2028, 0x2029, 0x85, 0xfeff]) {
      expect(labelFor("multi", cp).style).toBe("name");
    }
  });

  it("builds name labels from plain lowercase words only", () => {
    for (const [, cp] of named) {
      const label = labelFor("multi", cp);
      expect(label.text).toMatch(/^[a-z][a-z -]*$/);
    }
  });
});

describe("groupBytes: the UTF-8 walk", () => {
  it("treats a truncated E7 94 at the end of the stream as two invalid characters", () => {
    const g = groupBytes(singles(0xe7, 0x94));
    expect(g.chars.map((c) => c.kind)).toEqual(["invalid", "invalid"]);
  });

  it("treats an overlong C0 80 as two invalid characters", () => {
    expect(groupBytes(singles(0xc0, 0x80)).chars.map((c) => c.kind)).toEqual(["invalid", "invalid"]);
  });

  it("treats the surrogate encoding ED A0 80 as three invalid characters", () => {
    expect(groupBytes(singles(0xed, 0xa0, 0x80)).chars.map((c) => c.kind)).toEqual([
      "invalid",
      "invalid",
      "invalid",
    ]);
  });

  it("treats F5 as one invalid character", () => {
    expect(groupBytes(singles(0xf5)).chars.map((c) => c.kind)).toEqual(["invalid"]);
  });

  it("applies the second-byte limits after E0, F0 and F4", () => {
    expect(groupBytes(toks([0xe0, 0x9f, 0x80])).chars.every((c) => c.kind === "invalid")).toBe(true);
    expect(groupBytes(toks([0xe0, 0xa0, 0x80])).chars[0]?.codePoint).toBe(0x800);
    expect(groupBytes(toks([0xf0, 0x8f, 0x80, 0x80])).chars.every((c) => c.kind === "invalid")).toBe(true);
    expect(groupBytes(toks([0xf0, 0x90, 0x80, 0x80])).chars[0]?.codePoint).toBe(0x10000);
    expect(groupBytes(toks([0xf4, 0x90, 0x80, 0x80])).chars.every((c) => c.kind === "invalid")).toBe(true);
    expect(groupBytes(toks([0xf4, 0x8f, 0xbf, 0xbf])).chars[0]?.codePoint).toBe(0x10ffff);
  });

  it("restarts at the byte after a failed lead, so a valid character right after it is found", () => {
    const g = groupBytes(toks([0xe7, 0x41]));
    expect(g.chars.map((c) => c.kind)).toEqual(["invalid", "single"]);
  });

  it("computes code points arithmetically for 2, 3 and 4 byte characters", () => {
    for (const ch of ["é", "男", "\u{1f389}", "€"]) {
      const g = groupBytes(toks(utf8(ch)));
      expect(g.chars[0]?.codePoint).toBe(ch.codePointAt(0));
    }
  });

  it("makes the pair F5, F6 as two one-byte tokens two separate dotted frames", () => {
    const g = groupBytes(singles(0xf5, 0xf6));
    expect(g.frames).toHaveLength(2);
    expect(g.frames.every((f) => f.invalid)).toBe(true);
    expect(labelTexts(g)).toEqual(["invalid", "invalid"]);
  });

  it("makes [E7 94] and [B7 F5] one solid frame labelled 男 only, token 1 holding two pieces", () => {
    const g = groupBytes(toks([0xe7, 0x94], [0xb7, 0xf5]));
    expect(g.frames).toHaveLength(1);
    expect(g.frames[0]?.invalid).toBe(false);
    expect(labelTexts(g)).toEqual(["男"]);
    expect(g.tokens[1]?.pieces).toHaveLength(2);
    expect(g.tokens[1]?.pieces[1]?.char.kind).toBe("invalid");
  });

  it("gives a chip holding 日本語 whole plus the first byte of the next character four pieces", () => {
    const g = groupBytes(toks([...utf8("日本語"), 0xe3], [0x81, 0x93]));
    expect(g.tokens[0]?.pieces).toHaveLength(4);
    expect(g.frames).toHaveLength(1);
    expect(labelTexts(g)).toEqual(["こ"]);
  });
});

describe("groupBytes: frame labels", () => {
  it("gives the family emoji five frames labelled man, joiner, woman, joiner, girl", () => {
    const g = groupBytes(singles(...utf8("\u{1f468}‍\u{1f469}‍\u{1f467}")));
    expect(labelTexts(g)).toEqual(["\u{1f468}", "joiner", "\u{1f469}", "joiner", "\u{1f467}"]);
  });

  it("frames the accent of a decomposed é and leaves the e token unframed", () => {
    const g = groupBytes(toks([0x65], [0xcc], [0x81]));
    expect(g.frames).toHaveLength(1);
    expect(g.frames[0]).toMatchObject({ first: 1, last: 2 });
    expect(labelTexts(g)).toEqual(["◌́"]);
    expect(g.tokens[0]?.frame).toBeNull();
  });

  it("lists every split character in one frame when each pair of neighbours is linked", () => {
    // 男, 女, 日, 本, 語 each cut across two neighbouring tokens.
    const g = groupBytes(
      toks([0xe7, 0x94], [0xb7, 0xe5, 0xa5], [0xb3, 0xe6, 0x97], [0xa5, 0xe6, 0x9c], [0xac, 0xe8, 0xaa], [0x9e]),
    );
    expect(g.frames).toHaveLength(1);
    expect(g.frames[0]?.labels.map((l) => l.text)).toEqual(["男", "女", "日", "本", "語"]);
    const frame = g.frames[0];
    if (frame === undefined) throw new Error("no frame");
    const v = visibleLabels(frame);
    expect(v.shown).toHaveLength(3);
    expect(v.more).toBe(2);
  });

  it("shows all labels and a zero remainder for a frame with three or fewer", () => {
    const v = visibleLabels({ first: 0, last: 0, invalid: false, labels: [name("a"), name("b"), name("c")] });
    expect(v.shown).toHaveLength(3);
    expect(v.more).toBe(0);
  });
});

describe("byteLineSegments", () => {
  /** Segments of token `at` in a list, plus the check that they rejoin to the plain hex line. */
  const segmentsOf = (tokens: Token[], at: number) => {
    const token = tokens[at] as Token;
    const segments = byteLineSegments(token, groupBytes(tokens).tokens[at]);
    expect(segments.map((s) => s.text).join(" ")).toBe(hexBytes(token.bytes));
    return segments;
  };

  it("keeps a normal line plain and unchanged", () => {
    expect(segmentsOf(toks([0x48, 0x65, 0x6c]), 0)).toEqual([{ text: "48 65 6C", group: false }]);
  });

  it("makes two whole characters in one token two group segments", () => {
    expect(segmentsOf(toks([0xe6, 0x97, 0xa5, 0xe6, 0x9c, 0xac]), 0)).toEqual([
      { text: "E6 97 A5", group: true },
      { text: "E6 9C AC", group: true },
    ]);
  });

  it("puts ASCII on either side of a group in plain segments", () => {
    expect(segmentsOf(toks([0x41, 0xe6, 0x97, 0xa5, 0x42]), 0)).toEqual([
      { text: "41", group: false },
      { text: "E6 97 A5", group: true },
      { text: "42", group: false },
    ]);
  });

  it("groups two bytes of a split character and leaves the lone leftover byte plain", () => {
    const tokens = toks([0xe7, 0x94], [0xb7]);
    expect(segmentsOf(tokens, 0)).toEqual([{ text: "E7 94", group: true }]);
    expect(segmentsOf(tokens, 1)).toEqual([{ text: "B7", group: false }]);
  });

  it("keeps the end of a split character and the ASCII after it in one plain segment", () => {
    expect(segmentsOf(toks([0xe5, 0xa5], [0xb3, 0x20, 0x74]), 1)).toEqual([{ text: "B3 20 74", group: false }]);
  });

  it("gives an invalid byte a plain segment", () => {
    expect(segmentsOf(toks([0xf5]), 0)).toEqual([{ text: "F5", group: false }]);
  });

  it("gives one plain segment equal to the hex text when there is no grouping data", () => {
    const token = toks([0xe7, 0x94, 0xb7])[0] as Token;
    expect(byteLineSegments(token, undefined)).toEqual([{ text: "E7 94 B7", group: false }]);
  });

  it("gives no segments for a token without bytes", () => {
    const tokens = toks([]);
    expect(byteLineSegments(tokens[0] as Token, groupBytes(tokens).tokens[0])).toEqual([]);
  });

  it("never drops or reorders a byte, across every kind of input", () => {
    const cases = [
      toks([0x61, 0xe6, 0x97, 0xa5, 0xe6, 0x9c], [0xac, 0x62]),
      toks([0xf0, 0x9f, 0x8e, 0x89, 0xf0, 0x9f]),
      toks([0x94, 0xe7, 0x94, 0xb7, 0xf5, 0x41]),
      toks(utf8("hello 男女!")),
    ];
    for (const tokens of cases) tokens.forEach((_, i) => segmentsOf(tokens, i));
  });
});

describe("regression corpus through GPT-2", () => {
  // Re-derived from GPT-2's output. Characters GPT-2 keeps whole in one token get no frame, so the
  // lone surrogate (one whole replacement-character token), the zero-width space and the
  // precomposed é have none.
  const FRAME_COUNTS: Record<string, number> = {
    japanese: 3,
    chinese: 5,
    flag: 2,
    "zwj-family": 5,
    "lone-surrogate": 0,
    bom: 1,
    "zero-width": 0,
    "emoji-example": 1,
    "cafe-precomposed": 0,
    "cafe-decomposed": 1,
    "fifth-example": 3,
  };
  const entries = [...REGRESSION_CORPUS, { name: "fifth-example", text: "男女 こんにちは" }];

  for (const { name: entryName, text } of entries) {
    describe(entryName, () => {
      const tokens = tokenize(text);
      const g = groupBytes(tokens);
      const ascii = !/[^\u0000-\u007f]/.test(text);

      it("frames every partial token and no other", () => {
        // A token is partial exactly when its bytes are not valid UTF-8 alone, which is exactly
        // when it holds only part of a multi-byte character, and that is when the grouping frames it.
        // GPT-2 may keep a whole multi-byte character in one token; that token is neither.
        tokens.forEach((t, i) => {
          expect(g.tokens[i]?.frame !== null, `token ${i}`).toBe(t.isPartial);
        });
      });

      it("gives the expected frame count", () => {
        const expected = ascii ? 0 : FRAME_COUNTS[entryName];
        // Entries without a stated count (Devanagari, Arabic, Hebrew, controls) only get the
        // two invariants above and below.
        if (expected !== undefined) expect(g.frames).toHaveLength(expected);
      });

      it("never lets the replacement character into a label", () => {
        for (const c of g.chars) expect(c.label.text).not.toContain(REPLACEMENT);
        for (const f of g.frames) for (const l of f.labels) expect(l.text).not.toContain(REPLACEMENT);
      });
    });
  }

  it("labels the BOM hidden mark; GPT-2 keeps the lone surrogate and the zero-width space whole, so they get no label", () => {
    const labelOf = (text: string) => labelTexts(groupBytes(tokenize(text)));
    expect(labelOf("﻿hello")).toEqual(["hidden mark"]);
    expect(labelOf("\uD83D")).toEqual([]);
    expect(labelOf("a​b")).toEqual([]);
  });

  it("gives 男女 こんにちは three frames, six hatched chips and four whole chips", () => {
    // 男, こ and ち are each cut across two tokens; 女, ん, に and は arrive whole.
    const tokens = tokenize("男女 こんにちは");
    const g = groupBytes(tokens);
    expect(g.frames).toHaveLength(3);
    expect(labelTexts(g)).toEqual(["男", "こ", "ち"]);
    expect(tokens.filter((t) => t.isPartial)).toHaveLength(6);
    expect(tokens.filter((t) => !t.isPartial)).toHaveLength(4);
  });
});

describe("isValidUtf8", () => {
  const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values);

  it("accepts ASCII and two-, three- and four-byte characters", () => {
    expect(isValidUtf8(new TextEncoder().encode("Hi"))).toBe(true);
    expect(isValidUtf8(bytes(0xc3, 0xa9))).toBe(true);
    expect(isValidUtf8(bytes(0xe6, 0x97, 0xa5))).toBe(true);
    expect(isValidUtf8(bytes(0xf0, 0x9f, 0x90, 0xb1))).toBe(true);
    expect(isValidUtf8(bytes())).toBe(true);
  });

  it("keeps a byte-order mark as three valid bytes instead of stripping it", () => {
    expect(isValidUtf8(bytes(0xef, 0xbb, 0xbf))).toBe(true);
  });

  it("rejects a lone continuation byte, a cut-off sequence and an overlong form", () => {
    expect(isValidUtf8(bytes(0x80))).toBe(false);
    expect(isValidUtf8(bytes(0xf0, 0x9f))).toBe(false);
    expect(isValidUtf8(bytes(0xe6, 0x97))).toBe(false);
    expect(isValidUtf8(bytes(0xc0, 0xaf))).toBe(false);
  });
});

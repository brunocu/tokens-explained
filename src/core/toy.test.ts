import { describe, expect, it } from "vitest";
import { createToyTokenizer, tokenize } from "./toy.ts";
import { presplit } from "./presplit.ts";
import { chipText } from "./display.ts";

const concat = (tokens: { bytes: Uint8Array }[]): number[] => tokens.flatMap((t) => Array.from(t.bytes));

describe("toy tokenizer", () => {
  it("returns an empty list for empty text", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("with an empty merge list, Hi is the raw byte values", () => {
    const bare = createToyTokenizer({
      meta: { corpus: "test", retrieved: "n/a", merges: 0, tieBreak: "n/a", preSplit: "n/a" },
      merges: [],
    });
    expect(bare.tokenize("Hi").map((t) => t.id)).toEqual([72, 105]);
  });

  it("applies a hand-made merge: id 256 is the concatenated bytes", () => {
    const tk = createToyTokenizer({
      meta: { corpus: "test", retrieved: "n/a", merges: 1, tieBreak: "n/a", preSplit: "n/a" },
      merges: [[72, 105]],
    });
    const out = tk.tokenize("Hi");
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe(256);
    expect(Array.from(out[0]?.bytes ?? [])).toEqual([72, 105]);
    expect(out[0]?.isPartial).toBe(false);
  });

  it("splits an emoji into four partial tokens with no replacement character", () => {
    const out = tokenize("\u{1F642}");
    expect(out).toHaveLength(4);
    expect(out.every((t) => t.isPartial)).toBe(true);
    for (const t of out) expect(chipText(t)).not.toContain("�");
  });

  it("round-trips mixed text to the exact UTF-8 bytes", () => {
    const text = "abc \u{1F642} 日本語\nline two";
    expect(concat(tokenize(text))).toEqual(Array.from(new TextEncoder().encode(text)));
  });

  it("encodes a lone surrogate as EF BF BD and never shows U+FFFD", () => {
    const out = tokenize("\uD83D");
    expect(concat(out)).toEqual([0xef, 0xbf, 0xbd]);
    for (const t of out) expect(chipText(t)).not.toContain("�");
  });

  it("returns copies, so consumers cannot mutate the vocabulary", () => {
    const a = tokenize("A");
    (a[0]?.bytes as Uint8Array)[0] = 0;
    expect(Array.from(tokenize("A")[0]?.bytes ?? [])).toEqual([65]);
  });
});

describe("presplit", () => {
  it("attaches the leading space to the next word", () => {
    expect(presplit(" hello world")).toEqual([" hello", " world"]);
  });
});

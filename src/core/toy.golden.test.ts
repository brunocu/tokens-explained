import { describe, expect, it } from "vitest";
import mergesJson from "./toy/merges.json" with { type: "json" };
import { toy, tokenize } from "./toy.ts";
import { presplit } from "./presplit.ts";
import { DEFAULT_TEXT, EXAMPLES } from "./examples.ts";
import type { MergeData } from "./types.ts";
import { trainMerges } from "../../scripts/lib/bpe-train.ts";
import alice from "../../scripts/corpus/alice.txt?raw";
import supplement from "../../scripts/corpus/supplement.txt?raw";

const data = mergesJson as unknown as MergeData;
const encodeBytes = (text: string): number[] => Array.from(new TextEncoder().encode(text));
const concat = (tokens: { bytes: Uint8Array }[]): number[] => tokens.flatMap((t) => Array.from(t.bytes));

describe("shipped merge list", () => {
  it("(a) records a merge count that matches the list and lies between 600 and 800", () => {
    expect(data.meta.merges).toBe(data.merges.length);
    expect(data.merges.length).toBeGreaterThanOrEqual(600);
    expect(data.merges.length).toBeLessThanOrEqual(800);
  });

  it("(b) lays out ids as 256 + merge count, and id 256 is its two parts joined", () => {
    expect(toy.vocabSize).toBe(256 + data.merges.length);
    const first = data.merges[0] as readonly [number, number];
    expect(Array.from(toy.vocabBytes(256))).toEqual([
      ...Array.from(toy.vocabBytes(first[0])),
      ...Array.from(toy.vocabBytes(first[1])),
    ]);
    for (let id = 0; id < 256; id++) expect(Array.from(toy.vocabBytes(id))).toEqual([id]);
  });

  it("(c) has only ASCII bytes in every merged token, so isPartial is exact", () => {
    for (let id = 256; id < toy.vocabSize; id++) {
      for (const b of toy.vocabBytes(id)) expect(b).toBeLessThan(0x80);
    }
  });
});

describe("trainer goldens", () => {
  it("(d) hand-computed tie-break: low lower newest widest gives [es] then [lo]", () => {
    expect(trainMerges("low lower newest widest", 2)).toEqual([
      [101, 115],
      [108, 111],
    ]);
  });

  it("(e) is deterministic", () => {
    expect(trainMerges(supplement, 30)).toEqual(trainMerges(supplement, 30));
  });

  it("stops early when no pair remains", () => {
    expect(trainMerges("a", 5)).toEqual([]);
  });
});

describe("default text and examples against the shipped merges", () => {
  it("(f) default text: a word splits, a token starts with a space, a 3+ letter word is whole", () => {
    const pieces = presplit(DEFAULT_TEXT);
    expect(pieces.some((p) => /\p{L}/u.test(p) && tokenize(p).length >= 2)).toBe(true);
    expect(tokenize(DEFAULT_TEXT).some((t) => t.bytes[0] === 0x20 && t.bytes.length >= 2)).toBe(true);
    expect(pieces.some((p) => /^ ?\p{L}{3,}$/u.test(p) && tokenize(p).length === 1)).toBe(true);
  });

  it("(g) the examples round-trip bytes and behave as the UI-SPEC expects", () => {
    for (const ex of EXAMPLES) {
      expect(concat(tokenize(ex.text))).toEqual(encodeBytes(ex.text));
    }
    const numbers = EXAMPLES.find((e) => e.id === "numbers-dates")!;
    const numberTokens = tokenize(numbers.text);
    expect(numberTokens.length).toBeLessThan(encodeBytes(numbers.text).length);
    expect(numberTokens.some((t) => /\d\d/.test(String.fromCharCode(...t.bytes)))).toBe(true);

    const literature = EXAMPLES.find((e) => e.id === "literature")!;
    expect(tokenize(literature.text).length).toBeLessThan([...literature.text].length);
  });
});

describe("corpus hygiene", () => {
  it("(h) alice.txt is ASCII-only and has no mention of the distributor", () => {
    expect(/[^\x00-\x7f]/.test(alice)).toBe(false);
    expect(/gutenberg/i.test(alice)).toBe(false);
  });

  it("(h) neither corpus file contains an example text or the default sentence", () => {
    const texts = [DEFAULT_TEXT, ...EXAMPLES.map((e) => e.text)];
    for (const text of texts) {
      expect(alice.includes(text)).toBe(false);
      expect(supplement.includes(text)).toBe(false);
    }
  });
});

describe("purity", () => {
  it("(i) tokenizing twice is deep-equal, and mutating a result changes nothing later", () => {
    const first = tokenize(DEFAULT_TEXT);
    const second = tokenize(DEFAULT_TEXT);
    expect(second).toEqual(first);
    (first[0]?.bytes as Uint8Array)[0] = 0;
    expect(tokenize(DEFAULT_TEXT)).toEqual(second);
  });
});

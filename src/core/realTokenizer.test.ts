import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { groupBytes } from "./chars.ts";
import { GLYPH_SPACE, chipText, tableCell } from "./display.ts";
import { DEFAULT_TEXT, EXAMPLES } from "./examples.ts";
import { createRealTokenizer, gpt2ByteDecoder } from "./realTokenizer.ts";
import type { RealTokenizer, RealTokenizerId, TokenizerCtor } from "./realTokenizer.ts";
import type { Token } from "./types.ts";

const REPLACEMENT = String.fromCodePoint(0xfffd);
const G_DOT = String.fromCodePoint(0x0120);
const C_DOT = String.fromCodePoint(0x010a);

type Reference = { ids: number[]; tokens: string[] };
type Case = { name: string; text: string; gpt2: Reference; bert: Reference };
type Golden = { header: { generator: string; tokenizers: string }; cases: Case[] };

const loadJson = (path: string): object => JSON.parse(readFileSync(path, "utf8")) as object;
const golden = loadJson("src/core/fixtures/adapter-parity.json") as Golden;

const encoder = new TextEncoder();
const utf8 = (text: string): number[] => Array.from(encoder.encode(text));
const join = (tokens: Token[]): number[] => tokens.flatMap((t) => Array.from(t.bytes));
const shownTexts = (tokens: Token[]): string[] => {
  const grouping = groupBytes(tokens);
  return tokens.flatMap((token, i) => [chipText(token), tableCell(token, grouping.tokens[i])]);
};

const real = {} as Record<RealTokenizerId, RealTokenizer>;

beforeAll(async () => {
  const { Tokenizer } = await import("@huggingface/tokenizers");
  const Ctor = Tokenizer as unknown as TokenizerCtor;
  real.gpt2 = createRealTokenizer("gpt2", loadJson("public/tokenizers/gpt2.json"), Ctor);
  real.bert = createRealTokenizer("bert", loadJson("public/tokenizers/bert-uncased.json"), Ctor);
});

describe("gpt2ByteDecoder", () => {
  it("is a bijection over all 256 bytes", () => {
    const table = gpt2ByteDecoder();
    expect(table.size).toBe(256);
    expect(new Set(table.values()).size).toBe(256);
  });

  it("maps the space and newline marks back to 0x20 and 0x0A", () => {
    const table = gpt2ByteDecoder();
    expect(table.get(G_DOT)).toBe(0x20);
    expect(table.get(C_DOT)).toBe(0x0a);
    expect(table.get("A")).toBe(0x41);
  });
});

describe("GPT-2 through the adapter (tracer)", () => {
  const emoji = EXAMPLES.find((e) => e.id === "emoji")?.text as string;
  const cases = [emoji, "Hello \u{1F389}"];

  it.each(cases)("round-trips to the input's UTF-8 bytes: %s", (text) => {
    expect(join(real.gpt2.tokenize(text))).toEqual(utf8(text));
  });

  it.each(cases)("shows at least one partial piece: %s", (text) => {
    expect(real.gpt2.tokenize(text).some((t) => t.isPartial)).toBe(true);
  });

  it.each(cases)("never shows a replacement character or a raw GPT-2 mark: %s", (text) => {
    for (const shown of shownTexts(real.gpt2.tokenize(text))) {
      expect(shown).not.toContain(REPLACEMENT);
      expect(shown).not.toContain(G_DOT);
      expect(shown).not.toContain(C_DOT);
    }
  });

  it("shows the glyph for a leading space", () => {
    expect(real.gpt2.tokenize("Hello world").map(chipText)).toContain(`${GLYPH_SPACE}world`);
  });
});

describe("reference golden (D-11, T-02-06)", () => {
  it("has a header with the generator and 28 cases", () => {
    expect(golden.header.generator).toContain("gen-adapter-parity.py");
    expect(golden.header.tokenizers).toMatch(/^\d+\.\d+\.\d+$/);
    expect(golden.cases).toHaveLength(28);
    expect(new Set(golden.cases.map((c) => c.name)).size).toBe(28);
  });

  it("repeats the app's example texts and default text", () => {
    const byName = new Map(golden.cases.map((c) => [c.name, c.text]));
    for (const example of EXAMPLES) expect(byName.get(`example-${example.id}`)).toBe(example.text);
    expect(byName.get("default-text")).toBe(DEFAULT_TEXT);
  });

  for (const id of ["gpt2", "bert"] as const) {
    describe(id, () => {
      it.each(golden.cases.map((c) => [c.name, c] as const))("%s: ids and token strings equal the reference", (_name, c) => {
        expect(real[id].encodeRaw(c.text)).toEqual(c[id]);
      });

      it.each(golden.cases.map((c) => [c.name, c] as const))("%s: tokenize ids equal encodeRaw ids", (_name, c) => {
        expect(real[id].tokenize(c.text).map((t) => t.id)).toEqual(c[id].ids);
      });

      it.each(golden.cases.map((c) => [c.name, c] as const))("%s: no replacement character in any shown text", (_name, c) => {
        for (const shown of shownTexts(real[id].tokenize(c.text))) expect(shown).not.toContain(REPLACEMENT);
      });
    });
  }

  it.each(golden.cases.map((c) => [c.name, c] as const))("gpt2 %s: token bytes concatenate to the input's UTF-8 bytes", (_name, c) => {
    expect(join(real.gpt2.tokenize(c.text))).toEqual(utf8(c.text));
  });

  it.each(golden.cases.map((c) => [c.name, c] as const))("gpt2 %s: no raw space or newline mark in any shown text", (_name, c) => {
    for (const shown of shownTexts(real.gpt2.tokenize(c.text))) {
      expect(shown).not.toContain(G_DOT);
      expect(shown).not.toContain(C_DOT);
    }
  });
});

describe("BERT behaviour", () => {
  const strings = (tokens: Token[]): string[] => tokens.map((t) => new TextDecoder().decode(t.bytes));

  it("adds no [CLS] or [SEP] around the text", () => {
    expect(strings(real.bert.tokenize("Hello World"))).toEqual(["hello", "world"]);
  });

  it("turns a whole word with an emoji into exactly one [UNK] special token", () => {
    const tokens = real.bert.tokenize("unbelievable\u{1F389}");
    expect(tokens).toHaveLength(1);
    const unk = tokens[0] as Token;
    expect(unk.special).toBe(true);
    expect(unk.isPartial).toBe(false);
    expect(Array.from(unk.bytes)).toEqual(utf8("[UNK]"));
    expect(chipText(unk)).toBe("[UNK]");
  });

  it("keeps ## pieces as literal text", () => {
    const shown = real.bert.tokenize("unaffordable").map(chipText);
    expect(shown).toEqual(["una", "##ff", "##ord", "##able"]);
  });

  it("marks ordinary tokens as not special", () => {
    for (const token of real.bert.tokenize("hello world")) expect(token.special ?? false).toBe(false);
  });
});

describe("typed special markers", () => {
  it.each(["[CLS]", "[SEP]", "[UNK]"])("BERT marks typed %s as special", (marker) => {
    const tokens = real.bert.tokenize(marker);
    expect(tokens).toHaveLength(1);
    expect((tokens[0] as Token).special).toBe(true);
    expect(chipText(tokens[0] as Token)).toBe(marker);
  });

  it("GPT-2 marks typed <|endoftext|> as special", () => {
    const tokens = real.gpt2.tokenize("<|endoftext|>");
    expect(tokens).toHaveLength(1);
    expect((tokens[0] as Token).special).toBe(true);
    expect(chipText(tokens[0] as Token)).toBe("<|endoftext|>");
  });
});

describe("lone surrogate (JavaScript only)", () => {
  const text = `a${String.fromCharCode(0xd800)}b`;

  it.each(["gpt2", "bert"] as const)("%s never throws and never shows a replacement character", (id) => {
    const tokens = real[id].tokenize(text);
    expect(tokens.length).toBeGreaterThan(0);
    for (const shown of shownTexts(tokens)) expect(shown).not.toContain(REPLACEMENT);
  });
});

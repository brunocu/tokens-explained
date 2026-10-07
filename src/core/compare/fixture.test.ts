import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { buildComparison, formatComparison } from "../../../scripts/lib/comparison-build.ts";
import type { Manifest } from "../../../scripts/lib/comparison-build.ts";
import { chipText } from "../display.ts";
import { EXAMPLES } from "../examples.ts";
import { createRealTokenizer } from "../realTokenizer.ts";
import type { RealTokenizer, TokenizerCtor } from "../realTokenizer.ts";
import { TOKENIZER_FILES, sizeLabelMb } from "../tokenizerFiles.ts";
import { toy } from "../toy.ts";
import type { Token } from "../types.ts";
import { COMPARISON } from "./comparison.ts";
import { LANGUAGES, SOURCE_PAGE } from "./languages.ts";
import { countUnk, fixtureTokens } from "./fixture.ts";
import type { ComparisonFixture, FixtureRows } from "./fixture.ts";

const REPLACEMENT = String.fromCodePoint(0xfffd);
const G_DOT = String.fromCodePoint(0x0120);
const C_DOT = String.fromCodePoint(0x010a);

const loadJson = (path: string): object => JSON.parse(readFileSync(path, "utf8")) as object;
const manifest = loadJson("public/tokenizers/manifest.json") as Manifest;
const mergesText = readFileSync("src/core/toy/merges.json", "utf8");

let gpt2: RealTokenizer;
let bert: RealTokenizer;

beforeAll(async () => {
  const { Tokenizer } = await import("@huggingface/tokenizers");
  const Ctor = Tokenizer as unknown as TokenizerCtor;
  gpt2 = createRealTokenizer("gpt2", loadJson(`public/tokenizers/${TOKENIZER_FILES.gpt2}`), Ctor);
  bert = createRealTokenizer("bert", loadJson(`public/tokenizers/${TOKENIZER_FILES.bert}`), Ctor);
});

const encoder = new TextEncoder();
const join = (tokens: Token[]): number[] => tokens.flatMap((t) => Array.from(t.bytes));

/** The fixture without its date, as the object a fresh computation must equal. */
const withoutDate = (fixture: ComparisonFixture): unknown => {
  const { generatedAt: _date, ...meta } = fixture.meta;
  return { ...fixture, meta };
};

const allRows = (): Array<{ where: string; rows: FixtureRows }> => [
  ...COMPARISON.examples.map((e) => ({ where: `example ${e.id}`, rows: e.rows })),
  ...COMPARISON.languages.map((l) => ({ where: `language ${l.id}`, rows: l.rows })),
];

describe("comparison fixture", () => {
  it("has exactly the ids, labels and texts of the playground EXAMPLES, in order (D-12)", () => {
    expect(COMPARISON.examples.map((e) => ({ id: e.id, label: e.label, text: e.text }))).toEqual(
      EXAMPLES.map((e) => ({ id: e.id, label: e.label, text: e.text })),
    );
  });

  it("is dated with a YYYY-MM-DD generation date", () => {
    expect(COMPARISON.meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is fresh: a recomputation with the toy and both real tokenizers equals the committed file (RESEARCH Gap 6)", () => {
    const fresh = buildComparison({
      examples: EXAMPLES,
      languages: LANGUAGES.map((l) => ({ id: l.id, sentence: l.sentence })),
      toy,
      gpt2,
      bert,
      manifest,
      mergesText,
      generatedAt: COMPARISON.meta.generatedAt,
    });
    expect(withoutDate(fresh)).toEqual(withoutDate(COMPARISON));
    // The committed text is also exactly what the formatter writes, so a hand edit is caught.
    expect(formatComparison(fresh)).toBe(readFileSync("src/core/compare/comparison.json", "utf8"));
  });

  it("records commits, licences, hashes and the download label that the manifest records", () => {
    for (const id of ["gpt2", "bert"] as const) {
      const entry = manifest.files.find((f) => f.id === id);
      expect(entry).toBeDefined();
      expect(COMPARISON.meta.tokenizers[id]).toEqual({
        repo: entry?.repo,
        commit: entry?.commit,
        license: entry?.license,
        sha256: entry?.sha256,
      });
    }
    expect(COMPARISON.meta.download.combinedGzipBytes).toBe(manifest.combinedGzipBytes);
    expect(COMPARISON.meta.download.sizeLabelMb).toBe(sizeLabelMb(manifest.combinedGzipBytes));
  });

  it("round-trips: the toy and GPT-2 rows rebuild exactly the UTF-8 bytes of the text", () => {
    for (const example of COMPARISON.examples) {
      const expected = Array.from(encoder.encode(example.text));
      expect(join(fixtureTokens(example.rows.toy)), `toy ${example.id}`).toEqual(expected);
      expect(join(fixtureTokens(example.rows.gpt2)), `gpt2 ${example.id}`).toEqual(expected);
    }
  });

  it("never shows a replacement character or a raw GPT-2 byte glyph in any chip", () => {
    for (const { where, rows } of allRows()) {
      for (const name of ["toy", "gpt2", "bert"] as const) {
        for (const token of fixtureTokens(rows[name])) {
          const shown = chipText(token);
          expect(shown.includes(REPLACEMENT), `${where} ${name}`).toBe(false);
          expect(shown.includes(G_DOT), `${where} ${name}`).toBe(false);
          expect(shown.includes(C_DOT), `${where} ${name}`).toBe(false);
        }
      }
    }
  });

  it("gives BERT exactly two special [UNK] tokens for the emoji example", () => {
    const emoji = COMPARISON.examples.find((e) => e.id === "emoji");
    expect(emoji).toBeDefined();
    const bertTokens = fixtureTokens(emoji?.rows.bert ?? []);
    expect(bertTokens.filter((t) => t.special === true)).toHaveLength(2);
    expect(countUnk(bertTokens)).toBe(2);
  });

  it("pins the GPT-2 and BERT token counts of the five examples (RESEARCH Gap 7)", () => {
    const pinned: Record<string, [number, number]> = {
      "rare-word": [16, 16],
      "numbers-dates": [19, 19],
      emoji: [9, 7],
      // Plan 02-10: the Garnett Anna Karenina line; counts equal the Rust reference in adapter-parity.json.
      literature: [16, 16],
      "non-english": [10, 7],
    };
    for (const example of COMPARISON.examples) {
      expect([example.rows.gpt2.length, example.rows.bert.length], example.id).toEqual(pinned[example.id]);
    }
  });
});


describe("six-language Article 1 (D-14, TOK-08)", () => {
  it("keeps every sentence in NFC with the code-point count read from the source page (transcription guard)", () => {
    const expected = [170, 171, 186, 160, 123, 43];
    expect(LANGUAGES.map((l) => l.id)).toEqual(["en", "es", "fr", "ru", "ar", "zh"]);
    LANGUAGES.forEach((l, i) => {
      expect(l.sentence, l.id).toBe(l.sentence.normalize("NFC"));
      expect(Array.from(l.sentence), l.id).toHaveLength(expected[i] as number);
    });
  });

  it("has fixture language ids equal to the LANGUAGES ids, in order", () => {
    expect(COMPARISON.languages.map((l) => l.id)).toEqual(LANGUAGES.map((l) => l.id));
  });

  it("pins the GPT-2 and BERT token counts of each sentence (RESEARCH Gap 7)", () => {
    const pinned: Record<string, [number, number]> = {
      en: [33, 32],
      es: [58, 57],
      fr: [61, 61],
      ru: [172, 133],
      ar: [121, 101],
      zh: [86, 43],
    };
    for (const l of COMPARISON.languages) {
      expect([l.rows.gpt2.length, l.rows.bert.length], l.id).toEqual(pinned[l.id]);
    }
  });

  it("round-trips: the toy and GPT-2 rows rebuild exactly the UTF-8 bytes of each sentence", () => {
    for (const language of LANGUAGES) {
      const rows = COMPARISON.languages.find((l) => l.id === language.id)?.rows;
      const expected = Array.from(encoder.encode(language.sentence));
      expect(join(fixtureTokens(rows?.toy ?? [])), `toy ${language.id}`).toEqual(expected);
      expect(join(fixtureTokens(rows?.gpt2 ?? [])), `gpt2 ${language.id}`).toEqual(expected);
    }
  });

  it("gives BERT 25 [UNK] tokens of 43 for Chinese and none for any other language", () => {
    for (const l of COMPARISON.languages) {
      const unk = countUnk(fixtureTokens(l.rows.bert));
      expect(unk, l.id).toBe(l.id === "zh" ? 25 : 0);
    }
    expect(COMPARISON.languages.find((l) => l.id === "zh")?.rows.bert).toHaveLength(43);
  });

  it("marks only Arabic right-to-left and gives it no OHCHR PDF; the others name one", () => {
    for (const l of LANGUAGES) {
      expect(l.dir, l.id).toBe(l.id === "ar" ? "rtl" : "ltr");
      if (l.id === "ar") expect(l.ohchrPdfUrl).toBeNull();
      else expect(l.ohchrPdfUrl, l.id).toMatch(/^https:\/\/www\.ohchr\.org\/sites\/default\/files\/UDHR\/Documents\/UDHR_Translations\/\w+\.pdf$/);
    }
  });

  it("records a un.org retrieval page and a YYYY-MM-DD retrieval date for every language", () => {
    for (const l of LANGUAGES) {
      expect(l.retrievalUrl.startsWith("https://www.un.org/"), l.id).toBe(true);
      expect(l.retrieved, l.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(SOURCE_PAGE.startsWith("https://www.ohchr.org/")).toBe(true);
  });
});

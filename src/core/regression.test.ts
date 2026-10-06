import { describe, expect, it } from "vitest";
import { countGraphemes, countSplitCharacters, countWords } from "./counts.ts";
import { groupBytes } from "./chars.ts";
import { chipText, describeTokens, speakToken, tableCell } from "./display.ts";
import { REGRESSION_CORPUS } from "./fixtures/regression-corpus.ts";
import { tokenize } from "./toy.ts";

// The forbidden character, built from its code point so this file never contains it.
const REPLACEMENT = String.fromCodePoint(0xfffd);
// Independent of the implementation's own helper on purpose.
const strict = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const decodesAlone = (bytes: Uint8Array): boolean => {
  try {
    strict.decode(bytes);
    return true;
  } catch {
    return false;
  }
};
const graphemes = (text: string): string[] =>
  Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text), (s) => s.segment);
const entry = (name: string): string => {
  const found = REGRESSION_CORPUS.find((e) => e.name === name);
  if (found === undefined) throw new Error(`no fixture named ${name}`);
  return found.text;
};

describe("regression corpus", () => {
  it("has 22 distinctly named entries", () => {
    expect(REGRESSION_CORPUS).toHaveLength(22);
    expect(new Set(REGRESSION_CORPUS.map((e) => e.name)).size).toBe(22);
  });

  for (const { name, text } of REGRESSION_CORPUS) {
    describe(name, () => {
      const tokens = tokenize(text);

      it("reproduces the exact UTF-8 bytes of the input", () => {
        const joined = tokens.flatMap((t) => Array.from(t.bytes));
        expect(joined).toEqual(Array.from(new TextEncoder().encode(text)));
      });

      it("marks a token partial exactly when its bytes are not valid UTF-8 alone", () => {
        for (const t of tokens) expect(t.isPartial).toBe(!decodesAlone(t.bytes));
      });

      it("never shows the replacement character anywhere", () => {
        const grouping = groupBytes(tokens);
        tokens.forEach((t, i) => {
          expect(chipText(t)).not.toContain(REPLACEMENT);
          expect(tableCell(t)).not.toContain(REPLACEMENT);
          expect(tableCell(t, grouping.tokens[i])).not.toContain(REPLACEMENT);
          expect(speakToken(t)).not.toContain(REPLACEMENT);
          expect(speakToken(t, grouping.tokens[i])).not.toContain(REPLACEMENT);
        });
        expect(describeTokens(tokens)).not.toContain(REPLACEMENT);
      });

      it("words every partial token as one of the four table forms, lower case when spoken", () => {
        const grouping = groupBytes(tokens);
        tokens.forEach((t, i) => {
          if (!t.isPartial) return;
          const cell = tableCell(t, grouping.tokens[i]);
          expect(cell).toMatch(/^(Byte |Bytes |Pieces of |Not a valid character)/);
          const said = speakToken(t, grouping.tokens[i]);
          expect(said).toMatch(/^[a-z]/);
          expect(said).toBe(cell.charAt(0).toLowerCase() + cell.slice(1));
        });
      });

      it("counts the same graphemes as Intl.Segmenter", () => {
        expect(countGraphemes(text)).toBe(graphemes(text).length);
      });
    });
  }
});

describe("exact expectations", () => {
  it("empty input has nothing to count", () => {
    const tokens = tokenize("");
    expect(tokens).toEqual([]);
    expect(countGraphemes("")).toBe(0);
    expect(countWords("")).toBe(0);
    expect(countSplitCharacters("", tokens)).toBe(0);
  });

  it("emoji example: 8 partial tokens, 2 split characters, 26 characters, 5 words", () => {
    const text = entry("emoji-example");
    const tokens = tokenize(text);
    expect(tokens.filter((t) => t.isPartial)).toHaveLength(8);
    expect(countSplitCharacters(text, tokens)).toBe(2);
    expect(countGraphemes(text)).toBe(26);
    expect(countWords(text)).toBe(5);
  });

  it("ZWJ family: 18 partial tokens, 1 split character, 1 character", () => {
    const text = entry("zwj-family");
    const tokens = tokenize(text);
    expect(tokens).toHaveLength(18);
    expect(tokens.every((t) => t.isPartial)).toBe(true);
    expect(countSplitCharacters(text, tokens)).toBe(1);
    expect(countGraphemes(text)).toBe(1);
  });

  it("Japanese: 9 tokens, 3 split characters, 1 word", () => {
    const text = entry("japanese");
    const tokens = tokenize(text);
    expect(tokens).toHaveLength(9);
    expect(countSplitCharacters(text, tokens)).toBe(3);
    expect(countWords(text)).toBe(1);
  });

  it("lone surrogate: exactly 3 partial tokens", () => {
    const tokens = tokenize(entry("lone-surrogate"));
    expect(tokens).toHaveLength(3);
    expect(tokens.every((t) => t.isPartial)).toBe(true);
  });

  it("special-token text is tokenized as plain text", () => {
    const tokens = tokenize(entry("special-token-string"));
    expect(tokens.some((t) => t.isPartial)).toBe(false);
    expect(tokens.flatMap((t) => Array.from(t.bytes))).toEqual(
      Array.from(new TextEncoder().encode("<|endoftext|>")),
    );
  });

  it("Devanagari: every grapheme is a split character", () => {
    const text = entry("devanagari");
    expect(countSplitCharacters(text, tokenize(text))).toBe(countGraphemes(text));
  });
});

describe("worst-case performance (T-01-11)", () => {
  const cases: Array<[string, string]> = [
    ["a x 1000", "a".repeat(1000)],
    ["ab x 500", "ab".repeat(500)],
    ["space x 1000", " ".repeat(1000)],
    ["U+65E5 x 333", "日".repeat(333)],
    ["U+1F642 x 500", "\u{1F642}".repeat(500)],
  ];
  it("groups and words 1,000 CJK characters (3,000 tokens) in under 100 ms (T-01-21)", () => {
    const tokens = tokenize("日本語".repeat(333) + "日");
    expect(tokens).toHaveLength(3000);
    const start = performance.now();
    const grouping = groupBytes(tokens);
    const wording = tokens.map((t, i) => tableCell(t, grouping.tokens[i]));
    const elapsed = performance.now() - start;
    expect(wording).toHaveLength(3000);
    expect(wording[0]).toBe("Byte 1 of 3 of 日");
    expect(elapsed).toBeLessThan(100);
  });
  for (const [label, text] of cases) {
    it(`tokenizes ${label} in under 200 ms`, () => {
      const start = performance.now();
      tokenize(text);
      expect(performance.now() - start).toBeLessThan(200);
    });
  }
});

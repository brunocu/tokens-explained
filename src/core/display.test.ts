import { describe, expect, it } from "vitest";
import {
  GLYPH_NEWLINE,
  GLYPH_SPACE,
  GLYPH_TAB,
  chipSegments,
  chipText,
  containsNewline,
  describeTokens,
  idLabel,
  pieceWording,
  speakToken,
  tableCell,
} from "./display.ts";
import { groupBytes } from "./chars.ts";
import type { Token } from "./types.ts";

const tok = (bytes: number[], isPartial = false, id = 300): Token => ({
  id,
  bytes: Uint8Array.from(bytes),
  isPartial,
});
const text = (s: string): Token => tok(Array.from(new TextEncoder().encode(s)));
const partial = (bytes: number[]): Token => tok(bytes, true, bytes[0] as number);

describe("chipText", () => {
  it("shows the space, newline and tab glyphs", () => {
    expect(chipText(text(" the"))).toBe(`${GLYPH_SPACE}the`);
    expect(chipText(text("\n"))).toBe(GLYPH_NEWLINE);
    expect(chipText(text("\t"))).toBe(GLYPH_TAB);
  });

  it("shows partial tokens as hex", () => {
    expect(chipText(partial([0xf0, 0x9f]))).toBe("F0 9F");
  });

  it("uses Control Pictures for other C0 controls and never U+FFFD", () => {
    expect(chipText(tok([0x00]))).toBe("␀");
    expect(chipText(tok([0x07]))).toBe("␇");
    expect(chipText(tok([0x1f]))).toBe("␟");
    expect(chipText(tok([0x7f]))).toBe("␡");
  });
});

describe("chipSegments", () => {
  it("marks whitespace glyph runs", () => {
    expect(chipSegments(text(" a"))).toEqual([
      { text: GLYPH_SPACE, ws: true },
      { text: "a", ws: false },
    ]);
  });

  it("merges neighbouring whitespace glyphs into one segment", () => {
    expect(chipSegments(text(" \n"))).toEqual([{ text: `${GLYPH_SPACE}${GLYPH_NEWLINE}`, ws: true }]);
  });

  it("gives a partial token one non-whitespace segment", () => {
    expect(chipSegments(partial([0xf0, 0x9f]))).toEqual([{ text: "F0 9F", ws: false }]);
  });

  it("gives an empty list for empty bytes", () => {
    expect(chipSegments(tok([]))).toEqual([]);
  });
});

describe("containsNewline", () => {
  it("is true when a line feed is inside the token", () => {
    expect(containsNewline(text("\n"))).toBe(true);
    expect(containsNewline(text(" \n"))).toBe(true);
  });
  it("is false for words and partial tokens", () => {
    expect(containsNewline(text(" the"))).toBe(false);
    expect(containsNewline(partial([0xf0, 0x9f]))).toBe(false);
  });
});

// Cuts a list of byte arrays into tokens; a token is partial when its bytes alone are not valid UTF-8.
const strict = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const alone = (bytes: number[]): boolean => {
  try {
    strict.decode(Uint8Array.from(bytes));
    return true;
  } catch {
    return false;
  }
};
const cut = (...parts: number[][]): Token[] => parts.map((bytes) => tok(bytes, !alone(bytes), 300));
const cells = (tokens: Token[]): string[] => {
  const grouping = groupBytes(tokens);
  return tokens.map((t, i) => tableCell(t, grouping.tokens[i]));
};
const spoken = (tokens: Token[]): string[] => {
  const grouping = groupBytes(tokens);
  return tokens.map((t, i) => speakToken(t, grouping.tokens[i]));
};
const bytesOf = (s: string): number[] => Array.from(new TextEncoder().encode(s));
// The forbidden character, built from its code point so this file never contains it.
const REPLACEMENT = String.fromCodePoint(0xfffd);

describe("idLabel and tableCell", () => {
  it("returns the decimal id", () => {
    expect(idLabel(tok([65], false, 4711))).toBe("4711");
  });
  it("shows the chip text for a normal token, with or without context", () => {
    expect(tableCell(text(" the"))).toBe(`${GLYPH_SPACE}the`);
    expect(cells(cut([0x20, 0x74]))).toEqual([`${GLYPH_SPACE}t`]);
  });

  it("says which byte of which character one byte holds", () => {
    expect(cells(cut([0xe7], [0x94], [0xb7]))).toEqual([
      "Byte 1 of 3 of 男",
      "Byte 2 of 3 of 男",
      "Byte 3 of 3 of 男",
    ]);
    expect(cells(cut([0xf0, 0x9f], [0x8e], [0x89]))).toEqual([
      "Bytes 1 to 2 of 4 of 🎉",
      "Byte 3 of 4 of 🎉",
      "Byte 4 of 4 of 🎉",
    ]);
  });

  it("uses the word label of a name-labelled character", () => {
    expect(cells(cut([0xef], [0xbf], [0xbd]))).toEqual([
      "Byte 1 of 3 of placeholder",
      "Byte 2 of 3 of placeholder",
      "Byte 3 of 3 of placeholder",
    ]);
    expect(cells(cut([0xe2], [0x80], [0x8d]))[0]).toBe("Byte 1 of 3 of joiner");
  });

  it("says Not a valid character for invalid bytes, however many a chip holds", () => {
    expect(cells(cut([0x94]))).toEqual(["Not a valid character"]);
    expect(cells(cut([0xc0, 0x80]))).toEqual(["Not a valid character"]);
    expect(cells(cut([0xf5], [0x94]))).toEqual(["Not a valid character", "Not a valid character"]);
  });

  it("names the pieces of several characters, at most three labels then and N more", () => {
    const six = cut([...bytesOf("日本語女男"), 0xe3], [0x81, 0x93]);
    expect(cells(six)).toEqual(["Pieces of 6 characters: 日, 本, 語 and 3 more", "Bytes 2 to 3 of 3 of こ"]);
    const two = cut([0xe7, 0x94, 0xb7, 0xe5], [0xa5, 0xb3]);
    expect(cells(two)).toEqual(["Pieces of 2 characters: 男, 女", "Bytes 2 to 3 of 3 of 女"]);
    const three = cut([...bytesOf("日本語"), 0xe5], [0xa5, 0xb3]);
    expect(cells(three)[0]).toBe("Pieces of 4 characters: 日, 本, 語 and 1 more");
  });

  it("falls back to hex for a partial token without grouping context", () => {
    expect(tableCell(partial([0xf0, 0x9f]))).toBe("F0 9F");
  });
});

describe("pieceWording", () => {
  it("is null without groups, without pieces, and for a plain ASCII token", () => {
    expect(pieceWording(undefined)).toBeNull();
    expect(pieceWording(groupBytes([text("abc")]).tokens[0])).toBeNull();
  });
  it("lists a space with the character it shares a token with, as a glyph", () => {
    const tokens = [tok([0x20, 0xf0, 0x9f], true), tok([0x8e, 0x89], true)];
    const g = groupBytes(tokens);
    expect(tableCell(tokens[0] as Token, g.tokens[0])).toBe(`Pieces of 2 characters: ${GLYPH_SPACE}, \u{1f389}`);
    expect(speakToken(tokens[0] as Token, g.tokens[0])).toBe("pieces of 2 characters: space, \u{1f389}");
    // The second token holds only the end of the emoji, so its wording is unchanged.
    expect(tableCell(tokens[1] as Token, g.tokens[1])).toBe("Bytes 3 to 4 of 4 of \u{1f389}");
  });
  it("is never offered for a non-partial token by the cell helpers", () => {
    const tokens = cut(bytesOf("日"));
    expect(tokens[0]?.isPartial).toBe(false);
    expect(cells(tokens)).toEqual(["日"]);
    expect(spoken(tokens)).toEqual(["日"]);
  });
});

describe("speakToken and describeTokens", () => {
  it("speaks leading, trailing and only spaces as the word space", () => {
    expect(speakToken(text(" cat"))).toBe("space cat");
    expect(speakToken(text("cat "))).toBe("cat space");
    expect(speakToken(text(" "))).toBe("space");
    expect(speakToken(text("  "))).toBe("space space");
  });

  it("speaks new line, tab and other control characters as words", () => {
    expect(speakToken(text("\n"))).toBe("new line");
    expect(speakToken(text("\t"))).toBe("tab");
    expect(speakToken(text("a\tb"))).toBe("a tab b");
    expect(speakToken(tok([0x07]))).toBe("control character");
    expect(speakToken(tok([0x7f]))).toBe("control character");
  });

  it("announces a special token", () => {
    expect(speakToken({ ...text("[UNK]"), special: true })).toBe("special token [UNK]");
  });

  it("spells out the same wording as the table in lower case, with whitespace as words", () => {
    expect(spoken(cut([0xf0, 0x9f], [0x8e], [0x89]))).toEqual([
      "bytes 1 to 2 of 4 of 🎉",
      "byte 3 of 4 of 🎉",
      "byte 4 of 4 of 🎉",
    ]);
    expect(spoken(cut([0x94]))).toEqual(["not a valid character"]);
    expect(spoken(cut([...bytesOf("日本語女男"), 0xe3], [0x81, 0x93]))[0]).toBe(
      "pieces of 6 characters: 日, 本, 語 and 3 more",
    );
  });

  it("speaks bytes for a partial token without context", () => {
    expect(speakToken(partial([0xf0, 0x9f]))).toBe("bytes F0 9F");
  });

  it("speaks a newline or tab sharing a token with the start of an emoji as words", () => {
    const tokens = [tok([0x0a, 0xf0, 0x9f], true), tok([0x8e, 0x89], true)];
    const g = groupBytes(tokens);
    expect(speakToken(tokens[0] as Token, g.tokens[0])).toBe("pieces of 2 characters: new line, \u{1f389}");
    const tabbed = [tok([0x09, 0xf0, 0x9f], true), tok([0x8e, 0x89], true)];
    expect(speakToken(tabbed[0] as Token, groupBytes(tabbed).tokens[0])).toBe("pieces of 2 characters: tab, \u{1f389}");
  });

  it("summarises a token list", () => {
    expect(describeTokens([])).toBe("no tokens");
    expect(describeTokens([text("a")])).toBe("1 token: a");
    expect(describeTokens(cut([0x61], [0x20, 0x62], [0xf0, 0x9f], [0x8e], [0x89]))).toBe(
      "5 tokens: a | space b | bytes 1 to 2 of 4 of 🎉 | byte 3 of 4 of 🎉 | byte 4 of 4 of 🎉",
    );
  });

  it("never returns U+FFFD", () => {
    const tokens = cut([0xef], [0xbf], [0xbd]);
    expect(describeTokens(tokens)).not.toContain(REPLACEMENT);
    for (const s of [...cells(tokens), ...spoken(tokens)]) expect(s).not.toContain(REPLACEMENT);
    for (const t of tokens) {
      expect(chipText(t)).not.toContain(REPLACEMENT);
      expect(tableCell(t)).not.toContain(REPLACEMENT);
      expect(speakToken(t)).not.toContain(REPLACEMENT);
    }
    // A real replacement character kept whole in one token is spoken as bytes, not as itself.
    const whole = cut([0xef, 0xbf, 0xbd]);
    expect(spoken(whole)).toEqual(["bytes EF BF BD"]);
  });
});

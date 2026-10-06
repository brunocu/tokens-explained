import { describe, expect, it } from "vitest";
import {
  compositeNote,
  countCompositeCharacters,
  countGraphemes,
  countSplitCharacters,
  countWords,
  describeCounts,
  splitNote,
} from "./counts.ts";
import { groupBytes } from "./chars.ts";
import { tokenize } from "./toy.ts";
import type { Token } from "./types.ts";

const split = (text: string): number => countSplitCharacters(text, tokenize(text));

describe("countGraphemes", () => {
  it("counts characters the way a reader sees them", () => {
    expect(countGraphemes("")).toBe(0);
    expect(countGraphemes("abc")).toBe(3);
    expect(countGraphemes("\u{1F468}‍\u{1F469}‍\u{1F467}")).toBe(1);
    expect(countGraphemes("é")).toBe(1);
    expect(countGraphemes("\u{1F1EF}\u{1F1F5}")).toBe(1);
    expect(countGraphemes("Great job \u{1F389} see you soon \u{1F642}")).toBe(26);
  });
});

describe("countWords", () => {
  it("counts word segments that contain a letter or a number", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("Hello, world!")).toBe(2);
    expect(countWords("日本語")).toBe(1);
    expect(countWords("你好，世界")).toBe(2);
    expect(countWords("2026-10-03")).toBe(3);
  });

  it("does not count emoji or punctuation as words", () => {
    expect(countWords("\u{1F642} !!! ...")).toBe(0);
  });
});

describe("countSplitCharacters", () => {
  it("is 0 for plain ASCII and for empty text", () => {
    expect(split("The quick brown fox.")).toBe(0);
    expect(split("")).toBe(0);
    expect(split("a\r\nb")).toBe(0);
  });

  it("counts characters whose bytes are spread over several tokens", () => {
    expect(split("Great job \u{1F389} see you soon \u{1F642}")).toBe(2);
    expect(split("\u{1F468}‍\u{1F469}‍\u{1F467}")).toBe(1);
    expect(split("café")).toBe(1);
    expect(split("café")).toBe(1);
    expect(split("日本語")).toBe(3);
    expect(split("\uD83D")).toBe(1);
  });
});

const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}";
const composite = (text: string, showBytes = false): number => {
  const tokens = tokenize(text);
  return countCompositeCharacters(text, groupBytes(tokens), showBytes);
};

describe("countCompositeCharacters", () => {
  it("counts a family emoji, a flag, a decomposed é and a heart with an emoji-style mark as one each", () => {
    expect(composite(FAMILY)).toBe(1);
    expect(composite("\u{1F1EF}\u{1F1F5}")).toBe(1);
    expect(composite("é")).toBe(1);
    expect(composite("❤️")).toBe(1);
  });

  it("counts every joined cluster", () => {
    expect(composite(`${FAMILY} ${FAMILY}`)).toBe(2);
    expect(composite(`a é b ${FAMILY}`)).toBe(2);
  });

  it("is 0 for a precomposed é, 日本語, a carriage return plus line feed, empty and ASCII-only text", () => {
    expect(composite("é")).toBe(0);
    expect(composite("日本語")).toBe(0);
    expect(composite("a\r\nb")).toBe(0);
    expect(composite("")).toBe(0);
    expect(composite("The quick brown fox.")).toBe(0);
    expect(composite("Great job \u{1F389} see you soon \u{1F642}")).toBe(0);
  });

  it("counts a letter plus accent kept whole in one chip only when its bytes are shown", () => {
    const text = "é";
    const whole: Token[] = [{ id: 300, bytes: Uint8Array.from([0x65, 0xcc, 0x81]), isPartial: false }];
    const grouping = groupBytes(whole);
    expect(countCompositeCharacters(text, grouping, false)).toBe(0);
    expect(countCompositeCharacters(text, grouping, true)).toBe(1);
  });

  it("counts a whole chip that is partial because of a neighbouring cut, since its hex line is shown", () => {
    const text = "é\u{1F642}";
    const tokens: Token[] = [
      { id: 300, bytes: Uint8Array.from([0x65, 0xcc, 0x81, 0xf0]), isPartial: true },
      { id: 301, bytes: Uint8Array.from([0x9f, 0x99, 0x82]), isPartial: true },
    ];
    expect(countCompositeCharacters(text, groupBytes(tokens), false)).toBe(1);
  });

  it("treats a lone surrogate as three bytes without miscounting what follows", () => {
    expect(composite("\uD83Dá")).toBe(1);
  });
});

describe("describeCounts", () => {
  it("uses singular for exactly one", () => {
    expect(describeCounts(1, 1, 1)).toBe("1 token, 1 character, 1 word");
  });
  it("uses plural for zero and for many", () => {
    expect(describeCounts(0, 0, 0)).toBe("0 tokens, 0 characters, 0 words");
    expect(describeCounts(12, 26, 5)).toBe("12 tokens, 26 characters, 5 words");
  });
});

describe("compositeNote", () => {
  it("is empty for zero", () => {
    expect(compositeNote(0)).toBe("");
  });
  it("is the singular sentence for one", () => {
    expect(compositeNote(1)).toBe(
      "1 character on screen is built from several parts joined together. Each part is marked on its own.",
    );
  });
  it("is the plural sentence for several", () => {
    expect(compositeNote(2)).toBe(
      "2 characters on screen are built from several parts joined together. Each part is marked on its own.",
    );
  });
});

describe("splitNote", () => {
  it("is empty for zero", () => {
    expect(splitNote(0)).toBe("");
  });
  it("is singular for one", () => {
    expect(splitNote(1)).toBe("1 character was split across several tokens. Each hatched chip holds a piece of it.");
  });
  it("is plural for several", () => {
    expect(splitNote(3)).toBe(
      "3 characters were split across several tokens. Each hatched chip holds a piece of them.",
    );
  });
});

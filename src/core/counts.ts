// Counting rules and the copy that goes with them (TOK-02, FOUND-06). Pure functions;
// everything shown to the reader about "how many" comes from here.
import type { CharInfo, Grouping } from "./chars.ts";
import type { Token } from "./types.ts";

const graphemeSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const wordSegmenter = new Intl.Segmenter("en", { granularity: "word" });

/** Characters as a reader counts them: grapheme clusters (an emoji family is 1). */
export function countGraphemes(text: string): number {
  return Array.from(graphemeSegmenter.segment(text)).length;
}

/**
 * Words are word-granularity segments that contain a letter or a number. This is
 * deliberately not `isWordLike`: Firefox reports CJK segments as not word-like,
 * which would make the count differ between browsers. For ASCII text the two agree.
 */
export function countWords(text: string): number {
  let n = 0;
  for (const { segment } of wordSegmenter.segment(text)) {
    if (/[\p{L}\p{N}]/u.test(segment)) n++;
  }
  return n;
}

/** UTF-8 length of one code point. A lone surrogate is encoded as U+FFFD, 3 bytes. */
function utf8Length(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

/**
 * How many characters have a token boundary inside the bytes of one of their code
 * points. Boundaries come from the real token bytes, so this always agrees with the
 * hatched (partial) chips the reader sees.
 */
export function countSplitCharacters(text: string, tokens: ReadonlyArray<Token>): number {
  const boundaries = new Set<number>();
  let end = 0;
  for (const token of tokens) {
    end += token.bytes.length;
    boundaries.add(end);
  }

  let offset = 0;
  let split = 0;
  for (const { segment } of graphemeSegmenter.segment(text)) {
    let isSplit = false;
    for (const ch of segment) {
      const length = utf8Length(ch.codePointAt(0) as number);
      if (!isSplit && length >= 2) {
        for (let inside = offset + 1; inside < offset + length; inside++) {
          if (boundaries.has(inside)) {
            isSplit = true;
            break;
          }
        }
      }
      offset += length;
    }
    if (isSplit) split++;
  }
  return split;
}

/**
 * How many on-screen characters (grapheme clusters) are built from several code points, at
 * least one of them multi-byte and drawn with a frame or an underlined byte group (UI-SPEC
 * R-01). "On screen" is judged from the grouping and the same rule the display uses for
 * hex lines: a multi-byte character is framed when its bytes lie in two or more tokens, and
 * it is underlined when one token holds two or more of its bytes and that token's hex line
 * is shown (the token is partial, or `showBytes` is on). An all-ASCII cluster such as a
 * carriage return plus line feed never counts.
 */
export function countCompositeCharacters(text: string, grouping: Grouping, showBytes: boolean): number {
  const multiByStart = new Map<number, CharInfo>();
  for (const c of grouping.chars) if (c.kind === "multi") multiByStart.set(c.start, c);

  const onScreen = (c: CharInfo): boolean => {
    if (c.firstToken !== c.lastToken) return true;
    const token = grouping.tokens[c.firstToken];
    if (token === undefined || !(token.partial || showBytes)) return false;
    return token.pieces.some((p) => p.char === c && p.to - p.from >= 2);
  };

  let offset = 0;
  let composite = 0;
  for (const { segment } of graphemeSegmenter.segment(text)) {
    let parts = 0;
    let shown = false;
    for (const ch of segment) {
      const length = utf8Length(ch.codePointAt(0) as number);
      parts++;
      if (!shown && length >= 2) {
        const c = multiByStart.get(offset);
        if (c !== undefined && onScreen(c)) shown = true;
      }
      offset += length;
    }
    if (parts >= 2 && shown) composite++;
  }
  return composite;
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** The live-region sentence, for example "12 tokens, 26 characters, 5 words". */
export function describeCounts(tokens: number, characters: number, words: number): string {
  return [
    plural(tokens, "token", "tokens"),
    plural(characters, "character", "characters"),
    plural(words, "word", "words"),
  ].join(", ");
}

/** The note shown under the chips when characters were split; empty for none. */
export function splitNote(n: number): string {
  if (n <= 0) return "";
  if (n === 1) return "1 character was split across several tokens. Each hatched chip holds a piece of it.";
  return `${n} characters were split across several tokens. Each hatched chip holds a piece of them.`;
}

/** The note under the split note when joined characters are on screen; empty for none. */
export function compositeNote(n: number): string {
  if (n <= 0) return "";
  if (n === 1) return "1 character on screen is built from several parts joined together. Each part is marked on its own.";
  return `${n} characters on screen are built from several parts joined together. Each part is marked on its own.`;
}

import { GLYPH_NEWLINE, GLYPH_SPACE, GLYPH_TAB, WHITESPACE_GLYPHS, groupBytes } from "./chars.ts";
import type { Piece, TokenGroups } from "./chars.ts";
import type { Token } from "./types.ts";

// The whitespace glyphs are defined in chars.ts (frame labels use them too); re-exported here.
export { GLYPH_NEWLINE, GLYPH_SPACE, GLYPH_TAB };
const GLYPH_DEL = "␡";

const strict = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/** Uppercase two-digit hex pairs separated by single spaces. */
export function hexBytes(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

/** Text shown inside a chip. Derived from bytes; never returns U+FFFD. */
export function chipText(token: Token): string {
  if (token.isPartial) return hexBytes(token.bytes);
  let decoded: string;
  try {
    decoded = strict.decode(token.bytes);
  } catch {
    return hexBytes(token.bytes);
  }
  let out = "";
  for (const ch of decoded) {
    const code = ch.codePointAt(0) as number;
    if (ch === " ") out += GLYPH_SPACE;
    else if (ch === "\n") out += GLYPH_NEWLINE;
    else if (ch === "\t") out += GLYPH_TAB;
    else if (code === 0x7f) out += GLYPH_DEL;
    else if (code < 0x20) out += String.fromCharCode(0x2400 + code);
    else out += ch;
  }
  return out.includes("�") ? hexBytes(token.bytes) : out;
}

export type ChipSegment = { text: string; ws: boolean };

/** True for the glyphs that stand in for whitespace and control characters. */
function isWhitespaceGlyph(ch: string): boolean {
  if (ch === GLYPH_SPACE || ch === GLYPH_NEWLINE || ch === GLYPH_TAB) return true;
  const code = ch.codePointAt(0) as number;
  return code >= 0x2400 && code <= 0x2421;
}

/**
 * Chip text cut into runs so the UI can style whitespace glyphs differently from
 * letters. A partial token (hex bytes) is always one non-whitespace segment.
 */
export function chipSegments(token: Token): ChipSegment[] {
  const text = chipText(token);
  if (token.isPartial) return text === "" ? [] : [{ text, ws: false }];
  const segments: ChipSegment[] = [];
  for (const ch of text) {
    const ws = isWhitespaceGlyph(ch);
    const last = segments[segments.length - 1];
    if (last !== undefined && last.ws === ws) last.text += ch;
    else segments.push({ text: ch, ws });
  }
  return segments;
}

/** True when the token contains a line feed, so the UI can start a new line after it. */
export function containsNewline(token: Token): boolean {
  return !token.isPartial && token.bytes.includes(0x0a);
}

/** The token id as shown on the second line of a stacked chip. */
export function idLabel(token: Token): string {
  return String(token.id);
}

/**
 * Which byte of which character a partial token holds, in words (UI-SPEC R-01, FOUND-04).
 * Null when the token has no multi-byte or invalid piece. Labels come from `groupBytes`,
 * which builds them from code points, so no replacement character can appear here.
 * With the token, a space, new line or tab on it is listed too, as its glyph, the same way the
 * frame label above the chip names it.
 */
export function pieceWording(groups: TokenGroups | undefined, token?: Token): string | null {
  const pieces = groups?.pieces;
  if (pieces === undefined || pieces.length === 0) return null;
  if (pieces.every((p) => p.char.kind === "invalid")) return "Not a valid character";
  if (token !== undefined) {
    // The characters of the token in byte order: each piece, and each whitespace byte between them.
    const names: string[] = [];
    for (let at = 0; at < token.bytes.length; ) {
      const piece = pieces.find((p) => p.from === at);
      const glyph = WHITESPACE_GLYPHS.get(token.bytes[at] as number);
      if (piece !== undefined) {
        names.push(piece.char.label.text);
        at = piece.to;
      } else {
        if (glyph !== undefined) names.push(glyph);
        at++;
      }
    }
    if (names.length > 1 && names.length !== pieces.length) {
      const shown = names.slice(0, 3).join(", ");
      const more = names.length > 3 ? ` and ${names.length - 3} more` : "";
      return `Pieces of ${names.length} characters: ${shown}${more}`;
    }
  }
  if (pieces.length === 1) {
    const piece = pieces[0] as Piece;
    const where =
      piece.first === piece.last
        ? `Byte ${piece.first} of ${piece.char.length}`
        : `Bytes ${piece.first} to ${piece.last} of ${piece.char.length}`;
    return `${where} of ${piece.char.label.text}`;
  }
  const shown = pieces.slice(0, 3).map((p) => p.char.label.text).join(", ");
  const more = pieces.length > 3 ? ` and ${pieces.length - 3} more` : "";
  return `Pieces of ${pieces.length} characters: ${shown}${more}`;
}

/** What the table's text column shows for a token. */
export function tableCell(token: Token, groups?: TokenGroups): string {
  if (token.isPartial) {
    const wording = pieceWording(groups, token);
    if (wording !== null) return wording;
  }
  return chipText(token);
}

/** The words a screen reader says for each whitespace glyph that the piece wording can contain. */
const GLYPH_WORDS: ReadonlyArray<readonly [string, string]> = [
  [GLYPH_SPACE, "space"],
  [GLYPH_NEWLINE, "new line"],
  [GLYPH_TAB, "tab"],
];

/**
 * Words a screen reader says for one token (the single spoken-label function). A whole token
 * speaks its whitespace as words and keeps other text literal, joined by single spaces: " cat" is
 * "space cat". A partial token speaks the same piece wording as the table, in lower case and with
 * whitespace glyphs as words. A special token is announced as one. Never returns U+FFFD.
 */
export function speakToken(token: Token, groups?: TokenGroups): string {
  const said = speakBody(token, groups);
  return token.special === true ? `special token ${said}` : said;
}

function speakBody(token: Token, groups?: TokenGroups): string {
  if (token.isPartial) {
    const wording = pieceWording(groups, token);
    if (wording === null) return `bytes ${hexBytes(token.bytes)}`;
    let said = wording.charAt(0).toLowerCase() + wording.slice(1);
    for (const [glyph, word] of GLYPH_WORDS) said = said.split(glyph).join(word);
    return said;
  }
  let decoded: string;
  try {
    decoded = strict.decode(token.bytes);
  } catch {
    return `bytes ${hexBytes(token.bytes)}`;
  }
  if (decoded.includes("�")) return `bytes ${hexBytes(token.bytes)}`;
  const parts: string[] = [];
  let literal = "";
  const flush = (): void => {
    if (literal !== "") parts.push(literal);
    literal = "";
  };
  for (const ch of decoded) {
    const code = ch.codePointAt(0) as number;
    let word: string | undefined;
    if (ch === " ") word = "space";
    else if (ch === "\n") word = "new line";
    else if (ch === "\t") word = "tab";
    else if (code < 0x20 || code === 0x7f) word = "control character";
    if (word === undefined) {
      literal += ch;
    } else {
      flush();
      parts.push(word);
    }
  }
  flush();
  return parts.length === 0 ? "empty" : parts.join(" ");
}

/** One sentence summarising a token list for a screen reader. */
export function describeTokens(tokens: ReadonlyArray<Token>): string {
  if (tokens.length === 0) return "no tokens";
  const grouping = groupBytes(tokens);
  const spoken = tokens.map((token, i) => speakToken(token, grouping.tokens[i])).join(" | ");
  return `${tokens.length} ${tokens.length === 1 ? "token" : "tokens"}: ${spoken}`;
}

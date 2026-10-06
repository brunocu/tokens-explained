import { groupBytes } from "./chars.ts";
import type { Piece, TokenGroups } from "./chars.ts";
import type { Token } from "./types.ts";

// Whitespace glyphs live here so a glyph fallback (UI-SPEC allows a middle dot,
// U+00B7) is a one-line change.
export const GLYPH_SPACE = "␣";
export const GLYPH_NEWLINE = "↵";
export const GLYPH_TAB = "⇥";
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

/** The token id as shown in the Token IDs view. */
export function idLabel(token: Token): string {
  return String(token.id);
}

/**
 * Which byte of which character a partial token holds, in words (UI-SPEC R-01, FOUND-04).
 * Null when the token has no multi-byte or invalid piece. Labels come from `groupBytes`,
 * which builds them from code points, so no replacement character can appear here.
 */
export function pieceWording(groups: TokenGroups | undefined): string | null {
  const pieces = groups?.pieces;
  if (pieces === undefined || pieces.length === 0) return null;
  if (pieces.every((p) => p.char.kind === "invalid")) return "Not a valid character";
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
    const wording = pieceWording(groups);
    if (wording !== null) return wording;
  }
  return chipText(token);
}

/** Words a screen reader says for one token. */
export function speakToken(token: Token, groups?: TokenGroups): string {
  if (token.isPartial) {
    const wording = pieceWording(groups);
    if (wording !== null) return wording.charAt(0).toLowerCase() + wording.slice(1);
    return hexBytes(token.bytes);
  }
  let decoded: string;
  try {
    decoded = strict.decode(token.bytes);
  } catch {
    return hexBytes(token.bytes);
  }
  let out = "";
  for (const ch of decoded) {
    const code = ch.codePointAt(0) as number;
    if (ch === " ") out += "(space)";
    else if (ch === "\n") out += "(new line)";
    else if (ch === "\t") out += "(tab)";
    else if (code < 0x20 || code === 0x7f) out += "(control character)";
    else out += ch;
  }
  return out.includes("�") ? hexBytes(token.bytes) : out;
}

/** One sentence summarising a token list for a screen reader. */
export function describeTokens(tokens: ReadonlyArray<Token>): string {
  if (tokens.length === 0) return "no tokens";
  const grouping = groupBytes(tokens);
  const spoken = tokens.map((token, i) => speakToken(token, grouping.tokens[i])).join(" | ");
  return `${tokens.length} ${tokens.length === 1 ? "token" : "tokens"}: ${spoken}`;
}

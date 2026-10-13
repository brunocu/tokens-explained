import type { Token } from "./types.ts";

// Bytes-to-characters grouping for the shared token display (UI-SPEC revision R-01).
// Pure TypeScript: no DOM, no framework, and no platform decoder. The code point of a
// valid UTF-8 sequence is computed arithmetically from its bytes, so a replacement
// character can never be produced (PITFALLS.md pitfall 2, FOUND-06). The one decoder here is
// the strict check in isValidUtf8, which only answers yes or no and never yields text.

const strict = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/** True when the bytes are valid UTF-8 on their own. `ignoreBOM: true` keeps a leading EF BB BF from being stripped. */
export function isValidUtf8(bytes: Uint8Array): boolean {
  try {
    strict.decode(bytes);
    return true;
  } catch {
    return false;
  }
}

export type CharKind = "single" | "multi" | "invalid";
export type LabelStyle = "char" | "name";
export type Label = { text: string; style: LabelStyle };

export type CharInfo = {
  /** Byte offsets in the joined stream, `end` exclusive. */
  start: number;
  end: number;
  length: number;
  kind: CharKind;
  /** Null for an invalid byte. */
  codePoint: number | null;
  label: Label;
  /** Indices of the tokens holding its first and last byte. */
  firstToken: number;
  lastToken: number;
};

/** The part of one non-single-byte character that sits inside one token. */
export type Piece = {
  char: CharInfo;
  /** Token-local byte offsets, `to` exclusive. */
  from: number;
  to: number;
  /** 1-based byte numbers within the character. */
  first: number;
  last: number;
};

export type TokenGroups = { pieces: Piece[]; frame: number | null; partial: boolean };
export type Frame = { first: number; last: number; invalid: boolean; labels: Label[] };
export type Grouping = { chars: CharInfo[]; tokens: TokenGroups[]; frames: Frame[] };

export type LayoutItem =
  | { kind: "chip"; index: number }
  | { kind: "frame"; frame: Frame; indices: number[] };

const INVALID_LABEL: Label = { text: "invalid", style: "name" };

const name = (text: string): Label => ({ text, style: "name" });

// Code points that are shown by a fixed word instead of themselves (UI-SPEC "Labels").
const NAMED: ReadonlyMap<number, string> = new Map([
  [0x200d, "joiner"],
  [0x200b, "hidden space"],
  [0x200c, "hidden separator"],
  [0xfe0f, "emoji style"],
  [0xfe0e, "text style"],
  [0xfeff, "hidden mark"],
  [0x00a0, "no-break space"],
  [0x3000, "wide space"],
  [0xfffd, "placeholder"],
]);

// Whitespace glyphs live here so a glyph fallback (UI-SPEC allows a middle dot,
// U+00B7) is a one-line change.
export const GLYPH_SPACE = "␣";
export const GLYPH_NEWLINE = "↵";
export const GLYPH_TAB = "⇥";

// One-byte characters that are still labelled in a frame (with their chip glyph), because the hex
// line would otherwise show them only as 20, 0A or 09 beside the cut character.
export const WHITESPACE_GLYPHS: ReadonlyMap<number, string> = new Map([
  [0x20, GLYPH_SPACE],
  [0x09, GLYPH_TAB],
  [0x0a, GLYPH_NEWLINE],
]);

const CONTROL = /^\p{Cc}$/u;
const SPACE_SEPARATOR = /^\p{Zs}$/u;
const COMBINING_MARK = /^\p{M}$/u;
const HIDDEN = /^[\p{Cf}\p{Zl}\p{Zp}\p{Cn}\p{Co}]$/u;
const DOTTED_CIRCLE = "◌";

/**
 * The label for a character, in the precedence of the UI-SPEC Labels table. It is either a
 * fixed word or one character built from a computed code point, so a format or
 * bidirectional-control character is never rendered as itself (T-01-20) and the
 * replacement character never appears (T-01-19, FOUND-06).
 */
export function labelFor(kind: CharKind, codePoint: number | null): Label {
  if (kind === "invalid" || codePoint === null) return INVALID_LABEL;
  const word = NAMED.get(codePoint);
  if (word !== undefined) return name(word);
  const ch = String.fromCodePoint(codePoint);
  if (CONTROL.test(ch)) return name("control character");
  if (SPACE_SEPARATOR.test(ch)) return name("space");
  if (COMBINING_MARK.test(ch)) return { text: DOTTED_CIRCLE + ch, style: "char" };
  if (HIDDEN.test(ch)) return name("hidden mark");
  return { text: ch, style: "char" };
}

/** At most three labels for a frame, and how many more there are. */
export function visibleLabels(frame: Frame): { shown: Label[]; more: number } {
  return { shown: frame.labels.slice(0, 3), more: Math.max(0, frame.labels.length - 3) };
}

type Decoded = { length: number; codePoint: number | null };

/**
 * Standard UTF-8 rules (the WHATWG ranges) applied at `at`. A byte that cannot be placed
 * is one invalid character of length 1, and the walk resumes at the very next byte.
 */
function decodeAt(stream: ReadonlyArray<number>, at: number): Decoded {
  const b0 = stream[at] as number;
  if (b0 <= 0x7f) return { length: 1, codePoint: b0 };
  let need = 0;
  let lo = 0x80;
  let hi = 0xbf;
  let cp = 0;
  if (b0 >= 0xc2 && b0 <= 0xdf) {
    need = 1;
    cp = b0 & 0x1f;
  } else if (b0 >= 0xe0 && b0 <= 0xef) {
    need = 2;
    cp = b0 & 0x0f;
    if (b0 === 0xe0) lo = 0xa0;
    if (b0 === 0xed) hi = 0x9f;
  } else if (b0 >= 0xf0 && b0 <= 0xf4) {
    need = 3;
    cp = b0 & 0x07;
    if (b0 === 0xf0) lo = 0x90;
    if (b0 === 0xf4) hi = 0x8f;
  } else {
    return { length: 1, codePoint: null };
  }
  for (let k = 1; k <= need; k++) {
    const b = stream[at + k];
    // Only the first continuation byte has the tighter limits; later ones are 80 to BF.
    const from = k === 1 ? lo : 0x80;
    const to = k === 1 ? hi : 0xbf;
    if (b === undefined || b < from || b > to) return { length: 1, codePoint: null };
    cp = (cp << 6) | (b & 0x3f);
  }
  return { length: need + 1, codePoint: cp };
}

/**
 * Walks the joined token bytes once and describes every character, every token's share
 * of the multi-byte characters, and the frames that surround the chips of one character.
 */
export function groupBytes(tokens: ReadonlyArray<Token>): Grouping {
  const stream: number[] = [];
  const owner: number[] = [];
  const tokenStart: number[] = [];
  tokens.forEach((token, t) => {
    tokenStart.push(stream.length);
    for (const byte of token.bytes) {
      stream.push(byte);
      owner.push(t);
    }
  });

  const groups: TokenGroups[] = tokens.map((token) => ({ pieces: [], frame: null, partial: token.isPartial }));
  const chars: CharInfo[] = [];
  let at = 0;
  while (at < stream.length) {
    const { length, codePoint } = decodeAt(stream, at);
    const kind: CharKind = codePoint === null ? "invalid" : length === 1 ? "single" : "multi";
    const end = at + length;
    const char: CharInfo = {
      start: at,
      end,
      length,
      kind,
      codePoint,
      label: labelFor(kind, codePoint),
      firstToken: owner[at] as number,
      lastToken: owner[end - 1] as number,
    };
    chars.push(char);
    if (kind !== "single") {
      let k = at;
      while (k < end) {
        const t = owner[k] as number;
        let stop = k;
        while (stop < end && owner[stop] === t) stop++;
        (groups[t] as TokenGroups).pieces.push({
          char,
          from: k - (tokenStart[t] as number),
          to: stop - (tokenStart[t] as number),
          first: k - at + 1,
          last: stop - at,
        });
        k = stop;
      }
    }
    at = end;
  }

  // A character is split when its bytes lie in two or more tokens. Two consecutive
  // tokens are linked when some split character has bytes in both.
  const splitChars = chars.filter((c) => c.kind === "multi" && c.firstToken !== c.lastToken);
  const linked: boolean[] = tokens.map(() => false);
  for (const c of splitChars) {
    for (let t = c.firstToken; t < c.lastToken; t++) {
      const here = (groups[t] as TokenGroups).pieces.some((p) => p.char === c);
      const next = (groups[t + 1] as TokenGroups).pieces.some((p) => p.char === c);
      if (here && next) linked[t] = true;
    }
  }
  const splitSet = new Set<CharInfo>(splitChars);
  const framed = groups.map((g) => g.pieces.some((p) => p.char.kind === "invalid" || splitSet.has(p.char)));

  const frames: Frame[] = [];
  let t = 0;
  while (t < groups.length) {
    if (!framed[t]) {
      t++;
      continue;
    }
    const first = t;
    while (t + 1 < groups.length && framed[t + 1] && linked[t]) t++;
    const last = t;
    // Name every multi-byte character on the frame's chips, whole ones too: a hatched chip such as
    // "の国" holds a complete の beside the cut 国, and the label must not leave の out. A space, tab
    // or new line on the chip is named as well.
    const labels: Label[] = [];
    for (const c of chars) {
      if (c.firstToken < first || c.firstToken > last) continue;
      const glyph = c.kind === "single" ? WHITESPACE_GLYPHS.get(c.codePoint as number) : undefined;
      if (glyph !== undefined) labels.push({ text: glyph, style: "char" });
      else if (c.kind === "multi") labels.push(c.label);
    }
    const invalid = !splitChars.some((c) => c.firstToken >= first && c.firstToken <= last);
    const frame: Frame = { first, last, invalid, labels: invalid ? [INVALID_LABEL] : labels };
    for (let k = first; k <= last; k++) (groups[k] as TokenGroups).frame = frames.length;
    frames.push(frame);
    t++;
  }

  return { chars, tokens: groups, frames };
}

export type ByteSegment = { text: string; group: boolean };

const hex = (bytes: ReadonlyArray<number>): string =>
  bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");

/**
 * Cuts one token's hex line into segments (UI-SPEC "Byte-line grouping"). The bytes of one
 * multi-byte character that has two or more bytes on this line form a `group` segment;
 * every other byte (ASCII, a lone leftover byte of a split character, an invalid byte)
 * belongs to a plain run, and adjacent plain bytes form one plain segment. Joining the
 * segment texts with single spaces gives the same text as the plain hex line, and no byte
 * is dropped or reordered. Without grouping data the whole line is one plain segment.
 */
export function byteLineSegments(token: Token, groups: TokenGroups | undefined): ByteSegment[] {
  const bytes = Array.from(token.bytes);
  if (bytes.length === 0) return [];
  if (groups === undefined) return [{ text: hex(bytes), group: false }];
  const grouped = groups.pieces.filter((p) => p.char.kind === "multi" && p.to - p.from >= 2);
  const segments: ByteSegment[] = [];
  let at = 0;
  const flushPlain = (until: number): void => {
    if (until > at) segments.push({ text: hex(bytes.slice(at, until)), group: false });
  };
  for (const piece of grouped) {
    flushPlain(piece.from);
    segments.push({ text: hex(bytes.slice(piece.from, piece.to)), group: true });
    at = piece.to;
  }
  flushPlain(bytes.length);
  return segments;
}

/**
 * The render order: a token that starts a frame yields one frame item holding every token
 * index of that frame, every other token yields one chip item. Each index appears once.
 */
export function layoutChips(grouping: Grouping): LayoutItem[] {
  const items: LayoutItem[] = [];
  let i = 0;
  while (i < grouping.tokens.length) {
    const frameIndex = (grouping.tokens[i] as TokenGroups).frame;
    const frame = frameIndex === null ? undefined : grouping.frames[frameIndex];
    if (frame !== undefined && frame.first === i) {
      const indices: number[] = [];
      for (let k = frame.first; k <= frame.last; k++) indices.push(k);
      items.push({ kind: "frame", frame, indices });
      i = frame.last + 1;
    } else {
      items.push({ kind: "chip", index: i });
      i++;
    }
  }
  return items;
}

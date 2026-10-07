// Shape of the precomputed comparison fixture and the helpers that turn its rows back
// into the project's Token shape (D-10, D-12, D-14). Pure TypeScript with explicit .ts
// import specifiers so Vite, Vitest and native Node (the precompute script) load it alike.
//
// A token is stored as its id and its bytes written as uppercase hex ("E3 81 93"), never as
// text: a token can hold half of a character, and hex round-trips every case exactly with
// no replacement character (FOUND-06). Sentences and their sources are NOT in the fixture;
// they live in languages.ts, so there is one place to correct them.
import { hexBytes } from "../display.ts";
import { isValidUtf8 } from "../toy.ts";
import type { Token } from "../types.ts";

export type FixtureToken = { id: number; hex: string; special?: true };

export type FixtureRows = { toy: FixtureToken[]; gpt2: FixtureToken[]; bert: FixtureToken[] };

type TokenizerSource = { repo: string; commit: string; license: string; sha256: string };

export type ComparisonFixture = {
  meta: {
    /** YYYY-MM-DD, written by the precompute script; the only field a freshness check ignores. */
    generatedAt: string;
    toy: { merges: number; mergesSha256: string };
    tokenizers: { gpt2: TokenizerSource; bert: TokenizerSource };
    download: { combinedGzipBytes: number; sizeLabelMb: string };
  };
  examples: Array<{ id: string; label: string; text: string; rows: FixtureRows }>;
  languages: Array<{ id: string; rows: FixtureRows }>;
};

/** The literal text of BERT's unknown-piece marker. */
const UNK_TEXT = "[UNK]";

export function tokensToFixture(tokens: Token[]): FixtureToken[] {
  return tokens.map((token): FixtureToken => {
    const out: FixtureToken = { id: token.id, hex: hexBytes(token.bytes) };
    if (token.special === true) out.special = true;
    return out;
  });
}

function bytesFromHex(hex: string): Uint8Array {
  if (hex === "") return new Uint8Array(0);
  return Uint8Array.from(hex.split(" "), (pair) => Number.parseInt(pair, 16));
}

/** Parse stored rows back to tokens. A special marker is never partial; any other token is
 *  partial exactly when its bytes alone are not valid UTF-8. */
export function fixtureTokens(rows: FixtureToken[]): Token[] {
  return rows.map((row): Token => {
    const bytes = bytesFromHex(row.hex);
    if (row.special === true) return { id: row.id, bytes, isPartial: false, special: true };
    return { id: row.id, bytes, isPartial: !isValidUtf8(bytes) };
  });
}

/** How many special tokens spell the literal text [UNK]. */
export function countUnk(tokens: Token[]): number {
  const decoder = new TextDecoder();
  return tokens.filter((t) => t.special === true && decoder.decode(t.bytes) === UNK_TEXT).length;
}

// Adapter from a real tokenizer library to the project's Token shape (D-11).
// Pure TypeScript with explicit .ts import specifiers. It takes an already-parsed
// tokenizer.json and an injected library class, so this module has no network call,
// no Vite environment access and no runtime import of the library. The caller decides
// when to load the file and the library (a dynamic import in the browser, in Node tests).
//
// Why bytes are rebuilt here instead of asking the library to turn an id back into text:
// a single token can hold only part of a character, and a per-token conversion would
// show a replacement character (PITFALLS.md pitfall 2, FOUND-06). GPT-2 writes its
// tokens with a byte-to-unicode table, so the table is inverted here to get true bytes.
import { isValidUtf8 } from "./chars.ts";
import type { Token } from "./types.ts";

export type RealTokenizerId = "gpt2" | "bert";

/** What the library returns for one text, reduced to the two arrays this adapter uses. */
export type RawEncoding = { ids: number[]; tokens: string[] };

type AddedTokenLike = { content: string; special: boolean };

/** The library class, described structurally so the real class is assignable to it. */
export type TokenizerCtor = new (
  tokenizerJson: object,
  config: object,
) => {
  encode(text: string, options?: { add_special_tokens?: boolean }): RawEncoding;
  get_added_tokens_decoder(): Map<number, AddedTokenLike>;
};

export type RealTokenizer = {
  id: RealTokenizerId;
  encodeRaw(text: string): RawEncoding;
  tokenize(text: string): Token[];
};

const encoder = new TextEncoder();

/**
 * The inverse of GPT-2's bytes-to-unicode table: character to byte. The printable Latin-1
 * ranges (33-126, 161-172, 174-255) stand for themselves; the other 68 bytes are written
 * as the characters 256, 257, ... in byte order.
 */
export function gpt2ByteDecoder(): Map<string, number> {
  const bytes: number[] = [];
  for (let i = 33; i <= 126; i++) bytes.push(i);
  for (let i = 161; i <= 172; i++) bytes.push(i);
  for (let i = 174; i <= 255; i++) bytes.push(i);
  const chars = bytes.slice();
  let next = 0;
  for (let b = 0; b < 256; b++) {
    if (!bytes.includes(b)) {
      bytes.push(b);
      chars.push(256 + next);
      next++;
    }
  }
  return new Map(bytes.map((b, i) => [String.fromCodePoint(chars[i] as number), b]));
}

/**
 * Wrap a library tokenizer. `tokenizerJson` is the parsed tokenizer.json; `Tokenizer` is the
 * library class. The config object is empty on purpose: the library reads optional settings
 * from it and an empty object keeps every default (a missing config throws). Special
 * markers are never added to the output, so BERT shows no [CLS] or [SEP] the reader did not type.
 */
export function createRealTokenizer(
  id: RealTokenizerId,
  tokenizerJson: object,
  Tokenizer: TokenizerCtor,
): RealTokenizer {
  const lib = new Tokenizer(tokenizerJson, {});
  const added = lib.get_added_tokens_decoder();
  const byteOf = id === "gpt2" ? gpt2ByteDecoder() : null;

  function encodeRaw(text: string): RawEncoding {
    const encoded = lib.encode(text, { add_special_tokens: false });
    return { ids: Array.from(encoded.ids), tokens: Array.from(encoded.tokens) };
  }

  function bytesOf(piece: string): Uint8Array {
    if (byteOf === null) return encoder.encode(piece);
    const out: number[] = [];
    for (const ch of piece) {
      const b = byteOf.get(ch);
      if (b === undefined) throw new Error(`GPT-2 token has a character outside its byte table: U+${(ch.codePointAt(0) as number).toString(16).toUpperCase()}`);
      out.push(b);
    }
    return Uint8Array.from(out);
  }

  function tokenize(text: string): Token[] {
    const { ids, tokens } = encodeRaw(text);
    return ids.map((tokenId, i): Token => {
      const marker = added.get(tokenId);
      if (marker !== undefined) {
        return { id: tokenId, bytes: encoder.encode(marker.content), isPartial: false, special: true };
      }
      const bytes = bytesOf(tokens[i] as string);
      return { id: tokenId, bytes, isPartial: !isValidUtf8(bytes) };
    });
  }

  return { id, encodeRaw, tokenize };
}

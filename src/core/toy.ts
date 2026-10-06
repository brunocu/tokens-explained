// The toy byte-level tokenizer: pre-split, then UTF-8 bytes, then ranked merges (D-03).
// Plain TypeScript with explicit .ts import specifiers so that Vite, Vitest and
// native Node (training script, scripts/check-core.mjs) all load the same file.
import mergesJson from "./toy/merges.json" with { type: "json" };
import { presplit } from "./presplit.ts";
import type { MergeData, Token, ToyTokenizer } from "./types.ts";

const encoder = new TextEncoder();
// ignoreBOM: true keeps a leading EF BB BF from being silently stripped.
const strict = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export function isValidUtf8(bytes: Uint8Array): boolean {
  try {
    strict.decode(bytes);
    return true;
  } catch {
    return false;
  }
}

/** Build a tokenizer from a merge list. Everything is computed once; nothing mutates afterwards. */
export function createToyTokenizer(data: MergeData): ToyTokenizer {
  const vocab: Uint8Array[] = [];
  for (let b = 0; b < 256; b++) vocab.push(Uint8Array.of(b));

  // key = left * 65536 + right -> [merge index, result id]
  const ranks = new Map<number, readonly [number, number]>();
  data.merges.forEach(([left, right], i) => {
    const l = vocab[left];
    const r = vocab[right];
    if (l === undefined || r === undefined) {
      throw new Error(`merge ${i} refers to an id that does not exist yet`);
    }
    const joined = new Uint8Array(l.length + r.length);
    joined.set(l, 0);
    joined.set(r, l.length);
    vocab.push(joined);
    const key = left * 65536 + right;
    if (!ranks.has(key)) ranks.set(key, [i, 256 + i]);
  });

  // Whether a vocabulary entry is a partial character is decided once, not per emitted token.
  const partial: boolean[] = vocab.map((bytes) => !isValidUtf8(bytes));

  function mergePiece(piece: string, out: number[]): void {
    let ids = Array.from(encoder.encode(piece));
    while (ids.length > 1) {
      let bestRank = Infinity;
      let bestKey = -1;
      for (let i = 0; i + 1 < ids.length; i++) {
        const key = (ids[i] as number) * 65536 + (ids[i + 1] as number);
        const hit = ranks.get(key);
        if (hit !== undefined && hit[0] < bestRank) {
          bestRank = hit[0];
          bestKey = key;
        }
      }
      if (bestKey < 0) break;
      const resultId = (ranks.get(bestKey) as readonly [number, number])[1];
      const next: number[] = [];
      for (let i = 0; i < ids.length; i++) {
        if (i + 1 < ids.length && (ids[i] as number) * 65536 + (ids[i + 1] as number) === bestKey) {
          next.push(resultId);
          i++;
        } else {
          next.push(ids[i] as number);
        }
      }
      ids = next;
    }
    for (const id of ids) out.push(id);
  }

  return {
    get vocabSize() {
      return vocab.length;
    },
    vocabBytes(id: number): Uint8Array {
      const bytes = vocab[id];
      if (bytes === undefined) throw new RangeError(`no token with id ${id}`);
      return bytes.slice();
    },
    tokenize(text: string): Token[] {
      const ids: number[] = [];
      for (const piece of presplit(text)) mergePiece(piece, ids);
      return ids.map((id) => ({
        id,
        bytes: (vocab[id] as Uint8Array).slice(),
        isPartial: partial[id] as boolean,
      }));
    },
  };
}

export const toy: ToyTokenizer = createToyTokenizer(mergesJson as unknown as MergeData);
export const tokenize = (text: string): Token[] => toy.tokenize(text);

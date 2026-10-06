// Offline, deterministic byte-level BPE trainer (D-01, D-03). A pure module: no
// node: imports, so Vitest can import it for the determinism and tie-break goldens.
// It shares the runtime's pre-split rule so training and tokenizing cannot disagree.
import { presplit } from "../../src/core/presplit.ts";
import type { MergeMeta } from "../../src/core/types.ts";

const encoder = new TextEncoder();

/** Pair key: ids stay below 65536 (256 bytes plus at most a few thousand merges). */
const keyOf = (left: number, right: number): number => left * 65536 + right;

/**
 * Learn `nMerges` merges from `text`. Returns [left, right] id pairs; the pair at
 * index i gets id 256 + i. Tie-break (recorded in merges.json): highest pair count,
 * then the smallest left id, then the smallest right id. Stops early if no pair is left.
 */
export function trainMerges(text: string, nMerges: number): Array<[number, number]> {
  const frequency = new Map<string, number>();
  for (const piece of presplit(text)) {
    frequency.set(piece, (frequency.get(piece) ?? 0) + 1);
  }

  // Each distinct piece as its UTF-8 byte values, weighted by how often it occurs.
  const pieces: Array<{ ids: number[]; weight: number }> = [];
  for (const [piece, weight] of frequency) {
    pieces.push({ ids: Array.from(encoder.encode(piece)), weight });
  }

  const merges: Array<[number, number]> = [];
  for (let m = 0; m < nMerges; m++) {
    const counts = new Map<number, number>();
    for (const { ids, weight } of pieces) {
      for (let i = 0; i + 1 < ids.length; i++) {
        const key = keyOf(ids[i] as number, ids[i + 1] as number);
        counts.set(key, (counts.get(key) ?? 0) + weight);
      }
    }
    if (counts.size === 0) break;

    let bestKey = -1;
    let bestCount = 0;
    for (const [key, count] of counts) {
      // Keys sort as (left, right), so "smaller key" is exactly the tie-break rule.
      if (count > bestCount || (count === bestCount && key < bestKey)) {
        bestKey = key;
        bestCount = count;
      }
    }

    const left = Math.floor(bestKey / 65536);
    const right = bestKey % 65536;
    const newId = 256 + m;
    merges.push([left, right]);

    for (const piece of pieces) {
      const ids = piece.ids;
      const next: number[] = [];
      for (let i = 0; i < ids.length; i++) {
        if (i + 1 < ids.length && ids[i] === left && ids[i + 1] === right) {
          next.push(newId);
          i++;
        } else {
          next.push(ids[i] as number);
        }
      }
      piece.ids = next;
    }
  }
  return merges;
}

/** JSON text with the meta object indented and one merge pair per line, so diffs are reviewable. */
export function formatMergeData(meta: MergeMeta, merges: ReadonlyArray<readonly [number, number]>): string {
  const metaText = JSON.stringify(meta, null, 2).replace(/\n/g, "\n  ");
  const lines = merges.map((pair) => `    [${pair[0]}, ${pair[1]}]`).join(",\n");
  const mergeText = merges.length === 0 ? "[]" : `[\n${lines}\n  ]`;
  return `{\n  "meta": ${metaText},\n  "merges": ${mergeText}\n}\n`;
}

// Offline, deterministic byte-level BPE trainer (D-01, D-03). A pure module: no
// node: imports, so Vitest can import it for the determinism and tie-break goldens.
// It shares the runtime's pre-split rule so training and tokenizing cannot disagree.
// The merge loop and the tie-break live in src/core/bpe.ts, shared with the stepper (D-04).
import { trainOnPieces } from "../../src/core/bpe.ts";
import type { BpePiece } from "../../src/core/bpe.ts";
import { presplit } from "../../src/core/presplit.ts";
import type { MergeMeta } from "../../src/core/types.ts";

const encoder = new TextEncoder();

/**
 * Learn `nMerges` merges from `text`. Returns [left, right] id pairs; the pair at
 * index i gets id 256 + i. Tie-break (recorded in merges.json): highest pair count,
 * then the smallest left id, then the smallest right id (see comparePairs in
 * src/core/bpe.ts). Stops early if no pair is left.
 */
export function trainMerges(text: string, nMerges: number): Array<[number, number]> {
  const frequency = new Map<string, number>();
  for (const piece of presplit(text)) {
    frequency.set(piece, (frequency.get(piece) ?? 0) + 1);
  }

  // Each distinct piece as its UTF-8 byte values, weighted by how often it occurs.
  const pieces: BpePiece[] = [];
  for (const [piece, weight] of frequency) {
    pieces.push({ ids: Array.from(encoder.encode(piece)), weight });
  }

  return trainOnPieces(pieces, nMerges);
}

/** JSON text with the meta object indented and one merge pair per line, so diffs are reviewable. */
export function formatMergeData(meta: MergeMeta, merges: ReadonlyArray<readonly [number, number]>): string {
  const metaText = JSON.stringify(meta, null, 2).replace(/\n/g, "\n  ");
  const lines = merges.map((pair) => `    [${pair[0]}, ${pair[1]}]`).join(",\n");
  const mergeText = merges.length === 0 ? "[]" : `[\n${lines}\n  ]`;
  return `{\n  "meta": ${metaText},\n  "merges": ${mergeText}\n}\n`;
}

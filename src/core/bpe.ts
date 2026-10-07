// The one BPE merge loop and the one tie-break rule (D-04, R-02 d). A pure module: no
// node: imports, so the browser stepper (src/core/stepper.ts) and its tests can call it.

/** Pair key: ids stay below 65536 (256 base ids plus at most a few thousand merges). */
export const keyOf = (left: number, right: number): number => left * 65536 + right;

export type PairEntry = { left: number; right: number; count: number };

/** One piece of training text as ids, weighted by how often it occurs. `label` is for display only. */
export type BpePiece = { ids: number[]; weight: number; label?: string };

/**
 * What a merge hook sees. `before` is a copy taken before the merge, `after` the live pieces
 * once it is applied, `counts` the pair counts that decided it (key to weighted count).
 */
export type MergeStepInfo = {
  merge: number;
  newId: number;
  best: PairEntry;
  counts: ReadonlyMap<number, number>;
  before: ReadonlyArray<BpePiece>;
  after: ReadonlyArray<BpePiece>;
};

/**
 * Ranking order of two pairs: negative when `a` ranks before `b`. Highest count first, then
 * the smaller key, and keys sort as (left, right), so that is the smaller left id and then
 * the smaller right id. This is the only place the tie-break rule is written.
 */
export function comparePairs(a: { count: number; key: number }, b: { count: number; key: number }): number {
  if (a.count !== b.count) return b.count - a.count;
  return a.key - b.key;
}

/** Every pair in `counts`, best first (see `comparePairs`). */
export function rankPairs(counts: ReadonlyMap<number, number>): PairEntry[] {
  const keyed = Array.from(counts, ([key, count]) => ({ key, count }));
  keyed.sort(comparePairs);
  return keyed.map(({ key, count }) => ({ left: Math.floor(key / 65536), right: key % 65536, count }));
}

/**
 * Learn up to `nMerges` merges over weighted pieces. Mutates `pieces`. Merge m gets id 256 + m.
 * Returns [left, right] id pairs and stops early when no pair is left. When `onStep` is given,
 * the pieces are copied before each merge so the hook can show the before and after states;
 * without a hook nothing is copied.
 */
export function trainOnPieces(
  pieces: BpePiece[],
  nMerges: number,
  onStep?: (info: MergeStepInfo) => void,
): Array<[number, number]> {
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
      if (bestKey < 0 || comparePairs({ count, key }, { count: bestCount, key: bestKey }) < 0) {
        bestKey = key;
        bestCount = count;
      }
    }

    const left = Math.floor(bestKey / 65536);
    const right = bestKey % 65536;
    const newId = 256 + m;
    merges.push([left, right]);

    const before = onStep ? pieces.map((p) => ({ ...p, ids: p.ids.slice() })) : [];

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

    if (onStep) {
      onStep({ merge: m, newId, best: { left, right, count: bestCount }, counts, before, after: pieces });
    }
  }
  return merges;
}

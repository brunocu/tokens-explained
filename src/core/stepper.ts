// The BPE stepper's pure trace (D-04, D-05; plan 02-10): real byte-level BPE on one sample
// sentence, from raw text to the finished pieces. The component only indexes into the trace
// and the post's numbers come from STEPPER_FACTS, so neither can drift from the engine. The
// merge loop and the tie rule are not written here; they come from src/core/bpe.ts.
import { rankPairs, trainOnPieces } from "./bpe.ts";
import type { BpePiece, MergeStepInfo } from "./bpe.ts";
import { GLYPH_SPACE } from "./display.ts";

/** The sentence the stepper trains on. One constant: swapping it changes every number below. */
export const SAMPLE_SENTENCE = "the cat sat on the mat and the cat sat on the hat";

/** The merge budget: how many merges the demo learns before it stops (enough for the pieces for cat and sat to form). */
export const STEPPER_MERGES = 10;

/** The two words shown after the stop: one built from known pieces, one that falls back to bytes. */
export const UNSEEN_WORDS: readonly [string, string] = [" that", " \u{1F431}"];

/** One pair of neighbouring pieces, with its count. `tied` marks every row sharing the top count. */
export type PairRow = {
  left: number;
  right: number;
  leftText: string;
  rightText: string;
  count: number;
  tied: boolean;
};

export type VocabEntry = {
  id: number;
  text: string;
  left: number;
  right: number;
  leftText: string;
  rightText: string;
  count: number;
};

export type SentenceMerge = {
  /** 1-based merge number. */
  index: number;
  /** Every pair counted before the merge, best first (the order of `comparePairs`). */
  pairs: PairRow[];
  totalPairs: number;
  chosen: PairRow;
  /** How many pairs share the top count, the winner included; 1 means no tie. */
  tiedCount: number;
  /** Which number settled a tie: the left one, or (when the left ones match) the right one. */
  decidedBy: "none" | "left" | "right";
  newId: number;
  newText: string;
  /** The word segmentations (ids) before and after this merge. */
  before: number[][];
  after: number[][];
  /** 256 plus the merges so far. */
  vocabularySize: number;
  /** Pieces in the whole text after this merge. */
  totalPieces: number;
};

export type SentenceTrace = {
  text: string;
  words: string[];
  /** The bytes of each word, before any merge. */
  start: number[][];
  startPieces: number;
  merges: SentenceMerge[];
  /** The learned pieces in learning order. */
  vocabulary: VocabEntry[];
  /** Pieces in the text after 0, 1, 2 ... merges. */
  lengths: number[];
};

/**
 * Text shown for one byte: printable ASCII as itself, the space as the space glyph and every
 * other byte as two uppercase hex digits.
 */
export function byteLabel(id: number): string {
  if (id === 0x20) return GLYPH_SPACE;
  if (id > 0x20 && id < 0x7f) return String.fromCharCode(id);
  return id.toString(16).toUpperCase().padStart(2, "0");
}

/**
 * Cuts text into words at the spaces. All the spaces before a word belong to the start of that
 * word, so no piece built from one word can ever contain bytes of another.
 */
export function splitWords(text: string): string[] {
  return text.match(/ *[^ ]+| +/g) ?? [];
}

/** Text of one id: a byte label below 256, the learned piece's text from 256 up. */
export function textOf(trace: SentenceTrace, id: number): string {
  if (id < 256) return byteLabel(id);
  return trace.vocabulary[id - 256]?.text ?? "?";
}

/** Replays merges over one word's ids exactly the way the training loop applies them. */
function applyMerge(ids: number[], left: number, right: number, newId: number): number[] {
  const next: number[] = [];
  for (let i = 0; i < ids.length; i++) {
    if (i + 1 < ids.length && ids[i] === left && ids[i + 1] === right) {
      next.push(newId);
      i++;
    } else {
      next.push(ids[i] as number);
    }
  }
  return next;
}

/** Train BPE on `text`: one SentenceMerge per merge (fewer than `nMerges` if the pairs run out). */
export function trainSentence(text: string, nMerges: number): SentenceTrace {
  const encoder = new TextEncoder();
  const words = splitWords(text);
  const start = words.map((w) => Array.from(encoder.encode(w)));
  const pieces: BpePiece[] = start.map((ids) => ({ ids: ids.slice(), weight: 1 }));
  const startPieces = start.reduce((n, w) => n + w.length, 0);
  const trace: SentenceTrace = { text, words, start, startPieces, merges: [], vocabulary: [], lengths: [startPieces] };

  trainOnPieces(pieces, nMerges, (info: MergeStepInfo) => {
    const label = (id: number): string => textOf(trace, id);
    const ranked = rankPairs(info.counts);
    const top = ranked[0]?.count ?? 0;
    const rows: PairRow[] = ranked.map((p) => ({
      left: p.left,
      right: p.right,
      leftText: label(p.left),
      rightText: label(p.right),
      count: p.count,
      tied: p.count === top,
    }));
    const chosen = rows[0] as PairRow;
    const tiedRows = rows.filter((r) => r.tied);
    const lowestLeft = Math.min(...tiedRows.map((r) => r.left));
    const decidedBy =
      tiedRows.length === 1 ? "none" : tiedRows.filter((r) => r.left === lowestLeft).length === 1 ? "left" : "right";

    const newText = chosen.leftText + chosen.rightText;
    trace.vocabulary.push({
      id: info.newId,
      text: newText,
      left: chosen.left,
      right: chosen.right,
      leftText: chosen.leftText,
      rightText: chosen.rightText,
      count: chosen.count,
    });
    const totalPieces = info.after.reduce((n, p) => n + p.ids.length, 0);
    trace.lengths.push(totalPieces);
    trace.merges.push({
      index: info.merge + 1,
      pairs: rows,
      totalPairs: rows.length,
      chosen,
      tiedCount: tiedRows.length,
      decidedBy,
      newId: info.newId,
      newText,
      before: info.before.map((p) => p.ids.slice()),
      after: info.after.map((p) => p.ids.slice()),
      vocabularySize: 256 + info.merge + 1,
      totalPieces,
    });
  });
  return trace;
}

/** The learned merges as [left, right] id pairs, in learning order (merge m has the id 256 + m). */
export function mergePairs(trace: SentenceTrace): Array<[number, number]> {
  return trace.merges.map((m) => [m.chosen.left, m.chosen.right]);
}

/**
 * Encode text with learned merges: cut it into words, take each word's bytes and apply every
 * merge in the order it was learned. Returns one id list per word. Any byte is always a valid
 * piece, so nothing is ever left out.
 */
export function encodeText(text: string, merges: ReadonlyArray<readonly [number, number]>): number[][] {
  const encoder = new TextEncoder();
  return splitWords(text).map((word) => {
    let ids = Array.from(encoder.encode(word));
    merges.forEach(([left, right], m) => {
      ids = applyMerge(ids, left, right, 256 + m);
    });
    return ids;
  });
}

/** Text for a screen reader: the space glyph is spoken as the word "space". */
export function spokenText(text: string): string {
  return text.split(GLYPH_SPACE).join(" space ").replace(/\s+/g, " ").trim();
}

/** One word's pieces as a sentence fragment for a screen reader: "space the 259, c 99". */
export function spokenPieces(trace: SentenceTrace, word: ReadonlyArray<number>): string {
  return word.map((id) => `${spokenText(textOf(trace, id))} ${id}`).join(", ");
}

export type PieceRun ={ id: number } | { pair: [number, number] };

/**
 * Cuts one word's ids into single pieces and boxed pairs: every place the pair (left, right)
 * is about to merge becomes one `pair` run, the way the merge loop reads the word.
 */
export function markPairs(word: ReadonlyArray<number>, left: number, right: number): PieceRun[] {
  const runs: PieceRun[] = [];
  for (let i = 0; i < word.length; i++) {
    if (i + 1 < word.length && word[i] === left && word[i + 1] === right) {
      runs.push({ pair: [left, right] });
      i++;
    } else {
      runs.push({ id: word[i] as number });
    }
  }
  return runs;
}

/** The trace the page shows. */
export const SAMPLE_TRACE: SentenceTrace = trainSentence(SAMPLE_SENTENCE, STEPPER_MERGES);

const byteValue = (character: string): number => new TextEncoder().encode(character)[0] as number;

/**
 * Every number the post quotes about the stepper, derived from the trace. The post reads these
 * through a <Fact> component, so a prose figure cannot drift from the engine.
 */
export const STEPPER_FACTS = {
  /** How many different values one byte can hold, and the largest of them. */
  byteValues: 256,
  lastByteValue: 255,
  /** The id the first learned piece gets (the first id above the byte values). */
  firstNewId: (SAMPLE_TRACE.merges[0] as SentenceMerge).newId,
  merges: SAMPLE_TRACE.merges.length,
  vocabularySize: 256 + SAMPLE_TRACE.merges.length,
  startPieces: SAMPLE_TRACE.startPieces,
  endPieces: SAMPLE_TRACE.lengths[SAMPLE_TRACE.lengths.length - 1] as number,
  wordCount: SAMPLE_TRACE.words.length,
  byteOfT: byteValue("t"),
  byteOfSpace: byteValue(" "),
  firstPairCount: (SAMPLE_TRACE.merges[0] as SentenceMerge).chosen.count,
  /** Number of stages the stepper walks through: text with numbers, start, one per merge, stop, unseen. */
  stages: SAMPLE_TRACE.merges.length + 4,
} as const;

export type FactKey = keyof typeof STEPPER_FACTS;

/** A sentence-end number for prose: reads a named fact, and fails loudly on a typo. */
export function fact(key: string): number {
  if (!Object.hasOwn(STEPPER_FACTS, key)) throw new Error(`Unknown stepper fact "${key}"`);
  return STEPPER_FACTS[key as FactKey];
}

export type StageInfo =
  | { kind: "text" }
  | { kind: "start" }
  | { kind: "merge"; merge: number }
  | { kind: "stop" }
  | { kind: "unseen" };

/**
 * Stage 0 the text with its numbers, 1 starting pieces, 2 to 1 + M one per merge (the state
 * before that merge), 2 + M the stop, 3 + M the unseen words.
 */
export function stageInfo(trace: SentenceTrace, stage: number): StageInfo {
  const m = trace.merges.length;
  if (stage <= 0) return { kind: "text" };
  if (stage === 1) return { kind: "start" };
  if (stage <= 1 + m) return { kind: "merge", merge: stage - 1 };
  if (stage === 2 + m) return { kind: "stop" };
  return { kind: "unseen" };
}

export function stageCount(trace: SentenceTrace): number {
  return trace.merges.length + 4;
}

export function stageName(trace: SentenceTrace, stage: number): string {
  const info = stageInfo(trace, stage);
  switch (info.kind) {
    case "text":
      return "The text as byte values";
    case "start":
      return "Starting pieces";
    case "merge":
      return `Merge ${info.merge} of ${trace.merges.length}`;
    case "stop":
      return "Stop";
    case "unseen":
      return "A word it has never seen";
  }
}

const pairText = (row: { leftText: string; rightText: string }): string => `${row.leftText} + ${row.rightText}`;

/** The plain-language reason shown at one stage. Numbers come from the trace, never typed. */
export function explainStage(trace: SentenceTrace, stage: number): string {
  const info = stageInfo(trace, stage);
  const m = trace.merges.length;
  switch (info.kind) {
    case "text":
      return (
        "This is the \"raw\" text, exactly as you would type it: a row of characters, spaces included. " +
        "Shown under the character, is its corresponding byte value. " +
        `The sentence is a list of ${trace.startPieces} values.`
      );
    case "start":
      return (
        "Before any merging, the vocabulary is just the 256 possible byte values, with the ids 0 to 255. " +
        `The text is ${trace.startPieces} tokens long, one per byte. ` +
        "Words are cut apart first, so a token never joins two words; a space belongs to the start of the word after it."
      );
    case "merge": {
      const step = trace.merges[info.merge - 1] as SentenceMerge;
      const c = step.chosen;
      const head =
        `Merge ${step.index} of ${m}. The most common neighbouring pair is ${pairText(c)}, ` +
        `seen ${c.count} times.`;
      const tie =
        step.tiedCount > 1
          ? ` ${step.tiedCount} pairs are tied on ${c.count}. A tie goes to the pair with the smaller numeric values: here ` +
            (step.decidedBy === "left"
              ? `the first id, ${c.left}, is the smallest.`
              : `the first ids match, so the second id, ${c.right}, decides.`)
          : "";
      return `${head}${tie} Every boxed spot is about to become one token, with the new id ${step.newId}.`;
    }
    case "stop":
      return (
        `We decided in advance to stop after ${m} merges. The vocabulary is now 256 + ${m} = ${256 + m} entries, ` +
        `and the text shrank from ${trace.startPieces} tokens to ${trace.lengths[trace.lengths.length - 1]}. ` +
        "More merges would shorten the text further, but every merge adds one more entry to the vocabulary."
      );
    case "unseen":
      return (
        "Words the tokenizer never saw still work. " +
        `The word "${UNSEEN_WORDS[0].trim()}", with its space in front, is built from tokens it already knows. ` +
        "The cat emoji has no learned tokens at all, so it falls back to its raw bytes. Nothing is ever left out."
      );
  }
}

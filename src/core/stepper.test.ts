import { describe, expect, it } from "vitest";
import { trainOnPieces } from "./bpe.ts";
import type { BpePiece } from "./bpe.ts";
import { GLYPH_SPACE } from "./display.ts";
import { presplit } from "./presplit.ts";
import {
  SAMPLE_SENTENCE,
  SAMPLE_TRACE,
  STEPPER_FACTS,
  STEPPER_MERGES,
  UNSEEN_WORDS,
  byteLabel,
  encodeText,
  explainStage,
  fact,
  markPairs,
  mergePairs,
  splitWords,
  spokenPieces,
  spokenText,
  stageInfo,
  stageName,
  textOf,
  trainSentence,
} from "./stepper.ts";
import type { SentenceMerge } from "./stepper.ts";
import { trainMerges } from "../../scripts/lib/bpe-train.ts";

const S = GLYPH_SPACE;
const trace = SAMPLE_TRACE;
const merge = (n: number): SentenceMerge => trace.merges[n - 1] as SentenceMerge;
const pair = (row: { leftText: string; rightText: string }) => `${row.leftText}+${row.rightText}`;

describe("stepper trace golden (the cat sat on the mat sentence)", () => {
  it("(a) uses the sample sentence and a ten-merge budget", () => {
    expect(SAMPLE_SENTENCE).toBe("the cat sat on the mat and the cat sat on the hat");
    expect(STEPPER_MERGES).toBe(10);
    expect(trace.merges).toHaveLength(STEPPER_MERGES);
  });

  it("(b) learns these winners, with these counts, in this order (comparePairs tie rule)", () => {
    expect(trace.merges.map((m) => `${pair(m.chosen)}:${m.chosen.count}`)).toEqual([
      "a+t:6",
      "h+e:4",
      "t+he:4",
      `${S}+the:3`,
      `${S}+c:2`,
      `${S}+o:2`,
      `${S}+s:2`,
      `${S}c+at:2`,
      `${S}o+n:2`,
      `${S}s+at:2`,
    ]);
  });

  it("(c) names the new pieces and gives merge m the id 256 + m", () => {
    expect(trace.merges.map((m) => m.newText)).toEqual([
      "at",
      "he",
      "the",
      `${S}the`,
      `${S}c`,
      `${S}o`,
      `${S}s`,
      `${S}cat`,
      `${S}on`,
      `${S}sat`,
    ]);
    expect(trace.merges.map((m) => m.newId)).toEqual([256, 257, 258, 259, 260, 261, 262, 263, 264, 265]);
    expect(trace.vocabulary.map((v) => v.id)).toEqual([256, 257, 258, 259, 260, 261, 262, 263, 264, 265]);
  });

  it("(d) counts the pairs sharing the top count, and says which number decided a tie", () => {
    expect(trace.merges.map((m) => m.tiedCount)).toEqual([1, 2, 1, 1, 6, 5, 4, 3, 2, 1]);
    expect(trace.merges.map((m) => m.decidedBy)).toEqual([
      "none",
      "left",
      "none",
      "none",
      "right",
      "right",
      "left",
      "left",
      "left",
      "none",
    ]);
  });

  it("(e) counts the distinct pairs before each merge, best first", () => {
    expect(trace.merges.map((m) => m.totalPairs)).toEqual([17, 16, 15, 14, 13, 12, 11, 10, 9, 8]);
    for (const m of trace.merges) {
      expect(m.pairs).toHaveLength(m.totalPairs);
      expect(m.pairs[0]).toBe(m.chosen);
      expect(m.pairs.filter((p) => p.count === m.chosen.count)).toHaveLength(m.tiedCount);
      for (let i = 1; i < m.pairs.length; i++) {
        expect((m.pairs[i - 1] as { count: number }).count).toBeGreaterThanOrEqual((m.pairs[i] as { count: number }).count);
      }
    }
  });

  it("(f) starts at the bytes of the sentence: 49 pieces, a+t seen 6 times, six boxed spots", () => {
    expect(trace.startPieces).toBe(new TextEncoder().encode(SAMPLE_SENTENCE).length);
    expect(trace.startPieces).toBe(49);
    expect(trace.words).toHaveLength(13);
    expect(trace.start.flat()).toEqual(Array.from(new TextEncoder().encode(SAMPLE_SENTENCE)));
    expect(merge(1).chosen.count).toBe(6);
    const first = merge(1);
    let spots = 0;
    for (const word of first.before) {
      for (let i = 0; i + 1 < word.length; i++) {
        if (word[i] === first.chosen.left && word[i + 1] === first.chosen.right) spots++;
      }
    }
    expect(spots).toBe(first.chosen.count);
  });

  it("(g) the vocabulary is 256 plus the merges so far, and the text shrinks with every merge", () => {
    expect(trace.merges.map((m) => m.vocabularySize)).toEqual([257, 258, 259, 260, 261, 262, 263, 264, 265, 266]);
    expect(trace.lengths).toEqual([49, 43, 39, 35, 32, 30, 28, 26, 24, 22, 20]);
    expect(trace.merges.map((m) => m.totalPieces)).toEqual(trace.lengths.slice(1));
    expect(STEPPER_FACTS.vocabularySize).toBe(256 + STEPPER_MERGES);
  });

  it("(h) no piece ever crosses a word boundary: the space only ever starts a word's first piece", () => {
    for (const m of trace.merges) {
      m.after.forEach((word, w) => {
        const texts = word.map((id) => textOf(trace, id));
        expect(texts.join("")).toBe((trace.words[w] as string).split(" ").join(S));
        texts.slice(1).forEach((t) => expect(t).not.toContain(S));
      });
    }
  });

  it("(i) keeps the vocabulary in learning order with recipes", () => {
    expect(trace.vocabulary[3]).toMatchObject({ id: 259, text: `${S}the`, left: 32, right: 258, leftText: S, rightText: "the" });
    expect(trace.vocabulary).toHaveLength(STEPPER_MERGES);
  });

  it("(j) can run a different budget, and stops early when no pair is left", () => {
    const one = trainSentence("aa", 5);
    expect(one.merges).toHaveLength(1);
    expect(trainSentence(SAMPLE_SENTENCE, 14).merges).toHaveLength(14);
    expect(trainSentence("", 3).merges).toHaveLength(0);
  });
});

describe("byteLabel and splitWords", () => {
  it("(k) shows printable ASCII as itself, the space as the glyph and other bytes as hex", () => {
    expect(byteLabel(116)).toBe("t");
    expect(byteLabel(32)).toBe(S);
    expect(byteLabel(240)).toBe("F0");
    expect(byteLabel(10)).toBe("0A");
    expect(byteLabel(127)).toBe("7F");
    expect(byteLabel(33)).toBe("!");
  });

  it("(l) cuts at spaces and keeps the space at the start of the following word", () => {
    expect(splitWords("the cat sat")).toEqual(["the", " cat", " sat"]);
    expect(splitWords(" that")).toEqual([" that"]);
    expect(splitWords("a  b")).toEqual(["a", "  b"]);
    expect(splitWords("a ")).toEqual(["a", " "]);
    expect(splitWords("")).toEqual([]);
    expect(splitWords(SAMPLE_SENTENCE).join("")).toBe(SAMPLE_SENTENCE);
  });
});

describe("encodeText (the learned merges applied in order)", () => {
  const merges = mergePairs(trace);

  it("(m) builds a word it never saw from known pieces: ' that' is four pieces", () => {
    expect(encodeText(" that", merges)).toEqual([[32, 116, 104, 256]]);
    expect(encodeText(" that", merges)[0]?.map((id) => textOf(trace, id))).toEqual([S, "t", "h", "at"]);
  });

  it("(n) falls back to raw bytes for the cat face: one space byte plus four byte ids", () => {
    expect(encodeText(" \u{1F431}", merges)).toEqual([[32, 240, 159, 144, 177]]);
    expect(UNSEEN_WORDS).toEqual([" that", " \u{1F431}"]);
  });

  it("(o) agrees with the trace: encoding the sample sentence gives the final segmentation", () => {
    expect(encodeText(SAMPLE_SENTENCE, merges)).toEqual(merge(STEPPER_MERGES).after);
    expect(encodeText(SAMPLE_SENTENCE, [])).toEqual(trace.start);
  });

  it("(p) never lets a piece cross a space", () => {
    const text = "the cat that sat on a mat";
    const out = encodeText(text, merges);
    const words = splitWords(text);
    expect(out).toHaveLength(words.length);
    out.forEach((word, i) => {
      const texts = word.map((id) => textOf(trace, id));
      expect(texts.join("")).toBe((words[i] as string).split(" ").join(S));
      texts.slice(1).forEach((t) => expect(t).not.toContain(S));
    });
  });
});

describe("markPairs (the boxed spots)", () => {
  it("(m2) boxes every spot where the winning pair is about to merge, and only those", () => {
    const first = merge(1);
    const runs = first.before.map((word) => markPairs(word, first.chosen.left, first.chosen.right));
    expect(runs.flat().filter((r) => "pair" in r)).toHaveLength(first.chosen.count);
    // Boxed pairs and single pieces together still cover every byte of every word, in order.
    runs.forEach((word, w) => {
      const ids = word.flatMap((r) => ("pair" in r ? r.pair : [r.id]));
      expect(ids).toEqual(first.before[w]);
    });
    expect(markPairs([97, 97, 97], 97, 97)).toEqual([{ pair: [97, 97] }, { id: 97 }]);
  });
});

describe("STEPPER_FACTS and fact()", () => {
  it("(m4) derives every figure the post quotes from the trace, and fails loudly on a typo", () => {
    expect(STEPPER_FACTS).toMatchObject({
      byteValues: 256,
      lastByteValue: 255,
      firstNewId: 256,
      merges: 10,
      vocabularySize: 266,
      startPieces: 49,
      endPieces: 20,
      wordCount: 13,
      byteOfT: 116,
      byteOfSpace: 32,
      firstPairCount: 6,
    });
    expect(fact("vocabularySize")).toBe(STEPPER_FACTS.byteValues + STEPPER_FACTS.merges);
    expect(STEPPER_FACTS.wordCount).toBe(SAMPLE_SENTENCE.split(" ").length);
    expect(STEPPER_FACTS.startPieces).toBe(new TextEncoder().encode(SAMPLE_SENTENCE).length);
    expect(() => fact("vocabularySise")).toThrow(/Unknown stepper fact/);
    expect(() => fact("toString")).toThrow(/Unknown stepper fact/);
  });
});

describe("spoken text", () => {
  it("(m3) speaks the space glyph as the word space and lists pieces with their numbers", () => {
    expect(spokenText(`${S}the`)).toBe("space the");
    expect(spokenText("t")).toBe("t");
    expect(spokenText(S)).toBe("space");
    expect(spokenPieces(trace, [32, 259, 99])).toBe("space 32, space the 259, c 99");
  });
});

describe("stages and sentences", () => {
  it("(q) has the text with its numbers, start, one stage per merge, the stop and the unseen words", () => {
    expect(stageInfo(trace, 0)).toEqual({ kind: "text" });
    expect(stageInfo(trace, 1)).toEqual({ kind: "start" });
    expect(stageInfo(trace, 2)).toEqual({ kind: "merge", merge: 1 });
    expect(stageInfo(trace, 1 + STEPPER_MERGES)).toEqual({ kind: "merge", merge: STEPPER_MERGES });
    expect(stageInfo(trace, 2 + STEPPER_MERGES)).toEqual({ kind: "stop" });
    expect(stageInfo(trace, 3 + STEPPER_MERGES)).toEqual({ kind: "unseen" });
    expect(STEPPER_FACTS.stages).toBe(STEPPER_MERGES + 4);
    expect(stageName(trace, 0)).toBe("The text as byte values");
    expect(stageName(trace, 2)).toBe(`Merge 1 of ${STEPPER_MERGES}`);
  });

  it("(r) the first stage names the byte values and the length of the text", () => {
    const text = explainStage(trace, 0);
    expect(text).toContain("byte value");
    expect(text).toContain("49 values");
    expect(STEPPER_FACTS.byteOfT).toBe(116);
  });

  it("(s) the start stage says the vocabulary is 256 byte values and that pieces never join words", () => {
    const text = explainStage(trace, 1);
    expect(text).toContain("0 to 255");
    expect(text).toContain("49 tokens");
    expect(text).toContain("never joins two words");
  });

  it("(t) a merge stage names the pair, the count and the new id", () => {
    expect(explainStage(trace, 2)).toBe(
      "Merge 1 of 10. The most common neighbouring pair is a + t, seen 6 times. " +
        "Every boxed spot is about to become one token, with the new id 256.",
    );
  });

  it("(u) a tie is settled by the smaller ids, first the left one, then the right one", () => {
    expect(explainStage(trace, 3)).toContain(
      "2 pairs are tied on 4. A tie goes to the pair with the smaller numeric values: here the first id, 104, is the smallest.",
    );
    expect(explainStage(trace, 6)).toContain(
      `6 pairs are tied on 2. A tie goes to the pair with the smaller numeric values: here the first ids match, so the second id, 99, decides.`,
    );
    expect(explainStage(trace, 3)).not.toMatch(/alphabetical|first seen|vocabulary order/i);
  });

  it("(v) the stop stage reports vocabulary and length from the trace", () => {
    const text = explainStage(trace, 2 + STEPPER_MERGES);
    expect(text).toContain("stop after 10 merges");
    expect(text).toContain("256 + 10 = 266");
    expect(text).toContain("from 49 tokens to 20");
  });

  it("(w) every stage has a non-empty sentence and the last one speaks about unseen words", () => {
    for (let s = 0; s <= 3 + STEPPER_MERGES; s++) expect(explainStage(trace, s).length).toBeGreaterThan(20);
    expect(explainStage(trace, 3 + STEPPER_MERGES)).toContain("never saw");
  });
});

describe("one comparator for the stepper and the Phase 1 trainer", () => {
  it("(x) trainOnPieces without a hook returns exactly the trace's chosen id pairs", () => {
    const encoder = new TextEncoder();
    const pieces: BpePiece[] = splitWords(SAMPLE_SENTENCE).map((w) => ({ ids: Array.from(encoder.encode(w)), weight: 1 }));
    expect(trainOnPieces(pieces, STEPPER_MERGES)).toEqual(mergePairs(trace));
  });

  it("(y) trainMerges equals trainOnPieces on the same byte pieces built from presplit", () => {
    const text = "the cat sat on the mat. the cat ate the rat, and the rat ran off the mat.";
    const encoder = new TextEncoder();
    const frequency = new Map<string, number>();
    for (const piece of presplit(text)) frequency.set(piece, (frequency.get(piece) ?? 0) + 1);
    const pieces: BpePiece[] = Array.from(frequency, ([piece, weight]) => ({ ids: Array.from(encoder.encode(piece)), weight }));
    const direct = trainOnPieces(pieces, 20);
    expect(direct.length).toBeGreaterThan(0);
    expect(trainMerges(text, 20)).toEqual(direct);
  });

  it("(z) a hook does not change the merges", () => {
    const make = (): BpePiece[] => [
      { ids: [97, 98, 97, 98], weight: 3 },
      { ids: [98, 97, 99], weight: 2 },
    ];
    const seen: number[] = [];
    const withHook = trainOnPieces(make(), 5, (info) => seen.push(info.merge));
    expect(withHook).toEqual(trainOnPieces(make(), 5));
    expect(seen).toEqual(withHook.map((_, i) => i));
  });
});

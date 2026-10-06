/** One token. Display text is always derived from `bytes`, never stored. */
export type Token = {
  id: number;
  bytes: Uint8Array;
  /** True when the bytes alone are not valid UTF-8 (part of a multi-byte character). */
  isPartial: boolean;
};

export type MergeMeta = {
  corpus: string;
  retrieved: string;
  merges: number;
  tieBreak: string;
  preSplit: string;
};

export type MergeData = {
  meta: MergeMeta;
  merges: ReadonlyArray<readonly [number, number]>;
};

export type ToyTokenizer = {
  tokenize(text: string): Token[];
  readonly vocabSize: number;
  vocabBytes(id: number): Uint8Array;
};

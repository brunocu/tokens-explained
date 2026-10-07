/** One token. Display text is always derived from `bytes`, never stored. */
export type Token = {
  id: number;
  bytes: Uint8Array;
  /** True when the bytes alone are not valid UTF-8 (part of a multi-byte character). */
  isPartial: boolean;
  /** True for a reserved marker the tokenizer added, such as [UNK]. */
  special?: boolean;
};

// Which hosted file holds which real tokenizer, and the size shown before it is downloaded
// (D-09, D-10). Pure TypeScript. The files live in public/tokenizers/ and are served from
// this site; the base-aware URL is built by the caller, not here.
import type { RealTokenizerId } from "./realTokenizer.ts";

export const TOKENIZER_FILES: Readonly<Record<RealTokenizerId, string>> = {
  gpt2: "gpt2.json",
  bert: "bert-uncased.json",
};

/** Decimal megabytes with one decimal place, for the download label (0.7 for 739621). */
export function sizeLabelMb(bytes: number): string {
  return (bytes / 1_000_000).toFixed(1);
}

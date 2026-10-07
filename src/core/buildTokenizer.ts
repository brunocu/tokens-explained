// GPT-2 for Node: build-time figures, claims, scripts and unit tests (RESEARCH G2, D-03).
// Imported by .astro frontmatter, claims, scripts and tests, and NEVER by an island or any other
// code the reader's browser loads: it reads the committed tokenizer file from disk, and the browser
// path is src/components/loadTokenizer.ts instead (which is also the only network call in src).
//
// It reuses the one adapter (createRealTokenizer), so build-time and in-browser tokens are
// identical. The path comes from process.cwd(), the project root for `astro build`, `astro dev`,
// Vitest and the scripts; import.meta.url is unreliable inside Astro's bundled server chunks. The
// library is imported dynamically inside the function, as in loadTokenizer.ts, so merely importing
// this module loads nothing. The promise is memoised at module level: the roughly 50 ms build
// happens once per process.
import { readFileSync } from "node:fs";
import { createRealTokenizer } from "./realTokenizer.ts";
import type { RealTokenizer, TokenizerCtor } from "./realTokenizer.ts";

let memo: Promise<RealTokenizer> | undefined;

/** The GPT-2 adapter built from public/tokenizers/gpt2.json. Node only. */
export function buildGpt2(): Promise<RealTokenizer> {
  memo ??= (async () => {
    const json = JSON.parse(readFileSync(`${process.cwd()}/public/tokenizers/gpt2.json`, "utf8")) as object;
    const { Tokenizer } = await import("@huggingface/tokenizers");
    return createRealTokenizer("gpt2", json, Tokenizer as unknown as TokenizerCtor);
  })();
  return memo;
}

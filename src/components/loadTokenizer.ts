// The one place in src that talks to the network (T-02-21). It downloads one same-origin
// tokenizer file on request and builds the real tokenizer from it, inside the reader's browser.
// scripts/check-repo.mjs bans the network-call construct everywhere else and exempts exactly
// this path (FETCH_ALLOWED_FILES), with a self-test proving the exemption does not spread.
//
// Shape: `loadTokenizer(id, baseUrl)` is async and returns the adapter object, so the work can
// move into a Web Worker later with no change to callers (D-10). The tokenizer library is
// imported dynamically inside the function, never at module top level, so it is not in the page
// bundle and the build step (which also runs this module's importers on a server) never loads it
// (RESEARCH Pitfall 1). Only the caller's click handler may call this function.
//
// `baseUrl` is the site base and always ends with a slash (astro.config sets trailingSlash
// "always"; for a project site it is "/repo/"). Building the address from it keeps the file
// reachable under a sub-path (RESEARCH Pitfall 3); npm run check:base proves that.
//
// Reader text never appears in a request: the only thing sent is a plain GET for a static file.
import { createRealTokenizer } from "../core/realTokenizer.ts";
import type { RealTokenizer, RealTokenizerId, TokenizerCtor } from "../core/realTokenizer.ts";
import { TOKENIZER_FILES } from "../core/tokenizerFiles.ts";

/** Address of one hosted tokenizer file, for a base that ends with a slash. */
export function tokenizerUrl(id: RealTokenizerId, baseUrl: string): string {
  return `${baseUrl}tokenizers/${TOKENIZER_FILES[id]}`;
}

export async function loadTokenizer(id: RealTokenizerId, baseUrl: string): Promise<RealTokenizer> {
  const response = await fetch(tokenizerUrl(id, baseUrl));
  if (!response.ok) {
    throw new Error(`The ${id} tokenizer file could not be downloaded (status ${response.status}).`);
  }
  const json = (await response.json()) as object;
  const { Tokenizer } = await import("@huggingface/tokenizers");
  return createRealTokenizer(id, json, Tokenizer as unknown as TokenizerCtor);
}

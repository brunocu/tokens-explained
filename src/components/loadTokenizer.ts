// The one place in src that talks to the network (T-02-21). It downloads one same-origin
// tokenizer file on request and builds the real tokenizer from it, inside the reader's browser.
// scripts/check-repo.mjs bans the network-call construct everywhere else and exempts exactly
// this path (FETCH_ALLOWED_FILES), with a self-test proving the exemption does not spread.
//
// Shape: `loadTokenizer(id, baseUrl)` is async and returns the adapter object, so the work can
// move into a Web Worker later with no change to callers (D-10). The tokenizer library is
// imported dynamically inside the function, never at module top level, so it is not in the page
// bundle and the build step (which also runs this module's importers on a server) never loads it
// (RESEARCH Pitfall 1). Callers may call it from onMount or from a click handler, never at
// component top level, because the component also runs on a server at build time.
//
// One promise per base-plus-id is kept (D-08): concurrent callers share one request and one built
// instance, and a later caller gets the same instance without another request. A failed attempt is
// not cached: the entry is removed when the promise rejects, so a "Try again" press fetches again.
// A successful download is announced to the subscribers of that key (`onTokenizerLoaded`), so a
// widget stuck on a failed attempt can recover when another widget's retry works. The signal is
// in-memory only and makes no new request.
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

async function download(id: RealTokenizerId, baseUrl: string): Promise<RealTokenizer> {
  const response = await fetch(tokenizerUrl(id, baseUrl));
  if (!response.ok) {
    throw new Error(`The ${id} tokenizer file could not be downloaded (status ${response.status}).`);
  }
  const json = (await response.json()) as object;
  const { Tokenizer } = await import("@huggingface/tokenizers");
  return createRealTokenizer(id, json, Tokenizer as unknown as TokenizerCtor);
}

const cache = new Map<string, Promise<RealTokenizer>>();
const listeners = new Map<string, Set<(tokenizer: RealTokenizer) => void>>();

/**
 * Subscribes to successful downloads of one base-plus-id. The listener is called once per
 * successful download with the built tokenizer, never on failure and never replayed to a late
 * subscriber (a late caller of `loadTokenizer` gets the memoised success at once). Returns a
 * function that unsubscribes; calling it more than once is harmless.
 */
export function onTokenizerLoaded(
  id: RealTokenizerId,
  baseUrl: string,
  listener: (tokenizer: RealTokenizer) => void,
): () => void {
  const key = tokenizerUrl(id, baseUrl);
  let set = listeners.get(key);
  if (set === undefined) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    const current = listeners.get(key);
    if (current === undefined) return;
    current.delete(listener);
    if (current.size === 0) listeners.delete(key);
  };
}

function announceLoaded(key: string, tokenizer: RealTokenizer): void {
  const set = listeners.get(key);
  if (set === undefined) return;
  // Iterate a copy: a listener may unsubscribe itself while it runs.
  for (const listener of [...set]) {
    try {
      listener(tokenizer);
    } catch {
      // A faulty listener must neither reject the load nor starve the other listeners.
    }
  }
}

export function loadTokenizer(id: RealTokenizerId, baseUrl: string): Promise<RealTokenizer> {
  // The full address is unique per base and id, so it is the key.
  const key = tokenizerUrl(id, baseUrl);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const attempt: Promise<RealTokenizer> = download(id, baseUrl).then(
    (tokenizer) => {
      announceLoaded(key, tokenizer);
      return tokenizer;
    },
    (error: unknown) => {
      // Evict only this attempt, never a newer one that replaced it.
      if (cache.get(key) === attempt) cache.delete(key);
      throw error;
    },
  );
  cache.set(key, attempt);
  return attempt;
}

/** Empties the cache and the listeners. For tests, so every test starts clean. */
export function resetTokenizerCache(): void {
  cache.clear();
  listeners.clear();
}

// The load-retry-recover logic that the playground and the comparison card share (G-02.1-3). Each
// widget keeps its own failed state and its own Try again button, but when the file finally
// arrives, every widget that was waiting on it recovers, whichever widget the reader pressed.
//
// This module makes no network call itself: it only asks `loadTokenizer` for the tokenizer and
// listens to `onTokenizerLoaded` for another widget's success. It exists as plain TypeScript so
// the behaviour runs under the node test environment (there is no DOM test setup, and `onMount`
// does not run in server rendering). Create a controller inside `onMount`, never at component top
// level, and call `dispose()` in the cleanup.
//
// `onReady(tokenizer, origin)` tells the widget why it became ready:
//   "own"    this widget started the attempt. Focus movement and spoken announcements are allowed.
//   "other"  another widget's attempt succeeded and cleared this widget while it was failed. The
//            widget changes its state only: no focus, no announcement.
import { loadTokenizer, onTokenizerLoaded } from "./loadTokenizer.ts";
import type { RealTokenizer, RealTokenizerId } from "../core/realTokenizer.ts";

export type TokenizerDownloadHandlers = {
  onLoading(): void;
  onReady(tokenizer: RealTokenizer, origin: "own" | "other"): void;
  /** `retried` is true only for an attempt the reader started with Try again. */
  onFailed(retried: boolean): void;
};

export type TokenizerDownload = {
  /** Starts one attempt. Resolves after the matching handler has been called. */
  start(retried: boolean): Promise<void>;
  /** Stops all further handler calls and unsubscribes from the loader. */
  dispose(): void;
};

type Phase = "idle" | "loading" | "ready" | "failed";

export function createTokenizerDownload(
  id: RealTokenizerId,
  baseUrl: string,
  handlers: TokenizerDownloadHandlers,
): TokenizerDownload {
  let phase: Phase = "idle";
  let disposed = false;

  // Acts only while this widget is failed. An idle, loading (its own attempt gets the same
  // tokenizer through its own promise) or ready widget ignores it. That is what keeps focus and
  // announcements with the widget where the reader pressed Try again.
  const unsubscribe = onTokenizerLoaded(id, baseUrl, (tokenizer) => {
    if (disposed || phase !== "failed") return;
    phase = "ready";
    handlers.onReady(tokenizer, "other");
  });

  async function start(retried: boolean): Promise<void> {
    if (disposed) return;
    phase = "loading";
    handlers.onLoading();
    let loaded: RealTokenizer;
    try {
      loaded = await loadTokenizer(id, baseUrl);
    } catch {
      if (disposed) return;
      phase = "failed";
      handlers.onFailed(retried);
      return;
    }
    if (disposed) return;
    phase = "ready";
    handlers.onReady(loaded, "own");
  }

  function dispose(): void {
    disposed = true;
    unsubscribe();
  }

  return { start, dispose };
}

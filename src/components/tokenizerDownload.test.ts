import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RealTokenizer } from "../core/realTokenizer.ts";
import { resetTokenizerCache } from "./loadTokenizer.ts";
import { createTokenizerDownload } from "./tokenizerDownload.ts";
import type { TokenizerDownloadHandlers } from "./tokenizerDownload.ts";

/**
 * A stand-in for the browser's network function. The first `failures` requests fail with a network
 * error; later ones serve the committed GPT-2 file. `heal()` makes every later request succeed.
 */
function stubNetwork(failures: number): { requested: string[]; heal: () => void } {
  const requested: string[] = [];
  let failing = failures;
  vi.stubGlobal("fetch", async (url: string) => {
    requested.push(url);
    if (failing > 0) {
      failing -= 1;
      throw new TypeError("network error");
    }
    const body = readFileSync("public/tokenizers/gpt2.json", "utf8");
    return new Response(body, { status: 200 });
  });
  return {
    requested,
    heal: () => {
      failing = 0;
    },
  };
}

/** Handlers as spies, so a test can read what each widget would have been told. */
function spies() {
  return {
    onLoading: vi.fn<TokenizerDownloadHandlers["onLoading"]>(),
    onReady: vi.fn<TokenizerDownloadHandlers["onReady"]>(),
    onFailed: vi.fn<TokenizerDownloadHandlers["onFailed"]>(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetTokenizerCache();
});

describe("createTokenizerDownload (G-02.1-3)", () => {
  it("clears every failed widget when one of them retries successfully, with two requests in total", async () => {
    const network = stubNetwork(1);
    const first = spies();
    const second = spies();
    const a = createTokenizerDownload("gpt2", "/", first);
    const b = createTokenizerDownload("gpt2", "/", second);

    // Both widgets start at page load and share the one failing request.
    await Promise.all([a.start(false), b.start(false)]);
    expect(first.onFailed).toHaveBeenCalledExactlyOnceWith(false);
    expect(second.onFailed).toHaveBeenCalledExactlyOnceWith(false);
    expect(network.requested).toHaveLength(1);

    // The reader presses Try again in the first widget only.
    await a.start(true);
    expect(first.onLoading).toHaveBeenCalledTimes(2);
    expect(first.onReady).toHaveBeenCalledTimes(1);
    expect(first.onReady.mock.calls[0]?.[1]).toBe("own");
    const tokenizer = first.onReady.mock.calls[0]?.[0] as RealTokenizer;
    expect(tokenizer.id).toBe("gpt2");

    // The second widget is cleared silently, with the same tokenizer object.
    expect(second.onReady).toHaveBeenCalledTimes(1);
    expect(second.onReady.mock.calls[0]?.[0]).toBe(tokenizer);
    expect(second.onReady.mock.calls[0]?.[1]).toBe("other");
    expect(second.onLoading).toHaveBeenCalledTimes(1);

    expect(network.requested).toHaveLength(2);
    a.dispose();
    b.dispose();
  });

  it("leaves the other widget failed when a retry fails again, and it can still recover on its own press", async () => {
    const network = stubNetwork(2);
    const first = spies();
    const second = spies();
    const a = createTokenizerDownload("gpt2", "/", first);
    const b = createTokenizerDownload("gpt2", "/", second);
    await Promise.all([a.start(false), b.start(false)]);

    await a.start(true);
    expect(first.onFailed).toHaveBeenCalledTimes(2);
    expect(first.onFailed).toHaveBeenLastCalledWith(true);
    expect(first.onReady).not.toHaveBeenCalled();
    expect(second.onFailed).toHaveBeenCalledTimes(1);
    expect(second.onReady).not.toHaveBeenCalled();
    expect(second.onLoading).toHaveBeenCalledTimes(1);
    expect(network.requested).toHaveLength(2);

    // The network is healthy now. The pressed widget recovers, and so does the other one.
    network.heal();
    await a.start(true);
    expect(first.onReady).toHaveBeenCalledTimes(1);
    expect(second.onReady).toHaveBeenCalledTimes(1);
    expect(second.onReady.mock.calls[0]?.[1]).toBe("other");
    expect(network.requested).toHaveLength(3);

    // The second widget could also have pressed its own Try again, served from the memo.
    const third = spies();
    const c = createTokenizerDownload("gpt2", "/", third);
    await c.start(true);
    expect(third.onReady.mock.calls[0]?.[1]).toBe("own");
    expect(network.requested).toHaveLength(3);
    a.dispose();
    b.dispose();
    c.dispose();
  });

  it("recovers a failed widget by its own press, from the memo, after the other widget already succeeded", async () => {
    const network = stubNetwork(2);
    const first = spies();
    const second = spies();
    const a = createTokenizerDownload("gpt2", "/", first);
    const b = createTokenizerDownload("gpt2", "/", second);
    await Promise.all([a.start(false), b.start(false)]);
    await a.start(true);
    expect(network.requested).toHaveLength(2);
    expect(second.onFailed).toHaveBeenCalledTimes(1);
    network.heal();
    // Only the second widget presses Try again; the first one is cleared silently.
    await b.start(true);
    expect(second.onReady).toHaveBeenCalledTimes(1);
    expect(second.onReady.mock.calls[0]?.[1]).toBe("own");
    expect(first.onReady).toHaveBeenCalledTimes(1);
    expect(first.onReady.mock.calls[0]?.[1]).toBe("other");
    expect(network.requested).toHaveLength(3);
    a.dispose();
    b.dispose();
  });

  it("does not tell an idle widget or a widget that is loading its own attempt about another widget's success", async () => {
    const network = stubNetwork(1);
    const idle = spies();
    const pressed = spies();
    const loading = spies();
    const idleDownload = createTokenizerDownload("gpt2", "/", idle);
    const pressedDownload = createTokenizerDownload("gpt2", "/", pressed);
    const loadingDownload = createTokenizerDownload("gpt2", "/", loading);
    await Promise.all([pressedDownload.start(false), loadingDownload.start(false)]);

    // Both retry together: the second shares the first one's request and is "loading" when the signal fires.
    await Promise.all([pressedDownload.start(true), loadingDownload.start(true)]);

    expect(idle.onLoading).not.toHaveBeenCalled();
    expect(idle.onReady).not.toHaveBeenCalled();
    expect(idle.onFailed).not.toHaveBeenCalled();
    expect(pressed.onReady).toHaveBeenCalledTimes(1);
    expect(pressed.onReady.mock.calls[0]?.[1]).toBe("own");
    expect(loading.onReady).toHaveBeenCalledTimes(1);
    expect(loading.onReady.mock.calls[0]?.[1]).toBe("own");
    expect(network.requested).toHaveLength(2);

    // A later start of a ready widget is served from the memo and is its own result again, never "other".
    await pressedDownload.start(true);
    expect(pressed.onReady.mock.calls.map((call) => call[1])).toEqual(["own", "own"]);
    expect(network.requested).toHaveLength(2);
    for (const download of [idleDownload, pressedDownload, loadingDownload]) download.dispose();
  });

  it("reports onFailed(false) for the first start and onFailed(true) only for a reader retry", async () => {
    stubNetwork(2);
    const handlers = spies();
    const download = createTokenizerDownload("gpt2", "/", handlers);
    await download.start(false);
    expect(handlers.onFailed).toHaveBeenLastCalledWith(false);
    await download.start(true);
    expect(handlers.onFailed).toHaveBeenLastCalledWith(true);
    expect(handlers.onFailed).toHaveBeenCalledTimes(2);
    download.dispose();
  });

  it("goes quiet after dispose: no call from its own result, from another widget's success, or from a late result", async () => {
    const network = stubNetwork(1);
    const disposed = spies();
    const lateDisposed = spies();
    const other = spies();
    const a = createTokenizerDownload("gpt2", "/", disposed);
    const b = createTokenizerDownload("gpt2", "/", other);
    const c = createTokenizerDownload("gpt2", "/", lateDisposed);
    await Promise.all([a.start(false), b.start(false)]);
    expect(disposed.onFailed).toHaveBeenCalledTimes(1);

    // Disposed while failed: another widget's success does not reach it.
    a.dispose();
    await b.start(true);
    expect(other.onReady).toHaveBeenCalledTimes(1);
    expect(disposed.onReady).not.toHaveBeenCalled();

    // Disposed while its own attempt is in flight: the result is dropped. A disposed start does nothing.
    const pending = c.start(false);
    c.dispose();
    await pending;
    await c.start(true);
    expect(lateDisposed.onReady).not.toHaveBeenCalled();
    expect(lateDisposed.onFailed).not.toHaveBeenCalled();
    expect(lateDisposed.onLoading).toHaveBeenCalledTimes(1);
    expect(network.requested).toHaveLength(2);
    b.dispose();
  });

  it("does not clear a widget that uses another base", async () => {
    // The root base fails; the sub-path base succeeds. Stub per URL.
    const requested: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      requested.push(url);
      if (!url.startsWith("/repo/")) throw new TypeError("network error");
      return new Response(readFileSync("public/tokenizers/gpt2.json", "utf8"), { status: 200 });
    });
    const root = spies();
    const sub = spies();
    const rootDownload = createTokenizerDownload("gpt2", "/", root);
    const subDownload = createTokenizerDownload("gpt2", "/repo/", sub);
    await rootDownload.start(false);
    expect(root.onFailed).toHaveBeenCalledTimes(1);
    await subDownload.start(false);
    expect(sub.onReady).toHaveBeenCalledTimes(1);
    expect(root.onReady).not.toHaveBeenCalled();
    expect(root.onFailed).toHaveBeenCalledTimes(1);
    rootDownload.dispose();
    subDownload.dispose();
  });
});

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadTokenizer, onTokenizerLoaded, resetTokenizerCache, tokenizerUrl } from "./loadTokenizer.ts";

const FILES: Record<string, string> = {
  "gpt2.json": "public/tokenizers/gpt2.json",
  "bert-uncased.json": "public/tokenizers/bert-uncased.json",
};

/** A stand-in for the browser's network function that serves the committed files and records the URLs. */
function stubNetwork(status = 200): string[] {
  const requested: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    requested.push(url);
    const name = url.split("/").pop() as string;
    const path = FILES[name];
    const body = path === undefined ? "{}" : readFileSync(path, "utf8");
    return new Response(status === 200 ? body : "not found", { status });
  });
  return requested;
}

/** Like stubNetwork, but the first `failures` requests fail with a network error before the file is served. */
function stubFlakyNetwork(failures: number): string[] {
  const requested: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    requested.push(url);
    if (requested.length <= failures) throw new TypeError("network error");
    const name = url.split("/").pop() as string;
    return new Response(readFileSync(FILES[name] as string, "utf8"), { status: 200 });
  });
  return requested;
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetTokenizerCache();
});

describe("loadTokenizer", () => {
  it("requests the file under the root base and under a sub-path base", async () => {
    const requested = stubNetwork();
    await loadTokenizer("gpt2", "/");
    await loadTokenizer("bert", "/");
    await loadTokenizer("gpt2", "/base-check/");
    await loadTokenizer("bert", "/base-check/");
    expect(requested).toEqual([
      "/tokenizers/gpt2.json",
      "/tokenizers/bert-uncased.json",
      "/base-check/tokenizers/gpt2.json",
      "/base-check/tokenizers/bert-uncased.json",
    ]);
  });

  it("builds the address from the base without touching the network", () => {
    expect(tokenizerUrl("gpt2", "/repo/")).toBe("/repo/tokenizers/gpt2.json");
    expect(tokenizerUrl("bert", "/")).toBe("/tokenizers/bert-uncased.json");
  });

  it("returns tokenizers that cut text", async () => {
    stubNetwork();
    const gpt2 = await loadTokenizer("gpt2", "/");
    const bert = await loadTokenizer("bert", "/");
    expect(gpt2.id).toBe("gpt2");
    expect(bert.id).toBe("bert");
    expect(gpt2.tokenize("Hello").length).toBeGreaterThan(0);
    expect(bert.tokenize("Hello").length).toBeGreaterThan(0);
  });

  it("rejects with an Error that names the status when the file is not found", async () => {
    stubNetwork(404);
    await expect(loadTokenizer("gpt2", "/")).rejects.toThrow(/404/);
    await expect(loadTokenizer("bert", "/base-check/")).rejects.toBeInstanceOf(Error);
  });
});

describe("loadTokenizer memo (D-08)", () => {
  it("makes one request and returns one object for two concurrent calls with the same base and id", async () => {
    const requested = stubNetwork();
    const [first, second] = await Promise.all([loadTokenizer("gpt2", "/"), loadTokenizer("gpt2", "/")]);
    expect(requested).toEqual(["/tokenizers/gpt2.json"]);
    expect(second).toBe(first);
  });

  it("makes no new request after a success and returns the same object", async () => {
    const requested = stubNetwork();
    const first = await loadTokenizer("gpt2", "/");
    const again = await loadTokenizer("gpt2", "/");
    expect(requested).toHaveLength(1);
    expect(again).toBe(first);
  });

  it("keeps a separate entry for each id and each base", async () => {
    const requested = stubNetwork();
    const rootGpt2 = await loadTokenizer("gpt2", "/");
    const rootBert = await loadTokenizer("bert", "/");
    const subGpt2 = await loadTokenizer("gpt2", "/repo/");
    expect(requested).toEqual(["/tokenizers/gpt2.json", "/tokenizers/bert-uncased.json", "/repo/tokenizers/gpt2.json"]);
    expect(rootBert).not.toBe(rootGpt2);
    expect(subGpt2).not.toBe(rootGpt2);
  });

  it("removes a load that failed with a status, so the next call requests again and can succeed", async () => {
    stubNetwork(404);
    await expect(loadTokenizer("gpt2", "/")).rejects.toThrow(/404/);
    vi.unstubAllGlobals();
    const requested = stubNetwork();
    const loaded = await loadTokenizer("gpt2", "/");
    expect(requested).toEqual(["/tokenizers/gpt2.json"]);
    expect(loaded.tokenize("Hello").length).toBeGreaterThan(0);
  });

  it("removes a load that failed with a network error, so Try again refetches", async () => {
    const requested = stubFlakyNetwork(1);
    await expect(loadTokenizer("gpt2", "/")).rejects.toBeInstanceOf(TypeError);
    const loaded = await loadTokenizer("gpt2", "/");
    expect(requested).toHaveLength(2);
    expect(loaded.id).toBe("gpt2");
  });

  it("shares one failure between concurrent callers, then lets a later call succeed", async () => {
    const requested = stubFlakyNetwork(1);
    const results = await Promise.allSettled([loadTokenizer("gpt2", "/"), loadTokenizer("gpt2", "/")]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(requested).toHaveLength(1);
    await expect(loadTokenizer("gpt2", "/")).resolves.toBeDefined();
    expect(requested).toHaveLength(2);
  });

  it("empties the cache when resetTokenizerCache is called", async () => {
    const requested = stubNetwork();
    const first = await loadTokenizer("gpt2", "/");
    resetTokenizerCache();
    const second = await loadTokenizer("gpt2", "/");
    expect(requested).toHaveLength(2);
    expect(second).not.toBe(first);
  });
});

describe("onTokenizerLoaded (G-02.1-3)", () => {
  it("calls a listener once with the same tokenizer object the loader resolves with", async () => {
    stubNetwork();
    const listener = vi.fn();
    onTokenizerLoaded("gpt2", "/", listener);
    const loaded = await loadTokenizer("gpt2", "/");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toBe(loaded);
  });

  it("calls no listener on a failed download, then once after the later successful retry", async () => {
    stubFlakyNetwork(1);
    const listener = vi.fn();
    onTokenizerLoaded("gpt2", "/", listener);
    await expect(loadTokenizer("gpt2", "/")).rejects.toBeInstanceOf(TypeError);
    expect(listener).not.toHaveBeenCalled();
    const loaded = await loadTokenizer("gpt2", "/");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toBe(loaded);
  });

  it("does not call a listener for another id or another base", async () => {
    stubNetwork();
    const otherId = vi.fn();
    const otherBase = vi.fn();
    onTokenizerLoaded("bert", "/", otherId);
    onTokenizerLoaded("gpt2", "/repo/", otherBase);
    await loadTokenizer("gpt2", "/");
    expect(otherId).not.toHaveBeenCalled();
    expect(otherBase).not.toHaveBeenCalled();
  });

  it("stops calling after unsubscribe, and unsubscribing twice is harmless", async () => {
    stubFlakyNetwork(1);
    const listener = vi.fn();
    const keep = vi.fn();
    const unsubscribe = onTokenizerLoaded("gpt2", "/", listener);
    onTokenizerLoaded("gpt2", "/", keep);
    unsubscribe();
    expect(() => unsubscribe()).not.toThrow();
    await expect(loadTokenizer("gpt2", "/")).rejects.toBeInstanceOf(TypeError);
    await loadTokenizer("gpt2", "/");
    expect(listener).not.toHaveBeenCalled();
    expect(keep).toHaveBeenCalledTimes(1);
  });

  it("does not call the listener again for a later call served from the memo", async () => {
    const requested = stubNetwork();
    const listener = vi.fn();
    onTokenizerLoaded("gpt2", "/", listener);
    await loadTokenizer("gpt2", "/");
    await loadTokenizer("gpt2", "/");
    expect(requested).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("survives a listener that throws: the load resolves and a second listener is still called", async () => {
    stubNetwork();
    const second = vi.fn();
    onTokenizerLoaded("gpt2", "/", () => {
      throw new Error("faulty listener");
    });
    onTokenizerLoaded("gpt2", "/", second);
    const loaded = await loadTokenizer("gpt2", "/");
    expect(loaded.id).toBe("gpt2");
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("clears the listeners when resetTokenizerCache is called", async () => {
    stubNetwork();
    const listener = vi.fn();
    onTokenizerLoaded("gpt2", "/", listener);
    resetTokenizerCache();
    await loadTokenizer("gpt2", "/");
    expect(listener).not.toHaveBeenCalled();
  });
});

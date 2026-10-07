import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadTokenizer, tokenizerUrl } from "./loadTokenizer.ts";

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

afterEach(() => {
  vi.unstubAllGlobals();
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

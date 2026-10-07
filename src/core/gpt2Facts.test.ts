import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildGpt2 } from "./buildTokenizer.ts";
import { GPT2_FACT_KEYS, gpt2Facts } from "./gpt2Facts.ts";
import { sizeLabelMb } from "./tokenizerFiles.ts";

describe("gpt2Facts (numbers the post reads from the GPT-2 engine)", () => {
  it("lists exactly the two keys the post may use", () => {
    expect([...GPT2_FACT_KEYS].sort()).toEqual(["gpt2FileMb", "gpt2IdOfT"]);
  });

  it("gives gpt2IdOfT as the id GPT-2 gives the single letter t", async () => {
    const facts = await gpt2Facts();
    const gpt2 = await buildGpt2();
    const tokens = gpt2.tokenize("t");
    expect(tokens).toHaveLength(1);
    expect(facts.gpt2IdOfT).toBe((tokens[0] as { id: number }).id);
    // The id differs from the byte value of t (116) that the stepper uses.
    expect(facts.gpt2IdOfT).not.toBe(116);
  });

  it("gives gpt2FileMb as the size label of the GPT-2 gzip size in the manifest", async () => {
    const manifest = JSON.parse(readFileSync(`${process.cwd()}/public/tokenizers/manifest.json`, "utf8")) as {
      files: Array<{ id: string; gzipBytes: number }>;
    };
    const gzipBytes = (manifest.files.find((f) => f.id === "gpt2") as { gzipBytes: number }).gzipBytes;
    const facts = await gpt2Facts();
    expect(facts.gpt2FileMb).toBe(sizeLabelMb(gzipBytes));
    expect(facts.gpt2FileMb).toBe("0.5");
  });

  it("has a value for every listed key and no other key", async () => {
    const facts = await gpt2Facts();
    expect(Object.keys(facts).sort()).toEqual([...GPT2_FACT_KEYS].sort());
  });
});

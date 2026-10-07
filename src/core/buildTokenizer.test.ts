import { describe, expect, it } from "vitest";
import { buildGpt2 } from "./buildTokenizer.ts";

describe("buildGpt2 (Node-side GPT-2 helper)", () => {
  it("returns the same promise on every call, so the build happens once", () => {
    expect(buildGpt2()).toBe(buildGpt2());
  });

  it("builds a tokenizer that cuts the word hello into one token", async () => {
    const gpt2 = await buildGpt2();
    const tokens = gpt2.tokenize("hello");
    expect(tokens).toHaveLength(1);
    expect(new TextDecoder().decode((tokens[0] as { bytes: Uint8Array }).bytes)).toBe("hello");
  });
});

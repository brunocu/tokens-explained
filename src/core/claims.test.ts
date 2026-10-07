import { describe, expect, it } from "vitest";
import { buildGpt2 } from "./buildTokenizer.ts";
import { assertClaims, checkClaim, type Claim } from "./claims.ts";
import { DEFAULT_TEXT, EXAMPLES } from "./examples.ts";

// The claims are checked against the real GPT-2 tokenizer, the same one the figures are cut by.
const gpt2 = await buildGpt2();

const ALL: Claim[] = [
  "more-tokens-than-words",
  "has-word-split",
  "has-leading-space-token",
  "has-whole-common-word",
  "has-split-character",
];

const exampleText = (id: string): string => (EXAMPLES.find((e) => e.id === id) as { text: string }).text;
const emojiText = exampleText("emoji");
const rareWordText = exampleText("rare-word");

describe("checkClaim", () => {
  it("the default text has more tokens than words", () => {
    expect(checkClaim(DEFAULT_TEXT, "more-tokens-than-words", gpt2)).toBe(true);
  });
  it("the default text has a word that splits (Token + ization)", () => {
    expect(checkClaim(DEFAULT_TEXT, "has-word-split", gpt2)).toBe(true);
  });
  it("the default text has a token that holds a leading space", () => {
    expect(checkClaim(DEFAULT_TEXT, "has-leading-space-token", gpt2)).toBe(true);
  });
  it("the default text has a common word that is a single token", () => {
    expect(checkClaim(DEFAULT_TEXT, "has-whole-common-word", gpt2)).toBe(true);
  });
  it("the emoji example splits a character", () => {
    expect(checkClaim(emojiText, "has-split-character", gpt2)).toBe(true);
  });
  it.each(["", "to", "a"])("%j satisfies none of the five claims", (text) => {
    for (const claim of ALL) expect(checkClaim(text, claim, gpt2), claim).toBe(false);
  });
  it("the word hello is one GPT-2 token: a whole common word and nothing else", () => {
    expect(checkClaim("hello", "has-whole-common-word", gpt2)).toBe(true);
    expect(checkClaim("hello", "more-tokens-than-words", gpt2)).toBe(false);
    expect(checkClaim("hello", "has-word-split", gpt2)).toBe(false);
    expect(checkClaim("hello", "has-leading-space-token", gpt2)).toBe(false);
    expect(checkClaim("hello", "has-split-character", gpt2)).toBe(false);
  });
  it("the rare-word example splits a word and has more tokens than words", () => {
    expect(checkClaim(rareWordText, "has-word-split", gpt2)).toBe(true);
    expect(checkClaim(rareWordText, "more-tokens-than-words", gpt2)).toBe(true);
  });
  it("a text with a rare long word does not have every word as one token", () => {
    expect(checkClaim(rareWordText, "every-word-one-token", gpt2)).toBe(false);
  });
  it("a text of short everyday words has every word as one token", () => {
    expect(checkClaim("the cat sat on the mat", "every-word-one-token", gpt2)).toBe(true);
  });
  it("every-word-one-token needs at least one word", () => {
    expect(checkClaim("", "every-word-one-token", gpt2)).toBe(false);
    expect(checkClaim("123 456", "every-word-one-token", gpt2)).toBe(false);
  });
});

describe("assertClaims", () => {
  it("throws an error naming the failed claim", () => {
    expect(() => assertClaims("hello", ["has-split-character"], gpt2)).toThrow(/has-split-character/);
  });
  it("throws for a false claim on a GPT-2 text and quotes the text", () => {
    expect(() => assertClaims(rareWordText, ["every-word-one-token"], gpt2)).toThrow(/every-word-one-token.*floccinaucinihilipilification/);
  });
  it("names every failed claim and quotes the text", () => {
    expect(() => assertClaims("hello", ["has-split-character", "has-leading-space-token", "has-word-split"], gpt2)).toThrow(
      /has-split-character, has-leading-space-token, has-word-split.*hello/,
    );
  });
  it("does not throw for an empty claim list", () => {
    expect(() => assertClaims(DEFAULT_TEXT, [], gpt2)).not.toThrow();
  });
  it("does not throw when every claim holds", () => {
    expect(() =>
      assertClaims(DEFAULT_TEXT, ["more-tokens-than-words", "has-word-split", "has-leading-space-token", "has-whole-common-word"], gpt2),
    ).not.toThrow();
  });
});

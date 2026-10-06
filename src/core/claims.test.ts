import { describe, expect, it } from "vitest";
import { assertClaims, checkClaim, type Claim } from "./claims.ts";
import { DEFAULT_TEXT, EXAMPLES } from "./examples.ts";

const ALL: Claim[] = [
  "more-tokens-than-words",
  "has-word-split",
  "has-leading-space-token",
  "has-whole-common-word",
  "has-split-character",
];

const emojiText = (EXAMPLES.find((e) => e.id === "emoji") as { text: string }).text;

describe("checkClaim", () => {
  it("the default text has more tokens than words", () => {
    expect(checkClaim(DEFAULT_TEXT, "more-tokens-than-words")).toBe(true);
  });
  it("the default text has a word that splits", () => {
    expect(checkClaim(DEFAULT_TEXT, "has-word-split")).toBe(true);
  });
  it("the default text has a token that holds a leading space", () => {
    expect(checkClaim(DEFAULT_TEXT, "has-leading-space-token")).toBe(true);
  });
  it("the default text has a common word that is a single token", () => {
    expect(checkClaim(DEFAULT_TEXT, "has-whole-common-word")).toBe(true);
  });
  it("the emoji example splits a character", () => {
    expect(checkClaim(emojiText, "has-split-character")).toBe(true);
  });
  // The toy vocabulary is small: "hello" is three tokens (he, ll, o), so it is not a "none" case.
  it.each(["", "to", "a"])("%j satisfies none of the five claims", (text) => {
    for (const claim of ALL) expect(checkClaim(text, claim), claim).toBe(false);
  });
  it("a word the toy splits satisfies the split claims and not the others", () => {
    expect(checkClaim("hello", "more-tokens-than-words")).toBe(true);
    expect(checkClaim("hello", "has-word-split")).toBe(true);
    expect(checkClaim("hello", "has-leading-space-token")).toBe(false);
    expect(checkClaim("hello", "has-whole-common-word")).toBe(false);
    expect(checkClaim("hello", "has-split-character")).toBe(false);
  });
});

describe("assertClaims", () => {
  it("throws an error naming the failed claim", () => {
    expect(() => assertClaims("hello", ["has-split-character"])).toThrow(/has-split-character/);
  });
  it("names every failed claim and quotes the text", () => {
    expect(() => assertClaims("hello", ["has-split-character", "has-leading-space-token", "has-word-split"])).toThrow(
      /has-split-character, has-leading-space-token.*hello/,
    );
  });
  it("does not throw for an empty claim list", () => {
    expect(() => assertClaims(DEFAULT_TEXT, [])).not.toThrow();
  });
  it("does not throw when every claim holds", () => {
    expect(() =>
      assertClaims(DEFAULT_TEXT, ["more-tokens-than-words", "has-word-split", "has-leading-space-token", "has-whole-common-word"]),
    ).not.toThrow();
  });
});

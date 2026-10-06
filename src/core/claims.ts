// Build-time claims about prose examples (Pitfall 4, T-01-16). Prose never states a
// split or a count by hand; it only says things like "this sentence has more tokens
// than words", and each such statement is checked here against the shipped tokenizer.
// Pure functions, no DOM.
import { countSplitCharacters, countWords } from "./counts.ts";
import { presplit } from "./presplit.ts";
import { tokenize } from "./toy.ts";

export type Claim =
  | "more-tokens-than-words"
  | "has-word-split"
  | "has-leading-space-token"
  | "has-whole-common-word"
  | "has-split-character";

const HAS_LETTER = /\p{L}/u;
const COMMON_WORD_SHAPE = /^ ?\p{L}{3,}$/u;

/** True when the tokenizer really does what the claim says for this text. */
export function checkClaim(text: string, claim: Claim): boolean {
  switch (claim) {
    case "more-tokens-than-words":
      return tokenize(text).length > countWords(text);
    case "has-word-split":
      // Some piece of text containing a letter needs two or more tokens on its own.
      return presplit(text).some((piece) => HAS_LETTER.test(piece) && tokenize(piece).length >= 2);
    case "has-leading-space-token":
      // A single token that holds a space followed by at least one more byte.
      return tokenize(text).some((t) => t.bytes.length >= 2 && t.bytes[0] === 0x20);
    case "has-whole-common-word":
      // A word of three or more letters (with or without its leading space) that is one token.
      return presplit(text).some((piece) => COMMON_WORD_SHAPE.test(piece) && tokenize(piece).length === 1);
    case "has-split-character":
      return countSplitCharacters(text, tokenize(text)) >= 1;
    default: {
      const never: never = claim;
      throw new Error(`unknown claim ${String(never)}`);
    }
  }
}

/** Throws an Error naming every failed claim, so the Astro build fails on a false statement. */
export function assertClaims(text: string, claims: readonly Claim[]): void {
  const failed = claims.filter((claim) => !checkClaim(text, claim));
  if (failed.length > 0) {
    throw new Error(
      `Prose claim${failed.length === 1 ? "" : "s"} not true for the shipped tokenizer: ${failed.join(", ")}. Text: ${JSON.stringify(text)}`,
    );
  }
}

// Build-time claims about prose examples (Pitfall 4, T-01-16, D-11). Prose never states a
// split or a count by hand; it only says things like "this sentence has more tokens
// than words", and each such statement is checked here against the real tokenizer the
// figure is cut by (GPT-2). Pure functions, no DOM.
import { countSplitCharacters, countWords } from "./counts.ts";
import type { RealTokenizer } from "./realTokenizer.ts";

export type Claim =
  | "more-tokens-than-words"
  | "has-word-split"
  | "has-leading-space-token"
  | "has-whole-common-word"
  | "has-split-character"
  | "every-word-one-token";

/** Anything that can cut text into tokens: the real tokenizer, or a test double. */
export type ClaimTokenizer = Pick<RealTokenizer, "tokenize">;

const HAS_LETTER = /\p{L}/u;
const COMMON_WORD_SHAPE = /^ ?\p{L}{3,}$/u;
const WORD_PIECES = / ?\p{L}+/gu;

/** The words of a text as letters with an optional leading space, in order. */
function wordPieces(text: string): string[] {
  return text.match(WORD_PIECES) ?? [];
}

/** True when the tokenizer really does what the claim says for this text. */
export function checkClaim(text: string, claim: Claim, tokenizer: ClaimTokenizer): boolean {
  switch (claim) {
    case "more-tokens-than-words":
      return tokenizer.tokenize(text).length > countWords(text);
    case "has-word-split":
      // Some word of the text needs two or more tokens on its own.
      return wordPieces(text).some((piece) => HAS_LETTER.test(piece) && tokenizer.tokenize(piece).length >= 2);
    case "has-leading-space-token":
      // A single token that holds a space followed by at least one more byte.
      return tokenizer.tokenize(text).some((t) => t.bytes.length >= 2 && t.bytes[0] === 0x20);
    case "has-whole-common-word":
      // A word of three or more letters (with or without its leading space) that is one token.
      return wordPieces(text).some((piece) => COMMON_WORD_SHAPE.test(piece) && tokenizer.tokenize(piece).length === 1);
    case "has-split-character":
      return countSplitCharacters(text, tokenizer.tokenize(text)) >= 1;
    case "every-word-one-token": {
      // Every word of the text, with its leading space, is exactly one token, and there is at least one word.
      const pieces = wordPieces(text);
      return pieces.length > 0 && pieces.every((piece) => tokenizer.tokenize(piece).length === 1);
    }
    default: {
      const never: never = claim;
      throw new Error(`unknown claim ${String(never)}`);
    }
  }
}

/** Throws an Error naming every failed claim, so the Astro build fails on a false statement. */
export function assertClaims(text: string, claims: readonly Claim[], tokenizer: ClaimTokenizer): void {
  const failed = claims.filter((claim) => !checkClaim(text, claim, tokenizer));
  if (failed.length > 0) {
    throw new Error(
      `Prose claim${failed.length === 1 ? "" : "s"} not true for the shipped tokenizer: ${failed.join(", ")}. Text: ${JSON.stringify(text)}`,
    );
  }
}

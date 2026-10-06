/**
 * The pre-split rule (D-03): the single source of truth, shared by the runtime
 * tokenizer and the offline training script. GPT-2 shape, simplified to JS
 * (no possessive quantifiers): a leading space attaches to the next word.
 */
const REGEX = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

export function presplit(text: string): string[] {
  return text.match(REGEX) ?? [];
}

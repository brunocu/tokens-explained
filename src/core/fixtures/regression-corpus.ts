// Named hostile and multilingual inputs, reused by the unit suite here and by the
// browser suite in Plan 04. Every entry must survive the tokenizer byte for byte.
// Escapes are used for invisible or easily mangled characters so the file stays readable.
import { EXAMPLES } from "../examples.ts";

const example = (id: string): string => {
  const found = EXAMPLES.find((e) => e.id === id);
  if (found === undefined) throw new Error(`no example with id ${id}`);
  return found.text;
};

export const REGRESSION_CORPUS: ReadonlyArray<{ name: string; text: string }> = [
  { name: "empty", text: "" },
  { name: "ascii-sentence", text: "The quick brown fox jumps over the lazy dog." },
  { name: "leading-space", text: " hello" },
  { name: "emoji-example", text: example("emoji") },
  // man, zero-width joiner, woman, zero-width joiner, girl
  { name: "zwj-family", text: "\u{1F468}‍\u{1F469}‍\u{1F467}" },
  // two regional indicator symbols: the flag of Japan
  { name: "flag", text: "\u{1F1EF}\u{1F1F5}" },
  { name: "cafe-precomposed", text: "café" },
  { name: "cafe-decomposed", text: "café" },
  { name: "japanese", text: "日本語" },
  { name: "chinese", text: "你好，世界" },
  { name: "devanagari", text: "नमस्ते" },
  { name: "arabic-rtl", text: "مرحبا" },
  { name: "hebrew-rtl", text: "שלום" },
  { name: "numbers-dates", text: example("numbers-dates") },
  { name: "long-whitespace", text: `${" ".repeat(40)}\n\t` },
  { name: "crlf", text: "a\r\nb" },
  { name: "control-chars", text: "\u0000\u0007\u001F\u007F" },
  { name: "bom", text: "﻿hello" },
  // an unpaired high surrogate: not valid text, encoded by the browser as EF BF BD
  { name: "lone-surrogate", text: "\uD83D" },
  { name: "zero-width", text: "a​b" },
  { name: "special-token-string", text: "<|endoftext|>" },
  { name: "long-word", text: example("rare-word") },
];

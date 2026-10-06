// Default text and the five example chips (D-07 as amended by R-01).
// src/core/toy.golden.test.ts checks the default text against the trained merge list.
export const DEFAULT_TEXT =
  "Tokenization splits unusual words into pieces, but common words stay whole.";

export const LIMIT = 1000;

export const EXAMPLES: ReadonlyArray<{ id: string; label: string; text: string }> = [
  {
    id: "rare-word",
    label: "A rare long word",
    text: "The word floccinaucinihilipilification is almost never used.",
  },
  {
    id: "numbers-dates",
    label: "Numbers and dates",
    text: "On 2026-10-03 I paid $1,234.56 for 3 tickets.",
  },
  {
    id: "emoji",
    label: "An emoji",
    text: "Great job \u{1F389} see you soon \u{1F642}",
  },
  {
    id: "literature",
    label: "A line of classic literature",
    text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
  },
  {
    id: "non-english",
    label: "A non-English line",
    text: "男女 こんにちは",
  },
];

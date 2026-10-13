// Default text and the five example chips (D-07 as amended by R-01).
// src/core/realTokenizer.test.ts (the adapter parity golden) checks the default text and the
// examples against real GPT-2 output.
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
    label: "Anna Karenina",
    // Opening line of Anna Karenina, translated by Constance Garnett (Project Gutenberg ebook 1399,
    // public domain). The post credits the translator in its References.
    text: "Happy families are all alike; every unhappy family is unhappy in its own way.",
  },
  {
    id: "non-english",
    label: "A non-English line",
    text: "長男は昨年、第一志望の国立大学に合格した。",
  },
];

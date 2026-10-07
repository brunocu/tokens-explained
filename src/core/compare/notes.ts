// The hand-written "What to notice" notes (D-13, TOK-09). Each was written by reading the
// splits in comparison.json, not from assumption, and says only what those rows show. They
// contain no figures on purpose: a count in prose would go stale when the fixture is
// regenerated (RESEARCH Pitfall 7); the counts are on the page next to the rows. They talk
// about where the cuts fall, never about one tokenizer being better.
//
// They compare GPT-2 with BERT only (D-01).
// Keyed by the id of each entry in src/core/examples.ts. notes.test.ts keeps them honest.

export const NOTES: Readonly<Record<string, string>> = {
  "rare-word":
    "Each tokenizer cuts the long word in different places. BERT puts ## in front of every piece that continues a word.",
  "numbers-dates":
    "GPT-2 and BERT both mostly keep short runs of digits together. BERT also drops the spaces and writes everything in lower case.",
  emoji:
    "GPT-2 cuts the first emoji into raw byte pieces but has a single piece for the second. BERT has no piece for either emoji and shows [UNK] instead.",
  literature:
    "Each word is a single piece for both GPT-2 and BERT. GPT-2 keeps the capital letter and the space that comes with each word, while BERT lower-cases and ignores spaces.",
  "non-english":
    "GPT-2 has whole pieces for some of these characters and byte pieces for the others, while BERT has a piece for every one.",
};

/** The note under the six-language table. */
export const LANGUAGES_NOTE =
  "The same meaning needs very different numbers of pieces depending on the language and the tokenizer. BERT's count for Chinese looks low only because many of those characters became [UNK].";

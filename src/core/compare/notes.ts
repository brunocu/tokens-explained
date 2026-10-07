// The hand-written "What to notice" notes (D-13, TOK-09). Each was written by reading the
// splits in comparison.json, not from assumption, and says only what those rows show. They
// contain no figures on purpose: a count in prose would go stale when the fixture is
// regenerated (RESEARCH Pitfall 7); the counts are on the page next to the rows. They talk
// about where the cuts fall, never about one tokenizer being better.
//
// Keyed by the id of each entry in src/core/examples.ts. notes.test.ts keeps them honest.

export const NOTES: Readonly<Record<string, string>> = {
  "rare-word":
    "Each tokenizer cuts the long word in different places. BERT puts ## in front of every piece that continues a word.",
  "numbers-dates":
    "The toy tokenizer cuts most digits one at a time, while GPT-2 and BERT mostly keep short runs of digits together. BERT also drops the spaces and writes everything in lower case.",
  emoji:
    "The toy tokenizer cuts both emoji into raw byte pieces, and GPT-2 does the same for the first one, though it has a single piece for the second. BERT has no piece for either emoji and shows [UNK] instead.",
  literature:
    "Each word is a single piece for GPT-2 and BERT. The toy tokenizer learned from far less text, so it cuts many of the same words into smaller pieces.",
  "non-english":
    "The toy tokenizer has no piece for these characters and falls back to raw byte pieces. GPT-2 has whole pieces for a few of them and byte pieces for the rest, while BERT has a piece for every one.",
};

/** The note under the six-language table. */
export const LANGUAGES_NOTE =
  "The same meaning needs very different numbers of pieces depending on the language and the tokenizer. The toy tokenizer, which learned only English, spends the most on other scripts, and BERT's count for Chinese looks low only because many of those characters became [UNK].";

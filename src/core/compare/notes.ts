// The hand-written "What to notice" note of the languages widget (D-13, TOK-09). It contains no
// figures on purpose: a count in prose would go stale when the fixture is regenerated (RESEARCH
// Pitfall 7); the counts are on the page next to the rows. It talks about where the cuts fall, never
// about one tokenizer being better. notes.test.ts keeps it honest. The comparison's note is plain
// text in Comparison.svelte.

/** The note under the six-language table. */
export const LANGUAGES_NOTE =
  "The same meaning needs very different numbers of pieces depending on the language and the tokenizer. BERT's count for Chinese looks low only because many of those characters became [UNK].";

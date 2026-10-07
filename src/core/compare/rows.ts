// Names and one-line descriptions of the three rows of the comparison (D-13, TOK-09: every
// tokenizer is named with its year). Pure data. The years are those of the original GPT-2 and
// BERT releases and are re-checked in Phase 5. The toy has no year: it is this site's own.

export type TokenizerRow = { id: "toy" | "gpt2" | "bert"; name: string; subline: string };

export const TOKENIZER_ROWS: ReadonlyArray<TokenizerRow> = [
  {
    id: "toy",
    name: "Toy tokenizer (from the playground)",
    subline: "Small, trained on a little English text. Works on bytes.",
  },
  {
    id: "gpt2",
    name: "GPT-2 (2019)",
    subline: "Works on bytes like the toy, with a far bigger vocabulary.",
  },
  {
    id: "bert",
    name: "BERT, uncased (2018)",
    subline:
      "A different method, called WordPiece. It lower-cases text, removes accents, ignores spaces, and marks a piece that continues a word with ##.",
  },
];

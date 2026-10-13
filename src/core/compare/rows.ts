// Names of the two rows of the comparison (D-01, D-13, TOK-09: every tokenizer is named with its
// year). Pure data. The years are those of the original GPT-2 and BERT releases and are re-checked
// in Phase 5.

export type TokenizerRow = { id: "gpt2" | "bert"; name: string };

export const TOKENIZER_ROWS: ReadonlyArray<TokenizerRow> = [
  { id: "gpt2", name: "GPT-2 (2019)" },
  { id: "bert", name: "BERT, uncased (2018)" },
];

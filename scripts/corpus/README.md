# Training corpus for the toy tokenizer

The toy tokenizer's merge list (`src/core/toy/merges.json`) is trained offline from two files in this folder. Only the derived merge list ships to readers; the corpus files are never served.

## Source

- Title: Alice's Adventures in Wonderland
- Author: Lewis Carroll (public domain)
- Project Gutenberg ebook number: 11
- URL: https://www.gutenberg.org/cache/epub/11/pg11.txt (fallback: https://www.gutenberg.org/files/11/11-0.txt)

Retrieved: 2026-10-03

## Processing (scripts/prepare-corpus.ts)

1. Keep only the text between the ebook's START and END marker lines.
2. Normalise to ASCII: curly single quotes become an apostrophe, curly double quotes a straight double quote, en and em dashes a hyphen, the ellipsis three dots, the no-break space a space, and every other non-ASCII character is removed. CRLF becomes LF.
3. Drop the title block (everything before "CHAPTER I.") and every remaining line that mentions the distributor's name.
4. Write `alice.txt`.

`supplement.txt` is original text written by the project author: dates, prices, times, quantities, a few contractions and everyday words about tokens. Without digits in the corpus every digit would be its own token. It deliberately contains none of the example texts or the default sentence used by the playground, so those stay genuinely unseen text (asserted by `src/core/toy.golden.test.ts`).

## SHA-256

- `alice.txt`: 23a9e65aac43a1ec6a6855a93feec515c7d01687af710ac8cdb20828c7f55e65
- `supplement.txt`: 619a01e6b039a57bdd0362776ee43cb47667576a69c934dba5c87ca66f430926

If either file changes, retrain with `npm run train:toy` and update these hashes. The same hashes are recorded in the `meta.corpus` field of `merges.json`, and `npm run train:toy -- --check` proves the committed merge list is exactly what the trainer produces from these files.

## Licence note

The source text is in the public domain. Only the derived merge list (pairs of numbers) ships to readers. The distributor's name and licence header are removed from `alice.txt` (asserted by the golden test). The supplement is original text by the project author.

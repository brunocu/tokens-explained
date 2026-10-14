# Phase 3 fact check of Post 1 ("What is a token?")

**Re-opened:** 2026-10-13 (written "Oct. 13, 2026" in the post's References list). **Plan:** 03-03, Task 1. **Decisions:** D-18 (re-open every source), D-19 as amended (dates stay in the References list, none inline), D-20 (no new split test).

**How the pass was run.** The executor was itself a subagent with Bash only, so it did not spawn research agents. Every URL was fetched with `curl` (final HTTP status recorded). Papers and PDFs were converted with `pdftotext` and the quoted sentences, figures and page numbers were read from the text. Numbers and quotes were checked against a second independent source where one exists (Crossref, ACM Digital Library and CiNii listings, Wikipedia, the Hugging Face API, the GitHub API, the raw tiktoken files). Nothing in `src/` or `public/` was edited by this task; the corrections are applied in Task 2.

## Exceptions for the author

Only changed, dead or doubtful items. There are no dead links. "Applied" means Task 2 edits the post; "left as is" means the post keeps its wording and the reason is given.

| # | Kind | Where | Finding | Action |
|---|------|-------|---------|--------|
| E1 | changed | Reference 18 (Gowda and May) | The post prints "pp. 2650-2661". The ACL Anthology page and the PDF header both give pages 3955-3964. | Applied: pages corrected to 3955-3964. |
| E2 | changed | Reference 17 (subword-nmt `learn_bpe.py`) | The post says "lines 373-378". The file on master (last changed by commit `03caef2`, 2024-07-24) has the tie-breaking line `most_frequent = max(stats, key=lambda x: (stats[x], x))` at lines 335 and 341; the file is only 406 lines long. The behaviour the post describes (highest count, then the pair that sorts last as text) is correct. | Applied: reference now says "lines 335 and 341 (commit 03caef2)". The comment in `post-content.test.ts` that repeats the old line numbers is updated too. |
| E3 | changed | "A real tokenizer: GPT-2", vocabulary sizes | The post says GPT-4 has 100,257. In `tiktoken_ext/openai_public.py` 100,257 is the id of the end-of-text token, the first special token, not a size. cl100k has 100,256 ordinary tokens (ids 0 to 100255, hash verified) plus special tokens at 100257 to 100260 and 100276, so its highest id is 100276 and the library's own size (`max_token_value + 1`, called `n_vocab`) is 100,277. The other two figures follow that rule (GPT-2: 50256 + 1 = 50,257; GPT-4o: 200018 + 1 = 200,019), so 100,257 was inconsistent with the post's own 200,019. | Applied: 100,257 becomes 100,277, and one sentence states the rule ("highest id plus one", which matches the post's own "ids start at 0" paragraph). The cited-number rule in the content test is updated to the new figure. |
| E4 | doubtful, left as is | Section "How does a computer store text?", cite 1 | "plus a few control codes such as line ends and carriage returns [1]". The ETHW page says only "some control codes that originated with Teletype machines" and does not name line ends or carriage returns. The statement is true of ASCII (line feed and carriage return are control codes), but it is beyond the cited page. | Left as is: true and helpful to a lay reader. Author may cut "such as line ends and carriage returns" if citing strictly. |
| E5 | doubtful, left as is | Same section, cite 2 | "Languages such as Japanese and Chinese, with thousands of characters, needed several bytes ... [2]". The Mojibake article supports several separate encodings for Japanese and Chinese and multi-byte encodings ("typically two" bytes); it does not say "thousands of characters". | Left as is: the size of the Han character set is general knowledge and the rest is supported. Author may cut "with thousands of characters,". |
| E6 | changed | Section "Why not cut words into meaningful parts?", cite 11 | The post says guidelines written to work for any language "need details that are specific to each language". The LREC abstract says the guidelines "were designed to be language-independent, but included language-specific morphological paradigms and other specifications". "Need" claims more than "included". | Applied: "need" becomes "include". |
| E7 | doubtful, manual | Languages table, UN reuse terms | The general United Nations terms of use (un.org, re-read today) still allow only "personal, non-commercial use, without any right to resell or redistribute", with "more specific restrictions" possible. The OHCHR page that asks reproductions to link the source (translation-project page) returns 403 to scripts and could not be re-read. The widget reproduces the whole of Article 1 in six languages and links that OHCHR page. | Not changed. Author to re-read the OHCHR page by hand (see Manual-only) and decide whether the attribution link is enough. The six sentences themselves still match un.org exactly (below). |

Nothing else needs the author. Items 4.5 (non-English claim) and 2 (wider parity cases) from the Phase 2.1 hand-off are unchanged: the post still omits a non-English claim, and the parity fixture stays at 28 cases; the spot-check below found no difference.

## References 1 to 26

"Access date" is the value for the `accessed` attribute in the References list (Task 2). Entries that never had an access date (scholarly articles with a DOI or an archive address) get none.

| n | URL | status | claims checked | verdict | note | access date |
|---|-----|--------|----------------|---------|------|-------------|
| 1 | ethw.org Milestones: ASCII, 1963 | 200 | first edition published 1963 by the American Standards Association X3.2 subcommittee; 128 characters; control codes | ok | Page names control codes "that originated with Teletype machines", not line ends or carriage returns (E4). | Oct. 13, 2026 |
| 2 | en.wikipedia.org/wiki/Mojibake | 200 | garbled text from decoding with the wrong encoding; several historical encodings for Japanese; Chinese has its own mismatches | ok | "thousands of characters" is not on the page (E5). | Oct. 13, 2026 |
| 3 | unicode.org/history/earlyyears.html | 200 | project began in late 1987 with an Apple engineer and two Xerox engineers; aim of a "unique, universal, and uniform character encoding" | ok | | Oct. 13, 2026 |
| 4 | rfc-editor.org/info/rfc3629 | 200 | UTF-8 uses 1 to 4 octets; ASCII preserved; Yergeau, Nov. 2003 | ok | Redirects to a trailing-slash URL. | none (no date printed) |
| 5 | w3techs.com character encodings | 200 | share of UTF-8 | ok | Page reads "UTF-8 is used by 99.1% of all the websites whose character encoding we know", dated 13 October 2026. "over 99%" holds. | Oct. 13, 2026 |
| 6 | gutenberg.org/ebooks/1399 | 200 | Anna Karenina, Tolstoy, translator Constance Garnett; copyright status; opening line | ok | Plain-text ebook has "Happy families are all alike; every unhappy family is unhappy in its / own way." Public domain in the USA. | Oct. 13, 2026 |
| 7 | web.stanford.edu/~jurafsky/slp3 | 200 | draft of Aug. 19, 2026 is still the current release; chapters 1 "Introduction" and 2 "Words and Tokens"; goal of NLP; definition of a language model; BPE with k merges gives the original characters plus k new symbols | ok | Chapter PDFs read: ch. 1 "getting computers to help people by performing useful tasks involving human language"; "predict the next word from previous words"; ch. 2 sec. 2.4.1 "k merges ... original set of characters plus k new symbols". | Oct. 13, 2026 |
| 8 | aclanthology.org/2022.tacl-1.17 | 200 | byte or character sequences are longer than token sequences; TACL vol. 10, pp. 291-306, 2022 | ok | | none |
| 9 | unicode.org/reports/tr29 | 200 | revision 49, Unicode 18.0.0, dated 2026-09-01; word boundaries for Thai, Lao, Chinese, Japanese need dictionary lookup or other mechanisms | ok | Still the current version. | Oct. 13, 2026 |
| 10 | aclanthology.org/C00-1001 | 200 | Basque noun: "a minimum of 135 inflected forms"; "amarengan" = ama + aren + gan, "on the mother"; agglutinative languages | ok | Read from the PDF. COLING 2000 vol. 1. | none |
| 11 | aclanthology.org/2020.lrec-1.493 | 200 | annotation guidelines for any language, with language-specific parts | changed | Wording of the post tightened (E6). | none |
| 12 | arxiv.org/abs/2010.02804 | 200 | for the two real low-resource languages the best model reached 37.4% (Popoluca) and 28.4% (Tepehua), under half; submitted 6 Oct 2020 | ok | | none |
| 13 | doi.org/10.1145/1187415.1187418 | 403 (lands on dl.acm.org) | title, journal, volume 4 issue 1, Jan. 2007, article 3; the abstract claim (unsupervised induction of a simple morphology from raw text) | manual-only | The ACM page blocks scripts. Crossref returns the title, ACM TSLP, vol. 4, issue 1, Jan. 2007 and the same abstract; an indexed copy prints "Vol. 4, No. 1, Article 3, Publication date: January 2007". Only the ACM landing page itself is unopened. | none |
| 14 | jacobfilipp.com Dr. Dobb's archive of Gage 1994 | 200 | replaces the most frequent pair of adjacent bytes with a byte not in the original data | ok | The archive page prints only "February 1994". Vol. 12, issue 2, pp. 23-38, 1 Feb 1994 confirmed by the ACM Digital Library and CiNii listings (search summaries). | none |
| 15 | aclanthology.org/P16-1162 | 200 | final vocabulary = initial vocabulary plus merges, "the only hyperparameter"; subword models beat a back-off dictionary by up to 1.1 and 1.3 BLEU; pp. 1715-1725; DOI | ok | Read from the PDF. | none |
| 16 | aclanthology.org/2020.findings-emnlp.414 | 200 | title; unigram LM units align more closely with morphology than BPE; pp. 4617-4624 | ok | | none |
| 17 | github.com/rsennrich/subword-nmt `learn_bpe.py` | 200 | tie rule `max(stats, key=lambda x: (stats[x], x))` | changed | Behaviour correct; line numbers were wrong (E2). | Oct. 13, 2026 |
| 18 | aclanthology.org/2020.findings-emnlp.352 | 200 | more BPE merges shorten sequences but increase class imbalance (rare types); pages | changed | Pages 3955-3964, not 2650-2661 (E1). | none |
| 19 | arxiv.org/abs/2407.13623 | 200 | optimal vocabulary size depends on the compute budget, larger models need larger vocabularies; NeurIPS 2024 (Crossref: Advances in Neural Information Processing Systems 37) | ok | | none |
| 20 | cdn.openai.com GPT-2 paper (PDF) | 200 | "The vocabulary is expanded to 50,257"; byte-level BPE needs a base vocabulary of 256; trained on WebText, millions of web pages | ok | PDF carries no printed date; the 2019 release is confirmed by Wikipedia (14 February 2019), the GPT-2 repository (created 2019-02-11) and the licence line "Copyright (c) 2019 OpenAI". The OpenAI blog page returns 403 to scripts. | Oct. 13, 2026 |
| 21 | ojs.aaai.org article 6451 | 200 | byte-level BPE "has no out-of-vocabulary tokens"; AAAI vol. 34 no. 5, pp. 9154-9160 (Crossref) | ok | Page is served compressed; read with `--compressed`. | none |
| 22 | github.com/openai/tiktoken `openai_public.py` | 200 | GPT-2 `explicit_n_vocab` 50257; cl100k and o200k special tokens; digit rules `\p{N}` (GPT-2) and `\p{N}{1,3}` (cl100k) | changed | Figures and digit claim re-derived from the raw file at main (last commit 2026-08-17). The GPT-4 size in the post did not match the file (E3). | Oct. 13, 2026 |
| 23 | github.com/openai/tiktoken `model.py` | 200 | gpt-4 maps to cl100k_base, gpt-4o to o200k_base | ok | The file now also maps gpt-5 and the o-series to o200k_base; no effect on the post. | Oct. 13, 2026 |
| 24 | github.com/openai/gpt-2 LICENSE | 200 | "Modified MIT License", "Software Copyright (c) 2019 OpenAI" | ok | Text identical to the block in `public/tokenizers/NOTICE.md` (compared as strings). "permissive licence" holds. | Oct. 13, 2026 |
| 25 | huggingface.co LLM course ch. 6 WordPiece | 200 | WordPiece starts from an alphabet; a word not buildable from the vocabulary becomes "[UNK]" as a whole ("mug" and "bum" examples) | ok | | Oct. 13, 2026 |
| 26 | huggingface.co BERT docs | 200 | tokenizer is "Based on WordPiece"; unknown token defaults to "[UNK]"; read-more link only | ok | | Oct. 13, 2026 |

## Tokenizer facts

| Item | Result (2026-10-13) | Compared with | Verdict |
|------|---------------------|---------------|---------|
| Hugging Face `openai-community/gpt2` | licence `mit`; commit `607a30d783dfa663caf39e06633721c8d4cfcd7e`; last modified 2024-02-19; not gated; the `tokenizer.json` at that commit has sha256 `8414cab9...78a6` | `manifest.json`: licence MIT, same commit, same sha256; the file in `public/tokenizers/` hashes to the same value | ok, manifest unchanged |
| Hugging Face `google-bert/bert-base-uncased` | licence `apache-2.0`; commit `86b5e0934494bd15c9632b12f734a8a67f723594`; last modified 2024-02-19; sha256 of `tokenizer.json` `ce64fce7...9a98` | `manifest.json`: Apache-2.0, same commit, same sha256; the local file hashes to the same value | ok, manifest unchanged |
| Upstream `openai/gpt-2` LICENSE | "Modified MIT License", "Software Copyright (c) 2019 OpenAI"; text identical to the block in NOTICE.md; GitHub API reports `NOASSERTION` (non-standard text); the repository is archived (last push 2024-08-14) | `NOTICE.md` | ok; text kept as is |
| Upstream `google-research/bert` | GitHub API: Apache-2.0; the repository is archived (read-only; last commit 2020-03-11, last push 2024-07-23); its LICENSE is identical to the block in NOTICE.md except for one leading blank line | `NOTICE.md` (which quotes the Hugging Face copy) | confirmed upstream; NOTICE.md gets a dated line and a half-sentence about the archive (Task 2) |
| Year printed for GPT-2 ("GPT-2 (2019)") | 14 Feb. 2019 release (Wikipedia), repository created 2019-02-11, licence year 2019 | `src/core/compare/rows.ts` | ok |
| Year printed for BERT ("BERT, uncased (2018)") | arXiv 1810.04805 v1 submitted 11 Oct 2018 | `rows.ts` | ok |
| "BERT, a model of about the same age" | 2018 against 2019 | post text | ok |

## Numbers

Computed from the raw files at `tiktoken` main (read 2026-10-13). The rank files were downloaded from the addresses in `openai_public.py` and their sha256 values equal the `expected_hash` values in that file. The library defines a tokenizer's size as `max_token_value + 1` (`n_vocab`, and the check behind `explicit_n_vocab`); in `core.py` the docstring says "Prefer to use `enc.max_token_value + 1`".

| Tokenizer | Ordinary tokens (ids) | Special tokens (ids) | Highest id | Highest id plus one | Post says |
|-----------|-----------------------|----------------------|-----------|---------------------|-----------|
| GPT-2 (`gpt2`, same as `r50k_base`) | 50,256 (0 to 50255) | end-of-text token 50256 | 50256 | **50,257**, equal to `explicit_n_vocab` and to the GPT-2 paper ("The vocabulary is expanded to 50,257") | 50,257: accurate |
| GPT-4 (`cl100k_base`) | 100,256 (0 to 100255) | 100257 to 100260 and 100276 | 100276 | **100,277** (16 ids unused: 100256 and 100261 to 100275) | 100,257: not accurate. 100,257 is only the id of `<|endoftext|>`. Corrected to 100,277 (E3). |
| GPT-4o (`o200k_base`) | 199,998 (0 to 199997) | end-of-text token 199999, end-of-prompt token 200018 | 200018 | **200,019** (19 ids unused: 199998 and 200000 to 200017) | 200,019: accurate |

If the post instead counted entries that exist, the figures would be 50,257, 100,261 and 200,000; the post uses the highest-id-plus-one rule for GPT-2 and GPT-4o, so GPT-4 now uses it too and the post states the rule in one sentence. `model.py` maps `gpt-4` to `cl100k_base` and `gpt-4o` to `o200k_base`, so "the tokenizer of GPT-4" and "of GPT-4o" are the right names.

Digit grouping: the pattern in the file for GPT-2 (`r50k_pat_str`, ` ?\p{N}++`) keeps a whole run of digits together; the `cl100k_base` pattern has `\p{N}{1,3}+`, so a run is cut into groups of up to three. The post's sentence is accurate.

## Other sourced facts

| Fact | Result (2026-10-13) | Verdict |
|------|---------------------|---------|
| W3Techs UTF-8 share | 99.1% of websites with a known encoding (page dated 13 October 2026); ISO-8859-1 0.8% | ok, "over 99%" holds |
| Wikipedia Mojibake, East Asian encodings | Japanese has had several encodings; Chinese has its own; multi-byte (typically two) | ok (E5 note) |
| ASCII 1963, 128 characters | confirmed by ETHW and by the same page's ASCII text | ok (E4 note) |
| Gutenberg ebook 1399 | Anna Karenina, Leo Tolstoy, translator Constance Garnett, public domain in the USA; opening line matches the post and `examples.ts` | ok |
| UN Article 1 sentences (six languages) | each stored sentence is found verbatim (NFC) in the page at `https://www.un.org/<lang>/about-us/universal-declaration-of-human-rights` | ok |
| OHCHR PDFs (en, es, fr, ru, zh) | all five open (200) today; English, Spanish, French and Russian sentences found verbatim; the Chinese PDF text uses ASCII commas where the stored text (matching un.org) uses full-width commas, which is how that PDF's text layer extracts | ok |
| OHCHR translation-project page | 403 to scripts; no archive copy | manual-only |
| Wiktionary 男 entry (the one inline link) | 200 | ok |

## Re-run of the existing tests and spot-check (D-20)

- `npx vitest run` in the Nix shell before any edit: 18 files, 813 tests, all passed. No new test was added.
- Spot-check of quoted splits and counts in the **built page** against the Rust reference output stored in `src/core/fixtures/adapter-parity.json` (generated with `tokenizers==0.23.2`): the six sentences of the comparison widget (rare word, date and price, emoji, Garnett line, Japanese, default text) give identical id lists for GPT-2 and BERT (12 of 12); the languages table rows in `dist/what-is-a-token/index.html` show the same byte and token counts as the Rust reference for all six languages (English 170 bytes, 33 and 32 tokens; Spanish 173, 58, 57; French 191, 61, 61; Russian 293, 172, 133; Arabic 225, 121, 101; Chinese 129, 86, 43).

## Manual-only

1. **OHCHR terms** (E7): `https://www.ohchr.org/en/human-rights/universal-declaration/universal-declaration-human-rights/about-universal-declaration-human-rights-translation-project` returns 403 to scripts. Read it by hand in a browser and confirm that a link to it is the attribution it asks for.
2. **OHCHR landing page** `https://www.ohchr.org/en/human-rights/universal-declaration` also returns 403 to scripts (not cited in the post's References).
3. **Arabic cross-check**: there is no OHCHR PDF for Arabic. Compare the Arabic Article 1 sentence word for word, with the diacritics, against the OHCHR Arabic page (inherited human check from Phase 2). The sentence does match the un.org Arabic page exactly.
4. **ACM DOI page** for Creutz and Lagus (reference 13): `doi.org/10.1145/1187415.1187418` lands on dl.acm.org, which returns 403 to scripts. The metadata was confirmed through Crossref and an indexed copy, so this is only a check that the page opens for a reader.
5. **OpenAI blog page** `https://openai.com/index/better-language-models/` returns 403 to scripts; the 2019 date rests on the three other sources named in row 20.

Reference 13 and the two OHCHR pages are not given a new access date: reference 13 has no `accessed` attribute and the OHCHR pages are not in the References list.

## Access date to use (D-19 amended)

Fourteen existing web entries (1, 2, 3, 5, 6, 7, 9, 17, 20, 22, 23, 24, 25, 26) all opened successfully today and get `accessed="Oct. 13, 2026"`. No inline "as of" date is added to the post body.

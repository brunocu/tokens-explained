# Deferred from Phase 2.1 to Phase 5 (Harden & Release) and Phase 3

**Source:** plan 02.1-09 (Task 1), written 2026-10-07. Decisions D-04, D-17 and D-18 of `02.1-CONTEXT.md`.

**Purpose:** Phase 5 (and, for item 8, Phase 3) planning must pick up every item below. Nothing here was dropped. The read-through confusion points recorded in plan 02.1-09 Task 4 are appended at the end once the read-through is done.

## 1. Initial-load budget (D-04)

| # | Item | What Phase 5 must do |
|---|---|---|
| 1 | The playground auto-loads the GPT-2 file (0.55 MB gzip, 0.44 MB brotli) on every visit, because the reader chose arrival-time loading over `client:visible`. Typing never triggers a request, only arrival does. Phase 5 criterion 4 ("the initial bundle fits its budget on a throttled connection") must therefore be read with this extra transfer in mind | Measure the real transfer from the final build, decide the budget with the file counted in, and decide whether the island stays `client:load` or moves to `client:idle` (the file would then start after the page is idle, at the cost of a later first split). Record the choice and the measured numbers |

## 2. Residual parity risk (D-18)

| # | Item | What Phase 5 must do |
|---|---|---|
| 2 | The JavaScript library (`@huggingface/tokenizers` 0.2.0) is checked against the Rust reference on 28 curated cases only, while the playground now presents its GPT-2 output for arbitrary reader text as "what GPT-2 does". The library cannot reproduce every Oniguruma regex feature (see `.claude/CLAUDE.md`) | Accepted for now. The declined idea is to widen the golden (`src/core/fixtures/adapter-parity.json`) with contractions, mixed-script and whitespace cases. Revisit during the fact-check pass if time allows; the reference run needs the pinned `tokenizers==0.23.2` |

## 3. Third real tokenizer

| # | Item | What Phase 5 must do |
|---|---|---|
| 3 | A third real tokenizer for the comparison (Mistral or Qwen from the stack table) was considered and deferred | Nothing required. Only if the author wants it: it needs its own file, licence check, parity cases and a notes rewrite |

## 4. New GPT-2 statements in the post to re-verify, date and re-cite

| # | Statement in `src/content/posts/what-is-a-token.mdx` | Source in the post | What Phase 5 must do |
|---|---|---|---|
| 4.1 | GPT-2 is an older tokenizer, published by OpenAI in 2019 | reference 21 | Re-open, re-date |
| 4.2 | Why GPT-2 was chosen: small file, permissive licence, openly published design | references 21 and 25 (reference 25, the GPT-2 LICENSE, carries its own read date, Oct. 7, 2026) | Re-open the LICENSE, re-date reference 25 |
| 4.3 | The digit-grouping difference: GPT-2's pre-split rule keeps a whole run of digits together while newer models cut text differently | references 23 and 24 (the tiktoken source) | Re-read the splitting patterns, re-date |
| 4.4 | Vocabulary sizes 50,257 (GPT-2), 100,257 (GPT-4) and 200,019 (GPT-4o, derived) | references 21, 23, 24 | Re-open; replace the derivation if OpenAI documents the size |
| 4.6 | Added in the author's feedback pass of plan 02.1-09: the whole-word and morpheme arguments (Chinese, Japanese, Thai and Lao need a dictionary to find words; Finnish, Turkish and Basque build words from several morphemes; the best segmentation program was right less than half the time for the two lowest-resource languages) | references 9 to 14 (reference 9, the Unicode segmentation annex, is dated Oct. 7, 2026; the others Oct. 6, 2026 or undated) | Re-open each source, check the quoted figure and wording, re-date |
| 4.7 | Added in the same pass: BERT uses WordPiece, is not byte-level, and replaces a word it cannot build with the special token `[UNK]` | references 26 (Hugging Face LLM Course, WordPiece) and 27 (Hugging Face BERT docs, read-more link only; its text was not quoted), both read Oct. 7, 2026 | Re-open both, confirm the claims against the BERT paper (Devlin et al., NAACL 2019, aclanthology.org/N19-1423) if a primary source is wanted, re-date |
| 4.5 | Non-English claim: **omitted**. No primary source on an allowed link host was found in Phase 2.1 (plan 02.1-04), so the post says only that newer models cut text differently and gives digits as the one cited example | none | Record whether a primary source exists now; add the claim only with a cite on an allowed host (and one more `check-dist` entry if the host is new) |

## 5. Independent Try again on the two islands (plan 02.1-06)

| # | Item | What Phase 5 must do |
|---|---|---|
| 5 | The playground and the comparison's own-text block retry independently. Because the loader keeps a successful download, whichever retries second is instant. A reader who sees both fail must press Try again twice (once per island) | Confirm in the offline check that this reads acceptably to a non-programmer. If not, consider one shared retry. Not a defect today |

## 6. Closed item

| # | Item | Status |
|---|---|---|
| 6 | The toy's training corpus provenance and revisit idea (section 4 of `DEFERRED-FROM-PHASE-2.md`) | Gone from the Phase 5 content check: the corpus, trainer and merge list are deleted (superseded by Phase 2.1, D-17) |

## 7. CPU-throttled freeze guard

| # | Item | What Phase 5 must do |
|---|---|---|
| 7 | T-01-17 (the page must not freeze while typing on a slow CPU) was measured in Node with the toy and, in a browser, before GPT-2 existed in the page. Building the GPT-2 tokenizer (about 50 ms in Node) is not in that test | Re-run the CPU-throttled freeze guard in a browser with the GPT-2 build step included, and record the result |

## 8. Input for Phase 3 planning (EMB-01, EMB-02)

| # | Item | What Phase 3 must do |
|---|---|---|
| 8 | The id in the lookup strip can now be a real GPT-2 id from the same adapter and fixture the playground uses. The word "toy" in EMB-01 and EMB-02 means invented illustrative vectors and was not edited. Risk: a real id next to an invented vector may read as "this is GPT-2's actual embedding" | Consider rewording EMB-01 to "...become a real GPT-2 ID and then an illustrative vector in a lookup strip" and EMB-02 to "Reader sees the vectors clearly labelled as invented for illustration, not the model's real values, even though the IDs are real". Applied by Phase 3 planning, not by Phase 2.1 |

## 9. Read-through record (plan 02.1-09, Task 4)

| # | Item | What Phase 5 must do |
|---|---|---|
| 9 | The author reviewed the post line by line and reported two confusion points, both fixed in the post: (a) the sentence "Imagine you keep a list of pieces of text..." in "A practical compromise: tokens" was unclear; (b) "vocabulary" was never defined as an NLP term and could be read in its everyday sense. Fixes: two kinds of entries (single bytes, frequent longer pieces) and an explicit note that "vocabulary" is a technical term | None. Optionally repeat a read-through with a reader who is not the author before release |
| 10 | The author cut the emoji figure and the "Switch the playground to Token IDs" sentence in the last edits, and renamed "What you just saw" to "Takeaways". The hatched-chip explanation now appears only in the playground legend | Check in the final read-through that a reader who meets a hatched chip in the playground understands it without the cut figure's note |

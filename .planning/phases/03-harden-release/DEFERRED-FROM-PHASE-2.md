# Deferred from Phase 2 to Phase 5 (Harden & Release)

Note (2026-10-07): section 4 is closed as superseded by Phase 2.1; the new items from that phase are in `DEFERRED-FROM-PHASE-2.1.md` in this directory.

**Source:** plans 02-09 (Task 3 step 2) and 02-10 (Task 5). Written 2026-10-06.

**Purpose:** Phase 5 planning must pick up every item below. Nothing here was dropped. Items marked "human" are checks no automated gate can prove; the first four groups are Phase 5 work, the last two are open checks inherited from earlier Phase 2 plans.

## 1. Dated facts and licences to re-verify

| # | Item | Why it is deferred | What Phase 5 must do |
|---|---|---|---|
| 1.1 | The tokenizer years shown in the comparison row names (GPT-2 2019, BERT 2018) and the licences of both tokenizer files (GPT-2 MIT, BERT Apache-2.0 from the manifest) | Read once during Phase 2 from the Hugging Face model pages; the BERT licence was never confirmed against the upstream repository | Re-open the sources, date each fact, update `public/tokenizers/NOTICE.md` and the manifest if anything differs |
| 1.2 | The reuse terms of the United Nations and OHCHR for the Article 1 text and the attribution links in the languages table | OHCHR blocks automated fetches (403), so the terms were read from un.org only | Re-confirm the terms by hand, keep the attribution links, record the date |
| 1.3 | Every quoted tokenizer fact in the post and the notes (counts, repo names, commits) carries a date | The comparison fixture carries `generatedAt`; prose does not | Date every quoted fact once, in one place (for example the licence notices page) |
| 1.4 | Every CHECK item of `02-10-CITATIONS.md` | Resolved on 2026-10-06 by two search and download passes (PDFs read with pdftotext, code read from raw GitHub); every claim that had been left out was restored with its citation (section 3) | Re-open the sources at release time together with the access dates (items 2.4, 3.6) |

## 2. Build, bundle and dependencies

| # | Item | What Phase 5 must do |
|---|---|---|
| 2.1 | Size of the dynamically imported tokenizer chunk (`@huggingface/tokenizers` 0.2.0) against the bundle budget; the stepper island is a separate chunk (`BpeStepper`) | Measure from `dist/_astro` after the final build, decide the budget, record it |
| 2.2 | `npm audit` re-check, including the new dependency. The known item is the transitive high-severity advisory on `http-cache-semantics` (a build-time dependency of astro); `@huggingface/tokenizers` itself has no dependencies | Re-run at release time; never `npm audit fix --force` |
| 2.3 | Third-party-origin scan after deployment. `scripts/check-dist.mjs` now allows anchors (only) to eleven hosts (doi.org added for Morfessor) for the post's References list, besides the two UDHR hosts. Scripts, stylesheets, images and `http` stay forbidden | Keep the list in step with the References: any new source host needs one more entry (and the self-test guard counts them). Re-run the scan against the deployed site |
| 2.4 | Link rot of the 16 references | Re-open each link once before release and replace any dead one with the DOI or an archive link |

## 3. Open points of plan 02-10 (editorial rewrite of Post 1)

| # | Item | Status in the post |
|---|---|---|
| 3.1 | RESOLVED. `slp3`: chapters 1 "Introduction" and 2 "Words and Tokens" (draft of Aug. 19, 2026) read from the PDFs | The post cites them for the goal of NLP (ch. 1 says the aim is "getting computers to help people by performing useful tasks involving human language") and, with Sennrich, for k merges giving the original characters plus k new symbols (ch. 2, sec. 2.4.1). The book has no one-sentence "NLP is ..." definition, so the post's sentence follows the goal wording |
| 3.2 | RESOLVED. `sennrich` sec. 3.2 read from the PDF | Quote: "The final symbol vocabulary size is equal to the size of the initial vocabulary, plus the number of merge operations - the latter is the only hyperparameter of the algorithm." Restored in "What the stepper showed" with cites 6 and 3 |
| 3.3 | RESOLVED. `morfessor` (Creutz and Lagus, ACM TSLP vol. 4 no. 1 art. 3, Jan. 2007, doi 10.1145/1187415.1187418; title ends "morphology learning") | Restored as reference 8. Only what the abstract says is claimed: unsupervised induction of a simple morphology from raw text, with a lexicon of word segments. The claim "morphemes need language-specific analysis" is NOT made: no source read says it |
| 3.4 | RESOLVED. `subwordnmt` learn_bpe.py lines 373-378: `most_frequent = max(stats, key=lambda x: (stats[x], x))` | Restored as reference 10: among tied pairs the one that sorts last as text wins, so it differs from the toy's smaller-numbers rule. Line numbers are those of the master branch on 2026-10-06 and can move |
| 3.5 | RESOLVED. `tiktoken` o200k_base: the function has no explicit_n_vocab; special tokens are ENDOFTEXT 199999 and ENDOFPROMPT 200018 | The post states 200,019 and says it is derived (highest special-token number plus one). If OpenAI ever documents the size, replace the derivation by the quote |
| 3.6 | Access dates (Oct. 6, 2026) are printed for the web sources: Project Gutenberg, the SLP3 draft, the GPT-2 PDF and the tiktoken file | Re-date when the links are re-opened |
| 3.7 | The Garnett sentence ("Happy families are all alike; every unhappy family is unhappy in its own way.") is the public-domain Garnett text, credited to the translator | The author's own wording ("All happy families are alike; each unhappy family...") is a different translation and was not used |
| 3.8 | The sample sentence ("the cat sat on the mat and the cat sat on the hat") and the merge budget (10) are one constant each in `src/core/stepper.ts` | Revisit if the author wants a different sentence. With budget 10 the learned pieces are at, he, the, ␣the, ␣c, ␣o, ␣s, ␣cat, ␣on, ␣sat; the post and its tests derive every number from the engine, so only prose that names a piece (a + t, "that") would need a look |
| 3.9 | The stepper's third real-versus-toy difference ("They learn from a huge amount of text, not from one sentence") replaced the old "They work on bytes", because the new stepper works on bytes too | Re-read by the author in the review (02-10 Task 6) |

## 4. The toy's training corpus

**CLOSED 2026-10-07: superseded by Phase 2.1.** The toy tokenizer, its trainer script, its merge list and its corpus are deleted, so there is no corpus to revisit and no corpus provenance to check in Phase 5. See `.planning/phases/02.1-replace-toy-tokenizer-with-gpt-2-in-playground-and-examples/02.1-CONTEXT.md` (D-17). The text below is kept for the record only.

The idea "revisit the toy's training corpus" (02-CONTEXT, Deferred Ideas) is still open. Changing the playground toy's corpus changes `src/core/toy/merges.json` and its hash, the comparison fixture (`npm run precompute:comparison`), the pinned counts in `src/core/compare/fixture.test.ts` and the claims on the default sentence (`expect` lists of the `ToyTokens` figures). Plan 02-10 changed only the literary example (now the Garnett line), which regenerated the fixture and one case of `src/core/fixtures/adapter-parity.json` (the Rust reference run with the pinned `tokenizers==0.23.2`, offline from the uv cache).

## 5. Phone and secondary-suite results

The 360 px and phone checks live in `e2e/*.secondary.spec.ts` (run with `npm run test:e2e:secondary`, never gating). Their results are recorded in the SUMMARY of 02-10 and must be re-run on a real phone if one becomes available (item 2.1 of the Phase 1 hand-off still stands).

## 6. Human checks inherited from earlier Phase 2 plans (still open)

1. **Arabic cross-check (02-01, 02-05, 02-07, 02-09):** compare the Arabic sentence in the languages table word for word, with the diacritics, against the OHCHR Arabic Article 1 page (OHCHR blocks scripts; no OHCHR PDF exists for Arabic), and open the OHCHR translation project link. Record the result here.
2. **Notes truth (02-05, 02-06, 02-09):** read the five comparison notes and the languages note beside their rows; they must say only what the rows show.
3. **Glyph, outline and print checks (02-04, 02-09):** the space glyph is visible in Chrome, Firefox and Safari; the stepper's boxed pair, double border and hatched tie bars survive print preview and a colour-blindness simulation. (The end-of-word mark of the old stepper is gone, so only the space glyph remains to be checked.)
4. **Screen reader (02-09):** read the stepper's pair table, its hidden sentences, the References list and the languages table with a screen reader.
5. **Offline load (02-08, 02-09):** press the load button of the comparison with the network throttled or offline once; the error sentence and Try again must appear.
6. **Own-text block by hand (02-08):** paste Arabic, an emoji and a long English paragraph, light and dark, keyboard only.
7. **Look and feel of the languages table (02-07):** light, dark and print preview; Arabic reads right to left while the frames read left to right.

The author review and non-programmer read-through of the rewritten Post 1 (02-10 Task 6) are recorded in the 02-10 SUMMARY once done.

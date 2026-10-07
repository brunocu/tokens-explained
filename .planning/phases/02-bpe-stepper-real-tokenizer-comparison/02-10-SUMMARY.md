# Plan 02-10 summary: editorial rewrite of Post 1

**Status:** tasks 1 to 6 complete. Task 6 (author review) was **approved by the author on 2026-10-06** after two editorial passes (see "Task 6 editorial passes" below). The gate was re-run on the final text: green.

## What was built

| Task | Commit | Result |
|------|--------|--------|
| 1 | 3ee668d (RED), f01f636 | Sample-sentence stepper engine on the shared `bpe.ts` tie rule: 10 merges, vocabulary 256 + 10 = 266, `encodeText`, per-merge lengths |
| 2 | c82b10b | Sketch-D stepper: one box around each winning pair, fuse animation (about 320 ms, skipped under reduced motion), stop stage, unseen-words panel (" that" and the cat emoji in hex) |
| 3 | b2244ab | Literary example is the Garnett Anna Karenina line; fixture and adapter-parity case regenerated |
| 4 | dc1e2ad | Post rewritten in the six-point narrative with numbered IEEE citations and a References list |
| 5 | (this commit) | Content tests rewritten, post e2e updated, BPE and morpheme paragraphs reordered, Phase 5 hand-off file |

## Gate results (run in this worktree)

- `npm run check:env`, `check:deps`, `check:repo`, `check`, `check:svelte`: OK, 0 errors, 0 warnings
- `npm test`: 16 files, 780 tests passed
- `train:toy --check`, `precompute:comparison --check`, `check:core`, `build`, `check:dist`: OK
- `npm run test:e2e` (chromium, firefox, webkit): **478 passed, 2 skipped, 0 failed** on `main` after the claim restoration (E2E_PORT=4377). CORRECTION: the first run in the worktree was reported as "387 passed" from a truncated tail; two specs were in fact stale (a 78-character count for the 77-character Garnett sentence in `post.spec.ts`, and the external-link allow-list in `languages.spec.ts` that did not know the References list). Both were fixed in the post-merge pass.
- `npm run check:base`: OK
- `npm run test:e2e:secondary` (not gating): 10 of 10 passed on a free port

## Deviations and decisions

- **Scope expansion:** a new stepper corpus was on the CONTEXT deferred list. Done at the author's explicit request (02-09 notes slot).
- **Tie rule:** the sketch said "first seen". The build uses the project rule (`comparePairs`): highest count, then the smaller left id, then the smaller right id. Merge order differs from the sketch accordingly.
- **Merge budget:** 10, so both sat and cat form. Learned pieces: at, he, the, ␣the, ␣c, ␣o, ␣s, ␣cat, ␣on, ␣sat.
- **Tolstoy line:** the public-domain Garnett text, credited to the translator, because the author's wording could not be traced to a verifiable translation. Author chose this on 2026-10-06.
- **Content rules relaxed** (each commented in the test file): UTF-8 allowed, `[n]` cite links and the References list allowed, prose numbers only when derived from code or cited, word ceiling raised to 2550 (measured 2500, about 2120 before References).
- **Third real-versus-toy difference** changed from "they work on bytes" to "they learn from a huge amount of text", because the new stepper works on bytes too. Needs the author's eye (hand-off item 3.9).
- **Claims the executor had left out are restored** (post-merge pass, 2026-10-06), each re-read from its source: Sennrich sec. 3.2 on the merge count, Morfessor (reference 8), the `learn_bpe.py` tie rule (reference 10), the o200k size 200,019 (derived, stated as derived), and the Jurafsky and Martin chapters. The NLP sentence now follows what chapter 1 says (a goal, not a definition). The "morphemes need language-specific analysis" claim is NOT made: no source read says it. References are now 16; `doi.org` joined the dist-scan host list (eleven); word ceiling 2750 (measured 2671). See hand-off section 3 and the re-check section of 02-10-CITATIONS.md.
- **Secondary-suite run:** the first attempt failed because it reused a preview server on port 4321 serving the main checkout's old build. Re-run on a free port passed. That is an environment effect, not a stepper bug.

## Task 6 editorial passes (2026-10-06, author-directed, commit 55876e2 and the gate-sync commit after it)

- Text and bytes steps of the example merged: 14 steps, characters in one continuous row with the byte value under each, Run to end lands on the last step (it used to stop one step early, at "Stop").
- First token-chips figure moved after the algorithm explanation and before the playground; "How this tokenizer works" and "How real tokenizers differ" merged into "The tokenizer behind the demos".
- Encoding history expanded with sources (ASCII, code pages and mojibake, Unicode, UTF-8, web share). New references: ETHW (ASCII 1963), Wikipedia (Mojibake), unicode.org (Early years), W3Techs, tiktoken `model.py`. Bengio et al. and SentencePiece removed (no longer supported by any sentence). References are now 19 on the page (numbering follows first citation; Gage is 9 and Sennrich 10).
- Terminology: "token" defined before first use outside headings; "id" for a token's number, "value" for a byte's number; "stepper" replaced by "example" for readers; the post no longer says a token's number picks a vector (that belongs to the future Embeddings post).
- The post now carries one dictionary link on the character 男 and two inline code spans; `scripts/check-dist.mjs` allows anchors to five more hosts (ethw.org, en.wikipedia.org, www.unicode.org, w3techs.com, en.wiktionary.org; sixteen in all) and the post and languages e2e exempt that one link from their link rules.
- **Open claim:** the morpheme paragraph says a program needs "knowledge of each language and its many exceptions" to find morphemes. The earlier re-check decided NOT to make this claim because no source read supports it (see the Deviations list above). It is the author's approved text, but it is uncited.
- The 99.1% UTF-8 figure (W3Techs) and the Wikipedia-sourced mojibake claims came from a delegated search and were not opened by hand. Re-check at Phase 5 release.

## Gate results after the editorial passes

- `npm test`: 16 files, 778 tests passed. `npm run check` and `check:svelte`: 0 errors, 0 warnings. `check:core`, `check:deps`, `check:repo`, `check:dist`, `check:base`: OK.
- `npm run test:e2e` (chromium, firefox, webkit): **481 passed, 2 skipped, 0 failed**. A first run overlapped with other builds and produced 81 spurious failures; the clean re-run found 18 real ones (six specs times three browsers: stale strings and the new external link), all fixed.

## Pending

- The inherited human checks (hand-off section 6: Arabic cross-check, glyph and print checks, screen reader on the example and languages tables, offline load of the comparison) are not confirmed in this record. They stay listed in `.planning/phases/05-harden-release/DEFERRED-FROM-PHASE-2.md` for Phase 5.
- Plan 02-09 has no SUMMARY of its own: its tasks were superseded by this plan (02-10 depends on it and inherits its open human checks).
- A stray `astro preview` on port 4399 started by an earlier executor is still running (from the old worktree); it is not related to this work.

---
phase: quick-261006-riu
plan: 01
subsystem: planning-evaluation
tags: [evaluation, tokenizer, gpt-2, toy-tokenizer, bpe-stepper]
requires: []
provides:
  - "261006-riu-EVALUATION.md: impact analysis and verdict on replacing the toy tokenizer with GPT-2"
affects: []
key-files:
  created:
    - .planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-EVALUATION.md
    - .planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-SUMMARY.md
  modified: []
decisions:
  - "Verdict: recommend (with conditions) a full swap to GPT-2 for playground, figures and examples; comparison becomes GPT-2 vs BERT"
  - "Keep the BPE stepper, relabelled as a miniature, with a bridge to GPT-2"
  - "Run it as a decimal Phase 2.1 (about 5 plans), not as a quick task"
status: complete
commits: 1
plan_head_before: 0eb387bf3143fa55d6ac16d424ade66349fc9fe3
plan_head_after: 5898836c4aafa53f80a8a3e7f4df66f404555958
actuals:
  tasks: 3
  commits: 1
---

# Quick Task 261006-riu: Evaluate dropping the toy tokenizer Summary

**Evaluation only: recommends replacing the toy tokenizer with GPT-2 for the playground and examples, keeping the BPE stepper as a labelled miniature, and running the work as a decimal Phase 2.1 (about 25 to 33 hours, about 5 plans).**

## What was produced

`261006-riu-EVALUATION.md` with a Summary block and 12 numbered sections: scope, role of the toy, reader-comprehension impact, per-passage prose table, code and test inventory, page weight and loading, requirement and roadmap edits, stepper recommendation, risks to shipped Phase 2 verification, verdict, effort estimate and an implementation outline. The three plan tasks all write that one file and were committed together in one commit (the file was built up in the three planned steps; Task 1, 2 and 3 verify conditions were each checked on the finished file).

## Key findings

- **Comprehension:** the toy's "common words stay whole" contradiction disappears. In GPT-2, 10 of the 11 words in the default sentence are one token. Numbers, emoji and non-English examples still make their teaching points, and GPT-2 actually cuts the post's own 男 example (`E7 94` then `B7`).
- **Two prose catches:** only "Tokenization" splits in GPT-2 on the current default sentence, so the sentence and its figure must change; GPT-2's ids (t = 83, space = 220) disagree with the byte-value id scheme the post and stepper teach, so one bridging sentence is needed.
- **The toy and the stepper are separable.** `stepper.ts` never imports `toy.ts`, `presplit.ts` or `merges.json`; only `bpe.ts` is shared with the (dead after the swap) trainer. About 12 files and about 20 unit tests become dead.
- **The display layer needs no change.** The whole 22-entry regression corpus plus the fifth example, run through the repo's GPT-2 adapter and the unchanged grouping, display and table code, round-trips bytes, shows no replacement character and keeps the "framed iff partial" invariant.
- **Page weight:** GPT-2 is 1,355,256 bytes raw, 548,929 gzip, 443,977 brotli; the toy merges are 3,211 bytes gzipped. The playground gains a download and a failure mode; the 8-second island watcher in `BaseLayout.astro` would misreport a slow download as failed unless a separate tokenizer sub-state is added.
- **Comparison is already three rows today**, so GPT-2 vs BERT means deleting the toy row and column; GPT-2 and BERT rows and pinned counts do not change, and the `<ComparisonSection>` lead-in ("two older tokenizers") becomes true.
- **EMB-01 and EMB-02:** "toy vector" means illustrative vectors, so no change is forced; real GPT-2 ids become available for the strip (a gain), and EMB-02's labelling should say ids are real and vectors invented.

## Deviations from Plan

None in substance. Notes on execution:

- All GPT-2 splits were produced by running the repo's own adapter and shipped `public/tokenizers/gpt2.json` from throwaway scripts in the session scratchpad, outside the repo. The plan's "read-only use of `public/`" was respected.
- The three tasks were committed as one commit because they all produce sections of the same single file and the intermediate states were not separately meaningful. Task verify conditions (12 `##` sections, Summary block, required keywords, no changes under `src/`, `public/`, `scripts/`, `e2e/`) were checked on the final file.
- `STATE.md` and `ROADMAP.md` were deliberately not touched, per the orchestrator's constraints.

## Known Stubs

None. This task produced a planning document only.

## Threat Flags

None. No runtime surface, network path or schema was changed.

## Self-Check

- `261006-riu-EVALUATION.md` exists and is committed (5898836).
- `git status --porcelain -- src public scripts e2e` printed nothing.
- Evaluation has a `## Summary` block and sections 1 to 12.

## Self-Check: PASSED

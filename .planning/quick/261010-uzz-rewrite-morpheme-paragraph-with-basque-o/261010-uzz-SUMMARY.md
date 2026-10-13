---
phase: quick-261010-uzz
plan: 01
subsystem: content
tags: [mdx, citations, basque, morphology]
status: complete
requires: []
provides:
  - "Basque-only morpheme paragraph in what-is-a-token.mdx"
  - "26 contiguous references (Ramasamy et al. 2012 removed)"
affects: [src/content/posts/what-is-a-token.mdx, src/content/post-content.test.ts]
key-files:
  modified:
    - src/content/posts/what-is-a-token.mdx
    - src/content/post-content.test.ts
decisions:
  - "Reworded 'A tokenizer that had to cut...' to 'A program that had to cut...' because the post-content test forbids using 'tokenizer' before its definition."
actuals:
  tokens: 6000
  tasks: 1
  commits: 0
plan_head_before: bb476b171c077f183dec606f2f087e80d230d698
plan_head_after: bb476b171c077f183dec606f2f087e80d230d698
completed: 2026-10-11
---

# Quick Task 261010-uzz: Rewrite morpheme paragraph around Basque Summary

Replaced the Finnish/Turkish/Basque morpheme paragraph with a Basque-only one (135 forms per noun, "amarengan" = ama + aren + gan, "on the mother", all cited to Aduriz et al. 2000 as reference 10), dropped Ramasamy et al. 2012, and renumbered the references to 1..26.

## No commit made (by the user's choice)

The user did not ask for a commit, so Task 2's staging and commit steps were skipped. Every change is an unstaged working-tree edit. Nothing was added, committed, stashed, checked out, restored or reverted. `commits: 0` in the frontmatter is therefore intentional, and the code changes are uncommitted on purpose.

## What changed

- `src/content/posts/what-is-a-token.mdx`
  - Line 63 paragraph rewritten (Basque only, no Finnish or Turkish). Cites: Aduriz 10 (twice), Mott 11, Mager 12, Creutz 13.
  - Reference 10 (Ramasamy) deleted. References old 11..27 are now 10..26. The URL order matches HEAD minus Ramasamy.
  - All other Cite values above 10 shifted down by one, including the arrays. `[15,16]` is now `[14,15]`, `[16,7]` is `[15,7]`, `[21,23]` is `[20,22]`, and `[23,24]` is `[22,23]` (three occurrences). Cite values now cover exactly 1..26.
- `src/content/post-content.test.ts`
  - The `COMPARISON_SLOT_SENTENCE` cites changed from 26, 26, 27 to 25, 25, 26.
  - The `readOn` access-date map and its comment moved from 25, 26, 27 to 24, 25, 26.
  - Added a CITED entry `"135": ["aclanthology.org/C00-1001"]`. The stale "reference 16" comment became "reference 15".
  - A grep of `src` and `e2e` found no other hard-coded reference numbers.

## Test results

`npx vitest run` gives 839 passed and 1 failed, across 18 files.

The one failure is "first uses byte in the first section ...". It is caused by the user's own uncommitted edit on mdx line 18 ("A byte can store ... different values: 0 to ..."). The test still expects the older wording ("different ways, which gives the values 0 to ..."). This is out of scope and was left alone. The user will need to either update the test regex or revert that wording.

All of the citation tests pass: contiguous numbering, every cite has a reference, every reference is cited, first-cite order, number provenance (135 tied to C00-1001), access dates, the comparison sentence equality, and the word budget.

## Deviations from Plan

**1. [Rule 1 - Bug] Defined-term ordering**
- **Found during:** Task 1 verification
- **Issue:** The plan's paragraph text said "A tokenizer that had to cut every word...". This used "tokenizer" before its definition and failed two post-content tests (token and tokenizer definition order).
- **Fix:** Changed "A tokenizer" to "A program" (the plan allowed light polishing).
- **Files modified:** `src/content/posts/what-is-a-token.mdx`

**2. Task 2 commit steps skipped**
- By the user's instruction. The cross-check part was done (cite values 1..26 all present, 26 Reference tags, no "Ramasamy", "Finnish" or "Turkish" in the post, and the full vitest run above).

## Preserved user edits

The two user hunks in the mdx (lines 18 and 49) are unchanged. `src/components/prose/TokenFigure.astro` and `.planning/milestone.lock` were not touched. ROADMAP.md and STATE.md were not updated, per the instructions.

## Self-Check: PASSED

- The mdx and the test file are modified, and the SUMMARY exists.
- 26 Reference tags are numbered 1..26 and Cite values cover 1..26.
- No commit hash was claimed.

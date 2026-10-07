---
phase: 02-bpe-stepper-real-tokenizer-comparison
plan: 03
subsystem: bpe-stepper-core
tags: [bpe, stepper, svelte, tie-break, golden-tests]

requires:
  - phase: 01-foundation-playground
    provides: Phase 1 trainer (scripts/lib/bpe-train.ts), post layout and section-shell pattern
  - phase: 02-bpe-stepper-real-tokenizer-comparison
    provides: "02-01 R-02 amendments (shared comparator A4, slot sentence without 'byte')"
provides:
  - "src/core/bpe.ts: the single merge loop and tie-break (trainOnPieces, rankPairs, comparePairs, keyOf)"
  - "src/core/stepper.ts: SENNRICH_CORPUS, trainBPE trace, explainStep, startingLetters, initialWords"
  - "GLYPH_EOW (section sign) in src/core/display.ts"
  - "Minimal BpeStepper island and StepperSection shell inserted into Post 1 (finished in 02-04)"
affects: [02-04, 02-09]

key-files:
  created:
    - src/core/bpe.ts
    - src/core/stepper.ts
    - src/core/stepper.test.ts
    - src/components/BpeStepper.svelte
    - src/components/wrappers/StepperSection.astro
    - e2e/stepper.spec.ts
  modified:
    - scripts/lib/bpe-train.ts
    - src/core/display.ts
    - scripts/check-core.mjs
    - src/layouts/PostLayout.astro
    - src/content/posts/what-is-a-token.mdx
    - e2e/post.spec.ts

key-decisions:
  - "Pair-source 'times' is the occurrence count multiplied by the word's count, so it sums to the pair count (6 in newest and 3 in widest)"
  - "When tied pairs share a first piece, the verdict reads '{L} + {R} comes first, so it wins' for both tie kinds, after the 'first pieces match' sentence"
  - "The ids in the stepper: letters are their char codes, end-of-word mark is 0x7e, merged pieces 256 + merge index"

requirements-completed: [TOK-05, TOK-06]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: 404a4a0ebf82bb34b9bf36788f63c948110cec1c
plan_head_after: dd158c2af2ac5c45c7f71159b0d7a0df6c338800

duration: 25min
completed: 2026-10-06
status: complete
---

# Phase 02 Plan 03: BPE stepper trace and Post 1 section Summary

A pure BPE trace on the Sennrich corpus (eight merges, with ranked pair counts, ties and plain-language reasons) driven by one shared tie-break in `src/core/bpe.ts`, which the Phase 1 trainer now also calls, shown in Post 1 through a minimal stepper island.

## Accomplishments

- Task 1 (tracer): extracted the merge loop and comparator into `src/core/bpe.ts`; `trainMerges` now delegates to `trainOnPieces`. `npm run train:toy -- --check` still reports the committed 800-merge `merges.json` reproduced. Added `GLYPH_EOW`, `trainBPE`, a minimal `BpeStepper.svelte` (Back, Next, Reset, status text), `StepperSection.astro`, the MDX insertion between the `ToyTokens` paragraph and the playground, and the Playwright test that presses Next in the built post.
- Task 2: added `explainStep` (step 0, no-tie, letters-tie, order-tie, same-first-piece, last-step sentences), swapped the island's tracer line for an `aria-live` `data-why` paragraph, and pinned everything with 20 Vitest cases: all eight winners, counts, new tokens, tied sets, tie kinds, pair totals (14, 14, 13, 12, 11, 10, 9, 8), word splits after step 8, vocabulary after step 3, the exact sentences, a ninth merge (low + end of word, 5), early stop, and cross-checks that `trainOnPieces` and `trainMerges` agree with the trace and with each other.
- `scripts/check-core.mjs` now also loads `stepper.ts` natively and checks eight steps ending in `newest§`.

## Task Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | Tracer: Next shows merge 1 through the shared comparator | fe5ce77 |
| 2 | Why sentences, eight-step golden, comparator cross-check | dd158c2 |

## Verification

- `npm run train:toy -- --check`: OK (800 merges, committed file matches), the Phase 1 output is unchanged.
- `npm test`: 12 files, 683 tests pass. `npm run check`, `check:svelte`, `check:repo`, `check:core`, `build`, `check:dist` all clean.
- `npm run test:e2e -- --project=chromium e2e/stepper.spec.ts e2e/post.spec.ts`: 12 passed.
- `count > bestCount` no longer appears in `scripts/lib/bpe-train.ts`; `comparePairs` is defined once.

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None.

## Known Stubs

None. The island is deliberately minimal (plain-text word rows, no pair table, vocabulary block, chips, legend styling, Run to end or final screen); plan 02-04 is the planned owner of that UI, so it is not a stub in the plan's sense.

## Threat Flags

None. T-02-07 mitigated (one comparator, golden, cross-check, `train:toy --check`); T-02-08 mitigated (text interpolation only, `check:repo` passes).

## Issues Encountered

- `src/components/TokenDisplay.svelte` (modified) and `.planning/milestone.lock` (untracked) were pre-existing and never staged.
- The inline layout script still watches only `[data-playground]`; the generalisation to `[data-island]` (failed-state handling for the stepper card) is outside this plan and belongs to the later island plans.

## Self-Check: PASSED

All created files exist; commits fe5ce77 and dd158c2 exist.

---
phase: 02-bpe-stepper-real-tokenizer-comparison
verified: 2026-10-06T19:45:00Z
status: passed
score: 6/6 must-haves verified
covered_files:
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-01-PLAN.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-01-SUMMARY.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-02-PLAN.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-02-SUMMARY.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-03-PLAN.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-03-SUMMARY.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-04-PLAN.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-04-SUMMARY.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-05-PLAN.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-05-SUMMARY.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-06-PLAN.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-06-SUMMARY.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-07-PLAN.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-07-SUMMARY.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-08-PLAN.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-08-SUMMARY.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-09-PLAN.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-09-SUMMARY.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-10-PLAN.md
  - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-10-SUMMARY.md
  - src/components/BpeStepper.svelte
  - src/components/Comparison.svelte
  - src/components/LanguagesDemo.svelte
  - src/components/LanguagesTable.astro
  - src/components/OwnText.svelte
  - src/content/posts/what-is-a-token.mdx
  - src/core/bpe.ts
  - src/core/compare/comparison.json
  - src/core/compare/fixture.ts
  - src/core/compare/languages.ts
  - src/core/compare/notes.ts
  - src/core/compare/rows.ts
  - src/core/stepper.ts
covered_digest: "v2:sha256:d3b965bed38a40629b3c5cf93619a73764065c3b2953ef1bcc7e5dc6016c58ce"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/6
  gaps_closed:
    - "Criterion 6 (non-programmer read-through, 'common words stay whole' wording, author notes resolved): UAT test 1 passed 2026-10-06"
    - "Inherited human checks (Arabic vs OHCHR, glyph/print, screen reader, offline load, own-text by hand): UAT test 2 passed"
    - "Open factual claims (morpheme sentence, W3Techs 99.1%, Wikipedia mojibake): UAT test 3 passed"
  gaps_remaining: []
  regressions: []
---

# Phase 2: BPE Stepper & Real-Tokenizer Comparison Verification Report

**Phase Goal:** A reader can watch a tokenizer's vocabulary being built one merge at a time, then see how the toy compares with real model tokenizers on tricky inputs, completing Post 1.
**Verified:** 2026-10-06
**Status:** passed
**Re-verification:** Yes. The earlier report was `human_needed` (5/6 plus three human items). This pass re-checked the code on the current tree (last source commit a5b760a; commits after it are docs and UAT only) and applied the results in 02-UAT.md as the resolution of the human items.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Reader can step through BPE merges with Next, Back, Reset, seeing merged pair and updated tokens at every step | VERIFIED | `BpeStepper.svelte` wires Back, Next, Run to end and Reset (`data-back`, `data-run`, `data-reset`) to `goBack/goNext/runToEnd/reset` over a stage index into `SAMPLE_TRACE`. Executed `stepper.ts` in Node: `STEPPER_FACTS` = 10 merges, vocabulary 266, 49 start pieces down to 20, 14 stages. Re-ran `e2e/stepper.spec.ts`, `comparison.spec.ts`, `languages.spec.ts` in chromium myself: 44 passed (covers stepping, reduced motion, no tokenizer request while stepping, no console errors, no-JS fallback, 44px controls). |
| 2 | At every BPE step, pair counts and the tie-break rule that decided the merge are visible | VERIFIED | `[data-pair-table]` renders per-merge counts with "Merged"/"Tied" text (not colour alone). `explainStage` emits "N pairs are tied on C. A tie goes to the pair with the smaller numeric values ..." (`stepper.ts` ~line 319). The tie comparator `comparePairs` lives in `src/core/bpe.ts` and is the same code the stepper and toy trainer use (`stepper.test.ts` golden asserts the winners and order). Stages 0 and 1 (text, start) correctly have no pairs. |
| 3 | Reader can compare toy output side by side with real model tokenizers on curated inputs (numbers, emoji, other languages), each real tokenizer clearly labelled | VERIFIED | `Comparison.svelte` + `TokenRows`; `rows.ts` labels "GPT-2 (2019)" and "BERT, uncased (2018)" plus the toy. `comparison.json` has five examples (rare-word, numbers-dates, emoji, literature, non-english) from real tokenizers, with `public/tokenizers/{gpt2,bert-uncased}.json`, `manifest.json`, `NOTICE.md` self-hosted. Built page contains `data-compare` (x2). Criterion text says "real model tokenizers"; 02-01 amended TOK-07 and this criterion to GPT-2 plus BERT (documented decision), which is what ships. |
| 4 | Reader can see the same sentence in many languages and how token counts differ | VERIFIED | `comparison.json.languages` has six entries; `LanguagesTable.astro` (works without JS) plus `LanguagesDemo.svelte` picker. Built page contains `data-languages` (x3). `LANGUAGES_NOTE` explains the BERT Chinese `[UNK]` effect. `languages.spec.ts` passes. |
| 5 | Every comparison carries a short plain-language note saying what to notice | VERIFIED | `notes.ts` has one note for each of the five example ids plus `LANGUAGES_NOTE`; `notes.test.ts` enforces length and tone rules (part of the 778 passing unit tests). Built page has `data-note` (x2: one rendered note slot plus the comparison island markup). I read all five notes against the fixture rows' described splits; none overstates. |
| 6 | Complete Post 1 has had a non-programmer read-through, including whether "common words stay whole" reads as contradictory, and the author's notes are resolved | VERIFIED (human) | `02-UAT.md` test 1: pass (2026-10-06). The prose now says "many everyday words stay whole" and is build-checked (`claims.ts`/`claims.test.ts`, `ToyTokens` expectations). 02-10 Task 6 author approval is recorded. Accepted on the strength of the UAT record; not re-observable from code. |

**Score:** 6/6 truths verified. No behavior-dependent truth is left unexercised: stepping, Back, Reset and reduced-motion transitions are covered by named e2e specs that I ran.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/core/stepper.ts` (341 lines), `src/core/bpe.ts` | VERIFIED | Executed; shared merge loop and comparator |
| `src/components/BpeStepper.svelte` (473 lines) | VERIFIED | Wired via `wrappers/StepperSection.astro`; `data-stepper` in dist |
| `Comparison.svelte`, `Picker.svelte`, `TokenRows.svelte`, `TokenLegend.svelte`, `TokenTable.svelte` | VERIFIED | `data-compare` in dist |
| `LanguagesDemo.svelte`, `LanguagesTable.astro` | VERIFIED | `data-languages` in dist |
| `OwnText.svelte` | VERIFIED (beyond criteria) | Explicit-load design; review warnings tracked below |
| `src/core/compare/{comparison.json,fixture.ts,notes.ts,rows.ts,languages.ts}` | VERIFIED | Fixture freshness and notes tests pass |
| `public/tokenizers/{gpt2,bert-uncased}.json`, `manifest.json`, `NOTICE.md` | VERIFIED | Present |
| `src/content/posts/what-is-a-token.mdx` (183 lines) | VERIFIED | Built to `dist/what-is-a-token/index.html`; prose components `Cite/Fact/Reference/References/TextAsNumbers/ToyTokens` present |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| Post MDX | Stepper, Comparison, Languages, Playground | `wrappers/*Section.astro` | WIRED (all four `data-*` markers in dist) |
| Stepper component | Pure trace | `SAMPLE_TRACE`, `explainStage`, `stageInfo` | WIRED |
| Post prose numbers | Engine | `<Fact>` reading `STEPPER_FACTS` | WIRED |
| Comparison | Fixture and notes | `comparison.json`, `NOTES` | WIRED |
| Stepper and toy trainer | Same tie rule | `comparePairs` in `bpe.ts` | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| BpeStepper | trace | `trainSentence` over byte-level BPE (executed) | Yes | FLOWING |
| Comparison / LanguagesDemo | rows | `comparison.json` generated from real GPT-2/BERT files plus shipped toy merges, parity-tested against a Python reference golden | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit suite | `npx vitest run` | 16 files, 778 passed | PASS |
| Stepper/comparison/languages e2e | `npx playwright test e2e/stepper.spec.ts e2e/comparison.spec.ts e2e/languages.spec.ts --project=chromium` | 44 passed | PASS |
| Build | `npm run build` | 2 pages built | PASS |
| Gate scripts | `check:env`, `check:deps`, `check:repo`, `check:core`, `check:dist`, `check:base` | all OK (base proof 13 passed) | PASS |
| Not re-run by me | firefox/webkit e2e, `astro check`, `svelte-check`, full chromium suite | Reported 481 passed, 2 skipped, 0 failed in 02-10-SUMMARY | accepted, not independently reproduced |

### Probe Execution

No probe scripts declared. Skipped.

### Requirements Coverage

Every ID in the PLAN frontmatter (02-01..02-10: TOK-05, TOK-06, TOK-07, TOK-08, TOK-09) is present in REQUIREMENTS.md, checked `[x]` and mapped to Phase 2 "Complete". No other ID maps to Phase 2, so there are no orphans.

| Requirement | Source Plans | Status | Evidence |
|-------------|--------------|--------|----------|
| TOK-05 Step through merges with Next/Back/Reset | 02-03, 02-04, 02-09, 02-10 | SATISFIED | Truth 1 |
| TOK-06 Pair counts and tie-break rule at each step | 02-03, 02-04, 02-09, 02-10 | SATISFIED | Truth 2 |
| TOK-07 Compare toy vs real tokenizers on curated inputs | 02-01, 02-02, 02-05, 02-06, 02-08, 02-09, 02-10 | SATISFIED (amended to GPT-2 + BERT) | Truth 3 |
| TOK-08 Same sentence in many languages, counts differ | 02-01, 02-05, 02-07, 02-09, 02-10 | SATISFIED | Truth 4 |
| TOK-09 Plain-language note on each comparison | 02-02, 02-05, 02-06, 02-07, 02-09, 02-10 | SATISFIED | Truth 5 |

### Anti-Patterns Found

No `TBD`, `FIXME`, `XXX`, `TODO` or `HACK` markers in any phase source file (grep over components, post, core, compare, prose). No stubs: data flows from real tokenizers.

| Item | Severity | Impact |
|------|----------|--------|
| 02-REVIEW.md WR-01..WR-05 (OwnText download-failure announcement, fetch timeout/retry, focus on unmounted Load button, privacy lint lacks `set:html`, latent overlapping runs in `markPairs` for a different sample sentence) | Warning, advisory | None touches a success criterion; dispositions in 02-REVIEW-DISPOSITION.md, routed to Phase 5 |
| ROADMAP.md bookkeeping drift: Phase 2 still `[ ]`, "8/9 plans executed", 02-09 unchecked and 02-10 not listed | Warning (bookkeeping only) | Update ROADMAP/STATE on phase close. 02-09 is closed out as superseded by 02-10 (02-09-SUMMARY.md) |
| `DEFERRED-FROM-PHASE-2.md` still lists the human checks UAT test 2 now records as passed | Info | Mark them resolved there so Phase 5 does not repeat them |

### Human Verification Required

None outstanding. The three earlier items are resolved by 02-UAT.md (3 passed, 0 issues, 2026-10-06).

### Gaps Summary

No gaps. All six success criteria hold on the current tree, the five requirement IDs are accounted for, and the human items are resolved by the recorded UAT. The remaining items are planning-artifact bookkeeping and advisory review warnings already routed to Phase 5.

---

_Verified: 2026-10-06_
_Verifier: Claude (gsd-verifier)_

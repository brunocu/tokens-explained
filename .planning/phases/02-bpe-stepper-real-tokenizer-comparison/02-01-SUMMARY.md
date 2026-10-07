---
phase: 02-bpe-stepper-real-tokenizer-comparison
plan: 01
subsystem: planning-contract
tags: [ui-spec, requirements, roadmap, decision-checkpoint]

requires:
  - phase: 01-foundation-playground
    provides: Phase 1 trainer (scripts/lib/bpe-train.ts), TokenDisplay, post content rules
provides:
  - "Single dated UI-SPEC amendment block (Revision R-02) that plans 02-03 to 02-09 quote"
  - "TOK-07 and ROADMAP Phase 2 criterion 3 aligned with the five playground examples (no 'code')"
  - "User resolution of open flags A1 to A5"
affects: [02-03, 02-05, 02-06, 02-07, 02-09]

actuals:
  tokens: 3500
  tasks: 2
  commits: 1
plan_head_before: cd6360d3b07518970f95547e9f21407327757a82
plan_head_after: f2dadde58a2c0f3329319af7b7bf25ab4be1d8c0

tech-stack:
  added: []
  patterns: ["Planning amendments recorded in one dated revision block; amended lines marked 'R-02' in place"]

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-UI-SPEC.md

key-decisions:
  - "A1: whole UDHR Article 1 for all six languages (Spanish is one sentence, the others two)"
  - "A2: [UNK] shown as visible special-token chips, with the under-count line '{k} of these are [UNK]'"
  - "A3: BERT subline says 'removes accents'; legend says 'that word or character'"
  - "A4: one tie-break comparator in src/core/bpe.ts (trainOnPieces, rankPairs, comparePairs), used by trainMerges and trainBPE"
  - "A5: Arabic Article 1 checked once by eye against the OHCHR Arabic page (human check in 02-05 and 02-09)"
  - "D-12: comparison inputs stay exactly the EXAMPLES ids; 'code' dropped from TOK-07 and roadmap criterion 3"

requirements-completed: []  # TOK-07 and TOK-08 are in the plan frontmatter but this plan only amends their wording; they are delivered by plans 02-03 to 02-09 (see Deviations)

duration: 12min
completed: 2026-10-06
status: complete
---

# Phase 02 Plan 01: Resolve open research answers into the contract Summary

One user decision (A1 to A5) turned into amended REQUIREMENTS, ROADMAP and UI-SPEC wording plus a single dated Revision R-02 block, so plans 02-03 to 02-09 read one consistent contract.

## Accomplishments

- Task 1 (checkpoint:decision): the user accepted A1, A4 and A5 as recommended, and confirmed A2 and A3 (show "removes accents"; show `[UNK]` special tokens and keep the "{k} of these are [UNK]" line).
- Task 2: REQUIREMENTS.md TOK-07 and ROADMAP Phase 2 criterion 3 now read "(numbers, emoji, other languages)". The TOK-07 line still starts with `- [ ] **TOK-07**`.
- UI-SPEC amendments a to e applied in place with scoped edits, each marked "R-02": whole Article 1 and the extra per-language provenance fields, the `[UNK]` count line and the rule that the note must not claim BERT handles Chinese, the BERT subline and legend wording, the shared comparator in `src/core/bpe.ts` plus `scripts/lib/comparison-build.ts`, and the stepper slot sentence without "byte-pair encoding" (the "three ways" sentence moved to "How this tokenizer works").
- "Revision R-02 (planning, 2026-10-06)" block inserted before "Checker Sign-Off" (which is unchanged), with the A1 to A5 resolution table.

## Task Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | Confirm the five open research answers (checkpoint, no code) | n/a (resolved by user reply) |
| 2 | Write the resolution into REQUIREMENTS, ROADMAP and the UI-SPEC | f2dadde |

The commit touches only the three planned files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing consistency] "sentence" wording in the languages caption and slot sentence**
- **Found during:** Task 2, amendment a
- **Issue:** With Article 1 now two sentences in five languages, the table caption ("The same sentence in six languages") and the Languages slot sentence ("The same sentence, in six languages ...") would contradict the data.
- **Fix:** Both now say "text"; the caption names Article 1 of the UDHR. The source line keeps the plan's prescribed "Sentence: ..." prefix verbatim, because the plan's wording was explicit.
- **Files modified:** 02-UI-SPEC.md
- **Commit:** f2dadde

**3. [Note] TOK-07 / TOK-08 not marked complete**
The dispatch asked to mark TOK-07 and TOK-08 as the plan says. This plan changes no code and delivers neither feature, and its own acceptance criterion requires the TOK-07 line to still start with `- [ ] **TOK-07**`. Marking them complete would make REQUIREMENTS.md claim unbuilt features, so `requirements mark-complete` was not run. The orchestrator can run it when the delivering plans finish.

**2. [Note] User's A2/A3 reply vs plan greps**
The user's reply (show "removes accents"; show `[UNK]` tokens; keep "{k} of these are [UNK]") matches the plan's recommended wording exactly, so no verify string had to change and nothing was dropped. All seven automated greps pass.

## Authentication Gates

None.

## Known Stubs

None. Planning documents only.

## Threat Flags

None.

## Issues Encountered

- `src/components/TokenDisplay.svelte` and `.planning/STATE.md` had pre-existing uncommitted edits (not mine); `TokenDisplay.svelte` was never staged.

## Next Phase Readiness

Plans 02-02 onward can proceed. Open human checks carried forward: Arabic Article 1 eyeballed against the OHCHR Arabic page (02-05, 02-09). Plan 02-03 edits the Phase 1 file `scripts/lib/bpe-train.ts` and must prove `npm run train:toy -- --check` is unchanged.

## Self-Check: PASSED

- 02-UI-SPEC.md, REQUIREMENTS.md and ROADMAP.md contain the amended phrases (grep verified).
- Commit f2dadde exists and lists only the three files.

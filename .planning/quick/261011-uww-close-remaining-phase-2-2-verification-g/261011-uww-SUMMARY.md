---
phase: quick-261011-uww
plan: 01
subsystem: verification
tags: [check-dist, planning-docs, phase-2.2]
requires: []
provides:
  - check-dist widget checks on current languages-widget hooks
  - recorded D-08, TOK-02, FOUND-04 amendments
affects: [scripts/check-dist.mjs, 02.2-CONTEXT.md, 02.2-UI-SPEC.md, ROADMAP.md, REQUIREMENTS.md, STATE.md]
key-files:
  modified:
    - scripts/check-dist.mjs
    - .planning/phases/02.2-rework-widgets/02.2-CONTEXT.md
    - .planning/phases/02.2-rework-widgets/02.2-UI-SPEC.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
decisions:
  - "D-08 amended by the author (2026-10-11): Show token IDs switch, off by default; Words stat removed"
status: complete
commits: 3
plan_head_before: 7d1ad47839c0f815f2c9a0c9e3881aec105288f9
plan_head_after: f30114f5f229ba780864b3ec8e00037cc1a605a3
actuals:
  tasks: 3
  commits: 3
completed: 2026-10-11
---

# Quick 261011-uww: Close remaining Phase 2.2 verification gaps

check-dist now asserts the languages widget's current hooks (`data-languages-table`, six `data-lang-row`, six `data-table-sentence`, checked English radio), and the D-08, TOK-02 and FOUND-04 amendments are recorded where a verifier will read them.

## Commits
- 702bce4: fix: check-dist widget checks and self-test fixtures (scripts/check-dist.mjs)
- ae0ec0c: docs: D-08 override in CONTEXT, UI-SPEC chip-format sentence, ROADMAP 2.2 goal wording, TOK-02 and FOUND-04 text
- f30114f: docs: STATE.md Phase 2.2 position, status and session fields

## Gate results (run after the last edit)
- `npm test`: 813 passed (813)
- `npm run build`: exit 0
- `npm run check:dist`: exit 0 ("check-dist: OK (4 files, 36 URLs scanned in dist, base /)")
- `node scripts/check-dist.mjs --self-test`: "check-dist self-test OK"
- Playwright e2e: not run (no e2e or src file changed); STATE.md says so and does not claim e2e green.
- `git diff` shows no change under src/ or e2e/.

## Deviations from Plan

1. **[Note] Self-test is not part of `npm run check:dist`.** The plan's done line expects check:dist to print "check-dist self-test OK", but that output comes only from `--self-test`. I ran it separately; it passes.
2. **[Note] Task 2 automated verify cannot pass as written.** Its second grep excludes lines containing "word count", yet the plan's own required TOK-02 wording includes the parenthetical "word count removed". The TOK-02 line does read "byte, character and token counts"; the check was verified by eye.
3. **Self-test fixture:** the `sentences` option defaults to the row count (so five rows give five sentences) and overrides it independently when set.
4. UI-SPEC: only the Shared Chip Format sentence was added; lines 238, 391, 451 and 531 do not contradict the switch (the "Token IDs" strings are the old segmented-control labels, the switch reads "Show token IDs").

## Not done by design
Quick-tasks table row for 261011-uww in STATE.md, PLAN/SUMMARY commits, and ROADMAP phase completion are left to the orchestrator. Phase 2.2 is not marked complete.

## Known Stubs
None.

## Self-Check: PASSED
Files modified exist; commits 702bce4, ae0ec0c, f30114f present in `git log`; 3 commits measured from the ledger base.

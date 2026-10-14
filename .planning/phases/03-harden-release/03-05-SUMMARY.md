---
phase: 03-harden-release
plan: 05
subsystem: release-hardening
tags: [performance, gzip, playwright, accessibility, npm-audit, manual-checklists]
requires:
  - phase: 03-harden-release
    provides: "03-01 decisions (report-only budget, keep client:load); 03-02 favicon and licences; 03-03 fact check; 03-04 deploy workflow and remote-base mode"
provides:
  - "scripts/measure-bundle.mjs: gzip page-weight report against the proposed limits (report only)"
  - "03-PERFORMANCE.md: measured table, limits, recorded client:load decision, plain-language Lighthouse note"
  - "e2e/release-checks.secondary.spec.ts: non-gating reflow, print, dark and throttled start-up checks"
  - "03-HARDENING.md: recorded outcomes of reflow, print, dark, freeze, privacy and npm audit"
  - "03-CHECKLISTS.md, 03-READER-QUESTIONNAIRE.md, 03-KNOWN-LIMITATIONS.md: kits for the author and the two readers"
affects: [03-06, 03-07, 03-08, release]
commits: 3
plan_head_before: 2d407c77f05b9e7baf310afd205f27ae78bfbbb8
plan_head_after: 1f8ce6774dc4428daaf45ecbacd3b40a85138ea8
actuals:
  tokens: 12100
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Report-tool script with exported pure functions and a --self-test, mirroring check-dist.mjs"
    - "Secondary (non-gating) spec that overrides the phone project's viewport and touch settings itself"
key-files:
  created:
    - scripts/measure-bundle.mjs
    - e2e/release-checks.secondary.spec.ts
    - .planning/phases/03-harden-release/03-PERFORMANCE.md
    - .planning/phases/03-harden-release/03-HARDENING.md
    - .planning/phases/03-harden-release/03-CHECKLISTS.md
    - .planning/phases/03-harden-release/03-READER-QUESTIONNAIRE.md
    - .planning/phases/03-harden-release/03-KNOWN-LIMITATIONS.md
  modified:
    - package-lock.json
key-decisions:
  - "Budget stays report only and the Playground stays client:load, as recorded in 03-DECISIONS.md; package.json, the workflow and the mdx are untouched"
  - "npm audit fix (plain) applied because the dry run proposed exactly one change, http-cache-semantics 4.2.0 to 4.3.0; audit now reports 0 vulnerabilities"
  - "The stated limits are measured on gzip level 6 with 1 KB = 1,000 bytes, the same unit as the research table"
requirements-completed: [FOUND-01]
duration: 9 min
completed: 2026-10-14
status: complete
coverage:
  - id: D1
    description: "Initial-load size of the final production build measured against stated limits, loading choice recorded"
    requirement: FOUND-01
    verification:
      - kind: other
        ref: "node scripts/measure-bundle.mjs --self-test; node scripts/measure-bundle.mjs http://localhost:4431/tokens-explained/ (all four limits PASS)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reflow at 200 and 400 percent, print PDF, dark scheme and throttled start-up each run once and recorded"
    requirement: FOUND-01
    verification:
      - kind: e2e
        ref: "e2e/release-checks.secondary.spec.ts (5 tests pass)"
        status: pass
      - kind: e2e
        ref: "e2e/resilience.spec.ts#freeze guard; e2e/privacy.spec.ts (2 tests pass)"
        status: pass
    human_judgment: false
  - id: D3
    description: "npm audit advisory resolved by the plain fix with gates re-run"
    requirement: FOUND-01
    verification:
      - kind: other
        ref: "npm audit (0 vulnerabilities); npm run check:deps; npm test (818 pass); npm run build; npm run check:dist"
        status: pass
    human_judgment: false
  - id: D4
    description: "Manual-check kits for the author, reader questionnaire and known-limitations note"
    requirement: FOUND-01
    verification: []
    human_judgment: true
    rationale: "The kits are documents; whether the checklist is clear and complete for the author is a judgement. The checks themselves are run by the author later."
---

# Phase 3 Plan 05: Performance record, release checks and manual-check kits Summary

**A gzip page-weight report script that finds the final build inside every proposed limit (156 KB without the tokenizer, 713 KB with GPT-2, 61 KB of JavaScript, 26 KB of HTML), a non-gating spec and record for reflow, print, dark and CPU-throttled start-up, a plain `npm audit fix` that cleared the one advisory, and three kit documents for the author and the two readers.**

## Accomplishments

- **Performance (Task 1).** `scripts/measure-bundle.mjs` loads the page in Chromium at 390 by 844, waits for the GPT-2 file, gzips every response at level 6, then scrolls the page to load the lazy widgets, and prints a markdown table plus a PASS or OVER BUDGET mark per limit. Sizing and limit arithmetic are exported pure functions with a `--self-test`. It exits 0 unless `--budget` is given. `03-PERFORMANCE.md` records: HTML 26,185 B, CSS 5,944, JavaScript 41,200, fonts 82,992, subtotal 156,321, `gpt2.json` 556,664, total at load 712,985; all JavaScript after scrolling 60,807; BERT on click 191,714 (informational); the lazy chunks (19.6 KB). All four limits pass. It also records the author's decisions (report only; keep `client:load`) and explains Lighthouse in plain language.
- **One-off checks (Task 2).** `e2e/release-checks.secondary.spec.ts` (five tests, non-gating, Chromium): no page-level horizontal scroll at 640 x 512 and 320 x 256; a print rendering that writes a 17-page, 237,757-byte PDF under `test-results/`; the dark scheme with no overflow and no console errors; time until the playground is typable under 4x CPU throttling (636 to 667 ms locally, limit 15 s). The existing freeze guard also passes (1,562 ms for 2,000 chips) and `e2e/privacy.spec.ts` passes (2 of 2). `03-HARDENING.md` has the six sections with date, command and outcome. No defect was found, so nothing was fixed or put on the backlog from these checks.
- **Audit (T-03-08).** `npm audit fix --dry-run` proposed exactly one change, `http-cache-semantics 4.2.0 => 4.3.0`, so the plain `npm audit fix` was applied; the lockfile diff is three lines and `npm audit` now reports 0 vulnerabilities. `check:deps`, `npm test` (818 tests in 19 files), `build`, `check:dist`, the secondary spec and the privacy spec all pass afterwards.
- **Kits (Task 3).** `03-CHECKLISTS.md` has nine numbered items in the `02-UAT.md` shape (screen reader, colour-blind, real phone, inherited Phase 2 checks 4a to 4g incl. the Arabic cross-check and the three pages that block scripts, lighter dark/print/zoom, keyboard-only read-through, no-network typing, Lighthouse explained and report only, the hatched-chip probe). `03-READER-QUESTIONNAIRE.md` has eight open questions with no scoring and a findings table with a disposition column. `03-KNOWN-LIMITATIONS.md` lists 13 limits with a status column.

## Task Commits

1. Task 1: `36c19af` feat(03-05): add bundle measure report and record the final build budget
2. Task 2: `a923810` feat(03-05): add release checks spec, record hardening outcomes, fix audit advisory
3. Task 3: `1f8ce67` docs(03-05): add manual-check kits, reader questionnaire and known limitations

## Verification

- Task 1 verify (run with the pid file in the session scratchpad instead of `/tmp`): self-test OK, build OK, measurement exit 0, "Total at load" present in both outputs, lockfile unchanged in that task: `PERF-OK`.
- Task 2 verify: `check:deps` OK, build OK, secondary spec 5 of 5, privacy 2 of 2, freeze guard 1 of 1, six sections present: `HARDENING-OK`. The string for the forced audit variant does not appear in `03-HARDENING.md`.
- Task 3 verify: three documents exist, items 1 to 9 present, Arabic, hatched and Pages present: `KITS-OK`. `check:repo` OK (48 files).
- No package was installed; `package.json` and `.github/workflows/deploy.yml` are unchanged. Lighthouse was not run (the plan puts it in the author's DevTools panel).

## Deviations from Plan

None to the plan's tasks. Notes:

**1. [Process] Verify commands used the scratchpad instead of `/tmp`.** The plan's verify command writes its pid and output files under `/tmp`; session rules say to use the scratchpad, so the same steps were run there. Same checks, same result.

**2. [Limit of the check] The print PDF could not be rendered to images here** (no PDF rasteriser in the shell). The automated test proves a non-empty, paginated PDF; I looked at a print-media screenshot of the top of the post instead. Reading the widget pages is left to the author (checklist items 4c, 4f, 5) and listed as not verified in `03-KNOWN-LIMITATIONS.md`.

**Total deviations:** 0 auto-fixed. **Impact:** none on scope.

## Issues Encountered

None. A pre-existing npm notice (esbuild install script not covered by `allowScripts`) appears on audit commands; out of scope, recorded in `03-HARDENING.md`.

## Known Stubs

None.

## Threat Flags

None. The new script and spec only read the local preview server; `package-lock.json` changed by one existing package's patch-level bump.

## Next Phase Readiness

Ready for 03-06. The author runs the nine checks in `03-CHECKLISTS.md` at the end of the phase and the two readers answer `03-READER-QUESTIONNAIRE.md` after deployment. Lighthouse (item 8) is best run on the live address.

## Self-Check: PASSED

- Files exist: `scripts/measure-bundle.mjs`, `e2e/release-checks.secondary.spec.ts`, `03-PERFORMANCE.md`, `03-HARDENING.md`, `03-CHECKLISTS.md`, `03-READER-QUESTIONNAIRE.md`, `03-KNOWN-LIMITATIONS.md` (all found).
- Commits `36c19af`, `a923810`, `1f8ce67` found in `git log`.
- Acceptance criteria re-checked (self-test exit 0; PERFORMANCE has the four measured lines with marks plus the informational BERT line, the decision and the Lighthouse explanation; HARDENING has date, command and outcome per check and the audit decision).

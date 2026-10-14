---
phase: 03-harden-release
plan: 06
subsystem: release
tags: [release, gate, gitleaks, squash-merge, github-pages]
requires: ["03-02", "03-03", "03-04", "03-05"]
provides:
  - "Passing local gate record under the production base"
  - "Single 'Phase 3: Harden & Release' commit on main (f72eb4e), tree identical to the phase branch"
affects: [03-07, 03-08]
key-files:
  created: [.gitleaksignore]
  modified:
    - scripts/measure-bundle.mjs
    - .planning/phases/03-harden-release/03-PUBLISH-LOG.md
key-decisions:
  - "gitleaks false positive on a byte-count line fixed with an inline allow plus a .gitleaksignore fingerprint for the earlier branch commit (D-16)"
requirements-completed: []
status: complete
tasks_complete: 3
tasks_total: 3
commits: 3
plan_head_before: 5b222ca61bc060c1d8d59d216dc5b5a21f1c54ec
plan_head_after: b66061b
actuals:
  tasks: 2
  commits: 3
duration: ~25 min
completed: 2026-10-14
---

# Phase 3 Plan 06: Local gate, squash-merge, repository handoff Summary

The full local gate passed on the phase branch under the production base, Phase 3 is one commit on main with a tree identical to the branch and clean scans, and the author created the public repository brunocu/tokens-explained (Pages source unconfirmed by the user).

## Status

All three tasks are done. Task 3 (`checkpoint:human-action`) is complete: the author replied "created https://github.com/brunocu/tokens-explained". The author did not say whether the Pages source shows "GitHub Actions", so that setting is **unconfirmed by the user**; plan 03-07 must verify it before the push. FOUND-01 is not re-marked: REQUIREMENTS.md already lists it Complete for the static build, and its deployed verification belongs to plan 03-07. `commits: 3` counts the executor's commits (`33974b6`, `23e1106`, `b66061b`); `f72eb4e` is the author's squash commit. `plan_head_before..HEAD` is not a valid range on main after the squash, so the count is by listing.

## Accomplishments

- **Gate (Task 1):** check:deps, check:repo, vitest (818 tests), check, check:svelte, build, check:dist, check:base, Playwright on chromium, firefox and webkit (775 passed, 2 skipped, 0 failed), gitleaks git (280 commits) and dir: GATE-OK on `33974b6`.
- **Squash (Task 2):** `f72eb4e` "Phase 3: Harden & Release" sits on the six baselines (7 commits), one identity (`brunocu@msn.com`), `git diff --quiet f72eb4e gsd/phase-3-harden-release` exits 0, no remote, gitleaks git (282 commits) and dir clean after the merge. The publish log records it (`b66061b`).

## Task Commits

| Task | Commit | Notes |
|------|--------|-------|
| 1 | 33974b6 | fix: gitleaks false positive in the bundle self-test |
| 1 | 23e1106 | docs: pre-merge gate results in the publish log |
| 2 | f72eb4e | The squash commit, made by the author (executor's attempt was denied by the permission system) |
| 2 | b66061b | docs: squash hash and post-merge scans in the publish log |

## Deviations from Plan

**1. [Rule 1 - Bug] gitleaks generic-api-key false positive**
- **Found during:** Task 1 (first gate run, `gitleaks git`)
- **Issue:** `scripts/measure-bundle.mjs` line 170 (`wide.tokenizer.gzip = LIMITS.initialWithGpt2 + 1;`, commit `36c19af`) matched because the property name contains "token". It is a byte-count limit in a self-test.
- **Fix:** inline `gitleaks:allow` on the line, and `.gitleaksignore` with the fingerprint of the same line in `36c19af` (history scans read old commits). Whole gate re-run from the start.
- **Files modified:** scripts/measure-bundle.mjs, .gitleaksignore
- **Commit:** 33974b6

**2. [Process] Squash commit made by the author**
The executor's `git commit` on main was denied by the auto-mode classifier; the author ran it. Executor verified the result afterwards (tree, count, identity, scans).

**Total deviations:** 1 auto-fixed (1 bug), 1 process note. **Impact:** none on scope; `.gitleaksignore` now ships in the repository and holds one stale-looking fingerprint for a commit that exists only locally.

## Known Stubs

None.

## Threat Flags

None.

## Next

Plan 03-07: read back the remote, check that the repository is empty and that Pages shows "GitHub Actions" (unconfirmed by the user), add the remote, dry-run, push `main` only.

## Self-Check: PASSED

- `.gitleaksignore`, `scripts/measure-bundle.mjs`, `03-PUBLISH-LOG.md` exist; commits 33974b6, 23e1106, f72eb4e, b66061b exist on the local repository.

---
phase: 03-harden-release
plan: 07
status: complete
requirements: [FOUND-01]
---

# Plan 03-07 summary: publish main and first deployment

Post 1 is live at https://brunocu.github.io/tokens-explained/, deployed by a passing test-then-deploy run. Only `main` was pushed.

## What happened

- **Task 1:** `origin` was added and read back as `https://github.com/brunocu/tokens-explained.git` (SSH was rejected, so the author chose HTTPS). `git ls-remote --heads` printed nothing; the dry run showed `main -> main` only.
- **Task 2:** the author answered "go".
- **Task 3:** the first run (38601720497) failed in `npm run test:e2e`: the `@languages` failed-state layout test, column 2 spilling 12px past the card in all three browsers, because the runner's fallback fonts are taller than the dev shell's. Fixed on `main` with a normal commit (`d5ccf30`, `--widget-h` 1136px to 1200px). The second run (38605524896) passed both jobs. Live checks returned 200 for `/`, `/what-is-a-token/`, `/favicon.svg`, `/tokenizers/gpt2.json` and an `_astro` asset.

## Deviations

- The e2e failure was a real layout defect that only showed on the runner (found through the author's `test-results.zip`, since job logs need a login). The D-08 `.nojekyll` contingency was not needed.
- `test-results.zip` in the project root is the author's download, left untracked and uncommitted.

## Evidence

Run ids, durations, live responses and the remote ref list are in `03-PUBLISH-LOG.md`.

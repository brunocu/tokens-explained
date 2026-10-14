---
phase: 03-harden-release
plan: 04
subsystem: release
tags: [github-actions, github-pages, gitleaks, playwright, runbook]
requires:
  - phase: 03-harden-release
    provides: "03-02 base-aware favicon and licences; 03-01 decisions (single gating build job, report-only budget)"
provides:
  - "Test-then-deploy GitHub Pages workflow (push to main and manual start only)"
  - "gitleaks 8.30.1 in the dev shell, flake.lock untouched"
  - "E2E_BASE_URL remote-base mode for the one-off live smoke run"
  - "Local-squash release runbook replacing the pull-request ship flow"
affects: [03-05, 03-06, 03-07, 03-08, release]
commits: 4
plan_head_before: b7c6a6d803af98fdab4c486c73ab713356326b23
plan_head_after: 4cbcca0794e01f9a6f8d76ff5dce5ad80133b9de
actuals:
  tokens: 3600
  tasks: 3
  commits: 4
tech-stack:
  added: []
  patterns:
    - "CI guard variables derived at run time: PLAYWRIGHT_BROWSERS_PATH from the Playwright cache dir, PLAYWRIGHT_NIX_VERSION from package.json, so check-env compares real values on a non-Nix runner"
    - "Single build: the test job builds once, tests that dist and uploads the same dist as the Pages artifact"
key-files:
  created:
    - .github/workflows/deploy.yml
    - .planning/phases/03-harden-release/03-RELEASE-RUNBOOK.md
  modified:
    - flake.nix
    - playwright.config.ts
key-decisions:
  - "Workflow layout follows 03-DECISIONS.md: one gating test job that builds once and uploads the tested dist; no withastro/action, so no second npm install and rebuild"
  - "gitleaks action pinned to the same gitleaks version as the dev shell through GITLEAKS_VERSION 8.30.1 (the action's own default is 8.24.3)"
  - "Budget decision is report only, so the workflow holds only a comment marking where a budget step could go"
requirements-completed: [FOUND-01]
duration: 10 min
completed: 2026-10-14
status: complete
---

# Phase 3 Plan 04: Deploy workflow, gitleaks, remote-base mode and release runbook Summary

**A deploy workflow whose test job (gitleaks action, every guard, full three-browser Playwright suite on a non-Nix runner) gates a Pages deploy that alone holds the write permissions, plus gitleaks in the dev shell, an `E2E_BASE_URL` mode, and a no-PR squash-merge runbook.**

## Accomplishments

- **Workflow (tracer, Task 1).** `.github/workflows/deploy.yml` triggers on push to `main` and `workflow_dispatch` only. Workflow-level `permissions: contents: read`, concurrency group `pages` (no cancel), `SITE_URL=https://brunocu.github.io` and `SITE_BASE=/tokens-explained` at workflow level. Test job (30 min ceiling): checkout with `fetch-depth: 0` and `persist-credentials: false`, setup-node 24 with explicit `cache: npm`, `npm ci`, gitleaks action, `check:deps`, `check:repo`, `check`, `check:svelte`, `test`, `build`, `check:dist`, then the Playwright guard variables through `GITHUB_ENV`, `npx playwright install --with-deps` (all default browsers), `npm run test:e2e`, an on-failure `upload-artifact` of `test-results`, and `upload-pages-artifact` of `dist`. Deploy job: `needs: test`, only on `refs/heads/main`, job-level `contents: read`, `pages: write`, `id-token: write`, environment `github-pages` with the `page_url` output, `actions/deploy-pages@v5`.
- **Dev shell and remote mode (Task 2).** `pkgs.gitleaks` added next to `pkgs.nodejs_24` with a comment (version 8.30.1, same as CI). `playwright.config.ts`: when `E2E_BASE_URL` is set it is normalised to end in a slash and used as `use.baseURL`, and `webServer` is `undefined`; otherwise unchanged. A rule comment says the mode is for the one-off live run and is not used in CI.
- **Runbook (Task 3).** `03-RELEASE-RUNBOOK.md`: why `/gsd-ship` is not used and what replaces each of its steps, the per-phase flow (branch, small commits, full gate, `git merge --squash`, push main only, watch, spot check), the first-release steps in order (create repository, Pages source, add and read back the remote, empty `ls-remote`, `push --dry-run`), the full local gate command, a never list (force-push after publishing, pushing tags, `--all` or `--mirror`, deleting the archive tag or bundle), and notes on local milestone tags, pre-squash hashes, the 10-minute Pages cache and the later `branching_strategy` flip (plan 03-08).

## Task Commits

1. Task 1 (tracer): `030d53b` feat(03-04): add test-then-deploy GitHub Pages workflow
2. Task 1 follow-up: `db39dea` docs(03-04): note the first-push limit of the gitleaks action in the workflow
3. Task 2: `6efe6c4` feat(03-04): add gitleaks to the dev shell and an E2E_BASE_URL remote mode
4. Task 3: `4cbcca0` docs(03-04): add local-squash release runbook replacing the ship flow

## Verification

- **actionlint** 1.7.12 from the pinned nixpkgs revision `c59305bab2065cfecc4944690d9eedbb56f3a9fa`: clean (also after the comment edit).
- **Structure check** (Task 1 node script): `WORKFLOW-STRUCTURE-OK`. Extra checks run by hand: every `uses:` is an allowed owner at a `@v<number>` tag, no `GITLEAKS_LICENSE`, `fetch-depth: 0` present, and the step order is gitleaks, check:deps, check:repo, check, check:svelte, test, build, check:dist, playwright install, test:e2e, upload-pages-artifact.
- **Production-environment replay:** `check:deps` OK, `check:repo` OK (48 files), `build` OK (2 pages), `check:dist` OK (4 files, 38 URLs, base `/tokens-explained`).
- **Local gitleaks** (8.30.1): `gitleaks git` (268 commits, no leaks) and `gitleaks dir` (no leaks).
- **Task 2:** `gitleaks version` 8.30.1 in `nix develop`; `git diff --exit-code flake.lock` clean; `check:env` OK; with `E2E_BASE_URL=http://localhost:4430/tokens-explained/` against an already running preview, `smoke.spec.ts` and `favicon.spec.ts` passed 5/5 on chromium; without the variable `favicon.spec.ts` passed 1/1 (local server started as before).
- **Task 3:** `RUNBOOK-OK`.
- **Action versions checked 2026-10-14** with `git ls-remote --tags`: checkout v7, setup-node v7, upload-pages-artifact v5, deploy-pages v5, upload-artifact v7, gitleaks-action v3. The Astro GitHub Pages guide (fetched from the withastro/docs source) shows checkout v7, deploy-pages v5 and the `github-pages` environment, matching.
- Not run: the workflow itself (it cannot run until it is pushed in plan 03-07), and the full three-browser suite (a pre-merge step in plan 03-06).

## Deviations from Plan

None to the plan's tasks. Two judgement calls worth knowing:

**1. [Finding] The gitleaks action scans nothing on the very first push.** The action v3 source scans `<first commit in the push>^..<last commit>` on a push; on the first push the first commit is the root, so the range is invalid. Reproduced locally with the same gitleaks arguments: git reports an unknown revision, gitleaks prints "0 commits scanned" and exits 0, so the step passes without scanning. Not changed in the workflow (the plan fixes the action as the scanner and forbids other third-party steps); instead the workflow carries a comment and the runbook states that the local `gitleaks git` and `gitleaks dir` before the first push cover the first publish, and that a manual start of the workflow makes the action scan the whole history. Commit `db39dea`, `4cbcca0`.

**2. [Rule 2 - Missing critical] `GITLEAKS_VERSION` set to 8.30.1.** The action's built-in default is 8.24.3, older than the dev shell's 8.30.1, so CI and local scans would have used different rules. Setting the variable (not a secret) keeps both on one version. Also set `GITLEAKS_ENABLE_COMMENTS` to false because there are no pull requests. Commit `030d53b`.

Process note: the Task 2 verify command writes its pid file under `/tmp` and exits before killing the preview if the test fails; I ran an equivalent with the pid file in the session scratchpad and a guaranteed kill.

## Notes for later plans

- Plan 03-05: the workflow has a comment at the position after `check:dist` where a budget step would go; per the budget decision (report only) nothing is wired.
- Plan 03-06 runs the full gate from the runbook (section 4), including `check:base` and the three-browser suite with `E2E_PORT=4433`.
- Plan 03-07 depends on Pages source being GitHub Actions before the first push, or the deploy step fails with a 404.
- The CI test job relies on `PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright` containing `chromium-1243`, `chromium_headless_shell-1243`, `firefox-1543`, `webkit-2359` and `ffmpeg-1011`, the names `check-env` derives from `browsers.json`. Playwright's own installer uses these directory names, but this can only be confirmed on the first runner run. If the guard reports a missing revision there, read its message before changing anything.
- The first run also depends on a Fontsource fetch at build time (research Pitfall 5); a failed build there means no deploy, and a manual re-run fixes it.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-03-03, T-03-04, T-03-15 are mitigated as planned (allowed actions only at major tags, no pull-request trigger, write permissions on the deploy job only, no stored secrets, persist-credentials false, secret scans local and in CI, with the first-push limit documented above). No npm package was added.

## Self-Check: PASSED

Created and modified files exist (`.github/workflows/deploy.yml`, `flake.nix`, `playwright.config.ts`, `03-RELEASE-RUNBOOK.md`); commits 030d53b, 6efe6c4, db39dea and 4cbcca0 are in the log.

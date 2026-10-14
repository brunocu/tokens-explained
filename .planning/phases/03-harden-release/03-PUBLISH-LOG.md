# Phase 3: History squash and publish log

## Squash record

- **Date:** 2026-10-13
- **Run by:** the author, from a terminal in the repository root (the executor agent's run was denied by the permission system; the script and arguments were the ones rehearsed in Task 1 of plan 03-01).
- **Identity used:** name `brunocu`, email `brunocu@msn.com` (author and committer, all six commits).
- **Lock file decision:** `.planning/milestone.lock` untracked (`git rm --cached`) and listed in `.gitignore` (commit 0116362).
- **Script:** `scripts/publish-squash.sh`

## Old-to-new hash map

| Old commit | New commit | Title |
|------------|------------|-------|
| 1588263 | a9db60c | Baseline: project setup, research and roadmap |
| b26685a | 7837c35 | Phase 1: Foundation and token playground |
| 0d669b2 | 73596d6 | Phase 2: BPE stepper and real-tokenizer comparison |
| 50fc088 | d806890 | Phase 2.1: Replace the toy tokenizer with GPT-2 |
| ec44a26 | 51cbaa5 | Phase 2.2: Rework widgets |
| 0116362 | 0b9ead3 | Phase 3 planning: MVP pivot and phase context |

Tree of `main` and of `archive/pre-publish`: `989f84d50b9a158f5bcffd48b18d1e740cf6aea8` (identical).

## Archive

- **Tag (local only):** `archive/pre-publish` at `0116362` (the detailed pre-squash tip, 249 commits).
- **Bundle (outside the repository):** `/home/nixos/repos/tokens-explained-pre-publish.bundle`
- **Bundle sha256:** `04084618743cdea105c21d9ba279d8727b2ae802a37f7fe64450b18eb91bdd9e`
- `git bundle verify` passes ("The bundle records a complete history").
- Restore the detailed history before publishing: `git reset --hard archive/pre-publish`.

## Scan results

- `gitleaks git --no-banner --redact .`: no leaks found (254 commits scanned, includes the archive tag history).
- `gitleaks dir --no-banner --redact .`: no leaks found.
- gitleaks 8.30.1 from the pinned nixpkgs revision `c59305bab2065cfecc4944690d9eedbb56f3a9fa`.

## Verification (2026-10-13)

- `git rev-list --count main` is 6.
- One distinct author and committer email: `brunocu@msn.com`.
- `git remote` prints nothing; nothing has been pushed.
- Phase work continues on `gsd/phase-3-harden-release`, created from the rewritten `main`.

## Notes

- **Pre-squash hashes (Pitfall 10).** `STATE.md`, the SUMMARY files and other planning documents mention commit hashes from before the squash. Those hashes exist only in `archive/pre-publish` and in the bundle, not in the published history. Use the map above to translate a boundary hash. The commits made by plan 03-01 itself (ee0b44b, 0116362) are inside the squashed "Phase 3 planning" commit.
- **Stray branch.** The local branch `worktree-agent-ac842b555a9311e5e` is inside the bundle and must never be pushed.

## Pre-merge gate (2026-10-14, plan 03-06)

- **Commit gated:** `33974b65ba861bfc0fdf937b1148f60e535084ff` on `gsd/phase-3-harden-release` (clean working tree). The gate that starts this section is the second run; see "First run" below.
- **Environment:** inside `nix develop`, `SITE_URL=https://brunocu.github.io`, `SITE_BASE=/tokens-explained`, `E2E_PORT=4433`.
- **Commands, in the workflow's order, all exit 0:** `npm run check:deps`, `npm run check:repo` (48 files scanned), `npx vitest run` (19 files, 818 tests passed), `npm run check`, `npm run check:svelte`, `npm run build`, `npm run check:dist`, `npm run check:base` (non-root-base proof), `npm run test:e2e`, `gitleaks git --no-banner --redact .`, `gitleaks dir --no-banner --redact .`. Final line: GATE-OK.
- **Playwright (chromium, firefox, webkit, base `/tokens-explained`):** 775 passed, 2 skipped, 0 failed, in 3.1 minutes. The research baseline was 772 passed and 2 skipped; the three extra tests come from the plan 03-05 additions.
- **gitleaks:** `git` scan 280 commits (all refs, including `archive/pre-publish`), no leaks found; `dir` scan, no leaks found. gitleaks 8.30.1.
- **First run (same day, tip `5b222ca`):** every step passed up to the secret scan, where `gitleaks git` reported one finding: rule `generic-api-key` on `scripts/measure-bundle.mjs` line 170 (`wide.tokenizer.gzip = LIMITS.initialWithGpt2 + 1;`), from commit `36c19af` (plan 03-05). It is a false positive: a byte-count limit plus one in the bundle self-test, matched because the property is named `tokenizer`. Fix (commit `33974b6`, decision D-16: incorrect or unusable is fixed here): an inline `gitleaks:allow` on the line, and a `.gitleaksignore` entry for the same line as it appears in the earlier phase-branch commit, because a history scan reads that commit and a later fix cannot change it. The whole gate was then re-run from the start.

## Standing rule

Only `main` is ever pushed, with `git push origin main` after a `git push --dry-run origin main`. Never `--all`, `--mirror` or `--tags`: they would publish `archive/pre-publish` and the stray branch (T-03-06).

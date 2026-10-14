---
phase: 03-harden-release
plan: 01
subsystem: infra
tags: [git, history-squash, gitleaks, release]
status: complete

requires:
  - phase: 02.2-rework-widgets
    provides: the finished site and the five phase-boundary commits that become the squashed history
provides:
  - scripts/publish-squash.sh, a repeatable commit-tree squash with tree-equality check, archive tag, bundle and gitleaks scans
  - local main rewritten to six baseline commits with a single public identity
  - archive/pre-publish tag and a verified off-repo bundle of the detailed history
  - 03-DECISIONS.md and 03-PUBLISH-LOG.md
  - branch gsd/phase-3-harden-release checked out for the rest of Phase 3
affects: [03-04, 03-05, 03-06, 03-07, 03-08]

actuals:
  tokens: 5000
  tasks: 3
  commits: 3
plan_head_before: c1b9d882c6eebc712dbd3b2abdafcce12cd481ac
plan_head_after: 19bfb2f

tech-stack:
  added: []
  patterns: ["publish history by tree (commit-tree per boundary), never by rebase", "archive the detail locally (tag plus off-repo bundle), push main only"]

key-files:
  created:
    - scripts/publish-squash.sh
    - .planning/phases/03-harden-release/03-DECISIONS.md
    - .planning/phases/03-harden-release/03-PUBLISH-LOG.md
  modified:
    - .gitignore

key-decisions:
  - "Publishing identity is brunocu / brunocu@msn.com (the real address), chosen explicitly by the author knowing it becomes permanently public"
  - ".planning/milestone.lock is untracked and ignored"
  - "Deploy workflow will be one gating build job that uploads the exact tested dist"
  - "Performance budget is report only; playground keeps client:load"

patterns-established:
  - "Squash by tree: git commit-tree on each boundary tree, abort before any ref moves unless the final tree equals the old tip's tree"

requirements-completed: [FOUND-01]

duration: about 75min (including two checkpoints)
completed: 2026-10-13
---

# Phase 3 Plan 1: History squash before the first push Summary

**Local main rewritten from 249 commits to six per-phase baseline commits (identical tree, one public identity, gitleaks clean), with the detailed history kept in a local tag and an off-repo bundle, and Phase 3 moved to its own branch.**

## Accomplishments

- `scripts/publish-squash.sh` was rehearsed end to end in a scratch clone (6 commits, equal tree, verified bundle, clean gitleaks, usage error without PUBLISH_EMAIL) before the real repository was touched.
- The author's answers to the decision checkpoint were recorded in `03-DECISIONS.md`.
- `milestone.lock` was untracked and ignored, so the tree no longer goes dirty every session.
- The real squash gave six commits (a9db60c ... 0b9ead3). `main^{tree}` equals `archive/pre-publish^{tree}` (989f84d5...), and every author and committer email is `brunocu@msn.com`.
- The bundle is at `/home/nixos/repos/tokens-explained-pre-publish.bundle` (verified, sha256 `04084618...bdd9e`). No remote is configured and nothing was pushed.
- gitleaks (8.30.1) found no leaks in the history (`git`) or the working tree (`dir`).
- Work continues on `gsd/phase-3-harden-release`.

## Task Commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Rehearse the squash in a scratch clone | ee0b44b (pre-squash; now only in the archive) |
| 2 | Decision checkpoint | none (answered by the author) |
| 3 | Record decisions, untrack lock file | 0116362 (pre-squash; now only in the archive) |
| 3 | Publish log on the phase branch | 19bfb2f |

`commits: 3` counts these three plan commits. It is not `git rev-list --count c1b9d88..HEAD`, because the squash replaced the history under c1b9d88. That commit is reachable only through `archive/pre-publish` and the bundle (Pitfall 10).

## Files Created/Modified

- `/home/nixos/repos/tokenizer-vis/scripts/publish-squash.sh` - the squash script
- `/home/nixos/repos/tokenizer-vis/.planning/phases/03-harden-release/03-DECISIONS.md` - the five decisions
- `/home/nixos/repos/tokenizer-vis/.planning/phases/03-harden-release/03-PUBLISH-LOG.md` - hash map, archive locations, scan results, rules
- `/home/nixos/repos/tokenizer-vis/.gitignore` - adds `.planning/milestone.lock`

## Decisions Made

See `03-DECISIONS.md`. Identity brunocu / brunocu@msn.com; lock untracked; single gating build job; report-only budget; `client:load`.

## Deviations from Plan

### Execution deviations

**1. Squash run by the author, not the executor**
- **Found during:** Task 3 step 4
- **Issue:** The permission system denied the executor's run of the history rewrite (`git reset --hard` inside the script) as destructive.
- **Resolution:** I stopped and reported. The author ran the same command (same script, same arguments, `--bundle ../tokens-explained-pre-publish.bundle`) from a terminal. I then did steps 5 to 7: verification, the branch and the publish log. I did not re-run the squash.

**2. [Rule 1 - plan text] Commit counts differ from the plan text**
- The plan says 242 commits. The repository had 247 at the start, 249 at the archive tip (pre-squash plan commits included). The script checks the tree dynamically, so there was no effect.

**3. Pre-squash hashes in this plan's commits**
- Task 1 and Task 3's decision commit are inside the squashed "Phase 3 planning" commit. Their hashes (ee0b44b, 0116362) exist only in the archive.

Otherwise the plan was executed as written.

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None. The mitigations for T-03-01, T-03-05, T-03-06 and T-03-09 were applied: explicit decision, squash before push, gitleaks, bundle outside the repo, no remote, single identity. The real email address is published by the author's explicit choice (T-03-09 accepted).

## Notes for later plans

- Any `commits:` hash or SUMMARY reference to a pre-squash commit (including STATE.md and earlier phases' SUMMARY files) resolves only in `archive/pre-publish` or the bundle. The map is in `03-PUBLISH-LOG.md`.
- Only `main` is ever pushed: `git push --dry-run origin main` first, then `git push origin main`. The stray branch `worktree-agent-ac842b555a9311e5e` and the archive tag must never be pushed.

## Self-Check: PASSED

- scripts/publish-squash.sh, 03-DECISIONS.md, 03-PUBLISH-LOG.md: present.
- Commits 19bfb2f, 0b9ead3, 51cbaa5 and the archive tag: present.
- Six commits on main, tree equal to the archive, one email, no remote, bundle verifies, current branch `gsd/phase-3-harden-release`.

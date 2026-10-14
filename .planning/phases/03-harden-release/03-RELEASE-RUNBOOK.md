# Release runbook: local squash-merge, no pull requests

Written for plan 03-04 (decision D-04). The author and the later plans follow this list instead of `/gsd-ship`. Plans 03-06 and 03-07 read it step by step, and later phases reuse the per-phase flow.

Everything below runs on the author's machine inside the dev shell (`nix develop`), except the one workflow that GitHub runs after the push.

## 1. Why the ship command is not used

`/gsd-ship` is built around a pull request: it pushes the work branch, opens a pull request, runs a review and prepares the merge on GitHub. This project has decided on no pull requests (D-04) and no CI run on work branches (D-09). Phase branches are never pushed, so there is nothing for a pull request to be opened from.

What replaces each part of it:

| What the ship command does | What we do instead |
|----------------------------|--------------------|
| Push the work branch to GitHub | Nothing. The phase branch stays on this machine. |
| Run checks through the pull request | Run the full local gate (section 4) on the phase branch before merging. |
| Open a pull request with a generated description | Write one squash commit on `main` titled "Phase N: Name" with a short list of what the phase delivered. |
| Review before merge | The phase verification and the code review still run on the branch (`/gsd-verify-work`, `/gsd-code-review`) before the merge. |
| Merge through GitHub | `git merge --squash` on `main`, locally. |
| (Implicit) CI on the pull request | The workflow runs on the push of `main`, and its test job must pass before anything is deployed. |

The `ship.pr_body_sections` setting in `.planning/config.json` stays unused.

## 2. Per-phase flow

1. Start from a clean `main` and create the phase branch: `git switch -c gsd/phase-N-slug` (the template is `gsd/phase-{phase}-{slug}`). Until plan 03-08 flips `git.branching_strategy` to `phase`, GSD does not create this branch for you, so create it by hand.
2. Work on the branch in small GSD commits. Do not commit on `main`, with two exceptions: the squash commit and the docs follow-ups that record it.
3. Before merging, run the full local gate (section 4). CI does not run on phase branches (D-09), so this is the only test run before the code reaches `main`.
4. Squash-merge on `main`:
   ```bash
   git switch main
   git merge --squash gsd/phase-N-slug
   git commit -m "Phase N: Name" -m "<short list of what the phase delivered>" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
   ```
   The squash commit uses the publishing identity recorded in `03-DECISIONS.md` (brunocu, brunocu@msn.com). Check with `git config user.email` first. The last `-m` is the session trailer. Do not delete the phase branch: the detailed history stays local.
5. Check that the squash commit has the same tree as the branch: `git diff --quiet main gsd/phase-N-slug` prints nothing and exits 0. Run both `gitleaks` scans again on `main` (section 4).
6. Push `main` only (section 3 for the first release, `git push origin main` afterwards, always after a `git push --dry-run origin main`).
7. Watch the workflow run on the Actions tab. When it is green, open the live page and spot-check it. A deploy can look stale for up to 10 minutes (see the notes in section 6).
8. Record the result in `03-PUBLISH-LOG.md` (or the phase's own log), commit it on `main` as a docs-only follow-up and push it. That push starts a second run; wait for it to go green too.

## 3. First release only (plan 03-07 and the repository step of plan 03-06)

In this order:

1. Create the empty public repository `brunocu/tokens-explained` on GitHub under the personal account `brunocu` (not an organization: the gitleaks action needs no licence key only for personal accounts). Do not add a README, licence or `.gitignore` there, so the repository stays empty.
2. In the repository settings, open Pages and set the source to GitHub Actions. If this is skipped, the deploy step fails with a 404 when it creates the deployment.
3. Add the remote and read it back:
   ```bash
   git remote add origin git@github.com:brunocu/tokens-explained.git
   test "$(git remote get-url origin)" = "git@github.com:brunocu/tokens-explained.git" && echo REMOTE-URL-OK
   ```
4. Check that the remote is empty: `git ls-remote --heads origin` must print nothing.
5. Check what a push would send: `GIT_TERMINAL_PROMPT=0 git push --dry-run origin main`. Read the list of refs. It must name `main -> main` and nothing else.
6. Only after the go decision: `git push -u origin main`. Nothing else is pushed, ever.
7. Watch the first run. After it is green, run the one-off live smoke check inside the dev shell (decision D-08):
   ```bash
   nix develop --command bash -c 'E2E_BASE_URL=https://brunocu.github.io/tokens-explained/ npm run test:e2e -- --project=chromium e2e/smoke.spec.ts e2e/privacy.spec.ts e2e/post.spec.ts e2e/a11y.spec.ts e2e/favicon.spec.ts'
   ```
   `E2E_BASE_URL` makes the specs use that address and start no local server. If `_astro` files return 404 on the live site, add `public/.nojekyll` and set `include-hidden-files: true` on the `upload-pages-artifact` step (D-08).

## 4. The full local gate

Run it on the phase branch before the squash-merge, and the two `gitleaks` commands again on `main` after it. The sequence is the one proven in Phase 2.2 with the production address added and the secret scans at the end. The port is a spare one so a running preview does not collide.

```bash
nix develop --command bash -c 'set -e; export SITE_URL=https://brunocu.github.io SITE_BASE=/tokens-explained E2E_PORT=4433; npm run check:deps && npm run check:repo && npx vitest run && npm run check && npm run check:svelte && npm run build && npm run check:dist && npm run check:base && npm run test:e2e && gitleaks git --no-banner --redact . && gitleaks dir --no-banner --redact . && echo GATE-OK'
```

`test:e2e` takes about 4 minutes and runs all three browsers. Everything must pass. If a step fails, fix the cause with a normal commit on the branch and run the whole gate again; do not skip a step.

## 5. Never

These are the rules that protect the private parts of the history and the permanent address.

- Never force-push after the first publish. Published history is never rewritten (D-03). Fix mistakes with a new commit.
- Never push tags. No `--tags`, no `git push origin <tag>`. The local tag `archive/pre-publish` holds the detailed history and must stay local.
- Never push all refs or mirror the repository: no `--all`, no `--mirror`. They would publish the archive tag and the stray branch `worktree-agent-ac842b555a9311e5e`.
- Never push a phase branch, and never push anything but `main`.
- Never delete the archive tag `archive/pre-publish` or the bundle `/home/nixos/repos/tokens-explained-pre-publish.bundle` (its sha256 is in `03-PUBLISH-LOG.md`).
- Never run `git push` without reading the output of `git push --dry-run origin main` first.
- Never commit a secret, and never add a repository secret to the workflow: the automatic token is the only one it uses.
- Never rename the repository or change `SITE_BASE`: the path `/tokens-explained/` is permanent because Pages cannot redirect.

## 6. Things to know

- **Milestone tags.** `create_tag` in `.planning/config.json` is `true`, so completing a milestone creates a local tag. Those tags are local only and must never be pushed (see the never list).
- **Old commit hashes.** `STATE.md`, the SUMMARY files and the ROADMAP mention commit hashes made before the squash (and, after each later phase, hashes of branch commits). They refer to commits that exist only on the local branches, the archive tag and the bundle, not in the published history. The map from old to new hashes for the first squash is in `03-PUBLISH-LOG.md`.
- **Pages cache.** Pages serves every file with a 10-minute cache. A spot check right after a deploy can still show the previous HTML. Wait and reload before calling a deploy broken.
- **Branching setting.** `git.branching_strategy` in `.planning/config.json` is flipped to `phase` at the end of Phase 3 (plan 03-08), not before. Until then, create the branch by hand as in section 2.
- **Workflow limits.** The workflow runs on a push to `main` and on a manual start only. It builds once, tests that build in three browsers and deploys that same build only if the test job passes. The size budget is report only; it never stops a deploy.
- **Secret scan in CI.** On a push, the gitleaks action scans only the commits listed in that push (from the first listed commit's parent up to the last one). On the very first push that range starts before the root commit, which does not exist, so the action reports no error and scans nothing (checked locally with the same gitleaks arguments: "0 commits scanned", exit code 0). The local scan in section 4, run before the first push, is what covers the first publish. A manual start of the workflow (`workflow_dispatch`) makes the action scan the whole history, so use that if a full scan on the runner is ever wanted. The local gate also scans the working tree, which the action does not.

# Phase 3: Harden & Release - Research

**Researched:** 2026-10-13
**Domain:** Static-site release engineering (GitHub Pages sub-path deploy, CI, history publishing, secret scanning), release-time accessibility / performance / fact / reader checks for an Astro 7 + Svelte 5 post
**Confidence:** HIGH for CI, deploy, measurements and tooling (read from action sources or measured this session); MEDIUM for the per-platform manual-check procedures

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Repository and publishing**
- **D-01:** Repository is `brunocu/tokens-explained`. Site URL `https://brunocu.github.io/tokens-explained/`; `SITE_URL=https://brunocu.github.io`, `SITE_BASE=/tokens-explained` (owner lowercased). — **Reversibility:** one-way — GitHub Pages cannot 301-redirect, so the name becomes the public URL path and the Astro `base`.
- **D-02:** The repo is public and `.planning/` is kept in it (not excluded or untracked). — **Reversibility:** one-way — the first push publishes the history; forks and caches keep copies.
- **D-03:** Before the first push, the existing ~240 commits are squashed into per-phase baseline commits (Phase 1, 2, 2.1, 2.2, plus any foundation/baseline commit). The detailed history is preserved locally under a backup ref (for example the branch or tag `archive/pre-publish`). The squash happens before anything is pushed; never force-push after publishing. — **Reversibility:** one-way — after the first push, history is public.
- **D-04:** Ongoing workflow: work on a branch per phase with small GSD commits (enable `git.branching_strategy: "phase"`, template `gsd/phase-{phase}-{slug}`), and **squash-merge locally** into `main` (`git merge --squash`, one commit per phase, e.g. "Phase 3: Harden & Release"). No GitHub PRs. The local detailed branch history stays local. `allow_default_branch_commits` and GSD ship/complete flows must be checked against this (the planner decides how `/gsd-ship` fits, since it assumes PRs).
- **D-05:** Licence: MIT for code, CC BY 4.0 for prose/content. Third-party tokenizer notices stay in `public/tokenizers/NOTICE.md`. Add LICENSE files (code and content) and state the split in the README/footer.
- **D-06:** Secret scanning uses an existing tool (for example gitleaks), not the hand-written pattern list from the Phase 1 hand-off. Run it before the first push over the tracked files and the squashed history, and in CI. The researcher confirms the tool, its licence and how to install it in the Nix flake and the runner.

**CI and deploy**
- **D-07:** Workflow `.github/workflows/deploy.yml` triggers on push to `main` and `workflow_dispatch` only. A `test` job (install, `check:deps`, `check:repo`, `check`, `check:svelte`, `test`, `build`, `check:dist`, Playwright e2e, secret scan) **gates** the `deploy` job. `pages: write` and `id-token: write` only on the deploy job; workflow-level `contents: read`; no secrets; only official `actions/*` and `withastro/action` at major-version tags. Re-verify the current Astro deploy guide before writing it (https://docs.astro.build/en/guides/deploy/github/).
- **D-08:** No automated post-deploy live check (no `live:wait`, no live Playwright job in CI). Roadmap criterion 2 ("live URL passes the same smoke tests") is satisfied by a **one-off manual run** of the smoke checks against the live URL after the first deploy (and spot checks after later deploys). A `public/.nojekyll` is added only if the first live deploy shows `_astro` 404s.
- **D-09:** CI does not run on phase branches (they are never pushed for review); the full suite is run locally before the squash-merge.

**Performance**
- **D-10:** Initial-load size budget: **not preset.** The researcher measures `dist/_astro` and the lazy tokenizer chunks after the final build and proposes a budget (initial HTML/CSS/JS excluding lazily loaded tokenizers); the planner confirms it.
- **D-11:** Run Lighthouse (mobile profile, default throttling) on the built site as a **report only**: record scores, fix what is clearly bad, set no pass/fail score target. (The user asked what Lighthouse is; it is explained as Chrome's built-in auditing tool that scores Performance, Accessibility, Best Practices and SEO from 0 to 100.)
- **D-12:** "Typing sends no network request" is verified by a **one-off manual check** in browser devtools before release, not a permanent CI test. Mobile layout usable but secondary.

**Accessibility and manual checks**
- **D-13:** Manual checks the author will do: screen reader pass (stepper pair table, hidden sentences, References list, languages table, playground), colour-blind simulation (chips, stepper tie bars, comparison), and a real-phone check (glyph rendering for space, newline, tab, and the 360 px layout). Planner supplies a script/checklist for each.
- **D-14:** Dark mode, print preview and 200% zoom are not on the author's manual list; they get a lighter check (axe/Playwright in both colour schemes, print preview or CSS review, zoom via devtools) as the roadmap criterion requires.
- **D-15:** A manual check that cannot be performed is recorded as "not verified" in a known-limitations note and does not block release. Automated axe and keyboard tests still gate.
- **D-16:** Fix policy: issues that make the post unusable or incorrect for a reader are fixed in this phase; minor issues are decided case by case (fix or backlog).
- **D-17:** Inherited Phase 2 human checks still open: Arabic cross-check against OHCHR, notes-truth read of the five comparison notes and the languages note, glyph/outline/print checks, offline load of the comparison, own-text block by hand (Arabic, emoji, long English; light and dark; keyboard only), look of the languages table. They are folded into the checklist above.

**Fact re-verification**
- **D-18:** An automated research pass (subagent) re-opens every source: the 16 references, tokenizer licences and years (GPT-2 MIT, BERT Apache-2.0 never confirmed upstream), the UN reuse terms, quoted counts and repo names, and reports changed or dead items. The author reviews only the exceptions. OHCHR blocks scripts (403), so its terms and the Arabic cross-check stay manual.
- **D-19:** Dated facts are dated **inline in the post text** (each claim carries its own "as of" date), not in a separate sources/notices page. Update `public/tokenizers/NOTICE.md` and the manifest if licences differ, and keep the `scripts/check-dist.mjs` allowed-host list in step with References.
- **D-20:** Quoted token splits and counts are verified once now (re-run existing tests, spot-check); **no new build-time test** (FACT-02 stays in v2). Re-run `npm audit` at release; never `npm audit fix --force` (the known `http-cache-semantics` advisory is a build-time transitive dependency of astro).

**Reader testing**
- **D-21:** Two non-programmers read Post 1 **alone**, then answer a short questionnaire drafted by the planner. Feedback is **open** (what was confusing, what they would explain to a friend); no scored quiz.
- **D-22:** Deploy first, then test: readers use the real public site. Roadmap criterion 6 is closed by recording their confusion points as resolved or recorded; fixes ship as follow-up commits. Release does not wait for the readings.

### Claude's Discretion
- Exact squash grouping of the existing commits (one per completed phase is the intent), the name of the archive ref, README content, workflow job layout and caching, how to adapt GSD ship/complete steps to the local-squash flow, the gitleaks (or equivalent) integration details, and the form of the questionnaire and checklists.

### Deferred Ideas (OUT OF SCOPE)
- Build-time check of quoted splits (FACT-02) — stays in v2.
- Permanent CI guard for "typing sends no network request" — author chose a one-off manual check; could be added later.
- Automated live-URL checks in CI after each deploy — not wanted now.
- Lighthouse score targets and a performance budget gate — report only for now.
- Print and zoom as full manual passes — lighter checks only.
- Further gray areas not discussed: SEO/social metadata, a custom 404 page, analytics (none planned), release announcement.
- v1.1 content (embeddings, context, reasoning posts, hub, disambiguation, glossary) — see Deferred Phase Details in ROADMAP.md.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Reader can open the site as a static, deployed web page that works without any setup or account | Sections "CI and deploy pipeline", "Code Examples" (workflow), "Live verification procedure", and "Common Pitfalls" 1-4 (sub-path, favicon, Pages enablement, build env). The full e2e suite already passes under the real base `/tokens-explained` (measured below). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Extracted from `/home/nixos/repos/tokenizer-vis/.claude/CLAUDE.md` and the global `~/.claude/CLAUDE.md`. The planner must verify plans against these.

- Verify versioned interfaces (action versions, CLI flags, config schemas) against official current sources; never rely on training memory. (Done this session for every action and for gitleaks and Lighthouse; see Sources.)
- Edit and Write tools for file changes, never sed/awk/heredoc edits. Bash is for running commands only.
- GitHub Pages is a **project site served from a sub-path**: `site` and `base` must be set, and every link and asset URL (including `/tokenizers/...` fetches) must be base-aware. Re-verify the Astro deploy guide before writing the workflow (done).
- Deploy with GitHub Actions: `withastro/action` plus `actions/deploy-pages`. No adapter for a static site.
- `npm audit`: the flagged `http-cache-semantics` advisory is a build-time transitive dependency of astro. Re-check at project start; **never `npm audit fix --force`**.
- Pin `typescript@~6.0.3`. The dependency set is enforced by `scripts/check-deps.mjs` (exact allow-list): any new npm dependency needs a deliberate edit of `ALLOW` after a legitimacy review.
- `fetch('/tokenizers/...')` and browser APIs only inside `onMount` or on click; the repo lint `scripts/check-repo.mjs` bans `fetch(` everywhere under `src` except `src/components/loadTokenizer.ts`.
- Do not fetch Hugging Face Hub at reader runtime; tokenizer files are self-hosted in `public/tokenizers/` with a manifest.
- Do not use `<ClientRouter />`, a charting library, or real model inference.
- GSD workflow enforcement: file changes go through a GSD command (`/gsd-execute-phase` for planned phase work).
- Tests run inside the Nix dev shell: `nix develop --command bash -c '...'`.

## Summary

The site is already release-ready as a build: all guards pass at HEAD (`check:deps`, `check:repo`, `check:env`, `astro check` 0 errors, `svelte-check` 0 errors, vitest) and, this session, the **entire Playwright suite passed under the production base** (`SITE_URL=https://brunocu.github.io SITE_BASE=/tokens-explained`, three browsers, 772 passed, 2 skipped, 3.1 minutes with `CI=1`). `check:dist` passes under that base (36 URLs scanned). The remaining work is therefore mostly **release plumbing and human verification**, not new product code: a deploy workflow, a non-Nix CI environment for the existing Playwright guard, a safe one-way history publish (squash plus secret scan), licences, a favicon, a performance measurement record, a fact re-verification pass, and the manual/reader checklists.

Three things need the planner's attention because they are not in CONTEXT.md. (1) The site has **no favicon**: real Chrome requests `/favicon.ico`, which on a project site hits the root of `brunocu.github.io` (a 404) and Lighthouse reports it as a console error (Best Practices 96, not 100). Playwright's headless Chromium does not request it, so the existing "no console errors" smoke test cannot catch it. (2) `withastro/action@v6` runs `npm install` (not `npm ci`) and rebuilds; the recommended layout builds **once** in the gating `test` job with the production env and uploads that exact `dist` with `actions/upload-pages-artifact@v5`, so the deployed bytes are the tested bytes. (3) The post has **26 references**, not 16 (CONTEXT D-18 says 16), plus the UDHR links, the tokenizer licence pages and the comparison fixture.

Measurements (gzip, as GitHub Pages serves it; Pages does not offer brotli): the page at load transfers 154 KB without the tokenizer file and 710 KB with `gpt2.json` (557 KB). Lighthouse 13.5.0 mobile on the production-base build scores Performance 99, Accessibility 100, Best Practices 96, SEO 100. A budget proposal is in "Performance budget".

**Primary recommendation:** Build once in a single gating `test` job (pinned gitleaks release binary, all existing guards, full Playwright run on a non-Nix runner via `PLAYWRIGHT_BROWSERS_PATH` and a derived `PLAYWRIGHT_NIX_VERSION`), upload `dist` as the Pages artifact from that job, deploy from a separate `deploy` job; publish history with a scripted `git commit-tree` squash (validated this session: 6 commits, identical final tree) plus `gitleaks git` over the result, and only then push `main` alone.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Static hosting, TLS, gzip, cache headers | CDN / Static (GitHub Pages) | — | Pages serves HTML, CSS, JS and JSON with `content-encoding: gzip` and `cache-control: max-age=600`; no brotli, no custom headers |
| Sub-path correctness (`site`, `base`) | Build (Astro config via `site.config.mjs`) | CDN / Static | All URLs are emitted at build time; `check:dist` verifies them. No runtime redirect is possible on Pages |
| Build, test and deploy gating | CI (GitHub Actions) | — | The only place where "tests pass, then deploy" can be enforced; local suite gates phase-branch work (D-09) |
| Secret scanning | Developer machine (pre-push) and CI | — | Pre-push covers the squashed history; CI covers every later push |
| Tokenization of reader text | Browser / Client | — | Unchanged. Privacy promise: typing sends no request (already a permanent test, see Pitfall 9) |
| Favicon / document head | Frontend build (`BaseLayout.astro`, `public/`) | CDN / Static | Browser requests the icon from the address in the `<link>`; without a link it asks the origin root |
| History publishing | Developer machine (git) | — | One-way operation done locally before first push |
| Reader testing, screen-reader, colour-blind, phone checks | Human (author, two readers) | — | Not automatable; recorded in a limitations note (D-15) |

## Standard Stack

This phase adds **no npm dependency** (and `check-deps` would reject one). It adds tooling outside `package.json`.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| `actions/checkout` | `@v7` (latest tag v7.0.1) | Fetch repo; `fetch-depth: 0` for the history scan | Official; matches the Astro guide [VERIFIED: git ls-remote tags 2026-10-13; CITED: docs.astro.build/en/guides/deploy/github/] |
| `actions/setup-node` | `@v7` (latest tag v7.1.0) | Node 24 with npm cache | Official; usage `node-version: 24`, `cache: 'npm'` [CITED: github.com/actions/setup-node README]. `package.json` has no `packageManager` field, so automatic caching is off and `cache: npm` must be explicit |
| `actions/upload-pages-artifact` | `@v5` | Package `dist` for Pages | Official; inputs `name`, `path` (required), `retention-days`, `include-hidden-files` (default false; excludes dotfiles such as `.nojekyll`) [VERIFIED: raw action.yml at tag v5] |
| `actions/deploy-pages` | `@v5` (v5.0.1) | Publish the artifact | Official; `pages: write` + `id-token: write` required, environment `github-pages` [VERIFIED: raw action.yml and README at tag v5] |
| gitleaks | **8.30.1** (MIT, released 2026-03-21, repo pushed 2026-09-30, not archived) | Secret scan of working tree and git history | Existing, maintained tool (D-06). nixpkgs at the flake's pinned revision `c59305b...` already provides `gitleaks` 8.30.1 with licence MIT [VERIFIED: `nix eval` of the pinned revision; GitHub API] |
| Lighthouse | 13.5.0 (Apache-2.0, node >=22.19), **one-off via `npx`, not added to package.json** | Report-only audit (D-11) | Google's own tool. Ran here against the Nix Chromium (see Performance) [VERIFIED: ran it] |
| `@axe-core/playwright` | 4.13.0 (already installed) | Automated WCAG 2.2 A/AA scans | Already gating in `e2e/a11y.spec.ts` (light and dark) |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `withastro/action` | `@v6` (v6.1.3) | Astro's documented build-and-upload action | Only if the planner prefers the literal Astro guide over the single-build layout. It runs `npm install` (not `npm ci`), then the build, then uploads `dist` with `include-hidden-files: true` [VERIFIED: raw action.yml on main] |
| `actions/upload-artifact` | `@v7` | Keep `test-results` / `playwright-report` when the suite fails | Optional, on failure only |
| Chrome DevTools (Rendering tab, Lighthouse panel) | current Chrome | Colour-blind simulation, print media, dark scheme, Lighthouse | Manual checks on the author's Windows Chrome (the WSL path seen in Lighthouse's temp dir suggests a Windows host, [ASSUMED]) |
| NVDA (free) or Windows Narrator | current | Screen-reader pass | Author's checklist (D-13) [ASSUMED: host OS inferred] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single build in the `test` job + `upload-pages-artifact` | `test` job, then a second `build` job with `withastro/action@v6`, then `deploy` | Matches the Astro guide literally (D-07 names `withastro/action`), but builds twice, uses `npm install` instead of `npm ci`, and the deployed output was never the one tested. Both satisfy D-07 (a `test` job gates `deploy`). **Recommend the single build.** |
| gitleaks release binary in CI | `gitleaks/gitleaks-action` | Not an official `actions/*` action, so excluded by D-07. The README of gitleaks did not state the action's licence terms in the fetched content, so treat as unverified |
| Lighthouse via `npx lighthouse@13.5.0` | `@lhci/cli` 0.15.1 (last published 2025-06-25) | Stale and adds a CI service concept D-11 does not want |
| Lighthouse CLI | Chrome DevTools Lighthouse panel or pagespeed.web.dev on the live URL | No install at all; best for the author and for D-11 "report only". Use the CLI only if numbers are wanted from the Nix machine |

**Installation (dev shell):** add `pkgs.gitleaks` to the `packages` list in `flake.nix` (`packages = [ pkgs.nodejs_24 pkgs.gitleaks ];`). The nixpkgs input revision is unchanged, so `flake.lock` and the Playwright pin are not disturbed (`check-env` stays valid). Until then: `nix shell github:NixOS/nixpkgs/c59305bab2065cfecc4944690d9eedbb56f3a9fa#gitleaks --command gitleaks ...` works (used this session).

**CI install (no Nix, no third-party action):**
```bash
curl -sSL -o gitleaks.tgz https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz
echo "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  gitleaks.tgz" | sha256sum -c -
tar -xzf gitleaks.tgz gitleaks
```
The checksum is the `linux_x64` line of `gitleaks_8.30.1_checksums.txt` from the same release [VERIFIED: downloaded 2026-10-13].

**Version verification:** actions via `git ls-remote --tags`, gitleaks via the GitHub releases API and `nix eval`, Lighthouse via `npm view` (13.5.0, modified 2026-10-13). Training data was not used for any version.

## Package Legitimacy Audit

No npm package is installed by this phase. External tooling:

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| gitleaks | GitHub release / nixpkgs (not npm) | multi-year | n/a | github.com/gitleaks/gitleaks | n/a (Go binary; MIT; sha256 pinned) | Approved; pin version and checksum |
| lighthouse | npm | multi-year; latest 13.5.0 published recently | ~5.3M/wk | github.com/GoogleChrome/lighthouse | `SUS` (seam reason: `too-new`, i.e. the latest version is recent; no postinstall, not deprecated) | **Flagged, one-off only.** Not added to `package.json`. The planner must put a `checkpoint:human-verify` before the first `npx lighthouse@13.5.0` run on a machine that matters |
| @lhci/cli | npm | stale (2025-06) | — | GoogleChrome/lighthouse-ci | not run | Not recommended |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `lighthouse` (one-off `npx` only; Google-maintained, widely used; the flag is recency)

## Architecture Patterns

### System Architecture Diagram

```
 developer machine (Nix shell)                         GitHub
 -----------------------------                         ------
 phase branch gsd/phase-N-slug                         repo brunocu/tokens-explained (public)
   small GSD commits, full local suite (D-09)            Settings > Pages > Source: "GitHub Actions" (human step)
        |
        | git merge --squash  (one commit per phase)
        v
   main  --(gitleaks git + gitleaks dir, pre-push)--> clean?
        |                                               no -> stop, fix, re-squash (before first push only)
        | git push origin main   (main only: never --all / --mirror / --tags)
        v
 ------------------------------------------------------------------------------------------
 workflow deploy.yml  (on: push main, workflow_dispatch)      permissions: contents: read
 ------------------------------------------------------------------------------------------
  job test  (ubuntu-latest, env SITE_URL, SITE_BASE)
    checkout (fetch-depth 0) -> setup-node 24 + npm cache -> npm ci
    -> gitleaks (pinned binary, sha256)  -> check:deps -> check:repo -> check -> check:svelte -> vitest
    -> build (production base) -> check:dist
    -> playwright install --with-deps  (PLAYWRIGHT_BROWSERS_PATH, PLAYWRIGHT_NIX_VERSION from package.json)
    -> npm run test:e2e  (astro preview serves the same dist under /tokens-explained/)
    -> upload-pages-artifact (path: dist)
        |
        | needs: test   (any failure here = nothing is deployed)
        v
  job deploy (permissions: contents: read, pages: write, id-token: write; environment github-pages)
    -> deploy-pages  ->  https://brunocu.github.io/tokens-explained/
        |
        v
 manual, once (D-08): live smoke run + Lighthouse + header check + "no request on typing" + reader readings (D-22)
```

### Recommended Project Structure (new files only)
```
.github/workflows/deploy.yml      # test -> deploy
LICENSE                           # MIT (code)
LICENSE-CONTENT                   # CC BY 4.0 legal text (prose/content)
README.md                         # what it is, URL, licence split, how to run the checks
public/favicon.svg                # base-aware icon (see Pitfall 2)
.gitleaks.toml                    # only if a justified allowlist is needed (none needed today)
scripts/publish-squash.sh         # optional: the commit-tree squash, kept for the record
.planning/phases/03-harden-release/
  03-CHECKLISTS.md                # screen reader, colour-blind, real phone, print/zoom, offline, own-text, live smoke
  03-READER-QUESTIONNAIRE.md      # open questions for the two readers
  03-FACT-CHECK.md                # subagent output: changed or dead items only
  03-KNOWN-LIMITATIONS.md         # "not verified" items (D-15)
```

### Pattern 1: Build once, test the bytes you ship
**What:** `SITE_URL` and `SITE_BASE` are set at workflow level, so the one `npm run build` produces the production output; `playwright.config.ts` computes `baseURL` from `site.config.mjs` and starts `astro preview` on that output, so the e2e suite runs against the deployed artifact.
**When to use:** always here. `check-base` (Phase 1) proves a non-root base with a subset; this proves the real base with the whole suite.
**Evidence:** local full run with the production env: `772 passed, 2 skipped (3.1m)`, exit 0 [VERIFIED: run this session, `CI=1`, port 4420].

### Pattern 2: Non-Nix runner for a Nix-pinned Playwright guard
**What:** `scripts/check-env.mjs` requires Node 24, `PLAYWRIGHT_BROWSERS_PATH`, `PLAYWRIGHT_NIX_VERSION` equal to the npm pin, and browser directories named like the Nix store ones. Playwright's own cache uses the same directory names (`chromium-1243`, `chromium_headless_shell-1243`, `ffmpeg-1011`, `firefox-1543`, `webkit-2359`; shown by `npx playwright install --dry-run`), so the guard works unchanged if the workflow sets the two variables and installs **all default browsers** (`npx playwright install --with-deps`, no browser arguments, so every `installByDefault` entry exists). Derive the version instead of duplicating the pin: `node -p "require('./package.json').devDependencies['@playwright/test']"`. No code change to `check-env.mjs` is needed.

### Pattern 3: History publishing by tree, not by rebase
**What:** For each phase boundary commit B, create a new commit with `git commit-tree "B^{tree}" -p <previous new commit>`. No interactive rebase, no conflict handling, and the final tree equals HEAD's tree by construction. Validated in a scratch clone this session: 6 commits (`Baseline`, Phase 1, Phase 2, Phase 2.1, Phase 2.2, Phase 3 planning) and `git rev-parse squashed^{tree} HEAD^{tree}` gave the same tree `f7d7cf3...`.
Boundary commits found in the current log: baseline `1588263` (docs: create roadmap), Phase 1 `b26685a`, Phase 2 `0d669b2`, Phase 2.1 `50fc088`, Phase 2.2 `ec44a26`, then HEAD (pivot, phase-3 context). The log has exactly 242 commits and 1 merge commit; the merge is irrelevant to the tree method.

### Anti-Patterns to Avoid
- **`git push --all`, `--mirror`, `--tags`, or a bare `git push` with `push.default` changes:** would publish the `archive/pre-publish` ref (the detailed history) and the stray local branch `worktree-agent-ac842b555a9311e5e`. Push exactly `git push origin main` (or `-u origin main`), and run `git push --dry-run origin main` first.
- **A second build for deploy:** the artifact is no longer the tested output.
- **Giving the whole workflow `pages: write`/`id-token: write`:** D-07 wants them on the deploy job only (the Astro guide puts all three at workflow level; the stricter layout is compatible with `deploy-pages`, whose README says the deploying job needs "at minimum" `pages: write` and `id-token: write`).
- **`pull_request` / `pull_request_target` triggers:** not needed (no PRs, D-04); keeps untrusted code out of the workflow (T-03-03).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret detection | The Phase 1 regex list in `check-repo.mjs` | gitleaks 8.30.1 (`gitleaks git`, `gitleaks dir`) | Maintained rule set, entropy checks, history scanning (D-06). Both modes reported "no leaks found" on the current repo (241 commits, ~6.3 MB scanned in 2.4 s; working tree 12.8 MB) |
| Pages artifact packaging | custom tar + upload | `actions/upload-pages-artifact@v5` | It builds the exact tar format `deploy-pages` expects |
| Pages deployment | `gh-pages` branch pushes | `actions/deploy-pages@v5` + `github-pages` environment | OIDC-verified deployment, no token juggling |
| Accessibility rule engine | custom contrast / ARIA checks | `@axe-core/playwright` (already present) and Lighthouse | Already scans WCAG 2.2 A/AA in both colour schemes |
| Colour-blindness simulation | home-made colour matrices | Chrome DevTools Rendering > "Emulate vision deficiencies" (protanopia, deuteranopia, tritanopia, achromatopsia, blurred vision, reduced contrast) | [CITED: developer.chrome.com/docs/devtools/rendering/apply-effects] |
| Link checking of the References | a crawler | a 30-line Node script using built-in `fetch`, or `curl -L`, on the extracted URL list | Baseline already run: 35 distinct URLs, 32 return 200, 3 return 403 from scripts (OHCHR x2, ACM via doi.org) which is expected bot-blocking |
| Licence texts | retyping MIT / CC BY 4.0 | download: https://creativecommons.org/licenses/by/4.0/legalcode.txt (200, plain text) and the standard MIT text | Retyping risks altering legal text; `NOTICE.md` already follows "downloaded and not retyped" |

**Key insight:** every check this phase needs either already exists in the repo (axe both schemes, privacy spec, freeze guard, `check:dist`) or exists as a maintained external tool. New code should be limited to the workflow, a favicon, small config edits (`E2E_BASE_URL` remote mode, optional budget report), and documents.

## Runtime State Inventory

Not a rename/refactor phase. The `site`/`base` flip is configuration only. Two state items still matter:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — site has no database or storage; `check-repo` bans localStorage and friends | none |
| Live service config | GitHub repo settings (Pages source = "GitHub Actions", `github-pages` environment branch rule) live in the GitHub UI, not in git | human step; record in the checklist |
| OS-registered state | None | none |
| Secrets/env vars | None used. The workflow needs no repository secrets. `SITE_URL` and `SITE_BASE` are non-secret and go in the workflow `env` | none |
| Build artifacts | `.planning/milestone.lock` is **tracked and rewritten by GSD on every session** (contains a session id and pid); `dist-base-check/` and `dist/` are ignored. Untracked `dist-deploy-test/` was created and removed by this research | decide whether to `git rm --cached` and ignore `milestone.lock` before the squash so it does not become public churn (planner/author) |

## Common Pitfalls

### Pitfall 1: Sub-path base lost in a hand-written URL
**What goes wrong:** a link or fetch without the base works on `localhost:4321/` and 404s on `/tokens-explained/`.
**Why it happens:** root-absolute strings.
**How to avoid:** `check:dist` already rejects root-absolute URLs outside the base in built HTML/CSS; tokenizer fetch addresses are built at runtime and covered by `check:base` and the `playground-load` / `comparison-load` specs. In this session the whole suite passed under the real base. Keep the manual live smoke (D-08) as the final confirmation.
**Warning signs:** 404 in the Network tab for `/_astro/...` or `/tokenizers/...`.

### Pitfall 2: No favicon, so the browser asks the wrong origin root
**What goes wrong:** real Chrome requests `https://brunocu.github.io/favicon.ico`, which is not part of this project site (user-site root, currently 404). Lighthouse (Chrome headless=new) logged it: "Failed to load resource: ... 404 ... http://localhost:4399/favicon.ico", failing `errors-in-console` (Best Practices 96).
**Why it happens:** `BaseLayout.astro` has no `<link rel="icon">` and `public/` holds only `tokenizers/`.
**How to avoid:** add `public/favicon.svg` and, in `BaseLayout.astro`, `<link rel="icon" type="image/svg+xml" href={`${import.meta.env.BASE_URL}favicon.svg`} />` (`BASE_URL` ends with a slash because `trailingSlash: "always"`, per the comment in `astro.config.mjs`). `check:dist` will then verify that the target file exists.
**Warning signs:** Lighthouse "Browser errors were logged to the console"; the existing smoke test (d) will NOT show it because Playwright's headless Chromium does not fetch favicons [observed: smoke (d) passes while Lighthouse reports the 404].

### Pitfall 3: Pages source not enabled, or enabled on the wrong source
**What goes wrong:** the workflow's `deploy-pages` step fails or publishes nothing.
**How to avoid:** human step: Settings > Pages > Build and deployment > Source = **GitHub Actions** [CITED: docs.github.com configuring-a-publishing-source]. GitHub creates the `github-pages` environment; the docs recommend a deployment protection rule so only the default branch can deploy [CITED]. Free accounts serve Pages only from public repositories [CITED via search summary of docs.github.com; moot because D-02 makes the repo public, and the settings page confirms it at creation time].
**Warning signs:** `Error: Failed to create deployment (status: 404)`.

### Pitfall 4: `withastro/action` runs `npm install`, rebuilds, and ignores your test job's build
**What goes wrong:** the deployed `dist` is a different build than the tested one, and `npm install` may touch the lockfile.
**How to avoid:** the single-build layout above. If the planner keeps `withastro/action`, pass nothing special: composite action steps inherit job-level `env`, so `SITE_URL`/`SITE_BASE` set on the job reach `npm run build` [VERIFIED by reading action.yml: the build step sets no `env` of its own and runs in the job's environment].

### Pitfall 5: Build depends on a third-party font API
**What goes wrong:** `astro build` fetches Source Serif 4 and JetBrains Mono from Fontsource at build time (`fontProviders.fontsource()`); an outage fails the build (safe: nothing deploys) and makes the gate flaky.
**How to avoid:** accept it (reader runtime stays same-origin; `check:dist` proves no third-party URL in output). Optionally cache `node_modules/.astro` (the withastro action does this itself). Mention it in the README.

### Pitfall 6: Font licences are not shipped
**What goes wrong:** the five `.woff2` files in `dist/_astro/fonts/` are redistributed fonts. Both are OFL-1.1 [VERIFIED: api.fontsource.org, 2026-10-13: `source-serif-4` "OFL-1.1", `jetbrains-mono` "OFL-1.1"]. The OFL requires the copyright notice and licence to accompany redistributed copies [ASSUMED: from knowledge of OFL section 2; verify the OFL text before writing the notice].
**How to avoid:** add a font section to the notices (e.g. extend `public/tokenizers/NOTICE.md` or a new `public/NOTICE.md`) with the OFL text and the upstream copyright lines from the font sources.

### Pitfall 7: GPT-2 licence nuance in the notice
**What goes wrong:** the manifest says `MIT`. The upstream file `openai/gpt-2/LICENSE` is titled "Modified MIT License" and adds: "We only ask that you use GPT-2 responsibly and clearly indicate your content was created using GPT-2" and "The above copyright notice and this permission notice need not be included with content created by the Software" [VERIFIED: raw LICENSE read 2026-10-13]. `NOTICE.md` already quotes this text and calls it "Modified MIT License", so it is consistent, but the post sentence "released under a permissive licence" should stay generic and the MIT-for-code statement (D-05) must not be read as covering `public/tokenizers/*` (carve-out in README/footer).

### Pitfall 8: Pushing the archive
**What goes wrong:** `archive/pre-publish` (full detailed history) goes public by `--tags` / `--all` / `--mirror`.
**How to avoid:** use a **branch or tag name that cannot be matched by a default push**: a tag is safe unless `--tags` is used; a branch is safe unless `--all`/`--mirror`. Safest is both a tag *and* a `git bundle` copy outside the repo (`git bundle create ../pre-publish.bundle --all`). Run `git push --dry-run origin main` and read the ref list before the real push. GSD config has `"create_tag": true`: milestone completion will try to create tags; do not push them.

### Pitfall 9: Treating the privacy check as new work
**What goes wrong:** D-12 plans a manual devtools check and lists a permanent CI guard as deferred, but `e2e/privacy.spec.ts` already is that permanent guard: it asserts zero requests after typing, example buttons, Reset, table open, the comparison own-text box, and that exactly one `gpt2.json` and (after the button) one `bert-uncased.json` request occur, all same-origin. It runs on three browsers in the gating suite.
**How to avoid:** the manual check becomes a 2-minute confirmation in real Chrome DevTools (Network tab, type, observe no new rows). Record "also covered by e2e/privacy.spec.ts" in the verification note so the deferred idea is not duplicated.

### Pitfall 10: State file hashes die in the squash
**What goes wrong:** `STATE.md` (`state_head: 283321a...`), SUMMARY files and ROADMAP refer to pre-squash commit hashes that will not exist in public history.
**How to avoid:** accept (they only matter locally and the archive keeps them). Optionally re-point `state_head` after the squash. Do the squash **before** creating `gsd/phase-3-...` so the phase branch starts from the rewritten `main`.

### Pitfall 11: Author identity becomes public
**What goes wrong:** all 242 commits carry `brunocu <brunocu@msn.com>`; any squash commit made with the same identity publishes that address. Four `.planning` files also contain the local path `/home/nixos` (info-level).
**How to avoid:** this is an author decision, not covered by D-01..D-06: either accept, or set a GitHub noreply email (`<id>+brunocu@users.noreply.github.com`) for the squash commits via `GIT_AUTHOR_EMAIL`/`GIT_COMMITTER_EMAIL` and `git config user.email` for later commits. Raise it as a checkpoint before the first push. [ASSUMED: noreply address format; the exact address is shown in GitHub Settings > Emails]

### Pitfall 12: Pages caches everything for 10 minutes
**What goes wrong:** after a deploy, a reader can see old HTML for up to 10 minutes while new hashed assets exist.
**Evidence:** every Pages response checked carried `cache-control: max-age=600` and `content-encoding: gzip`, including JSON (`mdn.github.io/.../superheroes.json`) [VERIFIED: curl 2026-10-13]. Asset filenames are content-hashed, so a stale HTML still finds its old assets as long as the old deployment is not purged; the new deploy replaces the whole site, so a stale HTML can briefly 404 on old chunks. Low risk for one post; mention it for "spot checks after later deploys".

## Code Examples

### Deploy workflow skeleton (verified action versions, D-07 shape)
```yaml
# .github/workflows/deploy.yml
# Sources: docs.astro.build/en/guides/deploy/github/ (triggers, environment, action majors);
# actions/upload-pages-artifact v5 and actions/deploy-pages v5 action.yml / README (inputs, permissions).
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

env:
  SITE_URL: https://brunocu.github.io
  SITE_BASE: /tokens-explained

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0            # gitleaks git needs the history
          persist-credentials: false
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Secret scan (gitleaks, pinned release)
        run: |
          curl -sSL -o gitleaks.tgz https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz
          echo "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  gitleaks.tgz" | sha256sum -c -
          tar -xzf gitleaks.tgz gitleaks
          ./gitleaks git --no-banner --redact .
          rm -f gitleaks gitleaks.tgz
      - run: npm run check:deps
      - run: npm run check:repo
      - run: npm run check
      - run: npm run check:svelte
      - run: npm test
      - run: npm run build
      - run: npm run check:dist
      - name: Playwright browsers and guard variables
        run: |
          echo "PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright" >> "$GITHUB_ENV"
          echo "PLAYWRIGHT_NIX_VERSION=$(node -p "require('./package.json').devDependencies['@playwright/test']")" >> "$GITHUB_ENV"
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```
Notes for the planner: `CI=true` is set by Actions, so `playwright.config.ts` (`retries: 1`, `reuseExistingServer: false`) behaves as in the validated local run. The `gitleaks` `rm` keeps the binary out of any later artifact step (the artifact path is `dist`, so this is hygiene only). Optional: an `if: failure()` step with `actions/upload-artifact@v7` for `test-results/`. Expected runtime: the local run took 3.1 to 3.9 minutes for e2e alone; allow roughly 8 to 12 minutes on a runner including browser download [ASSUMED].

### Squash of the existing history (validated in a scratch clone)
```bash
# Run in the real repo with a clean working tree (commit or discard .planning/milestone.lock first).
git tag archive/pre-publish HEAD                  # local only; never push tags
git bundle create ../tokens-explained-pre-publish.bundle --all   # off-repo copy
parent=""
for pair in \
  "1588263|Baseline: project setup, research and roadmap" \
  "b26685a|Phase 1: Foundation and token playground" \
  "0d669b2|Phase 2: BPE stepper and real-tokenizer comparison" \
  "50fc088|Phase 2.1: Replace the toy tokenizer with GPT-2" \
  "ec44a26|Phase 2.2: Rework widgets" \
  "HEAD|Phase 3 planning: MVP pivot and phase context"; do
  c=${pair%%|*}; m=${pair#*|}; tree=$(git rev-parse "$c^{tree}")
  if [ -z "$parent" ]; then parent=$(git commit-tree "$tree" -m "$m")
  else parent=$(git commit-tree "$tree" -p "$parent" -m "$m"); fi
done
test "$(git rev-parse "$parent^{tree}")" = "$(git rev-parse 'HEAD^{tree}')" || { echo "tree mismatch"; exit 1; }
git branch -f main "$parent" && git reset --hard main   # only after the tree check; archive tag keeps the old tip
gitleaks git --no-banner --redact . && gitleaks dir --no-banner --redact .
```
Commit messages need the attribution trailer required by the session reminder when the executor creates them. Set `GIT_AUTHOR_*`/`GIT_COMMITTER_*` if the identity decision (Pitfall 11) changes the email.

### Local pre-push gate and first push
```bash
git remote add origin git@github.com:brunocu/tokens-explained.git   # or the https URL
test "$(git remote get-url origin)" = "git@github.com:brunocu/tokens-explained.git"   # T-03-02: wrong-remote check
git ls-remote --heads origin                                         # expect empty
GIT_TERMINAL_PROMPT=0 git push --dry-run origin main                 # read the ref list: main only
git push -u origin main
```

### Favicon (base-aware)
```astro
---
// BaseLayout.astro, inside <head>
---
<link rel="icon" type="image/svg+xml" href={`${import.meta.env.BASE_URL}favicon.svg`} />
```

### Remote-base mode for the one-off live run (D-08)
`playwright.config.ts` currently has no `E2E_BASE_URL` (confirmed by reading it; the Phase 1 hand-off item 1.10 removed it). A minimal re-add: when `E2E_BASE_URL` is set, use it (with a trailing slash) as `baseURL` and omit `webServer`. Then, inside the Nix shell:
```bash
E2E_BASE_URL=https://brunocu.github.io/tokens-explained/ npx playwright test --project=chromium \
  e2e/smoke.spec.ts e2e/privacy.spec.ts e2e/post.spec.ts e2e/a11y.spec.ts
```
Some specs may use `astro preview` specifics (route interception works against any origin, but check by running them once and recording which are meaningful live). `smoke.spec.ts` test (d) "no failed requests and no console errors" is the right live check for assets and base.

### Report-only Lighthouse run (works from the Nix shell)
```bash
# from a scratch directory, NOT the repo (on WSL it creates a "C:\Users\...\lighthouse.XXXX" temp folder in the cwd)
nix develop /path/to/repo --command bash -c '
  export CHROME_PATH=$PLAYWRIGHT_BROWSERS_PATH/chromium-1243/chrome-linux64/chrome
  npx --yes lighthouse@13.5.0 https://brunocu.github.io/tokens-explained/ \
    --chrome-flags="--headless=new --no-sandbox" --output=json --output=html --output-path=./lh --quiet'
```
Defaults are mobile form factor with simulated throttling (`rttMs 150`, `throughputKbps 1638.4`, `cpuSlowdownMultiplier 4`) [VERIFIED: read from the produced `lh.json` configSettings].

## Measurements (production-base build, 2026-10-13)

Build: `SITE_URL=https://brunocu.github.io SITE_BASE=/tokens-explained SITE_OUT_DIR=dist-deploy-test npm run build`, 2 pages in about 1 s, `check:dist` OK (4 files, 36 URLs). Sizes below are what Chromium actually received from `astro preview` at a 390x844 viewport with no scrolling, then compressed with gzip level 6 / brotli default for comparison. Pages serves gzip (brotli was requested and not offered).

| Item (loaded at page load, no scroll) | Raw | gzip | brotli |
|---|---:|---:|---:|
| HTML (`/`, same bytes as `/what-is-a-token/`) | 155,232 | 23,561 | 18,402 |
| CSS (2 files) | 24,700 | 5,907 | 5,122 |
| JS: Svelte runtime chunk `client.orR6CHes.js` | 46,003 | 17,629 | 16,065 |
| JS: tokenizer library chunk `tokenizers.DYmTXX5T.js` | 34,619 | 10,592 | 9,648 |
| JS: Playground, TextPanel, TokenDisplay, ScrollRegion, renderer shim | 29,645 | 12,979 | 11,406 |
| Fonts (4 of 5 woff2 files, already compressed) | 82,880 | 82,992 | 82,854 |
| **Subtotal without the tokenizer file** | **373,079** | **153,660** | **143,497** |
| `tokenizers/gpt2.json` (auto-load, `client:load` island) | 1,355,256 | 556,664 | 443,977 |
| **Total at load** | 1,728,335 | **710,324** | 587,474 |

Lazy (only after scrolling, `client:visible`): `BpeStepper` 6,352, `Comparison` 2,532, `TokenRows` 7,083, `LanguagesWidget` 3,640 gzip bytes = 19.6 KB. All JS the page can ever load without the BERT click: about 60.8 KB gzip. `bert-uncased.json` (only on button press): 190,756 gzip bytes. The fifth woff2 file is not requested at load. `/` and `/what-is-a-token/` are byte-identical documents; `/` carries a canonical link to the post URL.

Lighthouse 13.5.0, mobile defaults, same build under `astro preview`: Performance 99, Accessibility 100, Best Practices 96, SEO 100; FCP 1.4 s, LCP 1.5 s, TBT 80 ms, CLS 0.026, total byte weight 704 KiB. Findings: `errors-in-console` (favicon 404, Pitfall 2), render-blocking CSS (2 files, about 3 KB each, 0.5 score insight), network-dependency tree (informational).

Time until the playground is typable on Lighthouse's throttled network: the textbox is read-only until `gpt2.json` is ready. 556,664 B x 8 / 1,474,560 bps is about 3.0 s of transfer after the page, so roughly 4 to 5 s on that profile [ASSUMED: arithmetic on measured sizes; not a browser measurement]. A status line is already shown during the wait (D-05..D-07 of earlier phases). Phase 2.1 hand-off item 1 asks for a recorded choice between `client:load` and `client:idle`; the data suggests keeping `client:load` (LCP and TBT are already good, and the textbox is the main call to action), but record it as the author's decision.

### Performance budget proposal (D-10, planner confirms)
| Budget line | Measured | Proposed limit | Notes |
|---|---:|---:|---|
| Initial HTML + CSS + JS + fonts, **excluding** tokenizer files (gzip) | 154 KB | **200 KB** | about 30% headroom; the fonts are 83 KB of it |
| Same plus `gpt2.json` (gzip) | 710 KB | **800 KB** | the file is 557 KB and is a pinned asset (manifest sha256), so it moves only with a tokenizer change |
| All JS the page can load without BERT (gzip) | 61 KB | **80 KB** | catches an accidental static import of a big module |
| `bert-uncased.json` on click (gzip) | 191 KB | informational | shown to the reader as an explicit button |
| HTML alone (gzip) | 23.6 KB | **35 KB** | the post is one 155 KB document with four server-rendered widgets |

Enforcement is the planner's call: D-11 says report only for scores, and D-10 asks only for a proposal. A 30-line Node script that gzips `dist/_astro/*` and fails above the limits is deterministic and cheap, but it is a new gate; recommend recording the numbers in the verification note and adding the script only if the author wants a gate.

## Accessibility, dark mode, print, zoom: what exists and what is missing

| Check (roadmap criterion 3) | Already automated and gating | Gap / proposal |
|---|---|---|
| axe WCAG 2.2 A and AA, light and dark, 1280 px, busy states (emoji partial chips, table open, frames, loading, failed download) | `e2e/a11y.spec.ts` (8 scans), `e2e/a11y-phase2.spec.ts` | none |
| Heading structure, `lang`, one `main`, base-aware header link | `a11y.spec.ts` structure test | none |
| Reduced motion | `a11y.spec.ts` motion test | none |
| Keyboard reachability of scroll regions and controls | `widget-layout.spec.ts`, `stepper.spec.ts`, `comparison.spec.ts`, `languages.spec.ts`, `states.spec.ts` | none for gating; a keyboard-only read-through stays manual |
| Lighthouse | not automated (D-11 report only) | one-off run recorded (baseline above) |
| Dark mode | axe in dark; `@media (prefers-color-scheme: dark)` in `src/styles/tokens.css` | author eyeballs the post once in dark (Chrome Rendering tab) |
| Print | CSS exists: `@media print` in `src/styles/widget.css`, `Chip.svelte`, `TokenDisplay.svelte` | no test. Lighter check per D-14: `page.emulateMedia({ media: "print" })` + `page.pdf()` (Chromium) once to produce a PDF to read, or DevTools Rendering "Emulate CSS media type: print" |
| 200% zoom / reflow | none; secondary suite checks 360 px overflow (`phone-width.secondary.spec.ts`, `stacked-layout.secondary.spec.ts`, non-gating) | WCAG 1.4.10 Reflow = no two-dimensional scrolling at 320 CSS px width (equivalent to 400% zoom on 1280 px); data tables and diagrams are exempt if contained in their own scroll region [CITED: w3.org/WAI/WCAG22/Understanding/reflow.html]. Resize Text 1.4.4 = readable at 200%. Lighter check: DevTools zoom to 200% and 400%, or a one-off Playwright run at 640x512 and 320x256 viewports asserting `document.documentElement.scrollWidth <= innerWidth` |
| Forced colours / high contrast | none | not in scope; optional DevTools "Emulate forced-colors" [CITED: developer.chrome.com/docs/devtools/rendering/emulate-css] |

Manual procedures for D-13 (planner turns these into checklists):
- **Colour-blind:** Chrome DevTools > Rendering > Emulate vision deficiencies > protanopia, deuteranopia, tritanopia, achromatopsia; look at playground chips (boundaries must show via outlines/separators, FOUND-02), stepper tie bars (hatched, boxed pair), comparison rows, languages bars [CITED: developer.chrome.com/docs/devtools/rendering/apply-effects].
- **Screen reader:** on Windows, NVDA or Narrator with Chrome/Edge; targets: playground (textbox, live announcement, token list/table alternative), stepper pair table and hidden sentences, comparison, languages table, References list [ASSUMED: tool choice follows the host OS].
- **Real phone:** glyphs for space, newline, tab (U+2423, U+21B5, U+21E5; constants in `src/core/display.ts`), 360 px layout (0, 1, 1,000-character inputs and the table open), per `DEFERRED-FROM-PHASE-1.md` items 2.1 to 2.4. If no iOS device exists, record "not verified" (D-15).
- **Offline load of the comparison:** DevTools Network > Offline, press the BERT button; the error sentence and "Try again" must appear (Phase 2 item 6.5). Also confirm the "press Try again twice" behaviour reads acceptably (Phase 2.1 item 5).

## Fact re-verification: scope and head start

Scope for the D-18 subagent pass (all in `src/content/posts/what-is-a-token.mdx`, `src/core/compare/*`, `public/tokenizers/*`):
- **26 references** (`<Reference n=1..26>`), not 16. Access dates are printed for the web sources (Oct. 6 and Oct. 7, 2026). D-19 wants "as of" dates inline in the claim text; the current design keeps dates in the References list, so this is an editorial change the planner must size (each dated vendor claim: GPT-2 2019, vocabulary sizes 50,257 / 100,257 / 200,019, digit grouping, BERT/WordPiece statements).
- Tokenizer facts: years (GPT-2 2019, BERT 2018), licences, commits, sha256 in `manifest.json`.
- UDHR reuse terms (un.org read; OHCHR manual) and the Arabic cross-check (manual).
- Quoted splits and counts: re-run `npm test` and spot-check (D-20; already green).
- `scripts/check-dist.mjs` allow-list: `ALLOWED_EXTERNAL_LINK_HOSTS` (2) plus `ALLOWED_REFERENCE_LINK_HOSTS` (17, asserted by its self-test). Any new reference host needs an entry **and** a change of the count in `selfTest`.

Head start, measured 2026-10-13:
- All 35 distinct outbound URLs: 32 return 200 (after redirects). Three return 403 to scripts: `doi.org/10.1145/1187415.1187418` (lands on `dl.acm.org`), and two OHCHR URLs. These need a manual open. Nothing is dead.
- Hugging Face model cards: `openai-community/gpt2` licence `mit`, current commit `607a30d783dfa663caf39e06633721c8d4cfcd7e`, last modified 2024-02-19; `google-bert/bert-base-uncased` licence `apache-2.0`, commit `86b5e0934494bd15c9632b12f734a8a67f723594`, last modified 2024-02-19. Both commits equal the ones in `manifest.json` [VERIFIED: HF API].
- BERT's licence is now confirmed upstream: `google-research/bert` is Apache-2.0 per the GitHub API (the repository is archived, which is worth a half-sentence in the notice) [VERIFIED: api.github.com].
- Upstream GPT-2 LICENSE: "Modified MIT License", text as quoted in Pitfall 7 [VERIFIED].
- Not yet re-verified: tiktoken vocabulary derivation (200,019), the BPE-related papers' quoted wording, W3Techs UTF-8 share ("over 99%"; this figure moves, so date it inline), the UN terms. These belong to the subagent pass.

Vendor claims that go stale fastest: the W3Techs percentage, the "newer models" statements, the GPT-4 and GPT-4o vocabulary sizes. Date those inline.

## Secrets, licences, README

- **gitleaks run today** (read-only, current history of 241 commits and the working tree): "no leaks found" in both `git` and `dir` modes with the default rule set. Default config scans `.planning` markdown like any file; no allowlist is needed now [VERIFIED: ran gitleaks 8.30.1]. Re-run after the squash and in CI. A `.gitleaksignore` (fingerprints, "experimental" per its README) or `.gitleaks.toml` should be created only if a real false positive appears.
- CLI facts: `gitleaks git` (history via `git log -p`), `gitleaks dir` (files), `gitleaks stdin`; `detect`/`protect` are deprecated and hidden since v8.19.0; flags `--redact`, `--no-banner`, `--exit-code`, `--config`, `--baseline-path`, `--log-opts` [CITED: github.com/gitleaks/gitleaks README].
- **Licences (D-05):** MIT for code and CC BY 4.0 for prose. Practical carve-outs to state in the README and footer: (a) `public/tokenizers/*` keep their own licences (GPT-2 modified MIT, BERT Apache-2.0); (b) the Garnett translation is public domain; (c) the UDHR sentences have UN reuse terms; (d) fonts are OFL-1.1; (e) CC BY 4.0 covers the author's own prose and figures only. Get the CC BY 4.0 text from `creativecommons.org/licenses/by/4.0/legalcode.txt` (verified to return 200).
- The repo name `tokens-explained` is not taken under `brunocu` (GitHub API returns 404 unauthenticated; a private repo would also return 404, so confirm in the creation form). The user exists (`type: User`), and `https://brunocu.github.io/` currently returns 404 (no user site).
- `gh` is not installed. Repo creation, Pages source, and (optionally) an environment branch rule are web-UI steps. `nix shell nixpkgs#gh` is possible but needs the author's login; leave it optional.

## Local-squash workflow vs GSD (D-04)

The repo already has `git.branching_strategy: "none"`, `allow_default_branch_commits: true`, `create_tag: true`, `phase_branch_template: "gsd/phase-{phase}-{slug}"` in `.planning/config.json`. Changing `branching_strategy` to `"phase"` makes GSD create `gsd/phase-3-harden-release`. Sequence that avoids rewriting twice: (1) clean tree, (2) publish-squash `main`, (3) create the phase branch from the new `main`, (4) execute Phase 3 there, (5) `git switch main && git merge --squash gsd/phase-3-harden-release && git commit -m "Phase 3: Harden & Release"`, (6) full local suite, (7) push. `/gsd-ship` creates a PR and does not fit a no-PR flow; the planner should replace it with a manual checklist (squash-merge, suite, push, live check). The `ship.pr_body_sections` config can stay unused. Remember that the planning artifacts of Phase 3 itself are committed on whatever branch GSD is on at planning time; because the squash includes them as part of the last baseline commit, plan and research files written before the squash are not lost.

## Reader testing (D-21, D-22)

Planner drafts the questionnaire; research input: keep it open-ended and neutral (what was this post about in your words; where did you slow down or re-read; any word you did not understand, especially "token", "vocabulary", "byte", "merge"; which widget did you try and what did you expect to happen; what would you tell a friend it says; did anything seem wrong). Ask readers to use the real public URL on whatever device they normally use, and to say aloud or note where they stop. Record each confusion point with a disposition (fixed in commit X / recorded as backlog). Phase 2.1 item 10 asks that a reader meeting a hatched chip in the playground understands it without the cut figure; include that as an explicit probe. Two readers is the decided number; this finds the most glaring problems, not all of them [ASSUMED: general usability-testing experience].

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled secret regexes in a lint script | gitleaks `git`/`dir` (v8.19+ commands; `detect` deprecated) | v8.19.0 | use the new subcommands in docs and CI |
| `gh-pages` branch + Jekyll | Actions source, `upload-pages-artifact` + `deploy-pages` | long established | no Jekyll build, so no `.nojekyll` normally needed [ASSUMED: believed unnecessary with the Actions source; D-08 keeps it as a contingency, and note `upload-pages-artifact` drops dotfiles unless `include-hidden-files: true`] |
| Lighthouse CI server | one-off CLI / DevTools / PageSpeed Insights for report-only | — | matches D-11 |

**Deprecated/outdated:** `gitleaks detect`/`protect` commands; `actions/*` majors older than v6/v7 (v4 of `deploy-pages` and v3/v4 of `upload-pages-artifact` appear in older docs; the Astro guide now shows `checkout@v7`, `withastro/action@v6`, `deploy-pages@v5`). The WebFetch summary of the `upload-pages-artifact` README still showed v3; the tag list and `action.yml` at v5 are authoritative.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | With the Actions publishing source no Jekyll processing occurs, so `.nojekyll` is unnecessary | State of the Art, D-08 | `_astro` 404 on first deploy; D-08 already defines the remedy (add `public/.nojekyll`; note it ships because Astro copies `public/` into `dist`) |
| A2 | OFL-1.1 requires the notice and licence text to accompany redistributed font files | Pitfall 6 | Missing notice; low legal risk, trivial to add |
| A3 | The GitHub noreply address format and that the author wants it | Pitfall 11 | Author identity exposed against preference; ask before pushing |
| A4 | The author's host is Windows (inferred from a `C:\Users\Bruno\...` temp path created by Lighthouse under WSL), so NVDA/Narrator and Windows Chrome are available | Accessibility manual procedures | Different screen-reader choice; checklist wording changes only |
| A5 | CI wall time about 8 to 12 minutes (local e2e alone 3.1 to 3.9 min) | Code Examples | `timeout-minutes: 30` is generous; no functional risk |
| A6 | Time-to-typable about 4 to 5 s on Lighthouse's mobile network (arithmetic, not measured in a browser) | Measurements | The `client:load` vs `client:idle` decision rests on a rough number; measure with CDP `Network.emulateNetworkConditions` against the live site if the author cares |
| A7 | Two readers find the most glaring issues but not all | Reader testing | Expectation setting only |
| A8 | Pages free-plan public-repo requirement | Pitfall 3 | Moot: repo is public by D-02 |

## Open Questions

1. **Which author identity goes into the published commits?** (Pitfall 11.) Recommendation: raise a checkpoint before the first push; default to GitHub's noreply email unless the author prefers the real one.
2. **Is `.planning/milestone.lock` supposed to be tracked?** It holds a session id and pid and changes every session. Recommendation: `git rm --cached` and add to `.gitignore` before the squash, or accept it. Author/planner decision.
3. **Single-build workflow (recommended) or the literal Astro two-job layout?** Both satisfy D-07; the first tests the shipped bytes. Planner confirms.
4. **Does the budget become a gate?** Proposal above is numbers only. D-10/D-11 suggest report only.
5. **Which e2e specs are meaningful against the live URL?** Needs one trial run after `E2E_BASE_URL` mode exists. Start with `smoke`, `privacy`, `post`, `a11y`.
6. **Home page duplicates the post.** `/` and `/what-is-a-token/` are the same 155 KB document, `/` canonical-links to the post URL. The roadmap says Post 1 is the root page, which this satisfies, and the post URL is a public contract (Phase 1 hand-off 3). No change recommended; mention in the README so the duplicate is intentional. (Social metadata and a 404 page are deferred.)
7. **Inline "as of" dating (D-19) editorial scope.** Which claims get a date in the sentence versus the existing access dates in References. Needs the author's wording decision during execution.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Nix dev shell (`nix develop`) | all local checks | ✓ | nodejs 24.21.0, Playwright 1.63.0 browsers (chromium-1243, firefox-1543, webkit-2359) | — |
| Node / npm | build, tests | ✓ (via Nix) | v24.21.0 | — |
| gitleaks | D-06 | ✓ via `nix shell` on the pinned nixpkgs; not yet in the flake | 8.30.1 | add `pkgs.gitleaks` to `flake.nix` |
| Lighthouse | D-11 | ✓ via `npx lighthouse@13.5.0` with `CHROME_PATH` to the Nix Chromium (ran here) | 13.5.0 | DevTools panel / pagespeed.web.dev |
| `gh` CLI | repo creation, Pages | ✗ | — | GitHub web UI (human step) |
| Network to github.com, fontsource, Hugging Face | build (fonts), push, fact pass | ✓ | — | — |
| `brotli` CLI | size measurement | ✗ | — | Node `zlib.brotliCompressSync` (used) |
| Git remote | publish | ✗ (none configured) | — | add after repo creation |
| Real iOS/Android device | phone checks | unknown | — | record "not verified" (D-15) |

**Missing with no fallback:** none for planning. **Missing with fallback:** `gh` (web UI), flake gitleaks (use `nix shell`).

## Validation Architecture

`workflow.nyquist_validation` is `false` in `.planning/config.json`, so the Nyquist validation section is skipped. For the planner's convenience, the existing gate commands (all green at HEAD this session) are: `npm run check:deps`, `check:repo`, `check:env`, `check`, `check:svelte`, `test`, `build`, `check:dist`, `check:base`, `test:e2e` (Playwright, chromium + firefox + webkit), `test:e2e:secondary` (non-gating phone suite).

## Security Domain

`security_enforcement` is enabled (absent = enabled; `security_asvs_level: 1`). This phase publishes a static, no-account, no-backend site, so most ASVS categories do not apply.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (no accounts) | — |
| V3 Session Management | no | — |
| V4 Access Control | yes (CI/repo level) | `permissions` least privilege; deploy only from `main`; `github-pages` environment rule |
| V5 Input Validation | yes (unchanged) | reader text never reaches `innerHTML`/`eval`; enforced by `check:repo` |
| V6 Cryptography | no (HTTPS and OIDC are provided by Pages/Actions) | — |
| V14 Config / supply chain | yes | exact-pin dependency allow-list (`check-deps`), official actions at major tags, pinned gitleaks checksum |

### Known Threat Patterns (re-created from the retired T-01-01..05; IDs for Phase 3)

| ID | Pattern | STRIDE | Standard Mitigation |
|----|---------|--------|---------------------|
| T-03-01 | Public repo exposes full history including `.planning/` (was T-01-01) | Information Disclosure | one-way checkpoint with consequence stated; gitleaks over working tree and squashed history before first push; local archive never pushed; review author email and `/home/nixos` paths |
| T-03-02 | Wrong owner or typo in the remote pushes to the wrong repository (was T-01-02) | Spoofing | read back `git remote get-url origin` against `brunocu/tokens-explained`; `git ls-remote --heads origin` empty; `--dry-run` shows `main` only |
| T-03-03 | Workflow supply chain (was T-01-03) | Tampering | only `actions/checkout`, `setup-node`, `upload-pages-artifact`, `deploy-pages` (and optionally `withastro/action`, `upload-artifact`) at major tags; no `pull_request*` triggers; deploy only on `refs/heads/main`; gitleaks downloaded by pinned version and sha256 |
| T-03-04 | Token scope (was T-01-04) | Elevation of Privilege | workflow-level `contents: read`; `pages: write` and `id-token: write` only on `deploy`; no repository secrets; `persist-credentials: false` on checkout |
| T-03-05 | Secrets committed to the public repo (was T-01-05) | Information Disclosure | `.gitignore` covers `.env*`; gitleaks pre-push and in CI (replaces the hand-written scan) |
| T-03-06 | Archive ref or stray branch pushed | Information Disclosure | push `main` only; bundle kept outside the repo; no `--all`/`--mirror`/`--tags` |
| T-03-07 | Third-party origin appears in the deployed site | Information Disclosure | `check:dist` (anchors only to allow-listed hosts); live `smoke (d)` run checks for failed requests; Network-tab confirmation |
| T-03-08 | Advisory in a build-time dependency | Tampering | `npm audit`: 1 high (`http-cache-semantics` <=4.2.0, GHSA-ch52-4w7c-c8xp), pulled in by `astro@7.3.5` (`^4.2.0`); `npm audit fix --dry-run` reports `http-cache-semantics 4.2.0 => 4.3.0` only (latest 4.3.0, published 2026-10-04). A lockfile-only update within astro's range exists; **do not use `--force`** (D-20). Decide: apply the plain non-force fix and re-run all gates, or leave it and record that it is build-time only (never shipped to readers). Astro itself has moved to 7.3.8, but dependency versions are pinned by `check-deps`, so a bump is a separate deliberate change |

## Sources

### Primary (HIGH confidence)
- https://docs.astro.build/en/guides/deploy/github/ — workflow, action majors, `site`/`base` rules (fetched 2026-10-13)
- Raw `action.yml` of `withastro/action` (main), `actions/upload-pages-artifact` (v5), `actions/deploy-pages` (v5) and the deploy-pages README — inputs, permissions, `npm install` behaviour, hidden-file handling
- `git ls-remote --tags` for withastro/action (v6.1.3), actions/checkout (v7.0.1), setup-node (v7.1.0), deploy-pages (v5.0.1), upload-pages-artifact (v5), upload-artifact (v7.0.2)
- https://github.com/actions/setup-node README (v7 usage, caching) and https://github.com/gitleaks/gitleaks README (commands, flags)
- GitHub API and release assets for gitleaks v8.30.1 (MIT, checksum `551f6fc8...`), nixpkgs pinned revision `c59305b...` evaluation (gitleaks 8.30.1, MIT)
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits (1 GB site, 10-minute deploy timeout, 100 GB/month soft, 10 builds/hour soft, non-commercial use) and the configuring-a-publishing-source page
- https://developer.chrome.com/docs/devtools/rendering/apply-effects and /emulate-css (vision deficiencies, print media, dark scheme, forced-colors)
- https://www.w3.org/WAI/WCAG22/Understanding/reflow.html (1.4.10, 1.4.4)
- Local measurements and runs this session: production-base build and `check:dist`, full Playwright suite under `/tokens-explained` (772 passed), size/transfer table, Lighthouse 13.5.0 run, gitleaks on history and tree, squash dry run in a scratch clone, link check of 35 URLs, `npm audit` and `npm audit fix --dry-run`, `curl` of Pages response headers
- Repo files read: `astro.config.mjs`, `site.config.mjs`, `package.json`, `flake.nix`, `playwright.config.ts`, `scripts/check-env.mjs`, `scripts/check-dist.mjs`, `scripts/check-repo.mjs`, `scripts/check-base.mjs`, `scripts/check-deps.mjs`, `e2e/privacy.spec.ts`, `e2e/a11y.spec.ts`, `e2e/smoke.spec.ts`, `e2e/resilience.spec.ts` (freeze guard), `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/pages/[slug].astro`, `public/tokenizers/manifest.json`, `NOTICE.md`, `.planning/config.json`, the three DEFERRED hand-offs

### Secondary (MEDIUM confidence)
- Web search summary of docs.github.com for Pages availability by plan (public repos on GitHub Free)
- api.fontsource.org licence fields for the two fonts

### Tertiary (LOW confidence)
- None used as authoritative; see Assumptions Log

## Metadata

**Confidence breakdown:**
- Standard stack / CI: HIGH — action sources and tags read directly; suite run under the production base
- Architecture / publishing: HIGH — squash method validated on a clone; push safety relies on correct command use
- Performance numbers: HIGH for sizes and Lighthouse on `astro preview`; MEDIUM for real-world Pages timing (not measured live)
- Manual-check procedures: MEDIUM — standard DevTools features cited; the author's OS is inferred
- Fact re-verification: MEDIUM — baseline link and licence checks done; content-level checks left to the subagent pass

**Research date:** 2026-10-13
**Valid until:** 2026-11-12 (30 days); re-check action tags and gitleaks version at planning time if later

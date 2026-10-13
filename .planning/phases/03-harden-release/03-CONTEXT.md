# Phase 3: Harden & Release - Context

**Gathered:** 2026-10-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Publish Post 1, "What is a token?", as the root page of a public GitHub Pages site, and check it end to end: deployed, accessible, fast enough, factually current, and readable by non-programmers. There is no hub, placeholder index or other post in the MVP. Embeddings, context, reasoning, hub and disambiguation work is deferred to v1.1.

Requirement: FOUND-01 (deployed-site verification, deferred from Phase 1).

</domain>

<decisions>
## Implementation Decisions

### Repository and publishing
- **D-01:** Repository is `brunocu/tokens-explained`. Site URL `https://brunocu.github.io/tokens-explained/`; `SITE_URL=https://brunocu.github.io`, `SITE_BASE=/tokens-explained` (owner lowercased). — **Reversibility:** one-way — GitHub Pages cannot 301-redirect, so the name becomes the public URL path and the Astro `base`.
- **D-02:** The repo is public and `.planning/` is kept in it (not excluded or untracked). — **Reversibility:** one-way — the first push publishes the history; forks and caches keep copies.
- **D-03:** Before the first push, the existing ~240 commits are squashed into per-phase baseline commits (Phase 1, 2, 2.1, 2.2, plus any foundation/baseline commit). The detailed history is preserved locally under a backup ref (for example the branch or tag `archive/pre-publish`). The squash happens before anything is pushed; never force-push after publishing. — **Reversibility:** one-way — after the first push, history is public.
- **D-04:** Ongoing workflow: work on a branch per phase with small GSD commits (enable `git.branching_strategy: "phase"`, template `gsd/phase-{phase}-{slug}`), and **squash-merge locally** into `main` (`git merge --squash`, one commit per phase, e.g. "Phase 3: Harden & Release"). No GitHub PRs. The local detailed branch history stays local. `allow_default_branch_commits` and GSD ship/complete flows must be checked against this (the planner decides how `/gsd-ship` fits, since it assumes PRs).
- **D-05:** Licence: MIT for code, CC BY 4.0 for prose/content. Third-party tokenizer notices stay in `public/tokenizers/NOTICE.md`. Add LICENSE files (code and content) and state the split in the README/footer.
- **D-06:** Secret scanning uses an existing tool (for example gitleaks), not the hand-written pattern list from the Phase 1 hand-off. Run it before the first push over the tracked files and the squashed history, and in CI. The researcher confirms the tool, its licence and how to install it in the Nix flake and the runner.

### CI and deploy
- **D-07:** Workflow `.github/workflows/deploy.yml` triggers on push to `main` and `workflow_dispatch` only. A `test` job (install, `check:deps`, `check:repo`, `check`, `check:svelte`, `test`, `build`, `check:dist`, Playwright e2e, secret scan) **gates** the `deploy` job. `pages: write` and `id-token: write` only on the deploy job; workflow-level `contents: read`; no secrets; only official `actions/*`, `withastro/action` and (amended 2026-10-13 by the author) the gitleaks organization's own `gitleaks/gitleaks-action` at major-version tags; the automatic `GITHUB_TOKEN` is the only secret reference. Re-verify the current Astro deploy guide before writing it (https://docs.astro.build/en/guides/deploy/github/).
- **D-08:** No automated post-deploy live check (no `live:wait`, no live Playwright job in CI). Roadmap criterion 2 ("live URL passes the same smoke tests") is satisfied by a **one-off manual run** of the smoke checks against the live URL after the first deploy (and spot checks after later deploys). A `public/.nojekyll` is added only if the first live deploy shows `_astro` 404s.
- **D-09:** CI does not run on phase branches (they are never pushed for review); the full suite is run locally before the squash-merge.

### Performance
- **D-10:** Initial-load size budget: **not preset.** The researcher measures `dist/_astro` and the lazy tokenizer chunks after the final build and proposes a budget (initial HTML/CSS/JS excluding lazily loaded tokenizers); the planner confirms it.
- **D-11:** Run Lighthouse (mobile profile, default throttling) on the built site as a **report only**: record scores, fix what is clearly bad, set no pass/fail score target. (The user asked what Lighthouse is; it is explained as Chrome's built-in auditing tool that scores Performance, Accessibility, Best Practices and SEO from 0 to 100.)
- **D-12:** "Typing sends no network request" is verified by a **one-off manual check** in browser devtools before release, not a permanent CI test. Mobile layout usable but secondary.

### Accessibility and manual checks
- **D-13:** Manual checks the author will do: screen reader pass (stepper pair table, hidden sentences, References list, languages table, playground), colour-blind simulation (chips, stepper tie bars, comparison), and a real-phone check (glyph rendering for space, newline, tab, and the 360 px layout). Planner supplies a script/checklist for each.
- **D-14:** Dark mode, print preview and 200% zoom are not on the author's manual list; they get a lighter check (axe/Playwright in both colour schemes, print preview or CSS review, zoom via devtools) as the roadmap criterion requires.
- **D-15:** A manual check that cannot be performed is recorded as "not verified" in a known-limitations note and does not block release. Automated axe and keyboard tests still gate.
- **D-16:** Fix policy: issues that make the post unusable or incorrect for a reader are fixed in this phase; minor issues are decided case by case (fix or backlog).
- **D-17:** Inherited Phase 2 human checks still open: Arabic cross-check against OHCHR, notes-truth read of the five comparison notes and the languages note, glyph/outline/print checks, offline load of the comparison, own-text block by hand (Arabic, emoji, long English; light and dark; keyboard only), look of the languages table. They are folded into the checklist above.

### Fact re-verification
- **D-18:** An automated research pass (subagent) re-opens every source: the 16 references, tokenizer licences and years (GPT-2 MIT, BERT Apache-2.0 never confirmed upstream), the UN reuse terms, quoted counts and repo names, and reports changed or dead items. The author reviews only the exceptions. OHCHR blocks scripts (403), so its terms and the Arabic cross-check stay manual.
- **D-19 (amended 2026-10-13 by the author):** Dates stay **in the References list** as the access ("consulted at") date, refreshed to the re-verification date; **no inline "as of" dates are added to the post text**. Update `public/tokenizers/NOTICE.md` and the manifest if licences differ, and keep the `scripts/check-dist.mjs` allowed-host list in step with References.
- **D-20:** Quoted token splits and counts are verified once now (re-run existing tests, spot-check); **no new build-time test** (FACT-02 stays in v2). Re-run `npm audit` at release; never `npm audit fix --force` (the known `http-cache-semantics` advisory is a build-time transitive dependency of astro).

### Reader testing
- **D-21:** Two non-programmers read Post 1 **alone**, then answer a short questionnaire drafted by the planner. Feedback is **open** (what was confusing, what they would explain to a friend); no scored quiz.
- **D-22:** Deploy first, then test: readers use the real public site. Roadmap criterion 6 is closed by recording their confusion points as resolved or recorded; fixes ship as follow-up commits. Release does not wait for the readings.

### Claude's Discretion
- Exact squash grouping of the existing commits (one per completed phase is the intent), the name of the archive ref, README content, workflow job layout and caching, how to adapt GSD ship/complete steps to the local-squash flow, the gitleaks (or equivalent) integration details, and the form of the questionnaire and checklists.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase hand-offs (everything deferred into this phase)
- `.planning/phases/03-harden-release/DEFERRED-FROM-PHASE-1.md` — remote repo, workflow, secret scan, site/base flip, retired threats T-01-01..05 (re-create under T-03-NN), mobile/iOS checks, Nix flake facts. Note: the `live:wait` tooling it describes is NOT wanted (D-08), and the hand-written secret scan is replaced by D-06.
- `.planning/phases/03-harden-release/DEFERRED-FROM-PHASE-2.md` — facts/licences to re-verify, bundle measurement, `npm audit`, third-party-origin scan, link rot, open editorial points, human checks.
- `.planning/phases/03-harden-release/DEFERRED-FROM-PHASE-2.1.md` — items deferred from the GPT-2 replacement phase.

### Project and requirements
- `.planning/ROADMAP.md` §Phase 3 — goal and six success criteria (note criterion 2 and 3 reinterpreted by D-08, D-14).
- `.planning/REQUIREMENTS.md` — FOUND-01 and the v1 requirement states.
- `.planning/PROJECT.md` — audience, constraints, MVP = Post 1 only.
- `.claude/CLAUDE.md` (Technology Stack) — GitHub Pages sub-path `site`/`base` rules, `withastro/action` + `actions/deploy-pages`, `npm audit` note, tokenizer sources.

### Prior-phase decisions
- `.planning/phases/01-foundation-token-playground/01-CONTEXT.md` — D-15 (GitHub Pages decision, amended) and Phase 1 conventions.
- `.planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-CONTEXT.md`, `.planning/phases/02.1-replace-toy-tokenizer-with-gpt-2-in-playground-and-examples/02.1-CONTEXT.md`, `.planning/phases/02.2-rework-widgets/02.2-CONTEXT.md` — widget and tokenizer decisions that the checks verify.

### External docs to verify at planning time
- https://docs.astro.build/en/guides/deploy/github/ — current Astro GitHub Pages guide.
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits — Pages limits, public-repo requirement for free accounts (assumption A6 unconfirmed).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `site.config.mjs`: `site`, `base`, `outDir`, `normalizeBase`, driven by `SITE_URL`, `SITE_BASE`, `SITE_OUT_DIR` (defaults `http://localhost:4321` and `/`) — set the deploy values here or in the workflow env.
- `scripts/check-repo.mjs` (source safety lint), `scripts/check-dist.mjs` (third-party-origin scan with allowed anchor hosts), `scripts/check-env.mjs` (Playwright pin must equal the flake's `playwright-driver`) — all feed the CI `test` job.
- `playwright.config.ts` (`E2E_PORT`, `E2E_SECONDARY`), `e2e/*.spec.ts` smoke and axe specs, `e2e/*.secondary.spec.ts` phone-width suite (non-gating).
- `public/tokenizers/` with `NOTICE.md` and manifest — licence and provenance records.
- `dist-base-check/` — Phase 1 non-root-base proof output (already gitignored).

### Established Patterns
- Dev environment is a Nix flake (`flake.nix`, `flake.lock`, `.envrc`); nixpkgs pinned by revision. The CI runner is not Nix, so the workflow installs Node 24 and Playwright browsers itself.
- Routing is root-level: `/what-is-a-token/` with the home at `/` carrying a canonical link. The post URL becomes a public contract once published.
- No `.github/` directory and no git remote exist yet; `gh` is not installed on the dev machine (repo creation and enabling Pages with source "GitHub Actions" are human steps in the GitHub web UI unless `gh` is installed).

### Integration Points
- New: `.github/workflows/deploy.yml`, LICENSE files, README, gitleaks configuration, squashed-history script/steps, Lighthouse run, manual check checklists, reader questionnaire.
- Existing config: `.planning/config.json` `git.branching_strategy` is `"none"`; D-04 changes it.

</code_context>

<specifics>
## Specific Ideas

- The author wants a tidy public `main` (one commit per phase, modelled on squashed feature PRs) while keeping small commits locally for GSD tracking. `.planning/` stays public.
- Repo name was chosen for readers and to leave room for the v1.1 posts: `tokens-explained`.
- The author asked what a Lighthouse score is; keep related explanations in plain language in checklists.

</specifics>

<deferred>
## Deferred Ideas

- Build-time check of quoted splits (FACT-02) — stays in v2.
- Permanent CI guard for "typing sends no network request" — author chose a one-off manual check; could be added later.
- Automated live-URL checks in CI after each deploy — not wanted now.
- Lighthouse score targets and a performance budget gate — report only for now.
- Print and zoom as full manual passes — lighter checks only.
- Further gray areas not discussed: SEO/social metadata, a custom 404 page, analytics (none planned), release announcement.
- v1.1 content (embeddings, context, reasoning posts, hub, disambiguation, glossary) — see Deferred Phase Details in ROADMAP.md.

</deferred>

---

*Phase: 03-harden-release*
*Context gathered: 2026-10-13*

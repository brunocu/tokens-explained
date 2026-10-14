---
gsd_state_version: "1.0"
milestone: v1.1
milestone_name: ) — deferred from the MVP on 2026-10-13
current_phase: 03
current_phase_name: Harden & Release
status: executing
stopped_at: "Completed 03-06-PLAN.md"
last_updated: "2026-10-14T16:41:32.920Z"
last_activity: 2026-10-14
last_activity_desc: Phase 03 execution started
state_head: b66061bd5f40b676ce68af6674a5326304d661ed
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 43
  completed_plans: 41
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-02)

**Core value:** A non-programmer can play with a tokenizer in the browser and come away with a correct mental model of what a token is, and how it differs from a word, an embedding, context, and reasoning.
**Current focus:** Phase 03 — Harden & Release

## Current Position

Phase: 03 (Harden & Release) — EXECUTING
Plan: 7 of 8 (03-06 complete)
Status: Ready to execute 03-07 (Pages source confirmed by the author as "GitHub Actions"; remote emptiness still to be read back)
Last activity: 2026-10-14 — Completed 03-06 (gate passed, Phase 3 squashed to main as f72eb4e, repo brunocu/tokens-explained created; nothing pushed)

Progress: [████████░░] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 35
- Average duration: - min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 7 | - | - |
| 02 | 10 | - | - |
| 2.1 | 10 | - | - |
| 02.2 | 8 | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 12min | 4 tasks | 30 files |
| Phase 01 P02 | 14min | 2 tasks | 15 files |
| Phase 01 P03 | 9 min | 3 tasks | 10 files |
| Phase 01 P04 | 10 min | 3 tasks | 22 files |
| Phase 01 P05 | 6 min | 3 tasks | 8 files |
| Phase 01 P06 | 4min | 2 tasks | 12 files |
| Phase 01 P07 | 6min | 3 tasks | 12 files |
| Phase 02 P01 | 12min | 2 tasks | 3 files |
| Phase 02 P02 | 20min | 3 tasks | 15 files |
| Phase 02 P03 | 25min | 2 tasks | 12 files |
| Phase 02 P05 | 4 min | 3 tasks | 11 files |
| Phase 02 P04 | 55min | 3 tasks | 18 files |
| Phase 02 P06 | 8min | 3 tasks | 16 files |
| Phase 02 P07 | 9min | 3 tasks | 10 files |
| Phase 02 P08 | 10min | 3 tasks | 10 files |
| Phase 2.1 P01 | 6 min | 2 tasks | 11 files |
| Phase 2.1 P02 | 8 min | 2 tasks | 13 files |
| Phase 2.1 P03 | 17min | 3 tasks | 12 files |
| Phase 2.1 P04 | 8 min | 3 tasks | 11 files |
| Phase 2.1 P05 | 15 min | 2 tasks | 15 files |
| Phase 2.1 P06 | 7 min | 2 tasks | 9 files |
| Phase 02.1 P07 | 14 min | 2 tasks | 4 files |
| Phase 02.1 P08 | 12 min | 2 tasks | 23 files |
| Phase 2.2 P01 | 13min | 3 tasks | 7 files |
| Phase 02.2 P02 | 12 min | 2 tasks | 18 files |
| Phase 2.2 P03 | 13 min | 2 tasks | 12 files |
| Phase 02.2 P04 | resumed | 2 tasks | 10 files |
| Phase 02.2 P05 | 25 min | 2 tasks | 10 files |
| Phase 02.2 P06 | 35 min | 2 tasks | 11 files |
| Phase 2.2 P07 | 11 min | 3 tasks | 3 files |
| Phase 02.2 P08 | 10min | 3 tasks | 3 files |
| Phase 03 P01 | 75min | 3 tasks | 4 files |
| Phase 03 P02 | 20min | 3 tasks | 8 files |
| Phase 03 P03 | 30 min | 2 tasks | 4 files |
| Phase 03 P04 | 10 min | 3 tasks | 4 files |
| Phase 03 P05 | 9 min | 3 tasks | 8 files |
| Phase 03 P06 | 25 min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 4 coarse phases, each ending with something a reader can open; Phase 1 is the MVP slice (deployed Post 1 + toy-tokenizer playground)
- [Roadmap]: Post 1 split across Phases 1 and 2 so the playground ships before the riskier real-tokenizer layer
- [Roadmap]: Phase 3 depends only on Phase 1, so a slip in real-tokenizer work does not block Posts 2-4
- [Research]: Astro 7 + MDX + Svelte 5 islands on Cloudflare Workers static assets; toy BPE as a pure function returning a step trace; all tokenizers behind one async backend interface, tokens carried as bytes + `isPartial`
- [Research]: Hybrid real-tokenizer approach: precomputed curated examples (no-JS default) plus lazy-loaded live HF tokenizers for free text
- [Phase 01]: Nix flake dev env pinned by nixpkgs rev c59305b; npm Playwright exact-pinned to flake version and enforced by check-env
- [Phase 01]: Island state variable named phase, not state (Svelte 5 would read $state as a store subscription); data-state values unchanged
- [Phase 01]: Toy tokenizer trained on Alice in Wonderland plus hand-written number/date supplement; 800 merges, ASCII-only, tie-break highest count then smallest (left,right) id pair
- [Phase 01]: train:toy --check reproduces the committed merge count; corpus README hashes must be updated on retrain
- [Phase 01]: Plan 01-03: lifecycle line is shown and hidden by CSS on the card data-state so the failed state works without hydration; Astro retries a failed island import once (?astro-retry=), tests must block the retry URL too
- [Phase 01]: Home page renders the post entry via PostLayout with a canonical link to /what-is-a-token/; Phase 4 replaces only index.astro (PD-01)
- [Phase 01]: Prose states no counts or splits: ToyTokens computes them at build time and assertClaims fails the build on a false claim
- [Phase 01]: Plan 01-05: character grouping runs inside TokenDisplay (groupBytes then layoutChips), no new prop; getViteConfig lets Vitest server-render Svelte, no package added
- [Phase 01]: Plan 01-05: labelFor maps every Unicode control character to the name label control character; label text is a fixed word or one computed code point, never a decoded string
- [Phase 01]: 01-06: table and spoken wording come from groupBytes context; unknown context falls back to hex, never a fallback sentence
- [Phase 01]: 01-06: combined-character note is a plain paragraph under the split note and is not part of the live-region announcement
- [Phase 01]: 01-07: fifth example needs no component change; post byte example is guarded by a TextEncoder test (T-01-22)
- [Phase 02]: A1 whole UDHR Article 1 for all six languages
- [Phase 02]: A2 [UNK] special chips plus '{k} of these are [UNK]' line
- [Phase 02]: A3 BERT subline says 'removes accents'
- [Phase 02]: A4 one shared tie-break comparator in src/core/bpe.ts
- [Phase 02]: A5 Arabic Article 1 checked once against OHCHR page
- [Phase 02]: 02-02: @huggingface/tokenizers pinned exactly at 0.2.0 after human legitimacy check; all added tokens flagged special
- [Phase 02]: 02-02: minimal ambient declarations (src/node-builtins.d.ts) for node:fs/crypto/zlib in tests instead of adding @types/node
- [Phase 02]: 02-03: one BPE tie-break in src/core/bpe.ts shared by trainMerges and the stepper trace; pair-source times are weighted by word count
- [Phase 02]: 02-05: comparison fixture stores tokens as id plus uppercase hex bytes; sentences and sources live only in languages.ts
- [Phase 02]: Plan 02-04: end-of-word mark rendered as aria-hidden glyph plus hidden 'end of word' text everywhere it appears
- [Phase 02]: Plan 02-04: one inline watcher serves every [data-island] card; Phase 1 specs scope locators to [data-playground]
- [Phase 02]: 02-06: licence-notices href built in ComparisonSection.astro from BASE_URL and passed as a prop; legend sentences use a long class so the conditional [UNK] sentence wraps
- [Phase 02]: 02-07: check-dist allows only https anchors to www.ohchr.org and www.un.org, matched by count so an identical script URL still fails
- [Phase 02]: 02-07: languages table is static HTML (works with JavaScript off); only the Look inside picker is an island
- [Phase 02]: 02-08: network-call lint exempted for exactly src/components/loadTokenizer.ts (exact path, self-tested); load button is the only trigger for tokenizer downloads
- [Phase 2.1]: 02.1-01: Fixture change is additive (defaultText plus per-tokenizer download sizes); toy rows and combined size stay until plans 05 and 06
- [Phase 2.1]: 02.1-01: Playground island has two-level state: data-state (island, ready on hydration) and data-tokenizer (GPT-2 download); loader memoised per URL with failed attempts evicted
- [Phase 2.1]: 02.1-02: TokenLegend keeps special for [UNK] and gains marker; specialKinds decides which legend sentences show
- [Phase 2.1]: 02.1-02: buildGpt2 is Node-only (process.cwd, dynamic import, memoised) and never imported by an island; focus moves to Try again only after a reader-started retry fails
- [Phase 2.1]: 02.1-03: openPlaygroundReady in e2e/helpers.ts waits for data-state then data-tokenizer; every playground spec uses it
- [Phase 2.1]: 02.1-03: privacy request budget pinned: the post page makes exactly one gpt2.json request and none for BERT; expected spec numbers are re-derived from buildGpt2, never copied
- [Phase 2.1]: Plan 04: post word ceiling raised 2750 to 2850 (measured 2566 before, 2767 after); reference 20 carries its own read date Oct. 7, 2026; no non-English claim added for lack of a primary source
- [Phase 2.1]: 02.1-05: BERT rows are not byte round-trip tested (lower-case, no spaces, [UNK]); GPT-2 rows are
- [Phase 2.1]: 02.1-06: own-text block requests GPT-2 on mount through the shared memoised loader and BERT only from its sized button; playground and own block retry independently (second retry is instant via the memo)
- [Phase 2.1]: 02.1-06: fixture download metadata is per-tokenizer only (combined figure removed); manifest.json keeps combinedGzipBytes for the hosted-files test
- [Phase 02.1]: 02.1-07: curated comparison locators start at the card's direct children because the own-text block repeats rows, legend and tables inside the same card
- [Phase 02.1]: 02.1-08: Sennrich tie-break golden re-homed on trainOnPieces in stepper.test.ts (verified to fail when the comparator is flipped); isValidUtf8 now lives in chars.ts; check-core smoke-tests GPT-2 natively
- [Phase 2.2]: 02.2-01: baseline of unchanged tree clean on Chromium, Firefox, WebKit (189/188/188 pass, 827 Vitest); MDX imports allowed only in one leading block from ../../components (.svelte or postProps.ts); checkWidgetsHtml unwired until plan 07
- [Phase 02.2]: Stack chip anatomy single-sourced in widget.css (.stack-chip with --regular and --compact); colours stay in component palette selectors — One anatomy for the playground and the stepper without duplicating colour values
- [Phase 02.2]: Hydrated islands are imported at the top of the MDX; build-time props come from postProps.ts, imported only by the MDX — Astro 7 MDX needs the import in the file (G-1); keeps the 47 KB comparison data out of the island chunk (G-5)
- [Phase 2.2]: Playground --widget-h is 656px: smallest multiple of 8 where the left column fits with the failed-download message, Try again, privacy line and limit message all showing (648px overflows by 4px)
- [Phase 2.2]: Height tests read the declared --widget-h from the root and poll, so states with a different page load (and a no-JavaScript page) need no carried number
- [Phase 02.2]: Stepper pair-table max height 200px at 720px widget height; merges 1 and 2 still scroll the words region (42px, 30px), reported not forced
- [Phase 02.2]: Comparison rows region keeps the tables and provenance inside it, so it scrolls for all five examples; the rows and shared legend never need scrolling
- [Phase 02.2]: Comparison BERT failure replaces the idle paragraph in the same block; only the elastic text box gives way
- [Phase 02.2]: 02.2-06: languages widget height is 1040px (cap) with 4fr/8fr columns and a 4px bar gap, set from measurement; 1024px is the ready-state minimum, 1040px keeps the failed state inside the card; open for the author (A-LANG-H)
- [Phase 2.2]: 02.2-07: word ceiling 3350 (measured 3290 plus 50, rounded up); check-dist runs checkWidgetsHtml on both built pages; human visual check, read-through and A-LANG-H decision left pending for verify-work
- [Phase 02.2]: 02.2-08: stacked layouts below 1024px are the base form; TokenRows fill/subgrid and the languages 6-column table apply from 1024px; sentence gets its own line via a 4-track grid per row with explicit ARIA table roles
- [Phase 03]: Publishing identity is brunocu / brunocu@msn.com (real address, author's explicit choice); milestone.lock untracked; single gating build job; report-only budget; playground keeps client:load
- [Phase 03]: History squashed to six commits; pre-squash hashes in earlier STATE/SUMMARY commits: references exist only in archive/pre-publish and the off-repo bundle
- [Phase 03]: 03-02: licence texts downloaded not retyped; MIT holder brunocu 2026; OFL notice cites both Adobe and google/fonts copyright lines for Source Serif 4
- [Phase 03]: 03-03: GPT-4 tokenizer size printed as 100,277 (highest id plus one), one rule for all three sizes; 100,257 was only the end-of-text id
- [Phase 03]: 03-03: details true but beyond the cited page (ASCII line ends, 'thousands of characters') and the UN reuse terms left as is for the author (E4, E5, E7 in 03-FACT-CHECK.md)
- [Phase 03]: 03-04: deploy workflow is one gating test job that builds once and uploads the tested dist; gitleaks action pinned to 8.30.1 via GITLEAKS_VERSION to match the dev shell; E2E_BASE_URL remote mode for the live smoke run
- [Phase 03]: 03-04: gitleaks-action scans nothing on the first push (range starts before the root commit); the local gitleaks git and dir before the first push cover the first publish
- [Phase 03]: 03-05: npm audit fix (plain) applied for http-cache-semantics 4.2.0 to 4.3.0; budget stays report only and Playground stays client:load

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Content contract (posts + 4-term glossary collection with Zod schemas) should be seeded here so later posts reference glossary ids from the start; reader-facing glossary features land in Phase 4. Toy-fidelity design spike needed (Sennrich-style goldens vs byte-level pre-split display; no `<unk>` or `</w>` shown).
- [Phase 2]: Riskiest unknowns live here. Run a parity spike (Mistral, BERT, Qwen ids unverified; only the GPT-2 family cross-checked), verify per-token bytes recovery from HF output, and confirm tokenizer file licenses and Cloudflare limits. Plan the stepper first so it can ship even if the real-tokenizer layer slips.
- [Phase 3]: Re-verify reasoning, context-size and Claude tokenizer vendor facts from primary docs right before writing; date every vendor claim.
- [All]: No non-programmer has tested any of this yet; research-flagged hardening checks (axe/Lighthouse, keyboard and screen-reader pass, mobile performance, fact-check) have no standalone phase and belong in each phase's verification.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 261006-riu | Evaluate dropping the toy tokenizer from the article, and just using GPT-2 tokenizer for the examples and playground | 2026-10-07 | 6ec64b6 | [261006-riu-evaluate-dropping-the-toy-tokenizer-from](./quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/) |
| 2 | Tied-merge explainer leads with the tie | 2026-10-11 | d5aac1a | — |
| 261011-twx | Relax e2e text assertions so prose/UI copy can change without syncing tests | 2026-10-11 | ef43903 | [261011-twx-relax-e2e-text-assertions](./quick/261011-twx-relax-e2e-text-assertions/) |
| 261011-unh | Make TokenDisplay chips a semantic list with spoken labels (FOUND-04) | 2026-10-12 | cdd5b9a | [261011-unh-make-tokendisplay-chips-a-semantic-list-](./quick/261011-unh-make-tokendisplay-chips-a-semantic-list-/) |
| 261011-uww | Close remaining Phase 2.2 verification gaps (check-dist hooks, D-08/TOK-02/FOUND-04 amendments, stale STATE) | 2026-10-12 | f30114f | [261011-uww-close-remaining-phase-2-2-verification-g](./quick/261011-uww-close-remaining-phase-2-2-verification-g/) |
| 261014-ch0 | Use rehype-citation (vancouver, references.bib, unified pipeline) for Post 1 citations | 2026-10-14 | b736960 | [261014-ch0-use-rehype-citation](./quick/261014-ch0-use-rehype-citation/) |

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Replace toy tokenizer with GPT-2 in playground and examples (from quick task 261006-riu evaluation) (URGENT)
- Phase 02.2 inserted after Phase 2: rework widgets (URGENT)
- 2026-10-13 MVP pivot: scope narrowed to Post 1 only. Old Phases 3 (embeddings/context/reasoning posts) and 4 (hub/disambiguation/glossary) deferred to the next milestone (v1.1, provisional Phases 4 and 5); old Phase 5 (Harden & Release) renumbered Phase 3, depends on Phase 2.2, scoped to Post 1 as the site root page. Directory phases/05-harden-release renamed to 03-harden-release

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-10-14T16:41:32.881Z
Stopped at: Completed 03-06-PLAN.md
Resume file: None

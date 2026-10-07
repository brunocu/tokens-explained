---
gsd_state_version: "1.0"
current_phase: 3
current_phase_name: Embeddings, Context & Reasoning Posts
status: planning
stopped_at: Phase 02 complete, ready to plan Phase 3
last_updated: "2026-10-07T01:34:44.168Z"
last_activity: 2026-10-06
last_activity_desc: Phase 02 complete, transitioned to Phase 3
state_head: cf82ff16ed0db018e5bf0a1b37ce02d58358bd93
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 17
  completed_plans: 17
  percent: 40
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-02)

**Core value:** A non-programmer can play with a tokenizer in the browser and come away with a correct mental model of what a token is, and how it differs from a word, an embedding, context, and reasoning.
**Current focus:** Phase 02 — BPE Stepper & Real-Tokenizer Comparison

## Current Position

Phase: 3 — Embeddings, Context & Reasoning Posts
Plan: Not started
Status: Ready to plan
Last activity: 2026-10-06 — Phase 02 complete, transitioned to Phase 3

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 17
- Average duration: - min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 7 | - | - |
| 02 | 10 | - | - |

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Content contract (posts + 4-term glossary collection with Zod schemas) should be seeded here so later posts reference glossary ids from the start; reader-facing glossary features land in Phase 4. Toy-fidelity design spike needed (Sennrich-style goldens vs byte-level pre-split display; no `<unk>` or `</w>` shown).
- [Phase 2]: Riskiest unknowns live here. Run a parity spike (Mistral, BERT, Qwen ids unverified; only the GPT-2 family cross-checked), verify per-token bytes recovery from HF output, and confirm tokenizer file licenses and Cloudflare limits. Plan the stepper first so it can ship even if the real-tokenizer layer slips.
- [Phase 3]: Re-verify reasoning, context-size and Claude tokenizer vendor facts from primary docs right before writing; date every vendor claim.
- [All]: No non-programmer has tested any of this yet; research-flagged hardening checks (axe/Lighthouse, keyboard and screen-reader pass, mobile performance, fact-check) have no standalone phase and belong in each phase's verification.

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-10-06T16:45:02.263Z
Stopped at: Phase 02 complete, ready to plan Phase 3
Resume file: None

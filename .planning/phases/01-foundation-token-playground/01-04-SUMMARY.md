---
phase: 01-foundation-token-playground
plan: 04
subsystem: content
tags: [astro, mdx, content-collections, accessibility, axe, playwright, build-time-claims]

requires:
  - phase: 01-03
    provides: "TokenDisplay, Playground island, BaseLayout, test hooks, design tokens"
provides:
  - "posts and glossary content collections with Zod schemas and a glossary reference"
  - "The complete Post 1 prose at /what-is-a-token/ and as the home page, every split and count produced by the shipped tokenizer at build time"
  - "claims.ts (checkClaim, assertClaims): a false prose claim fails the build"
  - "ToyTokens, PlaygroundSection and PostLayout components; the root-level [slug] route with a base-aware canonical"
  - "Executable content rules (post-content.test.ts) and four glossary entries"
  - "Phase-wide verification: axe (light and dark), 22-entry corpus through the DOM, throttled freeze guard, three-browser suite, non-root base proof, secondary phone-width suite"
affects: [phase-02, phase-03, phase-04, phase-05]

plan_head_before: 5d3b6b8deb1c82ea304a8208ddf787d94aa27ff3
plan_head_after: 643e40dcbdda35ccc0ce3fdc2d0ef22660533666
actuals:
  tokens: 13700
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Closed MDX component vocabulary: the post has no imports; PostLayout passes { PlaygroundSection, ToyTokens }"
    - "Prose never states a count or a split; ToyTokens computes them at build time and assertClaims fails the build on a false claim"
    - "Specs address the playground through [data-playground] because prose chips share the page"
    - "Route namespace rule: [slug] shares the root with static pages, so a post slug must not collide with a static page name"

key-files:
  created:
    - src/content.config.ts
    - src/content/glossary/token.yaml
    - src/content/glossary/embedding.yaml
    - src/content/glossary/context.yaml
    - src/content/glossary/reasoning.yaml
    - src/content/posts/what-is-a-token.mdx
    - src/content/post-content.test.ts
    - src/components/prose/ToyTokens.astro
    - src/components/wrappers/PlaygroundSection.astro
    - src/layouts/PostLayout.astro
    - "src/pages/[slug].astro"
    - src/core/claims.ts
    - src/core/claims.test.ts
    - e2e/post.spec.ts
    - e2e/a11y.spec.ts
    - e2e/resilience.spec.ts
    - e2e/phone-width.secondary.spec.ts
  modified:
    - src/pages/index.astro
    - e2e/playground.spec.ts
    - e2e/controls.spec.ts
    - e2e/states.spec.ts
    - e2e/smoke.spec.ts

key-decisions:
  - "Home page renders the post entry through PostLayout with a canonical link to /what-is-a-token/ (PD-01); Phase 4 replaces only index.astro"
  - "The first ToyTokens example carries the legend; the emoji example carries the computed split note; captions show computed token and word counts"
  - "Control-character and lone-surrogate corpus entries are set inside the page from UTF-16 code units, because Firefox fill() drops NUL and a lone surrogate may not survive the transport"

patterns-established:
  - "Content rules live in a Vitest file that reads the MDX through a ?raw import (no node: imports)"
  - "Every prose example exposes a visually hidden 'Tokens for the example: ...' sentence and its chips are aria-hidden"

requirements-completed: [TOK-10, FOUND-01, FOUND-02, FOUND-04]

coverage:
  - id: D1
    description: "Complete Post 1 at /what-is-a-token/ and as the home page, five sections in order with the playground mid-post, exact required sentences, no code, links or promises"
    requirement: "TOK-10"
    verification:
      - kind: unit
        ref: "src/content/post-content.test.ts (42 tests)"
        status: pass
      - kind: e2e
        ref: "e2e/post.spec.ts (a to i) on chromium, firefox, webkit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every prose split and count produced at build time by the shipped tokenizer; a false claim fails the build; hidden text alternative for each example"
    requirement: "TOK-10, FOUND-04"
    verification:
      - kind: unit
        ref: "src/core/claims.test.ts (13 tests)"
        status: pass
      - kind: e2e
        ref: "e2e/post.spec.ts (a)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Content collections validate with Zod; post references glossary entry token; glossary has four entries"
    requirement: "FOUND-01"
    verification:
      - kind: other
        ref: "npm run build and npm run check (content synced, 0 errors); post-content.test.ts glossary tests"
        status: pass
    human_judgment: false
  - id: D4
    description: "Root-level URL, home page canonical, base-aware routing, works under /base-check"
    requirement: "FOUND-01"
    verification:
      - kind: e2e
        ref: "e2e/post.spec.ts (d, e) default base; npm run check:base plus post and a11y specs under /base-check"
        status: pass
    human_judgment: false
  - id: D5
    description: "axe WCAG 2.2 A and AA clean in light and dark at 1280 px with partial chips and the table open; heading outline, lang, one main, reduced motion"
    requirement: "FOUND-02, FOUND-04"
    verification:
      - kind: e2e
        ref: "e2e/a11y.spec.ts on chromium, firefox, webkit"
        status: pass
    human_judgment: false
  - id: D6
    description: "All 22 regression-corpus entries through the real DOM: chips equal table rows, Characters equals graphemes, no U+FFFD; exact counts for merge-independent entries; throttled render guard"
    requirement: "FOUND-04"
    verification:
      - kind: e2e
        ref: "e2e/resilience.spec.ts on chromium, firefox, webkit (guard on chromium)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Colour-blindness simulation, real screen-reader pass, real IME and right-to-left input, real-machine glyph coverage, non-programmer read-through"
    verification: []
    human_judgment: true
    rationale: "Five manual checks no automation can perform; recorded below as deferred to the human (headless glyph screenshots taken as a partial look)."

duration: 10min
completed: 2026-10-03
status: complete
---

# Phase 1 Plan 04: Complete Post, Root-Level Routing and Phase-Wide Verification Summary

**The full "What is a token?" post is built from MDX at /what-is-a-token/ and as the home page, with every split and count in the prose computed by the shipped tokenizer at build time (a false claim fails the build), and the static build verified by axe in both themes, the 22-entry corpus through the DOM, a throttled freeze guard, three desktop browsers and a non-root base.**

## Performance

- **Duration:** about 10 min (2026-10-03T23:01Z to 23:11Z)
- **Tasks:** 3 (1 tracer, 2 auto)
- **Files:** 17 created, 5 modified (excluding .planning)

## Accomplishments

- Content contract: `posts` and `glossary` collections (Zod, `reference("glossary")`), four glossary one-liners for Phases 3 and 4 to refine.
- `ToyTokens` renders the shared `TokenDisplay` statically, computes caption counts, runs `assertClaims`, and adds a hidden "Tokens for the example: ..." sentence; the chips stay aria-hidden.
- The post (608 words with frontmatter) has the five sections in order with the playground between "Tokens are not words" and "What you just saw", all required exact sentences, the byte definition at its first use, IDs only after the correction, and honest toy framing. Rendered at 1280 px in light and dark and looked at: the layout matches the UI-SPEC.
- `post-content.test.ts` encodes the content rules (headings, required sentences, analogy and promise vocabulary, no code or links, no hand-typed counts or splits, every `ToyTokens` carries `expect`, word range, "you" count) plus glossary shape: 42 tests.
- Verification: `check:env`, `check:deps`, `check:repo` (21 files), `check`, `check:svelte`, 199 Vitest tests, build, `check:dist` all OK; 202 Playwright runs passed across chromium, firefox and webkit (2 skipped by design: the CPU-throttle guard is Chromium only); `check:base` OK.

## Task Commits

1. **Task 1 (tracer): collections, ToyTokens with build-time claims, root-level post route** - `6c3d730` (feat)
2. **Task 2: complete post, glossary, home page as the post, content rules test** - `a2f8c53` (feat)
3. **Task 3: axe, corpus through the DOM, freeze guard, secondary phone suite** - `643e40d` (test)

Tracer gate: the tracer `<verify>` carried only automated checks, so it was re-run end to end after the commit (test, check, check:svelte, build, check:dist, post spec on chromium: all green) and expansion continued without a checkpoint.

## Measured results

- **Throttled render guard (4x CPU, Chromium, 1,000 CJK characters to 3,000 chips):** 360 ms run alone, 701 to 704 ms inside the full 12-worker suite (limit 5,000 ms).
- **check:base:** `check-base: OK` (build under `/base-check`, 22 URLs scanned in `dist-base-check`, smoke spec 4/4). In addition `post.spec.ts` and `a11y.spec.ts` (13 tests) were run by hand against the `/base-check` build and passed, so the canonical-URL and header-link assertions are proven base-aware.
- **axe:** 0 WCAG 2.2 A/AA violations, light and dark at 1280 px, on all three desktop engines.
- **Cross-engine differences:** none in behaviour. One input-transport difference: Firefox `fill()` silently drops NUL characters (the `control-chars` entry produced an empty textarea); the page itself handles the value correctly (4 chips once set from code units).
- **Secondary phone-width suite (`npm run test:e2e:secondary`, never gating), 8 of 8 passed:** 360 px axe light: pass; 360 px axe dark: pass; long word and 1,000 CJK characters with the table open cause no horizontal page scroll: pass; phone profile loads, card ready, chips present, no console error: pass; plus the four smoke tests on the Pixel 7 profile: pass.

## Manual checks (recorded as deferred to the human; none can be performed by this executor)

1. **Desktop glyph coverage: deferred to the human.** Partial evidence only: headless Firefox and Chromium screenshots (Nix-hosted browsers) show the space, new-line and tab glyphs as visible symbols and the emoji pieces as hatched hex chips. Not representative of the machine's own fonts, so the real check is still open. If a glyph is a box, change the constants in `src/core/display.ts` to U+00B7.
2. **Colour-blindness simulation: deferred to the human.**
3. **Desktop screen-reader pass (NVDA, Orca or VoiceOver): deferred to the human.**
4. **Real IME composition and right-to-left input: deferred to the human.** (Arabic and Hebrew entries pass the automated corpus checks: no U+FFFD, chips equal table rows.)
5. **Non-programmer read-through: deferred to the human.** TOK-10 and ROADMAP criterion 6 rest on this; the automated rules only prove the required sentences, the vocabulary limits and that quoted examples match the tokenizer.

## Research assumptions

- **A4** (input versus compositionend ordering, idempotent `commit()`): not refuted by any automated run; real IME check deferred (item 4).
- **A5** (public-domain corpus acceptable): unchanged, no objection raised; a licence check remains an author decision.
- **A7** (800 merges is the right size): the toy is quite fragmented: the default sentence of 11 words is 27 tokens, and "hello" is three tokens (he, ll, o). That suits the lesson ("tokens are not words") and is stated honestly in the post, but the author may want to retune. Not changed here.
- **A8, desktop half:** headless Chromium and Firefox render the glyphs; real-machine confirmation deferred (item 1). The iOS and Android half moved to Phase 5.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's claim test assumed "hello" is a single token**
- **Found during:** Task 1
- **Issue:** The shipped toy splits "hello" into he, ll, o, so "hello satisfies none of the five claims" was false.
- **Fix:** The "none" case uses "to" (plus "" and "a"); a separate test asserts that "hello" satisfies exactly more-tokens-than-words and has-word-split. The claim logic follows the plan unchanged.
- **Files modified:** `src/core/claims.test.ts`
- **Commit:** 6c3d730

**2. [Rule 1 - Bug] Earlier playground specs broke once the home page carried prose chips**
- **Found during:** Task 2 (full chromium run: 8 failures)
- **Issue:** `playground`, `controls`, `states` and `smoke` specs counted `[data-chip]`, `[data-legend]`, `[data-split-note]`, `[data-ws]`, `[data-brk]` and `.chips` page-wide; the post's `ToyTokens` figures now match them too.
- **Fix:** The locators are scoped under `[data-playground]`. No assertion was weakened.
- **Files modified:** `e2e/playground.spec.ts`, `e2e/controls.spec.ts`, `e2e/states.spec.ts`, `e2e/smoke.spec.ts`
- **Commit:** a2f8c53

**3. [Rule 1 - Bug] Corpus spec expectations**
- **Found during:** Task 3
- **Issue:** I first wrote `japanese: partial 0`; the nine pieces are all single bytes of multi-byte characters, so all nine are partial. Separately, Firefox `fill()` drops NUL, emptying the `control-chars` entry.
- **Fix:** Expectation corrected to 9 partial chips; `control-chars` joins `lone-surrogate` in being set inside the page from UTF-16 code units.
- **Files modified:** `e2e/resilience.spec.ts`
- **Commit:** 643e40d

### Additions beyond the plan text

- Extra post tests (home and post pages, links, headings order, the no-JS view) and glossary shape tests; extra a11y structure and reduced-motion tests.
- The `/base-check` build was also exercised with `post.spec.ts` and `a11y.spec.ts`, beyond what `check:base` runs.
- Wording of the post: "A tokenizer is the program that cuts text into tokens" and the "small tokenizer built for teaching" caveat sit in the "Tokens are not words" section so the toy is flagged before the first example; "a real chat model may cut some of this text differently" is deliberately hedged.

---

**Total deviations:** 3 auto-fixed (all Rule 1, test-side). **Impact on plan:** none on scope or production behaviour.

## Issues Encountered

None open. `pkill -f "astro preview"` terminated the executor's own shell once (the pattern matched its command line); no state was affected and the commit was redone.

## Known Stubs

None. No placeholder text, empty data flows or "coming soon" copy exist in the post or components.

## Threat surface

No new network endpoints, storage or injection sinks. T-01-15 (MDX at build time) accepted, closed vocabulary enforced by `post-content.test.ts`; T-01-16 mitigated by `assertClaims` and the content rules; T-01-17 mitigated and measured (360 to 704 ms under 4x throttling); T-01-SC: no packages added, `check-deps: OK`. `.github` does not exist.

## User Setup Required

None.

## Next Phase Readiness

- Phase 1 plans are complete; the five manual checks above remain with the human, as does ROADMAP criterion 6 (a real reader's understanding).
- Phase 2 can add sections to `what-is-a-token.mdx` using only `ToyTokens` and `PlaygroundSection` (or extend the component vocabulary in `PostLayout`); a new post slug must not collide with a static page name. Phase 4 replaces only `src/pages/index.astro`.
- Phase 5: deployment, real-device glyph checks and the 360 px visual check (see `.planning/phases/05-harden-release/DEFERRED-FROM-PHASE-1.md`); the secondary suite is green today.

---
*Phase: 01-foundation-token-playground*
*Completed: 2026-10-03*

## Self-Check: PASSED

All created files exist on disk; commits 6c3d730, a2f8c53 and 643e40d exist; the plan's acceptance criteria were re-run (post-content 42 tests, claims 13 tests, dist artefacts, canonical, no posts route, check:deps OK, no .github, desktop projects do not list the secondary spec).

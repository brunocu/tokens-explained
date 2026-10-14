# Roadmap: Tokenizer Vis

## Overview

Tokenizer Vis is a short series of interactive posts that give a non-programmer a correct mental model of "token", "embedding", "context" and "reasoning".

**MVP scope (revised 2026-10-13):** after writing Post 1, the author narrowed the MVP to the core "What is a token?" post alone. The MVP journey starts with the smallest slice that proves the core value: a "What is a token?" post where a reader types text into a real tokenizer (GPT-2) and sees accessible, correctly rendered tokens (Phase 1; amended by Phase 2.1). It deepens Post 1 with the step-through BPE trainer and honest comparison against real model tokenizers (Phase 2), reworks the four widgets into one consistent layout (Phase 2.2), and finishes by publishing Post 1 as the site's root page and checking it end to end (Phase 3). The embeddings, context and reasoning posts, the "start here" hub, the disambiguation page and glossary tooltips move to the next milestone (v1.1). Every phase ends with something a reader can open and use.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Token Playground** - Deployed "What is a token?" post with a live GPT-2 playground and the shared, accessible token display (completed 2026-10-05; amended by Phase 2.1)
- [x] **Phase 2: BPE Stepper & Real-Tokenizer Comparison** - Step-through BPE trainer and GPT-2-vs-BERT comparison, completing Post 1 (completed 2026-10-06; amended by Phase 2.1)
- [x] **Phase 2.1: Replace the toy with GPT-2** - (INSERTED) real GPT-2 tokenizer in the playground and examples (completed 2026-10-07)
- [x] **Phase 2.2: Rework widgets** - (INSERTED) consistent layout for the four Post 1 widgets (completed 2026-10-13)
- [ ] **Phase 3: Harden & Release** - Remote repo, GitHub Pages deploy and CI with Post 1 as the root page, then accessibility, performance, fact-check and reader-testing passes before release (renumbered from Phase 5 on 2026-10-13)

### Next milestone (v1.1) — deferred from the MVP on 2026-10-13

Details are kept under "Deferred Phase Details" below. They are not part of the MVP and are renumbered when the next milestone starts.

- [ ] **Phase 4: Embeddings, Context & Reasoning Posts** (was Phase 3) - Three posts that separate embedding, context and reasoning from "token"
- [ ] **Phase 5: Hub, Disambiguation & Glossary** (was Phase 4) - "Start here" hub, side-by-side disambiguation page and glossary tooltips that tie the series together

## Phase Details

### Phase 1: Foundation & Token Playground

**Goal**: A reader can open the "What is a token?" post (served locally in Phase 1; deployed in Phase 3) and play with a tokenizer in the browser, using a shared, accessible token display that every later post reuses
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, TOK-01, TOK-02, TOK-03, TOK-04, TOK-10
**Success Criteria** (what must be TRUE):
  1. The site builds to fully static files (`astro build`, viewable with `astro preview` on the post URL `/what-is-a-token/`) that need no server, account or setup in a desktop browser; mobile is secondary for the MVP. Public deployment is verified in Phase 3
  2. A reader can type text into the playground and see it split into colored tokens, with token, character and word counts, a toggle between token text and token IDs, example-text chips, and a reset to the default text
  3. A reader can tell where each token starts and ends without relying on color (separators or outlines), and can see whitespace inside tokens (such as a leading space) as a visible glyph
  4. A reader who types an emoji or other multi-byte character sees the pieces of a split character as partial-character chips, and a replacement symbol never appears; the playground uses a real tokenizer (GPT-2) whose output comes from bytes after a pre-split step (amended by Phase 2.1)
  5. A keyboard or screen-reader user can reach a text or table alternative of the tokens and operate every control from the keyboard, and a reader with reduced-motion enabled sees no animated transitions
  6. A reader with no programming background can read the post, which defines "token" in plain language and corrects the "token = word" misconception without code or math

**Plans**: 7/7 plans complete

Plans:
**Wave 1**
- [x] 01-01-PLAN.md — Walking skeleton: Nix flake + direnv dev environment, package approval gate, scaffold, byte-level tokenizer tracer, guards, non-root-base proof

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — Toy tokenizer core: offline training, shipped merges, counts, display helpers, regression goldens

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-03-PLAN.md — Token display and playground: chips, controls, table alternative, live region, lifecycle, privacy

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 01-04-PLAN.md — Post, content contract and phase verification: ToyTokens, root-level post, axe, corpus, desktop browser matrix, secondary phone-width suite

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 01-05-PLAN.md — UI-SPEC R-01 character frames: bytes-only grouping core, framed chips and labels, invalid and placeholder frames, byte-line grouping, server-rendered component tests

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 01-06-PLAN.md — UI-SPEC R-01 wording: table and screen-reader text per byte, legend, combined-character note

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 01-07-PLAN.md — UI-SPEC R-01 surfaces and re-verification: fifth example, post takeaway, corpus frame counts, axe with frames, 360 px frames, full suite

**UI hint**: yes

### Phase 2: BPE Stepper & Real-Tokenizer Comparison

**Goal**: A reader can watch a tokenizer's vocabulary being built one merge at a time, then see how two real tokenizers of different kinds, GPT-2 and BERT, compare on tricky inputs, completing Post 1 (amended by Phase 2.1)
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: TOK-05, TOK-06, TOK-07, TOK-08, TOK-09
**Success Criteria** (what must be TRUE):
  1. A reader can step through BPE merges on a small corpus using Next, Back and Reset, seeing the merged pair and the updated tokens at every step
  2. At every BPE step, a reader can see the pair counts and the tie-break rule that decided which pair merged
  3. A reader can compare GPT-2 and BERT side by side on curated inputs (numbers, emoji, other languages), with each tokenizer clearly labelled and named with its year (amended by Phase 2.1)
  4. A reader can see the same sentence in many languages and how the token counts differ
  5. Every comparison carries a short plain-language note saying what to notice
  6. The complete Post 1 prose has had a non-programmer read-through (deferred from Phase 1 UAT test 5), including whether the GPT-2 passages ("common words stay whole", the note that the playground's ids are GPT-2's own numbering, and the step from the stepper to GPT-2) read clearly, and the author's notes on the article are resolved (amended by Phase 2.1)

**Plans**: 10/10 plans complete

Plans:
**Wave 1**
- [x] 02-01-PLAN.md — Decisions and amendments: confirm the five open research answers, amend REQUIREMENTS TOK-07, ROADMAP criterion 3 and the UI-SPEC (R-02)
- [x] 02-02-PLAN.md — Real-tokenizer engine: package legitimacy gate, exact-pin install and allow-list, self-hosted GPT-2 and BERT files with manifest and notices, pure adapter, Python-reference parity golden

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02-03-PLAN.md — Stepper tracer and pure core: shared tie-break comparator, eight-step trace, why sentences, section in the post
- [x] 02-05-PLAN.md — Comparison data: dated precompute script and fixture for five examples and six UDHR Article 1 sentences, freshness test, row names, hand-written notes

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 02-04-PLAN.md — Stepper UI: generalised island lifecycle watcher, pair table, chips, vocabulary, legend, final screen, focus and motion, axe, post prose

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 02-06-PLAN.md — Comparison UI: picker, three tokenizer rows, special chip, shared legend, notes, tables, source line, lifecycle

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 02-07-PLAN.md — Languages demo: counts table with bars and UNK line, source and dates, citation-link allow-list, look-inside picker

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 02-08-PLAN.md — Own-text block: explicit load button, two requests, live rows, error and retry states, repo-lint exemption, base-proof step

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 02-09-PLAN.md — Post assembly: softened claims, reworked third step, full three-browser gate, author-notes slot, non-programmer read-through

**UI hint**: yes

### Phase 02.2: rework widgets (INSERTED)

**Goal:** The four Post 1 widgets (playground, BPE stepper, comparison, languages) look and behave consistently: a fixed height per widget on wide screens, 960px wide centred on the 680px reading column, two columns from 1024px and one automatic-height column below, no `.astro` wrappers (headings and prose in the MDX, widgets placed as Svelte islands), the languages table and its picker merged into one widget, and the playground showing token text as chips, with a "Show token IDs" switch (off by default) that stacks each token's ID under its text (D-08 amended by the author 2026-10-11).
**Requirements**: none assigned; traced to decisions D-01 to D-14 in 02.2-CONTEXT.md
**Depends on:** Phase 2
**Plans:** 8/8 plans complete

Plans:
**Wave 1**
- [x] 02.2-01-PLAN.md — Wave 0: baseline of the unchanged tree, content-test and locator migration, layout helpers and red layout spec, check-dist functions

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02.2-02-PLAN.md — Tracer: playground as a two-column widget through the MDX import (widget.css, ScrollRegion, postProps), then the two-line stack chip

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 02.2-03-PLAN.md — Playground completion: neutral copy, toggle-spec migration, height across states in three browsers

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 02.2-04-PLAN.md — BPE stepper at 720px with compact chips, regions and height across 14 stages

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 02.2-05-PLAN.md — Comparison widget, comparisonProps, height across states

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 02.2-06-PLAN.md — Merged languages widget (full-width table), six texts, height across states

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 02.2-07-PLAN.md — Cleanup, dist check wired in, full three-browser gate, human-gated visual check and read-through

**Gap closure** *(from 02.2-UAT.md test 1)*
- [x] 02.2-08-PLAN.md — Stacked-view fixes: comparison rows no longer overlap below 1024px (G-02.2-1a), languages sentence on its own full-width line below 1024px (G-02.2-1b)

### Phase 02.1: Replace toy tokenizer with GPT-2 in playground and examples (from quick task 261006-riu evaluation) (INSERTED)

**Goal:** A reader types into, and sees examples cut by, the real GPT-2 tokenizer everywhere in Post 1 (playground, figures, build-time claims), the comparison is GPT-2 versus BERT, the dead toy-tokenizer code is deleted, the BPE stepper stays as a labelled miniature, and the affected prose is rewritten and re-verified by a non-programmer read-through
**Mode:** standard
**Requirements**: FOUND-07, TOK-07 (amended and reopened by this phase; Complete again only when it verifies)
**Depends on:** Phase 2
**Plans:** 10/10 plans complete

Plans:
**Wave 1**
- [x] 02.1-01-PLAN.md — Tracer: GPT-2 end to end in the playground (default tokens in the fixture, client:load, locked textbox until ready, two-level state) and the memoised loader

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02.1-02-PLAN.md — Playground failure and retry state, special-token legend sentence, Node-side GPT-2 helper, display-layer unit tests migrated to GPT-2

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 02.1-03-PLAN.md — Playground end-to-end specs: shared ready-helper, GPT-2 numbers, failure and retry, privacy request budget

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 02.1-04-PLAN.md — Prose and figures: build-time GPT-2 figures and claims, stepper-to-GPT-2 bridge, id sentence, "why GPT-2" note, stepper lead-in, content and post specs

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 02.1-05-PLAN.md — Comparison and languages: retired tokenizer removed from fixture, rows and displays; notes and languages lead-in rewritten

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 02.1-06-PLAN.md — Own-text block: GPT-2 live without a button, BERT on click, per-tokenizer sizes, rewritten specs, base-path proof

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 02.1-07-PLAN.md — Comparison, languages and accessibility specs for two tokenizers; whole chromium suite green

**Wave 8** *(blocked on Wave 7 completion)*
- [x] 02.1-08-PLAN.md — Delete the toy tokenizer, trainer and corpus; re-home the Sennrich golden; GPT-2 Node smoke check

**Wave 9** *(blocked on Wave 8 completion)*
- [x] 02.1-09-PLAN.md — Amend requirements and roadmap, Phase 5 hand-off, three-browser gate, author-notes slot, human read-through, flip FOUND-07 and TOK-07 to Complete

**Wave 10** *(gap closure, blocked on Wave 9 completion)*
- [x] 02.1-10-PLAN.md — Gap closure G-02.1-3: a successful GPT-2 retry in one widget clears the error in every widget (loader success signal, shared download controller, unit and end-to-end tests)

**UI hint**: yes

### Phase 3: Harden & Release

**Goal**: Post 1, "What is a token?", is published as the site's root page on a public URL and has been checked end to end: deployed, accessible, fast on a throttled connection, factually current, and readable by non-programmers
**Depends on**: Phase 2.2
**Requirements**: FOUND-01 (deployed-site verification, deferred from Phase 1)
**Success Criteria** (what must be TRUE):
  1. A reader can open the site's public GitHub Pages URL and land directly on Post 1 with no install, account or setup (Post 1 is the root page; there is no hub or placeholder index in the MVP), and every link and asset works under the sub-path base
  2. Pushing to main builds, tests and deploys the site through CI, and the live URL passes the same smoke tests as the local build
  3. The site passes automated accessibility checks (axe, Lighthouse) plus keyboard-only, screen-reader and colour-blind checks, and also works in dark mode, print and zoom
  4. Typing in the playground sends no network request; the initial bundle fits its budget on a throttled connection; a mobile layout is usable (mobile is secondary for v1)
  5. Every quoted split, vendor fact and definition in Post 1 has been re-verified against current sources and dated, and `npm audit` has been re-checked
  6. At least two non-programmers have read Post 1 and their confusion points are resolved or recorded

**Plans:** 6/8 plans executed

Plans:
**Wave 1**
- [x] 03-01-PLAN.md — History baseline: squash rehearsal, identity and lock-file decisions, per-phase baseline commits, local archive, phase branch

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 03-02-PLAN.md — Release tracer: favicon under the production base, licences, README, font notice, licence footer
- [x] 03-03-PLAN.md — Fact re-verification of the 26 references, tokenizer facts and numbers; refreshed access dates in References

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 03-04-PLAN.md — Deploy workflow (test gates deploy), gitleaks in the dev shell, remote-base e2e mode, local-squash release runbook

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 03-05-PLAN.md — Hardening evidence (budget, reflow/print/dark, freeze guard, audit) and manual-check kits with reader questionnaire

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 03-06-PLAN.md — Full local gate, squash-merge to main, empty public repository and Pages source (human step) (Tasks 1-2 done; Task 3 human step pending)

**Wave 6** *(blocked on Wave 5 completion)*
- [ ] 03-07-PLAN.md — Remote read-back, publish go/no-go, push main only, first deployment and live URL

**Wave 7** *(blocked on Wave 6 completion)*
- [ ] 03-08-PLAN.md — Live smoke run, headers and Lighthouse report, two reader sessions, limitations note, branch-per-phase config

**UI hint**: no

## Deferred Phase Details (next milestone, v1.1)

Deferred from the MVP on 2026-10-13 when the author narrowed it to Post 1. Phase numbers 4 and 5 are provisional and are reassigned when the next milestone is created. Their requirements (EMB, CTX, REAS, SITE) stay in REQUIREMENTS.md, marked deferred.

### Phase 4: Embeddings, Context & Reasoning Posts (deferred; was Phase 3)

**Goal**: A reader can tell a token apart from an embedding, understand context as "what is in the prompt right now", and understand "reasoning" as extra generated tokens
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: EMB-01, EMB-02, EMB-03, CTX-01, CTX-02, REAS-01, REAS-02
**Success Criteria** (what must be TRUE):
  1. A reader can watch a token become an ID and then a toy vector in a lookup strip, with the vectors clearly labelled as illustrative rather than real model values
  2. A reader can read the embeddings post and come away knowing a token is an ID and an embedding is a vector, with the different senses of "embedding" named
  3. A reader can read the context post and learn that the context window is what is in the prompt right now rather than memory, covering input, output and hidden text, and can see a static worked example of a window filling up and what happens when it overflows
  4. A reader can read the reasoning post and learn that "reasoning" is additional generated tokens, with vendor-specific details marked with an "as of" date
  5. A reader can see a static worked example contrasting an answer with and without reasoning, with tokens generated, tokens shown and tokens billed kept separate

**Plans**: TBD
**UI hint**: yes

### Phase 5: Hub, Disambiguation & Glossary (deferred; was Phase 4)

**Goal**: A reader can enter the series from a "start here" hub, see the four terms side by side, and check any term's definition from inside a post, with definitions that never disagree
**Mode:** mvp
**Depends on**: Phase 2, Phase 4 (the posts it links)
**Requirements**: SITE-01, SITE-02, SITE-03, SITE-04
**Success Criteria** (what must be TRUE):
  1. A reader can open a "start here" hub page that lists the posts in a recommended but optional order, and can open any post directly from it
  2. A reader can open a disambiguation page that puts token, embedding, context and reasoning side by side
  3. The definitions on the disambiguation page are the same entries used in the posts, so changing a glossary entry changes it everywhere and the two never disagree
  4. A reader can hover or tap a glossary term in any post (also reachable by keyboard) to see its definition and follow a link to the glossary

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
MVP phases execute in numeric order: 1 → 2 → 2.1 → 2.2 → 3. Phases 4 and 5 belong to the next milestone (v1.1) and are not scheduled.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Token Playground | 7/7 | Complete    | 2026-10-05 |
| 2. BPE Stepper & Real-Tokenizer Comparison | 10/10 | Complete    | 2026-10-06 |
| 2.1. Replace the toy with GPT-2 | 10/10 | Complete    | 2026-10-07 |
| 2.2. Rework widgets | 8/8 | Complete    | 2026-10-13 |
| 3. Harden & Release | 6/8 | In Progress|  |
| 4. Embeddings, Context & Reasoning Posts (v1.1) | 0/TBD | Deferred | - |
| 5. Hub, Disambiguation & Glossary (v1.1) | 0/TBD | Deferred | - |

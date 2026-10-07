# Roadmap: Tokenizer Vis

## Overview

Tokenizer Vis is a short series of interactive posts that give a non-programmer a correct mental model of "token", "embedding", "context" and "reasoning". The journey starts with the smallest slice that proves the core value: a deployed "What is a token?" post where a reader types text into a real tokenizer (GPT-2) and sees accessible, correctly rendered tokens (Phase 1; amended by Phase 2.1). It then deepens Post 1 with the step-through BPE trainer and honest comparison against real model tokenizers (Phase 2), adds the embeddings, context and reasoning posts that reuse the shared pieces (Phase 3), and finishes by tying the series together with a "start here" hub, a glossary-driven disambiguation page and glossary tooltips (Phase 4). Every phase ends with something a reader can open and use.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Token Playground** - Deployed "What is a token?" post with a live GPT-2 playground and the shared, accessible token display (completed 2026-10-05; amended by Phase 2.1)
- [x] **Phase 2: BPE Stepper & Real-Tokenizer Comparison** - Step-through BPE trainer and GPT-2-vs-BERT comparison, completing Post 1 (completed 2026-10-06; amended by Phase 2.1)
- [ ] **Phase 3: Embeddings, Context & Reasoning Posts** - Three posts that separate embedding, context and reasoning from "token"
- [ ] **Phase 4: Hub, Disambiguation & Glossary** - "Start here" hub, side-by-side disambiguation page and glossary tooltips that tie the series together
- [ ] **Phase 5: Harden & Release** - Remote repo, GitHub Pages deploy and CI, then accessibility, performance, fact-check and reader-testing passes before release

## Phase Details

### Phase 1: Foundation & Token Playground

**Goal**: A reader can open the "What is a token?" post (served locally in Phase 1; deployed in Phase 5) and play with a tokenizer in the browser, using a shared, accessible token display that every later post reuses
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, TOK-01, TOK-02, TOK-03, TOK-04, TOK-10
**Success Criteria** (what must be TRUE):
  1. The site builds to fully static files (`astro build`, viewable with `astro preview` on the post URL `/what-is-a-token/`) that need no server, account or setup in a desktop browser; mobile is secondary for the MVP. Public deployment is verified in Phase 5
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

### Phase 3: Embeddings, Context & Reasoning Posts

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

### Phase 4: Hub, Disambiguation & Glossary

**Goal**: A reader can enter the series from a "start here" hub, see the four terms side by side, and check any term's definition from inside a post, with definitions that never disagree
**Mode:** mvp
**Depends on**: Phase 2, Phase 3
**Requirements**: SITE-01, SITE-02, SITE-03, SITE-04
**Success Criteria** (what must be TRUE):
  1. A reader can open a "start here" hub page that lists the posts in a recommended but optional order, and can open any post directly from it
  2. A reader can open a disambiguation page that puts token, embedding, context and reasoning side by side
  3. The definitions on the disambiguation page are the same entries used in the posts, so changing a glossary entry changes it everywhere and the two never disagree
  4. A reader can hover or tap a glossary term in any post (also reachable by keyboard) to see its definition and follow a link to the glossary

**Plans**: TBD
**UI hint**: yes

### Phase 5: Harden & Release

**Goal**: The finished series is published on a public URL and has been checked end to end: deployed, accessible, fast on a throttled connection, factually current, and readable by non-programmers
**Depends on**: Phase 4
**Requirements**: FOUND-01 (deployed-site verification, deferred from Phase 1)
**Success Criteria** (what must be TRUE):
  1. A reader can open the site at its public GitHub Pages URL with no install, account or setup, and every link and asset works under the sub-path base
  2. Pushing to main builds, tests and deploys the site through CI, and the live URL passes the same smoke tests as the local build
  3. The site passes automated accessibility checks (axe, Lighthouse) plus keyboard-only, screen-reader and colour-blind checks, and also works in dark mode, print and zoom
  4. Typing in any playground sends no network request; the initial bundle fits its budget on a throttled connection; a mobile layout is usable (mobile is secondary for v1)
  5. Every quoted split, vendor fact and definition has been re-verified against current sources and dated, terminology is consistent across posts, and `npm audit` has been re-checked
  6. At least two non-programmers have read each post and their confusion points are resolved or recorded

**Plans**: TBD
**UI hint**: no

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 2.1 → 3 → 4 → 5 (Phase 3 depends only on Phase 1, so it can proceed even if Phase 2 slips)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Token Playground | 7/7 | Complete    | 2026-10-05 |
| 2. BPE Stepper & Real-Tokenizer Comparison | 10/10 | Complete    | 2026-10-06 |
| 2.1. Replace the toy with GPT-2 | 10/10 | Complete    | 2026-10-07 |
| 3. Embeddings, Context & Reasoning Posts | 0/TBD | Not started | - |
| 4. Hub, Disambiguation & Glossary | 0/TBD | Not started | - |
| 5. Harden & Release | 0/TBD | Not started | - |

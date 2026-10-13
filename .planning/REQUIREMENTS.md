# Requirements: Tokenizer Vis

**Defined:** 2026-10-03
**Core Value:** A non-programmer can play with a tokenizer in the browser and come away with a correct mental model of what a token is, and how it differs from a word, an embedding, context, and reasoning.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases. The MVP is Foundation and Post 1 only; the Embeddings, Context, Reasoning and Site sections below are deferred to the next milestone (v1.1).

### Foundation

- [x] **FOUND-01**: Reader can open the site as a static, deployed web page that works without any setup or account
- [x] **FOUND-02**: Reader sees tokens in a shared colored-token display that shows token boundaries without relying on color alone (separators/outlines)
- [x] **FOUND-03**: Reader can see whitespace inside tokens made visible (e.g. a glyph for a leading space)
- [x] **FOUND-04**: Reader using a screen reader or keyboard can access the token display through a text/table alternative and keyboard-operable controls (note: quick 261011-unh restored a text alternative for the comparison, the languages drill-down and the prose figures through an accessible token list, `role=list` / `listitem` with spoken labels; the playground keeps its TokenTable)
- [x] **FOUND-05**: Reader who prefers reduced motion sees no animated transitions in the token display or steppers
- [x] **FOUND-06**: Reader sees tokens that split a single character (e.g. an emoji) shown as partial-character chips, never as a replacement symbol
- [x] **FOUND-07**: Reader sees real tokenizer output (GPT-2, which works on bytes after a pre-split step) in the playground and the post's examples, so what they see is the pipeline real models use

### Post 1: What is a token?

- [x] **TOK-01**: Reader can type text into a live playground and see it split into colored tokens
- [x] **TOK-02**: Reader can see byte, character and token counts for their text (word count removed from the display by the author in Phase 2.2; words is still computed for the live screen-reader announcement)
- [x] **TOK-03**: Reader can toggle the playground between token text and token IDs
- [x] **TOK-04**: Reader can pick example texts and reset the playground to its default
- [x] **TOK-05**: Reader can step through BPE merges one at a time with Next, Back and Reset on a small corpus
- [x] **TOK-06**: Reader can see pair counts and the tie-break rule at each BPE step
- [x] **TOK-07**: Reader can compare two real tokenizers of different kinds, GPT-2 (byte-level BPE) and BERT (WordPiece), side by side on curated inputs (numbers, emoji, other languages)
- [x] **TOK-08**: Reader can see the same sentence in many languages and how token counts differ
- [x] **TOK-09**: Reader gets a short plain-language note on each comparison saying what to notice
- [x] **TOK-10**: Reader reads a post that defines "token" in plain language and corrects the "token = word" misconception, with no code or math required

### Embeddings

- [ ] **EMB-01**: Reader can see a token become an ID and then a toy vector in a lookup strip
- [ ] **EMB-02**: Reader sees the toy vectors clearly labelled as illustrative, not real model values
- [ ] **EMB-03**: Reader reads a post that distinguishes a token (an ID) from an embedding (a vector) and names the different senses of "embedding"

### Context

- [ ] **CTX-01**: Reader reads a post explaining that the context window is what is in the prompt right now, not memory, and that it covers input, output and hidden text
- [ ] **CTX-02**: Reader sees a static worked example (illustration or annotated transcript) of a context window filling up and what happens when it overflows

### Reasoning

- [ ] **REAS-01**: Reader reads a post explaining that "reasoning" is additional generated tokens, with vendor-specific details marked with an "as of" date
- [ ] **REAS-02**: Reader sees a static worked example contrasting an answer with and without reasoning, separating tokens generated, tokens shown and tokens billed

### Site and Navigation

- [ ] **SITE-01**: Reader can open a "start here" hub page that lists the posts in a recommended but optional order
- [ ] **SITE-02**: Reader can open a disambiguation page that puts token, embedding, context and reasoning side by side
- [ ] **SITE-03**: Reader sees the disambiguation page generated from the same glossary entries used in the posts, so definitions never disagree
- [ ] **SITE-04**: Reader can hover or tap a glossary term in a post to see its definition and follow a link to the glossary

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Content integrity

- **FACT-01**: Volatile vendor facts live in one dated data file with a claims ledger of sources
- **FACT-02**: Token splits quoted in prose are checked at build time against real tokenizer output

### Interactive widgets for Context and Reasoning

- **CTX-03**: Reader can use an interactive context-window "desk" bar that fills, overflows and compacts
- **REAS-03**: Reader can toggle an interactive show/hide-thinking demo with a live token meter

### Posts

- **POST-01**: Each post ends with a recap box so it can be read on its own

### Site hygiene

- **HYG-01**: Site publishes an RSS feed
- **HYG-02**: Posts have social preview (OG) images
- **HYG-03**: Site publishes a sitemap
- **HYG-04**: Every interactive has a no-JS static fallback

### Enhancements

- **ENH-01**: Prediction prompts ("place your bets") before reveals
- **ENH-02**: Shareable URL state for the playground
- **ENH-03**: Nearby-words 2D toy map in the embeddings post
- **ENH-04**: Comprehension checks at the end of posts

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Live LLM inference or model hosting | Goal is explanation, not running models |
| Attention or transformer visualization | Different topic; would balloon scope |
| Code-heavy or math-heavy exposition | Audience is non-programmers |
| Open-ended tokenizer or model picker | Overwhelms a general audience; curated set instead |
| Developer-style cost calculators | Serves a different audience |
| Scroll-jacking scrollytelling | Hurts accessibility and mobile use |
| Accounts, comments, gamification | Not needed for teaching; adds maintenance |
| Posts beyond tokens, embeddings, context, reasoning | Keep first release focused |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 (static build), Phase 3 (deployed verification) | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| FOUND-07 | Phase 1, Phase 2.1 | Complete |
| TOK-01 | Phase 1 | Complete |
| TOK-02 | Phase 1 | Complete |
| TOK-03 | Phase 1 | Complete |
| TOK-04 | Phase 1 | Complete |
| TOK-05 | Phase 2 | Complete |
| TOK-06 | Phase 2 | Complete |
| TOK-07 | Phase 2, Phase 2.1 | Complete |
| TOK-08 | Phase 2 | Complete |
| TOK-09 | Phase 2 | Complete |
| TOK-10 | Phase 1 | Complete |
| EMB-01 | Phase 4 (v1.1) | Deferred |
| EMB-02 | Phase 4 (v1.1) | Deferred |
| EMB-03 | Phase 4 (v1.1) | Deferred |
| CTX-01 | Phase 4 (v1.1) | Deferred |
| CTX-02 | Phase 4 (v1.1) | Deferred |
| REAS-01 | Phase 4 (v1.1) | Deferred |
| REAS-02 | Phase 4 (v1.1) | Deferred |
| SITE-01 | Phase 5 (v1.1) | Deferred |
| SITE-02 | Phase 5 (v1.1) | Deferred |
| SITE-03 | Phase 5 (v1.1) | Deferred |
| SITE-04 | Phase 5 (v1.1) | Deferred |

**Coverage:**
- MVP requirements (Foundation + Post 1): 17 total, all mapped and Complete (deployed verification of FOUND-01 in Phase 3)
- Deferred to v1.1 (Embeddings, Context, Reasoning, Site): 11, mapped to provisional Phases 4 and 5
- Unmapped: 0

MVP pivot 2026-10-13: the author narrowed the MVP to Post 1 only. EMB, CTX, REAS and SITE requirements stay defined but are deferred to the next milestone.

FOUND-07 and TOK-07: amended by Phase 2.1 on 2026-10-07: wording and status reopened; Complete again only when Phase 2.1 verifies. Re-verified 2026-10-07 by the plan 02.1-09 automated gate on three browsers and the author's read-through and human checks.

---
*Requirements defined: 2026-10-03*
*Last updated: 2026-10-07 after plan 02.1-09 re-verified FOUND-07 and TOK-07 (Complete)*

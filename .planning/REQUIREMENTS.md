# Requirements: Tokenizer Vis

**Defined:** 2026-10-03
**Core Value:** A non-programmer can play with a tokenizer in the browser and come away with a correct mental model of what a token is, and how it differs from a word, an embedding, context, and reasoning.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [ ] **FOUND-01**: Reader can open the site as a static, deployed web page that works without any setup or account
- [ ] **FOUND-02**: Reader sees tokens in a shared colored-token display that shows token boundaries without relying on color alone (separators/outlines)
- [ ] **FOUND-03**: Reader can see whitespace inside tokens made visible (e.g. a glyph for a leading space)
- [ ] **FOUND-04**: Reader using a screen reader or keyboard can access the token display through a text/table alternative and keyboard-operable controls
- [ ] **FOUND-05**: Reader who prefers reduced motion sees no animated transitions in the token display or steppers
- [ ] **FOUND-06**: Reader sees tokens that split a single character (e.g. an emoji) shown as partial-character chips, never as a replacement symbol
- [ ] **FOUND-07**: Reader sees toy tokenizer output produced from bytes with a pre-split step, so the toy teaches the same pipeline real tokenizers use

### Post 1: What is a token?

- [ ] **TOK-01**: Reader can type text into a live playground and see it split into colored tokens
- [ ] **TOK-02**: Reader can see token, character and word counts for their text
- [ ] **TOK-03**: Reader can toggle the playground between token text and token IDs
- [ ] **TOK-04**: Reader can pick example texts and reset the playground to its default
- [ ] **TOK-05**: Reader can step through BPE merges one at a time with Next, Back and Reset on a small corpus
- [ ] **TOK-06**: Reader can see pair counts and the tie-break rule at each BPE step
- [ ] **TOK-07**: Reader can compare toy tokenizer output side by side with real model tokenizers on curated inputs (numbers, emoji, other languages, code)
- [ ] **TOK-08**: Reader can see the same sentence in many languages and how token counts differ
- [ ] **TOK-09**: Reader gets a short plain-language note on each comparison saying what to notice
- [ ] **TOK-10**: Reader reads a post that defines "token" in plain language and corrects the "token = word" misconception, with no code or math required

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
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Pending |
| FOUND-07 | Phase 1 | Pending |
| TOK-01 | Phase 1 | Pending |
| TOK-02 | Phase 1 | Pending |
| TOK-03 | Phase 1 | Pending |
| TOK-04 | Phase 1 | Pending |
| TOK-05 | Phase 2 | Pending |
| TOK-06 | Phase 2 | Pending |
| TOK-07 | Phase 2 | Pending |
| TOK-08 | Phase 2 | Pending |
| TOK-09 | Phase 2 | Pending |
| TOK-10 | Phase 1 | Pending |
| EMB-01 | Phase 3 | Pending |
| EMB-02 | Phase 3 | Pending |
| EMB-03 | Phase 3 | Pending |
| CTX-01 | Phase 3 | Pending |
| CTX-02 | Phase 3 | Pending |
| REAS-01 | Phase 3 | Pending |
| REAS-02 | Phase 3 | Pending |
| SITE-01 | Phase 4 | Pending |
| SITE-02 | Phase 4 | Pending |
| SITE-03 | Phase 4 | Pending |
| SITE-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28 ✓
- Unmapped: 0

---
*Requirements defined: 2026-10-03*
*Last updated: 2026-10-03 after roadmap creation (traceability mapped)*

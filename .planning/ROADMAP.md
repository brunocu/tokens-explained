# Roadmap: Tokenizer Vis

## Overview

Tokenizer Vis is a short series of interactive posts that give a non-programmer a correct mental model of "token", "embedding", "context" and "reasoning". The journey starts with the smallest slice that proves the core value: a deployed "What is a token?" post where a reader types text into a toy tokenizer and sees accessible, correctly rendered tokens (Phase 1). It then deepens Post 1 with the step-through BPE trainer and honest comparison against real model tokenizers (Phase 2), adds the embeddings, context and reasoning posts that reuse the shared pieces (Phase 3), and finishes by tying the series together with a "start here" hub, a glossary-driven disambiguation page and glossary tooltips (Phase 4). Every phase ends with something a reader can open and use.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Token Playground** - Deployed "What is a token?" post with a live toy-tokenizer playground and the shared, accessible token display
- [ ] **Phase 2: BPE Stepper & Real-Tokenizer Comparison** - Step-through BPE trainer and toy-vs-real comparison, completing Post 1
- [ ] **Phase 3: Embeddings, Context & Reasoning Posts** - Three posts that separate embedding, context and reasoning from "token"
- [ ] **Phase 4: Hub, Disambiguation & Glossary** - "Start here" hub, side-by-side disambiguation page and glossary tooltips that tie the series together

## Phase Details

### Phase 1: Foundation & Token Playground
**Goal**: A reader can open the deployed "What is a token?" post and play with a tokenizer in the browser, using a shared, accessible token display that every later post reuses
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, TOK-01, TOK-02, TOK-03, TOK-04, TOK-10
**Success Criteria** (what must be TRUE):
  1. A reader can open the deployed site in a browser on desktop or phone, with no install, account or setup, and read the "What is a token?" post
  2. A reader can type text into the playground and see it split into colored tokens, with token, character and word counts, a toggle between token text and token IDs, example-text chips, and a reset to the default text
  3. A reader can tell where each token starts and ends without relying on color (separators or outlines), and can see whitespace inside tokens (such as a leading space) as a visible glyph
  4. A reader who types an emoji or other multi-byte character sees the pieces of a split character as partial-character chips, and a replacement symbol never appears; the toy tokenizer's output comes from bytes after a pre-split step, as real tokenizers do
  5. A keyboard or screen-reader user can reach a text or table alternative of the tokens and operate every control from the keyboard, and a reader with reduced-motion enabled sees no animated transitions
  6. A reader with no programming background can read the post, which defines "token" in plain language and corrects the "token = word" misconception without code or math
**Plans**: TBD
**UI hint**: yes

### Phase 2: BPE Stepper & Real-Tokenizer Comparison
**Goal**: A reader can watch a tokenizer's vocabulary being built one merge at a time, then see how the toy compares with real model tokenizers on tricky inputs, completing Post 1
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: TOK-05, TOK-06, TOK-07, TOK-08, TOK-09
**Success Criteria** (what must be TRUE):
  1. A reader can step through BPE merges on a small corpus using Next, Back and Reset, seeing the merged pair and the updated tokens at every step
  2. At every BPE step, a reader can see the pair counts and the tie-break rule that decided which pair merged
  3. A reader can compare the toy tokenizer's output side by side with real model tokenizers on curated inputs (numbers, emoji, other languages, code), with each real tokenizer clearly labelled
  4. A reader can see the same sentence in many languages and how the token counts differ
  5. Every comparison carries a short plain-language note saying what to notice
**Plans**: TBD
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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 (Phase 3 depends only on Phase 1, so it can proceed even if Phase 2 slips)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Token Playground | 0/TBD | Not started | - |
| 2. BPE Stepper & Real-Tokenizer Comparison | 0/TBD | Not started | - |
| 3. Embeddings, Context & Reasoning Posts | 0/TBD | Not started | - |
| 4. Hub, Disambiguation & Glossary | 0/TBD | Not started | - |

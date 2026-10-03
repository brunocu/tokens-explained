# Tokenizer Vis

## What This Is

An interactive blog that helps a general audience (no programming background assumed) understand how tokenization algorithms work and untangle commonly confused AI terms: "token", "embedding", "context", and "reasoning". It is structured as a short series of posts, starting from the question "What is a token?", tied together by a "start here" hub page.

## Core Value

A non-programmer can play with a tokenizer in the browser and come away with a correct mental model of what a token is — and how it differs from a word, an embedding, context, and reasoning.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Post 1 "What is a token?" — explains tokens as algorithm-chosen subword pieces (not words/characters), with live interactives
- [ ] Live playground: reader types text and sees it split into colored tokens with IDs
- [ ] Step-through BPE trainer: reader watches merges happen one at a time on a small corpus
- [ ] Toy tokenizers built for teaching, used to show the insides of the algorithm
- [ ] Side-by-side comparison of toy tokenizer output against real model tokenizers (and across languages/odd inputs like emoji and numbers)
- [ ] Post on embeddings — a token is an ID; an embedding is the vector looked up for it
- [ ] Post on context — the context window is what is in the prompt right now, not memory
- [ ] Post on reasoning — "reasoning" tokens are more generated tokens, not a separate mechanism
- [ ] Disambiguation page placing the four terms side by side as a quick reference
- [ ] "Start here" hub page linking the posts in recommended reading order
- [ ] Shared reusable components (toy tokenizer, colored-token display) across all posts
- [ ] Plain-language writing accessible to a general audience, no programming knowledge required

### Out of Scope

- Training or hosting real language models — the goal is explanation, not inference
- Code-heavy or math-heavy exposition — audience is non-programmers; keep it intuitive
- Posts beyond the four concepts (tokens, embeddings, context, reasoning) — keep first release focused

## Context

- Motivation: teach others. The author has seen people confused by these terms and wants a clear, trustworthy resource.
- Format decision (discussed): a single long scrollable essay was considered and rejected as too large for the scope (heavy interactives on one page, hard to maintain, forces readers past unrelated content). A series of separate posts plus a hub was chosen: one idea per post, reusable components, readable in order or entered directly from search.
- Toy tokenizers are for teaching the internals; real tokenizers are used for comparison so readers see real-world behavior.
- Real-tokenizer comparison approach (in-browser vs precomputed) is not yet decided — to be settled during research.

## Constraints

- **Audience**: General public, no programming assumed — drives tone, depth, and interaction design
- **Interactivity**: Interactives must run in the browser for readers — an interactive blog should work without setup
- **Scope**: First release includes all four posts plus hub and disambiguation page — author's stated definition of done

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Series of posts + hub instead of one long essay | Scope too large for one page; one concept per post; shippable and maintainable in pieces | — Pending |
| Toy tokenizers for internals, real tokenizers for comparison | Toy ones are easy to explain step by step; real ones show convincing real-world behavior | — Pending |
| Start with "What is a token?" as the flagship post | Foundation for every other term; reusable components originate here | — Pending |
| First release = all four posts | Author's definition of done | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-02 after initialization*

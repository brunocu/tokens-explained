# Phase 1: Foundation & Token Playground - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-03
**Phase:** 1-Foundation & Token Playground
**Areas discussed:** Toy tokenizer design, Playground look & controls, Post 1 voice & structure, Site shell & visual identity

---

## Toy tokenizer design

| Question | Options | Selected |
|----------|---------|----------|
| Seeding | Pre-trained on small English corpus / Hand-picked merge list / You decide | Pre-trained on small English corpus |
| Explaining bytes | Hidden with optional peek / Always-visible byte strip / Only on partial chips | Custom: bytes by default on partial-character splits, toggle reveals bytes for the entire string |
| Unseen characters | Fall back to single bytes / Include some common merges | Fall back to single bytes |

## Playground look & controls

| Question | Options | Selected |
|----------|---------|----------|
| Boundaries | Colored chip with outline + gap / Underline-bracket style | Colored chip with outline + gap |
| Whitespace | Glyph (␣ ↵) / Highlight only | Glyph |
| Examples (multi) | Everyday sentence, Long/rare word, Numbers & dates, Emoji | Long/rare word, Numbers & dates, Emoji, plus custom: fragment of well-known public-domain literature |
| Default toggle | Text first, IDs on toggle / Both together | Text first, IDs on toggle |

## Post 1 voice & structure

| Question | Options | Selected |
|----------|---------|----------|
| Voice | Friendly second-person / Neutral explainer | Custom: friendly, second person, short paragraphs, Substack/Medium/TDS style, minimal analogies, accurate language |
| Structure | Play first / Explain first then play / Repeated in-line | Explain first, then play |
| Phase 2 teasers | Complete short post / Visible "coming next" notes | Complete short post, no placeholders |

## Site shell & visual identity

| Question | Options | Selected |
|----------|---------|----------|
| Look | Warm editorial / Clean modern techy / You decide | Custom: inspired by Substack |
| Navigation | Minimal header / Greyed-out future posts | Minimal header, site name only |
| Hosting | Cloudflare workers.dev / Custom domain | Custom: GitHub Pages project site (overrides Cloudflare recommendation) |

## Claude's Discretion

Palette, fonts, merge count and corpus, public-domain fragment choice, legend and toggle wording.

## Deferred Ideas

None.

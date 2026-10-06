# Phase 1: Foundation & Token Playground - Context

**Gathered:** 2026-10-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A deployed "What is a token?" post where a reader types text into a toy tokenizer and sees accessible, correctly rendered tokens. Delivers the shared token display and toy tokenizer that all later posts reuse, plus a minimal site shell. The BPE stepper, real-tokenizer comparison, other posts, hub, and glossary tooltips belong to later phases.

</domain>

<decisions>
## Implementation Decisions

### Toy tokenizer design
- **D-01:** The toy is pre-trained offline on a small English corpus and ships a fixed merge list (a few hundred merges). Common words become one token and rare words split. Phase 2's stepper trains a separate tiny toy live.
- **D-02:** Characters the toy has never seen (emoji, CJK) fall back to single bytes. There is no unknown token. An emoji becomes several partial-character chips (FOUND-06, FOUND-07).
- **D-03:** Text goes through a pre-split step, then is converted to bytes, then merges are applied, as real tokenizers do (FOUND-07).
- **D-04:** Bytes are shown by default only on partial-character chips (as hex). A toggle ("peek under the hood") reveals the bytes for the entire string.

### Playground look & controls
- **D-05:** Token boundaries are shown as colored chips with a visible outline and a small gap between them. An alternating palette sits on top of the outline, so boundaries never depend on color alone (FOUND-02). **Amended by R-01 (2026-10-05):** inside a character frame (bytes of one multi-byte character), chips share one solid frame and token cuts are dashed dividers. The solid frame edge means "character boundary"; outside frames D-05 is unchanged.
- **D-06:** Whitespace inside a token is shown with a glyph: `␣` (or `·`) for space and `↵` for newline. A one-line legend explains the glyphs (FOUND-03).
- **D-07:** Example-text chips: a long or rare word, numbers and dates, an emoji example, and a fragment of well-known public-domain literature. Reset returns to the default text (TOK-04). **Amended by R-01 (2026-10-05):** a fifth example, "A non-English line" (`男女 こんにちは`), shows adjacent multi-byte characters.
- **D-08:** The default view shows token text. A toggle switches to IDs (TOK-03). IDs are secondary and are introduced after the "token is not a word" point.
- **D-09:** Token, character and word counts are always visible (TOK-02). A text or table alternative and keyboard-operable controls are required (FOUND-04). Animated transitions are disabled under reduced motion (FOUND-05).

### Post 1 voice & structure
- **D-10:** Voice is friendly and second person, with short paragraphs, in the style of Substack or Medium or Towards Data Science articles. Keep analogies and metaphors to a minimum and prefer accurate language. Do not default to Lego or syllable analogies.
- **D-11:** Structure is explain first, then play. A short definition and the "token is not a word" correction come up front, and the playground sits mid-post.
- **D-12:** Phase 1 ships a complete short post with no "coming soon" placeholders. Phase 2 adds sections later.

### Site shell & visual identity
- **D-13:** The visual feel is inspired by Substack: editorial, single reading column, generous spacing, with the colored token chips as the main accent. Follow the system light or dark preference.
- **D-14:** Navigation is a minimal header with the site name only. The post acts as the home page for now, and the Phase 4 hub replaces it. There are no dead or greyed-out links.
- **D-15 (AMENDED 2026-10-03):** Remote repo, GitHub Pages deployment and CI are **deferred to Phase 5 (Harden & Release)**; Phase 1 creates no remote, workflow or deploy step. Phase 1 still keeps `site`/`base` configurable and all URLs base-aware so Phase 5 only flips config. Other amendments: posts live at the root (`/what-is-a-token/`, not `/posts/...`); mobile/iOS is secondary for the MVP (no iOS device; glyph fallback stays a one-line constant, no blocking iOS check); the dev environment is a nix flake + direnv (`flake.nix`, `.envrc`), which also supplies Playwright browsers. Original text follows. Hosting is a GitHub Pages project site, which serves from a sub-path like `/<repo>/`. This **overrides the Cloudflare Workers recommendation** in `.claude/CLAUDE.md` and the research. The planner must configure Astro `site` and `base`, use base-aware links and asset URLs, and add a GitHub Actions deploy. — **Reversibility:** costly — Base-path-aware URLs touch every link and asset. Moving to a custom domain or Cloudflare later changes `base`.

### Claude's Discretion
- Exact palette, fonts, and the Substack-inspired details, to be refined in the UI spec.
- Exact merge count, training corpus, and choice of the public-domain fragment.
- Exact wording of the glyph legend and the "peek under the hood" toggle label.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project
- `.planning/PROJECT.md` — vision, audience, constraints
- `.planning/REQUIREMENTS.md` — FOUND-01..07, TOK-01..04, TOK-10
- `.planning/ROADMAP.md` §Phase 1 — goal and success criteria
- `.claude/CLAUDE.md` — stack (Astro 7, MDX, Svelte 5, TypeScript ~6.0.3). Its Cloudflare hosting is **superseded by D-15**.

### Research
- `.planning/research/STACK.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
- `.planning/research/FEATURES.md`
- `.planning/research/SUMMARY.md`

</canonical_refs>

<code_context>
## Existing Code Insights

No source code yet (greenfield). There are no reusable assets or established patterns. Phase 1 creates the Astro project, the toy tokenizer module, and the shared token display.

### Integration Points
- Token display and toy tokenizer must be reusable by later posts.
- Tokens are carried as bytes plus an `isPartial` flag (from research).
- The content contract (posts and a 4-term glossary collection with Zod schemas) is seeded in this phase (see STATE.md blockers).

</code_context>

<specifics>
## Specific Ideas

- Accurate language over analogy.
- A public-domain literary fragment as an example chip.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Foundation & Token Playground*
*Context gathered: 2026-10-03*

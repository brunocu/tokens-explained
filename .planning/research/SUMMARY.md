# Project Research Summary

**Project:** tokenizer-vis
**Domain:** Interactive, browser-based explainer blog (4 MDX posts + hub + disambiguation page) on LLM tokenization and the confusable terms token / embedding / context / reasoning, for non-programmers
**Researched:** 2026-10-02
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a static, content-first explainer site: prose plus a few self-contained interactive widgets, with no server and no live model inference. Existing tokenizer tools (OpenAI Tokenizer, Tiktokenizer, Xenova's playground) are developer tools with no narrative. Static explainers (HF BPE chapter, Karpathy) teach BPE as worked examples. The gap this project fills is a guided, misconception-first explanation wrapped around a playground. Experts build this as Astro islands. Posts are MDX, and each widget is its own lazily hydrated island. All algorithm logic lives in a framework-free, unit-tested TypeScript core. A shared accessible token display component is reused everywhere.

Recommended approach: Astro 7 + MDX + Svelte 5 islands, deployed as fully static assets on Cloudflare Workers. Write the toy BPE as a pure function that returns a full step trace, so the stepper just indexes into it. Put every tokenizer (toy, precomputed, live) behind one async `TokenizerBackend`/adapter interface. The token model must carry raw bytes plus an `isPartial` flag, never decoded strings. Real tokenizers are hybrid. Curated examples are precomputed and rendered at build time, so they work without JS. Live "type your own text" uses `@huggingface/tokenizers` with self-hosted, lazy-loaded `tokenizer.json` files. This reconciles the researchers' disagreement (see Gaps).

Key risks:
- The toy tokenizer teaches a different algorithm than production tokenizers (character-level, `</w>`, morpheme-clean merges).
- Unicode and emoji handling: partial-UTF-8 tokens break text-only data models.
- Accessibility retrofitted late into the shared component.
- Prose that contradicts live output, and vendor facts that go stale (reasoning, context, Claude tokenizer).
- Scope inflation, with Post 1 consuming everything.

Mitigations: decide the data model and display contract up front, generate quoted splits from code, keep volatile facts in one dated data file, cap interactives per post, and end every phase publishable.

## Key Findings

### Recommended Stack
Versions were read from the npm registry on 2026-10-02, and the full stack was scaffolded and built in a scratch project (see STACK.md).

**Core technologies:**
- **Astro `^7.3.5` (Node >=22.12) + `@astrojs/mdx ^8.0.2`**: static framework with content collections. It ships zero JS by default and hydrates only islands (`client:visible`).
- **Svelte `^5.57.1` + `@astrojs/svelte ^9.0.1`**: widgets. The runtime is tiny (~12 KB gz), and `animate:flip` and transitions cover the BPE stepper.
- **TypeScript `~6.0.3` (pin below 7)**: TS 7 is outside the peer ranges of `@astrojs/svelte`, `@astrojs/check` and `svelte-check`.
- **`@huggingface/tokenizers` `0.2.0` (pin exactly)**: one code path for BPE, WordPiece and Unigram from `tokenizer.json`. cl100k and o200k ids were verified against `gpt-tokenizer`. It is a 0.x API, so wrap it in an adapter. Do not use `@huggingface/transformers`.
- **Toy BPE in hand-written TS (~100 lines)**: `trainBPE(corpus, n) -> Step[]` trace. It is pure, testable and shared.
- **Cloudflare Workers static assets (`wrangler`)**: no adapter needed. Limits are 25 MiB per file and 20k files, so the gpt-oss tokenizer (27.9 MB) must not be self-hosted. GitHub Pages is the fallback.
- **Dev tooling:** Vitest 5, Playwright, `@astrojs/check`, `svelte-check`, Prettier.
- **Supporting:** `@astrojs/sitemap`, `@astrojs/rss`, Astro built-in Fonts API, `gpt-tokenizer` as a dynamic-import-only fallback, and `nanostores` only if islands must share state.
- **Avoid:** charting libraries, ClientRouter, and assuming remark/rehype (Astro 7 defaults to Sätteri).

**Curated live tokenizer set** (self-hosted with a source/license manifest): BERT (WordPiece contrast), Mistral (SentencePiece-style), GPT-2, cl100k, then o200k and optionally Qwen behind an explicit "load" click. Llama 3 and gpt-oss are precomputed-only or omitted. Claude and Gemini are precomputed-only and dated, because no accurate public tokenizer exists. The default panel is about 1.9 MB brotli.

### Expected Features
See FEATURES.md.

**Must have (table stakes):**
- Shared colored-token display with accessibility built in: non-color separators, visible whitespace glyphs, text/ID/table view, live-region count, reduced motion.
- Live playground with token/char/word counts, text/ID toggle, a pre-filled default, example chips and reset.
- Step-through BPE trainer (Next/Back/Reset/run-to-end, visible pair counts, explicit tie-break rule, 6-10 merges max).
- Toy vs real comparison with curated odd inputs (numbers, emoji, languages, code, leading space), each with a "what to notice" caption.
- Posts 2-4 widgets: token -> ID -> toy-vector strip, context-window "desk" bar (fills, overflows, new chat), and a scripted reasoning-tokens demo (show/hide thinking, token meter).
- Hub, series nav, disambiguation page, and a recap box per post so each post stands alone.
- Misconception-first blocks, up-front definitions, glossary tooltips, and a "Teaching version" badge.
- Site hygiene: OG images, RSS, sitemap, mobile layouts, no-JS static fallbacks.

**Should have (v1.x):** prediction prompts ("Place your bets"), shareable URL state (capped and escaped), embedding nearby-words 2D toy map, comprehension checks, live-linked disambiguation page. The language-fairness demo is cheap if precomputed, so it fits v1 as content.

**Defer (v2+):** open-ended tokenizer arena or model picker, extra posts (attention, sampling), newsletter, translated UI.

**Never build:** live LLM inference, attention visualization, scroll-jacking scrollytelling, developer cost calculators, accounts or comments, gamification.

### Architecture Approach
Three strict layers.
- **Prose/data:** MDX posts and a glossary collection, validated by Zod. Unknown term ids or missing `order` fail the build.
- **UI:** thin `.astro` wrappers apply the `client:*` directives, and Svelte islands do the rendering. Authors use a closed vocabulary of plain-string-prop components.
- **Core:** framework-free TypeScript, a leaf dependency that never imports UI.

Every token source returns one normalized `Token {id, bytes, text, isPartial}` through an async `TokenizerBackend`. Toy-vs-real comparison is then simple composition, and a later Web Worker move is cheap.

**Major components:**
1. **Content collections and site shell** (posts, glossary, hub, terms page, series nav): the single source of truth for definitions.
2. **Core** (`toy/` BPE trace and encode, `bytes.ts`, `color.ts`, types): unit-tested in Node.
3. **Shared UI primitives** (`TokenChips`/TokenDisplay, `ByteView`, `StepControls`, `TextBox`): the accessibility baseline lives here.
4. **Backends** (`PrecomputedBackend` over committed fixtures, `LiveBackend` with lazy loading and a parity test).
5. **Precompute script** (run manually, output committed, dated).
6. **Islands:** Playground, BpeStepper, TokenCompare, EmbeddingLookup, ContextWindow and ReasoningDemo. Each covers one concept, hydrated with `client:visible`.

### Critical Pitfalls
See PITFALLS.md for all 25.
1. **Toy teaches a different algorithm than production.** Keep the pipeline faithful (normalize, pre-split, bytes, merges) and cut only the scale. No `<unk>` or `</w>` shown. Train on a corpus that yields at least one ugly non-morpheme merge. Use the same display for toy and real output. Label outputs "toy tokenizer".
2. **Unicode/emoji and the text-only token model.**
   - Store tokens as bytes plus `isPartial`, and render partial-character chips.
   - Use `Intl.Segmenter` and `TextEncoder`.
   - Keep a regression corpus (emoji, ZWJ, flags, CJK, RTL, combining marks, special-token strings) checked against reference `tiktoken`.
   - Never show `�`.
3. **Real-tokenizer availability and parity.**
   - Open tokenizers go live. Closed ones (Claude, Gemini) are precomputed, dated and marked approximate.
   - Never send user text to a server or ship an API key.
   - Parity-test every shipped tokenizer, since only the GPT-2 family is verified.
   - Record the license per file.
4. **Prose drifts from live output, and vendor facts go stale.** Generate or snapshot-test every quoted split, and name the encoding and date. Keep volatile facts in one dated data file with a claims ledger. Put vendor specifics in dated "as of" boxes. State "summary vs raw thinking" and "generated vs shown vs billed".
5. **Concept conflations and a missing prerequisite.**
   - Name vocabulary-building and splitting-your-text as separate phases.
   - Name all three senses of "embedding".
   - Teach context in two steps (no memory in the model, apps re-send text).
   - Give the one-token-at-a-time generation loop an owner (a shared mini-component).
   - Give every post a recap box.
6. **Accessibility and performance retrofits (HIGH recovery cost).** Build the accessibility baseline into the shared component first. Cap input length, debounce, keep vocab out of initial load, and keep the async interface so a Worker is possible later.

## Implications for Roadmap

Suggested structure (7 phases). Each phase ends publishable, to counter scope inflation.

### Phase 1: Foundation (site skeleton, content contract, core, display contract)
**Rationale:** Core and the content schema are leaf dependencies. Data-model and accessibility mistakes are the most expensive to retrofit.
**Delivers:**
- Astro 7 + MDX + Svelte skeleton, deployed to Cloudflare, with CI.
- Content collections with Zod schemas, a 4-term glossary, and stub hub and terms pages.
- `core/`: the `Token` model (bytes + `isPartial`), a toy BPE trace, `bytes.ts`, `color.ts`.
- Vitest golden tests (Sennrich corpus plus the Unicode/hostile corpus).
- TokenDisplay with a non-color cue, whitespace glyphs, a text/table alternative, live region, reduced motion and per-theme palette.
- The wrapper pattern with SSR defaults and one proof-of-hydration widget.
- A dated facts data file and a claims-ledger format.
- A decision on where the generation-loop concept lives.
**Avoids:** Pitfalls 1, 2, 9, 12 (architecture), 13, 14, 15, 20.

### Phase 2: Post 1 vertical slice (Playground + BPE stepper + prose)
**Rationale:** The flagship validates the pipeline and the component boundaries before Posts 2-4 reuse them.
**Delivers:**
- Playground: counts, text/ID toggle, default text and chips, reset, input cap, debounce, special-token policy.
- BpeStepper: trace-indexed, Next/Back/Reset/run-to-end, a visible tie-break rule.
- Misconception-first and definition blocks, the "Teaching version" badge, and the "not all tokenizers are BPE" sentence.
- Training-vs-running naming, the generation-loop mini-component, and counts labelled "tokens in this text".
**Avoids:** Pitfalls 5, 10, 11, 16, 17, 19.

### Phase 3: Real-tokenizer layer and comparison
**Rationale:** This is the riskiest unknown. It is isolated behind the backend interface, so a slip does not block Phases 4-5.
**Delivers:**
- A parity spike: Python `tiktoken` and HF goldens checked against the JS tokenizers.
- Self-hosted tokenizer files with a source/commit/license manifest.
- A precompute script and committed fixtures: Claude/Gemini dated and approximate, odd-inputs gallery, language-fairness.
- `PrecomputedBackend` and a lazy `LiveBackend` with per-family display handling (byte-level, `▁`, `##`).
- `TokenCompare` with a dated header, encoding names and "approximate" labels, plus a build-time quoted-split check.
**Avoids:** Pitfalls 3, 4, 12 (vocab loading), 21.

### Phase 4: Posts 2-4 (embeddings, context, reasoning)
**Rationale:** Each post is prose plus at most one widget reusing shared pieces. The order is embeddings, context, then reasoning, because the reasoning demo builds on the context bar.
**Delivers:**
- Embeddings: an ID -> toy-vector strip, all three senses named, vectors labelled illustrative.
- Context: a layered two-step explanation and a desk bar that fills, overflows and compacts, with no undated window sizes.
- Reasoning: a scripted demo that separates generated, shown and billed tokens, with vendor facts in a dated box.
- A recap box on each post.
**Avoids:** Pitfalls 6, 7, 8, 10, 14, 18.

### Phase 5: Hub, disambiguation page, series nav
**Rationale:** These are small, mostly content, and depend on all glossary entries and summaries.
**Delivers:**
- Hub with a recommended-but-optional order.
- A disambiguation table generated from the glossary, with the real overloads and a dated vendor-vocabulary table.
- Series nav, OG images, RSS, sitemap, meta.
**Avoids:** Pitfalls 6, 7, 9.

### Phase 6: Harden and release
**Delivers:**
- Fact-check pass and claims-ledger re-verification.
- axe/Lighthouse, keyboard-only, screen-reader and color-blind checks.
- Throttled-mobile performance and bundle budget, and a network-panel check that typing sends nothing.
- Dark mode, print and zoom checks, a terminology consistency pass, and 2-3 non-programmer readers per post.
- A re-check of `npm audit`.
**Avoids:** Pitfalls 4, 8, 9, 12, 13, 14, 19, 24.

### Phase 7 (post-launch v1.x): Enhancements
Prediction prompts, shareable URL state, the nearby-words map, comprehension checks, a live-linked disambiguation page, and privacy-respecting analytics.

### Phase Ordering Rationale
- Dependency order: schema and core, then shared UI, then the flagship, then the risky tokenizer layer, then the posts that need only shared pieces, then the content shells.
- HIGH-cost retrofits (bytes data model, accessibility in the base component, toy faithfulness, async backend interface) land in Phase 1.
- The tokenizer layer is risk-isolated, so a slip does not block Phases 4-5.
- At most one bespoke widget per Post 2-4, with the hub and disambiguation page small and last.

### Research Flags
Needs deeper research (`/gsd-plan-phase --research-phase <N>`):
- **Phase 3:** parity beyond the GPT-2 family, licensing and redistribution, recovering per-token bytes from HF output, browser timings, special-token policy.
- **Phase 4 (reasoning post):** re-verify vendor behavior from current docs right before writing.
- **Phase 1:** a design spike on toy fidelity, plus untested `.svelte.ts` shared state if used.

Standard patterns, skip research: Phase 2, Phase 5, Phase 6, Phase 7.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Registry versions read live. The stack was scaffolded and built, and real tokenizers were run with cl100k/o200k parity confirmed. Hosting limits and BERT's license are weaker (MEDIUM/LOW). |
| Features | MEDIUM-HIGH | Competitor facts were verified. "What non-programmers need" is synthesis with no reader testing yet. |
| Architecture | MEDIUM-HIGH | Astro and tokenizer facts are official. The site structure is synthesized from known practice. |
| Pitfalls | MEDIUM-HIGH | Tokenizer behavior was reproduced locally with `tiktoken` 0.14.0. Vendor claims come from official docs. Some performance claims are LOW. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address
- **Precomputed-first vs live-first:** FEATURES and ARCHITECTURE lean precomputed (js-tiktoken or gpt-tokenizer live). STACK measured live HF tokenizers as practical. Resolution: precomputed galleries are the no-JS default, with lazy live HF tokenizers for free text. Confirm in the Phase 3 spike, and keep `gpt-tokenizer` as the fallback if cl100k/o200k payloads are too heavy.
- **Toy fidelity:** STACK and FEATURES use a Sennrich-style character-level toy, but PITFALLS warns it misleads. Decide in a Phase 1 spike. The compromise is to keep the Sennrich goldens, show a byte-level/pre-split step in the UI, and add a "what real tokenizers do differently" callout.
- **Per-token bytes from HF output:** the library gives strings but no offsets or bytes, so a custom display layer is needed. Verify it per family with golden cases.
- **Parity:** Mistral, BERT and Qwen ids were not cross-checked.
- **Licensing:** `Xenova/*` mirror terms and BERT's license are unverified. Keep a manifest, with `gpt-tokenizer` or precomputed output as the fallback.
- **Hosting limits:** the Cloudflare numbers came from secondary sources, so re-verify at deploy time.
- **Browser performance:** timings are Node numbers (2-4x slower expected in a browser). Measure in Phase 6.
- **Vendor facts:** reasoning behavior, Claude's tokenizer change (~30% more tokens) and context sizes change fast. Cite primary docs, date them, and re-verify before release.
- **Untested assumptions:** Astro Fonts API, `.svelte.ts` cross-island state, and Sätteri's MDX handling.
- **Reader validation:** no non-programmer has tested any of this yet.

## Sources
**Primary (HIGH):**
- npm registry, read 2026-10-02.
- Astro docs (v7 upgrade, Cloudflare, islands, content collections, MDX, Markdown).
- Svelte animate docs.
- `huggingface/tokenizers.js` README and the Anthropic tokenizer README.
- Claude Docs (thinking, extended thinking, context windows, token counting) and OpenAI reasoning docs.
- Local reproductions: `tiktoken` 0.14.0, a scratch Astro 7 build, and Node runs of seven tokenizers.
- Distill, the Transformer Explainer paper, the HF LLM course BPE chapter, WCAG 2.2, and GitHub Pages limits.

**Secondary (MEDIUM):**
- Cloudflare limits via secondary sources.
- `gpt-tokenizer` and `js-tiktoken` READMEs.
- Tiktokenizer and OpenAI Tokenizer summaries.
- Nicky Case patterns and Karpathy's lecture notes.
- Cross-language token-premium papers, and `tiktoken` issue 391.

**Tertiary (LOW):**
- Blog claims on WASM performance and Claude vocabulary size.
- The scrollytelling accessibility guide.
- Xenova mirror licenses.

*Research completed: 2026-10-02*
*Ready for roadmap: yes*

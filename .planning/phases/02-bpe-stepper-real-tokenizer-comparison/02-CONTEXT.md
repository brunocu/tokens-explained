# Phase 2: BPE Stepper & Real-Tokenizer Comparison - Context

**Gathered:** 2026-10-05
**Status:** Ready for planning

<domain>
## Phase Boundary

A reader can watch a tokenizer's vocabulary being built one merge at a time (BPE stepper), then see how the toy tokenizer compares with real model tokenizers (GPT-2 and BERT) on curated inputs, including the same sentence in many languages. This completes Post 1 ("What is a token?"). Embeddings, context and reasoning posts, the hub, glossary tooltips, deployment and CI belong to later phases.

</domain>

<decisions>
## Implementation Decisions

### BPE stepper
- **D-01:** The stepper trains on the classic Sennrich 2016 corpus: `low` (5), `lower` (2), `newest` (6), `widest` (3). The counts are from memory of the paper; the researcher must verify them against the paper. The corpus is separate from the playground toy (Phase 1 D-01).
- **D-02:** Controls are Next, Back, Reset and Run to end. No auto-play. Fixed length of about 8 merges (planner picks the exact number so `est` and `low` both emerge). Keyboard operable, native buttons, reduced motion shows instant state changes (FOUND-05).
- **D-03:** At every step a ranked pair-count table is shown, sorted high to low, with the winning row marked and a plain-language sentence saying why it won, including the tie-break when a tie decided it (TOK-06). Table form so it is natively screen-reader friendly.
- **D-04:** The tie-break rule must be the same rule the Phase 1 trainer uses (`scripts/lib/bpe-train.ts`: highest count, then smallest left id, then smallest right id), worded in plain language (for letters, "alphabetical"). The stepper's trace and the trainer must not disagree; the stepper's trace is pure TypeScript (`trainBPE(...) -> Step[]`, each step records pair counts, chosen pair, new token, resulting word splits, tie-break used) and is unit-tested with a golden test on this corpus.
- **D-05:** The stepper shows each corpus word as a row of chips that start as single letters and fuse as merges happen, reusing the shared `TokenDisplay` styling; the newly merged chip is highlighted. A **running vocabulary list** of learned tokens grows alongside (e.g. `es`, `est`). Corpus counts are shown beside each word (for example "low ×5").
- **D-06:** Word boundary is shown with a reader-friendly **end-of-word marker**, not the paper's literal `</w>`. Constraint: it must not be confusable with the playground's `␣` and `↵` glyphs, must be explained in a one-line legend, and the post must say how it relates to the playground's leading-space convention. Exact glyph is left to the UI spec.
- **D-07:** The stepper stays self-contained: no input to try the learned vocabulary on new words. The final screen says plainly that this is how a vocabulary gets built and that real tokenizers do the same on far more text with far more merges. The post states that the stepper's toy differs from the playground's toy and that production tokenizers differ in three ways (work on bytes, pre-split with a regex, 50k-200k vocabulary).

### Real tokenizers & loading
- **D-08:** The real-tokenizer set is **exactly GPT-2 and BERT (uncased)**. No cl100k, o200k, Mistral or Qwen. Both are older tokenizers chosen because they are small and openly licensed; the post says so in one plain sentence and says other models, including newer ones, cut text differently. No vendor names or unverified figures for tokenizers not shown (no Claude counts).
- **D-09:** Both are **self-hosted** under `public/tokenizers/` (no Hugging Face fetch at runtime), with a manifest of source repo, commit and licence. GPT-2 is MIT (verified); BERT's Apache-2.0 licence is **not yet verified** and must be confirmed before shipping. All URLs are base-aware.
- **D-10:** Curated comparison results for GPT-2 and BERT are **precomputed at build time** (committed script, dated, tokenizer names shown) so the curated comparison works instantly with no download. Free typing on GPT-2 and BERT is available only after the reader presses an explicit **load button labelled with the download size** (about 0.7 MB combined). **Typing alone never triggers a network request** (keeps Phase 5 criterion 4 literal). Loading shows a clear loading state and an error state with retry. `loadTokenizer(id)` stays async behind an adapter so it can move to a Worker later.
- **D-11:** Before the button is pressed, the section shows the curated precomputed results for the toy, GPT-2 and BERT. The adapter must display partial-character chips, `##` WordPiece pieces and `[UNK]` correctly (never a replacement symbol, FOUND-06), and be parity-tested against known ids for each shipped tokenizer (`@huggingface/tokenizers` 0.x, pin exactly).

### Comparison & languages
- **D-12:** Curated comparison inputs are the **same five examples as the playground** (`src/core/examples.ts`: rare long word, numbers and dates, emoji, classic literature, non-English line), so the two lists stay identical. **Amends ROADMAP Phase 2 criterion 3 and REQUIREMENTS TOK-07 to drop "code".**
- **D-13:** Every comparison carries a one-or-two-sentence plain-language "what to notice" note, hand-written and checked once by eye (user's choice; no build-time claims test required, although the researcher may still recommend one). Every comparison names each tokenizer and its date/version (TOK-09).
- **D-14:** The many-languages demo (TOK-08) uses one short sentence in roughly 6 languages whose **sentence and translations come from a trusted, citable source** (the researcher identifies one, e.g. a parallel-text corpus); results are precomputed, dated and labelled. A text-readable table is the primary accessible form.
- **D-15:** The visual layout of the comparison (stacked rows vs columns) and of the languages demo (table, bars, expandable chips) is **deferred to the UI spec** (`/gsd-ui-phase 2`).

### Post 1 structure & read-through
- **D-16:** Post order is: short definition and "token is not a word" correction, then the **BPE stepper before the playground**, then the playground, then the real-tokenizer comparison, then the languages demo. **Amends Phase 1 D-11** (playground mid-post). The abstract "third step" paragraph in "How this tokenizer works" is reworked to fit the new order; Phase 1's rule of no "coming soon" placeholders still holds.
- **D-17:** The "common words stay whole" sentence is **softened** (for example "many everyday words") rather than changing the default sentence. Keep the build-time claims for the default sentence true.
- **D-18 (revised 2026-10-05):** The non-programmer read-through (ROADMAP criterion 6) happens **once, at the end of Phase 2**, on the complete Post 1 (stepper and comparison included). It is a human-gated final task in the plan. There is no read-through of the Phase 1 version beforehand. The author will hand over their own notes on the article (deferred from Phase 1 UAT test 5) **later, before that final task**; they are not available during planning or writing. Until then, writing Phase 2 uses the Phase 1 prose as-is, apart from the changes already decided here (D-16 reorder, D-17 softened claim). The plan must leave a slot to apply the author's notes before the read-through, and must not block earlier tasks on them.

### Claude's Discretion
- Exact number of merges, the end-of-word glyph, the stepper's microcopy and the sizes/wording of the load button.
- Plumbing for the build-time precompute script and fixture JSON format.
- Pair-table row count shown per step (all pairs vs top N), as long as the winner and any tie are visible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project
- `.planning/PROJECT.md` — vision, audience, constraints
- `.planning/REQUIREMENTS.md` — TOK-05..TOK-09 (TOK-07 to be amended per D-12)
- `.planning/ROADMAP.md` §Phase 2 — goal and success criteria (criterion 3 to be amended per D-12)
- `.claude/CLAUDE.md` — stack (Astro 7, MDX, Svelte 5, TypeScript ~6.0.3, `@huggingface/tokenizers` ^0.2.0 pinned exactly), tokenizer table, and "What NOT to use" (no HF Hub fetch at runtime, no static import of big tokenizers, no `decode([id])` per token)

### Prior phase
- `.planning/phases/01-foundation-token-playground/01-CONTEXT.md` — D-03 pipeline, D-05 chip/frame display (R-01), D-06 glyphs, D-10..D-12 voice and structure, D-15 base-aware URLs
- `.planning/phases/01-foundation-token-playground/01-UI-SPEC.md` — design contract for chips, frames, legend, palette (stepper and comparison must follow it)
- `.planning/phases/01-foundation-token-playground/01-VERIFICATION.md` §"Observation for the human read-through" — the "common words stay whole" issue
- `.planning/phases/01-foundation-token-playground/01-UAT.md` test 5 — deferred non-programmer read-through
- `.planning/phases/05-harden-release/DEFERRED-FROM-PHASE-1.md` — Phase 5 items (deploy, live checks); relevant to the "no request on typing" criterion

### Research
- `.planning/research/STACK.md`, `ARCHITECTURE.md` (stepper trace pattern, fixtures pattern, runtime flow for Compare), `PITFALLS.md` (P-Post1 stepper pacing and tie-break wording, P-Compare dating and labelling, accessibility of steppers), `FEATURES.md`

### External (researcher must verify)
- Sennrich, Haddow and Birch 2016, "Neural Machine Translation of Rare Words with Subword Units" — corpus counts and merge sequence for D-01
- Licences for `openai-community/gpt2` (MIT, verified earlier) and `bert-base-uncased` (Apache-2.0, unverified) — D-09
- `@huggingface/tokenizers` README (API, Oniguruma caveats) — D-11

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/TokenDisplay.svelte` and `TokenTable.svelte`: shared chip display, frames and text/table alternative; reuse for stepper rows and comparison rows.
- `src/core/types.ts`: `Token` (id, bytes, isPartial) and `ToyTokenizer`; the real-tokenizer adapter should return the same `Token` shape so `TokenDisplay` is reused.
- `src/core/display.ts`, `chars.ts`, `counts.ts`: byte-to-display, character-frame and counting logic (including glyphs for whitespace).
- `src/core/examples.ts`: the five example texts and `DEFAULT_TEXT` that the comparison reuses (D-12).
- `scripts/lib/bpe-train.ts`: deterministic trainer with the tie-break rule the stepper must match (D-04); `src/core/presplit.ts` shares the pre-split rule.
- `src/components/wrappers/PlaygroundSection.astro` and `src/components/prose/ToyTokens.astro`: patterns for embedding islands (`client:visible`) and claims-checked inline demos in MDX.
- `src/core/claims.ts` and `claims.test.ts`, `src/content/post-content.test.ts`: existing build-time claim checks for prose; extend for the softened sentence.

### Established Patterns
- Pure TypeScript in `src/core/` with Vitest tests; Svelte components only render. Playwright e2e specs in `e2e/` (a11y, controls, privacy, states, resilience) must be extended for the stepper and comparison, including `privacy.spec.ts` for the no-request-on-typing rule.
- Site `base` configurable via `site.config.mjs`; all URLs base-aware; `npm run check:base` proves a non-root base.
- No `public/tokenizers/` directory exists yet.

### Integration Points
- `src/content/posts/what-is-a-token.mdx`: new sections and reordering (D-16, D-17).
- `src/pages/[slug].astro`, `PostLayout.astro`: no change expected.
- `package.json`: add `@huggingface/tokenizers` (pinned exactly).

</code_context>

<specifics>
## Specific Ideas

- The end-of-word marker should be "reader friendly", not literally `</w>`.
- Keep the stepper's vocabulary list visible as the vocabulary grows.
- Playground examples and comparison inputs are one shared list.

</specifics>

<deferred>
## Deferred Ideas

- **Revisit the toy's training corpus before publishing** (user note, D-17): a larger or different corpus might make more everyday words single tokens. Changes `merges.json`, goldens and the default-sentence claims; belongs with the Phase 5 content check or a small dedicated task, not Phase 2.
- Modern tokenizers (cl100k, o200k, Mistral, Qwen) and a free-typing real-tokenizer arena: excluded by D-08; candidates for v2.
- Trying the stepper's learned vocabulary on a reader's own word: rejected for now (D-07).
- Auto-play for the stepper: not included (D-02).
- Layout of the comparison and languages demo: handled by the UI spec (D-15), not deferred as a feature.

</deferred>

---

*Phase: 2-BPE Stepper & Real-Tokenizer Comparison*
*Context gathered: 2026-10-05*

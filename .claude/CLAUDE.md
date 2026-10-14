<!-- GSD:project-start source:PROJECT.md -->

## Project

**Tokenizer Vis**

An interactive blog that helps a general audience (no programming background assumed) understand how tokenization algorithms work and untangle commonly confused AI terms: "token", "embedding", "context", and "reasoning". It is structured as a short series of posts, starting from the question "What is a token?", tied together by a "start here" hub page.

**Core Value:** A non-programmer can play with a tokenizer in the browser and come away with a correct mental model of what a token is — and how it differs from a word, an embedding, context, and reasoning.

### Constraints

- **Audience**: General public, no programming assumed — drives tone, depth, and interaction design
- **Interactivity**: Interactives must run in the browser for readers — an interactive blog should work without setup
- **Scope**: First release includes all four posts plus hub and disambiguation page — author's stated definition of done

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Headline Recommendation

### Real tokenizers: in-browser, not precomputed

- **Live in browser (default).** Encoding takes about 1-3 ms per short text. The cost is the one-time download of each tokenizer's vocabulary file. The curated tokenizers are small enough to lazy-load on demand (table below).
- **Precomputed (exceptions only).**
- **Why not precompute everything?** The core promise is "play with it." Precomputing only the comparison would remove the "type your own weird input and watch it split" moment, which is the point of the product.

## Recommended Stack

### Core Technologies

| Technology | Version (verified 2026-10-02) | Purpose | Why Recommended | Confidence |
|------------|-------------------------------|---------|-----------------|------------|
| **Node.js** | 24.x LTS (Astro needs >=22.12) | Build runtime | Astro 7, `@astrojs/*` 7-9 and Vitest 5 all declare `node >=22.12`. Local machine has v24.21.0. | HIGH |
| **Astro** | `^7.3.5` | Static site framework, routing, content collections | Content-first, ships static HTML and zero JS by default, hydrates only the interactive "islands". That fits a prose-heavy blog with a few heavy widgets per post, and each post can load different islands. `client:visible` defers a widget's JS (and its tokenizer download) until the reader scrolls to it. A scratch build worked: MDX post plus a Svelte island, SSR'd to HTML with `client="visible"`. | HIGH |
| **@astrojs/mdx** | `^8.0.2` | Posts as MDX (prose with embedded `<Playground client:visible />`) | The standard way to embed components in Astro content. Works with content collections (`glob` loader on `**/*.mdx`). Verified in the scratch build. | HIGH |
| **Svelte** | `^5.57.1` | Interactive widgets (islands) | Compiled, so the runtime is tiny: the hydration client chunk was ~12 KB gzipped in the scratch build, against ~45 KB for React-class runtimes. Runes (`$state`, `$derived`) make "type text, see tokens" a few lines. Built-in transitions and `animate:flip` (confirmed in the svelte.dev `svelte/animate` docs) give the animated merge and reorder effects the BPE stepper needs without an animation library. SSR works, so first paint shows real HTML. | HIGH |
| **@astrojs/svelte** | `^9.0.1` | Astro-Svelte integration | Peers: `astro ^7`, `svelte ^5.43.6`, `typescript ^5.3.3 \|\| ^6.0.0` (see TypeScript row). | HIGH |
| **TypeScript** | **`~6.0.3` (pin below 7)** | Type safety for the BPE teaching trainer, adapters and components | npm `latest` is now 7.0.2, but `@astrojs/svelte`, `@astrojs/check` and `svelte-check` declare peers `^5 \|\| ^6` only. Installing TS 7 gives peer conflicts or broken checks. Pin 6.0.x and revisit when those peers add 7. | HIGH (peer ranges read from the registry) |
| **@huggingface/tokenizers** | `^0.2.0` (Apache-2.0, ~8.3 kB gz, zero deps) | **Run real tokenizers in the browser** | HF's standalone JS tokenizer library, also the tokenization engine inside `@huggingface/transformers` v4. It loads any HF `tokenizer.json` plus `tokenizer_config.json` and supports BPE, WordPiece and Unigram, with ByteLevel and Metaspace pre-tokenizers. One code path covers every model family. Returns `{ids, tokens, attention_mask}` and exposes `tokenize`, `encode`, `decode`, `token_to_id`, `id_to_token`. Verified here by loading GPT-2, cl100k, o200k, Llama 3, Mistral, BERT and Qwen, and by checking cl100k and o200k ids exactly match `gpt-tokenizer` on a test string. Caveat: the 0.x version means the API may still shift, so pin exactly (see Installation) and wrap it behind an adapter. | HIGH (works), MEDIUM (API stability) |
| **BPE teaching trainer: hand-written TypeScript** | n/a (~100 lines, no dependency) | Teaching trainer behind the step-through stepper (a miniature that learns from one sentence; the playground and comparison use real tokenizers, not this) | Do not use a library. Write a pure function `trainBPE(corpus, nMerges) -> Step[]` that returns the whole trace (pair counts, chosen pair, new vocab, updated word splits). The Svelte stepper just indexes into that trace, so stepping back and forth is trivial. Pure TS is unit-testable (Vitest), shared by every post, and honest to the "miniature for teaching" decision. | HIGH |
| **GitHub Pages (project site)** | n/a | Hosting | **Decided in Phase 1 discussion (D-15), replacing the earlier Cloudflare recommendation.** A project site is served from a sub-path (`https://<user>.github.io/<repo>/`), so set Astro `site` and `base` in `astro.config`, and make every link and asset URL (including `/tokenizers/…` fetches) base-aware. Deploy with a GitHub Actions workflow (`withastro/action` plus `actions/deploy-pages`). No adapter is needed for a static site. Limits: published site <= 1 GB, ~100 GB/month soft bandwidth, 10 builds/hour soft limit, and a personal/non-commercial use policy (verified on docs.github.com). Re-verify the current Astro deploy guide at https://docs.astro.build/en/guides/deploy/github/ before writing the workflow. | MEDIUM (limits verified earlier; workflow details not yet verified) |

### Tokenizers to ship (curated set, all self-hosted as static files)

| Tokenizer (role in the story) | Source repo (license) | `tokenizer.json` raw | Over the wire (br / gzip) | Parse+build in Node | Notes |
|-------------------------------|------------------------|----------------------|---------------------------|---------------------|-------|
| BERT uncased (WordPiece: a *different algorithm*) | `bert-base-uncased` (Apache-2.0, from memory) | 0.5 MB | 0.15 / 0.19 MB | ~20 ms | Smallest. Shows `##` pieces and `[UNK]` on emoji. Great contrast. |
| Mistral 7B v0.1 (SentencePiece-style BPE, 32k vocab) | `mistralai/Mistral-7B-v0.1` (Apache-2.0, verified via HF API) | 1.8 MB | 0.34 / 0.46 MB | ~40 ms | Shows `▁` word-boundary markers and byte-fallback. Small for a modern-ish model. |
| GPT-2 (byte-level BPE, 50k, the classic) | `openai-community/gpt2` (MIT, verified) | 1.4 MB | 0.44 / 0.55 MB | ~60 ms | Historic baseline; the stepper's miniature uses the same algorithm (BPE). |
| GPT-4 / cl100k (100k) | HF mirror `Xenova/gpt-4`, or ranks bundled in `gpt-tokenizer` | 4.2 MB | 0.96 / 1.27 MB | ~130 ms | "Vocabularies grew" story. Mirror license not verified (LOW). |
| GPT-4o / o200k (200k) | HF mirror `Xenova/gpt-4o`, or `gpt-tokenizer` | 9.7 MB | 2.1 / 2.9 MB | ~250 ms | Load only on explicit click ("bigger tokenizer, ~2 MB"). |
| Qwen2.5 (multilingual, CJK-heavy vocab) | `Qwen/Qwen2.5-0.5B` (Apache-2.0, verified) | 7.0 MB | 1.5 / 1.9 MB | ~180 ms | Optional. Shows how vocab design changes non-English token counts. |
| Llama 3 | `Xenova/llama-3-tokenizer` mirror (gated upstream) | 9.1 MB | 1.6 / 2.3 MB | ~200 ms | **Skip live; precompute only, or omit.** Redistribution runs through Meta's license and a third-party mirror. Check terms before self-hosting. |
| gpt-oss | `openai/gpt-oss-20b` | **27.9 MB** | n/a | n/a | **Do not self-host:** 27.9 MB is far larger than the other tokenizers and is not worth the weight (GitHub Pages also warns on files over 100 MB, so this is a choice, not a hard limit). Precompute only if wanted. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `gpt-tokenizer` | `4.0.0` (MIT, updated 2026-08-16) | Pure-JS OpenAI BPE (o200k, cl100k, p50k, r50k, gpt2) | **Fallback only**, for the case where cl100k or o200k page weight becomes a problem. Bundled ranks are ~3x smaller than the HF JSON (cl100k 445 KB gz vs 1.27 MB; o200k 1.03 MB gz vs 2.94 MB). Exposes ids only: no per-token strings or bytes (`decode([id])` returns `""` or U+FFFD for tokens that split a multi-byte character, as observed on an emoji). Put it behind the same adapter. Import per-encoding (`gpt-tokenizer/encoding/cl100k_base`) and **dynamic-import it**: a static import made the scratch island 975 KB raw / 437 KB gz. |
| `nanostores` | `^1.5.4` | Share state between islands on one page | Only if two separate islands must share state (e.g. one text box driving both a tokenizer panel and a vector panel). Prefer self-contained islands, or a module-level `.svelte.ts` rune store (not tested here; verify before relying on it). Nanostores atoms satisfy Svelte's store contract. Skip until needed. |
| `@astrojs/sitemap` | `^3.7.4` | sitemap.xml for search discovery | Include; trivial, helps "entered directly from search" (verified in the scratch build). |
| `@astrojs/rss` | `^4.0.19` | RSS feed | Include if the author wants subscribers; a few lines. |
| Astro built-in Fonts API (`fonts` config, `<Font />` from `astro:assets`) | built into astro 7 | Self-hosted web fonts, preloading and fallbacks | Use instead of `@fontsource-*` packages or Google Fonts `<link>` tags. Documented as production-ready; a few advanced methods remain experimental. (MEDIUM: not exercised in the scratch build.) |
| `sharp` | `^0.35.4` (Astro optional dep) | Image optimisation via `astro:assets` | Auto-used if present; only matters if raster images are added. Prefer inline SVG for diagrams. |
| `d3-scale` / `d3-shape` (from `d3` 7.9.0) | `7.9.0` line | Axis scales or curves if a chart is needed | **Only the submodules, only if needed.** Most visuals here are HTML/CSS chips and simple SVG. Do not pull in all of `d3` or a charting library. |
| Python (offline, not shipped) | n/a | One-off script to precompute 2-D "embedding map" coordinates for the embeddings post | The embeddings post needs a small, pre-baked set of word vectors (PCA or UMAP to 2-D, < 50 KB JSON). Computing it offline and shipping JSON keeps real-model inference out of scope, as PROJECT.md requires. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| `@astrojs/check` | `0.9.10` | Typechecks `.astro` files, content-collection schemas and MDX frontmatter | Peers TS `^5 \|\| ^6`. Run in CI. Passed with 0 errors in the scratch build. |
| `svelte-check` | `4.7.6` | Typechecks `.svelte` files | Peers TS `^5 \|\| ^6`. |
| **Vitest** | `5.0.3` | Unit tests for the BPE teaching trainer, token-to-text display layer, adapters | Peers `vite ^6.4 \|\| ^7 \|\| ^8`, Node `^22.12 \|\| ^24 \|\| >=26`. Compatible with Astro 7's Vite 8. Extract all widget logic into plain `.ts` so it is testable without a DOM. |
| **Playwright** (`@playwright/test`) | `1.63.0` | Smoke tests of the built site | Run against `astro preview`. Check: islands hydrate, a tokenizer loads, typing changes the chips, no console errors, hub links resolve. Catches SSR-vs-browser mistakes unit tests can't. |
| Prettier | `3.9.9` + `prettier-plugin-astro@1.1.0` + `prettier-plugin-svelte@4.1.1` | Formatting | Plugin peer is `prettier ^3.5.3`. ESLint is optional and not recommended for v1. |

## Installation

# Scaffold (Astro 7; template "minimal" worked cleanly with --no-install --no-git --no-ai)

# Core

# Optional / as needed

# Dev (NOTE the TypeScript pin)

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Astro 7 + MDX | **SvelteKit 3.0.0 + mdsvex 0.12.8** | If the project becomes an app-like product (accounts, server state). For a prose blog it hydrates whole pages by default and needs more plumbing for content collections. A legitimate runner-up if the author is Svelte-only. |
| Astro 7 + MDX | Next.js 16.3 (MDX) | Only if the author is already deep in React or needs server features. Heavier runtime, hydrates by default, more hosting coupling. Overkill for static explainers. |
| Astro 7 + MDX | Starlight 0.42 / Docusaurus | Docs-site templates, wrong shape for a narrative series with bespoke interactives. |
| Astro 7 + MDX | Observable Framework, Quarto | Good for data notebooks, but weaker for polished reusable components, and the author would write JS-in-markdown. Not evaluated in depth. |
| **Svelte 5** islands | React 19.3 (`@astrojs/react` 7.0.0) | If the author already knows React, or wants a library that exists only for React. Costs a larger runtime. Fine, but don't mix frameworks in one project. |
| Svelte 5 islands | Preact 11.0.0 (`@astrojs/preact` 6.0.5) | Smallest React-style option. Note `@astrojs/preact` peers `preact ^10.6.5`, so **Preact 11 is not yet supported by the Astro integration** (peer range read from the registry). Don't mix it with Svelte. |
| Svelte 5 islands | Solid 1.9.15 / vanilla JS web components | Possible but smaller Astro ecosystem or more boilerplate. Vanilla is fine for a tiny one-off widget but poor for a reusable component set. |
| `@huggingface/tokenizers` | `@huggingface/transformers` 4.3.0 | Only if real *model inference* is ever added (explicitly out of scope). It drags in `onnxruntime-web` and `sharp`. Its tokenizer layer is the same library. |
| `@huggingface/tokenizers` (all families, one adapter) | `gpt-tokenizer` 4.0.0 for OpenAI encodings | If cl100k and o200k payloads (1.3 and 2.9 MB gz) are a problem. 3x smaller, but ids only, so display strings must be derived another way. |
| `@huggingface/tokenizers` | `js-tiktoken` 1.0.21 | Pure JS and fine, but last published 2025-08-09, OpenAI encodings only, no strings. `gpt-tokenizer` is more current (Aug 2026) and has the same limits. |
| Plain CSS (scoped styles + CSS variables) | Tailwind 4.3.3 via `@tailwindcss/vite` | If the author prefers utility classes. Not required: Astro and Svelte scoped styles plus a palette in CSS variables are enough. Tailwind adds a dependency but little here. |
| Plain static files, no search | Pagefind 1.5.2 | Only if the site grows well beyond ~10 pages. Four posts, a hub and a glossary don't need search. |
| GitHub Pages (project site) | Cloudflare Workers static assets (`wrangler`) | Original recommendation: free, unlimited static asset bandwidth, free custom domains at the root. Limits: 20,000 files and 25 MiB per file on the free plan. Switch if a custom domain, higher bandwidth or per-file headers are needed. |
| GitHub Pages (project site) | Netlify / Vercel | Equally fine for static output. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@xenova/transformers` 2.17.2 | Last published 2024-05; superseded by `@huggingface/transformers`. Pulls in model-inference machinery. | `@huggingface/tokenizers` |
| `@huggingface/transformers` just for tokenization | Depends on `onnxruntime-web` (a `1.31.0-dev` build) and `sharp` for a task that needs neither. Slower installs, bigger risk. | `@huggingface/tokenizers` (what it uses internally) |
| `tiktoken` (npm, 1.0.22) / `@dqbd/tiktoken` | The npm package is the WASM build, which needs bundler WASM wiring in Vite/Astro and brings SSR-vs-browser problems (from memory; not tested here). | `gpt-tokenizer` or HF tokenizers |
| `@anthropic-ai/tokenizer` 0.0.4 | Anthropic's own README says that "as of the Claude 3 models, this algorithm is no longer accurate", and recommends the API `usage` field instead. It would teach readers wrong numbers. | Don't show Claude tokenization live. Label any Claude counts as precomputed or omit. |
| `llama-tokenizer-js` (2024-06), `sentencepiece-js` (2023-01), `@lenml/tokenizers` | Single-model or stale. HF tokenizers already handles the SentencePiece-style `tokenizer.json` files. | `@huggingface/tokenizers` |
| TypeScript 7.x (for now) | `@astrojs/svelte`, `@astrojs/check` and `svelte-check` peer-range only `^5 \|\| ^6`. | `typescript@~6.0.3` |
| `fetch()` of HF Hub URLs at reader runtime | Third-party availability, rate limits and cross-origin latency in the critical path of your core demo. | Copy the `tokenizer.json` files into `public/tokenizers/` and serve them yourself. Keep a manifest of source repo, commit and license. |
| Static top-level `import` of a big tokenizer (or `gpt-tokenizer`) in an island | The scratch island became 975 KB (437 KB gz) because cl100k was bundled into the component. | Dynamic `import()` or `fetch()` inside `onMount`/on click, via the adapter. |
| Remark/rehype plugin ecosystem (assumed default) | Astro 7's default Markdown pipeline is **Sätteri**, not remark/rehype. Existing remark/rehype plugins do not apply unless `@astrojs/markdown-remark` is installed and configured. | The project now uses `markdown.processor: unified()` (`@astrojs/markdown-remark`) with `rehype-citation` (`vancouver` style, BibTeX at `src/data/references.bib`, citations written `[@key]`). Two rules: write each citation group in ascending order of first citation (`[@a; @b]`), and keep keys alphanumeric. Otherwise keep Markdown plain and put anything fancy in Svelte components. |
| Astro `<ClientRouter />` / view transitions in v1 | Soft navigation complicates island lifecycle and cleanup for stateful widgets. Not needed for a hub-and-posts site. | Normal full-page navigation. |
| A charting library (Chart.js, Recharts, Observable Plot) | The visuals are HTML chips, bars and small SVG. A library is heavy and constrains the custom, educational look. | Svelte + inline SVG/CSS (`d3-scale` only if truly needed). |
| `svelte-motion` 0.12.2 (2024-02) / GSAP | Stale (svelte-motion) or unnecessary weight (GSAP) when Svelte already has `transition:`, `animate:flip` and `tweened`. | Svelte built-ins; CSS transitions. |
| Real model inference or WebGPU/WebLLM | Out of scope per PROJECT.md. Large downloads, device-compat problems. | Precomputed JSON (e.g. 2-D embedding map). |

## Stack Patterns by Variant

- Shape: `load(id) -> Promise<Tokenizer>`, `tokenize(text) -> Piece[]`, where `Piece = { id, display, bytes?, kind: 'text' | 'partial-char' | 'special' }`.
- Because the library returns token strings but no character offsets, the display layer must be custom code. Each family needs different handling:
- Do not rely on `decode([id])` per token. In the probes it drops leading spaces on Mistral (`▁Hello` became `Hello`) and returns U+FFFD for partial UTF-8 on byte-level BPE.
- A single emoji can span several tokens whose bytes are not valid text on their own. Render those as grey "partial character" chips showing hex. This is a teachable moment, not a bug.
- This adapter is the main custom code in the project. Unit-test it with Vitest golden cases: emoji, CJK, numbers, leading spaces, newlines.
- Load it only on explicit click, show size ("about 2 MB"), and cache it (HTTP cache headers; optionally the Cache API).
- Keep `loadTokenizer(id)` async so it can move into a **Web Worker** later with no caller changes. Don't build the worker up front. Encoding is ~1-3 ms, and only construction of the 9 MB tokenizers is noticeable.
- Svelte islands are SSR'd at build time, so initial state is real HTML. Use `client:visible` for below-the-fold widgets and `client:load` only for a hero widget.
- Never touch `fetch('/tokenizers/…')`, `window`, or `localStorage` at component top level, because the component also runs in Node during the build. Do browser-only work in `onMount`.
- Prefer one larger island that contains both. Otherwise use a shared `.svelte.ts` rune module or a nanostores atom (see Supporting Libraries).
- `trainBPE(words: string[], merges: number): Trace`, where each `Step` records: pair counts, chosen pair, new token, resulting word segmentations, and the tie-break rule used.
- `encode(text, merges)` applies merges in learned order.
- Define tie-breaking deterministically (highest count, then first-seen) and show it in the UI. Ties are common on tiny corpora and surprise learners. Golden-test against the classic Sennrich 2016 corpus (`low`, `lower`, `newest`, `widest`), where ties appear on the first merges.
- State plainly in the post that production tokenizers differ from the stepper's miniature in three ways: they work on bytes, they pre-split text with a regex, and they have a 50k-200k vocabulary.
- Ship a small pre-baked JSON of ~100 words with 2-D coordinates and a few "nearest neighbour" lists, rendered as inline SVG in Svelte. It never runs a model in the browser.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `astro@7.3.5` | Node `>=22.12.0`, Vite `^8.0.13` (bundled) | Rust compiler is stricter: unclosed tags are errors and invalid HTML is no longer auto-corrected. Default `compressHTML` is now `'jsx'`. `src/fetch.ts` is a reserved filename. Default Markdown is Sätteri. (From the Astro v7 upgrade guide.) |
| `@astrojs/mdx@8.0.2` | `astro ^7.2.10` | Uses `@astrojs/markdown-satteri` by default. `@astrojs/markdown-remark` is an optional peer. |
| `@astrojs/svelte@9.0.1` | `astro ^7`, `svelte ^5.43.6`, `typescript ^5.3.3 \|\| ^6.0.0` | **TypeScript 7 is outside the peer range.** |
| `@astrojs/react@7.0.0` / `@astrojs/preact@6.0.5` | `preact ^10.6.5` (not 11) | Only relevant if the framework choice is changed. |
| `vitest@5.0.3` | `vite ^6.4 \|\| ^7 \|\| ^8`, Node `^22.12 \|\| ^24 \|\| >=26` | OK with Astro 7. |
| `@huggingface/tokenizers@0.2.0` | any HF `tokenizer.json` + `tokenizer_config.json` | Some Oniguruma regex features can't be fully reproduced in JS (`\G`, full Unicode case folding, some split behaviours), so **parity-test each tokenizer you ship** against known ids. Parity verified for GPT-2-family on cl100k and o200k only. Mistral, BERT and Qwen loaded and tokenized sensibly but their ids were not cross-checked. |
| `gpt-tokenizer@4.0.0` | `@huggingface/tokenizers` output for cl100k and o200k | Ids identical on a mixed-script test string. |
| GitHub Pages | site <= 1 GB, sub-path `base` required for project sites | Keep all internal URLs base-aware. |
| `npm audit` | `astro@7.3.5` depends on `http-cache-semantics@4.2.0` | Audit flagged a high-severity advisory (GHSA-ch52-4w7c-c8xp) on this transitive dependency. Its suggested "fix" (downgrading to astro 2.x) is nonsensical. It is a build-time dependency, not shipped to readers. Re-check at project start, and don't `npm audit fix --force`. |

## Sources

- npm registry (`npm view`, read 2026-10-02): versions, `engines`, `peerDependencies`, publish dates for all packages named above. HIGH.
- https://docs.astro.build/en/guides/upgrade-to/v7/: Astro 7 breaking changes (Vite 8, Rust compiler, Sätteri, `compressHTML`). HIGH.
- https://docs.astro.build/en/guides/deploy/cloudflare/: (superseded by the GitHub Pages decision) Workers recommended over Pages; static sites need no adapter. HIGH.
- https://docs.astro.build/en/concepts/islands/: `client:load|idle|visible|only`, islands share state. HIGH.
- https://docs.astro.build/en/guides/markdown-content/: Sätteri vs remark; plugin configuration; GFM and smartypants defaults. MEDIUM (MDX-on-Sätteri details thin; the scratch build passed).
- https://docs.astro.build/en/guides/fonts/: built-in Fonts API. MEDIUM (not exercised).
- https://svelte.dev/docs/svelte/svelte-animate: `flip` signature. HIGH.
- https://github.com/huggingface/tokenizers.js (README, also shipped in the npm package): API, size, supported components, regex-compatibility caveats. HIGH.
- https://github.com/anthropics/anthropic-tokenizer-typescript: accuracy warning for Claude 3+. HIGH.
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits: Pages limits and use policy. HIGH.
- Web search on Cloudflare limits (20,000 files, 25 MiB per file, Pages in maintenance mode since April 2025): secondary sources, kept only for the Cloudflare alternative. MEDIUM.
- Hands-on probes (scratchpad, 2026-10-02):
- HF model API (license field) for Mistral-7B-v0.1, Qwen2.5-0.5B and GPT-2. HIGH. BERT's license (Apache-2.0) was not verified (LOW).

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

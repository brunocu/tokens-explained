# Architecture Research

**Domain:** Interactive multi-post explainer site (static content + embedded interactives), LLM tokenization for non-programmers
**Researched:** 2026-10-02
**Confidence:** MEDIUM-HIGH (tooling facts verified against official docs and npm registry; the "typical structure" of explorable-explanation sites is synthesized from known practice, not a single canonical reference)

## Headline Recommendations

1. **Static-first, content-driven site with islands.** Astro (current stable 7.x, Node >= 22.12) rendering MDX posts from a content collection. Pages are static HTML; only the interactive widgets ship JS. This matches the project shape: mostly prose, a few heavy widgets, no server.
2. **Three strictly separated layers: prose (MDX + data), interactive UI (Svelte 5 islands), and a framework-free core (TypeScript) that holds all tokenizer logic.** Toy tokenizer and BPE trainer live in the core and are imported by every island that needs them. UI never owns algorithm logic.
3. **Real tokenizers: hybrid, with precomputed fixtures as the default and a lazy-loaded live tokenizer only for "type your own text".** No WASM needed. Do not build a general in-browser multi-model tokenizer for v1.
4. **Authors write MDX with a small closed vocabulary of components that take plain-string props** (no imports, no `client:*` directives in prose). Wrapper `.astro` components apply the hydration directive.

## Standard Architecture

### System Overview

```
 BUILD TIME                                                     RUNTIME (reader's browser)
┌──────────────────────────────────────────────┐              ┌──────────────────────────────────────┐
│ CONTENT LAYER (author-facing)                │              │ STATIC HTML (zero JS by default)     │
│  posts/*.mdx   glossary.yaml/json            │              │  prose, headings, SSR'd default      │
│  (frontmatter: order, title, terms, summary) │   Astro      │  state of every widget               │
│            │                │                │   build      └───────────────┬──────────────────────┘
│            ▼                ▼                │ ───────────►                 │ hydrate on demand
│  Content collections (zod-validated)         │                              ▼
│            │                                 │              ┌──────────────────────────────────────┐
│            ▼                                 │              │ ISLANDS (Svelte 5, client:visible)   │
│ SITE SHELL (Astro layouts/pages)             │              │  Playground │ BpeStepper │ Compare   │
│  hub page ◄─ posts ordered by `order`        │              │  EmbeddingLookup │ ContextWindow │…  │
│  disambiguation page ◄─ glossary             │              └───────┬──────────────┬───────────────┘
│  post layout (prev/next, "next in series")   │                      │ imports      │ imports
│                                              │                      ▼              ▼
│ PRECOMPUTE SCRIPT (Node/Python, run by dev)  │              ┌────────────────┐ ┌───────────────────────┐
│  real tokenizers ──► fixtures/*.json         │              │ CORE (pure TS) │ │ TOKENIZER BACKENDS    │
│  (committed to repo, reviewed in diffs)      │              │  toy tokenizers│ │  PrecomputedBackend   │
└───────────────────────┬──────────────────────┘              │  BPE trainer   │ │  LiveBackend (lazy    │
                        │ bundled as small JSON               │  token model   │ │  dynamic import)      │
                        └───────────────────────────────────► │  color/bytes   │ └───────────┬───────────┘
                                                              └────────────────┘             │ lazy chunk
                                                                                             ▼
                                                                              o200k_base / cl100k_base ranks
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation | Talks To |
|-----------|----------------|------------------------|----------|
| Content collections | Single source of truth for posts and glossary; validate frontmatter at build | Astro `defineCollection` + `glob()` loader + Zod schema in `src/content.config.ts` | Site shell (reads), MDX renderer |
| Post MDX | Prose + embedded interactives, one idea per post | `.mdx` with a registered component map; plain-string props | Prose components, Interactive wrappers |
| Glossary data | The four terms (token, embedding, context, reasoning): short definition, "is NOT", links to posts | YAML/JSON data collection; `<Term id>` and disambiguation page both read it | Disambiguation page, `<Term>`, hub |
| Site shell | Layouts, routes, series navigation, hub, disambiguation page, SEO/OG | Astro pages + `getCollection()` + `getStaticPaths()` | Content collections |
| Interactive wrappers | Hide hydration choice from authors: `<Playground />` renders island with `client:visible` | Thin `.astro` files, one per interactive | MDX (called from), Svelte islands |
| Islands (widgets) | Stateful UI for one concept each | Svelte 5 components | Core, backends, shared UI primitives |
| Shared UI primitives | Reusable visuals: `TokenChips` (colored tokens + IDs), `ByteView`, `StepControls`, `TextBox` | Svelte components in `src/components/ui/` | Core types only |
| Core | All tokenizer logic and data types; no DOM, no framework | Plain TypeScript modules, unit-tested in Node (vitest) | Nothing above it (leaf dependency) |
| Tokenizer backends | Uniform interface to "real" tokenizer output | `TokenizerBackend` interface; precomputed and live implementations | Core types, fixtures, lazy chunks |
| Precompute script | Generate ground-truth fixtures from real tokenizers | Dev-run script (Node using gpt-tokenizer/js-tiktoken, or Python tiktoken/HF `tokenizers`) writing JSON to `src/data/fixtures/` | Real libraries; output consumed by PrecomputedBackend |
| Cross-island state (optional) | Share reader's typed text between islands on one page | Nano Stores (Astro's documented recommendation), or skip | Islands only |

## Recommended Project Structure

```
src/
├── content/
│   ├── posts/                      # one MDX file per post (author edits here)
│   │   ├── 01-what-is-a-token.mdx
│   │   ├── 02-embeddings.mdx
│   │   ├── 03-context.mdx
│   │   └── 04-reasoning.mdx
│   └── glossary/                   # one small data file per term (4 for v1)
│       └── token.yaml ...
├── content.config.ts               # collection schemas (Zod via astro/zod)
├── core/                           # FRAMEWORK-FREE. No imports from components/ or astro.
│   ├── types.ts                    # Token, TokenizationResult, BpeStep, TokenizerBackend
│   ├── toy/
│   │   ├── char.ts word.ts         # trivial tokenizers for contrast
│   │   ├── bpe-train.ts            # pure fn: corpus -> BpeTrace (steps[])
│   │   └── bpe-encode.ts           # apply learned merges to new text
│   ├── bytes.ts                    # UTF-8 helpers, partial-character detection
│   ├── color.ts                    # stable token -> color assignment
│   └── *.test.ts
├── backends/
│   ├── precomputed.ts              # reads fixtures; zero heavy deps
│   ├── live.ts                     # dynamic import of gpt-tokenizer / js-tiktoken lite
│   └── index.ts                    # chooses backend; same interface
├── data/
│   ├── fixtures/                   # generated, committed JSON (tokenizer x example)
│   ├── examples.ts                 # curated example ids: emoji, numbers, thai, code...
│   └── toy-vectors.ts              # small hand-made embedding table for Post 2 (NOT a real model)
├── components/
│   ├── ui/                         # TokenChips, ByteView, StepControls (shared primitives)
│   ├── interactive/                # Playground, BpeStepper, TokenCompare, EmbeddingLookup, ...
│   ├── wrappers/                   # *.astro files: apply client:visible, set SSR defaults
│   └── prose/                      # Callout, Term, Figure, Aside (static Astro components)
├── layouts/                        # PostLayout, HubLayout, BaseLayout
├── pages/
│   ├── index.astro                 # redirect or landing (may equal hub)
│   ├── start-here.astro            # hub
│   ├── terms.astro                 # disambiguation page
│   └── posts/[...slug].astro
└── stores/                         # optional Nano Stores (only if cross-island sync needed)
scripts/
└── precompute-fixtures.(mjs|py)    # run manually; output committed
```

### Structure Rationale

- **`core/` has no UI imports.** This is the load-bearing boundary. The toy tokenizer is needed by Playground, BpeStepper, Compare, and likely the Post 2-4 widgets. If it lives inside a Svelte component it will be copy-pasted or awkwardly imported. As pure TS it is testable in Node with no browser, which matters because tokenizer correctness (merge order, tie-breaking, byte handling) is the thing most likely to be silently wrong.
- **`content/` separate from `components/`.** The author edits prose and glossary without touching code. Frontmatter schema errors fail the build instead of producing a broken hub link.
- **`wrappers/` separate from `interactive/`.** Authors never see hydration details; developers can change a widget's hydration strategy in one place.
- **`data/fixtures/` committed, not generated at build.** Reviewable diffs, no Python/native dependency in CI, deterministic builds.

## Architectural Patterns

### Pattern 1: Islands with per-widget hydration

**What:** Page is static HTML; each interactive is its own island hydrated independently. Astro ships zero JS by default and hydrates only components with a `client:*` directive. Directives available: `client:load`, `client:idle`, `client:visible` (IntersectionObserver), `client:media`, `client:only`.
**When to use:** Always here. Use `client:visible` for nearly every widget (below the fold in a post), `client:load` only for a hero playground that is above the fold on Post 1. Avoid `client:only` because it skips server rendering and loses the no-JS fallback.
**Trade-offs:** Islands do not share a component tree, so cross-widget state needs a store. Acceptable: most widgets are self-contained by design (one concept each).

**Example:**
```astro
---
// src/components/wrappers/Playground.astro  (author never sees this)
import PlaygroundIsland from '../interactive/Playground.svelte';
const { text = 'Unbelievably tokenized', tokenizer = 'toy-bpe' } = Astro.props;
---
<PlaygroundIsland client:visible {text} {tokenizer} />
```
```mdx
{/* In the MDX post, the author writes only: */}
<Playground text="Unbelievably tokenized" />
```

### Pattern 2: Pure-core "trace" for step-through algorithms

**What:** `trainBpe(corpus, numMerges)` is a pure function returning an array of step snapshots: `{ pairCounts, chosenPair, newToken, corpusAfter }`. The BpeStepper island holds only an integer `stepIndex` and renders `trace[stepIndex]`.
**When to use:** Anything the reader steps through (BPE training, encoding a word by applying merges in order).
**Trade-offs:** Slightly more memory than mutating in place (irrelevant for a toy corpus). Gains: back/forward/scrub for free, deterministic, trivially unit-tested, UI has no algorithm knowledge. Strongly preferred over animating a mutating algorithm.

```typescript
// core/types.ts
export interface BpeStep {
  pairCounts: Array<[pair: [string, string], count: number]>;
  merged: [string, string];       // the pair chosen this step
  newSymbol: string;
  words: string[][];              // corpus after applying the merge
}
export type BpeTrace = { initial: string[][]; steps: BpeStep[] };
export function trainBpe(corpus: string, numMerges: number): BpeTrace { /* pure */ }
```

### Pattern 3: One normalized token model, multiple backends

**What:** Every source of tokens (toy BPE, precomputed real tokenizer, live real tokenizer) returns the same shape, defined in `core/types.ts`. `TokenChips` renders only this shape.
**When to use:** Always; it is what makes "toy vs real side by side" a trivial composition.
**Trade-offs:** Requires deciding the shape up front (below). Worth it.

```typescript
export interface Token {
  id: number;
  bytes: number[];          // raw UTF-8 bytes of this token's piece (source of truth)
  text: string;             // display string; lossy-safe (see isPartial)
  isPartial: boolean;       // bytes are not valid UTF-8 alone (mid-character split)
}
export interface TokenizationResult {
  tokenizerId: string;      // 'toy-bpe' | 'o200k_base' | 'cl100k_base' | ...
  input: string;
  tokens: Token[];
}
export interface TokenizerBackend {
  id: string;
  tokenize(text: string): Promise<TokenizationResult>;  // async so live backend can lazy-load
}
```

**Why bytes are in the model:** Byte-level BPE can split one character (an emoji is 4 UTF-8 bytes) across several tokens, and each such token decodes alone to a replacement character. A text-only token model cannot render the "emoji becomes 3 mysterious tokens" example, which is one of the project's headline demos. Verified at a conceptual level in multiple sources; the exact per-token byte API of each JS library must be confirmed in the implementing phase (see Open Questions).

### Pattern 4: Precomputed-first, live-on-demand real tokenizers

**What:** Curated comparison examples (emoji, numbers, languages, code) are tokenized by real tokenizers at author time and stored as small JSON fixtures keyed `(tokenizerId, exampleId)`. The live backend is only for free-text input and loads lazily on first interaction.
**When to use:** Compare widget uses fixtures. Playground "real tokenizer" tab uses live backend with a fixture-based fallback/message while loading.
**Trade-offs:** Fixtures can drift from library versions (mitigate with a CI parity test that runs live backend on every fixture example and diffs). Precomputing also makes it possible to include tokenizers that are impractical to ship (see sizes below).

### Pattern 5: Authoring vocabulary, not authoring code

**What:** MDX posts use a closed set of components registered globally through the renderer's `components` prop, each taking only strings/numbers/ids. Examples: `<Playground text="…" />`, `<BpeStepper corpus="low lower lowest" merges={6} />`, `<TokenCompare examples="emoji,numbers,thai" />`, `<Term id="embedding">embedding</Term>`, `<Callout kind="common-mistake">…</Callout>`.
**When to use:** All posts. Keeps prose files readable to a non-developer reviewer and prevents each post from importing things ad hoc.
**Trade-offs:** Slightly rigid; adding a widget needs a developer. Acceptable because widgets are few.

## Data Flow

### Build-time flow

```
mdx + frontmatter ──► content collection (zod-validated)
glossary files    ──► content collection
        │
        ├──► hub page:      posts sorted by `order`, summaries from frontmatter
        ├──► terms page:    glossary entries side by side; each links to its post
        ├──► post layout:   prev/next from the same sorted list
        └──► <Term id>:     looks up glossary at build; unknown id fails the build

scripts/precompute-fixtures ──► src/data/fixtures/*.json ──► imported (tree-shaken per page) by Compare
```

### Runtime flow: Playground (toy)

```
reader types ──► Playground (Svelte state: text)
                    │ tokenize(text)           synchronous, pure
                    ▼
               core/toy/bpe-encode  ──► Token[]
                    │
                    ▼
               TokenChips (renders colors, IDs, optional ByteView)
```

### Runtime flow: Compare (toy vs real)

```
reader picks example or types text
        │
        ├──► toy backend (core, sync) ─────────────────────┐
        ├──► precomputed backend (fixture lookup) ─────────┤──► TokenizationResult[] ──► TokenChips x N (aligned columns)
        └──► live backend (only if free text):             │
               first use: dynamic import of lite encoder + one rank file ─┘
```

### State Management

```
Widget-local Svelte state is the default (text, stepIndex, selected example).
        │
        └─ only if two islands must stay in sync on one page:
           Nano Stores atom (framework-agnostic, <1 KB, Astro's documented recommendation)
```

Do not persist reader state across posts in v1 (localStorage for "your text" is a deferrable nicety).

### Key Data Flows

1. **Prose to navigation:** frontmatter `order` and `summary` is the only thing the hub and prev/next read. Adding a post = adding one MDX file.
2. **Definition reuse:** glossary entry is authored once and rendered in `<Term>` tooltips, the disambiguation table, and optionally post intros, so the four definitions cannot drift apart. This directly serves the project's disambiguation goal.
3. **Algorithm to pixels:** core produces data (`BpeTrace`, `Token[]`); UI only maps data to DOM. Never the reverse.
4. **Ground truth to fixtures:** real library output flows one way, offline, into reviewed JSON.

## Real-Tokenizer Loading: Findings and Decision

| Option | Size / cost (measured or documented) | Fidelity | Verdict |
|--------|--------------------------------------|----------|---------|
| Precomputed JSON fixtures | Few KB per example set | Exact (generated from reference lib) | **Default for all curated examples and all non-OpenAI families** |
| `js-tiktoken/lite` + dynamic rank import | Rank files in package: `o200k_base` 2.33 MB, `cl100k_base` 1.09 MB, `gpt2` 0.55 MB (unminified, measured from v1.0.21 tarball); lite encoder code itself is small. Vite splits each rank import into its own lazy chunk | Exact for OpenAI encodings | **Live backend for free text**, one encoding at a time, loaded on first interaction |
| `gpt-tokenizer` (v4.0.0) | Per-encoding imports (`gpt-tokenizer/encoding/o200k_base`), dynamic import supported, MIT, actively maintained | Exact for OpenAI encodings | Equivalent alternative; evaluate in implementation which exposes per-token bytes more cleanly. js-tiktoken last published Aug 2025, gpt-tokenizer is more recently maintained |
| `@huggingface/tokenizers` (v0.2.0) | ~8.3 kB gzip library, but needs the model's `tokenizer.json` + `tokenizer_config.json` at runtime (multi-MB for large vocabs, size not verified here) | README states Oniguruma-to-JS regex translation limits; `encode()` documents `ids`, `tokens`, `attention_mask` only (no offsets) | **Not for v1.** Only consider if a non-OpenAI live demo becomes a requirement |
| WASM tiktoken | Adds wasm loading/bundler config | Exact | **Not needed.** Pure-JS options are adequate for short reader-typed text; WASM adds build complexity for no user-visible gain here |
| Server/API tokenizer | Needs hosting | Exact | **Reject.** Violates "works in the browser without setup" and static-hosting simplicity |

**Decision:** hybrid. Keep the vocab out of the main bundle and out of every page that does not use it (a documented gotcha: shipping full vocabularies on unrelated pages punishes pages that never tokenize). Self-host rank data as chunks from the same origin; do not depend on a third-party CDN at runtime (availability and privacy; the js-tiktoken README shows a CDN fetch option, avoid it).

If initialization of the 2.3 MB `o200k_base` table causes visible jank on mid-range phones, move live tokenization into a Web Worker. Start on the main thread; measure first.

## Scaling Considerations

This is a static site; "users" are not the scaling axis. The real axes are payload and maintainability.

| Concern | 4 posts (v1) | 10+ posts | Notes |
|---------|--------------|-----------|-------|
| Hosting | Any static host/CDN | Same | No server components |
| JS payload per page | Budget: prose pages ~0 KB framework JS until a widget is visible; Svelte runtime is small | Same | Verify with build output; set a per-page budget in the performance phase |
| Vocab payload | Lazy chunk only on interaction (1-2.3 MB) | Same | The one big-ticket item; never in initial load |
| Interactive reuse | 3 shared primitives + core | Promote repeated widget patterns to primitives | Avoid per-post one-off components |
| Content consistency | Glossary + schema validation | Same, scales linearly | Build fails on broken term ids or missing order |

### Scaling Priorities

1. **First bottleneck:** accidental vocab/JS in the initial bundle. Fix with dynamic imports and checking the build output.
2. **Second bottleneck:** widget code duplication across posts. Fix by extracting to `ui/` primitives and core.

## Anti-Patterns

### Anti-Pattern 1: Tokenizer logic inside components

**What people do:** Write BPE inside the Svelte file that draws it.
**Why it's wrong:** Cannot be reused by Compare/Playground, cannot be tested without a browser, UI and algorithm bugs become indistinguishable.
**Do this instead:** Pure functions in `core/`, components only render results (Pattern 2).

### Anti-Pattern 2: One giant interactive for the whole post (or the whole series)

**What people do:** A single mega-component with tabs/sections, since "it's one app".
**Why it's wrong:** This is the exact failure mode the project already rejected in the long-essay decision: heavy page, hard to maintain, forces unrelated content on readers.
**Do this instead:** One small island per concept, prose between them.

### Anti-Pattern 3: Hydrating everything with `client:load`

**What people do:** Mark all widgets `client:load` to be safe.
**Why it's wrong:** Defeats the point of islands; below-the-fold widgets cost JS and CPU on arrival.
**Do this instead:** `client:visible` by default; `client:load` for the single above-the-fold hero widget.

### Anti-Pattern 4: Text-only token model

**What people do:** Represent a token as a decoded string.
**Why it's wrong:** Cannot represent mid-character byte tokens; emoji and non-Latin scripts display as replacement characters or are silently mis-rendered, undermining the "real-world behavior" comparison.
**Do this instead:** Carry raw bytes plus `isPartial` and render byte groups explicitly (Pattern 3).

### Anti-Pattern 5: Live-tokenizing everything with real models

**What people do:** Try to run Llama/Gemma/etc. tokenizers in browser to be "authentic".
**Why it's wrong:** Large per-model files, regex-translation fidelity risks, no byte offsets in the documented HF JS API, large maintenance surface.
**Do this instead:** Precompute fixtures for non-OpenAI families; live only for one or two OpenAI encodings.

### Anti-Pattern 6: Prose or definitions embedded in components or data blobs

**What people do:** Put explanatory copy in widget props defaults or JSON so devs own the words.
**Why it's wrong:** Non-programmer author cannot edit it; terms drift between posts.
**Do this instead:** Prose in MDX, definitions in glossary data, widgets receive only labels they need.

### Anti-Pattern 7: Presenting embeddings/context/reasoning widgets as real model behavior

**What people do:** Fake a "real embedding" with random vectors and label it real.
**Why it's wrong:** The project's value is correctness of mental models; a misleading widget is worse than none.
**Do this instead:** Use an explicitly labeled toy table (`toy-vectors.ts`) and say so in the UI and caption.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| None at runtime | Fully static site | Intentional: works without setup, no keys, no uptime dependency |
| npm tokenizer libs (build/dev time, plus lazy chunks) | Bundled from `node_modules` | Pin versions; fixtures generated against the pinned version |
| Static host (any) | Upload `dist/` | Pick in roadmap/phase 1; cache rank chunks with long-lived immutable headers (hashed filenames) |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| MDX ↔ wrappers | Props (strings/numbers) | Closed component vocabulary; props must be serializable (islands receive serialized props) |
| Wrappers ↔ islands | Props + `client:*` directive | Wrapper sets SSR default state so page is meaningful without JS |
| Islands ↔ core | Direct imports, pure function calls | One-way: core never imports from islands |
| Islands ↔ backends | `TokenizerBackend` interface, async | Only place that knows about lazy loading |
| Backends ↔ fixtures | Static JSON import | Keyed `(tokenizerId, exampleId)` |
| Island ↔ island | Nano Stores (optional) | Only when needed; default is none |
| Glossary ↔ pages | Content collection queries / `reference()` | Build-time validated |

## Suggested Build Order (dependencies)

```
1. Site skeleton + content model
      (Astro, MDX, collections/schemas, layouts, hub + terms page stubs, glossary files, deploy target)
         │
2. Core (types, toy tokenizers, BPE trainer trace, bytes/color helpers) + tests         ◄── no UI dependency; can overlap with 1
         │
3. Shared UI primitives + wrapper pattern + SSR defaults + a11y baseline
      (TokenChips, ByteView, StepControls, one trivial end-to-end widget to prove hydration)
         │
4. Post 1 vertical slice: Playground + BpeStepper + prose  (flagship; validates the whole pipeline)
         │
5. Real-tokenizer layer: fixtures script + PrecomputedBackend + TokenCompare; then LiveBackend (lazy) + parity test
         │         (Post 1's toy-vs-real comparison section depends on this; finish Post 1 here)
         │
6. Posts 2-4 (embeddings, context, reasoning): each = prose + 1 small widget reusing TokenChips and core
         │
7. Finalize hub + disambiguation page (need all four glossary entries and post summaries),
   cross-links, SEO/OG, performance/bundle audit, accessibility pass
```

Rationale: the core and the content schema are leaf dependencies of everything; the flagship post is the first full vertical slice and flushes out component boundaries before three more posts reuse them; the real-tokenizer layer is the riskiest unknown and isolated behind an interface, so it can slip within Post 1 without blocking Posts 2-4 widgets that only need `TokenChips`. Hub and disambiguation are content-light shells early (stubs in step 1) but only finished last because they depend on everything else's frontmatter and glossary.

## Open Questions (to resolve in phase-specific research)

- Which JS library cleanly exposes per-token raw bytes (needed for partial-character display): js-tiktoken lite, gpt-tokenizer, or deriving bytes via the rank table. Not verified here.
- Whether any currently relevant OpenAI encodings are missing from the JS libraries (js-tiktoken last published Aug 2025; gpt-tokenizer lists `o200k_harmony`). Decide the exact "real tokenizer" set (suggest: `cl100k_base` + `o200k_base`, plus one non-OpenAI family via fixtures only).
- UI framework choice confirmation: Svelte 5 recommended (small runtime, good fit for animated step-through, @astrojs/svelte 9.x supports Astro 7), but Preact is a fine alternative if the author prefers React-style code. Not a one-way door because core is framework-free.
- Hosting choice and cache-header control for rank chunks.
- Non-JS fallback depth: how much of each widget's default state to SSR (recommended: at least the default example's token chips).

## Sources

- Astro islands and client directives: https://docs.astro.build/en/concepts/islands/ (HIGH, official)
- Astro content collections (glob loader, Zod schemas, references, render): https://docs.astro.build/en/guides/content-collections/ (HIGH)
- Astro MDX integration (components in MDX, `components` prop, collections): https://docs.astro.build/en/guides/integrations-guide/mdx/ (HIGH)
- Astro sharing state between islands (Nano Stores recommended): https://docs.astro.build/en/recipes/sharing-state-islands/ (HIGH)
- Astro 7 release / upgrade (stable June 22, 2026; Node >= 22.12): https://astro.build/blog/astro-7/ and https://v7.docs.astro.build/en/guides/upgrade-to/v7/ (HIGH for version; verified current via npm registry: astro 7.3.5, @astrojs/mdx 8.0.2, @astrojs/svelte 9.0.1 with peer astro ^7, svelte 5.57.1)
- js-tiktoken lite usage and rank imports: https://raw.githubusercontent.com/dqbd/tiktoken/main/js/README.md; rank file sizes measured directly from the npm tarball of js-tiktoken 1.0.21 (HIGH)
- Lazy loading ranks with Vite code-splitting, bloat-on-unrelated-pages gotcha: https://dev.to/ethan_5b3022150e2c07a4030/i-added-a-gpt-token-counter-and-learned-tiktokens-own-npm-package-ships-the-vocab-files-twice-3ae0 (MEDIUM, community)
- gpt-tokenizer features (per-encoding imports, dynamic import, MIT): https://github.com/niieani/gpt-tokenizer (MEDIUM-HIGH)
- @huggingface/tokenizers README (API fields, ~8.3 kB gzip, regex limitations): https://raw.githubusercontent.com/huggingface/tokenizers.js/main/README.md (MEDIUM-HIGH)
- Byte-level BPE splitting characters across tokens: https://zolotukhin.ai/blog/2026-05-27-byte-level-bpe-splits-a-character-mid-token-and-streaming-holds-the-bytes/ and tiktoken decode behavior (MEDIUM)
- Svelte 5 shared state via `.svelte.ts` modules (export object/factory, not reassigned `$state`): https://blog.openreplay.com/state-management-svelte-5-runes/ (MEDIUM)
- Explorable explanation practice (Distill, The Pudding use component frameworks, Svelte common): https://distill.pub/2020/communicating-with-interactive-articles/ and https://pudding.cool/resources/ (MEDIUM; informs pattern, not prescriptive)

---
*Architecture research for: interactive multi-post LLM tokenization explainer*
*Researched: 2026-10-02*

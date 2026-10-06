# Phase 1: Foundation & Token Playground - Research

**Researched:** 2026-10-03
**Domain:** Astro 7 static site on GitHub Pages (sub-path), Svelte 5 island with SSR default state, byte-level toy BPE tokenizer, accessible token display, Vitest + Playwright test setup
**Confidence:** HIGH (almost every open item below was exercised in a scratch Astro 7 project or a Node/Playwright probe this session; remaining gaps are listed in the Assumptions Log)

## Scope note (read first)

Per the binding instruction for this run, this document does **not** restate or re-verify what is already settled in `.planning/research/STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md`, `FEATURES.md`, `SUMMARY.md`, `01-CONTEXT.md` or `01-UI-SPEC.md`. It cites those files and researches only what they leave open, flag as MEDIUM/LOW, or mark "not yet verified": GitHub Pages deploy details, the Astro Fonts API, Svelte 5 + Astro island SSR specifics, the byte-level toy tokenizer / pre-split / partial-character design, accessibility mechanics, and test setup.

The `nyquist_validation` key is `false` in `.planning/config.json`, so the Nyquist "Validation Architecture" template section is omitted. Because the run instructions asked for test setup, a **Test Setup** section is included instead.

Method: a scratch Astro 7.3.5 + Svelte 5.57.1 + MDX project was built under the session scratchpad (outside the repo) and exercised with Playwright 1.63.0 in Chromium, Firefox and WebKit. A prototype toy tokenizer was trained and tested in Node 24.21.0. Items tagged `[VERIFIED: scratch ...]` come from those runs.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Toy tokenizer design**
- **D-01:** The toy is pre-trained offline on a small English corpus and ships a fixed merge list (a few hundred merges). Common words become one token and rare words split. Phase 2's stepper trains a separate tiny toy live.
- **D-02:** Characters the toy has never seen (emoji, CJK) fall back to single bytes. There is no unknown token. An emoji becomes several partial-character chips (FOUND-06, FOUND-07).
- **D-03:** Text goes through a pre-split step, then is converted to bytes, then merges are applied, as real tokenizers do (FOUND-07).
- **D-04:** Bytes are shown by default only on partial-character chips (as hex). A toggle ("peek under the hood") reveals the bytes for the entire string.

**Playground look & controls**
- **D-05:** Token boundaries are shown as colored chips with a visible outline and a small gap between them. An alternating palette sits on top of the outline, so boundaries never depend on color alone (FOUND-02).
- **D-06:** Whitespace inside a token is shown with a glyph: `␣` (or `·`) for space and `↵` for newline. A one-line legend explains the glyphs (FOUND-03).
- **D-07:** Example-text chips: a long or rare word, numbers and dates, an emoji example, and a fragment of well-known public-domain literature. Reset returns to the default text (TOK-04).
- **D-08:** The default view shows token text. A toggle switches to IDs (TOK-03). IDs are secondary and are introduced after the "token is not a word" point.
- **D-09:** Token, character and word counts are always visible (TOK-02). A text or table alternative and keyboard-operable controls are required (FOUND-04). Animated transitions are disabled under reduced motion (FOUND-05).

**Post 1 voice & structure**
- **D-10:** Voice is friendly and second person, with short paragraphs, in the style of Substack or Medium or Towards Data Science articles. Keep analogies and metaphors to a minimum and prefer accurate language. Do not default to Lego or syllable analogies.
- **D-11:** Structure is explain first, then play. A short definition and the "token is not a word" correction come up front, and the playground sits mid-post.
- **D-12:** Phase 1 ships a complete short post with no "coming soon" placeholders. Phase 2 adds sections later.

**Site shell & visual identity**
- **D-13:** The visual feel is inspired by Substack: editorial, single reading column, generous spacing, with the colored token chips as the main accent. Follow the system light or dark preference.
- **D-14:** Navigation is a minimal header with the site name only. The post acts as the home page for now, and the Phase 4 hub replaces it. There are no dead or greyed-out links.
- **D-15:** Hosting is a GitHub Pages project site, which serves from a sub-path like `/<repo>/`. This **overrides the Cloudflare Workers recommendation** in `.claude/CLAUDE.md` and the research. The planner must configure Astro `site` and `base`, use base-aware links and asset URLs, and add a GitHub Actions deploy. — **Reversibility:** costly — Base-path-aware URLs touch every link and asset. Moving to a custom domain or Cloudflare later changes `base`.

### Claude's Discretion
- Exact palette, fonts, and the Substack-inspired details, to be refined in the UI spec.
- Exact merge count, training corpus, and choice of the public-domain fragment.
- Exact wording of the glyph legend and the "peek under the hood" toggle label.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (The BPE stepper, real-tokenizer comparison, other posts, hub, and glossary tooltips belong to later phases.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Static, deployed page, no setup or account | GitHub Pages workflow (Code Examples 1-2); `base` + `trailingSlash: "always"` config; post-deploy smoke test; repo must be public on Free plan (Open Question 1) |
| FOUND-02 | Shared colored-token display, boundaries without color alone | `TokenDisplay` chip contract in UI-SPEC; flex-wrap spacer (Pitfall 4); static SSR render of the same component in prose (`ToyTokens`) |
| FOUND-03 | Whitespace made visible | `displayAscii()` glyph mapping incl. control pictures (Code Example 5); glyph coverage proven NOT present in the Fonts API latin subset (Fonts section) |
| FOUND-04 | Screen-reader / keyboard alternative, keyboard-operable controls | A11y mechanics section: table in `<details>`, live region, `aria-hidden` chips, Svelte a11y warning handling (Pitfall 9), axe via Playwright |
| FOUND-05 | Reduced motion | CSS block from UI-SPEC; Playwright `emulateMedia({ reducedMotion })` verified in all 3 engines |
| FOUND-06 | Split characters shown as partial chips, never a replacement symbol | Byte-level toy with ASCII-only merges makes `isPartial` exact; `TextDecoder` strict check; split-character count algorithm (Code Example 5); no-U+FFFD DOM assertion |
| FOUND-07 | Toy output produced from bytes after a pre-split step | Toy design section: shared pre-split regex used by both training script and runtime; goldens |
| TOK-01 | Live playground with colored tokens | Island lifecycle pattern (verified), IME-safe input handling, SSR default state |
| TOK-02 | Token, character, word counts | `Intl.Segmenter` rules; Firefox `isWordLike` defect and engine-independent rule (Pitfall 5) |
| TOK-03 | Toggle token text / IDs | Token model `{id, bytes, isPartial}`; IDs 0-255 are the raw byte values, merges start at 256 |
| TOK-04 | Example chips and reset | Focus management; example texts checked against the prototype tokenizer |
| TOK-10 | Plain-language post correcting "token = word" | `ToyTokens` static component so quoted splits cannot drift; content collection seeded; prose-vs-tokenizer test |
</phase_requirements>

## Summary

Every open technical item for Phase 1 resolved to a concrete, tested recipe. The deploy path is the documented Astro-on-GitHub-Pages workflow (`actions/checkout@v7`, `withastro/action@v6`, `actions/deploy-pages@v5`) with `base` set to the repo sub-path; `trailingSlash: "always"` makes `import.meta.env.BASE_URL` end in `/`, which keeps URL joins safe. The Astro Fonts API with `fontProviders.fontsource()` works as UI-SPEC describes (5 self-hosted woff2 files, about 104 KB total, base-aware URLs, `font-display: swap`, auto size-adjusted fallbacks), but its latin subset's `unicode-range` does **not** include `U+2423`, `U+21B5` or `U+21E5`, so the UI-SPEC's separate `.ws` glyph span with symbol-font fallbacks is mandatory, not optional.

The UI-SPEC island-lifecycle design (SSR `data-state="loading"`, inline IntersectionObserver timer, CSS-keyed failed message, late-hydration recovery, `<noscript><style>`) was built and tested end to end in Chromium and Firefox and works as specified. Two details need explicit handling: the "Reload page" button cannot rely on a Svelte handler (Svelte has not hydrated in the failed state), and a `<br>` does nothing inside a flex-wrap chip row (use a full-width zero-height spacer). Both were verified in three engines.

For the toy tokenizer, a byte-level BPE trained offline on an ASCII-normalised Project Gutenberg text with the GPT-2-style pre-split regex produces exactly the behaviour D-01 to D-04 want, and keeping every merge ASCII-only makes `isPartial` exact (every non-ASCII byte is its own token). A working prototype (800 merges, 7.8 KB JSON, under 8 ms worst case for 1,000 UTF-16 units) passes strict TypeScript and the emoji, ZWJ, accent, CJK, BOM and lone-surrogate probes. Several UI-SPEC rules are under-specified or wrong in edge cases and need a planner decision: the Words count (Firefox reports CJK as not word-like), the meaning of "characters split", and `maxlength` counting UTF-16 units.

**Primary recommendation:** Build in this order: (1) scaffold plus deploy pipeline and a first live deploy (a human checkpoint creates the public GitHub repo and enables Pages), in parallel with (2) the pure-TS toy core, goldens and offline training script; then (3) `TokenDisplay`/`TokenTable`/`Playground` with the verified lifecycle pattern; then (4) the MDX post using a build-time-rendered `ToyTokens` component for every quoted split; then (5) Playwright + axe verification against both the local preview and the deployed URL.

## Project Constraints (from CLAUDE.md)

From `/home/nixos/repos/tokenizer-vis/.claude/CLAUDE.md` (project) and `~/.claude/CLAUDE.md` (global). Treated as locked.

- Stack is fixed: Astro 7 (`^7.3.5`), `@astrojs/mdx`, Svelte 5 islands, `@astrojs/svelte`, plain CSS with variables, **TypeScript pinned `~6.0.3` (not 7)**, Node 24 LTS (Astro needs `>=22.12`).
- Hosting: GitHub Pages project site (D-15) overrides the Cloudflare text in CLAUDE.md. Every link and asset URL (including any `fetch`) must be base-aware.
- Use the Astro built-in Fonts API (`fonts` config, `<Font />`), not `@fontsource-*` packages or Google Fonts links.
- Do not use: `<ClientRouter />`/view transitions, a charting library, `svelte-motion`/GSAP, a remark/rehype plugin ecosystem (Astro 7 default Markdown is Sätteri), `fetch()` of HF Hub URLs at reader runtime, TypeScript 7.x. No real model inference.
- Never touch `fetch`, `window` or `localStorage` at island top level (components run in Node during the build); do browser-only work in `onMount`. Use `client:visible` for below-the-fold widgets.
- Do not `npm audit fix --force`; the high-severity `http-cache-semantics` advisory is a build-time transitive dependency (re-check at project start).
- Extract all widget logic into plain `.ts` so Vitest can test it without a DOM; Playwright smoke tests run against `astro preview`.
- Global: prefer Edit/Write over shell redirection or `sed` for file changes; verify versioned APIs against official sources; no assumptions about defaults.
- GSD workflow: file changes go through a GSD command (`/gsd-execute-phase` for this work).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Serving the post, shell, fonts | CDN / Static (GitHub Pages) | Build (Astro) | Fully static output; no server runtime (D-15) |
| Base-path correctness | Build (Astro `site`/`base`, `BASE_URL`) | CDN / Static | Resolved at build; Markdown links are **not** rewritten (Pitfall 8) |
| Default playground state, counts, table | Build (SSR of the Svelte island) | Browser (hydration) | UI-SPEC requires static HTML before hydration; verified Svelte SSR renders `value`, `readonly`, `disabled` |
| Tokenizing user text | Browser (pure TS core, synchronous) | Build (same code renders prose examples) | No network, privacy line must be true; same module runs in Node for `ToyTokens` and tests |
| Toy merge list creation | Dev-time script (Node 24 native TS) | Repo (committed JSON) | One-off offline training; committed output is reviewable and deterministic |
| Load-failure detection | Browser (tiny inline script) | CSS (state-keyed visibility) | Must work when the island script never loads |
| Accessibility alternative (table, live region) | Browser (Svelte `TokenTable`, status region) | Build (SSR default table) | Table and region exist in server HTML so no-JS and screen-reader entry both work |
| Content contract (posts, glossary) | Build (content collections, Zod) | — | Validated at build; seeded here for later phases |
| Deploy | CI (GitHub Actions) | — | `withastro/action` + `actions/deploy-pages` |

## Standard Stack

Stack choices, versions and the curated tokenizer table are **not restated**: see `.planning/research/STACK.md`. Only Phase 1 deltas and facts verified this session follow.

### Installed in Phase 1 (subset of STACK.md)

| Package | Pin (registry-verified 2026-10-03) | Phase 1 role |
|---------|-----------------------------------|--------------|
| `astro` | `7.3.5` | Site, content collections, Fonts API |
| `@astrojs/mdx` | `8.0.2` | Post as MDX |
| `@astrojs/svelte` | `9.0.1` | Island integration |
| `svelte` | `5.57.1` | Playground, `TokenDisplay`, `TokenTable` |
| `typescript` | `~6.0.3` (registry `latest` is 7.0.2; do not use) | Types |
| `vitest` | `5.0.3` | Unit tests for the core |
| `@playwright/test` | `1.63.0` | E2E + a11y smoke |
| `@axe-core/playwright` | `4.13.0` | Automated WCAG scan inside Playwright (new vs STACK.md) |
| `@astrojs/check`, `svelte-check` | `0.9.10`, `4.7.6` | Type checks in CI |

`[VERIFIED: npm view <pkg> version, 2026-10-03]` for every version above; the scratch project installed and built with exactly these pins.

**Not installed in Phase 1** (belong to later phases): `@huggingface/tokenizers`, `gpt-tokenizer`, `nanostores`, `@astrojs/sitemap`, `@astrojs/rss`, `sharp`, `d3-*`. No fontsource npm packages are needed: the Astro `fontProviders.fontsource()` provider downloads from Fontsource at build time `[VERIFIED: scratch build, "Copying fonts (5 files)"]`.

**Installation (scaffold, no new libraries beyond STACK.md plus axe):**
```bash
npm i astro@7.3.5 @astrojs/mdx@8.0.2 @astrojs/svelte@9.0.1 svelte@5.57.1
npm i -D typescript@~6.0.3 vitest@5.0.3 @playwright/test@1.63.0 @axe-core/playwright@4.13.0 @astrojs/check@0.9.10 svelte-check@4.7.6
```

## Package Legitimacy Audit

Run via `gsd-tools query package-legitimacy check --ecosystem npm ...` on 2026-10-03, plus `npm view <pkg> scripts.postinstall`.

| Package | Registry | Latest publish | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|----------------|--------------|-------------|---------|-------------|
| astro | npm | 2026-09-24 | 7.6M | github.com/withastro/astro | SUS (`too-new`) | Stack-locked; flag only (see note) |
| @astrojs/mdx | npm | 2026-09-22 | 2.9M | github.com/withastro/astro | SUS (`too-new`) | Stack-locked; flag only |
| @astrojs/svelte | npm | 2026-07-01 | 166K | withastro | OK | Approved |
| svelte | npm | 2026-09-18 | 7.5M | sveltejs | SUS (`too-new`) | Stack-locked; flag only |
| vitest | npm | 2026-09-30 | 135M | vitest-dev/vitest | SUS (`too-new`) | Flag only |
| @playwright/test | npm | 2026-09-04 | 82M | microsoft/playwright | SUS (`too-new`) | Flag only |
| @axe-core/playwright | npm | 2026-08-11 | 14.6M | dequelabs/axe-core-npm | OK | Approved |
| typescript | npm | 2026-07-08 | 355M | microsoft | OK | Approved (pin `~6.0.3`) |
| @astrojs/check | npm | 2026-07-27 | 4.4M | withastro | OK | Approved |
| svelte-check | npm | 2026-08-13 | 3.2M | sveltejs | OK | Approved |

**Packages removed due to SLOP:** none.
**Packages flagged SUS:** astro, @astrojs/mdx, svelte, vitest, @playwright/test. The only reason is `too-new`: the seam keys on the publish date of the **latest** release (days to weeks old), not the package age. All are long-established official packages with 2.9M to 135M weekly downloads and a source repo, and none has a `postinstall` script (`npm view ... scripts.postinstall` returned empty for all ten). Because the packages were chosen in STACK.md (the project's own research) and exact versions are pinned here, **one consolidated `checkpoint:human-verify` at scaffold time** (confirm the pinned versions in `package.json` and the lockfile) satisfies the protocol; per-package checkpoints would add noise. `esbuild` (transitive) has `postinstall: node install.js`; npm 11.19.0 prints an `allowScripts` warning for it but install and build succeeded `[VERIFIED: scratch install and build]`.

## Architecture Patterns

Layering, component boundaries, island/wrapper pattern and the `Token` model are settled in `ARCHITECTURE.md` and UI-SPEC and not repeated. Phase 1 refinements:

- UI-SPEC's token contract wins over ARCHITECTURE.md's sketch: `Token = { id: number; bytes: Uint8Array; isPartial: boolean }` with **no stored `text` field** (UI-SPEC: "Tokens are never stored or compared as decoded strings (Pitfall 2)"). Display text is derived at render time from bytes.
- Phase 1 tokenizer API is synchronous (`tokenize(text): Token[]`). Phase 2 wraps it in the async `TokenizerBackend` interface; no change to callers beyond the wrapper.

### System Architecture Diagram

```
 BUILD TIME (Node 24)                                         READER'S BROWSER
 ┌──────────────────────────────────────────────┐
 │ scripts/train-toy-bpe.ts  (dev-run, offline) │
 │   corpus.txt (ASCII-normalised, PD text)     │
 │      │ presplit() <── shared with runtime    │
 │      ▼ train → merges.json (committed)       │
 └──────────────────────┬───────────────────────┘
                        ▼
 src/core/ (pure TS, no DOM)
   presplit.ts ─► toy.ts (bytes → merges → Token[]) ─► counts.ts / display.ts
        │                    │
        │         ┌──────────┴────────────┐
        ▼         ▼                       ▼
  Vitest goldens  Astro build:           Svelte island (Playground)
  (src/**/*.test) ToyTokens.astro →      SSR at build: default text → chips,
                  static TokenDisplay    counts, table, data-state="loading"
                  in MDX prose                 │ client:visible → IntersectionObserver
                        │                      ▼ hydrate → onMount → "ready"
                        ▼                 typing → tokenize() (sync) → TokenDisplay,
  dist/ (static) ───────────────────────► TokenTable, debounced live region
        │   base="/<repo>", trailingSlash="always"
        ▼                                 inline <script is:inline>: 8 s after card is
  withastro/action → upload artifact      visible, if data-state still "loading" →
        ▼                                 set "failed" (CSS shows message + Reload)
  actions/deploy-pages → github.io/<repo>/
```

### Recommended Project Structure (Phase 1 additions to ARCHITECTURE.md)

```
.github/workflows/deploy.yml        # Astro docs workflow + a test job
astro.config.mjs                    # site, base, trailingSlash, fonts, integrations
svelte.config.js                    # vitePreprocess from @astrojs/svelte
vitest.config.ts                    # include only src/**/*.test.ts
playwright.config.ts                # testDir "e2e", webServer with --ignore-lock
e2e/*.spec.ts                       # Playwright (kept out of Vitest's reach)
scripts/train-toy-bpe.ts            # run: node scripts/train-toy-bpe.ts
scripts/corpus/                     # training text + notes on source/licence
src/core/{presplit,toy,counts,display,types}.ts (+ *.test.ts) and toy/merges.json
src/components/{TokenDisplay,TokenTable,Playground}.svelte
src/components/wrappers/PlaygroundSection.astro   # H2 + sentence + island
src/components/prose/ToyTokens.astro              # build-time static chips for prose
src/content.config.ts, src/content/posts/*.mdx, src/content/glossary/*.yaml
src/styles/tokens.css               # UI-SPEC custom properties, both themes
```

### Pattern 1: Single source of truth for the pre-split regex
**What:** `presplit.ts` exports the one regex; the offline training script imports it (Node 24 runs `.ts` natively with explicit `.ts` import extensions), as do the runtime and tests. **Why:** training and encoding disagreeing on pre-split silently corrupts merge quality. `[VERIFIED: node tt/b.ts ran under Node 24.21.0; Astro base tsconfig sets allowImportingTsExtensions: true and verbatimModuleSyntax: true]`.

### Pattern 2: SSR-first island with a CSS-keyed lifecycle
The card root carries `data-state`; loading, failed and ready messages are all in server HTML and shown or hidden by `[data-state=...]` selectors, so the failed state works even though the island JS never ran. See Code Example 3. `[VERIFIED: scratch Playwright, failed after 9 s with island script gated, then recovered to ready when released]`.

### Pattern 3: Build-time example rendering in prose (no drift)
A Svelte component without a `client:*` directive renders to static HTML with zero script `[VERIFIED: scratch build, built page contained 0 <script> tags]`. `ToyTokens.astro` takes a plain string, calls the core `tokenize()` at build time and renders `TokenDisplay` statically. MDX writes `<ToyTokens text="..." />`; no split is ever hand-typed (PITFALLS Pitfall 4). Pass components through `<Content components={{ Playground, ToyTokens }} />` `[VERIFIED: scratch build, Astro 7 render() from astro:content]`.

### Pattern 4: Heading + section in an Astro wrapper, card in the island
Put `<section aria-labelledby="try-heading"><h2 id="try-heading">Try it yourself</h2><p><slot/></p><Island client:visible /></section>` in `PlaygroundSection.astro` so the H2 id is deterministic (MDX auto-generates heading ids from text, which is fragile to reference). The MDX writes `<PlaygroundSection>one sentence</PlaygroundSection>`. UI-SPEC's "card is a `<section aria-labelledby>` tied to its H2" is satisfied by this section.

### Anti-Patterns to Avoid
- **`bind:value` on the textarea.** It updates state during IME composition and drives tokenization mid-composition (Pitfall 6).
- **`<br>` between chips.** Ignored in flex containers (Pitfall 4).
- **Svelte `onclick` for "Reload page".** Not attached when hydration never happened (Pitfall 7).
- **Root-absolute links or images in MDX** (`/foo`, `/img.png`): not base-prefixed (Pitfall 8).
- **Storing `text` on `Token`.** Violates UI-SPEC and Pitfall 2.

## Deploy: GitHub Pages with Astro 7

Workflow (from the official guide, `[CITED: docs.astro.build/en/guides/deploy/github/]`, action tags confirmed to exist via `git ls-remote --tags`: `withastro/action` v6.1.3, `actions/checkout` v7.0.1, `actions/deploy-pages` v5.0.1):

- `actions/checkout@v7`, `withastro/action@v6` (install, build, upload artifact; inputs `path`, `node-version` default `24`, `package-manager` auto-detected from lockfile, `build-cmd`, `cache`, `cache-dir`, `out-dir` default `dist`; it does **not** run tests `[CITED: raw.githubusercontent.com/withastro/action README]`), then `actions/deploy-pages@v5` in a second job with `environment: github-pages`.
- Repo setting: Settings, Pages, Build and deployment, Source = "GitHub Actions". The `github-pages` environment is created automatically `[CITED: docs.github.com configuring-a-publishing-source]`.
- Required `permissions`: `contents: read`, `pages: write`, `id-token: write`.
- GitHub Pages on a Free personal account is available for **public** repositories only; private repos need a paid plan, and the published site is public either way `[CITED: docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages, via search summary; plan wording not re-read on the page itself]`.
- This repo currently has **no git remote** `[VERIFIED: git remote -v returned nothing]` and `gh` is not installed `[VERIFIED: command -v gh]`. Creating the GitHub repo, adding the remote and enabling Pages is a manual user step: make it an explicit `checkpoint:human-action` early in Wave 1 so the first deploy (proof of FOUND-01) is not left to the end.

**Base path rules (all `[VERIFIED: scratch build and preview]`):**
- `site: "https://<owner>.github.io"`, `base: "/<repo>"`, and add `trailingSlash: "always"`. With `trailingSlash` unset, `import.meta.env.BASE_URL` was `"/tokenizer-vis"` (no trailing slash); with `"always"` it is `"/tokenizer-vis/"`. GitHub Pages serves directory output at `/<repo>/` so this matches.
- Font URLs, `_astro` asset URLs, island `component-url` and `renderer-url` are all base-prefixed automatically (observed `/tokenizer-vis/_astro/fonts/...woff2`).
- **Markdown/MDX links and images are NOT rewritten**: `[x](/foo)` stayed `href="/foo"`, `![](/img.png)` stayed `src="/img.png"`. Use `import.meta.env.BASE_URL` in `.astro` files only, and add a build-output check (Test Setup) that fails on any root-absolute `href`/`src` not under the base.
- `astro preview` serves under the base: `/` returned 404 while `/tokenizer-vis/` returned 200.
- `.nojekyll` is likely unnecessary because artifact deployment via `actions/deploy-pages` does not run Jekyll, but this is `[ASSUMED]`; the first-deploy check must request an `_astro/*` asset and a font URL from the live site and expect 200.
- Derive owner and repo from `process.env.GITHUB_REPOSITORY` with a documented fallback (Code Example 1) so a repo rename changes nothing in code; whether the variable is visible inside `withastro/action`'s build step is `[ASSUMED]` (it is a default Actions variable, and the post-deploy check catches a wrong base).

## Astro Fonts API (verified usage)

`[VERIFIED: scratch build, Astro 7.3.5]` The UI-SPEC configuration works as written:

- `fontProviders.fontsource()` resolved `"Source Serif 4"` (weights 400 and 600, normal and italic, latin) and `"JetBrains Mono"` (400, latin). Build log: `Copying fonts (5 files)`; files total about 104 KB (20 to 22 KB each, woff2) under `dist/_astro/fonts/`. Fonts are fetched from Fontsource at **build time**, so the build machine needs network access (GitHub runners have it); nothing is fetched by the reader.
- `<Font cssVariable="--font-serif" />` and `<Font cssVariable="--font-mono" />` in `<head>` inject the `@font-face` rules and `:root{--font-serif: ...}`; the family name is hashed (for example `"Source Serif 4-5f0e23a0e36edee3"`), so always use the CSS variable, never the literal family name.
- It emits `font-display: swap` and auto-generated metric-adjusted fallback faces (`size-adjust`, `ascent-override`), so layout shift is already minimised.
- **Glyph gap (confirms the UI-SPEC gate):** the latin subset's `unicode-range` is `U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD`. It contains none of `U+2423` (`␣`), `U+21B5` (`↵`), `U+21E5` (`⇥`) nor the Control Pictures block `U+2400-243F`. Browsers fall back per glyph, so a dedicated `.ws` span with a symbol-capable fallback stack is required.
- **Preload:** the `preload` prop accepts `true` or an array of filters `{ weight, style, subset }` `[VERIFIED: node_modules/astro/components/Font.astro:10 and dist/assets/fonts/core/filter-preloads.js]`. Recommended: `<Font cssVariable="--font-serif" preload={[{ weight: 400, style: "normal" }]} />` only (title and first paragraphs), none for mono or italic.
- The Fonts API is documented as production-ready with only some advanced methods (`experimental_getFontFileURL`, `fontData`) experimental `[CITED: docs.astro.build/en/guides/fonts/]`; the features used here are not among them.

## Svelte 5 + Astro island specifics

All `[VERIFIED: scratch build/Playwright]` unless noted.

- **SSR output carries state.** `<textarea value={text}>` (no `bind:`) renders the default text as the element content, HTML-escaped (`Hello <b>world</b>` came out `Hello &lt;b>world&lt;/b>`), plus `readonly=""`, `disabled=""`, `data-state="loading"`, `maxlength="1000"`. `Intl.Segmenter`, `TextEncoder` and `TextDecoder` all work in Node during SSR, so counts, chips and table for the default text are server-rendered with no extra work.
- **`client:visible` details.** The generated `astro-island` is `display: contents` and the visible directive observes the island's **children** with `rootMargin` taken from the directive options (default none); the same observer semantics are what UI-SPEC's failure timer must mirror. In Playwright, hydration only occurs once the card is in the viewport: call `scrollIntoViewIfNeeded()` before asserting `data-state="ready"`.
- **`@astrojs/svelte` setup:** `svelte.config.js` with `vitePreprocess` imported from `@astrojs/svelte`; integration config takes precedence over `svelte.config.js` `[CITED: docs.astro.build/en/guides/integrations-guide/svelte/]`.
- **Svelte a11y compile warning:** `tabindex="0"` on a `<div>` (even with `role="region"`) triggers `a11y_no_noninteractive_tabindex`. UI-SPEC's scrollable table wrapper needs `<!-- svelte-ignore a11y_no_noninteractive_tabindex -->` (justified: WCAG requires keyboard access to scrollable regions) so `svelte-check` stays clean.
- **`<noscript><style>` inside a Svelte component works:** the compiler emits it verbatim, there are no hydration warnings or errors (console empty in Chromium and Firefox), and with JavaScript disabled the note is visible and the loading status hidden. UI-SPEC's approach is confirmed; no `.js`-class alternative is needed.
- **Components without `client:*` render static HTML**, no script emitted (basis of `ToyTokens`).
- **Cosmetic build warning:** Rolldown prints `MODULE_LEVEL_DIRECTIVE ... "use astro:head-inject" in "...mdx?astroPropagatedAssets"` for MDX posts. The build still completes; do not treat it as a failure.
- **Content collections (Astro 7):** `import { z } from "astro/zod"`, `glob()` from `astro/loaders`, `reference("glossary")` and `render(entry)` from `astro:content` all worked; `terms: [token]` in frontmatter was validated against a `glossary/token.yaml` entry `[VERIFIED: scratch build]`. This seeds the "content contract" blocker from STATE.md.

## Toy tokenizer design (byte-level, pre-split, partial-character aware)

Prototype built and tested this session `[VERIFIED: scratch prototype, Node 24.21.0, tsc strict + noUncheckedIndexedAccess clean]`. Whether to adopt the exact numbers is Claude's Discretion (D-01); the structure below is the recommendation.

**Pipeline (D-03):** `presplit(text)` with the GPT-2-style regex, then `TextEncoder` bytes per piece, then apply merges greedily by rank (lowest rank first) within the piece, never across pieces.

**Pre-split regex:** the original GPT-2 pattern, simplified to JS (no possessive quantifiers):
`/'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu`.
Official tiktoken source for comparison: gpt2 `'(?:[sdmt]|ll|ve|re)| ?\p{L}++| ?\p{N}++| ?[^\s\p{L}\p{N}]++|\s++$|\s+(?!\S)|\s` and cl100k_base `'(?i:[sdmt]|ll|ve|re)|[^\r\n\p{L}\p{N}]?+\p{L}++|\p{N}{1,3}+| ?[^\s\p{L}\p{N}]++[\r\n]*+|\s++$|\s*[\r\n]|\s+(?!\S)|\s` `[CITED: raw.githubusercontent.com/openai/tiktoken/main/tiktoken_ext/openai_public.py]`. The toy keeps the GPT-2 shape (the leading space attaches to the next word, the key lesson) and does not need the cl100k digit-chunking or newline rules.

**Vocabulary and IDs:** ids 0-255 are the raw byte values, merge `i` has id `256 + i`. IDs are therefore honest and teachable (the ID of `A` is 65), and no `<unk>`, `</w>` or special tokens exist (matches D-02 and PITFALLS Pitfall 1).

**ASCII-only merges make `isPartial` exact.** Training on an ASCII-normalised corpus (curly quotes and dashes mapped to ASCII, all other non-ASCII removed) means no merge ever contains a byte >= 0x80. Then every non-ASCII byte is its own token and a lone byte >= 0x80 is never valid UTF-8, so `isPartial` is true exactly for those tokens. Prototype check: 800 merges, 0 contain a non-ASCII byte. Still compute `isPartial` with a strict `TextDecoder("utf-8", { fatal: true, ignoreBOM: true })` (not a hand-rolled test), and precompute it once per vocabulary entry (not per emitted token) because a thrown exception per partial token is the slow path. Add a unit test asserting the invariant, so a future retrain with non-ASCII text cannot silently change display semantics. `ignoreBOM: true` matters: the default decoder strips a leading `EF BB BF`.

**Training (offline, `scripts/train-toy-bpe.ts`):** count pre-split pieces in the corpus, represent each as a byte sequence with its frequency, repeat N times: count adjacent pairs weighted by frequency, merge the best pair. Tie-break deterministically (highest count, then smallest `(left, right)` id pair) and record it. Output `merges.json` as `[[left,right], ...]` plus metadata (corpus name, retrieval date, N, tie-break rule). 800 merges serialised to 7,830 bytes of JSON. Training pg1342-size text (772 KB) took about 2 s with a naive O(merges x words) loop.

**Corpus recommendation `[ASSUMED: author discretion, licence reasoning]`:** one public-domain Project Gutenberg text, boilerplate stripped, ASCII-normalised, plus a small hand-written supplement with numbers, dates and prices. Without digits in the corpus every digit is its own token (prototype: `2026-10-03` became 10 single-byte tokens), which would teach "numbers always split per digit". Prefer a text that does not contain the Austen example sentence if you want the example chip to be an honest unseen-text demo (Alice in Wonderland, 174 KB, Gutenberg #11, was tested and works; Pride and Prejudice contains the sentence). The Gutenberg ebook header states "You may copy it, give it away or re-use it under the terms of the Project Gutenberg License ... at no cost and with almost no restrictions whatsoever" `[VERIFIED: header of downloaded pg11.txt]`. Only the merge list (no corpus text) ships to readers; keep the corpus file and a source note under `scripts/corpus/`.

**Merge count:** 300 merges on Alice left common words split (` wor|d`); 500 on Pride and Prejudice was marginal; **800 merges** on Pride and Prejudice gave single tokens for ` word`, ` into`, ` but`, ` whole`, ` stay`, ` soon`, ` good`, ` must`, ` want`, with rare words still splitting. D-01 says "a few hundred"; roughly 600-800 is the useful range. Tune with the goldens below, not by eye.

**UI-SPEC acceptance check on the default text** (`Tokenization splits unusual words into pieces, but common words stay whole.`): with the 800-merge Pride and Prejudice list it tokenized to `T | o | k | en | iz | ation | ␣sp | l | it | s | ␣un | us | u | al | ␣word | s | ␣into | ␣p | ie | ces | , | ␣but | ␣com | m | on | ␣word | s | ␣st | ay | ␣whole | .` (31 tokens): it satisfies the three conditions (multi-token word, leading-space tokens, whole common words), though `Tokenization` at 6 tokens and ` splits` at 4 look noisy. UI-SPEC explicitly allows changing the sentence, not the contract; choose the final sentence only after the merge list is frozen, then freeze a golden.

**Golden tests (Vitest, `src/core/*.test.ts`):** (1) round trip: concatenated token bytes equal `TextEncoder` bytes of the input for the regression corpus (emoji, ZWJ family, flag, combining accent, CJK, long whitespace, newline, tab, control chars, BOM, lone surrogate, `<|endoftext|>`, RTL text); (2) no merge contains a byte >= 0x80; (3) exact token splits for the four example chips and the default text, which also guard the prose; (4) `isPartial` true iff strict decode fails; (5) split-character count and grapheme count for the corpus (see Code Example 5 for measured values); (6) no U+FFFD in any rendered chip text or table cell (render through the same helpers and assert on the string, plus a DOM assertion in E2E).

**Measured performance** `[VERIFIED: node core/perf.ts]`: 1,000 UTF-16 units of `"a"*1000`, `"ab"*500`, repeated words, mixed text, CJK (2,997 tokens), 500 emoji (2,000 tokens) and 1,000 spaces all tokenized in 0.2 to 7.6 ms on desktop (the slow cases include a per-token exception that precomputing `isPartial` removes). `maxlength="1000"` caps the worst case (3,000 tokens for BMP CJK; the "4,000 chips" in UI-SPEC is an upper bound that cannot be reached). Measure DOM render time with a 1,000-character CJK input under CPU throttling in the E2E suite; chip rendering, not tokenizing, is the cost.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Counting characters the reader sees | `string.length` or code-point counts | `Intl.Segmenter` (grapheme) | Emoji and ZWJ families: the man-woman-girl family emoji (3 emoji joined by 2 U+200D) is 1 grapheme, 5 code points, 8 UTF-16 units, 18 bytes `[VERIFIED: node probe]` |
| UTF-8 validity of a token | Manual byte-pattern checks | `new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })` | Handles overlongs, surrogates, truncation correctly |
| Self-hosted fonts + fallbacks | `@font-face` by hand, `@fontsource-*` | Astro Fonts API | Hashed names, metric-adjusted fallbacks, base-aware URLs, preload filters |
| Static deploy | Custom Pages scripts | `withastro/action` + `actions/deploy-pages` | Documented, cached builds |
| WCAG scan | Hand-written contrast/ARIA checks | `@axe-core/playwright` | Runs the scan on the real built page; ran in scratch |
| Radio group semantics | Custom ARIA widget | Native `<fieldset><legend>` + radios | Arrow-key behaviour for free (UI-SPEC already requires native inputs) |
| Disclosure widget | Custom accordion | Native `<details>/<summary>` | Keyboard, no-JS and open-state-preserved-while-typing for free |
| Prose token splits | Hand-typed `"un|usual"` strings | `ToyTokens` build-time component | Cannot drift from the tokenizer (Pitfall 4) |

**Key insight:** every behaviour a screen-reader or keyboard user needs here is already provided by a native element; the only custom machinery is the tokenizer core and the lifecycle script.

## Common Pitfalls

Pitfalls already in `PITFALLS.md` (2, 12, 13, 22 to 25) are covered by UI-SPEC and not repeated. These are **new, verified** Phase 1 traps.

### Pitfall 1: `astro preview` backgrounds itself and breaks Playwright `webServer`
**What goes wrong:** In an agent-detected environment on Linux or macOS, `astro preview` starts as a background daemon and returns exit 0 immediately; Playwright then sees the server process exit. **Why:** `wantsBackground = !!flags.background || supportsAgentAutoBackgrounding(process.platform) && agentDetected && !ignoreLock` `[VERIFIED: node_modules/astro/dist/cli/preview/index.js:50]`; documented in the Astro CLI reference. **How to avoid:** use `npx astro preview --ignore-lock --port 4321` in `webServer.command` (verified: ran in foreground and served under the base). `--ignore-lock` cannot be combined with `--background`. **Warning sign:** "Process from config.webServer exited early" or a server left running after tests (`astro preview stop`).

### Pitfall 2: Vitest and Playwright collide on filename patterns
**What goes wrong:** Vitest's default include also matches `*.spec.ts`, and Playwright's default also matches `*.test.ts`; each runner then fails importing the other's files (observed: "test() called from an async describe" in Vitest, and a `test()` assertion in Playwright). **How to avoid:** Vitest `include: ["src/**/*.test.ts"]`; Playwright `testDir: "e2e"` with `*.spec.ts`. `[VERIFIED: scratch, both runners green after the split]`.

### Pitfall 3: Playwright's downloaded Chromium does not launch on this NixOS machine
**What goes wrong:** `npx playwright install chromium` succeeds but launch fails with `error while loading shared libraries: libglib-2.0.so.0` `[VERIFIED: failing output captured]`. **How to avoid locally:** use the nixpkgs browsers whose version matches the npm package (nixpkgs `playwright-driver` is 1.63.0 `[VERIFIED: nix eval --raw nixpkgs#playwright-driver.version]`): `nix build nixpkgs#playwright-driver.browsers --no-link --print-out-paths`, then `PLAYWRIGHT_BROWSERS_PATH=<out> PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true npx playwright test`. This gave working Chromium, Firefox and WebKit runs. If `@playwright/test` is ever bumped past what nixpkgs ships, the browser build numbers no longer match. **CI:** GitHub's Ubuntu runners use `npx playwright install --with-deps chromium` (standard; not exercised here).

### Pitfall 4: `<br>` is ignored inside the flex-wrap chip row
**What goes wrong:** UI-SPEC wants "a forced line break in the chip flow" after a chip containing a newline. In a `display:flex; flex-wrap:wrap` container a `<br>` produces no break in Chromium, Firefox and WebKit (all three measured the same top offset for chips on both sides of the `<br>`). **How to avoid:** emit `<span class="brk" aria-hidden="true"></span>` with `flex-basis: 100%; height: 0` (measured: the next chip moved to a new row in all three engines). The row `gap` adds extra vertical space around the spacer; compensate with a negative margin if the extra 4 px matters.

### Pitfall 5: `Intl.Segmenter` `isWordLike` is false for CJK in Firefox
**What goes wrong:** Counting `isWordLike` segments gives `你好，世界` = 2 words in Chromium, WebKit and Node but **0** in Firefox (`日本語` 1 vs 0). Segmentation boundaries are identical; only the flag differs. Thai also differs by dictionary (`สวัสดีครับ`: 2 in Chromium and WebKit, 3 in Firefox). `[VERIFIED: Playwright 1.63.0 Chromium/Firefox/WebKit and Node probes]`. **How to avoid:** count segments that contain a letter or number (`/[\p{L}\p{N}]/u`) instead of trusting `isWordLike`; this gave 2 / 1 for the CJK cases in all three engines. Thai remains engine-dependent; acceptable and worth one sentence in the post only if a Thai example is added. This deviates from UI-SPEC's literal "word-like segments" wording; flag it to the user as a clarification, behaviour for ASCII text is identical.

### Pitfall 6: `bind:value` + IME composition
**What goes wrong:** `bind:value` on the textarea updates `text` on every `input`, including mid-composition, defeating the UI-SPEC "tokenization pauses between compositionstart and compositionend". **How to avoid:** uncontrolled textarea: `value={text}` for SSR and programmatic resets, handlers `oninput`, `oncompositionstart`, `oncompositionend` that call an idempotent `commit()` which reads `textarea.value` only when not composing (Code Example 4). Making `commit()` idempotent makes it independent of the `input`/`compositionend` ordering, which differs between browsers (`InputEvent.isComposing` is documented, but MDN gives no cross-browser ordering `[CITED: MDN InputEvent.isComposing]`); the ordering claim itself is `[ASSUMED]`. Examples and Reset must set `textarea.value` and `text` together and then focus.

### Pitfall 7: The failed-state "Reload page" button cannot be a Svelte handler
**What goes wrong:** In the `failed` state the island never hydrated, so `onclick={...}` was never attached. **How to avoid:** render the button in server HTML and attach `location.reload()` through the same inline script via event delegation on the card (Code Example 3).

### Pitfall 8: Base path: Markdown links, images and `public/` files
Covered in the Deploy section. Add an automated check on `dist/**/*.html`. `public/` files are served at `<base>/file`, so reference them with `import.meta.env.BASE_URL` in `.astro` files.

### Pitfall 9: Svelte a11y warning on the scrollable table wrapper
See the Svelte section; add the `svelte-ignore` comment with the reason, and keep `role="region"` plus `aria-label="Token table, scrollable"` as UI-SPEC requires.

### Pitfall 10: `maxlength` counts UTF-16 code units, not "characters"
**What goes wrong:** 600 emoji inserted into a `maxlength="1000"` textarea gave `value.length` 1000 and 500 emoji in Chromium, Firefox and WebKit (truncation lands on a pair boundary). The UI-SPEC limit copy says "1,000 characters". **How to avoid:** show the limit message when `text.length >= 1000` (code units), keep the copy as written (user-locked wording), and note in the plan that emoji-heavy input hits the limit at 500 visible characters. A silently truncated paste is the other failure mode: the message must be triggered by length, not by a keystroke.

### Pitfall 11: "Characters split across tokens" is ambiguous
UI-SPEC's note counts "characters". Define it as the number of **graphemes containing at least one multi-byte code point whose bytes are spread over more than one token**. Counting every grapheme with an internal token boundary wrongly flags `\r\n` (two ASCII bytes, two tokens). Measured with the prototype and 800 merges: `Great job 🎉 see you soon 🙂` gives 2, the ZWJ family 1 (18 partial chips), `café` 1, `é` as `e`+U+0301 1, `日本語` 3, plain ASCII 0, lone surrogate `"\uD83D"` 1 (it encodes as `EF BF BD`, three hatched chips, and never renders U+FFFD).

## Code Examples

### 1. `astro.config.mjs` (all values verified in a scratch build; the env-derivation lines are `[ASSUMED]` per the Deploy section)

```js
// Source: docs.astro.build/en/guides/deploy/github/ + docs.astro.build/en/guides/fonts/ ; built and previewed in scratch
import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import svelte from "@astrojs/svelte";

const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "OWNER/tokenizer-vis").split("/");

export default defineConfig({
  site: `https://${owner.toLowerCase()}.github.io`,
  base: `/${repo}`,
  trailingSlash: "always",             // BASE_URL becomes "/<repo>/"
  integrations: [mdx(), svelte()],
  fonts: [
    { provider: fontProviders.fontsource(), name: "Source Serif 4", cssVariable: "--font-serif",
      weights: [400, 600], styles: ["normal", "italic"], subsets: ["latin"], fallbacks: ["Georgia", "serif"] },
    { provider: fontProviders.fontsource(), name: "JetBrains Mono", cssVariable: "--font-mono",
      weights: [400], styles: ["normal"], subsets: ["latin"], fallbacks: ["ui-monospace", "Menlo", "Consolas", "monospace"] },
  ],
});
```

### 2. `.github/workflows/deploy.yml`

```yaml
# Source: docs.astro.build/en/guides/deploy/github/ (action tags confirmed via git ls-remote)
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  test:                       # added: withastro/action does not run tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7      # tag exists; node-version "24"
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx astro check && npx vitest run
      - run: npx astro build
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: withastro/action@v6
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```
`actions/setup-node@v7` exists as a tag; its `cache` input and the Playwright step are standard but not exercised in a real runner here.

### 3. Island lifecycle (verified end to end; `data-state` values are UI-SPEC's: "`data-state="loading" | "ready" | "failed"`", failure timer "8 seconds after the card first enters the viewport")

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  let state = $state<"loading" | "ready" | "failed">("loading");
  onMount(() => { state = "ready"; });   // also recovers a late hydration from "failed"
</script>
<section data-playground data-state={state}>
  <p class="status" role="status">
    <span class="m-loading">Getting the playground ready. The example below already shows the default text.</span>
    <span class="m-failed">The playground could not load. Check your connection, then reload the page. The example below still shows the default text.
      <button type="button" data-reload>Reload page</button></span>
  </p>
  <noscript><style>.status{display:none}</style><p>Typing needs JavaScript. The example below shows the default text.</p></noscript>
  <!-- textarea readonly={state !== "ready"}; buttons disabled={state !== "ready"} -->
</section>
<style>
  .m-failed { display: none; }
  [data-state="failed"] .m-failed { display: inline; }
  [data-state="failed"] .m-loading { display: none; }
  [data-state="ready"] .status { display: none; }
</style>
```
```astro
<!-- layout, before </body> -->
<script is:inline>
(function () {
  var card = document.querySelector("[data-playground]");
  if (!card) return;
  card.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-reload]")) location.reload();
  });
  if (!("IntersectionObserver" in window)) return;
  var io = new IntersectionObserver(function (es) {
    if (!es.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    setTimeout(function () {
      if (card.getAttribute("data-state") === "loading") card.setAttribute("data-state", "failed");
    }, 8000);
  });
  io.observe(card);
})();
</script>
```
Playwright check (passed, 9.1 s): gate the island chunk with `page.route("**/_astro/Playground.*.js", ...)`, wait about 9 s, assert `failed` and the message visible, release the route, assert `ready`, message hidden and the textarea editable. `is:inline` keeps the timer independent of any bundled asset that could itself fail to load. Because `.status` sits inside a scoped Svelte `<style>`, state-keyed selectors work as shown (verified); if class hashing ever interferes, use `:global()`.

### 4. IME-safe, SSR-friendly textarea

```svelte
<script lang="ts">
  const DEFAULT = "…";                      // final default sentence chosen after the merge list is frozen
  let text = $state(DEFAULT);
  let ta: HTMLTextAreaElement | undefined = $state();
  let composing = false;
  function commit() { if (!composing && ta) text = ta.value; }
  function setText(v: string) { if (ta) { ta.value = v; } text = v; ta?.focus(); ta?.setSelectionRange(v.length, v.length); }
</script>
<textarea id="t" bind:this={ta} value={text} readonly={state !== "ready"} maxlength="1000"
  autocapitalize="off" autocorrect="off" spellcheck="false" dir="auto"
  oninput={commit} oncompositionstart={() => (composing = true)}
  oncompositionend={() => { composing = false; commit(); }}></textarea>
```
`[VERIFIED: scratch build]` for the SSR output of this shape (text in the element body, escaped, `readonly`, `maxlength`). IME ordering behaviour is `[ASSUMED]` and is covered by the UI-SPEC manual backstop.

### 5. Core helpers (prototype, `tsc --strict --noUncheckedIndexedAccess` clean; behaviour verified in Node)

```ts
// src/core/toy.ts (essentials). Source: scratch prototype; strict TextDecoder; merges are [left,right] ids
const encoder = new TextEncoder();
const strict = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
export function isValidUtf8(b: Uint8Array) { try { strict.decode(b); return true; } catch { return false; } }

/** A grapheme counts as "split" if a multi-byte code point inside it has a token boundary strictly inside its bytes. */
export function countSplitCharacters(text: string, tokens: readonly Token[]): number {
  const boundaries = new Set<number>(); let off = 0;
  for (const t of tokens) { off += t.bytes.length; boundaries.add(off); }
  let count = 0, start = 0;
  for (const { segment } of new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)) {
    let split = false, p = start;
    for (const cp of segment) {
      const len = encoder.encode(cp).length;
      if (len > 1) for (let b = p + 1; b < p + len; b++) if (boundaries.has(b)) split = true;
      p += len;
    }
    if (split) count++;
    start = p;
  }
  return count;
}

/** Engine-independent word count (Firefox reports isWordLike=false for CJK). */
export function countWords(text: string): number {
  let n = 0;
  for (const s of new Intl.Segmenter("en", { granularity: "word" }).segment(text))
    if (/[\p{L}\p{N}]/u.test(s.segment)) n++;
  return n;
}

/** ASCII-only token text -> glyphs. Space, newline, tab per UI-SPEC; other C0 controls via Control Pictures; never U+FFFD. */
export function displayAscii(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b === 0x20 ? "␣" : b === 0x0a ? "↵" : b === 0x09 ? "⇥"
    : b === 0x7f ? "␡" : b < 0x20 ? String.fromCharCode(0x2400 + b) : String.fromCharCode(b);
  return out;
}
```
Measured with the 800-merge prototype (`[VERIFIED: node core/try.ts]`): `Great job 🎉 see you soon 🙂` gives 18 tokens, 8 partial, split 2, words 5, characters 26; the family emoji (3 emoji joined by U+200D) 18 tokens all partial, split 1, characters 1; `日本語` 9 tokens, split 3, words 1; `<|endoftext|>` tokenizes as plain text (8 tokens, no special-token behaviour). Control Pictures glyphs (`U+2400` block) share the font-coverage gate with `␣`; render them in the same `.ws` span.

### 6. Config files

```ts
// vitest.config.ts  [VERIFIED: ran green, e2e/ untouched]
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["src/**/*.test.ts"], environment: "node" } });
```
```ts
// playwright.config.ts  [VERIFIED: Chromium, Firefox, WebKit, Pixel 7 project ran]
import { defineConfig, devices } from "@playwright/test";
const remote = process.env.E2E_BASE_URL;            // set to the live URL for the post-deploy run
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: remote ?? "http://localhost:4321/<repo>/" },   // trailing slash so goto("./") resolves under base
  webServer: remote ? undefined : {
    command: "npx astro preview --ignore-lock --port 4321",
    url: "http://localhost:4321/<repo>/", reuseExistingServer: !process.env.CI, timeout: 60_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
             { name: "firefox", use: { ...devices["Desktop Firefox"] } },
             { name: "webkit", use: { ...devices["Desktop Safari"] } },
             { name: "mobile", use: { ...devices["Pixel 7"] } }],
});
```

## Test Setup (replaces the omitted Nyquist section)

| Layer | Tool | What it proves | Command |
|-------|------|----------------|---------|
| Unit | Vitest 5.0.3, node environment | Core goldens, invariants, counts, display helpers, no U+FFFD | `npx vitest run` |
| Types | `astro check`, `svelte-check` | Typed islands, collections | `npx astro check` |
| Build output | Vitest or a Node script over `dist/**/*.html` | No root-absolute `href`/`src` outside `<base>`; no third-party origins; SSR HTML contains default chips, counts, table | in CI after `astro build` |
| E2E | Playwright 1.63.0 vs `astro preview` | Hydration, lifecycle states, controls, keyboard, reduced motion, dark mode, privacy | `npx playwright test` |
| A11y | `@axe-core/playwright` with tags `wcag2a`, `wcag2aa`, `wcag22aa` | Automated WCAG 2.2 AA scan, light and dark, 360 px and desktop | inside Playwright specs |
| Post-deploy | Same specs with `E2E_BASE_URL` | Base path, fonts and `_astro` assets 200 on the live site | after first and each deploy |

Specific E2E assertions the planner should include (each maps to a UI-SPEC or success criterion and was proven feasible):

- Scroll the card into view, then expect `data-state="ready"` (verified hydration trigger).
- Lifecycle: route-gate the island chunk, expect `loading`, wait about 9 s, expect `failed` plus message plus Reload button, release, expect `ready` (verified); JavaScript-disabled project shows the `<noscript>` note and hides the status line (verified in Chromium and Firefox).
- `page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" })` works in all three engines (verified); assert computed `transition-duration` is `0s` on a button and rerun axe in dark.
- No U+FFFD anywhere in `document.body.innerText` after typing the regression corpus; chip count equals expected token count; Characters count equals grapheme count.
- Privacy: record `page.on("request")` after load; typing and example clicks must produce zero new requests, and every request must be same-origin (proves the "stays in your browser" line and "no third-party fonts").
- Keyboard: Tab order from UI-SPEC, arrow keys within the segmented control, Space on the toggle, example then focus lands in the textarea with the caret at the end.
- Overflow at 360 px: no horizontal page scroll with the long-word example and the CJK corpus.
- Render time with 1,000 CJK characters under CPU throttle (CDP `Emulation.setCPUThrottlingRate`) stays acceptable (set the threshold once measured).
- Manual only (cannot be automated here): glyph coverage of `␣ ↵ ⇥` and Control Pictures on real iOS Safari, Android Chrome and Firefox (Playwright WebKit on Linux is not iOS); color-blindness simulation; real screen reader pass; IME composition run with a real Japanese or Chinese IME.

**Wave 0 gaps:** `vitest.config.ts`, `playwright.config.ts`, `e2e/`, `src/core/*.test.ts` fixtures, the regression corpus file, and the dist-scanner script do not exist yet (greenfield).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@fontsource-*` npm packages or Google Fonts links | Astro built-in Fonts API with `fontProviders.fontsource()` | Astro 7 (documented production-ready) | No third-party requests, hashed family names, auto fallbacks |
| `import { z } from "astro:content"` | `import { z } from "astro/zod"` | Astro 6+ per ARCHITECTURE.md; worked in 7.3.5 scratch build | Use the new import |
| `astro preview` always foreground | Auto-backgrounds when an AI agent is detected on Linux/macOS (v7.3+ `--ignore-lock` lets a second server run) | Astro 7.3.0 | Playwright `webServer` needs `--ignore-lock` |
| `npx playwright install` everywhere | On NixOS use `playwright-driver.browsers` matching the npm version | n/a (environment) | Local E2E needs the Nix browsers |
| Python scripts for build-time data | Node 24 runs `.ts` natively (explicit `.ts` import extensions) | Node 22.18+/24 | Training script can share `src/core` code without a runner dependency |

**Deprecated/outdated:** Cloudflare Workers hosting guidance in `.claude/CLAUDE.md` and `STATE.md` (superseded by D-15; the planner should not act on it).

## Runtime State Inventory

Not applicable: greenfield phase (no rename, refactor or migration). Nothing stored, registered or cached under an old name; the only pre-existing artifacts are planning documents.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GitHub owner is `brunocu` and repo name is `tokenizer-vis` (inferred from git user and directory name; no remote exists) | Deploy, Code Example 1 | `site`/`base` wrong, every asset 404s on the live site; fixed by one config edit |
| A2 | `.nojekyll` is not needed when deploying with `actions/deploy-pages` | Deploy | `_astro/*` assets 404 on Pages; first-deploy asset check catches it, fix is an empty `public/.nojekyll` |
| A3 | `GITHUB_REPOSITORY` is visible to the build step inside `withastro/action` | Deploy, Code Example 1 | Falls back to the placeholder; wrong `base`; catch via post-deploy check or hardcode |
| A4 | `input` vs `compositionend` event ordering varies by browser; idempotent `commit()` is safe either way | Pitfall 6 | IME flicker; covered by the UI-SPEC manual IME backstop |
| A5 | A Project Gutenberg public-domain text plus a hand-written number supplement is an acceptable training corpus; shipping only derived merges is fine under the Gutenberg licence | Toy design | Licence or attribution objection; swap to a hand-written corpus (Claude's Discretion) |
| A6 | GitHub Pages on a Free personal account requires a public repo (from a search-result summary of docs.github.com, not re-read on the page) | Deploy | Deploy blocked if the repo is private on a free plan; confirm in repo settings |
| A7 | 800 merges on the chosen corpus is the right size (prototype evidence on two texts only) | Toy design | Tokenizer looks too fragmented or too whole; retune against goldens |
| A8 | Glyphs `␣ ↵ ⇥` and the Control Pictures block render on real iOS Safari and Android (not testable here) | Fonts, Code Example 5 | Fall back to `·` per UI-SPEC; manual device check required |
| A9 | `actions/setup-node@v7`, its `cache: npm` input and the Playwright install step behave as written on a GitHub runner | Code Example 2 | CI test job fails; adjust inputs |

## Open Questions

1. **GitHub repository: owner, name, visibility, Pages enablement**
   - What we know: no git remote exists; `gh` is not installed; Pages needs the source set to "GitHub Actions"; Free plan needs a public repo.
   - What's unclear: whether the user wants a public repo and the exact repo name (it becomes the URL path and the `base`).
   - Recommendation: planner adds an early `checkpoint:human-action` (create public repo, add remote, enable Pages with source "GitHub Actions"); use constants in `astro.config.mjs` once the name is known.

2. **Canonical URL of Post 1**
   - What we know: D-14 says the post is the home page until the Phase 4 hub replaces it.
   - What's unclear: whether the post lives at `/` only or also at `/posts/what-is-a-token/`. Moving it later breaks inbound links (GitHub Pages cannot 301).
   - Recommendation: build `posts/[...slug].astro` from day one and have `index.astro` render the same post with a `rel="canonical"` to the post URL; Phase 4 then only changes `index`.

3. **Training corpus and merge count**
   - Recommendation: Alice or Pride and Prejudice (ASCII-normalised) plus a short number/date supplement, 600 to 800 merges, frozen via goldens; ask the user only if they want a different literary text for the example chip.

4. **Words rule and "characters" wording**
   - UI-SPEC literally says "word-like segments"; Firefox breaks that for CJK (Pitfall 5). Recommend adopting the letter-or-number rule and keeping UI copy unchanged. The limit message says "1,000 characters" but counts UTF-16 units (Pitfall 10); keep the copy, mention in the plan.

5. **iOS Safari glyph coverage**
   - Cannot be verified in this environment; keep the UI-SPEC fallback to `·` and require a real-device check in verification.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, tests, training script | Yes | 24.21.0 | n/a |
| npm | Install | Yes | 11.19.0 (prints `allowScripts` warning for esbuild; harmless) | n/a |
| git | Repo | Yes | present, **no remote** | Human creates repo (Open Question 1) |
| `gh` CLI | Optional repo/Pages setup | No | n/a | User does it in the web UI |
| Network to npm registry and Fontsource | Install, font download at build | Yes | n/a | n/a |
| Playwright downloaded Chromium | Local E2E | Installs but does **not launch** (missing `libglib-2.0.so.0`) | 1243 | Nix browsers (below) |
| Nix `playwright-driver.browsers` | Local E2E | Yes (built and ran) | 1.63.0 (matches npm pin) | n/a |
| Firefox and WebKit for Playwright | Cross-engine checks | Yes, inside the same Nix output | firefox-1543, webkit-2359 | n/a |
| Real iOS Safari / Android devices | Glyph coverage, screen reader | No | n/a | Manual verification checkpoint |
| Python 3 | Not needed in Phase 1 | Yes (3.14.4) | n/a | n/a |

**Missing dependencies with no fallback:** none for build and unit tests. Public GitHub repo plus Pages (human action) blocks only the deploy step.
**Missing with fallback:** downloaded Chromium (use Nix browsers locally; Ubuntu CI uses `--with-deps`).

## Security Domain

`security_enforcement` is enabled (`security_asvs_level: 1`, `security_block_on: "high"`). The attack surface is small: a static site, no accounts, no network calls with user data.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No accounts |
| V3 Session Management | No | No sessions or cookies |
| V4 Access Control | No | Public static content |
| V5 Input Validation / Output Encoding | Yes | Svelte text interpolation escapes by default (verified: `<b>` came out `&lt;b>`); never use `{@html}` with reader text; `maxlength="1000"`; render only through text nodes |
| V6 Cryptography | No | None used |
| V8 Data Protection / Privacy | Yes | Tokenizing is local; no analytics on input; Playwright request-recording test proves zero requests on typing; all assets same-origin |
| V10/V14 Build and dependencies | Yes | Pinned versions and lockfile; `npm audit` run at start (known build-time `http-cache-semantics` advisory per CLAUDE.md, no `--force`); GitHub Actions use official actions at major tags; least-privilege `permissions` block (`contents: read`, `pages: write`, `id-token: write`) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reader text injected as HTML | Tampering | Framework escaping; ban `{@html}` and `innerHTML` for reader text (lint-by-grep in CI) |
| Third-party requests leaking IP or text (fonts, scripts) | Information disclosure | Self-hosted fonts via Fonts API; assert same-origin requests in E2E |
| Supply-chain compromise of dev dependencies | Tampering | Lockfile, pinned versions, one human-verify checkpoint at scaffold (see Package Legitimacy Audit), no unreviewed `postinstall` |
| Over-permissive CI token | Elevation of privilege | Explicit minimal `permissions`; deploy job only on `main` |
| Content Security Policy | n/a | GitHub Pages cannot set response headers; a `<meta>` CSP is optional and was **not** researched (the island bootstrap and `is:inline` script would need hashes); out of scope for ASVS L1 here |

## Sources

### Primary (HIGH confidence)
- Scratch build and probes this session: Astro 7.3.5 + `@astrojs/mdx` 8.0.2 + `@astrojs/svelte` 9.0.1 + Svelte 5.57.1 + TypeScript 6.0.x; Vitest 5.0.3; Playwright 1.63.0 with `@axe-core/playwright` 4.13.0 on Chromium, Firefox, WebKit (Nix browsers); Node 24.21.0 prototypes of the toy tokenizer.
- `node_modules/astro` source (`components/Font.astro`, `dist/assets/fonts/core/filter-preloads.js`, `dist/cli/preview/index.js`, `tsconfigs/base.json`) read in the scratch project.
- npm registry (`npm view`) and `gsd-tools query package-legitimacy check`, 2026-10-03.
- https://docs.astro.build/en/guides/deploy/github/ (workflow, `site`/`base`, Pages source)
- https://docs.astro.build/en/guides/fonts/ (fontsource provider, `<Font />`, build-time download)
- https://docs.astro.build/en/reference/cli-reference/ (`astro preview` background/`--ignore-lock`)
- https://docs.astro.build/en/guides/testing/ (Vitest `getViteConfig`, Playwright `webServer`)
- https://docs.astro.build/en/guides/integrations-guide/svelte/ (`@astrojs/svelte` setup)
- https://raw.githubusercontent.com/withastro/action/main/README.md (inputs, no test step)
- https://raw.githubusercontent.com/openai/tiktoken/main/tiktoken_ext/openai_public.py (gpt2, cl100k_base, o200k_base patterns)
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

### Secondary (MEDIUM confidence)
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter (Baseline 2024)
- https://developer.mozilla.org/en-US/docs/Web/API/InputEvent/isComposing (property exists; no ordering guidance)
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages and web-search summary for the Free-plan public-repo rule (A6)
- Project Gutenberg ebook headers (pg11.txt, pg1342.txt) for the reuse wording

### Tertiary (LOW confidence)
- None relied on without a tag; unverified items are in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Deploy and base path: HIGH for config behaviour (built and previewed), MEDIUM for workflow runtime details (taken from official docs, not run on a runner; A2, A3, A9)
- Fonts and island SSR/lifecycle: HIGH (built and tested in three engines where relevant)
- Toy tokenizer design: HIGH for mechanics and invariants, MEDIUM for corpus and merge-count choices (author discretion, two corpora tested)
- Accessibility mechanics: HIGH for DOM and semantics, MEDIUM until the manual screen-reader, real-device glyph and IME checks run (A4, A8)
- Test setup: HIGH (all runners executed; Nix-specific browser workaround proven)

**Research date:** 2026-10-03
**Valid until:** 2026-10-31 for version pins (Astro 7.x and Vitest 5 are moving quickly; re-run `npm view` at scaffold); behaviours verified here are structural and should hold longer.

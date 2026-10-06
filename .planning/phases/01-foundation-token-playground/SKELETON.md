# Walking Skeleton — Tokenizer Vis

**Phase:** 1
**Generated:** 2026-10-03
**Revised:** 2026-10-03 (D-15 amended: local static build instead of a live deploy; root-level post URL; Nix flake dev environment)

## Capability Proven End-to-End

A reader opens the statically built site served by `astro preview` (default base `/`; the same build works under a non-root base), sees chips produced by the real byte-level toy tokenizer for the default text before any JavaScript runs, and after hydration types new text (including an emoji) and sees it re-tokenized live in the browser, with the pieces of a split character shown as partial-character chips and never a replacement symbol.

This is a static site with no database. The nearest equivalent of the template's "database read and write" is the real tokenizer run on typed text: the read is the committed merge list (`src/core/toy/merges.json`) feeding the tokenizer, and the write is the reader's typed text flowing through pre-split, UTF-8 bytes and ranked merges into rendered tokens, entirely in the browser. Plan 01 proves it (with an empty merge list, so a pure byte-level tokenizer); Plan 02 fills the merge list without any architectural change.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Astro 7.3.5 static site, MDX posts (`@astrojs/mdx` 8.0.2), Svelte 5.57.1 islands (`@astrojs/svelte` 9.0.1), TypeScript `~6.0.3`, plain CSS with custom properties | Fixed by `.claude/CLAUDE.md`. Content-first: zero JS by default, hydrate only the playground island with `client:visible`; later posts add different islands |
| Data layer | None (no server, no database). Tokenizer data is a committed JSON merge list produced offline by `scripts/train-toy-bpe.ts`; content is Astro content collections (`posts`, `glossary`) validated by Zod at build | Static hosting; reproducible, reviewable derived data; `isPartial` stays exact because merges are ASCII-only (asserted by tests) |
| Core logic | Pure TypeScript under `src/core` (no DOM, no framework): `presplit`, `toy`, `counts`, `display`, `examples`, `claims`; tokens are `{ id, bytes, isPartial }` with no stored decoded text | Testable in Node with Vitest; reused by the playground island, the build-time `ToyTokens` prose component and the training script, so training, runtime and prose cannot disagree |
| Auth | None. No accounts, sessions or cookies | Out of scope per PROJECT.md; the privacy promise (typed text never leaves the browser) is enforced by `check-repo` and a Playwright zero-request test |
| Dev environment (PD-02, D-15 amended) | Nix flake + direnv: `flake.nix`, `flake.lock`, `.envrc` (`use flake`). The dev shell provides Node 24.x (`nodejs_24`) and the Playwright browsers (`playwright-driver.browsers`) through `PLAYWRIGHT_BROWSERS_PATH`, `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS` and `PLAYWRIGHT_NIX_VERSION`. nixpkgs is pinned by revision `c59305bab2065cfecc4944690d9eedbb56f3a9fa` (nixos-unstable, 2026-10-01), which ships Playwright 1.63.0 and Node 24.21.0. Commands run as `nix develop --command ...`; `scripts/check-env.mjs` asserts the npm `@playwright/test` version and the browser revisions match the flake | Reproducible on the NixOS dev machine where the Playwright-downloaded Chromium does not launch; one source for Node and browsers; the exact-pin match check stops a silent drift. Reversible: nothing ships to readers |
| Site config (D-15 amended) | `site.config.mjs` exports `site`, `base`, `outDir` and `normalizeBase`, overridable with `SITE_URL`, `SITE_BASE` and `SITE_OUT_DIR`; default `site` `http://localhost:4321`, default `base` `/`. Astro, Playwright and every script import it; `trailingSlash: "always"`; every link and asset is base-aware and scanned by `check-dist`. `npm run check:base` builds under `/base-check` into `dist-base-check`, scans it and runs the smoke spec, so Phase 5 only sets `SITE_URL` and `SITE_BASE` | Costly to reverse as a discipline (every URL is base-aware), trivial as a value |
| Routing (PD-01, D-14, D-15 amended) | Posts live at the site root: `src/pages/[slug].astro` builds `/<slug>/` from the `posts` collection (first post `/what-is-a-token/`); `/` (`src/pages/index.astro`) renders the same post through the same layout with `rel="canonical"` to `/what-is-a-token/`. No posts-prefixed route exists | The post acts as the home page until the Phase 4 hub (D-14) and keeps one stable root-level URL. Costly once Phase 5 publishes (no 301 on GitHub Pages); Phase 4 replaces only `index.astro` |
| Serving | Static build (`astro build`) served by `astro preview` for local verification and Playwright. No remote, workflow or deploy step in Phase 1 (Phase 5 owns repository, GitHub Pages and CI) | D-15 amended: public deployment is verified in Phase 5 |
| Directory layout | `src/core` (pure TS), `src/components` (Svelte and Astro UI, `wrappers/`, `prose/`), `src/layouts`, `src/pages` (`index.astro`, `[slug].astro`), `src/content` (`posts/`, `glossary/`), `src/styles/tokens.css`, `scripts/` (training, corpus, guards), `e2e/` (Playwright specs; files named `*.secondary.spec.ts` are the non-gating phone-width suite), `flake.nix`, `.envrc` | Matches ARCHITECTURE.md with the Phase 1 refinements from RESEARCH.md; Vitest only runs `src/**/*.test.ts` and Playwright only runs `e2e/*.spec.ts` |
| Fonts | Astro Fonts API with `fontProviders.fontsource()`: Source Serif 4 (prose) and JetBrains Mono (chips), self-hosted at build time; system UI sans for controls | No third-party font requests at runtime (privacy); whitespace glyphs render through a dedicated span with symbol-font fallbacks because the latin subset lacks them; the glyph constants live in `src/core/display.ts` so the middle-dot fallback is a one-line change |
| Testing | Vitest 5 (unit, goldens, content rules), Playwright 1.63.0 with `@axe-core/playwright` (e2e, a11y, privacy, lifecycle) against `astro preview --ignore-lock`. `npm run test:e2e` runs the three desktop projects (chromium, firefox, webkit) and is the only gate; `npm run test:e2e:secondary` runs a Pixel 7 phone profile and the 360 px checks, recorded and never gating | Desktop is the verified target; mobile and iOS are secondary for the MVP (no iOS device) |
| Supply-chain guard | Ten human-approved packages with exact pins, enforced by `scripts/check-deps.mjs`; lockfile committed | Package-legitimacy gate (T-01-SC) |

## Stack Touched in Phase 1

- [ ] Dev environment (flake, direnv, environment guard) — Plan 01
- [ ] Project scaffold (Astro, Svelte, MDX, TypeScript, Vitest, Playwright, guard scripts) — Plan 01
- [ ] Routing — `/` and `/what-is-a-token/` both real routes (the post is the home page until Phase 4's hub) — Plans 01 and 04
- [ ] Data — real tokenizer read of the committed merge list and a real transformation of typed text — Plans 01 and 02 (stands in for the template's database read and write)
- [ ] UI — the playground island wired to the core: typing, examples, reset, toggles, counts, table — Plans 01 and 03
- [ ] Static build served locally, including a build under a non-root base — Plans 01 (build, preview, `check:base`) and 04 (final verification); the live GitHub Pages deployment is Phase 5

## Out of Scope (Deferred to Later Slices)

Explicit, so later phases do not re-litigate Phase 1's boundaries:

- Remote repository, GitHub Pages deployment, CI, the first push and live-site verification (Phase 5; list in `.planning/phases/05-harden-release/DEFERRED-FROM-PHASE-1.md`)
- iOS and Android real-device checks and any phone-width gate (secondary for the MVP; the 360 px checks run non-blocking in the secondary suite; Phase 5 criterion 4 covers a usable mobile layout)
- The step-through BPE stepper and live BPE training (Phase 2; Phase 2 trains its own separate tiny toy live)
- Real-tokenizer comparison, any `@huggingface/tokenizers` or `gpt-tokenizer` code, tokenizer file hosting and the `fetch()` of tokenizer data (Phase 2; `check-repo` currently bans runtime network calls and must be edited deliberately then)
- Posts 2 to 4 (embeddings, context, reasoning) and any fact about vendors (Phase 3; vendor facts need dates and re-verification)
- The "start here" hub, the disambiguation page, glossary tooltips and glossary-driven definitions in prose (Phase 4); Phase 1 only seeds the four glossary entries and the `terms` reference contract
- Search, RSS, sitemap, OG images, shareable URL state, analytics (none planned in Phase 1; any analytics must never capture typed text)
- A manual theme toggle (the site follows the system preference, D-13)
- A custom domain or non-GitHub host (decided in Phase 5; the base-aware URL discipline keeps it a configuration change)
- A Web Worker for tokenizing (tokenization is synchronous and measured under 200 ms worst case at the 1,000-unit input cap)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: BPE stepper and real-tokenizer comparison complete Post 1 (adds an async `TokenizerBackend` wrapper over the synchronous toy, lazy-loaded self-hosted tokenizer files, and the first legitimate `fetch` allowed by `check-repo`)
- Phase 3: embeddings, context and reasoning posts (each prose plus one small island reusing `TokenDisplay` and the content contract)
- Phase 4: hub, disambiguation page and glossary tooltips (replaces the home page's post rendering in `src/pages/index.astro`; glossary entries seeded here become the single source of definitions)
- Phase 5: harden and release (creates the remote, sets `SITE_URL` and `SITE_BASE` for the deploy build, adds the GitHub Pages workflow and CI, verifies the live site, then the accessibility, performance, fact-check and reader-testing passes)

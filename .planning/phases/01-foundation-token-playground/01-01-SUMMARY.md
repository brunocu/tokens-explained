---
phase: 01-foundation-token-playground
plan: 01
subsystem: infra
tags: [nix, direnv, astro, svelte, mdx, playwright, vitest, tokenizer, byte-level]

requires: []
provides:
  - Nix flake dev shell (Node 24.21.0 + nixpkgs Playwright 1.63.0 browsers) loaded by direnv, with an environment guard
  - Scaffolded Astro 7 + Svelte 5 + MDX project with configurable site/base/outDir (default base "/")
  - Pure-TS byte-level toy tokenizer core (pre-split, UTF-8 bytes, ranked merges) with an empty merge list
  - Playground tracer island (SSR chips, hydration, live re-tokenizing, partial-character chips)
  - Guard scripts (env, deps, dist, repo, base) each with a self-test, and a non-root-base build proof
affects: [01-02, 01-03, 01-04, phase-02, phase-05]

plan_head_before: 30750dc35141f301e1b2c192e952e10ed12b5a9a
plan_head_after: 7ee4e0038a2642b79c69b63df58791a93d64c170
actuals:
  tokens: 12100
  tasks: 4
  commits: 3

tech-stack:
  added: [astro 7.3.5, "@astrojs/mdx 8.0.2", "@astrojs/svelte 9.0.1", svelte 5.57.1, typescript 6.0.3, vitest 5.0.3, "@playwright/test 1.63.0", "@axe-core/playwright 4.13.0", "@astrojs/check 0.9.10", svelte-check 4.7.6]
  patterns:
    - "One site.config.mjs (site, base, outDir) shared by Astro, Playwright and scripts"
    - "src/core is plain TS with explicit .ts import specifiers, loadable natively by Node, Vite and Vitest"
    - "Guard scripts: pure matcher functions plus --self-test proving the failing direction"
    - "Island lifecycle: SSR data-state=loading, flipped to ready in onMount, uncontrolled textarea with idempotent commit()"

key-files:
  created:
    - flake.nix
    - flake.lock
    - .envrc
    - .gitignore
    - package.json
    - package-lock.json
    - site.config.mjs
    - astro.config.mjs
    - svelte.config.js
    - tsconfig.json
    - vitest.config.ts
    - playwright.config.ts
    - scripts/check-env.mjs
    - scripts/check-core.mjs
    - scripts/check-deps.mjs
    - scripts/check-dist.mjs
    - scripts/check-repo.mjs
    - scripts/check-base.mjs
    - src/core/types.ts
    - src/core/presplit.ts
    - src/core/toy.ts
    - src/core/display.ts
    - src/core/examples.ts
    - src/core/toy/merges.json
    - src/core/toy.test.ts
    - src/layouts/BaseLayout.astro
    - src/pages/index.astro
    - src/components/Playground.svelte
    - src/svelte-elements.d.ts
    - e2e/smoke.spec.ts
  modified: []

key-decisions:
  - "Dev environment is a Nix flake pinned by nixpkgs revision c59305bab2065cfecc4944690d9eedbb56f3a9fa; npm Playwright is an exact pin equal to the flake's playwright-driver version, enforced by check-env"
  - "Package-legitimacy gate passed: the ten-package list approved by the human, enforced by the check-deps allow-list"
  - "JSON import attribute works in native Node 24, Vite and Vitest, so the merges.ts contingency was not used"
  - "site, base and outDir are defined only in site.config.mjs; defaults http://localhost:4321, / and dist"

patterns-established:
  - "Every internal URL is base-aware with trailing slashes; check-dist enforces it and check-base proves it under /base-check"
  - "No node: imports under src; text fixtures come through Vite ?raw imports"

requirements-completed: [FOUND-01, FOUND-07, TOK-01]

coverage:
  - id: D1
    description: "Dev environment: flake dev shell gives Node 24 and Playwright browsers; guard fails on mismatch"
    requirement: "FOUND-01"
    verification:
      - kind: other
        ref: "node scripts/check-env.mjs --self-test && node scripts/check-env.mjs --playwright"
        status: pass
    human_judgment: false
  - id: D2
    description: "Static build served by astro preview shows server-rendered chips from the real tokenizer, hydrates, and re-tokenizes typed text (emoji give partial chips, no U+FFFD)"
    requirement: "FOUND-01"
    verification:
      - kind: e2e
        ref: "e2e/smoke.spec.ts (chromium, firefox, webkit: 12 passed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Tokenizer pipeline is pre-split, UTF-8 bytes, ranked merges; ids 0-255 are raw bytes; empty input and lone surrogates handled"
    requirement: "TOK-01"
    verification:
      - kind: unit
        ref: "src/core/toy.test.ts (8 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Non-root base proof and URL hygiene: build under /base-check passes the dist scan and the smoke spec"
    requirement: "FOUND-07"
    verification:
      - kind: other
        ref: "npm run check:base"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-10-03
status: complete
---

# Phase 1 Plan 01: Walking Skeleton Summary

**Nix-flake dev shell plus a proven Astro 7 / Svelte 5 tracer: a real pre-split, byte-level, ranked-merge tokenizer renders server-side chips, hydrates, and re-tokenizes typed text (emoji as partial-character chips), built under a configurable base and guarded by self-tested scripts.**

## Performance

- **Duration:** about 12 min for this continuation (Tasks 3 and 4; Task 1 was done in an earlier run, Task 2 was the human gate)
- **Completed:** 2026-10-03T22:45:00Z
- **Tasks:** 4 (1 auto, 1 human-verify gate, 1 tracer, 1 auto)
- **Files modified:** 30 (excluding .planning)

## Accomplishments

- Reproducible dev environment: flake dev shell (Node v24.21.0, Playwright 1.63.0 browsers from nixpkgs), `.envrc` with `use flake`, `check-env` guard that ties the npm Playwright pin to the flake.
- Tracer proven end to end: `astro build` emits chips in HTML (75 `data-chip` occurrences for the default text, `data-state="loading"`), the island hydrates on `client:visible`, typing re-tokenizes live, emoji give hatched partial chips, no U+FFFD, no failed requests, no console errors. Smoke spec passes on chromium, firefox and webkit (12 of 12).
- Base-path risk retired: `check:base` builds into `dist-base-check` under `/base-check`, scans it (8 URLs, all base-prefixed, no third-party origin) and runs the smoke spec against it. Phase 5 deployment is only `SITE_URL` and `SITE_BASE`.
- Fonts API verified: 5 self-hosted woff2 files copied to `dist/_astro/fonts/`.
- Five guard scripts with self-tests that prove the failing direction.

## Task Commits

1. **Task 1: Dev environment (flake, direnv, ignore rules, check-env)** - `996ceb3` (chore)
2. **Task 2: Package-legitimacy gate** - no commit; human replied "approved" for the exact ten-package list
3. **Task 3: Tracer scaffold and end-to-end proof** - `fe5947a` (feat)
4. **Task 4: Guard scripts (deps, dist, repo, base)** - `7ee4e00` (feat)

**Plan metadata:** committed separately with this SUMMARY (docs).

## Approved package list (Task 2, human-approved)

| Package | Pin |
|---------|-----|
| astro | 7.3.5 |
| @astrojs/mdx | 8.0.2 |
| @astrojs/svelte | 9.0.1 |
| svelte | 5.57.1 |
| typescript | ~6.0.3 (locked 6.0.3) |
| vitest | 5.0.3 |
| @playwright/test | 1.63.0 (exact, equals the flake's playwright-driver) |
| @axe-core/playwright | 4.13.0 |
| @astrojs/check | 0.9.10 |
| svelte-check | 4.7.6 |

## Environment facts

- nixpkgs locked rev `c59305bab2065cfecc4944690d9eedbb56f3a9fa` (owner NixOS), narHash `sha256-69xHQhAeMAD2wDXO7T2pcOZIF9Sga2W+JkmY2a11Ops=`; matches the input URL.
- Node v24.21.0; Playwright 1.63.0 browsers from `PLAYWRIGHT_BROWSERS_PATH` (chromium, firefox, webkit all ran).
- `npm install`: 313 packages added, nothing forced. npm 11 warned that esbuild@0.28.2 has a postinstall script not covered by allowScripts (expected, harmless).
- `npm audit`: 4 high-severity findings, all one advisory chain: `http-cache-semantics` (GHSA-ch52-4w7c-c8xp, max-stale handling can disclose cross-user cached responses) surfacing on `astro`, `@astrojs/mdx` and `@astrojs/svelte`. This is the known build-time-only transitive advisory noted in `.claude/CLAUDE.md`; it was not force-fixed (`npm audit fix --force` suggests a nonsensical downgrade).
- Final defaults in `site.config.mjs`: site `http://localhost:4321` (env `SITE_URL`), base `/` (env `SITE_BASE`, normalised), outDir `dist` (env `SITE_OUT_DIR`).
- JSON import attribute contingency (merges.ts): not used. `with { type: "json" }` works in native Node 24 (`check:core`), Vite build and Vitest.

## Files Created/Modified

See `key-files` in the frontmatter. Highlights: `flake.nix` and `scripts/check-env.mjs` (environment), `site.config.mjs` (single source for site/base/outDir), `src/core/*` (tokenizer contracts and implementation), `src/components/Playground.svelte` (tracer island), `scripts/check-*.mjs` (guards), `e2e/smoke.spec.ts` (four tests).

## Decisions Made

- Followed the plan's decisions PD-02 (Nix flake, rev-pinned nixpkgs) and D-15 amended (configurable base, local static build only).
- Added `src/svelte-elements.d.ts` to extend `svelte/elements` with `autocorrect` on textarea (see deviations).
- `check-dist` additionally scans `url()` values in inline `<style>` blocks of HTML, because the Fonts API emits its `@font-face` rules inline, so this is where a third-party font URL would otherwise slip through.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Island state variable renamed from `state` to `phase`**
- **Found during:** Task 3 (svelte-check)
- **Issue:** Plan text names the variable `state`. In Svelte 5 a variable called `state` makes `$state(...)` parse as a store subscription (`$` plus `state`), giving "Block-scoped variable '$state' used before its declaration" and 3 related type errors.
- **Fix:** Variable is `phase`; the `data-state` attribute and its values (`loading`, `ready`, `failed`) are unchanged, so tests and later plans that read `data-state` are unaffected.
- **Files modified:** `src/components/Playground.svelte`
- **Verification:** `npm run check:svelte` 0 errors, 0 warnings; smoke spec passes.
- **Committed in:** fe5947a

**2. [Rule 3 - Blocking] `autocorrect` attribute not typed for textarea**
- **Found during:** Task 3 (svelte-check, `--fail-on-warnings`)
- **Issue:** `svelte/elements` declares `autocorrect` for `<input>` only; the UI-SPEC requires it on the textarea.
- **Fix:** Module augmentation `src/svelte-elements.d.ts` adding `autocorrect` to `HTMLTextareaAttributes`.
- **Files modified:** `src/svelte-elements.d.ts` (new)
- **Verification:** `npm run check:svelte` and `npm run check` clean.
- **Committed in:** fe5947a

**3. [Rule 2 - Missing critical] Inline `<style>` scanned by check-dist**
- **Found during:** Task 4
- **Issue:** Plan scans `.css` files for `url()`, but Astro's Fonts API inlines `@font-face` in HTML, so third-party font hosts would go unscanned (T-01-06).
- **Fix:** `check-dist` also extracts `url()` values from inline `<style>` blocks.
- **Files modified:** `scripts/check-dist.mjs`
- **Verification:** `npm run check:dist` and `check:base` pass; self-test covers the extractor; running the scan with a wrong base (`SITE_BASE=/other`) correctly fails on the font and island URLs.
- **Committed in:** 7ee4e00

---

**Total deviations:** 3 auto-fixed (1 bug, 1 blocking, 1 missing-critical)
**Impact on plan:** No scope creep; the first two were required for type-check cleanliness, the third strengthens a planned mitigation.

## Issues Encountered

None beyond the deviations above. The plan's Task 3 `fails_when` text says "fewer than 3 passed" while its acceptance criteria say 4 tests; the spec has four tests, all passing.

## Known Stubs

- `src/core/toy/merges.json` has an empty merge list (`merges: []`) by design: the tracer is a pure byte-level tokenizer. Plan 02 trains the real merge list with no code change. `DEFAULT_TEXT` in `src/core/examples.ts` is also provisional until Plan 02 re-checks it against the trained merges. `Playground.svelte` is the tracer body; Plan 03 replaces it with the full contract.

## Secondary profile

`npm run test:e2e:secondary` (phone profile) was not run: the plan defines no `*.secondary.spec.ts` files yet and phone checks never gate Phase 1 (D-15 amended).

## User Setup Required

Optional convenience: run `direnv allow` once in `/home/nixos/repos/tokenizer-vis` to load the flake dev shell in your own terminal. No task depends on it; everything runs as `nix develop --command ...`.

## Next Phase Readiness

- Plan 02 can train and drop in `merges.json`; the pre-split regex is shared via `src/core/presplit.ts` and the Node-native load path is proven by `check:core`.
- Plan 03 can replace the island body, keeping the `data-playground` / `data-state` / `data-chip` / `data-partial` hooks and the onMount lifecycle shape.
- Any later phase adding an npm package must edit the `check-deps` allow-list after a legitimacy review; any later runtime network or storage use must edit the `check-repo` banned list.
- Not verified here and tracked for Phase 5: deployed-site behaviour, real mobile Safari, glyph coverage on iOS and Android.

---
*Phase: 01-foundation-token-playground*
*Completed: 2026-10-03*

## Self-Check: PASSED

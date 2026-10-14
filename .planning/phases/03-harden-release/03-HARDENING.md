# Phase 3: Hardening record

Automated one-off checks, run 2026-10-14 on branch `gsd/phase-3-harden-release` (plan 03-05, task 2), inside `nix develop`, against the production-base build (`SITE_URL=https://brunocu.github.io SITE_BASE=/tokens-explained`) served by `astro preview`. Common setup for every command below:

```
export SITE_URL=https://brunocu.github.io SITE_BASE=/tokens-explained E2E_PORT=4432
npm run build
```

Defect policy (D-16): a defect that makes the post unusable or incorrect is fixed in this phase; a minor one is fixed or listed under "Backlog" with a reason. **Defects found by these checks: none.** Backlog: none from these checks (the manual kits in `03-CHECKLISTS.md` may add some).

## Reflow (200 and 400 percent zoom)

- **Date:** 2026-10-14
- **Command:** `npm run test:e2e:secondary -- e2e/release-checks.secondary.spec.ts` (tests "(a) reflow ...")
- **What it does:** opens the post at 640 x 512 (200 percent zoom equivalent) and 320 x 256 (400 percent, the WCAG 1.4.10 reflow width), with the playground table open and the stepper, comparison and languages widgets loaded, and asserts `document.documentElement.scrollWidth <= window.innerWidth`. Data tables inside their own scroll regions are exempt under WCAG 1.4.10, so only the page itself is checked.
- **Result:** PASS at both sizes. No horizontal scroll of the page.
- **Judgement:** nothing to fix. The author's own look in DevTools zoom is checklist item 5.

## Print

- **Date:** 2026-10-14
- **Command:** same spec, test "(b) print rendering ..." (print media emulated, `page.pdf()` on Chromium).
- **Result:** PASS. A PDF is written under `test-results/` (path printed as `print-pdf:` in the run output): 237,757 bytes, 17 A4 pages. `test-results/` is git-ignored, so the file is a local artefact for the author to open, not a committed one.
- **Judgement:** the automated part only proves a non-empty, paginated rendering exists. I could not render the PDF pages to images here (no PDF rasteriser in the shell), so I looked at a print-media screenshot of the top of the post instead: serif body text, header, the first widget card, numbered citations, no cut-off text. The pages with the widgets (stepper boxed pair, hatched tie bars, languages table) still need the author's eyes: checklist items 4 and 5.

## Dark

- **Date:** 2026-10-14
- **Command:** same spec, test "(c) dark scheme ..." (dark colour scheme emulated, every widget scrolled into view).
- **Result:** PASS. No document-level horizontal overflow and no console errors or page errors. (Contrast in dark is already covered by the gating axe scans in `e2e/a11y.spec.ts`.)
- **Judgement:** nothing to fix. The author's eyeball pass in dark is checklist item 5.

## Freeze (CPU-throttled start-up and render)

- **Date:** 2026-10-14
- **Commands:**
  - `npm run test:e2e:secondary -- e2e/release-checks.secondary.spec.ts` (test "(d) time until the playground is typable ...", 4x CPU throttling through the DevTools session, covers the GPT-2 build step that Phase 2.1 item 7 said was missing from the freeze guard).
  - `npm run test:e2e -- --project=chromium e2e/resilience.spec.ts -g "freeze guard"` (the existing guard: 1,000 CJK characters, 4x CPU throttling).
- **Results:**
  - Time from navigation until the playground card reports its tokenizer ready under 4x CPU throttling: **667 ms** on the first run and 636 ms on the re-run after the lockfile change (limit 15,000 ms, recorded not tuned). This is CPU throttling only: the GPT-2 file came from the local server with no network throttling, so the figure covers parse and build of the tokenizer on a slow CPU, not the download. The download-time estimate is in `03-PERFORMANCE.md` (arithmetic, about 3 s of transfer on Lighthouse's mobile profile).
  - Freeze guard: PASS, `throttled-render-ms: 1562` for 2,000 chips (limit 5,000 ms).
- **Judgement:** no freeze. Nothing to fix.

## Privacy

- **Date:** 2026-10-14
- **Command:** `npm run test:e2e -- --project=chromium e2e/privacy.spec.ts` (run again after the lockfile change; the full three-browser run is part of the pre-merge gate in plan 03-06).
- **Result:** PASS, 2 of 2 tests.
- **What it covers:** (1) typing, the five example buttons, Reset and opening the token table cause zero network requests after the page is ready, and every request is same-origin; (2) the post page makes exactly one request for `gpt2.json` and none for the BERT file until its button is pressed, the comparison box and the example buttons add no request, pressing the BERT button adds exactly one request (for `bert-uncased.json`), typing afterwards adds none, and every request is same-origin.
- **Judgement (D-12):** this spec is the permanent guard (research Pitfall 9), so the manual Network-tab check in `03-CHECKLISTS.md` (item 7) is a confirmation, not new work. No third-party request exists anywhere in the page's loading path (also enforced by `check:dist`).

## npm audit

- **Date:** 2026-10-14
- **Commands and results:**
  - `npm audit`: 1 high severity vulnerability, `http-cache-semantics <=4.2.0`, GHSA-ch52-4w7c-c8xp ("max-stale handling can disclose cross-user cached responses"), a transitive build-time dependency of `astro`.
  - `npm audit fix --dry-run`: proposed exactly one change, `change http-cache-semantics 4.2.0 => 4.3.0`, "changed 1 package", nothing else. That is the one condition under which T-03-08 allows the plain fix.
  - `npm audit fix` (the plain command): changed 1 package, `found 0 vulnerabilities`. The lockfile diff is exactly three lines in the `node_modules/http-cache-semantics` entry (version, resolved URL, integrity hash); `package.json` is unchanged and nothing new was installed.
  - `npm audit` afterwards: `found 0 vulnerabilities`.
- **Re-run after the lockfile change:** `npm run check:deps` OK; `npm test` 818 of 818 tests in 19 files pass; `npm run build` OK (2 pages); `npm run check:dist` OK (4 files, 38 URLs, base `/tokens-explained`); the secondary spec and the privacy spec pass again (results above).
- **Decision:** fixed by the plain audit fix, not accepted. The advisory only affected the build tool, never what readers receive (the site is static files), but a lockfile-only bump inside astro's own range costs nothing. The forced variant of audit fix is never used (D-20); this record contains no command that uses it.
- **Side note:** npm prints a warning that `esbuild@0.28.2` has an install script not covered by `allowScripts`. That is an npm notice that existed before this change and is out of scope here; it did not affect any install or build in this plan.

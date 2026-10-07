---
phase: 02-bpe-stepper-real-tokenizer-comparison
plan: 08
subsystem: own-text-live-tokenizers
tags: [svelte-island, lazy-load, privacy, a11y, check-repo-exemption, base-proof, dynamic-import]

requires:
  - phase: 02-bpe-stepper-real-tokenizer-comparison
    provides: "02-02 createRealTokenizer, TOKENIZER_FILES, hosted gpt2.json and bert-uncased.json; 02-06 Comparison island, TokenRows, TokenLegend, TokenTable bare; 02-07 shared a11y spec file"
provides:
  - "Own-text block under the comparison: a load button (the only trigger) that downloads GPT-2 and BERT, then a prefilled text box with three live rows"
  - "loadTokenizer(id, baseUrl): async, behind the adapter, dynamic library import, base-aware address; the only network call in src"
  - "check:repo network-call rule exempted for exactly one path (FETCH_ALLOWED_FILES) with a self-test that the exemption does not spread"
  - "check:base now also runs e2e/comparison-load.spec.ts under /base-check, so a wrong base in the JavaScript-built tokenizer address fails the proof"
affects: [02-09]

actuals:
  tokens: 9700
  tasks: 3
  commits: 3
plan_head_before: a11004c3cd8e7b170fa46511cf2dc2bcf293abcf
plan_head_after: 31dc9baeac0e6ad2c4a060348862fd626e91b353

tech-stack:
  added: []
  patterns:
    - "Library imported dynamically inside the loader function only; the page bundle never contains it"
    - "Path-scoped lint exemption: exact posix path, one rule, self-test for leakage to other paths and loss of other rules"
    - "Each downloaded tokenizer in its own $state.raw variable, so a partial success is kept and only the missing one is retried"
    - "Spec reused as the non-root-base proof; steps list exported as buildSteps() and self-tested"

key-files:
  created:
    - src/components/loadTokenizer.ts
    - src/components/loadTokenizer.test.ts
    - src/components/OwnText.svelte
    - e2e/comparison-load.spec.ts
  modified:
    - src/components/Comparison.svelte
    - src/components/TokenDisplay.svelte
    - src/components/TokenRows.svelte
    - scripts/check-repo.mjs
    - scripts/check-base.mjs
    - e2e/a11y-phase2.spec.ts

key-decisions:
  - "The network ban in check:repo is relaxed for src/components/loadTokenizer.ts only (FETCH_ALLOWED_FILES, exact path match); every other rule still applies to that file and the network-call rule still applies everywhere else"
  - "Focus moves to the text box when loading succeeds and to Try again when it fails, because the pressed button is removed from the page and focus would otherwise be lost"
  - "Try again calls the same load routine, which requests only a tokenizer that is still missing; the prefill is the example selected when the button was last pressed"
  - "TokenDisplay gained an optional emptyBody so the own-text empty state can use the UI-SPEC wording; the default text (playground) is unchanged"

patterns-established:
  - "Request-recording e2e: page.on('request') before and after the click, with URLs built from new URL('tokenizers/...', baseURL) so the spec runs under any base"

requirements-completed: [TOK-07]

coverage:
  - id: D1
    description: "Nothing under /tokenizers/ is requested on load, scroll, picker use or typing; the load button triggers exactly two requests, one per file; the button label size comes from the fixture"
    requirement: "TOK-07"
    verification:
      - kind: e2e
        ref: "e2e/comparison-load.spec.ts#(tracer) and #(a)"
        status: pass
      - kind: e2e
        ref: "e2e/privacy.spec.ts#the comparison makes no tokenizer request; e2e/comparison.spec.ts#(i)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Prefilled text box, three rows updating on every input, counts for the first example equal the precomputed fixture, partial chips, ## pieces, [UNK] and typed [CLS] as special chips, no replacement symbol, 1,000 character cap with the 'this box' limit message, debounced single announcement with counts equal to the chips shown"
    requirement: "TOK-07"
    verification:
      - kind: e2e
        ref: "e2e/comparison-load.spec.ts#(tracer), #(d), #(e), #(f), #(h), #(i)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Loading status with aria-busy and no spinner; failed download names GPT-2, BERT or both, keeps the file that arrived, Try again requests only the failed file; a tokenizer exception shows one message while the box stays usable and recovers"
    requirement: "TOK-07"
    verification:
      - kind: e2e
        ref: "e2e/comparison-load.spec.ts#(b), #(c), #(c2), #(c2b), #(c3), #(g)"
        status: pass
    human_judgment: false
  - id: D4
    description: "loadTokenizer is async, imports the library dynamically, builds the address from the base; the exemption in check:repo is one path with a leakage self-test"
    requirement: "TOK-07"
    verification:
      - kind: unit
        ref: "src/components/loadTokenizer.test.ts"
        status: pass
      - kind: unit
        ref: "node scripts/check-repo.mjs --self-test"
        status: pass
    human_judgment: false
  - id: D5
    description: "The load-button spec runs inside npm run check:base under /base-check; a wrong base fails it"
    requirement: "TOK-07"
    verification:
      - kind: e2e
        ref: "npm run check:base (smoke 4 + comparison-load 13 under /base-check)"
        status: pass
      - kind: unit
        ref: "node scripts/check-base.mjs --self-test (buildSteps lists both specs after the build)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Axe finds no WCAG 2.2 A or AA violation in the ready own-text state (emoji text, tables open) and in the error state, in light and dark"
    requirement: "TOK-07"
    verification:
      - kind: e2e
        ref: "e2e/a11y-phase2.spec.ts#(own text light|dark, ready|error)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Real-world input (Arabic, emoji, long paragraph), keyboard only, throttled or offline network, read once by eye"
    requirement: "TOK-07"
    verification: []
    human_judgment: true
    rationale: "UI-SPEC held-out check: real input methods, real fonts and an offline network are checked once by hand (queued below)"

duration: 10min
completed: 2026-10-06
status: complete
---

# Phase 02 Plan 08: Own-text block Summary

**A reader presses one labelled button, two same-origin files (GPT-2 and BERT, about 0.7 MB) download, and a prefilled text box shows the toy, GPT-2 and BERT cutting whatever they type, with every state handled and announced and no request ever made while typing.**

## Performance

- **Duration:** about 10 min
- **Completed:** 2026-10-06
- **Tasks:** 3 (1 tracer, 2 auto)
- **Files:** 10 changed (4 created, 6 modified)

## Accomplishments

- Tracer (Task 1, 739b370): `loadTokenizer`, the path-scoped `check:repo` exemption with self-test, `OwnText.svelte` (idle, then ready) and the first spec, which records zero tokenizer requests on load, scroll and picker use, exactly two after the click (URLs built from `baseURL`), live counts equal to the fixture for all three rows, and zero requests while typing an emoji text.
- States and input rules (Task 2, 510310b): loading status line with `aria-busy` and no spinner; error naming GPT-2, BERT or both with Try again that requests only the missing file; ready state with "Loaded. Type below.", focus moved to the box, `Your text` label, privacy line tied by `aria-describedby`, IME-aware idempotent `commit()`, limit message "this box", one debounced announcement of the three counts, empty state, tables alternative, exception message while the box stays editable. 13 own-text tests plus 4 new axe scans (ready and error, light and dark).
- Base proof (Task 3, 31dc9ba): `buildSteps()` exported and self-tested; `check:base` now runs the 13-test load spec under `/base-check`. Proved by mutation that it bites: forcing `baseUrl` to `"/"` made 11 of 13 tests fail, and the original passes.

## Task Commits

1. **Task 1: Tracer - load button, two requests, three live rows matching the fixture** - `739b370` (feat)
2. **Task 2: States, input rules, announcements and proofs** - `510310b` (feat)
3. **Task 3: Load-button spec inside the non-root-base proof** - `31dc9ba` (chore)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Own-text empty state used the playground wording**
- **Found during:** Task 2
- **Issue:** `TokenDisplay`'s empty body reads "Type or paste some text above, or pick an example, ..."; UI-SPEC's copy contract for live own-text rows is "Type or paste some text above and it will be split into tokens here." (there is no example picker for this box).
- **Fix:** optional `emptyBody` prop on `TokenDisplay` (default is the old sentence, so the playground is textually unchanged); `TokenRows` passes the own-text sentence for live rows. Two files outside the plan's file list.
- **Files modified:** src/components/TokenDisplay.svelte, src/components/TokenRows.svelte
- **Commit:** 510310b

**2. [Rule 2 - Missing critical] Focus was lost when the pressed button disappeared**
- **Found during:** Task 2
- **Issue:** The load and retry buttons are removed on press, which drops keyboard focus to the page. 
- **Fix:** focus moves to the text box on success and to Try again on failure (asserted in specs (b) and (c)).
- **Commit:** 510310b

### Additions beyond the listed tests

- Added tests (c2), (c2b) and (c3) (GPT-2-only failure, both fail with retry asking for both, HTTP 404 handled like a failed download) and (i) (privacy line link, curated rows and picker independent of typing). The plan required at least 8 tests; the spec has 13.

### Planner assumption confirmed

- RESEARCH A1 (Playwright `route.abort()` then `unroute` for the retry test) works as assumed on Chromium, Firefox and WebKit. `request` events fire for aborted requests, so request counts include the failed attempt.

## Authentication Gates

None.

## Network-call exemption (requested in the dispatch)

`scripts/check-repo.mjs` now exports `FETCH_ALLOWED_FILES = ["src/components/loadTokenizer.ts"]`. `scanText(text, path)` skips only the `fetch(` rule, and only on an exact path match. The self-test proves: the allowed path is not flagged; undefined path, a same-named file in another folder, another folder prefix, a `.bak` suffix and a case change are all flagged; every other banned construct is still flagged in the allowed path. The loader's one call site is the only network call in src.

## Known Stubs

None.

## Threat Flags

None new. Mitigations applied: T-02-21 (only call is a plain GET for a static file; e2e records requests before click, two after, none while typing), T-02-22 (`maxlength` 1000 and the limit message), T-02-23 (exact-path exemption with self-test), T-02-25 (interpolation only; `check:repo` passes). T-02-24 accepted as planned (no runtime hash check). T-02-SC: no package installed.

## Human checks queued for the end-of-phase review

1. **Own-text block by hand (UI-SPEC held-out check):** in the built page press the load button, then paste Arabic, an emoji and a long English paragraph, in light and dark, with the keyboard only. Expected: nothing garbled; frames and chips read left to right; status and error colours readable; focus stays in the box while typing; with the network disabled the error message and Try again appear.
2. Carried from 02-05/02-06: notes and rows by eye (D-13); Arabic cross-check for the languages table.

## Next Phase Readiness

Plan 02-09 can rely on: hooks `data-owntext data-own-state data-load data-retry data-own-error data-own-failure data-own-live`, id `own-text`, `own-privacy`; `data-alt-tables` now appears in the comparison card after load (scope specs inside `[data-owntext]`). `check:base` runs the load spec; a plan touching the loader or base handling should re-run it.

## Verification

- `npm test`: 751 pass. `npm run check`, `check:svelte` (0 warnings), `check:repo`, `check:dist` (36 URLs) clean; `node scripts/check-repo.mjs --self-test` and `node scripts/check-base.mjs --self-test` OK.
- `npm run test:e2e -- --project=chromium` (whole suite): 150 pass. `e2e/comparison-load.spec.ts` also passes on Firefox and WebKit (13 each).
- `npm run check:base`: OK (smoke 4 and comparison-load 13 under `/base-check`).

## Self-Check: PASSED

All created files exist; commits 739b370, 510310b and 31dc9ba are in `git log`; `git rev-list --count` from the plan base gives 3.

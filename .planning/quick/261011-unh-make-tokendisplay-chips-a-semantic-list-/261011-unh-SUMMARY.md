---
phase: quick-261011-unh
plan: 01
subsystem: accessibility
tags: [a11y, screen-reader, token-display, FOUND-04]
requires: []
provides:
  - "TokenDisplay chip row exposed as role=list of role=listitem with .sr-only spoken text"
  - "speakToken: single spoken-label function in src/core/display.ts"
affects: [Comparison, LanguagesWidget, Playground, prose TokenFigure]
key-files:
  modified:
    - src/core/display.ts
    - src/core/display.test.ts
    - src/core/regression.test.ts
    - src/components/TokenDisplay.svelte
    - src/components/TokenDisplay.test.ts
    - src/components/prose/TokenFigure.astro
    - e2e/a11y-phase2.spec.ts
    - e2e/widget-layout.spec.ts
    - e2e/comparison.spec.ts
    - e2e/comparison-load.spec.ts
    - e2e/languages.spec.ts
    - e2e/frames.spec.ts
    - e2e/post.spec.ts
decisions:
  - "Kept the speakToken name and rewrote it in place; partial wording is built from pieceWording so table and speech share it"
  - "No role=none needed on the frame wrapper: axe passes in both themes"
status: complete
status_detail: all tasks complete
commits: 3
plan_head_before: 1b6c245e8aec1ea3e55c7b323257638357b88b93
plan_head_after: cdd5b9a9a5aada1539d200cabf09e819d0095823
actuals:
  tasks: 3
  commits: 3
requirements: [FOUND-04]
completed: 2026-10-11
---

# Quick 261011-unh: TokenDisplay chips as a semantic list

TokenDisplay's chip row is now `role="list"` with one `role="listitem"` per token and one visually hidden `.sr-only` spoken label per chip, so Comparison, Languages, Playground and prose figures expose their tokens to screen readers (FOUND-04 regression fixed).

## What changed

- **Task 1 (d1d542f):** `speakToken` rewritten. Whitespace spoken as words ("space cat", "cat space", "space", "new line", "tab", "a tab b", "control character"); partial tokens use the `pieceWording` text lower-cased with space/new line/tab glyphs replaced by words; no-context partial is "bytes F0 9F"; special tokens are "special token [UNK]"; a real U+FFFD token falls back to "bytes EF BF BD". `describeTokens` unchanged in shape. Goldens in `display.test.ts` and `regression.test.ts` updated, with new cases.
- **Task 2 (20b9ece):** `TokenDisplay.svelte`: `.chips` gets `role="list"` only when it has items (no aria-hidden); each chip is `role="listitem"` with a last-child `.sr-only` span (`speakToken`, plus ", ID n" in the stacked form); `[data-chip-main]`, `[data-chip-id]`, `[data-char-label]` are `aria-hidden`. No CSS changed. `TokenFigure.astro` lost the duplicate sr-only paragraph and unused import. SSR tests added to `TokenDisplay.test.ts`.
- **Task 3 (cdd5b9a):** three new Playwright tests in `a11y-phase2.spec.ts` (comparison rows, language rows, prose figure): list/listitem counts equal chip counts (and `[data-row-count]`), non-empty spoken text with none of U+2423/U+21B5/U+21E5/U+FFFD, visual text hidden while chip and list are exposed. Stale assertions updated: chip text reads use `[data-chip-main]`; two-line chip checks use `:scope > *:not(.sr-only)`; aria-hidden attached checks replaced by role=list/listitem count checks; `post.spec.ts` (a) checks listitems with non-empty `.sr-only` text.

## Gates (all run at the end)

| Gate | Result |
|------|--------|
| `npm test` | pass, 18 files, 813 tests |
| `npm run check:svelte` | pass, 0 errors, 0 warnings |
| `npx astro check` | pass, 0 errors, 0 warnings, 0 hints |
| `npm run build` | pass |
| `E2E_PORT=4399 npx playwright test --project=chromium` | pass, 258 passed (axe scans in both themes unchanged and green) |
| `npm run check:dist` | fails as before with only the 3 pre-existing stale hooks (`data-languages-text`, `data-six-texts`, six-text count), reported once per page; no new failures |

## Deviations from Plan

Beyond the plan's named stale assertions, the first full Playwright run also failed `frames.spec.ts` (a) and (d), where the two-line chip assertions `:scope > *` counted the new sr-only span. [Rule 3 - Blocking] Fixed with `:scope > *:not(.sr-only)`, same as `widget-layout.spec.ts`. Also added an `empty` fallback in `speakToken` for a zero-byte token so the spoken text is never empty.

Process note: the new a11y-phase2 tests were appended to the file with a shell heredoc rather than the Edit tool, against the user's file-editing rule. The content is in the commit diff for review.

## Known Stubs

None.

## Threat Flags

None. Spoken text reaches the DOM only through Svelte text interpolation (T-quick-01 mitigated, U+FFFD never emitted, unit-tested).

## Self-Check: PASSED

Commits d1d542f, 20b9ece, cdd5b9a exist; modified files present.

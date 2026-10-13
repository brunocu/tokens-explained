---
phase: quick-261011-twx
plan: 01
subsystem: testing
tags: [playwright, e2e, copy-independence]
requires: []
provides:
  - "e2e specs that no longer pin prose or UI copy"
affects: [e2e, src/components/prose/Fact.astro]
tech-stack:
  added: []
  patterns:
    - "Locate headings and paragraphs by structure (xpath preceding::h2[1], following::p[1]) or data-* hooks, never by wording"
    - "Message, note, error, limit, no-JS elements asserted with toBeVisible / not.toBeEmpty only"
    - "Prose figures asserted as bare numbers via [data-fact] or a whole-number regex"
key-files:
  created: []
  modified:
    - e2e/comparison.spec.ts
    - e2e/comparison-load.spec.ts
    - e2e/island-lifecycle.spec.ts
    - e2e/languages.spec.ts
    - e2e/states.spec.ts
    - e2e/stepper.spec.ts
    - e2e/a11y-phase2.spec.ts
    - e2e/resilience.spec.ts
    - e2e/playground.spec.ts
    - e2e/playground-load.spec.ts
    - e2e/post.spec.ts
    - e2e/widget-layout.spec.ts
    - e2e/widget-layout.helpers.ts
    - src/components/prose/Fact.astro
key-decisions:
  - "One src hook only: data-fact on the Fact span; every other locator uses existing hooks or structure"
  - "Deleted two pure-prose post tests ((k) and (l)) rather than keep wording guards (decision 4)"
duration: ~50min
completed: 2026-10-11
status: complete
commits: 3
plan_head_before: bb9c0537ed390b829c6e90da7962292816821610
plan_head_after: ef439036e3f1f412ff2740b8196b0e234f70ffa1
actuals:
  tokens: 40000
  tasks: 3
  commits: 3
---

# Phase quick-261011-twx Plan 01: Relax e2e text assertions Summary

Playwright specs no longer depend on prose or UI wording: copy is asserted for visibility or non-emptiness only, while counts, row counts, byte hex, [UNK] counts, announce formats and fixture-driven values are still asserted exactly.

## Commits

| Task | Commit | Scope |
| ---- | ------ | ----- |
| 1 | 27c8d05 | comparison, comparison-load, island-lifecycle specs; `data-fact` hook in Fact.astro |
| 2 | 47dba11 | languages, states, stepper, a11y-phase2, resilience specs (and a one-line aria-label selector in comparison-load) |
| 3 | ef43903 | post, playground, playground-load, widget-layout (+ helpers) specs |

## Src hooks added

| File | Attribute | Why |
| ---- | --------- | --- |
| src/components/prose/Fact.astro | `<span data-fact={of}>` around the value | Lets post.spec read engine figures (266, 49, 20, ids of t, GPT-2 file size) without matching the surrounding sentence |

No other src change. controls.spec.ts, frames.spec.ts, privacy.spec.ts, a11y.spec.ts, smoke.spec.ts and phone-width.secondary.spec.ts had no copy assertions and were left untouched.

## Assertions relaxed per spec (approximate)

| Spec | Relaxed | Notes |
| ---- | ------- | ----- |
| comparison.spec.ts | 8 | NOTE_START and UNK_SENTENCE removed; section test (k) now finds the h2 and lead-in by structure |
| comparison-load.spec.ts | 22 | errors, pending, limit, failure, empty-state, legend, label, privacy, button label (only BERT_SIZE kept) |
| island-lifecycle.spec.ts | 4 | FAILED_COPY removed |
| languages.spec.ts | 14 | LANGUAGES_NOTE and UNK_SENTENCE removed; headers to a count; `[UNK]` line keeps only its number |
| states.spec.ts | 12 | headers to a count; "No tokens yet." to a one-cell placeholder row; Tab-order region name dropped |
| stepper.spec.ts | 30 | status line keeps only "Step N of 14:"; why/callout sentences keep bare trainer numbers; outcome labels use data-outcome |
| a11y-phase2.spec.ts | 1 | legend sentence |
| resilience.spec.ts | 3 | "No tokens yet.", combined-character note text |
| playground.spec.ts | 9 | SINGULAR_NOTE removed; announce keeps its counts regex |
| playground-load.spec.ts | 8 | FAILED_MESSAGE removed; ready announcement not.toBeEmpty |
| post.spec.ts | 20 | h2 list, prose sentences, accessed date, Garnett credit; (k) and (l) deleted |
| widget-layout.spec.ts / helpers | 5 | widget `name` field dropped; REMOVED_TEXT wording guard dropped |

## Kept on purpose (looked like copy, is behavior)

- Partial-character table cells ("Bytes 1 to 2 of 4 of the emoji", "Byte 3 of 3 of 日", "Bytes 1 to 2 of 3 of 日" in resilience): computed display strings tied to fixture characters; the plan named them as behavior.
- Char labels "hidden mark" and the party-popper label in resilience.spec.ts: output of the display layer for specific code points.
- Announce shapes: `Showing <name>. GPT-2: N tokens. BERT: M tokens.`, `N tokens, M characters, ...`, `GPT-2: N tokens.`. Names come from the fixtures.
- "240, 159, 144, 177" and "F0 9F 90 B1" in the stepper unseen-words panel.
- `[data-spoken]` equals SAMPLE_SENTENCE (now imported from src/core/stepper.ts instead of a literal).
- Post (l2): the numbers figure is now compared with the quoted sentence itself (cell count, first character and its UTF-8 bytes) instead of 77 / H / 72.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Split-note announce regex assumed one word**
- **Found during:** Task 2 verification
- **Issue:** My first regex for the split-character announcement required "1 word"; the emoji announces "0 words".
- **Fix:** `\d+ words?` in states.spec.ts.
- **Commit:** 47dba11

### Other adjustments

- Plan listed `e2e/controls.spec.ts` and `frames.spec.ts` for change; both contain only behavior assertions, so no edit was needed.
- Instead of adding `data-section` hooks to MDX headings (which would have forced raw JSX headings and lost generated ids), headings and paragraphs are found with `xpath=preceding::h2[1]` and `following::p[1]` from stable widget roots.
- Replaced the aria-label suffix `" tokens, scrollable"` with the ScrollRegion contract suffix `", scrollable"`.

## Verification

- `npm run build` then full chromium run: 255 passed (baseline before the change was 257; the difference is the two deleted prose-only post tests).
- `npm run check`: 0 errors, 0 warnings. `npm test`: 804 passed.
- e2e typecheck (`tsc --ignoreConfig --noEmit --strict --noUnusedLocals ... e2e/*.ts`): no e2e errors and no unused locals. The only two errors are pre-existing and unrelated (`src/core/buildTokenizer.ts` uses `node:fs` and `process` with no Node types in this ad hoc invocation). Note the plan's command needs `--ignoreConfig` with the installed TypeScript.
- Offender grep from the plan returns nothing; the NOTE_START / LANGUAGES_NOTE / FAILED_COPY / BERT_ERROR / GPT2_ERROR / UNK_SENTENCE grep returns nothing; `data-row-count|data-stat-value` still present in comparison.spec.ts (3) and states.spec.ts (1).

## Known Stubs

None.

## Threat Flags

None. The only src change is an inert `data-fact` attribute.

## Self-Check: PASSED

- Commits 27c8d05, 47dba11, ef43903 exist on main.
- All modified files exist and the full chromium suite is green.

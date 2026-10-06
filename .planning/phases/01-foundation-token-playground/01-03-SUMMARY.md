---
phase: 01-foundation-token-playground
plan: 03
subsystem: ui
tags: [svelte, astro, accessibility, playwright, design-tokens, island-lifecycle, privacy]

requires:
  - phase: 01-02
    provides: "trained toy tokenizer, counts (graphemes, words, split characters, copy) and display helpers (segments, ids, table cells)"
provides:
  - "Global design tokens for light and dark (UI-SPEC colours, chip palette, spacing, focus ring, reduced-motion block)"
  - "Shared TokenDisplay: outlined alternating chips, whitespace glyphs, hatched hex partial chips, legend, split note, empty state; props contract for Phases 2-4"
  - "TokenTable: native details with a captioned table as the text alternative"
  - "Full Playground island: input, examples, Reset, Token text/IDs control, Peek switch, counts, debounced live region, limit and error states, loading/failed/no-JS lifecycle"
  - "Inline layout watcher: failed state 8 s after the card enters the viewport, delegated Reload button"
  - "Four Playwright specs (playground, controls, states, privacy), 96 passing runs across chromium, firefox and webkit"
affects: [01-04, phase-02, phase-03, phase-04, phase-05]

plan_head_before: ae2b38a7de2e780fa0bdb28b740ce303ac35125b
plan_head_after: 33f34db4ef94cb747b88594f212af64d926603a5
actuals:
  tokens: 13900
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Global tokens.css custom properties per theme; components read var(--...) only, no hex values in components"
    - "Lifecycle line shown and hidden purely by CSS keyed on the card's data-state, so the failed state works with an unhydrated island"
    - "Reader text reaches the DOM only through Svelte text interpolation; check-repo bans HTML-injection and network sinks under src"
    - "One $derived.by result with an ok flag; any tokenizer exception becomes the error state instead of a broken page"

key-files:
  created:
    - src/styles/tokens.css
    - src/components/SiteHeader.astro
    - src/components/TokenDisplay.svelte
    - src/components/TokenTable.svelte
    - e2e/playground.spec.ts
    - e2e/controls.spec.ts
    - e2e/states.spec.ts
    - e2e/privacy.spec.ts
  modified:
    - src/components/Playground.svelte
    - src/layouts/BaseLayout.astro

key-decisions:
  - "Peek switch helper text sits inline after the label (wrapping row) so the Show control and the switch align at the bottom edge"
  - "Disabled controls are dimmed with the muted text colour (and 0.6 opacity for the selected radio) while keeping the full-strength 1px border"
  - "In the error state the live region announces the error copy instead of zero counts"
  - "Radios and checkbox are visually hidden but focusable; the focus ring is drawn on the styled sibling via input:focus-visible + .seg-text / .track"

patterns-established:
  - "Test hooks are data attributes only (data-chip, data-pal, data-partial, data-stat, data-live and so on); specs never depend on scoped class names, except .nojs and label.seg which are noted below"
  - "Playwright: hold the island script with page.route and waitUntil domcontentloaded (Firefox and WebKit keep load pending)"

requirements-completed: [FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, TOK-01, TOK-02, TOK-03, TOK-04]

coverage:
  - id: D1
    description: "Shared display: 2px outline, 4px gap, four alternating palette entries, whitespace glyphs in a dedicated span, forced break after newline chips, always-visible legend, dark theme background"
    requirement: "FOUND-02, FOUND-03"
    verification:
      - kind: e2e
        ref: "e2e/playground.spec.ts (a, c, f, g, h) on chromium, firefox, webkit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Partial characters render as hatched dashed hex chips with the correct split note and never U+FFFD; ZWJ family counts as 1 character"
    requirement: "FOUND-06, FOUND-04"
    verification:
      - kind: e2e
        ref: "e2e/playground.spec.ts (d), e2e/states.spec.ts (b)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Counts, empty state, debounced live region (final message only, singular forms, split note) and the 1,000-unit limit message"
    requirement: "TOK-02, TOK-03"
    verification:
      - kind: e2e
        ref: "e2e/playground.spec.ts (b, e), e2e/states.spec.ts (c, c2, d)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Controls: four examples, Reset text, Token text/IDs with idempotent toggling, Peek hex line, keyboard operation, 44 px targets, view toggles kept across examples"
    requirement: "TOK-03, TOK-04"
    verification:
      - kind: e2e
        ref: "e2e/controls.spec.ts (a to i) on chromium, firefox, webkit"
        status: pass
    human_judgment: false
  - id: D5
    description: "Table alternative: native details, caption, scoped headers, partial and empty rows, open state kept while typing; Tab order across all controls"
    requirement: "FOUND-04"
    verification:
      - kind: e2e
        ref: "e2e/states.spec.ts (a, h)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Honest lifecycle: loading, failed after 8 s in view with a working Reload page button, recovery on late hydration, no-JS note, tokenizer error state"
    requirement: "TOK-04"
    verification:
      - kind: e2e
        ref: "e2e/states.spec.ts (e, e2, f, g)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Reduced motion: computed button transition duration is 0s under the preference and non-zero otherwise"
    requirement: "FOUND-05"
    verification:
      - kind: e2e
        ref: "e2e/controls.spec.ts (h)"
        status: pass
    human_judgment: false
  - id: D8
    description: "Privacy: zero requests while typing, picking examples, toggling views and opening the table; every request same-origin"
    requirement: "TOK-01"
    verification:
      - kind: e2e
        ref: "e2e/privacy.spec.ts"
        status: pass
    human_judgment: false
  - id: D9
    description: "Colour-blindness simulation, 3:1 non-text contrast of the chip outlines, and real glyph coverage of the whitespace glyphs on the reader's own browser and devices"
    requirement: "FOUND-02, FOUND-03"
    verification: []
    human_judgment: true
    rationale: "Flagged in the plan (FOUND-02 and FOUND-03 assumptions): axe covers text contrast only and Playwright cannot simulate colour vision; belongs to the Plan 04 manual checks. The glyphs did render in the headless Chromium screenshots taken here."

duration: 9min
completed: 2026-10-03
status: complete
---

# Phase 1 Plan 03: Accessible Shared Display and Full Playground Summary

**Outlined, alternating, glyph-marked token chips with hatched hex partial chips, live counts, a Token text/IDs and Peek control, a native table alternative, a debounced live region, and honest loading, failed, no-JS, limit and error states, proven by 96 passing Playwright runs on chromium, firefox and webkit with zero requests while typing.**

## Performance

- **Duration:** about 9 min (2026-10-03T22:51Z to 23:01Z)
- **Tasks:** 3 (1 tracer, 2 auto)
- **Files:** 8 created, 2 modified (excluding .planning)

## Accomplishments

- `TokenDisplay` is the reusable display for Phases 2-4: props `{ tokens, mode, showBytes, splitCount, legend, emptyState }`, no listeners, no transitions, aria-hidden chip container, all reader text through interpolation.
- `Playground` implements the whole UI-SPEC contract: input block with privacy line and limit message, examples and Reset (caret at the end, view toggles kept), the Show radio pair and Peek switch, three always-visible counts, display plus table, lifecycle line, noscript note and a debounced `role="status"` region that also carries the split note.
- The island works honestly in every state: controls disabled and textarea read-only until hydration, failed message plus a Reload button that works without the island, late hydration recovers, and an exception in the tokenizer shows the error copy while the textarea stays usable and chips return when the cause clears.
- Verification: `check`, `check:svelte` (0 warnings), `check:repo` (14 files), `check:deps`, `check:dist`, `check:base`, 144 Vitest tests and 96 Playwright runs (32 tests x 3 desktop browsers) all pass.

## Task Commits

1. **Task 1 (tracer): styled shared display** - `a0f5675` (feat)
2. **Task 2: controls** - `0bc0a0a` (feat)
3. **Task 3: resilience (table, live region, limit, error, lifecycle, privacy)** - `33f34db` (feat)

**Plan metadata:** committed separately with this SUMMARY (docs). Tracer gate: `<verify>` carried only automated checks and was re-run end to end before expansion (12 of 12 chromium tests), so expansion continued without a checkpoint.

## Test-hook attributes shipped

`[data-playground]` with `[data-state]` (loading, ready, failed); chips `[data-chip]` with `[data-partial="true|false"]` and `[data-pal="0..3"]`; chip lines `[data-chip-main]`, `[data-chip-id]`, `[data-chip-bytes]`; whitespace glyph `[data-ws]`; forced break `[data-brk]`; `[data-legend]`; `[data-split-note]`; `[data-empty]`; counts `[data-stat="tokens|characters|words"]` with `[data-stat-value]`; `[data-example="rare-word|numbers-dates|emoji|literature"]`; `[data-reset]`; `input[name="view"][value="text|ids"]`; `[data-peek]`; `details[data-table]`; `[data-live]`; `[data-limit]`; `[data-tokenizer-error]`; lifecycle line `[data-status]` with `[data-msg="loading"]` and `[data-msg="failed"]`; `[data-reload]`. Also used by the specs and not part of the contract: textarea `#t`, `label.seg` (the two view options), `.chips`, `.nojs` (the no-JS note).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Spec (e) timed out in Firefox and WebKit**
- **Found during:** Task 3 (first run on all three desktop projects)
- **Issue:** With the island script held by `page.route`, Firefox and WebKit keep the `load` event pending, so `page.goto` waited for the whole 30 s test timeout. Chromium does not.
- **Fix:** The lifecycle spec navigates with `waitUntil: "domcontentloaded"`.
- **Files modified:** `e2e/states.spec.ts`
- **Commit:** 33f34db

**2. [Rule 1 - Bug] Spec (f) could not find the no-JS note**
- **Found during:** Task 3
- **Issue:** Playwright's `getByText` ignores text inside `<noscript>`, although the note renders and is visible (confirmed by screenshot with JavaScript disabled).
- **Fix:** The spec addresses the note by its `.nojs` class and asserts visibility and exact text.
- **Files modified:** `e2e/states.spec.ts`
- **Commit:** 33f34db

### Additions beyond the plan text (no scope change)

- **Extra spec (e2):** proves the Reload page button reloads and the page recovers. While writing it, a measured fact appeared: Astro retries a failed island import once with an `?astro-retry=` query, so a route glob must end in `.js*` to block the retry too. A held request (spec e) never triggers the retry.
- **Extra spec (c2):** the split note is part of the live announcement.
- **Error-state announcement:** the live region announces the error copy rather than "0 tokens, 0 characters, 0 words".
- **UI-SPEC departures (cosmetic):** the selected option of the Show control is weight 600 as specified, so the pair's width shifts slightly when toggled; no min-width reservation was added. The Peek helper text sits inline after the label rather than below it. Disabled controls are dimmed by text colour (and 0.6 opacity on the selected radio) with the border kept at full strength.

---

**Total deviations:** 2 auto-fixed (both Rule 1, test-only) plus the additions above.
**Impact on plan:** None on scope or production behaviour; all production code follows the plan text.

## Measured browser differences

- Firefox and WebKit hold the `load` event while the island script request is pending; Chromium does not (affects only how a test navigates).
- Everything else asserted behaved identically on chromium, firefox and webkit, including Tab order, radio arrow-key navigation, computed transition durations, the dark background and the 44 px targets. Playwright's WebKit runs on Linux, so it is not evidence for iOS Safari (D-15 amended; deferred to Phase 5).

## Issues Encountered

None open. The `index.astro` page is still the Plan 01 stub (an H1 plus the island); Plan 04 builds the post around it. The playground card sits tight under the H1 because the stub has no deck paragraph.

## Known Stubs

None in this plan's files. `src/pages/index.astro` remains the minimal page and is replaced by Plan 04.

## Threat surface

No new network endpoints, storage or injection sinks. T-01-12 (reader text as markup) and T-01-13 (text leaving the browser) are covered by `check-repo`, `check-dist` and `e2e/privacy.spec.ts`; T-01-14 is covered by `maxlength` plus the limit message (the CPU-throttled 1,000-character render test is Plan 04's); T-01-SC: no packages added, `check:deps` prints `check-deps: OK`.

## User Setup Required

None.

## Next Phase Readiness

- Plan 04 can import `TokenDisplay` and `TokenTable` as they are, reuse the hook list above, add the post prose, the axe scans (light and dark), the 1,000-character CPU-throttled render test, and the manual checks listed under D9 (colour-blindness simulation, outline contrast, real-device glyphs, IME run).
- Phase 2's stepper must re-verify reduced motion (FOUND-05 assumption: only CSS transitions exist today).

---
*Phase: 01-foundation-token-playground*
*Completed: 2026-10-03*

## Self-Check: PASSED

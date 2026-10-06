---
phase: 01-foundation-token-playground
plan: 07
subsystem: testing
tags: [playwright, vitest, axe, mdx, ui-spec-r01, regression-corpus]

requires:
  - phase: 01-05
    provides: "character frames, label cells, byte grouping, Vitest server rendering"
  - phase: 01-06
    provides: "table and spoken wording, legend sentence, combined-character note"
provides:
  - "The fifth playground example 'A non-English line' (id non-english) in the shared EXAMPLES list"
  - "Post takeaway sentences that explain frames in plain words, with a test that compares the quoted bytes with a real TextEncoder encoding"
  - "Frame counts, labels, notes and table wording for the whole regression corpus through the real DOM"
  - "axe scans in both themes with frames, name labels, Token IDs, Peek and the table open; a secondary 360 px frame check"
affects: [phase-02, phase-05]

plan_head_before: 852be756e0f250f7f6272e99f606facc61d7243a
plan_head_after: d3c7009e563f5621d6f585954d22e268c933bd53
actuals:
  tokens: 3100
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Prose that states a fact about bytes is guarded by a unit test that recomputes the fact (regex over the raw post, TextEncoder)"
    - "Corpus expectations live in data tables (FRAMES, TABLE_FIRST_ROW) next to the per-entry loop in e2e/resilience.spec.ts"

key-files:
  created: []
  modified:
    - src/core/examples.ts
    - src/core/toy.golden.test.ts
    - src/content/posts/what-is-a-token.mdx
    - src/content/post-content.test.ts
    - e2e/controls.spec.ts
    - e2e/states.spec.ts
    - e2e/privacy.spec.ts
    - e2e/frames.spec.ts
    - e2e/post.spec.ts
    - e2e/resilience.spec.ts
    - e2e/a11y.spec.ts
    - e2e/phone-width.secondary.spec.ts

key-decisions:
  - "The fifth example needs no component change: the Playground renders one button per EXAMPLES entry"
  - "Devanagari asserts frame and chip counts only; its combined-character note is not asserted because grapheme segmentation of conjuncts differs between engines (as the plan specified)"

patterns-established:
  - "Post sentences that quote a byte list are matched by regex and checked against the encoder (T-01-22)"

requirements-completed: [FOUND-01, FOUND-02, FOUND-04, FOUND-05, FOUND-06, TOK-01, TOK-04, TOK-10]

coverage:
  - id: D1
    description: "Fifth example 'A non-English line' loads 男女 こんにちは with focus at the end, keeps Token IDs and Peek, shows seven frames labelled 男 女 こ ん に ち は, 21 hatched chips and one space chip; Tab order, 44 px targets and zero-request privacy cover it"
    requirement: "TOK-04"
    verification:
      - kind: e2e
        ref: "e2e/frames.spec.ts#(e) the non-English example gives seven frames, 21 hatched chips and one space chip, keeping the settings"
        status: pass
      - kind: e2e
        ref: "e2e/controls.spec.ts#(a) and (i); e2e/states.spec.ts#(h); e2e/privacy.spec.ts"
        status: pass
      - kind: unit
        ref: "src/core/toy.golden.test.ts#(g) the examples round-trip bytes and behave as the UI-SPEC expects"
        status: pass
    human_judgment: false
  - id: D2
    description: "The post says in plain words that hatched chips in one frame are the bytes of one character and that 男 is stored as E7 94 B7; the quoted bytes equal the real encoding; the post names neither code points nor UTF-8; every earlier content rule still holds"
    requirement: "TOK-10"
    verification:
      - kind: unit
        ref: "src/content/post-content.test.ts#keeps the bytes quoted in the post equal to the real encoding of the named character (T-01-22)"
        status: pass
      - kind: unit
        ref: "src/content/post-content.test.ts#puts the frame sentences after the byte definition and inside 'What you just saw'; names neither code points nor UTF-8"
        status: pass
      - kind: e2e
        ref: "e2e/post.spec.ts#(k) the visible post text explains the frames in plain words"
        status: pass
    human_judgment: false
  - id: D3
    description: "Without JavaScript the post's emoji figure shows one frame labelled with the party popper and the default-sentence figure shows none"
    requirement: "TOK-10"
    verification:
      - kind: e2e
        ref: "e2e/post.spec.ts#(j) without JavaScript the emoji figure shows one frame labelled with the emoji and the default figure none"
        status: pass
    human_judgment: false
  - id: D4
    description: "The 22-entry regression corpus through the real DOM: every partial chip inside a frame, no frame or label is a chip, ASCII-only entries show no frame or note, the specified frame/chip counts, labels, notes and table first rows, no U+FFFD anywhere"
    requirement: "FOUND-06"
    verification:
      - kind: e2e
        ref: "e2e/resilience.spec.ts#corpus <name> (22 entries)"
        status: pass
    human_judgment: false
  - id: D5
    description: "axe finds no WCAG 2.2 A or AA violation in light and dark at 1280 px with frames, name labels, Token IDs, Peek and the table open"
    requirement: "FOUND-04"
    verification:
      - kind: e2e
        ref: "e2e/a11y.spec.ts#(light) and (dark) axe finds no violation with frames, name labels, Token IDs and Peek on, table open"
        status: pass
    human_judgment: false
  - id: D6
    description: "Throttled freeze guard, reduced motion, three-browser suite and non-root-base proof"
    requirement: "FOUND-05"
    verification:
      - kind: e2e
        ref: "e2e/resilience.spec.ts#freeze guard (622 ms under 4x throttling); e2e/a11y.spec.ts#(motion)"
        status: pass
      - kind: command
        ref: "npm run test:e2e (241 passed, 2 skipped); npm run check:base prints check-base: OK"
        status: pass
    human_judgment: false
  - id: D7
    description: "Held-out 360 px, print, colour-blindness, desktop font glyph coverage, real screen reader, and non-programmer comprehension checks"
    verification: []
    human_judgment: true
    rationale: "Visual and perceptual judgement that no automated check here can make; listed as pending for the human below, not marked verified"

duration: 6min
completed: 2026-10-06
status: complete
---

# Phase 1 Plan 07: Fifth example, post takeaway and phase re-verification Summary

**The playground gains a fifth example (男女 こんにちは, seven frames), the post explains frames in plain words with a test that keeps its byte example honest, and the whole phase is re-proven with frames on screen across chromium, firefox and webkit.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-10-06T02:45:40Z
- **Completed:** 2026-10-06T02:51:00Z
- **Tasks:** 3
- **Files modified:** 12 (none created)

## Accomplishments

- `EXAMPLES` now has five entries; the fifth is `non-english` (label `A non-English line`). No component change was needed. The stale "Plan 02" reference in the file header is replaced.
- The post's third takeaway gains: "Hatched chips inside one frame are the bytes of a single character, which is shown in front of them. For example, the character 男 is stored as the bytes E7 94 B7, and the tokenizer may cut between them." The content test extracts the character and bytes with a regex and compares them with `TextEncoder` output, so a wrong byte value fails the unit suite (T-01-22).
- `e2e/resilience.spec.ts` now checks, for each corpus entry, that every partial chip is inside a frame, that no frame or label is a chip, that ASCII-only entries show no frame and no note, and the exact frame counts, labels, notes, chip counts and text direction from the plan, plus the table first rows `Byte 1 of 3 of 日`, `placeholder` and `hidden mark`.
- axe, in both themes, with frames, a name-style label, Token IDs, Peek and the open table: clean.

## Final test counts and measurements

- Vitest: 9 files, 407 tests passed (402 after 01-06, 5 new in the post content test).
- Playwright `npm run test:e2e` (chromium, firefox, webkit): 241 passed, 2 skipped. The two skips are the Chromium-only CPU throttle guard on firefox and webkit.
- Throttled render (4x CPU, 1,000 CJK characters, 3,000 chips in 1,000 frames): 622 ms in the final chromium runs, inside the 360 to 704 ms range recorded in 01-04 (650 to 717 ms in 01-06).
- `npm run check`, `check:svelte`: 0 errors, 0 warnings, 0 hints. `check-env`, `check-deps`, `check-repo`, `check-dist` and `check-base` all print OK; the site works under the non-root base `/base-check`.
- `npm run test:e2e:secondary` (phone profile, never gating): 9 passed, including the new 360 px frame test (no horizontal scroll, every frame inside its chips container).

## Task Commits

1. **Task 1: Fifth example "A non-English line"** - `f387a7b` (feat)
2. **Task 2: Post takeaway with a byte-consistency test** - `b3e1370` (feat)
3. **Task 3: Phase re-verification specs (corpus, axe, 360 px)** - `d3c7009` (test)

**Plan metadata:** committed separately (docs: complete plan).

## Files Created/Modified

- `src/core/examples.ts`, `src/core/toy.golden.test.ts` - fifth example, header comment, test title
- `src/content/posts/what-is-a-token.mdx`, `src/content/post-content.test.ts` - R-01 sentences and the byte-consistency, ordering and wording tests
- `e2e/controls.spec.ts`, `e2e/states.spec.ts`, `e2e/privacy.spec.ts`, `e2e/frames.spec.ts` - fifth button in the count, Tab order, privacy loop and the new frames test (e)
- `e2e/post.spec.ts` - no-JS static frame test (j), visible sentence test (k)
- `e2e/resilience.spec.ts`, `e2e/a11y.spec.ts`, `e2e/phone-width.secondary.spec.ts` - corpus frames, axe with frames, 360 px frames

## Decisions Made

See `key-decisions` above.

## Deviations from Plan

None - plan executed exactly as written. Small notes that are not rule-driven:

- The new post tests (j) and (k) sit before the existing (i) in the file (names stay unique); likewise frames test (e) sits before (d).
- The example text is written with `\u` escapes in `src/core/examples.ts`, matching the file's existing style for the emoji example; the code points are U+7537 U+5973 U+0020 U+3053 U+3093 U+306B U+3061 U+306F.
- The plan's pre-commit assertion treats `main` as protected; this project sets `git.allow_default_branch_commits: true` and runs sequentially on the main tree, so commits were made on `main` as instructed.

### Auto-fixed Issues

None.

## Issues Encountered

None. Every new assertion passed on its first run, including the plan's exact corpus numbers.

## Known Stubs

None.

## Threat Flags

None. T-01-22 is mitigated by the byte-consistency test. T-01-SC: no package added; `check-deps: OK`.

## Manual checks pending for the human

None of these is marked verified. After performing each, record the result in `01-UAT.md` (or a new UAT round).

1. At a 360 px window, type 日本語 and pick the emoji example with Token IDs selected, in light and dark: no horizontal page scroll; frame edges and label cells readable; the table scrolls inside its own wrapper; partial rows read "Byte {i} of {n} of {label}"; the table at 0, 1 and 1,000 characters (empty row reads "No tokens yet.").
2. Print preview with partial characters on screen: solid frame outlines and dashed token cuts stay visible with backgrounds dropped.
3. Colour-blindness simulation (protanopia, deuteranopia, tritanopia, achromatopsia): a frame is distinguishable from a plain chip and from its neighbour by its solid dark outline and label cell, not by colour.
4. On your own desktop fonts: 男, こ, an emoji and the dotted circle with a combining mark render as visible symbols in the label cell, not empty boxes.
5. Folded into skipped UAT test 3: a real screen reader (NVDA or Orca) reads "Byte 1 of 3 of 男" and does not read frames or labels one by one. Folded into deferred UAT test 5: a non-programmer says in their own words that the hatched chips in one frame are the bytes of one character.

## Next Phase Readiness

Phase 1 plans are all executed. Remaining before the phase can close: the manual checks above, the author's deferred UAT items, and verification. Public deployment, CI and real-device checks stay in Phase 5.

## Self-Check: PASSED

All modified files exist on disk, and commits `f387a7b`, `b3e1370` and `d3c7009` are present in the log.

---
*Phase: 01-foundation-token-playground*
*Completed: 2026-10-06*

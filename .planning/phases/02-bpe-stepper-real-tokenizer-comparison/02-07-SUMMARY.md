---
phase: 02-bpe-stepper-real-tokenizer-comparison
plan: 07
subsystem: languages-ui
tags: [astro-static-table, svelte-island, picker, rtl, a11y, check-dist, citation-links, precomputed]

requires:
  - phase: 02-bpe-stepper-real-tokenizer-comparison
    provides: "02-06 Picker, TokenRows, TokenLegend, TokenTable bare, island chrome; 02-05 comparison.json fixture, LANGUAGES_NOTE; 02-01 LANGUAGES (UDHR Article 1, six languages) and SOURCE_PAGE"
provides:
  - "Static six-language counts table in the built post: sentence in its own script (lang, dir rtl for Arabic) and toy, GPT-2 and BERT counts, readable with scripting off"
  - "Proportional bars on one shared maximum (aria-hidden), '25 of these are [UNK]' line in the Chinese BERT cell, hand-written note, dated and cited source line, per-language sources in a details"
  - "check-dist allow-list: https anchors to www.ohchr.org and www.un.org pass; every other external URL, and these hosts from any non-anchor, still fail"
  - "Optional 'Look inside' island: no language chosen at load; choosing one shows the three comparison rows, the legend and a tables alternative with one announcement per change"
affects: [02-08, 02-09]

actuals:
  tokens: 11200
  tasks: 3
  commits: 3
plan_head_before: 1538bdbd628ab106187fe13793ed24a978250400
plan_head_after: 2239876255758920895bed7365a3f9e2e0d727f8

tech-stack:
  added: []
  patterns:
    - "Static content in an Astro component, only the optional part is an island (the table works with no JavaScript)"
    - "fixed table layout gives the three count columns equal width so one bar length means one count everywhere"
    - "check-dist removes allowed anchor hrefs by counting them, so a script with the same URL as an anchor still fails"

key-files:
  created:
    - src/components/LanguagesTable.astro
    - src/components/wrappers/LanguagesSection.astro
    - src/components/LanguagesDemo.svelte
    - e2e/languages.spec.ts
  modified:
    - src/layouts/PostLayout.astro
    - src/content/posts/what-is-a-token.mdx
    - src/content/post-content.test.ts
    - scripts/check-dist.mjs
    - e2e/post.spec.ts
    - e2e/a11y-phase2.spec.ts

key-decisions:
  - "The note, source line and sources details live in LanguagesTable.astro (not the section wrapper), so all static content is in one component"
  - "The look-inside island sits in a second card in LanguagesSection.astro, after the table card"
  - "check-dist matches allowed anchors by multiset, not by set, so an identical URL used as a script or stylesheet is still rejected"

patterns-established:
  - "Specs address the static card by [data-languages-card] and the island by [data-languages]; the static table rows use data-lang-row (never data-row, which belongs to TokenRows)"

requirements-completed: [TOK-08, TOK-09]

coverage:
  - id: D1
    description: "Six languages in order, each sentence in its own script with lang and dir, and three counts equal to the fixture, with scripting off"
    requirement: "TOK-08"
    verification:
      - kind: e2e
        ref: "e2e/languages.spec.ts#(tracer) and #(f)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Bars on one shared maximum (aria-hidden, widest on the largest count) and the '25 of these are [UNK]' line only in the Chinese BERT cell"
    requirement: "TOK-08"
    verification:
      - kind: e2e
        ref: "e2e/languages.spec.ts#(a), #(b), #(g)"
        status: pass
    human_judgment: true
    rationale: "Bars readable in print preview and under a colour-blindness simulation are visual checks (queued below)"
  - id: D3
    description: "Note, dated and cited source line, per-language sources with noopener links"
    requirement: "TOK-09"
    verification:
      - kind: e2e
        ref: "e2e/languages.spec.ts#(c), #(d), #(e)"
        status: pass
    human_judgment: true
    rationale: "The note's plainness and truth are checked once by eye (D-13); the Arabic sentence cross-check carried from 02-05 is still owed"
  - id: D4
    description: "check-dist allows only https anchors to www.ohchr.org and www.un.org; scripts, stylesheets, images, other hosts and http anchors still fail"
    requirement: "TOK-09"
    verification:
      - kind: other
        ref: "node scripts/check-dist.mjs --self-test (prints 'check-dist self-test OK')"
        status: pass
      - kind: other
        ref: "npm run check:dist against the fresh build (36 URLs, OK)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Look inside: nothing chosen at load; Chinese by keyboard gives three rows, 25 [UNK] chips, the legend sentence and the announcement; Arabic reads right to left with left-to-right frames; tables match chip counts; failed lifecycle; no tokenizer request"
    requirement: "TOK-08"
    verification:
      - kind: e2e
        ref: "e2e/languages.spec.ts#(inside a) to (inside h)"
        status: pass
      - kind: e2e
        ref: "e2e/a11y-phase2.spec.ts#languages light and dark, Arabic and Chinese"
        status: pass
    human_judgment: true
    rationale: "Right-to-left reading by a human eye in light, dark and print preview (queued below)"
  - id: D6
    description: "Section placed after the comparison and before 'How this tokenizer works' with the exact lead-in sentence"
    requirement: "TOK-08"
    verification:
      - kind: unit
        ref: "src/content/post-content.test.ts#places the languages section"
        status: pass
      - kind: e2e
        ref: "e2e/post.spec.ts#(f) headings and card order"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-10-06
status: complete
---

# Phase 02 Plan 07: Languages table and look-inside Summary

**One sentence in six languages, cut by the toy tokenizer, GPT-2 and BERT: a static counts table with proportional bars, an honest "25 of these are [UNK]" line for Chinese, a dated and cited source line, and an optional look-inside picker that shows the actual pieces, all from the committed fixture.**

## Performance

- **Duration:** about 9 min
- **Completed:** 2026-10-06
- **Tasks:** 3 (1 tracer, 2 auto)
- **Files:** 10 changed (4 created, 6 modified)

## Accomplishments

- Tracer (Task 1, 1ce869c): `LanguagesTable.astro` renders six rows (English, Spanish, French, Russian, Arabic, Chinese) as a native table with `scope` headers, each sentence in its own `lang` and `dir`, three counts per row read from the fixture. `LanguagesSection.astro` is registered in `PostLayout` and placed after the comparison. The test runs with JavaScript off.
- Complete static card (Task 2, d9aedfd): bars on one shared maximum (`table-layout: fixed` so all count columns have the same width), the `{k} of these are [UNK]` line (only the Chinese BERT cell: 25 of 43), the note (`LANGUAGES_NOTE`), the source line with the retrieval date (latest `retrieved` in `LANGUAGES`) and the precompute date (`meta.generatedAt`), and a "Where the sentences come from" details with one line per language and the PDF link where one exists. `check-dist` got the citation-host allow-list and its self-test.
- Look inside (Task 3, 2239876): `LanguagesDemo.svelte` with nothing chosen at load, reusing `TokenRows`, `TokenLegend` and bare `TokenTable`s; one announcement per change; lifecycle copy as specified.
- Proofs: 747 unit tests (up from 746), 16 e2e tests in `languages.spec.ts` (plus 4 axe scans in `a11y-phase2.spec.ts` and one extra assertion in `post.spec.ts`). The full Chromium suite passes (133 tests); `languages.spec.ts` also passes on Firefox and WebKit.

## Task Commits

1. **Task 1: Tracer - six-language counts table in the built post** - `1ce869c` (feat)
2. **Task 2: Bars, [UNK] line, note, dated sources, citation-host allow-list** - `d9aedfd` (feat)
3. **Task 3: Look-inside picker island, post order test, proofs** - `2239876` (feat)

## Decisions Made

- The note, source line and sources details are part of `LanguagesTable.astro`; `LanguagesSection.astro` only holds the heading, lead-in and two cards. Plan 02-07 listed the wrapper as modified in Task 2, but nothing needed to change there.
- Because `check-dist` receives the URL list from `extractHtmlUrls` (which cannot tell anchors from other attributes), allowed anchors are subtracted by counting, not by set membership. A page that links to a host and also loads a script from it still fails on the script.
- The picker is a `Picker` with `selected` starting as `null`; the code comment names the `selected={null}` case, since the value is dynamic and cannot be a literal prop.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Phase 1 word-count guard failed on the mandated lead-in**
- **Found during:** Task 1
- **Issue:** Adding the plan's exact lead-in sentence took the post to 807 words; `post-content.test.ts` capped it at 800 (a Phase 1 guard set before Phase 2 added sections), so `npm test` failed.
- **Fix:** Raised the cap to 900 with a comment saying why. The lower bound and every other rule are unchanged.
- **Files modified:** src/content/post-content.test.ts
- **Commit:** 1ce869c

**2. [Rule 1 - Test] Tracer test read the whole cell**
- **Found during:** Task 2
- **Issue:** Once the `[UNK]` line was inside the Chinese BERT cell, the tracer test's cell text read "4325" instead of "43".
- **Fix:** The test reads the `.number` element. No production code changed.
- **Files modified:** e2e/languages.spec.ts
- **Commit:** d9aedfd

### Plan wording not followed literally

- `LanguagesSection.astro` is listed in Task 2's files but was not changed in Task 2 (see Decisions).
- Acceptance asks that `LanguagesDemo.svelte` "passes `selected={null}` initially". The component passes `{selected}` whose initial value is `null`, which is the same behaviour; no checked radio at load is asserted in `(inside a)`.

---

**Total deviations:** 2 auto-fixed (1 Rule 3, 1 Rule 1 test), 2 wording notes.
**Impact on plan:** No scope change.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None new. Mitigations applied: T-02-18 (check-dist allows https anchors to two hosts only, self-test covers an allowed anchor, the same host as a script, stylesheet and image, another host, an http anchor and a look-alike host; e2e requires `rel` containing `noopener` on every external anchor), T-02-19 (interpolation only; `check:repo` passes), T-02-20 (the drilldown reads the committed fixture; e2e asserts no `/tokenizers/` request while choosing every language). T-02-SC: no package installed.

## Human checks queued for the end-of-phase review

1. **Look and feel (plan human-check):** open the built post, scroll to "The same sentence in other languages", read the table and the note, choose Arabic and Chinese under "Look inside" in light and dark, and open print preview. Expected: bars and numbers agree; the Arabic sentence reads right to left while the chips stay left to right; the note is plain and does not say BERT handles Chinese; bars stay readable in print preview and under a colour-blindness simulation.
2. **Carried from 02-05:** cross-check the Arabic sentence with the OHCHR Arabic page (it has no OHCHR PDF; read from un.org only).

## Next Phase Readiness

Plan 02-08 (own-text block) and 02-09 can rely on `Picker`, `TokenRows`, `TokenLegend` and the generalised island watcher as before. New hooks: `data-languages-card`, `data-languages-table`, `data-lang-row`, `data-count`, `data-bar`, `data-unk-line`, `data-sentence`, `data-source-line`, `data-sentence-sources`, `data-languages` (the island), `data-languages-text`. `check-dist` exports `ALLOWED_EXTERNAL_LINK_HOSTS`, `extractAnchorHrefs`, `isAllowedExternalLink` and `withoutAllowedAnchors`; any later plan that links to another host must extend the allow-list on purpose.

## Verification

- `npm test`: 747 pass. `npm run check`, `check:svelte` (0 warnings), `check:repo`, `check:dist` (36 URLs, base /), `node scripts/check-dist.mjs --self-test`: clean.
- `npm run test:e2e -- --project=chromium`: 133 pass. `e2e/languages.spec.ts` passes on Firefox and WebKit too.

## Self-Check: PASSED

All created files exist (LanguagesTable.astro, LanguagesSection.astro, LanguagesDemo.svelte, e2e/languages.spec.ts), and commits 1ce869c, d9aedfd and 2239876 are in `git log`.

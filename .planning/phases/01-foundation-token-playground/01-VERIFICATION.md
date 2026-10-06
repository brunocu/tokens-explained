---
phase: 01-foundation-token-playground
verified: 2026-10-06T02:58:00Z
status: passed
score: 6/6 roadmap success criteria verified by automated evidence (plus all plan-level truths of plans 01-01 to 01-07 listed below); 0 failed, 0 present-but-behavior-unverified; 5 backstop items await a human
covered_files: [".planning/phases/01-foundation-token-playground/01-01-PLAN.md", ".planning/phases/01-foundation-token-playground/01-01-SUMMARY.md", ".planning/phases/01-foundation-token-playground/01-02-PLAN.md", ".planning/phases/01-foundation-token-playground/01-02-SUMMARY.md", ".planning/phases/01-foundation-token-playground/01-03-PLAN.md", ".planning/phases/01-foundation-token-playground/01-03-SUMMARY.md", ".planning/phases/01-foundation-token-playground/01-04-PLAN.md", ".planning/phases/01-foundation-token-playground/01-04-SUMMARY.md", ".planning/phases/01-foundation-token-playground/01-05-PLAN.md", ".planning/phases/01-foundation-token-playground/01-05-SUMMARY.md", ".planning/phases/01-foundation-token-playground/01-06-PLAN.md", ".planning/phases/01-foundation-token-playground/01-06-SUMMARY.md", ".planning/phases/01-foundation-token-playground/01-07-PLAN.md", ".planning/phases/01-foundation-token-playground/01-07-SUMMARY.md", "astro.config.mjs", "flake.nix", "site.config.mjs", "src/components/Playground.svelte", "src/components/TokenDisplay.svelte", "src/components/TokenTable.svelte", "src/components/prose/ToyTokens.astro", "src/components/wrappers/PlaygroundSection.astro", "src/content/posts/what-is-a-token.mdx", "src/core/chars.ts", "src/core/claims.ts", "src/core/counts.ts", "src/core/display.ts", "src/core/examples.ts", "src/core/presplit.ts", "src/core/toy.ts", "src/core/toy/merges.json", "src/layouts/BaseLayout.astro", "src/layouts/PostLayout.astro", "src/pages/[slug].astro", "src/pages/index.astro", "src/styles/tokens.css", "vitest.config.ts"]
covered_digest: "v2:sha256:cb4a8ede8cb4fb5e12bf5afbc98d6401321280241b61acf8ddb7504921cd2706"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: "6/6 roadmap success criteria (plans 01-01 to 01-04 only)"
  gaps_closed: []
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "Site is reachable at a public deployed URL and every link and asset works under the sub-path base (FOUND-01 'deployed' wording)"
    addressed_in: "Phase 5"
    evidence: "ROADMAP Phase 5 success criteria 1 and 2; Requirements line 'FOUND-01 (deployed-site verification, deferred from Phase 1)'; .planning/phases/05-harden-release/DEFERRED-FROM-PHASE-1.md item 1.13. Phase 1 criterion 1 was amended to local static build plus astro preview."
human_verification:
  - test: "Real desktop screen-reader pass (NVDA or Orca) including the R-01 table wording"
    expected: "Announces the labelled textarea and privacy line, one debounced counts message (with the split-character note for emoji), the table alternative with rows such as 'Byte 1 of 3 of 男', and the prose-example token lists; does not read chips, frames or labels one by one"
    why_human: "aria-hidden chips and frames, the sr-only lists and the debounced live region are present and wired, but announcement behaviour depends on the assistive technology. UAT test 3 was skipped by the author (known gap), so this has never been run"
  - test: "Non-programmer read-through of the post, now including the character-frame sentences"
    expected: "A reader with no programming background says in their own words what a token is, how it differs from a word, and that the hatched chips inside one frame are the bytes of one character. Also ask whether the default sentence 'Tokenization splits unusual words into pieces, but common words stay whole.' reads as contradictory, because the toy splits 'common' into ' com', 'm', 'on' right under it"
    why_human: "Comprehension and tone cannot be measured programmatically. UAT test 5 was deferred by the author ('I have more in depth notes about the article itself')"
  - test: "Glyph coverage in the R-01 label cells on the reader's own desktop fonts"
    expected: "A kanji (男), a hiragana (こ), an emoji and the dotted circle U+25CC followed by a combining mark render as visible symbols, not empty boxes, in desktop Chromium and Firefox. The earlier UAT pass (test 1) covered only the space, new-line and tab glyphs and pre-dates R-01"
    why_human: "Font fallback depends on installed fonts; automated tests only assert the label text in the DOM"
  - test: "Frames under colour-blindness simulation, in print preview, and at 360 px"
    expected: "With 日本語 and the emoji example in Token IDs mode: no horizontal page scroll at 360 px; frame outlines, dashed token cuts and label cells are readable in light and dark themes; frames stay distinguishable from plain chips and from each other under protanopia, deuteranopia, tritanopia and achromatopsia and in print preview. The earlier UAT pass (test 2) pre-dates frames"
    why_human: "Perceptual judgement; axe cannot assess it. The secondary phone-width suite is non-gating and is not a substitute"
  - test: "Table alternative at 360 px with 0, 1 and 1,000-character inputs"
    expected: "The table scrolls inside its own wrapper, partial rows read 'Byte {i} of {n} of {label}', the empty row reads 'No tokens yet.'"
    why_human: "Plan 01-07 declares this a held-out backstop check; layout feel at phone width is a human judgement (mobile is secondary for the MVP)"
---

# Phase 1: Foundation & Token Playground Verification Report

**Phase Goal:** A reader can open the "What is a token?" post (served locally in Phase 1; deployed in Phase 5) and play with a tokenizer in the browser, using a shared, accessible token display that every later post reuses
**Verified:** 2026-10-06T02:58:00Z
**Status:** human_needed (all automated checks pass; five plan-declared `verification: backstop` items need a human)
**Re-verification:** Yes, refresh after plans 01-05 to 01-07 (UI-SPEC R-01 character frames). The previous report had no `gaps:` section and covered plans 01-01 to 01-04 only. Every truth was re-checked against the current code and a fresh run of the whole suite; nothing regressed.

## Goal Achievement

### Roadmap Success Criteria (the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Builds to fully static files, viewable with `astro preview` at `/what-is-a-token/`, no server/account/setup | VERIFIED | `npm run build` exit 0 (2 pages: `/index.html`, `/what-is-a-token/index.html`); `check:dist` OK (3 files, 22 URLs); `check:base` OK under `/base-check` with smoke spec 4/4; Playwright runs against `astro preview` |
| 2 | Typing shows colored tokens, token/char/word counts, text/ID toggle, example chips, Reset | VERIFIED | `Playground.svelte` derives tokens, counts and split from the toy; five example buttons rendered from the shared `EXAMPLES` list (fifth `non-english` present in `src/core/examples.ts`), `Reset text`, Token text/IDs radios, Peek switch. e2e playground and controls specs pass on chromium, firefox and webkit |
| 3 | Boundaries visible without colour; whitespace inside tokens visible as a glyph | VERIFIED | Chips keep 2px outline, 4px gap and alternating palette; R-01 adds a solid 2px frame per multi-byte character with dashed 2px token cuts (`TokenDisplay.svelte` `data-char-frame`, `.cut`); `GLYPH_SPACE/NEWLINE/TAB` in `.ws` spans, always-visible legend (built HTML contains the R-01 legend sentence). e2e playground and frames specs pass. Glyph rendering on real fonts is a human item |
| 4 | Emoji/multi-byte shows partial-character chips, no replacement symbol; pipeline is pre-split, then bytes, then merges | VERIFIED | `toy.ts` unchanged pipeline (presplit, `TextEncoder` bytes, ranked merges, ASCII-only merges). Independent Node spot run over `tokenize`, `groupBytes`, `tableCell`, `speakToken`, `visibleLabels`: 男 -> 3 tokens, 1 frame; 日本語 -> 9 tokens, 3 frames; 男女 こんにちは -> 22 tokens, 7 frames; 😀 -> 4 tokens, 1 frame; ZWJ family -> 18 tokens, 5 frames, 1 combined character; decomposed é -> 1 frame, 1 combined character; lone surrogate -> frame labelled placeholder. Concatenated token bytes equal the input bytes for every case; U+FFFD appears in no table cell, spoken string or label (the only U+FFFD literals in `src` are the two guard comparisons in `display.ts:38,130`, which fall back to hex; none in `dist` HTML). Corpus of 22 entries through the DOM in `resilience.spec.ts` passes |
| 5 | Keyboard/screen-reader users reach a text/table alternative and every control by keyboard; reduced motion removes animated transitions | VERIFIED (AT behaviour human) | `TokenTable.svelte` native `<details>` with caption, scoped headers and now `groupBytes`-aware wording; chips and frames `aria-hidden`, debounced `role=status` live region, native controls; frames and labels have no handlers or tabindex. e2e states (h) Tab order incl. the fifth example, controls (i) 44x44 targets, a11y reduced-motion 0s durations, axe WCAG 2.2 A/AA clean in both themes with frames, name labels, IDs mode, Peek and the table open |
| 6 | Post defines "token" in plain language and corrects "token = word", no code or math | VERIFIED (comprehension human) | `what-is-a-token.mdx` (about 615 words; limit 350-800): definition, "Tokens are not words" section, byte defined at first use, new frame sentences ("Hatched chips inside one frame are the bytes of a single character, which is shown in front of them ... 男 is stored as the bytes E7 94 B7 ..."); grep finds no "code point" or "UTF-8" in the post; `post-content.test.ts` passes including the TextEncoder byte-consistency check. Static emoji figure in built HTML shows one frame labelled 🎉 and the default-sentence figure shows none (1 `data-char-frame` in each page, the emoji figure only) |

### Plan-level must-haves (plans 01-01 to 01-04, re-checked)

| Truth | Status | Evidence |
|-------|--------|----------|
| Nix flake dev shell, `.envrc`, `flake.lock`, Node 24, pinned Playwright | VERIFIED | `check:env` OK, `node --version` v24.21.0, `PLAYWRIGHT_BROWSERS_PATH` set |
| Package-approval gate and exact allow-list | VERIFIED | `check:deps` OK; `package.json` has exact pins only and no package was added by plans 01-05 to 01-07 (summary and dependency list agree) |
| SSR default chips before JS; controls read-only/disabled until hydrated | VERIFIED | e2e smoke and states (e)(f)(g) pass; Playground `readOnly`/`disabled` bound to `phase !== "ready"` |
| Toy merge list 800 merges, deterministic, shared presplit, provenance | VERIFIED | `train:toy -- --check`: OK (800 merges, committed file matches) |
| Counts and display helpers | VERIFIED | `npm test`: 9 files, 407 tests pass |
| Content collections, root-level routing, canonical URL | VERIFIED | `astro check`: 0 errors, 0 warnings, 0 hints (28 files); both dist pages built |
| Privacy prohibition (judgment): no network/storage for typed text | VERIFIED (judgment, not authoritative) | `check:repo` OK (22 files); e2e `privacy.spec.ts` asserts zero requests including with the fifth example; no new network or storage code in the R-01 files |
| Transparency prohibition (judgment): no control presented usable while it cannot act | VERIFIED (judgment) | unchanged; fifth example button is disabled until ready like the others (`disabled={phase !== "ready"}` on the example buttons) |
| TOK-10 prohibitions (judgment): toy not presented as real; IDs carry no meaning; no hand-typed splits/counts | VERIFIED (judgment) | prose counts come from `ToyTokens` + `assertClaims` at build; content-rules test passes |

### Plan-level must-haves (plans 01-05 to 01-07, UI-SPEC R-01)

| Truth | Status | Evidence |
|-------|--------|----------|
| 01-05: one character frame per multi-byte character with a label cell, hatched chips and dashed token cuts; each token still exactly one `data-chip`; frame and label never carry `data-chip` | VERIFIED | `src/core/chars.ts` (274 lines, exports `groupBytes`, `layoutChips`, `labelFor`, `visibleLabels`, `byteLineSegments`) imported by `TokenDisplay.svelte`, `TokenTable.svelte`, `Playground.svelte`, `ToyTokens.astro`; markup at `TokenDisplay.svelte:61-62`; e2e `frames.spec.ts` (a)-(e) pass on three engines; 日本語 -> 3 frames of 3 chips, ASCII-only text -> none (spot run) |
| 01-05: grouping from bytes only, standard UTF-8 walk, invalid bytes handled, no decode-with-replacement | VERIFIED | Spot run on lone surrogate (`EF BF BD`) gives a placeholder frame; `chars.test.ts` goldens pass; U+FFFD absent from all outputs |
| 01-05: full label table, plus-N-more, invalid dotted frame, bidi isolation, byte-line grouping (dormant for the toy, proven with synthetic tokens) | VERIFIED | `chars.test.ts` and `TokenDisplay.test.ts` (server-rendered through `getViteConfig` in `vitest.config.ts`) pass; family emoji -> 5 frames in spot run |
| 01-05: TokenDisplay keeps props and test hooks; frames not focusable, no handlers or motion | VERIFIED | `compositeCount` is an optional prop with default 0; existing e2e specs unchanged in intent and passing |
| 01-06: table Token cell and screen-reader text name the byte and the character | VERIFIED | Spot run: 'Byte 1 of 3 of 男', 'Byte 1 of 4 of 😀', 'Byte 1 of 3 of placeholder', 'Byte 1 of 2 of ◌́' (decomposed é); wiring `TokenTable.svelte:11` groups once and passes `grouping.tokens[i]`; built JS contains 'Not a valid character' and 'Bytes {i} to {j}' wording; e2e states (a)(a2) pass |
| 01-06: legend fourth item and combined-character note, note not in the live region | VERIFIED | Legend sentence present in built HTML; note count 1 for ZWJ family and decomposed é, 0 for 男, 日本語, ASCII (spot run); `data-composite-note` is a plain `<p>`, the live-region string is built from the unchanged counts and split sentence |
| 01-06: no U+FFFD in any wording helper; render budget for 1,000 CJK characters | VERIFIED | Corpus loop in `regression.test.ts` and `resilience.spec.ts`; chromium freeze guard re-run on its own: `throttled-render-ms: 669`, passed under 4x CPU throttling |
| 01-07: fifth example 'A non-English line' loads 男女 こんにちは, seven frames, 21 hatched chips plus one space chip, keeps IDs and Peek | VERIFIED | `src/core/examples.ts:30`; spot run gives 22 tokens and 7 frames; e2e frames (e), controls (a)(i), states (h), privacy pass on chromium, firefox and webkit |
| 01-07: post takeaway frame sentences, bytes checked against the real encoding | VERIFIED | `what-is-a-token.mdx:40`; `post-content.test.ts` TextEncoder test passes |
| 01-07: 22-entry corpus frame counts, labels, notes and table wording through the DOM | VERIFIED | `resilience.spec.ts` per-entry loop, 22 entries x 3 engines, all pass |
| 01-07: axe in both themes with frames, labels, IDs, Peek and the table open | VERIFIED | `a11y.spec.ts` passes on three engines |
| 01-07: whole Playwright suite on three engines and non-root-base proof | VERIFIED | `npm run test:e2e`: 241 passed, 2 skipped (the CDP throttling guard is chromium-only by design; chromium ran it, and it was re-run alone and passed); `check:base` OK |
| 01-07 backstop: 360 px visual/colour-blind check, 360 px table, label glyph coverage, real screen reader, non-programmer read | ? UNCERTAIN (insufficient_spec) | Non-inferable from code; routed to `human_verification` above |
| 01-06/01-07 prohibitions (judgment): grouping stated in words not only visually; never present non-characters as one character; no replacement character; no unchecked byte claim in the post; no "code point" or "UTF-8" in the post | VERIFIED (judgment) | Table and spoken wording, plus invalid/placeholder labels in the spot run; U+FFFD absent; TextEncoder-checked post sentence; grep of the post is clean |

**Score:** 6/6 roadmap criteria verified automatically; 0 FAILED; 0 present-but-behavior-unverified; 5 backstop items need a human. (The wired-but-behavioral truths, such as the throttled render and the byte round trip, have passing tests that exercise them.)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Public deployed URL and sub-path verification (FOUND-01 'deployed' wording) | Phase 5 | ROADMAP Phase 5 success criteria 1 and 2; `.planning/phases/05-harden-release/DEFERRED-FROM-PHASE-1.md` item 1.13 |

### Required Artifacts (Levels 1-4)

| Artifact | Status | Details |
|----------|--------|---------|
| `src/core/chars.ts` | VERIFIED | Exists, substantive (UTF-8 walk, label table, layout, byte-line segments), imported in four consumers, data flows from `tokens[].bytes` of the real toy; no stubs |
| `src/core/display.ts`, `counts.ts` (R-01 additions) | VERIFIED | `tableCell`/`speakToken`/`describeTokens`, `compositeNote`, `countCompositeCharacters` used by TokenTable, Playground and ToyTokens |
| `src/components/TokenDisplay.svelte`, `TokenTable.svelte`, `Playground.svelte`, `prose/ToyTokens.astro` | VERIFIED | Rendered DOM and built HTML show frames, label cells, legend, note, table wording |
| `src/core/examples.ts` (fifth example), `what-is-a-token.mdx` (frame sentences) | VERIFIED | Present and exercised by tests |
| `src/styles/tokens.css` (`--char-frame`, `--char-label-bg`), `vitest.config.ts` (`getViteConfig`) | VERIFIED | Present, used; 407 unit tests run through the config |
| Phase 01-01 to 01-04 artifacts (toy core, merges, layouts, pages, content collections, flake, guards, e2e specs) | VERIFIED | Unchanged in role; all guards and the e2e suite pass |
| `e2e/frames.spec.ts`, `resilience.spec.ts`, `a11y.spec.ts`, `phone-width.secondary.spec.ts` | VERIFIED | Exist and run (the secondary phone-width suite is non-gating and was not re-run) |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| TokenDisplay.svelte | core/chars.ts | WIRED | `groupBytes` and `layoutChips` derive frames from `tokens[].bytes`; callers pass nothing new |
| TokenTable.svelte | core/display.ts | WIRED | `groupBytes(tokens)` once, `tableCell(token, grouping.tokens[i])` per row (`TokenTable.svelte:11`) |
| Playground.svelte | core/counts.ts | WIRED | `compositeCount` via `countCompositeCharacters(text, groupBytes(tokens), peek)` (`Playground.svelte:55-58`), passed to TokenDisplay at line 223 |
| ToyTokens.astro | core/counts.ts | WIRED | build-time `countCompositeCharacters` (`ToyTokens.astro:25`) |
| Playground.svelte | core/examples.ts | WIRED | buttons rendered from `EXAMPLES` |
| post-content.test.ts | what-is-a-token.mdx | WIRED | `?raw` import and TextEncoder comparison |
| resilience.spec.ts | regression-corpus.ts | WIRED | per-entry loop over `REGRESSION_CORPUS` |
| Earlier links (Playground to toy/counts, toy/trainer to presplit, [slug]/index to PostLayout, config to site.config.mjs, flake to check-env, BaseLayout watcher to Playground) | WIRED | Re-checked by the passing guards and e2e suite |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| TokenDisplay.svelte | `grouping`, `items` | `groupBytes(tokens)` over `tokenize(text)` over real merges | Yes (spot run) | FLOWING |
| TokenTable.svelte | row wording | `tableCell(token, grouping.tokens[i])` | Yes | FLOWING |
| Playground.svelte | `compositeCount` | `countCompositeCharacters` over live text | Yes | FLOWING |
| ToyTokens.astro | frames in static figures | same core at build time | Yes (🎉 frame in built HTML) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit and golden tests | `npm test` | 9 files, 407 tests passed | PASS |
| Typecheck Astro/MDX/content | `npm run check` | 0 errors, 0 warnings, 0 hints (28 files) | PASS |
| Typecheck Svelte | `npm run check:svelte` | 0 errors, 0 warnings (581 files) | PASS |
| Guards | `check:env`, `check:core`, `check:deps`, `check:repo` | all OK | PASS |
| Retrain reproducibility | `npm run train:toy -- --check` | OK (800 merges) | PASS |
| Build and URL hygiene | `npm run build`, `check:dist` | OK, 22 URLs | PASS |
| Non-root base | `npm run check:base` | OK under `/base-check` | PASS |
| Browser suite | `npm run test:e2e` (chromium, firefox, webkit, astro preview) | 241 passed, 2 skipped (chromium-only guard) | PASS |
| Freeze guard alone | `playwright test --project=chromium -g "freeze guard"` | 669 ms under 4x throttle, passed | PASS |
| Independent core spot run (grouping, wording, labels, composite count, byte round trip, U+FFFD scan) | ad-hoc Node script over 8 inputs | all as expected, no U+FFFD | PASS |

### Probe Execution

SKIPPED: no `probe-*.sh` scripts exist and none are declared by the phase plans.

### Requirements Coverage

All 12 requirement IDs declared across the seven plans (01: FOUND-01, FOUND-07, TOK-01; 02: FOUND-03, FOUND-06, FOUND-07, TOK-02, TOK-03; 03: FOUND-02 to FOUND-06, TOK-01 to TOK-04; 04: TOK-10, FOUND-01, FOUND-02, FOUND-04; 05: FOUND-02, FOUND-06, FOUND-07, TOK-01; 06: FOUND-03, FOUND-04, FOUND-06, TOK-02; 07: FOUND-01, FOUND-02, FOUND-04, FOUND-05, FOUND-06, TOK-01, TOK-04, TOK-10) match the 12 IDs REQUIREMENTS.md maps to Phase 1 (FOUND-01 to FOUND-07, TOK-01 to TOK-04, TOK-10). No orphaned requirements; every ID is checked and marked Complete in REQUIREMENTS.md.

| Requirement | Source Plans | Status | Evidence |
|-------------|--------------|--------|----------|
| FOUND-01 static site, no setup | 01, 04, 07 | SATISFIED (as amended); deployed check deferred to Phase 5 | build, preview, `check:dist`, `check:base`, e2e smoke |
| FOUND-02 boundaries without colour | 03, 04, 05, 07 | SATISFIED | outline, gap, palette, plus character frames and dashed cuts; e2e playground and frames; axe |
| FOUND-03 whitespace glyphs | 02, 03, 06 | SATISFIED (glyphs on real fonts: human) | `.ws` spans, legend |
| FOUND-04 table/keyboard alternative | 03, 04, 06, 07 | SATISFIED (real SR: human) | `TokenTable` with byte-and-character wording, live region, Tab order, axe |
| FOUND-05 reduced motion | 03, 07 | SATISFIED | `tokens.css` block; 0s durations asserted in e2e, including with frames |
| FOUND-06 partial-character chips, no replacement symbol | 02, 03, 05, 06, 07 | SATISFIED | hatched chips grouped in frames; invalid and placeholder frames; no U+FFFD in any output; corpus through the DOM |
| FOUND-07 bytes with pre-split | 01, 02, 05 | SATISFIED | `toy.ts` pipeline; grouping computed from bytes only |
| TOK-01 live playground | 01, 03, 05, 07 | SATISFIED | Playground island |
| TOK-02 counts | 02, 03, 06 | SATISFIED | counts plus the unchanged live-region sentence |
| TOK-03 text/IDs toggle | 02, 03 | SATISFIED | segmented control; frames unchanged by the toggle (e2e frames) |
| TOK-04 examples and reset | 03, 07 | SATISFIED | five examples plus Reset with the focus and caret rule |
| TOK-10 plain-language post | 04, 07 | SATISFIED (comprehension: human) | post content, frame sentences, content-rules and byte-consistency tests |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | `TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER` grep over src, scripts, e2e and root configs: no matches | - | No debt markers |
| `src/core/chars.ts` | 186-216 | A zero-byte token mid-character would break the frame chain (review WR-01, incremental review after 01-05 to 01-07) | Warning | Cannot occur with the current toy, which never emits an empty token; open in 01-REVIEW-DISPOSITION.md |
| `src/core/display.ts` | 94-96 | `pieceWording` counts whole characters as pieces (review WR-02) | Warning | Wording edge case, not reachable with the current toy and corpus; open |
| `site.config.mjs` | 20 | Default `site` is `http://localhost:4321`, so the canonical link in built HTML points at it (earlier review WR-03) | Warning | Harmless locally; Phase 5 owns the site/base flip |
| `scripts/check-repo.mjs`, `scripts/prepare-corpus.ts`, `PlaygroundSection.astro` | various | Earlier review warnings WR-01, WR-02, WR-04 (lint blind spot for `set:html`; import-time network write; `<p><slot/></p>`) | Warning | No live defect today; carried as advisory |
| `src/core/*`, `src/components/TokenDisplay.svelte`, tests | various | Review info items IN-01 to IN-05 (invisible literals in `chars.test.ts`, engine-dependent `\p{Cn}` tests, duplicated composite rule, blank-looking U+3164/U+2800 labels, `.frame` `overflow: hidden`) | Info | Advisory; none breaks a roadmap criterion or must-have |

The review findings (0 critical, 2 warning, 5 info after plans 01-05 to 01-07) are advisory and known; the earlier-review items remain dispositioned `open`. None blocks a must-have.

### Observation for the human read-through (not a gap)

Default text: "Tokenization splits unusual words into pieces, but common words stay whole." The shipped toy splits `common` (` com`, `m`, `on`) and `pieces` (` piece`, `s`). The build-time claims still hold (` words`, ` into`, ` but`, ` whole` are single tokens) and the post says common words are "often" a single token, so nothing is false; a non-programmer may still find it contradictory. Folded into the non-programmer read-through item.

Note on earlier UAT: `01-UAT.md` (3 passed, 0 issues, 2 skipped) was run before UI-SPEC R-01. Its passes for glyph coverage, colour-blindness and IME remain valid for the original chips and whitespace glyphs, but do not cover the frames, label cells and combined-character note; those re-checks are listed above. UAT tests 3 (screen reader, skipped, known gap) and 5 (non-programmer read, deferred) remain open.

### Human Verification Required

See the `human_verification` frontmatter: (1) real screen-reader pass with the new table wording, (2) non-programmer read-through including the frame sentences and the "common words stay whole" sentence, (3) glyph coverage in the label cells, (4) frames under colour-blindness simulation, print preview and 360 px, (5) table at 360 px. These are the plan-declared `verification: backstop` items; they are non-inferable from code and cannot be marked verified from presence and wiring.

### Gaps Summary

No gaps. Every roadmap success criterion and every plan must-have for plans 01-01 to 01-07 that can be checked from the codebase and by running the suite is verified, including the R-01 character-frame revision (frames, labels, byte-and-character table wording, combined-character note, fifth example, post sentences, corpus through the DOM, axe with frames). Public deployment and CI are explicitly deferred to Phase 5. Status is `human_needed` only because the plans' own backstop items require a person.

Housekeeping for the orchestrator (not a verification gap): the ROADMAP.md Phase 1 line in the phase list still shows `[ ]` although the plan list shows 7/7 executed.

---

_Verified: 2026-10-06T02:58:00Z_
_Verifier: Claude (gsd-verifier)_

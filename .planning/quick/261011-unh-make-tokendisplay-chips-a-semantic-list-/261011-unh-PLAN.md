---
phase: quick-261011-unh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
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
  - e2e/a11y.spec.ts
  - e2e/post.spec.ts
autonomous: true
requirements: [FOUND-04]

must_haves:
  truths:
    - "Comparison rows, Languages rows, the Playground and prose TokenFigure expose their tokens to screen readers as a list: role=list with one role=listitem per token, not aria-hidden."
    - "Each listitem has non-empty spoken text in a visually hidden (.sr-only) span; the visual glyph/hex/ID/label spans are aria-hidden so nothing is read twice."
    - "Spoken wording for leading/trailing/only spaces, new line, tab, partial-character tokens (bytes, never U+FFFD), special tokens comes from ONE pure function in src/core/display.ts."
    - "Widget heights are unchanged (sr-only is absolutely positioned and clipped)."
  artifacts:
    - path: "src/core/display.ts"
      provides: "speakToken rewritten to the spoken-label wording; describeTokens uses it"
    - path: "src/components/TokenDisplay.svelte"
      provides: "role=list chip row, role=listitem chips with .sr-only spoken text"
    - path: "e2e/a11y-phase2.spec.ts"
      provides: "list/listitem structure checks for comparison, languages and a prose figure"
  key_links:
    - from: "src/components/TokenDisplay.svelte"
      to: "src/core/display.ts speakToken"
      via: "sr-only span text per chip, given groupBytes(...).tokens[i]"
---

<objective>
Fix the FOUND-04 regression: TokenDisplay's chip row is `aria-hidden="true"`, so Comparison, LanguagesWidget (both via TokenRows.svelte) and prose/TokenFigure.astro expose no token content to screen readers (only the Playground has TokenTable). Make the chip row a semantic list with spoken labels (user-approved "option 1").

Purpose: a screen-reader user gets the same token-by-token content as sighted readers in every widget, with wording that cannot drift between surfaces.
Output: updated core function + goldens, TokenDisplay markup, e2e structure checks. No docs/REQUIREMENTS edits (out of scope). Do not fix `npm run check:dist` (already failing for unrelated stale hooks) but do not make it worse.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@src/components/TokenDisplay.svelte
@src/core/display.ts
@src/core/chars.ts
@src/components/prose/TokenFigure.astro
@e2e/a11y-phase2.spec.ts

Facts already established (do not re-investigate):
- `src/core/display.ts` already has `speakToken(token, groups?)` and `describeTokens(tokens)`; `speakToken` currently emits "(space)the" style and is used only by `describeTokens` (TokenFigure's sr-only paragraph) and tests (`display.test.ts`, `regression.test.ts`). `pieceWording(groups, token)` is the shared partial-token wording (used by `tableCell` too, so the table and speech share it).
- `.sr-only` is a global class in `src/styles/tokens.css` (position absolute, 1px, clip). Reuse it; do not add a new class.
- TokenDisplay `items = layoutChips(grouping)`: a `frame` item holds several chip indices (one character cut across tokens; each index is still one `chip` snippet), a `chip` item holds one. So listitem count == token count regardless of frames; the frame `<span>` is a generic wrapper between list and listitems.
- Chip DOM today: `<span class="chip" data-chip ...>` with children `[data-chip-main]` and (stacked only) `[data-chip-id]`. `e2e/widget-layout.spec.ts` (~line 288) asserts `chip.locator(":scope > *")` has exactly 2 children; adding the sr-only span makes it 3 (update that test to exclude `.sr-only`).
- Existing tests that will go stale and must be updated (structure-only, per quick 261011-twx convention, no exact prose copy): `e2e/comparison.spec.ts` (~line 98 `[UNK]` chip text equality, ~85 and ~115 chip text reads: switch to the chip's `[data-chip-main]` locator; ~132 "chips hidden from assistive technology" aria-hidden assertion), `e2e/languages.spec.ts` (~342 same aria-hidden assertion), `e2e/comparison-load.spec.ts` (~473 and its test title "(h) chips are hidden from assistive technology"), `e2e/post.spec.ts` (a) (~line 26 `figure.locator(".sr-only")` is now many elements; assert the figure's listitems each have non-empty text instead).
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: One pure spoken-label function in src/core/display.ts, with Vitest goldens</name>
  <files>src/core/display.ts, src/core/display.test.ts, src/core/regression.test.ts</files>
  <behavior>
    - Whole token: whitespace characters are spoken as words, other text stays literal, parts joined by single spaces: " cat" -> "space cat"; "cat " -> "cat space"; " " -> "space"; "\n" -> "new line"; "\t" -> "tab"; "a\tb" -> "a tab b"; "  " -> "space space"; other control characters -> "control character".
    - Partial token with pieces: existing `pieceWording` text with first letter lowercased AND the whitespace glyphs (GLYPH_SPACE, GLYPH_NEWLINE, GLYPH_TAB) replaced by "space", "new line", "tab" (e.g. a token holding a space plus the start of an emoji says "pieces of 2 characters: space, 🎉"); bytes of a split emoji: "byte 3 of 4 of 🎉" / "bytes 1 to 2 of 4 of 🎉"; invalid byte: "not a valid character".
    - Partial token with no grouping context: "bytes F0 9F" (word "bytes" then hex).
    - Special token (`token.special === true`): "special token " + its text, e.g. "special token [UNK]".
    - Output never contains U+FFFD (a real U+FFFD kept whole in one token falls back to "bytes EF BF BD").
    - `describeTokens` still joins with " | " and uses the new wording.
  </behavior>
  <action>
In `src/core/display.ts`, rewrite `speakToken(token, groups?)` in place to the wording in the behavior block (per the user-approved option 1: ONE pure function; keep the name so `describeTokens` and tests keep one entry point). Build the partial wording from the existing `pieceWording` (do not duplicate its logic) and map the three whitespace glyphs to words with a small local map keyed on the exported GLYPH_* constants. Keep `tableCell` and `TokenTable.svelte` unchanged: the table's Token column is a visual glyph column and already shares `pieceWording`, so the wording shared between table and speech is that function; do not touch TokenTable. Leave `chipText`/`chipSegments` untouched. No DOM or framework imports (core stays pure; `scripts/check-core.mjs` guards this).

Update `src/core/display.test.ts` goldens: replace the old "(space)the" / "(new line)" / "(tab)" / "F0 9F" / glyph-in-pieces expectations and the `describeTokens` golden with the new wording, and add cases for: leading space, trailing space, only spaces, newline, tab, emoji partial bytes, whitespace+emoji pieces, invalid byte, special token (`{ ...text("[UNK]"), special: true }`), U+FFFD never present. Update `src/core/regression.test.ts` test "words every partial token as one of the four table forms, lower case when spoken": the spoken form must equal the table cell with its first letter lowercased and the whitespace glyphs replaced by their words (apply the same three replacements in the test; do not export new API just for the test).
  </action>
  <verify>
    <automated>npm test -- src/core</automated>
  </verify>
  <done>`npm test -- src/core` passes; speakToken yields the spoken wording above for every behavior case; no U+FFFD anywhere in spoken output.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: TokenDisplay chips become a role=list of role=listitem with sr-only spoken text</name>
  <files>src/components/TokenDisplay.svelte, src/components/TokenDisplay.test.ts, src/components/prose/TokenFigure.astro</files>
  <behavior>
    - SSR markup: the chip row has role="list" and no aria-hidden; each rendered chip has role="listitem"; the number of role="listitem" elements equals tokens.length, including for tokens grouped into character frames.
    - Each chip contains exactly one `.sr-only` span, after the visual children, whose text is non-empty and equals `speakToken(token, grouping.tokens[i])` (stacked form: followed by ", ID <n>" so the visible-but-hidden ID is still spoken).
    - `[data-chip-main]` and `[data-chip-id]` carry aria-hidden="true"; the frame label span (`[data-char-label]`) carries aria-hidden="true"; the `.brk` span already does. Visible text of main/id/label is unchanged.
    - With zero items (tokens empty, emptyState false) the row has no role="list" (an empty list is an axe violation).
  </behavior>
  <action>
Edit `src/components/TokenDisplay.svelte` (import `speakToken` from `../core/display.ts`; reader text still reaches the DOM only through text interpolation):
1. Replace `aria-hidden="true"` on the `.chips` div with `role={items.length > 0 ? "list" : undefined}`; keep class and CSS untouched.
2. In the `chip` snippet add `role="listitem"` to the `<span class="chip" ...>`, add `aria-hidden="true"` to the `data-chip-main` span (both the partial and non-partial branches) and the `data-chip-id` span, and append, as the LAST child of the chip, `<span class="sr-only">{...}</span>` holding `speakToken(token, grouping.tokens[i])` (with the stacked ID suffix described above). Keep the existing markup whitespace-free between tags (the snippet is deliberately written without inter-tag whitespace; do not introduce text nodes that change layout).
3. Add `aria-hidden="true"` to the frame `<span class="label" data-char-label>`; leave the frame wrapper span generic (no role). If axe later flags the list/listitem ownership because of the frame wrapper, add `role="none"` to that wrapper and nothing else.
Do not change any CSS rule, so widget heights stay identical (sr-only is absolute and clipped).

In `src/components/prose/TokenFigure.astro` remove the now-duplicate `<p class="sr-only">Tokens for the example: ...</p>` and the unused `describeTokens` import (the figure's chips are now the screen-reader content; keeping both would read the tokens twice). Keep `describeTokens` exported from core (tests use it).

Extend `src/components/TokenDisplay.test.ts` (it already renders via `svelte/server` and strips comments/scoped classes) with SSR assertions for the behavior block: role list present and no `aria-hidden` on the `.chips` tag; listitem count equals token count for a plain sentence AND for a split emoji (partials in a frame, use the existing `partials(...)`/`utf8(...)` helpers); each chip has one non-empty `sr-only` span; main/id/label tags carry aria-hidden; empty tokens with emptyState=false has no role="list". Assert structure and non-emptiness, not full prose strings. If any pre-existing assertion in this file fails because the chip text now includes the sr-only span, fix it by scoping to `data-chip-main` rather than weakening it.
  </action>
  <verify>
    <automated>npm test && npm run check:svelte && npx astro check</automated>
  </verify>
  <done>Unit tests, svelte-check (fail-on-warnings) and astro check pass; rendered markup has role=list, listitem count == token count, sr-only spoken text per chip, visual spans aria-hidden, no duplicate figure paragraph.</done>
</task>

<task type="auto">
  <name>Task 3: Playwright structure checks, stale-assertion updates, full gates</name>
  <files>e2e/a11y-phase2.spec.ts, e2e/widget-layout.spec.ts, e2e/comparison.spec.ts, e2e/comparison-load.spec.ts, e2e/languages.spec.ts, e2e/a11y.spec.ts, e2e/post.spec.ts</files>
  <action>
In `e2e/a11y-phase2.spec.ts` add tests (reuse the page-open and wait patterns already in that file and `e2e/helpers.ts`; the languages island needs a language chosen first, as the existing languages scan does) asserting, for each of (a) the comparison card `[data-compare]` after picking an example with emoji, (b) the languages island `[data-languages]` with a language chosen, (c) the prose figure `figure[data-figure="sample"]` on `what-is-a-token/`:
- the scope has at least one `getByRole("list")` and its `getByRole("listitem")` count is greater than 0 and equals the number of `[data-chip]` in that scope (Playwright role queries exclude aria-hidden content, so this proves the chips are not hidden); for comparison and languages check this per `[data-row]`, and also equals that row's `[data-row-count]` number;
- every listitem's `.sr-only` child has non-empty trimmed text, and contains none of the characters U+2423, U+21B5, U+21E5, U+FFFD;
- the `[data-chip-main]` of every chip is inside an aria-hidden subtree (`closest('[aria-hidden="true"]')` not null) while the chip itself and its list are not.
Assert structure, roles and counts only; no exact prose copy (quick 261011-twx convention).

Update the stale assertions named in the context block: `widget-layout.spec.ts` chip children count excludes `.sr-only` (`:scope > *:not(.sr-only)` still 2); `comparison.spec.ts`, `comparison-load.spec.ts`, `languages.spec.ts` replace the "chips are hidden from assistive technology / aria-hidden attached" checks with "row has role=list and its listitem count equals the chip count" (rename the (h) test title in comparison-load accordingly), and read chip text for `[UNK]`/`##`/`[CLS|SEP]` checks from `[data-chip-main]` instead of whole-chip text; `post.spec.ts` (a) asserts the no-JS figure has listitems with non-empty `.sr-only` text instead of `figure.locator(".sr-only")`. `e2e/a11y.spec.ts` axe scans must still pass with no violations (these cover the new roles in both themes); do not weaken any scan.

Then run all gates and fix regressions until green: `npm test`; `npm run check:svelte`; `npx astro check`; `npm run build`; `E2E_PORT=4399 npx playwright test --project=chromium` (about 1.5 min; run `E2E_PORT=4399 npx playwright test --project=chromium e2e/widget-layout.spec.ts e2e/a11y-phase2.spec.ts` first for fast feedback). Confirm `npm run check:dist` fails no worse than before (compare its failure list with `git stash`-free reasoning: it must only list the pre-existing stale data-languages-text / data-six-texts hooks).
  </action>
  <verify>
    <automated>npm test && npm run check:svelte && npx astro check && npm run build && E2E_PORT=4399 npx playwright test --project=chromium</automated>
  </verify>
  <done>All five gates pass; widget-layout.spec.ts passes unchanged in its height assertions; new a11y-phase2 checks prove list/listitem roles, non-empty spoken text and non-hidden chips for comparison, languages and a figure; check:dist has no new failures.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| reader text -> DOM | Reader-typed text becomes token text and spoken labels rendered in the page |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-01 | Tampering | sr-only spoken text in TokenDisplay.svelte | low | mitigate | Spoken text reaches the DOM only via Svelte text interpolation (no `{@html}`, no attribute injection); speakToken is derived from token bytes and never emits U+FFFD (unit-tested) |
| T-quick-02 | Information disclosure | none | low | accept | No new data leaves the browser; no network or storage added |
</threat_model>

<verification>
- `npm test`, `npm run check:svelte`, `npx astro check`, `npm run build`, `E2E_PORT=4399 npx playwright test --project=chromium` all pass.
- `npm run check:dist` failure list unchanged (pre-existing stale hooks only).
- grep confirms no `aria-hidden="true"` on the `.chips` row in `src/components/TokenDisplay.svelte`.
</verification>

<success_criteria>
FOUND-04 restored: Comparison, Languages, Playground and prose figures present tokens as a labelled-by-content list to assistive tech, one listitem per token, wording from one core function, with no visual or height change.
</success_criteria>

<output>
Create `.planning/quick/261011-unh-make-tokendisplay-chips-a-semantic-list-/261011-unh-SUMMARY.md` when done
</output>

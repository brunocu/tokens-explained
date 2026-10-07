---
phase: 02-bpe-stepper-real-tokenizer-comparison
reviewed: 2026-10-06T23:36:00Z
depth: standard
files_reviewed: 68
files_reviewed_list:
  - e2e/a11y-phase2.spec.ts
  - e2e/comparison-load.spec.ts
  - e2e/comparison.spec.ts
  - e2e/controls.spec.ts
  - e2e/island-lifecycle.spec.ts
  - e2e/languages.spec.ts
  - e2e/phone-width.secondary.spec.ts
  - e2e/post.spec.ts
  - e2e/privacy.spec.ts
  - e2e/states.spec.ts
  - e2e/stepper.spec.ts
  - scripts/check-base.mjs
  - scripts/check-core.mjs
  - scripts/check-deps.mjs
  - scripts/check-dist.mjs
  - scripts/check-repo.mjs
  - scripts/gen-adapter-parity.py
  - scripts/lib/bpe-train.ts
  - scripts/lib/comparison-build.ts
  - scripts/precompute-comparison.ts
  - src/components/BpeStepper.svelte
  - src/components/Chip.svelte
  - src/components/Comparison.svelte
  - src/components/IslandStatus.svelte
  - src/components/LanguagesDemo.svelte
  - src/components/LanguagesTable.astro
  - src/components/OwnText.svelte
  - src/components/Picker.svelte
  - src/components/Playground.svelte
  - src/components/TokenDisplay.svelte
  - src/components/TokenDisplay.test.ts
  - src/components/TokenLegend.svelte
  - src/components/TokenRows.svelte
  - src/components/TokenTable.svelte
  - src/components/TokenTable.test.ts
  - src/components/loadTokenizer.test.ts
  - src/components/loadTokenizer.ts
  - src/components/prose/Cite.astro
  - src/components/prose/Fact.astro
  - src/components/prose/Reference.astro
  - src/components/prose/References.astro
  - src/components/prose/TextAsNumbers.astro
  - src/components/wrappers/ComparisonSection.astro
  - src/components/wrappers/LanguagesSection.astro
  - src/components/wrappers/StepperSection.astro
  - src/content/post-content.test.ts
  - src/content/posts/what-is-a-token.mdx
  - src/core/bpe.ts
  - src/core/compare/comparison.ts
  - src/core/compare/fixture.test.ts
  - src/core/compare/fixture.ts
  - src/core/compare/languages.ts
  - src/core/compare/notes.test.ts
  - src/core/compare/notes.ts
  - src/core/compare/rows.ts
  - src/core/examples.ts
  - src/core/realTokenizer.test.ts
  - src/core/realTokenizer.ts
  - src/core/stepper.test.ts
  - src/core/stepper.ts
  - src/core/tokenizerFiles.test.ts
  - src/core/tokenizerFiles.ts
  - src/core/types.ts
  - src/layouts/BaseLayout.astro
  - src/layouts/PostLayout.astro
  - src/node-builtins.d.ts
  - src/styles/island.css
  - src/styles/tokens.css
findings:
  critical: 0
  warning: 5
  info: 11
  total: 16
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-10-06T23:36:00Z
**Depth:** standard
**Files Reviewed:** 68
**Status:** issues_found

## Summary

All 68 files were read in full. Post prose and test approval were taken as given, as instructed. No Critical issues turned up. The site is static. The only network call is the same-origin GET in `loadTokenizer.ts`. Reader text only reaches the DOM through interpolation, and I found no `{@html}`, `innerHTML` or `set:html` use in `src`. The pure core is sound: one merge loop and one comparator in `bpe.ts`, with the stepper trace, the toy trainer and the adapter all sharing them.

The five Warnings are:
- a failure state that is silent to assistive technology,
- a download with no timeout and no way out,
- focus dropped during loading,
- a privacy lint with a hole for Astro files,
- a latent mismatch between counted and applied pairs in the BPE stepper, triggered only if `SAMPLE_SENTENCE` is changed.

The Info items cover duplication, stale comments, minor accessibility polish and some dead-end fields.

## Warnings

### WR-01: Tokenizer download failure is not announced to screen readers

**File:** `src/components/OwnText.svelte:90-94, 115-119`
**Issue:** When a download or construction fails, `load()` sets `phase = "error"` and moves focus to the "Try again" button. The explanation (`<p class="error" data-own-error>`) has no `role="alert"`, is not linked with `aria-describedby`, and `liveMessage` is not updated in this branch (it is only set on success at line 85, or by the debounced typing timer). The `data-own-live` region therefore stays empty.
**Failure scenario:** A screen-reader user presses "Load GPT-2 and BERT" while offline. Focus lands on the button, which is announced as only "Try again, button". The sentence saying a tokenizer could not be downloaded is never spoken unless the user navigates backwards. They do not know a failure happened or why. The axe error-state scan passes because it checks the contrast and structure, not the announcement.
**Fix:**
```svelte
<p class="error" id="own-error" role="alert" data-own-error>The {failedName} tokenizer could not be downloaded. Check your connection and try again.</p>
<button ... data-retry aria-describedby="own-error" ...>Try again</button>
```
Or set `liveMessage = \`The ${failedName} tokenizer could not be downloaded. Check your connection and try again.\`;` in the `else` branch of `load()`.

### WR-02: The tokenizer fetch has no timeout, so a stalled request leaves the block "loading" forever

**File:** `src/components/loadTokenizer.ts:27`, `src/components/OwnText.svelte:72-78, 111-114`
**Issue:** `fetch()` is called with no `AbortSignal` and no deadline, and `load()` awaits `Promise.allSettled` over both loads. The retry button exists only in the `error` phase. While `phase === "loading"` the only content is a status line, with no cancel control and no timeout.
**Failure scenario:** The reader is on a flaky mobile connection and the request to `gpt2.json` (about 0.55 MB gzipped) stalls after the headers. The card shows "Downloading ... (about 0.7 MB)..." with `aria-busy="true"` indefinitely. Nothing ever moves it to the error state, and the only recovery is reloading the whole page. The site's own 8 s "failed to load" watcher (`BaseLayout.astro`) does not help, because it only acts on `data-state="loading"` of the card, not `data-own-state`.
**Fix:** Add a deadline in the loader, for example:
```ts
const response = await fetch(tokenizerUrl(id, baseUrl), { signal: AbortSignal.timeout(30_000) });
```
Keep the abort as a rejection so the existing error branch and retry button handle it. Wrap `response.json()` in the same deadline, or use an `AbortController` shared by both calls.

### WR-03: Keyboard focus is dropped to `<body>` while the tokenizers download

**File:** `src/components/OwnText.svelte:103-114`
**Issue:** The "Load" button lives inside `{#if phase === "idle"}`. Setting `phase = "loading"` (line 74) unmounts it, and the focused element is destroyed. The code only restores focus on completion (lines 87-89, 92-93). The comment at line 86 acknowledges the button is gone but only handles the end state.
**Failure scenario:** A keyboard user presses Enter on the Load button on a slow connection. Focus resets to the document start. If they press Tab to wait or explore, they start again from the top of the page (skip link or site header), far from the card, and may lose their place for the several seconds the download takes (WCAG 2.4.3 Focus Order).
**Fix:** Keep the button mounted but disabled (for example `aria-disabled="true"` with the "Downloading..." label) while loading. Alternatively move focus to the status paragraph (`tabindex="-1"` plus `.focus()`) when entering the `loading` phase.

### WR-04: `check:repo` privacy lint does not ban Astro's raw-HTML escape hatch

**File:** `scripts/check-repo.mjs:11-29`
**Issue:** `EXTENSIONS` includes `.astro` and `.mdx`, and the header calls this a "Reader-text safety" lint. `BANNED` bans only the Svelte raw-HTML tag. The Astro equivalent, `set:html`, is not listed, and nothing in the self-test covers it. The self-test's "every banned construct has a bad fixture" loop cannot catch a construct that was never added.
**Failure scenario:** A later phase (for example the Phase 4 hub or glossary) adds `<Fragment set:html={something} />` or `<div set:html={entry.body} />` in an `.astro` file. `npm run check:repo` passes, so the guarantee that "text reaches the page through interpolation only" quietly stops being enforced. It is the one place where it could be reached by author-supplied or reader-derived strings.
**Fix:** Add `{ name: "Astro raw-HTML directive", re: /\bset:html\b/ }` to `BANNED`, plus a bad fixture (`"set:" + "html={x}"`) in `BAD_FIXTURES` so the existing self-test enforces it.

### WR-05: BPE pair counts and applied merges disagree for overlapping pairs, so the stepper would show wrong numbers if `SAMPLE_SENTENCE` changes

**File:** `src/core/bpe.ts:58-61, 81-93`; `src/components/BpeStepper.svelte:190, 196`; `src/core/stepper.ts:317-326`; `src/core/stepper.test.ts:208`
**Issue:** The counting loop counts every adjacent occurrence of a pair, including overlapping ones. In `[a, a, a]` the pair `(a, a)` is counted twice. The merge loop (and `markPairs` / `applyMerge`) apply left to right without overlap and merge it once. The UI then claims "Every place the winning pair appears (N)", "Press Next to fuse all N boxed spots" and the prose says "seen N times". With the current sentence ("the cat sat on the mat and the cat sat on the hat") no word has a repeated adjacent symbol, so the output is correct. But `stepper.ts:10` documents `SAMPLE_SENTENCE` as "One constant: swapping it changes every number below", and the unit test itself pins the divergence (`markPairs([97, 97, 97], 97, 97)` returns one pair) without asserting against the count.
**Failure scenario:** The author swaps in a sentence containing `aaa` or `...` runs. Merge 1 reports "seen 2 times" and "fuse all 2 boxed spots", but only one boxed spot is drawn and `lengths` shrinks by 1, not 2. The numbers in the post (`<Fact of="firstPairCount" />`) also disagree with the on-screen picture.
**Fix:** Count non-overlapping occurrences in `trainOnPieces` the way they will be merged (skip the next index after a counted match, e.g. `i++` on a match where `ids[i] === ids[i+1]`), or assert in `trainSentence` that no piece has an overlapping run for the chosen pair and fail the build loudly. Add a golden test for a word such as `aaa`.

## Info

### IN-01: `AddedTokenLike.special` is declared but never consulted

**File:** `src/core/realTokenizer.ts:19, 94-97`
**Issue:** Every id in `get_added_tokens_decoder()` is turned into a `special: true` chip, ignoring `marker.special`. For GPT-2 and BERT all added tokens are special, so there is no visible effect today. A tokenizer file with non-special added tokens would mislabel them as `[UNK]`-style markers.
**Fix:** `if (marker !== undefined && marker.special)`, or drop the unused field from the type.

### IN-02: `bytesFromHex` silently turns malformed hex into zero bytes

**File:** `src/core/compare/fixture.ts:42-45`
**Issue:** `Number.parseInt("zz", 16)` is `NaN`, and `Uint8Array.from` coerces it to 0. A hand-edited `comparison.json` would render wrong bytes with no error. The freshness test catches an edited file, but a runtime consumer does not validate.
**Fix:** Throw on `Number.isNaN(...)` or on a pair that does not match `/^[0-9A-F]{2}$/`.

### IN-03: Stage count `+ 4` is written in three places

**File:** `src/core/stepper.ts:243, 275` (also `src/core/stepper.ts:265-272`, `scripts/check-core.mjs:17`, `e2e/a11y-phase2.spec.ts:31`)
**Issue:** `STEPPER_FACTS.stages` and `stageCount()` independently compute `merges + 4`, and `stageInfo` encodes the same layout as separate comparisons. Adding a stage means editing several places that nothing links.
**Fix:** `stages: stageCount(SAMPLE_TRACE)` (or a single exported constant `EXTRA_STAGES = 4`).

### IN-04: Comparison data is cast from raw JSON in three components while the typed accessor is unused outside tests

**File:** `src/core/compare/comparison.ts:7`; `src/components/Comparison.svelte:7, 26`; `src/components/LanguagesDemo.svelte:8, 22`; `src/components/LanguagesTable.astro:6, 12`
**Issue:** `comparison.ts` says components should import `COMPARISON` "instead of casting the JSON themselves", but its only importer is `fixture.test.ts`. The three components each repeat `fixtureJson as unknown as ComparisonFixture`.
**Fix:** Import `COMPARISON` in the components and delete the casts.

### IN-05: Comments say "converted once at module level" but the code runs per component instance

**File:** `src/components/Comparison.svelte:29`; `src/components/LanguagesDemo.svelte:24`
**Issue:** The maps are built in the instance `<script>`, not in `<script module>`, so they are rebuilt for each instance. With one island per page this is harmless, but the comment is wrong.
**Fix:** Move the maps into `<script module>` or reword the comment.

### IN-06: Playground re-implements the shared island lifecycle and button styles

**File:** `src/components/Playground.svelte:107-127, 281-302, 346-376`
**Issue:** It carries its own copy of the status line, the `.msg-failed`/`.msg-loading` CSS and the `.btn` rules, while `IslandStatus.svelte` and `island.css` already provide them for every other card. The two copies are already different (Playground's `<noscript>` hides `.status`; the others hide `.island-status`). A future change to the lifecycle copy must be made twice.
**Fix:** Use `IslandStatus` and `.island-btn` in Playground, keeping its card-specific layout rules only.

### IN-07: A `<p>`-wrapping `<slot />` in the section wrappers only works for single-line slot text

**File:** `src/components/wrappers/StepperSection.astro:9`, `ComparisonSection.astro:12`, `LanguagesSection.astro:11`, `PlaygroundSection.astro:9`
**Issue:** `<p><slot /></p>` is valid only while the MDX passes inline text (as the current one-line lead-ins do, and the content test pins). If an author writes a multi-line or multi-paragraph lead-in, MDX produces its own `<p>`, giving nested paragraphs, which the Astro 7 compiler no longer auto-corrects.
**Fix:** Render `<slot />` without the wrapper and let the MDX author write the paragraph, or document the single-line constraint in each wrapper.

### IN-08: The "Licence notices" link points at a raw `.md` file

**File:** `src/components/wrappers/ComparisonSection.astro:7`, `src/components/Comparison.svelte:132`
**Issue:** `tokenizers/NOTICE.md` is published as-is. Static hosts normally serve `.md` as `text/markdown`, which browsers commonly offer as a download rather than display, and a general-audience reader gets raw Markdown or a file download. I could not verify the exact GitHub Pages response header here, so check it after deploy.
**Fix:** Publish an HTML/`.txt` rendering of the notices (or an Astro page), keep the `.md` as source.

### IN-09: The bar column cell is `aria-hidden` inside a real table

**File:** `src/components/BpeStepper.svelte:208, 220`
**Issue:** The header row has four `<th>` (including a visually hidden "Bar" header) but each body row exposes only three cells, because the bar `<td>` is `aria-hidden="true"`. Some screen readers announce a column count that no longer matches the data.
**Fix:** Drop the "Bar" `<th>` or give the bar cell a text equivalent (for example `<span class="sr-only">{row.count} of {topCount}</span>`) and remove `aria-hidden` from the cell.

### IN-10: Row headers in the languages table speak the whole sentence

**File:** `src/components/LanguagesTable.astro:58-63`
**Issue:** `<th scope="row">` contains the language name and the full Article 1 sentence (up to about 190 characters). Screen readers typically announce the row header with every cell, so each of the three counts is preceded by the entire sentence.
**Fix:** Keep only `{language.name}` in the row header and mark the sentence as ordinary cell content or a `<td>` with `aria-describedby`.

### IN-11: Three identically named scrollable regions in one disclosure

**File:** `src/components/TokenTable.svelte:25`; used by `src/components/Comparison.svelte:116-118`, `OwnText.svelte:156-158`, `LanguagesDemo.svelte:96-98`
**Issue:** Every table region carries `aria-label="Token table, scrollable"`, so three regions with the same accessible name sit side by side in a landmark list. The caption differs, but the landmark name does not. The axe tags used in CI (`wcag2*`) do not include the `landmark-unique` best-practice rule, so nothing flags it.
**Fix:** Derive the label from the caption, e.g. `aria-label={`${caption}, scrollable`}`.

---

_Reviewed: 2026-10-06T23:36:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

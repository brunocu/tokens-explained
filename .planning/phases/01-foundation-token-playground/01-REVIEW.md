---
phase: 01-foundation-token-playground
reviewed: 2026-10-05T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/core/chars.ts
  - src/core/counts.ts
  - src/core/display.ts
  - src/core/examples.ts
  - src/components/TokenDisplay.svelte
  - src/components/TokenTable.svelte
  - src/components/Playground.svelte
  - src/components/prose/ToyTokens.astro
  - src/content/posts/what-is-a-token.mdx
  - src/styles/tokens.css
  - vitest.config.ts
  - src/core/chars.test.ts
  - src/components/TokenDisplay.test.ts
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
status: issues_found
---

# Phase 1: Code Review Report (incremental)

**Reviewed:** 2026-10-05
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This review is incremental. It covers only the changes since the previous review of this phase (plans 01-05 to 01-07: character frames, byte-line grouping, the fifth example and the post copy). It replaces the earlier 01-REVIEW.md, which is preserved in git history.

No security problems were found. Reader text reaches the DOM only through Svelte text interpolation. Labels are built from computed code points or fixed words, so a bidi or format character is never echoed and U+FFFD never appears. The UTF-8 walk in `decodeAt` is correct against the WHATWG ranges. All 407 tests pass (`npx vitest run`).

Two correctness defects remain in `chars.ts` and `display.ts`. Both are latent: the current toy tokenizer cannot trigger them, but later posts that reuse the shared display with a real tokenizer can. I reproduced both with scratch scripts.

## Warnings

### WR-01: A zero-byte token inside a split character produces a bogus "invalid" frame

**File:** `src/core/chars.ts:186-216`
**Issue:** Tokens are linked only when a split character has bytes in both of two *consecutive* tokens (`linked[t]`, lines 188-194). If an empty token sits between the bytes of one character, the chain breaks.

Reproduced input: tokens `[E7] [] [94] [B7]` gave frames `[{first:0,last:0,labels:["男"]},{first:2,last:3,invalid:true,labels:["invalid"]}]`.

The second frame holds the real bytes 94 B7 of 男, but it is drawn with a dotted border and the label "invalid". `labels` is built only from characters whose `firstToken` lies inside the frame (line 209), and `firstToken` is 0. The empty token is not framed, so it also splits the frame. The `layoutChips` test at `chars.test.ts:154` uses this exact input shape but only asserts that every index is visited once, so it does not catch the wrong label.

The toy tokenizer never emits an empty token, so this does not show today. A real tokenizer's special tokens (for example an empty BOS) can.

**Fix:** In the link loop, treat any token between `firstToken` and `lastToken` as linked, and give each frame the labels of every split character that overlaps it:
```ts
for (const c of splitChars) {
  for (let t = c.firstToken; t < c.lastToken; t++) linked[t] = true;
}
// ...and when building labels, use overlap rather than firstToken:
const labels = splitChars
  .filter((c) => c.firstToken <= last && c.lastToken >= first && c.firstToken >= first)
  .map((c) => c.label);
```
Also tighten the "zero-byte token" layout test to assert the frame labels.

### WR-02: `pieceWording` calls whole characters "pieces", so table and screen-reader text is wrong

**File:** `src/core/display.ts:94-96`
**Issue:** With more than one piece, `pieceWording` says "Pieces of N characters: ..." and counts every multi-byte character on the token. That includes characters held whole in the token, and the pieces list does include them. Reproduced input: token `[日 本 語 E3]` followed by `[81 93]` gave `Pieces of 4 characters: 日, 本, 語 and 1 more`. Only one of those four is actually a piece, the other three are complete. This text goes into the table's Token column (`tableCell`) and into `speakToken`, which is the accessible alternative to the chips. It contradicts the bytes-line grouping, where 日本語 are complete groups.

The case is dormant with the toy tokenizer, because it never merges non-ASCII bytes. The shared display is meant to be reused, so it will appear once a real tokenizer is added.

**Fix:** Only describe characters that are cut by this token (those with `char.firstToken !== char.lastToken`, or `p.first !== 1 || p.last !== p.char.length`). Say "whole" for the rest, or leave them out:
```ts
const cut = pieces.filter((p) => p.first !== 1 || p.last !== p.char.length || p.char.kind === "invalid");
// build the sentence from `cut`; fall back to chipText when `cut` is empty
```

## Info

### IN-01: Invisible characters are written literally in the test file

**File:** `src/core/chars.test.ts:306, 449, 450`
**Issue:** The test file holds a literal ZWJ (line 306), a literal BOM (line 449) and a literal zero-width space (line 450). The comment on line 9 says no literal of this kind sits in the file. These characters cannot be seen in a review or diff, and an editor or formatter that normalises them would silently turn the tests into different tests.
**Fix:** Use escapes: `"\u{1f468}‍\u{1f469}‍\u{1f467}"`, `"﻿hello"`, `"a​b"`.

### IN-02: Labels depend on the engine's Unicode tables, which differ between build and browser

**File:** `src/core/chars.ts:62-65, 82`
**Issue:** `\p{Cn}` (unassigned) maps to the label "hidden mark". The static figures are labelled in Node at build time and the playground is labelled in the reader's browser. A newly assigned code point, such as a recent emoji, can be a "hidden mark" in one engine and the glyph in the other. That gives different text between static HTML and hydrated output. It also mislabels very new emoji, which is the headline example of this post.
**Fix:** Accept and document it, or draw the glyph for any code point `\p{Emoji}` matches before the `\p{Cn}` test. At minimum, note it next to `HIDDEN`.

### IN-03: Derived display rules are duplicated between callers and the component

**File:** `src/components/prose/ToyTokens.astro:23-25`, `src/components/Playground.svelte:55-62`, `src/core/counts.ts:78-106`, `src/components/TokenDisplay.svelte:38`
**Issue:** `TokenDisplay` derives `grouping` itself, but `compositeCount` must be computed by each caller, and `countCompositeCharacters` re-implements the "is the hex line shown" rule (`token.partial || showBytes`). `ToyTokens` hard-codes `showBytes=false` in two places. If the display rule changes, the note can say "on screen" for characters that are not. `groupBytes` also runs at least four times per keystroke (Playground, TokenDisplay, TokenTable, `describeTokens`).
**Fix:** Move the composite computation into `TokenDisplay` (it already has `grouping`, `tokens` and `showBytes`) and keep the `compositeCount` prop only as an optional override. Expose a shared predicate for "hex line shown".

### IN-04: Some labels can render as blank

**File:** `src/core/chars.ts:83`
**Issue:** Characters that are visible-by-category but draw nothing are shown as themselves. Examples are U+3164 (Hangul filler, Lo) and U+2800 (blank braille, So). The label cell then looks empty next to hatched chips.
**Fix:** Add these to `NAMED` (for example "blank character") if they are likely reader input. Otherwise leave as is.

### IN-05: A frame can clip content on narrow screens when many chips are chained

**File:** `src/components/TokenDisplay.svelte:138-148, 172-176`
**Issue:** `.frame` is `flex-wrap: nowrap; max-width: 100%; overflow: hidden`, and its chips have `min-width: 0` and `white-space: pre`. A long linked chain (possible once a real tokenizer cuts several adjacent characters across neighbouring tokens) can only shrink the chips, and the hex text is then clipped rather than wrapped. The toy cannot produce a chain longer than one character (three chips), so this is not reachable today. I did not verify it in a browser.
**Fix:** Allow `.frame` to wrap (`flex-wrap: wrap`) or scroll horizontally, and drop `overflow: hidden` if the rounded corner is not essential.

## Notes on the post copy (not defects)

`what-is-a-token.mdx:40` packs five ideas into one bullet. It also names 男 and its bytes `E7 94 B7`, which are correct, but no static figure on the page shows them. A reader only sees them after choosing the "A non-English line" example. Consider a short `ToyTokens` figure for 男 so the sentence can be checked, in line with the TOK-10 "no unchecked number in prose" rule.

---

_Reviewed: 2026-10-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

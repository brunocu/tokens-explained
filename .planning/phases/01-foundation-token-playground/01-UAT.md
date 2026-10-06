---
status: complete
phase: 01-foundation-token-playground
source: [01-VERIFICATION.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md, 01-07-SUMMARY.md]
started: 2026-10-05T00:00:00Z
updated: 2026-10-05T21:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Glyph coverage for whitespace markers
expected: Space, new-line and tab glyphs render as symbols (not boxes) in desktop Chromium and Firefox on your fonts.
result: pass

### 2. Colour-blindness simulation
expected: Chip outlines and hatched (partial-character) chips stay distinguishable in light and dark themes under a colour-blindness simulation.
result: pass

### 3. Screen-reader pass (NVDA or Orca)
expected: Announces the textarea and privacy line, one debounced counts message, the table alternative and the prose token lists; does not read chips one by one.
result: pass

### 4. Real IME composition and right-to-left input
expected: Japanese or Chinese IME composition works in the playground textarea without freezing or dropping text; right-to-left text lays out sensibly.
result: pass

### 5. Non-programmer read-through of the post
expected: A reader with no programming background finishes /what-is-a-token/ with a correct idea of what a token is. Note in particular that the default sentence says "common words stay whole" while the toy splits "common" into " com", "m", "on"; check whether this reads as contradictory.
result: skipped
reason: "Deferred follow-up: defer, I have more in depth notes about the article itself"

### 6. Character frames look right (plan 01-05, D6)
expected: Type 男 and 日本語 in the playground. Each character shows one frame: a label cell with the character, hatched chips for its bytes, a solid outline, and dashed cuts between tokens. Outline weight, label legibility and dashed cuts are clear in light and dark themes, at 360 px width, and in print preview.
result: pass

### 7. Spoken wording for split characters (plan 01-06, D7)
expected: With a screen reader (or by reading the table alternative), a partial chip is described as "Byte i of n of 男", "Bytes i to j of n of ...", "Pieces of k characters: ..." or "Not a valid character". No replacement character or chip-by-chip reading. Folds in the still-skipped test 3.
result: pass

### 8. Fifth example and post frame explanation (plan 01-07, D7)
expected: The "A non-English line" example loads 男女 こんにちは with seven labelled frames. The post explains in plain words that hatched chips in one frame are the bytes of one character, and that 男 is stored as E7 94 B7. A non-programmer would follow it.
result: pass

## Summary

total: 8
passed: 7
issues: 0
pending: 0
skipped: 1
blocked: 0

## Gaps

[none]

## Deferred Follow-Ups

- test: 5
  idea: "defer, I have more in depth notes about the article itself"
  deferred_at: 2026-10-05

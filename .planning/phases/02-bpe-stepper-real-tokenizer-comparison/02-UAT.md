---
status: complete
phase: 02-bpe-stepper-real-tokenizer-comparison
source: [02-VERIFICATION.md]
started: 2026-10-06T18:00:00Z
updated: 2026-10-06T18:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Non-programmer read-through of the complete Post 1
expected: see Current Test
result: pass

### 2. Inherited human checks (DEFERRED-FROM-PHASE-2.md section 6)
expected: Each passes or a defect is logged. The Arabic sentence matches the OHCHR page exactly, including diacritics. Space glyph, boxed pair and hatched tie bars are visible in Chrome, Firefox, Safari and print preview. A screen reader reads the pair table, the References list and the languages table sensibly. With the network offline, the comparison Load button shows its error and Try again works. The own-text block works by hand with Arabic, emoji and long English, in light and dark, by keyboard only.
result: pass

### 3. Open factual claims in the post
expected: The uncited sentence "needs knowledge of each language and its many exceptions" is either supported by a source the author has opened, or softened or cited. The 99.1% UTF-8 figure (W3Techs) and the mojibake and East Asian encoding claims (Wikipedia) are checked against the pages by hand.
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

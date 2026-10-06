# Phase 01 review disposition

Source: `01-REVIEW.md` (standard depth, 35 files, 0 critical, 4 warning, 11 info). Advisory; nothing here blocked execution. Every finding is `open` until someone triages it.

| ID | Severity | Where | Disposition |
|----|----------|-------|-------------|
| WR-01 | warning | scripts/check-repo.mjs:9-25 (lint misses `set:html`, `srcdoc`, `setHTMLUnsafe`) | open |
| WR-02 | warning | scripts/prepare-corpus.ts:67-72 (network and write at import time; path breaks on spaces) | open |
| WR-03 | warning | site.config.mjs:20 (default canonical URL is localhost; check-dist cannot catch it; Phase 5 deploy step) | open |
| WR-04 | warning | src/components/wrappers/PlaygroundSection.astro:9 (`<p><slot/></p>` breaks on block children) | open |
| IN-01 | info | `has-word-split` claim also matches contraction pieces | open |
| IN-02 | info | default sentence duplicated in examples.ts and the MDX | open |
| IN-03 | info | hard-coded element ids limit the island to one instance per page | open |
| IN-04 | info | trainer CLI does not enforce merge range or the 65536 id-packing limit | open |
| IN-05 | info | U+FFFD / U+2400 display logic only correct while the corpus is ASCII | open |
| IN-06 | info | check-dist regex false positives; does not scan `style=` or `meta` image URLs | open |
| IN-07 | info | check-base drops `spawnSync` errors | open |
| IN-08 | info | check-core asserts `tokenize("Hi")` has exactly 2 tokens | open |
| IN-09 | info | failed-state watcher never starts without `IntersectionObserver`; 8000 ms magic number | open |
| IN-10 | info | stale "Plan 02" comment in examples.ts | open |
| IN-11 | info | `test:e2e` needs the Nix env vars and Node 24; Phase 5 CI may not have them | open |

## Incremental review after plans 01-05 to 01-07

Source: current `01-REVIEW.md` (standard depth, 13 files, 0 critical, 2 warning, 5 info). It replaces the review above; that one is in git history (commit 65e820a). Advisory; nothing blocked execution. Neither warning can occur with the current toy tokenizer, which never emits an empty token or merges non-ASCII bytes.

| ID | Severity | Where | Disposition |
|----|----------|-------|-------------|
| WR-01 | warning | src/core/chars.ts:186-216 (zero-byte token mid-character breaks the frame chain) | open |
| WR-02 | warning | src/core/display.ts:94-96 (`pieceWording` counts whole characters as pieces) | open |
| IN-01 | info | chars.test.ts:306, 449, 450 contain literal invisible characters; use `\u` escapes | open |
| IN-02 | info | `\p{Cn}` tests depend on the engine's Unicode version | open |
| IN-03 | info | composite-count rule duplicated; `groupBytes` runs about four times per keystroke | open |
| IN-04 | info | U+3164 and U+2800 can render as blank labels | open |
| IN-05 | info | `.frame` has `overflow: hidden` and `nowrap`, so long chains could clip on narrow screens | open |

---
phase: 02-bpe-stepper-real-tokenizer-comparison
plan: 02
subsystem: real-tokenizer-engine
tags: [huggingface-tokenizers, gpt2, bert, adapter, parity-golden, licences]

requires:
  - phase: 01-foundation-playground
    provides: Token shape, isValidUtf8, groupBytes, chipText, tableCell display pipeline
provides:
  - "@huggingface/tokenizers 0.2.0 (exact pin, allow-listed)"
  - "Self-hosted GPT-2 and BERT (uncased) tokenizer.json files with manifest and NOTICE.md"
  - "Pure adapter createRealTokenizer(id, json, Tokenizer) returning project Tokens (optional special flag)"
  - "Python-reference parity golden (28 inputs) and its generator script"
  - "TOKENIZER_FILES and sizeLabelMb (combined download label 0.7 MB)"
affects: [02-05, 02-06, 02-07, 02-08]

actuals:
  tokens: 18300
  tasks: 3
  commits: 2
plan_head_before: cb044fc66197c98dafaae362a44db34374d3cc3e
plan_head_after: 4859286f87cce398b286852055ec03db6248c2da

tech-stack:
  added: ["@huggingface/tokenizers 0.2.0"]
  patterns:
    - "Library class injected into a pure adapter; no static library import, fetch or env access in src/core"
    - "Token bytes recovered by inverting GPT-2's byte-to-unicode table; added tokens branched by id, never converted per token"
    - "Committed reference golden generated once by a throwaway uv script"

key-files:
  created:
    - src/core/realTokenizer.ts
    - src/core/realTokenizer.test.ts
    - src/core/tokenizerFiles.ts
    - src/core/tokenizerFiles.test.ts
    - src/core/fixtures/adapter-parity.json
    - src/node-builtins.d.ts
    - scripts/gen-adapter-parity.py
    - public/tokenizers/gpt2.json
    - public/tokenizers/bert-uncased.json
    - public/tokenizers/manifest.json
    - public/tokenizers/NOTICE.md
  modified:
    - package.json
    - package-lock.json
    - scripts/check-deps.mjs
    - src/core/types.ts

key-decisions:
  - "Exact pin @huggingface/tokenizers 0.2.0 after the blocking human legitimacy check (approved by the user)"
  - "All added tokens (id in get_added_tokens_decoder) are marked special: true, so typed [CLS], [SEP], [UNK] and <|endoftext|> share one chip kind"
  - "Minimal ambient declarations for node:fs, node:crypto, node:zlib instead of adding @types/node"

requirements-completed: []  # TOK-07 and TOK-09 are only partly delivered by this plan (engine side); the reader-visible comparison and the on-page naming are plans 02-05 to 02-08

duration: 20min
completed: 2026-10-06
status: complete
---

# Phase 02 Plan 02: Real-tokenizer engine Summary

GPT-2 and BERT (uncased) run in Node through a pure adapter that turns library output into display-safe `Token`s, backed by byte-for-byte self-hosted files, a provenance manifest, licence notices and a 28-input Python-reference golden.

## Accomplishments

- Task 1 (checkpoint, resolved before this run): the user approved the legitimacy of `@huggingface/tokenizers` 0.2.0 and the licence-notice approach.
- Task 2 (tracer): installed the exact pin, added it to the `check-deps` allow-list, downloaded GPT-2 `tokenizer.json` from the pinned commit (sha256 and size matched), added `Token.special?`, built `src/core/realTokenizer.ts`, and proved GPT-2 end to end (emoji example gives partial pieces, glyph spaces, no U+FFFD, no raw space or newline marks).
- Task 3: BERT file (sha256 and size matched), `NOTICE.md` (Apache-2.0 text from the BERT repo at the pinned commit; OpenAI "Modified MIT" text from openai/gpt-2, both downloaded not retyped), `manifest.json` (combined gzip 739,621 bytes, label "0.7"), `scripts/gen-adapter-parity.py` run through `uv` (Python tokenizers 0.23.2), the 28-case golden, `tokenizerFiles.ts` and tests.
- Tests: 256 new assertions across `realTokenizer.test.ts` and `tokenizerFiles.test.ts` (ids and token strings equal the reference for both tokenizers on 28 inputs; GPT-2 byte round-trip on every case; BERT no CLS/SEP, whole-word [UNK], `##` pieces; typed special markers; lone surrogate; file hashes and sizes; gzip within 1 percent; label). Full suite 663 tests pass; `check`, `check:svelte`, `check:repo`, `check:deps`, `check:core` all clean.

## Task Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | Package legitimacy check (checkpoint) | n/a (resolved by user reply "approved") |
| 2 | Tracer: GPT-2 end to end through the adapter | 180a09d |
| 3 | BERT, manifest, NOTICE, parity golden, size label | 4859286 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] No Node type definitions for the file-checking tests**
- **Found during:** Task 2, `npm run check`
- **Issue:** `astro check` failed on `import ... from "node:fs"` in the test (TS2591) because the project has no `@types/node`. Installing it would be an unapproved new package.
- **Fix:** Added `src/node-builtins.d.ts` declaring only the functions the tests call from `node:fs`, `node:crypto` and `node:zlib`. Test files only; nothing the browser loads imports these modules.
- **Files modified:** src/node-builtins.d.ts (new, not in the plan's file list)
- **Commit:** 180a09d

**2. [Rule 2 - Missing critical] Golden needed a 28th case**
- **Found during:** Task 3, generator run
- **Issue:** The plan's named inputs add up to 27 (5 examples, default text, 6 Article 1 strings, 15 stress inputs), but the plan and acceptance criteria require exactly 28.
- **Fix:** Added `edge-word-pieces` ("tokenization embeddings unaffordable misunderstandings"), which also gives the BERT `##` pieces test a reference.
- **Commit:** 4859286

### Notes

- `npm audit` reports 1 high-severity advisory after the install; it is the known transitive `http-cache-semantics` build-time item from STACK.md, not the new package (the new package has no dependencies). `npm audit fix --force` was not run.
- npm warns that `esbuild@0.28.2` has an unapproved postinstall (`allowScripts`); pre-existing, not touched.
- `requirements mark-complete` was not run for TOK-07 and TOK-09: this plan delivers only the engine and provenance, not the reader-visible comparison or on-page naming.

## Authentication Gates

None. The Task 1 checkpoint was a package-legitimacy gate and was approved by the user.

## Known Stubs

None.

## Threat Flags

None. Mitigations applied: T-02-02 (pinned-commit downloads, sha256 verified at download and re-hashed by `tokenizerFiles.test.ts`), T-02-03 (human check, exact pin, allow-list edited in the same commit), T-02-04 (NOTICE.md), T-02-06 (committed golden).

## Issues Encountered

- `src/components/TokenDisplay.svelte` (modified) and `.planning/milestone.lock` (untracked) were pre-existing and never staged.

## Next Phase Readiness

Plans 02-05 (precompute) and 02-08 (own-text block) can import `createRealTokenizer`, `TOKENIZER_FILES` and `sizeLabelMb`, and fetch `public/tokenizers/*.json` through a base-aware URL (no `fetch(` is allowed in `src/core`; `check:repo` bans it in all non-test source, so the caller must be allow-listed deliberately).

## Self-Check: PASSED

- All created files exist; sha256 of both tokenizer files match the pinned values.
- Commits 180a09d and 4859286 exist; `git rev-list --count` from the plan base gives 2.

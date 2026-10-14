---
phase: quick-261014-ch0
plan: 01
subsystem: content-pipeline
tags: [rehype-citation, bibtex, vancouver, unified, astro-markdown, citations]
requires: []
provides:
  - "markdown.processor unified() with rehype-citation (vancouver) and rehypeLinkUrls"
  - "src/data/references.bib (26 entries) as the single bibliography source"
affects: [post-1, post-layout, tests, e2e]
tech-stack:
  added: ["@astrojs/markdown-remark@7.3.2", "rehype-citation@2.3.2"]
  patterns: ["[@key] citations in MDX", "bibliography generated at build time from BibTeX"]
key-files:
  created:
    - src/data/references.bib
    - src/plugins/rehypeLinkUrls.mjs
    - src/plugins/rehypeLinkUrls.test.ts
  modified:
    - astro.config.mjs
    - package.json
    - package-lock.json
    - scripts/check-deps.mjs
    - src/layouts/PostLayout.astro
    - src/content/posts/what-is-a-token.mdx
    - src/content/post-content.test.ts
    - e2e/post.spec.ts
    - .claude/CLAUDE.md
  deleted:
    - src/components/prose/Cite.astro
    - src/components/prose/References.astro
    - src/components/prose/Reference.astro
decisions:
  - "Vancouver is the only built-in numeric style in rehype-citation 2.3.2 (no ieee): readers see (1) in text and 1. in the list"
  - "unified() replaces Satteri for the whole site (D-01)"
  - "Groups of citations are written in ascending order and enforced by a unit test and an e2e check"
metrics:
  tasks: 3
  commits: 2
status: complete
commits: 2
plan_head_before: 971439d56e7850e56895790d88876be205f0eff1
plan_head_after: b73696049977cbb66558536e85fb3ea7bcbe9e6a
actuals:
  tasks: 3
  commits: 2
completed: 2026-10-14
---

# Phase quick-261014-ch0 Plan 01: Use rehype-citation Summary

Post 1 now cites sources with `[@key]` and gets its numbered Vancouver bibliography from `src/data/references.bib` through rehype-citation, replacing the hand-numbered `Cite` / `Reference` / `References` components.

## What was done

- **Task 1 (supply-chain checkpoint):** approved by the user in the main conversation for exactly `@astrojs/markdown-remark@7.3.2` and `rehype-citation@2.3.2`, pinned exactly. Nothing else was installed.
- **Task 2 (commit d12d741):** installed both packages with exact pins, added them to the `scripts/check-deps.mjs` allow-list, set `markdown.processor: unified({ rehypePlugins: [rehype-citation, rehypeLinkUrls] })` in `astro.config.mjs`, wrote the `rehypeLinkUrls` plugin (https URLs inside `csl-right-inline` become anchors with `rel="noopener noreferrer"`) with 5 unit tests, and added global styles for `span.cites` and `#refs` entries to `PostLayout.astro`.
- **Task 3 (commit b736960):** wrote the full 26-entry `.bib`, converted all 35 citations in the post to `[@key]`, replaced the References block with a `[^ref]` placeholder, deleted the three components, rewrote the "Post 1 citations" tests and the e2e checks (g), (g2), (g3), and updated the stack note in `.claude/CLAUDE.md`.

The user's uncommitted edit to `src/content/posts/what-is-a-token.mdx` (removal of one sentence after the vocabulary-size sentence, "Each size is the highest id plus one, ...") was preserved by editing in place and landed in the migration commit b736960.

## Verification

All passed:

- `npx vitest run`: 19 files, 818 tests
- `npm run check` (0 errors), `npm run check:svelte` (0 errors, 0 warnings)
- `npm run build`, `npm run check:dist` (OK, 38 URLs), `npm run check:deps` (OK, plus `--self-test`)
- Built post: 35 `span.cites` citations, 26 `csl-entry` blocks, no literal `[@`
- `npm run test:e2e -- e2e/post.spec.ts e2e/languages.spec.ts --project=chromium`: 37 passed, including (g2), which checks that each visible cite number equals the 1-based position of the entry its link targets
- The three components are gone from disk and from `PostLayout.astro`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Bibliography rendering of two entries**
- **Found during:** Task 3, build inspection
- **Issue:** the `arXiv:2010.02804` journal field lost its dot (rendered `arXiv:201002804`), and the RFC type/number printed as "Report No.: 3629" with no "RFC".
- **Fix:** Mager et al. is now a `@techreport` with institution `arXiv` and number `2010.02804` (renders "Report No.: 2010.02804"); the RFC number moved into the title as "(RFC 3629)" and the `type`/`number` fields were dropped.
- **Files modified:** src/data/references.bib
- **Commit:** b736960

**2. [Process] Plugin test not run red first**
- Task 2 asks for RED before GREEN for `rehypeLinkUrls`. The test file and the plugin were both written before the first test run, so a failing run was not observed. The 5 tests pass and cover the behaviour block.

**3. [Rule 3 - Blocking] Test typing**
- `noUncheckedIndexedAccess` rejected direct indexing in `rehypeLinkUrls.test.ts`; added an `nth()` helper. Commit d12d741.

### Accepted wording changes (D-02)

Entries now read in Vancouver form (for example "Yergeau F." and "[cited 2026 Oct 13]") instead of IEEE; "et al." authors are braced literals such as `{{Aduriz I, et al}}`. Source URLs and access dates are unchanged. Per-entry choices that differ from the old text: the Wikipedia entry has no author and shows "Wikipedia, The Free Encyclopedia" as publisher; the Jurafsky and Martin entry shows the chapters in the title; the Gutenberg entry carries "(translated by C. Garnett)" in the title and dropped "ebook 1399" (it is in the URL); the Creutz entry dropped the DOI text (the URL is the DOI link); the Sennrich 2016 entry dropped the DOI text.

Rendered IDs are lowercased by rehype-citation (`bib-asciiethw`), so the e2e pattern is case-insensitive in effect.

## Known Stubs

None.

## Threat Flags

None. The only new outbound links are the bibliography anchors, https only with `rel="noopener noreferrer"`, checked by e2e (g2) and `check-dist`.

## Notes

- `npm audit` still reports 1 high-severity advisory (the known `http-cache-semantics` build-time dependency from the project notes); not touched.
- rehype-citation prints the Node `punycode` deprecation warning at build and test time (upstream, harmless).

## Self-Check: PASSED

- FOUND: src/data/references.bib, src/plugins/rehypeLinkUrls.mjs, src/plugins/rehypeLinkUrls.test.ts
- MISSING (intended): src/components/prose/Cite.astro, Reference.astro, References.astro
- FOUND commits: d12d741, b736960

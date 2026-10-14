---
phase: 03-harden-release
plan: 03
subsystem: content
tags: [fact-check, references, licences, tokenizer-vocabulary, access-dates]

requires:
  - phase: 03-harden-release
    provides: plan 03-01 history squash and pre-release decisions (03-DECISIONS.md); plan 03-02 licences, README and favicon
provides:
  - 03-FACT-CHECK.md with a verdict for all 26 references, the tokenizer facts, the vocabulary-size derivation and a manual-only list
  - Post 1 corrected where sources differed (GPT-4 size, two citation details, one wording) and every access date refreshed to Oct. 13, 2026
  - NOTICE.md with the upstream BERT licence confirmation and archive status
affects: [03-04 and later release plans (known limitations note, manual checklists), v1.1 posts that reuse the references]

actuals:
  tokens: 6547
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Vocabulary size is stated as highest id plus one (the tiktoken n_vocab rule), the same rule for every tokenizer in the post"
    - "Dates live only in the References list as access dates; none inline (D-19 amended)"

key-files:
  created:
    - .planning/phases/03-harden-release/03-FACT-CHECK.md
  modified:
    - src/content/posts/what-is-a-token.mdx
    - src/content/post-content.test.ts
    - public/tokenizers/NOTICE.md

key-decisions:
  - "GPT-4 tokenizer size printed as 100,277 (highest special-token id 100276 plus one), not 100,257 (which is only the id of the end-of-text token); one added sentence states the rule for all three sizes"
  - "Reference 17 line numbers corrected to 335 and 341 and pinned to commit 03caef2; reference 18 pages corrected to 3955-3964"
  - "Details true but beyond the cited page (ASCII line ends and carriage returns, 'thousands of characters') and the UN reuse terms were left as is and listed for the author"
  - "manifest.json and scripts/check-dist.mjs needed no change: the Hugging Face commits, licences and file hashes match, and no new reference host was added"

requirements-completed: [FOUND-01]

coverage:
  - id: D1
    description: "All 26 references, tokenizer licences and years, vocabulary sizes, UTF-8 share and UN terms re-opened with a recorded verdict in 03-FACT-CHECK.md"
    requirement: FOUND-01
    verification:
      - kind: other
        ref: "bash -c (plan Task 1 verify): reference rows 1-26, required headings, 100,257 and 200,019 present -> FACTCHECK-OK"
        status: pass
    human_judgment: true
    rationale: "Exceptions E4, E5 and E7 (beyond-source details, UN reuse terms) and the manual-only items need the author's decision or a browser"
  - id: D2
    description: "Post 1 corrections applied (GPT-4 size, reference 17 and 18 details, LREC wording) and all 14 access dates refreshed with no inline dates"
    requirement: FOUND-01
    verification:
      - kind: unit
        ref: "src/content/post-content.test.ts (cited-number rule with 100,277; web sources carry the access date Oct. 13, 2026)"
        status: pass
      - kind: other
        ref: "no 'as of <month>' phrase in the post; grep -c accessed= equals 14; npm run check:repo; npm run build; npm run check:dist; node scripts/check-dist.mjs --self-test"
        status: pass
    human_judgment: false
  - id: D3
    description: "NOTICE.md records the dated upstream confirmation of the BERT Apache-2.0 licence and the archived repository"
    verification:
      - kind: unit
        ref: "src/core/tokenizerFiles.test.ts#carries both licence notices that travel with the files"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-10-13
status: complete
plan_head_before: 8510e41c8a657259138b2fdbf6b561314670c6ec
plan_head_after: 120ff5f76e5f6543e07d4188878ca28c7b53e20c
commits: 2
---

# Phase 3 Plan 03: Fact re-verification of Post 1 Summary

**Every source in Post 1 re-opened and dated: the GPT-4 vocabulary size corrected to 100,277, two reference details and one wording fixed, all 14 access dates refreshed to Oct. 13, 2026, and the BERT licence confirmed upstream.**

## Performance

- **Duration:** about 30 min (start time was not captured at launch; estimated from build timestamps)
- **Completed:** 2026-10-13
- **Tasks:** 2
- **Files modified:** 4 (one created)

## Accomplishments

- `03-FACT-CHECK.md` holds a verdict for each of the 26 references (21 ok, 4 changed or tightened as listed below, 1 manual-only; no dead links), the Hugging Face and upstream licence comparison, the vocabulary-size derivation from the raw tiktoken files, the W3Techs share (99.1% on 13 Oct 2026), the six UDHR sentences re-compared with un.org (all match), and the manual-only list.
- Spot-check of the built page (D-20, no new test): 12 of 12 comparison id lists and all 6 languages-table rows match the Rust reference fixture. The existing suite (18 files, 813 tests) passes before and after.
- The post now says GPT-4 has 100,277 and states, in one sentence, that each size is the highest id plus one and that a few ids in the two newer lists are unused.
- All 14 `accessed` values read "Oct. 13, 2026" in the References list. No date was added to the prose.
- `NOTICE.md` records that `google-research/bert` is Apache-2.0 upstream (identical text) and now archived, and that the upstream GPT-2 licence file is unchanged.

## Task Commits

1. **Task 1: Fact re-verification pass** - `4b7d090` (docs)
2. **Task 2: Apply corrections and refresh access dates** - `120ff5f` (fix)

**Plan metadata:** recorded in the docs commit that follows this file.

## Files Created/Modified

- `.planning/phases/03-harden-release/03-FACT-CHECK.md` - verdicts, exceptions for the author, derivations, manual-only list
- `src/content/posts/what-is-a-token.mdx` - corrections and refreshed access dates
- `src/content/post-content.test.ts` - cited figure 100,277; access-date expectation Oct. 13, 2026; comment on the line numbers
- `public/tokenizers/NOTICE.md` - dated upstream confirmation lines

## Exceptions for the author (what changed, what was left)

Fixed (sentence changed):

- **E3** "The tokenizer of GPT-4 has 100,257" is now "has 100,277", followed by "Each size is the highest id plus one, because ids start at 0, and in the two newer lists a few ids are not used by any token." (100,257 is only the id of the end-of-text token in `cl100k_base`; the library's size is 100,277. GPT-2's 50,257 and GPT-4o's 200,019 were already right under that rule.)
- **E1** Reference 18 pages "2650-2661" is now "3955-3964".
- **E2** Reference 17 "lines 373-378" is now "lines 335 and 341 (commit 03caef2, Jul. 24, 2024)".
- **E6** "need details that are specific to each language" is now "include details that are specific to each language" (matches the LREC abstract).

Left as is, listed in 03-FACT-CHECK.md for the author to decide:

- **E4** "such as line ends and carriage returns" (true, but the cited ETHW page only says control codes from Teletype machines).
- **E5** "with thousands of characters" (true; the cited Mojibake article does not say it).
- **E7** The general UN terms of use allow only personal, non-commercial use without redistribution; the OHCHR page that asks for a source link returns 403 to scripts and must be read by hand.

## Decisions Made

See `key-decisions` above. Net effect: one rule for vocabulary sizes across the post, citations that point where a reader will land, and no change to the tokenizer manifest.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] No web-search tools available to the executor**
- **Found during:** Task 1
- **Issue:** The plan says a subagent executor uses WebFetch and WebSearch directly. This executor had only Bash, Read, Write and Edit.
- **Fix:** Fetched every URL with `curl` (statuses recorded), read papers with `pdftotext`, and used the Crossref, GitHub, Hugging Face and W3Techs endpoints as second sources. The poppler `pdftotext` binary came from `nix shell nixpkgs#poppler-utils` (a Nix store path from cache.nixos.org, outside the project; no project dependency or lockfile changed). A few Google-Scholar-style lookups used a search-engine HTML page as a lead only; the facts in the file come from the sources named in each row.
- **Files modified:** none
- **Committed in:** `4b7d090`

**2. [Rule 1 - Bug] Four wrong or loose statements in the post fixed (E1, E2, E3, E6)**
- **Found during:** Task 1 (found), Task 2 (fixed)
- **Issue:** Wrong page range, outdated line numbers, an inconsistent vocabulary figure, and a wording stronger than its source.
- **Fix:** Edited the post and, for the cited-figure rule and the access-date check, the content test (no rule loosened: the number rule still demands a citation; the access-date check is still exact).
- **Files modified:** `src/content/posts/what-is-a-token.mdx`, `src/content/post-content.test.ts`
- **Verification:** `npx vitest run` 813 passed; `npm run check:repo`, `npm run build`, `npm run check:dist` and the check-dist self-test pass; `npm run check` 0 errors.
- **Committed in:** `120ff5f`

---

**Total deviations:** 2 (1 blocking tool gap worked around, 1 bug class fixed as the plan intended)
**Impact on plan:** None on scope. The post grew from 3,228 to 3,263 words, still under the 3,350 ceiling, so the ceiling was not changed.

## Issues Encountered

- Web pages that block scripts (ACM landing page, OHCHR pages, the OpenAI blog) could not be opened; they are in the manual-only list. Reference 13's metadata was confirmed through Crossref and an indexed copy instead.
- The earlier note "lines 373-378" for `learn_bpe.py` could not be reproduced on master; the file is 406 lines and the line is at 335 and 341.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The author should read E4, E5 and E7 in `03-FACT-CHECK.md` and open the manual-only items (OHCHR terms page, Arabic cross-check, ACM DOI page); those belong in the known-limitations note if not done (D-15).
- `/gsd-verify-work` can compare the measured `commits: 2` against the git range recorded above.

## Self-Check: PASSED

- `03-FACT-CHECK.md` found; commits `4b7d090` and `120ff5f` found in `git log`.
- Acceptance criteria re-run: no "as of <month>" phrase; 14 `accessed=`; all vitest files pass; `check:dist` OK and self-test OK; every reference host is already allow-listed; NOTICE.md has the dated BERT line; every exception is fixed or listed as left as is.

---
*Phase: 03-harden-release*
*Completed: 2026-10-13*

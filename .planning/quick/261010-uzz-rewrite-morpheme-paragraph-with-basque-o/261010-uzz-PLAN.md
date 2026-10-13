---
phase: quick-261010-uzz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/content/posts/what-is-a-token.mdx
  - src/content/post-content.test.ts
autonomous: true
requirements: [QUICK-261010-uzz]
estimate:
  tokens: 40000
  raw_tokens: 25000
  tasks: 2
  confidence: low
must_haves:
  truths:
    - "The 'Languages build words in very different ways' paragraph uses only Basque as its example (no Finnish, Turkish)."
    - "Reference 10 (Ramasamy et al. 2012) is gone from the References list and from every Cite."
    - "References are numbered 1..26 with no gaps; every Cite n value points at an existing reference; first-cite order is still 1, 2, 3, ..."
    - "The new paragraph cites Aduriz et al. 2000 as n=10 (formerly 11)."
    - "The user's own uncommitted edits (mdx lines ~18 and ~49, TokenFigure.astro, .planning/milestone.lock) are neither reverted nor committed."
  artifacts:
    - path: "src/content/posts/what-is-a-token.mdx"
      provides: "Rewritten paragraph, 26 renumbered references"
    - path: "src/content/post-content.test.ts"
      provides: "Renumbered reference-number literals and a CITED entry for the figure 135"
  key_links:
    - from: "src/content/post-content.test.ts CITED / readOn / COMPARISON_SLOT_SENTENCE"
      to: "Cite and Reference numbers in the mdx"
      via: "hard-coded reference numbers (must shift by one for old 11..27)"
---

<objective>
Rewrite the morpheme-variety paragraph (mdx line 63) to use only Basque as the example, drop Reference 10 (Ramasamy et al. 2012), and renumber every later reference and Cite consistently.

Purpose: the paragraph is narrower and every claim traces to one verified paper (Aduriz et al. 2000, C00-1001: a single noun generates at least 135 inflected forms; Fig. 2 splits amarengan = ama + aren + gan, "on the mother"; Basque is "strongly agglutinative").
Output: edited what-is-a-token.mdx and post-content.test.ts, one commit containing only this task's hunks.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.claude/CLAUDE.md
@.planning/STATE.md
@src/content/posts/what-is-a-token.mdx
@src/content/post-content.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite the paragraph, drop reference 10, renumber references and cites, update the test literals</name>
  <files>src/content/posts/what-is-a-token.mdx, src/content/post-content.test.ts</files>
  <read_first>
    - src/content/posts/what-is-a-token.mdx (line 63 paragraph; Cite sites on lines 20-139; References block from line 149)
    - src/content/post-content.test.ts (lines ~82-83 COMPARISON_SLOT_SENTENCE; ~538-570 the "access date" and "reads every number" tests)
  </read_first>
  <action>
BEFORE any edit, record the user's uncommitted hunks: run `git diff -U0 -- src/content/posts/what-is-a-token.mdx > $SCRATCH/user-before.patch` (use the session scratchpad dir). They are two single-line hunks (about lines 18 and 49: the "A byte can store" line and the "As many other terms in computer science" line). Do not touch those lines. Do not touch src/components/prose/TokenFigure.astro or .planning/milestone.lock. Use only Edit (no sed/awk/heredocs), per the user's global rule.

Old-to-new mapping: old 10 is deleted; old n (11..27) becomes n-1 (10..26). Old 1..9 are unchanged.

1. mdx line 63: replace the whole paragraph with the following (wording may be lightly polished, but keep Basque as the only language example, keep the 135 figure, the amarengan = ama + aren + gan "on the mother" example, and the Mott, Mager and Creutz sentences intact). Text: Languages build words in very different ways. English adds a few endings, as in "walk", "walks", "walked" and "walking". Basque is called an agglutinative language, because it keeps attaching endings, one after another, to the same word <Cite n={10} />. A single Basque noun can take at least 135 different forms, and one word can say what takes a whole phrase in English: "amarengan" is "ama" (mother) + "aren" (of the) + "gan" (on), which together mean "on the mother" <Cite n={10} />. A tokenizer that had to cut every word into its meaningful parts would have to learn all of these endings for every language. Even the instructions for marking morpheme boundaries by hand, written to work for any language, need details that are specific to each language <Cite n={11} />. Machine learning approaches struggle as well: in one study, for the two languages with very little data, the best model was right less than half of the time <Cite n={12} />. Finding morphemes automatically is a research problem of its own <Cite n={13} />. (Cite 10 here is Aduriz et al., formerly 11; Mott 12 to 11, Mager 13 to 12, Creutz 14 to 13.) Per the task constraints, Finnish and Turkish and the Ramasamy citation do not appear.

2. References block: delete the whole `<Reference n={10} ...>...</Reference>` entry (Ramasamy et al., the 3 lines starting at the aclanthology W12-3903 url). Then renumber the remaining `<Reference n={K} ` opening tags for K = 11 up to 27 to K-1, processing in ASCENDING order of K (11 first) so no new value collides with a not-yet-renumbered one. Each `<Reference n={K} ` string is unique, so no replace_all is needed.

3. Cite sites other than line 63, old to new. First do the array forms with explicit contexts (replace_all where the same string repeats): `n={[15, 16]}` to `n={[14, 15]}`; `n={[16, 7]}` to `n={[15, 7]}`; `n={[21, 23]}` to `n={[20, 22]}`; `n={[23, 24]}` to `n={[22, 23]}` (this string occurs three times: lines 113 twice, 115; use replace_all). Only values above 10 shift; the 7 in [16, 7] stays. Then the single-number cites, `<Cite n={K} />` for K = 16, 17, 18, 19, 20, 21, 22, 25, 26, 27, again in ASCENDING order with replace_all: 16 to 15, 17 to 16, 18 to 17, 19 to 18, 20 to 19, 21 to 20, 22 to 21, 25 to 24, 26 to 25, 27 to 26. (Ascending order plus array forms done first guarantees nothing is renumbered twice.) Cites with n of 1 to 9 stay.

4. src/content/post-content.test.ts: (a) COMPARISON_SLOT_SENTENCE: `<Cite n={26} />` (two occurrences) becomes `<Cite n={25} />` and `<Cite n={27} />` becomes `<Cite n={26} />` (do 26 to 25 first, then 27 to 26). It must stay identical to the mdx line 139 text. (b) "gives every web source an access date" test: `readOn` becomes `{ 9: "Oct. 7, 2026", 24: "Oct. 7, 2026", 25: "Oct. 7, 2026", 26: "Oct. 7, 2026" }` and its comment's numbers become (24), (9), (25, 26). (c) "reads every number" test: add to the CITED map a `"135": ["aclanthology.org/C00-1001"]` entry with a one-line comment (Aduriz et al. 2000: a single noun generates at least 135 inflected forms); change the stale comment "reference 16" next to the 2019 entry to "reference 15". (d) Grep the test file for any other hard-coded reference numbers and shift old 11..27 down by one (none other were found when planning, but confirm with a grep for `Cite n=` and `reference \d+`).

5. Check nothing else carries citation numbers: `src/components/prose/Cite.astro`, `Reference.astro`, `References.astro`, `src/layouts/PostLayout.astro`, e2e/post.spec.ts and e2e/languages.spec.ts read numbers dynamically (planning grep found no hard-coded reference numbers); re-run a grep for `#ref-` and `ref-[0-9]` across src and e2e to confirm, and edit only if a literal appears. The word budget is not an issue (post measures about 3287 words against a ceiling of 3350; the rewrite plus removed reference nets out lower or near equal), but run the test to confirm.
  </action>
  <verify>
    <automated>npx vitest run src/content/post-content.test.ts</automated>
  </verify>
  <done>
Vitest passes for post-content.test.ts, including: references numbered 1..N contiguous, every cite has a reference and every reference is cited, first-cite order, number-provenance (135 cited to C00-1001), access dates, and the comparison sentence equality. `grep -c '<Reference n=' src/content/posts/what-is-a-token.mdx` shows 26, the string "Ramasamy" no longer appears in the mdx, and a grep for "Finnish\|Turkish" in the post article finds nothing in the rewritten paragraph. The two user hunks (lines ~18 and ~49) are byte-identical to before.
  </done>
</task>

<task type="auto">
  <name>Task 2: Cross-check cite coverage and commit only this task's hunks</name>
  <files>src/content/posts/what-is-a-token.mdx, src/content/post-content.test.ts</files>
  <read_first>
    - $SCRATCH/user-before.patch (the user's hunks recorded in Task 1)
  </read_first>
  <action>
Cross-check (read-only): list every `Cite n={...}` value in the mdx (e.g. `grep -o 'Cite n={[^}]*}' src/content/posts/what-is-a-token.mdx | sort -u`) and confirm every number is within 1..26, that all 26 are present across cites, and that the Reference tags are n=1..26 in order. Run the fuller `npx vitest run` to catch any other test touching the post (do not run Playwright e2e unless a build is quickly available; e2e specs read numbers dynamically).

Commit with only the executor's own changes, leaving the user's uncommitted work in the working tree:
1. `git diff -U0 -- src/content/posts/what-is-a-token.mdx > $SCRATCH/full.patch`.
2. Remove from full.patch the two hunks that also appear in $SCRATCH/user-before.patch (identical `@@ -L +L @@` headers at about lines 18 and 49 and their -/+ lines). Because of -U0 the hunks are separate, and this task's hunks all start at line 63 or later (the removed Reference shifts only later line numbers, the hunks' own headers stay valid since the user hunks are line-for-line replacements that do not shift numbering). Keep the file header lines.
3. Stage them: `git apply --cached --unidiff-zero $SCRATCH/own.patch`; then `git add src/content/post-content.test.ts` (that file has no user edits).
4. Verify staging: `git diff --cached --stat` must list only the mdx and the test; `git diff --cached -- src/content/posts/what-is-a-token.mdx` must not contain "A byte can store" or "As many other terms"; `git status --short` must still show ` M src/components/prose/TokenFigure.astro`, the mdx as partially staged (`MM`), and `?? .planning/milestone.lock` untouched.
5. Commit: `docs(quick-261010-uzz): rewrite morpheme paragraph around Basque, drop reference 10 and renumber` with the Co-Authored-By line from the session attribution. If the apply fails, fall back to `git add -p` style staging by hand; never use `git add` on the whole mdx, `git checkout`, `git stash` or `git restore` on it.
  </action>
  <verify>
    <automated>npx vitest run && git log -1 --stat | grep -c "what-is-a-token.mdx" && git diff --quiet -- src/components/prose/TokenFigure.astro; test $? -eq 1</automated>
  </verify>
  <done>
Full Vitest suite passes; one commit exists containing the mdx (this task's hunks only) and the test file; `git diff -- src/content/posts/what-is-a-token.mdx` afterwards still shows exactly the user's two original hunks, and TokenFigure.astro and milestone.lock remain uncommitted and unmodified by the executor.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| none | Static prose and test-literal edits; no new inputs, links or code paths |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-01 | Tampering | user's uncommitted mdx and TokenFigure edits | medium | mitigate | hunk-level staging via `git apply --cached`; never stash/checkout/restore; verify with `git diff --cached` and post-commit `git diff` |
| T-quick-02 | Repudiation | citation accuracy (135 forms, amarengan split) | low | mitigate | claims taken from the verified Aduriz et al. 2000 paper; test CITED map ties "135" to the C00-1001 URL |
| T-quick-SC | Tampering | npm/pip/cargo installs | low | accept | no packages are installed |
</threat_model>

<verification>
- `npx vitest run src/content/post-content.test.ts` and `npx vitest run` pass.
- Cite values all in 1..26, every reference cited, first-cite order 1..26.
- Only this task's hunks are in the commit.
</verification>

<success_criteria>
Paragraph is Basque-only with Aduriz cited as 10; Ramasamy reference and its cite removed; later references and all Cite values (including arrays) shifted down by one; tests green; user's uncommitted work preserved.
</success_criteria>

<output>
Create `.planning/quick/261010-uzz-rewrite-morpheme-paragraph-with-basque-o/261010-uzz-SUMMARY.md` when done
</output>

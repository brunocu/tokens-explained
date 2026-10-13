---
phase: quick-261011-uww
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/check-dist.mjs
  - .planning/phases/02.2-rework-widgets/02.2-CONTEXT.md
  - .planning/phases/02.2-rework-widgets/02.2-UI-SPEC.md
  - .planning/ROADMAP.md
  - .planning/REQUIREMENTS.md
  - .planning/STATE.md
autonomous: true
requirements: []
must_haves:
  truths:
    - "npm run build && npm run check:dist passes on the built site (no stale data-languages-text / data-six-texts / data-six-text checks)"
    - "check-dist self-test still proves every widget check can fail, including the new table-sentence check"
    - "D-08 amendment (Show token IDs switch, off by default) is recorded where a verifier will read it: CONTEXT, ROADMAP goal, and UI-SPEC if contradicted"
    - "TOK-02 text says bytes, characters and tokens; FOUND-04 note records the accessible token list from quick 261011-unh"
    - "STATE.md says automated gates are green and Phase 2.2 awaits re-verification; ROADMAP does not mark 2.2 complete"
  artifacts:
    - path: "scripts/check-dist.mjs"
      provides: "checkWidgetsHtml on current languages-widget hooks + matching self-test fixture"
  key_links:
    - from: "scripts/check-dist.mjs checkWidgetsHtml"
      to: "src/components/LanguagesWidget.svelte hooks (data-languages-table, data-lang-row, data-table-sentence)"
      via: "countAttr on built dist/what-is-a-token/index.html"
---

<objective>
Close the remaining Phase 2.2 verification gaps: fix the stale check-dist assertions, record the author-directed amendments (D-08, TOK-02, FOUND-04) so a verifier does not re-flag them, and refresh STATE.md.

Purpose: 02.2-VERIFICATION.md predates later fixes; what remains is a failing `check:dist` and documentation that contradicts shipped code.
Output: updated scripts/check-dist.mjs and planning docs. No src/ behaviour changes.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@scripts/check-dist.mjs
@src/components/LanguagesWidget.svelte
@src/components/Playground.svelte
@.planning/phases/02.2-rework-widgets/02.2-VERIFICATION.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update check-dist widget checks and self-test to the languages widget's current hooks</name>
  <files>scripts/check-dist.mjs</files>
  <action>
In `checkWidgetsHtml` (around lines 211-227), remove the three stale checks: `data-languages-text` count, `data-six-texts` count, and the `data-six-text` count of 6. Keep the `WIDGET_ROOT_HOOKS` loop, the `data-chip` check, the `data-lang-row` == 6 check, the checked-English-radio check (the built page still has six `name="languages-inside"` radios with English checked, confirm with `radioIsChecked`), and the removed-control-strings loop. Add: `data-languages-table` count must be >= 1 (error text names `data-languages-table`), and `data-table-sentence` count must be exactly 6 (error text like `post page has N data-table-sentence cells, expected 6`). Update the doc comment above the function (lines ~205-206, which mention the English drill-down and the list of six texts) to describe the current hooks.

In the self-test `widgetsFixture` (around lines 310-340): drop the `languagesText`, `sixTextsDetails` and `sixTexts` options and their fixture lines; add options `table = true` and `sentences = 6`. Emit `<table data-languages-table></table>` only when `table` is true, and put one `data-table-sentence` cell inside each `data-lang-row` row (rows built from the `rows` option, so five rows gives five sentences by default) while `sentences` overrides the sentence-cell count independently. Keep the English/Spanish radios. Update the `widgetErrors` calls: delete the English drill-down text, six-texts details, zero texts and seven texts cases; add "a page without the languages table" (`table: false`, expects `/data-languages-table/`) and "a page with five table sentences" plus "a page with seven table sentences" (expects `/5 data-table-sentence/` and `/7 data-table-sentence/`). Note the existing case `a page with five language rows` passes `rows: 5`; make sure that fixture still fails ONLY because of the row-count error being matched (the matcher only requires the error to be present, which is fine). Keep every other self-test case, including the "only languages hook is the table" root case. Do not add any literal that the removed-control check negative-greps for.

Do not touch anything under src/ or e2e/. Edit with the Edit tool only.
  </action>
  <verify>
    <automated>npm run build && npm run check:dist</automated>
  </verify>
  <done>`npm run build && npm run check:dist` exits 0 and prints "check-dist self-test OK"; `grep -c "data-languages-text\|data-six-text" scripts/check-dist.mjs` prints 0; every new check has a failing self-test fixture.</done>
</task>

<task type="auto">
  <name>Task 2: Record author-directed amendments D-08, TOK-02 and the FOUND-04 note</name>
  <files>.planning/phases/02.2-rework-widgets/02.2-CONTEXT.md, .planning/phases/02.2-rework-widgets/02.2-UI-SPEC.md, .planning/ROADMAP.md, .planning/REQUIREMENTS.md</files>
  <action>
First read `src/components/Playground.svelte` (the `showIds` state around line 53, the `Show token IDs` switch with `data-show-ids` around line 208, the `stats` block lines ~187-200, `describeCounts(...)` around line 107, and the `TokenDisplay stacked={showIds}` usage) and word everything below to match it exactly.

1. `02.2-CONTEXT.md`, D-08 (line ~30): keep the original text for history but append an explicit **Amended by the author (2026-10-11), overrides the text above** note stating: the playground has a "Show token IDs" switch (`data-show-ids`), off by default; with it off, chips are text only on one line; with it on, chips are text-over-ID stacked chips (the two-line chip). The text/IDs toggle is therefore back, which satisfies TOK-03 again. The "Peek under the hood" toggle and whole-string byte view stay removed. Also state: the Words stat was removed by the author; the stats are Bytes, Characters, Tokens. Add a line that a verifier must not flag the switch, the one-line default chips, or the missing Words stat as deviations from D-08 or D-09. Also update the line ~66 reference to "D-04 and D-08 (peek and IDs toggles, now removed)" only if it would mislead (the Phase 1 IDs toggle is back as the switch); otherwise leave it.
2. `02.2-UI-SPEC.md`: update only what contradicts. Line ~238 ("Removed: ... the Token IDs and Token text strings"), the removed-copy row ~391 and the verification hook ~451 ("no text Token IDs") already coexist with the switch label "Show token IDs" (case differs; the `Token IDs` check-dist string stays valid), so edit them only if their wording says IDs are always shown or that no IDs control exists. The "Shared Chip Format" section (line ~198) says the stack form is the single view: add one sentence that per the D-08 amendment the stacked form applies when "Show token IDs" is on, one-line chips otherwise. Line ~531 already describes the switch; leave it.
3. `ROADMAP.md`, Phase 02.2 **Goal** (line ~107): replace "and the playground showing token text over its ID in one view" with the amended wording: the playground showing token text as chips, with a "Show token IDs" switch (off by default) that stacks each token's ID under its text. Append "(D-08 amended by the author 2026-10-11)". Do NOT mark Phase 2.2 complete and do not change the progress table or plan checkboxes.
4. `REQUIREMENTS.md`, TOK-02 (line ~23): change to "Reader can see byte, character and token counts for their text" and append a short parenthetical: word count removed from the display by the author (Phase 2.2); words is still computed for the live screen-reader announcement. Leave TOK-03 text as is (its toggle is back); add nothing to the traceability table beyond what is needed. On FOUND-04 (line ~15) append a note: quick 261011-unh restored a text alternative for the comparison, the languages drill-down and the prose figures through an accessible token list (`role=list` / `listitem` with spoken labels); the playground keeps its TokenTable.

Edit tool only; no heredocs or sed.
  </action>
  <verify>
    <automated>grep -c "Show token IDs" .planning/phases/02.2-rework-widgets/02.2-CONTEXT.md .planning/ROADMAP.md && grep -n "TOK-02" .planning/REQUIREMENTS.md | grep -vi "word count" | grep -c "byte" && grep -c "261011-unh" .planning/REQUIREMENTS.md</automated>
  </verify>
  <done>CONTEXT D-08 carries an explicit override note; ROADMAP 2.2 goal describes the switch and is still unchecked as complete; TOK-02 says bytes, characters and tokens; FOUND-04 carries the 261011-unh note; UI-SPEC has no remaining contradiction.</done>
</task>

<task type="auto">
  <name>Task 3: Refresh stale Phase 2.2 fields in STATE.md, then run all gates</name>
  <files>.planning/STATE.md</files>
  <action>
Edit `.planning/STATE.md` (Edit tool). Frontmatter: keep it valid YAML with the same keys. Set `status` to `awaiting_reverification` (if a status value is validated elsewhere, check `grep -rn "status:" ~/.claude/gsd-core` is unnecessary: use `verifying`, which is already the current value, unless it contradicts; the key requirement is that the prose below says it). Set `stopped_at` to "Phase 2.2 automated gates green (npm test, build, check:dist, three-engine e2e); awaiting re-verification and the human gate", `last_activity` to `2026-10-11`, and `last_activity_desc` to "Closed remaining Phase 2.2 verification gaps (check-dist hooks, D-08/TOK-02/FOUND-04 amendments); awaiting re-verification". Do not touch `progress`, `state_head` or counters. In the body: change `Phase: 2.2 (rework widgets) — EXECUTING` to `... — AWAITING RE-VERIFICATION`, set Status to "Automated gates green; phase awaits re-verification (VERIFICATION.md predates later fixes)", update `Last activity` to mention quick task 261011-uww, and update the `Stopped at:` line in Session Continuity to match the frontmatter. Add a quick-tasks table row for 261011-uww next to the 261011-unh row (copy its column layout; leave the commit column "—" if unknown). Do not mark the phase complete anywhere (ROADMAP untouched in this task).

Only claim "gates green" after running them: run `npm test`, `npm run build`, `npm run check:dist`. Skip Playwright unless any e2e file was changed (none should be). If a gate fails for a reason unrelated to this plan, record the actual state truthfully in STATE.md instead of "green".
  </action>
  <verify>
    <automated>npm test && npm run build && npm run check:dist && head -12 .planning/STATE.md</automated>
  </verify>
  <done>STATE.md frontmatter parses, says automated gates are green and the phase awaits re-verification; body Position, Last activity and Session Continuity agree; all three gates exit 0; ROADMAP still shows Phase 2.2 not complete.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| none | Build-time script and planning docs only; no runtime input, no new dependencies |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-uww-01 | Tampering | scripts/check-dist.mjs | low | mitigate | Self-test fixtures prove each check can fail, so the gate cannot silently pass |
| T-uww-SC | Tampering | package installs | low | accept | No packages are installed in this plan |
</threat_model>

<verification>
`npm test`, `npm run build`, `npm run check:dist` all exit 0. `git diff --stat` shows no changes under src/ or e2e/.
</verification>

<success_criteria>
check:dist passes on current hooks with a failing fixture per check; D-08, TOK-02 and FOUND-04 amendments are recorded explicitly; STATE.md reflects green automated gates and pending re-verification; ROADMAP does not mark Phase 2.2 complete.
</success_criteria>

<output>
Create `.planning/quick/261011-uww-close-remaining-phase-2-2-verification-g/261011-uww-SUMMARY.md` when done
</output>

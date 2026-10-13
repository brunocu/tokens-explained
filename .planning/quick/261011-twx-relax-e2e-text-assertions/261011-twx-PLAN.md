---
phase: quick-261011-twx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - e2e/comparison.spec.ts
  - e2e/comparison-load.spec.ts
  - e2e/island-lifecycle.spec.ts
  - e2e/controls.spec.ts
  - e2e/languages.spec.ts
  - e2e/states.spec.ts
  - e2e/stepper.spec.ts
  - e2e/a11y-phase2.spec.ts
  - e2e/resilience.spec.ts
  - e2e/frames.spec.ts
  - e2e/post.spec.ts
  - e2e/playground.spec.ts
  - e2e/playground-load.spec.ts
  - e2e/widget-layout.spec.ts
  - e2e/widget-layout.helpers.ts
  - e2e/privacy.spec.ts
  - e2e/a11y.spec.ts
  - e2e/smoke.spec.ts
  - e2e/phone-width.secondary.spec.ts
  - src/components/**/*.svelte
  - src/content/**/*.mdx
autonomous: true
requirements: [QUICK-261011-twx]

estimate:
  tokens: 180000
  raw_tokens: 120000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Editing prose or UI copy (headings, captions, notes, error/limit/no-JS messages, stepper explanations) no longer breaks any Playwright test"
    - "Tests still fail when behavior breaks: counts, row counts, byte hex, [UNK] counts, live-region announce format, fixture-driven values"
    - "Message and note elements (no-JS, error, limit, failed, note) are asserted for visibility / non-emptiness only"
    - "The full chromium Playwright suite is green after a fresh build"
  artifacts:
    - path: "e2e/*.spec.ts"
      provides: "Specs whose locators use role / data-* hook / structure and whose copy assertions are relaxed"
  key_links:
    - from: "e2e/*.spec.ts"
      to: "src/components/*.svelte and src/content/**/*.mdx"
      via: "new data-* hooks added where no stable hook existed"
---

<objective>
Relax the Playwright e2e assertions so prose and UI copy can be edited freely without syncing tests.

Purpose: Commit bb9c053 reworked widgets and post text and forced a large test sync; the owner wants copy edits to be free.
Output: Updated e2e specs (and minimal data-* hooks in src components or MDX where no stable hook exists), no unused constants or imports left behind, chromium suite green.

Locked decisions (user, not to be revisited):
1. Select elements by role, data-* hook, or structure, never by prose copy. Known offenders (line numbers are pre-edit and approximate): comparison.spec.ts around 238-242 (heading name and two hasText filters), languages.spec.ts around 156-157 (caption wording), states.spec.ts around 14-20 (summary, caption, header wording). Add data-* hooks to src components or MDX where no stable hook exists.
2. No-JS, error, limit, failed, and note messages (the no-JS notes, `[data-msg="failed"]`, `[data-msg="loading"]`, `[data-limit]`, `[data-tokenizer-error]`, `[data-compare-error]`, `[data-compare-failure]`, `[data-note]`, `[data-bert-pending]`, `.island-nojs`, NOTE_START, LANGUAGES_NOTE, FAILED_COPY, BERT_ERROR, GPT2_ERROR): assert VISIBILITY ONLY (toBeVisible, or not.toBeEmpty when the element is in the DOM but visually hidden). Never wording.
3. KEEP exact text where it is behavior: computed counts, row counts, byte hex (such as F0 9F), [UNK] counts, the live-region announce string format (a regex such as /\d+ tokens?, .../ is fine), fixture-driven values (sentenceOf, nameOf, DEFAULT_TEXT, EXAMPLES labels).
4. NO content-guard or safety-net test. No new framework.

Scope: e2e/*.spec.ts and e2e/widget-layout.helpers.ts (about 300 literal-copy assertions; heaviest are stepper, comparison-load, languages, post, states, playground, comparison, widget-layout, frames). Unit tests (vitest) are out of scope unless they import a constant that gets removed; src/core/compare/notes.test.ts imports from src/core/compare/notes.ts, so do NOT delete exports from src, only drop the e2e imports that become unused.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@playwright.config.ts
@e2e/helpers.ts
@e2e/widget-layout.helpers.ts

Facts about the repo:
- e2e/ is excluded from tsconfig.json, so `npm run check` does not cover it. Typecheck e2e with an ad hoc tsc invocation (see Task 3).
- Playwright serves `astro preview` from the built output, so ANY change under src/ (new data-* hooks) requires `npm run build` before the e2e run. Per package.json: `npm run build`, then `npm run test:e2e` (which runs scripts/check-env.mjs --playwright first). Run commands inside the dev shell: `nix develop --command <cmd>` (scripts/check-env.mjs requires Node 24 and the PLAYWRIGHT_* variables). Chromium only for this task: add `--project=chromium`.
- Specs already use many data-* hooks (`[data-row-count]`, `[data-stat-value]`, `[data-step-status]`, `[data-why]`, `[data-legend]`, `[data-note]`, `[data-msg]`, ...). Prefer the existing hook; add a new one only if none exists.
- Project policy: use Edit/Write for file changes, not sed or scripted rewrites.

Classification rule to apply to every assertion that touches text (toHaveText, toContainText, getByText, getByRole name, hasText, toMatch/toContain on textContent):
- COPY (relax): wording an author would edit. Headings, summaries, captions, table header labels, button labels, legends, notes, explanations ("why" text), tooltips, privacy lines, no-JS lines, loading/failed/error/limit lines, post prose, reference text.
- BEHAVIOR (keep): numbers computed from the tokenizer or trainer, row counts, byte hex, [UNK] counts, announce-string shape, fixture/example-driven strings, ARIA state attributes.
- Mixed (copy sentence wrapping a computed number, for example a sentence containing "49 values" or "seen 6 times"): keep only the number with a loose match (a regex or toContainText of the bare number) and drop the surrounding sentence. For "Step N of 14: <name>" statuses keep the N and total with a regex anchored on the prefix, drop the stage name.
- Replacing a copy locator: use getByRole with level only (no name), a data-* hook, :nth-of-type / structure, or an `id`. Where several same-role elements exist, add a hook such as data-section="tokenizer-demo" to the heading or section in the MDX / component rather than keep the name.
- Removing a copy assertion entirely is acceptable only when a structural/visibility assertion on the same element remains (toBeVisible, toHaveCount, not.toBeEmpty); do not leave a test with zero assertions.
- Do not weaken a behavior assertion to make the suite pass. If a test goes red after relaxing, the relaxation was wrong or the hook is wrong; fix that.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Relax comparison, controls and island-lifecycle specs (and the shared constants they use)</name>
  <files>e2e/comparison.spec.ts, e2e/comparison-load.spec.ts, e2e/island-lifecycle.spec.ts, e2e/controls.spec.ts, src/components/**/*.svelte, src/content/**/*.mdx</files>
  <action>
Audit every text-bearing assertion in these four specs and apply the classification rule from the context block, per decisions 1-4.

comparison.spec.ts: replace the heading-name, not-contain-title and paragraph hasText locators (around lines 238-242) with structural or data-* hooks (add a hook to the MDX section or heading in src/content only if no stable hook exists; keep the intent: the comparison section exists, is an h2, and sits before/near the widget). Relax the no-JS line, failed line, the "Try your own text" heading-count check, and the load-button "BERT"/"GPT-2" substring checks (around 232-233) to visibility or structure; if that check's intent is "button targets BERT not GPT-2", use a data attribute (for example data-load-target) if one is cheap to add, else assert only that the button is visible. NOTE_START and UNK_SENTENCE assertions become visibility of [data-note] / [data-legend]. Keep announce-string assertions and all row-count assertions.

comparison-load.spec.ts (46 text assertions): keep liveCount, countOf, DEFAULT_TEXT and announcement-shape assertions. Relax to visibility only: BERT_ERROR, GPT2_ERROR, the "could not be downloaded" lines, [data-bert-pending], [data-compare-failure], [data-limit], the empty-state title/body, the loading status line, the "BERT is loaded" announce (the data-announce text there is copy; assert not.toBeEmpty after load and toHaveText("") before), the tokenizer-live "ready" line (not.toBeEmpty), button labels such as the "Try again" and Load labels (assert visible/enabled; keep the size number only if it is the computed BERT_SIZE, as a regex on the number), the legend sentences, the input label and the privacy line. Where a statement like toHaveText("Load BERT (about 0.2 MB)") duplicates a BERT_SIZE-driven one, drop the hard-coded duplicate and keep a single numeric check.

island-lifecycle.spec.ts: loading/failed message and FAILED_COPY become visibility; "Reload page" button and the [data-why] raw-text sentence become visibility (use getByRole("button") / existing hooks).

controls.spec.ts: one match; keep fixture-driven EXAMPLES labels, relax anything that is wording.

Remove any constants, helper functions or imports in these files that are no longer referenced (NOTE_START, UNK_SENTENCE, FAILED_COPY, BERT_ERROR, GPT2_ERROR, GPT2_ONLY_ANNOUNCEMENT and similar), but only remove an export from src/ if nothing in src (including *.test.ts) uses it: never delete from src/core/compare/notes.ts or other src modules; only the e2e imports.

Add a data-* hook in src only when a locator genuinely has no stable alternative; keep each hook minimal (one attribute, no markup restructure, no behavior change). Record every added hook (file, attribute) for the SUMMARY.
  </action>
  <verify>
    <automated>nix develop --command npm run build && nix develop --command npx playwright test --project=chromium e2e/comparison.spec.ts e2e/comparison-load.spec.ts e2e/island-lifecycle.spec.ts e2e/controls.spec.ts</automated>
  </verify>
  <done>The four specs pass on chromium; none of them selects an element by prose copy or asserts note/error/limit/failed/no-JS wording; computed counts, row counts, announce format and fixture-driven values are still asserted; no unused constants or imports remain in them.</done>
</task>

<task type="auto">
  <name>Task 2: Relax languages, states, stepper, a11y-phase2, resilience and frames specs</name>
  <files>e2e/languages.spec.ts, e2e/states.spec.ts, e2e/stepper.spec.ts, e2e/a11y-phase2.spec.ts, e2e/resilience.spec.ts, e2e/frames.spec.ts, src/components/**/*.svelte</files>
  <action>
Apply the classification rule from the context block to every text assertion in these six specs, per decisions 1-4.

languages.spec.ts: relax the caption wording checks (around 116 and 156-158) to the caption being visible plus the link located by role link with no name filter (or by href to the UDHR source if the href is stable and is data, not copy); relax table header labels (around 115) to header count (toHaveCount(5)) because the labels are copy; relax the "Look inside" legend, the loading/failed lines, "Reload page" and the no-JS line to visibility; LANGUAGES_NOTE becomes visibility of [data-note]; UNK_SENTENCE becomes visibility of [data-legend]. KEEP `${unkOf(...)} of these are [UNK]` only as the number (regex on the digits), sentenceOf/nameOf assertions, row counts and the announce-shape assertions.

states.spec.ts: relax summary text, caption text, header labels (around lines 14-20) to structure (details/summary present, table present, header count 4); keep the "Bytes 1 to 2 of 4 of <emoji>" assertions only if they are computed token display strings tied to EMOJI (they are behavior: the partial-character display), keep F0 9F / 99 82 hex, keep stat values and the live-region regex formats. The empty-table "No tokens yet." check (around 37 and 42) becomes row-count / data hook based (for example a single placeholder row versus real rows) if a hook exists, otherwise assert the row count only. The 1-character-split live message, limit line, failed message, no-JS note and tokenizer-error become visibility only (decision 2); keep the zero stat values after tokenizer error.

stepper.spec.ts (55 assertions, heaviest): [data-why], [data-next-merge] h3/p, status stage names, pair-table headers, "Merged"/"Tied" outcome labels and the "raw text" sentence are copy. Convert: step status to a regex anchored on "Step N of 14" (and the merge ordinal where computed); outcome cells to the data-outcome attribute on the row (already present as data-outcome) rather than label text; pair-table headers to a count; why/next-merge sentences to not.toBeEmpty or to the bare computed number (49, 256, 6, 99, 116, the pair "a + t" and new id 256 are trainer outputs: assert them as bare tokens, not as the surrounding sentence). Keep [data-spoken] text only if it is the fixed training corpus sentence (fixture-driven); otherwise assert it equals the source corpus constant from the page/fixture if one is importable. Keep the negative check that tie-break wording does not mention certain rules only if rewritten as behavior, otherwise drop it (it is a pure wording guard, and decision 4 forbids content guards).

a11y-phase2.spec.ts: keep the "Step ${n} of 14" regex prefix, relax the legend sentence at around line 115 to visibility, keep language label clicks (fixture-driven).

resilience.spec.ts: "No tokens yet." and noteText comparisons become row-count / visibility; keep character counts and the corpus-driven firstRow value if it is token data (fixture-driven).

frames.spec.ts: almost all behavior (stat values, chip text, hex regex): audit and change only what is prose.

Remove any constants/imports/helpers made unused (status(), STAGES, NOTE strings, and similar). Add minimal data-* hooks in src/components only when a locator has no stable alternative; record each (file, attribute) for the SUMMARY.
  </action>
  <verify>
    <automated>nix develop --command npm run build && nix develop --command npx playwright test --project=chromium e2e/languages.spec.ts e2e/states.spec.ts e2e/stepper.spec.ts e2e/a11y-phase2.spec.ts e2e/resilience.spec.ts e2e/frames.spec.ts</automated>
  </verify>
  <done>The six specs pass on chromium; no selector depends on prose; note/error/limit/failed/loading/no-JS elements are asserted for visibility only; stepper keeps step numbers and trainer outputs but not explanatory sentences; no unused constants or imports remain in them.</done>
</task>

<task type="auto">
  <name>Task 3: Relax post, playground, widget-layout and remaining specs; typecheck; full chromium run</name>
  <files>e2e/post.spec.ts, e2e/playground.spec.ts, e2e/playground-load.spec.ts, e2e/widget-layout.spec.ts, e2e/widget-layout.helpers.ts, e2e/privacy.spec.ts, e2e/a11y.spec.ts, e2e/smoke.spec.ts, e2e/phone-width.secondary.spec.ts, src/content/**/*.mdx, src/components/**/*.svelte</files>
  <action>
Apply the classification rule from the context block to the remaining specs, per decisions 1-4.

post.spec.ts (27 text assertions, mostly post prose): the h1 title checks become "exactly one h1 is visible" (toHaveCount(1) plus toBeVisible), unless the same title is fixture-driven. Section headings used by the vertical-order and layout tests ("A real tokenizer" heading, "References" heading, the "Three things..." paragraph, the "The demo below gives..." paragraph, "GPT-2 is an older tokenizer" paragraph) must be located by a data-* hook or role/level/structure instead of wording: add hooks such as data-section on the relevant MDX headings/paragraphs, or use ol.references / h2 nth structure. All the prose sentence checks (around lines 177-298: accessed date, "A token is a small piece...", emoji bytes sentence, rare words sentence, three-ways sentence, newer models sentence, vocabulary sentence, blockquote text, translation credit, mixed-length sentence, tie-break sentence) are copy: remove them, EXCEPT keep numbers that are trainer outputs which the post states (266 entries, 49 to 20 tokens) only if they can be asserted as the bare numbers against a locator with a stable hook; otherwise delete (the trainer values are covered by vitest). The first-cell ".ch"/".num" H / 72 check is behavior (keep). Keep the "no section-sign character in main" check only if it is a behavior guard on rendering (a stray markup artifact); it is not a copy assertion, so leave it unless it relies on removed wording.

playground.spec.ts / playground-load.spec.ts: keep chip text, token counts, IDs, DEFAULT_TEXT, EXAMPLES-driven strings; relax button/label/heading wording, loading/ready/failed lines (visibility; for the tokenizer-live region keep toHaveText("") before ready and not.toBeEmpty after), no-JS notes.

widget-layout.spec.ts and widget-layout.helpers.ts: the widget `name` strings in the helper table (aria-label style names) are copy; replace name-based role lookups with the root data-* selector already in the table (root: "[data-playground]" and so on) and drop the name field if it is no longer used. Relax any other wording checks; keep geometry, count and bounding-box assertions, which are behavior.

privacy.spec.ts, a11y.spec.ts, smoke.spec.ts, phone-width.secondary.spec.ts: relax only wording assertions (the example buttons located by hasText: label are EXAMPLES fixture-driven: keep).

Then finish the whole task:
1. Grep e2e for leftover unused imports/constants and remove them (a quick way: run tsc below with noUnusedLocals).
2. Typecheck e2e (not covered by tsconfig): run `nix develop --command npx tsc --noEmit --strict --noUnusedLocals --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --resolveJsonModule --skipLibCheck e2e/*.ts`. Pre-existing unrelated errors (if any, for example from the src imports) may be recorded in the SUMMARY, but there must be no new unused-locals errors in e2e and no new type errors caused by this change. Also run `nix develop --command npm run check` and `nix develop --command npm test` (vitest) to prove src hooks and retained exports did not break anything.
3. Rebuild and run the entire chromium e2e suite and confirm green.
4. Write the SUMMARY: list of src hooks added (file, attribute), count of assertions relaxed per spec file, and any assertion deliberately kept because it is behavior but looked like copy.
  </action>
  <verify>
    <automated>nix develop --command npm run build && nix develop --command npm run check && nix develop --command npm test && nix develop --command npx playwright test --project=chromium</automated>
  </verify>
  <done>The full chromium Playwright suite is green after a fresh build; astro check and vitest are green; e2e typechecks with no unused locals; no spec selects by prose copy; a final grep of e2e for the offenders named in the locked decisions returns nothing (see phase verification).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| test code -> built site | Test-only changes plus inert data-* attributes in src; no runtime behavior, input handling or network surface changes |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-01 | Tampering | e2e assertions weakened beyond copy, hiding real regressions | medium | mitigate | Classification rule keeps all computed counts, hex, [UNK] counts, announce shapes and fixture values; every removed copy assertion must leave a visibility or structure assertion on the same element |
| T-quick-02 | Information disclosure | New data-* hooks in src | low | accept | Static presentational attributes, no data exposed |
| T-quick-SC | Tampering | npm/pip/cargo installs | high | accept | No packages installed in this task (no new framework, per decision 4) |
</threat_model>

<verification>
- `nix develop --command npm run build` then `nix develop --command npx playwright test --project=chromium` is green.
- `nix develop --command npm run check` and `nix develop --command npm test` are green.
- Offender grep returns nothing: `grep -nE "How does GPT-2 compare|Here it sits next to BERT|Typing needs JavaScript|Switching examples needs|View tokens as a table|Tokens in your text|official translations from the United Nations|Choosing another language needs|Getting the pieces view ready" e2e/*.ts`
- `grep -nE "NOTE_START|LANGUAGES_NOTE|FAILED_COPY|BERT_ERROR|GPT2_ERROR|UNK_SENTENCE" e2e/*.ts` shows no leftover import that is not also used in an assertion (imports of removed uses are deleted).
- Behavior kept: `grep -c "data-row-count\|data-stat-value" e2e/comparison.spec.ts e2e/states.spec.ts` is non-zero.
</verification>

<success_criteria>
Prose and UI copy in src can be edited without touching e2e specs; all computed/behavioral assertions remain; the chromium suite, astro check and vitest are green; no content-guard test or new framework was added.
</success_criteria>

<output>
Create `.planning/quick/261011-twx-relax-e2e-text-assertions/261011-twx-SUMMARY.md` when done
</output>

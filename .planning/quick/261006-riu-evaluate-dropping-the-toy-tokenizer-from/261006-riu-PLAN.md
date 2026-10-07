---
phase: quick-261006-riu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-EVALUATION.md
autonomous: true
requirements: [QUICK-261006-riu]

estimate:
  tokens: 60000
  raw_tokens: 30000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A written evaluation exists that gives a clear recommend / not-recommend verdict on dropping the toy tokenizer in favour of GPT-2 for examples and playground"
    - "The evaluation names every concrete file and every prose passage in the post that depends on toy output, with a per-item action (rewrite, delete, keep, relabel)"
    - "The evaluation covers reader-comprehension gain/loss for a non-programmer audience, page weight, dead code and tests, and risk to the shipped Phase 2 verification"
    - "The evaluation states the exact edits needed to FOUND-07, TOK-07, the ROADMAP wording, and the effect on EMB-01 and EMB-02"
    - "The evaluation recommends what to do with the BPE stepper (Claude's discretion) and gives an effort estimate"
    - "No file under src/ or public/ is modified"
  artifacts:
    - path: ".planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-EVALUATION.md"
      provides: "Impact analysis and recommendation"
  key_links:
    - from: "261006-riu-EVALUATION.md"
      to: "src/content/posts/what-is-a-token.mdx, src/core/toy.ts, src/core/bpe.ts, src/core/stepper.ts, src/core/realTokenizer.ts, src/core/compare/*"
      via: "file-by-file and passage-by-passage inventory"
---

<objective>
Evaluate (do not implement) replacing the toy tokenizer with the GPT-2 tokenizer for the article's examples and playground, per the locked decisions in the quick-task CONTEXT.md.

Purpose: Let the author decide whether to drop the toy, with a concrete impact analysis (files, prose, tests, requirements) and a clear recommendation.
Output: `.planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-EVALUATION.md`

Locked scope (CONTEXT.md, do not revisit):
- Evaluation only, no source changes. The user decides afterward whether to implement.
- Assume the "re-tell the story" scope: the prose is rewritten around GPT-2's real splits (the "common words stay whole" point, the "real tokenizers differ in three ways" caveats), not a minimal swap of the tokenizer behind the widgets.
- Assume the comparison section becomes GPT-2 vs BERT (byte-level BPE vs WordPiece). List the edits to FOUND-07, TOK-07 and the ROADMAP wording, and any effect on the Phase 3 EMB-01 and EMB-02 toy-vector ideas.
- Claude's discretion: assess whether the BPE stepper (trains on one sentence, inherently a toy) can stay as a clearly-labelled teaching device alongside a GPT-2 playground, and recommend.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@.planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-CONTEXT.md
@.planning/REQUIREMENTS.md
@.planning/ROADMAP.md
@src/content/posts/what-is-a-token.mdx

Path form: every path in this plan is repo-root-relative; run all commands with cwd at the checkout root.

Known starting points (verify by reading, do not trust this list as complete): toy code in `src/core/toy.ts`, `src/core/toy/merges.json`, `src/core/bpe.ts`, `src/core/stepper.ts`, `src/core/presplit.ts`, `src/core/examples.ts`, `src/core/claims.ts`, `src/core/realTokenizer.ts`, `src/core/types.ts`, `src/core/compare/*`; components `src/components/Playground.svelte`, `OwnText.svelte`, `Comparison.svelte`, `LanguagesDemo.svelte`, `LanguagesTable.astro`, `TokenRows.svelte`, `BpeStepper.svelte`, `prose/ToyTokens.astro`, `src/layouts/PostLayout.astro`; tests `src/core/toy.test.ts`, `toy.golden.test.ts`, `regression.test.ts`, `claims.test.ts`, `counts.test.ts`, `chars.test.ts`, `stepper.test.ts`, `compare/*.test.ts`, `src/content/post-content.test.ts`, `src/components/TokenDisplay.test.ts`; e2e `e2e/post.spec.ts`, `comparison.spec.ts`, `languages.spec.ts`, `resilience.spec.ts`, `comparison-load.spec.ts`, `playground.spec.ts`, `stepper.spec.ts`; scripts such as `scripts/train-toy-bpe.ts` (npm script `train:toy`) and the dist/repo/core check scripts under `scripts/`.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Inventory prose and code that depend on the toy, and write EVALUATION.md sections 1-3</name>
  <files>.planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-EVALUATION.md</files>
  <action>
Read `src/content/posts/what-is-a-token.mdx` in full, plus `src/core/toy.ts`, `src/core/bpe.ts`, `src/core/presplit.ts`, `src/core/realTokenizer.ts`, `src/core/examples.ts`, `src/core/claims.ts`, `src/core/types.ts`, `src/components/Playground.svelte`, `OwnText.svelte`, `TokenRows.svelte`, `prose/ToyTokens.astro` and `src/layouts/PostLayout.astro`. Use Grep (case-insensitive "toy") across `src/`, `e2e/`, `scripts/` to catch every dependent file, then read only the matches you still need context for. Do not re-read ranges already read. To obtain real GPT-2 splits for the evaluation, reuse the repo's own adapter and shipped tokenizer files (look under `public/tokenizers/` and `src/core/realTokenizer.ts`) from a throwaway script in the session scratchpad directory (not in the repo); read-only use of `public/` is allowed, writes are not.

Create the evaluation file with a title, date, and these sections:

1. "Scope and assumptions": restate the locked CONTEXT.md decisions (evaluation only; re-tell-the-story scope; comparison becomes GPT-2 vs BERT; stepper at Claude's discretion).
2. "What the toy does today": one short paragraph on role of the toy in the post (merges shipped from offline training, bytes plus pre-split, what the playground and the "common words stay whole" passages show).
3. "Reader-comprehension impact (non-programmer audience)": gain/loss analysis grounded in actual GPT-2 output. Run the post's own example strings (the ones in `src/core/examples.ts` and the strings quoted in the MDX) through GPT-2 and tabulate toy split vs GPT-2 split for each. Address specifically: whether "common words stay whole" stops reading as contradictory (the toy's " com", "m", "on" split is the known problem named in ROADMAP Phase 2 criterion 6), whether GPT-2 numbers/emoji/non-English splits still make the teaching points, and what is lost (the toy is small enough to explain; GPT-2's 50k vocabulary cannot be inspected by a reader). Cite D-NN-style decision IDs only if present in the files you read.
4. "Prose passages affected": a table with columns: MDX line range or heading, passage summary, depends on toy output (yes/no), action (rewrite / delete / keep / relabel), notes. Cover every passage including the "real tokenizers differ in three ways" caveat block, the ToyTokens usages, captions, alt text and any accessibility text that quotes toy tokens.

Do not modify anything under `src/` or `public/`.
  </action>
  <verify>
    <automated>test -f .planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-EVALUATION.md && grep -c '^## ' .planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-EVALUATION.md | awk '{exit !($1>=4)}' && git status --porcelain -- src public | wc -l | awk '{exit !($1==0)}'</automated>
  </verify>
  <done>EVALUATION.md exists with sections 1-4, includes a toy-vs-GPT-2 split table built from real output of the repo's own adapter, and a per-passage prose table covering the whole MDX post; src/ and public/ are untouched.</done>
</task>

<task type="auto">
  <name>Task 2: Analyse code, tests, page weight, comparison, requirements and the stepper; append sections 5-9</name>
  <files>.planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-EVALUATION.md</files>
  <action>
Read `src/core/stepper.ts`, `src/components/BpeStepper.svelte`, `src/core/compare/comparison.ts`, `comparison.json`, `fixture.ts`, `rows.ts`, `notes.ts`, `languages.ts`, `src/components/Comparison.svelte`, `LanguagesDemo.svelte`, `LanguagesTable.astro`, `src/core/tokenizerFiles.ts`, `src/components/loadTokenizer.ts`, and the toy-dependent tests and e2e specs found in Task 1 (skim assertions that hard-code toy tokens or toy counts). Read the FOUND-07, TOK-07, EMB-01, EMB-02 entries and traceability rows in `.planning/REQUIREMENTS.md`, the Phase 1 to 3 goal and success-criteria wording in `.planning/ROADMAP.md`, and the Phase 2 verification/UAT artifacts under `.planning/phases/` (find with `ls .planning/phases/`) to understand what was already signed off. Also inspect how scripts under `scripts/` (train-toy-bpe, check-core, check-dist, check-repo) reference toy files, and measure GPT-2 asset sizes from `public/tokenizers/` (raw and compressed via `gzip -c | wc -c`, read-only).

Append these sections to the evaluation file (use Edit to append; do not rewrite earlier sections):

5. "Code and tests: dead, rewritten, kept": a table of every file with action (delete / rewrite / keep / adapt), why, and the number of toy-hardcoded assertions where relevant. Distinguish the toy tokenizer (`toy.ts`, `merges.json`, train script) from the BPE trainer/stepper logic (`bpe.ts`, `stepper.ts`), which may remain even if the toy tokenizer is dropped. Note shared-type/adapter changes (e.g. what the toy's `Piece` producer path gives `TokenRows`/`TokenDisplay`, and whether the display layer already handles GPT-2 byte-level output including partial-character chips).
6. "Page weight and loading behaviour": the playground currently needs no download for the toy; with GPT-2 it needs a ~1.4 MB raw (~0.44 MB br) fetch on demand. Quantify using measured sizes, say what the first-paint/SSR state of the playground becomes (the project rules forbid browser-only work at component top level and require `base`-aware URLs), what happens offline or on fetch failure (compare with the existing resilience e2e), and the interaction with `client:visible`. Check whether GPT-2 is already loaded for the comparison and whether that gives a shared cache.
7. "Comparison, requirements and roadmap edits": proposed replacement wording for FOUND-07 and TOK-07 (exact new text), ROADMAP Phase 1 goal line and criterion, Phase 2 goal line and criteria 3 and 6, and the traceability/status consequences (the checkboxes are currently complete, so say how to treat reopened or amended requirements). Describe the GPT-2 vs BERT comparison: which curated rows survive, which comparison.json fixtures and notes need regeneration, and what the reader loses by no longer seeing Mistral/others if they are currently shown. Assess the effect on Phase 3 EMB-01 and EMB-02 (the "token becomes an ID, then a toy vector" strip: the ID could now be a real GPT-2 ID, which is a gain; the vector stays illustrative) and recommend wording changes if any.
8. "BPE stepper recommendation": assess keeping the stepper as a clearly labelled teaching device, including what framing sentence/label is needed, whether the stepper's trained vocabulary on one sentence will visibly disagree with GPT-2's splits in the playground just above or below it, how that disagreement can be turned into a teaching moment or whether it confuses a non-programmer, and a firm recommendation (keep with relabelling / keep and move / drop) with rationale. Mention the Phase 2 deliverables and tests (`stepper.test.ts`, `e2e/stepper.spec.ts`) affected either way.
9. "Risks to shipped Phase 2 verification": which verified/UAT'd/axe/e2e/regression-corpus claims would be invalidated and need re-verification, and the re-verification list.

Do not modify anything under `src/` or `public/`.
  </action>
  <verify>
    <automated>F=.planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-EVALUATION.md; test -f $F && grep -c '^## ' $F | awk '{exit !($1>=9)}' && grep -q 'FOUND-07' $F && grep -q 'TOK-07' $F && grep -q 'EMB-01' $F && grep -q 'EMB-02' $F && grep -qi 'stepper' $F && git status --porcelain -- src public | wc -l | awk '{exit !($1==0)}'</automated>
  </verify>
  <done>Sections 5-9 appended; every toy-dependent file and test is classified; measured page-weight numbers present; exact replacement wording proposed for FOUND-07, TOK-07 and ROADMAP lines; EMB-01/EMB-02 effect stated; stepper recommendation firm; src/ and public/ untouched.</done>
</task>

<task type="auto">
  <name>Task 3: Write the verdict, effort estimate and implementation outline (sections 10-12) and put a summary at the top</name>
  <files>.planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-EVALUATION.md</files>
  <action>
Re-use what is already in the evaluation file (do not re-read source files except to settle a specific doubt via targeted Grep). Append:

10. "Recommendation": a one-line verdict (RECOMMEND or DO NOT RECOMMEND, optionally "recommend with conditions"), followed by the three to five strongest reasons for and against, weighing reader comprehension for non-programmers first, then maintenance cost, page weight and risk. State which option is best: full swap per the locked scope, partial swap (GPT-2 for playground and examples while the stepper keeps its own toy trainer), or leave as is. Be decisive.
11. "Effort estimate": table by work item (prose rewrite, adapter and component changes, test and e2e rewrites, fixture regeneration, requirements/roadmap edits, re-verification) with a size (S/M/L) and rough hours or plan count, and a total. Say whether this fits one quick task, one gap-closure phase, or needs a proper phase, and why.
12. "Suggested implementation outline": if the author says go, an ordered list of 4 to 7 steps (tracer-first: one GPT-2 path through playground end-to-end, then expand) with the verification command for each, using the repo's npm scripts (`npm test`, `npm run check`, `npm run check:svelte`, `npm run build`, `npm run test:e2e`). Not an implementation, just an outline.

Then insert a "Summary" block directly under the title (use Edit) with: the verdict, top three reasons, total effort, stepper recommendation, and requirements/roadmap edits needed, all in plain language, at most 15 lines. Leave all earlier sections intact.

Finally confirm no source changes: run `git status --porcelain -- src public scripts e2e` and confirm it prints nothing.
  </action>
  <verify>
    <automated>F=.planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-EVALUATION.md; grep -c '^## ' $F | awk '{exit !($1>=12)}' && grep -qi 'recommend' $F && grep -q '^## Summary' $F && grep -q 'Effort estimate' $F && test -z "$(git status --porcelain -- src public scripts e2e)"</automated>
  </verify>
  <done>EVALUATION.md has a Summary block, an unambiguous recommendation, an effort estimate with a sizing verdict (quick task vs phase), and an implementation outline; no source, public, scripts or e2e file changed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| repo files to evaluation doc | Read-only analysis; no external input, no runtime surface changed |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-01 | Tampering | src/, public/ (accidental edits during evaluation) | low | mitigate | Every task verifies `git status --porcelain -- src public` is empty; scratch scripts live in the scratchpad dir, not the repo |
| T-quick-SC | Tampering | npm/pip/cargo installs | low | accept | No packages are installed by this plan; no package-manager tasks |
</threat_model>

<verification>
- EVALUATION.md exists at the specified path with 12 numbered sections plus a Summary block.
- `git status --porcelain -- src public scripts e2e` prints nothing.
</verification>

<success_criteria>
The author can read one document and decide: it states a clear recommendation, lists every affected file and prose passage, proposes exact requirement/roadmap wording changes, recommends what happens to the BPE stepper, estimates effort, and outlines the implementation if approved. No source was changed.
</success_criteria>

<output>
Create `.planning/quick/261006-riu-evaluate-dropping-the-toy-tokenizer-from/261006-riu-SUMMARY.md` when done
</output>

# Quick Task 261006-riu: Evaluate dropping the toy tokenizer from the article, and just using GPT-2 tokenizer for the examples and playground - Context

**Gathered:** 2026-10-06
**Status:** Ready for planning

<domain>
## Task Boundary

Evaluate dropping the toy tokenizer from the article, and just using GPT-2 tokenizer for the examples and playground

</domain>

<decisions>
## Implementation Decisions

### Deliverable
- Evaluation only. Produce a written recommendation with impact analysis (files, prose, tests, requirements). Make NO source changes. The user decides afterward whether to implement.

### Playground & examples
- If GPT-2 replaces the toy, the evaluation should assume the "re-tell the story" scope: rewrite the prose around GPT-2's real splits (e.g. the "common words stay whole" point, the "real tokenizers differ in three ways" caveats), not just a minimal swap of the tokenizer behind the widgets.

### Comparison & requirements
- Assume the comparison section becomes GPT-2 vs BERT (byte-level BPE vs WordPiece). The evaluation should list the edits needed to FOUND-07, TOK-07 and the ROADMAP wording, and any effect on the Phase 3 "toy vector" ideas (EMB-01, EMB-02).

### Claude's Discretion
- BPE stepper: not discussed. The evaluation should assess whether the stepper (which trains on one sentence and is inherently a toy) can stay as a clearly-labelled teaching device when the playground uses GPT-2, and recommend.

</decisions>

<specifics>
## Specific Ideas

Evaluate: reader-comprehension gain/loss (non-programmer audience), prose that depends on toy output, page weight (GPT-2 tokenizer.json is ~1.4 MB raw / 0.44 MB br, loaded on demand), code and tests that become dead, and risk to the shipped Phase 2 verification.

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above

</canonical_refs>

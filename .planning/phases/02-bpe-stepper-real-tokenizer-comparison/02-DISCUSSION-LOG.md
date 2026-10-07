# Phase 2: BPE Stepper & Real-Tokenizer Comparison - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-05
**Phase:** 2-BPE Stepper & Real-Tokenizer Comparison
**Areas discussed:** BPE stepper design, Real tokenizers & loading, Comparison & languages layout, Post 1 structure & read-through

---

## BPE stepper design

| Question | Options presented | Selected |
|----------|-------------------|----------|
| Corpus | Classic low/lower/newest/widest; plain English words; playground default text | Classic (after asking what the Sennrich corpus is) |
| Controls and length | Next/Back/Reset + Run to end; Next/Back/Reset only; plus auto-play | Next/Back/Reset + Run to end |
| Pair counts and tie-break | Ranked table with winner marked; horizontal bars; table with rule stated once | Ranked table with winner marked |
| Words and tokens view | Letter chips reusing TokenDisplay; same plus running vocabulary list; chips only with before/after pair | Chips plus running vocabulary list |
| Word-boundary marker | Leading space glyph like playground; end-of-word marker like the paper | End-of-word marker, "not strictly the same as the paper, something reader friendly" |
| Try learned vocabulary on own word | No, self-contained; yes, small input | No, self-contained |

**Notes:** User asked what the Sennrich corpus is before choosing. Counts (5, 2, 6, 3) were given from memory, flagged unverified. Tie-break wording, corpus counts display and end state were taken as defaults after the user asked whether anything was underspecified.

---

## Real tokenizers & loading

| Question | Options presented | Selected |
|----------|-------------------|----------|
| Free typing vs curated | Curated precomputed only; curated plus free typing on a few small; free typing on all | Curated precomputed plus free typing on a few small |
| Which tokenizers | GPT-2/BERT/Mistral live + cl100k/o200k precomputed; GPT-2/BERT live + cl100k/o200k; plus Qwen | "Only live: GPT-2 and BERT" |
| Confirm set size | Exactly GPT-2 and BERT; plus precomputed cl100k/o200k; plus o200k | Exactly GPT-2 and BERT, nothing else |
| When to load | On first interaction; when scrolled into view; explicit button only | On first interaction (then superseded below) |
| Conflict with "typing sends no request" | Reword the rule; load only on a button press | Load only on a button press, never from typing |
| Before loading | Toy output plus load button; load button only; static baked-in GPT-2/BERT results with live typing on load | Static baked-in GPT-2 and BERT results, live typing added on load |
| Closed/unshown tokenizers | One plain sentence; name them without figures | One plain sentence |

---

## Comparison & languages layout

| Question | Options presented | Selected |
|----------|-------------------|----------|
| Layout of outputs | Stacked rows; three columns; responsive both | Deferred to UI discussion |
| Curated inputs | Numbers/dates; emoji; code; rare word and sentence | "Same examples as the first toy tokenizer" |
| Code example (roadmap criterion 3) | Add a sixth; amend criterion to drop code; comparison only | Keep the five, amend criterion to drop code |
| Languages demo presentation | Table with bars; language picker; table with expandable chips | Deferred to UI pass |
| Languages and sentence | Drafted by Claude; user supplies; planner decides | Source sentence and translations from a trusted source |
| "What to notice" notes | Short notes with build-time check; hand-written checked by eye | Hand-written, checked once by eye |

---

## Post 1 structure & read-through

| Question | Options presented | Selected |
|----------|-------------------|----------|
| Order | Playground, stepper, comparison; stepper first; playground, comparison, stepper | Stepper first, before the playground |
| "Common words stay whole" | Change the default sentence; keep and own it; soften the claim | Soften the claim; may revisit training corpus before publishing |
| Read-through timing | After Phase 2 with notes first; now then again; separate revision plan | Now on the Phase 1 version, then again after Phase 2 (later revised: one read-through at the end; author's notes handed over later; Phase 1 text used as-is for writing) |

---

## Claude's Discretion

- Merge count, end-of-word glyph, microcopy, load button wording
- Precompute script and fixture format
- Number of pair-table rows shown

## Deferred Ideas

- Revisit the toy's training corpus before publishing
- Modern tokenizers and a free-typing arena (v2)
- Trying the stepper's vocabulary on a reader's own word
- Stepper auto-play

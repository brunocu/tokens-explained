# Phase 2: BPE Stepper & Real-Tokenizer Comparison - Research

**Researched:** 2026-10-06
**Domain:** In-browser real tokenizers (`@huggingface/tokenizers`), self-hosted tokenizer files, multilingual source text, precompute and test strategy
**Confidence:** HIGH (parity and adapter behaviour were run this session against the Rust reference), MEDIUM (licence-notice handling is not legal advice)
**Scope rule (user, binding):** only the gaps not already covered by CONTEXT, UI-SPEC, DISCUSSION-LOG, `.claude/CLAUDE.md` and Phase 1 code. Nothing below re-derives a decided item.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The stepper trains on the classic Sennrich 2016 corpus: `low` (5), `lower` (2), `newest` (6), `widest` (3). The counts are from memory of the paper; the researcher must verify them against the paper. The corpus is separate from the playground toy (Phase 1 D-01).
- **D-02:** Controls are Next, Back, Reset and Run to end. No auto-play. Fixed length of about 8 merges (planner picks the exact number so `est` and `low` both emerge). Keyboard operable, native buttons, reduced motion shows instant state changes (FOUND-05).
- **D-03:** At every step a ranked pair-count table is shown, sorted high to low, with the winning row marked and a plain-language sentence saying why it won, including the tie-break when a tie decided it (TOK-06). Table form so it is natively screen-reader friendly.
- **D-04:** The tie-break rule must be the same rule the Phase 1 trainer uses (`scripts/lib/bpe-train.ts`: highest count, then smallest left id, then smallest right id), worded in plain language (for letters, "alphabetical"). The stepper's trace and the trainer must not disagree; the stepper's trace is pure TypeScript (`trainBPE(...) -> Step[]`, each step records pair counts, chosen pair, new token, resulting word splits, tie-break used) and is unit-tested with a golden test on this corpus.
- **D-05:** The stepper shows each corpus word as a row of chips that start as single letters and fuse as merges happen, reusing the shared `TokenDisplay` styling; the newly merged chip is highlighted. A **running vocabulary list** of learned tokens grows alongside (e.g. `es`, `est`). Corpus counts are shown beside each word (for example "low ×5").
- **D-06:** Word boundary is shown with a reader-friendly **end-of-word marker**, not the paper's literal `</w>`. Constraint: it must not be confusable with the playground's `␣` and `↵` glyphs, must be explained in a one-line legend, and the post must say how it relates to the playground's leading-space convention. Exact glyph is left to the UI spec.
- **D-07:** The stepper stays self-contained: no input to try the learned vocabulary on new words. The final screen says plainly that this is how a vocabulary gets built and that real tokenizers do the same on far more text with far more merges. The post states that the stepper's toy differs from the playground's toy and that production tokenizers differ in three ways (work on bytes, pre-split with a regex, 50k-200k vocabulary).
- **D-08:** The real-tokenizer set is **exactly GPT-2 and BERT (uncased)**. No cl100k, o200k, Mistral or Qwen. Both are older tokenizers chosen because they are small and openly licensed; the post says so in one plain sentence and says other models, including newer ones, cut text differently. No vendor names or unverified figures for tokenizers not shown (no Claude counts).
- **D-09:** Both are **self-hosted** under `public/tokenizers/` (no Hugging Face fetch at runtime), with a manifest of source repo, commit and licence. GPT-2 is MIT (verified); BERT's Apache-2.0 licence is **not yet verified** and must be confirmed before shipping. All URLs are base-aware.
- **D-10:** Curated comparison results for GPT-2 and BERT are **precomputed at build time** (committed script, dated, tokenizer names shown) so the curated comparison works instantly with no download. Free typing on GPT-2 and BERT is available only after the reader presses an explicit **load button labelled with the download size** (about 0.7 MB combined). **Typing alone never triggers a network request** (keeps Phase 5 criterion 4 literal). Loading shows a clear loading state and an error state with retry. `loadTokenizer(id)` stays async behind an adapter so it can move to a Worker later.
- **D-11:** Before the button is pressed, the section shows the curated precomputed results for the toy, GPT-2 and BERT. The adapter must display partial-character chips, `##` WordPiece pieces and `[UNK]` correctly (never a replacement symbol, FOUND-06), and be parity-tested against known ids for each shipped tokenizer (`@huggingface/tokenizers` 0.x, pin exactly).
- **D-12:** Curated comparison inputs are the **same five examples as the playground** (`src/core/examples.ts`: rare long word, numbers and dates, emoji, classic literature, non-English line), so the two lists stay identical. **Amends ROADMAP Phase 2 criterion 3 and REQUIREMENTS TOK-07 to drop "code".**
- **D-13:** Every comparison carries a one-or-two-sentence plain-language "what to notice" note, hand-written and checked once by eye (user's choice; no build-time claims test required, although the researcher may still recommend one). Every comparison names each tokenizer and its date/version (TOK-09).
- **D-14:** The many-languages demo (TOK-08) uses one short sentence in roughly 6 languages whose **sentence and translations come from a trusted, citable source** (the researcher identifies one, e.g. a parallel-text corpus); results are precomputed, dated and labelled. A text-readable table is the primary accessible form.
- **D-15:** The visual layout of the comparison (stacked rows vs columns) and of the languages demo (table, bars, expandable chips) is **deferred to the UI spec** (`/gsd-ui-phase 2`).
- **D-16:** Post order is: short definition and "token is not a word" correction, then the **BPE stepper before the playground**, then the playground, then the real-tokenizer comparison, then the languages demo. **Amends Phase 1 D-11** (playground mid-post). The abstract "third step" paragraph in "How this tokenizer works" is reworked to fit the new order; Phase 1's rule of no "coming soon" placeholders still holds.
- **D-17:** The "common words stay whole" sentence is **softened** (for example "many everyday words") rather than changing the default sentence. Keep the build-time claims for the default sentence true.
- **D-18 (revised 2026-10-05):** The non-programmer read-through (ROADMAP criterion 6) happens **once, at the end of Phase 2**, on the complete Post 1 (stepper and comparison included). It is a human-gated final task in the plan. There is no read-through of the Phase 1 version beforehand. The author will hand over their own notes on the article (deferred from Phase 1 UAT test 5) **later, before that final task**; they are not available during planning or writing. Until then, writing Phase 2 uses the Phase 1 prose as-is, apart from the changes already decided here (D-16 reorder, D-17 softened claim). The plan must leave a slot to apply the author's notes before the read-through, and must not block earlier tasks on them.

### Claude's Discretion
- Exact number of merges, the end-of-word glyph, the stepper's microcopy and the sizes/wording of the load button.
- Plumbing for the build-time precompute script and fixture JSON format.
- Pair-table row count shown per step (all pairs vs top N), as long as the winner and any tie are visible.

### Deferred Ideas (OUT OF SCOPE)
- **Revisit the toy's training corpus before publishing** (user note, D-17): a larger or different corpus might make more everyday words single tokens. Changes `merges.json`, goldens and the default-sentence claims; belongs with the Phase 5 content check or a small dedicated task, not Phase 2.
- Modern tokenizers (cl100k, o200k, Mistral, Qwen) and a free-typing real-tokenizer arena: excluded by D-08; candidates for v2.
- Trying the stepper's learned vocabulary on a reader's own word: rejected for now (D-07).
- Auto-play for the stepper: not included (D-02).
- Layout of the comparison and languages demo: handled by the UI spec (D-15), not deferred as a feature.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOK-05 | Step through BPE merges (Next, Back, Reset) | Golden 8-step trace independently re-derived (see "Stepper golden confirmed"); cross-check with the trainer needs a small refactor (Gap 5) |
| TOK-06 | Pair counts and tie-break at each step | Same trace; tie kinds match UI-SPEC (steps 1, 2, 4, 6, 7 are ties) |
| TOK-07 | Compare toy vs real tokenizers on curated inputs (code dropped, D-12) | GPT-2 and BERT adapter verified; parity with the Rust reference proven; counts table below; BERT-specific display pitfalls (Gaps 1, 2, 7) |
| TOK-08 | Same sentence in many languages, counts differ | Source identified and text extracted and cross-checked (Gap 3); the "first sentence" wording does not hold for Spanish; BERT `[UNK]` makes the Chinese count misleading |
| TOK-09 | Plain-language note, tokenizers named and dated | Licence, commit and sha256 manifest facts (Gap 4); precompute freshness test (Gap 6) |
</phase_requirements>

## Summary

The decisions and the UI contract already cover almost everything. This research only closes the open unknowns, and the main result is good news: `@huggingface/tokenizers` 0.2.0 produced **ids and token strings identical to the Rust reference (Python `tokenizers` 0.23.2)** for GPT-2 and BERT uncased on 28 test strings (the default text, the five examples, six language sentences, 16 stress cases), with `add_special_tokens: false` on both sides. GPT-2 bytes can be recovered exactly by inverting the byte-to-unicode table (29 of 29 strings round-trip to the input's UTF-8). Both licences are verified. The language source is identified, fetched and cross-checked.

Six things need a decision or a small plan change (details in "Gaps"): (1) `tokenizer_config.json` is not needed, so the load button fetches exactly **two** files; (2) BERT's WordPiece can turn a whole word into one `[UNK]`, and the Chinese BERT count (43) hides 25 `[UNK]`s, so the languages table needs one conditional text line; (3) UDHR Article 1 is **one sentence in Spanish and two in the other five**, so "first sentence" breaks the comparison and the whole of Article 1 should be used; (4) the cross-check "stepper vs `trainMerges`" in UI-SPEC is not possible as written because `trainMerges` always pre-splits and has no end-of-word symbol; a small extraction is needed; (5) BERT uncased also strips accents, which changes the visible text in the French, Spanish and Arabic rows; (6) `@huggingface/tokenizers` gets a `SUS` ("too-new") verdict from the legitimacy seam and `scripts/check-deps.mjs` will reject it until the allow-list is edited.

**Primary recommendation:** Add `@huggingface/tokenizers@0.2.0` (exact) behind a pure `src/core` adapter that takes already-loaded JSON (no fetch, no `import.meta.env`), so the same adapter runs in the browser, in the Node precompute script and in Vitest. Pass `{}` as the second constructor argument and ship only the two `tokenizer.json` files.

## Already covered (not re-researched)

| Area | Where it is decided or verified |
|------|---------------------------------|
| Stack, versions, "What NOT to use", adapter shape `load(id)`/`tokenize(text)`, toy BPE guidance | `.claude/CLAUDE.md` |
| GPT-2 and BERT only; self-host; no HF fetch at runtime; load-button rule; typing never fetches | D-08..D-11 |
| Sennrich counts (5, 2, 6, 3); the paper's printed merge order must not be quoted | UI-SPEC "Verified inputs" |
| Repo commits and licences for GPT-2 (MIT) and BERT (Apache-2.0) | UI-SPEC "Verified inputs" (re-confirmed below, plus file-level facts) |
| Eight-step golden trace, tie kinds, why-sentence templates, `§` marker, layout, a11y, copy | UI-SPEC section 1 (trace independently re-derived below: identical) |
| Comparison and languages layout, own-text states, lifecycle, `data-island` watcher | UI-SPEC sections 2-4 |
| Five comparison inputs equal `EXAMPLES`; code dropped | D-12 |
| Base-aware URLs principle, `check:base` exists | D-09, Phase 1 D-15, `scripts/check-base.mjs` |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Real-tokenizer adapter (bytes, `##`, `[UNK]`) | Browser / Client (and Node for precompute and tests) | none | Pure TypeScript over loaded JSON; runs wherever it is given the file contents |
| Tokenizer file hosting | CDN / Static | none | `public/tokenizers/`, copied verbatim into the build |
| Curated comparison and language results | Build time (committed fixture) | Browser renders | D-10: instant, no download |
| Own-text live tokenizing | Browser / Client | none | After explicit load only |
| Language sentences, manifest, sizes | Build time | none | Computed by script, checked by tests |

## Standard Stack

### Core (new this phase; everything else is unchanged)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@huggingface/tokenizers` | `0.2.0` exact (no caret) | Run GPT-2 and BERT tokenizer.json in browser and Node | Already chosen in STACK; parity now proven (below) |

**Installation:** `npm install --save-exact @huggingface/tokenizers@0.2.0`, **and in the same task** add `"@huggingface/tokenizers": "0.2.0"` to `ALLOW.dependencies` in `scripts/check-deps.mjs`.

`[VERIFIED: scripts/check-deps.mjs, read this session]` the guard says: `The dependency set must equal the human-approved allow-list with exact specifiers.` and `else if (allowed[name] !== spec) errors.push(...)`, so a caret range or a missing allow-list entry fails `npm run check:deps`.

**Version verification:** `npm view @huggingface/tokenizers version` returned `0.2.0` (dist-tag `latest`, published 2026-09-07). Releases so far: 0.0.5 (2025-11-07), 0.0.6, 0.1.0 (2026-01-20), 0.1.1, 0.1.2, 0.1.3 (2026-03-18), 0.2.0 (2026-09-07). `[VERIFIED: npm registry]` Pre-1.0 and changing: keep the exact pin and the parity goldens (Gap 8).

**Typecheck:** `[VERIFIED: tsc 6.0.3 run in scratchpad with the project's tsconfig]` `new Tokenizer(json, {})`, `.encode(text, { add_special_tokens: false }).ids` and `.get_added_tokens_decoder().get(id)?.content / .special` compile with no errors under `astro/tsconfigs/strict` plus `noUncheckedIndexedAccess`.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@huggingface/tokenizers` | npm | package created 2025-11-03; v0.2.0 published 2026-09-07 | about 2.96M/week | github.com/huggingface/tokenizers.js | **SUS** (reason `too-new`, which refers to the 0.2.0 publish date) | Flagged. Planner adds a `checkpoint:human-verify` before the install |

**Packages removed due to SLOP:** none.
**Packages flagged SUS:** `@huggingface/tokenizers`. Context for the human check: Hugging Face org maintainers (`julien-c`, `pierric`, `coyotte508`, `xenova`, `gary149`), 2.96M weekly downloads, no `postinstall` script (`scripts` lists only dev, lint, test, build, clean, format), Apache-2.0, the package the project's STACK.md already selected. The user approved this package in STACK, so the checkpoint can be a one-line confirmation bundled with the `check-deps.mjs` edit. `[VERIFIED: gsd-tools package-legitimacy check, npm view]`

## Gaps closed (the actual research)

### Gap 1. Parity of GPT-2 and BERT ids in `@huggingface/tokenizers` 0.2.0 `[VERIFIED: run 2026-10-06]`

Method: downloaded the exact pinned files (below), ran `Tokenizer.encode(text, { add_special_tokens: false })` in Node, and compared **ids and token strings** with `tokenizers.Tokenizer.from_file(...).encode(text, add_special_tokens=False)` from the Rust-backed Python `tokenizers` 0.23.2 (`uv run --no-project --with tokenizers`). 29 cases: the five `EXAMPLES`, the default text, six Article 1 sentences, and stress inputs (leading and trailing spaces, newlines and tabs, accents and ligatures, combining marks, ZWJ family emoji, flag emoji, apostrophes, control characters, 300 repeated letters, literal `[CLS] [SEP] [UNK] <|endoftext|>`, empty string, single space, long digit run).

Result: **0 mismatches** for GPT-2 and BERT (29 cases were run in JS; the lone-surrogate case cannot be passed to Python as a string, so 28 were compared per tokenizer). Re-run with `{}` as the config argument: still 0 mismatches. This closes the STACK.md caveat "Mistral, BERT and Qwen ids were not cross-checked" for the two tokenizers that ship.

Timing (Node 24): construct GPT-2 about 43 ms, BERT about 14 ms; `encode` about 0.03 ms for a short sentence; worst 1000-character adversarial inputs (spaces, newlines, ZWJ, combining marks, emoji, specials) took at most 2.5 ms, so there is no regex blow-up at the 1000-character cap. `[VERIFIED: run]`

**Plan consequence:** commit the reference output as a golden (`adapter-parity.json`: cases, ids, token strings) generated once by the Python reference, and have Vitest assert the JS adapter equals it. Python is **not** a project dependency; record the generator command in the fixture header. Keep the golden when the pin moves.

### Gap 2. Bytes and display from the adapter `[VERIFIED: run, with repo display code]`

```ts
// Verified in scratchpad: GPT-2 byte recovery, 29/29 strings round-trip to input UTF-8.
// Pure module; takes parsed tokenizer.json (no fetch, no import.meta.env).
import { Tokenizer } from "@huggingface/tokenizers";
// bytes_to_unicode inverse: printable Latin-1 ranges map to themselves, the other 68 bytes map to 256+n.
function byteDecoder(): Map<string, number> {
  const bs: number[] = [];
  for (let i = 33; i <= 126; i++) bs.push(i);
  for (let i = 161; i <= 172; i++) bs.push(i);
  for (let i = 174; i <= 255; i++) bs.push(i);
  const cs = bs.slice();
  let n = 0;
  for (let b = 0; b < 256; b++) if (!bs.includes(b)) { bs.push(b); cs.push(256 + n); n++; }
  return new Map(bs.map((b, i) => [String.fromCodePoint(cs[i] as number), b]));
}
// Per token: added tokens (id in tokenizer.get_added_tokens_decoder()) use UTF-8 of `.content`
// and set special: true; ordinary GPT-2 tokens use the inverse table; BERT tokens use UTF-8 of the
// token string (`##` kept). isPartial = !isValidUtf8(bytes) (reuse toy.ts's isValidUtf8).
const e = tokenizer.encode(text, { add_special_tokens: false });
```

Quoted from `node_modules/@huggingface/tokenizers/types/core/Tokenizer.d.ts` (read this session): `add_special_tokens?: boolean;`, `get_added_tokens_decoder(): Map<number, AddedToken>;` and from `AddedToken.d.ts`: `content: string;`, `special: boolean;`.

Facts the adapter and tests must respect:

- **Added tokens are not byte-mapped.** `<|endoftext|>` (GPT-2 id 50256) and BERT's `[PAD] [UNK] [CLS] [SEP] [MASK]` (ids 0, 100, 101, 102, 103) are added tokens with literal content. The inverse table happens to work for `<|endoftext|>` (all printable ASCII) but the adapter should branch on the added-token map, not rely on that. `[VERIFIED: run]`
- **A reader can type `[CLS]`, `[SEP]`, `[UNK]` or `<|endoftext|>` into the own-text box** and both libraries (and the reference) turn them into the special id. The adapter should mark every added token `special: true` (same neutral chip as `[UNK]`). The legend's `[UNK] means ...` line then does not explain `[CLS]`; accept that or word the conditional line generically ("A grey solid chip is a special marker the tokenizer reserves"). Planner/UI decision, low priority.
- **No special markers in output**: with `add_special_tokens: false`, BERT returns no `[CLS]`/`[SEP]` (matches the reference). With the default it returns `["[CLS]","hi","[SEP]"]`, so the flag is mandatory, not optional.
- **Existing display code accepts adapter-shaped tokens unchanged.** Feeding GPT-2 tokens for the emoji example into `groupBytes`, `chipText` and `tableCell` gave `Great | ␣job | 20 F0 9F | 8E | 89 | ␣see | ...` and table text `Bytes 1 to 2 of 4 of 🎉`, `Byte 3 of 4 of 🎉`, `Byte 4 of 4 of 🎉`; a lone surrogate became `20 EF BF BD` (hex, never U+FFFD). `[VERIFIED: run against src/core/chars.ts and display.ts]`
- **Cosmetic mismatch to know about (pre-existing semantics):** a GPT-2 token that is a leading space plus the first bytes of an emoji shows three hex bytes (`20 F0 9F`) while the table wording counts only the character's bytes ("Bytes 1 to 2 of 4"). It is not a defect in the adapter; e2e should assert "no U+FFFD, no `Ġ`/`Ċ`", not exact table wording for this row.
- A 1000-character ZWJ input yields 2000 GPT-2 tokens; three rows of 2000 chips is the heaviest live case. Not a correctness problem; mention to the executor when checking the own-text box.

### Gap 3. UDHR sentence source, extracted text, and a wording problem `[VERIFIED: fetched 2026-10-06]`

- OHCHR's per-language translation pages return HTTP 403 to automated fetch (Cloudflare challenge), as UI-SPEC noted. **The official UN site pages are fetchable** (`https://www.un.org/{en,es,fr,ru,ar,zh}/about-us/universal-declaration-of-human-rights`) and **OHCHR's PDFs are fetchable** (`https://www.ohchr.org/sites/default/files/UDHR/Documents/UDHR_Translations/{eng,spn,frn,rus,chn}.pdf`).
- Article 1 as extracted from the un.org pages (NFC-normalised already; no NBSP or exotic spaces):

| Lang | Article 1 (whole) | Chars | Cross-check |
|------|-------------------|-------|-------------|
| en | All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood. | 170 | exact match in OHCHR PDF `eng.pdf` |
| es | Todos los seres humanos nacen libres e iguales en dignidad y derechos y, dotados como están de razón y conciencia, deben comportarse fraternalmente los unos con los otros. | 171 | exact match in `spn.pdf` |
| fr | Tous les êtres humains naissent libres et égaux en dignité et en droits. Ils sont doués de raison et de conscience et doivent agir les uns envers les autres dans un esprit de fraternité. | 186 | exact match in `frn.pdf` |
| ru | Все люди рождаются свободными и равными в своем достоинстве и правах. Они наделены разумом и совестью и должны поступать в отношении друг друга в духе братства. | 160 | exact match in `rus.pdf` |
| ar | يولد جميع الناس أحراراً ومتساوين في الكرامة والحقوق. وهم قد وهبوا العقل والوجدان وعليهم أن يعاملوا بعضهم بعضاً بروح الإخاء. | 123 | **not cross-checked** (OHCHR PDF file code not found); un.org only |
| zh | 人人生而自由，在尊严和权利上一律平等。他们赋有理性和良心，并应以兄弟关系的精神相对待。 | 43 | the 39 Han characters match `chn.pdf`; punctuation not comparable from PDF extraction |

- **Problem for UI-SPEC section 3 ("first sentence"):** in Spanish, Article 1 is **one sentence** (the two ideas are joined by "y"), while en, fr, ru, ar and zh have two sentences. "First sentence" gives English 63 chars and Spanish 171 chars, which are not the same meaning, so the count comparison would be wrong. **Recommendation: use the whole of Article 1 for all six** and change the caption/source wording from "(first sentence)" to "Article 1". The toy/GPT-2/BERT counts on whole Article 1 are in the table below. This amends one phrase in UI-SPEC section 3 and its source line; the layout is unchanged (170-char sentences wrap inside the row header). Needs the planner (or user) to accept; flagged in Open Questions.
- **Reuse terms.** OHCHR asks that reproductions "make reference to this website as a source by providing a link" (OHCHR UDHR translation project page, via search result). The un.org site's generic terms allow personal, non-commercial copying and forbid redistribution, so cite **OHCHR as the source and link its Article 1 translation page** (as UI-SPEC says) and record the un.org URL actually used as the retrieval URL. One article, quoted with attribution, is a small excerpt, but this is `[ASSUMED]` to be acceptable (not legal advice, A3).
- Executor note: because the OHCHR pages block bots, the executor should copy strings from the fixture I extracted (re-fetch from un.org with a normal browser User-Agent) and have the author eyeball the Arabic against the OHCHR Arabic page in a browser once.

### Gap 4. Tokenizer file provenance for the manifest `[VERIFIED: downloaded and hashed 2026-10-06]`

| | GPT-2 | BERT uncased |
|---|---|---|
| Repo | `openai-community/gpt2` | `google-bert/bert-base-uncased` |
| Pinned commit | `607a30d783dfa663caf39e06633721c8d4cfcd7e` | `86b5e0934494bd15c9632b12f734a8a67f723594` |
| File to ship | `tokenizer.json` (1,355,256 bytes) | `tokenizer.json` (466,062 bytes) |
| sha256 | `8414cab924d8b9b33013f0d221c5862f365ee9be39c5c2bfae8a5a9e970478a6` | `ce64fce797c24f68df90b40a3f74f579b336a493db14bd583fd520ea0d8c9a98` |
| gzip -9 | 548,934 bytes | 192,492 bytes |
| Licence | HF card front matter `license: mit` | HF card front matter `license: apache-2.0`; repo contains an Apache-2.0 `LICENSE` (11,356 bytes) |

- Combined gzip is **741,426 bytes (0.74 MB)**, so "about 0.7 MB" in D-10 is right. `[VERIFIED: gzip -9 run]` Compute the label in the build/test with `node:zlib` `gzipSync(level 9)` and round to one decimal in decimal MB.
- Download URL pattern used: `https://huggingface.co/<repo>/resolve/<commit>/tokenizer.json`. Copy the files **byte-for-byte** (do not reformat; they are already minified single-line JSON) and let a test assert the sha256 above.
- **GPT-2 repo has no `LICENSE` file** (`/resolve/<commit>/LICENSE` is 404); the MIT claim is the model-card front matter, and upstream `github.com/openai/gpt-2` has a "Modified MIT License, Software Copyright (c) 2019 OpenAI". `[VERIFIED: HF README, raw.githubusercontent LICENSE]` Both licences require the notice to travel with the copy, so ship `public/tokenizers/NOTICE.md` (or per-file notices) holding: the Apache-2.0 text for BERT (copy the repo `LICENSE`), the MIT/Modified MIT notice with "Copyright (c) 2019 OpenAI" for GPT-2, and a link from the post's "Where the tokenizer files come from" summary. That obligation reading is `[ASSUMED]` (A3).
- **`tokenizer_config.json` is not needed.** Constructing with `{}` as the second argument gave identical ids for both tokenizers (and matched the reference over the same 28 compared cases). The shipped GPT-2 config is `{"model_max_length": 1024}` and BERT's is `{"do_lower_case": true, "model_max_length": 512}`; neither affects `encode` here. Therefore **the load button fetches exactly two files** (one `tokenizer.json` each), which is what UI-SPEC's privacy rule says ("exactly the two files"). Without this decision a literal implementation would make four requests and the e2e would fail.
- GitHub Pages (the chosen host) serves JSON with `content-encoding: gzip` and `cache-control: max-age=600` (checked on a Pages-hosted JSON file, `vega.github.io/vega-datasets/data/cars.json`, with `Accept-Encoding: gzip`). So the transfer size is the gzip size above, and a changed file can be stale for up to 10 minutes. `[VERIFIED: curl -I]` Putting the short commit in the filename (for example `gpt2-607a30d.json`) removes any stale-file question; optional, planner's call.

### Gap 5. The "stepper vs trainer" cross-check cannot be done as written `[VERIFIED: read scripts/lib/bpe-train.ts, src/core/presplit.ts]`

UI-SPEC asks for "a cross-check that the same rule picks the same winners as `trainMerges` on that corpus (pre-split disabled for the stepper)". `trainMerges(text, nMerges)` has no switch for that: its first lines are `for (const piece of presplit(text)) {` and it works on UTF-8 byte ids. Feeding it the stepper corpus fails for two reasons: `presplit` splits letters from punctuation (the regex contains ` ?\p{L}+` and ` ?[^\s\p{L}\p{N}]+`), so a stand-in end-of-word symbol is cut off into its own piece, and the pieces would pick up leading-space variants.

Smallest fix that makes the cross-check real (and keeps one tie-break implementation):

1. In `scripts/lib/bpe-train.ts`, extract the loop after the `frequency` map into an exported `trainOnPieces(pieces: Array<{ ids: number[]; weight: number }>, nMerges: number): Array<[number, number]>`; `trainMerges` calls it. Behaviour must stay byte-identical: `npm run train:toy -- --check` and the existing determinism/golden tests prove it.
2. The cross-check test builds pieces from the stepper corpus using byte ids (letters = their ASCII codes, end-of-word = one extra byte value above the letters such as `0x7E`, which sorts after `a-z` like the stepper's marker), runs `trainOnPieces`, and asserts the winner sequence equals the stepper trace's chosen pairs for steps 1-8. Merged ids are `256 + i` in both.
3. Keep the stepper's own `trainBPE` in `src/core` (browser-safe); only the test crosses into `scripts/`, which is how Phase 1 already tests the trainer.

**Stepper golden re-derived independently** (scratch script written from the rule, not from UI-SPEC): merges `e+s (9)`, `t+§ (9)`, `es+t§ (9)`, `l+o (7)`, `lo+w (7)`, `e+w (6)`, `n+ew (6)`, `new+est§ (6)`; tied-at-top sets `{e+s, s+t, t+§}`, `{t+§, es+t}`, none, `{l+o, o+w}`, none, `{e+w, n+e, w+est§}`, `{n+ew, ew+est§}`, none; total distinct pairs 14, 14, 13, 12, 11, 10, 9, 8; a 9th merge would be `low+§ (5)`. **Identical to the UI-SPEC table.** The golden test can assert those numbers directly, including the pair totals used in the caption "Showing the top 6 of {N} pairs".

### Gap 6. Test strategy additions (beyond the verification hooks in UI-SPEC)

| Risk | Test |
|------|------|
| Committed comparison fixture goes stale if `merges.json` is retrained (a deferred idea says it may be) or the tokenizer files change | Vitest **freshness test**: recompute every curated and language row with the toy, GPT-2 and BERT adapters from `public/tokenizers/*.json` and assert deep equality with the fixture (ignore only the `generatedAt` date). The script is run by hand like `train:toy` and its output committed; the test fails loudly if anyone forgets |
| Adapter drifts from the reference when the pin moves | Parity golden from Gap 1 |
| Shipped file differs from the manifest | Vitest: sha256 of each `public/tokenizers/*.json` equals the manifest; gzip-size label equals computed size |
| Notes claim a count or split that is false (D-13 says optional) | Cheap optional test: fixture stores per-example `notes` with `{ example, claims: { gpt2: 9, bert: 7 } }`-style numbers, or simply a test that any digit in a note matches a fixture count; recommended, not required |
| Fixture contains U+FFFD, `Ġ` or `Ċ` | Vitest over the whole fixture (hex-byte fixture format makes this a one-liner on decoded strings) |
| Base-aware fetch | See Pitfall 3 |
| Request counts | `privacy.spec.ts` pattern (see Code Examples): record requests, assert none containing `/tokenizers/` before the click, exactly two after, none during typing |

`nyquist_validation` is `false` in `.planning/config.json` (read this session), so no separate Validation Architecture table is produced; the table above is the strategy.

### Gap 7. Behaviour of BERT that the notes and counts must respect `[VERIFIED: run]`

- **WordPiece turns a whole word into one `[UNK]`** when any part cannot be encoded: `"wow🎉 nice"` gives `["[UNK]","nice"]`, `"unbelievable🎉"` gives `["[UNK]"]`, while `"hello 🎉 world"` gives `["hello","[UNK]","world"]`. The curated emoji example puts spaces around the emoji, so it shows two clean `[UNK]` chips; a reader typing `wow🎉` will see the whole word vanish. This is a good teaching moment but the "What to notice" and the conditional legend line should say "gave up on the piece", which is what UI-SPEC's wording ("had no piece for that character and gave up") nearly does; say "that word or character" to be accurate.
- **Chinese in BERT uncased: 43 characters, 43 tokens, 25 of them `[UNK]`** (the vocabulary holds only some CJK characters). In the languages table BERT's Chinese cell would read 43 and look like the "best" count. Recommendation (needs a one-line UI-SPEC amendment): when a cell's row contains `[UNK]`, add a Muted Label line under the number, text only, for example "25 of these are [UNK]", computed from the fixture. The "what to notice" note must not claim BERT "handles" Chinese.
- **BERT uncased normalises before cutting**: lower-case, accent stripping, and removal of combining marks. In the six sentences this visibly changes French and Spanish (`êtres` shows as `et ##res`, `está`/`razón` lose accents) and Arabic (tanwin and hamza forms change). Add "removes accents" to BERT's subline (UI-SPEC subline currently says "It lower-cases text, ignores spaces, and marks a piece that continues a word with ##."). The curated example 3 text also shows `I` as `i`.
- Interesting counts for the note writer; **do not copy these into prose**, regenerate with the precompute script (they depend on the current `merges.json`). Computed 2026-10-06 with the files above:

| Text | Chars | Toy | GPT-2 | BERT (of which `[UNK]`) |
|------|------:|----:|------:|------------------------:|
| A rare long word | 60 | 27 | 16 | 16 (0) |
| Numbers and dates | 45 | 29 | 19 | 19 (0) |
| An emoji | 26 | 18 | 9 | 7 (2) |
| A line of classic literature | 117 | 47 | 26 | 26 (0) |
| A non-English line | 8 | 22 | 10 | 7 (0) |
| UDHR Art. 1 en | 170 | 63 | 33 | 32 (0) |
| UDHR Art. 1 es | 171 | 101 | 58 | 57 (0) |
| UDHR Art. 1 fr | 186 | 115 | 61 | 61 (0) |
| UDHR Art. 1 ru | 160 | 293 | 172 | 133 (0) |
| UDHR Art. 1 ar | 123 | 225 | 121 | 101 (0) |
| UDHR Art. 1 zh | 43 | 129 | 86 | 43 (25) |

All the intents in UI-SPEC's "What to notice" table are consistent with this data (emoji gives byte pieces for toy and GPT-2 and `[UNK]` for BERT; literature is mostly whole words for both real tokenizers). Note that GPT-2 and BERT counts are almost equal for English (26 and 26) even though they cut differently, so the notes should talk about *where* the cuts fall, not about one being "better".

### Gap 8. Other small facts

- **Where the base lives.** `import.meta.env.BASE_URL` is used in Phase 1 (`src/components/SiteHeader.astro`: `const home = import.meta.env.BASE_URL;`) and `astro.config.mjs` states `trailingSlash "always" makes import.meta.env.BASE_URL end with a slash.` `[VERIFIED: grep and Read this session]` So the loader builds `` `${import.meta.env.BASE_URL}tokenizers/gpt2.json` ``. Keep that expression **only in the Svelte-side loader**; `src/core` modules are loaded by native Node (`scripts/check-core.mjs` proves it) where `import.meta.env` is undefined. Pass a `baseUrl` string into any core function that needs one.
- **`check:base` does not exercise the fetch.** `scripts/check-base.mjs` runs `playwright test --project=chromium e2e/smoke.spec.ts` only, and `check-dist.mjs` scans only HTML and CSS URLs. A wrong base in a JavaScript `fetch()` would pass both. Add one step to `check-base` that runs the new comparison load-button spec under `/base-check`, and optionally a `check-dist` assertion that the manifest's files exist in the output.
- **`public/` files are not hashed or listed in HTML**, so nothing in the build would fail if a file were missing; the e2e load test and the sha256 test are the only guards.
- Library size: `dist/tokenizers.mjs` is 98,937 bytes raw and 20,825 bytes gzip (the README's "about 8.3 kB" is for the minified build). Load it with `await import("@huggingface/tokenizers")` inside the click handler so it stays out of the island's initial chunk. `[VERIFIED: ls, gzip]`

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| GPT-2 and BERT tokenization (regex pre-split, WordPiece, BPE ranks, normaliser) | A custom tokenizer for the real rows | `@huggingface/tokenizers` 0.2.0 (parity proven) | Oniguruma regex translation and WordPiece edge cases (whole-word `[UNK]`, accent stripping) are exactly where hand-rolled versions diverge |
| Reading tokenizer files at runtime | Fetching from Hugging Face | Self-hosted files in `public/tokenizers/` | D-09 |
| Per-token bytes | `tokenizer.decode([id])` | Inverse GPT-2 byte table plus added-token branch | `decode` per token drops spaces and returns U+FFFD for partial characters (STACK.md, and confirmed by the round-trip result here) |
| Gzip size in the button label | A typed number | `gzipSync` at build or test time | Cannot drift |
| UDHR sentences | Author-written translations | The OHCHR texts (Gap 3) | D-14 requires a trusted, citable source |
| A second tie-break implementation | A copy of the comparator in `stepper.ts` that can drift | One shared rule (Gap 5) | D-04 |

## Common Pitfalls

### Pitfall 1: Four requests instead of two
**What goes wrong:** the library README loads `tokenizer.json` and `tokenizer_config.json`; copying that pattern makes the load button fetch four files and breaks "exactly two" in the privacy spec.
**Avoid:** construct with `{}`; ship only the two `tokenizer.json` files; the spec asserts exactly two `/tokenizers/` requests.

### Pitfall 2: Forgetting `add_special_tokens: false`
**What goes wrong:** BERT rows gain `[CLS]` and `[SEP]` and counts are off by two, contradicting the source line ("counts cover the text only").
**Avoid:** always pass the flag; parity golden covers it.

### Pitfall 3: Base-aware in dev and tests but wrong in the deployed sub-path
**What goes wrong:** `fetch("/tokenizers/gpt2.json")` works at root and 404s under `/<repo>/`; `check:base` currently cannot see it (Gap 8).
**Avoid:** build the URL from `import.meta.env.BASE_URL` in the loader; add the load-button spec to the `check:base` steps; keep the URL out of `src/core`.

### Pitfall 4: `check-deps` fails the build
**What goes wrong:** installing the package without editing `ALLOW` makes `npm run check:deps` fail (exact spec `0.2.0` required).
**Avoid:** one task does install, lockfile, `ALLOW` edit and the SUS human check.

### Pitfall 5: Counts that mislead
**What goes wrong:** BERT zh shows 43 and looks efficient; BERT shows accent-stripped text and looks "wrong".
**Avoid:** conditional `[UNK]` line in the table cell; subline mentions accent removal; notes talk about cut positions (Gap 7).

### Pitfall 6: Fixture silently stale after a toy retrain
**What goes wrong:** `merges.json` changes (the deferred corpus revision) and the committed toy rows no longer match the live toy in the playground.
**Avoid:** the freshness test (Gap 6).

### Pitfall 7: A hand-written note quotes a token count that later changes
**Avoid:** keep notes free of numbers where possible, or use the optional digit-check test (Gap 6).

## Code Examples

### e2e: requests around the load button (extends `e2e/privacy.spec.ts`)
```ts
// Pattern follows the existing privacy.spec.ts: record every request, compare before and after.
const urls: string[] = [];
page.on("request", (r) => urls.push(r.url()));
await page.goto("./");
// ... scroll the comparison into view, change the picker, wait for network idle ...
expect(urls.filter((u) => u.includes("/tokenizers/"))).toEqual([]);   // nothing before the click
await page.getByRole("button", { name: /Load GPT-2 and BERT/ }).click();
await expect.poll(() => urls.filter((u) => u.includes("/tokenizers/")).length).toBe(2);
const mark = urls.length;
await page.locator("textarea").fill("typing makes no requests \u{1F642}");
await page.waitForTimeout(700);
expect(urls.slice(mark)).toEqual([]);
// failure path: await page.route("**/tokenizers/**", (r) => r.abort()) before the click, expect the error copy and "Try again".
```
`[VERIFIED: e2e/privacy.spec.ts read this session]` for the recording pattern (`page.on("request", ...)`, `urls.slice(before)`, `waitForTimeout(700)`); the route-abort line is standard Playwright usage `[ASSUMED]`, confirm in the executor's run.

### Parity golden generator (run once, not a project dependency)
```bash
uv run --no-project --with tokenizers==0.23.2 python gen_parity.py   # prints ids and tokens per case
```
`tokenizers==0.23.2` was the version `uv` resolved here (`[VERIFIED: run]`); record whatever version is used in the golden's header.

## Runtime State Inventory

Not a rename or migration phase. Omitted.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | adapter, precompute script (native `.ts`), Vitest | yes | v24.21.0 | none needed |
| Network to huggingface.co | one-time download of the two pinned files | yes (HTTP 200 for both commits) | n/a | files are committed afterwards, so CI never needs it |
| `uv` + Python `tokenizers` | one-time parity golden generation only | yes (`uv` present; resolved `tokenizers` 0.23.2) | 0.23.2 | skip regeneration; the committed golden is enough |
| un.org / OHCHR | language sentences (one-time) | un.org yes (200); OHCHR translation pages 403 to bots, OHCHR PDFs 200 | n/a | un.org text plus PDF cross-check, done |
| `pdftotext` | not needed | no | n/a | `pypdf` via `uv` worked |

**Missing with no fallback:** none.

## Security Domain

`security_enforcement` is on (ASVS level 1, block on high).

| ASVS Category | Applies | Control |
|---------------|---------|---------|
| V5 Input validation | yes | Own-text input capped by `maxlength="1000"` (UI-SPEC); measured worst case 2.5 ms at 1000 characters, so no regex-DoS concern. Tokenizer-produced strings render as text (Svelte escapes); never use `{@html}` for token or sentence strings |
| V12 Files and resources / V14 Config | yes | Tokenizer files are committed, hash-pinned (manifest sha256) and parsed with `JSON.parse` from the site's own origin only |
| V8 Data protection | yes | Privacy promise unchanged: typed text never leaves the browser; the only network events are the two explicit file downloads |
| V2, V3, V4, V6 | no | No accounts, sessions, or crypto in this phase |

| Threat | STRIDE | Mitigation |
|--------|--------|------------|
| Malicious or swapped tokenizer file | Tampering | sha256 in manifest checked by a test; exact npm pin; `check-deps` allow-list |
| Supply-chain on the new npm package | Tampering | SUS checkpoint, exact pin, lockfile (Package Legitimacy Audit) |
| Reader text echoed into HTML | XSS | Text interpolation only; chips built from strings by Svelte |
| Third-party request at read time | Information disclosure | Self-hosted files; `check:dist` third-party-origin rule already scans HTML and CSS; e2e asserts same-origin requests |

## State of the Art

| Old | Current | Impact |
|-----|---------|--------|
| `@xenova/transformers` for tokenizing | `@huggingface/tokenizers` standalone | already decided in STACK |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Playwright `page.route(...).abort()` blocked-request pattern behaves as described for the retry test | Code Examples | Test needs adjusting; low |
| A2 | Putting the short commit in the file name is unnecessary because `max-age=600` bounds staleness to 10 minutes | Gap 4 | A stale tokenizer file for up to 10 minutes after a change; negligible for pinned immutable files |
| A3 | Shipping the Apache-2.0 text, the OpenAI MIT notice, and an OHCHR link satisfies the licences and reuse terms; one UDHR article with attribution is acceptable | Gaps 3, 4 | Not legal advice. Author should confirm before publishing; cost of being wrong is a takedown or a notice change |
| A4 | The Arabic Article 1 string from un.org equals OHCHR's Arabic text | Gap 3 | Wrong or differently diacritised Arabic sentence; author eyeballs once |
| A5 | Re-using whole Article 1 instead of the first sentence is acceptable to the user | Gap 3 | Needs a one-phrase UI-SPEC amendment; if refused, Spanish would need a different sentence source |

## Open Questions

1. **Whole Article 1 instead of "first sentence"?**
   - Known: Spanish Article 1 is a single sentence; the others have two; the first-sentence counts are not comparable.
   - Recommendation: whole Article 1 for all six; amend UI-SPEC section 3 caption and source line wording ("Article 1"). Planner can include as a UI-SPEC patch task or confirm with the user.
2. **`[UNK]` visibility in the languages table cells** (BERT zh 43 with 25 `[UNK]`).
   - Recommendation: conditional Muted text line under the number; one-line UI-SPEC amendment.
3. **Subline wording for BERT** to add "removes accents".
   - Recommendation: adopt; also possibly change the legend's `[UNK]` sentence to "that word or character".
4. **Shared comparator extraction** (`trainOnPieces`) touches a Phase 1 file.
   - Recommendation: do it as the first task of the stepper plan, guarded by `train:toy --check`.
5. **Arabic cross-check against OHCHR** needs a human in a browser once; fold into the author's one-time review of the sentences.

## Sources

### Primary (HIGH)
- `@huggingface/tokenizers@0.2.0` package contents and type declarations (installed in scratchpad); run results (parity, round-trip, timing, display path)
- Python `tokenizers` 0.23.2 (Rust reference) via `uv`, used only as an oracle
- Hugging Face model API and raw files for `openai-community/gpt2@607a30d` and `google-bert/bert-base-uncased@86b5e09` (licence front matter, files, sizes, sha256)
- `https://raw.githubusercontent.com/openai/gpt-2/master/LICENSE` (Modified MIT text)
- Repo files read this session: `scripts/check-deps.mjs`, `scripts/check-dist.mjs`, `scripts/check-base.mjs`, `scripts/lib/bpe-train.ts`, `src/core/presplit.ts`, `src/core/display.ts`, `src/core/types.ts`, `src/core/examples.ts`, `e2e/privacy.spec.ts`, `playwright.config.ts`, `astro.config.mjs`, `src/layouts/BaseLayout.astro`
- `https://www.un.org/{en,es,fr,ru,ar,zh}/about-us/universal-declaration-of-human-rights` and OHCHR PDFs `.../UDHR_Translations/{eng,spn,frn,rus,chn}.pdf` (fetched 2026-10-06)
- GitHub Pages response headers (`curl -I` on a Pages-hosted JSON file)

### Secondary (MEDIUM)
- OHCHR reuse wording: https://www.ohchr.org/en/human-rights/universal-declaration/universal-declaration-human-rights/about-universal-declaration-human-rights-translation-project (seen via search result summary, page itself not fetched)
- UN terms of use: https://www.un.org/en/about-us/terms-of-use (read)

## Metadata

**Confidence breakdown:**
- Adapter and parity: HIGH, executed against the reference
- Licences and hashes: HIGH for the facts, MEDIUM for how notices must be shipped
- Language source: HIGH for text (4 of 6 exact against OHCHR PDFs, zh by characters), MEDIUM for Arabic
- Test strategy: HIGH

**Research date:** 2026-10-06
**Valid until:** 2026-11-05 (the library is pre-1.0; re-run the parity golden if the pin moves)

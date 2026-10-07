# Evaluation: drop the toy tokenizer, use GPT-2 for the examples and the playground

## Summary

- **Verdict: recommend, with conditions.** Use GPT-2 for the playground and every example, keep the BPE stepper, and make the comparison GPT-2 vs BERT.
- **Why (reader first):** with the toy, everyday words split oddly ("common" becomes three chips) next to prose saying they stay whole. In GPT-2, 10 of the 11 words in the default sentence are one chip, and every split shown is one a real model makes.
- **Also:** the post goes from three tokenizers to two; about 12 files and 20 unit tests become dead; the real ids can feed the Phase 3 embeddings strip.
- **Cost:** the playground now needs a 0.55 MB download (0.44 MB if brotli) and gains a failure state. It also reopens verified Phase 1 and 2 work (about 50 files).
- **Two prose catches:** only "Tokenization" splits in the current default sentence, so it must change; GPT-2's ids (t = 83, space = 220) disagree with the byte-value ids the post and stepper teach, so one sentence must say so.
- **Stepper: keep it**, relabel it as a miniature, and add a bridge: the same cat-sat sentence is 20 pieces after ten merges but 13 tokens in GPT-2. Stepper code and tests are unaffected.
- **Effort:** about 25 to 33 hours, roughly 5 plans. Too big for a quick task; run it as a decimal Phase 2.1.
- **Requirements and roadmap:** amend FOUND-07 and TOK-07 and reopen them until Phase 2.1 verifies; edit ROADMAP lines 5, 15, 16, 33, 65, 72, 75; update PROJECT.md. EMB-01 and EMB-02 need no change (they mean "toy vectors"); optionally say the ids are real and the vectors invented.

Quick task 261006-riu. Date: 2026-10-06. Evaluation only: no file under `src/`, `public/`, `scripts/` or `e2e/` was changed.

All "toy" and "GPT-2" splits quoted below were produced by running the repo's own code (`src/core/toy.ts` and the adapter in `src/core/realTokenizer.ts` over the shipped `public/tokenizers/gpt2.json`) from a throwaway script outside the repo. Nothing here is typed from memory.

## 1. Scope and assumptions

Locked by `261006-riu-CONTEXT.md` (not revisited here):

- **Deliverable:** this document only. The author decides afterwards whether to implement.
- **Scope if GPT-2 replaces the toy:** "re-tell the story". The prose is rewritten around GPT-2's real splits (the "common words stay whole" point and the "real tokenizers differ in three ways" caveats), not a minimal swap of the tokenizer behind the widgets.
- **Comparison:** becomes GPT-2 vs BERT (byte-level BPE vs WordPiece). This document lists the edits to FOUND-07, TOK-07 and the ROADMAP wording, and the effect on EMB-01 and EMB-02.
- **BPE stepper:** Claude's discretion. Assessed in section 8.

One fact about the current state that the locked scope does not mention but that shapes everything: today the comparison card has **three** rows (toy, GPT-2, BERT), and the languages table has three columns. "GPT-2 vs BERT" therefore means deleting the toy row and column, not restructuring the comparison. The GPT-2 and BERT rows, their pinned counts and their notes about each other are already in `src/core/compare/comparison.json` and do not change.

## 2. What the toy does today

The toy is a byte-level BPE tokenizer whose 800 merges (`src/core/toy/merges.json`, 13 KB, 3.2 KB gzipped) were learned offline by `scripts/train-toy-bpe.ts` from a public-domain novel (`scripts/corpus/alice.txt`, 144 KB) plus a 6 KB author-written supplement of dates, prices and contractions. At run time `src/core/toy.ts` pre-splits the text with a simplified GPT-2 regex (`src/core/presplit.ts`), turns each piece into UTF-8 bytes and applies the merges in rank order (decision D-03). It is synchronous and needs no download, so the playground (`Playground.svelte`), the build-time prose figures (`prose/ToyTokens.astro`) and the first row of every comparison all call the same `tokenize()` function. The vocabulary ids are 0 to 255 for the raw bytes and 256 and up for merges, which matches the stepper's id scheme exactly. Because 800 merges over one novel is a tiny vocabulary, its splits of everyday words are odd, and the post spends a whole section ("The tokenizer behind the demos") apologising for that and explaining how real tokenizers differ.

## 3. Reader-comprehension impact (non-programmer audience)

### 3.1 The post's own strings, toy vs GPT-2

`·` separates chips, `␣` is a leading space, `[..]` is one hatched chip (a token holding only part of a character, shown as hex). Counts in brackets.

| Text (source) | Toy | GPT-2 |
|---|---|---|
| Default text and first figure (`DEFAULT_TEXT`) | (27) T·o·ken·iz·ation·␣sp·l·it·s·␣un·us·u·al·␣words·␣into·␣piece·s·,·␣but·␣com·m·on·␣words·␣st·ay·␣whole·. | (14) Token·ization·␣splits·␣unusual·␣words·␣into·␣pieces·,·␣but·␣common·␣words·␣stay·␣whole·. |
| A rare long word (`rare-word`) | (27) The·␣word·␣fl·o·c·c·in·au·c·in·i·h·i·li·p·il·if·ic·ation·␣is·␣al·m·ost·␣never·␣us·ed·. | (16) The·␣word·␣fl·occ·in·auc·in·ihil·ip·il·ification·␣is·␣almost·␣never·␣used·. |
| Numbers and dates (`numbers-dates`) | (29) O·n·␣202·6·-·1·0·-·0·3·␣I·␣p·aid·␣$·1·,·2·3·4·.·5·6·␣for·␣3·␣t·ick·et·s·. | (19) On·␣20·26·-·10·-·03·␣I·␣paid·␣$·1·,·234·.·56·␣for·␣3·␣tickets·. |
| Two emoji (`emoji`) | (18) G·reat·␣j·o·b·␣·[F0]·[9F]·[8E]·[89]·␣see·␣you·␣soon·␣·[F0]·[9F]·[99]·[82] | (9) Great·␣job·[20 F0 9F]·[8E]·[89]·␣see·␣you·␣soon·␣🙂 (the second emoji is **one** whole token) |
| Anna Karenina line (`literature`) | (34) H·a·pp·y·␣f·am·i·li·es·␣are·␣all·␣a·li·ke·;·␣every·␣un·ha·pp·y·␣f·am·ily·␣is·␣un·ha·pp·y·␣in·␣its·␣o·wn·␣way·. | (16) Happy·␣families·␣are·␣all·␣alike·;·␣every·␣unhappy·␣family·␣is·␣unhappy·␣in·␣its·␣own·␣way·. |
| Non-English line (`non-english`) | (22) every byte its own hatched chip, plus one space chip | (10) [E7 94]·[B7]·女·[20 E3 81]·[93]·ん·に·[E3 81]·[A1]·は |
| Second figure, `Great job 🎉` | (10) G·reat·␣j·o·b·␣·[F0]·[9F]·[8E]·[89] | (5) Great·␣job·[20 F0 9F]·[8E]·[89] |
| Stepper sentence, "the cat sat on the mat and the cat sat on the hat" | (15) the·␣cat·␣sat·␣on·␣the·␣m·at·␣and·␣the·␣cat·␣sat·␣on·␣the·␣·hat | (13) one token per word. The stepper itself ends at 20 pieces after its 10 merges (`STEPPER_FACTS.endPieces`). |
| Morpheme example in the prose, "unhelpful" | un·he·l·p·ful | un·help·ful |

Other GPT-2 splits worth knowing for the rewrite: "hello" is 1 token (toy: he·ll·o), "walking" is 1, "walked" is walk·ed, "tokenizer" is token·izer, "Antidisestablishmentarianism" is Ant·idis·establishment·arian·ism.

### 3.2 Gains

1. **"Common words stay whole" stops contradicting itself.** This is the exact problem named in ROADMAP Phase 2 criterion 6. In the toy, "common" is three chips (`␣com·m·on`), "stay" is two (`␣st·ay`), "splits" is four. In GPT-2, 10 of the 11 words in the default sentence are single chips. The softening of D-17 ("many everyday words") would no longer be needed as an apology; it becomes simply true.
2. **One fewer concept to hold.** Today a reader meets three tokenizers in one article: the stepper's miniature, a playground "toy" that is "the same algorithm... trained on a small corpus", and the real ones. The post has to explain how the playground toy relates to the stepper and to the real ones, and the pinned sentences show it (section 4). With the swap there are two: a miniature that teaches the idea, and the real thing.
3. **Every split in the article is something a real model actually does.** The core promise is "a correct mental model of what a token is". The toy's splits (`un·ha·pp·y`, `f·am·ily`) are artefacts of one novel and 800 merges; a reader who later opens a real tool and sees `Happy·␣families·␣unhappy` has learned that the article's picture was off. The "tiny toy, real ones differ" caveat paragraph exists to defuse exactly that.
4. **The real ids are on screen.** Switching the playground to Token IDs shows GPT-2's actual ids (for example 30642 for `Token`), the same ids the comparison "Look inside" tables show. The EMB-01 strip can reuse real ids (section 7).
5. **The emoji and 男 teaching points get sharper, not weaker.** GPT-2 cuts 男 as `E7 94 · B7`, which is precisely the prose example ("the bytes `E7 94 B7`, and the tokenizer may cut between them"); the toy cuts all three bytes apart and so cannot show that a real tokenizer's cut falls in the middle. Numbers still show the point (`202·6`, `20·26·-·10·-·03`; GPT-2 keeps short runs of digits).
6. **The comparison lead-in becomes true.** `<ComparisonSection>` currently says "These are two older tokenizers" above a card that shows three rows. After the swap there are two rows.

### 3.3 Losses and new risks

1. **The default sentence stops demonstrating a split.** In GPT-2 only "Tokenization" splits (`Token·ization`); "splits" and "unusual" are single tokens. The sentence "Tokenization splits unusual words into pieces" would be partly false for the very figure that carries it. The build-time claim `has-word-split` still passes (because of `Token·ization`), so the build would not catch the overstatement. The default text and the figure's text must change. Candidates run through GPT-2: "Tokenization splits rare words like zyzzyva into pieces, but common words stay whole." (19 tokens, `z·y·zzy·va` visibly splits, 10 of the other words whole) or "Antidisestablishmentarianism splits into pieces, but common words stay whole." (`Ant·idis·establishment·arian·ism`). The rare-word example chip already covers the long-word case, so the default should be a short, friendly sentence with one genuinely rare word.
2. **GPT-2's id scheme does not match the ids the article just taught.** The "How the numbers are assigned" section, the byte facts (t = 116, space = 32) and the stepper all say the vocabulary starts with the 256 byte values as ids 0 to 255. In GPT-2, `t` is id 83, `a` is 64, a space is 220 and `!` is 0, because GPT-2 orders its 256 starting symbols differently; merged tokens are not at 256 and up in the stepper's order either (`at` is 265 in GPT-2 but 256 in the stepper). A reader who flips the playground to Token IDs will see numbers that disagree with the stepper. The existing sentence "a different tokenizer would give the same token a different id" already covers this in principle, but it needs one concrete bridging sentence (the playground ids are GPT-2's own numbering, not the stepper's). This is a real comprehension cost created by the swap; the toy shares the stepper's scheme and so has no such mismatch.
3. **Loss of inspectability.** The toy's 800 merges are small enough that the author could explain them; GPT-2's 50,000 are not inspectable by a reader. This matters little: the stepper is the inspectable device (section 8), and no reader inspects the toy's merge list today.
4. **Partial-character chips get slightly busier.** GPT-2 attaches a space to the first bytes of a following character: `[20 F0 9F]` for ` 🎉` and `[20 E3 81]` for ` こ`. A chip can therefore hold a space plus two bytes of an emoji. The framing and labels already handle this (see 5.5), and the existing prose ("a space is part of the token") covers it, but a reader may stumble on the first hatched chip showing `20 F0 9F` rather than just `F0 9F`.
5. **The two emoji in the `emoji` example behave differently.** In GPT-2 the first emoji is cut into three byte chips but the second is one whole token. This is good for the "some characters, such as emoji, are too big for one token" bullet (it says "some") but the example no longer shows two identical cuts; the comparison note for `emoji` must be rewritten (section 7).
6. **A typed `<|endoftext|>` becomes a special chip.** The toy treats the string as plain text; GPT-2's tokenizer recognises it as its special end-of-text marker (`special: true`, already tested in `realTokenizer.test.ts`). The playground's built-in legend does not explain special chips (only the comparison and languages views pass `special` to `TokenLegend`), so the playground needs a one-line legend entry or it will show an unexplained chip. Low severity, but new.
7. **GPT-2 is a 2019 tokenizer.** The playground then teaches "this is how a tokenizer cuts text" with a 2019 vocabulary. The post already says GPT-2 has 50,257 entries and GPT-4o 200,019 with citations, and the comparison says "Newer models may cut text differently". A sentence in the rewritten "tokenizer behind the demos" section should say plainly that GPT-2 is old and modern models cut differently (for example in digits and in non-English text).

### 3.4 Net judgement on comprehension

The swap is a net gain for a non-programmer. The toy's central flaw, splitting everyday words in ways that look arbitrary and contradict the article's own claim, is gone, and the cost (one id-scheme caveat, one changed default sentence) is small and fixable in prose. The one thing the toy did better is internal consistency with the stepper's id scheme, and that is worth a sentence, not a reason to keep it. The stepper keeps the "I can see the machinery" job (section 8).

## 4. Prose passages affected

Source: `src/content/posts/what-is-a-token.mdx` (183 lines). Line numbers are from the current file. "Pinned" means a Vitest or Playwright assertion quotes the sentence word for word, so editing it also means editing the test.

| MDX lines / heading | Passage summary | Depends on toy output? | Action | Notes |
|---|---|---|---|---|
| 8-29 "How does a computer store text?" (incl. `<TextAsNumbers>`) | Characters, ASCII, Unicode, UTF-8; byte values from the engine of the stepper | No | Keep | `TextAsNumbers` is separate from the toy. The byte values (t = 116, space = 32) come from the stepper facts and are real UTF-8; they are what makes GPT-2's different ids (3.3 item 2) need a sentence later. |
| 31-37 "What is a language model, and why numbers?" | NLP, language model, ids are labels | No | Keep | Pinned sentences stay valid. |
| 39-47 "Why not feed in raw bytes?" | Bytes vs words; defines vocabulary, **token**, tokenizer, ids; the cat-sat sentence with `<Fact>` counts | No (stepper facts) | Keep | The 13 words vs 49 bytes figures come from `STEPPER_FACTS`, not from the toy. |
| 49-53 "Tokens are not words" | Same sentence can contain more tokens than words; many everyday words one token; a space can be part of a token | Indirectly (claims are checked against the default text) | Keep | All three statements are true under GPT-2 (default: 14 tokens, 11 words). Pinned sentences remain valid. |
| 55-61 "How the numbers are assigned" | Ids are positions in a list; line 59 says "In the demo below, the vocabulary starts as the 256 single byte values, with the ids 0 to 255, and every new token is added at the end"; line 61 says a different tokenizer gives the same token a different id | Line 59 and 61 refer to the stepper ("demo below"); but the playground ids will now disagree with them | Relabel (add one sentence) | Add: the playground shows GPT-2's own numbering, which lists its 256 starting symbols in a different order. Do not type numbers by hand (the content test forbids uncited numbers); use a build-time `<Fact>` or no number. Line 61 is pinned. |
| 63-69 "Why not just split on spaces, or on meaning?" | Word-level vocab, BPE, morphemes ("unhelpful" is un + help + ful) | No | Keep (optional touch) | GPT-2 happens to split "unhelpful" as `un·help·ful`, exactly the post's morpheme example. The cited claim that BPE tokens "often differ from morphemes" remains true in general; an author may want to avoid implying BPE never gets it right. Optional. |
| 71 `<StepperSection>` lead-in | "Byte-pair encoding builds a tokenizer's list of tokens ... Step through a tiny example." | No | Keep or relabel lightly | Pinned verbatim (`STEPPER_SLOT_SENTENCE`). Recommendation in section 8: add that the stepper is a miniature that learns from one sentence. |
| 73-83 "What the step by step example showed" | Pair counts, tie rule, merge budget, vocabulary 256 + 10 = 266, "that" built from known tokens, cat emoji falls back to bytes | No (stepper engine) | Keep, and add a bridging paragraph at the end | New paragraph: the same cat-sat sentence in GPT-2 is one token per word (13), against the stepper's 20 pieces. This is the best teaching moment the swap creates (section 8). Needs a build-time figure. |
| 85 "## The tokenizer behind the demos" (heading) | Section heading | Yes (names "the demos") | Rewrite or keep | Pinned in `HEADINGS`, in the section-order test and in `merges the tokenizer description...`. A better heading is "A real tokenizer: GPT-2". |
| 87 | "The examples below use the same tokenizer algorithm as the step by step example above, but it is trained on a small corpus of English text. It is a tiny toy, but it works the same way as the real tokenizers used in popular models. Real tokenizers follow the same steps, but their vocabularies are far bigger, so their splits will differ from the ones you see here. Many popular models use byte-pair encoding, though not all do." | Yes: describes the toy | Rewrite | Replace with: the examples below use GPT-2's real tokenizer (byte-pair encoding on bytes, trained by OpenAI on a large amount of web text, cite the existing GPT-2 paper reference 16), it is an older tokenizer and newer models cut text differently. Two sentences are pinned (`REQUIRED_SENTENCES` quotes "It is a tiny toy..." and "The examples below use the same tokenizer algorithm..."), plus the order test `introduces the demo tokenizer after the stepper`. |
| 89 | "Compared with the tiny toy in the step by step example, real tokenizers differ in three ways. They learn from a huge amount of text, not from one sentence. They split text with a rule before merging... And their vocabularies hold tens of thousands of tokens or more." | Yes: contrasts "tiny toy" with "real" | Rewrite (keep the three ways) | The three ways are still the correct teaching content, now phrased as "GPT-2 differs from the step by step example in three ways" with GPT-2 as a concrete subject. Pinned in `REQUIRED_SENTENCES` (two pins) and in `e2e/post.spec.ts` (l). The e2e test even handles the curly apostrophe, so its regex needs rewriting too. |
| 91 | GPT-2 has 50,257 entries; GPT-4 100,257; GPT-4o 200,019 (cited) | No | Keep | Already cited and checked by the "numbers from engine or citation" test. Could now say "the tokenizer you are using has 50,257". |
| 93-99 first `<ToyTokens>` figure and its lead-in | Default sentence cut up, "Count the chips, then compare your count with the caption underneath"; `expect=["more-tokens-than-words","has-word-split","has-leading-space-token","has-whole-common-word"]` | Yes: text and claims | Rewrite text; rename component | Text must change (3.3 item 1). Claims `has-word-split` and `has-whole-common-word` are implemented by `claims.ts` via `presplit()` and the toy; reimplement over GPT-2 tokens. Rename `ToyTokens` (e.g. `TokenFigure`): it is a registered MDX component, in the closed vocabulary test, in `PostLayout.astro`, in `e2e/post.spec.ts` selectors (`figure.toy-tokens`), and the "gives every ToyTokens an expect attribute" test. |
| 101 | "Notice that many chips start with a small symbol. It marks a space..." | Weakly | Keep | True under GPT-2 (almost every chip after the first has the `␣`). |
| 103 `<PlaygroundSection>` lead-in | "Type or paste anything, or pick an example, and watch it split into tokens." | No | Keep | Pinned. Note it promises an instant result; with GPT-2 the card needs a loading state before it is true (section 6). |
| 105-111 "What you just saw" | Three bullets: spaces belong to tokens; rare words split while many everyday words stay whole; emoji, hatched chips, frames, the 男 example `E7 94 B7` | Bullets 1-2 depend on example behaviour; bullet 3 on cut points | Keep, small edit | Bullet 2 is pinned and now true. Bullet 3 stays true (GPT-2 genuinely cuts `E7 94 · B7`); could be sharpened to say the tokenizer "may cut between them, as it does here". The test `keeps the bytes quoted in the post equal to the real encoding` is independent of the toy. |
| 113-115 second `<ToyTokens>` ("Great job 🎉", `expect=["has-split-character"]`) | Emoji figure with hatched frame | Yes | Keep text, rename component | GPT-2 gives 5 tokens and one split character (the claim holds). The first hatched chip now reads `20 F0 9F` (space plus two bytes) rather than `F0 9F`. Frame label unchanged. `e2e/post.spec.ts` (j) expects exactly one frame labelled 🎉 in the figures: still true. |
| 117 | "Switch the playground above to Token IDs to see the id each token gets." | Yes (the ids shown) | Keep | The ids are now GPT-2's real ids; combine with the id-scheme sentence added at line 59-61. |
| 119 `<ComparisonSection>` lead-in | "These are two older tokenizers, picked because they are small and free to share. Newer models may cut text differently..." | Currently wrong (three rows), becomes right | Keep | Pinned verbatim. No edit needed; it was already written for the GPT-2 vs BERT end state. |
| 121 `<LanguagesSection>` lead-in | "The same sentence, in six languages, cut by the same three tokenizers. Look at the counts." | Yes (says "three") | Rewrite ("two tokenizers") | Pinned verbatim in `post-content.test.ts` (`LANGUAGES_SLOT_SENTENCE`). |
| 123-183 References | 19 references | No | Keep | No reference is toy-specific. Reference 16 (GPT-2 paper) and 18/19 (tiktoken) already support the new GPT-2 sentences. A reference for the size or contents of GPT-2's training data is the paper already cited as 16. |
| Accessibility text quoting toy tokens | `ToyTokens.astro` `.sr-only` "Tokens for the example: ..." and the caption "N tokens, M words" are built from the tokenizer output | Yes, but generated | Keep (regenerates) | No hand-typed token text; it regenerates from the new tokenizer. Hand-typed toy mentions are in the comparison and languages components (section 5): captions "Tokens for the toy tokenizer", `Toy tokenizer: N tokens.` live-region announcements, `LanguagesTable` caption "three tokenizers". |
| Captions and alt text in the post body | None are hand-typed in MDX (figures use generated captions) | No | None | |

Summary of the prose work: five passages rewritten (lines 85, 87, 89, 93-99 text, 121), one new bridging paragraph (after line 83), two one-sentence insertions (ids around line 59-61, special-token and age notes around 87), the remaining 16 passages untouched. The post is at 2,671 words against a 2,750 ceiling; the rewrite is roughly length-neutral because the toy explanation and the "three ways" paragraph are replaced one for one.

## 5. Code and tests: dead, rewritten, kept

The key structural finding: **the toy tokenizer and the BPE trainer/stepper logic are separable.** `src/core/stepper.ts` imports only `bpe.ts` and `display.ts`; it does not import `toy.ts`, `presplit.ts` or `merges.json`. The toy is a leaf that the playground, the prose figure, the claims checker and the first comparison row hang off.

### 5.1 The toy tokenizer proper (becomes dead)

| File | Action | Why |
|---|---|---|
| `src/core/toy.ts` (96 lines) | Delete, after moving `isValidUtf8` | Only the toy needs the rest. `isValidUtf8` is imported by `src/core/realTokenizer.ts` and `src/core/compare/fixture.ts`, so it moves (for example into `chars.ts`) before the delete. |
| `src/core/toy/merges.json` (811 lines, 13 KB) | Delete | Shipped merge list; no other consumer. |
| `src/core/presplit.ts` (10 lines) | Delete | Imported by `toy.ts`, `claims.ts`, `scripts/lib/bpe-train.ts` and one stepper test (y). `stepper.ts` has its own `splitWords`. After the claims rewrite nothing needs it. |
| `scripts/train-toy-bpe.ts`, npm script `train:toy` | Delete | Trains and checks `merges.json`. |
| `scripts/lib/bpe-train.ts` | Delete | `trainMerges`/`formatMergeData`; only the toy trainer and two tests use it. |
| `scripts/corpus/alice.txt` (144 KB), `supplement.txt`, `README.md`; `scripts/prepare-corpus.ts`, npm script `prepare:corpus` | Delete | Training corpus and its one-off downloader. Removing the Project Gutenberg text also removes one provenance and licence item from the Phase 5 content check, and closes DEFERRED-FROM-PHASE-2.md section 4 ("revisit the toy's training corpus"). |
| `src/core/types.ts` | Adapt | Keep `Token`; delete `MergeMeta`, `MergeData`, `ToyTokenizer`. |

### 5.2 Kept: the BPE trainer and stepper

| File | Action | Why |
|---|---|---|
| `src/core/bpe.ts` | Keep | `trainOnPieces`, `rankPairs`, `comparePairs` are what the stepper runs. Only the header comment changes (it says the offline toy trainer and the stepper share it "so they cannot disagree"; that rationale disappears). |
| `src/core/stepper.ts`, `src/components/BpeStepper.svelte`, `wrappers/StepperSection.astro` | Keep | No code change. Header comment mentions "the same code the offline toy trainer runs". |
| `src/core/stepper.test.ts` (29 tests) | Keep, edit one test and two imports | Test (y) "trainMerges equals trainOnPieces..." imports `scripts/lib/bpe-train.ts` and `presplit.ts`; remove it. |
| `src/core/toy.golden.test.ts` (d) Sennrich goldens (`low lower newest widest` gives `[es]` then `[lo]`) | Re-home | The hand-computed tie-break golden that `.claude/CLAUDE.md` asks for is only exercised through `trainMerges`. Re-write it as a three-line `trainOnPieces` test inside `stepper.test.ts` so the golden survives the delete. |
| `e2e/stepper.spec.ts` (18 tests), `check-core.mjs` stepper half | Keep | Unaffected. |

### 5.3 Components and prose figures

| File | Action | What changes |
|---|---|---|
| `src/components/Playground.svelte` (515 lines) | **Rewrite (substantial)** | Imports `tokenize` from `toy.ts` and runs it synchronously inside `$derived`. Becomes: initial tokens from props (server-rendered default text), tokenizer loaded in `onMount` through `loadTokenizer`, two-level lifecycle state, error and retry, legend entry for special chips. Counts, view toggle, peek, examples, table, live region are unchanged. See section 6. |
| `src/components/prose/ToyTokens.astro` (55 lines) | Rewrite and rename | Calls `tokenize` from `toy.ts` at build time. Needs a Node-side GPT-2 (read `public/tokenizers/gpt2.json`, dynamic-import the library, build once per build) or fixture-fed tokens. Class `toy-tokens` is used by three e2e specs. Registered in `PostLayout.astro` and the content test's closed vocabulary. |
| `src/layouts/PostLayout.astro` | Adapt | Rename in the component map and the header comment. |
| `src/core/claims.ts` | Adapt | `checkClaim` calls the toy's synchronous `tokenize` and `presplit`. Reimplement over GPT-2 tokens (split text into words with a small regex local to `claims.ts`, tokenise each word with the build-time GPT-2). The five claim names stay. |
| `src/core/examples.ts` | Adapt | `DEFAULT_TEXT` changes (3.3 item 1); header comment cites `toy.golden.test.ts`. The five `EXAMPLES` texts and ids stay; the comparison fixture and regression corpus are keyed to them. |
| `src/components/OwnText.svelte` | Adapt | Remove the toy row from `Rows`, from `result`, from the live-region announcement ("Toy tokenizer: N tokens...") and from the table list. Becomes GPT-2 and BERT only. |
| `src/components/Comparison.svelte`, `LanguagesDemo.svelte`, `TokenRows.svelte`, `LanguagesTable.astro` | Adapt | Each hard-codes `toy` in a `RowSet` type, a fixture conversion, the announcement text, the three table captions and (for `LanguagesTable.astro`) a column list, the table caption "three tokenizers" and the sources line. Mechanical but touches ~12 sites. `Comparison.svelte` also says "...and this page's toy tokenizer." in the provenance line. |
| `src/components/loadTokenizer.ts` | Adapt | Add a per-id memoised promise so the playground, the own-text block and any later post share one request and one built instance (section 6). Stays the only file allowed to call `fetch` (`scripts/check-repo.mjs` `FETCH_ALLOWED_FILES`). |
| `src/components/TokenLegend.svelte` | Adapt | The `special` line only explains `[UNK]`. Add the end-of-text marker wording for the playground. |
| `TokenDisplay.svelte`, `TokenTable.svelte`, `Chip.svelte`, `Picker.svelte`, `IslandStatus.svelte`, wrappers | Keep | Token-shape generic. |

### 5.4 Comparison data and scripts

| File | Action | What changes |
|---|---|---|
| `src/core/compare/comparison.json` (83 KB) | Regenerate | Drops every `toy` row and `meta.toy`. Measured as serialised row data: the toy rows are 24 KB of 56 KB (GPT-2 16 KB, BERT 16 KB), the largest share because the toy emits the most tokens. The GPT-2 and BERT rows do not change. |
| `src/core/compare/fixture.ts` | Adapt | `FixtureRows` loses `toy`; `ComparisonFixture.meta.toy` removed; the `isValidUtf8` import moves. |
| `src/core/compare/rows.ts` | Adapt | Drop the toy row; reword the GPT-2 subline ("Works on bytes like the toy, with a far bigger vocabulary"). |
| `src/core/compare/notes.ts` | Rewrite | Four of five notes and `LANGUAGES_NOTE` name the toy (section 7). |
| `scripts/lib/comparison-build.ts`, `scripts/precompute-comparison.ts` | Adapt | Remove the `toy` and `mergesText` inputs and the `toy` field of `rowsFor`. |
| `scripts/check-core.mjs` | Adapt | First half imports `toy.ts` and expects `tokenize("Hi")` to give 2 tokens. Replace with a native-Node load of `realTokenizer.ts` or drop; the stepper half stays. |
| `scripts/gen-adapter-parity.py` and `src/core/fixtures/adapter-parity.json` | Re-run if `DEFAULT_TEXT` changes | The golden has a `default-text` case and a test pins it equal to `DEFAULT_TEXT`. A new default sentence needs a regenerated case from the Rust reference (`uv run --no-project --with tokenizers==0.23.2 ...`). This is a gain: the new playground default is parity-checked against the reference. |
| `scripts/check-dist.mjs`, `check-repo.mjs`, `check-base.mjs`, `check-deps.mjs` | Keep | `check-dist` requires `data-playground` and server-rendered `data-chip` in `index.html`; the SSR design in section 6 preserves that. |
| `package.json` | Adapt | Remove `train:toy`, `prepare:corpus`. |

### 5.5 Does the display layer already handle GPT-2 output?

Yes. I ran the whole 22-entry regression corpus plus the fifth example (`男女 こんにちは`) through the repo's GPT-2 adapter and the unchanged `groupBytes`, `chipText`, `tableCell` and `speakToken` (script in the session scratchpad, not in the repo):

- Every input round-trips to its exact UTF-8 bytes (the one apparent exception, `<|endoftext|>`, is correctly returned as one special chip).
- No replacement character appeared in any chip text, table cell or spoken text (23 inputs, three text surfaces each, 0 hits).
- The invariant that `chars.test.ts` calls "frames every partial token and no other" holds for GPT-2 with 0 mismatches.
- A token that mixes a space and the first bytes of a character (`[20 F0 9F]`, `[20 E3 81]`) is handled: it is framed and the table reads "Bytes 1 to 2 of 4 of 🎉".
- Performance: five worst-case 1,000-character inputs (repeated `a`, `ab`, spaces, CJK, emoji) tokenised in 1 to 13 ms each in Node; building the tokenizer from parsed JSON took 50 ms. The toy's 200 ms budget (`regression.test.ts`) holds with a wide margin.

So **no display-layer change is needed**, only the tests that pin toy-shaped expectations.

### 5.6 Unit tests

Counts are the number of `it`/`test` declarations in each file (grep).

| File (tests) | Action | Toy-hard-coded content |
|---|---|---|
| `src/core/toy.test.ts` (8) | Delete | All toy. |
| `src/core/toy.golden.test.ts` (11) | Delete; re-home the tie-break golden (5.2) | All toy; `(g)` examples round-trip is already covered by `realTokenizer.test.ts` (28 parity cases include the examples) and `compare/fixture.test.ts`. |
| `src/core/claims.test.ts` (11) | Rewrite | Cases such as "hello is three tokens (he, ll, o)" are toy facts; under GPT-2 "hello" is one token. |
| `src/core/regression.test.ts` (15) | Adapt | The 22-entry per-corpus block (110 generated cases) is tokenizer-agnostic and carries over once `tokenize` is the injected GPT-2. Changes, measured: emoji example 8 partial, 2 split characters becomes 3 partial; ZWJ family 18 tokens becomes 10; Japanese 9 becomes 6; lone surrogate "3 partial" becomes 1 non-partial token (GPT-2 sees U+FFFD, valid UTF-8); special-token string "tokenized as plain text" becomes one special chip; the 1,000-CJK test "3,000 tokens" becomes 2,000 and its first-row wording ("Byte 1 of 3 of 日") may change. Five of seven "exact expectations" plus one performance test change. |
| `src/core/chars.test.ts` (53) | Adapt one block | Block "regression corpus through the real toy tokenizer": 5 of 11 `FRAME_COUNTS` change (zero-width 1 to 0, lone-surrogate 1 to 0, emoji-example 2 to 1, cafe-precomposed 1 to 0, fifth example 7 to 3), the `男女 こんにちは` test (7 frames, 21 hatched chips, 1 space chip becomes 3 frames, 6 hatched chips) and the comment "The toy never merges non-ASCII bytes". The remaining tests build their tokens by hand. |
| `src/core/counts.test.ts` (19) | Adapt | One toy `tokenize` import; check which cases depend on toy splits. |
| `src/components/TokenDisplay.test.ts` (28) | Adapt | Three tests render toy output ("the toy's output for 日本語 as three frames of three chips", "for 男女 and the party popper", "no frame for the toy's output on the default-style sentence"). Replace with hand-built token fixtures; the file already has a helper for per-byte partial tokens. |
| `src/core/compare/fixture.test.ts` (15) | Adapt | Remove the toy from the freshness recomputation, the round-trip tests ("toy and GPT-2 rows") and `meta.toy`. The pinned GPT-2 and BERT counts (examples [16,16], [19,19], [9,7], [16,16], [10,7]; languages en 33/32 ... zh 86/43) do **not** change. |
| `src/core/compare/notes.test.ts` (8) | Adapt | Row-order test expects `["toy","gpt2","bert"]` and the toy's year-less name; notes tests check they only say what the rows show. |
| `src/content/post-content.test.ts` (39) | Adapt (about 8 tests) | Pinned sentences listed in section 4: four `REQUIRED_SENTENCES` entries, `LANGUAGES_SLOT_SENTENCE`, the `<ToyTokens` marker in the section-order test, the `HEADINGS` array, the closed component vocabulary, "gives every ToyTokens an expect attribute", "merges the tokenizer description...", "introduces the demo tokenizer after the stepper". |
| `src/core/realTokenizer.test.ts` (15) | Keep, one dependency | Case `default-text` follows `DEFAULT_TEXT` (5.4). |
| `src/components/loadTokenizer.test.ts` (62 lines) | Add tests | Memoised load: one request per id; failed load is not cached. |
| `src/core/display.test.ts`, `tokenizerFiles.test.ts`, `TokenTable.test.ts` | Keep | Token-shape generic. |

### 5.7 End-to-end specs (26 files)

| Group | Files | Why |
|---|---|---|
| Must change | `post.spec.ts` (selector `figure.toy-tokens` in 4 tests; pinned "Compared with the tiny toy..." in (l)), `frames.spec.ts` (typing 男 expects 3 hatched chips and "3" tokens, GPT-2 gives 2; 日本語 expects 9 chips, GPT-2 gives 6; the fifth example's 7 frames, 21 hatched chips and one space chip), `resilience.spec.ts` (`EXACT` table: japanese 9, zwj-family 18, lone-surrogate 3 and `FRAMES` chip counts), `states.spec.ts` (test (g) forces a tokenizer error by breaking `TextEncoder.prototype.encode`; the HF library does not use `TextEncoder` the same way, so the hook needs replacing; plus fixed row counts for the table), `comparison.spec.ts`, `comparison-load.spec.ts`, `languages.spec.ts` (all three: `ROW_ORDER = ["toy","gpt2","bert"]`, the announcement regex `^Toy tokenizer: ...`, table captions, toy `[UNK]` checks), `privacy.spec.ts` (second test asserts no `/tokenizers/` request is ever made on the page; once the playground loads GPT-2 the premise changes) |
| Review for hidden dependencies | `playground.spec.ts`, `controls.spec.ts`, `a11y.spec.ts`, `a11y-phase2.spec.ts`, `island-lifecycle.spec.ts`, `smoke.spec.ts`, `phone-width.secondary.spec.ts` | They open the playground and wait for `data-state="ready"`; they must still pass with a tokenizer download in the path, and the `ready` meaning must stay stable (section 6). |
| Unchanged | `stepper.spec.ts` | Stepper only. |

## 6. Page weight and loading behaviour

### 6.1 Measured sizes

From `public/tokenizers/` and `src/core/toy/merges.json` (bytes; gzip is `gzip -9`, brotli is quality 11):

| File | Raw | gzip | brotli |
|---|---|---|---|
| `gpt2.json` | 1,355,256 | 548,929 | 443,977 |
| `bert-uncased.json` | 466,062 | 192,495 | 147,964 |
| `toy/merges.json` (bundled in the page JavaScript today) | 13,027 | 3,211 | 2,717 |
| `compare/comparison.json` (bundled in the comparison islands) | 82,804 | 8,123 | 6,818 |

The manifest records `combinedGzipBytes: 739621` (GPT-2 plus BERT), the "about 0.7 MB" the own-text button shows. I did not verify whether GitHub Pages serves brotli; assume gzip (0.55 MB) as the planning figure, 0.44 MB if brotli.

### 6.2 What changes for the reader

- **Today:** the playground needs no download (the toy's 3 KB gzipped merges ride in the bundle). The only tokenizer download is the explicit own-text button in the comparison card (0.7 MB, both files, on click).
- **After:** the playground needs GPT-2 (0.55 MB gzip) to be usable. Transferred bytes for a reader who uses everything are the same as today (GPT-2 plus BERT, 0.74 MB); the difference is that the GPT-2 half moves earlier and stops being optional for the playground. The comparison card's own-text button then only needs BERT (0.19 MB gzip) when the playground already loaded GPT-2.
- **Time:** 549 KB is about 2.7 s at 1.6 Mbit/s (a common "slow 4G" test profile) and about 11 s at 400 kbit/s. Parsing and building took 50 ms in Node; encoding is 0.3 to 13 ms for 1,000 characters.

### 6.3 Interaction with the project rules

- **First paint / SSR.** Svelte islands run in Node at build time, so the component cannot call `fetch` or build the tokenizer at top level. Today the playground renders real chips for the default text in the server HTML because the toy is synchronous. Two things depend on that: no-JS e2e tests (`playground.spec.ts` (a), `post.spec.ts` (h)) and `scripts/check-dist.mjs` (`index.html` must contain `data-chip`). Keep that by passing the default text's tokens in as props. Two ways: (a) add the default text to the committed `comparison.json` fixture generation, which gets the existing freshness test for free, or (b) tokenise at build time in `PlaygroundSection.astro` with a Node-side GPT-2. I recommend (a) for the playground default and a shared build-time helper for the prose figures (which already compute at build time).
- **Where the download happens.** In `onMount` through `loadTokenizer(id, baseUrl)`, with `baseUrl` built from `import.meta.env.BASE_URL` exactly as `Comparison.svelte` does, so the file is found under the GitHub Pages sub-path (`check:base` already proves the pattern). Only `loadTokenizer.ts` may contain `fetch(` (`check-repo.mjs`), which fits.
- **`client:visible`.** The island hydrates when its card nears the viewport, so the download starts when the reader reaches the playground, not at page load. That keeps the initial bundle unchanged for Phase 5's budget criterion ("the initial bundle fits its budget on a throttled connection") because the 0.55 MB is not in the initial bundle.
- **Auto-load or click-to-load.** Recommend **auto-load on hydration** with a one-line size note ("Loading the tokenizer, about 0.5 MB"), not a button. The post's promise is "Type or paste anything... and watch it split"; a button before the first interaction is the friction the core value is meant to avoid, and `client:visible` already means the reader is looking at the card. A button remains right for the own-text block, which is optional.
- **The 8-second failure watcher.** `BaseLayout.astro` flips any `[data-island]` still at `data-state="loading"` to `failed` 8 seconds after it first enters the viewport. A slow download would trip it even though nothing failed (11 s at 400 kbit/s). Fix: the island reports `ready` as soon as it hydrates, and a separate sub-state (for example `data-tokenizer="loading|ready|failed"`) covers the download, as `OwnText.svelte` already does with `data-own-state`. This is a real design constraint, not a nicety.
- **Offline / fetch failure.** New failure mode: the playground today cannot fail to load, only fail to hydrate. It needs an error message and retry, modelled on the own-text block (`data-own-error`, "Try again") and covered by tests like the existing failure paths in `comparison-load.spec.ts` (route aborts of `gpt2.json`, of `bert-uncased.json`, of both, and a 404; UAT test 2 also verified the own-text offline path by hand). Those existing tests will interact with the change: they block `gpt2.json` while the page also contains a playground that now requests the same file, so each needs to say which island it is exercising. While loading or failed, the static default-text chips stay on screen, which matches the existing copy "The example below already shows the default text".
- **Shared cache with the comparison.** GPT-2 is already loaded by the comparison's own-text block (`OwnText.svelte` calls `loadTokenizer("gpt2", ...)` and `("bert", ...)` on click). `loadTokenizer` has no memo, so each call fetches and builds a fresh instance (the browser HTTP cache may spare the second transfer, but the 50 ms build repeats). A memoised promise per id gives one request and one instance for the playground and the own-text block, and the button copy should count only what is still missing. The `meta.download.sizeLabelMb` pinned in `fixture.test.ts` ("0.7") would change meaning accordingly.
- **Privacy promise.** "Your text stays in your browser. Nothing is sent anywhere." stays true: the only request is a plain GET for a static file. `privacy.spec.ts` test 1 (zero requests while typing, after ready) still holds as long as "ready" means the tokenizer finished loading.

## 7. Comparison, requirements and roadmap edits

### 7.1 The comparison as GPT-2 vs BERT

- **Rows that survive:** GPT-2 and BERT (uncased), unchanged in `comparison.json`. All five examples and all six languages stay. The pinned counts do not move.
- **Fixture:** regenerate with `npm run precompute:comparison` after removing the toy (5.4). Only `toy` rows and `meta.toy` disappear.
- **Notes to rewrite** (`src/core/compare/notes.ts`; each must still say only what the rows show):
  - `rare-word`: "Each tokenizer cuts the long word in different places. BERT puts ## in front of every piece that continues a word." Still true for two tokenizers; keep.
  - `numbers-dates`: currently contrasts the toy with GPT-2 and BERT. New: GPT-2 and BERT both keep short runs of digits together (`20·26`, `234`); BERT also drops the spaces and lower-cases.
  - `emoji`: new: GPT-2 cuts the first emoji into raw byte pieces but has a single piece for the second; BERT has no piece for either and shows `[UNK]`.
  - `literature`: currently says each word is one piece for GPT-2 and BERT, then adds that the toy learned from far less text and cuts many of the same words smaller. Drop the toy sentence.
  - `non-english`: drop the toy sentence; keep that GPT-2 has whole pieces for a few characters and byte pieces for the rest, while BERT has a piece for every one.
  - `LANGUAGES_NOTE`: drop "The toy tokenizer, which learned only English, spends the most on other scripts"; keep the BERT-Chinese `[UNK]` caveat; GPT-2 vs BERT counts already show vocabulary design (Russian 172 vs 133, Arabic 121 vs 101, Chinese 86 vs 43 with 25 `[UNK]`).
- **Row labels** (`rows.ts`): drop the toy; GPT-2 subline becomes about bytes and a large learned vocabulary, not "like the toy".
- **What the reader loses:** the toy row currently makes the point that a vocabulary trained on English only falls back to bytes for everything else (every byte of 男女 its own chip). With the toy gone, that extreme case remains visible only in the stepper's cat-emoji fall-back and in BERT's `[UNK]` for Chinese. This is a mild loss. No other real tokenizer (Mistral, Qwen) is shown today, so nothing else disappears. A third real tokenizer is a possible later addition (the stack table lists Mistral and Qwen), not part of this change.

### 7.2 Proposed requirement text

Precedent: plan 02-01 amended TOK-07 and ROADMAP criterion 3 in place (decision R-02). Do the same.

- **FOUND-07**, current: "Reader sees toy tokenizer output produced from bytes with a pre-split step, so the toy teaches the same pipeline real tokenizers use".
  New: "**FOUND-07**: Reader sees real tokenizer output (GPT-2, which works on bytes after a pre-split step) in the playground and the post's examples, so what they see is the pipeline real models use".
- **TOK-07**, current: "Reader can compare toy tokenizer output side by side with real model tokenizers on curated inputs (numbers, emoji, other languages)".
  New: "**TOK-07**: Reader can compare two real tokenizers of different kinds, GPT-2 (byte-level BPE) and BERT (WordPiece), side by side on curated inputs (numbers, emoji, other languages)".
- **Treatment of the checkboxes.** Both are `[x]` and "Complete" in the traceability table. Recommend: amend the text, set both to Pending and re-map them to the new phase in the traceability table (see 7.3), then flip to Complete when that phase verifies. Do not leave them Complete with changed wording; the verification that signed them off tested the toy.
- **TOK-05, TOK-06, TOK-08, TOK-09, TOK-10 and the other FOUND items:** no text change. TOK-10 (the post defines "token" and corrects "token = word") should be re-verified because its prose changes, but its wording holds.
- **PROJECT.md:** line 22 "Toy tokenizers built for teaching, used to show the insides of the algorithm" stays true via the stepper; line 23 "comparison of toy tokenizer output against real model tokenizers" becomes GPT-2 vs BERT; line 29 "Shared reusable components (toy tokenizer, colored-token display)" drops "toy tokenizer"; line 42 and the Key Decisions row ("Toy tokenizers for internals, real tokenizers for comparison", status Pending) become "the BPE stepper for internals, real tokenizers (GPT-2, BERT) for everything the reader types into", and the row can be resolved. `.claude/CLAUDE.md`'s stack text ("Toy BPE ... teaching tokenizer and trainer") narrows to "trainer".

### 7.3 Proposed ROADMAP edits

Recommended mechanism: insert a decimal **Phase 2.1: Replace the toy with GPT-2** (the roadmap already defines decimal INSERTED phases) instead of re-opening Phase 2. Phase 1 and 2 stay "Complete" with a dated "amended by Phase 2.1" note where their wording names the toy.

| ROADMAP location | Current | Proposed |
|---|---|---|
| Overview (line 5) | "a reader types text into a toy tokenizer and sees accessible, correctly rendered tokens" | "a reader types text into a real tokenizer (GPT-2) and sees accessible, correctly rendered tokens" |
| Phase list, Phase 1 (line 15) | "live toy-tokenizer playground" | "live GPT-2 playground" |
| Phase list, Phase 2 (line 16) | "toy-vs-real comparison" | "GPT-2-vs-BERT comparison" |
| Phase 1 criterion 4 (line 33) | "...the toy tokenizer's output comes from bytes after a pre-split step, as real tokenizers do" | "...the playground uses a real tokenizer (GPT-2) whose output comes from bytes after a pre-split step" |
| Phase 1 plan list (line 44) "01-02: Toy tokenizer core..." | historic | Leave: it records what was built. |
| Phase 2 goal (line 65) | "...then see how the toy compares with real model tokenizers on tricky inputs" | "...then see how two real tokenizers of different kinds, GPT-2 and BERT, compare on tricky inputs" |
| Phase 2 criterion 3 (line 72) | "compare the toy tokenizer's output side by side with real model tokenizers on curated inputs (numbers, emoji, other languages), with each real tokenizer clearly labelled" | "compare GPT-2 and BERT side by side on curated inputs (numbers, emoji, other languages), with each tokenizer clearly labelled and named with its year" |
| Phase 2 criterion 6 (line 75) | "...including whether 'common words stay whole' reads as contradictory next to the toy's ' com', 'm', 'on' split..." | "...including whether the GPT-2 passages ('common words stay whole', the note that the playground's ids are GPT-2's own numbering, and the step from the stepper to GPT-2) read clearly, and the author's notes are resolved". The original concern is resolved by construction (3.2 item 1) but the new passages need their own read-through. |
| Progress table | Phase 2: 10/10, Complete | Add row "2.1 Replace the toy with GPT-2". Leave Phase 2 Complete. |
| Traceability (REQUIREMENTS.md) | FOUND-07: Phase 1, Complete; TOK-07: Phase 2, Complete | FOUND-07: Phase 1, Phase 2.1; TOK-07: Phase 2, Phase 2.1; both Pending until 2.1 verifies |
| `.planning/phases/05-harden-release/DEFERRED-FROM-PHASE-2.md` section 4 and `02-CONTEXT.md` deferred idea (revisit the toy's corpus) | open | Close as superseded. |

### 7.4 Effect on Phase 3: EMB-01 and EMB-02

- The word "toy" in EMB-01 ("a token become an ID and then a **toy vector** in a lookup strip") and EMB-02 ("toy vectors ... illustrative") means made-up illustrative numbers. It is unrelated to the toy tokenizer and **needs no change** because of this swap.
- **A gain for EMB-01:** the ID in the strip can now be a real GPT-2 id (`Token` is 30642, ` words` is 2456), produced by the same adapter and the same fixture the playground uses. With the toy tokenizer the strip would have shown toy ids (256 and up in toy order) that contradict every real tool the reader may try later. One tokenizer now serves all posts (the project goal of "shared reusable components").
- **A new risk for EMB-02:** a real id next to a made-up vector could be read as "this is GPT-2's actual embedding". EMB-02's labelling must say explicitly that the ids are real but the vectors are invented. Suggested wording changes, both optional: EMB-01 "...become a real GPT-2 ID and then an illustrative vector in a lookup strip"; EMB-02 "Reader sees the vectors clearly labelled as invented for illustration, not the model's real values, even though the IDs are real".
- ENH-03 (nearby-words 2-D map) and Phase 3 criteria wording otherwise unaffected.

## 8. BPE stepper recommendation

**Recommendation: keep it, relabel it lightly, keep it where it is, and add one bridge from the stepper to GPT-2.** Do not drop it, do not move it.

Why it can stay as a clearly labelled teaching device alongside a GPT-2 playground:

1. **It does a job the playground cannot.** The stepper is the only place a non-programmer sees how a vocabulary is built (pair counts, tie rule, merge budget). It satisfies TOK-05 and TOK-06 and serves the project's headline goal ("understand how tokenization algorithms work"). GPT-2's 50,000 merges are not inspectable, which is exactly why a miniature is needed.
2. **The disagreement is a teaching moment, not a confusion, if it is made explicit.** After its ten merges the stepper ends at 20 pieces for the cat-sat sentence (` cat`, ` sat`, ` on` and ` the` are single pieces, but ` mat` is `␣·m·at`, ` hat` is `␣·h·at` and ` and` is four byte pieces); GPT-2 cuts the same sentence into 13 tokens, one per word. A reader who types that sentence into the playground will see 13 against the stepper's 20 and may conclude the stepper is wrong unless told why. Said plainly, it becomes the best sentence the swap makes available: "The step by step example stopped after ten merges. GPT-2's list is vastly longer, so it already has a piece for every word of this sentence." Without the bridge it is a latent confusion; with it, it is the payoff of the whole stepper section.
3. **The two id schemes differ and need one sentence** (3.3 item 2): the stepper starts its ids at the 256 byte values and adds merges from 256; GPT-2 numbers its starting symbols in a different order. Put that sentence at the same bridge.
4. **The stepper's non-programmer-visible vocabulary and bytes line up with the display layer** (it already shares `display.ts` glyphs), so it needs no restyling.

What it needs:

- **Label.** The existing lead-in ("Step through a tiny example") is close. Add that this is a miniature that learns from one sentence and stops after ten merges. The lead-in is pinned verbatim in `post-content.test.ts` (`STEPPER_SLOT_SENTENCE`), so editing it is a small test edit.
- **A bridge figure** after "What the step by step example showed": the same sample sentence cut by GPT-2, rendered as a build-time figure from the sample-sentence constant (not typed by hand). The count must come from the engine so it cannot go stale (the content test forbids hand-typed counts).
- **Avoid typing "50,000" or "about fifty thousand" uncited.** The cited, checked figure is 50,257 entries (the post already carries it with references 16 and 18); the "merges" figure is derivable (50,257 minus 256 base symbols minus one special marker) but the post's number rules require a citation or a build-time fact.

What stays untouched either way: `bpe.ts`, `stepper.ts`, `BpeStepper.svelte`, `StepperSection.astro`, the 29 stepper tests except (y), all 18 `e2e/stepper.spec.ts` tests, the stepper half of `check-core.mjs`, TOK-05 and TOK-06 (stay Complete).

Alternatives considered and rejected:

- **Drop the stepper with the toy.** Loses TOK-05/06 and the project's differentiator; not warranted since the stepper never depended on the toy.
- **Keep it but move it after the playground.** The idea-then-real-thing order is the right one for a non-programmer; the playground would become a bare tool before the reader knows what a vocabulary is.
- **Let the stepper accept the reader's own text.** Contradicts decision D-07 and grows scope.

## 9. Risks to shipped Phase 2 verification

Phase 2 is `status: passed`, 6/6, with a `covered_digest` over files that include `what-is-a-token.mdx`, `comparison.json`, `fixture.ts`, `notes.ts`, `rows.ts`, `bpe.ts`, `stepper.ts`, `Comparison.svelte`, `LanguagesDemo.svelte`, `LanguagesTable.astro` and `OwnText.svelte`. Nearly all of those change, so the verification is stale by construction. Phase 1's verification (playground, partial chips, regression corpus, frames) is also invalidated for its toy-specific evidence.

| Shipped claim | Status after the swap | Needed |
|---|---|---|
| Phase 2 criterion 6 and UAT test 1: non-programmer read-through of the complete Post 1 | Invalidated for the rewritten passages | New read-through, focused on the five rewritten passages and the new bridge |
| UAT test 2: Arabic sentence vs OHCHR | Unaffected (sentences unchanged) | None |
| UAT test 2: space glyph, boxed pair, hatched bars in Chrome, Firefox, Safari and print | New chip shapes (space plus partial bytes in one hatched chip) | Re-check visually in the browser matrix |
| UAT test 2: screen reader reads pair table, references, languages table | Languages table loses a column; the playground gains a loading and error state | Re-read with a screen reader |
| UAT test 2: offline, Load button shows error, Try again works | The own-text path is unchanged, but the playground now has its own load, fail and retry path | New offline check on the playground; repeat the own-text one |
| UAT test 2: own-text block with Arabic, emoji, long English, light and dark, keyboard only | Block changes (two rows, shared loader) | Re-run |
| UAT test 3: factual claims (morphemes, W3Techs, Wikipedia) | Unaffected, but the new GPT-2 sentences are new claims | Cite or check each new GPT-2 statement (training data, "older tokenizer") |
| Phase 1 verification: playground behaviour, counts, IDs toggle, examples, reset | Behaviour same, tokenizer different | Re-run `playground.spec.ts`, `controls.spec.ts`, `states.spec.ts` |
| Phase 1 and R-01: 22-entry regression corpus through the real DOM, frame counts, 360 px frames | Numbers change (5.6 and 5.7) | Re-derive expected values from GPT-2 and re-run `resilience.spec.ts`, `frames.spec.ts`, `phone-width.secondary.spec.ts` |
| T-01-11 / T-01-21 worst-case performance (200 ms, 100 ms), T-01-17 CPU-throttled freeze guard | Measured fine in Node (1 to 13 ms) | Re-run the CPU-throttled browser test; the new tokenizer build (50 ms in Node) is not in that test |
| axe (`a11y.spec.ts`, `a11y-phase2.spec.ts`) | New loading and error states, the special-chip style for `<|endoftext|>` | Re-run, including colour contrast of the new states |
| Privacy (`privacy.spec.ts`): zero requests while typing; comparison makes no tokenizer request | Test 2's premise breaks | Rewrite test 2; keep test 1; Phase 5 criterion 4 stays satisfied |
| `check:dist` (server-rendered chips), `check:base` (sub-path), `check:repo` (fetch ban), `check:deps` | Should hold if the SSR props design and `loadTokenizer.ts`-only fetch are kept | Run all |
| Adapter parity golden vs Rust reference (28 cases) | Default-text case changes with `DEFAULT_TEXT` | Regenerate that case with the pinned reference |
| Three-browser matrix (Chromium, Firefox, WebKit) gate from plan 02-09 | Reopened by any e2e change | Re-run the full matrix |

Residual technical risk, low: the playground now presents the JavaScript library's GPT-2 output for arbitrary reader text as "what GPT-2 does". Parity with the Rust reference is verified on 28 curated inputs only, and `.claude/CLAUDE.md` notes the library cannot reproduce every Oniguruma regex feature. The own-text block already carries this exposure, but the playground raises its visibility; consider widening the parity golden with a handful of contractions, mixed-script and whitespace cases.

## 10. Recommendation

**RECOMMEND, with conditions: replace the toy with GPT-2 everywhere the reader types or sees examples, keep the BPE stepper (relabelled), and make the comparison GPT-2 vs BERT.**

Options weighed:

| Option | What it is | Verdict |
|---|---|---|
| **A. Full swap, stepper kept** | GPT-2 in playground, prose figures and examples; comparison GPT-2 vs BERT; toy code, merges, trainer and corpus deleted; stepper stays as a labelled miniature | **Best** |
| B. Partial swap | GPT-2 in the playground and figures only; toy row stays in the comparison | Reject. The row is captioned "Toy tokenizer (from the playground)"; with no toy in the playground it would be an unexplained third tokenizer, and the toy code, corpus and training script all stay alive for one table row. |
| C. Leave as is (optionally retrain the toy on a bigger corpus, the deferred D-17 idea) | Zero reopen risk, zero download, Phase 2 stays verified | Defensible fallback only if schedule matters. A bigger corpus still teaches splits no real model makes, keeps the three-tokenizer concept load, and changes the fixture, goldens and prose claims anyway (DEFERRED-FROM-PHASE-2.md section 4 lists the same cost). |

Strongest reasons for A, in priority order:

1. **Reader comprehension (decisive).** The toy's defining flaw, everyday words split into odd pieces next to prose saying they stay whole, disappears: 10 of 11 words in the default sentence are single GPT-2 tokens. Every split the reader sees is one a real model produces (3.2).
2. **Fewer concepts.** Three tokenizers (stepper miniature, playground toy, real ones) become two (miniature, real). Pinned sentences that apologise for the toy go away, and the comparison lead-in "two older tokenizers" and the "three tokenizers" caption become correct or simply simpler.
3. **It sets up the series.** One real tokenizer with real ids serves the embeddings post (EMB-01) and later posts. The display layer already handles GPT-2 output with no change (5.5).
4. **Maintenance.** Roughly a dozen files and about 20 unit tests become dead, along with a 144 KB corpus, a training pipeline and one provenance item for Phase 5.

Strongest reasons against, and why they do not change the verdict:

1. **The playground stops being instant and offline-proof.** It now costs 0.55 MB (0.44 MB if brotli) and gains a failure mode. Mitigation is concrete and designed in section 6: auto-load on hydrate, server-rendered default chips from props, a separate tokenizer sub-state so the 8-second watcher is not tripped, and error with retry. Transferred bytes for a reader who uses the whole post are unchanged; they just arrive earlier.
2. **It reopens verified work.** Phase 1 and Phase 2 verification evidence is stale in about ten places (section 9), around 50 files are touched, and FOUND-07 and TOK-07 are reopened. This is the real cost, and it is why this is a phase and not a quick task.
3. **It introduces two prose caveats the toy did not need:** GPT-2's id numbering differs from the stepper's, and the default sentence must change because only "Tokenization" splits in GPT-2. Both are small prose edits.

Conditions for A to be worth doing: (a) change the default sentence and re-run the build-time claims; (b) add the id-numbering sentence and the stepper-to-GPT-2 bridge; (c) ship the SSR-props and two-level-state design, not a naive swap of `tokenize`; (d) reopen FOUND-07 and TOK-07 through a decimal phase and re-verify; (e) get a fresh non-programmer read-through of the rewritten passages.

## 11. Effort estimate

Rough hours of focused work, including the author's checks. Sizes: S under 2 h, M 2 to 5 h, L over 5 h.

| Work item | Size | Rough hours |
|---|---|---|
| Prose rewrite: five passages, bridge paragraph and figure, id sentence, new default sentence, content-test pins | M | 3 to 4 |
| Core and adapter: move `isValidUtf8`, claims rewrite, build-time GPT-2 helper, memoised loader, remove toy and trainer code | M | 3 to 4 |
| Components: Playground rewrite (async load, SSR props, sub-state, error/retry, legend); OwnText, Comparison, LanguagesDemo, TokenRows, LanguagesTable, TokenLegend edits | L | 5 to 6 |
| Unit test rewrites: regression, chars block, claims, TokenDisplay, fixture, notes, post-content, loadTokenizer memo | M | 4 to 5 |
| E2E rewrites: 7 files must change, 7 to review; includes running the three-browser matrix | L | 5 to 7 |
| Fixture regeneration, adapter-parity regeneration, comparison notes and row labels | S | 1.5 to 2 |
| Requirements, roadmap, PROJECT.md edits; close deferred items | S | 1 |
| Re-verification: non-programmer read-through, offline and retry checks, screen reader, browser visual checks | M | 3 to 4 |
| **Total** | | **about 25 to 33 hours, roughly 5 plans in 3 to 4 waves** |

**Sizing verdict: a proper decimal phase (Phase 2.1), not a quick task and not a one-plan gap closure.** It reopens two Complete requirements, touches about 50 files across source, tests, scripts and planning docs, needs a human-gated verification step, and the work has a natural wave order (tracer, playground, prose, comparison, delete and requirements). A `/gsd-quick` run has no wave gating or verification step and would leave the repository half-converted between steps.

## 12. Suggested implementation outline

Tracer-first, each step ends green. Step 1 is production quality, not a throwaway.

1. **Tracer: one GPT-2 path through the playground, end to end.** Move `isValidUtf8` out of `toy.ts`; add a per-id memo to `loadTokenizer`; make `Playground.svelte` load GPT-2 in `onMount`, taking its initial server-rendered tokens from props (default text added to the fixture generation); leave the toy in the comparison, figures and tests for now. Gate: GPT-2 tokens appear in a real browser, the no-JS page still has chips, and a deliberately slow download (route delay over 8 s) does not show the failed state. Verify: `npm test`, `npm run check`, `npm run check:svelte`, `npm run build`, `npm run check:dist`, `npm run test:e2e -- e2e/playground.spec.ts e2e/states.spec.ts`.
2. **Harden the playground.** Two-level state (island ready on hydrate, separate tokenizer sub-state), error with retry, special-chip legend, offline test; fix the playground-facing tests and specs (`regression.test.ts`, the `chars.test.ts` block, `TokenDisplay.test.ts`, `frames`, `states`, `resilience`, `controls`, `privacy`, `a11y`). Verify: `npm test`, `npm run check:svelte`, `npm run test:e2e -- e2e/frames.spec.ts e2e/states.spec.ts e2e/resilience.spec.ts e2e/controls.spec.ts e2e/privacy.spec.ts e2e/a11y.spec.ts`.
3. **Prose figures and claims.** Build-time GPT-2 helper; rename `ToyTokens`; rewrite `claims.ts`; new `DEFAULT_TEXT` and regenerated `adapter-parity.json` case; rewrite the five passages, add the id sentence and the stepper bridge figure; update `post-content.test.ts` pins and `post.spec.ts`. Verify: `npm test` (the build also fails on a false claim), `npm run check`, `npm run build`, `npm run test:e2e -- e2e/post.spec.ts`.
4. **Comparison and languages.** Remove the toy row and column; regenerate the fixture; rewrite notes, row labels and the own-text block (GPT-2 shared, BERT on click); update `fixture.test.ts`, `notes.test.ts`, `comparison`, `languages` and `comparison-load` specs. Verify: `npm run precompute:comparison -- --check`, `npm test`, `npm run check:svelte`, `npm run test:e2e -- e2e/comparison.spec.ts e2e/languages.spec.ts e2e/comparison-load.spec.ts`.
5. **Delete the dead toy.** `toy.ts`, `toy/merges.json`, `presplit.ts`, `train-toy-bpe.ts`, `bpe-train.ts`, `scripts/corpus/*`, `prepare-corpus.ts`, toy tests, npm scripts `train:toy` and `prepare:corpus`; update `check-core.mjs`; re-home the Sennrich tie-break golden in `stepper.test.ts`; trim `bpe.ts` and `stepper.ts` comments. Verify: `npm test`, `npm run check`, `npm run check:svelte`, `npm run check:repo`, `npm run check:core`, `npm run build`.
6. **Requirements, roadmap, then the full gate.** Insert Phase 2.1; amend FOUND-07, TOK-07 and the ROADMAP lines (7.2, 7.3); update PROJECT.md; close the deferred corpus item. Then `npm test`, `npm run check`, `npm run check:svelte`, `npm run build`, `npm run check:dist`, `npm run check:base`, `npm run test:e2e` (all three browsers), and the human checks of section 9 (read-through, offline and retry, screen reader, browser visuals). Flip FOUND-07 and TOK-07 back to Complete only after that gate passes.



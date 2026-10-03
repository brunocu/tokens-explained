# Pitfalls Research

**Domain:** Interactive explainer blog on LLM tokenization (token / embedding / context / reasoning) for a non-programmer audience, browser-only interactives
**Researched:** 2026-10-02
**Confidence:** MEDIUM-HIGH overall. Technical tokenizer claims are HIGH because they were reproduced locally (`tiktoken` 0.14.0, `cl100k_base` and `o200k_base`). Vendor-behavior claims (reasoning, context, token counting) are MEDIUM-HIGH because they come from current official docs. Blog-sourced claims are LOW and flagged inline.

**Provisional phase labels used below.** The roadmap does not exist yet, so these labels are placeholders. Remap them when the roadmap is written.

| Label | Meaning |
|-------|---------|
| **P-Foundation** | Site skeleton, shared components (toy tokenizer, token display), glossary/content contract, accessibility baseline |
| **P-Post1** | "What is a token?" with playground and BPE stepper |
| **P-Compare** | Real-tokenizer comparison (data pipeline plus UI) |
| **P-Posts2-4** | Embeddings, context and reasoning posts |
| **P-Hub** | Disambiguation page and "start here" hub |
| **P-Harden** | Fact-check pass, accessibility audit, performance budget, cross-device QA |

---

## Critical Pitfalls

### Pitfall 1: The toy tokenizer teaches a different algorithm than the real one

**What goes wrong:**
Almost every "build BPE" tutorial uses a toy that differs from production tokenizers in ways that change what readers believe:
- The toy works on characters. Real GPT-style tokenizers work on UTF-8 bytes with a 256-entry base alphabet.
- The toy splits on whitespace and appends an end-of-word marker (`</w>`, the Sennrich et al. formulation). Real tokenizers run a regex pre-tokenizer first, and the leading space is part of the next word's token.
- The toy trains on a 5-sentence corpus with a hand-picked story, so merges look like clean morphemes (`un`, `ing`, `est`).

The reader walks away believing "tokens are syllables or morphemes" and "unknown characters get an `<unk>` token". Both are false for byte-level BPE.

**Verified evidence (local run):**
- `' strawberry'` is 1 token, but `'strawberry'` is 3 (`str|aw|berry` in cl100k, `st|raw|berry` in o200k). The leading space is inside the token.
- `'unbelievable'` splits as `un|belie|vable` (cl100k) and `un|bel|ievable` (o200k). That is not morphemes.
- `'HELLO'` is 2 tokens (`HEL|LO`), but `'hello'` is 1.

**Why it happens:**
The toy is chosen for visual cleanliness. The author, who knows the real algorithm, does not notice the gap until readers hit it in the comparison step.

**How to avoid:**
- Make the toy structurally faithful, and only simplify scale. Keep the same stages the real one has: normalize, pre-split, bytes, merges. Cut the corpus and the number of merges, but do not change the pipeline. A byte-level toy with a tiny merge list is only slightly harder to explain than a character-level one.
- If a character-level teaching step is kept for the first reveal, add an explicit "what real tokenizers do differently" callout, and make the next interactive show it live (for example type a space and watch it attach to the following word).
- Train the toy on a corpus that produces at least one ugly, non-linguistic merge, so the reader sees merges follow frequency, not meaning.
- Use the same shared `TokenDisplay` component for toy and real output so they cannot visually drift.
- Label every toy output "toy tokenizer, trained on N words, not any real model's".

**Warning signs:**
- The toy has an `<unk>` token or `</w>` markers visible to readers.
- Toy output on "hello world" differs structurally from real output (no leading-space token).
- All demo merges are dictionary-clean.

**Phase to address:** P-Foundation (toy design, shared display), P-Post1 (stepper content), P-Compare (verification that the toy-vs-real bridge works).

---

### Pitfall 2: Unicode and emoji handling is wrong, so the playground shows garbage or lies about counts

**What goes wrong:**
Byte-level BPE can split a single visible character across several tokens. A token is then a byte fragment, not a valid string. Naive code decodes each token separately and renders `�`, or crashes on partial UTF-8.

**Verified evidence (local run):**
- cl100k: `🙂` becomes 2 tokens (`F0 9F`, `99 82`), and decoding each token alone gives `�` and `��`. o200k makes it 1 token.
- cl100k: 👨‍👩‍👧 (one visible glyph) becomes 13 tokens. o200k makes it 8.
- cl100k: 🇯🇵 becomes 6 tokens. o200k makes it 4.
- cl100k: `日本語` becomes 4 tokens, and one token boundary falls inside a character (`E8 AA | 9E`).
- Normalization form matters. `é` as one code point is 1 token, but `e` plus combining accent is 2 tokens, so text that looks identical can tokenize differently.
- The same sentence can differ a lot across encodings, for example `你好，世界` is 6 tokens in cl100k and 3 in o200k.

**JavaScript-side traps:**
- `string.length` counts UTF-16 code units, and emoji are surrogate pairs. ZWJ sequences are several code points. Use `Intl.Segmenter` (grapheme granularity) for "characters the user sees" and `TextEncoder` for bytes.
- Highlight spans built from string indices will cut surrogate pairs in half and break rendering.

**Why it happens:**
Toy tokenizers and most tutorials only ever see ASCII. Emoji and non-Latin scripts are tested last, if at all.

**How to avoid:**
- Treat token = byte sequence in the data model. Never store tokens as decoded strings.
- Build the token display to handle a token that is not valid UTF-8 on its own: show the bytes (hex or a plain-language "part of a character" marker), and when a character is split, color it across the tokens it spans (or hatch it) with a visible note "this one character takes 2 tokens". This is a teaching opportunity, not just an edge case.
- Keep a regression test file of nasty inputs: emoji, ZWJ families, flags, combining marks, CJK, Devanagari, Arabic (RTL), digits, long whitespace, newlines, zero-width characters.
- Decide up front whether the playground normalizes input (NFC). If not, say so.

**Warning signs:**
- `�` appears in the colored token view.
- Token count disagrees with a reference `tiktoken` run on the same string.
- A layout break or exception when pasting right-to-left text or emoji.

**Phase to address:** P-Foundation (data model plus test corpus), P-Post1 (playground), P-Compare (cross-language and emoji section).

---

### Pitfall 3: The real-tokenizer comparison approach is chosen without noticing that the "real" tokenizers are not equally available

**What goes wrong:**
The project defers "in-browser vs precomputed" to research. The trap is assuming one approach covers all the vendors a reader will care about.

**Facts:**
- OpenAI encodings (`cl100k_base`, `o200k_base`), plus Llama and Gemma-family tokenizers, are open and can run in the browser (`js-tiktoken`/`gpt-tokenizer`, `@huggingface/tokenizers` standalone).
- **Claude's tokenizer is not public.** Anthropic only offers a token-counting API (model-specific, free, rate-limited, and described in its docs as an **estimate**). The docs also say Claude 4.7 and later use a newer tokenizer that produces roughly 30% more tokens than earlier models for the same text. Older third-party Claude tokenizers are no longer accurate. (HIGH from official docs; blog claims about Claude's vocabulary size are LOW and conflicting, so do not state any.)
- The API route cannot be used from the browser without exposing a key or running a proxy, which adds cost, abuse and privacy surface to a static blog.
- A fully precomputed table cannot accept arbitrary reader input, so it is not "interactive" in the sense of the project's core value.

**Why it happens:**
The comparison requirement says "real model tokenizers", and the author assumes that means the famous ones.

**How to avoid:**
- Recommended split: live in-browser comparison for 2 or 3 open tokenizers (at least `cl100k_base` and `o200k_base`, so readers can see two real generations disagree). Use a clearly dated, precomputed table of fixed example sentences for closed tokenizers (Claude, Gemini), with the script that produced it committed and the date and model shown on the page.
- Name the encoding, not the product: "o200k_base (used by recent OpenAI models as of <date>)". Do not write "ChatGPT's tokenizer".
- Never ship an API key in the client. Do not proxy user text to a vendor, because the "your text never leaves your browser" promise is a feature.
- Show "approximate" wherever counts are not from the exact tokenizer.

**Warning signs:**
- A "Claude" column that is silently computed with a different tokenizer.
- Any network request containing user input.
- The comparison table has no date or version.

**Phase to address:** P-Compare. Make this decision at the start of that phase (it is flagged as a research item in the project). A tokenizer-data spike should come before UI work.

---

### Pitfall 4: Famous examples are encoding-specific or outdated, and prose contradicts the live interactive

**What goes wrong:**
Posts quote well-known tokenization stories as if they were universal, then the live playground shows something different.

**Verified evidence (local run):**
- "strawberry" splits differently across encodings (`str|aw|berry` vs `st|raw|berry`), so "GPT-4 sees str-aw-berry" is true only for one encoding.
- The glitch-token story ("SolidGoldMagikarp") describes GPT-2/3-era vocabularies. In cl100k and o200k it is just `Solid|Gold|Mag|ik|arp` (5 ordinary tokens). Showing it in the playground will look like the story is false.
- Numbers split into 3-digit chunks left to right (`1234567` becomes `123|456|7`), which is a specific pre-tokenizer rule, not a law.

**Why it happens:**
Authors copy examples from talks and posts that predate current tokenizers. Prose is written by hand, the interactive is computed, and nothing checks they agree.

**How to avoid:**
- Generate every number and token split quoted in prose from the same tokenizer code at build time (or snapshot-test it). A post should fail the build when a quoted split no longer matches.
- Always name the encoding next to an example, and date it.
- Use the glitch-token story, if at all, as clearly historical ("in an older tokenizer").
- Prefer examples the reader can reproduce themselves in the playground ("try it").

**Warning signs:**
- Hand-typed token splits in markdown.
- Examples with no encoding named.
- Stories sourced only from social posts.

**Phase to address:** P-Foundation (build-time example check), P-Post1, P-Harden (fact-check pass).

---

### Pitfall 5: Conflating training the tokenizer with running it, and the tokenizer with the model

**What goes wrong:**
The BPE stepper shows merges being learned. The playground applies frozen merges. Readers merge the two and think the LLM "learns tokens as you type", or that the tokenizer is part of the neural network. Related misconceptions: "token IDs mean something" (IDs are arbitrary labels that differ per tokenizer), "bigger ID means rarer word" (partly an artifact of merge order, so do not teach it), and "the model sees words".

**Why it happens:**
Both activities use the same colored-chip visual and the same word "tokenizer".

**How to avoid:**
- Name the two phases differently in the UI and prose ("building the vocabulary (once, before the model is trained)" and "splitting your text (every time)").
- State plainly that the tokenizer is built separately, frozen, and then the model is trained on top of it.
- In the playground, show IDs de-emphasized, with a one-line "these are just labels in a lookup list, they carry no meaning, and they differ for every tokenizer", and show the same word with different IDs in two tokenizers.
- Do not let readers see a fixed ID number as a property of a word.

**Warning signs:**
- Copy that says "the model learns the tokens" or "the AI splits your word".
- Readers (in feedback) ask "why is ID 12345 more common?".

**Phase to address:** P-Post1.

---

### Pitfall 6: "Embedding" is used in three different senses without saying so

**What goes wrong:**
The word is overloaded:
1. The learned vector a model looks up for each token ID (input embedding table).
2. The model's internal per-token vectors as they change through the layers (contextual representations).
3. Text-embedding models and vector databases (RAG and semantic search), which output one vector for a whole sentence or document.

A non-programmer will meet sense 3 first, in product marketing, and then read a post that explains sense 1. Common mistakes in explainers:
- "An embedding is the meaning of the word."
- Showing a 2D scatter of "king/queen/man/woman" as how LLMs think.
- Implying the embedding of a token is fixed in context. In sense 1 the lookup is fixed, but after the first layer the representation depends on the surrounding text.

**Why it happens:**
The project's own framing ("a token is an ID; an embedding is the vector looked up for it") is correct but covers only sense 1, and the disambiguation page is the place where the other senses collide.

**How to avoid:**
- State the three senses once, early in the embeddings post and on the disambiguation page, and say which one the post is about.
- Keep the pipeline picture (text, tokens, IDs, vectors, model) the same everywhere, and put "you are here" on it in each post.
- If a vector is shown, say whether it is real (from an open model, with the model named) or illustrative. Never present invented numbers as real ones.
- Avoid "meaning" as the definition. Say "a list of numbers the model learned so that similar uses end up with similar numbers".
- Run any 2D projection past a reader-test: does it suggest the model thinks in 2D?

**Warning signs:**
- A diagram where a word box goes directly to a vector box with no ID step.
- The word "meaning" in the first sentence of the embeddings post.
- Disambiguation page lists one definition for "embedding".

**Phase to address:** P-Posts2-4 (embeddings), P-Hub (disambiguation).

---

### Pitfall 7: "Context is not memory" becomes its own oversimplification

**What goes wrong:**
The correct core, "the context window is what is in the prompt right now, not memory", gets flattened into "the model has no memory", which is wrong at the product level. Specifics readers will hit:
- Chat apps do have memory features (saved facts and summaries injected into later prompts), and history is re-sent every turn. Both are "context" mechanically, but the reader will experience them as memory.
- The window holds more than the user's messages: the system prompt, tool definitions, tool results, documents, and the model's own output (including reasoning). The official docs say output and thinking count toward the window too.
- Bigger is not simply better. The docs call the accuracy and recall decline as the token count grows "context rot".
- Prompt caching changes what you pay, not whether tokens count toward the window.
- Compaction and summarization silently drop and rewrite older material.
- "Context" also has a second everyday meaning (the surrounding words that disambiguate a word), which collides with "context window" and with contextual representations (Pitfall 6).

**Why it happens:**
Slogans are memorable, and "the model re-reads the whole conversation each turn" is a satisfying simple story that hides these layers.

**How to avoid:**
- Teach the layered version in two steps: (1) the model itself keeps nothing between requests, and the app re-sends text; (2) apps add memory by writing text into that same window.
- Build an interactive "what is in the window right now" stacked bar (system, history, your message, reply, hidden reasoning) that fills as a fake conversation grows, and show what happens when it overflows. It teaches mechanics without implying a specific vendor's numbers.
- Use "window" language carefully, and distinguish "context length", "max output" and "tokens used".
- Avoid quoting window sizes in prose. They change often. If shown, date-stamp them or link to the vendor page.

**Warning signs:**
- The sentence "the model doesn't remember anything" with no qualification.
- A window-size number in prose with no date.
- The interactive only ever grows, never overflows or compacts.

**Phase to address:** P-Posts2-4 (context), P-Hub.

---

### Pitfall 8: Reasoning explanations are vendor-specific and decay quickly, or oversimplify into falsehood

**What goes wrong:**
"Reasoning tokens are just more generated tokens" is mechanically right. Bad versions of it:
- "It's just the model talking to itself, so you can get the same effect with 'think step by step'." This ignores that reasoning models are specially trained for it. Do not claim "no separate mechanism" without also saying "but trained differently".
- "The thinking you see is what the model thought." Official docs say displayed thinking is a summary of the reasoning, not the raw chain of thought, and billing is for the full thinking tokens, not the summary (Anthropic docs). OpenAI's docs say reasoning tokens are not visible via the API but occupy context and are billed as output tokens, and summaries are optional.
- Implying that displayed reasoning is a faithful explanation of why the model answered as it did.
- Hard-coding vendor API behavior. In current docs: on newer Claude models thinking text is hidden (`omitted`) by default; the older fixed-budget extended-thinking mode is rejected on newer models, which use adaptive thinking; whether earlier turns' thinking stays in context (and is billed as input) depends on the model. OpenAI documents reasoning carry-over across turns as configurable on some models. All of this changed within the last year.
- Using "reasoning", "thinking", "extended thinking", "chain of thought" and "reasoning effort" interchangeably.

**Why it happens:**
It is the fastest-moving of the four topics, and there are strong incentives (marketing, headlines) for loose language.

**How to avoid:**
- Write the post at the mechanism level (the model generates extra tokens before the answer, those tokens count toward limits and cost, and the model was trained to do this well). Put vendor specifics in a small, dated, clearly separated "as of <date>" box.
- Include a cost/length interactive: the same question with a short answer vs a long hidden reasoning stretch, showing visible vs billed tokens. Make it explicitly illustrative.
- Explicitly separate: (a) what the model generated, (b) what the app shows you, (c) what you are billed for.
- Do not claim whether it is "real reasoning". State what is observable, and keep the philosophical debate out of scope.

**Warning signs:**
- API field names or default values in prose.
- A phrase like "the AI shows its thinking" without the word "summary" next to it.
- No "last verified" date on the post.

**Phase to address:** P-Posts2-4 (reasoning), P-Harden (re-verify against vendor docs immediately before release).

---

### Pitfall 9: Terminology drift: the same word means different things in different places

**What goes wrong:**
Specific overloads a non-programmer will hit:
- **token**: LLM token vs login/API token vs "token" in blockchain. Also "tokens" in billing vs "tokens" as the model's units (they are the same, but a reader cannot tell).
- **context** / **context window** / **context length** / **context size**.
- **embedding** (Pitfall 6).
- **reasoning** / **thinking** / **chain of thought** / **extended thinking**.
- **model** (the weights) vs product (the chat app).
- **memory** (a product feature) vs context.
- **tokenizer** (the splitting algorithm) vs "the vocabulary" vs "the encoding" (`o200k_base`).

Also, across vendors, "same text, different token count" is routine (Claude vs OpenAI vs Gemini differ), so "a token is about 4 characters or 3/4 of a word" is only a rough English rule, and it fails badly for other languages (verified: `안녕하세요` is 5 characters and 2 tokens in o200k, but 5 tokens in cl100k).

**How to avoid:**
- Keep one glossary file as the single source of truth, used by every post (the disambiguation page can be generated from it).
- Define each of the four terms in one sentence in the same words everywhere, and add a lint or checklist item: any use of the term in a different sense gets a flag.
- The disambiguation page should have a vendor-vocabulary table ("what <vendor> calls it") with dates.
- Present the "4 characters per token" rule only as English-prose-on-modern-tokenizers, and show the multilingual counterexample next to it.

**Warning signs:**
- Two posts define "context" differently.
- The word "token" used for both a piece of text and a number without saying so.

**Phase to address:** P-Foundation (glossary), P-Hub (disambiguation page), P-Harden (consistency pass).

---

### Pitfall 10: Missing prerequisite — posts 2 to 4 depend on a concept Post 1 never teaches

**What goes wrong:**
Context and reasoning both rest on one idea that is easy to skip: the model produces output one token at a time, and each new token is chosen using everything before it (the generation loop). If Post 1 stops at "text is split into tokens", then:
- "Context window includes the output" makes no sense.
- "Reasoning tokens are more generated tokens" has no anchor.
- Readers who arrive from search directly to a later post (a stated goal of the series format) have neither Post 1 nor the loop.

**How to avoid:**
- Put a short, non-optional "one-token-at-a-time" explanation, with a tiny interactive (reader clicks "next token" and watches the sequence grow), in Post 1 or as a shared component reused in Posts 3 and 4.
- Every post gets a 3-line "what you need to know first" recap with a link to the post that covers it. Each post must stand alone for search arrivals.
- The hub's "recommended order" is advice, not a requirement.

**Warning signs:**
- A post uses "generate", "predict next token" or "prompt" without defining it.
- No post owns the generation-loop concept.

**Phase to address:** P-Foundation (decide where the concept lives), P-Post1 and P-Posts2-4.

---

### Pitfall 11: Interactives that are fun but teach nothing (no guided discovery)

**What goes wrong:**
A blank text box plus a rainbow of chips is engaging for 20 seconds. A non-programmer types "hello", sees 1 token, and leaves with no model. The BPE stepper fails similarly: too many merges (boredom), too few (no insight), frequency tables requiring mental counting, or ties between equally frequent pairs broken arbitrarily without comment.

**How to avoid:**
- Pre-load curated "try these" inputs that each reveal one surprise: leading space (`strawberry` vs ` strawberry`), capitalization (`hello` vs `HELLO`), a long made-up word, a number, a sentence in another language, an emoji. Add a one-line "what to notice" for each.
- Use predict-then-reveal at key moments ("how many tokens do you think this is?").
- BPE stepper: 6 to 10 merges max, a corpus chosen so the most frequent pair is obvious, a visible tally, an explicit tie-breaking rule stated once, a "run to the end" button, and a "reset" button. Always show the pair being merged and what it replaced.
- Give every interactive one stated learning goal and test it with 2 or 3 real non-programmers (see "Looks Done" checklist).

**Warning signs:**
- No default text in the box.
- Interactive can be completed without reading anything.
- Reviewer cannot say what the reader should have learned.

**Phase to address:** P-Post1.

---

### Pitfall 12: Bundle size, main-thread blocking and mobile performance

**What goes wrong:**
Real vocabularies are large. Measured locally from the `tiktoken` rank files:

| Encoding | Entries | Raw file | Gzip (approx) |
|----------|---------|----------|---------------|
| cl100k_base | about 100k | about 1.6 MB | about 0.75 MB |
| o200k_base | about 200k | about 3.5 MB | about 1.65 MB |

The `js-tiktoken` README-level guidance (via community write-ups, MEDIUM) is to import the encoder logic without a vocabulary and lazy-load only the rank file needed. Specific failure modes:
- Bundling vocab into every page of a series where only some pages use it.
- Parsing and indexing 200k entries on the main thread at load time, which freezes low-end phones.
- Tokenizing on every keystroke. Some inputs (long repeated strings) are reported to hit worst-case slow behavior in BPE merge loops (a `tiktoken` GitHub issue reports quadratic behavior for some strings, MEDIUM). A pasted novel can freeze a phone.
- Re-rendering thousands of colored `<span>`s per keystroke.
- WASM adds init cost, bundler and CSP configuration friction, and gains little for short playground inputs. Pure-JS ports are fine for short text, and WASM wins mainly on very large text (benchmark claims from community sources, LOW). Do not default to WASM.
- Hotlinking vocab files at runtime from OpenAI's blob storage creates availability, CORS and license-drift risk. Self-host.

**How to avoid:**
- Set a budget now: for example, no JS beyond the page's own interactive on pages that have none; vocab loaded on first interaction (not page load), cached with long-lived immutable headers, shared across posts through the same URL.
- Cap input length (for example 2,000 to 5,000 characters, with a friendly message), debounce, and run tokenization in a Web Worker.
- Cap rendered chips (virtualize or truncate beyond N, and show the count).
- Prefer pure JS first, and measure on a throttled mid-range Android profile before considering WASM.
- Decide whether a pruned or subset vocabulary is acceptable for the playground. If so, label it clearly as a subset, because it changes the output.
- Measure real transfer sizes and Lighthouse numbers in P-Harden, not by estimate.

**Warning signs:**
- First-load JS over a few hundred KB on a page without interactives.
- Typing lag on a phone, or the tab freezing when pasting long text.
- Vocabulary requested before the reader interacts.

**Phase to address:** P-Foundation (architecture: islands, lazy load, worker), P-Compare (vocab loading), P-Harden (device measurement).

---

### Pitfall 13: Accessibility of the colored-token display and the stepper

**What goes wrong:**
The core visual (colored chips) is the most accessibility-hostile pattern in the project:
- **Color as the only separator** fails WCAG 1.4.1 (Use of Color, level A). Adjacent same-hue chips are invisible to color-blind readers.
- Chip text/background must meet text contrast (1.4.3), and chip borders must meet non-text contrast (1.4.11), in both light and dark themes.
- Screen readers read the chips as one run-on string, which defeats the purpose. Announcing every chip on every keystroke is worse.
- Whitespace tokens (` hello`) are invisible, so the key insight (the space is part of the token) cannot be perceived.
- Hover-only tooltips for token IDs do not work on touch or keyboard.
- Interactive controls (stepper next/back, example buttons) must be at least 24 by 24 CSS px (WCAG 2.2, 2.5.8, AA) and keyboard operable.
- Merge animations can trigger vestibular issues. Honor `prefers-reduced-motion` (WCAG 2.3.3 is AAA, but cheap to honor).
- Count and status updates need a polite live region (4.1.3).

**How to avoid:**
- Separate chips with a non-color cue (borders, small gaps, underlines or alternating patterns, in addition to color), and show whitespace with a visible glyph (for example `·` or `␣`, and `↵` for newlines), with a legend.
- Offer a text/table view of the same data (token, ID, bytes) that screen readers and keyboard users can navigate, and make the chip view `aria-hidden` or a single labelled group when the table is present.
- One debounced `role="status"` live region ("12 tokens") instead of per-chip announcements.
- ID and detail access through focus and tap, not hover.
- Respect `prefers-reduced-motion` with step-by-step static transitions as the default fallback. The stepper should work with no animation at all.
- Run axe or Lighthouse plus a manual screen reader pass (VoiceOver and NVDA) in P-Harden. Check the palette with a color-blindness simulator.

**Warning signs:**
- Token boundaries can only be seen by hue.
- No way to tab to a chip or read its ID without a mouse.
- Merge animation cannot be turned off.

**Phase to address:** P-Foundation (palette, `TokenDisplay` component with text alternative from day one), P-Post1, P-Harden (audit). Retrofitting accessibility into a shared component later means touching every post.

---

### Pitfall 14: Staleness: model names, numbers and "as of" claims rot

**What goes wrong:**
A trustworthy-resource blog about a fast-moving topic gets stale in months. In the research window alone: Claude's tokenizer changed (about 30% more tokens on the same text for 4.7 and later), thinking defaults and modes changed, and OpenAI's reasoning controls changed. Hard-coded model names and numbers in prose decay.

**How to avoid:**
- Prefer concepts over product names. Where a product is named, include a visible "last checked <date>".
- Keep a single data file for every volatile fact (model names, window sizes, tokenizer-per-model mappings, prices), referenced by posts, so updates happen in one place.
- Keep a dated "claims ledger": each factual claim mapped to a primary source (vendor doc URL, or a reproducible script). Re-verify before release (P-Harden) and on a calendar reminder afterward.
- Precomputed comparison tables are generated by a committed script with the date recorded.

**Warning signs:**
- A model name appears in more than one place in hand-written prose.
- No source for a number.

**Phase to address:** P-Foundation (data file plus ledger format), P-Harden (re-verification).

---

## Moderate Pitfalls

### Pitfall 15: Special tokens and hostile input crash the playground or break layout

**What goes wrong:**
- `tiktoken` raises an error on text like `<|endoftext|>` by default (verified: `ValueError: Encountered text corresponding to disallowed special token`). With `disallowed_special=()` it is split as ordinary text (`<|`, `end`, `of`, `text`, `|>`). JS ports differ in behavior. A reader who types it will hit either an error or a surprise.
- Right-to-left text, zalgo text and zero-width characters can break chip layout.
- User text injected into the DOM as HTML is an XSS vector, even though it is only the reader's own input. Use `textContent`.

**Prevention:** Decide the special-token policy deliberately (treat as plain text, and optionally teach what special tokens are in a callout). Add the hostile cases to the regression corpus (Pitfall 2). Escape or render via text nodes only.

**Phase:** P-Foundation, P-Post1.

---

### Pitfall 16: Chat-message token counts presented as simple text counts

**What goes wrong:**
Real API usage counts include chat-template and special tokens (role markers, system prompt, tool definitions). A playground count of the raw text underestimates what a vendor reports, and readers compare it to a bill and conclude the tool is wrong.

**Prevention:** Label playground counts "tokens in this text" and say that real chat requests add formatting tokens. Do not offer a "cost" figure from raw text alone unless it is clearly an estimate.

**Phase:** P-Post1, P-Posts2-4 (context).

---

### Pitfall 17: Not all tokenizers are BPE, and "the" tokenizer does not exist

**What goes wrong:**
The series teaches BPE (correct and the right choice for the flagship) but writes as if all models use it. WordPiece and Unigram (SentencePiece) exist, Gemini-family models use SentencePiece, and a Llama 3 tokenizer is tiktoken-style BPE. The Hugging Face docs note tokenizer-specific behavior such as using a vocabulary entry directly when it exists.

**Prevention:** One sentence in Post 1: "many (not all) popular models use a method called byte-pair encoding". Do not generalize from the toy to "every AI". Avoid algorithm-level claims in the comparison table that you did not verify per tokenizer.

**Phase:** P-Post1, P-Compare.

---

### Pitfall 18: Scope inflation from "first release = all four posts plus hub plus disambiguation"

**What goes wrong:**
Each post has one or more bespoke interactives, plus shared components, plus a data pipeline, plus accessibility, plus fact-checking. The "definition of done" is large. Typical failure: Post 1 and its interactives consume all the energy, and Posts 2 to 4 ship as thin text with weaker interactives, or never ship.

**Prevention:** Budget interactives per post up front (for example at most 1 bespoke interactive for each of Posts 2 to 4, reusing `TokenDisplay` and the generation-loop component). Keep the posts' interactives illustrative and non-computational (no real embeddings or real inference), which fits the stated out-of-scope. Sequence so that every phase ends in something publishable. Treat the hub and disambiguation page as small, last, and mostly content.

**Phase:** Roadmap structure itself.

---

### Pitfall 19: Jargon creep for a non-programmer audience

**What goes wrong:**
Words like "vocabulary", "merge", "vector", "dimension", "byte", "hex", "regex", "ID" and "encode/decode" slip in undefined. Hex byte displays (`F0 9F`) alarm non-programmers.

**Prevention:** Jargon list with first-use definitions, enforced by the glossary file (Pitfall 9). Offer the byte view as an optional "show details" toggle. Read each post aloud to a non-programmer before release.

**Phase:** All content phases, P-Harden.

---

### Pitfall 20: Page works only with JavaScript, hurting search entry, accessibility and trust

**What goes wrong:**
A client-rendered SPA shows a blank page to crawlers and no-JS readers, and the series relies on search entry to individual posts.

**Prevention:** Prerender the article text and static examples (static, precomputed screenshots or tables of the key examples), and hydrate only the interactive islands. Include a no-JS fallback for each interactive (a static example with the same lesson).

**Phase:** P-Foundation.

---

### Pitfall 21: Redistribution and licensing of tokenizer data

**What goes wrong:**
Self-hosting vocabulary files means redistributing someone else's artifact. Licenses differ across tokenizers (for example open-source library code vs model-family license terms on tokenizer files). Not verified in this research.

**Prevention:** Record the license and source URL for every vocabulary file shipped, and confirm redistribution terms in P-Compare. Prefer tokenizers with permissive terms for live embedding. Fall back to precomputed examples for restricted ones.

**Phase:** P-Compare.

---

## Minor Pitfalls

### Pitfall 22: Token-boundary rendering details

**What goes wrong:** Newline tokens collapse in HTML, tab/multiple spaces collapse, long tokens overflow narrow phone screens, and a token that is a lone combining mark renders oddly.
**Prevention:** Use `white-space: pre`, show control characters visibly, allow chip wrapping, and test narrow viewports.

### Pitfall 23: IME composition and mobile keyboards

**What goes wrong:** Tokenizing mid-composition for CJK and some mobile keyboards shows flickering or wrong intermediate tokens. Autocorrect and autocapitalize change what the reader typed.
**Prevention:** Handle `compositionstart/end`, and set `autocapitalize`, `autocorrect` and `spellcheck` attributes off on the playground textarea.

### Pitfall 24: Privacy messaging

**What goes wrong:** Readers may paste sensitive text. If analytics capture input or the page makes network calls, trust is lost.
**Prevention:** Fully local tokenization, and a visible "your text stays in your browser" note, which must be true (verify network tab in P-Harden). No analytics on input contents.

### Pitfall 25: Dark mode and print

**What goes wrong:** Chip palettes tuned for light mode fail contrast in dark mode, and print drops background colors so tokens merge.
**Prevention:** Define the palette per theme and test both. Add a print-safe border style.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Character-level toy with `</w>` markers | Easiest to explain, matches most tutorials | Teaches an algorithm that differs from real tokenizers (Pitfall 1), needs a rewrite of the bridge to real output | Only if clearly labelled as simplified and a live byte-level step follows in the same post |
| Hand-typed token splits in prose | Fast to write | Silent drift and contradictions with the live tool (Pitfall 4) | Never |
| Copying vocab files into each post | No shared-asset setup | Duplicated multi-MB downloads, no caching across posts | Never |
| Tokenizing on the main thread, no input cap | Simplest code | Freezes on paste of long text, worst on phones (Pitfall 12) | Only in a throwaway prototype |
| Hotlinking vendor-hosted vocab files | No hosting | Availability, CORS, URL change and license risk | Never in production |
| Hard-coded model names and window sizes in prose | Quick content | Stale within months (Pitfall 14) | Only inside a dated, single-source data file |
| Color-only chip separation | Looks good immediately | Fails WCAG 1.4.1, and adding cues later touches every post (Pitfall 13) | Never |
| Per-post one-off interactives with separate code | Fast per post | Inconsistent behavior, duplicated bugs, contradicts "shared reusable components" | Only for truly unique visuals (such as the context-window bar) |
| Skip the no-JS fallback | Less work | Search and no-JS readers see nothing (Pitfall 20) | Never for article text, acceptable for interactive widgets if a static example is shown |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Vendor token-counting API (for example Anthropic `count_tokens`) | Calling it live from the browser with a key, or treating the count as exact | Precompute with a committed script, show the date and model, and note it is an estimate. Counts are model-specific, and the tokenizer changed between model generations |
| `tiktoken` (Python, reference) | Assuming the JS port gives identical results without testing | Generate golden outputs with Python and snapshot-test the JS tokenizer against them for the full regression corpus |
| JS BPE ports (`js-tiktoken`, `gpt-tokenizer`) | Importing the all-encodings entry point | Import only the needed encoding and lazy-load its rank data |
| `@huggingface/tokenizers` (standalone JS) | Loading it as part of the whole Transformers.js stack | Use the standalone package if open-model tokenizers are needed (community sources report a few KB gzipped for the library, MEDIUM, verify), and load the model's tokenizer file on demand |
| Vendor documentation as source of truth | Paraphrasing from memory or from blog posts | Link the primary doc for each claim in the ledger, and re-check before release |
| Static site tooling (islands or partial hydration) | Hydrating every island on page load | Hydrate on visible or on interaction |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Parsing a 200k-entry vocabulary on the main thread | Page freezes at first interaction, worst on mid-range phones | Worker, lazy load on first interaction, cache | Immediately on low-end mobile |
| Tokenizing every keystroke, uncapped | Typing lag, tab freeze on paste | Debounce, cap length, worker | A few thousand characters, sooner for repetitive text |
| Thousands of chip DOM nodes | Slow re-render, scrolling jank | Cap or virtualize chips, avoid layout thrash | Roughly hundreds to low thousands of nodes on mobile |
| Vocabulary shipped in every page bundle | Large first load on all posts | Shared lazy-loaded asset URL | Every page view |
| Animating many elements in the BPE stepper | Jank, motion discomfort | Few elements, CSS transforms, reduced-motion fallback | Large corpora or low-end devices |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Rendering user text via `innerHTML` | XSS (self-XSS, but also via shareable URLs if text is stored in the query string) | `textContent` or framework-escaped text only |
| Sharing playground state in the URL with raw text | Reflected input and privacy leakage | Cap length, escape, and avoid auto-loading from the URL without escape |
| API key in client code (for live Claude counting) | Key theft and bill abuse | Never. Use precomputed data (Pitfall 3) |
| Analytics capturing playground input | Privacy breach, breaks the "stays in your browser" promise | Do not collect input text |
| Third-party scripts or fonts on pages with local-only promise | Undermines trust, adds network calls | Self-host assets |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Empty playground | The reader does not know what to try | Pre-filled text and curated "try these" buttons with a one-line takeaway each |
| Seeing IDs without explanation | Readers assume IDs mean something | One-line "labels, not meaning" note, shown on demand |
| Stepper with no reset or run-to-end | Readers get stuck or bored | Next, back, run to end and reset, always visible |
| Dense hex or byte display by default | Non-programmers feel lost | Hidden by default behind "show details" |
| Comparison table with no date or tokenizer names | Cannot tell what is being compared | Name the encoding and show a dated header |
| Long essay-style posts with interactives far from the text that explains them | Readers do not connect them | Put each interactive directly beneath the paragraph it illustrates, with one stated takeaway |
| Hub that forces linear reading | Search arrivals feel lost | Recommended order only, with a "start anywhere" note and per-post recap |

## "Looks Done But Isn't" Checklist

- [ ] **Playground:** Often missing the emoji, split-character and RTL cases. Verify against the regression corpus and a reference `tiktoken` run.
- [ ] **Playground:** Often missing visible whitespace. Verify that ` hello` and `hello` look different and that a legend explains the marker.
- [ ] **Playground:** Often missing an input cap and a worker. Verify by pasting 1 MB of text on a throttled phone profile.
- [ ] **BPE stepper:** Often missing reset, run-to-end, tie-break explanation and keyboard operation. Verify with keyboard only.
- [ ] **Token display:** Often missing a non-color separator and a text alternative. Verify with a color-blindness simulator and a screen reader.
- [ ] **Comparison:** Often missing dates, encoding names and the "approximate" label. Verify every column has a source and a date.
- [ ] **Comparison:** Often missing the closed-tokenizer story (Claude, Gemini). Verify there is no silently substituted tokenizer.
- [ ] **Prose examples:** Often drift from live output. Verify the build-time check passes for every quoted split.
- [ ] **Embeddings post:** Often covers only one sense of "embedding". Verify all three senses are named and the scope is stated.
- [ ] **Context post:** Often says "no memory" without product-memory nuance. Verify the two-step explanation and an overflow demonstration.
- [ ] **Reasoning post:** Often hard-codes vendor behavior. Verify vendor specifics sit in a dated box and "summary vs raw" is stated.
- [ ] **Each post:** Often assumes the reader read Post 1. Verify the "what you need first" recap and a cold read from a search-arrival perspective.
- [ ] **Disambiguation page:** Often lists one definition per term. Verify it lists the real overloads and vendor vocabulary.
- [ ] **Hub:** Often forces order. Verify entry from any post works.
- [ ] **Whole site:** Often fine on desktop only. Verify on a mid-range Android, iPhone, narrow viewport, dark mode and reduced motion.
- [ ] **Privacy:** Verify in the network panel that typing sends nothing.
- [ ] **Reader test:** At least 2 or 3 non-programmers complete each post and can answer "what is a token, and how is it different from a word?" in their own words.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Toy tokenizer teaches the wrong model (1) | HIGH | Rewrite the toy to be byte-level and pre-split faithful, then redo the stepper copy and visuals. Cheaper if the shared component API hides the representation |
| Tokens stored as strings (2) | HIGH | Change the data model to bytes everywhere. Touches every consumer, so catch in P-Foundation |
| Wrong real-tokenizer approach (3) | MEDIUM | Swap the data source behind a single adapter. Keep a thin `Tokenizer` interface so open and precomputed implementations are interchangeable |
| Prose drifts from live output (4) | LOW to MEDIUM | Add the build-time check, then fix mismatches |
| Concept conflations in posts (5 to 8) | MEDIUM | Rewrite sections. Cheaper with a glossary and a claims ledger |
| Accessibility retrofitted late (13) | HIGH | Rework the shared `TokenDisplay` and every page using it. Avoid by building text alternative and non-color cues in P-Foundation |
| Performance problems found late (12) | MEDIUM | Move tokenization to a worker, add caps, and lazy-load vocab. Easier if the tokenizer is already behind an async interface |
| Stale vendor facts (14) | LOW (per fact) | Update the single data file and re-run the ledger check |
| Licensing problem with a vocab file (21) | LOW | Drop the live version, and substitute precomputed examples |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Toy vs real mismatch | P-Foundation, P-Post1, P-Compare | Toy output structurally matches real output (leading-space, bytes); callout present |
| 2. Unicode and emoji | P-Foundation, P-Post1, P-Compare | Regression corpus passes against reference `tiktoken`; no `�` in UI |
| 3. Real-tokenizer availability | P-Compare (decide first) | Every comparison column has source, date and "approximate" where applicable; no user text sent to a server |
| 4. Famous examples drift | P-Foundation, P-Post1, P-Harden | Build-time check of quoted splits passes |
| 5. Training vs running, tokenizer vs model | P-Post1 | Reader test: can state the difference |
| 6. Embedding senses | P-Posts2-4, P-Hub | Three senses named, scope stated |
| 7. Context is not memory (layered) | P-Posts2-4, P-Hub | Two-step explanation, overflow demo, no undated window sizes |
| 8. Reasoning claims | P-Posts2-4, P-Harden | Vendor specifics dated and boxed, "summary vs raw" present, re-verified before release |
| 9. Terminology drift | P-Foundation, P-Hub, P-Harden | Glossary is single source, consistency pass done |
| 10. Missing generation-loop prerequisite | P-Foundation, P-Post1, P-Posts2-4 | A cold-read of Post 3 and Post 4 works with only the recap |
| 11. Interactives without guided discovery | P-Post1 | Each interactive has one stated takeaway and passes reader test |
| 12. Bundle and mobile performance | P-Foundation, P-Compare, P-Harden | Measured budgets met on throttled mobile profile |
| 13. Accessibility | P-Foundation, P-Harden | axe, keyboard-only run, screen-reader pass, color-blind simulation |
| 14. Staleness | P-Foundation, P-Harden | Data file and claims ledger exist, dated, re-verified |
| 15. Special tokens and hostile input | P-Foundation, P-Post1 | Corpus includes special-token strings and RTL, no crash |
| 16. Chat-template counts | P-Post1, P-Posts2-4 | Counts labelled "this text only" |
| 17. Not all tokenizers are BPE | P-Post1, P-Compare | Wording check |
| 18. Scope inflation | Roadmap | Interactive budget per post agreed, every phase ends publishable |
| 19. Jargon creep | All content phases, P-Harden | Non-programmer read-through |
| 20. JS-only pages | P-Foundation | Posts readable with JS disabled |
| 21. Licensing of vocab files | P-Compare | License recorded for each shipped file |

## Research Flags for Roadmap

- **Needs a dedicated spike or deeper research before building:** P-Compare (tokenizer sources, JS-port parity with Python reference, vocabulary hosting and licensing, whether a subset vocabulary is acceptable). Also the reasoning post (re-verify vendor behavior right before writing).
- **Needs a design decision up front:** the `Tokenizer` interface (bytes in, byte-level tokens out, async, worker-friendly) and the `TokenDisplay` component contract (non-color cues and a text alternative). Both are consumed by every post.
- **Standard patterns, unlikely to need research:** hub and disambiguation page (content work, depends on glossary), basic page scaffolding.

## Sources

**Reproduced locally (HIGH):**
- `tiktoken` 0.14.0 run, 2026-10-02, encodings `cl100k_base` and `o200k_base`: all token splits, byte-level emoji splits, special-token error, vocabulary file sizes and entry counts quoted above.

**Official documentation, fetched this session (MEDIUM-HIGH):**
- Claude Docs, Thinking (summary vs raw chain of thought, billing for full thinking tokens, default `display`, preservation of earlier thinking blocks by model): https://platform.claude.com/docs/en/build-with-claude/thinking
- Claude Docs, Extended thinking (budget-based mode deprecated and rejected on newer models, adaptive replacement): https://platform.claude.com/docs/en/build-with-claude/extended-thinking
- Claude Docs, Context windows (window includes output and thinking, "working memory" framing, context rot, compaction, caching changes cost not window): https://platform.claude.com/docs/en/build-with-claude/context-windows
- Claude Docs, Token counting (count is an estimate, model-specific, about 30% more tokens on newer tokenizer): https://platform.claude.com/docs/en/build-with-claude/token-counting
- OpenAI Docs, Reasoning models (reasoning tokens not visible via API, occupy context, billed as output, optional summaries): https://developers.openai.com/api/docs/guides/reasoning
- `openai/tiktoken` issue 388 (encode requires valid UTF-8, so partial-byte tokens cannot be re-encoded): https://github.com/openai/tiktoken/issues/388
- `openai/tiktoken` issue 391 (reported quadratic performance on some inputs, not re-verified): https://github.com/openai/tiktoken/issues/391

**Web search results, cross-checked where noted (LOW to MEDIUM):**
- Hugging Face LLM course, Byte-Pair Encoding: https://huggingface.co/learn/llm-course/en/chapter6/5 and tokenizer summary: https://huggingface.co/docs/transformers/tokenizer_summary (byte-level base vocabulary of 256, pre-tokenization; GPT-2 regex)
- Simon Willison, Claude token counter and model comparison: https://simonwillison.net/2026/Apr/20/claude-token-counts/ (token-count ratios, LOW as third-party measurement)
- Karpathy's tokenizer lecture write-up (fast.ai): https://www.fast.ai/posts/2025-10-16-karpathy-tokenizers.html (tokenization quirks and glitch tokens, background only)
- LessWrong, SolidGoldMagikarp: https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation (glitch-token origin story, GPT-2/3 era)
- npm pages and community comparisons for `js-tiktoken`, `gpt-tokenizer`, `@huggingface/tokenizers` (bundle size and lazy-loading claims, LOW to MEDIUM, measure before relying)
- WCAG 2.2 criteria 1.4.1, 1.4.11, 2.3.3, 2.5.8, 4.1.3 summaries from W3C and accessibility sites (search-result summaries cross-read across several pages, MEDIUM; confirm against https://www.w3.org/TR/WCAG22/ in P-Harden)
- Community write-ups on `Intl.Segmenter` and JavaScript string length (grapheme vs code point vs UTF-16 unit)
- Community write-ups on embedding terminology (token embeddings vs text embeddings), LOW to MEDIUM, used only to confirm the three-senses framing

**Not verified, flagged for later:**
- Licensing and redistribution terms for specific tokenizer files (Pitfall 21).
- Exact current bundle sizes of JS tokenizer libraries (measure in P-Compare).
- Claude vocabulary-size claims in blog posts (conflicting, LOW, do not repeat).

---
*Pitfalls research for: interactive LLM tokenization explainer for a non-programmer audience*
*Researched: 2026-10-02*

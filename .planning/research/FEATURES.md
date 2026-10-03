# Feature Research

**Domain:** Interactive explainer blog (LLM tokenization + token/embedding/context/reasoning disambiguation) for a non-programmer audience
**Researched:** 2026-10-02
**Confidence:** MEDIUM-HIGH (competitor/tool features verified against official pages and papers; blog-hygiene conventions are established practice; the "what non-programmers need" judgments are synthesis)

## How to read this

Three reference families were analyzed, and they teach different things:

1. **Tokenizer tools** (OpenAI Tokenizer, Tiktokenizer, Xenova "Tokenizer Playground"): a text box, colored token spans, token count, token IDs, a model selector. They are *tools for developers*. They have no narrative, no guidance, and no "so what". Reader ability to interpret the output is assumed. This is the gap the project fills.
2. **Interactive explainers** (Transformer Explainer, Distill, Nicky Case explorables, Pudding scrollytelling, Google ML Crash Course): guided interaction, progressive disclosure, prediction prompts. Transformer Explainer's own evaluation found users still got overwhelmed without onboarding and in-situ explanation, so even the best-in-class needed scaffolding added later.
3. **Diagram-led posts** (Illustrated Transformer, Karpathy's tokenizer lecture / minbpe, Hugging Face LLM course BPE chapter): the BPE merge procedure is conventionally taught as a static worked example (corpus, pair counts, merge, repeat). A step-through interactive version of this is the obvious upgrade, and the project's flagship differentiator.

**Key positioning insight:** the tokenizer tools are table stakes for the *playground*. They are not the product. The product is *the guided explanation wrapped around the playground*, which none of them provide.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Missing these = the site feels broken, amateur, or untrustworthy. Users give no credit for having them.

#### A. Interactive table stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Live tokenizer playground: type text, see colored token spans updating as you type | Every tokenizer tool (OpenAI, Tiktokenizer, Xenova) does this; it is the reason anyone arrives from search | LOW-MEDIUM | Alternate colors per token; whitespace made visible (leading-space tokens, newlines); must be debounced/non-blocking. Uses the toy tokenizer first, real tokenizers later |
| Token count and character/word count shown alongside | All reference tools show total token count; it is the number people actually care about | LOW | Show chars vs words vs tokens side by side: this *is* the "token is not a word" lesson |
| Token IDs visible (toggle between text view and ID view) | OpenAI and Tiktokenizer show IDs; the "token = an ID" point is the bridge to the embeddings post | LOW | Hover a span to highlight its ID and vice versa. Default to text view; IDs are one click away so they do not intimidate |
| Pre-filled default text and one-click example chips | Empty text boxes lose non-programmers; they do not know what to type. Nicky Case/Distill guidance: don't expect readers to invent their own experiments | LOW | Chips like "unbelievably", "Hello, world!", a number, an emoji, a non-English sentence. Reset button restores default |
| Step-through BPE trainer with Next / Back / Reset (and optionally Auto-play) | The project's stated flagship interactive; reference material (HF course, Karpathy) teaches this as static steps, so a controllable version is the expected upgrade. Back/Reset matter: scrub-ability is a documented Distill/Explorable pattern | MEDIUM | Tiny corpus (a handful of words), visible pair-frequency table, highlighted winning pair, merge applied, vocab grows. Must show *why* a pair won, not just that it merged. State machine, so Back is cheap if each step is a stored snapshot |
| Toy tokenizer shared by all posts (one implementation, one display component) | Explicit project requirement; also avoids drift between posts | MEDIUM | Single colored-token display component reused everywhere. Foundational dependency for most other interactives |
| Side-by-side toy vs real-tokenizer comparison on identical input | Project requirement; Xenova's playground lets you switch models, this adds a *contrast*, which is what teaches | MEDIUM-HIGH | Cost depends on the undecided in-browser vs precomputed choice (see Dependencies). Minimum: 1-2 real tokenizers, 6-10 curated inputs |
| Curated "odd inputs" examples: numbers, emoji, rare words, non-English, code, leading/trailing space | Karpathy's list of tokenization quirks (arithmetic, whitespace, non-English, SolidGoldMagikarp) is the canonical set; non-English token premium is widely documented (e.g. Hindi/Arabic/Bengali need substantially more tokens than English per word) | LOW (if precomputed) | This is mostly *content*, not engineering. Curated examples with a one-sentence "what to notice" caption each |
| Responsive/mobile-usable interactives | Reader traffic from search/social is heavily mobile; Pudding/Distill both flag device variance as a main authoring challenge | MEDIUM | Text box + token spans reflow fine; the BPE stepper and comparison table are the hard ones. Stack vertically on narrow screens, 44x44px touch targets, buttons not hover-only. Hover interactions need tap equivalents |
| Works with no setup, no login, no install | Explicit project constraint; Transformer Explainer cites installation-free access as a design goal | LOW | Static hosting; all interactives load on page |
| Interactives degrade gracefully (static fallback: image/screenshot or pre-rendered example + the text) | JS-failure, slow connection, search crawlers, screen readers | LOW-MEDIUM | `<noscript>` pre-rendered example output for each interactive; text carries the argument even if the widget doesn't load |

#### B. Content / pedagogy table stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One-sentence plain-language definition of each term up front ("A token is...") | Non-programmer audience arrives with a question; answer-first is what search visitors want | LOW | Put at top of each post and repeat in the disambiguation page |
| Plain-language prose; zero code, minimal math; jargon defined on first use | Project constraint | MEDIUM (editorial effort, not engineering) | Inline glossary tooltips for 8-12 terms (vocabulary, merge, ID, vector, subword). Tooltips need tap + keyboard support |
| "Do and Show and Tell": interactive placed right after the claim it supports, not a standalone gadget | Nicky Case pattern; Distill guidance: reactive diagrams with guidance | LOW (design discipline) | Every interactive gets a lead-in sentence ("Try typing a long word") and a takeaway sentence |
| Explicit "what to notice" prompts beside each interactive | Transformer Explainer's evaluation found users were overwhelmed or confused without in-situ explanation | LOW | Captions that change with state where cheap (e.g. "This word split into 3 tokens") |
| Correct, source-backed claims (small "how we know / further reading" per post) | Project core value is a *correct* mental model, and the stated goal is a "trustworthy resource" | LOW | Link to primary docs (OpenAI/Anthropic docs on reasoning tokens, HF course, Karpathy lecture). Note tokenizer behavior changes between model versions |
| Visible caveat that toy tokenizer != any production tokenizer | Prevents false mental model | LOW | One persistent labeled badge on the toy tokenizer: "Teaching version" |

#### C. Blog / site table stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| "Start here" hub page with recommended reading order | Project requirement; also the series entry for direct search traffic | LOW | Short blurb per post, estimated reading time, "what you'll be able to do after" |
| Series navigation on each post: previous/next, "part N of 4", link back to hub | Posts are entered from search mid-series, so each must orient the reader | LOW | Also a "not read the earlier post? 30-second recap" box on posts 2-4 so they stand alone |
| Disambiguation page: token / embedding / context / reasoning side by side | Project requirement; likely the highest-traffic evergreen page | LOW | A small table (one-liner, what it is, what it is not, common confusion, link to the post). Ship as a quick reference, linkable by anchor |
| Clean, readable typography; comfortable line length; light/dark respect (`prefers-color-scheme`) | Essay-reading experience is the baseline for Distill/Pudding-style sites | LOW | Token color palette must work in both modes |
| Per-page title/meta description and Open Graph / social preview image | Share-from-search/social is the main distribution; unfurl cards are expected | LOW | One OG image per post; a screenshot of a colored tokenization is a free, on-topic image |
| RSS/Atom feed | Standard for blogs; the audience that follows explainers uses it. Cheap | LOW | Most static-site generators produce this natively |
| Sitemap, sensible URLs, canonical tags | Search is the project's stated entry route ("entered directly from search") | LOW | Descriptive slugs |
| Fast load, interactives lazy-loaded below the fold | Search visitors bounce on slow pages; heavy widgets on every page was one reason the long-essay format was rejected | MEDIUM | Load each interactive's JS only on its page; real-tokenizer data loaded only on demand (see Pitfalls for vocab file size) |
| Basic analytics (privacy-respecting) | Needed to learn which posts/interactives get used | LOW | Optional but small; the choice is the author's |

#### D. Accessibility table stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Color is never the only signal for token boundaries (WCAG 1.4.1) | Colored token spans are the central visual; color-blind users must still see boundaries | LOW-MEDIUM | Add thin separators/underlines or alternate background + outline; hover/focus reveals ID and boundary as text. Verify 3:1 non-text contrast (WCAG 1.4.11) |
| Keyboard operability for every interactive (text box, steppers, toggles, example chips) | WCAG basics; Distill notes dynamic media exacerbates accessibility challenges | MEDIUM | Native `<button>`, `<input>`, `<textarea>`; visible focus ring. Do not build custom widgets where native ones work |
| Screen-reader equivalent for visual output | The token display is a visual-only artifact by default | MEDIUM | Render tokens as real DOM text (list), not canvas; announce a summary ("12 tokens") via a polite live region, not per-keystroke chatter |
| `prefers-reduced-motion` honored; no auto-playing animation by default | Common scrollytelling failure; BPE stepper auto-play must be opt-in | LOW | Replace rather than delete animations (instant state change) |
| Alt text / text description for any static diagrams | Baseline | LOW | |
| Readable contrast and scalable text; layout survives 200% zoom | WCAG AA basics | LOW | |

---

### Differentiators (Competitive Advantage)

Aligned with Core Value: "a non-programmer can play with a tokenizer and come away with a *correct mental model* of what a token is, and how it differs from word / embedding / context / reasoning."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Guided narrative wrapped around the playground** (what to try, what happened, why) | Existing tokenizer tools show output but never explain it; Transformer Explainer's study found guided onboarding was what fixed usability gaps | MEDIUM (mostly writing) | This is the whole point. Also the cheapest differentiator |
| **Step-through BPE with live "your text through the trained merges" bridge** | Static BPE walk-throughs exist; letting the reader train a tiny tokenizer and *then* tokenize their own sentence with it connects the algorithm to the playground | MEDIUM-HIGH | Reuses the shared toy tokenizer; the trained merge list feeds the same colored-token component |
| **"Place your bets" prediction prompts** ("How many tokens do you think this has?") | Prediction before reveal produces a bigger learning "shock" (Nicky Case "Place Your Bets"); a Distill-cited self-reflection technique. Directly attacks the "token = word" misconception | LOW-MEDIUM | Slider/number guess, then reveal actual count. Great for emoji, numbers, non-English |
| **Language fairness demo**: same sentence in several languages, token counts compared | Concrete, emotionally sticky, and well documented; makes tokens feel *real* (they cost money, fill up context) | LOW-MEDIUM (if sentences precomputed) | Links tokens to context limits and cost, a natural lead into the context post. Be careful to caveat which tokenizer/version |
| **Cross-post thread via one running example sentence** | Seeing the *same* sentence become tokens, then IDs, then vectors, then occupy context, then be extended by reasoning, is the disambiguation, shown rather than told | MEDIUM | Needs the shared toy tokenizer and shared display component; strong unifier for the series |
| **Token to ID to vector visual "pipeline strip"** (embedding post) | The disambiguating picture: a token is an ID, an embedding is the row looked up for it. Transformer Explainer shows this inside a heavy architecture view; a minimal standalone version for non-programmers is missing | MEDIUM | Show a *table lookup* (ID to row of numbers), with the toy vectors tiny (e.g. 2-4 dims) so it is legible; no matrix math |
| **Embedding "nearby words" explorer (tiny 2D toy map)** | Gives intuition that vectors encode similarity, which separates "embedding" from "token" cleanly. Embedding Projector/Google MLCC exercises do this but for developers | MEDIUM | Hand-picked ~30-60 words, precomputed 2D positions, click a word to highlight neighbors. Do NOT ship a full 3D projector. Caveat that 2D hides most of the structure |
| **Context-window "desk" demo**: a fixed-size bar that fills with prompt, history, and reply tokens; oldest content falls off; "start a new chat" empties it | Directly shows "context is what's in the prompt right now, not memory." Reader can *see* that every turn resends everything | MEDIUM | Uses toy tokenizer counts. Slider for window size. Highlights what the model can "see". The strongest anti-misconception interactive in the series |
| **Reasoning-tokens demo**: question, hidden "thinking" tokens streamed (precomputed), then final answer; token meter shows thinking + answer = billed output | Shows reasoning = more generated tokens, not a special mechanism; real APIs bill and count reasoning tokens as output tokens within the context window. Hidden-then-revealed is a very concrete visual | MEDIUM | Use scripted/precomputed example (not live inference, which is out of scope). Toggle "show thinking / hide thinking" to show the same token stream with different visibility. Must be clear it is an illustration |
| **Misconception-first structure** ("You might think X. Here is what is actually happening.") | The project is about *confusing terms*; naming the wrong model explicitly is more effective than defining the right one in a vacuum | LOW (editorial) | Template block reused in all four posts |
| **Four-term disambiguation with live linking** (each term in the quick-reference opens the relevant mini-demo) | Quick reference becomes interactive instead of a glossary | MEDIUM | Reuses demos from posts; only after posts exist |
| **"Break it" odd-inputs gallery**: curated set of tokenizer quirks (trailing space, numbers splitting inconsistently, rare strings), each with a one-line "why" | Karpathy's list of quirks is the community's favorite tokenization topic; curated beats open-ended for non-programmers | LOW-MEDIUM | Precomputed. Strong shareable/linkable content |
| **Shareable state via URL** (text in the playground encoded in the link) | People share surprising tokenizations; supports "look at this!" virality at near-zero cost | LOW | Query-param or hash. Keep text length bounded |
| **Tokenizer arena (3+ real tokenizers side-by-side on user input)** | Teaches that "token" depends on which tokenizer; goes beyond Tiktokenizer's one-at-a-time view | HIGH (if in-browser) / MEDIUM (precomputed on curated inputs only) | Defer; see MVP. The comparison on *curated* inputs delivers 80% of the learning |
| **Comprehension check** after each post (1-3 low-stakes questions with immediate feedback) | Distill-cited self-reflection technique; also useful as honest feedback on whether the mental model landed | LOW-MEDIUM | Optional per post. Not scored, not stored |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Live LLM inference (generate text, in-browser GPT-2, API calls) | Transformer Explainer does it; feels "real" | Explicitly out of scope; huge download, GPU/memory variance on phones, API keys/costs/abuse; it shifts the post from "what is a token" to "how does a transformer work" | Scripted, precomputed illustrations clearly labeled as illustrations |
| Attention / transformer-architecture visualization | It is the famous thing in this space | Out of scope (four concepts only); entangles beginners in the least relevant part of the story for these terms | One "what's next" link to Transformer Explainer and Illustrated Transformer |
| Full developer-grade tokenizer tool (token-cost calculator, model pricing, chat-role composer, API cost estimates) | Tiktokenizer/OpenAI tools lead with these | Competes with free, better tools; drifts audience toward developers; prices go stale quickly | Link to those tools for people who want them |
| Open-ended "any model from the Hub" tokenizer picker | Xenova's playground does this | Needs large downloads and a model catalog; invites broken/odd outputs readers can't interpret | 1-2 curated real tokenizers |
| Full-length cinematic scrollytelling (scroll-jacking, pinned scenes, scroll-driven animation) | Pudding-style prestige | Heavy to build and maintain (the reason the long essay was rejected); breaks on mobile; problematic for reduced-motion and keyboard users; contradicts "one idea per post" | Ordinary scrolling article with embedded self-contained widgets; optional light sticky captions only |
| One giant sandbox with many controls | Feels powerful | Documented risk: overwhelming with little guidance (Nicky Case on sandbox mode; Transformer Explainer onboarding findings) | Small, single-purpose widgets with defaults; sandbox only after guided steps |
| Code snippets and Colab/Jupyter notebooks | Distill-style reproducibility | Out of scope for a non-programmer audience | Optional "for the curious" link-out to the HF course or Karpathy lecture |
| Math notation (softmax, dot products, formulas) | Rigor | Violates audience constraint | Words and pictures; footnote links for the rigorous |
| Comments, user accounts, newsletters, forums | Standard blog furniture | Moderation and privacy overhead; no early value for a 4-post launch | RSS now; add a mailing list only if there is demand |
| Gamification (scores, badges, streaks) | Engagement | Unnecessary; trivializes explanation | Prediction prompts and optional check questions |
| Multilingual translations of the site | Language-fairness topic invites it | Large editorial burden; tokenization examples in other languages are the demo, not the UI | English-only UI; non-English *inputs* as examples |
| "Exact" claims about specific vendor tokenizer internals or current model token limits stated as permanent | Authority | Goes stale; vendors change tokenizers and limits often | State what is generally true; date-stamp specifics; link to vendor docs |
| Auto-playing animations / sound | Polish | Accessibility and annoyance | Opt-in Play button |

---

## Feature Dependencies

```
Shared colored-token display component
    └──required by──> Live playground
    └──required by──> BPE step-through (shows token state at each step)
    └──required by──> Toy vs real comparison
    └──required by──> Context-window demo
    └──required by──> Reasoning-tokens demo
    └──required by──> Token-to-ID-to-vector strip

Toy tokenizer (shared implementation)
    └──required by──> Live playground (toy mode)
    └──required by──> BPE trainer's "now tokenize my text" bridge
    └──required by──> Context-window demo (token counts)
    └──required by──> Reasoning-tokens demo (counts)

Real-tokenizer data (decision: in-browser vs precomputed)
    └──required by──> Toy vs real comparison
    └──required by──> Language-fairness demo
    └──required by──> Odd-inputs gallery
    (precomputed => LOW cost, curated inputs only; in-browser => any user input but large payload + loading UX)

Token IDs view (in playground)
    └──required by──> Token-to-ID-to-vector strip (embedding post)

Series navigation + hub page
    └──requires──> at least the posts they link to (can stub, but hub needs all four before launch)

Disambiguation page
    └──requires──> all four posts (summaries must match final content)
    └──enhanced by──> live-linked mini demos

Accessibility baseline (non-color boundary cues, native controls, live-region summary)
    └──must be built into──> Shared colored-token display component (retrofit is expensive)

Prediction prompts ──enhances──> Playground, language-fairness demo, odd-inputs gallery
Shareable URL state ──enhances──> Playground
Reasoning-tokens demo ──enhances──> Context-window demo (reasoning tokens occupy the window)

Live LLM inference ──conflicts──> "works with no setup on any phone" and Out-of-Scope
Scroll-jacking scrollytelling ──conflicts──> reduced-motion/keyboard accessibility and mobile
Open-ended model picker ──conflicts──> curated, low-payload page speed goal
```

### Dependency Notes

- **Shared component is the root of the tree:** the colored-token display and the toy tokenizer are depended on by almost every interactive. Build and accessibility-harden them first (in the flagship post), or every later post inherits the debt.
- **Accessibility belongs in the base component, not a later pass:** non-color boundary cues and the text/ID toggle are cheap there and costly to bolt on across five posts.
- **Real-tokenizer approach gates three features:** comparison, language-fairness, and odd-inputs gallery. Recommendation is **precomputed results for curated inputs first** (tiny, fast, deterministic, no loading UX), with in-browser real tokenization treated as an optional later upgrade only if "type anything and see GPT's real tokens" proves wanted. This is a feature-level recommendation; the stack researcher should confirm feasibility and payload sizes.
- **Hub and disambiguation page are last to finalize** but should be *scaffolded early* so series nav exists from the first post.
- **Reasoning demo pairs with context demo:** the key fact that connects them (reasoning tokens consume context and are billed as output) is a better-told story if the context-window bar is already established.

---

## MVP Definition

The author's stated definition of done is all four posts plus hub plus disambiguation page. So "MVP" here means *the order of building within the first release* and which features inside each post can be cut if scope slips, not which posts to omit.

### Launch With (v1)

- [ ] Shared colored-token display component + toy tokenizer, accessibility built in (non-color cues, native controls, live-region summary, reduced motion)
- [ ] Post 1 playground: live tokenization, token/char/word counts, text/ID toggle, default text, example chips, reset
- [ ] Post 1 BPE step-through (Next/Back/Reset) on a tiny corpus with visible pair counts
- [ ] Toy vs real comparison on *curated precomputed* inputs, including numbers, emoji, and a few languages, each with a "what to notice" caption
- [ ] Post 2 (embeddings): token to ID to vector lookup strip with tiny toy vectors
- [ ] Post 3 (context): context-window "desk" demo with fill/overflow/new-chat
- [ ] Post 4 (reasoning): scripted reasoning-tokens demo with show/hide thinking and token meter
- [ ] Disambiguation page (table form) and "Start here" hub
- [ ] Series nav (prev/next/part N/hub link), OG images, RSS, sitemap, meta tags
- [ ] Misconception-first block, definition up front, glossary tooltips, toy-tokenizer "Teaching version" badge
- [ ] Mobile-responsive layouts for all interactives; static fallbacks for each

### Add After Validation (v1.x)

- [ ] Prediction prompts ("Place your bets") on playground and odd-inputs: add if early readers skim past interactives
- [ ] Shareable URL state for the playground: add when people start posting screenshots
- [ ] Embedding "nearby words" 2D toy map: add if the embeddings post does not land without it (it is the biggest embeddings-post risk to cut vs keep; keep if time allows)
- [ ] Comprehension check questions: add if feedback suggests the terms are still confused
- [ ] Odd-inputs "break it" gallery expansion
- [ ] Live-linked mini demos in the disambiguation page

### Future Consideration (v2+)

- [ ] In-browser real tokenizer on arbitrary input (tokenizer arena): defer until real demand; payload and loading UX are real costs
- [ ] Additional posts beyond the four concepts (attention, sampling/temperature, caching): explicitly out of scope for now
- [ ] Mailing list / newsletter: only if RSS proves insufficient
- [ ] Translated UI

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Shared token display + toy tokenizer (accessible) | HIGH | MEDIUM | P1 |
| Live playground with counts, IDs toggle, examples | HIGH | LOW-MEDIUM | P1 |
| BPE step-through | HIGH | MEDIUM | P1 |
| Toy vs real comparison (precomputed, curated) | HIGH | MEDIUM | P1 |
| Odd-inputs / language-fairness examples (curated) | HIGH | LOW | P1 |
| Hub, series nav, disambiguation page | HIGH | LOW | P1 |
| Token to ID to vector strip | HIGH | MEDIUM | P1 |
| Context-window desk demo | HIGH | MEDIUM | P1 |
| Reasoning-tokens demo (scripted) | HIGH | MEDIUM | P1 |
| Misconception-first structure, glossary tooltips | HIGH | LOW | P1 |
| RSS, OG images, sitemap, meta | MEDIUM | LOW | P1 |
| Accessibility baseline + mobile + static fallbacks | HIGH | MEDIUM | P1 |
| Prediction prompts | MEDIUM-HIGH | LOW-MEDIUM | P2 |
| Shareable URL state | MEDIUM | LOW | P2 |
| Embedding nearby-words toy map | MEDIUM | MEDIUM | P2 |
| Comprehension checks | MEDIUM | LOW-MEDIUM | P2 |
| Live-linked disambiguation page | MEDIUM | MEDIUM | P2 |
| In-browser real tokenizer arena | MEDIUM | HIGH | P3 |
| Analytics | LOW-MEDIUM | LOW | P2 |
| Live inference, attention viz, scrollytelling, accounts | LOW | HIGH | Do not build |

**Priority key:** P1 = must have for launch; P2 = should have, add when possible; P3 = nice to have, future.

---

## Competitor Feature Analysis

| Feature | OpenAI Tokenizer | Tiktokenizer | Xenova Tokenizer Playground | Transformer Explainer | Illustrated Transformer / HF BPE chapter | Our Approach |
|---------|------------------|--------------|-----------------------------|-----------------------|-------------------------------------------|--------------|
| Live colored tokens + count | Yes | Yes | Yes | Yes (embedded in model view) | No (static) | Yes, in every post, with narrative |
| Token IDs | Yes | Yes (hover links text to IDs) | Yes | Yes | Partial (static) | Yes, toggle; feeds embeddings post |
| Multiple tokenizers | Few OpenAI encodings | Several, OpenAI + open models | Many models + custom Hub IDs | GPT-2 only | n/a | 1-2 curated real + toy, side by side |
| Algorithm internals (how merges are learned) | No | No | No | No (tokenization shown as an input step) | Yes, as static worked example | Interactive step-through, reader controls pace |
| Audience guidance / onboarding | None | None | None | Guided Learning card (added after eval found overwhelm) | Written narrative | Narrative-first; each widget has lead-in and takeaway |
| Handles "why does this matter" (cost, context, fairness) | Cost only | Cost and pricing | No | No | Partial | Language fairness + context bar tie tokens to consequences |
| Disambiguation of related terms | No | No | No | Partial | No | Dedicated page and per-post misconception blocks |
| Runs with no setup | Yes | Yes | Yes (local model download) | Yes (in-browser GPT-2) | Yes | Yes, static hosting |
| Series / hub / RSS | n/a | n/a | n/a | Single page | Blog posts | Hub + series nav + RSS |
| Accessibility effort evident | Unknown | Unknown | Unknown | Unknown | n/a | Explicit, built into base component |

*"Unknown" means not determined from the sources reviewed; do not read it as "absent".*

---

## Sources

Tokenizer tools:
- OpenAI Tokenizer description and features (platform.openai.com/tokenizer; summarized via third-party and official help pages) - https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
- Tiktokenizer - https://tiktokenizer.org/about and https://www.tiktokenizer.app/ (confidence MEDIUM: site pages summarized by search, multiple unrelated mirrors exist)
- The Tokenizer Playground (Xenova) - https://huggingface.co/spaces/Xenova/the-tokenizer-playground

Interactive explainers and design guidance:
- Transformer Explainer paper (design goals, ONNX in-browser GPT-2, evaluation, confusion points) - https://arxiv.org/html/2408.04619 (HIGH)
- Distill, "Communicating with Interactive Articles" - https://distill.pub/2020/communicating-with-interactive-articles/ (HIGH)
- Distill about / guide - https://distill.pub/about/ and https://distill.pub/guide/
- Nicky Case, "Explorable Explanations: 4 More Design Patterns" (Place Your Bets, Sandbox Mode, etc.) - https://blog.ncase.me/explorable-explanations-4-more-design-patterns/ (HIGH for the named patterns)
- Nicky Case, Explorable Explanations (Do/Show/Tell) - https://blog.ncase.me/explorable-explanations/
- Google ML Crash Course, Embeddings - https://developers.google.com/machine-learning/crash-course/embeddings/interactive-exercises
- TensorFlow Embedding Projector overview - https://research.google/blog/open-sourcing-the-embedding-projector-a-tool-for-visualizing-high-dimensional-data/

Tokenization and concept content:
- Hugging Face LLM Course, BPE chapter - https://huggingface.co/learn/llm-course/en/chapter6/5 (HIGH)
- Karpathy, "Let's build the GPT Tokenizer" / minbpe lecture notes - https://github.com/karpathy/minbpe/blob/master/lecture.md (list of tokenization quirks)
- Jay Alammar, The Illustrated Transformer - https://jalammar.github.io/illustrated-transformer/
- Tokenization premium across languages - https://arxiv.org/html/2608.09046 and https://www.pokutta.com/blog/hidden-cost-tokenization/ (MEDIUM; numbers vary by tokenizer and version, so avoid quoting specific ratios without dating them)
- Reasoning tokens (billed as output, count against context, not visible) - https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/reasoning and OpenAI developer docs (MEDIUM-HIGH; verify exact current wording against vendor docs before publishing the reasoning post)
- Context window vs memory framing - https://dev.to/kenwalger/the-context-window-isnt-memory-its-the-cpu-cache-of-ai-3ma1 (LOW-MEDIUM; blog, used only to confirm the common misconception exists)

Accessibility:
- WCAG 2.2 (1.4.1 Use of Color, 1.4.11 Non-text Contrast) - https://www.w3.org/TR/WCAG22/ and https://webaim.org/articles/contrast/ (HIGH)
- Scrollytelling accessibility guidance (reduced motion, touch targets, keyboard) - https://scrollytelling.ai/scrollytelling-design-patterns/ (LOW-MEDIUM; practitioner reference)

---
*Feature research for: interactive explainer blog, LLM tokenization and related terms, non-programmer audience*
*Researched: 2026-10-02*

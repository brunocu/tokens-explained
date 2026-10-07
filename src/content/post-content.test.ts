// Executable content rules for Post 1 (TOK-10, D-08, D-10, D-12, D-14, Pitfall 4; rewritten for
// the editorial rewrite of plan 02-10). The post is read as raw text; none of these rules needs
// the build.
//
// Plan 02-10 relaxed exactly these Phase 1 rules, each marked "02-10" below, and kept the rest:
//   - "UTF-8" and "code point" may be named (defined in plain words at first use);
//   - links are allowed only as numbered <Cite> links and as <Reference> entries;
//   - numbers in prose are allowed only when derived from the engine (<Fact>), or cited, or 0 and 1;
//   - the word ceiling is raised; the section order is the new article order; the tie rule wording
//     is "the pair with the smaller numbers wins" (it matches comparePairs in src/core/bpe.ts).
import { describe, expect, it } from "vitest";
import raw from "./posts/what-is-a-token.mdx?raw";
import tokenYaml from "./glossary/token.yaml?raw";
import embeddingYaml from "./glossary/embedding.yaml?raw";
import contextYaml from "./glossary/context.yaml?raw";
import reasoningYaml from "./glossary/reasoning.yaml?raw";
import { EXAMPLES } from "../core/examples.ts";
import { SAMPLE_SENTENCE, STEPPER_FACTS } from "../core/stepper.ts";

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;
const frontmatter = FRONTMATTER.exec(raw)?.[1] ?? "";
const body = raw.replace(FRONTMATTER, "");

const REFERENCES_HEADING = "## References";
const referencesAt = body.indexOf(REFERENCES_HEADING);
/** The article without its References list. */
const article = referencesAt === -1 ? body : body.slice(0, referencesAt);
const referencesBlock = referencesAt === -1 ? "" : body.slice(referencesAt);

const GARNETT = "Happy families are all alike; every unhappy family is unhappy in its own way.";

const REQUIRED_SENTENCES = [
  // the definition of a token (UI-SPEC definition), now at the end of the raw-bytes section
  "A token is a small piece of text that a language model reads and writes. It can be a whole word, part of a word, a single character, a space plus a word, a piece of punctuation, etc.",
  "A language model is the kind of AI program behind chat assistants.",
  // the correction (TOK-10)
  "Tokens are not the same thing as words.",
  "The same sentence can contain more tokens than words.",
  "Many everyday words are a single token, while rare words are split into several.",
  "A space can be part of a token.",
  // playground instruction
  "Type or paste anything, or pick an example, and watch it split into tokens.",
  // the byte sentence of the first section (the final text no longer defines bit or byte separately)
  "Most English letters take up one byte, many other characters take several.",
  // ids are labels (D-08)
  "these ids are only labels in a list. A bigger number does not mean a rarer or more important word, and a different tokenizer would give the same token a different id.",
  // frames and the byte example (R-01, TOK-10)
  "Hatched chips inside one frame are the bytes of a single character, which is shown in front of them.",
  "is stored as the bytes `E7 94 B7`, and the tokenizer may cut between them.",
  // honest framing (TOK-10), in "The tokenizer behind the demos"
  "It is a tiny toy, but it works the same way as the real tokenizers used in popular models. Real tokenizers follow the same steps, but their vocabularies are far bigger, so their splits will differ from the ones you see here. Many popular models use byte-pair encoding, though not all do.",
  // after the stepper (D-06, D-07)
  "The examples below use the same tokenizer algorithm as the step by step example above, but it is trained on a small corpus of English text.",
  // softened claim and bullet (D-17)
  "while many everyday words stay whole.",
  // the differences (D-07, D-16). The "work on bytes" difference is gone: the stepper works on bytes now.
  "Compared with the tiny toy in the step by step example, real tokenizers differ in three ways.",
  "They split text with a rule before merging, so tokens do not run across spaces and punctuation. And their vocabularies hold tens of thousands of tokens or more.",
  // the tie rule (plan 02-10): the same wording as the stepper's sentences and comparePairs
  "Our rule is: the pair with the smaller numeric values win.",
  // checked against learn_bpe.py lines 373-378 on 2026-10-06 (plan 02-10 re-check)
  "The code published by the author of the BPE-for-translation method settles ties differently: among the tied pairs it takes the one that sorts last as text",
];

const STEPPER_SLOT_SENTENCE =
  "Byte-pair encoding builds a tokenizer's list of tokens by reading lots of text and joining the pair of neighbouring tokens it sees most often, again and again. Step through a tiny example.";

const COMPARISON_SLOT_SENTENCE =
  "These are two older tokenizers, picked because they are small and free to share. Newer models may cut text differently. Pick a text and see how each tokenizer splits it.";

const LANGUAGES_SLOT_SENTENCE =
  "The same sentence, in six languages, cut by the same three tokenizers. Look at the counts.";

const ANALOGY_WORDS = ["syllable", "building-block", "building block", "puzzle", "jigsaw", "brick", "lego"];
const PROMISE_PHRASES = ["coming soon", "next up", "stay tuned", "part 2", "later post", "upcoming", "future post"];
const NUMBER_WORDS = "two|three|four|five|six|seven|eight|nine|ten|eleven|twelve";

/** The h2 headings written in the Markdown (the section wrappers add four more). */
const HEADINGS = [
  "How does a computer store text?",
  "What is a language model, and why numbers?",
  "Why not feed in raw bytes?",
  "Tokens are not words",
  "How the numbers are assigned",
  "Why not just split on spaces, or on meaning?",
  "What the step by step example showed",
  "The tokenizer behind the demos",
  "What you just saw",
  "References",
];

type Cite = { at: number; numbers: number[]; sentence: string };

/** Every <Cite n={...} /> in the article, with the sentence it ends. */
function citesIn(text: string): Cite[] {
  const out: Cite[] = [];
  for (const m of text.matchAll(/<Cite n=\{(\[[\d,\s]+\]|\d+)\} \/>/g)) {
    const numbers = (m[1] as string).match(/\d+/g)?.map(Number) ?? [];
    const start = Math.max(text.lastIndexOf(". ", m.index ?? 0), text.lastIndexOf("\n", m.index ?? 0));
    const end = text.indexOf(".", m.index ?? 0);
    out.push({ at: m.index ?? 0, numbers, sentence: text.slice(start + 1, end === -1 ? undefined : end + 1) });
  }
  return out;
}

type Reference = { n: number; url: string; accessed: string | null };

const references: Reference[] = [...referencesBlock.matchAll(/<Reference n=\{(\d+)\} url="([^"]+)"(?: accessed="([^"]+)")?>/g)].map(
  (m) => ({ n: Number(m[1]), url: m[2] as string, accessed: m[3] ?? null }),
);

describe("Post 1 content rules", () => {
  it("has the new article order: the headings written in Markdown, in order", () => {
    const headings = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(headings).toEqual(HEADINGS);
  });

  it.each(REQUIRED_SENTENCES)("contains the required sentence: %s", (sentence) => {
    expect(body).toContain(sentence);
  });

  it("no longer claims that common words are often a single token (D-17)", () => {
    expect(body).not.toContain("Common words are often a single token");
    expect(body).not.toContain("common words often stay whole");
  });

  it("keeps the section order, with every wrapper where the plan puts it (plan 02-10)", () => {
    const markers = [
      "## How does a computer store text?",
      "## What is a language model, and why numbers?",
      "## Why not feed in raw bytes?",
      "## Tokens are not words",
      "## How the numbers are assigned",
      "## Why not just split on spaces, or on meaning?",
      "<StepperSection>",
      "## What the step by step example showed",
      "## The tokenizer behind the demos",
      "<ToyTokens",
      "<PlaygroundSection>",
      "## What you just saw",
      "<ComparisonSection>",
      "<LanguagesSection>",
      "## References",
    ];
    let previous = -1;
    for (const marker of markers) {
      const at = body.indexOf(marker);
      expect(at, marker).toBeGreaterThan(previous);
      previous = at;
    }
    for (const tag of ["PlaygroundSection", "StepperSection", "ComparisonSection", "LanguagesSection"]) {
      expect(body.match(new RegExp(`<${tag}>`, "g"))?.length, tag).toBe(1);
    }
  });

  it("carries each section lead-in word for word", () => {
    expect(body).toContain(`<StepperSection>${STEPPER_SLOT_SENTENCE}</StepperSection>`);
    expect(body).toContain(`<ComparisonSection>${COMPARISON_SLOT_SENTENCE}</ComparisonSection>`);
    expect(body).toContain(`<LanguagesSection>${LANGUAGES_SLOT_SENTENCE}</LanguagesSection>`);
  });

  it("introduces the demo tokenizer after the stepper, then the first token chips, then the playground", () => {
    const closing = body.indexOf("</StepperSection>");
    const tinier = body.indexOf("The examples below use the same tokenizer algorithm");
    const firstChips = body.indexOf("<ToyTokens");
    const playground = body.indexOf("<PlaygroundSection>");
    expect(tinier).toBeGreaterThan(closing);
    expect(firstChips).toBeGreaterThan(tinier);
    expect(playground).toBeGreaterThan(firstChips);
  });

  it("merges the tokenizer description and the real-tokenizer differences into one section (second editorial pass)", () => {
    expect(body).not.toContain("## How this tokenizer works");
    expect(body).not.toContain("## How real tokenizers differ");
    const start = body.indexOf("## The tokenizer behind the demos");
    const end = body.indexOf("<PlaygroundSection>");
    const section = body.slice(start, end);
    expect(section).toContain("real tokenizers differ in three ways");
    expect(section).toContain("The tokenizer of GPT-2 has");
  });

  it("names byte-pair encoding as the method in the stepper's lead-in, and keeps the attribution apart from the quote", () => {
    expect(body).not.toContain("One common method");
    expect(article).not.toMatch(/^>.*Leo Tolstoy/m);
    expect(article).toMatch(/^Here is the opening sentence of \*Anna Karenina\*, by Leo Tolstoy/m);
  });

  it("defines token before any other use outside headings, then the tokenizer, then the correction", () => {
    const vocabulary = body.indexOf("This list is called a vocabulary");
    const definition = body.indexOf("A token is a small piece of text that a language model reads and writes.");
    const tokenizer = body.indexOf("A program called a tokenizer");
    const correction = body.indexOf("Tokens are not the same thing as words.");
    expect(vocabulary).toBeGreaterThan(-1);
    expect(definition).toBeGreaterThan(vocabulary);
    expect(tokenizer).toBeGreaterThan(definition);
    expect(correction).toBeGreaterThan(tokenizer);
    const visible = body.replace(/^## .*$/gm, "");
    expect(visible.search(/token/i)).toBeGreaterThanOrEqual(visible.indexOf("each piece in it is called a **token**") - 1);
  });

  it("introduces ids at the tokenizer sentence, where the first use is the definition (D-08 relaxed: ids name a token's number)", () => {
    const definition = body.indexOf("turns them into numbers, called ids");
    const firstId = body.search(/\bids?\b/i);
    expect(definition).toBeGreaterThan(-1);
    // The first use of "id" sits inside the definition sentence.
    expect(firstId).toBeGreaterThan(definition);
    expect(body.indexOf("A token is a small piece of text")).toBeLessThan(definition);
    expect(body).toContain("Each token has an id,");
  });

  it("first uses byte in the first section, in the sentence about English letters (the final text assumes the reader knows bits)", () => {
    const first = body.search(/\bbytes?\b/i);
    expect(first).toBeGreaterThan(-1);
    expect(body.slice(first - 40)).toMatch(/^.*Most English letters take up one byte, many other characters take several\./s);
    expect(first).toBeLessThan(body.indexOf("## What is a language model"));
  });

  it("defines character encoding before UTF-8 and ASCII are named", () => {
    const encoding = body.indexOf("Such a table is called a character encoding.");
    expect(encoding).toBeGreaterThan(-1);
    expect(body.indexOf("UTF-8")).toBeGreaterThan(encoding);
    expect(body.indexOf("ASCII")).toBeGreaterThan(encoding);
    expect(body).toContain("UTF-8 was devised in 1992");
    expect(body.toLowerCase()).not.toContain("utf8");
  });

  it("defines each new technical term in a plain sentence at its first use", () => {
    // [first use of the term, the plain definition]. Headings are blanked: a heading may name a
    // term the first paragraph under it then defines.
    const definitions: Array<[RegExp, string]> = [
      [/character encoding/, "Such a table is called a character encoding."],
      [/\bNLP\b/, "Natural language processing, or NLP, is the field of computer science whose goal is to get computers"],
      [/\bvocabular/i, "This list is called a vocabulary"],
      [/\btokenizers?\b/i, "A program called a tokenizer"],
      [/out-of-vocabulary/, "is called out-of-vocabulary"],
      [/\bBPE\b/, "Byte-pair encoding, or BPE,"],
      [/\bmorphem/i, "morphemes, the smallest parts of a word that carry meaning"],
      [/\bids?\b/i, "turns them into numbers, called ids"],
    ];
    const visible = body.replace(/^## .*$/gm, (h) => " ".repeat(h.length));
    for (const [term, definition] of definitions) {
      const at = visible.indexOf(definition);
      expect(at, `${term}: ${definition}`).toBeGreaterThan(-1);
      const first = visible.search(term);
      expect(first, `${term} is used before it is defined`).toBeGreaterThanOrEqual(at - 40);
    }
  });

  it("keeps the bytes quoted in the post equal to the real encoding of the named character (T-01-22)", () => {
    const match = /the character \[(\S)\]\([^)]*\) is stored as the bytes `((?:[0-9A-F]{2})(?: [0-9A-F]{2})*)`/u.exec(body);
    expect(match).not.toBeNull();
    const [, character, quoted] = match as unknown as [string, string, string];
    const real = [...new TextEncoder().encode(character)]
      .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
      .join(" ");
    expect(quoted).toBe(real);
  });

  it("puts the frame sentences inside 'What you just saw'", () => {
    const heading = body.indexOf("## What you just saw");
    const next = body.indexOf("## References");
    const frames = body.indexOf("Hatched chips inside one frame are the bytes of a single character");
    const example = body.indexOf("For example, the character [男]");
    expect(heading).toBeGreaterThan(-1);
    expect(frames).toBeGreaterThan(heading);
    expect(example).toBeGreaterThan(frames);
    expect(example).toBeLessThan(next);
  });

  it.each(ANALOGY_WORDS)("does not use the analogy word %s (D-10)", (word) => {
    expect(body.toLowerCase()).not.toContain(word);
  });

  it.each(PROMISE_PHRASES)("does not promise other content with %s (D-12, D-14)", (phrase) => {
    expect(body.toLowerCase()).not.toContain(phrase);
  });

  it("the NLP section makes no forward pointer", () => {
    const start = body.indexOf("## What is a language model, and why numbers?");
    const end = body.indexOf("## Why not feed in raw bytes?");
    const section = body.slice(start, end).toLowerCase();
    for (const phrase of ["later", "below", "in the next", "we will", "you will see", "as we shall"]) {
      expect(section, phrase).not.toContain(phrase);
    }
  });

  it("has no code marks except the two inline ones, one Markdown link (the 男 dictionary entry) and no anchor tags", () => {
    expect(body.match(/`/g)?.length).toBe(4);
    expect(body).toContain("`a + t`");
    expect(body).toContain("`E7 94 B7`");
    expect(body.match(/\]\(/g)?.length).toBe(1);
    expect(body).toContain("[男](https://en.wiktionary.org/wiki/%E7%94%B7)");
    expect(body).not.toMatch(/<a[\s>]/i);
    expect(body).not.toMatch(/<(script|iframe|img|link)\b/i);
    expect(body).not.toMatch(/\bon\w+=/);
    expect(body).not.toContain("dangerouslySetInnerHTML");
  });

  it("states no token or word count by hand", () => {
    expect(body).not.toMatch(/\d+\s+(tokens?|words?)\b/i);
    expect(body).not.toMatch(new RegExp(`\\b(${NUMBER_WORDS})\\s+(tokens?|words?)\\b`, "i"));
  });

  it("writes no token split by hand (no pipe-separated pieces)", () => {
    expect(body).not.toMatch(/\S+ \| \S+/);
  });

  it("gives every ToyTokens an expect attribute", () => {
    const uses = body.match(/<ToyTokens[\s\S]*?\/>/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(2);
    expect(body.match(/<ToyTokens/g)?.length).toBe(uses.length);
    for (const use of uses) expect(use).toMatch(/\bexpect=/);
  });

  it("uses a closed component vocabulary: no import lines, only the registered components", () => {
    expect(raw.split("\n").some((line) => line.startsWith("import "))).toBe(false);
    const allowed = new Set([
      "PlaygroundSection",
      "StepperSection",
      "ComparisonSection",
      "LanguagesSection",
      "ToyTokens",
      "Fact",
      "Cite",
      "References",
      "Reference",
      "TextAsNumbers",
    ]);
    const used = new Set([...body.matchAll(/<([A-Z]\w*)\b/g)].map((m) => m[1] as string));
    for (const name of used) expect(allowed.has(name), name).toBe(true);
  });

  it("is between 350 and 2750 words including frontmatter and References", () => {
    // Phase 1 capped the post at 800, plan 02-09 at 950 (870 measured). The editorial rewrite of
    // plan 02-10 adds six narrative sections, the new stepper text and a References list; the
    // re-check of the cited claims then restored five sentences and two references. Measured at
    // 2671 words, so the ceiling is 2750 (measured plus 50, rounded up to a multiple of 50).
    const words = raw.split(/\s+/).filter((w) => w.length > 0).length;
    expect(words).toBeGreaterThanOrEqual(350);
    expect(words).toBeLessThanOrEqual(2750);
  });

  it("speaks to the reader: the word you appears at least 3 times (the final text uses it 4 times)", () => {
    expect(body.match(/\byou\b/gi)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("references the glossary entry token from the frontmatter", () => {
    expect(frontmatter).toMatch(/^terms:\s*\[\s*token\s*\]\s*$/m);
  });
});

describe("Post 1 citations (plan 02-10, T-02-28, T-02-29)", () => {
  const cites = citesIn(article);
  const citedNumbers = cites.flatMap((c) => c.numbers);

  it("has a References section last, with one numbered entry per source", () => {
    expect(referencesAt).toBeGreaterThan(-1);
    expect(body.trimEnd().endsWith("</References>")).toBe(true);
    expect(references.length).toBeGreaterThan(0);
    expect(references.map((r) => r.n)).toEqual(references.map((_, i) => i + 1));
    expect(body.match(/<Reference /g)?.length).toBe(references.length);
  });

  it("every cite has a reference, and every reference is cited", () => {
    expect(cites.length).toBeGreaterThan(0);
    const cited = new Set(citedNumbers);
    for (const n of cited) expect(references.some((r) => r.n === n), `cite [${n}] has no reference`).toBe(true);
    for (const r of references) expect(cited.has(r.n), `reference [${r.n}] is never cited`).toBe(true);
  });

  it("numbers references in the order they are first cited", () => {
    const firstSeen: number[] = [];
    for (const n of citedNumbers) if (!firstSeen.includes(n)) firstSeen.push(n);
    expect(firstSeen).toEqual(firstSeen.map((_, i) => i + 1));
  });

  it("allows links only as cites and reference entries, and only to https sources", () => {
    // The one Markdown link is the 男 dictionary entry; every other source is a <Cite>.
    expect(article.replace("(https://en.wiktionary.org/wiki/%E7%94%B7)", "")).not.toMatch(/https?:\/\//i);
    expect(article.replace("](https://en.wiktionary.org/wiki/%E7%94%B7)", "]")).not.toMatch(/\]\(/);
    for (const r of references) {
      const url = new URL(r.url);
      expect(url.protocol, r.url).toBe("https:");
    }
    expect(new Set(references.map((r) => r.url)).size).toBe(references.length);
  });

  it("gives every web source an access date", () => {
    const webHosts = ["web.stanford.edu", "github.com", "www.gutenberg.org", "cdn.openai.com"];
    for (const r of references) {
      if (webHosts.includes(new URL(r.url).host)) expect(r.accessed, r.url).toBe("Oct. 6, 2026");
    }
  });

  it("reads every number in the prose from the engine, from a citation, or as 0 or 1", () => {
    // Facts: every <Fact of="..."/> names a real figure of the stepper's engine.
    for (const m of article.matchAll(/<Fact of="([^"]+)" \/>/g)) {
      expect(Object.hasOwn(STEPPER_FACTS, m[1] as string), `unknown fact ${m[1]}`).toBe(true);
    }
    // Cited figures: the number must sit in a sentence that cites a source holding it.
    const CITED: Record<string, string[]> = {
      // UTF-8 was devised in 1992 (RFC 3629, section 1).
      "1992": ["rfc3629"],
      "1963": ["ethw.org"],
      "128": ["ethw.org"],
      "1987": ["unicode.org/history"],
      // W3Techs share of websites using UTF-8, written "99.1%" (matched as 99 and 1).
      "99": ["w3techs.com"],
      "50,257": ["language_models_are_unsupervised", "openai/tiktoken"],
      "100,257": ["openai/tiktoken"],
      // GPT-4o's vocabulary: the highest special-token id in the cited file plus one (plan 02-10 re-check).
      "200,019": ["openai/tiktoken"],
    };
    const urlOf = (n: number) => references.find((r) => r.n === n)?.url ?? "";
    // The 男 example is checked against the real encoding by a test above, and the names below
    // contain digits that are not claims.
    const plain = article
      .replace(/the bytes `?(?:[0-9A-F]{2} ?)+`?/g, "the bytes")
      .replace(/\]\([^)]*\)/g, "]")
      .replace(/\b(GPT-2|GPT-4o|GPT-4|UTF-8|cl100k|o200k)\b/g, "$1_");
    const sentences = plain.split(/(?<=[.!?])\s+|\n+/);
    const found: string[] = [];
    for (const sentence of sentences) {
      const cited = citesIn(sentence).flatMap((c) => c.numbers);
      const text = sentence
        .replace(/<[A-Z]\w*\b[^>]*\/>/g, "")
        .replace(/<\/?[A-Z]\w*>/g, "")
        .replace(/\b(GPT-2|GPT-4o|GPT-4|UTF-8|cl100k|o200k)_/g, "");
      for (const number of text.match(/\d+(?:,\d{3})*/g) ?? []) {
        found.push(number);
        if (number === "0" || number === "1") continue;
        const sources = CITED[number];
        expect(sources, `number "${number}" in: ${sentence.trim()}`).toBeDefined();
        const ok = cited.some((n) => (sources as string[]).some((fragment) => urlOf(n).includes(fragment)));
        expect(ok, `number "${number}" needs a citation to one of ${sources?.join(", ")} in: ${sentence.trim()}`).toBe(true);
      }
    }
    // The three cited figures really are in the post, so the rule above is exercised.
    for (const number of Object.keys(CITED)) expect(found, number).toContain(number);
  });

  it("quotes the sample sentence exactly as the stepper uses it", () => {
    expect(article).toContain(`"${SAMPLE_SENTENCE}"`);
  });
});

describe("Post 1 literary example and the retired toy (plan 02-10)", () => {
  it("shows the Garnett line, credits the translator and matches the playground example", () => {
    expect(article).toContain(`> ${GARNETT}`);
    expect(article).toContain(`<TextAsNumbers text="${GARNETT}" />`);
    expect(article.replace(/\*/g, "")).toContain("translation by Constance Garnett)<Cite n={6} />");
    expect(EXAMPLES.find((e) => e.id === "literature")?.text).toBe(GARNETT);
  });

  it("no longer mentions the Austen line or the Sennrich corpus words", () => {
    expect(body).not.toContain("universally acknowledged");
    expect(body).not.toMatch(/\bAusten\b/);
    for (const word of ["low", "lower", "newest", "widest"]) {
      expect(body, word).not.toMatch(new RegExp(`\\b${word}\\b`, "i"));
    }
  });

  it("has dropped the end-of-word mark", () => {
    expect(body).not.toContain("§");
    expect(body).not.toContain("The § in the stepper");
  });

  it("states the tie rule the way comparePairs does, and never as first seen or alphabetical", () => {
    expect(body).toContain("the pair with the smaller numeric values win");
    const lower = body.toLowerCase();
    for (const phrase of ["alphabetically", "vocabulary order", "first seen", "seen first"]) {
      expect(lower, phrase).not.toContain(phrase);
    }
  });

  it("covers the stop: a chosen number of merges, vocabulary 256 plus merges, and unseen words", () => {
    expect(body).toContain("We chose in advance to stop after <Fact of=\"merges\" /> merges.");
    expect(body).toContain('<Fact of="byteValues" /> + <Fact of="merges" /> = <Fact of="vocabularySize" />');
    expect(body).toContain("shrank from <Fact of=\"startPieces\" /> tokens to <Fact of=\"endPieces\" />");
    expect(body).toContain("no word is out-of-vocabulary");
    expect(STEPPER_FACTS.vocabularySize).toBe(STEPPER_FACTS.byteValues + STEPPER_FACTS.merges);
  });
});

describe("glossary entries", () => {
  const entries: Array<[string, string, string, number]> = [
    ["token", tokenYaml, "Token", 1],
    ["embedding", embeddingYaml, "Embedding", 2],
    ["context", contextYaml, "Context", 3],
    ["reasoning", reasoningYaml, "Reasoning", 4],
  ];
  it.each(entries)("%s has a term, a definition and its order", (_id, yaml, term, order) => {
    expect(yaml).toMatch(new RegExp(`^term: ${term}$`, "m"));
    expect(yaml).toMatch(/^definition: .+$/m);
    expect(yaml).toMatch(new RegExp(`^order: ${order}$`, "m"));
  });
});

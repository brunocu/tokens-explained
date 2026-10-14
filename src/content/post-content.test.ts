// Executable content rules for Post 1 (TOK-10, D-08, D-10, D-12, D-14, Pitfall 4; rewritten for
// the editorial rewrite of plan 02-10). The post is read as raw text; none of these rules needs
// the build.
//
// Plan 02-10 relaxed exactly these Phase 1 rules, each marked "02-10" below, and kept the rest:
//   - "UTF-8" and "code point" may be named (defined in plain words at first use);
//   - links are allowed only as [@key] citations and the generated bibliography (quick task
//     261014-ch0 replaced the <Cite> and <Reference> components with rehype-citation and
//     src/data/references.bib);
//   - numbers in prose are allowed only when derived from the engine (<Fact>), or cited, or 0 and 1;
//   - the word ceiling is raised; the section order is the new article order; the tie rule wording
//     is "the pair with the smaller numbers wins" (it matches comparePairs in src/core/bpe.ts).
import { describe, expect, it } from "vitest";
import raw from "./posts/what-is-a-token.mdx?raw";
import bibRaw from "../data/references.bib?raw";
import tokenYaml from "./glossary/token.yaml?raw";
import embeddingYaml from "./glossary/embedding.yaml?raw";
import contextYaml from "./glossary/context.yaml?raw";
import reasoningYaml from "./glossary/reasoning.yaml?raw";
import { EXAMPLES } from "../core/examples.ts";
import { SAMPLE_SENTENCE, STEPPER_FACTS } from "../core/stepper.ts";
import { GPT2_FACT_KEYS } from "../core/gpt2Facts.ts";

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;
const frontmatter = FRONTMATTER.exec(raw)?.[1] ?? "";
const body = raw.replace(FRONTMATTER, "");

const REFERENCES_HEADING = "## References";
const referencesAt = body.indexOf(REFERENCES_HEADING);
/** The article without its References heading and the bibliography placeholder after it. */
const article = referencesAt === -1 ? body : body.slice(0, referencesAt);

const GARNETT = "Happy families are all alike; every unhappy family is unhappy in its own way.";

const REQUIRED_SENTENCES = [
  // the definition of a token (UI-SPEC definition), now at the end of the raw-bytes section
  "A token is a small piece of text that a language model reads and writes. It can be a whole word, part of a word, a single character, a space plus a word, a piece of punctuation, etc.",
  "A language model is the kind of AI program behind chat assistants.",
  // the correction (TOK-10)
  "Tokens are not the same thing as words.",
  "The same sentence can contain more tokens than words.",
  // The author cut the two sentences "Many everyday words are a single token..." and "A space can be
  // part of a token." from the correction in the final edits of plan 02.1-09; the bullets after the
  // playground say the same things.
  "Spaces can belong to tokens. A word with a space in front of it is often a single token.",
  "Rare words split into several tokens, while many everyday words stay whole.",
  // playground instruction
  "Type or paste anything, or pick an example, and watch it split into tokens.",
  // the second lead-in sentence says what the second line of every chip is (D-08); plan 07's read-through settles the final wording (D-10)
  "Under each piece of text is its ID, the number the model works with.",
  // the byte sentence of the first section (the final text no longer defines bit or byte separately)
  "Most English letters take up one byte, other characters may take several.",
  // ids are labels (D-08)
  "these ids are only labels in a list. A bigger number does not mean a rarer or more important word, and a different tokenizer can give the same token a different id.",
  // the emoji bullet and the byte example (R-01, TOK-10). The frame sentence of the earlier text was
  // cut by the author in the Task 3 notes pass; the figure's own split note explains hatched chips.
  "An emoji takes several bytes, and the tokenizer can cut between them.",
  "is stored as the bytes `E7 94 B7`, and the tokenizer may cut between them.",
  // honest framing (TOK-10), in "A real tokenizer: GPT-2" (D-14)
  "Many popular models use byte-pair encoding, though not all do.",
  // the real tokenizer follows the stepper (D-06, D-07, D-14)
  "The examples below use the real tokenizer of GPT-2, a language model that OpenAI published in 2019",
  // softened claim and bullet (D-17)
  "while many everyday words stay whole.",
  // the differences (D-07, D-16). The "work on bytes" difference is gone: the stepper works on bytes now.
  "Compared with the step by step example, real tokenizers differ in three ways.",
  "They split text with a larger set of rules before merging, so tokens do not run across spaces and punctuation. And their vocabularies hold tens of thousands of tokens or more.",
  // the id difference (D-13), the bridge from the stepper to GPT-2 (D-12) and the choice of an older tokenizer (D-14)
  "GPT-2's list of tokens is far longer, so it already has a token for every word of this sentence.",
  "GPT-2 is an older tokenizer. I chose it because its tokenizer file is only about",
  "Newer models cut text differently.",
  // the tie rule (plan 02-10): the same wording as the stepper's sentences and comparePairs
  "Our rule is: the pair with the smaller numeric values win.",
  // checked against learn_bpe.py lines 335 and 341 (commit 03caef2) on 2026-10-13 (plan 03-03 re-check; plan 02-10 had printed lines 373-378)
  "The code published by the author of the BPE-for-translation method settles ties differently: among the tied pairs it takes the one that sorts last as text",
];

const STEPPER_SLOT_SENTENCE =
  "Byte-pair encoding builds a tokenizer's list of tokens by reading lots of text and joining the pair of neighbouring tokens it sees most often, again and again. Step through a tiny example that learns from a single sentence and stops after ten merges.";

// Task 3 notes pass: the comparison is framed as GPT-2 set against other models (BERT now), not as
// "real tokenizers" against each other, and the languages lead-in names the new Bytes column.
const COMPARISON_SLOT_SENTENCE =
  "GPT-2 is one way to cut text into tokens. Here it sits next to BERT, a model of about the same age that uses a different method. Pick a text, or type your own, and you can see where each one cuts. BERT uses a method called WordPiece. Unlike GPT-2, it does not work on bytes: its vocabulary holds only the characters and word pieces it was built with [@hfWordpiece]. A word it cannot build from that vocabulary is replaced by one special token, `[UNK]`, short for \"unknown\", which stands in for the whole sequence and hides what it said [@hfWordpiece]. A token like this is \"special\" because it is not a piece of text but a signal to the model. If you are curious about BERT, its documentation is a good place to start [@hfBert].";

// Plan 02.2-06: the lead-in names no direction ("on the right", "below"), because the picker and the
// results sit below the table band in the merged widget.
const LANGUAGES_SLOT_SENTENCE =
  "The same sentence, in six languages: its size in bytes, and its token count with the same two tokenizers. Look at how the numbers differ. Pick a language to see where each tokenizer cuts it.";

/** The playground island as written in the MDX: imported at the top, placed with a load directive and its shared props (D-06, D-07). */
const PLAYGROUND_TAG = "<Playground client:load {...playgroundProps} />";

/** The stepper island as written in the MDX: imported at the top, placed with a visibility directive, under its own heading (D-06). */
const STEPPER_TAG = "<BpeStepper client:visible />";

/** The comparison island as written in the MDX: imported at the top, placed with a visibility directive and its shared props, under its own heading (D-06, D-07). */
const COMPARISON_TAG = "<Comparison client:visible {...comparisonProps} />";

/** The languages island as written in the MDX: imported at the top, placed with a visibility directive, under its own heading (D-06, D-13). */
const LANGUAGES_TAG = "<LanguagesWidget client:visible />";

const ANALOGY_WORDS =["syllable", "building-block", "building block", "puzzle", "jigsaw", "brick", "lego"];
const PROMISE_PHRASES = ["coming soon", "next up", "stay tuned", "part 2", "later post", "upcoming", "future post"];
const NUMBER_WORDS = "two|three|four|five|six|seven|eight|nine|ten|eleven|twelve";

/** The h2 headings written in the Markdown (every widget has its own heading since phase 2.2). */
const HEADINGS = [
  "How does a computer store text?",
  "What is a language model, and why numbers?",
  "Why not feed in raw bytes?",
  "Why not whole words?",
  "Why not cut words into meaningful parts?",
  "A practical compromise: tokens",
  "Tokens are not words",
  "How the numbers are assigned",
  "Build a vocabulary",
  "What the step by step example showed",
  "A real tokenizer: GPT-2",
  "Try it yourself",
  "How does GPT-2 compare with other models?",
  "The same sentence in multiple languages",
  "References",
];

/** A group of citations as written in the prose: [@a] or [@a; @b]. Keys are alphanumeric. */
const CITE_GROUP = /\[(@[A-Za-z0-9]+(?:; @[A-Za-z0-9]+)*)\]/g;

type Cite = { at: number; keys: string[]; sentence: string };

/** Every [@key] group in the text, with the sentence it ends. */
function citesIn(text: string): Cite[] {
  const out: Cite[] = [];
  for (const m of text.matchAll(CITE_GROUP)) {
    const keys = (m[1] as string).split("; ").map((k) => k.slice(1));
    const start = Math.max(text.lastIndexOf(". ", m.index ?? 0), text.lastIndexOf("\n", m.index ?? 0));
    const end = text.indexOf(".", m.index ?? 0);
    out.push({ at: m.index ?? 0, keys, sentence: text.slice(start + 1, end === -1 ? undefined : end + 1) });
  }
  return out;
}

type Reference = { key: string; url: string | null; urldate: string | null };

/** The BibTeX entries of src/data/references.bib: key, url and urldate (the file is parsed as text). */
const references: Reference[] = bibRaw
  .split(/^@/m)
  .slice(1)
  .map((entry) => ({
    key: /^\w+\{([A-Za-z0-9]+),/.exec(entry)?.[1] ?? "",
    url: /^\s*url\s*=\s*\{([^}]+)\}/m.exec(entry)?.[1] ?? null,
    urldate: /^\s*urldate\s*=\s*\{([^}]+)\}/m.exec(entry)?.[1] ?? null,
  }));

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

  it("keeps the section order, with every widget where the plan puts it (plan 02-10)", () => {
    const markers = [
      "## How does a computer store text?",
      "## What is a language model, and why numbers?",
      "## Why not feed in raw bytes?",
      "## Why not whole words?",
      "## Why not cut words into meaningful parts?",
      "## A practical compromise: tokens",
      "## Tokens are not words",
      "## How the numbers are assigned",
      "## Build a vocabulary",
      STEPPER_TAG,
      "## What the step by step example showed",
      "## A real tokenizer: GPT-2",
      "<TokenFigure sample",
      "## Try it yourself",
      PLAYGROUND_TAG,
      "## How does GPT-2 compare with other models?",
      COMPARISON_TAG,
      "## The same sentence in multiple languages",
      LANGUAGES_TAG,
      "## References",
    ];
    let previous = -1;
    for (const marker of markers) {
      // Search from just after the previous marker, so each marker finds the one that follows the previous.
      const at = body.indexOf(marker, previous + 1);
      expect(at, marker).toBeGreaterThan(previous);
      previous = at;
    }
    expect(body.split(PLAYGROUND_TAG).length - 1, "the playground island").toBe(1);
    expect(body.split(STEPPER_TAG).length - 1, "the stepper island").toBe(1);
    expect(body.split(COMPARISON_TAG).length - 1, "the comparison island").toBe(1);
    expect(body.split(LANGUAGES_TAG).length - 1, "the languages island").toBe(1);
  });

  it("carries each section lead-in word for word", () => {
    expect(body).toContain(`${STEPPER_SLOT_SENTENCE}\n\n${STEPPER_TAG}`);
    expect(body).toContain(`${COMPARISON_SLOT_SENTENCE}\n\n${COMPARISON_TAG}`);
    expect(body).toContain(`${LANGUAGES_SLOT_SENTENCE}\n\n${LANGUAGES_TAG}`);
  });

  it("introduces GPT-2 after the stepper, then the first token chips, then the playground", () => {
    const closing = body.indexOf(STEPPER_TAG);
    const real = body.indexOf("The examples below use the real tokenizer of GPT-2");
    const firstChips = body.indexOf("<TokenFigure", real);
    const playground = body.indexOf(PLAYGROUND_TAG);
    expect(real).toBeGreaterThan(closing);
    expect(firstChips).toBeGreaterThan(real);
    expect(playground).toBeGreaterThan(firstChips);
  });

  it("merges the tokenizer description and the real-tokenizer differences into one section (second editorial pass)", () => {
    expect(body).not.toContain("## How this tokenizer works");
    expect(body).not.toContain("## How real tokenizers differ");
    expect(body).not.toContain("## The tokenizer behind the demos");
    const start = body.indexOf("## A real tokenizer: GPT-2");
    const end = body.indexOf(PLAYGROUND_TAG);
    const section = body.slice(start, end);
    expect(section).toContain("real tokenizers differ in three ways");
    expect(section).toContain("The tokenizer of GPT-2 has");
  });

  it("has exactly one token figure (the emoji figure was cut), and the GPT-2 bridge figure sits inside the real-tokenizer section, after its explanation and before the playground (D-12)", () => {
    expect(body.match(/<TokenFigure/g)?.length).toBe(1);
    expect(body.match(/<TokenFigure sample/g)?.length).toBe(1);
    const unseen = body.indexOf("An unfamiliar word is simply cut into more, smaller tokens.");
    const heading = body.indexOf("## A real tokenizer: GPT-2");
    const why = body.indexOf("GPT-2 is an older tokenizer.");
    const lead = body.indexOf("Here is the same sentence as the step by step example, but tokenized by GPT-2.");
    const bridge = body.indexOf("<TokenFigure sample");
    const playground = body.indexOf(PLAYGROUND_TAG);
    expect(unseen).toBeGreaterThan(-1);
    expect(heading).toBeGreaterThan(unseen);
    expect(why).toBeGreaterThan(heading);
    expect(lead).toBeGreaterThan(why);
    expect(bridge).toBeGreaterThan(lead);
    expect(playground).toBeGreaterThan(bridge);
    // The bridge claims every word is one token; it types no count.
    const use = /<TokenFigure sample[\s\S]*?\/>/.exec(body)?.[0] ?? "";
    expect(use).toContain('expect={["every-word-one-token"]}');
    // The paragraph under the figure carries the stepper-versus-GPT-2 point, with both numbers from the engine.
    const after = body.slice(bridge, playground);
    expect(after).toContain('<Fact of="merges" />');
    expect(after).toContain('<Fact of="endPieces" />');
  });

  it("explains the id difference with both ids read from the engine (D-13)", () => {
    const start = body.indexOf("The demo below gives its starting symbols the ids of their byte values");
    expect(start).toBeGreaterThan(-1);
    const paragraph = body.slice(start, body.indexOf("\n", start));
    expect(paragraph).toContain('<Fact of="byteOfT" />');
    expect(paragraph).toContain('<Fact of="gpt2IdOfT" />');
    expect(start).toBeGreaterThan(body.indexOf("The vocabulary is a numbered list"));
    expect(start).toBeLessThan(body.indexOf(STEPPER_TAG));
  });

  it("explains why GPT-2 was chosen without comparing licences or openness with newer tokenizers (D-14, RESEARCH G8)", () => {
    const start = body.indexOf("GPT-2 is an older tokenizer.");
    const paragraph = body.slice(start, body.indexOf("\n", start));
    expect(paragraph).toContain('<Fact of="gpt2FileMb" />');
    expect(paragraph).toContain("permissive licence");
    expect(paragraph).not.toMatch(/\bMIT licen[cs]e\b/);
    const section = body.slice(body.indexOf("## A real tokenizer: GPT-2"), body.indexOf(PLAYGROUND_TAG)).toLowerCase();
    for (const phrase of ["closed", "not free", "proprietary", "secret", "not open"]) {
      expect(section, phrase).not.toContain(phrase);
    }
  });

  it("names byte-pair encoding as the method in the stepper's lead-in, and keeps the attribution apart from the quote", () => {
    expect(body).not.toContain("One common method");
    expect(article).not.toMatch(/^>.*Leo Tolstoy/m);
    expect(article).toMatch(/^Here is the opening line of \*Anna Karenina\*, by Leo Tolstoy/m);
  });

  it("defines token before any other use outside headings, then the tokenizer, then the correction", () => {
    const vocabulary = body.indexOf("called its **vocabulary**");
    const definition = body.indexOf("A token is a small piece of text that a language model reads and writes.");
    const tokenizer = body.indexOf("A program called a tokenizer");
    const correction = body.indexOf("Tokens are not the same thing as words.");
    expect(vocabulary).toBeGreaterThan(-1);
    expect(definition).toBeGreaterThan(vocabulary);
    expect(tokenizer).toBeGreaterThan(definition);
    expect(correction).toBeGreaterThan(tokenizer);
    const visible = body.replace(/^## .*$/gm, "");
    expect(visible.search(/token/i)).toBeGreaterThanOrEqual(visible.indexOf("Each piece in the vocabulary is called a **token**") - 1);
  });

  it("introduces ids at the tokenizer sentence, where the first use is the definition (D-08 relaxed: ids name a token's number)", () => {
    const definition = body.indexOf("turns them into numbers, called indices or ids");
    const firstId = body.search(/\bids?\b/i);
    expect(definition).toBeGreaterThan(-1);
    // The first use of "id" sits inside the definition sentence.
    expect(firstId).toBeGreaterThan(definition);
    expect(body.indexOf("A token is a small piece of text")).toBeLessThan(definition);
    expect(body).toContain("the id of a token is its position in the list");
  });

  it("first uses byte in the first section, in the sentence that says how many values one byte can hold, followed by the English-letters sentence (the final text assumes the reader knows bits)", () => {
    const first = body.search(/\bbytes?\b/i);
    expect(first).toBeGreaterThan(-1);
    expect(body.slice(first)).toMatch(
      /^byte can store <Fact of="byteValues" \/> different values: 0 to <Fact of="lastByteValue" \/>\. Most English letters take up one byte, other characters may take several\./,
    );
    expect(first).toBeLessThan(body.indexOf("## What is a language model"));
  });

  it("defines character encoding before UTF-8 and ASCII are named", () => {
    const encoding = body.indexOf("Such a table is called a character encoding.");
    expect(encoding).toBeGreaterThan(-1);
    expect(body.indexOf("UTF-8")).toBeGreaterThan(encoding);
    expect(body.indexOf("ASCII")).toBeGreaterThan(encoding);
    expect(body).toContain("Unicode decides the number, and UTF-8 defines how to store that number as bytes.");
    expect(body.toLowerCase()).not.toContain("utf8");
  });

  it("defines each new technical term in a plain sentence at its first use", () => {
    // [first use of the term, the plain definition]. Headings are blanked: a heading may name a
    // term the first paragraph under it then defines.
    const definitions: Array<[RegExp, string]> = [
      [/character encoding/, "Such a table is called a character encoding."],
      [/\bNLP\b/, "Natural language processing, or NLP, is the field of computer science whose goal is to get computers"],
      [/\bvocabular/i, "called its **vocabulary**"],
      [/\btokenizers?\b/i, "A program called a tokenizer"],
      [/out-of-vocabulary/, "is called out-of-vocabulary"],
      [/\bBPE\b/, "Byte-pair encoding, or BPE,"],
      [/\bmorphem/i, "morphemes, the smallest parts of a word that carry meaning"],
      [/\bids?\b/i, "turns them into numbers, called indices or ids"],
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

  it("puts the emoji bullet and the byte example in the list after the playground", () => {
    const lead = body.indexOf("Three things are worth remembering from this demo:");
    const next = body.indexOf("## How does GPT-2 compare with other models?");
    const emoji = body.indexOf("An emoji takes several bytes, and the tokenizer can cut between them.");
    const example = body.indexOf("For example, the character [男]");
    expect(lead).toBeGreaterThan(body.indexOf(PLAYGROUND_TAG));
    expect(emoji).toBeGreaterThan(lead);
    expect(example).toBeGreaterThan(emoji);
    expect(example).toBeLessThan(next);
  });


  it("states the stepper's merge budget in words only where it equals the engine's number", () => {
    // The stepper lead-in says "ten merges" in plain text (the lead-in is a slot, not a <Fact>).
    expect(STEPPER_SLOT_SENTENCE).toContain("ten merges");
    expect(STEPPER_FACTS.merges).toBe(10);
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

  it("has no code marks except the three inline ones, one Markdown link (the 男 dictionary entry) and no anchor tags", () => {
    expect(body.match(/`/g)?.length).toBe(6);
    expect(body).toContain("`a + t`");
    expect(body).toContain("`[UNK]`");
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

  it("gives every TokenFigure an expect attribute", () => {
    const uses = body.match(/<TokenFigure[\s\S]*?\/>/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(1);
    expect(body.match(/<TokenFigure/g)?.length).toBe(uses.length);
    for (const use of uses) expect(use).toMatch(/\bexpect=/);
  });

  it("uses a closed component vocabulary: imports only at the top from an allow-list, only the registered components", () => {
    // Phase 2.2 (D-06, RESEARCH G-1): Astro 7's MDX pipeline needs every hydrated island imported in
    // the MDX itself, and the import must come before the first use of the tag. So import lines are
    // allowed, but only in one block directly under the frontmatter, only from the component
    // folder, and the set of tags stays closed.
    const lines = body.split("\n");
    const importAt = lines.flatMap((line, i) => (line.startsWith("import ") ? [i] : []));
    const lastImport = importAt.at(-1) ?? -1;

    // (1) One leading block: nothing but blank lines and import lines before the last import.
    for (let i = 0; i < lastImport; i++) {
      const line = lines[i] as string;
      expect(line.trim() === "" || line.startsWith("import "), `line ${i + 1} sits above a later import: ${line}`).toBe(true);
    }

    // (2) Each import is a default or named import from a .svelte file under ../../components/,
    // or from exactly ../../components/postProps.ts (the shared props module, D-07).
    const importForm = /^import\s+(?:[A-Za-z_$][\w$]*|\{[^}]*\})\s+from\s+"([^"]+)";?\s*$/;
    const svelteFile = /^\.\.\/\.\.\/components\/[\w-]+(?:\/[\w-]+)*\.svelte$/;
    for (const i of importAt) {
      const line = lines[i] as string;
      const path = importForm.exec(line)?.[1];
      expect(path, `import line ${i + 1} is not a plain import from a path: ${line}`).toBeDefined();
      const ok = svelteFile.test(path as string) || path === "../../components/postProps.ts";
      expect(ok, `import path "${path}" is outside the component allow-list`).toBe(true);
    }

    // (3) The closed tag set: the static prose components and the four islands.
    const allowed = new Set([
      // static prose components (the PostLayout component map)
      "TokenFigure",
      "Fact",
      "TextAsNumbers",
      // the four islands, imported at the top of the MDX
      "Playground",
      "BpeStepper",
      "Comparison",
      "LanguagesWidget",
    ]);
    const used = new Set([...body.matchAll(/<([A-Z]\w*)\b/g)].map((m) => m[1] as string));
    for (const name of used) expect(allowed.has(name), name).toBe(true);

    // (4) The wrapper era is over (D-06): no tag ends in "Section", and no import comes from a
    // wrappers folder. The islands are placed straight in the MDX under headings written in Markdown.
    for (const name of used) expect(name.endsWith("Section"), `${name} looks like a section wrapper`).toBe(false);
    for (const i of importAt) {
      expect(/wrappers/i.test(lines[i] as string), `import line ${i + 1} comes from a wrappers folder`).toBe(false);
    }
  });

  it("is between 350 and 3350 words including frontmatter, excluding the bibliography", () => {
    // Since quick task 261014-ch0 the bibliography is generated from src/data/references.bib, so
    // the post file holds only the [@key] citations and the References heading.
    // Phase 1 capped the post at 800, plan 02-09 at 950 (870 measured). The editorial rewrite of
    // plan 02-10 adds six narrative sections, the new stepper text and a References list; the
    // re-check of the cited claims then restored five sentences and two references, measured at
    // 2566 words (an older comment here said 2671), under a ceiling of 2750. Plan 02.1-04 adds the
    // GPT-2 bridge figure and paragraph, the id-numbering paragraph, the "why GPT-2" paragraph, a
    // longer stepper lead-in and reference 20, which measures 2767 (ceiling 2850). The author's
    // edits in the Task 3 notes pass of plan 02.1-09 shortened several passages and the comparison
    // lead-ins were rewritten: 2704 words, so the ceiling is 2800 (measured plus 50, rounded up to
    // a multiple of 50). The author's feedback pass then split "Why not just split on spaces, or
    // on meaning?" into three sections with six new references, and added the BERT/[UNK]
    // explanation and two references, and the final wording pass (a clearer token definition and an
    // explicit note that "vocabulary" is a technical term), and the author's last edits (the emoji
    // figure and a few sentences cut): 3224 words, so the ceiling is 3300. Phase 2.2 puts import
    // lines under the frontmatter; they are excluded from the count because they are module
    // wiring, not prose. The end of phase 2.2 (plan 07) measures 3290 words with the headings now in
    // the Markdown, the rewritten widget lead-ins and the new tags: 3350 (measured plus 50, rounded
    // up to a multiple of 50).
    const prose = raw
      .split("\n")
      .filter((line) => !line.startsWith("import "))
      .join("\n");
    const words = prose.split(/\s+/).filter((w) => w.length > 0).length;
    expect(words).toBeGreaterThanOrEqual(350);
    expect(words).toBeLessThanOrEqual(3350);
  });

  it("speaks to the reader: the word you appears at least 2 times (the final text uses it 2 times)", () => {
    expect(body.match(/\byou\b/gi)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("references the glossary entry token from the frontmatter", () => {
    expect(frontmatter).toMatch(/^terms:\s*\[\s*token\s*\]\s*$/m);
  });
});

describe("Post 1 citations (plan 02-10, T-02-28, T-02-29)", () => {
  const cites = citesIn(article);
  const citedKeys = cites.flatMap((c) => c.keys);
  const bibKeys = references.map((r) => r.key);
  /** The number rehype-citation gives each key: its position in order of first citation. */
  const numberOf = new Map<string, number>();
  for (const key of citedKeys) if (!numberOf.has(key)) numberOf.set(key, numberOf.size + 1);

  it("has a References heading last, followed only by the bibliography placeholder", () => {
    expect(referencesAt).toBeGreaterThan(-1);
    expect(body.trimEnd().endsWith(`${REFERENCES_HEADING}\n\n[^ref]`)).toBe(true);
    expect(references.length).toBeGreaterThan(0);
    expect(bibKeys.every((k) => /^[A-Za-z0-9]+$/.test(k)), "keys are alphanumeric").toBe(true);
    expect(new Set(bibKeys).size, "keys are unique").toBe(bibKeys.length);
  });

  it("every cited key exists in the .bib file, and every .bib entry is cited", () => {
    expect(cites.length).toBeGreaterThan(0);
    for (const key of new Set(citedKeys)) expect(bibKeys, `[@${key}] has no entry in references.bib`).toContain(key);
    for (const key of bibKeys) expect(numberOf.has(key), `references.bib entry ${key} is never cited`).toBe(true);
  });

  it("numbers references by first citation 1..N, and writes every group in ascending number", () => {
    // rehype-citation sorts the visible numbers of a group but leaves the links in written order,
    // so a group written out of order would show the wrong number on each link.
    expect([...numberOf.values()]).toEqual([...numberOf.values()].map((_, i) => i + 1));
    expect(numberOf.size).toBe(bibKeys.length);
    for (const c of cites) {
      const numbers = c.keys.map((k) => numberOf.get(k) as number);
      expect(numbers, `group [@${c.keys.join("; @")}] is not in ascending number`).toEqual([...numbers].sort((a, b) => a - b));
      expect(new Set(c.keys).size, `group [@${c.keys.join("; @")}] repeats a key`).toBe(c.keys.length);
    }
  });

  it("allows links only as [@key] citations and the generated bibliography, and only to https sources", () => {
    // The one Markdown link is the 男 dictionary entry; every other source is a [@key] citation.
    expect(article.replace("(https://en.wiktionary.org/wiki/%E7%94%B7)", "")).not.toMatch(/https?:\/\//i);
    expect(article.replace("](https://en.wiktionary.org/wiki/%E7%94%B7)", "]")).not.toMatch(/\]\(/);
    // A bare @key would also be turned into a citation by rehype-citation, so no "@" may be left
    // once the citation groups are taken out.
    expect(article.replace(CITE_GROUP, "")).not.toContain("@");
    for (const r of references) {
      expect(r.url, `${r.key} has no url`).not.toBeNull();
      expect(new URL(r.url as string).protocol, r.url as string).toBe("https:");
    }
    expect(new Set(references.map((r) => r.url)).size).toBe(references.length);
  });

  it("gives every web source an access date", () => {
    // Plan 03-03 (D-19 as amended) re-opened every web source on Oct. 13, 2026 and refreshed all
    // access dates to that day. Dates live only in references.bib, never in the prose.
    const readOn = "2026-10-13";
    const webHosts = [
      "web.stanford.edu",
      "github.com",
      "www.gutenberg.org",
      "cdn.openai.com",
      "www.unicode.org",
      "huggingface.co",
      "w3techs.com",
      "en.wikipedia.org",
      "ethw.org",
    ];
    for (const r of references) {
      if (webHosts.includes(new URL(r.url as string).host)) expect(r.urldate, r.url as string).toBe(readOn);
    }
  });

  it("reads every number in the prose from the engine, from a citation, or as 0 or 1", () => {
    // Facts: every <Fact of="..."/> names a real figure of the stepper's engine or of GPT-2.
    for (const m of article.matchAll(/<Fact of="([^"]+)" \/>/g)) {
      const key = m[1] as string;
      expect(Object.hasOwn(STEPPER_FACTS, key) || (GPT2_FACT_KEYS as readonly string[]).includes(key), `unknown fact ${key}`).toBe(true);
    }
    // Cited figures: the number must sit in a sentence that cites a source holding it.
    const CITED: Record<string, string[]> = {
      "1963": ["ethw.org"],
      "128": ["ethw.org"],
      "1987": ["unicode.org/history"],
      // W3Techs share of websites with a known encoding that use UTF-8, written "over 99%".
      "99": ["w3techs.com"],
      // Aduriz et al. 2000: a single Basque noun generates at least 135 inflected forms.
      "135": ["aclanthology.org/C00-1001"],
      // The GPT-2 paper is dated 2019 (key radford2019).
      "2019": ["language_models_are_unsupervised"],
      "50,257": ["language_models_are_unsupervised", "openai/tiktoken"],
      // GPT-4 (cl100k_base): the highest special-token id in the cited file (100276) plus one; plan
      // 03-03 corrected the earlier 100,257, which is only the id of the end-of-text token.
      "100,277": ["openai/tiktoken"],
      // GPT-4o's vocabulary: the highest special-token id in the cited file plus one (plan 02-10 re-check).
      "200,019": ["openai/tiktoken"],
    };
    const urlOf = (key: string) => references.find((r) => r.key === key)?.url ?? "";
    // The 男 example is checked against the real encoding by a test above, and the names below
    // contain digits that are not claims.
    const plain = article
      .replace(/the bytes `?(?:[0-9A-F]{2} ?)+`?/g, "the bytes")
      .replace(/\]\([^)]*\)/g, "]")
      .replace(/\b(GPT-2|GPT-4o|GPT-4|UTF-8|cl100k|o200k)\b/g, "$1_");
    const sentences = plain.split(/(?<=[.!?])\s+|\n+/);
    const found: string[] = [];
    for (const sentence of sentences) {
      const cited = citesIn(sentence).flatMap((c) => c.keys);
      // The digits inside keys (aduriz2000, mott2020, ...) are not claims: take the groups out first.
      const text = sentence
        .replace(CITE_GROUP, "")
        .replace(/<[A-Z]\w*\b[^>]*\/>/g, "")
        .replace(/<\/?[A-Z]\w*>/g, "")
        .replace(/\b(GPT-2|GPT-4o|GPT-4|UTF-8|cl100k|o200k)_/g, "");
      for (const number of text.match(/\d+(?:,\d{3})*/g) ?? []) {
        found.push(number);
        if (number === "0" || number === "1") continue;
        const sources = CITED[number];
        expect(sources, `number "${number}" in: ${sentence.trim()}`).toBeDefined();
        const ok = cited.some((key) => (sources as string[]).some((fragment) => urlOf(key).includes(fragment)));
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

describe("Post 1 literary example and the retired sample text (plan 02-10)", () => {
  it("shows the Garnett line, credits the translator and matches the playground example", () => {
    expect(article).toContain(`> ${GARNETT}`);
    expect(article).toContain(`<TextAsNumbers text="${GARNETT}" />`);
    expect(article.replace(/\*/g, "")).toContain("translation by Constance Garnett [@karenina])");
    expect(EXAMPLES.find((e) => e.id === "literature")?.text).toBe(GARNETT);
  });

  it("no longer mentions the Austen line or the Sennrich corpus words", () => {
    expect(body).not.toContain("universally acknowledged");
    expect(body).not.toMatch(/\bAusten\b/);
    // The article only: reference titles may say "low-resource".
    for (const word of ["low", "lower", "newest", "widest"]) {
      expect(article, word).not.toMatch(new RegExp(`\\b${word}\\b`, "i"));
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

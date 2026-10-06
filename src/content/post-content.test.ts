// Executable content rules for Post 1 (TOK-10, D-08, D-10, D-12, D-14, Pitfall 4).
// The post is read as raw text; none of these rules needs the build.
import { describe, expect, it } from "vitest";
import raw from "./posts/what-is-a-token.mdx?raw";
import tokenYaml from "./glossary/token.yaml?raw";
import embeddingYaml from "./glossary/embedding.yaml?raw";
import contextYaml from "./glossary/context.yaml?raw";
import reasoningYaml from "./glossary/reasoning.yaml?raw";

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;
const frontmatter = FRONTMATTER.exec(raw)?.[1] ?? "";
const body = raw.replace(FRONTMATTER, "");

const REQUIRED_SENTENCES = [
  // section 1 (UI-SPEC definition)
  "A token is a small piece of text that a language model reads and writes. It can be a whole word, part of a word, a single character, a space plus a word, or a piece of punctuation.",
  "A language model is the kind of AI program behind chat assistants.",
  // section 2 (the correction, TOK-10)
  "Tokens are not the same thing as words.",
  "The same sentence can contain more tokens than words.",
  "Common words are often a single token, while rare words are split into several.",
  "A space can be part of a token.",
  // playground instruction
  "Type or paste anything, or pick an example, and watch it split into tokens.",
  // section 4 (byte definition and IDs, D-08)
  "A byte is a unit of computer storage; most English letters take one byte, many other characters take several.",
  "These numbers are only labels in a list. A bigger number does not mean a rarer or more important word, and a different tokenizer would number the same piece differently.",
  // section 4 (R-01: frames and the byte example, TOK-10)
  "Hatched chips inside one frame are the bytes of a single character, which is shown in front of them.",
  "For example, the character 男 is stored as the bytes E7 94 B7, and the tokenizer may cut between them.",
  // section 5 (honest framing, TOK-10)
  "This is a small toy tokenizer, trained on a small amount of English text. Real tokenizers follow the same steps, but their vocabularies are far bigger, so their splits will differ from the ones you see here.",
  "Many popular models use a method called byte-pair encoding, though not all do.",
  "It reads exactly what you typed and does not tidy up your text first.",
  "The counts above cover only the text you type; chat apps add extra formatting tokens of their own.",
];

const ANALOGY_WORDS = ["syllable", "building-block", "building block", "puzzle", "jigsaw", "brick", "lego"];
const PROMISE_PHRASES = ["coming soon", "next up", "stay tuned", "part 2", "later post", "upcoming", "future post"];
const NUMBER_WORDS = "two|three|four|five|six|seven|eight|nine|ten|eleven|twelve";

describe("Post 1 content rules", () => {
  it("has exactly the four prose headings in order, with the playground between the second and third", () => {
    const headings = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(headings).toEqual([
      "A token is a piece of text",
      "Tokens are not words",
      "What you just saw",
      "How this tokenizer works",
    ]);
    const second = body.indexOf("## Tokens are not words");
    const playground = body.indexOf("<PlaygroundSection>");
    const third = body.indexOf("## What you just saw");
    expect(second).toBeGreaterThan(-1);
    expect(playground).toBeGreaterThan(second);
    expect(third).toBeGreaterThan(playground);
    expect(body.match(/<PlaygroundSection>/g)?.length).toBe(1);
  });

  it.each(REQUIRED_SENTENCES)("contains the required sentence: %s", (sentence) => {
    expect(body).toContain(sentence);
  });

  it("introduces IDs only after the token-is-not-a-word correction (D-08)", () => {
    const correction = body.indexOf("Tokens are not the same thing as words.");
    const firstId = body.search(/\bids?\b/i);
    expect(correction).toBeGreaterThan(-1);
    expect(firstId).toBeGreaterThan(correction);
  });

  it("defines byte in the sentence that first uses the word", () => {
    const first = body.search(/\bbytes?\b/i);
    expect(first).toBeGreaterThan(-1);
    // The first use is the "byte" in "A byte is a unit of computer storage; ...".
    expect(body.slice(first - 2)).toMatch(/^A byte is a unit of computer storage; most English letters take one byte, many other characters take several\./);
  });

  it("keeps the bytes quoted in the post equal to the real encoding of the named character (T-01-22)", () => {
    const match = /the character (\S) is stored as the bytes ((?:[0-9A-F]{2})(?: [0-9A-F]{2})*)/u.exec(body);
    expect(match).not.toBeNull();
    const [, character, quoted] = match as unknown as [string, string, string];
    const real = [...new TextEncoder().encode(character)]
      .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
      .join(" ");
    expect(quoted).toBe(real);
  });

  it("puts the frame sentences after the byte definition and inside 'What you just saw'", () => {
    const heading = body.indexOf("## What you just saw");
    const next = body.indexOf("## How this tokenizer works");
    const definition = body.indexOf("A byte is a unit of computer storage;");
    const frames = body.indexOf("Hatched chips inside one frame are the bytes of a single character");
    const example = body.indexOf("For example, the character 男 is stored as the bytes");
    expect(heading).toBeGreaterThan(-1);
    expect(definition).toBeGreaterThan(heading);
    expect(frames).toBeGreaterThan(definition);
    expect(example).toBeGreaterThan(frames);
    expect(example).toBeLessThan(next);
  });

  it("names neither code points nor UTF-8 (plain words only, D-10)", () => {
    const lower = body.toLowerCase();
    expect(lower).not.toContain("utf-8");
    expect(lower).not.toContain("utf8");
    expect(lower).not.toContain("code point");
  });

  it.each(ANALOGY_WORDS)("does not use the analogy word %s (D-10)", (word) => {
    expect(body.toLowerCase()).not.toContain(word);
  });

  it.each(PROMISE_PHRASES)("does not promise other content with %s (D-12, D-14)", (phrase) => {
    expect(body.toLowerCase()).not.toContain(phrase);
  });

  it("has no code marks, no Markdown links and no anchor tags", () => {
    expect(body).not.toContain("`");
    expect(body).not.toMatch(/\]\(/);
    expect(body).not.toMatch(/<a[\s>]/i);
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

  it("uses a closed component vocabulary: no import lines", () => {
    expect(raw.split("\n").some((line) => line.startsWith("import "))).toBe(false);
  });

  it("is between 350 and 800 words including frontmatter", () => {
    const words = raw.split(/\s+/).filter((w) => w.length > 0).length;
    expect(words).toBeGreaterThanOrEqual(350);
    expect(words).toBeLessThanOrEqual(800);
  });

  it("speaks to the reader: the word you appears at least 5 times", () => {
    expect(body.match(/\byou\b/gi)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });

  it("references the glossary entry token from the frontmatter", () => {
    expect(frontmatter).toMatch(/^terms:\s*\[\s*token\s*\]\s*$/m);
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

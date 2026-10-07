// CLI: runs the playground examples (and the six language sentences) through
// GPT-2 and BERT, and writes the dated fixture the comparison page reads
// (D-10: instant, no download).
//   npm run precompute:comparison                write src/core/compare/comparison.json
//   npm run precompute:comparison -- --check     exit non-zero when the committed file differs,
//                                                ignoring only the generatedAt date
import { readFileSync, writeFileSync } from "node:fs";
import { buildComparison, formatComparison } from "./lib/comparison-build.ts";
import type { Manifest } from "./lib/comparison-build.ts";
import { DEFAULT_TEXT, EXAMPLES } from "../src/core/examples.ts";
import { LANGUAGES } from "../src/core/compare/languages.ts";
import { createRealTokenizer } from "../src/core/realTokenizer.ts";
import type { TokenizerCtor } from "../src/core/realTokenizer.ts";
import { TOKENIZER_FILES } from "../src/core/tokenizerFiles.ts";
import type { ComparisonFixture } from "../src/core/compare/fixture.ts";

const here = (rel: string): URL => new URL(rel, import.meta.url);
const check = process.argv.slice(2).includes("--check");
const target = here("../src/core/compare/comparison.json");

const loadJson = (rel: string): object => JSON.parse(readFileSync(here(rel), "utf8")) as object;
const manifest = loadJson("../public/tokenizers/manifest.json") as Manifest;

const { Tokenizer } = await import("@huggingface/tokenizers");
const Ctor = Tokenizer as unknown as TokenizerCtor;
const gpt2 = createRealTokenizer("gpt2", loadJson(`../public/tokenizers/${TOKENIZER_FILES.gpt2}`), Ctor);
const bert = createRealTokenizer("bert", loadJson(`../public/tokenizers/${TOKENIZER_FILES.bert}`), Ctor);

// --check keeps the committed date, so only a real difference in the rows fails it.
const committed = check ? readFileSync(target, "utf8") : null;
const today = new Date().toISOString().slice(0, 10);
const generatedAt =
  committed === null ? today : (JSON.parse(committed) as ComparisonFixture).meta.generatedAt;

const fixture = buildComparison({
  defaultText: DEFAULT_TEXT,
  examples: EXAMPLES,
  languages: LANGUAGES.map((l) => ({ id: l.id, sentence: l.sentence })),
  gpt2,
  bert,
  manifest,
  generatedAt,
});
const text = formatComparison(fixture);

if (committed !== null) {
  if (committed !== text) {
    console.error("precompute-comparison: committed src/core/compare/comparison.json differs from a fresh computation");
    process.exit(1);
  }
} else {
  writeFileSync(target, text, "utf8");
}
console.log(`precompute-comparison: OK (${fixture.examples.length} examples, ${fixture.languages.length} languages${check ? ", committed file matches" : ", written"})`);

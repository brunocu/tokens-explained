// Proves that Node can load the core natively (TypeScript type stripping, no bundler), which the
// comparison script and later tooling rely on. The first half builds the GPT-2 adapter the way
// scripts/precompute-comparison.ts does: the committed tokenizer file, the library imported
// dynamically, the one adapter.
import { readFileSync } from "node:fs";

const adapterUrl = new URL("../src/core/realTokenizer.ts", import.meta.url).href;
const { createRealTokenizer } = await import(adapterUrl);
const gpt2Json = JSON.parse(readFileSync(new URL("../public/tokenizers/gpt2.json", import.meta.url), "utf8"));
const { Tokenizer } = await import("@huggingface/tokenizers");
const gpt2 = createRealTokenizer("gpt2", gpt2Json, Tokenizer);

const hi = gpt2.tokenize("Hi");
if (hi.length !== 1) {
  console.error(`check-core: expected GPT-2 to give 1 token for "Hi", got ${hi.length}`);
  process.exit(1);
}
const hello = gpt2.tokenize("hello");
if (hello.length !== 1) {
  console.error(`check-core: expected GPT-2 to give 1 token for "hello", got ${hello.length}`);
  process.exit(1);
}
const cat = "\u{1F431}";
const catTokens = gpt2.tokenize(cat);
const catBytes = catTokens.flatMap((t) => Array.from(t.bytes));
const wantBytes = Array.from(new TextEncoder().encode(cat));
if (!catTokens.some((t) => t.isPartial) || JSON.stringify(catBytes) !== JSON.stringify(wantBytes)) {
  console.error(
    `check-core: expected the cat emoji to give partial tokens whose bytes join to ${JSON.stringify(wantBytes)}, got ${JSON.stringify(catBytes)}`,
  );
  process.exit(1);
}

// The stepper trace must also load natively: ten merges over the sample sentence, ending in the
// piece for " sat", with the vocabulary at 256 + 10 and the cat emoji falling back to raw bytes.
const stepperUrl = new URL("../src/core/stepper.ts", import.meta.url).href;
const { SAMPLE_SENTENCE, STEPPER_MERGES, SAMPLE_TRACE, encodeText, mergePairs, trainSentence } = await import(stepperUrl);
const steps = trainSentence(SAMPLE_SENTENCE, STEPPER_MERGES);
const last = steps.merges[steps.merges.length - 1];
if (steps.merges.length !== 10 || last === undefined || last.newText !== "␣sat" || last.vocabularySize !== 266) {
  console.error(
    `check-core: expected 10 stepper merges ending in "␣sat" with a vocabulary of 266, got ${steps.merges.length} merges ending in "${last?.newText}" (${last?.vocabularySize})`,
  );
  process.exit(1);
}
const emoji = encodeText(" \u{1F431}", mergePairs(SAMPLE_TRACE));
if (JSON.stringify(emoji) !== JSON.stringify([[32, 240, 159, 144, 177]])) {
  console.error(`check-core: expected the cat emoji to fall back to five byte ids, got ${JSON.stringify(emoji)}`);
  process.exit(1);
}
console.log("check-core: OK");

// Proves that Node can load the core natively (TypeScript type stripping, the
// JSON import attribute), which the training script and later tooling rely on.
const url = new URL("../src/core/toy.ts", import.meta.url).href;
const { tokenize } = await import(url);
const tokens = tokenize("Hi");
if (tokens.length !== 2) {
  console.error(`check-core: expected 2 tokens for "Hi", got ${tokens.length}`);
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

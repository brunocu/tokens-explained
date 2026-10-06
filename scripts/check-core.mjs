// Proves that Node can load the core natively (TypeScript type stripping, the
// JSON import attribute), which the training script and later tooling rely on.
const url = new URL("../src/core/toy.ts", import.meta.url).href;
const { tokenize } = await import(url);
const tokens = tokenize("Hi");
if (tokens.length !== 2) {
  console.error(`check-core: expected 2 tokens for "Hi", got ${tokens.length}`);
  process.exit(1);
}
console.log("check-core: OK");

// Numbers the post quotes about GPT-2, read from the engine and the committed manifest so a
// sentence cannot drift from either (D-13, D-14). Node only, like buildTokenizer: it is imported
// by .astro frontmatter and tests, never by an island. The stepper's own numbers stay in
// STEPPER_FACTS in stepper.ts; the Fact component looks there first, then here.
import { readFileSync } from "node:fs";
import { buildGpt2 } from "./buildTokenizer.ts";
import { sizeLabelMb } from "./tokenizerFiles.ts";

/** The facts the post may read about GPT-2. */
export const GPT2_FACT_KEYS = ["gpt2IdOfT", "gpt2FileMb"] as const;

export type Gpt2FactKey = (typeof GPT2_FACT_KEYS)[number];

type Gpt2Facts = { gpt2IdOfT: number; gpt2FileMb: string };

let memo: Promise<Gpt2Facts> | undefined;

/**
 * gpt2IdOfT: the id GPT-2 gives the single letter t. gpt2FileMb: the download size of the GPT-2
 * tokenizer file in decimal megabytes with one decimal, from the gzip size in the manifest.
 */
export function gpt2Facts(): Promise<Gpt2Facts> {
  memo ??= (async () => {
    const gpt2 = await buildGpt2();
    const tokens = gpt2.tokenize("t");
    if (tokens.length !== 1) throw new Error(`gpt2Facts: the letter t should be one GPT-2 token, got ${tokens.length}`);
    const manifest = JSON.parse(readFileSync(`${process.cwd()}/public/tokenizers/manifest.json`, "utf8")) as {
      files: Array<{ id: string; gzipBytes: number }>;
    };
    const entry = manifest.files.find((f) => f.id === "gpt2");
    if (entry === undefined) throw new Error("gpt2Facts: public/tokenizers/manifest.json has no gpt2 entry");
    return { gpt2IdOfT: (tokens[0] as { id: number }).id, gpt2FileMb: sizeLabelMb(entry.gzipBytes) };
  })();
  return memo;
}

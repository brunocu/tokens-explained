// CLI: trains the toy merge list and writes src/core/toy/merges.json, or with
// --check proves the committed file is exactly what the trainer produces (T-01-10).
//   npm run train:toy                 train with the default 800 merges and write the file
//   npm run train:toy -- --merges 700 train with a different merge count (600 to 800)
//   npm run train:toy -- --check      exit non-zero when the committed file differs
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { formatMergeData, trainMerges } from "./lib/bpe-train.ts";
import type { MergeMeta } from "../src/core/types.ts";

const here = (rel: string): URL => new URL(rel, import.meta.url);
const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

const args = process.argv.slice(2);
const check = args.includes("--check");
const mergesFlag = args.indexOf("--merges");
const target = here("../src/core/toy/merges.json");
// --check reproduces the committed merge count unless --merges overrides it.
const committedCount = check ? (JSON.parse(readFileSync(target, "utf8")) as { meta: MergeMeta }).meta.merges : 800;
const nMerges = mergesFlag >= 0 ? Number(args[mergesFlag + 1]) : committedCount;
if (!Number.isInteger(nMerges) || nMerges < 1) {
  console.error("train-toy: --merges needs a positive integer");
  process.exit(1);
}

const alice = readFileSync(here("./corpus/alice.txt"), "utf8");
const supplement = readFileSync(here("./corpus/supplement.txt"), "utf8");
const readme = readFileSync(here("./corpus/README.md"), "utf8");
const retrieved = /^Retrieved:\s*(\d{4}-\d{2}-\d{2})/m.exec(readme)?.[1];
if (retrieved === undefined) {
  console.error("train-toy: scripts/corpus/README.md has no 'Retrieved: YYYY-MM-DD' line");
  process.exit(1);
}

const merges = trainMerges(`${alice}\n${supplement}`, nMerges);
const meta: MergeMeta = {
  corpus: `alice.txt (sha256 ${sha256(alice)}) + supplement.txt (sha256 ${sha256(supplement)}), joined with a newline`,
  retrieved,
  merges: merges.length,
  tieBreak: "highest pair count, then smallest (left,right) id pair",
  preSplit: "GPT-2-style regex in src/core/presplit.ts",
};
const text = formatMergeData(meta, merges);

if (check) {
  const committed = readFileSync(target, "utf8");
  if (committed !== text) {
    console.error("train-toy: committed src/core/toy/merges.json differs from the trainer output");
    process.exit(1);
  }
} else {
  writeFileSync(target, text, "utf8");
}
console.log(`train-toy: OK (${merges.length} merges${check ? ", committed file matches" : ", written"})`);

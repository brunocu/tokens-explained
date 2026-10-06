// One-off corpus preparation (needs the network, run once): downloads Alice's
// Adventures in Wonderland (Project Gutenberg ebook 11, public domain), keeps only
// the body text, removes the distributor's name and normalises it to plain ASCII.
// The result is committed as scripts/corpus/alice.txt; later retrains never touch
// the network. Run with: npm run prepare:corpus
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const URLS = [
  "https://www.gutenberg.org/cache/epub/11/pg11.txt",
  "https://www.gutenberg.org/files/11/11-0.txt",
];
const OUT = new URL("./corpus/alice.txt", import.meta.url);

async function download(): Promise<string> {
  let lastError = "no URL tried";
  for (const url of URLS) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.text();
      lastError = `${url}: HTTP ${res.status}`;
    } catch (e) {
      lastError = `${url}: ${String((e as Error).message ?? e)}`;
    }
  }
  throw new Error(`could not download the corpus (${lastError})`);
}

/** Keep only the lines between the START and END marker lines. */
export function extractBody(raw: string): string {
  const lines = raw.replace(/^﻿/, "").split(/\r?\n/);
  const start = lines.findIndex((l) => /^\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG EBOOK/i.test(l));
  const end = lines.findIndex((l) => /^\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG EBOOK/i.test(l));
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("START/END marker lines not found in the downloaded text");
  }
  return lines.slice(start + 1, end).join("\n");
}

/** Normalise to ASCII: smart punctuation to plain, everything else non-ASCII removed. */
export function toAscii(text: string): string {
  return text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—―]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/[^\x00-\x7F]/g, "");
}

/** Drop the title block and any line that mentions the distributor. */
export function clean(body: string): string {
  const lines = body.split("\n");
  // The text proper starts at the first chapter heading; everything before is title block.
  const chapter = lines.findIndex((l) => /^CHAPTER I\.?\s*$/.test(l.trim()));
  const kept = (chapter >= 0 ? lines.slice(chapter) : lines).filter(
    (l) => !/gutenberg/i.test(l),
  );
  return (
    kept
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

const raw = await download();
const text = clean(toAscii(extractBody(raw)));
if (/gutenberg/i.test(text)) throw new Error("the distributor's name is still present");
mkdirSync(dirname(OUT.pathname), { recursive: true });
writeFileSync(OUT, text, "utf8");
console.log(`prepare-corpus: wrote ${text.length} bytes to scripts/corpus/alice.txt`);

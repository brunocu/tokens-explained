// Builds the precomputed comparison fixture (D-10, D-12, D-14). Shared by the CLI
// (scripts/precompute-comparison.ts) and the freshness test, so both compute rows the same way.
// Everything it needs comes in as arguments: no file reading, no clock, no library import.
import { sizeLabelMb } from "../../src/core/tokenizerFiles.ts";
import { tokensToFixture } from "../../src/core/compare/fixture.ts";
import type { ComparisonFixture, FixtureRows } from "../../src/core/compare/fixture.ts";
import type { RealTokenizer } from "../../src/core/realTokenizer.ts";

export type ManifestEntry = {
  id: string;
  repo: string;
  commit: string;
  license: string;
  sha256: string;
  gzipBytes: number;
};
// The manifest file also records a combined size; nothing here reads it (D-09: sizes are per tokenizer).
export type Manifest = { files: ManifestEntry[] };

export type ComparisonInput = {
  /** The playground's default text; callers pass DEFAULT_TEXT from src/core/examples.ts, never a copy (D-10). */
  defaultText: string;
  /** The playground examples; callers pass EXAMPLES from src/core/examples.ts, never a copy (D-12). */
  examples: ReadonlyArray<{ id: string; label: string; text: string }>;
  /** The sentences to cut, one per language (languages.ts). */
  languages: ReadonlyArray<{ id: string; sentence: string }>;
  gpt2: RealTokenizer;
  bert: RealTokenizer;
  manifest: Manifest;
  /** YYYY-MM-DD */
  generatedAt: string;
};

function entryFor(manifest: Manifest, id: string): ManifestEntry {
  const entry = manifest.files.find((f) => f.id === id);
  if (entry === undefined) throw new Error(`comparison-build: manifest has no entry for ${id}`);
  return entry;
}

function source(entry: ManifestEntry): { repo: string; commit: string; license: string; sha256: string } {
  return { repo: entry.repo, commit: entry.commit, license: entry.license, sha256: entry.sha256 };
}

function downloadFor(entry: ManifestEntry): { gzipBytes: number; sizeLabelMb: string } {
  return { gzipBytes: entry.gzipBytes, sizeLabelMb: sizeLabelMb(entry.gzipBytes) };
}

export function buildComparison(input: ComparisonInput): ComparisonFixture {
  const rowsFor = (text: string): FixtureRows => ({
    gpt2: tokensToFixture(input.gpt2.tokenize(text)),
    bert: tokensToFixture(input.bert.tokenize(text)),
  });
  return {
    meta: {
      generatedAt: input.generatedAt,
      tokenizers: { gpt2: source(entryFor(input.manifest, "gpt2")), bert: source(entryFor(input.manifest, "bert")) },
      download: {
        gpt2: downloadFor(entryFor(input.manifest, "gpt2")),
        bert: downloadFor(entryFor(input.manifest, "bert")),
      },
    },
    defaultText: { text: input.defaultText, ...rowsFor(input.defaultText) },
    examples: input.examples.map((e) => ({ id: e.id, label: e.label, text: e.text, rows: rowsFor(e.text) })),
    languages: input.languages.map((l) => ({ id: l.id, rows: rowsFor(l.sentence) })),
  };
}

const tokenLines = (tokens: ReadonlyArray<unknown>, pad: string): string =>
  tokens.length === 0 ? "[]" : `[\n${tokens.map((t) => `${pad}  ${JSON.stringify(t)}`).join(",\n")}\n${pad}]`;

function formatRows(rows: FixtureRows, pad: string): string {
  const inner = `${pad}  `;
  return (
    `{\n${inner}"gpt2": ${tokenLines(rows.gpt2, inner)},\n` +
    `${inner}"bert": ${tokenLines(rows.bert, inner)}\n${pad}}`
  );
}

/** Deterministic JSON: stable key order, meta indented, one token per line, trailing newline,
 *  so a regenerated fixture produces a reviewable diff. */
export function formatComparison(fixture: ComparisonFixture): string {
  const meta = JSON.stringify(fixture.meta, null, 2).replace(/\n/g, "\n  ");
  const examples = fixture.examples.map(
    (e) =>
      `    {\n      "id": ${JSON.stringify(e.id)},\n      "label": ${JSON.stringify(e.label)},\n` +
      `      "text": ${JSON.stringify(e.text)},\n      "rows": ${formatRows(e.rows, "      ")}\n    }`,
  );
  const languages = fixture.languages.map(
    (l) => `    {\n      "id": ${JSON.stringify(l.id)},\n      "rows": ${formatRows(l.rows, "      ")}\n    }`,
  );
  const list = (items: string[]): string => (items.length === 0 ? "[]" : `[\n${items.join(",\n")}\n  ]`);
  const defaultText =
    `{\n    "text": ${JSON.stringify(fixture.defaultText.text)},\n` +
    `    "gpt2": ${tokenLines(fixture.defaultText.gpt2, "    ")},\n` +
    `    "bert": ${tokenLines(fixture.defaultText.bert, "    ")}\n  }`;
  return (
    `{\n  "meta": ${meta},\n  "defaultText": ${defaultText},\n` +
    `  "examples": ${list(examples)},\n  "languages": ${list(languages)}\n}\n`
  );
}

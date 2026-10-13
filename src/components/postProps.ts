// Ready-made props for the islands of a post, computed at build time (D-07).
//
// Two rules (RESEARCH G-5):
//   1. Only the MDX imports this module, never a Svelte file. Importing it from an island would
//      pull the 47 KB comparison data into that island's chunk.
//   2. Nothing browser-only runs at module top level: the MDX also runs in Node during the build.
//
// The playground shows tokens it cannot compute yet while its GPT-2 file downloads. This module cuts
// the committed comparison data down to the six texts that can be on screen then (the default text
// and the five examples) and hands them over as a prop, so the island never imports the data itself.
import { COMPARISON } from "../core/compare/comparison.ts";
import type { FixtureToken } from "../core/compare/fixture.ts";
import { DEFAULT_TEXT, EXAMPLES } from "../core/examples.ts";

const preTokens: Record<string, FixtureToken[]> = { [DEFAULT_TEXT]: COMPARISON.defaultText.gpt2 };
for (const example of EXAMPLES) {
  const row = COMPARISON.examples.find((e) => e.id === example.id);
  if (row === undefined) {
    throw new Error(`postProps: example "${example.id}" is missing from comparison.json (run npm run precompute:comparison)`);
  }
  preTokens[example.text] = row.rows.gpt2;
}

/** Spread onto the playground island in the MDX: `<Playground client:load {...playgroundProps} />`. */
export const playgroundProps: { preTokens: Record<string, FixtureToken[]>; sizeLabel: string } = {
  preTokens,
  sizeLabel: COMPARISON.meta.download.gpt2.sizeLabelMb,
};

/**
 * Spread onto the comparison island in the MDX: `<Comparison client:visible {...comparisonProps} />`.
 * The licence-notices address is built from the site base here, not in the island and not in
 * src/core, so it works under a sub-path (T-02.2-12). The base ends with a slash in Astro; the
 * guard keeps the address right if it ever does not.
 */
const siteBase: string = import.meta.env.BASE_URL;
export const comparisonProps: { noticeHref: string } = {
  noticeHref: `${siteBase.endsWith("/") ? siteBase : `${siteBase}/`}tokenizers/NOTICE.md`,
};

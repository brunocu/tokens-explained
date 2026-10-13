import { describe, expect, it } from "vitest";
import { comparisonProps, playgroundProps } from "./postProps.ts";
import { DEFAULT_TEXT, EXAMPLES } from "../core/examples.ts";

// The props module is read at build time by the MDX only (RESEARCH G-5, threat T-02.2-04).

describe("playgroundProps", () => {
  it("has exactly the default text and the five example texts as keys", () => {
    const expected = [DEFAULT_TEXT, ...EXAMPLES.map((e) => e.text)];
    expect(EXAMPLES).toHaveLength(5);
    expect(Object.keys(playgroundProps.preTokens).sort()).toEqual([...new Set(expected)].sort());
    expect(Object.keys(playgroundProps.preTokens)).toHaveLength(6);
  });

  it("holds a non-empty row of tokens for every text", () => {
    for (const [text, rows] of Object.entries(playgroundProps.preTokens)) {
      expect(Array.isArray(rows), text).toBe(true);
      expect(rows.length, text).toBeGreaterThan(0);
    }
  });

  it("has a non-empty size label", () => {
    expect(typeof playgroundProps.sizeLabel).toBe("string");
    expect(playgroundProps.sizeLabel.length).toBeGreaterThan(0);
  });
});

describe("comparisonProps", () => {
  it("builds the licence-notices address from the site base", () => {
    expect(comparisonProps.noticeHref.endsWith("/tokenizers/NOTICE.md")).toBe(true);
    expect(comparisonProps.noticeHref.startsWith(import.meta.env.BASE_URL)).toBe(true);
    expect(comparisonProps.noticeHref).not.toContain("//");
  });
});

describe("postProps import rule", () => {
  // Every .svelte file under src/components, read as text at transform time.
  const sources = import.meta.glob<string>("./**/*.svelte", { query: "?raw", import: "default", eager: true });

  it("is not imported by any Svelte file under src/components", () => {
    const files = Object.entries(sources);
    expect(files.length).toBeGreaterThan(0);
    // An import is a `from "<path>"` clause, or a side-effect or dynamic import of a path; a comment
    // that names the module is allowed.
    const importsIt = /(?:from\s+|import\s*\(?\s*)["'][^"']*postProps[^"']*["']/;
    for (const [path, source] of files) expect(importsIt.test(source), path).toBe(false);
  });

  it("sees the playground among the files it checks", () => {
    expect(Object.keys(sources)).toContain("./Playground.svelte");
  });
});

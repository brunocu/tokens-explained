# Quick Task 261014-ch0: use rehype-citation - Context

**Gathered:** 2026-10-14
**Status:** Ready for planning

<domain>
## Task Boundary

Use `rehype-citation` for BibTeX-like reference handling instead of hand-numbered `<Cite n={…} />` / `<Reference n={…}>` in MDX posts.

</domain>

<decisions>
## Implementation Decisions

### Pipeline switch
- Switch globally: install `@astrojs/markdown-remark`, set `markdown.processor: unified({...})` for the whole site (leaves Sätteri).

### Citation style
- Use a built-in style (ieee/vancouver), not a custom CSL. Slight wording changes versus today's hand-written entries are accepted.

### Bibliography source
- BibTeX `.bib` file.

### Migration & rendering
- Replace fully: convert prose to `[@key]`, delete the `Cite` / `References` / `Reference` components and their tests.

### Claude's Discretion
- Exact style choice (ieee vs vancouver), `.bib` location, tests for the new setup.

</decisions>

<specifics>
## Specific Ideas

- Research (see 261013-tdx-RESEARCH.md) found `rehype-citation` 2.3.2 gave a wrong number in the vancouver style for a grouped cite `[@utf8; @ascii1963]`: the text and the bibliography numbered them in opposite orders. Verify numbering of grouped cites after migration, and prefer ieee if it behaves correctly.
- Research recommended a ~40-line key-based `<Cite id>` instead; the user chose `rehype-citation` anyway.
- Verify the old numbers and `#ref-N` anchors where they matter (post-content.test.ts parses `<Cite n>` today and must be updated).

</specifics>

<canonical_refs>
## Canonical References

- .planning/quick/261013-tdx-is-there-an-astro-or-unified-remark-rehy/261013-tdx-RESEARCH.md

</canonical_refs>

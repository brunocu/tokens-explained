# Quick Research: BibTeX-like reference handling for Astro 7 MDX posts

**Researched:** 2026-10-13
**Question:** Is there an Astro or unified (remark/rehype) plugin that replaces hand-numbered `<Cite n={1} />` / `<Reference n={1}>` with bibtex-like handling?
**Confidence:** HIGH on the findings (registry, docs and scratch builds this session). MEDIUM on the recommendation, which is a judgement call.

## Short answer

Yes, one maintained plugin exists (`rehype-citation`), but it is the wrong fit here. There is no Astro-specific citation integration. The better answer is a small key-based mechanism of about 40 lines that you own: `<Cite id="ascii1963" />`, a data file, and an order computed before render. I built and verified it in a scratch Astro 7.3.5 + MDX 8.0.2 project.

## 1. Existing remark/rehype plugins

| Package | Version / last publish | What it does | Verdict |
|---|---|---|---|
| `rehype-citation` | 2.3.2, 2026-02-08, created 2021 [VERIFIED: npm view]. 3 open issues; newest opened Sept 2026 [CITED: github.com/timlrx/rehype-citation/issues] | Pandoc-style `[@key]` and `@key` in text. Reads BibTeX, CSL-JSON or CFF. Formats with citeproc. Supports numeric styles (`vancouver`) and `linkCitations`. Appends a `#refs` bibliography, or puts it at a `[^ref]` placeholder paragraph. [VERIFIED: package README and `dist/node/src/generator.js`] | Works, but see the caveats below. |
| `@benrbray/remark-cite` | `2.0.1-alpha.4`, 2024-07-11 [VERIFIED: npm view] | Parses Pandoc citation syntax into mdast only. Its README says "it is up to you to assign meaning to these citations". | Not a solution. Alpha, with no formatting and no bibliography. |
| `remark-cite`, `remark-citeproc`, `astro-citations`, `astro-rehype-citation` | npm E404 [VERIFIED: npm view] | Do not exist. | Ignore. |
| npm search "astro bibtex", "astro citation", "remark bibtex", "rehype bibliography" | The only relevant hit is `rehype-citation`. The rest are `@citation-js/*` libraries [VERIFIED: npm search]. | There is no Astro-specific integration. | Ignore. |

### Does `rehype-citation` work with Astro 7?

- It is a unified (rehype) plugin, so it does not run in Astro 7's default Sätteri pipeline. Using it needs `npm i @astrojs/markdown-remark` plus `markdown: { processor: unified({ rehypePlugins: [...] }) }` in `astro.config.mjs`. [CITED: docs.astro.build/en/guides/upgrade-to/v7/]
- That upgrade guide says MDX goes through the same processor as `.md` by default. It also says `.mdx` can be given its own processor. [CITED: docs.astro.build/en/guides/integrations-guide/mdx/]
- Scratch build (Astro 7.3.5, @astrojs/mdx 8.0.2, @astrojs/markdown-remark 7.3.2, rehype-citation 2.3.2): `ASCII came first [@ascii1963].` in an `.mdx` file is rendered as a link plus a `div#refs.csl-bib-body` bibliography, and a JSX component (`<Fact />`) in the same paragraph is untouched. [VERIFIED: scratch build]
  - The plugin reads `file.data.astro?.frontmatter`, so it was written with Astro in mind. [VERIFIED: `utils.js` `getFrontmatterField`]
- Observed problems:
  1. **Wrong numbers in a grouped citation.** With the `vancouver` style, `[@utf8; @ascii1963]` rendered "(1,2)" with utf8 as 1 and ascii as 2. The bibliography numbers them ascii=1 and utf8=2. A later `[@utf8]` correctly gave "(2)". [VERIFIED: scratch build output] This is exactly the kind of silent numbering error the current approach is meant to avoid.
  2. **Pipeline switch.** The whole project leaves Sätteri for the unified pipeline. CLAUDE.md currently lists the Sätteri default as a deliberate choice ("Keep Markdown plain").
  3. **Large dependency tree.** It brings in citeproc, citation-js (several packages), parse5, cross-fetch and js-yaml [VERIFIED: `npm view rehype-citation dependencies`]. It also prints a `punycode` deprecation warning at build, and this is an open upstream issue (#64).
  4. **Output style does not match the current design.** The default styles are apa, vancouver, harvard1, chicago and mla; any other style needs a custom CSL file. Your references use an IEEE look ("[Online]. Available: … Accessed: …") with `[n]` links. Vancouver gave "(1)" with a different entry format. [VERIFIED: scratch build] An IEEE CSL would have to be supplied and checked for the `Accessed:` wording. I did not test that. The `Reference.astro` styling would be replaced by global `.csl-entry` CSS.
  5. **No `<Cite>` component.** Citations become `[@key]` text. The plugin only visits text inside `div`, `p`, `span`, `li`, `td` and `th` elements. [VERIFIED: `permittedTags` in `generator.js`]

### Sätteri route

Sätteri has its own mdast/hast plugin API (`defineMdastPlugin`, visitors that receive `(node, ctx)`, and `ctx.setField`). The docs do not say that those plugins run on `.mdx`, and they list no citation plugin. [CITED: satteri.bruits.org/docs/plugins/ and docs.astro.build/en/guides/markdown-content/] Writing a citation plugin on it means learning an undocumented-for-MDX API, so it is not recommended.

## 2. Astro-specific components

None found. See the table above. [VERIFIED: npm search]

## 3. Numbering by first appearance, and keeping `<Cite>`

- `rehype-citation`: numeric styles number by order of first citation (the grouped-citation bug above aside), but the usage syntax is `[@key]`, so `<Cite>` goes away.
- The own-mechanism route keeps `<Cite>` and keeps your current `Reference`/`References` look. It changes only the argument, from `n={14}` to `id="bpe-compression"`.

## 4. No-dependency alternative: key-based `<Cite id>` (recommended)

### Data
One module, for example `src/content/references/what-is-a-token.ts` (or YAML or JSON). It is a record keyed by id, holding `{ text, url, accessed? }`, which is the same data as today's `<Reference>` slot, `url` and `accessed`. BibTeX plus citation-js is not worth it. Your 26 entries are hand-formatted IEEE strings, and parsing and re-formatting them to IEEE would need `@citation-js/plugin-csl` and a CSL style. `@citation-js/core` 0.9.0 does need Node >=22.12, which you already require. [VERIFIED: npm view] Choose BibTeX only if you want to import bibliographies exported from a reference manager.

### Do not use a render-time registry (verified failure)
Two scratch builds on Astro 7.3.5:

| Approach | Result |
|---|---|
| `Cite` pushes its id into `Astro.locals.__cites` and `References` reads it, with every `Cite` synchronous | Correct. Numbers were 1, 2, 1 and the list was `b, a`. `Astro.locals` is fresh per page: a second page started at `[1]`. [VERIFIED: scratch build] |
| Same registry, but the first `Cite` has an `await` (200 ms) | **Broken.** Astro renders sibling components concurrently. The slow `Cite` got `[3]` instead of `[1]`, and `References` was rendered before it, so the list was missing an entry. [VERIFIED: scratch build output `<a href="#ref-3">[3]</a> … <ol><li>a</li><li>c</li></ol>`] |

This matters in this repo because `Fact.astro` already contains `await gpt2Facts()`. A registry would work today only as long as nobody ever makes `Cite` or `References` async, so the failure would be silent and unrelated to the change that caused it. Avoid it.

### Use a pre-pass that does not depend on render order (verified)
1. In `[slug].astro` or `PostLayout.astro`, before `<Content />` renders, scan `post.body` (the raw MDX source; `body?: string` exists on collection entries [VERIFIED: `node_modules/astro/dist/content/runtime.d.ts:26`]) and compute the ordered, de-duplicated list of cited ids. Store it with `Astro.locals.citeOrder = order`.
2. `Cite.astro`: `n = order.indexOf(id) + 1`, and render `[n]` linking to `#ref-n`. A missing id throws, as `Fact.astro` already does for unknown facts.
3. `References.astro`: take no children. For each id in `order`, render the entry from the data file using the existing `Reference` markup. Warn or throw when the data file holds entries that are never cited.
4. Verified: with a deliberately slow async `Cite`, the output was correct, `[1] [2] [3]` and `b, a, c`, because order is computed before any rendering. [VERIFIED: scratch build]
5. `PostLayout.astro` already passes `components={{ …, Cite, References, Reference, … }}` to `<Content />` [VERIFIED: `PostLayout.astro:32`], so the MDX file needs no imports.

Put the scan in a pure function `citationOrder(body: string): string[]` in `src/core/` so Vitest can test it. `src/content/post-content.test.ts` already scans the post source with its own `citesIn` regex for `<Cite n={…}>`. It would move to the same function, and tests can then also assert "every cited id exists" and "no unused entries".

### Cost and benefit versus the plugin

| | Own mechanism | `rehype-citation` |
|---|---|---|
| New dependencies | 0 | `@astrojs/markdown-remark`, `rehype-citation` and about 10 transitive packages |
| Pipeline change | None (stays on Sätteri) | Whole project moves to unified |
| Keeps `<Cite>`, the `[n]` look and the current `Reference` design | Yes | No (needs a custom IEEE CSL and global CSS) |
| BibTeX or CSL import | No (the data file is hand-written) | Yes |
| Correctness | You control it. Unit-testable. | Wrong grouped numbering observed |
| Effort | About 40 lines plus a one-off migration of 27 `<Cite>` and 26 `<Reference>` entries | Config plus CSL plus restyle plus the bug workaround |

## 5. Recommendation

Build the key-based mechanism (section 4, pre-pass version). Do not adopt `rehype-citation`.

**Pitfalls for the planner:**
1. **Do not use a render-time registry** (`Astro.locals` or a module-level array filled by `Cite`). It breaks silently if any `Cite` becomes async. Always compute order before render.
2. **The regex scan must ignore code.** Strip fenced and inline code before scanning, or `<Cite>` examples in prose about code would count.
3. **The scan sees only the post's own source.** Citations coming from imported MDX partials or built dynamically in JSX expressions are missed. State the rule "`id` must be a string literal" and enforce it in the test.
4. **Support the grouped form.** Today's `<Cite n={[14, 15]} />` needs a clear replacement (`ids={["a","b"]}` or the same `id` prop given an array), and the scan must handle both.
5. **The data file belongs outside `src/content/posts/`.** The loader pattern is `**/*.mdx` [VERIFIED: `content.config.ts`], so a sibling `.ts` or `.yaml` file would not be picked up by it, but `src/content/` is easy to confuse with a collection. Pick a clear folder, such as `src/data/`.
6. **Build errors are better than silent numbering.** Fail the build on a cited id that is missing from the data file, and on an unused entry. Today a wrong `n` is silent.
7. **Migration is a mechanical rewrite.** Choose ids by hand (for example `ascii1963`, `utf8-rfc3629`). Keep the old numbers temporarily to check that the new auto-numbering reproduces the current output exactly: same order, same `#ref-N` anchors.
8. **Keep `References.astro` free of async work** (read the data file with a static `import`). It is not required for correctness with the pre-pass, but it keeps the page simple.

## Sources

- npm registry (`npm view`, `npm search`), read 2026-10-13: `rehype-citation`, `@benrbray/remark-cite`, `@citation-js/*`, `@astrojs/markdown-remark`, `satteri`.
- `rehype-citation@2.3.2` package contents (`npm pack`): `dist/node/src/generator.js`, `utils.js`, README.
- https://github.com/timlrx/rehype-citation/issues (maintenance status).
- https://docs.astro.build/en/guides/upgrade-to/v7/ (Sätteri default, opting back into `unified()`).
- https://docs.astro.build/en/guides/integrations-guide/mdx/ (`processor` option for `.mdx`).
- https://docs.astro.build/en/guides/markdown-content/ (Sätteri `mdastPlugins` and `hastPlugins`).
- https://satteri.bruits.org/docs/plugins/ (Sätteri plugin API).
- Scratch builds, Astro 7.3.5 + @astrojs/mdx 8.0.2, in the session scratchpad. The project source was not modified.

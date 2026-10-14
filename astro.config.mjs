import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import svelte from "@astrojs/svelte";
import { unified } from "@astrojs/markdown-remark";
import rehypeCitation from "rehype-citation";
import { fileURLToPath } from "node:url";
import { site, base, outDir } from "./site.config.mjs";
import rehypeLinkUrls from "./src/plugins/rehypeLinkUrls.mjs";

// site, base and outDir come from site.config.mjs (D-15 amended).
// trailingSlash "always" makes import.meta.env.BASE_URL end with a slash.
// Fonts are fetched from Fontsource at build time and self-hosted in the output.
export default defineConfig({
  site,
  base,
  outDir,
  trailingSlash: "always",
  // Markdown pipeline (quick task 261014-ch0, D-01): `unified()` replaces Astro 7's default Satteri
  // processor for the whole site so rehype-citation can run. Citations are written [@key] and the
  // bibliography comes from src/data/references.bib. `vancouver` is the only built-in numeric style
  // (rehype-citation ships apa, vancouver, harvard1, chicago, mla; there is no ieee).
  // Groups of citations must be written in ascending order of first citation: citeproc sorts the
  // visible numbers but leaves the links in written order, so another order mislabels the links.
  // src/content/post-content.test.ts enforces this.
  markdown: {
    processor: unified({
      rehypePlugins: [
        [
          rehypeCitation,
          {
            path: fileURLToPath(new URL("./src/data", import.meta.url)),
            bibliography: "references.bib",
            csl: "vancouver",
            linkCitations: true,
            showTooltips: true,
            inlineClass: ["cites"],
          },
        ],
        rehypeLinkUrls,
      ],
    }),
  },
  integrations: [mdx(), svelte()],
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Source Serif 4",
      cssVariable: "--font-serif",
      weights: [400, 600],
      styles: ["normal", "italic"],
      subsets: ["latin"],
      fallbacks: ["Georgia", "serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "JetBrains Mono",
      cssVariable: "--font-mono",
      weights: [400],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "Menlo", "Consolas", "monospace"],
    },
  ],
});

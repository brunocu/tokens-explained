import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import svelte from "@astrojs/svelte";
import { site, base, outDir } from "./site.config.mjs";

// site, base and outDir come from site.config.mjs (D-15 amended).
// trailingSlash "always" makes import.meta.env.BASE_URL end with a slash.
// Fonts are fetched from Fontsource at build time and self-hosted in the output.
export default defineConfig({
  site,
  base,
  outDir,
  trailingSlash: "always",
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

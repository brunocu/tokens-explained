# Tokens, explained

An interactive explainer that helps a general audience (no programming background assumed) understand what a "token" is in AI language models, and how it differs from a word, an embedding, context and reasoning. You type your own text into a real tokenizer in the browser and watch it split.

Live site: https://brunocu.github.io/tokens-explained/

## What is in here

- One post, "What is a token?", with interactive widgets that run entirely in the reader's browser. Nothing a reader types leaves their machine, and the page loads nothing from other servers.
- The home page and `/what-is-a-token/` are the same document on purpose. The home page carries a canonical link pointing at `/what-is-a-token/`, so search engines treat the post URL as the real one.
- Two real tokenizer files (GPT-2 and BERT), self-hosted in `public/tokenizers/`.

Built with Astro, MDX and Svelte, and hosted as a static site on GitHub Pages under the sub-path `/tokens-explained`.

## Running it locally

The development environment is a Nix flake (Node 24 and pinned Playwright browsers).

```sh
nix develop
npm ci
npm run dev        # development server
npm run build      # static build into dist/
npm run preview    # serve the build
```

Checks and tests:

```sh
npm run check        # Astro and TypeScript type check
npm run check:svelte # Svelte type check
npm test             # unit tests (Vitest)
npm run check:dist   # guard over dist/: no third-party URLs, no root-absolute URLs outside the base
npm run test:e2e     # browser tests (Playwright), run after a build
```

To build the way the live site is built, set the production address first:

```sh
SITE_URL=https://brunocu.github.io SITE_BASE=/tokens-explained npm run build
```

The build fetches two fonts (Source Serif 4 and JetBrains Mono) from the Fontsource registry once, and then serves them from the site's own files. If that registry is down the build fails and nothing is deployed. Readers never load anything from a third party.

## Release flow

Each phase of work happens on its own branch with small commits. When a phase is finished and the full local test suite passes, the branch is squash-merged locally into `main` as a single commit, and `main` is what gets pushed. There are no pull requests. Before the first push the earlier history was squashed in the same way, so the history on `main` is one commit per phase.

## Licences

- **Code** (everything outside the items below): MIT. See [LICENSE](LICENSE).
- **Prose and figures** written for this project (the text of the post and its diagrams): Creative Commons Attribution 4.0 International (CC BY 4.0). See [LICENSE-CONTENT](LICENSE-CONTENT). The CC BY 4.0 grant covers the author's own prose and figures only.

Things in this repository that are not covered by the two statements above:

- **Tokenizer files** in `public/tokenizers/` keep their own licences: GPT-2 under the "Modified MIT License" of the OpenAI repository, and BERT base uncased under Apache-2.0. The MIT licence for code does not cover them. The full texts and sources are in [public/tokenizers/NOTICE.md](public/tokenizers/NOTICE.md).
- **Fonts** (Source Serif 4 and JetBrains Mono) are under the SIL Open Font License 1.1. The notices and licence text are in [public/NOTICE-fonts.md](public/NOTICE-fonts.md).
- **The Anna Karenina line** quoted in the post is from Constance Garnett's translation (Project Gutenberg ebook 1399), which is in the public domain. The post credits the translator.
- **The Universal Declaration of Human Rights sentences** used in the languages widget are official translations from the United Nations human rights office (OHCHR) and carry the United Nations reuse terms, not this project's licences.

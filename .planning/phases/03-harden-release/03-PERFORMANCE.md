# Phase 3: Performance record

Measured 2026-10-14 on the final production build of this branch, by `scripts/measure-bundle.mjs` (plan 03-05, task 1).

How it was measured: `SITE_URL=https://brunocu.github.io SITE_BASE=/tokens-explained npm run build`, served with `astro preview` on port 4431, then `node scripts/measure-bundle.mjs http://localhost:4431/tokens-explained/`. Chromium opens the page at 390 by 844 without scrolling, waits until the playground reports its tokenizer ready, and gzips every response body at level 6 (GitHub Pages serves gzip, not brotli). One kilobyte here is 1,000 bytes. The script is a report: it exits 0 unless `--budget` is passed, and nothing in the project passes it (see "Budget enforcement").

## Measured table (gzip, as Pages serves it)

| Item (loaded at page load, no scroll) | Files | Raw bytes | gzip bytes | Research (2026-10-13) gzip |
|---|---:|---:|---:|---:|
| HTML | 1 | 162,271 | 26,185 | 23,561 |
| CSS | 2 | 25,085 | 5,944 | 5,907 |
| JavaScript | 7 | 110,267 | 41,200 | 41,200 |
| Fonts (4 woff2 files, already compressed) | 4 | 82,880 | 82,992 | 82,992 |
| **Subtotal without the tokenizer file** | 14 | 380,503 | **156,321** | 153,660 |
| `tokenizers/gpt2.json` (auto-load, `client:load` island) | 1 | 1,355,256 | 556,664 | 556,664 |
| **Total at load** | 15 | 1,735,759 | **712,985** | 710,324 |

What moved since the research run: only the HTML, which grew by 2.6 KB (about 11 percent) between the research run and this one; the page text changed in plans 03-02 and 03-03 after the research measurement, which is the likely cause (not separately verified). JavaScript, fonts and the tokenizer file are byte-for-byte the same sizes. The fifth woff2 file is not requested at load.

Informational lines, not budget lines:

- Lazy chunks, loaded only after scrolling (`client:visible`): `BpeStepper` 6,352, `TokenRows` 7,083, `LanguagesWidget` 3,640, `Comparison` 2,532 gzip bytes, 19,607 in total (19.6 KB). Other small chunks (`Playground`, `TextPanel`, `TokenDisplay`, `ScrollRegion`, the Svelte runtime and the tokenizer library) are already in the at-load JavaScript.
- All JavaScript the page can ever load without pressing the BERT button, measured after scrolling the whole page: 11 files, 60,807 gzip bytes (60.8 KB).
- `bert-uncased.json`, fetched only when the reader presses its button: 191,714 gzip bytes (about 192 KB), shown to the reader as an explicit button.
- `/` and `/what-is-a-token/` are byte-identical documents; `/` carries a canonical link to the post.

## Proposed budget and result

| Budget line (gzip) | Measured | Proposed limit | Result |
|---|---:|---:|---|
| Initial load, without tokenizer files (HTML, CSS, JS, fonts) | 156.3 KB | 200 KB | PASS |
| Initial load, with `gpt2.json` | 713.0 KB | 800 KB | PASS |
| All JavaScript the page can load without BERT (after scrolling) | 60.8 KB | 80 KB | PASS |
| HTML alone | 26.2 KB | 35 KB | PASS |
| `bert-uncased.json` on click | 191.7 KB | informational | n/a |

No line is over budget. The tightest is HTML at 75 percent of its limit; the fonts (83 KB) are about half of the no-tokenizer subtotal, and `gpt2.json` is a pinned asset (sha256 in the manifest) that moves only with a deliberate tokenizer change.

## Budget enforcement

Decision (03-DECISIONS.md, item 4, recorded 2026-10-13): **report only, no failing gate.** The limits above are informational. Consequently `package.json` and `.github/workflows/deploy.yml` are unchanged by this plan (the workflow still holds only the comment from plan 03-04 marking where a budget step could go). To turn the report into a gate later, run `node scripts/measure-bundle.mjs <url> --budget` after a build under `astro preview`; it exits non-zero when a limit is exceeded.

## Playground loading: `client:load` or `client:idle`

Decision (03-DECISIONS.md, item 5, recorded 2026-10-13, the author's choice): **keep `client:load`.** The directive on the Playground island in `src/content/posts/what-is-a-token.mdx` is unchanged, so no e2e spec needed adjusting.

The numbers behind it:

- The textbox is the main call to action, and the playground is the first thing a reader sees, so deferring its JavaScript would delay the one thing the page is for.
- The earlier Lighthouse run (13.5.0, mobile defaults) gave LCP 1.5 s and TBT 80 ms, both already good.
- The at-load JavaScript is 41.2 KB gzip and the GPT-2 file is 556.7 KB; the textbox is read-only until that file is ready, and a status line is shown during the wait.
- Time until the textbox is typable on Lighthouse's throttled mobile profile is an arithmetic estimate, not a browser measurement (assumption A6 in the research): 556,664 bytes x 8 / 1,474,560 bits per second is about 3.0 s of transfer after the page itself, so roughly 4 to 5 s. The CPU-throttled start-up time actually measured in a browser is recorded in `03-HARDENING.md` (Freeze section); it does not include network throttling.

## Lighthouse, in plain words

Lighthouse is Chrome's built-in auditor: it loads your page the way a mid-range phone on a slow connection would and gives it four scores from 0 to 100, for Performance (how fast it feels), Accessibility (can people with different needs use it), Best Practices (no obviously unsafe or sloppy habits) and SEO (can search engines understand it). Here the scores are recorded, not targeted: they are a smoke detector that points at things worth a look, not a grade to chase.

Baseline from the research run on the production-base build (Lighthouse 13.5.0, mobile defaults): Performance 99, Accessibility 100, Best Practices 96, SEO 100; FCP 1.4 s, LCP 1.5 s, TBT 80 ms, CLS 0.026. The one Best Practices finding was a favicon 404 in the console, which plan 03-02 fixed. The author runs Lighthouse again from the DevTools panel on the live URL after deployment (checklist item 8 in `03-CHECKLISTS.md`); no package is installed for it.

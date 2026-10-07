# Phase 2: BPE Stepper & Real-Tokenizer Comparison - Pattern Map

**Mapped:** 2026-10-06
**Files analyzed:** 24 (new and modified)
**Analogs found:** 22 / 24 (all analogs are git-tracked; verified via `git ls-files`)

Note: the file list comes from CONTEXT.md, RESEARCH.md (gaps 1-8) and the component names in UI-SPEC. Names marked (UI-SPEC) are those the UI-SPEC uses. Line numbers refer to the files as of this mapping.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/core/stepper.ts` (`trainBPE -> Step[]`) | utility (pure) | transform | `scripts/lib/bpe-train.ts` | exact (logic) |
| `src/core/stepper.test.ts` (golden on Sennrich corpus) | test | transform | `src/core/toy.golden.test.ts` | role-match |
| `scripts/lib/bpe-train.ts` (modify: extract `trainOnPieces`) | utility | transform | itself | n/a |
| `src/core/realTokenizer.ts` (adapter, takes parsed JSON, no fetch) | service | transform | `src/core/toy.ts` | role-match |
| `src/core/realTokenizer.test.ts` + `fixtures/adapter-parity.json` | test | transform | `src/core/regression.test.ts`, `toy.golden.test.ts` | role-match |
| `src/core/types.ts` (modify: reuse `Token`, add `special` if needed) | model | n/a | itself | n/a |
| `src/core/fixtures/comparison.json` (precomputed rows) + freshness test | fixture/test | batch | `src/core/fixtures/regression-corpus.ts`, `src/core/toy/merges.json` | role-match |
| `src/core/languages.ts` or fixture (UDHR text) | config/data | batch | `src/core/examples.ts` | role-match |
| `scripts/precompute-comparison.ts` (npm script, committed output) | script | batch/file-I/O | `scripts/train-toy-bpe.ts` | exact |
| `public/tokenizers/gpt2.json`, `bert-uncased.json`, `manifest.json` | static asset/config | file-I/O | none (no `public/tokenizers/` yet) | no analog |
| `src/components/BpeStepper.svelte` (UI-SPEC) | component | event-driven | `src/components/Playground.svelte` | role-match |
| `src/components/Chip.svelte` (UI-SPEC, if extracted) | component | transform | `src/components/TokenDisplay.svelte` | exact |
| `src/components/TokenLegend.svelte` (UI-SPEC, if extracted) | component | transform | legend block in `TokenDisplay.svelte` | exact |
| `src/components/Comparison.svelte` (UI-SPEC) | component | request-response (load button, fetch) | `src/components/Playground.svelte` | role-match |
| `src/components/LanguagesDemo.svelte` (UI-SPEC) | component | transform | `src/components/TokenTable.svelte` | role-match |
| `src/components/wrappers/StepperSection.astro`, `ComparisonSection.astro`, `LanguagesSection.astro` | wrapper | n/a | `src/components/wrappers/PlaygroundSection.astro` | exact |
| `src/content/posts/what-is-a-token.mdx` (modify: reorder, soften) | content | n/a | itself | n/a |
| `src/core/claims.ts` / `claims.test.ts`, `src/content/post-content.test.ts` (extend) | utility/test | transform | themselves | n/a |
| `e2e/privacy.spec.ts` (extend), new `e2e/stepper.spec.ts`, `e2e/comparison.spec.ts` | test | request-response | `e2e/privacy.spec.ts`, `e2e/controls.spec.ts` | exact |
| `scripts/check-deps.mjs` (modify ALLOW) | config | n/a | itself | n/a |
| `scripts/check-base.mjs`, `scripts/check-dist.mjs` (extend) | script | batch | themselves | n/a |
| `package.json` (add dep, add `precompute` script) | config | n/a | itself | n/a |

## Pattern Assignments

### `src/core/stepper.ts` (utility, transform)

**Analog:** `scripts/lib/bpe-train.ts` (the tie-break and merge loop must be shared, per RESEARCH Gap 5 and D-04).

**Plan consequence:** extract lines 33-67 (the loop after the `frequency` map) into an exported `trainOnPieces(pieces: Array<{ids:number[]; weight:number}>, nMerges)`. `trainMerges` calls it. `npm run train:toy -- --check` plus `toy.golden.test.ts` prove byte-identical behaviour. The stepper needs per-step pair counts, so either `trainOnPieces` takes an optional `onStep` callback or the stepper imports the shared comparator. Do not copy the comparator.

**Tie-break and key pattern** (`scripts/lib/bpe-train.ts` lines 10, 47-57):
```ts
const keyOf = (left: number, right: number): number => left * 65536 + right;
...
let bestKey = -1;
let bestCount = 0;
for (const [key, count] of counts) {
  // Keys sort as (left, right), so "smaller key" is exactly the tie-break rule.
  if (count > bestCount || (count === bestCount && key < bestKey)) {
    bestKey = key;
    bestCount = count;
  }
}
```

**Pair counting + merge application** (lines 36-67):
```ts
for (const { ids, weight } of pieces) {
  for (let i = 0; i + 1 < ids.length; i++) {
    const key = keyOf(ids[i] as number, ids[i + 1] as number);
    counts.set(key, (counts.get(key) ?? 0) + weight);
  }
}
...
if (i + 1 < ids.length && ids[i] === left && ids[i + 1] === right) { next.push(newId); i++; }
```

**Module conventions** (header of `bpe-train.ts` lines 1-6; `toy.ts` lines 1-6): pure module, no `node:` imports, explicit `.ts` import specifiers (so Vite, Vitest and native Node all load it), `import type { ... }`, `as number` casts under `noUncheckedIndexedAccess`. Stepper must also be loadable by `scripts/check-core.mjs`. Note the letter ids for the stepper: end-of-word symbol is a separate id; "smallest left id" for letters reads as alphabetical (D-04), so assign ids in a way that makes the plain-language rule true (verify in the golden test).

### `src/core/stepper.test.ts` (test)

**Analog:** `src/core/toy.golden.test.ts` (lines 1-30).
```ts
import { describe, expect, it } from "vitest";
import { trainMerges } from "../../scripts/lib/bpe-train.ts";
...
describe("shipped merge list", () => {
  it("(a) ...", () => { expect(data.meta.merges).toBe(data.merges.length); ... });
```
Copy: lettered `it("(a) ...")` golden style, import of the trainer from `../../scripts/lib/`. Add the cross-check "stepper merge sequence equals `trainOnPieces` on the same pieces" (RESEARCH Gap 5) and the Sennrich golden (`low` 5, `lower` 2, `newest` 6, `widest` 3; `est` and `low` both emerge).

### `src/core/realTokenizer.ts` (service, transform)

**Analog:** `src/core/toy.ts` for module shape and `isValidUtf8` (lines 7-18); `src/core/types.ts` `Token` for the return shape (`{id, bytes, isPartial}`).

**Reuse:**
```ts
import { isValidUtf8 } from "./toy.ts";
import type { Token } from "./types.ts";
```
Core logic is in RESEARCH Gap 2 (`byteDecoder()` inverse of bytes_to_unicode; branch on `get_added_tokens_decoder()`; `encode(text, { add_special_tokens: false })` is mandatory; construct with `{}` as second arg). Rules: no `fetch`, no `import.meta.env` in `src/core` (native-Node loading); take already-parsed JSON; dynamic `await import("@huggingface/tokenizers")` only from the click handler or script; async `loadTokenizer(id)` wrapper in the Svelte-side loader, not here. Output tokens feed `groupBytes`/`chipText`/`tableCell` unchanged (verified in RESEARCH). Not a replacement symbol ever (FOUND-06).

### `src/core/realTokenizer.test.ts` and `adapter-parity.json` (test)

**Analog:** `src/core/toy.golden.test.ts` and `src/core/regression.test.ts` with `src/core/fixtures/regression-corpus.ts`. Golden fixture generated once by Python reference (RESEARCH Gap 1); header records the generator command and version. Test: ids and token strings equal the golden; sha256 of each `public/tokenizers/*.json` equals manifest; no `U+FFFD`/`Ġ`/`Ċ` in display.

### `scripts/precompute-comparison.ts` (script, batch)

**Analog:** `scripts/train-toy-bpe.ts` (lines 1-50): header comment documenting the npm usage, `--check` flag that exits non-zero when the committed file differs, `here()` URL helper, `sha256`, reading with `readFileSync(here("../..."))`, dated `Retrieved` meta, formatted deterministic JSON output.
```ts
const here = (rel: string): URL => new URL(rel, import.meta.url);
const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
const check = args.includes("--check");
...
if (check) { const committed = readFileSync(target, "utf8"); if (committed !== text) { console.error("..."); process.exit(1); } }
```
Add an npm script next to `"train:toy": "node scripts/train-toy-bpe.ts"` in `package.json` (line 24). Uses `EXAMPLES` from `src/core/examples.ts` (D-12), the toy, and the adapter. Embed `generatedAt` and tokenizer names/commits (TOK-09). A Vitest freshness test recomputes and deep-equals the fixture ignoring `generatedAt` (RESEARCH Gap 6); this mirrors the `--check` idea in `train:toy`.

### `src/components/BpeStepper.svelte` (component, event-driven)

**Analog:** `src/components/Playground.svelte` (lines 1-80 read).

**Imports/structure** (lines 1-22):
```svelte
<script lang="ts">
  import { onMount } from "svelte";
  ...
  import TokenDisplay from "./TokenDisplay.svelte";
  import TokenTable from "./TokenTable.svelte";
  // Not named `state`: a variable called `state` makes `$state` read as a store subscription.
  let phase = $state<"loading" | "ready" | "failed">("loading");
```
**Core pattern:** `$state` for the step index; `$derived` / `$derived.by(() => { try {...} catch { return {ok:false,...} } })` (lines 33-47) for the current step; error state with copy constant (line 22); one debounced `aria-live` message (lines 66-80) instead of announcing chips. Server-rendered as "loading" and flipped in `onMount` (so SSR works with `client:visible`). Trace is computed once by pure `trainBPE`; Next/Back/Reset/Run-to-end just move the index. Native `<button>`s, `<table>` for pair counts (D-03), `prefers-reduced-motion` handling, `data-*` hooks for e2e (Playground uses `data-playground`, `data-state`, `data-example`, `data-reset`, `data-table`). Chips reuse `TokenDisplay`/`Chip` styling; text only via interpolation, never `{@html}`.

### `src/components/Comparison.svelte` (component, request-response)

**Analog:** `src/components/Playground.svelte` (phase state machine: loading/ready/failed, `onMount`, text input, debounce) plus RESEARCH Gap 8 for the loader.

**Loader pattern (browser side only):**
```ts
const url = `${import.meta.env.BASE_URL}tokenizers/gpt2.json`; // keep this expression only in the Svelte-side loader
const { Tokenizer } = await import("@huggingface/tokenizers"); // inside the click handler
```
`import.meta.env.BASE_URL` precedent: `src/components/SiteHeader.astro` (`const home = import.meta.env.BASE_URL;`). Exactly two fetches (one `tokenizer.json` each); loading state, error state with "Try again"; typing alone never fetches. Curated rows render from the committed fixture before any click. Rows render via `TokenDisplay` with the `Token` shape; the fixture stores token bytes (serialise bytes as number arrays) so no tokenizer is needed pre-click.

### `src/components/LanguagesDemo.svelte` (component, transform)

**Analog:** `src/components/TokenTable.svelte` (text-readable table as primary accessible form) plus `TokenDisplay` for chips. Data from the committed fixture; labelled and dated (D-14, TOK-09). Include the conditional BERT `[UNK]` line and the accent-stripping note (RESEARCH Gap 7).

### `src/components/wrappers/StepperSection.astro`, `ComparisonSection.astro`, `LanguagesSection.astro`

**Analog:** `src/components/wrappers/PlaygroundSection.astro` (whole file, 11 lines):
```astro
---
// ... The heading id is fixed here because ids generated for headings inside MDX are fragile (research Pattern 4).
import Playground from "../Playground.svelte";
---
<section aria-labelledby="try-heading" class="playground-section">
  <h2 id="try-heading">Try it yourself</h2>
  <p><slot /></p>
  <Playground client:visible />
</section>
```
Copy exactly: fixed heading id per section, `<slot />` for prose, `client:visible` island (this also defers `@huggingface/tokenizers` and the download until visible; the load button stays explicit).

### `src/content/posts/what-is-a-token.mdx` (modify)

**Analog:** itself. Frontmatter (lines 1-6) and in-prose `<ToyTokens text=... expect=... />` usage (line ~22) with build-time claims. Reorder per D-16 (definition, stepper, playground, comparison, languages); soften "Common words are often a single token" (line 17) per D-17. Any new numeric or split claim in prose must go through `ToyTokens`/`assertClaims` (`src/components/prose/ToyTokens.astro` lines 1-30), never typed numbers.

### Tests: `e2e/privacy.spec.ts` (extend) and new e2e specs

**Analog:** `e2e/privacy.spec.ts` lines 1-40.
```ts
const urls: string[] = [];
page.on("request", (request) => urls.push(request.url()));
await page.goto("./");
const card = page.locator("[data-playground]");
await card.scrollIntoViewIfNeeded();
await expect(card).toHaveAttribute("data-state", "ready");
await page.waitForLoadState("networkidle");
const before = urls.length;
... await page.waitForTimeout(700);
expect(urls.slice(before)).toEqual([]);
```
RESEARCH "Code Examples" gives the extension: zero `/tokenizers/` requests before the click, exactly two after, none during typing, abort-route failure path. Note the existing test asserts all loads are same-origin: keep that. Also look at `e2e/controls.spec.ts` and `e2e/a11y.spec.ts` (axe) for stepper keyboard and a11y specs; `e2e/states.spec.ts` for loading/error state assertions.

### `scripts/check-deps.mjs` (modify)

**Analog:** itself, `ALLOW.dependencies` (lines 7-12). Add `"@huggingface/tokenizers": "0.2.0"` in the same task as `npm install --save-exact`; exact specifiers only, or `check:deps` fails (lines 28-37). Package is SUS-flagged by legitimacy seam: needs a human confirmation (RESEARCH).

## Shared Patterns

### Pure core, rendering-only components
**Source:** `src/core/*.ts`, `src/components/TokenDisplay.test.ts`. All logic (stepper trace, adapter, counts) lives in plain `.ts` with explicit `.ts` import specifiers and Vitest tests; Svelte only renders. SSR component tests use `render` from `svelte/server`, strip comments and scoped classes (`TokenDisplay.test.ts` lines 1-20) and the `U+FFFD` guard (`const REPLACEMENT = String.fromCodePoint(0xfffd)`).

### Shared chip display
**Source:** `src/components/TokenDisplay.svelte` (props `tokens, mode, showBytes, splitCount, compositeCount, legend, emptyState`), used in `ToyTokens.astro` line 31:
```svelte
<TokenDisplay tokens={tokens} mode="text" showBytes={false} splitCount={splitCount} compositeCount={compositeCount} legend={legend} emptyState={false} />
```
**Apply to:** stepper rows, comparison, languages. Note: `src/components/TokenDisplay.svelte` has uncommitted modifications in the working tree (git status at start); the planner should read the current file and not assume the committed version.

### Base-aware URLs
**Source:** `import.meta.env.BASE_URL` (`SiteHeader.astro`), `site.config.mjs`. Only in Svelte/Astro files, never in `src/core`. Extend `scripts/check-base.mjs` to run the comparison load spec under `/base-check` (it currently runs only `e2e/smoke.spec.ts`).

### Error/loading state machine
**Source:** `Playground.svelte` lines 20-30 (`phase`, `ERROR_COPY`, `$derived.by` with try/catch returning `ok:false`). **Apply to:** Comparison load, stepper trace.

### Deterministic committed artifacts with `--check`
**Source:** `scripts/train-toy-bpe.ts` + `src/core/toy/merges.json` meta (corpus sha256, retrieved date, tie-break text). **Apply to:** comparison fixture, tokenizer manifest (source repo, commit, licence, sha256, gzip size).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `public/tokenizers/gpt2.json`, `bert-uncased.json`, `manifest.json` | static asset | file-I/O | No `public/` assets exist yet. Copy byte-for-byte from the pinned HF commits listed in RESEARCH Gap 4; confirm BERT licence before shipping. |
| `src/core/fixtures/adapter-parity.json` generator | fixture | batch | Python reference run once (RESEARCH "Parity golden generator"); Python is not a project dependency. |

## Metadata

**Analog search scope:** `src/`, `scripts/`, `e2e/`, root config (via `git ls-files`).
**Files scanned/read:** about 14 (bpe-train.ts, train-toy-bpe.ts, types.ts, examples.ts, toy.ts, toy.golden.test.ts, Playground.svelte (partial), TokenDisplay.test.ts (partial), PlaygroundSection.astro, ToyTokens.astro, privacy.spec.ts, check-deps.mjs, package.json, the MDX head).
**Not read in detail** (planner should open before editing): `TokenDisplay.svelte`, `TokenTable.svelte`, `chars.ts`, `display.ts`, `claims.ts`, `controls.spec.ts`, `a11y.spec.ts`.
**Pattern extraction date:** 2026-10-06

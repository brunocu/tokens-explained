# Phase 3: Harden & Release - Pattern Map

**Mapped:** 2026-10-13
**Files analyzed:** 15 new/modified
**Analogs found:** 9 / 15 (the rest are config or docs, with RESEARCH.md as the source)

Phase 3 is release plumbing. Few files are new code, so most "analogs" are existing guards, config and docs to mirror in style. All analog paths below were taken from `git ls-files`, so they are tracked source.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `.github/workflows/deploy.yml` | config (CI) | batch / event-driven | none in repo; RESEARCH.md "Deploy workflow skeleton" | no analog |
| `public/favicon.svg` | asset | static | `public/tokenizers/` (only public asset dir) | weak |
| `src/layouts/BaseLayout.astro` (modify: icon link) | layout | request-response (build time) | itself, lines 17-27 (`<Font>`, canonical link) | exact |
| `playwright.config.ts` (modify: `E2E_BASE_URL` remote mode) | config | request-response | itself | exact |
| `flake.nix` (modify: add `pkgs.gitleaks`) | config | n/a | itself, line 29 | exact |
| `scripts/publish-squash.sh` (optional) | utility | batch | `scripts/check-base.mjs` (operational script style) | role-match |
| `scripts/check-dist.mjs` (modify only if reference hosts change) | utility | transform | itself, lines 43-50, 288-290 | exact |
| `.gitleaks.toml` (only if false positive) | config | n/a | none | no analog |
| `LICENSE`, `LICENSE-CONTENT` | docs | n/a | `public/tokenizers/NOTICE.md` ("downloaded, not retyped") | role-match |
| `README.md` | docs | n/a | `.claude/CLAUDE.md` content, `flake.nix` header comment | partial |
| `public/tokenizers/NOTICE.md` (modify: fonts, BERT archived note) | docs | n/a | itself | exact |
| `src/content/posts/what-is-a-token.mdx` (modify: inline "as of" dates) | content | transform | itself (`<Cite>`, `<Fact>`, `<Reference>` components) | exact |
| `03-CHECKLISTS.md`, `03-READER-QUESTIONNAIRE.md`, `03-FACT-CHECK.md`, `03-KNOWN-LIMITATIONS.md` | docs | n/a | `.planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-UAT.md` | role-match |
| `.planning/config.json` (modify `git.branching_strategy` to `"phase"`) | config | n/a | itself | exact |
| `.gitignore` (maybe add `.planning/milestone.lock`) | config | n/a | itself | exact |

## Pattern Assignments

### `src/layouts/BaseLayout.astro` (layout, build-time)

**Analog:** itself. Add the icon link next to the existing `<head>` entries (lines 19-26). Use `import.meta.env.BASE_URL` (ends with a slash because `trailingSlash: "always"`, per RESEARCH Pitfall 2) so the URL is base-aware and `check:dist` can verify the target exists.

```astro
<meta name="color-scheme" content="light dark" />
<title>{title}</title>
{description && <meta name="description" content={description} />}
{canonical && <link rel="canonical" href={canonical} />}
<!-- add: -->
<link rel="icon" type="image/svg+xml" href={`${import.meta.env.BASE_URL}favicon.svg`} />
```

Note: Playwright headless Chromium never requests favicons, so smoke test (d) cannot catch a missing icon. Verify with Lighthouse "errors-in-console" instead.

### `playwright.config.ts` (config, remote mode for D-08 live run)

**Analog:** itself, lines 9-23. The `url` is computed from `site.config.mjs` `base`; `webServer` always starts `astro preview`. Add an `E2E_BASE_URL` branch: when set, use it (trailing slash) as `use.baseURL` and set `webServer: undefined`.

```ts
const port = process.env.E2E_PORT ?? "4321";
const url = `http://localhost:${port}${base === "/" ? "/" : `${base}/`}`;
...
use: { baseURL: url },
webServer: { command: `npx astro preview --ignore-lock --port ${port}`, url, reuseExistingServer: !process.env.CI, timeout: 60_000 },
```

Keep the file's comment style (rule comments at top). Do not change the `test:e2e` script, which runs `scripts/check-env.mjs --playwright` first (package.json line 14), so a remote-mode run still needs the Nix shell.

### `flake.nix` (config)

**Analog:** itself, line 29: `packages = [ pkgs.nodejs_24 ];` becomes `packages = [ pkgs.nodejs_24 pkgs.gitleaks ];`. Do not touch the nixpkgs revision (line 24), or `check-env` and the Playwright pin break. Header comment style: explain the why in a comment above (lines 1-20).

### `.github/workflows/deploy.yml` (config, CI)

**Analog:** none in repo (no `.github/`). Use RESEARCH.md "Deploy workflow skeleton" (lines 314-389) verbatim as the base. Repo facts the workflow must match:

- Script names (package.json lines 6-22): `check:deps`, `check:repo`, `check`, `check:svelte`, `test`, `build`, `check:dist`, `test:e2e`.
- `test:e2e` runs `node scripts/check-env.mjs --playwright`, which needs `PLAYWRIGHT_BROWSERS_PATH`, `PLAYWRIGHT_NIX_VERSION` (equal to the npm pin) and Node 24. The workflow derives them (RESEARCH Pattern 2) and runs `npx playwright install --with-deps` with no browser arguments.
- Env comes from `site.config.mjs` (lines 28-30): `SITE_URL`, `SITE_BASE` (and `SITE_OUT_DIR`, leave unset so output is `dist`).
- Single build in `test` job, upload `dist` with `actions/upload-pages-artifact@v5`; `permissions: contents: read` at workflow level, `pages: write` + `id-token: write` only on `deploy`.

### `scripts/publish-squash.sh` (optional utility, batch)

**Analog:** `scripts/check-base.mjs` for header-comment/usage style (not read in detail). Content comes from RESEARCH.md "Squash of the existing history" (lines 392-412): `git commit-tree "$c^{tree}" -p $parent` per boundary commit (`1588263`, `b26685a`, `0d669b2`, `50fc088`, `ec44a26`, HEAD), tree-equality check, then `gitleaks git` and `gitleaks dir`. Note the repo convention that file creation uses the Write tool, not heredocs. Verify boundary hashes again at execution time.

### `scripts/check-dist.mjs` (modify only if reference hosts change)

**Analog:** itself, lines 43 and 50, with self-test counts at lines 288-290.

```js
export const ALLOWED_EXTERNAL_LINK_HOSTS = ["www.ohchr.org", "www.un.org"];
export const ALLOWED_REFERENCE_LINK_HOSTS = [ ... ];  // 17 entries
...
if (ALLOWED_REFERENCE_LINK_HOSTS.length !== 17) throw new Error("self-test: the references allow-list must hold exactly seventeen hosts");
```

Any added/removed host must change the list and the count in `selfTest` together.

### `LICENSE`, `LICENSE-CONTENT`, `public/tokenizers/NOTICE.md`

**Analog:** `public/tokenizers/NOTICE.md` lines 1-14: plain header stating sources and "downloaded and not retyped", per-item section (Repository, Commit, Source URL, Licence, fenced licence text). For fonts (OFL-1.1, RESEARCH Pitfall 6) add a section in the same shape. Download CC BY 4.0 legal text from `https://creativecommons.org/licenses/by/4.0/legalcode.txt`; do not retype. README and footer must carve out `public/tokenizers/*`, fonts, the Garnett translation and UDHR text.

### `src/content/posts/what-is-a-token.mdx` (D-19 inline dates)

**Analog:** itself. Dated facts currently live in the References list (`src/components/prose/Reference.astro`, `References.astro`) with access dates; D-19 wants the date inside the claim sentence. Use the existing prose components (`Cite.astro`, `Fact.astro`) and keep `src/core/claims.ts` / `post-content.test.ts` green (they assert quoted claims). Read these before editing; I did not extract their excerpts.

### Checklist and questionnaire docs

**Analog:** `.planning/phases/02-bpe-stepper-real-tokenizer-comparison/02-UAT.md`: YAML frontmatter (`status`, `phase`, `source`, `started`, `updated`), then numbered `### N. Title` blocks each with `expected:` and `result:` lines, and a `## Summary` count table plus `## Gaps`.

```markdown
### 2. Inherited human checks (DEFERRED-FROM-PHASE-2.md section 6)
expected: Each passes or a defect is logged. ...
result: pass
```

Reuse this for `03-CHECKLISTS.md` (screen reader, colour-blind, real phone, print/zoom, offline comparison, own-text block, live smoke), with `result: not verified` allowed per D-15. Write plain-language explanations (author asked what Lighthouse is). Reader questionnaire is open-ended; no scoring. `03-KNOWN-LIMITATIONS.md` collects the "not verified" items. Checklist content sources: RESEARCH.md lines 497-501 and the DEFERRED-FROM-PHASE-*.md files.

## Shared Patterns

### Base-aware URLs
**Source:** `site.config.mjs` + `astro.config.mjs`; `import.meta.env.BASE_URL`.
**Apply to:** favicon link, README links, any new page asset. `check:dist` rejects root-absolute URLs outside the base.

### Guard scripts run in the Nix shell
**Source:** `scripts/check-env.mjs` header (lines 1-11): `nix develop --command COMMAND`.
**Apply to:** every checklist command; CI replaces the shell with env vars derived from package.json.

### No new npm dependency
**Source:** `scripts/check-deps.mjs` exact allow-list.
**Apply to:** Lighthouse (one-off `npx lighthouse@13.5.0`, not installed), gitleaks (Go binary), everything else. No plan may add a dependency.

### Tracked-source and push safety
**Apply to:** squash/publish plans. Push `main` only; never `--all`, `--mirror`, `--tags`. Archive as a local tag plus off-repo bundle. Run `git push --dry-run origin main` first.

### Commit conventions
Commits end with the Co-Authored-By attribution line from the session reminder.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `.github/workflows/deploy.yml` | CI config | event-driven | No `.github/` exists; use RESEARCH.md skeleton |
| `.gitleaks.toml` | config | n/a | Not needed today (scan is clean); create only for a justified false positive |
| `README.md` | docs | n/a | No README exists; content from CONTEXT D-05 and RESEARCH lines 521-527 |
| Optional bundle-size script | utility | transform | Proposed budget (RESEARCH lines 472-481) is report-only; if wanted, model on `scripts/check-dist.mjs` structure (exported pure functions plus `--self-test`) |

## Metadata

**Analog search scope:** repo root, `scripts/`, `src/layouts/`, `public/`, `e2e/` listing, prior-phase UAT docs
**Files scanned:** about 10 read, 100 listed
**Pattern extraction date:** 2026-10-13

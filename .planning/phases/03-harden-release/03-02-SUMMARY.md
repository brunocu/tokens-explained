---
phase: 03-harden-release
plan: 02
subsystem: release
tags: [favicon, licences, readme, ofl, footer, github-pages-base]
requires:
  - phase: 03-harden-release
    provides: "03-01 history squash and decisions (publishing name)"
provides:
  - "Base-aware SVG favicon plus a spec that actually requests it"
  - "MIT LICENSE, unaltered CC BY 4.0 LICENSE-CONTENT, README with licence split and carve-outs"
  - "OFL-1.1 notice for Source Serif 4 and JetBrains Mono shipped in public/"
  - "Plain-text licence footer on every page, no links"
affects: [03-03, 03-04, 03-05, release]
commits: 3
plan_head_before: 6c332a7e0d30d0d9bb1c54f1b9e9a65929274fe1
plan_head_after: 232377c212bdb3bac844aee3eb4bb26a99b149d8
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Icon and asset URLs built from import.meta.env.BASE_URL (ends in a slash, trailingSlash always)"
key-files:
  created:
    - public/favicon.svg
    - e2e/favicon.spec.ts
    - LICENSE
    - LICENSE-CONTENT
    - README.md
    - public/NOTICE-fonts.md
    - src/components/SiteFooter.astro
  modified:
    - src/layouts/BaseLayout.astro
key-decisions:
  - "Licence texts were downloaded (SPDX MIT.txt, creativecommons legalcode.txt, upstream OFL files), never retyped; the MIT placeholder was filled with 2026 and brunocu per 03-DECISIONS.md"
  - "OFL notice cites the Adobe upstream copyright line for Source Serif 4 and also records the different line in the google/fonts copy that Fontsource derives from"
requirements-completed: [FOUND-01]
duration: 20min
completed: 2026-10-13
status: complete
---

# Phase 3 Plan 02: Favicon, licences, README and footer Summary

**Production-base favicon proven by a real request, MIT plus CC BY 4.0 licence files with a README stating the carve-outs, an OFL-1.1 font notice, and a link-free licence footer.**

## Accomplishments

- Tracer: the favicon goes through layout, build, `check:dist` and preview under `/tokens-explained`. The new `e2e/favicon.spec.ts` failed first (no icon link), then passed; it requests the icon because headless Chromium never does, so smoke test (d) could not see a missing one. Built page has `<link rel="icon" type="image/svg+xml" href="/tokens-explained/favicon.svg">`.
- `LICENSE` (MIT, 2026, brunocu), `LICENSE-CONTENT` (18,657 bytes, unaltered legalcode.txt), `README.md` (what it is, live URL, duplicate home page on purpose, local run and check scripts, Fontsource build dependency, squash-merge release flow, licence split with the five carve-outs).
- `public/NOTICE-fonts.md`: five bundled files confirmed (Source Serif 4 at 400 and 600 in normal and italic, JetBrains Mono 400), licence confirmed OFL-1.1 on api.fontsource.org on 2026-10-13, full OFL text from each upstream. OFL section 2 was read: it requires the copyright notice and licence to accompany each redistributed copy, which this file provides (research assumption A2 now verified).
- `SiteFooter.astro` rendered after `main` in `BaseLayout.astro`; plain text, no anchors.

## Task Commits

1. Task 1 (tracer): `4e9e4d6` feat(03-02): add base-aware favicon with request spec
2. Task 2: `f3995f8` docs(03-02): add licences, README and font notice
3. Task 3: `232377c` feat(03-02): add plain-text licence footer

## Verification

- Production base (`SITE_BASE=/tokens-explained`): build, `check:dist` OK (4 files, 38 URLs), favicon and smoke specs 5/5 on chromium.
- After the footer: `npm run check` 0 errors, `check:svelte` 0 errors, `check:repo` OK, `npm test` 813 passed, a11y, a11y-phase2, post and widget-layout specs 117/117 on chromium.
- `package.json` and `package-lock.json` unchanged.

## Deviations from Plan

None in scope. Process note: `public/NOTICE-fonts.md`, `LICENSE` and `LICENSE-CONTENT` were assembled by shell download and concatenation (curl, cat) rather than the Edit/Write tools, deliberately, so the legal texts are byte-for-byte upstream rather than retyped through the model. All hand-authored files used Write/Edit.

## Notes for later plans

- Only chromium was run for the e2e specs, as the plan's verify commands specify; the full three-browser suite is a pre-merge step.
- Source Serif 4 carries the Reserved Font Name "Source" in the upstream copyright line. The site serves the Fontsource files unmodified and does not rename them; the README and notice make no claim beyond the quoted sources.
- The README says history was squashed before the first push; this matches 03-01.

## Known Stubs

None.

## Threat Flags

None. The favicon is a same-origin file, the footer adds no links, and `check:dist` stays green.

## Self-Check: PASSED

All created files exist; commits 4e9e4d6, f3995f8 and 232377c are in the log.

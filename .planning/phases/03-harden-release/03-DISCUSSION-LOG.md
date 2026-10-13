# Phase 3: Harden & Release - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-13
**Phase:** 03-harden-release
**Areas discussed:** Repository and publishing, CI and deploy gates, Performance, Accessibility and manual checks, Fact re-verification, Reader testing

---

## Repository and publishing

| Option | Description | Selected |
|--------|-------------|----------|
| brunocu/tokenizer-vis | Matches local folder | |
| Reader-friendly name | Chosen for readers (e.g. what-is-a-token) | ✓ (after discussion) |
| Custom domain | Root domain, base '/' | |

**User's choice:** Reader-friendly; after candidates (`what-is-a-token`, `tokens-explained`, `tokenizer-vis`) chose `tokens-explained`.

| History option | Selected |
|----------------|----------|
| A. Push everything as is | |
| B. Push history, untrack .planning going forward | |
| C. Fresh squashed history without .planning | |
| Custom: squashed main as feature-PR-like commits, keep .planning, small commits local | ✓ |

**User's choice:** Asked for pros and cons, then proposed a squashed `main` that keeps `.planning/`, with small commits kept locally. Existing 240 commits: (a) squash into per-phase baseline commits. Ongoing merges: squash locally (no GitHub PRs).
**Notes:** Licence: MIT for code, CC BY 4.0 for prose.

---

## CI and deploy gates

| Option | Description | Selected |
|--------|-------------|----------|
| Test job gates deploy job | Full suite on push to main gates deploy | ✓ |
| Also run CI on phase branches | Extra triggers | |
| Local gate only | CI just builds and deploys | |

**User's choice:** Test job gates deploy. Post-deploy automated live check: "not needed" (manual one-off interpretation). Secret scan: use an existing tool (e.g. gitleaks).

---

## Performance

**User's choice:** Initial-load budget: measure first, Claude decides. Asked what a Lighthouse score is (explained); chose report only, no target. No-network check: one-off manual.

---

## Accessibility and manual checks

**User's choice:** Screen reader pass, colour-blind simulation, real phone check (print/zoom not selected, handled lightly). Unperformable checks recorded as "not verified" and ship. Blocking issues fixed, minor ones case by case.

---

## Fact re-verification

**User's choice:** Automated research pass with exception review. Dates inline in post text. Verify splits once now, no build-time test.

---

## Reader testing

**User's choice:** Two readers read alone, then a short questionnaire. Open feedback only. Deploy first, test after, fix in updates.

---

## Claude's Discretion

Squash grouping details, archive ref name, README, workflow layout, GSD ship/complete adaptation, secret-scan tool integration, questionnaire and checklist forms.

## Deferred Ideas

FACT-02 build-time split checks; permanent no-network CI test; automated live checks; Lighthouse targets; SEO/404/analytics/announcement; all v1.1 content.

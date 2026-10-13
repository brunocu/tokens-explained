# Phase 3: Pre-release decisions

Recorded 2026-10-13 from the plan 03-01 decision checkpoint. Plans 03-04 and 03-05 read this file.

## 1. Publishing identity

- **Date:** 2026-10-13
- **Choice:** name `brunocu`, email `brunocu@msn.com` (the real address, not a GitHub noreply address).
- **Rationale:** The author chose this explicitly, knowing the address becomes permanently public in commit metadata once main is pushed (T-03-09 accepted).

## 2. .planning/milestone.lock

- **Date:** 2026-10-13
- **Choice:** untrack (`git rm --cached`, file stays on disk) and add the path to `.gitignore`.
- **Rationale:** GSD rewrites the file every session (session id and pid); tracking it dirties the tree and publishes churn.

## 3. Workflow layout

- **Date:** 2026-10-13
- **Choice:** one gating build job that uploads the exact tested `dist`.
- **Rationale:** The deployed bytes are the tested bytes; avoids the second `npm install` and rebuild of `withastro/action` (research Pitfall 4). Satisfies D-07.

## 4. Performance budget enforcement

- **Date:** 2026-10-13
- **Choice:** report only, no failing gate.
- **Rationale:** Matches D-11; the proposed thresholds stay informational.

## 5. Playground loading

- **Date:** 2026-10-13
- **Choice:** keep `client:load`.
- **Rationale:** The textbox is the main call to action; research Lighthouse run showed LCP 1.5 s and TBT 80 ms.

## Asked later

The push go/no-go is asked in plan 03-07, and the inline-dates wording in plan 03-03.

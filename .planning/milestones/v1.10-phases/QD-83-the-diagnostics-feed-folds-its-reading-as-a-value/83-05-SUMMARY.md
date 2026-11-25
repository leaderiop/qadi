---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
plan: 05
subsystem: devtools
tags: [breaking, diagnostics, changeset, upgrade-guide, gate-14]
requires:
  - phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
    provides: Diagnostics.ts (plan 04), the feed characterisation and the pinned check (plans 01 to 03)
provides:
  - Diagnostics holds the four sampled fields; DiagnosticsReading.questions kept; the removal pinned at six layers and announced
affects: [83-06, 83-07, 83-08, 83-09, 83-10, 83-11]
phase_base: bc02e8e625eed08227910dfdfd4544ae66ed23ca
plan_head_before: 5062cb988ddd0436b2f3c3482dd1ff87ef6d003e
plan_head_after: 36f5abd37c44dcd1d7a548f2ffb2a784f62b0da4
actuals:
  tokens: 15000
  tasks: 3
  commits: 2
tech-stack:
  added: []
  patterns: [pins seen red on the base, then landed with the change that makes them pass]
key-files:
  created:
    - packages/devtools/test/model/DockModel.reading.test.ts
    - .changeset/devtools-diagnostics-has-no-questions.md
  modified:
    - packages/devtools/src/model/Diagnostics.ts
    - packages/devtools/test/model/Diagnostics.test.ts
    - packages/devtools/test/model/Diagnostics.tst.ts
    - packages/devtools/test/model/DiagnosticsFeed.test.ts
    - packages/devtools/test/surface.tst.ts
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - apps/website/src/content/docs/docs/packages/devtools.md
    - packages/devtools/README.md
    - scripts/check-package-install.mjs
    - spec/overview.md
    - spec/README.md
key-decisions:
  - "Every pin was written first and seen red on the renamed base, then committed together with the removal so each commit is green"
requirements-completed: []
duration: 25min
completed: 2026-11-25
status: complete
---

# Phase 83 Plan 05: Diagnostics carries only what the poll samples Summary

`Diagnostics.questions` is removed: `Diagnostics` and `noDiagnostics` hold `wiring`, `activity`, `hydration` and
`portCalls`, `mergeReading`, the store and the poll carry no `questions`, and `DiagnosticsReading.questions` (read by the dock's
questions join) is unchanged.

## What was done

- **Pins, seen red on the base** (recorded in `83-RED-EVIDENCE.md`, `## 83-05 the removal pins`): the type pin and the root
  pin (with `keyof Diagnostics` exactly four names), the `mergeReading` case, the engine's four-key sample, `F2`, and `MR1`
  in the new `DockModel.reading.test.ts`. The twins (`DiagnosticsReading` has `questions`, twice) and `MR2` (the questions
  store lists a supplied list on the same configure) were green on the base. Both flips are recorded with their before and
  after text; the pinned check reports the `F2` flip applied.
- **Removal** in `Diagnostics.ts` (the field, `noDiagnostics`, `mergeReading`, the store's `keep` and `===` clause, the
  poll's `questions: undefined`), with the doc comments restated; the tests that named the field lost those lines.
- **Announced**: a Breaking minor changeset of `@qadi/devtools`, the `0.13: Diagnostics has no questions field` upgrade entry
  (compiled after fence), the README and website text, the three overview rows (`spec-revise`, overview 1.145) and the
  CCR-QD-475 row (README 1.399).
- **Packed consumer** (`scripts/check-package-install.mjs`): `["Diagnostics", "questions"]` in `REFUSED_SHAPE_PROBES`, a refused
  `Diagnostics` literal under `@ts-expect-error`, and an `expect` that the packed feed's live reading has no `questions` key.

## Commits

- `6cb3e499` refactor(83-05)!: Diagnostics carries only what the poll samples
- `36f5abd3` docs(83-05): the upgrade entry, the overview rows and the packed consumer for the removed questions field

## Verification

`tsc -p tsconfig.test.json`, the devtools suite (1954 passed), `pnpm test:tstyche packages/devtools/test` (53 passed, both
passes), house style (612 files clean), website doc examples (77), spec doc examples (119), api-surface 942,
`verify-traceability.sh --strict` FAIL: 0, `spec-revise --check`, and the phase's `trailers`, `scan-ids`, `scan-forbidden`
and `83-pinned-check.mjs --all-applied` pass. Gate 14 itself was not run here (the plan runs it at the close); the script
parses (`node --check`).

## Deviations from Plan

**1. [Rule 3 - Blocking] Pinned check order.** Task 2's verify runs `83-pinned-check.mjs --all-applied` before the commit,
but that mode requires the new `DockModel.reading.test.ts` to be born in a commit. It was run without `--all-applied` before
the commit (6 files hold their base text, 1 of 1 flips applied) and with `--all-applied` after it (2 of 2 born files held).

## Known Stubs

None.

## Self-Check: PASSED

Both commits are ancestors of HEAD and carry the Opus trailer (`trailers` passed), the new files exist, and
`git diff --quiet HEAD -- packages scripts` holds.

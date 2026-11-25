---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
plan: 04
subsystem: devtools
tags: [rename, registers, spec, diagnostics]
requires:
  - phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
    provides: 83-check.mjs stale-path and registers, 83-pinned-check.mjs, the characterisation from plans 01 to 03
provides:
  - Diagnostics.ts, Diagnostics.test.ts and Diagnostics.tst.ts as git renames of the DiagnosticsStore files, every importer and register in step, CCR-QD-475 begun
affects: [83-05, 83-06, 83-07, 83-08, 83-09, 83-10, 83-11]
phase_base: bc02e8e625eed08227910dfdfd4544ae66ed23ca
plan_head_before: 626b5225ae29ddc6a8d5c29d88794d8ccce23d60
plan_head_after: 77247c8f
actuals:
  tokens: 12000
  tasks: 3
  commits: 1
tech-stack:
  added: []
  patterns: [one pure rename commit carrying every register]
key-files:
  created: []
  modified:
    - packages/devtools/src/model/Diagnostics.ts
    - packages/devtools/test/model/Diagnostics.test.ts
    - packages/devtools/test/model/Diagnostics.tst.ts
    - scripts/check-house-style.mjs
    - AGENTS.md
    - spec/README.md
key-decisions:
  - "The two barrels' export groups for Diagnostics.ts were moved ahead of DiagnosticsFeed.ts, because the devtools-named-barrel rule keeps groups in module-path order and the new path sorts first"
requirements-completed: []
duration: 15min
completed: 2026-11-25
status: complete
---

# Phase 83 Plan 04: DiagnosticsStore.ts renamed to Diagnostics.ts Summary

One commit (`77247c8f`) renames the module and its two test files with history intact (`git log --follow` reaches seven
commits), moves every importer, the four doc comments and every register, and changes no identifier or behaviour.

## What was done

- **Moves.** `DiagnosticsStore.ts`, `.test.ts` and `.tst.ts` are recorded as renames (`Diagnostics.ts` at 100 percent, the
  two test files with one import line each). No shim at the old path.
- **Importers.** 22 source and test files changed only their specifier. Doc comments restated: `DiagnosticsFeed.ts:144`,
  `useDiagnostics.test.tsx:6`, `ExternalStore.ts:5-6` (now "the diagnostics store in `Diagnostics.ts`") and `Gates.ts:38-40`
  (now names the gates feed and ADR-QD-169).
- **Registers.** `NOT_CALLABLE_PIN_BUDGET` key (still 3 and 0), the AGENTS.md §6 row (still `| 3 | 0 |`), `spec/traceability.md`
  (five lines plus the brace-list member on line 70), BEH lines in doc 28, seven INV lines, five `spec/overview.md` rows.
  Four spec documents revised through `spec-revise` (28: 1.71, invariants: 1.224, traceability: 1.319, overview: 1.144),
  `spec/README.md` 1.398 with the CCR-QD-475 row after CCR-QD-474.
- **Old-path mentions accounted for.** The 41 live lines plus the brace list were all moved. Kept deliberately as history:
  `spec/README.md` CCR rows 447, 451, 453, 240, 200, ADR-QD-169 line 100 and ADR-QD-173 line 53 (decision text), the
  `spec/traceability.md` Change History cell naming the old name, the changeset and `packages/devtools/CHANGELOG.md`. The
  identifiers `DiagnosticsStore` and `makeDiagnosticsStore` keep their names everywhere (barrel, `surface.tst.ts`, the
  website's `upgrading.md`, tests), as the plan requires.

## Verification at the commit

Devtools suite 89 files and 1952 tests, `tsc -p tsconfig.test.json`, `pnpm test:tstyche` (77 files, both passes), house
style (611 files clean), api-surface 942, `verify-traceability.sh --strict` FAIL: 0, `spec-revise --check`, and the phase's
`trailers`, `scan-ids`, `scan-forbidden`, `stale-path`, `registers`, `83-pinned-check.mjs` and `83-earlier-checks.mjs` all pass.

## Deviations from Plan

**1. [Rule 3 - Blocking] Barrel group order.** `scripts/check-house-style.mjs`'s `[devtools-named-barrel]` rule failed on
`src/index.ts` and `src/react/index.ts` once the path became `Diagnostics.ts`, which sorts before `DiagnosticsFeed.ts`. The
Diagnostics groups were moved ahead of the DiagnosticsFeed groups in both barrels (same lines, new order; no name changed).
Task 3's purity regex lists these lines as added and removed, which is why it was run by hand with that exception.

## Known Stubs

None.

## Self-Check: PASSED

The three new paths exist, no old path exists, HEAD `77247c8f` is an ancestor of itself and holds the Opus trailer
(`trailers` passed), and `git status` shows nothing uncommitted under `packages`, `spec`, `scripts` and `AGENTS.md`.

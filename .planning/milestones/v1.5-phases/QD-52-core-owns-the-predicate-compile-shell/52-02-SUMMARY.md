---
phase: QD-52-core-owns-the-predicate-compile-shell
plan: 02
subsystem: testing
tags: [characterisation, predicate-sql, predicate-prisma, compile-shell]
requires: [52-01]
provides:
  - "packages/predicate-sql/test/CompileShell.test.ts (47 tests, green on the base)"
  - "packages/predicate-prisma/test/CompileShell.test.ts (21 tests, green on the base)"
affects: [52-03, 52-05]
key-files:
  created:
    - packages/predicate-sql/test/CompileShell.test.ts
    - packages/predicate-prisma/test/CompileShell.test.ts
  modified: []
status: complete
plan_head_before: dde0d90bb4893700252b66db21214df6139faded
plan_head_after: 9634bf35e11e801a26b611e25aff56e34431b7d8
commits: 2
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
completed: 2026-11-16
requirements-completed: [WX-01, WX-06]
---

# Phase 52 Plan 02: Compile-shell characterisation on the base

Both dialects' compile shells are pinned through their public entry points, green on the untouched base, before any `packages/*/src` change.

## Results

- `packages/predicate-sql/test/CompileShell.test.ts`: 47 of 47 green (commit `2c638fd7`).
- `packages/predicate-prisma/test/CompileShell.test.ts`: 21 of 21 green (commit `9634bf35`).
- Both files copied verbatim from 52-RESEARCH.md Appendix A and B; no row edited.
- `tsc -p tsconfig.test.json` and `pnpm lint` pass; no `packages/*/src` change since `phase_base` 42b92cc3.
- Import/literal check (only allowed imports, no `toRenderable`/`compilePredicate` outside strings, no `"qadi_` literal, no metric declaration): clean for both files.
- `pnpm check:pr < /dev/null`: exit 0, 16 of 17 steps ran (`pnpm mutation` skipped by design, typecheck through spec:publish all green).

## Deviations from Plan

None - plan executed exactly as written. (`plan_head_before` is the pre-plan HEAD `dde0d90b`; the per-plan ledger file was not created because the commit-ledger step was not run before the first commit, the base was read from `git log`.)

## Known Stubs

None.

## Self-Check: PASSED

Both test files exist; commits 2c638fd7 and 9634bf35 are ancestors of HEAD.

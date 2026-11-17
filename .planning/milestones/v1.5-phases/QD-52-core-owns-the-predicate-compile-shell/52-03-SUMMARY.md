---
phase: QD-52-core-owns-the-predicate-compile-shell
plan: 03
subsystem: core
tags: [compile-shell, compilePredicate, predicate-sql, predicate-prisma, overview]
requires: [52-02]
provides:
  - "compilePredicate, CompilePredicateOptions<A>, CompileOutcomes in @qadi/core (RenderablePredicate.ts)"
  - "compileSql and compilePrismaWhere reduced to rules, renderer and own counter"
  - "spec/overview.md rows for the three new exports (gate 13 at 935)"
affects: [52-04, 52-05]
key-files:
  created:
    - packages/core/test/CompilePredicate.test.ts
  modified:
    - packages/core/src/RenderablePredicate.ts
    - packages/predicate-sql/src/index.ts
    - packages/predicate-sql/src/CompileMetrics.ts
    - packages/predicate-prisma/src/index.ts
    - packages/predicate-prisma/src/CompileMetrics.ts
    - spec/overview.md
decisions:
  - "A Prisma compile counts compiled after the render (D-06a); the rationale sits in a code comment in the function body, not the doc comment, so the emitted declaration stays byte-identical to the base"
status: complete
plan_head_before: ca2cc976f81da5a60c67dda2f61115042ba91383
plan_head_after: 3b3454a06852393d0325d5de8bad2f03b78f092b
commits: 5
actuals:
  tokens: 16000
  tasks: 3
  commits: 5
completed: 2026-11-16
requirements-completed: [WX-01, WX-03, WX-04]
---

# Phase 52 Plan 03: compilePredicate, the compile shell in core

The compile shell (two defaults, `toRenderable`, refused then compiled counting) is one plain core function; both dialects call it and keep only their rules, renderer and counter.

## RED

`vitest run --project core packages/core/test/CompilePredicate.test.ts` on the committed test alone: `Tests  8 failed (8)`, each `TypeError: compilePredicate is not a function` (vitest does not typecheck, so the import failure surfaces at call time).

## Test counts

| After commit | Result |
| --- | --- |
| `bb847c95` core | CompilePredicate 8 of 8, RenderablePredicate 43, 51 total |
| `2770e817` SQL | predicate-sql project 103 green, SQL CompileShell 47 of 47 |
| `05de323d` Prisma | predicate-prisma project 95 green, Prisma CompileShell 21 of 21, SQL CompileShell 47, CompilePredicate 8 |

Both CompileShell files have exactly one commit since the phase base (their `test(52-02)` commit): byte-unchanged.

## Gates

- gate 13: `api-surface: 935 export(s) documented across 9 package(s)`
- gate 14: `package-install: 9 package(s) pack, resolve and authorize (523 runtime export(s))`
- house style: `542 file(s) clean (3 declared switch(es))`; `git diff phase_base -- scripts/check-house-style.mjs AGENTS.md` empty
- `pnpm circular`: no cycle; `tsc -b`, `tsc -p tsconfig.test.json`, `pnpm lint` clean
- declarations: `predicate-sql/lib/index.d.ts` 09b6a5b9... and `predicate-prisma/lib/index.d.ts` 8986d556... equal 52-01's `## Base declarations` lines
- scoped grep over both `index.ts` for `?? "Ascii"|DEFAULT_MAX_IN_VALUES|Metric.update|tapError|toRenderable(`: no output
- `pnpm check:pr < /dev/null`: exit 0, 16 of 17 steps (`pnpm mutation` skipped by design)

## Commits

- `413473f2` test(52-03): compilePredicate, RED by import
- `bb847c95` feat(52-03): compilePredicate, the compile shell in core
- `2770e817` refactor(52-03): compileSql through compilePredicate
- `05de323d` refactor(52-03): compilePrismaWhere through compilePredicate, compiled counted after render
- `3b3454a0` docs(52-03): name the compile shell's exports in the overview

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's Prisma doc-comment sentence changed the emitted declaration**
- **Found during:** Task 3 declaration-hash gate
- **Issue:** Task 2 step 1 asked for one sentence in `compilePrismaWhere`'s doc comment, but doc comments are emitted into `lib/index.d.ts`, so the Prisma declaration hash differed from the base while the plan requires byte-identity.
- **Fix:** Moved the sentence (D-06a, compiled counted only after render) to a `//` comment inside the function body. Rebuilt the Prisma and overview commits (local, unpushed) so the one-commit-per-file verifies still hold; hashes above are the rebuilt ones.
- **Files modified:** packages/predicate-prisma/src/index.ts
- **Commit:** 05de323d

No other deviations. The per-plan commit ledger was created before the first commit.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or trust-boundary surface; no dependency added.

## Self-Check: PASSED

Created and modified files exist; commits 413473f2, bb847c95, 2770e817, 05de323d and 3b3454a0 are ancestors of HEAD.

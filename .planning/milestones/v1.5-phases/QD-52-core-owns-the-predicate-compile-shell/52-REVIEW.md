---
phase: QD-52-core-owns-the-predicate-compile-shell
reviewed: 2026-11-16T19:55:00Z
depth: standard
iteration: 2
files_reviewed: 21
files_reviewed_list:
  - .changeset/core-compile-predicate.md
  - .changeset/predicate-prisma-compile-shell-in-core.md
  - .changeset/predicate-sql-compile-shell-in-core.md
  - .planning/phases/QD-52-core-owns-the-predicate-compile-shell/tools/mutation.mjs
  - .planning/phases/QD-52-core-owns-the-predicate-compile-shell/tools/scan.mjs
  - packages/core/src/RenderablePredicate.ts
  - packages/core/test/CompilePredicate.test.ts
  - packages/core/test/CompilePredicate.tst.ts
  - packages/predicate-prisma/src/CompileMetrics.ts
  - packages/predicate-prisma/src/index.ts
  - packages/predicate-prisma/test/CompileShell.test.ts
  - packages/predicate-sql/src/CompileMetrics.ts
  - packages/predicate-sql/src/index.ts
  - packages/predicate-sql/test/CompileShell.test.ts
  - spec/README.md
  - spec/behaviors/31-predicate-compilation.md
  - spec/decisions/165-core-owns-the-predicate-compile-shell.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase QD-52: Code Review Report (iteration 2)

**Reviewed:** 2026-11-16T19:55:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** clean

## Summary

Every iteration-1 fix is correct and complete, and the final pass over the phase's whole non-planning diff found no defect.

**WR-01 (closed `rules` type).** `rules` is now `Omit<RenderRules, "identifiers" | "maxInValues"> & { identifiers?: never; maxInValues?: never }` (`RenderablePredicate.ts:540-543`). A full `RenderRules` value no longer type-checks, so a dialect's own `maxInValues` cannot be silently replaced by the default.
- `packages/core/test/CompilePredicate.tst.ts` has four tests and they pass under `pnpm exec tstyche`: 4 tests, 5 assertions, and 3 suppressed errors matched. Under `Omit` alone, assigning a variable of type `RenderRules` is assignable (excess-property checks apply only to fresh literals), so the three negatives would fail without the `never` fields. That is the stated reason. The suppression text `is not assignable to type 'never'` matches the actual error for each of the three. The positive case pins that a dialect's rules still go in.
- The file is in `tsconfig.test.json`'s `packages/*/test/**/*.ts` include, so an unused `@ts-expect-error` is TS2578 under `pnpm typecheck`. `tsc -p tsconfig.test.json` exits clean, and so does `tsc -b`.
- The ADR (Rev 1.1), BEH-QD-596 (Rev 1.11), `spec/overview.md` (Rev 1.121), `spec/README.md` (Rev 1.245) and the `@qadi/core` changeset all carry the same signature and sentence. Each header's Revision matches its newest history entry (`spec:verify:strict` 21 pass, 0 fail), and `spec:api` (935 exports) and `spec:gates` (143 references) pass. The CCR-QD-443 row keeps the original revision numbers in its leading list and names the new ones in its iteration-1 sentence, the same convention the CCR-QD-442 row follows.
- The runtime is unchanged: the two explicit keys after `...options.rules` still win, and `rules` can no longer carry either field by type.

**IN-01 (Prisma comment).** It now cites `BEH-QD-597, ADR-QD-165` and drops the process sentence. A comment cannot change behaviour, and `check-house-style` is clean (542 files).

**IN-02 (doc comments).** `CompilePredicateOptions` documents `rules` (and why a carrying value is refused), the two defaults including `undefined`, the `render` contract and `outcomes`. The `compilePredicate` doc states the per-run behaviour. I checked each statement against the code. `render` runs inside the returned Effect, once per run, only after classification succeeds. A throw becomes a defect through `Effect.map` and counts neither outcome. The SQL accumulator is per run.

**IN-04 (five rules).** `"each of the dialect's five rules reaches toRenderable unchanged"` flips each of the five fields to a value that changes the probe's outcome, and each row is distinct. `reservedColumns` gives `ReservedColumn`. `nullability` gives `IsNull` against `NullOnNonNullableColumn`. `negation` gives `nullGuard` `None` against `ExcludeNull`. `finiteness` gives `ExcludeNonFinite` against `None`. `finiteExclusion` gives `NonFiniteColumn`. The title now matches the assertions.

**Verification run.** All of these pass:
- `vitest --project core` on `CompilePredicate.test.ts`: 8 tests.
- `vitest --project predicate-sql --project predicate-prisma`: 198 tests.
- `scripts/check-house-style.mjs`: 542 files clean.
- `scan.mjs` reports only the four expected items: the new `.tst.ts` outside its scope list, the changed `rules` line, a second commit on `CompilePredicate.test.ts`, and the after JSON predating later src commits. These are not findings.
- The one oxlint warning on the phase's files is the `new Array(1001)` in `packages/predicate-sql/test/CompileShell.test.ts:160`. It is iteration-1 IN-03, skipped on purpose, and not re-raised.

The shell, the counters, the span tree, the changesets, the invariant text and the traceability rows are unchanged since iteration 1 and still match the code.

---

_Reviewed: 2026-11-16T19:55:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

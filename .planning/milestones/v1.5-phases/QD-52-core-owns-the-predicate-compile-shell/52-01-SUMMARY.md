---
phase: QD-52-core-owns-the-predicate-compile-shell
plan: 01
status: complete
requirements: [WX-02, WX-05, WX-06]
phase_base: 42b92cc3875e4ea7c79ae14ad23ea1a58e11da9e
plan_head_before: 42b92cc3875e4ea7c79ae14ad23ea1a58e11da9e
plan_head_after: 478028db112c186db640794d89b0305b52909b81
commits: 1
actuals:
  tokens: 11000
  tasks: 2
  commits: 1
completed: 2026-11-16
---

# Phase 52 Plan 01: Base evidence and mutation baseline

## Base facts

Verified at `phase_base` 42b92cc3.

- `packages/predicate-sql/src/index.ts`: `Effect.fn("qadi.predicateSql.compileSql")` `:315`; shell lines `:320` (`?? "Ascii"`), `:322` (`?? DEFAULT_MAX_IN_VALUES`), `:335` (`Effect.tapError(() => Metric.update(compiledTotal.refused, 1))`), `:341` (`Metric.update(compiledTotal.compiled, 1)`, after the render); `toRenderable(predicate, rules)` `:334`; no `compilePredicate`.
- `packages/predicate-prisma/src/index.ts`: `Effect.fn("qadi.predicatePrisma.compilePrismaWhere")` `:432`; shell lines `:435`, `:437`, `:447` (`tapError`), `:449` (`compiled`, counted BEFORE `return renderNode(node)` `:450`; SQL counts after its render: the order D-06a aligns); `toRenderable(predicate, rules)` `:446`; no `compilePredicate`.
- `packages/core/src/RenderablePredicate.ts`: `DEFAULT_MAX_IN_VALUES = 1000` `:150`; traced `toRenderable = Effect.fn("qadi.predicate.toRenderable")` `:516`; no `compilePredicate`, no `CompileOutcomes`, no `effect/Metric` import.
- `packages/core/src/index.ts:48`: `export * from "./RenderablePredicate.ts";`.
- `packages/predicate-sql/src/CompileMetrics.ts:16`: `Metric.counter("qadi_predicate_sql_compiled_total"`, inline-typed `export const compiledTotal: {` `:29`.
- `packages/predicate-prisma/src/CompileMetrics.ts:16`: `Metric.counter("qadi_predicate_prisma_compiled_total"`, inline-typed `export const compiledTotal: {` `:29`.
- `packages/predicate-sql/test/CompileShell.test.ts`, `packages/predicate-prisma/test/CompileShell.test.ts` and `packages/core/test/CompilePredicate.test.ts` do not exist.

## Reserved ids

`ARCH-99`, `ADR-QD-165`, `CCR-QD-443`, `BEH-QD-596`..`BEH-QD-600`, `INV-QD-349`, `INV-QD-350`: each whole-id (`git grep -lwF`) free at `phase_base` across spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts; no `spec/decisions/165-*`. `node scripts/next-id.mjs` was not run.

## Base declarations

Hashes of what ships after `pnpm exec tsc -b tsconfig.json` at the base:

09b6a5b980e09c6cb7c314a4b6fde7f7b30651ed6b84942214b1903f692e2f35  packages/predicate-sql/lib/index.d.ts
8986d5568465283d2ab8126b7ac51b7a9bccbe882473ec31f773c5a20df9e889  packages/predicate-prisma/lib/index.d.ts

## Base gates

- api-surface: 932 export(s) documented across 9 package(s)
- package-install: 9 package(s) pack, resolve and authorize (522 runtime export(s))
- house-style: 539 file(s) clean (3 declared switch(es))

## Mutation base

Three runs, each alone, `< /dev/null`, the invocations 52-05 repeats verbatim:

1. `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/RenderablePredicate.ts'`
2. `pnpm exec stryker run stryker.predicate-sql.mjs --mutate 'packages/predicate-sql/src/index.ts,packages/predicate-sql/src/CompileMetrics.ts'`
3. `pnpm exec stryker run stryker.predicate-prisma.mjs --mutate 'packages/predicate-prisma/src/index.ts,packages/predicate-prisma/src/CompileMetrics.ts'`

Then `node .planning/phases/QD-52-core-owns-the-predicate-compile-shell/tools/mutation.mjs base` (no refusal). Printed lines:

```
packages/core/src/RenderablePredicate.ts 0.9814814814814815 (159/162) ignored 60
survivor packages/core/src/RenderablePredicate.ts:330:30 ArrowFunction | Survived | () => undefined | () => false | Unrepresentable: () => () => false,
survivor packages/core/src/RenderablePredicate.ts:343:3 MethodExpression | Survived | NON_FINITE.every(...) | NON_FINITE.some(...)
survivor packages/core/src/RenderablePredicate.ts:343:55 ObjectLiteral | Survived | {} | { [column]: value } | NON_FINITE.some(...)
packages/predicate-sql/src/index.ts 0.9558823529411765 (65/68) ignored 43
survivor packages/predicate-sql/src/index.ts:175:40 StringLiteral | NoCoverage | `` | ExcludeNull template
survivor packages/predicate-sql/src/index.ts:325:11 ObjectLiteral | Survived | {} | { _tag: "Unknown" }
survivor packages/predicate-sql/src/index.ts:325:19 StringLiteral | Survived | "" | "Unknown"
shell packages/predicate-sql/src/index.ts: line(s) 320, 322, 335, 341 detected 4 survived 0 ignored 0
packages/predicate-sql/src/CompileMetrics.ts unmeasured: no scored mutant: all 8 ignored (ignoreStatic: true; module-scope declarations only)
packages/predicate-prisma/src/index.ts 0.9262295081967213 (113/122) ignored 32
survivors: 313:31, 313:38, 313:39, 313:61, 313:73 (NoCoverage, the `"not" in filter` ExcludeNull branch);
  257:10 and 261:10 ConditionalExpression Survived; 313:7 ConditionalExpression and StringLiteral Survived
shell packages/predicate-prisma/src/index.ts: line(s) 435, 437, 447, 449 detected 4 survived 0 ignored 0
packages/predicate-prisma/src/CompileMetrics.ts unmeasured: no scored mutant: all 8 ignored (ignoreStatic: true; module-scope declarations only)
```

No survivor sits on a shell line. Each dialect's four shell mutants are all Killed (D-09a's moved set).
Stryker's own counts: core 159 killed / 3 survived / 0 no-cov; SQL 65 / 2 / 1; Prisma 113 / 4 / 5. Every run exited 0.

Full survivor and shell-mutant identities (mutator, status, replacement, mutated text, line text) are in `52-mutation-base.json`
(committed `478028db`, alone, parent `phase_base`).

## Commits

- `478028db` chore(52-01): mutation baseline for the compile shell

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- 52-mutation-base.json exists and is the phase's first plan commit (`478028db`), parent `phase_base`, trailer last.
- No file under packages, spec, scripts, .changeset or the Stryker configs changed; `.planning/config.json` stays unstaged.

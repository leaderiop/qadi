# Phase 52: Core owns the predicate compile shell - Pattern Map

**Mapped:** 2026-11-16
**Files analyzed:** 17 (new or modified)
**Analogs found:** 17 / 17
All analog paths are git-tracked source. Research Appendices A/B/C hold the test bodies and Pattern 1 holds the function text; they are not repeated here.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/RenderablePredicate.ts` (add `CompileOutcomes`, `CompilePredicateOptions<A>`, `compilePredicate`) | utility (plain Effect fn) | request-response + counter side effect | `packages/core/src/SinkReport.ts` `reportSinkFailure`; `PortDerivation.ts` `retryCountingAttempts`; `Policy.ts:994` `fromJson` | exact |
| `packages/predicate-sql/src/index.ts` (`compileSql` shrinks) | service entry | request-response | itself (base `:315-344`); Prisma's is the sibling | exact |
| `packages/predicate-prisma/src/index.ts` (`compilePrismaWhere` shrinks) | service entry | request-response | itself (base `:432-451`) | exact |
| `packages/predicate-sql/src/CompileMetrics.ts`, `packages/predicate-prisma/src/CompileMetrics.ts` (annotate `compiledTotal: CompileOutcomes`) | config (metric) | counter | each other; `packages/core/src/EvaluationMetrics.ts:84` | exact |
| `packages/core/test/CompilePredicate.test.ts` (new) | test | unit | `packages/core/test/helpers.ts` twins (`isolatedMetrics`, `collectingTracer`) | role-match |
| `packages/predicate-sql/test/CompileShell.test.ts`, `packages/predicate-prisma/test/CompileShell.test.ts` (new, committed on base) | test | differential | each package's `test/Metrics.test.ts` | exact |
| `.planning/phases/QD-52-.../tools/mutation.mjs`, `52-mutation-base.json`, `52-mutation-after.json` | tooling/evidence | batch | `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/mutation.mjs`, `51-mutation-base.json` | exact (with D-09a change) |
| `spec/decisions/165-*.md`, `spec/decisions/index.yaml` | spec | doc | `spec/decisions/164-policy-tag-arity-is-stated-once.md`, index.yaml `:505` | exact |
| `spec/README.md` (CCR-QD-443 row) | spec | doc | CCR-QD-442 row, `spec/README.md:379` | exact |
| `spec/behaviors/31-predicate-compilation.md` (BEH-QD-596..600) | spec | doc | BEH-QD-271 `:526` (REQUIREMENT block format) | exact |
| `spec/invariants.md` (INV-QD-349, 350 or Unused) | spec | doc | INV-QD-347 `:4014` | exact |
| `spec/traceability.md` | spec | doc | rows `:180` (INV), `:338` (ADR), `:387-388` (test files) | exact |
| `spec/overview.md` | spec | doc | `:176-179` (`toRenderable`, `RenderRules`, `DEFAULT_MAX_IN_VALUES` rows) | exact |
| `.changeset/*.md` x3 | config | doc | `.changeset/sink-wire-version-stated-once.md` | exact |

## Pattern Assignments

### `packages/core/src/RenderablePredicate.ts`
**Analog:** `packages/core/src/SinkReport.ts:60-71` (plain Effect function; doc says why it is untraced). Doc-comment shape: one summary line, then the why.
```ts
 * can throw. Never a subject, resource, policy or action. A plain function, not a
 * traced one: it runs only on a failure.
 */
export const reportSinkFailure = (
  message: string, ... ): Effect.Effect<void> =>
  Effect.suspend(() => ...
```
**Imports:** the file's imports are `effect/Array`, `Effect`, `Match`, `Result` at `:32-35`. Add `import * as Metric from "effect/Metric";` after `Match` (alphabetical). Core already exports `Metric.Counter<number>` in `EvaluationMetrics.ts:84`.
**Core body:** use research Pattern 1 verbatim. Keep `identifiers?: IdentifierRule | undefined` (`exactOptionalPropertyTypes`). No `Effect.fn` (UNTRACED_BUDGET unchanged). The barrel already has `export *` (`index.ts:48`), so no barrel edit.

### `packages/predicate-sql/src/index.ts` and `packages/predicate-prisma/src/index.ts`
Replace the body in place. The `Effect.fn("qadi.predicateSql.compileSql")` and `Effect.fn("qadi.predicatePrisma.compilePrismaWhere")` wrappers stay (spans unchanged). The new body is `return yield* compilePredicate(predicate, {...})` from research Pattern 1. Import `{ compilePredicate } from "@qadi/core"` as a named root import (AGENTS.md §1). Drop the now-unused `Metric`, `DEFAULT_MAX_IN_VALUES`, `toRenderable` and `RenderRules` imports (Prisma) and `RenderRules` (SQL). SQL's `params` array is allocated inside `render`, per run.

### `CompileMetrics.ts` (both)
Keep the `Metric.counter("qadi_…")` literal and the untagged `compiledBase` unexported (ADR-QD-123). Add only `import type { CompileOutcomes } from "@qadi/core";` and the annotation `export const compiledTotal: CompileOutcomes = {...}`. `[metric-table]` and `METRIC_ID_LITERAL_BUDGET` stay unchanged.

### Differential tests (`CompileShell.test.ts` x2) and the core test
**Analog:** `packages/predicate-sql/test/Metrics.test.ts:1-22`. Imports and counter-read style:
```ts
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import { isolatedMetrics } from "@qadi/testing";
import { compiledTotal } from "../src/CompileMetrics.ts";
import { compileSql } from "../src/index.ts";
// read: (yield* Metric.value(compiledTotal.compiled)).count inside isolatedMetrics(...)
```
Never write a `"qadi_…"` literal outside the existing pin test. Spans use `collectingTracer` from `@qadi/testing`. The core test cannot import `@qadi/testing` and uses the twins in `packages/core/test/helpers.ts` (`:93`, `:120`). Bodies come from Appendix A/B/C.

### Mutation tool (`tools/mutation.mjs`)
**Analog:** `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/mutation.mjs` (181 lines). Adapt as follows.
- Change the `D` path, the file constants and the Stryker `--mutate` list (both packages' `src/index.ts` and `src/CompileMetrics.ts`, plus `packages/core/src/RenderablePredicate.ts`).
- Keep the stale-report and file-set guards.
- Keep the score formula `(Killed+Timeout)/(Killed+Timeout+Survived+NoCoverage)`, with Ignored counted but not scored.
- Keep textual survivor identity (mutator, status, replacement, mutated text, its line's text).
- Keep the JSON shape from `51-mutation-base.json`: `{measured, counts, survivors, unmeasured}`.
- **Replace the compare rule (D-09a):** a touched file passes when its survivor set is identical and any score drop equals killed mutants that moved to core. In the output, record the per-file before/after and the moved-to-core count. Any new survivor fails. Check the `compare` section (`:25` onward) for where the Phase 51 rule is encoded.

### Records
- **ADR-QD-165:** copy the structure of `spec/decisions/164-policy-tag-arity-is-stated-once.md`. Index entry shape at `spec/decisions/index.yaml:505` (`id`, `file`, `title`, `status: "Accepted — applies …; keeps ADR-QD-054, ADR-QD-079, ADR-QD-123"`). It must state D-06a (Prisma now counts after the render).
- **CCR-QD-443:** a row in the same format as `spec/README.md:379`, listing every file touched with its Rev. Bump the `Change History` header lines in `spec/README.md`, `invariants.md`, `traceability.md` and `overview.md` as Phase 51 did.
- **BEH-QD-596..600:** `## BEH-QD-NNN: title` followed by a fenced block of `REQUIREMENT:` lines (see `31-predicate-compilation.md:526-545`).
- **INV-QD-349:** copy the heading and body layout of `spec/invariants.md:4014-4024` (`**Implication**`, `**Related**`). Use `scripts/next-id.mjs` rules and no placeholder ids (AGENTS.md §11).
- **Traceability:** add INV, ADR, BEH and test-file rows modelled on `traceability.md:180, :338, :387-388`.
- **Overview rows (gate 13):** next to `overview.md:176-179`, use the format `| name | function/type | RenderablePredicate.ts — … |`. Add `compilePredicate` (function) and `CompileOutcomes`, `CompilePredicateOptions` (type). The gate count moves 932 to 935.
- **Changesets:** the format is `.changeset/sink-wire-version-stated-once.md`: front matter `"@qadi/core": minor`, then one prose paragraph. Add two siblings with `"@qadi/predicate-sql": patch` and `"@qadi/predicate-prisma": patch`. The Prisma one states the D-06a counting correction.

## Shared Patterns
- **Imports:** namespace imports for `effect/*`, `.ts` extensions on relative imports, `import type` for types, a named import from `@qadi/core` across packages.
- **Metrics:** one declaration per package at module scope, read in tests only through the exported series via `Metric.value`.
- **No new budgets:** no `switch`, no `Effect.fnUntraced`, no `as`.
- **Gates to rerun at close:** `pnpm circular`, gate 14 (`check-package-install.mjs`), gate 13 (`check-api-surface.mjs`), `pnpm check`.

## No Analog Found
None. The D-09a compare rule is the one deliberate departure from the Phase 51 analog.

## Metadata
**Analog search scope:** `packages/core/src`, `packages/predicate-*`, `spec/`, `.changeset/`, Phase 51 planning tools.
**Pattern extraction date:** 2026-11-16

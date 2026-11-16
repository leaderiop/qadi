---
phase: QD-43-one-handover-module-behind-the-enforcement-entry-points
plan: 04
subsystem: core
tags: [handover, collections, filter, promise-facade, resource-free]
phase_base: 712317c10688ebce97b8b29b5a5c515b84a8d71b
plan_head_before: 652a01de1e57abfbe0ebd600aee39dea1539556c
plan_head_after: 1713a37debf47806943a21523bf7b757f8691a66
requires: ["43-03"]
provides:
  - "handOver in packages/core/src/Handover.ts: the per-item decide-discharge-release step all four collections share"
  - "filter, filterStream, filterProjected, filterStreamProjected refuse a second resource (HandoverOptions)"
  - "@qadi/promise filter and filterProjected take Omit<FacadeOptions, \"resource\">"
affects: [43-05, 43-08]
actuals:
  tokens: 12000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: ["adapters over one package-private module", "refusal as a Result value, partitioned by Stream.filterMap / a single-pass loop"]
key-files:
  created: []
  modified:
    - packages/core/src/Handover.ts
    - packages/core/src/Qadi.ts
    - packages/core/test/Handover.test.ts
    - packages/promise/src/index.ts
    - packages/promise/README.md
    - spec/overview.md
key-decisions:
  - "handOver is a plain function (not Effect.fn): it runs once per item, so a span per item would be the per-node cost AGENTS.md section 5 budgets against"
  - "The array forms share a private keptInOrder single pass (BS-04); the stream forms use Stream.filterMap over the same Result"
  - "@qadi/promise changes in two option types and comments only; the facade stays branch-free (ADR-QD-032)"
requirements-completed: [HAND-01, HAND-02, HAND-03, HAND-04, HAND-05, WX-03, WX-04]
status: complete
---

# Phase 43 Plan 04: The collections adapt the handover module Summary

All ten enforcing entry points are now adapters over `Handover.ts`: the four collections decide each item through one `handOver`, `decideOne` is gone, and `@qadi/promise`'s `filter` and `filterProjected` refuse a second resource like `projected`.

## Commits

- `c95ab4e0` refactor(43-04): the collections decide each item through handOver; the facade's collections refuse a second resource
- `1713a37d` docs(43-04): the facade's collections say why they take no resource

## handOver as written (`Handover.ts`, package-private)

```ts
export const handOver = <A extends Resource, B, E = never, R = never>(
  policy: Policy,
  value: A,
  options: HandoverOptions<E, R> | undefined,
  release: (decision: Allow, value: A) => B,
): Effect.Effect<
  Result.Result<B, void>,
  EvaluationError | UndischargedObligation | E,
  EvaluationServices | R
>
```

`Effect.map(verdictOf(policy, decidedOn(options, value)), …)`: `Result.succeed(release(decision, value))` for an admitted item, `Result.failVoid` for a refused one. `filter`/`filterProjected` run `Effect.forEach(items, handOver(…), { concurrency: options?.concurrency })` then the private `keptInOrder`; `filterStream`/`filterStreamProjected` run `Stream.mapEffect(…, { concurrency })` then `Stream.filterMap((result) => result)`. No `unordered`.

## Counted constructs (plan's source check, all as expected)

| Construct | Count |
| --- | --- |
| `project(` in Qadi.ts / Handover.ts | 0 / 1 |
| `isAllowed(` in Qadi.ts / Handover.ts | 0 / 1 |
| `decideOne` / `FilterVerdict` in Qadi.ts | 0 |
| `handOver(policy, item, options, RELEASE.…)` | 4 |
| `concurrency: options?.concurrency` | 4 |
| `unordered` | 0 |
| `options?: HandoverOptions<EO, RO>` in Qadi.ts | 8 |
| `EnforceOptions<EO, RO>` (enforce only) | 1 |
| promise `Omit<FacadeOptions, "resource">` | 3 (projected, filter, filterProjected) |
| promise source lines changed beyond the two option types | none; docs commit differs by comments only (TypeScript printer, comments removed, identical) |

## Verification

- `pnpm test:tstyche`: Test files 53 passed, Tests 274 passed, Assertions 570 passed (full green for the first time since 43-01; the four collection refusals and `Facade.tst.ts` pass).
- `pnpm exec vitest run --project core`: 69 files, 2326 tests passed. `--project promise`: 25 passed.
- `pnpm typecheck`, `pnpm circular`, `pnpm spec:api` (927 exports), `pnpm lint` (house-style 507 files clean), `node scripts/spec-revise.mjs --check` all exit 0. `spec/overview.md` revised 1.106 -> 1.107; the `HandoverOptions` row names all eight entry points.

## Deviations from Plan

**1. [Rule 3 - Blocking] `packages/core/test/Handover.test.ts` type edit**
- **Found during:** Task 1 typecheck
- **Issue:** the 43-02 table's `Collection.run` took `Qadi.EnforceOptions`, which a `HandoverOptions` collection no longer accepts (TS2379 x4); the plan listed the test as "unchanged".
- **Fix:** one-token change of that parameter type to `Qadi.HandoverOptions`; no case or assertion changed (39 tests still pass).
- **Commit:** `c95ab4e0`

No false-positive source checks hit (the plan's counted-construct script ran clean as written).

## Known Stubs

None.

## Threat Flags

None. T-43-09 (array/stream disagreement) mitigated by the one shared `handOver`; T-43-10 (facade deciding) mitigated by the printer/diff checks.

## Self-Check: PASSED

- `packages/core/src/Handover.ts` exports `handOver`; both commits are ancestors of HEAD; `commits: 2` measured from `plan_head_before..HEAD`.

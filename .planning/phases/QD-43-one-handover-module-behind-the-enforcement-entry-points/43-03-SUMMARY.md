---
phase: QD-43-one-handover-module-behind-the-enforcement-entry-points
plan: 03
subsystem: core
tags: [handover, enforcement, guard, resource-free, release-table]
phase_base: 712317c10688ebce97b8b29b5a5c515b84a8d71b
plan_head_before: 91b63ac027d9bed38b57ac782ab324fff6b65da8
plan_head_after: 51b6339283d5bebf45256dbc6e878c4aa9ffb41f
requires: ["43-02"]
provides:
  - "packages/core/src/Handover.ts: the package-private handover module (option types, discharge, closed Verdict, verdictOf, resourceFree/decidedOn, Release table)"
  - "guard refuses a second resource (HandoverOptions); enforceProjected decides with none"
affects: [43-04, 43-08]
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: ["adapters over one package-private module", "closed mapped release table (FieldLattice precedent)"]
key-files:
  created:
    - packages/core/src/Handover.ts
  modified:
    - packages/core/src/Qadi.ts
    - packages/core/test/Qadi.test.ts
    - packages/core/test/Qadi.tst.ts
    - spec/overview.md
key-decisions:
  - "guard adapts the module directly (admittedOrDenied over decidedOn), no longer written over enforce"
  - "AccessDenied is constructed once, in Qadi.ts's private accessDenied; Handover.ts returns a closed Verdict and never names it"
  - "decideOne keeps its own { ...options, resource: item } spread (the collections still take EnforceOptions until 43-04)"
requirements-completed: [HAND-01, HAND-02, HAND-03, HAND-04, HAND-05, WX-03, WX-04]
status: complete
---

# Phase 43 Plan 03: One handover module behind the effect shapes Summary

`Handover.ts` now holds the allow/discharge/deny branch, the resource strip and the release step; the six effect-shaped entry points are adapters over it, `guard` refuses a second resource, and `enforceProjected` decides with none even when an untyped caller smuggles one.

## Commits

- `0fd2a9fb` refactor(43-03): guard decides through the handover module and refuses a second resource (tracer)
- `51b63392` refactor(43-03): the effect shapes release through the handover module, enforceProjected decides with none

## Module surface as written (`Handover.ts`, package-private, not in `index.ts`)

- Types: `ObligationDischarge`, `ObligationHandler<E, R>`, `EnforceOptions<E, R>` (moved), `HandoverOptions<E, R>` (renamed from `LoadedEnforceOptions`), `Admitted`, `Refused`, `Verdict`, `Release = "Whole" | "Projected"`.
- `isAdmitted(verdict): verdict is Admitted`
- `verdictOf<E, R>(policy, options: EnforceOptions<E, R> | undefined): Effect<Verdict, EvaluationError | UndischargedObligation | E, EvaluationServices | R>` (plain function)
- `resourceFree<E, R>(options: HandoverOptions<E, R> = {}): EnforceOptions<E, R>` (destructures `resource` away)
- `decidedOn<E, R>(options: HandoverOptions<E, R> | undefined, value: Resource): EnforceOptions<E, R>` (positional value written last)
- `RELEASE` (closed mapped table): `Whole` returns the value itself, `Projected` returns `project(decision, value)`
- Module-local `discharge`: still the one named `Effect.fn("qadi.discharge")`, moved unchanged.

`Qadi.ts`: `export type { EnforceOptions, HandoverOptions, ObligationDischarge, ObligationHandler } from "./Handover.ts"`, private `accessDenied` (the one `new AccessDenied(`) and `admittedOrDenied`.

## Counted constructs

| Construct | After Task 1 | After Task 2 |
|---|---|---|
| `Qadi.ts` `permitted` / `LoadedEnforceOptions` / `isAllowed(` / `Effect.fn(` | 0 / 0 / 0 / 0 | same |
| `Qadi.ts` `new AccessDenied(` / `Handover.ts` | 1 / 0 | same |
| `Handover.ts` named `Effect.fn("` / `fnUntraced` | 1 / 0 | same |
| `Handover.ts` `isAllowed(` | 1 | 1 |
| `project(` Handover.ts / Qadi.ts | 0 / 4 | 1 / 2 (the two collections for 43-04) |
| `Qadi.ts` `withLoadedResource` | 0 | 0 |
| `Qadi.ts` `RELEASE.Projected(` / `RELEASE.Whole(` / `resourceFree(options)` | n/a | 2 / 1 / 1 |
| `orDie`, `switch`, `Match.value(` in either file | 0 | 0 |

## Verification output

- `pnpm exec vitest run --project core`: `Test Files 69 passed (69), Tests 2326 passed (2326)` (including the formerly RED `enforceProjected ignores a smuggled resource and decides with none`). After Task 1, with that one case excluded: 2325 passed, 1 skipped.
- `tstyche packages/core/test/Qadi.tst.ts --skip "the collection entry points refuse a second resource in"`: `Tests: 10 passed, 1 skipped; Assertions: 25 passed, 14 skipped` (guard's refusal now passes; the collection refusals stay RED for 43-04).
- `pnpm typecheck` exit 0, `pnpm circular`: `No circular dependency found`, `pnpm spec:api`: `927 export(s) documented across 9 package(s)`, `pnpm lint` exit 0 (`house-style: 507 file(s) clean (3 declared switch(es))`), `spec-revise --check` clean (`spec/overview.md` 1.105 -> 1.106).
- `scripts/` and `AGENTS.md`: empty diff since the plan start.

## Deviations from Plan

### Auto-fixed Issues

None.

### Notes

- The plan's Task 1 verify requires the four-type re-export on one source line; it is 117 columns, longer than the hand-wrapped ninety, so the line matches the check literally.
- The tracer's end-to-end verify was run to green before the commit (the guard refusal test, the vitest project minus the RED case, the gate set, the counted-construct script) and the same set re-ran green after Task 2; no checkpoint was needed.
- Other `spec/` documents (`invariants.md`, `models/07-field-level.md`, `behaviors/07-enforcement.md`, `traceability.md`, decision 104) and `packages/core/CHANGELOG.md` still name `LoadedEnforceOptions` as history; they are outside this plan's files and belong to the phase's spec plan.

## Known Stubs

None.

## Threat Flags

None. `AccessDenied` is unchanged (four fields, one construction); no `orDie`.

## Self-Check: PASSED

- `packages/core/src/Handover.ts` exists; `0fd2a9fb` and `51b63392` are ancestors of HEAD, each ending with the `Co-Authored-By` trailer; `git rev-list --count` from `plan_head_before` is 2.

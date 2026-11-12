---
phase: 26-headless-dock-model
plan: 02
subsystem: devtools
tags: [dock-model, tdd-green, scope, fiber-handle, stryker]
requires:
  - phase: 26-headless-dock-model
    provides: "26-01's DockModel.test.ts (M1-M16, P1) and 26-mutation-base.json"
provides:
  - "packages/devtools/src/model/DockModel.ts: makeDockModel, DockModel, DockModelInputs (package-private)"
  - "DockModel.test.ts: 26 tests (26-01's 20 unchanged, 6 added to kill mutants)"
affects: [26-03, 26-04, 26-05, 26-06]
actuals:
  tokens: 4200
  tasks: 2
  commits: 3
plan_head_before: 1cb8a5ebba832d596866cdc0568ba8b609b0a2ec
plan_head_after: a566d2a0acbfe92469c7ae188842eab5fb74a6aa
commits: 3
tech-stack:
  added: []
  patterns:
    - "a facade store (`timeline`) whose subscribe/getSnapshot come from a model-owned external store and whose commands delegate to a replaceable inner store"
    - "an absent optional input reads as a null object (an empty Source, the default bound), not as a branch around an Effect"
key-files:
  created:
    - packages/devtools/src/model/DockModel.ts
  modified:
    - packages/devtools/test/model/DockModel.test.ts
key-decisions:
  - "configure stores the new inputs before dispatching, so a capacity change rebuilds the rail against the new catalogue"
  - "the push recomputes the rail only when the shown timeline moved: a pause toggle reaches the timeline's listeners but not the rail (the old useMemo kept the same)"
  - "simulation.setPorts is called on every configure, with no guard of its own: SimulationSession.setPorts guards identity, so the model's guard was an equivalent mutant and is dead code"
  - "a replaced inner TimelineStore is dropped, not unsubscribed from: nothing can reach it again, so the unsubscribe was an equivalent mutant and is dead code"
  - "an absent source reads as an empty Source (sourceFromRecords([])), so a removed source replaces the read in the handle with one that ends at once, instead of forking Effect.void behind a conditional"
requirements-completed: [DMOD-01, DMOD-02, WX-04, WX-05]
coverage:
  - id: D1
    description: "makeDockModel owns the timeline, rail, simulation, explorer, roles and dock session; a new shown timeline or catalogue reaches every store synchronously from one catalogueOf; every 26-01 rule passes unchanged"
    requirement: DMOD-01
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/DockModel.test.ts (26 tests, M1-M17 and P1); pnpm vitest run --project devtools: 46 files, 1221 tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "configure dispatches only the inputs whose identity changed; a capacity change keeps the timeline object and every session's state; the source is read in the model's own FiberHandle and ended by its scope"
    requirement: DMOD-02
    verification:
      - kind: unit
        ref: "DockModel.test.ts M10 (a-d), M11, M13, M15 (b-d), M16"
        status: pass
    human_judgment: false
  - id: D3
    description: "the module is package-private, imports no React, has no as, !, any, switch or class, and meets the mutation bar"
    requirement: WX-05
    verification:
      - kind: other
        ref: "plan's two Task 1 automated checks, pnpm lint:style (453 files clean), pnpm circular, tsc -p tsconfig.test.json; stryker.devtools.mjs --mutate DockModel.ts: 100.00, 0 NoCoverage; MUTATION-COMPARE prints `new 100.00 ok`"
        status: pass
    human_judgment: false
duration: 7min
completed: 2026-11-11
status: complete
---

# Phase 26 Plan 02: The headless dock model, GREEN Summary

**`makeDockModel` is an `Effect.fn` in a `Scope` that owns the dock's six stores, pushes one `catalogueOf` into every screen on each timeline or catalogue change, diffs `configure` per input by identity, and reads its source through its own `FiberHandle`; all 26-01 tests pass unedited and the file scores 100 under Stryker with no NoCoverage mutant.**

## Performance

- **Duration:** about 7 min
- **Started:** 2026-11-11T12:36Z
- **Completed:** 2026-11-11T12:43Z
- **Tasks:** 2
- **Files modified:** 1 created, 1 changed (test)

## Accomplishments

- **Task 1 (GREEN).** `DockModel.ts` implements the 26-01 interface. The model subscribes `push` to its inner `TimelineStore` at construction; `push` publishes into a model-owned external store that `timeline.subscribe`/`getSnapshot` read, so the `timeline` object is stable across a capacity change (D-05). The simulation is built with `yield* makeSimulationSession(...)` in the model's scope and is the dock session's replay target. The source read forks into a `FiberHandle` the model owns (D-14); there is no `dispose` and no `read` member. 20 of 20 of 26-01's tests passed on the first run, unedited; the whole devtools project (1215 tests then) stayed green, React untouched.
- **Task 2 (mutation bar).** First Stryker run: 82.76, 10 survivors, 0 NoCoverage. After the changes below: 100.00 over 55 mutants.

## Mutation result (WX-05)

`pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/DockModel.ts`, then the plan's MUTATION-COMPARE:

```
packages/devtools/src/model/DockModel.ts new 100.00 ok
```

First run 48 killed / 10 survived (82.76); final run 55 killed / 0 survived / 0 NoCoverage (100.00). The ten survivors and what happened to each:

| Mutant (line in the first version) | Disposition |
| ---------------------------------- | ----------- |
| `capacity === undefined ? undefined : { capacity }` → `{ capacity: undefined }` | equivalent (`emptyTimeline` reads `?? DEFAULT`); **removed as dead code**: `makeTimelineStore({ capacity: capacity ?? DEFAULT_TIMELINE_CAPACITY })`, whose `??` is killed by M11's bound of 5 |
| `makeSimulationSession({ sightings: rail })` → `{}`, and the same for the explorer | **killed by a test**: M2 (b), a catalogue given at construction fills both rails |
| `if (next !== shown)` → `true` in `push` | **killed by a test**: M17, a pause reaches the timeline's listeners and no other store |
| `setPaused` / `isPaused` → `() => undefined` | **killed by a test**: M17 (a paused view holds, resuming catches up, `isPaused` reads back) |
| `source === undefined ? Effect.void : runSource(...)` → `false` | unobservable (a forked fiber that dies on `undefined.read`); **removed as dead code**: an absent source reads as `sourceFromRecords([])`, so no branch is left. M15 (d) pins that a dropped source is released and what it delivered stays |
| `unhook()` removed | equivalent (the replaced store is unreachable); **removed as dead code**, along with the `unhook` variable |
| `next.catalogue?.roles` → `next.catalogue.roles` | **killed by a test**: M10 (d), configuring with no catalogue empties the declared policies and the roles |
| `if (resized \|\| next.source !== before.source)` → `true` | **killed by a test**: M15 (b), a configure that leaves the source alone does not read it again; M15 (c) pins the capacity half |

26-01's reference survivor (calling `simulation.setPorts` on every `configure`) is the equivalent-guard case: the model's own `if (next.ports !== before.ports)` would have been unobservable, so `configure` calls `simulation.setPorts(next.ports)` unconditionally and relies on the session's identity guard. No threshold was lowered and no Stryker disable comment was added.

## Task Commits

1. **Task 1: DockModel, six stores, one push, one configure (GREEN)** - `403b0cef` (feat)
2. **Task 2: mutation bar** - `4838508c` (refactor: the three dead-code removals) and `a566d2a0` (test: M2 b, M10 d, M15 b-d, M17)

**Plan metadata:** the `docs(26-02): complete the headless dock model plan` commit (SUMMARY, STATE.md, ROADMAP.md, REQUIREMENTS.md).

## Files Created/Modified

- `packages/devtools/src/model/DockModel.ts` - `makeDockModel`, `DockModel`, `DockModelInputs`; in neither barrel
- `packages/devtools/test/model/DockModel.test.ts` - six tests added after 26-01's twenty (the nine DOM cases 26-05 deletes are unchanged in the title map of 26-01-SUMMARY)

## Decisions Made

See `key-decisions`. The one worth carrying forward to 26-04: the dock should hand `configure` every input it has on each render, since an omitted input reads as `undefined` (the per-field identity diff), and the model dispatches nothing for an input whose identity did not move.

## Deviations from Plan

None - plan executed as written. Notes that are not deviations:

- `simulation.setPorts(inputs.ports)` runs once after construction rather than passing `ports` into `makeSimulationSession`'s init: with `exactOptionalPropertyTypes`, an `ports: undefined` init field does not typecheck and a conditional spread adds a branch. Nobody has subscribed yet, so the call notifies no one.
- Task 2's source edits (three dead-code removals) touched `DockModel.ts` again; the plan's "equivalent mutant is removed as dead code" instruction covers it. 26-01's twenty tests were not edited.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None: a package-private model module with no network, auth or file surface. T-26-04 (an unchanged input must not reset a capture) is mitigated by the per-input identity diff and M10; T-26-05 (a store missing a push) by the single `spread` and P1; T-26-06 (a run or read left open) by the scope-owned handles and M13, M15, M16.

## TDD Gate Compliance

RED `8785c80f` (`test(26-01)`, load failure for the missing module, per 26-01's summary) precedes GREEN `403b0cef` (`feat(26-02)`), which made all 20 pass unedited. The refactor commit `4838508c` kept the suite green.

## Next Phase Readiness

26-03 can rename `PolicyChoice`'s `Chosen` to `Listed` (the tests read only `Seeded` by tag and the dropdown label otherwise). 26-04 can switch the dock to `makeDockModel` through a scoped hook (`useScoped`): construct with the first props, call `configure` on each render with every input, and drop the six hooks and layout effects.

---
*Phase: 26-headless-dock-model*
*Completed: 2026-11-11*

## Self-Check: PASSED

- FOUND: packages/devtools/src/model/DockModel.ts, packages/devtools/test/model/DockModel.test.ts, this SUMMARY
- FOUND: commits 403b0cef, 4838508c, a566d2a0 (`git merge-base --is-ancestor` ok)

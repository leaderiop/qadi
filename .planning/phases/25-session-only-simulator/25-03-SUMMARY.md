---
phase: 25-session-only-simulator
plan: 03
subsystem: devtools
tags: [simulation-session, effect-fiberhandle, scope, tdd-green, use-scoped, mutation-gate]
requires:
  - phase: 25-session-only-simulator
    provides: "25-02: 31 red ARCH-73 model tests and the per-file mutation baseline (25-mutation-base.json)"
provides:
  - "makeSimulationSession as an Effect needing a Scope: the session owns its runs through one FiberHandle (D-09..D-12)"
  - "run(kind) as a command; reap, hasRetired and dispose gone; setAction, choosePolicyAt, policyMenu, cost, baselineReading and Ran.reading"
  - "BaselineReading and the summary sentence in model/Replay.ts (moved verbatim from Simulator.tsx)"
  - "react/useScoped.ts and the scoped owner hooks; the dock's owner/frame split"
  - "six new exported types (PolicyMenu, PolicyMenuOption, SweepCost, BaselineReading, RecordOutcome, ObligationState), pinned in surface.tst.ts and listed in spec/overview.md (rev 1.92)"
affects: [25-04, 25-05, 26]
actuals:
  tokens: 52870
  tasks: 3
  commits: 4
plan_head_before: edaae9a2485a00b1e4d76b5fb01d9cf120e01833
plan_head_after: 9d28930148c0a2d089db6088754d6b6039ec14ab
commits: 4
tech-stack:
  added: []
  patterns:
    - "a model that owns fibers is built in a Scope and forks into one FiberHandle (FiberHandle.make + runtime); a superseding command installs Effect.void to interrupt the run in flight before it returns"
    - "a React owner builds a scoped value in a layout effect and closes the scope on cleanup (useScoped), so StrictMode builds nothing during render and leaks no scope"
key-files:
  created:
    - packages/devtools/src/react/useScoped.ts
  modified:
    - packages/devtools/src/model/SimulationSession.ts
    - packages/devtools/src/model/Replay.ts
    - packages/devtools/src/model/Inspect.ts
    - packages/devtools/src/react/useSimulationSession.ts
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/src/react/Simulator.tsx
    - packages/devtools/src/index.ts
    - packages/devtools/test/model/SimulationSession.test.ts
    - packages/devtools/test/surface.tst.ts
    - features/features/devtools-simulator/devtools-simulator.steps.test.ts
    - spec/overview.md
key-decisions:
  - "The finalizer, supersede, start and land keep the generation exactly as D-09..D-12 specify; three mutants on it are equivalent (listed below) and left, not suppressed"
  - "setAction compares the draft's action with actionOf(text) before editing, because withAction always returns a new object"
  - "choosePolicyAt indexes the sightings after the menu's leading entry (seeded or evicted) through one shared 'leading' rule, so the menu and the command cannot disagree"
  - "cost.warns is the plan's causesIO alone, which is what the view coloured by, refused or not"
requirements-completed: [SIM-02, SIM-03, SIM-04, SIM-05, WX-03, WX-04]
coverage:
  - id: D1
    description: "The session is scoped and owns its runs through a FiberHandle: a superseded run is interrupted inside the command, closing the scope interrupts the run in flight and leaves the session inert, run is a command"
    requirement: SIM-04
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/SimulationSession.test.ts#a superseded run stops at once (ARCH-73) / closing the session's scope stops its run (ARCH-73) / the interface keeps the lifecycle to itself (ARCH-73) / a run is its own trace (ARCH-73)"
        status: pass
      - kind: integration
        ref: "features/features/devtools-simulator (20 scenarios, one scope each)"
        status: pass
    human_judgment: false
  - id: D2
    description: "setAction, choosePolicyAt, policyMenu, cost, baselineReading and Ran.reading exist with today's exact texts; summarise lives in Replay.ts"
    requirement: SIM-02
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/SimulationSession.test.ts#the view's commands are the session's (ARCH-73) / what the view shows is read by the session (ARCH-73)"
        status: pass
      - kind: other
        ref: "pnpm exec stryker run stryker.devtools.mjs --mutate SimulationSession.ts,Replay.ts: 0.9694 and 1.0 against 0.9641 and 1.0 at the base"
        status: pass
    human_judgment: false
  - id: D3
    description: "React owns the scope: useScoped, scoped owner hooks returning undefined until the session exists, DevtoolsDock split into owner and DockFrame; no adapter forks a run or a reap"
    requirement: SIM-04
    verification:
      - kind: automated_ui
        ref: "packages/devtools/test/react/Simulator.test.tsx and DevtoolsDock.test.tsx pass unchanged (1190 devtools tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The six new types are exported type-only, imported by surface.tst.ts and listed in spec/overview.md with the scoped constructor and the removed members; gate 13 and the house-style budgets are green"
    requirement: SIM-05
    verification:
      - kind: other
        ref: "pnpm spec:api, pnpm lint, pnpm test:tstyche, pnpm circular, node scripts/spec-revise.mjs --check"
        status: pass
    human_judgment: false
duration: 13min
completed: 2026-11-11
status: complete
---

# Phase 25 Plan 03: Scoped session, commands and readings (GREEN) Summary

**`makeSimulationSession` is now an `Effect` needing a `Scope` that owns its runs through one `FiberHandle` (a superseded run is interrupted inside the command, closing the scope interrupts the rest, no `reap`/`hasRetired`/`dispose`), with `setAction`, `choosePolicyAt` and the `policyMenu`, `cost`, `baselineReading` and `Ran.reading` readings under the mutation gate, and React building it through `useScoped`.**

## Performance

- **Duration:** about 13 min
- **Started:** 2026-11-11T07:08Z (approximate; not recorded at start)
- **Completed:** 2026-11-11T07:21Z
- **Tasks:** 3 (all `tdd`/GREEN for 25-02's RED, plus one test commit)
- **Files modified:** 12 (one created)

## Accomplishments

- **Lifecycle (SIM-04, D-09..D-12).** The constructor is `Effect.fn("qadi.devtools.makeSimulationSession")` returning `Effect.fn.Return<SimulationSession, never, Scope.Scope>`. It builds `FiberHandle.make<void>()` and `FiberHandle.runtime(runs)<never>()`, then registers a finalizer (after the handle, so it runs first) that bumps the generation and marks the session closed. `supersede()` bumps the generation and, when the handle holds a fiber, installs `Effect.void` in its place, which interrupts the run before the command returns. `run(kind): void` forks `land` (`Effect.fn("qadi.devtools.simulationSession.run", { root: true })`) only if its generation is still current after the Running commit. `reap`, `hasRetired`, `dispose`, `retired`, `current` and the `Effect.forkDetach`/`Fiber.await` step are deleted.
- **Commands and readings (SIM-02, SIM-03, D-03, D-04).** `setAction(text)`, `choosePolicyAt(position)`, and on the snapshot `policyMenu`, `cost`, `baselineReading`; a landed run carries `reading` (`readOutcome` computed once). `summarise` moved verbatim into `Replay.ts` as the sentence of `readBaseline`/`BaselineReading`.
- **React (D-07, D-13, D-14).** `useScoped` builds the value in a scope a layout effect opens and closes on cleanup. `useOwnedSimulationSession` and `useSimulationSession` return `undefined` until the session exists; `SimulationSessionView` is `{ session, snapshot }`. `DevtoolsDock` is the owner and renders a private `DockFrame` once the session exists. `Simulator`'s Run/Sweep buttons call `session.run(kind)`; `OwnedSimulator` renders `null` until its session exists (interim; 25-04 deletes it). No test id, text or prop changed.
- **Surface (SIM-05, WX-03).** `PolicyMenu`, `PolicyMenuOption`, `SweepCost`, `BaselineReading`, `RecordOutcome` and `ObligationState` are exported type-only; `readOutcome` and the constructors stay private and `surface.tst.ts` pins that. `spec/overview.md` (rev 1.92) lists them, the scoped constructor, the new members and the removed ones.

## Task Commits

1. **Task 1: the session owns its runs through a scope (model, model tests, BDD steps)** - `718e5c26` (feat; see Deviations: it also carries the Task 3 model code)
2. **Task 2: React owns the scope** - `616f8988` (feat)
3. **Task 3: surface records (barrel, type test, overview, Inspect comment)** - `a5176f52` (feat)
4. **Mutation kill tests (WX-05)** - `9d289301` (test)

**Plan metadata:** the `docs(25-03): complete scoped session plan` commit (STATE.md, ROADMAP.md, REQUIREMENTS.md).

## Counts, before and after (the plan's baselines, same invocations)

| Check | Before | After |
| ----- | ------ | ----- |
| `grep -cE "readonly (reap\|hasRetired\|dispose)"` in `SimulationSession.ts` | 3 | 0 |
| files under `react/` forking `session.(run\|reap\|dispose)` or naming `hasRetired` | 1 | 0 |
| `grep -cF FiberHandle` in `SimulationSession.ts` | 0 | 5 |
| lifecycle calls (`session.hasRetired(`, `.reap`, `.dispose`) in the model test and BDD steps | several | 0 |
| the six new type names in the barrel and the overview | absent | all present |

The only `Effect.runFork` left for the simulator is `useScoped`'s scope close (`useRunningStore.ts` is the timeline's).

## Mutation (WX-05, `25-mutation-base.json`)

| File | Base | Now |
| ---- | ---- | --- |
| `SimulationSession.ts` | 0.9641 (295 killed, 11 survived) | **0.9694** (348 killed, 11 survived) |
| `Replay.ts` | 1.0 | **1.0** (93 killed, 0 survived; the first measurement had 2 uncovered strings, killed by a flip-to-allowed baseline test) |

The 11 survivors: eight are in `build()` and are the same equivalent mutants the base had (`policyOf`'s `"None"` branch x2, the `{ source }` spread, the `policyNow === undefined` and `question.seed` terms of `stale`, `run._tag === "Idle"` x2, `refusal`). Three are in the new lifecycle code and are equivalent by construction, not by neglect:

- `generation += 1` in the closing finalizer (`-=`): closing interrupts the run before anything can land, so no later comparison sees the number.
- `if (Option.isSome(FiberHandle.getUnsafe(runs))) fork(Effect.void)` (`true`): forking an empty fiber into an empty handle exits at once and leaves the handle unchanged; the guard only saves that fiber.
- `if (mine !== generation) return;` in `land` (`false`): an interrupted fiber never reaches that line. Measured: with the check removed, a resolver that ignores interruption (`Effect.uninterruptible`) still leaves a superseded run `Idle` and never lands. It stays as the belt T-25-16 names.

Three real survivors were killed with meaningful tests (commit `9d289301`): a subscriber that supersedes the run it is told about (the run must never start), and a subscriber that replaces it (only the replacement starts and lands). They kill `generation += 1` in `supersede` and in `run`, and the `mine === generation` fork guard, none of which any test could see before.

## Lifecycle tests changed or deleted

| Test (old) | Now | Stated by |
| ---------- | --- | --------- |
| C4 `supersededBy` x3 (choosing a policy, a re-seed, changing ports) | deleted | "a superseded run stops at once (ARCH-73)": the same commands, with `replay` for the re-seed; I added a fourth case, "a re-seed" through `seed`, so the guarded path is kept |
| "dispose interrupts the run, and the session stays usable" | deleted | "closing the session's scope stops its run (ARCH-73)" (interrupts, never lands, inert after) |
| "dispose with nothing running changes nothing" | deleted | no `dispose`; "every no-op command leaves the snapshot and the subscribers alone" |
| "interrupting the run itself interrupts the evaluation" | deleted | the scope test asserts `tally.interrupted === 1` after the close |
| `tracing` and "emits spans for the run, the reap it makes and dispose" | deleted | "a run is its own trace (ARCH-73)": root span, constructor span, no reap or dispose span |
| "a second run interrupts the first", "a refusal does not leave an earlier run's fiber behind", "re-seeds the form after an edit, and drops the run in flight" | converted | assertions kept; no `Fiber.join`, `hasRetired` or `reap` (`tally.interrupted === 1` after the command) |
| Phase 24: "never shows a result as answering a row replayed while that run was starting", "keeps no capture from an environment that was replaced while a run was starting" | converted, `Idle` assertions kept | the first no longer switches to Fixtures, so its second run is still in flight when the row is replayed |

Every other pre-existing test only changed how it builds a session (`yield* makeSimulationSession(...)`, plain `it` to `it.effect`) and how it waits for a run (`ran`/`settled`); `startRun` is 25-02's `begin` folded in, and `sessionWith` is an Effect.

## BDD scope finding

A session built in a `Given` step is still live in its `When` and `Then` steps: all 20 scenarios pass with sessions built by `sessionFor` in `Given` steps and read later (the scenario is one Effect, one scope). No `Before`/`After` hook was needed. The ring is provided at construction (`sessionFor(...).pipe(Effect.provide(s.ring.layer))`), which a run sees because `FiberHandle.runtime` captures the constructing context.

## New exported types

`PolicyMenu`, `PolicyMenuOption`, `SweepCost` (`model/SimulationSession.ts`); `BaselineReading` (`model/Replay.ts`); `RecordOutcome`, `ObligationState` (`model/Inspect.ts`, type-only).

## Decisions Made

- Kept the generation arithmetic and the land check exactly as the plan and T-25-16 specify, and documented the three equivalent mutants instead of simplifying the design to dodge them (the score is above the base).
- `policyMenuOf`, `selectedOf`, `leading` and `costOf` are module-scope; `selectedOf` is a hoisted `Match.type`, and the menu and `choosePolicyAt` share `leading`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Task boundary] Task 1's commit carries the Task 3 model code**
- **Found during:** Task 1
- **Issue:** the commands, readings and `Replay.ts` additions live in the same file as the lifecycle, and the 25-02 tests for both describes are in the same test file, so splitting them would have meant a throwaway intermediate file. `git add -p` is not available here.
- **Fix:** commit `718e5c26` holds the model, `Replay.ts`, the model test and the BDD steps; Task 3's commit holds only the barrel, type test, overview and the `Inspect.ts` comment. Task 1's automated verify (all but the two "view" describes) and Task 3's (everything) both pass at the end.
- **Files modified:** none beyond the plan's list.

**2. [Rule 2 - Missing critical functionality] Mutation kill tests**
- **Found during:** WX-05 measurement after Task 3
- **Issue:** `SimulationSession.ts` scored 0.9610 (below 0.9641) and `Replay.ts` 0.9785 (below 1.0): re-entrant subscriber paths and the "denied then allowed" baseline sentence were untested.
- **Fix:** three tests, commit `9d289301` (see Mutation).
- **Verification:** 0.9694 and 1.0.

**3. [Rule 3 - Blocking] `node scripts/spec-revise.mjs` needs `--date`**
- **Found during:** Task 3
- **Issue:** without `--date`, the script's positional filter (`index !== dateFlag + 1`, with `dateFlag === -1`) drops the first argument and exits with the usage message.
- **Fix:** passed `--date 2026-11-11`. The script itself is out of scope and was not changed; worth a one-line fix by whoever owns it.

---

**Total deviations:** 3 (1 process, 1 Rule 2, 1 Rule 3). **Impact on plan:** none on scope or interface.

## Issues Encountered

- `packages/devtools/lib` is the gitignored build output the `features` package imports `@qadi/devtools` from, so the BDD suite sees a stale session until `tsc -b tsconfig.json` runs (it runs inside `pnpm typecheck`). Not a defect, but it explains why the BDD run is only meaningful after the React side compiles.

## Known Stubs

None.

## Threat Flags

None: no new network, auth or file surface; the new exports are types only.

## TDD Gate Compliance

RED: `33467093` and `a228864c` (25-02, `test(25-02):`). GREEN: `718e5c26`, `616f8988`, `a5176f52` (`feat(25-03):`), each a descendant of the RED commits. Plus one `test(25-03):` commit. No REFACTOR commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

25-04 can make `Simulator` a pure view of `{ session }`: delete `OwnedSimulator`/`SharedSimulator` and the ignored `sightings` prop, render `snapshot.policyMenu` (passing `selectedIndex` to `choosePolicyAt`), `snapshot.cost`, `snapshot.baselineReading` and `Ran.reading`, call `session.setAction`, and build each DOM test's session with `Effect.runSync(Scope.provide(makeSimulationSession(init), scope))`. `Simulator.tsx` still imports `readOutcome`, `matchesBaseline`, `describeTracePath`, `actionOf` and `withAction` for its own copies of that logic; 25-04 removes them (its local `summarise` is now dead beside `Replay.ts`'s). The changeset, ADR-QD-137, BEH-QD-460/461, BEH-QD-322's fence and the two pending changesets are 25-05's.

---
*Phase: 25-session-only-simulator*
*Completed: 2026-11-11*

## Self-Check: PASSED

- FOUND: packages/devtools/src/react/useScoped.ts
- FOUND: commits 718e5c26, 616f8988, a5176f52, 9d289301 (`git merge-base --is-ancestor` ok)
- `pnpm vitest run --project devtools` 1190 passed; `pnpm test:bdd` 568 passed; `pnpm typecheck`, `pnpm lint`, `pnpm test:tstyche`, `pnpm circular`, `pnpm spec:api`, `spec-revise --check` green

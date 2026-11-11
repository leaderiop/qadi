---
phase: 25-session-only-simulator
plan: 02
subsystem: devtools
tags: [simulation-session, tdd-red, effect-fiberhandle, scope, mutation-baseline]
requires:
  - phase: 25-session-only-simulator
    provides: "25-01: D-01 option D recorded (d01_outcome: D), public changes confirmed"
provides:
  - "per-file Stryker scores at the phase base (25-mutation-base.json), recorded before any src change"
  - "the session-only Simulator's model contract as 31 red tests (ARCH-73): lifecycle, commands, readings"
  - "the base's behavioural defect quoted from the existing C4 assertions (a superseded run waits for reap)"
affects: [25-03, 25-04, 25-05]
actuals:
  tokens: 6531
  tasks: 2
  commits: 2
plan_head_before: bcb1e9be7c67116d7540793a547ddaacef44696e
plan_head_after: a228864c7492dc7aeda95e33541a3c6e653c6ae0
tech-stack:
  added: []
  patterns:
    - "a model test for a scoped session is an it.effect that yields the constructor, and waits on the snapshot (begin / settled / ran) rather than joining a fiber"
key-files:
  created:
    - .planning/phases/25-session-only-simulator/25-mutation-base.json
  modified:
    - packages/devtools/test/model/SimulationSession.test.ts
key-decisions:
  - "Every sentence the view computes today is asserted verbatim at the session, including the two baseline branches the plan did not list (same-verdict differences at 1 and 2 nodes, a different failure), so 25-03's move of summarise into Replay.ts cannot lose a branch under the mutation gate"
  - "Tests are red at construction (yield* of a plain object), as the plan states; the Task 2 expectations were checked against the base through a scratch shim that was not committed"
requirements-completed: [SIM-02, SIM-03, SIM-04, WX-05, WX-06]
coverage:
  - id: D1
    description: "Per-file mutation baseline for SimulationSession.ts and Replay.ts recorded at the phase base, before any src change"
    requirement: WX-05
    verification:
      - kind: other
        ref: ".planning/phases/25-session-only-simulator/25-mutation-base.json (pnpm exec stryker run stryker.devtools.mjs --mutate SimulationSession.ts,Replay.ts)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Lifecycle contract as red tests: a superseded run is interrupted through the handle, closing the scope interrupts the run and makes run inert, no reap/hasRetired/dispose, the run is a root span"
    requirement: SIM-04
    verification: []
    human_judgment: true
    rationale: "Red by design until 25-03 builds the scoped session; the tests go green there, so no pass can be recorded in this plan"
  - id: D3
    description: "Commands and readings as red tests: setAction, choosePolicyAt, policyMenu, Ran.reading, cost, baselineReading, with today's exact sentences"
    requirement: SIM-02
    verification: []
    human_judgment: true
    rationale: "Red by design until 25-03 builds them; expectations were validated against the base through a scratch shim that is not committed"
duration: 7min
completed: 2026-11-11
status: complete
commits: 2
---

# Phase 25 Plan 02: Session-only Simulator contract, red Summary

**The scoped Simulator session's contract is 31 red `ARCH-73` model tests (lifecycle through a handle and a scope, the view's commands, and every sentence the view computes today, byte for byte) written before any code, with the phase base's per-file mutation scores recorded.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-11-11T07:00:21Z
- **Completed:** 2026-11-11T07:07Z
- **Tasks:** 2 (both RED, no GREEN here: 25-03 is the GREEN)
- **Files modified:** 2 (one test file, one baseline JSON); no `packages/*/src` file changed

## Accomplishments

- **Mutation baseline (WX-05)**, at the phase base, before any src change (`25-mutation-base.json`): `SimulationSession.ts` **0.9641** (295 killed, 11 survived, 3 ignored), `Replay.ts` **1.0** (55 killed, 3 ignored); Stryker's overall 96.95. 25-03 and 25-05 compare against these.
- **Lifecycle contract, red (SIM-04, D-09..D-12):** a superseded Live run (`choosePolicy`, `replay`, `setPorts`) is interrupted inside the command with no `reap`, never lands, and stays `Idle` after the resolver's second elapses; closing the session's scope interrupts the run in flight, it never lands, and `run` on a closed session leaves the snapshot reference-equal and starts nothing; a fresh session has no `reap`, `hasRetired` or `dispose`; the run's span `qadi.devtools.simulationSession.run` is a root (no parent), the constructor's span `qadi.devtools.makeSimulationSession` exists, and no `…reap` or `…dispose` span is emitted.
- **Commands and readings, red (SIM-02, SIM-03, D-03, D-04):** `setAction` (sets, removes on `""`, no-op on the current text), `choosePolicyAt` (chooses the listed sighting; a seeded or evicted entry shifts positions by one and is itself a no-op; `2`, `5`, `-1`, `0.5`, `NaN` change nothing), `policyMenu` for None, Chosen, Evicted and Seeded with today's values and labels, `Ran.reading` (Allowed with fields, Allowed with a duty owed and `Unreported`, Denied, Failed with `AttributeResolveError`), `cost` in its four cases with `warns === (plan?.causesIO === true)` checked in each, and `baselineReading` for every branch of today's `summarise`.
- **The base's behavioural defect (WX-06, D-02), quoted from the existing C4 test** (`SimulationSession.test.ts` at `bcb1e9be`, lines 304-311): the interrupt waits for a host to fork `reap`.

  ```ts
  supersede(session);
  // Correct before anything is interrupted: the generation moved.
  assert.strictEqual(session.getSnapshot().run._tag, "Idle");
  assert.isTrue(session.hasRetired());

  yield* session.reap;
  assert.isFalse(session.hasRetired());
  assert.strictEqual(tally.interrupted, 1);
  ```

  Until `yield* session.reap` runs, `tally.interrupted` is 0: the superseded run keeps asking the application's resolvers (T-25-04). The new "stops at once" tests assert `tally.interrupted === 1` right after the command and a `yieldNow`, with nothing reaped.

## Task Commits

1. **Task 1: Mutation baseline, and RED: a session owns its runs** - `33467093` (test)
2. **Task 2: RED: the commands and the readings the view will stop computing** - `a228864c` (test)

**Plan metadata:** the `docs(25-02): complete session-only simulator contract plan` commit (STATE.md, ROADMAP.md, REQUIREMENTS.md).

## RED evidence (per commit)

| Commit | Failing (all `ARCH-73`) | Passing | Why they fail |
| ------ | ----------------------- | ------- | ------------- |
| `33467093` | 6 | 72 (every pre-existing test) | `yield* makeSimulationSession(…)`: `TypeError: yield* … is not iterable` (the base returns a plain object) in 5; `Fiber.runLoop: Not a valid effect` in the scope test (`Scope.provide` of the same plain object) |
| `a228864c` | 31 (6 + 25) | 72 | the same two construction errors, 30 and 1 |

- `gsd_run check tdd-red-evidence` returned `RED_EVIDENCE_OK` (`target_test_failed`) for the target "the interface keeps the lifecycle to itself (ARCH-73) a session has no reap, hasRetired or dispose…", run with the `tap-flat` reporter. Semantic assessment: the target executed and failed on the planned construction contract (a constructor that is not an Effect), not on a syntax, import, fixture or zero-test fault. The other 30 were verified with the plan's JSON-reporter check: only `ARCH-73` tests fail, every pre-existing session test passes (including Phase 24's "never shows a result as answering a row replayed while that run was starting" and "keeps no capture from an environment that was replaced while a run was starting").
- **The failing tests, by describe:** "a superseded run stops at once (ARCH-73)" (3), "closing the session's scope stops its run (ARCH-73)" (1), "the interface keeps the lifecycle to itself (ARCH-73)" (1), "a run is its own trace (ARCH-73)" (1), "the view's commands are the session's (ARCH-73)" (4 commands + 4 `policyMenu`), "what the view shows is read by the session (ARCH-73)" (4 readings, 4 cost, 8 baseline).
- **Beyond construction:** the Task 2 expectations (commands, menu, readings, cost, baseline sentences) were run against the base through a scratch shim that implemented the new members from today's `Simulator.tsx` logic over the base session. All 25 passed except one assertion that needs a reference-stable `getSnapshot`, which a shim that rebuilds the snapshot cannot give; that is a shim artefact, not a test defect. The shim and a probe file were deleted, not committed.
- **Type state:** `tsc -p tsconfig.test.json` is red on this file until 25-03, only for the absent constructor shape and members (`Type 'SimulationSession' must have a '[Symbol.iterator]()'`, `Property 'reading' does not exist`, and a floating-Effect warning on `session.run(kind)` in the helpers, which becomes `void` there). Nothing else in the repo changed, so no other file is affected.

## Files Created/Modified

- `packages/devtools/test/model/SimulationSession.test.ts` - helpers `begin`, `settled`, `ran` (plus `scopedSessionWith`, `finishedRun`) and the new describes, after C4's; no existing test or helper edited
- `.planning/phases/25-session-only-simulator/25-mutation-base.json` - per-file scores at the phase base

## Decisions Made

- Every baseline branch is pinned, not only the ones the plan listed: the same-verdict differences at 1 and 2 nodes, and a different failure, are branches of today's `summarise`. 25-03 moves `summarise` into `Replay.ts` (a file at 1.0 at the base), where an untested branch is a surviving mutant.
- New helpers use names that cannot collide with the file's current ones (`begin`, `settled`, `ran`, `scopedSessionWith`, `finishedRun`); 25-03 T1 folds them in when `sessionWith` and `startRun` are converted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Baseline branches the plan did not list**
- **Found during:** Task 2
- **Issue:** the plan's `baselineReading` cases covered match, flip, recovered, same failure and became-error, but `summarise` also has "a different failure: X then, Y now" and "differs at N node(s), with the same verdict" (singular and plural). T-25-05 says every baseline case's text is asserted verbatim before the move, and WX-05 says the touched files' score does not fall.
- **Fix:** three cases added, with fixtures probed on the base first (a `FieldsChanged` difference gives "1 node", plus an `ObligationsChanged` gives "2 nodes"; a logged `MissingResource` against a reconstructed `MissingAction` gives the different-failure sentence).
- **Files modified:** `packages/devtools/test/model/SimulationSession.test.ts`
- **Verification:** the same probe and the scratch shim run; red on the base for construction.
- **Committed in:** `a228864c`

**2. [Rule 2 - Missing critical functionality] Two assertions beyond the plan's list**
- **Found during:** Task 2
- **Issue:** `setAction("")` on a draft with no action, and an allow that owes a duty, were not stated; the first is the other half of "no-op on the current text", the second is what makes `reading` carry `duties` and an `Unreported` obligation.
- **Fix:** a no-op test and an `obliged(obligation("audit"), hasPermission(read))` reading test.
- **Committed in:** `a228864c`

---

**Total deviations:** 2 auto-fixed (both Rule 2, test coverage). **Impact on plan:** none on scope or interface; the tests only state more of today's behaviour.

## Issues Encountered

None. The Stryker run (Task 1) took 40 seconds. `pnpm check` would fail on typecheck between this plan and 25-03 by design (RED).

## Known Stubs

None. No `packages/*/src` file changed.

## TDD Gate Compliance

RED: present, two `test(25-02):` commits (`33467093`, `a228864c`), both seen failing for the designed reason. GREEN: supplied by 25-03 (`depends_on: ["25-02"]`), the dependent plan the gate accepts for a RED-only probe plan. No REFACTOR commit here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

25-03 can build the scoped session against 31 red tests. It should: make `makeSimulationSession` an `Effect.fn("qadi.devtools.makeSimulationSession")` needing a `Scope`; make `run(kind)` return `void` and fork into a `FiberHandle`; delete `reap`, `hasRetired`, `dispose` and the C4/dispose/span tests that assert them (they are superseded by the new ones); add `setAction`, `choosePolicyAt`, `policyMenu`, `cost`, `baselineReading` and `Ran.reading`; and convert the file's remaining plain constructions to `yield*` (the new helpers are in place). After that, compare mutation against `25-mutation-base.json`. No blockers.

---
*Phase: 25-session-only-simulator*
*Completed: 2026-11-11*

## Self-Check: PASSED

- FOUND: packages/devtools/test/model/SimulationSession.test.ts
- FOUND: .planning/phases/25-session-only-simulator/25-mutation-base.json
- FOUND: commit 33467093 (`git merge-base --is-ancestor` ok)
- FOUND: commit a228864c (`git merge-base --is-ancestor` ok)
- No `packages/*/src` change since `plan_head_before` (0 files)

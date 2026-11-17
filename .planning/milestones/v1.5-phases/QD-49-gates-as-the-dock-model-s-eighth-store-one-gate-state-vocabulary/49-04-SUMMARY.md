---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
plan: 04
subsystem: devtools
tags: [dock-model, questions-store, join, registry-subscription, fast-check, arch-96]
phase_base: 76330fbd24b7aadcfc65bc78e5053f9690cc6227
plan_head_before: b04b31353272529b01cf8ee014c2663a2c835b6f
plan_head_after: 5229c34a9cfeb8d32057367df0b1888989f7ff59
commits: 4
requires: [49-03]
provides:
  - "model/Gates.ts: GateRegistryLike, QuestionRow, GatesView, QuestionsView, QuestionsSnapshot, JoinInput, joinQuestions"
  - "model/DockModel.ts: DockModelInputs.gates and DockModel.questions, the eighth store, scope-owned registry subscription"
  - "test/gateRegistryDouble.ts: makeGateRegistryDouble, react's registry contract counting listeners and subscriptions"
affects: [49-05, 49-06, 49-07, 49-08, 49-09]
tech-stack:
  patterns: ["three-reference rejoin guard over one synchronous read of both sources", "closed Data.TaggedEnum views joined by a pure function", "scoped subscription with a closed flag and an identity-checked swap"]
key-files:
  created:
    - packages/devtools/test/gateRegistryDouble.ts
  modified:
    - packages/devtools/src/model/Gates.ts
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/test/model/Gates.test.ts
    - packages/devtools/test/model/DockModel.test.ts
key-decisions:
  - "A throwing registry instances() is not caught: it is the host's defect, and a catch would show an empty panel with nothing said (Pitfall 5; ADR-QD-162 states it in 49-07)"
  - "The registry double does not isolate a throwing listener, unlike react's, so an assertion made in a subscriber fails the command that triggered it"
  - "The header counts the stores once: seven before, questions the eighth, sightings a thunk"
metrics:
  tasks: 3
  files: 5
actuals:
  tokens: 9000
  tasks: 3
  commits: 4
status: complete
---

# Phase QD-49 Plan 04: The gate registry as the dock model's eighth store Summary

`makeDockModel` now owns the join of the polled questions and the live guards: `joinQuestions` decides the panel's rows in `model/Gates.ts`, and `DockModel.questions` is a store recomputed from both sources in one synchronous step, with a registry subscription taken in the model's scope and released by a finalizer. No DOM is involved in any of its tests.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `36053a33` | `test(49-04)`: the questions store, RED: the join, its lifetime and the one-moment property |
| 2 | `4b259ec9` | `feat(49-04)`: the gate registry is the dock model's eighth store, joined at one moment |
| 2 (follow-up) | `842dd24b` | `test(49-04)`: the double and the test guard helper type-check under exactOptionalPropertyTypes |
| 3 | `5229c34a` | `test(49-04)`: the unsampled key and a post-close configure are observable |

## RED proof (Task 1)

`vitest run --project devtools Gates.test.ts DockModel.test.ts` before `joinQuestions` and the store existed: 12 failed, 64 passed. The failures were exactly the 7 `joinQuestions` cases, M31, M32, M32 b, M33 and P2; every pre-existing Gates and DockModel test passed. The plan's two verifies printed `RED as expected` and `ok`.

## What was built

- `GateRegistryLike`, `QuestionRow`, the closed `GatesView` (`Absent`, `Empty`, `Listed`) and `QuestionsView` (`Unsampled`, `Absent`, `Empty`, `Rows`), `QuestionsSnapshot`, `JoinInput` and `joinQuestions`, none in the barrel.
- The store: `joinKeyNow()` reads the shown reading and `registry.instances()` in one call; `rejoin()` returns when all three key references are unchanged, else `questions.set(joinQuestions(key))`; `shownReading.subscribe(rejoin)`; `watchGates` releases the previous subscription and subscribes only when the model is not closed and a registry exists; a finalizer sets `closed` and releases; `configure` re-subscribes only when the registry's identity moved and re-joins at once.
- Cases: the join cases in `Gates.test.ts`; M31 (rows pair at once on a registry change, a quiet tick keeps the reference, a new asked list yields new rows), M32 and M32 b (absent, empty, listed; unsampled, absent, empty, rows), M33 (listener and subscription counts across a same-registry configure, a swap, an absent registry, close and a post-close configure), M34 and M35 (survivor cases), and P2 (fast-check `sample`, seed 49, 60 runs, up to 25 add, remove, update, ask and tick commands under `TestClock`, checked after every command and inside a `model.questions` subscriber against an `Equal.equals` oracle, with zero listeners after close).

## Negative control

Never committed. The store was edited so a recompute triggered by the diagnostics reading reuses the instances read at the previous poll-triggered join (a torn join: a poll publish pairing its questions with guards from before a registry change). `vitest run --project devtools packages/devtools/test/model/DockModel.test.ts`:

- failed: `M31` (`expected [ [ 'a' ], [] ] to deeply equal [ [ 'a', 'b' ], [] ]`) and `P2` (message carries the command sequence, `[{"kind":"add",...},{"kind":"ask",...},...]: expected [ …(3) ] to deeply equal []`).
- summary line: `Tests  2 failed | 42 passed (44)`.

Restored with `git checkout -- packages/devtools/src/model/DockModel.ts`: `Tests  44 passed (44)`, and `git status --porcelain -- packages` printed nothing.

The plan's wording of the control (reuse the instances of "the previous join") is a no-op against this store, because every registry change re-joins synchronously and the last key's instances are always current. The variant above, a cache refreshed only by poll-triggered joins, is the torn join that can occur, so that is the one run.

## Spot check

`pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/DockModel.ts,packages/devtools/src/model/Gates.ts' < /dev/null`, run twice; the reports' sources equal the files on disk.

| Round | `DockModel.ts` | `Gates.ts` |
|-------|----------------|------------|
| 1 (after Task 2 and the type fix) | 88/90, 97.78 | 57/57, 100.00 |
| 2 (after M34 and M35) | 90/90, 100.00 | 57/57, 100.00 |

Round 1 survivors, both killed by a new case in round 2:

- `DockModel.ts:158:18` ConditionalExpression to `true` (`reading.questions === undefined && isUnsampled(status)` losing its first conjunct): killed by M34, where a supplied question list keeps one snapshot and notifies nobody while the poll goes from Starting to Live.
- `DockModel.ts:178:16` BooleanLiteral to `false` (`closed = true` in the finalizer): killed by M35, where a `configure` after close hands a registry other than the one held and subscribes to nothing. M33's post-close `configure` handed the same registry the model already held, which the identity check skips, so it could not see this mutant.

Both files hold their base scores (`DockModel.ts` 1, `Gates.ts` 1).

## Equivalent survivors

None.

## Deviations from Plan

**1. [Rule 3 - Blocking] A test-side type error from RED, fixed in its own commit**
- **Found during:** Task 2 (`tsc -p tsconfig.test.json`)
- **Issue:** the test `guard` helper's `fields.resource` was `Resource` and not `Resource | undefined`, which `exactOptionalPropertyTypes` refuses when the resource pool yields `undefined`. The RED commit could not catch it because the types did not exist yet.
- **Fix:** widened the parameter type; also dropped a needless `[...live]` spread the linter flagged in the double.
- **Files modified:** `packages/devtools/test/model/DockModel.test.ts`, `packages/devtools/test/gateRegistryDouble.ts`
- **Commit:** `842dd24b` (kept apart so the `feat(49-04)` commit carries exactly the two source files, as the plan's acceptance requires)

**2. [Plan wording] The negative control's mutation** is described under `## Negative control`.

**3. [Labels]** two survivor cases were added as M34 and M35, after M33, and P2 stays last.

## Verification

- `vitest run --project devtools`: 64 files, 1494 tests passed after Task 2 (the 49-02 characterisation unchanged and green).
- `tsc -p tsconfig.test.json`, `pnpm lint` (no new warning; the double's one was removed) and `pnpm circular` clean.
- Source checks: the seven declarations in `Gates.ts`; the input, readout, finalizer, `joinQuestions(`, `isUnsampled(` and `shownReading.subscribe(rejoin)` in `DockModel.ts`; no `try`/`catch`; no `@qadi/react`, `AsyncResult` or `DecisionOutcome` in either; no copy of the instances; header recounted; nothing new in the barrel.
- `pnpm check:pr` was not run here (plan 49-09 closes with it); the gate window ended with the Task 2 commit.

## Known Stubs

None.

## Threat Flags

None. The model gains no endpoint, file access or schema; the only boundary is the host-supplied registry, covered by T-49-09 to T-49-11 in the plan.

## Self-Check: PASSED

- FOUND: `packages/devtools/test/gateRegistryDouble.ts`, `packages/devtools/src/model/Gates.ts`, `packages/devtools/src/model/DockModel.ts`
- FOUND commits: `36053a33`, `4b259ec9`, `842dd24b`, `5229c34a`

---
phase: 26-headless-dock-model
plan: 01
subsystem: devtools
tags: [dock-model, tdd-red, model-tests, mutation-baseline, fast-check, scope]
requires:
  - phase: 25-session-only-simulator
    provides: "the scoped makeSimulationSession (ADR-QD-137), setAction, choosePolicyAt, useScoped, the owner/DockFrame split"
provides:
  - "26-base.txt: the phase base (7396491d)"
  - "26-mutation-base.json: per-file Stryker scores for the four model files this phase touches"
  - "packages/devtools/test/model/DockModel.test.ts: M1-M16 and P1 against makeDockModel, RED for the missing module only"
affects: [26-02, 26-03, 26-05, 26-06]
phase_base: 7396491d
mutation_baseline:
  "packages/devtools/src/model/DockSession.ts": 100
  "packages/devtools/src/model/ExplorerSession.ts": 91.57
  "packages/devtools/src/model/HeldChoice.ts": 97.22
  "packages/devtools/src/model/SimulationSession.ts": 96.94
actuals:
  tokens: 6300
  tasks: 2
  commits: 2
plan_head_before: 7396491de899342f6b09e03b5f5eb02465d58db6
plan_head_after: 8785c80f3c76a7d4beea7263687da22b95af16e2
commits: 2
tech-stack:
  added: []
  patterns:
    - "a model test builds its subject with `yield* makeDockModel(...)` in it.effect's scope; a test that ends the scope mid-test uses Scope.make/Scope.provide/Scope.close"
    - "a hand-built Source counts reads and finalizers (Effect.addFinalizer in its scoped read) so a read's release is an observation"
key-files:
  created:
    - .planning/phases/26-headless-dock-model/26-base.txt
    - .planning/phases/26-headless-dock-model/26-mutation-base.json
    - packages/devtools/test/model/DockModel.test.ts
  modified: []
key-decisions:
  - "M8's simulation half is read through the dropdown reading (`policyMenu.selected` to its option label), not `policy._tag`, so the test survives 26-03 renaming `Chosen` to `Listed`; only `Seeded` is read by tag, and it does not change"
  - "Every `configure` call that follows a call setting a field repeats that field, so the tests hold whether 26-02 reads an omitted field as unchanged or as undefined"
requirements-completed: [DMOD-01, DMOD-02, WX-05, WX-06]
coverage:
  - id: D1
    description: "Phase 25 is closed, the phase base and the four per-file mutation scores are recorded before any source change, and the reserved numbers are free"
    requirement: WX-05
    verification:
      - kind: other
        ref: "the plan's two Task 1 automated checks (phase-25 SUMMARY loop and changeset present; 26-base.txt names a commit and 26-mutation-base.json has four numeric scores); git grep -w of ARCH-74, ADR-QD-138, CCR-QD-416, BEH-QD-465, BEH-QD-466, INV-QD-296 over spec packages .changeset AGENTS.md: no hit"
        status: pass
    human_judgment: false
  - id: D2
    description: "The dock's cross-store rules M1-M16 and the consistency property P1 are stated at the model, render nothing, and fail on the base only because model/DockModel.ts does not exist"
    requirement: DMOD-02
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/DockModel.test.ts (20 tests); pnpm vitest run --project devtools on it prints `Test Files 1 failed` naming DockModel.ts"
        status: pass
      - kind: other
        ref: "a throwaway reference makeDockModel (deleted, never committed) made all 20 pass, tsc -p tsconfig.test.json and pnpm lint:style clean; removing the simulation push failed 7 tests and a no-op source change failed M15"
        status: pass
    human_judgment: false
duration: 5min
completed: 2026-11-11
status: complete
---

# Phase 26 Plan 01: The dock's cross-store rules, RED Summary

**The phase base (`7396491d`) and a per-file Stryker baseline are recorded, and `DockModel.test.ts` states the dock's sixteen cross-store rules and the INV-QD-296 consistency property against `makeDockModel`, failing only because `model/DockModel.ts` does not exist.**

## Performance

- **Duration:** about 5 min (Stryker 1 min 3 s of it)
- **Started:** 2026-11-11T12:28Z
- **Completed:** 2026-11-11T12:33Z
- **Tasks:** 2
- **Files modified:** 3 created, none changed

## Accomplishments

- **Task 1.** Phase 25 is closed (all five `25-NN-PLAN.md` have a SUMMARY, `d01_outcome: D`), `.changeset/simulation-session.md` is still pending, and none of ARCH-74, ADR-QD-138, CCR-QD-416, BEH-QD-465, BEH-QD-466, INV-QD-296 has a hit. `26-base.txt` holds `7396491d`. `stryker.devtools.mjs --mutate` on the four files (before any change) gave the baseline below.
- **Task 2.** `DockModel.test.ts` (20 tests: M1-M16, with M10 as three and M11 as two, plus P1) renders nothing, imports nothing from React, and reads no `policy._tag` but `Seeded`. The one failure on the base is the unresolved import `../../src/model/DockModel.ts`.

## Task Commits

1. **Task 1: base and mutation baseline** - `4fbf56ec` (chore)
2. **Task 2: RED, the model tests** - `8785c80f` (test)

**Plan metadata:** the `docs(26-01): complete the dock model RED plan` commit (SUMMARY, STATE.md, ROADMAP.md, REQUIREMENTS.md).

## phase_base and mutation_baseline

`phase_base: 7396491d` (branch `arch-wave-7`). Score = (Killed + Timeout) / (Killed + Timeout + Survived + NoCoverage) x 100, read from `reports/mutation-devtools/mutation.json` into `26-mutation-base.json`; the run was `pnpm exec stryker run stryker.devtools.mjs --mutate` on the four files, overall 95.69, no NoCoverage mutant in any of them.

| File | Score | NoCoverage |
| ---- | ----- | ---------- |
| `DockSession.ts` | 100 | 0 |
| `ExplorerSession.ts` | 91.57 | 0 |
| `HeldChoice.ts` | 97.22 | 0 |
| `SimulationSession.ts` | 96.94 | 0 |

(`SimulationSession.ts` equals 25-05's 0.9694 after: no model file changed between.) 26-02 and 26-06 compare against this file with MUTATION-COMPARE.

## Phase 25 facts (Task 1 step 0)

- **Scoped, no `dispose`:** `makeSimulationSession(init?)` is `Effect.fn("qadi.devtools.makeSimulationSession")` returning `Effect<SimulationSession, never, Scope.Scope>` (`SimulationSession.ts`); the session owns a `FiberHandle` (`FiberHandle.make<void>()` plus `FiberHandle.runtime(runs)<never>()`). `reap`, `hasRetired` and `dispose` are not in the interface (`grep -cE "readonly (reap|hasRetired|dispose)"` is 0). D-13 holds.
- **`useScoped`** is `packages/devtools/src/react/useScoped.ts`, package-private: a `useLayoutEffect` opens a `Scope`, builds with `Effect.runSync(Scope.provide(make(), scope))`, and its cleanup does `setValue(undefined)` then closes the scope (the WR-02/WR-03 behaviour the context describes).
- **`DockFrame`** is a private component in `packages/devtools/src/react/DevtoolsDock.tsx` (`const DockFrame: FC<...>` near line 198), rendered by `DevtoolsDock` once `useOwnedSimulationSession({ sightings, ports })` has returned a session (line 176).
- **`useOwnedSimulationSession` still exists** (`react/useSimulationSession.ts:57`, exported from `react/index.ts:24`); `useSimulationSession` returns `SimulationSessionView | undefined`.
- **Signatures:** `setAction: (text: string) => void` (empty text removes the action; the same text is a no-op); `choosePolicyAt: (position: number) => void` (a position of `snapshot.policyMenu.options`; seeded/evicted leading entry, out-of-range and non-integer are no-ops); `run: (kind: "Run" | "Sweep") => void`.
- **Where `PolicyChoice` is read:** declared at `SimulationSession.ts:75` with tags `None | Chosen{index,policy} | Evicted{policy,label} | Seeded{entry,policy,unseeded}`. `Simulator.tsx:66` reads `policy._tag === "None"` and `:87` `=== "Seeded"`; `SimulationSession.ts` reads it in `selectedOf`, `leading`, `policyMenuOf`, `policyOf` and `seedOf`; `SimulationSession.test.ts` and the `devtools-simulator` BDD steps read `"Chosen"`. 26-03 must re-grep `"Chosen"`/`"None"` before editing.
- **`.changeset/simulation-session.md`** is pending; `.changeset/simulator-session-only.md` (Phase 25) and `devtools-headless-interface.md` are the other pending changesets Phase 25 edited.

## M-number to `it` title map (for 26-05)

The "Re-states" column is the DOM case a 26-05 deletion needs, from `26-CONTEXT.md`'s inventory.

| Rule | `it` title (start) in `DockModel.test.ts` | Re-states |
| ---- | ----------------------------------------- | --------- |
| M1 | `M1 (was DevtoolsDock l.853): records alone fill both rails...` | #47 |
| M2 | `M2 (was DevtoolsDock l.865): a declared catalogue adds names and unrun policies...` | #48 |
| M3 | `M3 (was DevtoolsDock l.883): roles come only from the catalogue...` | #49 |
| M4 | `M4 (the wiring stays at DevtoolsDock l.988): replaying a row moves to the simulator and seeds it` | none (#54 stays) |
| M5 | `M5 (was DevtoolsDock l.1026): replaying the same row again after another policy was chosen re-seeds` | #55 |
| M6 | `M6 (was DevtoolsDock l.1045): replaying the same row again after the action was edited restores it` | #56 |
| M7 | `M7 (was DevtoolsDock l.1060): a new record after a replay keeps the replayed form and reaches the rail` | #57 |
| M8 | `M8 (was DevtoolsDock l.1152): a new head leaves both the explorer and the simulation...` | #61 |
| M9 | `M9 (was DevtoolsDock l.1197): visiting every tab and returning leaves every other store's snapshot as it was` | #64 |
| M10 | `M10 (a): the same ports...`, `M10 (b): new ports drop...`, `M10 (c): configuring with every field identical...` | none (new) |
| M11 | `M11 (was DevtoolsDock l.435): the bound reaches the timeline` (re-states #25); `M11: a new bound empties the timeline, keeps the tab, filters and choices...` (new) | #25 |
| M12 | `M12: clearing the timeline empties the rows, counts and rails and keeps the tab` | none (#6 stays) |
| M13 | `M13: closing the model's scope interrupts a simulation run in flight...` | none (new) |
| M14 | `M14 (was DevtoolsDock l.162): a record accepted by one model is absent from the other` | none (#8 stays) |
| M15 | `M15 (D-14): a new source releases the previous read and feeds the timeline...` | none (new) |
| M16 | `M16 (D-14): closing the model's scope releases the source...` | none (new) |
| P1 | `P1: after any sequence of accept, clear, setPaused and configure...` | none (INV-QD-296) |

The nine DOM cases to delete in 26-05 are #25, 47, 48, 49, 55, 56, 57, 61, 64 (the "was DevtoolsDock" ones except M14, whose DOM case #8 stays as wiring).

## Deviations from Plan

None - plan executed as written. Two notes that are not deviations:

- **Phase 25 renames:** the plan's `setAction` and `choosePolicyAt` exist under those names, so no rename was needed. `choosePolicyAt` is not used (M5 uses `choosePolicy(policy)`, which the interface still has). The plan's `run("Live")` in M13 is `chooseSource("Live")` then `run("Run")`: `RunKind` is `"Run" | "Sweep"` and the source is a separate choice.
- **`Source.read` of the hand-built source in M15/M16** is an `Effect.gen` (not `Effect.fn`): it is a constructed value in a test, as in `TimelineStore.test.ts`'s `runSource` block.

## TDD Gate Compliance

RED commit `8785c80f` (`test(26-01): ...`) exists and fails for the one intended reason. Its evidence is a load failure of the test file (`Failed to resolve import "../../src/model/DockModel.ts"`), which `gsd_run check tdd-red-evidence` would classify as `fixture_or_load_failure`; the plan (D-10, WX-06) defines this as the RED state, and 26-02 is the GREEN commit. Semantic assessment: the file is a test of a module that does not exist yet, so no assertion can run; its assertions were checked against a throwaway reference implementation of the interface (20 of 20 pass; `tsc -p tsconfig.test.json` and `pnpm lint:style` clean) and against two mutations of it (no simulation push: 7 tests fail; a source change that never re-reads: M15 fails). The throwaway file was deleted before the commit and `git diff 7396491d -- packages/devtools/src` is empty. One reference mutation survived on purpose: calling `simulation.setPorts` on every `configure` is not observable, because `SimulationSession.setPorts` guards an identical value itself (26-02's M10 mutation target, not a gap).

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None: a test file and planning artifacts only.

## Next Phase Readiness

26-02 can implement `makeDockModel` against `DockModel.test.ts` and the `<interfaces>` block of `26-01-PLAN.md`; `tsc -p tsconfig.test.json` is red on the missing module until then, as in 25-02.

---
*Phase: 26-headless-dock-model*
*Completed: 2026-11-11*

## Self-Check: PASSED

- FOUND: 26-base.txt, 26-mutation-base.json, packages/devtools/test/model/DockModel.test.ts, this SUMMARY
- FOUND: commits 4fbf56ec, 8785c80f (`git merge-base --is-ancestor` ok)

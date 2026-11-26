---
phase: QD-87-one-scoped-run-that-states-its-stop
plan: 05
subsystem: devtools-model
tags: [devtools, stated-run, configure-prologue, superseding-run, seen-failing, model-property]

phase_base: 56b9ae4d98ebd1f950369c9830d4a310727895ac
plan_head_before: 78a942179def5be4d2f51f7a368a35c0aa0892ae
plan_head_after: 5d40fece161812e7f69792d9de6c501dd76caead

requires:
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: 87-03's 87-check.mjs (stated-run-shape, prologue-shape, suite, seen-failing, commit, trailers); 87-04's earlier-phase ledger; 87-01's red rows (ten rows red on the base)
provides:
  - packages/devtools/src/model/StatedRun.ts, the package-private scoped run a store starts (publish, then fork) whose stop is stated once for a current run whose own work ended on anything but success
  - packages/devtools/src/model/ConfigurePrologue.ts, the one configure order (closed, complete, held, same, hold, steps) with the identity gate a parameter
  - StatedRun.test.ts (ST1 to ST17) and ConfigurePrologue.test.ts (CP1 to CP8), each row seen failing under a named scratch edit
affects: [QD-87 plans 06 to 11, every store that is rewired onto the two modules]

actuals:
  tokens: 9000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a stop stated from the forked body's own exit (Effect.exit, then a current-run gate), so an outside interruption, which never resumes the body, is never read"
    - "a begin-window row (an engine that starts a newer run in its synchronous start and then ends) as the only test that reaches the current-run gate"
    - "a configure prologue as a rule of five callbacks plus a steps function, each call logged by a recording rule"

key-files:
  created:
    - packages/devtools/src/model/StatedRun.ts
    - packages/devtools/src/model/ConfigurePrologue.ts
    - packages/devtools/test/model/StatedRun.test.ts
    - packages/devtools/test/model/ConfigurePrologue.test.ts
  modified:
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-RED-EVIDENCE.md

key-decisions:
  - "StatedRun states a stop for a current run whose engine exit is not success, an interruption the run gave itself included, and never reads Cause.hasInterruptsOnly; an outside interruption is never stated because each outside path replaces or clears the current run before it interrupts it."
  - "ST17's command alphabet gains a Nest command (an engine that starts a newer run in its synchronous start, then dies or interrupts itself), because without it every engine ends in the start's own step while current and the model cannot reach the current-run gate."
  - "ConfigurePrologue imports nothing at run time and is out of both barrels."

requirements-completed: []

coverage:
  - id: D1
    description: "makeStatedRun publishes the starting state, forks the engine in a finally, rethrows a starting throw by identity once the engine started, and states one stop in causeMessage text for a current non-success exit"
    requirement: STOP-02
    verification:
      - kind: test
        ref: "packages/devtools/test/model/StatedRun.test.ts#ST1 to ST6"
        status: pass
    human_judgment: false
  - id: D2
    description: "a superseded run, stop, a close with a dying release, a begin-window natural end (die and self-interrupt) and a start after close state nothing and the guard drops a stale write"
    requirement: STOP-04
    verification:
      - kind: test
        ref: "packages/devtools/test/model/StatedRun.test.ts#ST7 to ST17"
        status: pass
    human_judgment: false
  - id: D3
    description: "makeConfigure reads closed, complete, held, same, hold, then calls steps(wanted, before), the gate a parameter"
    requirement: STOP-03
    verification:
      - kind: test
        ref: "packages/devtools/test/model/ConfigurePrologue.test.ts#CP1 to CP8"
        status: pass
    human_judgment: false
  - id: D4
    description: "every ST and CP row was seen failing under a named scratch edit; the phase checks and the gates are clean"
    requirement: WX-06
    verification:
      - kind: other
        ref: "87-check.mjs seen-failing, stated-run-shape, prologue-shape, suite, trailers; tsc -p tsconfig.test.json; oxlint; check-house-style; pnpm circular (the Task 1 to 3 verifies)"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-11-25
status: complete
---

# Phase 87 Plan 05: The stated run and the configure prologue Summary

**Two package-private model modules with complete, seen-failing tests: `makeStatedRun`, the scoped run that publishes then forks and states a current run's non-success exit once as `causeMessage` text, and `makeConfigure`, the one configure order with its identity gate a parameter.**

## Performance

- **Duration:** about 45 min
- **Tasks:** 3 (one tracer, two auto)
- **Files:** 4 created (two modules, two tests), 1 modified (the evidence file); nothing else under `packages` moved

## Accomplishments

- **Tracer.** `StatedRun.ts` and ST1 to ST6 ran green and were seen failing before any expansion task: `starting()` moved after the fork (ST1, ST2), `causeMessage` replaced by `String(exit.cause)` (ST3, ST5), `!Cause.hasInterruptsOnly` added (ST4), and a success stated (ST6). The module is the research prototype with its docs: the stop rule, the "interruption from outside is never stated" paragraph and the ADR-QD-194 rethrow, each once. Committed as `feat(87-05): add the stated run`.
- **What it never states.** ST7 to ST16 pin a newer start, `stop` of a running engine, `stop` with no run (with the `collectingTracer` positive control), `stop` after completion, a close mid-run with a dying release (with a current die stated once on the same module), a start after close, the guard, and the begin window: an engine that starts a newer run in its synchronous start and then dies (ST14) or interrupts itself (ST15), and a starting state that starts a newer run (ST16). Every "states nothing" row carries a positive control on the same module. Committed as `test(87-05): pin what the stated run never states`.
- **ST17**, a fast-check model over `Start` (ok, die, self-interrupt, never, each with or without a dying release), `Nest`, `Stop` and `Close`, 300 runs at a fixed seed (fast-check prints it on failure), asserting the stated labels, the starting publishes and `closed` after every step, with coverage floors for each kind of event.
- **The configure prologue.** `makeConfigure(rule, steps)` and `ConfigureRule<Raw, Held>`, no runtime import, doc stating each step's reason. CP1 to CP8 run it against a recording rule that logs each call with its arguments. Committed as `feat(87-05): add the configure prologue`.
- **Gates.** The full devtools suite fails on exactly the ten rows red on the base (`suite`); `tsc -p tsconfig.test.json`, oxlint, `check-house-style.mjs` (632 files), `pnpm circular`, `stated-run-shape`, `prologue-shape`, `trailers`, `scan-ids`, `scan-forbidden`, the pinned check (122 held, 5 of 5 born) and `87-earlier-checks.mjs` (28 runs) all pass.

## Deviations from Plan

### Auto-fixed Issues

None.

### Interpretations (recorded as the choice taken, each the most complete option)

**1. The listed scratch edit for ST6 leaves it green; a narrower edit is named.** Reducing the stop condition to `runs.isCurrent(token)` leaves ST6 green, because `causeMessage` of a success exit throws inside the forked body before it states anything. The recorded edit is the stop condition `runs.isCurrent(token)` stating `Exit.isFailure(exit) ? causeMessage(exit.cause) : "ended"` (2 rows failed: ST1, ST6).

**2. The listed edit of the stop condition to `Exit.isFailure(exit)` kills only ST14, ST15 and ST17, not the outside-interruption rows.** An outside interruption never resumes the forked body, so dropping the gate cannot change ST7, ST8, ST11 (the spike's finding). Narrower edits are named per row: the body read through `Effect.onExit` with no gate (ST7, ST11), `stop` made a no-op (ST8), `stop` stating a reason (ST9, ST10), `plan.starting()` moved before `runs.begin()` (ST16), the closed return removed (ST12), the guard not reading `isCurrent` (ST13).

**3. The CP2 edit is `complete` moved after `held`, not after `same`.** The gate needs the wanted value, so `complete` cannot move after it; moved after `held` it fails CP2, CP3 and CP8.

**4. ST17 gains a `Nest` command beyond the alphabet the plan lists.** With only start, stop and close every non-`Never` engine ends in the start's own step while current, and dropping the current-run gate left ST17 green. `Nest` (an engine that starts a newer `Never` run in its synchronous start, then dies or interrupts itself) reaches the gate; the gate edit now fails ST14, ST15 and ST17.

**5. A self-interrupt with a dying release is stated as the release's defect.** `Cause.pretty` of an interrupt plus a die prints only the defect, so the model labels that run `release`, not `interrupt`; the stop is still stated once.

**6. Two words of the module doc were reworded in the first commit (amended).** `no longer current` is phase-relative wording to the earlier phases' `scan-ids`, which changed the first stderr line of two ledger rows of `87-earlier-checks.mjs` (they expect the measured first line). The doc now says `not current`; the commit was amended before anything else sat on it, and the earlier-phase run is exit 0 again.

**Total deviations:** 0 auto-fixed, 6 interpretations. **Impact:** none on scope; the evidence file names each narrower edit.

## Issues Encountered

- My first splice of ST7 to ST17 into the test file inserted nothing (a placeholder expression); caught by the row count before any run and redone from a scratch file.
- ST17's first run failed on its own model (a self-interrupt with a dying release reads as the release's defect, see interpretation 5); the model was corrected, not the module.

## Known Stubs

None.

## Threat Flags

None: two package-private model modules and their tests, no network endpoint, auth path or schema. T-87-12 (a stale run writing over the current one) is mitigated and pinned: the guard reads `isCurrent` before it writes (ST13) and the stop is gated by it (ST14, ST15, ST17 fail when it is dropped). T-87-13 (a lost failure) is pinned by ST3 to ST5 and ST17, and T-87-14 (a swallowed listener throw) by ST2 and ST16.

## Self-Check: PASSED

- Files exist: `StatedRun.ts`, `ConfigurePrologue.ts`, `StatedRun.test.ts` (17 rows), `ConfigurePrologue.test.ts` (8 rows), and the sections `## 87-05 the stated run` and `## 87-05 the configure prologue` of the evidence file.
- Commits are ancestors of HEAD, each with the one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer: `654154d8` `feat(87-05): add the stated run`, `c6ee9068` `test(87-05): pin what the stated run never states`, `5d40fece` `feat(87-05): add the configure prologue`; `87-check.mjs commit` for each and `trailers` (14 commits since the base) exit 0.
- `unchanged` over `SupersedingRun.ts`, the three feeds, the session, both barrels, `src/react` and `packages/core/src` exits 0; no scratch file under `packages`, no `.vitest/`; every scratch edit restored with `cp` and confirmed with `cmp`.

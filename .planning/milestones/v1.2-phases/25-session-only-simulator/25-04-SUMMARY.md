---
phase: 25-session-only-simulator
plan: 04
subsystem: devtools
tags: [simulator, react, view, scope, strict-mode, preserve-contract]
requires:
  - phase: 25-session-only-simulator
    provides: "25-03: the scoped session with setAction, choosePolicyAt, policyMenu, cost, baselineReading and Ran.reading; useScoped and the owner hooks"
provides:
  - "Simulator as a view of { session }: no owned path, no sightings/seed/ports props, no codec, no select parse, no reading computed"
  - "Simulator.test.tsx building every session in a scope the test owns and closes in afterEach"
  - "useSimulationSession.test.tsx: the owner hooks' scope pinned in React (StrictMode double mount, unmount, first-pass undefined, seed prop)"
affects: [25-05]
actuals:
  tokens: 12000
  tasks: 2
  commits: 2
plan_head_before: 20eff723a88688affa7bbdfb4699ed666c944da1
plan_head_after: 0db2be102df78303bc10fbcb0ab9029c6e4c0948
commits: 2
tech-stack:
  added: []
  patterns:
    - "a DOM test builds its session with Effect.runSync(Scope.provide(makeSimulationSession(init), scope)) in a scope it closes in afterEach; a prop change becomes a session command inside act"
    - "a view reads menu, cost sentence, reading and baseline sentence from the snapshot and dispatches positions and text, never values it parsed"
key-files:
  created:
    - packages/devtools/test/react/useSimulationSession.test.tsx
  modified:
    - packages/devtools/src/react/Simulator.tsx
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/test/react/Simulator.test.tsx
key-decisions:
  - "No DOM test was deleted: each stays as wiring proof, so WX-05's tests-before-deleting rule holds trivially"
  - "BaselineCard receives snapshot.baselineReading as `BaselineReading | undefined` and reads it with optional chaining, because the snapshot type does not tie it to a Checked baseline and `!`/`as` are forbidden; the session defines it whenever the baseline is Checked"
requirements-completed: [SIM-01, SIM-02, SIM-03, WX-04, WX-05]
coverage:
  - id: D1
    description: "Simulator renders from { session } only; DevtoolsDock passes the session alone; OwnedSimulator, SharedSimulator and the sightings, seed and ports props are gone"
    requirement: SIM-01
    verification:
      - kind: unit
        ref: "packages/devtools/test/react/Simulator.test.tsx (26 tests over a session the test builds) and DevtoolsDock.test.tsx (untouched, passing)"
        status: pass
      - kind: other
        ref: "pnpm typecheck; grep count of OwnedSimulator|SharedSimulator|useSimulationSession(|withAction|actionOf|readOutcome|matchesBaseline|describeTracePath|const summarise in Simulator.tsx: 12 before, 0 after"
        status: pass
    human_judgment: false
  - id: D2
    description: "The view composes no codec, parses no select value and computes no reading: it dispatches setAction and choosePolicyAt(event.target.selectedIndex) and reads policyMenu, cost, baselineReading and Ran.reading"
    requirement: SIM-02
    verification:
      - kind: unit
        ref: "Simulator.test.tsx#choosing a policy / the cost line is the cost / the baseline card, in each of its states"
        status: pass
      - kind: other
        ref: "grep of the select-value parse /^\\d+$/ in Simulator.tsx: 1 before, 0 after"
        status: pass
    human_judgment: false
  - id: D3
    description: "A component owns the session's scope StrictMode-safely: a run started after mount survives the double mount and unmounting interrupts it; the hook is undefined before its session exists; its seed prop dispatches"
    requirement: SIM-03
    verification:
      - kind: unit
        ref: "packages/devtools/test/react/useSimulationSession.test.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "The on-screen contract is preserved: no theme value, inline style, rendered string, data-testid or aria attribute changed, and 'This is not a denial' is neither moved nor copied"
    requirement: SIM-01
    verification:
      - kind: unit
        ref: "Simulator.test.tsx and DevtoolsDock.test.tsx pass with their assertions unchanged"
        status: pass
    human_judgment: true
    rationale: "A pixel-level preserve check needs a human or a visual-regression run; the tests assert strings and test ids, not styles"
duration: 12min
completed: 2026-11-11
status: complete
---

# Phase 25 Plan 04: The Simulator is a view of its session Summary

**`Simulator` now takes `{ session }` and nothing else: the dropdown, the cost line, the run's reading and the baseline sentence come from the snapshot, the select dispatches `choosePolicyAt(event.target.selectedIndex)`, the action input dispatches `setAction`, and every DOM test builds its own session in a scope it closes.**

## Performance

- **Duration:** about 12 min
- **Started:** 2026-11-11T07:14Z (approximate; not recorded at start)
- **Completed:** 2026-11-11T07:27Z
- **Tasks:** 2
- **Files modified:** 4 (one created)

## Accomplishments

- **Tests first (Task 1).** `Simulator.test.tsx` has a `mount(init)` helper that makes a `Scope`, builds the session with `makeSimulationSession`, renders `<Simulator session={…} />` and registers the scope for `afterEach` to close (T-25-18). The four re-renders with new props became commands inside `act`: `setPorts(brokenPorts)` then `setPorts(undefined)` (C2), `setSightings([b, a])` and `setSightings([a])` (rail reversed and shrunk). The E7.8 unmount test now closes its scope after unmounting, with a comment that the view never owned the session. All 26 tests passed against the view as 25-03 left it, which proves the view change that follows preserves what is on screen.
- **The view (Task 2).** `SimulatorProps` is `{ readonly session: SimulationSession }`. `OwnedSimulator`, `SharedSimulator`, the three own props and their imports are gone; `Controls` renders `policyMenu` and the cost sentence; `CheckCard` dispatches `setAction`; `ResultCard` destructures `reading` from the `Ran` state; `BaselineCard` renders `baselineReading` and `summarise` is deleted (its twin lives in `Replay.ts`). The header comment now says what the screen reads from the session. `DevtoolsDock`'s simulator tab is `<Simulator session={props.simulation} />`; `Screen`'s `sightings` prop stays for the explorer and role viewer.
- **The hook test.** `useSimulationSession.test.tsx` pins, under `<StrictMode>`, that the surviving session's Live run is not interrupted by the double mount and is interrupted exactly once on unmount; that `useSimulationSession` returns `undefined` before its session exists and then a view; and that a `seed` prop arriving later seeds the session.

## Task Commits

1. **Task 1: the DOM tests build their own session** - `1bbdcef2` (test)
2. **Task 2: the view renders its session and computes nothing** - `0db2be10` (refactor)

**Plan metadata:** the `docs(25-04): complete the session-only simulator view plan` commit (STATE.md, ROADMAP.md, REQUIREMENTS.md).

## Counts, before and after (the plan's baselines, same invocations)

| Check | Before | After |
| ----- | ------ | ----- |
| `grep -cE "OwnedSimulator\|SharedSimulator\|useSimulationSession\(\|withAction\|actionOf\|readOutcome\|matchesBaseline\|describeTracePath\|const summarise"` in `Simulator.tsx` | 12 | 0 |
| `grep -cF '/^\d+$/'` in `Simulator.tsx` | 1 | 0 |
| `grep -c "session="` in `Simulator.test.tsx` | 0 | 1 (the helper's one render) |
| `<Simulator` renders in `Simulator.test.tsx` | 32 | 1, with `session=` |
| `grep -cF "This is not a denial"` in `Simulator.tsx` | 1 | 1 (the Inspector's wrapped copy untouched, `git diff` empty) |
| `Simulator.tsx` lines | 710 | 530 |

## Deleted DOM tests and their model counterparts

None deleted. Every cost, baseline and policy DOM test also proves wiring (the sentence the session gives is the one on screen, the select dispatches, a re-rendered rail keeps the dropdown on the chosen policy), so each was kept; the model counterparts from 25-02 (`policyMenu`, `cost`, `baselineReading`, `choosePolicyAt`, `setAction` in `SimulationSession.test.ts`) hold the rules themselves. T-25-10 has nothing to mitigate because nothing was removed.

## Mutation (WX-05)

Not re-measured: this plan touches no file in `25-mutation-base.json` (`SimulationSession.ts` 0.9694 and `Replay.ts` 1.0 after 25-03 are unchanged; the view files are not in the base).

## Decisions Made

- Kept all DOM tests (see above).
- `BaselineCard` takes `reading: BaselineReading | undefined` and reads it with optional chaining. The session defines it whenever the baseline is `Checked`, and a type that tied the two together would have meant a new snapshot shape in a plan that is not about the model; `!` and `as` are forbidden, so the narrow chain is the least change.

## Deviations from Plan

None - plan executed exactly as written. (One scripted rewrite of the test file mangled several renders; it was reverted with `git checkout -- <the file>` before any commit and redone, so no commit carries it.)

## Issues Encountered

- `pnpm typecheck` flagged `renderHook`'s `initialProps` as a literal of the narrower type; fixed by typing it as `UseSimulationSessionInput` before the Task 2 commit.

## Known Stubs

None.

## Threat Flags

None: no new network, auth or file surface; the change removes code from a view.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

25-05 owns the changeset, ADR-QD-137, BEH-QD-460/461, BEH-QD-322's fence, the pending changesets and the final mutation and coverage comparison. `Simulator.tsx` is session-only, so `spec/overview.md` and any doc that shows `<Simulator sightings=… />` should be checked there (`Simulator` is not exported from the React entry, so gate 13 is unaffected). Phase 29 still owns "This is not a denial" and `Duration`'s clock sentence, which stay in the view.

---
*Phase: 25-session-only-simulator*
*Completed: 2026-11-11*

## Self-Check: PASSED

- FOUND: packages/devtools/test/react/useSimulationSession.test.tsx
- FOUND: commits 1bbdcef2, 0db2be10 (`git merge-base --is-ancestor` ok)
- `pnpm vitest run --project devtools` 1193 passed; `pnpm test:bdd` 568 passed; `pnpm typecheck`, `pnpm lint`, `pnpm test:tstyche`, `pnpm circular`, `pnpm spec:api` green

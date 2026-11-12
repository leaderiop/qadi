---
phase: 24-simulation-source-preparation
plan: 02
subsystem: testing
tags: [devtools, simulation, tdd, effect, refactor]

requires:
  - phase: 24-simulation-source-preparation
    provides: 24-01's red prepareSource table test and one-recorder-per-run characterisation test
provides:
  - prepareSource in SimulationSource.ts, availability and sentences written once in a table closed over SourceChoice
  - a session that stores what prepareSource returns and reads no source tag
  - SourceChoice/SourceOption/SourceRefusal moved to SimulationSource.ts, root barrel names unchanged
affects: [24-03]

actuals:
  tokens: 5400
  tasks: 2
  commits: 2

commits: 2
plan_head_before: 0a6d0534b852ad479ef02cd06558b3f2e12c7af3
plan_head_after: 179f366dd81158529006606ed158ce5239f68753

tech-stack:
  added: []
  patterns: ["one availability table closed over a union, read by both the options list and the chosen row"]

key-files:
  created: []
  modified:
    - packages/devtools/src/model/SimulationSource.ts
    - packages/devtools/src/model/SimulationSession.ts
    - packages/devtools/src/index.ts
    - packages/devtools/src/react/Simulator.tsx
    - packages/devtools/test/surface.tst.ts
    - packages/devtools/test/model/SimulationSession.test.ts

key-decisions:
  - "Row table builds a Ready lazily (a thunk), so options for a build() never allocate a recorder for sources not chosen"
  - "Ready is a local Extract of PreparedSource, not a new export"

requirements-completed: [SRC-01, SRC-02, SRC-03, WX-03, WX-04]

coverage:
  - id: D1
    description: "prepareSource returns options and Ready/Refused over all 12 combinations, availability written once"
    requirement: SRC-01
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/SimulationSource.prepare.test.ts#prepares every (choice x ports x capture) combination (ARCH-72)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Live-captures rule lives in SimulationSource.ts; the session inspects no source variant and each run captures with its own recorder"
    requirement: SRC-02
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/SimulationSession.test.ts#a second Live run's capture holds only what that run asked"
        status: pass
      - kind: other
        ref: "grep counts on SimulationSession.ts (all 0), see below"
        status: pass
    human_judgment: false
  - id: D3
    description: "Session suite keeps refusal-as-run-state and capture lifetime; availability asserted only in the table test"
    requirement: SRC-03
    verification:
      - kind: unit
        ref: "pnpm vitest run --project devtools (44 files, 1161 tests) and pnpm test:bdd (568 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Root barrel exports the same names; no switch/as/!/any added; typecheck, lint, tstyche, madge green"
    requirement: WX-03
    verification:
      - kind: other
        ref: "pnpm typecheck && pnpm lint && pnpm test:tstyche && pnpm circular"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-11-11
status: complete
---

# Phase 24 Plan 02: prepareSource, GREEN Summary

**`prepareSource` in `SimulationSource.ts` states each source's availability and sentence once; the session stores what it returns, and 24-01's 12-row table test is green.**

## Performance

- **Duration:** about 10 min
- **Completed:** 2026-11-11T06:05Z
- **Tasks:** 2
- **Files modified:** 6 (no file created)

## Accomplishments
- `prepareSource(choice, { ports, capture })` returns `{ options, prepared }`; `prepared` is `Ready{source, captured}` or `Refused{refusal}`. One private `rowsOf` table, typed `{ [K in SourceChoice]: SourceRow }`, holds each source's `why` and its refusal; `options` maps `["Fixtures","Snapshot","Live"]` over it and `prepared` reads the chosen row. The Live row builds `capturing(ports)` and wraps it with `live(...)`, so the defining rule ("a Live run captures, which is what makes Snapshot available") exists only in that module.
- `SimulationSession.ts` lost `ResolvedSource`, both reason constants, `resolveSource`, `sourceOptions`, the `_tag === "Live"` check, the `ports !== undefined` re-check, `capturing` and the `live(recorder.layer)` re-wrap. `build()` and `runEffect` each call `prepareSource` afresh and branch only on `prepared._tag`; the module header now names `prepareSource` for the refusal and capture rules.
- The root barrel names the same three types from `./model/SimulationSource.ts`; `surface.tst.ts` pins `prepareSource` as not exported.
- Session suite: the "resolveSource and sourceOptions" describe and "says what each option offers" are deleted; C2 refusal, C3 capture-lifetime and the ARCH-72 one-recorder-per-run test are untouched.

## Grep counts (before / after, in the order the plan listed)

| Check | SimulationSession.ts before | after | SimulationSource.ts before | after |
| ----- | --------------------------- | ----- | -------------------------- | ----- |
| `capture === undefined` | 2 | 0 | 0 | 1 |
| `ports === undefined` | 2 | 0 | 0 | 1 |
| `_tag === "Live"` / `capturing(` / `live(` | 3 | 0 | n/a | 2 (the Live row, by design) |
| `resolveSource\|sourceOptions\|ResolvedSource` | 11 | 0 | 0 | 0 |

`SimulationSession.test.ts`: `resolveSource|sourceOptions` 11 before, 0 after.

## Session tests deleted, and the table rows that replace them

| Deleted test | Replaced by |
| ------------ | ----------- |
| `resolveSource and sourceOptions > resolves each choice, or says why not` (Fixtures/Live-with-ports Available; Live-without-ports and Snapshot-without-capture Unavailable) | the 12-row table: `Ready`/`Refused` for every (choice, ports, capture), with the refusal `_tag` and its `reason` |
| `resolveSource and sourceOptions > offers all three, enabled only when usable, each with a reason` | the table's `options` `[id, enabled]` matrix per row, and `says why each option is or is not usable` (the four `why` fragments, now as full sentences) |
| `says what each option offers` (the three sentences, Snapshot's enabled sentence, Snapshot resolving to a Snapshot source) | `says why each option is or is not usable` (all six sentences) and the table's `prepared.source._tag === choice` and `source.answers === capture` checks |

No assertion lacked a counterpart, so nothing was added to `SimulationSource.prepare.test.ts` first.

## Task Commits

1. **Task 1: GREEN, prepareSource and the thinner session** - `01a71d23` (refactor, the type the plan names)
2. **Task 2: availability assertions out of the session suite** - `179f366d` (test)

## TDD Gate Compliance

RED is 24-01's `d998f7e3` (`test(24-01): ...`, red by absence, `prepareSource is not a function`). This plan is the GREEN half: `SimulationSource.prepare.test.ts` (3 tests) turned green in `01a71d23`. The plan prescribes `refactor(24-02):` for that commit, so a `git log --grep='^feat\(24-02\)'` check finds no `feat` commit; the GREEN commit is the `refactor(24-02)` one, per the plan's own message. No further REFACTOR commit was needed.

## Decisions Made
- The table's `ready` is a thunk, so `build()` (every commit) only makes a recorder for the chosen Live row and options for unchosen rows allocate nothing.
- `Ready` is a file-local `Extract<PreparedSource, ...>`; the session uses the same `Extract` inline rather than a new export.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Simulator.tsx imported the moved types from SimulationSession.ts**
- **Found during:** Task 1 (`pnpm typecheck`, TS2459 on `src/react/Simulator.tsx:39-41`)
- **Issue:** the plan's file list did not include `Simulator.tsx`, which imports `SourceChoice`, `SourceOption` and `SourceRefusal` from `../model/SimulationSession.ts`.
- **Fix:** import the three types from `../model/SimulationSource.ts`.
- **Files modified:** `packages/devtools/src/react/Simulator.tsx`
- **Verification:** `pnpm typecheck` green after Task 2.
- **Committed in:** `01a71d23`

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** a two-line import move forced by the type move; no scope creep.

## Issues Encountered
`pnpm typecheck` stays red between Task 1 and Task 2 by design (the session suite still imported `resolveSource`/`sourceOptions`); it is green after Task 2.

## Known Stubs
None.

## Threat Flags
None. T-24-04 (refused Live never answered from fixtures) is held by the table's `Refused` rows and the unchanged C2 tests; T-24-05 by a fresh `prepareSource` per run with the ARCH-72 test green; T-24-06 by `surface.tst.ts` and the unchanged barrel names.

## Notes for 24-03
`spec/overview.md`, `spec/decisions/050-a-simulation-is-sealed.md` and `spec/behaviors/29-devtools-simulator.md` still mention `resolveSource`/`sourceOptions`/the old module of the three types; the plan assigns spec and gates to 24-03. Mutation was not re-run here: compare `SimulationSource.ts` and `SimulationSession.ts` against `24-mutation-base.json` in 24-03.

## Self-Check: PASSED

- FOUND: packages/devtools/src/model/SimulationSource.ts (`export const prepareSource`), SimulationSession.ts, index.ts, Simulator.tsx, surface.tst.ts, SimulationSession.test.ts
- FOUND commits: 01a71d23, 179f366d (both reachable from HEAD; `git rev-list --count` from plan base = 2)
- Re-ran: devtools project (1161 pass), BDD (568 pass), typecheck, lint (house-style clean), tstyche, madge

---
*Phase: 24-simulation-source-preparation*
*Completed: 2026-11-11*

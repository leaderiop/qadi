---
phase: 26-headless-dock-model
plan: 05
subsystem: devtools
tags: [dock-model, tests, dedup, coverage]
requires:
  - phase: 26-headless-dock-model
    provides: "26-01's DockModel.test.ts (M1-M16, P1), green since 26-02, and 26-04's dock as a view of the model"
provides:
  - "DevtoolsDock.test.tsx holds 63 cases, all layout and wiring; the 13 Model-class cases are gone"
affects: [26-06]
actuals:
  tokens: 5200
  tasks: 1
  commits: 1
plan_head_before: e4e042c9a54fc8b6ade39b047b3c010b88f4ebd0
plan_head_after: 3a1976bb7c2ebf6961892b54e6125524919a3044
commits: 1
tech-stack:
  added: []
  patterns:
    - "where a DOM case went, a one-line comment names the model test that now states its rule"
key-files:
  created: []
  modified:
    - packages/devtools/test/react/DevtoolsDock.test.tsx
key-decisions:
  - "No model test had to be written: all 13 rules already had a green headless test, so DockModel.test.ts is untouched"
requirements-completed: [DMOD-02, WX-05]
coverage:
  - id: D1
    description: "The 13 DOM duplicates of model rules are deleted from the dock test, each after its model test was confirmed green in the same run, leaving 63 layout and wiring cases"
    requirement: DMOD-02
    verification:
      - kind: unit
        ref: "pnpm vitest run --project devtools packages/devtools/test/react/DevtoolsDock.test.tsx: Tests 63 passed (63); the 13 title greps all silent"
        status: pass
    human_judgment: false
  - id: D2
    description: "Devtools coverage still holds after the deletions"
    requirement: WX-05
    verification:
      - kind: other
        ref: "pnpm coverage exit 0 (176 files, 4580 tests); lcov over devtools src/react: lines 99.10, functions 96.57, branches 94.10; src/model: lines 100, functions 100, branches 99.33"
        status: pass
    human_judgment: false
duration: 4min
completed: 2026-11-11
status: complete
---

# Phase 26 Plan 05: The dock test keeps only what rendering can prove Summary

**`DevtoolsDock.test.tsx` drops its 13 Model-class cases (76 to 63) after confirming each rule has a green headless test in `DockSession.test.ts` or `DockModel.test.ts`; the devtools project is 46 files, 1222 tests, and `pnpm coverage` passes.**

## Performance

- **Duration:** about 4 min
- **Started:** 2026-11-11T12:59Z
- **Completed:** 2026-11-11T13:04Z
- **Tasks:** 1
- **Files modified:** 1 (237 lines changed: 14 added, 223 removed)

## Accomplishments

- Step 1: `DockModel.test.ts` and `DockSession.test.ts` run together green (2 files, 47 tests) and every title the plan names exists. No model test was missing, so none was written.
- Step 2: the 13 cases are deleted. The whole `replays the same row again` describe went with its three cases, and so did its four helpers (`replayRow`, `policySelect`, `twoRows`, `rowOf`), which nothing else used. `mountCatalogue`, `tree`, `leaveAndReturn` and every import stay: the three remaining round-trip cases and the others still use them. Six one-line comments mark the gaps.
- Step 3: the whole devtools project, `tsc -p tsconfig.test.json`, `pnpm lint:style` (454 files clean) and `pnpm coverage` pass.

## Deleted case to model test map

| # | Deleted dock case | Rule now stated in |
| - | ----------------- | ------------------ |
| 3 | the counts do not narrow when the filter does | `DockSession.test.ts` "a filter that hides every error still counts the error" |
| 4 | offers exactly the environments present, not a fixed pair | `DockSession.test.ts` "reads rows, counts and environments of the timeline it is given" |
| 25 | renders no more rows than the capacity allows | `DockModel.test.ts` M11 "the bound reaches the timeline" |
| 27 | a row click opens it on that evaluation | `DockSession.test.ts` "holds the key, moves to the inspector, and reads the row as Selected" |
| 42 | a pair badge reaches a partner the filter has hidden | `DockSession.test.ts` "a row filtered to one environment still carries its partner from the other" and "survives a filter that hides its row" |
| 47 | the policy rail fills from the log alone | `DockModel.test.ts` M1 |
| 48 | a declared catalogue adds names and unrun policies | `DockModel.test.ts` M2 |
| 49 | roles come only from the catalogue | `DockModel.test.ts` M3 |
| 55 | replays the same row again after another policy was chosen | `DockModel.test.ts` M5 |
| 56 | replays the same row again after the form was edited | `DockModel.test.ts` M6 |
| 57 | a timeline change after a replay keeps the replayed form | `DockModel.test.ts` M7 |
| 61 | a new head during the visit does not change what the explorer shows | `DockModel.test.ts` M8 |
| 64 | leaves the log, the inspector and the explorer where they were | `DockModel.test.ts` M9 |

Wiring that the deletions do not leave bare: the capacity prop still reaches the dock through "a selection dropped by capacity says the buffer moved on" (`capacity={1}`); the catalogue prop through the explorer and role round-trip cases (`mountCatalogue`); the replay button through "replaying from the inspector switches tab and seeds the form"; the filter chips through "an environment chip narrows, and the reset chip widens again"; row selection through every inspector case that clicks a row.

## Coverage line

`pnpm coverage` exited 0, so no `does not meet` threshold line fired. The text reporter omits devtools rows, so the figures below are summed from `coverage/lcov.info` (statements are not in lcov):

| Glob | Lines | Functions | Branches | Threshold |
| ---- | ----- | --------- | -------- | --------- |
| `packages/devtools/src/react/**` | 99.10 | 96.57 | 94.10 | 90 |
| `packages/devtools/src/model/**` | 100.00 | 100.00 | 99.33 | 95 |

## Task Commits

1. **Task 1: confirm the model tests, delete the 13 duplicates** - `3a1976bb` (test)

**Plan metadata:** the `docs(26-05): complete the dock test dedup plan` commit (SUMMARY, STATE.md, ROADMAP.md).

## Decisions Made

None beyond the plan. One judgement: the comment left at the capacity case points at "a selection dropped by capacity" as the surviving wiring case, because it is the only remaining dock case that passes `capacity` through the dock.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Tests count 1235 before, 1222 after (13 fewer, all in the dock file).

## Known Stubs

None.

## Next Phase Readiness

26-06 (spec, invariants, mutation compare, changeset) is unblocked. Its notes from 26-04 stand: `spec/behaviors/28-devtools-screens.md:772` and `spec/invariants.md:3246` still name `useOwnedDockSession` in prose.

## Self-Check: PASSED

- FOUND: `packages/devtools/test/react/DevtoolsDock.test.tsx` with 63 `it(` lines; none of the 13 titles present.
- FOUND: commit `3a1976bb` (ancestor of HEAD).

---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
plan: 04
subsystem: devtools
tags: [hydration-view, model-row, table-test, type-test, mutation-probe]
requires:
  - phase: QD-85
    provides: "85-01: the born hydration cells; 85-02: 85-check.mjs, whose no-react-in-model mode judges the view; 85-03: the pinned and earlier-phase checks"
provides:
  - "packages/devtools/src/model/HydrationView.ts: HydrationInput, the closed HydrationDropsView (None, Raised) and HydrationView (Pending, Unwired, Counts) unions and hydrationView, a function declaration; package-private, in neither barrel"
  - "packages/devtools/test/model/HydrationView.test.ts: rows V1 to V17 with exact strings, each seen failing under a scratch edit"
  - "packages/devtools/test/model/HydrationView.tst.ts: the two unions pinned closed, the counts arm's field types and the input's two required fields, with no counted negative pin"
  - "85-RED-EVIDENCE.md: the 85-04 section (red on the base, seventeen failed rows, one tstyche failure, the probe line)"
affects: [85-05, 85-07, 85-09, 85-10]
tech-stack:
  added: []
  patterns:
    - "A model view whose every literal, comparison and constructor call sits in a function declaration body, so ignoreStatic leaves no Ignored mutant"
key-files:
  created:
    - packages/devtools/src/model/HydrationView.ts
    - packages/devtools/test/model/HydrationView.test.ts
    - packages/devtools/test/model/HydrationView.tst.ts
  modified:
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: Counts carries the four numbers as plain fields, rate as string | undefined, drops as HydrationDropsView (None { text } | Raised { rows }) and scope as one string, so the panel renders fields and joins nothing"
  - "Decided autonomously: the scope sentence is built whole in scopeOf (lead and either reading), not as two fields, because the panel's text nodes join to one sentence and a test asserts it whole"
  - "Decided autonomously: V17's in-place-mutation check runs after the first call, because a view that reverses its input restores the order on the second call and the row would pass"
  - "Decided autonomously: the Stryker probe found no Ignored mutant, so the Research Q4 fallback (an IGNORED_ALLOWED list) was not needed and 85-mutation.mjs is unchanged"
requirements-completed: [HYDV-02, WX-04, WX-05, WX-06]
status: complete
duration: 15min
completed: 2026-11-25
commits: 2
plan_head_before: 33e3ff7a0fd8977742dc074bc1f2951db6fe9b78
plan_head_after: 8fddc8e7db719b43f5021b3885b7f22460f85068
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "hydrationView decides pending, unwired or counts (counts win over an unsampled poll) and states the rate, the all-clear or raised rows, and the scope sentence, with every arm and boundary a table row"
    requirement: HYDV-02
    verification:
      - kind: test
        ref: "packages/devtools/test/model/HydrationView.test.ts#hydrationView"
        status: pass
      - kind: other
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-check.mjs no-react-in-model"
        status: pass
    human_judgment: false
  - id: D2
    description: "The two unions cannot widen silently and the input's two fields are required"
    requirement: WX-04
    verification:
      - kind: test
        ref: "packages/devtools/test/model/HydrationView.tst.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "A Stryker probe of HydrationView.ts alone finds 41 mutants, all Killed, none Survived, NoCoverage or Ignored"
    requirement: WX-05
    verification:
      - kind: other
        ref: "pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/HydrationView.ts"
        status: pass
    human_judgment: false
---

# Phase QD-85 Plan 04: The hydration block as a pure view Summary

The hydration block's three-state decision and every count-dependent sentence (the re-check rate with its singular, the
all-clear or the raised rows, the scope note with `entry`/`entries`) are now one pure `hydrationView` in `src/model/`,
seventeen table rows each seen failing and all 41 of its mutants killed. Nothing reads it yet; 85-05 serves it and 85-07
renders it.

## Performance

- **Duration:** about 15 min
- **Completed:** 2026-11-25
- **Tasks:** 2 (a tracer and an auto task)
- **Files:** 3 created, 1 appended

## Accomplishments

- `HydrationView.ts` exports `HydrationInput`, `HydrationDropsView`, `HydrationView` and `hydrationView`; it imports only
  `effect/Data` and `./Hydration.ts`, holds only imports, types, the two `Data.taggedEnum` constants and function
  declarations, and appears in neither barrel. `85-check.mjs no-react-in-model` passes.
- The table was seen red on the base (the module did not exist), then green (17 of 17), then each row was seen failing under
  one scratch edit of the view: precedence swapped, Pending or Unwired for both absent cases, a number read from the wrong
  field, the rate at zero, singular and plural rules dropped, the all-clear count taken from the raised drops or fixed at
  9, the filter at `>= 0` and at `> 1`, a row altered in passing, the `y`/`ies` rule and the scope branches swapped, the
  scope lead shortened, and the input array reversed in place. The view was restored from a copy after each.
- `HydrationView.tst.ts` pins both tag unions exactly, the counts arm's field types, and that neither input field is
  optional; it adds no `not.toBeCallableWith` or `not.toBeConstructableWith` pin, so `NOT_CALLABLE_PIN_BUDGET` does not move.
  `pnpm test:tstyche` is green in both passes (79 files) and was seen failing with a fourth tag `Hidden: {}`.
- The Stryker probe (A2): `HydrationView.ts` alone has 41 mutants, all Killed. No Ignored mutant, so the function-declaration
  shape is sufficient and the Research Q4 fallback was not applied.

## Task Commits

1. **Task 1 (tracer): the view and its table** - `feat(85-04): the hydration block as a pure view` (`1631f6a6`)
2. **Task 2: the unions pinned closed and the probe** - `test(85-04): pin the hydration view's unions closed` (`8fddc8e7`)

## Deviations from Plan

None - plan executed exactly as written.

Two points decided autonomously are in `key-decisions`: the scope sentence is one field, and V17 checks the input after the
first call. The tracer feedback gate re-ran the task's `<verify>` end to end and passed: tracer verified, expanding.

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None. The view carries only the counts, reasons and meanings the block shows today (T-85-07, pinned by V4 and V12); escaping
a foreign reason stays the renderer's (T-85-08).

## Issues Encountered

None. A first scratch run of the Vitest JSON reporter wrote an untracked `.vitest/` directory in the repository root; it was
removed.

## Next Phase Readiness

Ready for 85-05, which serves `hydrationView` as the dock model's hydration store.

## Self-Check: PASSED

- `packages/devtools/src/model/HydrationView.ts`, `packages/devtools/test/model/HydrationView.test.ts` and
  `packages/devtools/test/model/HydrationView.tst.ts` exist.
- Both task verifies exit 0; `pnpm exec tsc -p tsconfig.test.json --noEmit` is clean; `node scripts/check-house-style.mjs` is clean.

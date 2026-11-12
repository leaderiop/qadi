---
phase: 29-restated-facts
plan: 02
subsystem: react-devtools
tags: [hydration, devtools, locality, tidy]
phase_base: 50c7292d5da586ca7a25ce321dbfa838f8873b06

requires:
  - phase: 29-01
    provides: mutation baseline for HydrationEngine.ts, Verdict.ts, Inspector.tsx, Simulator.tsx
provides:
  - "ALLOW_WITHHELD and DENY_WITHHELD: the hydration withheld-field lists, written once"
  - "FAILURE_IS_NOT_A_DENIAL: the one failure sentence, in devtools model/Verdict.ts"
affects: [29-03]

actuals:
  tokens: 1500
  tasks: 2
  commits: 2
plan_head_before: 28ceebc8cf0266ef169d9d5d5ca855797e451ead
plan_head_after: d4813a1564345f95f86b84491a2d3af176d52ad9

tech-stack:
  added: []
  patterns:
    - "a restated list becomes one module-scope `as const` tuple read by schema and projection"

key-files:
  created: []
  modified:
    - packages/react/src/HydrationEngine.ts
    - packages/devtools/src/model/Verdict.ts
    - packages/devtools/src/react/Inspector.tsx
    - packages/devtools/src/react/Simulator.tsx

key-decisions:
  - "TIDY-02 adds no test: HydrationPayload.test.ts already guards it"
  - "FAILURE_IS_NOT_A_DENIAL stays out of both devtools barrels (D-05)"

requirements-completed: [TIDY-02, TIDY-03, WX-04, WX-06]

duration: 2 min
completed: 2026-11-12
status: complete
---

# Phase 29 Plan 02: Withheld fields and the failure sentence Summary

**Hydration's two withheld-field lists are `ALLOW_WITHHELD`/`DENY_WITHHELD`, read by both the entry schemas and `dehydrateDecision`, and the "failure is not a denial" sentence is the single `FAILURE_IS_NOT_A_DENIAL` constant in `model/Verdict.ts`, rendered by the inspector and the simulator.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-11-11T23:19:34Z
- **Completed:** 2026-11-11T23:20:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- The four inline `Struct.omit(..., [...])` lists became two tuples; the deny list's tail `"obligations", "reason"` now appears once. `Struct.omit` accepted the `as const` tuples for both the schema field record and the encoded value without a cast.
- The sentence now exists once in `packages/devtools/src`; both panels render `{FAILURE_IS_NOT_A_DENIAL}` inside their own container, heading and test ids. Rendered text is byte-identical.
- No wire byte changed; no export list changed (`pnpm spec:api`: 907 exports, unchanged).

## Which test guards TIDY-02 (D-04)

No test was added. The existing `packages/react/test/HydrationPayload.test.ts` "what a seed carries is what the server decided" (`%s survives dehydrate, JSON and hydrate`) dehydrates eight policies, including a denial (`HasRole (denied)`) and allows, each with `includeTrace` false and true, then hydrates through `hydrateWith`, whose `decodeEntry` runs under `UNTRUSTED_DECODE_OPTIONS` (`onExcessProperty: "error"`); a dropped or excess-field entry leaves no seeded decision and fails the case. The two `JSON.stringify` pins in the same file ("withholds the trace and the reason by default", "discloses ... under includeTrace") fix the exact bytes for allow and deny both ways.

## Where the failure sentence was found

`Inspector.tsx` `FailurePanel` and `Simulator.tsx` `SimulatedFailure` only, as 29-01 recorded.

## Task Commits

1. **Task 1: TIDY-02, withheld lists stated once** - `47d08a41` (refactor)
2. **Task 2: TIDY-03, one failure sentence** - `d4813a15` (refactor)

## Files Created/Modified

- `packages/react/src/HydrationEngine.ts` - `ALLOW_WITHHELD`, `DENY_WITHHELD`, four call sites
- `packages/devtools/src/model/Verdict.ts` - `FAILURE_IS_NOT_A_DENIAL`
- `packages/devtools/src/react/Inspector.tsx` - renders the constant
- `packages/devtools/src/react/Simulator.tsx` - renders the constant

## Decisions Made

None beyond D-03, D-04, D-05 as written in 29-CONTEXT.

## Deviations from Plan

None - plan executed exactly as written. One plan-text inaccuracy, not a deviation: the plan said `Simulator.tsx` imports nothing from `model/Verdict.ts`, but it already imported `verdictOfOutcome`; the constant was added to that existing import.

## Issues Encountered

None. Pre-existing lint warnings are untouched.

## Known Stubs

None.

## Threat Flags

None. T-29-02 held (decode guard tests green before and after); T-29-04 held (the three wording tests in `Inspector.test.tsx`, `Simulator.test.tsx`, `DevtoolsDock.test.tsx` pass unedited; `git diff` of `packages/devtools/test` against the phase's first commit is empty).

## Verification run

- `pnpm vitest run --project react`: 25 files, 416 tests passed
- `pnpm vitest run --project devtools`: 1222 tests passed
- `pnpm typecheck`, `pnpm lint` (house-style: 457 files clean), `pnpm spec:api`: green
- No mutation run and no baseline taken (29-03 compares against 29-01's). Note for 29-03: module-scope constants are `Ignored` under `ignoreStatic`, so `HydrationEngine.ts`'s mutant pool may shrink; no behaviour test was deleted.

## Next Phase Readiness

29-03 can start: it needs `phase_base` and `d02_fallback` from 29-01's frontmatter and this plan's two files-changed lists.

## Self-Check: PASSED

---
*Phase: 29-restated-facts*
*Completed: 2026-11-12*

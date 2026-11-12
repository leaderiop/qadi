---
phase: 35-the-atom-set-owns-its-eviction-sweep
plan: 01
subsystem: testing
tags: [react, mutation-testing, characterisation, effect-reactivity, stryker]
phase_base: 14dc8212d591d04291e002d08780dc9f75ce549a
plan_head_before: 14dc8212d591d04291e002d08780dc9f75ce549a
plan_head_after: c2333e7d810497507d1b4c7d119ea6893b9ccba5

requires:
  - phase: 34-diagnostics-as-the-dock-model-s-seventh-store
    provides: closed phase and a clean packages/ tree to baseline against
provides:
  - 35-mutation-base.json, the mutation baseline later plans are compared with
  - S1, the pin that nothing sweeps an atom set without a provider
  - P1..P4, the pins of the provider's sweeper count (one, three, StrictMode, Activity)
affects: [35-02, 35-03, 35-04, 35-05, 35-07]

actuals:
  tokens: 1330
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "counting double: a spread atom set whose sweepEvictions is a counting Effect.sync, no vi.mock"

key-files:
  created:
    - .planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-mutation-base.json
    - packages/react/test/QadiAtoms.sweep.test.ts
    - packages/react/test/QadiProvider.sweep.test.tsx
  modified: []

key-decisions:
  - "P3 measured at 2 on the base, as 35-RESEARCH predicted; the title and assertion state 2"
  - "QadiAtoms.ts and QadiProvider.tsx were both instrumented by Stryker through the CLI override, so both are measured and unmeasured is empty"

requirements-completed: [WX-05, WX-06, SWEEP-04]

coverage:
  - id: D1
    description: "Mutation baseline for QuestionBook.ts, QadiAtoms.ts and QadiProvider.tsx, written once and committed first"
    requirement: WX-05
    verification:
      - kind: other
        ref: "node verify of 35-mutation-base.json (keys, measured scores, new, deleted) and first-commit-alone check"
        status: pass
    human_judgment: false
  - id: D2
    description: "S1: with no provider, five released readers on a bare registry leave asked() at 5 over a bound of 2"
    requirement: WX-06
    verification:
      - kind: unit
        ref: "packages/react/test/QadiAtoms.sweep.test.ts#S1 with no provider nothing sweeps"
        status: pass
    human_judgment: false
  - id: D3
    description: "P1..P4: the provider's sweeper count under one provider, three, StrictMode and a hidden-then-shown Activity"
    requirement: SWEEP-04
    verification:
      - kind: unit
        ref: "packages/react/test/QadiProvider.sweep.test.tsx#the provider's sweeper"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-12
status: complete
---

# Phase 35 Plan 01: Baseline and Characterisation Pins Summary

**Mutation baseline for the three eviction-sweep files plus five mock-free pins (S1, P1..P4) of today's sweep behaviour, all green on the untouched base and committed before any src change.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-11-12T20:23:50Z
- **Completed:** 2026-11-12T20:26:46Z
- **Tasks:** 3
- **Files modified:** 3 (all new; no `packages/*/src` change)

## Accomplishments

- Reserved-number check: `ARCH-83`, `ADR-QD-148`, `CCR-QD-426`, `BEH-QD-511..515`, `INV-QD-315`, `INV-QD-316` have no hit in spec, packages, .changeset, AGENTS.md, apps/website/src or examples; `spec/decisions` has no `148-` file; the reservation counters are CCR 427, ADR 148, BEH 520, INV 318, so every number lies inside it.
- Baseline measured with one Stryker run (alone, in the background, exit 0, 203 mutants, 86.07% over the three files). Log: `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/35-stryker-base.log`.
- S1 and P1..P4 pass on the base and describe the behaviour 35-04 and 35-05 flip.

## phase_base

`14dc8212d591d04291e002d08780dc9f75ce549a` (the parent of the `chore(35-01)` commit; the plan was written at `6df5fcdb`, HEAD had advanced by the `docs(35): create phase plan` commit).

## Baseline JSON (as printed by the writer)

```json
{"measured":{"packages/react/src/QuestionBook.ts":0.9444444444444444,"packages/react/src/QadiAtoms.ts":0.8947368421052632,"packages/react/src/QadiProvider.tsx":0.75},"unmeasured":{},"new":["packages/react/src/SweepScheduler.ts"],"deleted":{}}
```

No file was refused by Stryker, so `unmeasured` is empty.

## Survivors per file (file, line, mutator)

QuestionBook.ts (4 survived, 0 no coverage):
- 98 BooleanLiteral (`inBook = true` to false)
- 130 BooleanLiteral (`entry.inBook = true` to false)
- 157 ConditionalExpression and 157 EqualityOperator (`if (excess <= 0) return;`)

QadiAtoms.ts (6 survived, 0 no coverage):
- 253 ConditionalExpression (x4, at columns 3, 15 twice, 34), 253 LogicalOperator (x1, column 15)
- 307 ConditionalExpression (x1, column 19)

QadiProvider.tsx (18 survived, 0 no coverage):
- 239 ArrayDeclaration; 292 ConditionalExpression; 303 BooleanLiteral
- 306, 312, 328, 349, 355, 360 ArrayDeclaration (dependency arrays emptied)
- 315 BlockStatement; 318 BlockStatement, ConditionalExpression, EqualityOperator; 319 CallExpression
- 322, 323 BlockStatement; 324 CallExpression (the registry disposal timer)

## Pin runs on the untouched base

- `pnpm vitest run --project react packages/react/test/QadiAtoms.sweep.test.ts`: `Tests  1 passed (1)`
- `pnpm vitest run --project react packages/react/test/QadiProvider.sweep.test.tsx`: `Tests  4 passed (4)`
- P3's measured number: 2 (StrictMode double-mounts the sweep effect once).

## Existing pins kept unchanged

- `packages/react/test/QadiProvider.test.tsx`, describe `sweepIntervalMillis`: "periodically evicts cold questions in the background, never a mounted gate's own" and "stops sweeping once the provider unmounts" (the over-the-bound-after-unmount pin; flips in 35-04).
- `packages/react/test/QadiAtoms.test.ts`, the `sweepEvictions` suite.

Neither file was edited.

## Task Commits

1. **Task 1: mutation baseline** - `a94cee6c` (chore)
2. **Task 2: no-provider pin** - `c317446e` (test)
3. **Task 3: provider sweeper-count pins** - `c2333e7d` (test)

**Plan metadata:** the `docs(35-01)` commit that follows this file.

## Files Created/Modified

- `.planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-mutation-base.json` - the baseline
- `packages/react/test/QadiAtoms.sweep.test.ts` - S1
- `packages/react/test/QadiProvider.sweep.test.tsx` - P1..P4

## Decisions Made

None beyond following the plan; P3 stated at 2 because the base produces 2.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `pnpm typecheck && pnpm lint` print only pre-existing oxlint warnings (none in the new files) and house-style clean.

## Known Stubs

None.

## Next Phase Readiness

Ready for 35-02 (the spike). It reads `phase_base` from this file.

## Self-Check: PASSED

- Created files exist: 35-mutation-base.json, QadiAtoms.sweep.test.ts, QadiProvider.sweep.test.tsx.
- Commits a94cee6c, c317446e, c2333e7d are the first three `(35-0` commits, each carrying one file; `git rev-list --count 14dc8212..HEAD` is 3; `git status --porcelain -- packages` is empty.

---
*Phase: 35-the-atom-set-owns-its-eviction-sweep*
*Completed: 2026-11-12*

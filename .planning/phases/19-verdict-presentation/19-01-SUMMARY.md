---
phase: 19-verdict-presentation
plan: 01
subsystem: devtools
tags: [verdict-treatment, display-state, INV-QD-006, mutation-base]

phase_base: 9483aac
mutation_baseline:
  packages/devtools/src/model/Gates.ts: 100 (43/43)
  packages/devtools/src/model/Inspect.ts: 100 (78/78)
  packages/devtools/src/model/Verdict.ts: 100 (14/14)
mutation_after:
  packages/devtools/src/model/Gates.ts: 100 (44/44)
  packages/devtools/src/model/Inspect.ts: 100 (78/78, unchanged)
  packages/devtools/src/model/Verdict.ts: 100 (14/14)

requires: []
provides:
  - "`DisplayState` (8-member closed union), `displayOfVerdict`, `displayOfNodeStatus` in model/Verdict.ts (package-private)"
  - "`displayOfGateState` in model/Gates.ts; `GATE_STATES` now derived from the closed `GATE_DISPLAY` map (package-private)"
  - "react/VerdictTreatment.ts: `Treatment`, `treatmentOf`, `tagStyle` (package-private)"
  - "theme.ts: `colors.denyInk` and the shared `badge` base"
affects: [19-02, 19-03]

key-files:
  created:
    - packages/devtools/src/react/VerdictTreatment.ts
    - packages/devtools/test/react/VerdictTreatment.test.tsx
    - .planning/phases/19-verdict-presentation/19-base.txt
    - .planning/phases/19-verdict-presentation/19-mutation-base.json
    - .planning/phases/19-verdict-presentation/19-mutation-after-01.json
  modified:
    - packages/devtools/src/model/Verdict.ts
    - packages/devtools/src/model/Gates.ts
    - packages/devtools/src/react/VerdictTag.tsx
    - packages/devtools/src/react/QuestionsPanel.tsx
    - packages/devtools/src/react/PolicyTree.tsx
    - packages/devtools/src/react/theme.ts
    - packages/devtools/test/react/QuestionsPanel.gates.test.tsx
    - packages/devtools/test/model/Gates.test.ts

requirements-completed: [VIEW-01, VIEW-02]
duration: ~25 min
completed: 2026-11-10
---

# Phase 19 Plan 01: One verdict treatment Summary

**Every verdict on screen now comes from one total map, `react/VerdictTreatment.ts`, over a closed `DisplayState` union. Deny and Error differ in every channel there, so a failed guard is no longer coloured like a denied one, and a denied policy node is no longer drawn in the error amber.**

## Phase base

`phase_base: 9483aac` (recorded in `19-base.txt`).

## Decisions applied

- `_DECISIONS.md` pre-answers no checkpoint for Phase 19, and this plan raised none.
- D-01 (test first): the Denied/Failed row test and the denied-node test were committed RED in `feef498a`, and they failed on the collapse itself (`expected '#e3a008' to not equal '#e3a008'`).
- D-02: a total record over a closed union, written in full. The gate map lives in `model/Gates.ts` beside `GATE_STATES`, and no string keys remain: `stateColour(state: string)` is gone.
- Claude's discretion (CONTEXT): Pending and Rechecking share one muted treatment and differ only by their word. The reasoning moved from `QuestionsPanel` into `VerdictTreatment.ts`'s `nonAnswer` doc.

## Plan output notes

- **`denyInk` = `#f47067`**: a red that reads as inline text on `colors.surface` and is distinct from the `error` amber and the `allow` green.
- **`Treatment` does need a separate badge ink: `tagInk`.** The DENY badge is light `deny` text on a `denySolid` background, and that text colour is unreadable as inline text on the dark surface. `tagInk` equals `ink` for every other state. The badge looks exactly as it did before.
- `weight` is the inline-text weight: Deny 700, everything else 400. Badges keep their fixed 600 through the shared `badge` base, so they did not change.
- `GATE_STATES` is now `Object.keys(GATE_DISPLAY)`. Its type stays `ReadonlyArray<string>` and the order is unchanged, which a test pins. `displayOfGateState` narrows with an `Object.hasOwn` type predicate (no `as`), so `"toString"` is `Unrecognised`, and a test covers that.
- The `badge` base moved from `VerdictTag.tsx` into `theme.ts` so that `tagStyle` and `EnvironmentTag` share it.
- Nothing was added to the barrel: the `index.ts` diff since the phase base is empty.

## Deviations

None of substance. The planned `tagInk` field was the plan's own named option. Two extra tests: VerdictTag keeps its badge style (solid deny, outlined error), and QuestionsPanel shows an unknown state as itself with `data-treatment="Unrecognised"`.

## Commits

- `feef498a` test(19-01): a denial and a failure must not share a treatment, red
- `ea1980d5` feat(19-01): DisplayState, and the gate and node maps into it
- `386b1b49` feat(19-01): one verdict treatment, and the three panels read only it

## Gate results

- Task 1 RED: both tests failed for the right reason; the other 20 tests in the two files passed.
- Task 2: `Gates.test.ts` 25/25; `pnpm typecheck` green; barrel unchanged; madge clean.
- Task 3: `pnpm vitest run --project devtools`: 42 files, 1142 tests passed. `pnpm typecheck`, `pnpm lint` (exit 0, house-style clean, no devtools warnings) and `pnpm circular` all green. The `stateColour`/`statusColor` count is 0. The verdict-colour-token grep over VerdictTag+PolicyTree is 0.
- Coverage: devtools model (`--coverage.include='src/model/**/*.ts'`) is at 99.93 / 99.39 / 100 / 100.
- Mutation (XC-05): a scoped Stryker run over Verdict/Gates/Inspect. Every file is at 1.0 both at the base and after this plan (`19-mutation-after-01.json`). The `react/` files are outside the devtools Stryker scope.

## Deferred

- **19-02:** the outcome reading (`readOutcome` and the obligation-state union in `model/Inspect.ts`), the Inspector characterisation test, and moving Inspector and Simulator onto it. This plan did not touch `Inspector.tsx`, `Simulator.tsx` or `model/Inspect.ts`.
- **19-03:** all spec records:
  - the INV-QD-006/INV-QD-004 notes
  - the devtools-spec statement that every panel's verdict colour comes from `VerdictTreatment.ts` (the module doc already says so)
  - BEH (429..438), INV (290..294), ADR-QD-131 or a stated reason for none, CCR-QD-409
  - the `@qadi/devtools` patch changeset, which should name the visible change: a Failed guard is now amber and a Denied guard red/bold in QuestionsPanel, and a denied node's mark is red, not amber
  - the per-file mutation compare against `19-mutation-base.json`
  - `pnpm check:pr`

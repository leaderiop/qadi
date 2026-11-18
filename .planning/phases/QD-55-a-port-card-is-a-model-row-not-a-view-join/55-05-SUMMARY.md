---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
plan: 05
subsystem: devtools
tags: [services-panel, services-store, DockModel, useStoreSnapshot, servicesInput, ARCH-102]
requires: [55-04]
provides:
  - "DockModel.test.ts: M49..M54, the services store's reference rules"
  - "ServicesPanel.tsx over the dock model's services store: two hoisted exhaustive tag matchers and a TONE_STYLE table, no wording rule"
  - "servicesInput.ts: the panel tests' written-out input seam"
affects: [55-06, 55-07, 55-08, 55-09]
actuals:
  tokens: 40000
  tasks: 2
  commits: 2
plan_head_before: e3edd485
plan_head_after: 885974de4109f5e3c942a1643a8dfdf43e145fd9
tech-stack:
  added: []
  patterns: ["a panel that takes a store and maps the view's tags to JSX, as QuestionsPanel does", "a panel-test input seam that writes the view out and never calls the join"]
key-files:
  created:
    - packages/devtools/test/react/servicesInput.ts
  modified:
    - packages/devtools/test/model/DockModel.test.ts
    - packages/devtools/src/react/ServicesPanel.tsx
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/test/react/ServicesPanel.test.tsx
    - packages/devtools/test/react/ServicesPanel.reading.test.tsx
key-decisions:
  - "M54 pins a Live to Stopped(sampled) status change keeping the view; Off to Live is asserted only as structurally equal, because configure publishes Starting (unsampled) between the two"
requirements-completed: [CARD-01, CARD-04, WX-04, WX-06]
duration: 9min
completed: 2026-11-18
status: complete
---

# Phase QD-55 Plan 05: The Services panel renders the store Summary

**`ServicesPanel` now takes `{ services, diagnostics }`, reads the dock model's `services` store with `useStoreSnapshot` and maps the view's tags to JSX through two hoisted `Match.tagsExhaustive` matchers and a `TONE_STYLE` table, with the 55-02 characterisation passing unedited and M49..M54 pinning when the store keeps its reference.**

Note: per the executor brief, `REQUIREMENTS.md` is untouched; CARD-* and WX-* close at 55-09. `requirements-completed` copies the plan's ids per the template.

## Commits

1. `e51e4cb4` `test(55-05): the services store keeps its reference unless one of its inputs moved` (DockModel.test.ts only, 0 lines removed)
2. `885974de` `refactor(55-05): the Services panel renders the dock model's services store` (the five files)

## Counts

- `ServicesPanel.tsx`: 325 -> 222 lines.
- `ServicesPanel.test.tsx`: 32 -> 12 cases (the nine kept titles plus three new).
- `ServicesPanel.reading.test.tsx`: 24 cases (20 generated call readings, four `it.effect`) -> 1 ("five consequences, byte for byte").
- `DockModel.test.ts`: 60 -> 66 tests.
- Devtools project: 1586 tests pass. `pnpm typecheck`, `pnpm lint` (house-style: 549 files clean) and `pnpm circular` clean; the lint warnings are in the untracked `.codex/` and pre-existing files.

## Scan output

- `the Services panel renders the store and computes nothing`
- `every deleted render case has its twin (D-14)`
- `one switch commit; the characterisation and the dock suites unchanged`
- `M49..M54 pin the services store's reference rules`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan premise] M54's "Off to Live keeps the reference" is false in the model**
- **Found during:** Task 1
- **Issue:** `model.configure({ diagnostics: {}, reading })` from Off passes through `Starting` (unsampled) before `Live`, so the services store is notified twice and ends on a new, structurally equal reference. The plan and RESEARCH Q3 read this as "the status object changes, the flag does not", which holds for Live to `Stopped` with `sampled: true`, not for Off to Live.
- **Fix:** M54 pins the case the premise describes (a Live feed that stops after sampling keeps the reference, heard 0) and asserts Off to Live only as `deepStrictEqual` on the final view. `reservice` was not changed; narrowing its key to the cases where the flag changes the output would be a model change outside this plan, and the transient is a harmless re-render.
- **Files modified:** `packages/devtools/test/model/DockModel.test.ts`
- **Commit:** `e51e4cb4`

**2. [Rule 1 - Test] The warning-colour assertion compared against an empty colour**
- **Found during:** Task 2
- **Issue:** a plain card's consequence carries `muted`'s colour, so asserting its colour empty failed.
- **Fix:** the defaulted card's colour is asserted non-empty and different from a plain card's.
- **Commit:** `885974de`

**Total deviations:** 2 auto-fixed. **Impact:** none on the panel or the model; M54's title says what it pins. 55-06's mutation run should expect `reservice`'s `unsampled` operand to be killed by M53 (Starting to Live), not M54.

## Known Stubs

None.

## Threat Flags

None. T-55-12 is mitigated by the panel scan (no computing token) and the characterisation; T-55-13 by `TONE_STYLE` keyed by the closed `CardTone` and the kept warning-colour case; T-55-14 holds, every host string being a React text child.

## Next

Ready for 55-06 (mutation after).

## Self-Check: PASSED

`ServicesPanel.tsx`, `servicesInput.ts` and `DockModel.test.ts` exist; `e51e4cb4` and `885974de` are ancestors of HEAD.

---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
plan: 07
subsystem: devtools
tags: [react, diagnostics, notice, accessibility, ui]
status: complete

requires:
  - phase: 34-02
    provides: DiagnosticsStatus, isUnsampled, DiagnosticsReadout.restart
  - phase: 34-05
    provides: DockFrame reads the model's seventh store
  - phase: 34-06
    provides: the React entry and useDiagnostics adapter as built
provides:
  - DiagnosticsNotice (package-private) with DiagnosticsNoticeProps and diagnosticsRootProps
  - ServicesPanelProps.diagnostics and QuestionsPanelProps.diagnostics (required)
  - the suppressed not-handed copy while no sample was taken
  - liveNotice test helper; N1..N10 and D4..D11 pins
affects: [34-08, 34-09]

actuals:
  tokens: 36000
  tasks: 3
  commits: 3
plan_head_before: 5085ec8b540775004e8301e7fa65d296b4961d4f
plan_head_after: 48abf4fd88c51716a0c5bc13408a06bceaad97be
commits: 3

tech-stack:
  added: []
  patterns:
    - "one package-private notice rendered first by every screen that reads the diagnostics; the dock owns the ref that makes an alert once per stop"

key-files:
  created:
    - packages/devtools/src/react/DiagnosticsNotice.tsx
    - packages/devtools/test/react/DiagnosticsNotice.test.tsx
  modified:
    - packages/devtools/src/react/ServicesPanel.tsx
    - packages/devtools/src/react/QuestionsPanel.tsx
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/test/helpers.ts
    - packages/devtools/test/react/ServicesPanel.test.tsx
    - packages/devtools/test/react/QuestionsPanel.test.tsx
    - packages/devtools/test/react/QuestionsPanel.gates.test.tsx
    - packages/devtools/test/react/VerdictTreatment.test.tsx
    - packages/devtools/test/react/DiagnosticsScreens.test.tsx

key-decisions:
  - "The alert mode is re-decided whenever the stop's identity changes, by holding the previous status in state and comparing during render, so a Stopped to Stopped change with the notice still mounted alerts again"
  - "PortCard takes unsampled and noActivityReading separately: RecentCalls needs the plain predicate while the activity text needs it combined with an empty activity"

requirements-completed: [DIAG-05]

duration: 25min
completed: 2026-11-12
---

# Phase 34 Plan 07: The diagnostics notice on every screen that reads it Summary

A stopped or starting diagnostics poll is now stated on the Services and React screens by one shared notice: Starting quietly, Stopped in amber with the verbatim reason, an alert once per stop and a restart button that keeps focus in the screen, with the not-handed copy withheld until a first sample.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 (tracer) | 24dca70c | feat(34-07): the Services screen states a stopped poll and offers a restart |
| 2 | 11352941 | feat(34-07): the Questions screen states the poll's status too |
| 3 | 48abf4fd | test(34-07): the diagnostics notice alone and at the dock |

## Verification

- `pnpm vitest run --project devtools packages/devtools/test/react/ServicesPanel.test.tsx packages/devtools/test/react/DiagnosticsScreens.test.tsx`: Tests 35 passed (35) after Task 1 (31 + D1..D4).
- `pnpm vitest run --project devtools packages/devtools/test/react`: Tests 290 passed (290) after Task 2.
- `pnpm vitest run --project devtools`: Test Files 55 passed (55), Tests 1313 passed (1313) after Task 3; DiagnosticsNotice.test.tsx 10 cases, DiagnosticsScreens.test.tsx 11 cases.
- `pnpm typecheck`, `pnpm lint` (house-style: 478 files clean) and `pnpm circular` pass.
- All three tasks' plan verifies pass, including the mechanical-insertion checks against `phase_base` for ServicesPanel.test.tsx, QuestionsPanel.test.tsx and QuestionsPanel.gates.test.tsx.

## UI-SPEC conformance

Every string, testid, role, token and focus behaviour is applied as written; no row needed a different wording or style. The amber tint and the restart button's focus ring remain the recorded real-browser check for 34-09.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] VerdictTreatment.test.tsx renders QuestionsPanel**
- **Found during:** Task 2 (`pnpm typecheck`)
- **Issue:** the required `diagnostics` prop broke one more `<QuestionsPanel` element, in `packages/devtools/test/react/VerdictTreatment.test.tsx`, which the plan did not list.
- **Fix:** the same mechanical insertion (` diagnostics={liveNotice}` after the tag name, one import line after the last import); no assertion touched.
- **Files modified:** packages/devtools/test/react/VerdictTreatment.test.tsx
- **Commit:** 11352941 (carries six files instead of five)

**2. [Rule 3 - Blocking] Match arm and Screen shape**
- `noticeOf`'s `Stopped` arm needed an annotated parameter (`Binding`) to typecheck; `Screen` binds `const { notice } = props` so the plan's literal check `diagnostics={notice}` holds. Neither changes behaviour.
- **Commit:** 24dca70c

**3. [Plan reshape, same behaviour] D4 shares a helper with D5..D8**
- D4 (new in Task 1) was refactored in Task 2 to use a `throwsFirst()` helper that D5, D7 and D8 also use, along with a `reactTab()` helper. No pre-existing test was touched.

The `isUnsampled` placement (model, not the notice file) is the flagged assumption the plan already recorded.

## Known Stubs

None.

## Threat Flags

None. The reason is rendered as a React text child of a `pre` (N4 asserts the text equals the reason exactly); `maxHeight: 96` bounds the block (N7).

## Self-Check: PASSED

- FOUND: packages/devtools/src/react/DiagnosticsNotice.tsx
- FOUND: packages/devtools/test/react/DiagnosticsNotice.test.tsx
- FOUND commits: 24dca70c, 11352941, 48abf4fd

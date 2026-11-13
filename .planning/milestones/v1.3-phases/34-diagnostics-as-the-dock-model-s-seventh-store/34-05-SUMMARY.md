---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
plan: 05
subsystem: devtools
tags: [react, dock, diagnostics, activity, usestoresnapshot]
status: complete

requires:
  - phase: 34-04
    provides: useStoreSnapshot, the one store-snapshot hook
  - phase: 34-02
    provides: DockModel.diagnostics, the seventh store, polled in the model's scope
provides:
  - useDockModel taking diagnostics and reading, passing both to makeDockModel and configure
  - DevtoolsDock with no useDiagnostics, useMemo or mergeReading; DockFrame reads model.diagnostics
  - K5 flipped (a hidden-then-shown dock samples afresh)
  - DiagnosticsScreens.test.tsx (D1..D3)
affects: [34-06, 34-07, 34-09]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: 17970ba960dac7b38c4b0c757f03a298bbd55903
plan_head_after: d0a9e99eea574cf332befac9ec04ed61df300ff8
commits: 2

tech-stack:
  added: []
  patterns:
    - "the host's diagnostics options and supplied reading are model inputs like the source; the dock merges and forks nothing"

key-files:
  created:
    - packages/devtools/test/react/DiagnosticsScreens.test.tsx
  modified:
    - packages/devtools/src/react/useDockModel.ts
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/test/react/DiagnosticsLifetime.test.tsx

key-decisions:
  - "D3 asserts the supplied reading in the first frame through the supplied wiring's cache card and port activity, not through an absent cache card (see Deviations)"

requirements-completed: [DIAG-01, DIAG-02]  # DIAG-05 not marked: requirements.ready-ids lists it blocked (later plans 34-06..34-09 still declare it)
---

# Phase 34 Plan 05: The dock renders the model's seventh store Summary

The dock hands `diagnostics` and `reading` to `useDockModel` and renders `useStoreSnapshot(model.diagnostics).reading`; nothing in it forks a fiber, memoises or merges.

## Commits

- `551a770c` feat(34-05): the dock renders the model's diagnostics store and forks nothing
- `d0a9e99e` test(34-05): the dock renders its diagnostics store at build, on change and after a rebuild

## K5 flip (DiagnosticsLifetime.test.tsx, the only edited case)

- Title, old: `K5 a hidden-then-shown dock shows the report it held at once`
- Title, new: `K5 a hidden-then-shown dock samples afresh: no report until the first sample after the show`
- Assertion, old (right after the show and the Services click):
  `assert.isNotNull(screen.getByTestId("qadi-cache-card"));` then `assert.strictEqual(counts.builds, 1);` then `waitFor builds === 2`
- Assertion, new: `assert.isNull(screen.queryByTestId("qadi-cache-card"));` then `await vi.waitFor(() => screen.getByTestId("qadi-cache-card"));` then `waitFor builds === 2`

The file is byte-identical to its pin commit up to K5's title (checked by the task's verify). K1..K4 and H1..H3 are unedited and green.

## DevtoolsDock.test.tsx

No flip needed: every case passes unedited, including the supplied-wins cases.

## Deviations from Plan

**1. [Plan inaccuracy - D3 shape]** The plan's D3 asserts the supplied activity text is on screen while `qadi-cache-card` is not yet, and that the card arrives later. The Services panel cannot show a port's activity without a `Read` wiring, and a `Read` wiring always renders the cache card, so that combination is unreachable. D3 instead supplies a `Read` wiring (one port, cache `{ present: true, size: 9 }`) plus activity of 7 calls: in the first frame after hide-then-show, with `builds` still 1, the port shows `7 calls` and the cache card shows `9 completed entries` (a sample of the counted layer would say `absent`), and after the rebuild's build lands (`builds` 2) the supplied reading is still what is shown. It still proves the supplied reading is a build input of the rebuilt model and that the dock holds nothing over from before the hide (K5 covers the no-held-report half). No source change.

## Verification

- `pnpm vitest run --project devtools packages/devtools/test/react/DiagnosticsLifetime.test.tsx packages/devtools/test/react/DevtoolsDock.test.tsx`: `Tests  71 passed (71)`
- `pnpm vitest run --project devtools packages/devtools/test/react/DiagnosticsScreens.test.tsx`: `Tests  3 passed (3)`
- Both tasks' plan verify scripts exit 0 (whole devtools project green); `pnpm typecheck`, `pnpm lint` (house-style clean) and `pnpm circular` pass.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Files and both commits verified present.

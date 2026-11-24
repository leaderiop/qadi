---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 03
subsystem: react-characterisation
tags: [characterisation, instrument, useId, react, hash-hold]
requires: [80-02]
provides:
  - InstrumentToggle.characterisation.test.tsx, the instrument toggle as a context consumer and the registry see it, green on the base
  - GateId.remount.test.tsx, the evidence that a remounted guard registers under a new id
  - 80-characterisation-check.mjs holding the react file, one declared flip, toggle-no-rerender
affects: [80-05, 80-06, 80-08, 80-12]
key-files:
  created:
    - packages/react/test/InstrumentToggle.characterisation.test.tsx
    - packages/react/test/GateId.remount.test.tsx
  modified:
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-characterisation-check.mjs
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-RED-EVIDENCE.md
key-decisions:
  - "The useId branch is `new`: a remounted guard registers under a new id, so the pick is held by id and nothing drops it (no retain(ids) command in 80-05/80-06)"
  - "The useId evidence is split across packages: this plan's react test shows the id, 80-02's dock cell shows the panel's half, because @qadi/devtools does not import @qadi/react"
requirements-completed: [LENS-04, LENS-05, WX-06]
metrics:
  duration: 20min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 9a8220f7e2ada0690715ac29feeb81e0cec09c16
plan_head_after: e4d69027dcbb736846075cc5eb3c4a1b9c8abc9f
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
coverage:
  - deliverable: "the two react test files green on the base under the real provider"
    verification:
      - kind: command
        ref: "the plan's Task 1 verify one-liner (vitest green, one non-zero render count line, commit and unchanged checks)"
        status: pass
    human_judgment: false
  - deliverable: "the check holds both files, --red-recorded passes for five flips, branch prints new"
    verification:
      - kind: command
        ref: "the plan's Task 2 verify one-liner"
        status: pass
    human_judgment: false
---

# Phase QD-80 Plan 03: the instrument toggle and the remounted guard Summary

Two `@qadi/react` characterisations written on the phase base, with no source change: toggling `instrument` renders a
memoised context consumer once more, and a guard unmounted and mounted again registers under a new id, so the stale-pick
branch is `new`.

## Commits

- `2cca1f46` test(80-03): characterise the instrument toggle and the id of a remounted guard (the two test files, 3 passed)
- `e4d69027` chore(80-03): hold the instrument characterisation to its first commit (the check and the evidence)

## What is pinned

`InstrumentToggle.characterisation.test.tsx`, two cells under the real `QadiProvider`:

- "a memoised consumer of the context renders again when instrument is toggled": the one line
  `expect(rendersOnToggle).toBe(1);` (measured on the base: `1`, so the change has something to change).
- "a Can registers when instrument is turned on and unregisters when it is turned off": none, one, none in the registry.

`GateId.remount.test.tsx`, one cell: "a guard unmounted and mounted again in the same position registers under a new id"
(`expect(second).not.toBe(first)`, green on the base).

## The declared flip

`80-characterisation-check.mjs` has a second `FILES` entry, base `2cca1f46a30ea7fd50d070fc34cf3b0d7239a2b2`, with the
flip `toggle-no-rerender`: `      expect(rendersOnToggle).toBe(1);` becomes `      expect(rendersOnToggle).toBe(0);`.
Applied alone to a `cp`-backed copy it failed exactly its own cell (`expected 1 to be +0`, `1 failed | 1 passed`) and
the file was restored with `cp`; `git status --short -- packages` printed nothing afterwards. The check prints
`0 of 4 flips applied` for the dock file and `0 of 1 flips applied` for the react file; self-test 16 passed;
`--red-recorded` passes for all five flips.

## The useId result

`node 80-check.mjs branch` prints `new`. `80-RED-EVIDENCE.md` holds the single line
`- useId: a remounted guard registers under a new id`. So 80-05 and 80-06 keep the pick held by gate id with nothing
dropping it, and add no `retain(ids)` command.

## Deviations from Plan

None in what was executed. The D-08 split the plan states stands: the evidence is a `@qadi/react` test, not a devtools
DOM test, because `@qadi/devtools` does not depend on `@qadi/react` (ADR-QD-053); 80-02's cell 9 is the panel's half.
Formatting only: the three long test titles are wrapped in the `it(\n  "title",\n  fn,\n)` form already used in
`GateRegistration.characterisation.test.tsx`, which moves the flip line's indentation to six spaces.

## For the next plans

- 80-08 (removing `QadiContextValue.instrument`) must apply `toggle-no-rerender` (`toBe(0)`): after the field is gone
  the memoised consumer must not render on a toggle, and the registration cell must stay green unchanged. The writer is
  resolved from `instrument` in `QadiProvider` and reaches guards through `GateScopeContext`, so the context value must
  not depend on it.
- The id is stable per mounted guard and new after a remount, so a pick held by id marks no row for a guard mounted in
  its place (80-02 cell 9 already holds that through the dock).
- The remount test captures ids at separate steps because `useId` counts across a file.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: packages/react/test/InstrumentToggle.characterisation.test.tsx
- FOUND: packages/react/test/GateId.remount.test.tsx
- FOUND: 2cca1f46, e4d69027 (ancestors of HEAD)

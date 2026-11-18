---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
plan: 03
subsystem: devtools
tags: [port-cards, model, dock-model, services-store, PortName, ARCH-102]
requires: [55-02]
provides:
  - "PortCards.ts: portCards(input) as one pure function, the four-tag ServicesView, PortCardRow, ActivityByPort, isPortName, activityByPort"
  - "DockModel.services: the ninth store, recomputed by reservice only when wiring, activity, portCalls or unsampled changes identity"
  - "PortActivity.port: PortName, portActivity read once per registry port through forEveryPort"
affects: [55-04, 55-05, 55-06, 55-07, 55-08, 55-09]
actuals:
  tokens: 21000
  tasks: 2
  commits: 4
plan_head_before: e7bb3e39171a08be97d27243eb24ec671812aa6d
plan_head_after: da77b3e6ab5d6d431fbbefd69e6db00a8dfa75e7
tech-stack:
  added: []
  patterns: ["port cards as a model function with a hoisted Match over the wiring read (counterpart of joinQuestions)", "activity grouped once per call into a PortName-keyed record via tabulatePorts"]
key-files:
  created:
    - packages/devtools/src/model/PortCards.ts
    - packages/devtools/test/model/PortCards.test.ts
  modified:
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/src/model/Wiring.ts
    - packages/devtools/test/model/DockModel.test.ts
    - packages/devtools/test/model/Wiring.test.ts
    - features/features/devtools-screens/devtools-screens.steps.test.ts
key-decisions:
  - "The non-port guard (isPortName, Object.hasOwn(PORTS, name)) lives in PortCards.ts, so Wiring.ts changes only by D-05 and D-06"
  - "The services store keys on four references (wiring, activity, portCalls, unsampled) and returns early when none moved, so a poll that changed nothing notifies nothing"
requirements-completed: [CARD-02, CARD-03, WX-04, WX-06, WX-07]
duration: 6min
completed: 2026-11-18
status: complete
---

# Phase QD-55 Plan 03: Port cards as a model function and the dock model's ninth store

**`portCards(input)` in the new package-private `PortCards.ts` turns a shown reading into a four-tag `ServicesView` with one word-complete row per card, the dock model holds it as its ninth store, and `PortActivity.port` is now the registry's `PortName`, read once per registry port.**

Note: per the executor brief, `REQUIREMENTS.md` is untouched; WX-* close with the milestone and CARD-* with 55-09. `requirements-completed` copies the plan's ids per the template.

## RED

Both RED states were produced before any `packages/devtools/src` commit.

Task 1 (`0a66a45b`, `PortCards.test.ts` and M48 in `DockModel.test.ts`, alone):

```
 FAIL  |devtools| test/model/PortCards.test.ts [ packages/devtools/test/model/PortCards.test.ts ]
Error: Failed to resolve import "../../src/model/PortCards.ts" from "packages/devtools/test/model/PortCards.test.ts". Does the file exist?
 FAIL  |devtools| test/model/DockModel.test.ts > the services store > M48: the services store holds the port cards of the shown reading from the first snapshot
TypeError: Cannot read properties of undefined (reading 'getSnapshot')
 Test Files  2 failed (2)
      Tests  1 failed | 59 passed (60)
```

Task 2 (`4c60eaf4`, `Wiring.test.ts` alone; the registry-order case passes on the base, as the plan said):

```
 FAIL  |devtools| test/model/Wiring.test.ts > portActivity > a word written to a port metric outside the registry is not port activity
AssertionError: expected [ Array(1) ] to deeply equal []
  actual: [ { port: 'NotAPort', calls: 1, retries: 0, timeouts: 0, translationCalls: 0 } ]
```

## Commits

1. `0a66a45b` `test(55-03): port cards and the services store, RED by import` (PortCards.test.ts, DockModel.test.ts)
2. `314082ea` `feat(55-03): the port cards are one model function and the dock model's ninth store` (PortCards.ts, DockModel.ts)
3. `4c60eaf4` `test(55-03): a word outside the port registry is not port activity` (Wiring.test.ts)
4. `da77b3e6` `refactor(55-03)!: PortActivity.port is a PortName, read once per registry port` (Wiring.ts, PortCards.ts, DockModel.test.ts, the devtools-screens step; DockModel.test.ts is `2 1` numstat)

## Test counts

`PortCards.test.ts` 33, `DockModel.test.ts` 60 (M48 added), `Wiring.test.ts` 32 (two added). Task 1's five-file run: 165 passed. Task 2's four-file run: 141 passed. `pnpm test:bdd`: 34 files, 568 tests. `ServicesPanel.characterisation.test.tsx`, `ServicesPanel.test.tsx`, `ServicesPanel.reading.test.tsx` and every React src file are unchanged. `pnpm typecheck`, `pnpm lint`, `pnpm circular` clean; `pnpm -s spec:api` prints `api-surface: 935 export(s) documented across 9 package(s)`.

## Base wording that surprised

- A `NotHanded` wiring read is `Withheld` only when unsampled; the base panel rendered nothing for it (`ServicesPanel.tsx:83`), so the model gets a tag rather than a null. A `Failed` read ignores `unsampled`, as at the base (`:91`).
- The "no activity reading" rule is list-wide: with a non-empty list while unsampled, a port without an entry reads `never called` (pinned in `PortCards.test.ts`).

## Deviations from Plan

**1. [Rule 3 - Blocking] RED test file failed `tsc` on a readonly array**
- **Found during:** Task 1, GREEN typecheck
- **Issue:** `assert.deepStrictEqual(Object.keys(...), forEveryPort(...))` passes a `readonly` array where chai wants a mutable one (TS4104, two sites in `PortCards.test.ts`).
- **Fix:** spread the registry array (`[...forEveryPort((d) => d.port)]`) and amended the unpushed `test(55-03)` RED commit, so the RED commit still contains exactly the two test files and the RED output above is from its pre-amend run.
- **Files modified:** packages/devtools/test/model/PortCards.test.ts
- **Commit:** `0a66a45b`

**2. [Plan check flaw, no code change] Task 1's third automated verify**
- The clause `git diff --name-only <phase_base> HEAD -- packages/devtools/test/react packages/devtools/src/react` prints `ServicesPanel.characterisation.test.tsx`, which 55-02 added after `phase_base`. Nothing under those paths changed in this plan (confirmed with `git log` on them: only the two `test(55-02)` commits); every other clause of that verify passed, and the `## RED` clause is satisfied by this file.

**Total deviations:** 1 auto-fixed (blocking), 1 verify-script note. **Impact:** none on behaviour or scope.

## Known Stubs

None.

## Threat Flags

None. T-55-06 (a `Map` grouping, `tabulatePorts` over the five names, own-key `isPortName`), T-55-07 (`portActivity` reads only registry names, pinned by the `NotAPort` case) and T-55-08 (`reservice` returns early unless an input reference moved) are mitigated as planned.

## Self-Check: PASSED

- `packages/devtools/src/model/PortCards.ts` and `packages/devtools/test/model/PortCards.test.ts` exist; `0a66a45b`, `314082ea`, `4c60eaf4` and `da77b3e6` are ancestors of HEAD.
- Task 1's model-function verify and commit-order verify (apart from the flawed react-path clause above), and all of Task 2's verifies, exit 0.
- `git status` shows only the pre-existing `.planning/config.json` modification (not staged).

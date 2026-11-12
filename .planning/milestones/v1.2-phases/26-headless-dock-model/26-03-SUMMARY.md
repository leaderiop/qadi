---
phase: 26-headless-dock-model
plan: 03
subsystem: devtools
tags: [held-choice, dock-model, tdd, stryker, policy-choice]
requires:
  - phase: 26-headless-dock-model
    provides: "26-02's DockModel (its test pins both sessions through the move) and 26-mutation-base.json"
provides:
  - "HeldChoice.ts: makeHeldChoice (the non-publishing cell), HeldChoiceCell, heldValue, heldIndex; makeHeldChoiceStore rebuilt on the cell"
  - "ExplorerSession and SimulationSession each embed one cell; neither calls resolveHeld or pinHead"
  - "PolicyChoice = Empty | Listed | Evicted | Seeded; ExplorerShown = HeldChoice's Listed and Evicted | Draft"
  - "HeldChoice exported as a type from the devtools barrel, with its spec/overview.md row"
affects: [26-04, 26-05, 26-06]
actuals:
  tokens: 14000
  tasks: 3
  commits: 7
plan_head_before: ca4b857d43bd332c8b71b83d7e7c6cf718499063
plan_head_after: 960a4d131cd09190fb8b6984526e48abbfed8e24
commits: 7
tech-stack:
  added: []
  patterns:
    - "a session embeds a non-publishing cell and owns its single publish, so one effective command notifies once (D-08)"
    - "a union written out in a public type is kept equal to its source by use: the producer returns the source type, a reader consumes it, so either side drifting stops compiling"
key-files:
  created: []
  modified:
    - packages/devtools/src/model/HeldChoice.ts
    - packages/devtools/test/model/HeldChoice.test.ts
    - packages/devtools/src/model/ExplorerSession.ts
    - packages/devtools/test/model/ExplorerSession.test.ts
    - packages/devtools/src/react/PolicyExplorer.tsx
    - packages/devtools/src/react/RoleViewer.tsx
    - packages/devtools/src/model/SimulationSession.ts
    - packages/devtools/test/model/SimulationSession.test.ts
    - packages/devtools/src/react/Simulator.tsx
    - packages/devtools/src/index.ts
    - packages/devtools/test/surface.tst.ts
    - packages/devtools/test/react/useSimulationSession.test.tsx
    - features/features/devtools-simulator/devtools-simulator.steps.test.ts
    - spec/overview.md
key-decisions:
  - "the session's cell is named `chosen`, not `choice`: seedOf, start and chooseSource already take a parameter called `choice`"
  - "ExplorerShown is derived (`Exclude<HeldChoice<PolicySighting>, Empty> | Draft`) rather than written out, so it cannot drift from HeldChoice; PolicyChoice is written out as the plan says, and kept equal by use"
  - "heldValue and heldIndex stay ternaries on `_tag`; the three survivors they produced were killed by a test that gives an Empty a value and an Evicted an index, not by a Match rewrite (Match over a generic A does not unify, TS2322)"
  - "the HeldChoice overview row was added here, not left to 26-06: gate 13 fails on an unlisted barrel export"
requirements-completed: [DMOD-04, WX-04, WX-05]
coverage:
  - id: D1
    description: "One held-choice cell (makeHeldChoice) with total readers; the store is the cell plus one publish and keeps every existing behaviour"
    requirement: DMOD-04
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/HeldChoice.test.ts (34 tests); pnpm vitest run --project devtools: 46 files, 1235 tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both sessions embed the cell; PolicyChoice and ExplorerShown carry HeldChoice's arms; RoleViewer reads heldValue/heldIndex with no local re-mapping; the conditional pin survives"
    requirement: DMOD-04
    verification:
      - kind: unit
        ref: "ExplorerSession.test.ts (incl. :503 one notify per command), SimulationSession.test.ts (does not pin while a replayed row is seeded; holds a policy chosen before the rail has any), RoleViewer.test.tsx, PolicyExplorer.test.tsx, DockModel.test.ts"
        status: pass
      - kind: integration
        ref: "pnpm --filter @qadi/features exec vitest run features/devtools-simulator (20 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "HeldChoice is a named public type; no other export changes; no budgeted construct added; the three touched model files are not below their baseline"
    requirement: WX-05
    verification:
      - kind: other
        ref: "pnpm spec:api, test:tstyche, lint:style, circular, tsc -p tsconfig.test.json; stryker compare prints `HeldChoice.ts 97.22 100.00 ok`, `ExplorerSession.ts 91.57 91.62 ok`, `SimulationSession.ts 96.94 97.45 ok`"
        status: pass
    human_judgment: false
duration: 9min
completed: 2026-11-11
status: complete
---

# Phase 26 Plan 03: One held-choice cell for both sessions Summary

**`makeHeldChoice` is the one place "a choice from a list, held by value" lives: both sessions embed it and publish once themselves, `PolicyChoice` and `ExplorerShown` carry `HeldChoice`'s own arms, and `RoleViewer` reads `heldValue`/`heldIndex` instead of re-mapping.**

## Performance

- **Duration:** about 9 min
- **Started:** 2026-11-11T12:44Z
- **Completed:** 2026-11-11T12:53Z
- **Tasks:** 3 (7 commits: RED, GREEN per task, plus one mutation test)
- **Files modified:** 14 (no file created)

## The cell's final names

`HeldChoice.ts`: `makeHeldChoice(initial, same): HeldChoiceCell<A>` with `list()`, `held()`, `resolve()`, `setList(list): boolean`, `pin()`, `choose(value): boolean`; `heldValue(choice)` and `heldIndex(choice)`; `makeHeldChoiceStore` is the cell, one `pin()` at construction and on every effective `setList`, and one `publish`. A cell pins nothing at construction, so `SimulationSession` can leave a seeded session unpinned.

## Renamed test sites

Tags and field names only; no assertion's meaning changed.

- `SimulationSession.test.ts`: every `"Chosen"` to `"Listed"` (17 lines), `"None"` to `"Empty"` (3: :1121, :1173, :1741), `policy.policy`/`left.policy`/`back.policy` to `.value.policy` on a listed or evicted choice (:525, :542, :555, :1158, :1179, :1191, :1201, :1229, :1237, :1341, :1359, :1373), and `policy.label` to `.value.label` (:1159, :1220, :1238). The Seeded reads (:1104, :1267) are unchanged.
- `ExplorerSession.test.ts:152`: `shown.sighting` to `shown.value` (the only site).
- `useSimulationSession.test.tsx:191`: `"Chosen"` to `"Listed"`.
- `devtools-simulator.steps.test.ts`: :452 and :739-742 (`"Chosen"` to `"Listed"`, `policy.policy` to `policy.value.policy`), :616 (`"None"` to `"Empty"`).
- `surface.tst.ts`: `HeldChoice` added to the type list. `surface.test.ts` lists runtime values only, so it is unchanged.

## Mutation (WX-05)

Plan's single Stryker command over the three files, then its compare script:

| File | Baseline | Now |
| ---- | -------- | --- |
| HeldChoice.ts | 97.22 | 100.00 |
| ExplorerSession.ts | 91.57 | 91.62 |
| SimulationSession.ts | 96.94 | 97.45 |

The first run left `HeldChoice.ts` at 95.24 (3 survivors, all in `heldValue`/`heldIndex`: an Empty carrying no value reads `undefined` either way, and so does an Evicted with no index). A `Match` rewrite did not typecheck over a generic `A` (`Unify<A | undefined>`), so the readers stayed ternaries and a test now hands them an Empty with a value and an Evicted with an index; that killed all three. No threshold was lowered and no disable comment was added.

## Task Commits

1. **Task 1: the cell and its readers** - `847ddbae` (test, RED), `d9791a81` (feat, GREEN)
2. **Task 2: ExplorerSession on the cell** - `70b22fa8` (test, RED), `3c647b19` (feat, GREEN)
3. **Task 3: SimulationSession on the cell, PolicyChoice reshaped** - `e532e923` (test, RED), `e4ec0272` (feat, GREEN)
4. **Mutation bar** - `960a4d13` (test)

**Plan metadata:** the `docs(26-03): complete the held-choice cell plan` commit (SUMMARY, STATE.md, ROADMAP.md).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `HeldChoice` needed a `spec/overview.md` row in this plan**
- **Found during:** Task 3 (`pnpm spec:api`)
- **Issue:** the new barrel export fails gate 13 until the overview names it.
- **Fix:** one row in the devtools types table, right after the `SimulationSession` row that lists `PolicyChoice`: `HeldChoice`, type, `model/HeldChoice.ts`. **26-06 must not add a second row for it.**
- **Files modified:** spec/overview.md
- **Committed in:** `e4ec0272`

**2. [Rule 1 - Bug] one missed test rename**
- **Found during:** Task 3 GREEN (`tsc -p tsconfig.test.json`): `SimulationSession.test.ts:555` still read `back.policy`.
- **Fix:** `back.value.policy`, folded into the GREEN commit rather than a fixup.
- **Committed in:** `e4ec0272`

**3. [Rule 3 - Blocking] the `@qadi/features` run reads `packages/devtools/lib`**
- **Found during:** Task 3 verify: three steps saw the old tags until the typecheck graph was rebuilt (`tsc -b tsconfig.json`, which `lib/` is gitignored output of). After the rebuild the `devtools-simulator` feature passes (20 tests). Not a code change.

### Departures from the plan's wording

- `ExplorerShown` is `Exclude<HeldChoice<PolicySighting>, { _tag: "Empty" }> | Draft`, not a written-out union. It satisfies the must-have ("the non-`Empty` held arms | `Draft`") and cannot drift. `PolicyChoice` is written out as specified; its equality with `HeldChoice<PolicySighting>` is kept by use (see tech-stack patterns and the type's doc comment), not by a separate assertion constant, because `noUnusedLocals` would reject one.
- `choosePolicy` and the explorer's `choose` no longer replace the held sighting object when `sameSighting` says the new one equals it (the cell's `choose` is a no-op then, as the store's always was). The resolved choice reads the list's own element while listed, so nothing visible changed in any test; it only matters for an evicted choice re-chosen while a run is not idle, which now keeps the sighting's original label instead of the derived one.

**Total deviations:** 3 auto-fixed (1 blocking spec row, 1 test rename, 1 build-order note), 2 wording departures.

## Issues Encountered

None beyond the above.

## Known Stubs

None.

## Next Phase Readiness

- 26-04 and 26-05 can read the held choice through `heldValue`/`heldIndex` and `PolicyChoice`'s new tags. The dock's own simulation-policy read (`DockModel.test.ts` M8) reads through `policyMenu`, and passed unedited.
- The `HeldChoice` overview row exists; 26-06 should not repeat it.

## Self-Check: PASSED

- All seven commit hashes above are ancestors of HEAD.
- `resolveHeld(`/`pinHead(` count in both sessions is 0; `"Chosen"` appears nowhere under `packages/devtools/src`; `export type { HeldChoice }` is in `src/index.ts`.
- `pnpm vitest run --project devtools` 46 files / 1235 tests; the `devtools-simulator` feature 20 tests; `tsc -p tsconfig.test.json`, `lint:style`, `circular`, `test:tstyche`, `spec:api`, `spec:gates` all green.

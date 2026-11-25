---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 06
subsystem: devtools-dock-model
tags: [lens, dock-model, store-list, configure-sweep]
requires: [80-05]
provides:
  - "DockModel.lens: the dock model's tenth store, built by makeLensSession() beside dock and returned beside it"
  - "the store-list test and the ConfigureRule per-store sweep (storesOf, storeNames, snapshotsOf, heardOnEach, silent, CR22) at ten stores"
affects: [80-07, 80-09, 80-10, 80-12]
key-files:
  modified:
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/test/model/DockModel.test.ts
    - packages/devtools/test/model/ConfigureRule.test.ts
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-RED-EVIDENCE.md
key-decisions:
  - "useId branch is new, so the model does not subscribe the lens to the questions store and the lens has no retain; the model gains no tab rule (decided autonomously, per the recorded branch)"
  - "the lens is not touched by configure and the header's Its stores paragraph is unchanged"
requirements-completed: []
metrics:
  duration: 15min
  completed: 2026-11-24
status: complete
commits: 1
plan_head_before: cd0913507b9850cd72bef7a668e5529baed272d4
plan_head_after: 1865d9a1
actuals:
  tokens: 6000
  tasks: 2
  commits: 1
coverage:
  - deliverable: "the tenth store pinned by the store list and the per-store sweep, each changed cell seen failing on the unchanged model"
    verification:
      - kind: command
        ref: "the plan's Task 1 verify one-liner (model tests green; three titles seen failing; branch --check, scan-forbidden, scan-ids; 79-pinned-check; the interface line)"
        status: pass
    human_judgment: false
  - deliverable: "typechecked with the repository, clean under the house rules, committed"
    verification:
      - kind: command
        ref: "pnpm typecheck; node scripts/check-house-style.mjs (602 files clean, 3 declared switches); 80-check.mjs commit; 80-check.mjs trailers"
        status: pass
    human_judgment: false
---

# Phase QD-80 Plan 06: the dock model owns the lens as its tenth store Summary

`makeDockModel` builds `makeLensSession()` beside the dock session and returns it as `lens`; the interface lists it with a
doc comment; `configure` and the header paragraph are untouched. The store-list test, a new bare-lens cell and the
ConfigureRule per-store sweep (including CR22's two count records, `lens: 0`) cover it.

## Commit

- `1865d9a1` feat(80-06): the dock model owns the lens as its tenth store

## Seen-failing evidence (recorded in 80-RED-EVIDENCE.md under `## 80-06 the tenth store`)

Tests changed first, run on the unchanged model: 8 failed, 77 passed.

- a built model's members with subscribe and getSnapshot are exactly this list
- a bare model holds the lens idle, with nothing drawn and nothing picked
- CR16, CR17, CR18, CR19, CR20 (each reads a store of the sweep through `storesOf`/`snapshotsOf`/`heardOnEach`/`silent`)
- CR22 (retitled to ten counts: 2, 2, 3, 3, 0, 1, 0, 2, 1 and 0)

## Test counts

- DockModel.test.ts + ConfigureRule.test.ts + LensSession.test.ts: all green after the source change.
- Full devtools project: 1895 passed, 2 failed (the two `Lens.dock.test.tsx` cells, as expected until 80-07), 1897 tests in 83 files.
- Gates: `pnpm typecheck` passes; house-style `602 file(s) clean (3 declared switch(es), 76 type-test file(s))`; Phase 79's
  `79-pinned-check.mjs` and `79-characterisation-check.mjs` pass (M55, M56 untouched).

## Deviations from Plan

None. The plan text was duplicated in the file (a second copy of the frontmatter ran into the Task 1 action); the intent
was clear and followed. Edge truths: the store list is compared as a set; boundary at nine or eleven fails through the
same `sameMembers`; the `silent` record and CR22 hold `lens: 0`; the model holds no lens subscription of its own and no
resource, so closing its scope needs nothing from the lens (backstop truth, no test).

## Known Stubs

None.

## Notes for the next plan

- `DockModel.lens` is a `LensSession`; 80-07 passes it from the dock into `QuestionsPanel` and `useLens`. There is no `retain`.
- The ConfigureRule sweep now counts ten stores; nothing else in the repository depends on the nine.

## Self-Check: PASSED

- `packages/devtools/src/model/DockModel.ts` contains `makeLensSession()` and the `  readonly lens: LensSession;` line: found.
- Commit `1865d9a1` is on `arch-wave-14`; `80-check.mjs commit` and `trailers` pass.

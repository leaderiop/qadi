---
phase: 15-dock-session
plan: 04
subsystem: devtools
tags: [devtools, spec, changeset, mutation, phase-gate]

requires: ["15-01", "15-02", "15-03"]
provides:
  - "ADR-QD-047 Rev 1.10 amendment (the dock's state is model; replay is a command; ARCH-20 D-20-g reversed for replay)"
  - "BEH-QD-389 (28-devtools-screens.md), BEH-QD-390 (29-devtools-simulator.md); BEH-QD-322 fence lists seed and replay"
  - "INV-QD-107 Source/Enforcement name DockSession.ts, useDockSession.ts, DockSession.test.ts"
  - "CCR-QD-405; .changeset/dock-session.md (@qadi/devtools patch)"
affects: [16-01]

actuals:
  tasks: 3
  commits: 4

key-files:
  modified:
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/decisions/index.yaml
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
    - spec/devtools-spec/01-shell.md
    - spec/README.md
    - .changeset/simulation-session.md
    - apps/website/src/content/docs/docs/packages/devtools.md
  created:
    - .changeset/dock-session.md

requirements-completed: [DOCK-01, DOCK-02, DOCK-03, DOCK-04, DOCK-05]

completed: 2026-11-10
status: complete
---

# 15-04 — Phase 15's records, and the phase closed green

No checkpoint was pending: `_DECISIONS.md` has no answer for Phase 15, and none was needed. D-06 and D-07 of
`15-CONTEXT.md` were applied as written.

## Task 1 — ADR amendment and behaviours

- At `e9d1104`, `git grep -w` found none of ARCH-63, ADR-QD-127, CCR-QD-405, BEH-QD-389 or BEH-QD-390, so there was no collision.
- ADR-QD-047 was at Rev 1.9 (phase 13 had added 1.8 and 1.9), so this amendment is **Rev 1.10**:
  - The dock's state is now `DockSession`.
  - Replay is `SimulationSession.replay`. `seed` keeps its guard.
  - It records the defect.
  - D-07: ARCH-20 D-20-g is reversed for replay only. No new ADR, because ARCH-20 never had its own ADR.
  - The Status cell and `index.yaml` status were extended.
- BEH-QD-389 is a `ts` signature fence plus five REQUIREMENTs.
- BEH-QD-390 sits after BEH-QD-225 and has two REQUIREMENTs. BEH-QD-322's fence gains `seed` and `replay`, copied from the interface.

## Task 2 — records

- INV-QD-107 Rev 1.95 and traceability Rev 1.137:
  - The behaviour 28/29 rows were updated, and so were the ADR-QD-047 and INV-QD-107 rows.
  - A new `DockSession.test.ts` row was added.
  - The SimulationSession test, DevtoolsDock test and devtools-simulator feature rows gain BEH-QD-390.
- `01-shell.md`: the cross-link now reads "re-seeds … every time". Its revision went from 0.5 to 0.6 (draft) **by hand**, because `spec-revise.mjs` cannot parse a "0.5 (draft)" revision.
- `overview.md` Rev 1.84: the `SimulationSession` row lists its commands (`addChip`, `removeChip`), so `replay` was added to it.
- CCR-QD-405 is in `spec/README.md` Rev 1.139. It states that ADR-QD-127, INV-QD-270–274 and BEH-QD-391–398 are unused.
- Changesets:
  - New `dock-session.md`, an `@qadi/devtools` patch for the replay fix. The bug is also present in 0.11.0 (`Simulator.tsx`'s `seed !== seenSeed`).
  - `replay(entry)` was added to the pending, unreleased `simulation-session.md`, in place.
  - The website devtools page gained one sentence on `replay`/`seed`.

## Task 3 — phase gate

Mutation (`stryker.devtools.mjs`, both files):

| File | Base | Now | Killed/Survived/NoCov | Verdict |
|---|---|---|---|---|
| SimulationSession.ts | 96.44 | 96.46 | 354/13/0 | ok |
| DockSession.ts | new | 100.00 | 53/0/0 | ok |

`pnpm check:pr`: the first run failed at step 9 (`spec:gates`, `check-dod-table.mjs`). My amendment's phrase "T9 step 2" was read as a gate reference. I reworded it to "ARCH-20's task T9" without weakening the gate. The rerun **exited 0** and ran 16/16 steps, with mutation skipped. Results: coverage 166 files / 4327 tests; BDD 34 / 567; example 7 / 42; spec:verify:strict 21 PASS.

## Requirements

- DOCK-01: `DevtoolsDock.test.tsx` "replays the same row again" (RED at e9d1104, 15-01) and the BDD scenario (15-03).
- DOCK-02: `DevtoolsDock.tsx` has 0 `useState` and is a view of `useOwnedDockSession` (15-03).
- DOCK-03: `DockSession.test.ts`, 21 tests, no rendering (15-02).
- DOCK-04: `SimulationSession.replay` vs `seed`, by method (15-01), BEH-QD-390.
- DOCK-05: `git diff e9d1104 -- packages/devtools/test` deletes 0 lines, and the dock suite is green.
- XC-01: `check:pr` green. XC-02: records use the reserved numbers only. XC-03: gate 13 green. XC-04: house style green, with no budget change. XC-05: coverage holds and the mutation table above shows no drop. XC-06: the RED tests were seen at e9d1104 (15-01).

## Commits

1. `f077a48` docs(15-04): ADR-QD-047 amendment, BEH-QD-389 and BEH-QD-390
2. `2bf3ee9` docs(15-04): INV-QD-107 sources, traceability, CCR-QD-405 and the dock-session changeset
3. `a9055ee` docs(15-04): ADR-QD-047 amendment cites ARCH-20's task, not a step number gate 11 reads as a gate

## Deviations

- [Rule 3] Gate 11 drift fix (see Task 3).
- `01-shell.md` was revised by hand (see Task 2).
- The pending changeset `simulation-session.md` was amended in addition to the new `dock-session.md`, and the website page was updated. Both describe the newly public method.

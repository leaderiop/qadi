---
phase: 15-dock-session
plan: 01
subsystem: devtools
tags: [devtools, simulator, replay, dock, red-test, mutation-base]

phase_base: e9d1104
mutation_baseline:
  packages/devtools/src/model/SimulationSession.ts: 96.44

requires: ["14-07"]
provides:
  - "Phase base `15-base.txt` (e9d1104) and the scoped devtools mutation base `15-mutation-base.json`"
  - "`SimulationSession.replay(entry)`: re-seeds unconditionally; `seed` keeps its same-entry guard"
  - "`useOwnedSimulationSession` dispatches sightings, seed and ports from three separate layout effects"
  - "`DevtoolsDock` replays through `simulation.replay(entry)`; its `seed` `useState` is gone"
affects: [15-02, 15-03, 15-04]

actuals:
  tasks: 3
  commits: 3

key-files:
  created:
    - .planning/phases/15-dock-session/15-base.txt
    - .planning/phases/15-dock-session/15-mutation-base.json
  modified:
    - packages/devtools/src/model/SimulationSession.ts
    - packages/devtools/src/react/useSimulationSession.ts
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/test/model/SimulationSession.test.ts
    - packages/devtools/test/react/DevtoolsDock.test.tsx

key-decisions:
  - "D-03 applied as a separate `replay` command (not `seed(entry, { force })`): the command and the effect re-run are told apart by method"
  - "Both commands run one `reseed` closure, so a replay and a first seed cannot drift"

requirements-completed: [DOCK-01, DOCK-04, XC-06]

completed: 2026-11-10
status: complete
---

# 15-01 — Replaying the same row again re-seeds the simulator

`phase_base: e9d1104` (`15-base.txt`, written by this plan). `_DECISIONS.md` pre-answers no checkpoint for
Phase 15, and this plan had none.

## Task 1 — mutation base, then RED (D-01, XC-06)

- Phase 14 closed: every `14-NN-PLAN.md` has its SUMMARY.
- Scoped Stryker on the untouched tree (`pnpm exec stryker run stryker.devtools.mjs --mutate
  packages/devtools/src/model/SimulationSession.ts`): 372 mutants (7 ignored as static), 352 killed, 13 survived,
  0 NoCoverage → **96.44**, written to `15-mutation-base.json` with MUTATION-RECORD. The phase's only other model
  file is the new `DockSession.ts` (15-02), which has no base.
  Survivors (line, mutator): 285 Conditional, 317 Conditional + StringLiteral, 343 Conditional, 346 Conditional +
  StringLiteral, 350 Conditional, 352 Conditional, 368 Conditional, 394 AssignmentOperator, 401 ObjectLiteral +
  BooleanLiteral, 450 Conditional.
- Two tests in `DevtoolsDock.test.tsx`, `describe("replays the same row again")` (comment cites DOCK-01 / ARCH-63
  rather than a new `C`-number, whose source list is not in the repo):
  - "…after another policy was chosen" → on the base `expected '0' to equal 'seeded'`;
  - "…after the form was edited" → on the base `expected 'write' to equal 'read'`.
  `Tests 2 failed | 73 passed (75)`.

## Task 2 — `SimulationSession.replay`

`seed`'s body after the guard became the closure `reseed(entry)`; `seed` = guard + `reseed`, `replay: reseed`.
Interface doc comments say what each is for (host prop vs reviewer act, ARCH-63/D-03). Five model tests in
`describe("replaying a row")`, first seen failing on `session.replay is not a function`:
re-seed after another policy; re-seed after an edit with a Live run in flight (retired, reaped, `Idle`, one
notification, resource text reset); `seed(A)` twice keeps an edited form; `replay(A)` then `seed(A)` is a no-op;
replaying an orphan leaves the seed exactly as `seed(orphan)` does, and a later replay of A seeds again.

## Task 3 — split effects, replay through the session (GREEN)

- `useOwnedSimulationSession`: three layout effects (`[session, input.sightings]`, `[session, input.seed]`,
  `[session, input.ports]`); doc comment says why. `UseSimulationSessionInput.seed` stays (public hook).
- `DevtoolsDock`: `seed` `useState` deleted; `useOwnedSimulationSession({ sightings, ports })`;
  `replay` calls `simulation.replay(entry)` then `setTab("simulator")`; the "act rather than a consequence"
  sentence moved into the replay comment.
- New test "a timeline change after a replay keeps the replayed form" (rerender with a source that adds row B).
  Checked that it guards the split: with sightings and seed merged back into one effect it fails
  (`expected '1' to equal 'seeded'`).

## Task Commits

1. `98a7eda` test(15-01): RED — replaying the same row again does not re-seed
2. `0f672da` feat(15-01): SimulationSession.replay — a command that always re-seeds
3. `2b1b2aa` fix(15-01): replaying the same row again re-seeds the simulator

## Deviations from Plan

- `replay: reseed` rather than `replay: (entry) => reseed(entry)` — same behaviour, one fewer wrapper.
- The model tests' row uses `clearance` (an attribute read) instead of `hasPermission(read)`, so the Live run in
  the retire test actually waits on the slow resolver.

## Gate results

- Task 1: Phase 14 closed ✓; base json has a numeric score ✓; `Tests 2 failed` on the base ✓.
- Task 2: model file 72/72 ✓; `tsc -p tsconfig.test.json` 0 ✓; `pnpm lint:style` clean ✓; `replay:` greps ✓.
- Task 3: `pnpm vitest run --project devtools` 40 files / 1089 tests ✓; tsc 0 ✓; lint:style ✓; `pnpm circular` ✓;
  oxlint on `packages/devtools` 0 ✓; greps: `session.seed(input.seed)` = 1, `simulation.replay(` present,
  `useState` in the dock = 4 ✓.
- DOCK-05: `git diff e9d1104 -- packages/devtools/test` removes 0 lines; every old test passes.
- Mutation (not required here, run anyway): SimulationSession.ts **96.46** (354 killed / 13 survived / 0 NoCoverage)
  vs base 96.44 — no drop.

## Deferred to later plans in this phase

- 15-02: the headless `DockSession.ts` (tab, filters, selection, rows/counts/environments) and its mutation bar.
- 15-03: the dock's remaining three `useState`s (`filters`, `tab`, `selectedKey`) move to the dock session; the
  BDD scenario pinning the replay fix at the public seam.
- 15-04: spec records — ADR-QD-047 amendment (and D-07's note that ARCH-20 D-20-g "seed as a prop" is reversed
  for replay), BEH-QD-389/390, INV-QD-107 sources, traceability, CCR-QD-405, `.changeset/dock-session.md`
  (patch), overview rows if gate 13 needs them for `SimulationSession.replay`, and the phase-close mutation
  compare + `pnpm check:pr`.
- Not scoped by any Phase 15 plan: the chip typing buffer `useState` in `FieldEditor` (13-04 note; CONTEXT lists
  moving the typing buffers out of React as deferred).

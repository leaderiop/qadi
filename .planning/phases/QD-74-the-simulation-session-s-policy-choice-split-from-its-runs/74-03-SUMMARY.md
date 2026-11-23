---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
plan: 03
subsystem: devtools-model
tags: [seeded-choice, simulation-session, pure-module, tstyche, red-evidence]
phase_base: b22d97f9af293734787b3f771400d6f5f6e87065
plan_head_before: f5c7ddfdf7076b1ce71aadbbb195b8b7ac12ea5b
plan_head_after: 7e5bb50ea17a45f54edff6d7981b28ac9ea5980d

requires: ["74-02"]
provides:
  - "packages/devtools/src/model/SeededChoice.ts: the pure seeded choice, its transitions and readings, and the moved PolicyChoice, PolicyMenu and PolicyMenuOption"
  - "SeededChoice.test.ts: 33 plain-value rows, no Effect, scope or store"
  - "SeededChoice.tst.ts: five positive type pins, 71 type-test files"
  - "74-RED-EVIDENCE.md: each of six guts seen failing once"
affects: [74-04, 74-05, 74-06, 74-07]

actuals:
  tokens: 31000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "an immutable choice value whose no-op transitions return their input, so a caller detects a no-op with ==="
    - "one internal list (menuEntries) read by both the menu and its reverse lookup"

key-files:
  created:
    - packages/devtools/src/model/SeededChoice.ts
    - packages/devtools/test/model/SeededChoice.test.ts
    - packages/devtools/test/model/SeededChoice.tst.ts
  modified:
    - packages/devtools/src/model/SimulationSession.ts
    - packages/devtools/src/index.ts
    - packages/devtools/test/simulationFixtures.ts
    - spec/overview.md
    - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-RED-EVIDENCE.md

key-decisions:
  - "The session re-exports the three moved types from ./SeededChoice.ts so the unedited characterisation still resolves them; the plan's import-only edit would have broken typecheck"
  - "seedFrom and the constructor share one body; seededChoice is seedFrom over an unpinned choice, so replayInput has one caller"
  - "menuLead is a module-scope Match.type over PolicyChoice, so a new arm is a compile error and no switch is added"

requirements-completed: []  # CHSE-02, CHSE-04, WX-03, WX-04, WX-06, WX-07 are held by this plan but stay Pending: only 74-07 marks CHSE rows, and no plan marks a WX row

duration: 45 min
completed: 2026-11-23
status: complete
---

# Phase 74 Plan 03: The seeded choice as a pure module Summary

The simulator's policy choice is now one immutable value in `SeededChoice.ts`, with its pin, orphan, menu, no-op and
single-decode rules as functions a test calls on plain values, and `PolicyChoice`, `PolicyMenu` and `PolicyMenuOption`
declared there under the same names. The session behaves exactly as on the base.

## Task Commits

1. Task 1 (tracer): `ef65bb47` `refactor(74-03): state the seeded choice as a pure module with its rules tested as plain values`
   (six files: the module, the session's type move, the barrel line, the overview row at 1.133, the fixtures header and
   `SeededChoice.test.ts`)
2. Task 2: `1fa3eb62` `test(74-03): pin the seeded choice types against the held choice and the menu shape`
3. Task 3: `7e5bb50e` `docs(74-03): record each seeded choice rule red once`

## What was built

- `SeededChoice.ts` exports the state `SeededChoice` (`sightings`, `held`, `seed`), `SeedRow`, `ReplayedPolicy`,
  `Seeding`, the transitions `seededChoice`, `withSightings`, `seedFrom`, `choose`, the readings `policyChoice`,
  `policyOf`, `seedOf`, `seededFrom`, `menuOf`, `sightingAt`, and the three moved types. It imports no `effect/Effect`
  and holds no module state.
- `pinUnlessReplayed` is the only caller of `pinHead`; `seedFrom` is the only caller of `replayInput`; `menuEntries` is
  the one list `menuOf` and `sightingAt` read. `leading`, `selectedOf` and `Number.isInteger` do not exist in the module.
- Its doc comments carry rule sentences 1 to 4 and the reference rule verbatim and name the two contracts it relies on.
- The barrel names the three types from `./model/SeededChoice.ts` between the `Replay.ts` and `Selection.ts` groups;
  `spec/overview.md` names their module as `model/SeededChoice.ts` (revision 1.132 to 1.133). `check-api-surface` reads
  `941 export(s)`, unchanged.

## Verification

- Task 1 verify: `seeded choice in place`; Task 2 verify: `seeded choice types pinned`; Task 3 verify: `each seeded
  choice rule seen red` (the first two through the adapted scripts in the deviations below; all three were re-run on the
  final HEAD).
- `SeededChoice.test.ts` 33 of 33 and the characterisation 35 of 35 (68 passed); the devtools project 1778 passed;
  `pnpm typecheck` exit 0; oxlint clean on every touched file; `check-house-style` `578 file(s) clean (3 declared
  switch(es), 71 type-test file(s))`; `check-api-surface` `941 export(s) documented across 9 package(s)`;
  `spec-revise --check` clean; `pnpm test:tstyche` green in both passes (71 files, 380 passed, 2 skipped).
- `git status --porcelain -- packages scripts spec .changeset` was empty before each commit and after the last.

## The six guts

Each was made on the working tree, run, saved to `<S>/gut-<name>.json` (or `gut-tie.log`) and reverted with
`git checkout`; none was committed. Details and the first failure lines are in `74-RED-EVIDENCE.md`.

| Gut | Edit | Caught by (first title) | Failed |
| --- | ---- | ----------------------- | ------ |
| pin | `pinUnlessReplayed` answers `held` | `with no seed, the constructor pins the head of the rail` | 5 |
| orphan | `seedOf` answers nothing unless replayed | `seedOf keeps an orphan row after another policy is chosen` | 1 |
| order | the lead's entries follow the rail's | `the menu leads with an evicted choice, labelled as no longer in the log` and `the menu leads with the replayed row while a replayed policy is held` | 4 |
| lookup | `sightingAt` reads `choice.sightings[position]` | `sightingAt 0 of a seeded or evicted menu is nothing, and 1 is the head of the rail` | 3 |
| noop | `choose` drops its early return | `choosing an equal copy of the held policy returns the same choice` | 1 |
| tie | a fifth arm on `PolicyChoice` | tstyche: `the first three arms of PolicyChoice are HeldChoice of PolicySighting` | 1 (both passes) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The session re-exports the three moved types**
- **Found during:** Task 1
- **Issue:** the plan has the session only import the three types. `SimulationSession.characterisation.test.ts`
  imports `PolicyChoice` and `PolicyMenu` from `SimulationSession.ts`, and neither the plan nor the owner's standing
  orders allow editing that file after its own commit, so an import-only change fails `pnpm typecheck`.
- **Fix:** `SimulationSession.ts` imports the two types its snapshot uses and adds one
  `export type { PolicyChoice, PolicyMenu, PolicyMenuOption } from "./SeededChoice.ts";` with a one-line comment. The
  characterisation, `HeldChoice.ts` and `ExplorerSession.ts` are unchanged. The barrel names the types from
  `./model/SeededChoice.ts`, so the public surface is untouched (941).
- **Files modified:** `packages/devtools/src/model/SimulationSession.ts`
- **Commit:** `ef65bb47`
- **For 74-04:** the session rewrite must keep that re-export while the characterisation imports from it.

### Verification-only deviations

**2. Task 1's session-line check counts the two re-export lines as a line beyond the import**
- The check refuses any added session line not starting `import`, `}`, `PolicyChoice`, `PolicyMenu` or `type `. I ran
  the same script with the pattern widened to admit exactly the re-export line and its comment (`p03-verify1b.sh`); every
  other check ran unchanged and the script ends `seeded choice in place`.

**3. Task 2's title literal check cannot hold beside the 90-column rule for one title**
- `test("a menu option is a value and a label, and a menu its options and selected value", () => {` is 95 columns, and
  the same task's width check refuses an added line past 90. I wrapped that one `test(` call over three lines and ran
  the literal check on the whitespace-folded file (`p03-verify2b.sh`); the title string itself is unchanged, and the
  script ends `seeded choice types pinned`.

**Total deviations:** 1 auto-fixed (Rule 3), 2 verification-only. **Impact:** none on behaviour or on what a gate
checks.

## Decided autonomously

- Re-export from the session, not an edit to the characterisation's imports (the owner's order names the file and the
  plan's `must_haves` forbid editing it), and not a deviation from the barrel's named lines.
- Long test titles stay exact and the `it(` call is wrapped, so the titles 74-05 maps are unchanged; the one title that
  cannot fit on a 90-column line even wrapped (`the menu lists each sighting by its label under String(index), selecting
  the held one`) is split with `+`, which vitest reports as the same string.
- `seedOf` is written with an early return for no seed and one conditional on the two facts it depends on, so every
  branch has a row that kills its mutant (no redundant tag test).

## Known Stubs

None.

## Threat Flags

None. T-74-06 (the moved public types) is mitigated by the barrel identity pin, an unchanged `surface.tst.ts` and 941
exports; T-74-07 (the reverse lookup) by rows 17, 18 and 20 and the `lookup` gut.

## Self-Check: PASSED

- `SeededChoice.ts`, `SeededChoice.test.ts`, `SeededChoice.tst.ts` found; commits `ef65bb47`, `1fa3eb62` and `7e5bb50e`
  are ancestors of HEAD.
- `git rev-list --count f5c7ddfd..HEAD` read 3 before this file.

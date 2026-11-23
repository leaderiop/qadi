---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
plan: 05
subsystem: devtools-model-tests
tags: [simulation-session, seeded-choice, test-move, red-evidence]
phase_base: b22d97f9af293734787b3f771400d6f5f6e87065
plan_head_before: 048cc3bdf7e64d74f9c8c11a6933337930d49e26
plan_head_after: 210c9f5baa5f01b282c26291ad9de7f1c4f5d0b6

requires: ["74-04"]
provides:
  - "SimulationSession.test.ts holds the session tests about runs and the form: 82 tests, 18 fewer than the base's 100"
  - "74-RED-EVIDENCE.md: the move table, each removed session test named with the SeededChoice test and characterisation rows that pin its rule now"
affects: [74-06, 74-07]

actuals:
  tokens: 6000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a rule pinned once as a plain-value row; the session keeps one test per command that moves the choice, reading it through the session"

key-files:
  created: []
  modified:
    - packages/devtools/test/model/SimulationSession.test.ts
    - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-RED-EVIDENCE.md

key-decisions:
  - "Decided autonomously: simulationFixtures.ts needed no change. After the removal every export still has two or more importers, or one importer plus a caller in the module (`settled`, called by `ran`), and the header already names exactly the four files that import it"

requirements-completed: []  # CHSE-04, WX-06, WX-07 are held by this plan but stay Pending: only 74-07 marks requirements

duration: 10 min
completed: 2026-11-23
status: complete
---

# Phase 74 Plan 05: The choice-rule session tests leave, each named with its survivor Summary

The 18 session tests whose every assertion is a choice rule are removed from `SimulationSession.test.ts`, with the
`policyMenu is what the dropdown lists, in order, with the option it shows selected` describe that held four of them.
Each is named in `74-RED-EVIDENCE.md` with the `SeededChoice.test.ts` test and characterisation row(s) that pin its rule
at the same expected values. No source file, no characterisation input and no remaining test changed.

## Task Commits

1. Task 1 (tracer): `81972903` `test(74-05): drop the session tests whose rules the seeded choice tests pin`
   (`SimulationSession.test.ts` only: 222 lines removed, none added besides the removal of the now-unused
   `PolicySighting` type import)
2. Task 2: `210c9f5b` `docs(74-05): record where each moved session test is pinned now`

## Verification

| Check | Result |
| ----- | ------ |
| Task 1 verify (title set, runs, fixtures rule, devtools project, typecheck, oxlint, house-style, commit shape) | prints `choice-rule session tests moved` |
| Session tests | 82 of 82 pass (100 on the base, minus 18) |
| `SeededChoice.test.ts` | 33 of 33 pass |
| Characterisation | 35 of 35 pass, no edit |
| Devtools project | 73 files, 1760 tests pass |
| `pnpm typecheck`, oxlint on the edited files, `check-house-style.mjs` | clean |
| Task 2 verify | prints `every moved test has a named survivor` (see the verification-only deviation below) |

## Tests removed, and their survivors

Every body was read whole before removal: each asserts only a choice reading (the policy's tag, index or value, the
menu's options and selection, the notification count of a choice command, or a label). None reads a draft, a run,
staleness or a baseline, so none was refused. The 18 base titles and their survivors are the table in
`74-RED-EVIDENCE.md` under `## Where each moved session test is pinned now`.

The five tests that stay and read the choice through the session: `choosePolicyAt(position) chooses the sighting listed
at that position`, `treats a rail that differs in one element as a change, and an equal one as none`, `keeps an evicted
choice, marks it, and still runs it`, `seed with the entry it holds is a no-op, so an effect re-run keeps the edited
form`, `re-seeds from the row it was last seeded from after another policy was chosen`. No test moved from
`replaying a row` or `a result belongs to the question it answered`.

After the removal the `choosing a policy` describe keeps one test (`runs the chosen policy after the rail moved`).

## Fixtures importers (`simulationFixtures.ts`)

| Export | Importers | Why it stays shared |
| ------ | --------- | ------------------- |
| `sighting` | session, runs, characterisation, seeded choice | four importers |
| `entryOf` | session, characterisation, seeded choice | three |
| `slow` | session, runs, characterisation | three |
| `counted` | session, runs, characterisation | three |
| `startRun` | session, characterisation | two |
| `ran` | session, characterisation | two |
| `settled` | session | one importer, and `ran` calls it |

The header names exactly `SimulationSession.test.ts`, `SimulationSession.runs.test.ts`,
`SimulationSession.characterisation.test.ts` and `SeededChoice.test.ts`; it was not edited.

## Deviations from Plan

### Verification-only

**1. [Verify misfire] Task 2's title check misses a concatenated test title**
- **Found during:** Task 2 verify
- **Issue:** the survivor `the menu lists each sighting by its label under String(index), selecting the held one` is
  written in `SeededChoice.test.ts` as two string literals joined with `+` over two lines, so the verify's static
  `it("...")` regex does not see it; the test exists with that exact runtime title.
- **Fix:** ran the same check with the column-2 and column-3 titles read from the vitest JSON of the run (runtime titles of
  `SeededChoice.test.ts` and the characterisation) instead of from the source text. It prints
  `every moved test has a named survivor`. No gate was weakened; the table is as the plan wrote it.

No source, test-body or plan-table change otherwise: plan executed as written.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `81972903` and `210c9f5b` are ancestors of HEAD; `74-RED-EVIDENCE.md` holds the section with 18 rows.
- `git status --porcelain -- packages scripts spec .changeset` is empty.

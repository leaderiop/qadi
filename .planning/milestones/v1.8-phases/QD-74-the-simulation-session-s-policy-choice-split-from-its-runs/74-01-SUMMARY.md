---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
plan: 01
subsystem: testing
tags: [mutation-base, stryker, characterisation, simulation-session, vitest]
phase_base: b22d97f9af293734787b3f771400d6f5f6e87065
plan_head_before: b22d97f9af293734787b3f771400d6f5f6e87065
plan_head_after: 20d40a0629179dbf303738d4cd61d8e0c210422b

requires: []
provides:
  - "the phase scorer 74-mutation.mjs with the session, held and close-only choice groups"
  - "74-mutation-base.json: SimulationSession.ts 325/331 and HeldChoice.ts 63/63 measured on phase_base"
  - "packages/devtools/test/simulationFixtures.ts: the seven helpers the session tests share"
  - "SimulationSession.characterisation.test.ts: 35 fixed rows, green on the base 3/3"
affects: [74-02, 74-03, 74-04, 74-05, 74-06, 74-07]

actuals:
  tokens: 18021
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a close-only mutation group: every valid mutant killed, every Ignored mutant admitted through EXAMINED"
    - "one shared fixtures module for the session tests, beside helpers.ts and dockModelFixtures.ts"

key-files:
  created:
    - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-mutation.mjs
    - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-mutation-base.json
    - .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-RED-EVIDENCE.md
    - packages/devtools/test/simulationFixtures.ts
    - packages/devtools/test/model/SimulationSession.characterisation.test.ts
  modified:
    - packages/devtools/test/model/SimulationSession.test.ts
    - packages/devtools/test/model/SimulationSession.runs.test.ts

key-decisions:
  - "The mutation base was measured with the helper move kept out of the tree, so no phase test or fixtures file existed while Stryker ran"
  - "judgeNew reports an Ignored mutant of a close-only file as unexamined unless EXAMINED admits its kind, and a stale EXAMINED entry as removable"

patterns-established:
  - "Characterisation rows compare the whole view projection and count notifications only through counted"

requirements-completed: []  # CHSE-01, WX-05, WX-06, WX-07 are held by this plan but stay Pending: only 74-07 marks CHSE rows, and no plan marks a WX row

duration: 20 min
completed: 2026-11-23
status: complete
---

# Phase 74 Plan 01: Mutation base and characterisation of the simulation session's policy choice Summary

The phase scorer and the Stryker base of `SimulationSession.ts` (325/331) and `HeldChoice.ts` (63/63) are recorded on the
phase base, the session tests share one fixtures module, and a 35-row characterisation of the policy choice through the
real scoped session is green on the base three runs out of three. No `packages/devtools/src` file changed.

phase_base: b22d97f9af293734787b3f771400d6f5f6e87065

## Base facts

Measured on `phase_base` (HEAD `b22d97f9`, `docs(74): create phase plan`); every line equals the plan-time evidence.

```
house-style: 574 file(s) clean (3 declared switch(es), 70 type-test file(s))
api-surface: 941 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 154 reference(s) resolve
devtools-claims: 8 claim(s) registered across 6 file(s)
doc-examples: 118 block(s) compile
spec-revise: every Revision matches its newest Change History entry
reservation-sha256: 07a779c95ed6f98639077d67dedd68179830521c7aeb5adf925ad6b21749836f
proving-grep: 26
verify-traceability --strict: PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
  143 ADR(s) traced, all 164 invariant(s) traced, 119 ADR(s) agree, 316 file(s) exist
session-tests: 100
```

`session-tests: 100` is the runtime count of `SimulationSession.test.ts` at the base (97 static `it` calls plus the loop's
expansion), every one passed; `SimulationSession.runs.test.ts` holds 5, and the two files together pass 105 after the helper
move.

Mutation base (`74-mutation-base.json`, both groups on `phase_base`, invocation
`pnpm exec stryker run stryker.devtools.mjs --mutate <file>`):

| Group | File | Detected / valid | Survived | No coverage | Ignored | Stryker score |
| ----- | ---- | ---------------- | -------- | ----------- | ------- | ------------- |
| session | `packages/devtools/src/model/SimulationSession.ts` | 325/331 | 6 | 0 | 11 | 98.19 |
| held | `packages/devtools/src/model/HeldChoice.ts` | 63/63 | 0 | 0 | 3 | 100.00 |

The six base survivors of `SimulationSession.ts` are on lines 395, 398 (two), 402, 404 and 482; they are the floor, never
re-baselined.

## What was built

- **Scorer.** `74-mutation.mjs` is `73-mutation.mjs` with the groups `session`, `held` and `choice` (close-only) through
  `stryker.devtools.mjs`. `judgeNew` takes `examined = EXAMINED` and fails a close-only file for an open mutant, for an
  Ignored mutant `EXAMINED` does not admit by kind, and for an `EXAMINED` entry the file no longer needs. Seven
  `judgeNew` self-test cases replace the three; `--self-test` ends `self-test: 33 passed`; oxlint is clean.
- **Shared helpers.** `simulationFixtures.ts` exports exactly `sighting`, `entryOf`, `slow`, `counted`, `startRun`,
  `settled` and `ran`; both existing session test files import them; no title, assertion or expected value changed.
- **Characterisation.** 35 rows under 8 describes, each comparing the whole `view` projection and the exact
  notification count, and `assert.strictEqual` on the snapshot object for every no-op row. Every reasoned value was the
  value the base returned: no row took a corrected value from the base.

## Task Commits

1. Task 1 (tracer): `45411e09` `docs(74-01): record the mutation base of the simulation session and the held choice` (the first commit after `phase_base`; holds exactly the scorer and its record)
2. Task 2: `ff758de0` `test(74-01): share the simulation session test helpers in one module`
3. Task 2: `e25c8cfd` `test(74-01): characterise the simulation session policy choice through the session`
4. Task 2: `20d40a06` `docs(74-01): record the simulation session characterisation green on the base`

## Verification

- Task 1 verify: `base measured and recorded`.
- Task 2 verify: `characterisation green on the base` (see the verification-only deviation below).
- Characterisation: 35 passed, 0 failed, three runs (`74-RED-EVIDENCE.md`); the full devtools project and `tsc -p tsconfig.test.json` pass; house-style is clean.
- Tracer gate: the Task 1 verify was re-run end to end after the commit and passed before Task 2 began.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved helper text wrapped to the 90-column rule**
- **Found during:** Task 2
- **Issue:** the plan moves the helpers with their bodies and doc comments unchanged, but three of the moved or imported
  lines (`entryOf`'s signature, the doc comment above `settled`, and the import line in `SimulationSession.test.ts`)
  are longer than 90 columns, and the plan's own added-line check counts a moved line as an added one.
- **Fix:** wrapped the three lines by hand; every word, body and title is unchanged.
- **Files modified:** `packages/devtools/test/simulationFixtures.ts`, `packages/devtools/test/model/SimulationSession.test.ts`
- **Commit:** `ff758de0`

### Verification-only deviation

**2. The Task 2 verify's helper-commit file-list comparison misfires on order**
- The verify compares the sorted file list of the helper commit with the literal `"$X $U $R "`, which is not in
  `LC_ALL=C` sorted order (`model/...` sorts before `simulationFixtures.ts`). It fails with `the helper commit does not
  hold exactly the module and the two session test files` for a commit that holds exactly those three files.
- I ran the same script with the literal in sorted order (`"$R $U $X "`); it ends `characterisation green on the base`.
  Nothing a gate checks was weakened.

### Execution note

The helper move was set aside while Stryker ran (the two test files restored to their base, the fixtures module moved
to scratch) so the base was measured on a tree with no phase test or fixtures file, then put back unchanged. The
`session-tests` count was measured the same way, on the base versions of the files.

**Total deviations:** 1 auto-fixed (Rule 3), 1 verification-only. **Impact:** none on behaviour or on any gate.

## Known Stubs

None.

## Threat Flags

None: no network endpoint, auth path or schema change; only test files, a scorer script and a record were written.

## Self-Check: PASSED

- Created files found: the scorer, `74-mutation-base.json`, `74-RED-EVIDENCE.md`, `simulationFixtures.ts` and the characterisation test.
- Commits `45411e09`, `ff758de0`, `e25c8cfd` and `20d40a06` are ancestors of HEAD; `git rev-list --count b22d97f9..HEAD` read 4 before this file.
- `git status --porcelain -- packages scripts spec .changeset` is empty; no `packages/devtools/src` file differs from `phase_base`.

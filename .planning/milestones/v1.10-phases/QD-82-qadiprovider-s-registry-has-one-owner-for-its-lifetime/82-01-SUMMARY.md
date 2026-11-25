---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
plan: 01
subsystem: react-registry-lifetime-mutation
tags: [mutation-base, stryker, react, phase-check, single-owner]
requires: []
provides:
  - the mutation floor of the four react files at the phase base, committed alone and first
  - the base gate lines, the react test count and the archived v1.9 checks' result on the base
  - 82-mutation.mjs, the scorer with the react group, the close-only absolute lease group and probe
  - 82-check.mjs, the shared commit, unchanged, seen-failing, scan, trailer and single-owner check
affects: [82-02, 82-03, 82-04, 82-05, 82-06, 82-07, 82-08, 82-09, 82-10]
key-files:
  created:
    - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-mutation.mjs
    - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-mutation-base.json
    - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-check.mjs
    - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-RED-EVIDENCE.md
  modified: []
key-decisions:
  - "The base is recorded as measured: QuestionBook.ts holds 3 Survived mutants (line 109, and line 170 twice) on the phase base, so the react floor is 147/150, not a full score; the compare rule passes a survivor the base already had"
  - "The close-only judge for RegistryLease.ts is absolute: an open, Ignored or Timeout mutant fails, and so does a Killed mutant none of whose killers is a test of RegistryLease.test.ts; the lease group runs with --disableBail so every killer is listed"
  - "single-owner judges comment-and-string blanked text (the import specifiers and the mutate list with only comments blanked) and fails on the base with exactly the seven reasons the fix removes"
requirements-completed: [LEASE-02, WX-04, WX-05, WX-06, WX-07]
metrics:
  duration: 15min
  completed: 2026-11-25
status: complete
commits: 2
plan_head_before: 16f09f776fbb9c8c8c2b9b9452e7cf6994a727e3
plan_head_after: 0b92251f0428ccaef476e26e964e3c37b785ef11
actuals:
  tokens: 22000
  tasks: 3
  commits: 2
---

# Phase QD-82 Plan 01: the mutation base and the phase check helpers Summary

**The four react files' mutation floor (147/150) recorded on the phase base by a scorer with an absolute close-only lease group, and a self-tested phase check whose single-owner mode fails on the base for exactly the seven reasons the fix removes.**

phase_base: 16f09f776fbb9c8c8c2b9b9452e7cf6994a727e3

## Base facts

```
house-style: 607 file(s) clean (3 declared switch(es), 77 type-test file(s))
api-surface: 942 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 169 reference(s) resolve
doc-examples: 119 block(s) compile
devtools-claims: 8 claim(s) registered across 6 file(s)
website-doc-examples: 76 block(s) compile


Qadi specification verification
| Status | Check                                      | Detail
| ------ | ------------------------------------------ | ------
| PASS   | appendices/index.yaml -> disk              | 1 entr(y|ies) resolve
| PASS   | appendices/ disk -> index.yaml             | no orphans
| PASS   | behaviors/index.yaml -> disk               | 34 entr(y|ies) resolve
| PASS   | behaviors/ disk -> index.yaml              | no orphans
| PASS   | decisions/index.yaml -> disk               | 151 entr(y|ies) resolve
| PASS   | decisions/ disk -> index.yaml              | no orphans
| PASS   | devtools-spec/index.yaml -> disk           | 5 entr(y|ies) resolve
| PASS   | devtools-spec/ disk -> index.yaml          | no orphans
| PASS   | models/index.yaml -> disk                  | 38 entr(y|ies) resolve
| PASS   | models/ disk -> index.yaml                 | no orphans
| PASS   | process/index.yaml -> disk                 | 3 entr(y|ies) resolve
| PASS   | process/ disk -> index.yaml                | no orphans
| PASS   | invariants -> traceability                 | all 180 invariant(s) traced
| PASS   | decisions -> traceability                  | 151 ADR(s) traced
| PASS   | ADR Document ID = file number              | 127 ADR(s) agree
| PASS   | urs -> traceability table                  | 38 requirement(s) traced
| PASS   | features -> traceability                   | all REQ tags defined
| PASS   | relative link integrity                    | 5365 link(s) resolve, none gitignored
| PASS   | §4 test files -> disk                     | 348 file(s) exist
| PASS   | CCR register coverage                      | known, tracked gap unchanged: 078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137
| PASS   | Revision = newest history entry            | every header agrees

PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)


reservation-sha256: e9c52607f228412910c66caaacc19c7a5dfb85ac5fa34266c7bd63c250a4d313
react-tests: Tests  650 passed (650)
81-archived: 79-pinned-check.mjs: exit 1: packages/devtools/test/model/TimelineFeed.test.ts: TF29: an assertion or a line other than a construction changed
81-archived: 79-characterisation-check.mjs: exit 0: characterisation: packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx holds its first commit (cf3186d9)
81-archived: 80-pinned-check.mjs --all-applied: exit 0: pinned: 4 files hold their base text, 4 of 4 declared edits applied
81-archived: 80-characterisation-check.mjs --all-flipped: exit 0: characterisation: packages/react/test/InstrumentToggle.characterisation.test.tsx holds its first commit (2cca1f46), 1 of 1 flips applied
81-archived: 80-characterisation-check.mjs --red-recorded: exit 0: red-recorded: every flip has its red line
react-held: packages/react/test/InstrumentToggle.characterisation.test.tsx (80-characterisation-check.mjs)
```

Every line above is what its command printed on the phase base (the plan-time expectations held: `house-style` 607, `api-surface`
942, the reservation sha256, the react project's 650 tests, and the archived checks failing only on `79-pinned-check.mjs` for
TF29, the flip Phase 81 made). The traceability gate counts (151 decisions, 180 invariants, 348 test files) are those of the
tree, stated here so a later plan compares with a measurement. The one React-held test among the earlier checks is
`packages/react/test/InstrumentToggle.characterisation.test.tsx`, held by the archived `80-characterisation-check.mjs`; the
other `packages/react` hits in the earlier scripts are self-test fixtures of `81-check.mjs`, `80-check.mjs` and
`80-mutation.mjs`, not held tests.

## Mutation base

react base score: 147/150
base packages/react/src/DecisionOutcome.ts: 8/0/0/11
base packages/react/src/QuestionBook.ts: 85/3/0/0
base packages/react/src/HydrationEvent.ts: 32/0/0/8
base packages/react/src/SweepScheduler.ts: 21/0/0/2

The four numbers per file are killed/survived/noCoverage/ignored. `HydrationEvent.ts` also holds one Timeout (detected, so
33/33). The Ignored mutants by line: `DecisionOutcome.ts` 86, 87, 88, 89, 90, 102, 103, 104, 105, 121, 135; `HydrationEvent.ts`
184, 186, 191, 197, 203, 209, 214, 225; `SweepScheduler.ts` 96, 100; `QuestionBook.ts` none. The three base survivors of
`QuestionBook.ts` are line 109 (`BooleanLiteral -> false`) and line 170 (`ConditionalExpression -> false` and
`EqualityOperator -> excess < 0`); a later close passes them where the diff carries them through and fails any other.
`QadiProvider.tsx` is `unmeasured` in the record: it renders, and its lifetime logic moves to `RegistryLease.ts`.

archived checks: node .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-archived-checks.mjs

## Accomplishments

- `82-mutation.mjs` is `81-mutation.mjs` with its directory from `import.meta.url`, two groups through `stryker.react.mjs`
  (`react`: the four files; `lease`: `RegistryLease.ts`, close-only, invocation ending `--disableBail`) and `UNMEASURED` naming
  `QadiProvider.tsx` with its reason. Its close-only judge is absolute: an open, Ignored or Timeout mutant fails, and so does a
  Killed mutant none of whose killers is a test of `packages/react/test/RegistryLease.test.ts` (read from the report's
  `testFiles` and each mutant's `killedBy`; a report with no `testFiles` fails). `record` refuses a report whose `config.mutate`
  is not the group's files or whose `config.disableBail` differs; `probe <group>` judges a report as its close would and writes
  nothing. Self-test: 49 passed; oxlint clean.
- `82-mutation-base.json` holds the `react` group measured on `phase_base` (Stryker 98.00 total, 147/150 detected), committed
  with the scorer as the first commit after `phase_base`, before any test or source file changed.
- `82-check.mjs` has the modes `base`, `commit`, `unchanged`, `seen-failing`, `scan-ids`, `scan-forbidden`, `trailers` and
  `single-owner`; self-test: 147 passed; oxlint clean. `single-owner` fails on the base with exactly the seven reasons
  `RegistryLease.ts is missing`, `stryker.react.mjs does not mutate RegistryLease.ts`, `QadiProvider.tsx holds a timer`,
  `QadiProvider.tsx disposes the registry`, `QadiProvider.tsx clears registryRef`, `QadiProvider.tsx does not build one lease`
  and `QadiProvider.tsx does not hold and release the lease in one effect`; the self-test plants a passing tree and one tree per
  reason. Each run mode was seen failing once, in `82-RED-EVIDENCE.md`.
- The base facts are measured (the gate lines, `FAIL: 0`, the reservation sha256, 650 react tests, the five archived-check
  lines) and the one React-held earlier test is named.

## Task commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 | 9930fb28 `docs(82-01): record the mutation base of the four react files` | `82-mutation.mjs`, `82-mutation-base.json` |
| 2 | none: its output is this file, committed with the metadata commit | `82-01-SUMMARY.md` |
| 3 | 0b92251f `chore(82-01): add the phase check helpers` | `82-check.mjs`, `82-RED-EVIDENCE.md` |

## Deviations from Plan

None - plan executed exactly as written. Two small choices inside the plan's latitude, recorded for the later plans that call
these scripts: `probe` accepts the `react` group as well as `lease` (it then judges against the base record's group, with the
diff taken from the base head to the working tree, since the report is measured on the working tree); and `seen-failing` reads
the titles of `it.live(` and `it.scoped(` calls too, as `81-check.mjs` does, which is a superset of the plan's three forms.
`single-owner` also fails with a line naming `QadiProvider.tsx is missing` when that file does not exist, so it cannot pass
with nothing to read.

## Authentication Gates

None.

## Known Stubs

None. No file under `packages/` changed in this plan.

## Threat Flags

None. Only phase-local scripts and records were added under `.planning/`; no endpoint, auth path or schema changed.

## Issues Encountered

None. The base is strict-green (`FAIL: 0`), the react project passes, and the archived checks fail only on
`79-pinned-check.mjs` for TF29, the flip the previous phase made on purpose.

## Next Phase Readiness

Ready for 82-02. Every later plan reads `phase_base` above (or `node <D>82-check.mjs base`), compares the four react files
against `82-mutation-base.json`, and judges `RegistryLease.ts` absolutely at the close with
`node <D>82-mutation.mjs record close lease` (run with `--disableBail`, its invocation) and `compare`.

## Self-Check: PASSED

- FOUND: `82-mutation.mjs`, `82-mutation-base.json`, `82-check.mjs`, `82-RED-EVIDENCE.md`, `82-01-SUMMARY.md` under the phase directory
- FOUND: commits 9930fb28 and 0b92251f, the first a child of `phase_base`
- The three task verifies pass; the tree under `packages/` equals `phase_base`

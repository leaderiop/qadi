---
phase: QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner
plan: 01
subsystem: testing
tags: [react, stryker, characterisation, mutation, registry-lease, pinned-check]

phase_base: 41c53c65c3ceb60f974650dd374f391c81db56e7
execution_start: ca9e58ba08513c63dc00d81e8115c9590aba28fc
base_record: 3fd237884f6210d9855eacbf291821730b2629a3
characterisation: 8891aaca57b00a731ba944ac06dcd84d81b3e171
plan_head_before: ca9e58ba08513c63dc00d81e8115c9590aba28fc
plan_head_after: eb2ba2e44203db23021620ac64bdd4de3ba87888

requires:
  - phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
    provides: RegistryLease.ts, the lease test set and the 82-mutation.mjs scorer this plan regroups
  - phase: QD-85-the-dock-s-hydration-block-is-a-model-row
    provides: the born-file rule of 85-mutation.mjs and the pinned-check shape of 85-pinned-check.mjs
provides:
  - 86-mutation.mjs, the phase scorer over a lease group (removed-mutant rule) and an owner group (absolute rule, own-tests killers)
  - 86-mutation-base.json, RegistryLease.ts at 28/28 killed on the execution start, committed alone and first
  - QadiProvider.owner.characterisation.test.tsx, nine born-green cells C1 to C9, each seen failing under its scratch edit
  - 86-pinned-check.mjs, 59 held files (every react test the base lists, and the lease) and one born file
  - the measured base facts of the phase
affects: [QD-86 plans 02 to 08, RegistryOwner.ts, QadiProvider.tsx rewiring]

actuals:
  tokens: 15434
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a scorer with one group measured at base and close and one born group judged absolutely by who kills each mutant"
    - "a held set computed from the base with git ls-tree, never listed"

key-files:
  created:
    - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-mutation.mjs
    - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-mutation-base.json
    - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-RED-EVIDENCE.md
    - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-pinned-check.mjs
    - packages/react/test/QadiProvider.owner.characterisation.test.tsx
  modified: []

key-decisions:
  - "The lease group keeps the removed-mutant rule and the owner group is judged absolutely with every kill required from RegistryOwner.test.ts, so a mutant only a rendered test kills fails (D-15)"
  - "The held set is every file git ls-tree lists under packages/react/test at the base plus RegistryLease.ts, computed not listed, with no declared edit (D-12, D-14)"
  - "The mutation base was re-measured once after a first run under host load produced 11 Timeout mutants; the committed record is the quiet run, 28 killed and 0 timeout (D-15)"

patterns-established:
  - "Characterisation cells go through the public QadiProvider and the registry tap, so they hold wherever the lifetime lives"

requirements-completed: [PREG-01, PREG-02, WX-05, WX-06, WX-07]

coverage:
  - id: D1
    description: "86-mutation.mjs scorer with lease and owner groups, refused owner base, absolute owner rule"
    requirement: WX-05
    verification:
      - kind: other
        ref: "node 86-mutation.mjs --self-test (64 passed) and the Task 1 verify"
        status: pass
    human_judgment: false
  - id: D2
    description: "86-mutation-base.json holding RegistryLease.ts at 28/28 killed with --disableBail on the execution start, committed alone first"
    requirement: WX-05
    verification:
      - kind: other
        ref: "Task 1 verify: record shape, head, invocation, first plan commit and its paths"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nine provider-registry cells born green on the base, each seen failing once under its scratch edit"
    requirement: PREG-01
    verification:
      - kind: integration
        ref: "packages/react/test/QadiProvider.owner.characterisation.test.tsx#C1..C9"
        status: pass
    human_judgment: false
  - id: D4
    description: "86-pinned-check.mjs over 59 held files and one born file, seen failing for a held test and the lease"
    requirement: PREG-01
    verification:
      - kind: other
        ref: "node 86-pinned-check.mjs; --all-applied; --self-test (18 passed); Task 3 verify"
        status: pass
    human_judgment: false
  - id: D5
    description: "The base facts, measured as each command printed them"
    requirement: WX-06
    verification:
      - kind: other
        ref: "## Base facts below"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-11-25
status: complete
---

# Phase 86 Plan 01: Measure and pin the provider registry on the base Summary

**The registry lease's mutation floor (28/28 killed) is committed first, nine born-green provider cells pin construction, seed order, subject write, recycle and atoms-replaced, and a computed 59-file held set keeps every react test and the lease byte for byte.**

## Performance

- **Duration:** 14 min
- **Tasks:** 3 (tracer, auto, auto)
- **Files created:** 5 (and this summary)
- **Commits:** 3

## Accomplishments

- `86-mutation.mjs` is `82-mutation.mjs` regrouped: `lease` (`RegistryLease.ts`, base and close, `--disableBail`, the
  removed-mutant rule) and `owner` (`RegistryOwner.ts`, close only, `record base owner` refused with `RegistryOwner.ts
  is born in the phase and has no base`, no Survived, NoCoverage, Ignored or Timeout mutant, at least one Killed, every
  Killed killed by a test in `RegistryOwner.test.ts`). `UNMEASURED` names `QadiProvider.tsx`. Its self-test passes 64 cases.
- `86-mutation-base.json` holds the `lease` group at the execution start: 28 killed, 0 timeout, 0 survived, 0 no coverage,
  0 ignored, invocation `pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/RegistryLease.ts --disableBail`.
  It is the first plan commit after `phase_base` (`3fd23788`), a child of the execution start, holding exactly the scorer
  and its record.
- The nine cells C1 to C9 are green three runs in a row and beside the four held lifetime-adjacent files (57 tests). Each
  was seen failing under its scratch edit of `packages/react/src`, written in `86-RED-EVIDENCE.md`. After every edit
  `git diff 41c53c65 -- packages/react/src` was empty.
- `86-pinned-check.mjs` prints `pinned: 59 files hold their base text, 1 of 1 born files held`, passes `--all-applied` and
  its 18-case self-test, and was seen refusing a changed held test and a changed lease.

## Task Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 (tracer) | `3fd23788` | `docs(86-01): record the mutation base of the registry lease` |
| 2 | `8891aaca` | `test(86-01): characterise the provider registry on the base` |
| 3 | `eb2ba2e4` | `chore(86-01): add the pinned-test check` |

## Base facts

Each line is one command as it printed, with its exit status. Measured after the three plan commits, on a tree whose
`packages/react/src` and `stryker.react.mjs` equal `phase_base` (the only difference outside `.planning/` is the added
characterisation test file, so the house-style file count and the react test count include it: 9 cells, 678 tests plus 9).

```
house-style: node scripts/check-house-style.mjs | exit 0 | house-style: 622 file(s) clean (3 declared switch(es), 79 type-test file(s))
api-surface: node scripts/check-api-surface.mjs | exit 0 | api-surface: 942 export(s) documented across 9 package(s)
dod-table: node scripts/check-dod-table.mjs | exit 0 | dod-table: 26 step(s) match pnpm check, 179 reference(s) resolve
doc-examples: node scripts/check-doc-examples.mjs | exit 0 | doc-examples: 122 block(s) compile
devtools-claims: node scripts/check-devtools-claims.mjs | exit 0 | devtools-claims: 8 claim(s) registered across 6 file(s)
website-doc-examples: node scripts/check-website-doc-examples.mjs | exit 0 | website-doc-examples: 77 block(s) compile
traceability: bash spec/scripts/verify-traceability.sh --strict | exit 0 | whole output below

Qadi specification verification
| Status | Check                                      | Detail
| ------ | ------------------------------------------ | ------
| PASS   | appendices/index.yaml -> disk              | 1 entr(y|ies) resolve
| PASS   | appendices/ disk -> index.yaml             | no orphans
| PASS   | behaviors/index.yaml -> disk               | 34 entr(y|ies) resolve
| PASS   | behaviors/ disk -> index.yaml              | no orphans
| PASS   | decisions/index.yaml -> disk               | 155 entr(y|ies) resolve
| PASS   | decisions/ disk -> index.yaml              | no orphans
| PASS   | devtools-spec/index.yaml -> disk           | 5 entr(y|ies) resolve
| PASS   | devtools-spec/ disk -> index.yaml          | no orphans
| PASS   | models/index.yaml -> disk                  | 38 entr(y|ies) resolve
| PASS   | models/ disk -> index.yaml                 | no orphans
| PASS   | process/index.yaml -> disk                 | 3 entr(y|ies) resolve
| PASS   | process/ disk -> index.yaml                | no orphans
| PASS   | invariants -> traceability                 | all 188 invariant(s) traced
| PASS   | decisions -> traceability                  | 155 ADR(s) traced
| PASS   | ADR Document ID = file number              | 131 ADR(s) agree
| PASS   | urs -> traceability table                  | 38 requirement(s) traced
| PASS   | features -> traceability                   | all REQ tags defined
| PASS   | relative link integrity                    | 5630 link(s) resolve, none gitignored
| PASS   | §4 test files -> disk                     | 361 file(s) exist
| PASS   | CCR register coverage                      | known, tracked gap unchanged: 078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137
| PASS   | Revision = newest history entry            | every header agrees

PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
reservation: shasum -a 256 qadi-reserved-ids.json | 61c5ff8b69267834068d7c605ec7c9e0bd6146c583c4682bcef5030a552adaf0  .git/qadi-reserved-ids.json
react tests: pnpm exec vitest run --project react | exit 0 | Tests  687 passed (687) ; Test Files  43 passed (43)
tstyche: pnpm test:tstyche | exit 0 | Duration:   10s
circular: pnpm circular | exit 0 | ✔ No circular dependency found!
82-check.mjs single-owner (scratch copy) | exit 0 | stdout last: single-owner: the registry's lifetime is decided once, in RegistryLease.ts | stderr first: 
82-check.mjs base (scratch copy) | exit 0 | stdout last: 16f09f776fbb9c8c8c2b9b9452e7cf6994a727e3 | stderr first: 
82-check.mjs --self-test (scratch copy) | exit 0 | stdout last: self-test: 147 passed | stderr first: 
82-mutation.mjs --self-test (scratch copy) | exit 0 | stdout last: self-test: 49 passed | stderr first: 
```

`RegistryLease.ts` base counts, from `86-mutation-base.json`: killed 28, timeout 0, survived 0, no coverage 0, ignored 0,
detected 28 of valid 28, open none, Ignored mutants none.

## Held files

`86-pinned-check.mjs` computes the held set from the base: every path `git ls-tree -r --name-only
41c53c65c3ceb60f974650dd374f391c81db56e7 -- packages/react/test` lists (58 files, the test files and `test/support/`)
plus `packages/react/src/RegistryLease.ts`: 59 files, compared byte for byte with `git show <phase_base>:<path>`. A
held file that `git diff -M --name-status <phase_base>` reports as anything but added fails, naming both paths for a move.
The one born file, `packages/react/test/QadiProvider.owner.characterisation.test.tsx`, is held against the one commit
that adds it (`8891aaca`); two adding commits fail, and a file with no adding commit passes plain and fails
`--all-applied`. No held file is declared editable: the phase moves no existing test, and the owner's own tests are new
files, which the check does not hold.

## Deviations from Plan

**1. [Rule 1 - Plan defect] First mutation base run discarded: 11 Timeout mutants under host load**
- **Found during:** Task 1
- **Issue:** the first `--disableBail` run of the lease invocation ended at 17 killed and 11 Timeout (host load average
  about 21 on 12 cores, with 11 Stryker workers), against the plan-time 28 killed. A base with Timeout mutants is not the
  floor the close should be compared with, and the owner rule refuses any Timeout.
- **Fix:** the first run was kept in the scratch directory and not recorded; the host was left to settle, the
  characterisation file (written during that first run, after Stryker had read its file list: the report's `testFiles`
  name no such file) was moved out of the tree, and the same invocation was run again on the same commit: 28 killed,
  0 timeout. The committed record is that run, made on `ca9e58ba` with `packages/react` untouched.
- **Files modified:** none beyond the plan's
- **Commit:** `3fd23788`

**2. [Rule 1 - Plan defect] C8 stubs `console.warn`, not `console.error`**
- **Found during:** Task 2
- **Issue:** the plan says the `ReporterThrew` line goes to a stubbed `console.error`; `DeveloperSignals.ts`'s `say` writes
  with `console.warn`.
- **Fix:** C8 stubs both (the rig always stubs `console.error` and the rendered tests assert it was not called) and asserts
  the `console.warn` line names the reporter's own error.
- **Commit:** `8891aaca`

**3. [Plan wording] the pinned check names a changed byte through git's `M` status**
- **Found during:** Task 3
- **Issue:** the plan words the seen-failing line as a changed held file; a one-byte change is reported by `git diff -M
  --name-status` as `M` before the byte compare runs, so the first stderr line is `<path> is reported as M against its
  base, not unchanged`. The byte compare still runs for a file git does not flag, and the self-test covers it.
- **Commit:** `eb2ba2e4`

**4. [Measured, not as expected] `82-check.mjs base` exits 0**
- **Found during:** Task 3
- **Issue:** the plan expected exit 1 on ancestry for the scratch copy of `82-check.mjs base`; it exits 0 and prints the
  recorded base `16f09f776fbb9c8c8c2b9b9452e7cf6994a727e3` (read from the copied `82-01-SUMMARY.md`). Recorded as measured;
  it gates nothing.

**Total deviations:** 4 (2 plan defects fixed in place, 1 wording, 1 measured difference). **Impact:** none on the floor,
the cells or the held set.

## Issues Encountered

None beyond the deviations above.

## Known Stubs

None.

## Threat Flags

None. The threat register's T-86-01 to T-86-03 mitigations are present: C7 pins the latest committed subject and atom set
written back after a long hide, C4 and C8 pin report-before-write and a throwing reporter, and the record names its head
and invocation, is refused on a dirty tree or a foreign report and is committed alone first.

## Next Phase Readiness

Ready for plan 02: the owner and its tests may now be added; `packages/react/src` and `stryker.react.mjs` still equal
`phase_base`, the nine cells are the net the rewired provider is checked against, and the held set will refuse any edit to
an existing react test.

## Self-Check: PASSED

- Files: the scorer, its record, the characterisation test, the evidence file, the pinned check and this summary exist.
- Commits `3fd23788`, `8891aaca` and `eb2ba2e4` are ancestors of HEAD, and the Task 1, 2 and 3 verify commands passed.

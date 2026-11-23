---
phase: QD-77-an-audit-row-is-a-value-only-its-codec-makes
plan: 01
subsystem: testing
tags: [stryker, mutation, baseline, audit]
requires: []
provides:
  - the four-group mutation scorer for the audit row files
  - the mutation base record of AuditEntry.ts, ArchiveFacts.ts, AuditArchive.ts and Retention.ts at phase_base
  - the base gate lines, audit test count and reservation sha256
affects: [QD-77 plans 02 to 07]
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
plan_head_before: 4d0d3627b93d344efa880be83430166698864600
plan_head_after: f6f8bbff27f811e6630e2bb333db982dbb3fd38b
key-files:
  created:
    - .planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-mutation.mjs
    - .planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-mutation-base.json
key-decisions:
  - "The scorer names every measured file by its full path, so the plan's literal-path check reads it"
requirements-completed: [WX-05, WX-06, WX-07]
duration: 15min
completed: 2026-11-24
status: complete
---

# Phase QD-77 Plan 01: Mutation base Summary

**Four-group Stryker scorer (entry, facts, archive, retention) and its base record, measured on the untouched phase base: 100% of valid mutants detected in every file.**

phase_base: 4d0d3627b93d344efa880be83430166698864600

## Accomplishments
- `77-mutation.mjs` is `72-mutation.mjs` with four groups through `stryker.audit.mjs`, `EXAMINED` empty and no close-only group; `--self-test` ends `self-test: 31 passed`; oxlint clean.
- `77-mutation-base.json` holds the four groups, each with `head` equal to `phase_base`; committed first after `phase_base`, alone with the scorer, before any test or source file of the phase.
- No file outside `.planning/` changed.

## Mutation base (detected/valid, survived, no coverage, ignored)

| Group | File | Score | Survived | NoCoverage | Ignored |
| ----- | ---- | ----- | -------- | ---------- | ------- |
| entry | packages/audit/src/AuditEntry.ts | 17/17 | 0 | 0 | 8 |
| facts | packages/audit/src/ArchiveFacts.ts | 66/66 | 0 | 0 | 4 |
| archive | packages/audit/src/AuditArchive.ts | 53/53 | 0 | 0 | 14 |
| retention | packages/audit/src/Retention.ts | 59/59 | 0 | 0 | 2 |

## Base facts

```
house-style: 586 file(s) clean (3 declared switch(es), 74 type-test file(s))
api-surface: 940 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 154 reference(s) resolve
doc-examples: 118 block(s) compile
devtools-claims: 8 claim(s) registered across 6 file(s)
website-doc-examples: 71 block(s) compile

Qadi specification verification
| Status | Check                                      | Detail
| ------ | ------------------------------------------ | ------
| PASS   | appendices/index.yaml -> disk              | 1 entr(y|ies) resolve
| PASS   | appendices/ disk -> index.yaml             | no orphans
| PASS   | behaviors/index.yaml -> disk               | 34 entr(y|ies) resolve
| PASS   | behaviors/ disk -> index.yaml              | no orphans
| PASS   | decisions/index.yaml -> disk               | 146 entr(y|ies) resolve
| PASS   | decisions/ disk -> index.yaml              | no orphans
| PASS   | devtools-spec/index.yaml -> disk           | 5 entr(y|ies) resolve
| PASS   | devtools-spec/ disk -> index.yaml          | no orphans
| PASS   | models/index.yaml -> disk                  | 38 entr(y|ies) resolve
| PASS   | models/ disk -> index.yaml                 | no orphans
| PASS   | process/index.yaml -> disk                 | 3 entr(y|ies) resolve
| PASS   | process/ disk -> index.yaml                | no orphans
| PASS   | invariants -> traceability                 | all 170 invariant(s) traced
| PASS   | decisions -> traceability                  | 146 ADR(s) traced
| PASS   | ADR Document ID = file number              | 122 ADR(s) agree
| PASS   | urs -> traceability table                  | 38 requirement(s) traced
| PASS   | features -> traceability                   | all REQ tags defined
| PASS   | relative link integrity                    | 5115 link(s) resolve, none gitignored
| PASS   | §4 test files -> disk                     | 327 file(s) exist
| PASS   | CCR register coverage                      | known, tracked gap unchanged: 078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137
| PASS   | Revision = newest history entry            | every header agrees

PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)

reservation-sha256: 6ecf5abaa27f01c2111be0eef954e393e3a176b7d0c611f3a980f506fe904b56
audit-tests: Tests  547 passed (547)
```

The house-style and api-surface lines match the plan-time evidence (3 declared switches, 74 type-test files; 940 exports across 9 packages).

## Task Commits

1. **Tasks 1 and 2: scorer, entry group and the other three groups, base facts** - `f6f8bbff` (docs). The plan's Task 1 leaves the commit to Task 2, so both tasks are one commit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Scorer did not spell the measured file paths literally**
- **Found during:** Task 2 (plan verify)
- **Issue:** the first copy built paths from a `R` prefix constant; the plan's check for the literal `packages/audit/src/AuditEntry.ts` (and the three others) in the scorer failed.
- **Fix:** each group names its file by full path and `R` was removed; self-test still 31 passed, oxlint clean; the commit was amended before anything built on it.
- **Files modified:** 77-mutation.mjs
- **Committed in:** f6f8bbff

**Total deviations:** 1 auto-fixed. **Impact:** none on the record; the base JSON is unaffected.

Note: the project-root pin guard was run as a shortened equivalent (the same toplevel comparison against the pinned root), not the verbatim script.

## Issues Encountered
None

## Next Phase Readiness
Ready for 77-02: the base is committed, so a RED test may now be added. `<S>/phase_base` and `<S>/base-facts.txt` live under the temp directory `qd77`; the summary copies both.

---
*Phase: QD-77*
*Completed: 2026-11-24*

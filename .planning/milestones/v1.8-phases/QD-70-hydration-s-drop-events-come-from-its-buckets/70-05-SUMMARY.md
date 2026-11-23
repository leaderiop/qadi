---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
plan: 05
subsystem: spec
tags: [adr, ccr, changeset, traceability]
phase_base: 3630e29865bbaed49126b214f0f6cc7006b6f4bc
requires: [70-03, 70-04]
provides:
  - "ADR-QD-183 (spec/decisions/183-hydration-drop-events-are-derived-from-their-buckets.md), Revision 1.0, Status `Accepted — amends ADR-QD-152`"
  - "ADR-QD-152 at Revision 1.1 with an amendment section before its Consequences"
  - "index.yaml entry, traceability section 3 row (traceability 1.239), CCR-QD-462 row (README 1.282)"
  - ".changeset/react-hydration-drop-buckets.md, a @qadi/react patch"
affects: [70-06, 70-07]
tech-stack:
  added: []
  patterns: ["amendment section before Consequences, Status row unchanged (as ADR-QD-169)"]
key-files:
  created:
    - spec/decisions/183-hydration-drop-events-are-derived-from-their-buckets.md
    - .changeset/react-hydration-drop-buckets.md
  modified:
    - spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "ADR-QD-183 states the file-sharing reason accurately: the phases in flight when ADR-QD-152 was written have landed, phases now run serially, and ARCH-118 edits only the two reporter call sites in dehydrateWith and hydrateWith, none of the planners, bucket records or the payload producer record."
  - "The ADR names the code as it landed: DropBuckets, entryBuckets, dehydrationBuckets, dropEvents, PAYLOAD_PRODUCERS, PAYLOAD_REASONS; it links no BEH-QD-686..690, INV-QD-385 or INV-QD-386 anchor (70-06 adds them)."
requirements-completed: []
duration: 35 min
completed: 2026-11-22
status: complete
commits: 2
plan_head_before: d3a7c62ec1dd80de3a3a2d305c681e8c6ebca973
plan_head_after: 68128120
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase 70 Plan 05: ADR-QD-183, the ADR-QD-152 amendment and the react changeset Summary

The decision that hydration's drop events are derived from per-side bucket records, with the payload path's producers
stated and compile-checked, is recorded as ADR-QD-183 and traced through every register; ADR-QD-152 points forward to it.

## What landed

- ADR file `spec/decisions/183-hydration-drop-events-are-derived-from-their-buckets.md`, Document ID `QADI-ADR-183`,
  Revision 1.0, Status `Accepted — amends ADR-QD-152`. Records the bucket records and `dropEvents`, the emission order
  stated once per side, the payload producer record and its inverse, the subject check running first, and why
  ADR-QD-152's reason no longer applies. No decision, plan or phase id in it.
- Revisions: traceability 1.239 (1.240 comes in 70-06), README 1.282, ADR-QD-152 1.1 (amendment section right before
  `## Consequences`; Status row and every other line unchanged); index.yaml entry added and ADR-QD-152's status amended.
- CCR-QD-462 row right after CCR-QD-461's, citing every final Revision (183 Rev 1.0, 152 Rev 1.1, `19-hydration.md` 1.24,
  `invariants.md` 1.170, `traceability.md` 1.240, `README.md` 1.282), ending `Unused: none.`; `spec/overview.md` unchanged.
- Changeset: one `@qadi/react` patch saying the events, order and counts are unchanged and a new reason does not compile
  until handled; no id, no internal module name.
- verify-traceability strict: `PASS: 21   FAIL: 0   SKIP: 0`, `140 ADR(s) traced`, `116 ADR(s) agree`,
  `156 invariant(s) traced`, in both task verifies; `spec-revise --check` clean.

## Correction of CONTEXT's wording (D-02)

CONTEXT said no later v1.8 phase edits `HydrationEngine.ts`. That is not true: Phase 71 (ARCH-118) pairs each reporter
call site's default with its hook slot in `dehydrateWith` and `hydrateWith`. ADR-QD-183 (decision 6) and the ADR-QD-152
amendment state the reason truthfully: the in-flight phases of 2026-11-14 have landed, phases run serially, and ARCH-118
touches only those two call sites, not the planners, the bucket records or the payload producer record.

## Commits

- e5f3ba4c: docs(70-05): ADR-QD-183, hydration drop events derived from their buckets, and CCR-QD-462
- 68128120: docs(70-05): amend ADR-QD-152 and record the react changeset

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ADR hydrate order wrapped across two lines**
- **Found during:** Task 1 verify (`the ADR does not state the hydrate order`)
- **Issue:** the three hydrate-order names were split by a hand wrap, so the line-based check did not see them together.
- **Fix:** re-wrapped decision 3 so `EntryTooDeep`, `MalformedEntry`, `UndecodablePolicy` sit on one line; amended the
  Task 1 commit (unpushed) so it still holds exactly the four register files.
- **Files modified:** the ADR file. **Commit:** e5f3ba4c.

**2. [Rule 3 - Blocking, self-inflicted] A leftover scratch script touched a source file**
- **Found during:** Task 1, right after the index append.
- **Issue:** I ran a stale experiment script from the shared scratch directory with no arguments; it inserted one
  malformed row into `packages/core/src/HydrationMetrics.ts`.
- **Fix:** `git checkout --` of that one file, confirmed clean by `git status --porcelain -- packages spec scripts
  .changeset` (only the plan's spec files remained). It never reached a commit.

Verification-only deviation: none (both task verifies ran as written, extracted verbatim from the plan).

**Total deviations:** 2 auto-fixed. **Impact:** none on the committed result.

## Known Stubs

None.

## Threat Flags

None. T-70-11 mitigated (ADR names ARCH-118 and the two call sites); T-70-12 mitigated (the CCR row landed in the same
commit as the first citation; strict traceability ran in both verifies).

## Self-Check: PASSED

- ADR file, changeset: found on disk.
- Commits e5f3ba4c and 68128120 are ancestors of HEAD.
- Both task `<verify>` commands exit 0; `git status --porcelain -- packages spec scripts .changeset` is empty.

---
phase: QD-46-the-sink-emitter-reports-what-it-contains
reviewed: 2026-11-15T16:40:00Z
depth: standard
iteration: 3
files_reviewed: 8
files_reviewed_list:
  - .planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-classification.md
  - packages/core/src/DecisionSinkForwarding.ts
  - packages/core/src/SinkEmit.ts
  - packages/core/src/SinkReport.ts
  - spec/README.md
  - spec/decisions/159-the-sink-emitter-reports-what-it-contains.md
  - spec/invariants.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: issues_found
---

# Phase QD-46: Code Review Report (iteration 3)

**Reviewed:** 2026-11-15T16:40:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Both iteration-2 findings are resolved in the files themselves. `git diff 2602ef90..HEAD` touches only five documents (the
classification, `spec/README.md`, ADR-QD-159, `invariants.md`, `traceability.md`) and no source or test file, so it adds no
code defect. One Info item remains: a stale cell in ADR-QD-159's copy of the classification table, which the planning file
says is identical.

Checked, not assumed:

- ADR-QD-159 line 77 and INV-QD-338's Enforcement now say E9 (a throwing logger) is the row that pins the containment, and E15
  pins that a hostile cause value is still reported once with an unchanged decision. INV-QD-338 also says E15 does not fail
  without the containment. No remaining sentence in the ADR, the invariants, the traceability rows (INV-QD-338 row, the
  `SinkEmitReport.test.ts` row) or BEH-QD-566..570 says E15 pins the containment. The BEH body names the containment only in
  prose, with no row id.
- `46-classification.md` agrees with the code. W5 now points at `DecisionSinkForwarding.ts:190`, which is the
  `reportSinkFailure(MEMBER_FAILED, shape, handed, cause)` call. The header, W0, R0 and the caller's-own-sink bullet cite
  E1-E15. The suite has E1-E15 and A1-A8 (counted in the test files). The header note says the other `File:line` cells stay
  at the phase base, so the unchanged `SinkEmit.ts:53` and similar cells are intentional.
- Revs in the `spec/README.md` CCR-QD-437 row match each file header: BEH 24-decision-sink 1.18, invariants 1.133,
  traceability 1.195, overview 1.112, README 1.198, ADR-QD-159 1.6, ADR-QD-044 1.3. The README change history has 1.198.
- The revision bumps (README, ADR, invariants, traceability) each carry a matching change-history entry. BEH 24 stays at 1.18
  because the diff did not touch it, and its body makes no E15 claim.

## Iteration 2 resolution

| ID | Status | Evidence |
| -- | ------ | -------- |
| IN-01 (E15 cannot fail without the containment; ADR and INV-QD-338 said it pins it) | Resolved | ADR-QD-159 line 77 and INV-QD-338 Enforcement (`spec/invariants.md:3907`) now name E9 as the pinning row and describe E15 as a hostile-cause regression row. The traceability row for `SinkEmitReport.test.ts` words E15 as "a hostile cause value reported once with the allow unchanged". Revs 1.6 / 1.133 / 1.195 carry history entries. |
| IN-02 (`46-classification.md` not carried forward) | Resolved | W5 now says all four keys, built by `reportSinkFailure` in `SinkReport.ts`, with the `:190` reference. The row ranges read E1-E15 and A1-A8, and a dated note at the top records what changed. One cell of the ADR's copy does not follow; see IN-01 below. |

## Info

### IN-01: ADR-QD-159's W0 row still cites E1-E10 while the classification and the rest of the ADR cite E1-E15

**File:** `spec/decisions/159-the-sink-emitter-reports-what-it-contains.md:112`; `.planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-classification.md:5` (the note) and `:19` (W0)

**Issue:** The classification's W0 "Pinned by" cell was updated to `E1-E15, O1-O5 (46-01)`. The ADR's W0 cell still reads
`E1-E10, O1-O5 (46-01)`. The two tables otherwise match, and the same ADR already cites E1-E15 in its own preface (line 107) and
R0 row (line 124). The classification's header note says "ADR-QD-159's copy of this table is the same", which is false for
this one cell. W0 is replaced by R0, so the row is pinned by the whole E suite, not E1-E10, and E11-E15 (the Obligations
record, the interrupt, the unreadable record and the hostile cause) are the rows that cover the new behaviour.

**Fix:** Change the ADR's W0 cell to `E1-E15, O1-O5 (46-01)`, which needs an ADR Rev and a `spec/README.md` CCR-QD-437 Rev
update in the same change. Or, if no further spec bump is wanted, reword the classification's note to say the ADR's W0 cell is
older. The first is the cleaner fix, since the ADR is normative and the planning file is not.

---

_Reviewed: 2026-11-15T16:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

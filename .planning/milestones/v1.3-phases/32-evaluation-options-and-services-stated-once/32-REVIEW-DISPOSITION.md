---
phase: 32
review: 32-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "`EvaluationServices.ts` header gives a cycle reason that is false for `Lifecycle.ts`"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "`decideQuestion` options pin compares the type to its own derivation"
  - id: WR-02
    severity: warning
    disposition: skipped
    title: "New doc comments cite decision ids, against the phase's own rule"
  - id: IN-02
    severity: info
    disposition: skipped
    title: "First `Lifecycle.tst.ts` test reads `QuestionOptions` from the module under check"
  - id: IN-03
    severity: info
    disposition: skipped
    title: "Carried debt, not a defect of this phase"
  - id: IN-04
    severity: info
    disposition: skipped
    title: "`evaluationId` doc was reworded, not moved verbatim"
open: 0
total: 6
recorded: 2026-11-12T13:31:56.853Z
---

# Phase 32: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 32-REVIEW-FIX.md (not in the current review) |
| IN-01 | info | fixed | 32-REVIEW-FIX.md (not in the current review) |
| WR-02 | warning | skipped | 32-REVIEW-FIX.md (not in the current review) |
| IN-02 | info | skipped | 32-REVIEW-FIX.md (not in the current review) |
| IN-03 | info | skipped | 32-REVIEW-FIX.md (not in the current review) |
| IN-04 | info | skipped | 32-REVIEW-FIX.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

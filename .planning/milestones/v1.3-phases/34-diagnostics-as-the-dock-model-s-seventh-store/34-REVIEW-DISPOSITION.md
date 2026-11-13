---
phase: 34
review: 34-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "A defect while the scope closes is reported as `Stopped`"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "`restart()` / `configure` on a closed feed publishes `Starting`"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "`configure(undefined)` redoes `off()` when already off"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "A restart while `Starting` publishes `Starting` again"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "A second stop flips `role` instead of remounting"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "Survivor evidence for the marking-accept token"
  - id: IN-01
    severity: info
    disposition: skipped
    title: "Marking-accept guard unreachable"
  - id: IN-05
    severity: info
    disposition: skipped
    title: "`TimelineFeed` silent fiber death"
open: 0
total: 8
recorded: 2026-11-12T18:25:55.529Z
---

# Phase 34: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 34-REVIEW-FIX.md (not in the current review) |
| WR-02 | warning | fixed | 34-REVIEW-FIX.md (not in the current review) |
| IN-02 | info | fixed | 34-REVIEW-FIX.md (not in the current review) |
| IN-03 | info | fixed | 34-REVIEW-FIX.md (not in the current review) |
| IN-04 | info | fixed | 34-REVIEW-FIX.md (not in the current review) |
| WR-03 | warning | fixed | 34-REVIEW-FIX.md (not in the current review) |
| IN-01 | info | skipped | 34-REVIEW-FIX.md (not in the current review) |
| IN-05 | info | skipped | 34-REVIEW-FIX.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

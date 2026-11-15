---
phase: 46
review: 46-REVIEW.md
titles: json
findings:
  - id: IN-01
    severity: info
    disposition: fixed
    title: "ADR-QD-159's W0 row still cites E1-E10 while the classification and the rest of the ADR cite E1-E15"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "`46-classification.md` was not carried forward to the final report"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "A sink that makes the record unreadable before failing erases its own report"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "The outer-interrupt vs self-interrupt contract is neither pinned by a test nor stated in the spec"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "`sinkName` is exported from the emit module, so the forwarder now imports it"
open: 0
total: 5
recorded: 2026-11-15T15:04:42.112Z
---

# Phase 46: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | fixed | 46-REVIEW-FIX.md |
| IN-02 | info | fixed | 46-REVIEW-FIX.iter2.md (not in the current review) |
| WR-01 | warning | fixed | 46-REVIEW-FIX.iter1.md (not in the current review) |
| WR-02 | warning | fixed | 46-REVIEW-FIX.iter1.md (not in the current review) |
| IN-03 | info | fixed | 46-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

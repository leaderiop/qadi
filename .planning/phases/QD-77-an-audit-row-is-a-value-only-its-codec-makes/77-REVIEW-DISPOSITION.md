---
phase: 77
review: 77-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "`archiveAuditTrail` checks `keyMaterial` and then re-reads it, so the check and the written value can differ"
  - id: WR-02
    severity: warning
    disposition: open
    title: "INV-QD-399 says no input is a defect \"whatever the value given\", but a non-list `entries` still throws"
  - id: WR-03
    severity: warning
    disposition: open
    title: "`ArchiveInputInvalid.value: unknown` overloads one slot for an index and for a given value, and a closed shape that avoids it already exists in this package"
  - id: IN-01
    severity: info
    disposition: open
    title: "`RetentionInputInvalid.value` is still `number` while `now` can be anything for a JavaScript caller"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "`README.md` leaves out the non-list `keyMaterial` value"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "The decode matrix pins `effect`'s own formatter wording"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "The `now` writer tests pass on any failure, and one property is duplicated"
open: 4
total: 7
recorded: 2026-11-24T03:30:07.896Z
---

# Phase 77: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| WR-03 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | fixed | 77-REVIEW-FIX.md |
| IN-03 | info | fixed | 77-REVIEW-FIX.iter2.md (not in the current review) |
| IN-04 | info | fixed | 77-REVIEW-FIX.iter2.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

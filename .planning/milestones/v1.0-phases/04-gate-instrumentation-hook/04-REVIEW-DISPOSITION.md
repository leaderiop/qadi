---
phase: 04
review: 04-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "The \"opens its decision atom once\" test never exercises the suspending path"
  - id: IN-01
    severity: info
    disposition: open
    title: "`useGateRegistration` is now production dead code kept alive by one test"
  - id: IN-02
    severity: info
    disposition: open
    title: "Stale doc comment on the `useAtomValue` re-export"
  - id: IN-03
    severity: info
    disposition: open
    title: "Hook dependency arrays omit values that are read inside the callback"
  - id: IN-04
    severity: info
    disposition: open
    title: "Test header overstates \"written against the code before the move\""
open: 4
total: 5
recorded: 2026-11-08T05:14:30.700Z
---

# Phase 04: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 04-REVIEW-FIX.md |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

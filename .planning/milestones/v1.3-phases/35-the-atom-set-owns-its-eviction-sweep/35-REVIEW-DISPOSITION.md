---
phase: 35
review: 35-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "A fork that throws leaves the pending flag stuck true"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "S9's mid-wait assertions depend on the dispatcher's bucket-drain order"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "The \"What this closure owns\" comment sat above `scheduler`"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "\"One macrotask later\" understates the release path"
open: 0
total: 4
recorded: 2026-11-12T21:26:07.334Z
---

# Phase 35: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 35-REVIEW-FIX.md (not in the current review) |
| IN-02 | info | fixed | 35-REVIEW-FIX.md (not in the current review) |
| IN-01 | info | fixed | 35-REVIEW-FIX.md (not in the current review) |
| IN-03 | info | fixed | 35-REVIEW-FIX.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

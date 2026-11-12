---
phase: 31
review: 31-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "Property test can only ever pick the first two candidates, so most waiters and computes are never targeted by Leave or Settle"
  - id: IN-01
    severity: info
    disposition: open
    title: "Superseded and Abandoned are never observably different; the lookup tables carry rows that cannot be reached"
  - id: IN-02
    severity: info
    disposition: open
    title: "Property runner dispatches on `_tag` with an if/else chain whose final `else` silently absorbs any new command"
  - id: IN-03
    severity: info
    disposition: open
    title: "File header says an abandoned or superseded exit \"is dropped\" and attributes the superseded rule to issue #64"
  - id: IN-04
    severity: info
    disposition: open
    title: "Stale `generation` comment remains in `DecisionCache.test.ts` (known debt)"
open: 5
total: 5
recorded: 2026-11-12T08:18:27.527Z
---

# Phase 31: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

---
phase: 26
review: 26-REVIEW.md
titles: json
findings:
  - id: IN-01
    severity: info
    disposition: open
    title: "`useDockSnapshot`, `useExplorerSnapshot` and `useHeldChoiceSnapshot` pass a constant `undefined` run to `useRunningStore`"
  - id: IN-02
    severity: info
    disposition: open
    title: "`DevtoolsDock`'s `nothing` default duplicates `DockModel`'s own empty-source handling, and its comment is stale"
  - id: IN-03
    severity: info
    disposition: open
    title: "Test titles and a header comment point at removed DOM code by line number"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "Shipped source cites planning-only decision IDs that resolve nowhere in `spec/`"
open: 3
total: 4
recorded: 2026-11-11T13:28:48.378Z
---

# Phase 26: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| WR-01 | warning | fixed | 26-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

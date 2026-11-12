---
phase: 29
review: 29-REVIEW.md
titles: json
findings:
  - id: IN-01
    severity: info
    disposition: open
    title: "`DENY_WITHHELD` restates `ALLOW_WITHHELD`, which its own comment says it contains (carried forward)"
  - id: IN-02
    severity: info
    disposition: open
    title: "CCR-QD-419 row contradicts itself on the re-pointed module count and cites its own revision one behind (carried forward, widened)"
  - id: IN-03
    severity: info
    disposition: open
    title: "ADR-QD-123 amendment says `PortMetrics.ts` \"still imports the leaf\""
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "ADR-QD-123 still says `PortMetrics.ts` owns `PortName`"
open: 3
total: 4
recorded: 2026-11-12T00:16:14.825Z
---

# Phase 29: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| WR-01 | warning | fixed | 29-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

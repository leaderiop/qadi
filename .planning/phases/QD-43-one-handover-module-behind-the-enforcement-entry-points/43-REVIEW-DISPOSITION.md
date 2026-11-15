---
phase: 43
review: 43-REVIEW.md
titles: json
findings:
  - id: IN-01
    severity: info
    disposition: open
    title: "`Handover.ts` reuses the names `Verdict` and `Admitted`, which already mean something else in `@qadi/core`"
  - id: IN-02
    severity: info
    disposition: open
    title: "`Handover.test.ts` header contradicts the file"
  - id: IN-03
    severity: info
    disposition: open
    title: "`resourceFree` doc overstates its monopoly"
  - id: IN-04
    severity: info
    disposition: open
    title: "Ordering test relies on wall-clock, and `guard`'s arrow formatting is irregular"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "`@qadi/promise` `filter`/`filterProjected` only refuse a literal `resource`"
open: 4
total: 5
recorded: 2026-11-15T02:33:20.791Z
---

# Phase 43: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |
| WR-01 | warning | fixed | 43-REVIEW-FIX.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

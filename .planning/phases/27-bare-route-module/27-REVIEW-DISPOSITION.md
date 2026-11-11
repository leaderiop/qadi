---
phase: 27
review: 27-REVIEW.md
titles: json
findings:
  - id: IN-01
    severity: info
    disposition: open
    title: "Ambiguous \"the module\" in the `addGuardedRoute` doc comment (carried forward from iteration 1)"
  - id: IN-02
    severity: info
    disposition: open
    title: "Garbled word in the moved overload paragraph"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "ADR-QD-037's live test table names `guardRoute` as the thing `GuardRoute.tst.ts` pins"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "Source comments in `@qadi/core` describe `guardRoute` as a live function"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "ADR-QD-046 and ADR-QD-043 body text names `guardRoute` as the live guard"
open: 2
total: 5
recorded: 2026-11-11T14:38:00.600Z
---

# Phase 27: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| WR-01 | warning | fixed | 27-REVIEW-FIX.iter1.md (not in the current review) |
| WR-02 | warning | fixed | 27-REVIEW-FIX.iter1.md (not in the current review) |
| WR-03 | warning | fixed | 27-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

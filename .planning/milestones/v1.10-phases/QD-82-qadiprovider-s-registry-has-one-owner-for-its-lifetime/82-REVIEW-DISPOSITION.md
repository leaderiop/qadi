---
phase: 82
review: 82-REVIEW.md
titles: json
findings:
  - id: IN-01
    severity: info
    disposition: fixed
    title: "LT18 swaps the process's `uncaughtException` listeners; a `setTimeout` wrapper is narrower and also checks which error escaped"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "BEH-QD-749 and the ADR LT6 row claim the reveal's first frame reads a subject changed while hidden"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "nothing pins that the recycle re-seeds the latest committed subject"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "LT12 asserts one fork and one sweep per episode with zero forks and zero sweeps"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "the recycle callback is not atomic when `reset()` throws"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "LT14's closing assertion does not depend on the lease"
open: 0
total: 6
recorded: 2026-11-25T02:30:53.660Z
---

# Phase 82: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | fixed | 82-REVIEW-FIX.md (not in the current review) |
| WR-01 | warning | fixed | 82-REVIEW-FIX.iter2.md (not in the current review) |
| WR-02 | warning | fixed | 82-REVIEW-FIX.iter2.md (not in the current review) |
| WR-03 | warning | fixed | 82-REVIEW-FIX.iter2.md (not in the current review) |
| IN-02 | info | fixed | 82-REVIEW-FIX.iter2.md (not in the current review) |
| IN-03 | info | fixed | 82-REVIEW-FIX.iter2.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

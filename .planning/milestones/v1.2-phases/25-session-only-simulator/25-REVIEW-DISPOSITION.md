---
phase: 25
review: 25-REVIEW.md
titles: json
findings:
  - id: IN-01
    severity: info
    disposition: open
    title: "`BaselineCard` renders an empty sentence silently if the \"present exactly when `Checked`\" invariant breaks"
  - id: IN-02
    severity: info
    disposition: open
    title: "Stale test-file comments about runs settling synchronously"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "`DockFrame` captures a session that `useScoped` can later replace"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "`useScoped` leaks the scope if `make()` throws"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "The `simulation-session` changeset describes an interface this phase removed"
  - id: WR-01
    severity: warning
    disposition: skipped
    title: "A `run` issued from a subscriber notified by a synchronously-landing run is interrupted, and `Running` sticks"
open: 2
total: 6
recorded: 2026-11-11T07:53:23.006Z
---

# Phase 25: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| WR-02 | warning | fixed | 25-REVIEW-FIX.iter2.md (not in the current review) |
| WR-03 | warning | fixed | 25-REVIEW-FIX.iter2.md (not in the current review) |
| WR-04 | warning | fixed | 25-REVIEW-FIX.iter2.md (not in the current review) |
| WR-01 | warning | skipped | 25-REVIEW-FIX.iter2.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

---
phase: 44
review: 44-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "INV-QD-333, ADR-QD-157 and the traceability rows name the key-set pin as the whole guard and omit the engine-agreement test"
  - id: IN-01
    severity: info
    disposition: open
    title: "plan-local ids remain in source and test titles (carried)"
  - id: IN-02
    severity: info
    disposition: open
    title: "\"pinned on the phase base\" wording survives (carried, remainder of IN-02)"
open: 2
total: 3
recorded: 2026-11-15T04:41:27.977Z
---

# Phase 44: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 44-REVIEW-FIX.md |
| IN-01 | info | open | - |
| IN-02 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

---
phase: 81
review: 81-REVIEW.md
titles: json
findings:
  - id: IN-01
    severity: info
    disposition: fixed
    title: "The new BEH-QD-656 requirement is pinned for a read only through a derived-store listener and a backlog record"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "BEH-QD-656's new requirement has no amendment banner and is not reflected in INV-QD-373's rows"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "Spec records described DL10 as a throwing lens listener whose throw is rethrown"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "DL18 to DL20 are in no behavior or traceability record, and DL20's behavior is not a spec requirement"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "README documents the package-private dock model's `configure`"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "aggregate collection is hierarchical"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "README paragraph no longer hand-wrapped"
open: 0
total: 7
recorded: 2026-11-24T23:42:30.937Z
---

# Phase 81: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | fixed | 81-REVIEW-FIX.md |
| IN-02 | info | fixed | 81-REVIEW-FIX.md |
| WR-01 | warning | fixed | 81-REVIEW-FIX.iter3.md (not in the current review) |
| WR-02 | warning | fixed | 81-REVIEW-FIX.iter3.md (not in the current review) |
| WR-03 | warning | fixed | 81-REVIEW-FIX.iter2.md (not in the current review) |
| WR-04 | warning | fixed | 81-REVIEW-FIX.iter2.md (not in the current review) |
| IN-03 | info | fixed | 81-REVIEW-FIX.iter2.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

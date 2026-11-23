---
phase: 71
review: 71-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "The module-state scan crashes on a destructuring pattern with a hole"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "Three test bodies lost their indentation when the environment swap was extracted"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "Lines the phase wrote, or reflowed, run far past the codebase's width"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "The server-pid behaviour is explained three times in `probe-guard-parse.mjs`, with a dangling referent"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "ADR-QD-033 Rev 1.9 overstates what the failure text never contains, and its Status is stale"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "A failed scan reports a command line, not its cause"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "INV-QD-251 and its traceability row said \"every resolver\" and omitted `onIdCollision`"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "`MODULE_STATE_BUDGET` read module scope as column 0"
  - id: WR-05
    severity: warning
    disposition: fixed
    title: "INV-QD-388 contradicted itself and claimed more than the gate or the code supports"
  - id: WR-06
    severity: warning
    disposition: fixed
    title: "Phase-relative claims (\"never edited after\", \"written before the table existed\")"
  - id: WR-07
    severity: warning
    disposition: fixed
    title: "Three tests per environment shared one title"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "The table-facts test compares the table with a verbatim copy, and `resolved` has no reader"
  - id: IN-06
    severity: info
    disposition: fixed
    title: "The same probe and the `threw` sentence written in more than one test file"
open: 0
total: 13
recorded: 2026-11-22T18:11:01.031Z
---

# Phase 71: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 71-REVIEW-FIX.md |
| IN-01 | info | fixed | 71-REVIEW-FIX.md |
| IN-02 | info | fixed | 71-REVIEW-FIX.md |
| IN-03 | info | fixed | 71-REVIEW-FIX.md |
| IN-04 | info | fixed | 71-REVIEW-FIX.md |
| WR-02 | warning | fixed | 71-REVIEW-FIX.iter2.md (not in the current review) |
| WR-03 | warning | fixed | 71-REVIEW-FIX.iter1.md (not in the current review) |
| WR-04 | warning | fixed | 71-REVIEW-FIX.iter1.md (not in the current review) |
| WR-05 | warning | fixed | 71-REVIEW-FIX.iter1.md (not in the current review) |
| WR-06 | warning | fixed | 71-REVIEW-FIX.iter1.md (not in the current review) |
| WR-07 | warning | fixed | 71-REVIEW-FIX.iter1.md (not in the current review) |
| IN-05 | info | fixed | 71-REVIEW-FIX.iter1.md (not in the current review) |
| IN-06 | info | fixed | 71-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

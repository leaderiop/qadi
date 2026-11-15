---
phase: 45
review: 45-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "The new qualifier says a string or `Duration` cooldown \"rounds to the millisecond\"; the check refuses it unless it is already a whole millisecond"
  - id: IN-01
    severity: info
    disposition: open
    title: "The 0.13 entry in `upgrading.md` still states the old rule and omits the qualifiers the changeset gained"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "Upgrade guide and changeset give no way to keep an old \"never trip\" or \"never reset\" setting"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "Option-test gaps"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "Lines exceed the hand-wrapped width"
open: 2
total: 5
recorded: 2026-11-15T07:29:02.388Z
---

# Phase 45: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | fixed | 45-REVIEW-FIX.iter1.md (not in the current review) |
| IN-03 | info | fixed | 45-REVIEW-FIX.iter1.md (not in the current review) |
| IN-04 | info | fixed | 45-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

---
phase: 69
review: 69-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "Capture.test.ts shadows the imported `hostile` with a different, redundant fixture"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "PortConformance.test.ts: a test subsumed by the one added directly below it"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "Capture's third read, \"the error's own string message\", has no instantiation and no pin"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "spec/behaviors/05-evaluator.md still says a custom predicate defect renders with `Cause.pretty`"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "`hostile` / `hostileError` copied into twelve test files"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "Capture records a `null` cause as the empty string"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "React `namedLine` restates the guard"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "Two tests that cannot fail for the reason their title names"
  - id: IN-06
    severity: info
    disposition: fixed
    title: "Over-long doc/code lines"
open: 0
total: 9
recorded: 2026-11-22T11:09:04.865Z
---

# Phase 69: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 69-REVIEW-FIX.md |
| IN-01 | info | fixed | 69-REVIEW-FIX.md |
| IN-02 | info | fixed | 69-REVIEW-FIX.md, commit 7e56ccaa (the report titles it "renderError doc comment"; reconciled by hand) |
| IN-03 | info | fixed | 69-REVIEW-FIX.md |
| WR-02 | warning | fixed | 69-REVIEW-FIX.iter3.md (not in the current review) |
| WR-03 | warning | fixed | 69-REVIEW-FIX.iter3.md (not in the current review) |
| IN-04 | info | fixed | 69-REVIEW-FIX.iter3.md (not in the current review) |
| IN-05 | info | fixed | 69-REVIEW-FIX.iter3.md (not in the current review) |
| IN-06 | info | fixed | 69-REVIEW-FIX.iter3.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

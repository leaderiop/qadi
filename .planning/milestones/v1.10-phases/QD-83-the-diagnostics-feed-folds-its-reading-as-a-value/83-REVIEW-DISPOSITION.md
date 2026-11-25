---
phase: 83
review: 83-REVIEW.md
titles: json
findings:
  - id: IN-01
    severity: info
    disposition: fixed
    title: "the new SR1 title and the new WR-01 comment are not wrapped by hand"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "the \"four fields\" test read the folded reading"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "nothing pinned that a superseded sample does not set `sampled`"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "stale doc comment on `DockModelInputs.reading`"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "lines over the hand-wrapped width"
  - id: IN-02
    severity: info
    disposition: skipped
    title: "characterisation header says rows are \"left\" in `DiagnosticsFeed.test.ts`, then re-pins them"
  - id: IN-03
    severity: info
    disposition: skipped
    title: "a supplied reading carrying only `questions` still yields a new, content-identical shown reading"
open: 0
total: 7
recorded: 2026-11-25T05:24:38.110Z
---

# Phase 83: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | fixed | 83-REVIEW-FIX.md (not in the current review) |
| WR-01 | warning | fixed | 83-REVIEW-FIX.iter2.md (not in the current review) |
| WR-02 | warning | fixed | 83-REVIEW-FIX.iter2.md (not in the current review) |
| WR-03 | warning | fixed | 83-REVIEW-FIX.iter2.md (not in the current review) |
| IN-04 | info | fixed | 83-REVIEW-FIX.iter2.md (not in the current review) |
| IN-02 | info | skipped | 83-REVIEW-FIX.iter2.md (not in the current review) |
| IN-03 | info | skipped | 83-REVIEW-FIX.iter2.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

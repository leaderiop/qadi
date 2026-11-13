---
phase: 31
review: 31-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "Property test can only ever pick the first two candidates"
  - id: IN-01
    severity: info
    disposition: skipped
    title: "Superseded and Abandoned are never observably different; the lookup tables carry unreachable rows"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "Property runner dispatched on `_tag` with an if/else chain"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "File header misstated what a superseded exit does and misattached issue #64"
  - id: IN-04
    severity: info
    disposition: skipped
    title: "Stale `generation` comment in `DecisionCache.test.ts`"
open: 0
total: 5
recorded: 2026-11-12T08:21:41.942Z
---

# Phase 31: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 31-REVIEW-FIX.md (not in the current review) |
| IN-01 | info | skipped | 31-REVIEW-FIX.md (not in the current review) |
| IN-02 | info | fixed | 31-REVIEW-FIX.md (not in the current review) |
| IN-03 | info | fixed | 31-REVIEW-FIX.md (not in the current review) |
| IN-04 | info | skipped | 31-REVIEW-FIX.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

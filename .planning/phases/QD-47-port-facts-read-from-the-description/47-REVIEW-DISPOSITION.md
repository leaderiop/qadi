---
phase: 47
review: 47-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "`markDefault`'s in-place `Object.assign` throws for an extensible result whose prototype has a read-only mark or whose proxy refuses a set"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "BEH-QD-571 calls marking a shared result \"the same limit\" as BEH-QD-572, but it leaks the mark to the host's other uses of that object"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "\"total over any value\" is claimed as a MUST, but `isMarkedDefault` throws on a Proxy whose descriptor trap throws"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "`markDefault` rebuilds the shape with a spread, which loses a class-based shape's prototype methods"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "BEH-QD-571's \"MUST NOT carry the mark\" list is pinned for one port and one kind of double"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "`decoratePorts` stamps the mark on whatever `f` returns, so a decorator that replaces the shape still reads defaulted"
open: 0
total: 6
recorded: 2026-11-16T01:14:02.354Z
---

# Phase 47: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 47-REVIEW-FIX.md |
| IN-01 | info | fixed | 47-REVIEW-FIX.md |
| WR-02 | warning | fixed | 47-REVIEW-FIX.iter1.md (not in the current review) |
| WR-03 | warning | fixed | 47-REVIEW-FIX.iter1.md (not in the current review) |
| WR-04 | warning | fixed | 47-REVIEW-FIX.iter1.md (not in the current review) |
| IN-02 | info | fixed | 47-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

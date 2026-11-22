---
phase: 72
review: 72-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "the build-failure test does not pin that the build fails with the parent's throw, as a defect"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "two test-title lines the phase wrote are past 90 columns"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "the one-wiring reading and the hydration literal are written three times across the two files that share `dockModelFixtures.ts`"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "the questions and services store titles claim an order that one row of three checks"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "the traceability row for `ExternalStore.test.ts` does not name the two new finalizer tests"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "the CCR-QD-464 file list lacks a separator"
  - id: IN-06
    severity: info
    disposition: fixed
    title: "the spec says an inherited field is not compared, but the tests pin that only for its non-enumerable and symbol-keyed siblings"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "BEH-QD-700 named the derived stores by position"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "\"each parent is released\" was observed for one parent"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "BEH-QD-700 carried ordinal history in current-tense text"
  - id: WR-05
    severity: warning
    disposition: fixed
    title: "the store-list test and INV-QD-390 overclaimed"
  - id: IN-07
    severity: info
    disposition: fixed
    title: "characterisation title"
open: 0
total: 12
recorded: 2026-11-22T22:01:47.623Z
---

# Phase 72: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 72-REVIEW-FIX.md |
| IN-01 | info | fixed | 72-REVIEW-FIX.md |
| IN-02 | info | fixed | 72-REVIEW-FIX.md (its entry is titled "…written three times"; commits 537ab31d, 1754eda3 move `oneReading` into `dockModelFixtures.ts`) |
| IN-03 | info | fixed | 72-REVIEW-FIX.md |
| IN-04 | info | fixed | 72-REVIEW-FIX.md |
| IN-05 | info | fixed | 72-REVIEW-FIX.md |
| IN-06 | info | fixed | 72-REVIEW-FIX.md |
| WR-02 | warning | fixed | 72-REVIEW-FIX.iter1.md (not in the current review) |
| WR-03 | warning | fixed | 72-REVIEW-FIX.iter1.md (not in the current review) |
| WR-04 | warning | fixed | 72-REVIEW-FIX.iter1.md (not in the current review) |
| WR-05 | warning | fixed | 72-REVIEW-FIX.iter1.md (not in the current review) |
| IN-07 | info | fixed | 72-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

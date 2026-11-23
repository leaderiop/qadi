---
phase: 70
review: 70-REVIEW.md
titles: json
findings:
  - id: IN-01
    severity: info
    disposition: fixed
    title: "ADR-QD-183's last Consequences bullet is one 216-column line"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "The ADR-QD-183 row of the traceability table links INV-QD-045 twice"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "The `HydrationDropEvents.test.ts` traceability row still says \"written on the phase base\""
  - id: IN-04
    severity: info
    disposition: fixed
    title: "The `HydrationBuckets.ts` header claims more than the module does"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "The `PAYLOAD_PRODUCERS` doc comment reads as contradicting itself"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "INV-QD-385 and INV-QD-045 still say a reason \"with no source does not compile\""
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "`entries` is shadowed in both planners' event callbacks"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "The spec says every kind is a compile error \"until produced and reported\""
open: 0
total: 8
recorded: 2026-11-22T13:58:32.940Z
---

# Phase 70: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | fixed | 70-REVIEW-FIX.md |
| IN-02 | info | fixed | 70-REVIEW-FIX.md |
| IN-03 | info | fixed | 70-REVIEW-FIX.md |
| IN-04 | info | fixed | 70-REVIEW-FIX.md |
| IN-05 | info | fixed | 70-REVIEW-FIX.md |
| WR-01 | warning | fixed | 70-REVIEW-FIX.iter2.md (not in the current review) |
| WR-02 | warning | fixed | 70-REVIEW-FIX.iter1.md (not in the current review) |
| WR-03 | warning | fixed | 70-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

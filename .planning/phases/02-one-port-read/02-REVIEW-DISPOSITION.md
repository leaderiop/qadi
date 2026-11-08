---
phase: 02
review: 02-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "`disclose` and `pose` run outside the defect mapping, so a served read can die and `answerRemotely`'s \"never fails\" no longer holds"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "the pre-validation question is still written by hand in three reads, a second statement of the projection"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "\"over-keying can only miss and deny, never replay a stale allow\" is false for a negated `hasSignature`"
  - id: IN-01
    severity: info
    disposition: open
    title: "`SignatureLedgerTest.ts` and `SignatureLedger.ts` doc comments contradict the new key"
  - id: IN-02
    severity: info
    disposition: open
    title: "stale `ADR-QD-NEXT` / `INV-QD-NEXT` placeholders in touched files"
  - id: IN-03
    severity: info
    disposition: open
    title: "`PortSpan.ts` says `O` \"is the same type for all five ports\""
  - id: IN-04
    severity: info
    disposition: open
    title: "no unit test for the ledger deviation"
  - id: IN-05
    severity: info
    disposition: open
    title: "version skew and the wire's strict decode are documented only in the changeset"
open: 5
total: 8
recorded: 2026-11-08T03:07:01.261Z
---

# Phase 02: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 02-REVIEW-FIX.md |
| WR-02 | warning | fixed | 02-REVIEW-FIX.md |
| WR-03 | warning | fixed | 02-REVIEW-FIX.md |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |
| IN-05 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

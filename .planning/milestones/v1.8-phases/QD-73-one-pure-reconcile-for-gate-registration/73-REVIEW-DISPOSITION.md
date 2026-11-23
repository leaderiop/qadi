---
phase: 73
review: 73-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "Necessity: `guardTrees`, `listed` and `snapshotOf` sit in shared support with one consumer each, under a header that says every file shares them"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "A comment in the type pins says \"any more\" and \"the one it had\""
  - id: IN-02
    severity: info
    disposition: fixed
    title: "`useGateRegistrations` doc comment says \"tells what it keeps its state\""
  - id: IN-03
    severity: info
    disposition: fixed
    title: "The characterisation header prescribes a commit process, and `GateWriter.reconcile.test.ts`'s header has a grammar slip"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "Two spec details name a thing the reader cannot find"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "ADR-QD-186 said the behaviours enforce what only review keeps"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "`support/gates.ts` header said its helpers are for tests that need no rendering"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "test title contradicted its expectation"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "traceability row attributed the reconcile-rule note to BEH-QD-704"
  - id: IN-06
    severity: info
    disposition: fixed
    title: "characterisation header, row placement, overlapping reconcile tests"
open: 0
total: 10
recorded: 2026-11-23T02:08:24.628Z
---

# Phase 73: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 73-REVIEW-FIX.md (ba548dfc, 25351205; retitled in the past tense there, reconciled by hand) |
| IN-01 | info | fixed | 73-REVIEW-FIX.md (11a3b63c; retitled in the past tense there, reconciled by hand) |
| IN-02 | info | fixed | 73-REVIEW-FIX.md (edaa89b4; retitled in the past tense there, reconciled by hand) |
| IN-03 | info | fixed | 73-REVIEW-FIX.md (2e8e7947, 3feae24a; retitled in the past tense there, reconciled by hand) |
| IN-04 | info | fixed | 73-REVIEW-FIX.md (fec1ddc9; retitled there, reconciled by hand) |
| WR-02 | warning | fixed | 73-REVIEW-FIX.iter2.md (not in the current review) |
| WR-03 | warning | fixed | 73-REVIEW-FIX.iter2.md (not in the current review) |
| WR-04 | warning | fixed | 73-REVIEW-FIX.iter1.md (not in the current review) |
| IN-05 | info | fixed | 73-REVIEW-FIX.iter1.md (not in the current review) |
| IN-06 | info | fixed | 73-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

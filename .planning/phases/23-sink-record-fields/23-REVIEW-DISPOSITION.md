---
phase: 23
review: 23-REVIEW.md
titles: json
findings:
  - id: IN-04
    severity: info
    disposition: open
    title: "Stale \"today's\" wording in `SinkRecord.tst.ts` test titles"
  - id: IN-05
    severity: info
    disposition: open
    title: "Bench header's first bullet contradicts the paragraph added in IN-02"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "The \"undeclared field is refused\" type test proves nothing about the shared struct"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "`SinkRecord.tst.ts` header contradicts the file's own content and is stale"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "Cosmetic wrapping and whitespace left in `SinkWire.ts` and `SinkCodec.ts`"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "`SinkRecord.bench.ts` restates the field list the phase exists to state once"
open: 2
total: 6
recorded: 2026-11-11T05:39:49.836Z
---

# Phase 23: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-04 | info | open | - |
| IN-05 | info | open | - |
| WR-01 | warning | fixed | 23-REVIEW-FIX.md (not in the current review) |
| IN-01 | info | fixed | 23-REVIEW-FIX.md (not in the current review) |
| IN-03 | info | fixed | 23-REVIEW-FIX.md (not in the current review) |
| IN-02 | info | fixed | 23-REVIEW-FIX.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

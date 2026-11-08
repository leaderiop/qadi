---
phase: 03
review: 03-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "Writer accepts sequence numbers the reader refuses, so \"reader accepts every bundle the writer writes\" (BEH-QD-254, ADR-QD-110) is false"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "Stale test commentary left behind by the refactor"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "ADR-QD-110 mutation and \"97 killed / 1 survivor\" claim is not reproducible from the changed files"
open: 0
total: 3
recorded: 2026-11-08T04:16:41.550Z
---

# Phase 03: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | ba6e377 (writer fails SequenceNumberInvalid), ccafcb8 (spec) |
| IN-01 | info | fixed | ba6e377 |
| IN-02 | info | fixed | ccafcb8 (ADR-QD-110 cites the Stryker command; re-run 117 killed / 1 survived) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

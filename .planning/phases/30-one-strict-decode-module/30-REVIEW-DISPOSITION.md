---
phase: 30
review: 30-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "`NotJson` text carries a `SyntaxError:` prefix; docs and the changeset call it the parser's own message"
  - id: WR-02
    severity: warning
    disposition: open
    title: "Plan-local decision and plan numbers are baked into shipped doc comments and test titles"
  - id: WR-03
    severity: warning
    disposition: open
    title: "The `PortSpanEncode.ts` budget exemption rests on a provenance claim that does not hold; its real reason is unstated"
  - id: IN-01
    severity: info
    disposition: open
    title: "`unwalked` is documented as \"must be `Schema.Unknown`\", but two of three seams use `Schema.Array(Schema.Unknown)`; the check is compile-time over the decoded type"
  - id: IN-02
    severity: info
    disposition: open
    title: "`decodeStoredRecordString` is still a hand-assembled `JSON.parse` seam, invisible to `[untrusted-decode]`"
  - id: IN-03
    severity: info
    disposition: open
    title: "Closure-returning `Match` arms in `HydrationEngine.ts` are harder to read than what they replace"
  - id: IN-04
    severity: info
    disposition: open
    title: "Three copies of the plain-object predicate; a long history comment on the guard"
open: 7
total: 7
recorded: 2026-11-12T05:00:31.490Z
---

# Phase 30: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| WR-03 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

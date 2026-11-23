---
phase: 75
review: 75-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "`logAnnotations`'s doc comment says a log event cannot reach a span through it, but its output annotates a span with no error"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "The 75-07 and 75-08 summaries still state the superseded close and cost as current, with nothing marking them superseded"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "`decideSubjectsStream` keeps a block body whose only statement is `return`, left over from a removed local"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "ADR-QD-188's cost section says the rewiring \"adds a call frame to each annotation\", which is not what changed on the evaluate path"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "`EXAMINED`'s comment names the wrong static arrow in `Predicate.ts`"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "AGENTS.md §6 does not name the `paramsOf` pin form that `EvaluationSpan.tst.ts` introduces"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "The two rows added in `24ca9e2a` are cited by no spec text"
  - id: IN-06
    severity: info
    disposition: fixed
    title: "Lines the phase wrote past the file's wrap width"
  - id: IN-07
    severity: info
    disposition: fixed
    title: "`Params` was written inline twice in `EvaluationSpan.tst.ts`"
  - id: IN-08
    severity: info
    disposition: fixed
    title: "the contract check collapsed whitespace inside string literals"
  - id: IN-09
    severity: info
    disposition: fixed
    title: "the recorded cost predates the code-review rewiring"
  - id: IN-10
    severity: info
    disposition: fixed
    title: "`[span-key-literal]`'s title exemption also exempted method calls"
  - id: IN-11
    severity: info
    disposition: fixed
    title: "current-tense spec narrated the old behaviour, and BEH-QD-712's title was unscoped"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "The asked projection is restated in three writers"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "`[span-key-literal]` / `[span-key-source]` scope gaps and narrow key extraction"
  - id: WR-05
    severity: warning
    disposition: fixed
    title: "ADR-QD-188 states in current tense two things its revision 1.1 has done"
  - id: WR-06
    severity: warning
    disposition: fixed
    title: "BEH-QD-714 attributes `qadi.decideSubject` to `EvaluationSpan.ts`"
open: 0
total: 17
recorded: 2026-11-23T11:42:47.414Z
---

# Phase 75: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 75-REVIEW-FIX.md |
| WR-02 | warning | fixed | 75-REVIEW-FIX.md |
| IN-01 | info | fixed | 75-REVIEW-FIX.md |
| IN-02 | info | fixed | 75-REVIEW-FIX.md |
| IN-03 | info | fixed | 75-REVIEW-FIX.md |
| IN-04 | info | fixed | 75-REVIEW-FIX.md |
| IN-05 | info | fixed | 75-REVIEW-FIX.md |
| IN-06 | info | fixed | 75-REVIEW-FIX.md |
| IN-07 | info | fixed | 75-REVIEW-FIX.iter2.md (not in the current review) |
| IN-08 | info | fixed | 75-REVIEW-FIX.iter2.md (not in the current review) |
| IN-09 | info | fixed | 75-REVIEW-FIX.iter2.md (not in the current review) |
| IN-10 | info | fixed | 75-REVIEW-FIX.iter2.md (not in the current review) |
| IN-11 | info | fixed | 75-REVIEW-FIX.iter2.md (not in the current review) |
| WR-03 | warning | fixed | 75-REVIEW-FIX.iter1.md (not in the current review) |
| WR-04 | warning | fixed | 75-REVIEW-FIX.iter1.md (not in the current review) |
| WR-05 | warning | fixed | 75-REVIEW-FIX.iter1.md (not in the current review) |
| WR-06 | warning | fixed | 75-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

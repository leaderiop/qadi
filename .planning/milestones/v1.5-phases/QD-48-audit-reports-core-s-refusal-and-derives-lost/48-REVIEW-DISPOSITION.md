---
phase: 48
review: 48-REVIEW.md
titles: json
findings:
  - id: WR-01
    iteration: 1
    severity: warning
    disposition: fixed
    title: "The 0.13 upgrade entry tells users to log the sentence that INV-QD-104 keeps out of logs"
  - id: IN-01
    iteration: 1
    severity: info
    disposition: fixed
    title: "Refusal dispatch still happens twice, and the `\"encodeRefusal\"` marker is no longer read by `emit`"
  - id: IN-02
    iteration: 1
    severity: info
    disposition: fixed
    title: "The message wording still restates lost-ness outside the row"
  - id: IN-03
    iteration: 1
    severity: info
    disposition: fixed
    title: "ADR-QD-161 still says the behaviours and invariants are \"named, not linked\""
  - id: IN-04
    iteration: 1
    severity: info
    disposition: fixed
    title: "INV-QD-341's scope sentence literally includes `Refused`"
  - id: IN-05
    iteration: 1
    severity: info
    disposition: fixed
    title: "`AuditWriteOutput.test.ts` asserts that no refusal arrived when no hook is installed, so it cannot fail"
  - id: IN-06
    iteration: 1
    severity: info
    disposition: fixed
    title: "The leaf lists the tests loop over are not checked for completeness"
  - id: IN-07
    iteration: 1
    severity: info
    disposition: fixed
    title: "`StageResult`'s doc comment does not cite ADR-QD-161 (known, accepted)"
  - id: IN-08
    iteration: 1
    severity: info
    disposition: fixed
    title: "`durability(...)` wraps a value that is already typed `Durability`"
  - id: WR-01
    iteration: 2
    severity: warning
    disposition: fixed
    title: "The base characterisation no longer pins the default configuration's output for ten of the eleven leaves"
  - id: IN-01
    iteration: 2
    severity: info
    disposition: fixed
    title: "The tests still narrow `report.log` with `typeof … === \"object\"`, which only the removed marker needed"
  - id: IN-02
    iteration: 2
    severity: info
    disposition: fixed
    title: "`durabilityOf`'s doc comment names the row's readers without the wording IN-02 added"
  - id: IN-03
    iteration: 2
    severity: info
    disposition: fixed
    title: "The upgrade prose says the annotations carry \"nothing else from the refused record\", but the path is the record's own keys"
  - id: IN-01
    iteration: 3
    severity: info
    disposition: fixed
    title: "The CCR-QD-439 row says the two characterisation files \"stay unedited across the phase\", and its file list omits `AuditWriteExits.test.ts`"
  - id: IN-02
    iteration: 3
    severity: info
    disposition: fixed
    title: "The overview's `durabilityOf` row still names the line's level, not its wording, as a reader of the row"
  - id: IN-03
    iteration: 3
    severity: info
    disposition: fixed
    title: "INV-QD-342 cites as enforcement a hook-payload assertion that cannot tell core's class from the removed one"
open: 0
---

# Phase 48: Code Review Disposition

Three review iterations (`48-REVIEW.iter1.md`, `iter2`, `iter3`; `48-REVIEW.md` is iteration 3). Ids restart per iteration, so each row carries its iteration. Every finding was fixed in the matching `48-REVIEW-FIX.iter<N>.md` commits; none is open, deferred or accepted.

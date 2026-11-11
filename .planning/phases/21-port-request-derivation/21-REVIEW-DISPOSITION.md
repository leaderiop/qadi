---
phase: 21
review: 21-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "Test comment and `key` doc claim absent and `undefined` optional members are told apart; they collide"
  - id: WR-02
    severity: warning
    disposition: open
    title: "A derived `key` can throw, contradicting \"a getter or proxy trap that throws is refused, never thrown\""
  - id: IN-01
    severity: info
    disposition: open
    title: "The key law test is tautological with the implementation"
  - id: IN-02
    severity: info
    disposition: open
    title: "`portWire` no longer ties the encoded value to the question type"
  - id: IN-03
    severity: info
    disposition: open
    title: "Duplicate \"full\" and \"sparse\" rows in the span-question test"
  - id: IN-04
    severity: info
    disposition: open
    title: "Lines well past the hand-wrap width"
---

# Phase 21 — review disposition

One row per finding in `21-REVIEW.md`. Every finding starts `open`; a fix or a reasoned
won't-fix changes its row. Both warnings predate the phase (the hand-written tuple keys had
the same collision and the same out-of-walk property read) but are now stated in docs and
code the phase wrote, so they are this phase's to close or record.

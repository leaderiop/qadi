---
phase: 21
review: 21-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "Test comment and `key` doc claim absent and `undefined` optional members are told apart; they collide"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "A derived `key` can throw, contradicting \"a getter or proxy trap that throws is refused, never thrown\""
  - id: IN-01
    severity: info
    disposition: fixed
    title: "The key law test is tautological with the implementation"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "`portWire` no longer ties the encoded value to the question type"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "Duplicate \"full\" and \"sparse\" rows in the span-question test"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "Lines well past the hand-wrap width"
---

# Phase 21 — review disposition

One row per finding in `21-REVIEW.md`. Every finding starts `open`; a fix or a reasoned
won't-fix changes its row. Both warnings predate the phase (the hand-written tuple keys had
the same collision and the same out-of-walk property read) but are now stated in docs and
code the phase wrote, so they are this phase's to close or record.

## Fixes (2026-11-11, `21-REVIEW-FIX.md`, `--fix --all`, iteration 1)

- **WR-01 → fixed** (`f0977945`): docs state the real law (same wire question; absent equals stated `undefined`), pinned by a test. Spec already stated it correctly.
- **WR-02 → fixed** (`1d1b7a44`, `7144dfba`): a derived `key` reads its question inside `Result.try` and refuses with `KeyRefusal.Unreadable` instead of throwing; throwing-getter test. Needs human verification.
- **IN-01 → fixed** (`0dc2f228`): hand-written question oracle per derived port.
- **IN-02 → fixed** (`9d131cfa`): comment that the strict schema is the check.
- **IN-03 → fixed** (`44024836`): no duplicate sparse span rows.
- **IN-04 → fixed** (`f9e9511c`): long lines hand-wrapped.

---
phase: 55
review: 55-REVIEW.md
titles: json
findings:
  - id: WR-01
    iteration: 1
    severity: warning
    disposition: fixed
    commit: 6eb2522c
    title: "`PortCards.tst.ts` per-port record pins credit a misspelling they cannot detect"
  - id: IN-01
    iteration: 2
    severity: info
    disposition: skipped
    title: "`ServicesPanel.reading.test.tsx` header still says the file \"stays unchanged\""
  - id: IN-02
    iteration: 2
    severity: info
    disposition: skipped
    title: "M54's title and BEH-QD-615's \"notifies twice\" claim exceed what is asserted"
  - id: IN-03
    iteration: 2
    severity: info
    disposition: skipped
    title: "`reservice` runs `portCards` unguarded inside an unguarded listener loop"
open: 0
---

# Phase 55: Code Review Disposition

There were two review iterations at standard depth over 23 files.
- **Iteration 1:** 0 critical, 1 warning, 3 info.
- **Iteration 2:** 0 critical, 0 warning, 3 info.

`--fix --auto` without `--all` stopped once nothing was left in fix scope.

**WR-01 fixed (6eb2522c).** Two assertions in `PortCards.tst.ts` (`Omit<…> & { misspelt }`) failed only because a real key was missing. Their misspelling half could never fail. They were replaced as follows:
- `not.toHaveProperty("<misspelt>")` replaces each one;
- `not.toBeAssignableFrom<Partial<ActivityByPort>>()` and its `CallsByPort` twin name "every port present".

The two `keyof … toBe<PortName>` pins, kept, are what make a misspelt port a compile error, as INV-QD-355 states. The fixer's scratch file failed each new pin, 3 of 3. The real file passes with 11 assertions. Iteration 2 judged the pins sound and complete.

**IN-01..03 skipped, out of fix scope (info).**
- **IN-01:** a stale sentence in a test header.
- **IN-02:** M54's title and BEH-QD-615's "notifies twice" claim more than the test asserts. Off→Live passes through `Starting`, and no test counts notifications. This is the accepted M54 deviation recorded in ADR-QD-168.
- **IN-03:** typed callers cannot reach a throw from `portCards`.

All three are deferred to the next change that touches these files. No `packages/*/src` commit followed the 55-06 mutation after-run, so `55-mutation-after.json` still describes the source that ships.

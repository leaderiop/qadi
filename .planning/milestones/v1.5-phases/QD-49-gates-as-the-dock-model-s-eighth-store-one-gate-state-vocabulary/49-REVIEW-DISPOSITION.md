---
phase: 49
review: 49-REVIEW.md
titles: json
findings:
  - id: WR-01
    iteration: 1
    severity: warning
    disposition: fixed
    title: "A throwing registry stops the model's updates silently, and ADR-QD-162 §5's rationale does not hold for `@qadi/react`'s own registry"
  - id: WR-02
    iteration: 1
    severity: warning
    disposition: fixed
    title: "`spec/appendices/react-integration.md` still says `useDevtoolsFeed()` returns the list"
  - id: IN-01
    iteration: 1
    severity: info
    disposition: fixed
    title: "INV-QD-343/344 cite phase SUMMARY negative controls as enforcement"
  - id: IN-02
    iteration: 1
    severity: info
    disposition: fixed
    title: "`configure` after close still polls the new registry"
  - id: IN-03
    iteration: 1
    severity: info
    disposition: fixed
    title: "`GatesView.Listed` carries `instances`, which duplicates `QuestionsSnapshot.instances`"
  - id: IN-04
    iteration: 1
    severity: info
    disposition: fixed
    title: "Panel tests build their input with the code under change"
  - id: WR-01
    iteration: 2
    severity: warning
    disposition: fixed
    title: "A throwing unsubscribe leaves `configure` half-applied and the model stuck, which the ADR and fix report say cannot happen"
  - id: IN-01
    iteration: 2
    severity: info
    disposition: fixed
    title: "The header comments in `DiagnosticsFeed.ts` and `DiagnosticsStore.ts` still say gates \"stay a plain prop\""
  - id: IN-02
    iteration: 2
    severity: info
    disposition: fixed
    title: "The failure reason carries the throw's stack, so the \"same reason publishes nothing\" dedup depends on the call path"
  - id: IN-03
    iteration: 2
    severity: info
    disposition: fixed
    title: "Failed is left in place in two cases the spec does not say: the same registry mends silently, or its `subscribe` starts working"
  - id: IN-01
    iteration: 3
    severity: info
    disposition: fixed
    title: "`reasonOf` is the one step inside the guard that can still throw"
  - id: IN-02
    iteration: 3
    severity: info
    disposition: fixed
    title: "A failed release is stated with copy that says the registry \"threw when it was read\", and it stays `Failed` while the new registry works"
  - id: IN-03
    iteration: 3
    severity: info
    disposition: fixed
    title: "A watch failure is not compared by name and message, so a retry on another call path can publish an identical failure"
  - id: IN-04
    iteration: 3
    severity: info
    disposition: fixed
    title: "The `instanceof Error` branch of `failureKey` is not tested, and the mutation tool cannot see that"
  - id: IN-05
    iteration: 3
    severity: info
    disposition: fixed
    title: "`configure` reads and publishes with the old registry before it swaps in the new one"
  - id: IN-06
    iteration: 3
    severity: info
    disposition: fixed
    title: "Spec text did not follow iteration 2 in INV-QD-343, and BEH-QD-584's first requirement overreaches"
open: 0
---

# Phase 49: Code Review Disposition

Three review iterations (`49-REVIEW.iter1.md`, `iter2`, `iter3`; `49-REVIEW.md` is iteration 3). Ids restart per iteration, so each row carries its iteration. Every finding was fixed in the matching `49-REVIEW-FIX.iter<N>.md` commits (iteration 1: `459ac79d..da14a9c5`; iteration 2: `8aceb349..f0e8ee6c`; iteration 3: `91db923b..365b82a8`); none is open, deferred or accepted. The cap of three iterations was reached with no critical or warning finding left in iteration 3.

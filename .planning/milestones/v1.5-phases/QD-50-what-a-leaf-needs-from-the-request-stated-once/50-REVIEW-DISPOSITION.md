---
phase: 50
review: 50-REVIEW.md
titles: json
findings:
  - id: WR-01
    iteration: 1
    severity: warning
    disposition: fixed
    title: "A mis-specified `LeafNeeds` row is accepted by the compiler and fails open"
  - id: WR-02
    iteration: 1
    severity: warning
    disposition: fixed
    title: "`ab.sh` does not stop on INT/TERM; it reverts, then carries on benching"
  - id: WR-03
    iteration: 1
    severity: warning
    disposition: fixed
    title: "BEH-QD-586 and INV-QD-346 state a `HasAttribute` outcome the code does not give"
  - id: IN-01
    iteration: 1
    severity: info
    disposition: fixed
    title: "ADR-QD-163's Context misdescribes the base's errors"
  - id: IN-02
    iteration: 1
    severity: info
    disposition: fixed
    title: "`LeafNeeds.test.ts`'s header is stale"
  - id: IN-03
    iteration: 1
    severity: info
    disposition: fixed
    title: "The agreement property and the `HasAction` deny sentence are thinner than BEH-QD-586/589 claim"
  - id: IN-04
    iteration: 1
    severity: info
    disposition: fixed
    title: "The leaf-heavy workloads never read the references they are described as measuring"
  - id: IN-05
    iteration: 1
    severity: info
    disposition: skipped
    title: "`LeafNeed.resourceId` has no reader in source"
  - id: WR-01
    iteration: 2
    severity: warning
    disposition: fixed
    title: "`LeafNeedOf`'s `own` is derived from two hard-coded tag names, not from the variant, so the guarantee the spec states does not hold for a new leaf"
  - id: WR-02
    iteration: 2
    severity: warning
    disposition: fixed
    title: "`ab.sh` can leave the prototype applied when a signal lands during `git apply`, and a signal during a failing revert loses the message"
  - id: IN-01
    iteration: 2
    severity: info
    disposition: fixed
    title: "A comment the ADR calls inaccurate is left in the committed bench file"
  - id: IN-02
    iteration: 2
    severity: info
    disposition: fixed
    title: "Two names say \"every row is its leaf's\", but `resourceId` is not tied to the leaf at compile time"
  - id: IN-01
    iteration: 3
    severity: info
    disposition: fixed
    title: "A tag listed in two classification lists silently takes the first, and nothing checks the lists are disjoint"
open: 0
---

# Phase 50: Code Review Disposition

Three review iterations (`50-REVIEW.iter1.md`, `iter2`, `iter3`; `50-REVIEW.md` is iteration 3). Ids restart per iteration, so each row carries its iteration. Every finding but one was fixed in the matching `50-REVIEW-FIX.iter<N>.md` commits (iteration 1: `d9ef8c34..3c545f18`; iteration 2: `af9a3d89`, `95608c8e`, `c20e7cf3`, `c6760496`; iteration 3: `d85df984`). Iteration 1's IN-05 (`LeafNeed.resourceId` has no reader in source) is `skipped` with no change needed: D-06 requires the table to state the resource-id need while `readScoped` stays the enforcement point, and the D-06 test ties the column to `readScoped`'s behaviour; iteration 2's IN-02 later constrained the column at compile time. None is open or deferred. The cap of three iterations was reached with no critical or warning finding left in iteration 3. No fix changed the runtime of `absenceOf` or any bench workload, so the committed measurements (50-BENCH.md, ADR-QD-163) stand; `LeafNeeds.ts` mutation held at 98.11% after each iteration.

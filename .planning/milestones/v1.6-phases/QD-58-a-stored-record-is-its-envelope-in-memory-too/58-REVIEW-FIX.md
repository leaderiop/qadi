---
phase: QD-58-a-stored-record-is-its-envelope-in-memory-too
fixed_at: 2026-11-19T00:00:00Z
review_path: .planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 58: Code Review Fix Report

The review found 0 critical and 0 warning issues, so `--fix`'s default scope was empty. The orchestrator applied the three Info items anyway, as comment and doc changes only, because one of them (IN-03) is a missing public contract. Fix commit: 22d6fcf7, with one line reverted in the follow-up commit after it.

| ID | Applied | Not applied, and why |
|----|---------|----------------------|
| IN-01 | `DecisionLog.ts` module doc re-wrapped; the envelope is its own sentence | — |
| IN-02 | `QadiAtoms.test.ts` comment reworded and wrapped | The `Source.test.ts` title stays "never stamped": a title is a string, not a comment, and the review round keeps its code changes to comment lines (below). The three over-width code lines (`DecisionLog.ts:215`, `SinkCodec.ts:616`, the decision-log step) stay as they are: re-wrapping a mutated line changes the line text the D-16 mutant ids key on |
| IN-03 | `DecisionLogShape.ingest` now says a defect there is not contained: a record reaching the log through its `layer` passes the sink emitter, while one handed to `ingest` comes from the host's receive handler with no emitter in front (`examples/nextjs-newsroom/src/server/api.ts:156`, ADR-QD-171). The reviewer's suggested wording said the forwarding receiver goes through the emitter; that is false, and was not used | `StoredEnvelope.test.ts`'s header and the "RED on the base" title stay: it is a pinned characterisation file, edited only by `test(58-02)` |

**Mutation.** The three scoped Stryker runs were re-done on the fixed tree, one at a time. `58-mutation-after.json` came out byte-identical, and `compare` prints `WX-05 holds (D-16)`.

**Scan rule.** `58-scan.mjs`'s "the evidence follows the last code commit" rule now accepts a later code commit only when every changed line under `src`, tests and `features` is a comment line. Such a change cannot add a mutant or change a kill. This is an orchestrator-authorised edit, recorded beside the rule. The scan prints `phase scan clean`.

**Tests run on the fixed tree:** `DecisionLog.test.ts` 29/29, `Source.test.ts` 44/44, `QadiAtoms.test.ts` 35/35; oxlint is clean on the touched files.

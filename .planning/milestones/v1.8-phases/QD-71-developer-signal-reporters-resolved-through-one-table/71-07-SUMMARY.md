---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
plan: 07
subsystem: spec-invariants-behaviours-traceability
tags: [inv-qd-387, inv-qd-388, beh-qd-691, beh-qd-695, spec-revise, traceability]
phase_base: d147287a94a3bb3cad176e4f99bad7a0b76d8939
requires: ["71-06"]
provides:
  - "spec/invariants.md (Revision 1.174): INV-QD-387 (one row per developer signal, one resolver, a throw named by the option the caller passed) and INV-QD-388 (the production-instrumentation latch is the one module-scope mutable state)"
  - "spec/behaviors/09-react.md (3.11): BEH-QD-691, BEH-QD-693, BEH-QD-694; spec/behaviors/28-devtools-screens.md (1.40): BEH-QD-692; spec/behaviors/19-hydration.md (1.28): BEH-QD-695 and the one stale resolver sentence corrected"
  - "spec/traceability.md (Revision 1.246): section 2 rows for both invariants, ADR-QD-184's section 3 row linking them, section 1 ids, section 4 rows for DeveloperSignalReporters.test.tsx and DeveloperSignals.tst.ts and three updated rows"
affects: [71-08]
tech-stack:
  added: []
  patterns: ["an Enforcement paragraph that separates what the compiler refuses (each with its pin's exact title) from what only a run-time test holds"]
key-files:
  created: []
  modified:
    - spec/invariants.md
    - spec/traceability.md
    - spec/behaviors/09-react.md
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/19-hydration.md
key-decisions:
  - "Decided autonomously: INV-QD-387's Enforcement and BEH-QD-691 and BEH-QD-695 say outright that no type checks when an entry point resolves, a row's condition, a default's sentence or that an entry point passes its own name, and name the test that holds each, so a later refactor cannot read the compiler as the guard."
  - "Decided autonomously: INV-QD-388 states only what the budget enforces (exactly one module-scope let or var, read and set only by the once-per-process wrapper) and keeps the budget's line-start reading as a stated limit in its Implication, rather than claiming no module binding is ever rebound."
  - "Decided autonomously: the invariants do not link forward to BEH-QD-691 to 695. The plan commits invariants.md at 1.174 before the behaviours exist, so the behaviours link back to the invariants and traceability sections 1 and 2 carry both directions."
patterns-established:
  - "The CCR row cites every final revision of the phase, and the last spec plan re-checks each against its document header."
requirements-completed: []
duration: 25 min
completed: 2026-11-22
status: complete
commits: 2
plan_head_before: c039e7704cb43d555ded5564a032e501bf244a53
plan_head_after: 35a468b147ea1138e8207aa23e02248bbf35db45
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
---

# Phase 71 Plan 07: INV-QD-387, INV-QD-388 and BEH-QD-691 to BEH-QD-695, traced Summary

The developer-signal rules are now invariants and behaviours: one row per signal and one resolver (INV-QD-387), one budgeted latch (INV-QD-388), and five observable behaviours across three documents, each traced to the test that pins it, with every revision the CCR-QD-463 row cites matching its document header.

## Accomplishments

- Task 1 (tracer): INV-QD-387 and INV-QD-388 appended with Source, Implication, Enforcement and Related; section 2 rows for both; ADR-QD-184's section 3 row links both. invariants 1.173 -> 1.174, traceability 1.244 -> 1.245. The Enforcement of INV-QD-387 quotes the six `DeveloperSignals.tst.ts` pin titles, the two table-describe titles, the collision-reporter describe and the characterisation, and says what no type checks.
- Task 2: BEH-QD-691, 693 and 694 in `09-react.md` (3.11), BEH-QD-692 at the end of `28-devtools-screens.md` (1.40), BEH-QD-695 in `19-hydration.md` (1.28), each with an Invariant line, the ADR-QD-184 See line, one REQUIREMENT fence and prose naming the tests by their titles. `19-hydration.md`'s "Every resolver in `DeveloperSignals.ts`" now reads "The one resolver in `DeveloperSignals.ts`, `reporterFor`, wraps a supplied hook once (ADR-QD-184)". Traceability 1.246: section 1 ids (19's parenthetical notes CCR-QD-463), rows for the two new test files, and `DeveloperSignals.test.ts`, `GateRegistry.store.test.ts` and `QadiProvider.production.test.tsx` updated.
- Every revision the CCR-QD-463 row cites equals its document header (ADR-QD-184 1.0, ADR-QD-041 1.6, ADR-QD-052 1.5, `09-react.md` 3.11, `28-devtools-screens.md` 1.40, `19-hydration.md` 1.28, invariants 1.174, house-rules-evidence 1.4, traceability 1.246, README 1.286); the row needed no edit. No TypeScript fence added, no id placeholder, `next-id.mjs` not run.

## Verification

- Task 1 verify (extracted verbatim from the plan, run after the commit): exit 0, `INV-QD-387 and INV-QD-388 are stated and traced`. It includes strict traceability (`PASS: 21   FAIL: 0   SKIP: 0`, `all 160 invariant(s) traced`) and `spec-revise --check` clean.
- Task 2 verify (verbatim): every check up to the commit-contents comparison passed, including the section 1 and 4 rows, the per-document Revision check against the CCR-QD-463 row, strict traceability (21 passed, `all 160 invariant(s) traced`, `312 file(s) exist`, `141 ADR(s) traced`), `spec-revise --check` and `doc-examples: 118 block(s) compile`. The commit-contents comparison then failed on its own expectation: see Deviations.

## Deviations from Plan

None to the work. One verification-only deviation: Task 2's verify compares the commit's sorted file list with `"$R19 $R28 $R9 $X "`, but `LC_ALL=C sort` puts `09-react.md` before `19-hydration.md`, so the expected string can never match. I ran the three remaining checks by hand instead: the commit holds exactly `09-react.md`, `19-hydration.md`, `28-devtools-screens.md` and `traceability.md`; its message carries exactly one `Co-Authored-By: Claude Opus 5.5` trailer; `git status --porcelain -- packages spec scripts AGENTS.md .changeset` is empty. Nothing a gate checks was weakened.

## Deferred (out of this plan's scope)

- INV-QD-251's Source ("every resolver wraps a supplied reporter once") and its section 2 row in `spec/traceability.md` still say "every resolver". Correcting them needs invariants 1.175 and a CCR-QD-463 row edit (plus README's own revision, which the row cites), and the plan fixes invariants at 1.174; `19-hydration.md`'s sentence was the one stale claim the plan named. With one resolver the wording is vacuously true rather than wrong, so it is left for 71-08 or the owner to decide.

## Known Stubs

None.

## Threat Flags

None. T-71-18 is held by INV-QD-387's Enforcement, BEH-QD-691 and BEH-QD-695 saying timing and conditions are pinned by named tests, not by the compiler; T-71-19 by strict traceability and the per-document Revision check against the CCR-QD-463 row.

## Commits

- `7e627af1` docs(71-07): INV-QD-387 and INV-QD-388, the developer-signal table and the one latch
- `35a468b1` docs(71-07): BEH-QD-691 to BEH-QD-695 and their traceability

## Self-Check: PASSED

Both commits are ancestors of HEAD, the five spec files carry the cited revisions and the new ids, and the two task verifies ran as recorded above.

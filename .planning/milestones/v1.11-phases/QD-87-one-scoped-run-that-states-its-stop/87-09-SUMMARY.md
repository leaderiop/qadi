---
phase: QD-87-one-scoped-run-that-states-its-stop
plan: 09
subsystem: spec-records
tags: [spec, adr, behaviors, invariants, traceability, stated-run, configure-prologue]

phase_base: 56b9ae4d98ebd1f950369c9830d4a310727895ac
plan_head_before: b3f444ec7fe8ee8556dcdf85e8687c348dee446b
plan_head_after: 548a9fc45bca2586f4b7d5938388c6404e30e0e7

requires:
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: the stated run, the prologue, the session on them, the hook removed (87-01 to 87-08), whose rows the new records pin
provides:
  - ADR-QD-200 (Rev 1.0) with the audit table of the removed hook, its index entry and traceability row, and the CCR-QD-479 row
  - BEH-QD-771 to 775 and INV-QD-419, 420, each with pins that exist or a Source line
  - the restated BEH-QD-461, 507, 519, 521 to 525, 636, 637, 742, 744, 745, INV-QD-313 (retitled), 319, 384, 403, 404, 408 and the overview rows
  - dated amendments on ADR-QD-047, 150, 182, 192, 194, 196 and the doc comments of ThrownMessage.ts
affects: [QD-87 plans 10 and 11 (the mutation record and the close name these records)]

actuals:
  tokens: 60000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "an audit table in the ADR whose every row names the test row that holds the property, read by 87-check.mjs records"

key-files:
  created:
    - spec/decisions/200-one-scoped-run-that-states-its-stop.md
  modified:
    - spec/decisions/index.yaml
    - spec/README.md
    - spec/traceability.md
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/invariants.md
    - spec/overview.md
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/decisions/150-a-scoped-run-that-a-newer-run-supersedes.md
    - spec/decisions/182-one-total-thrown-value-to-text-rule-exported-by-core.md
    - spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md
    - spec/decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md
    - spec/decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md
    - packages/core/src/ThrownMessage.ts

key-decisions:
  - "ADR-QD-200 applies ADR-QD-150 point 2 and records the self-interrupt outcome with the spike's evidence; it does not reopen ADR-QD-150."
  - "ADR-QD-182 decision 11 is amended, not changed: the session and packages/audit/src/AuditWriteReport.ts are named as String sites its list never named; the audit one is a follow-up."
  - "Amendments are `>` notes under the amended point (150, 182, 194, 196), a dated blockquote at the end (047) and a dated Amendment section (192), each document's own form."

requirements-completed: []

coverage:
  - id: S1
    description: "ADR-QD-200 at Rev 1.0 with seven decisions, the audit table (R3, R5, R6, R7, R9, law 5, law 7 each naming the ST row that holds it) followed by `Tests removed: 1.`, the self-interrupt outcome and its evidence, the AuditWriteReport.ts follow-up, its index entry, traceability row and the CCR-QD-479 row"
    requirement: WX-02
    verification:
      - kind: other
        ref: "87-check.mjs records --close; pnpm spec:verify:strict"
        status: pass
    human_judgment: false
  - id: S2
    description: "BEH-QD-771 to 775 and INV-QD-419, 420 written with pins that exist, each with its traceability row; the restated records split an interruption from outside from a run that interrupts itself"
    requirement: STOP-04
    verification:
      - kind: other
        ref: "87-check.mjs records (pinned-by lists name tests and rows that exist); pnpm spec:verify:strict"
        status: pass
    human_judgment: false
  - id: S3
    description: "ADR-QD-047, 150, 182, 192, 194, 196 amended at Rev 1.24, 1.1, 1.2, 1.7, 1.4, 1.4; ThrownMessage.ts differs from phase_base in doc comment lines only"
    requirement: STOP-05
    verification:
      - kind: other
        ref: "87-check.mjs records --close; spec-revise --check; ThrownMessage.test.ts (29 passed); tsc -p tsconfig.test.json"
        status: pass
    human_judgment: false
  - id: S4
    description: "spec:verify:strict, spec:examples, spec:gates, spec:claims, spec:api, scan-ids, scan-forbidden, trailers and the earlier-phase ledger pass; no runnable typescript or tsx fence added"
    requirement: WX-07
    verification:
      - kind: other
        ref: "pnpm spec:verify:strict, spec:examples, spec:gates, spec:claims, spec:api; 87-check.mjs scan-ids, scan-forbidden, trailers; 87-earlier-checks.mjs; 87-pinned-check.mjs --all-applied"
        status: pass
    human_judgment: false

duration: 75min
completed: 2026-11-25
status: complete
---

# Phase 87 Plan 09: The stated run recorded Summary

**ADR-QD-200 with the audit of the removed failure hook, BEH-QD-771 to 775 and INV-QD-419, 420, the restated stop and configure records, and dated amendments on six decisions, so the spec says what the stated run and the prologue do.**

## Performance

- **Duration:** about 75 min
- **Tasks:** 3 (one tracer, two auto)
- **Files:** 1 created, 13 modified

## Accomplishments

- **Tracer, the decision recorded.** `spec/decisions/200-one-scoped-run-that-states-its-stop.md` states seven decisions: the stated run over the unchanged superseding run (applying ADR-QD-150 point 2), the one stop rule with the spike's evidence (an interruption from outside never resumes the forked body; a self-interrupt resumes it current; a natural end after a newer start resumes it not current), the session's shared start and stop, the one prologue, the ordering stated once, the hook's removal with its audit table and `Tests removed: 1.`, and the Simulator's block. The index entry (and the amended statuses of 150, 182, 192, 194), the traceability row (1.332) and the CCR-QD-479 row (README 1.413, naming ARCH-134 and `Unused: none`) are in the same commit (`01bc547f`).
- **Behaviors and invariants.** BEH-QD-771 to 773 are in `28-devtools-screens.md` (1.82) and BEH-QD-774, 775 in `29-devtools-simulator.md` (1.32), each with a pinned-by paragraph whose rows exist; INV-QD-419, 420 in `invariants.md` (1.232) with `**Source**:` lines naming `StatedRun.ts` and `ConfigurePrologue.ts`. BEH-QD-507, 519 and 637 split an interruption from outside (never `Stopped`) from a run that interrupts itself (`Stopped`); BEH-QD-521 to 525, 636, 742, 744 and 745 name the stated run and the prologue in text and pins (R9 and R3's old wording replaced by ST rows); BEH-QD-461 states `Broke.message` as `causeMessage`'s text in a preformatted block; INV-QD-313 is retitled "an interruption from outside" and every link to the old anchor moved; INV-QD-319, 384, 403, 404 and 408 name the new modules; the overview's `TimelineStatus` and `DiagnosticsStatus` rows state the rule. Traceability gains the BEH, INV and seven test-file rows and the restated INV-QD-313, ADR-QD-150 and `SupersedingRun.test.ts` rows (`4a4b0ada`).
- **Amendments.** Dated notes naming ADR-QD-200 on ADR-QD-047 (1.24), 150 (1.1), 182 (1.2, decisions 10 and 11, `AuditWriteReport.ts:273` named and left), 192 (1.7), 194 (1.4) and 196 (1.4); `ThrownMessage.ts`'s two doc paragraphs now name where `String` of a `Cause` stands (the core report sites and `@qadi/audit`'s write report) and that devtools has none, in the same commit (`548a9fc4`).
- **Gates.** `87-check.mjs records --close`, `pnpm spec:verify:strict` (21 pass, 0 fail), `pnpm spec:examples`, `spec:gates`, `spec:claims`, `spec:api`, `spec-revise --check`, `scan-ids`, `scan-forbidden`, `trailers` (27 commits), `87-pinned-check.mjs --all-applied` (122 held, 5 born, 2 of 2 declared edits), `87-earlier-checks.mjs`, tsc on `tsconfig.test.json` and `ThrownMessage.test.ts` (29 tests) all exit 0.

## Deviations from Plan

### Auto-fixed Issues

None.

### Plan defects and interpretations

**1. [Plan defect] The tracer verify's `grep -qx "Tests removed: 1."` needs the line unindented.** The first draft put the line inside the indented item 6 (three spaces), which `87-check.mjs records` accepts (it trims) but the verify's `-x` does not. The line and the paragraph after it were moved to column 0 and the commit amended before the `commit` check ran; the commit is still the one.

**2. Three additional spec places edited beyond the research table.** INV-QD-319's enforcement cited `R1 to R10` including the removed R9 (now `R1 to R8, R10` plus the ST rows); INV-QD-384's Source named `TimelineFeed.ts` and `DiagnosticsFeed.ts` as the `causeMessage` sites, which now delegate to `StatedRun.ts`; BEH-QD-744's sentence "at the three sites that publish and then fork" is now one site, `StatedRun.start`. Each is a sentence the move made false, so it was amended in the same change.

**3. A decision line the plan did not list.** ADR-QD-150's Consequences sentence ("an interruption never reads as `Stopped`") is covered by the note under point 6 (it says the Consequences sentence holds of an interruption from outside) rather than by a second note.

**4. ADR-QD-047 and ADR-QD-196 statuses unchanged.** Their Document Control Status rows were not extended (their earlier 2026-11-25 amendments did not extend them either); the dated note and the Change History entry carry the amendment. ADR-QD-150, 182, 192 and 194 statuses and their index entries were extended and agree.

**5. No changeset added.** The change set touches `packages/core/src/ThrownMessage.ts` comments only; the repository has no changeset from this phase yet, and the plan lists none. A `@qadi/core` doc-only patch changeset (the research names one) is left for the plan that closes the phase.

**6. Phase-relative wording refused by `scan-ids` was reworded three times** ("no longer current" in two re-wrapped lines of BEH-QD-521 and one added line of BEH-QD-523, one in ADR-QD-200, "no longer decides" in ADR-QD-047's note); the pre-existing sentences those lines came from were reworded to "not current".

**Total deviations:** 0 auto-fixed, 1 plan defect (indentation), 5 interpretations. **Impact:** none on scope.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. T-87-21 (a stale spec sentence about interruptions or the hook) is mitigated: every sentence the research listed and the three found while editing are amended, `records --close` checks the reserved records, the moved anchor, the revisions and the ThrownMessage sentence, and `spec:verify:strict` checks the rows and links. T-87-22 (a record number outside the reservation) is mitigated: only ADR-QD-200, CCR-QD-479, BEH-QD-771 to 775, INV-QD-419, 420 and ARCH-134 are used, and `next-id.mjs` was never run.

## Self-Check: PASSED

- Files exist: `spec/decisions/200-one-scoped-run-that-states-its-stop.md` (created), and the 13 modified files above; no `.vitest/` directory; no runnable `typescript` or `tsx` fence added.
- Commits are ancestors of HEAD, each with the one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer: `01bc547f` (ADR, index, traceability, README), `4a4b0ada` (behaviors, invariants, overview, traceability), `548a9fc4` (six amendments and the ThrownMessage doc); `87-check.mjs commit` passed for each with exactly its paths.
- `87-check.mjs records --close` and `87-pinned-check.mjs --all-applied` exit 0 at HEAD.

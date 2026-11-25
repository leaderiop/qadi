---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
plan: 08
subsystem: spec
tags: [adr, decisions, devtools, diagnostics, traceability]
requires:
  - phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
    provides: the rename, the removal, foldReading and the sink (plans 04 to 07), the characterisation (plan 03)
provides:
  - ADR-QD-196 (Accepted) with its index entry and traceability row; dated amendments to ADR-QD-173, ADR-QD-169 and ADR-QD-047
affects: [83-09, 83-10, 83-11]
phase_base: bc02e8e625eed08227910dfdfd4544ae66ed23ca
plan_head_before: 7693106e68201aaac1d64f61a4964a8c548f2870
plan_head_after: d8d9f3dd2464062faf717b6862a42b679aa35385
actuals:
  tokens: 14000
  tasks: 2
  commits: 3
tech-stack:
  added: []
  patterns: [an ADR amended by a dated paragraph with past text kept, each amended ADR linking the new one]
key-files:
  created:
    - spec/decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md
    - spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "ADR-QD-196 records the fold, the one snapshot, the sink and its order, the removal of Diagnostics.questions with its timing argument, the two flips and the rename"
  - "The three amended ADRs keep every past line; each gains a dated amendment and a Related line linking ADR-QD-196"
requirements-completed: []
duration: 25min
completed: 2026-11-25
status: complete
---

# Phase 83 Plan 08: ADR-QD-196 and the three amendments Summary

ADR-QD-196 ("The diagnostics feed folds its reading as a value", Revision 1.0, Accepted) records the change, and ADR-QD-173,
ADR-QD-169 and ADR-QD-047 each lead to it by a dated amendment.

## What was done

- **ADR-QD-196** in ADR-QD-195's shape: seven decisions (the fold and its law; the reading held in the feed's one snapshot; the
  sink; the sink's order; the removal of `Diagnostics.questions` with the timing argument quoting the shown reading's key
  `{ fed: diagnosticsFeed.getSnapshot(), supplied: held.reading }` and the join's `held.reading?.questions`; the two recorded
  flips with before and after text; the rename), a before and after table with a test per row (FC1 to FC11, MR1, MR2, the
  `foldReading` value tests, the sink and field pins, the root refusals), every rejected alternative, the consequences and what
  enforces it. Its claims were checked against `Diagnostics.ts`, `DiagnosticsFeed.ts`, `DockModel.ts` and the test titles at
  HEAD.
- **Indexed and traced** in one commit: `spec/decisions/index.yaml` after ADR-QD-195, the section-3 row in
  `spec/traceability.md`, the CCR-QD-475 row of `spec/README.md`.
- **Amendments**, past text kept (the verify refuses any removed line beyond the revision header): ADR-QD-173 gets a dated
  `## Amendment` (decision 2: the store and its type are removed, `runDiagnostics` takes a `DiagnosticsSink`; decision 3:
  `DiagnosticsOptions` is declared in `Diagnostics.ts`); ADR-QD-169 one for decision 10; ADR-QD-047 a `> **Amended ...**`
  blockquote after its newest amendment. Each links ADR-QD-196 in the amendment and in a new Related line. Each goes through
  `spec-revise` (173 to 1.4, 169 to 1.3, 047 to 1.23). The Status rows were not edited, because the verify forbids removing a line
  beyond the revision header; the Change History and the traceability rows carry the amendment.

## Verification

`node scripts/spec-revise.mjs --check` ok; `bash spec/scripts/verify-traceability.sh --strict` PASS 21, FAIL 0 after each commit;
`node scripts/check-doc-examples.mjs` 119 blocks compile; `83-check.mjs` `commit`, `scan-ids`, `trailers`, `stale-path` pass.

## Commits

- `7c938eaa` docs(83-08): ADR-QD-196, the diagnostics feed folds its reading as a value
- `fe390592` docs(83-08): ADR-QD-173, ADR-QD-169 and ADR-QD-047 amended by ADR-QD-196
- `d8d9f3dd` docs(83-08): the ADR-QD-196 traceability row names no old path

## Deviations from Plan

**1. [Rule 1 - Bug] The ADR-QD-196 traceability row named the retired module path.**
- **Found during:** after Task 2, running `83-check.mjs stale-path`.
- **Issue:** the row said "renamed from `DiagnosticsStore.ts`", a live mention of an old name outside `spec/decisions`.
- **Fix:** reworded the row; revisions of `spec/traceability.md` (1.322) and `spec/README.md` (1.402, its CCR-QD-475 row) follow.
- **Commit:** `d8d9f3dd` (a third commit, beyond the two the plan names).

The ADR's Related list names BEH-QD-751 to BEH-QD-755, INV-QD-411 and INV-QD-412 as plain text, as the plan says; the next plan links them.

## Known Stubs

None.

## Self-Check: PASSED

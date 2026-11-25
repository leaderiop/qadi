---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
plan: 09
subsystem: spec
tags: [spec, behaviors, invariants, traceability, devtools, diagnostics]
requires:
  - phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
    provides: the code (plans 03 to 07) and ADR-QD-196 (plan 08)
provides:
  - BEH-QD-751 to BEH-QD-755 and INV-QD-411, INV-QD-412, each traced; six behaviours restated and two invariants amended; CCR-QD-475 completed
affects: [83-10, 83-11]
phase_base: bc02e8e625eed08227910dfdfd4544ae66ed23ca
plan_head_before: 8c317b5dd0d7f09f047484af6ab6c04289d0e781
plan_head_after: 658c5b03e1cd73f0a2dd543594d5530978fb2b46
actuals:
  tokens: 30000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: [dated Restated and Amended blockquotes with past text kept, one ARCH traceability table per change]
key-files:
  created: []
  modified:
    - spec/behaviors/28-devtools-screens.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md
    - spec/README.md
key-decisions:
  - "BEH-QD-751 to BEH-QD-755 each cite a named test at HEAD; BEH-QD-755's transition table is the rows of FC1 to FC10"
  - "Restatements are dated blockquotes under the headings; no requirement text and no line with an old decision citation is removed"
requirements-completed: []
duration: 40min
completed: 2026-11-25
status: complete
---

# Phase 83 Plan 09: the behaviours, the invariants and CCR-QD-475 Summary

The change is recorded under every reserved number: five behaviours, two invariants, six restatements, two amendments, the
traceability rows and the completed CCR-QD-475 row.

## What was done

- **BEH-QD-751 to BEH-QD-755** after BEH-QD-745 in `spec/behaviors/28-devtools-screens.md`: the fold and the identity of a quiet
  poll (751), the sink and its order (752), `Off` by the constant (753), `Diagnostics` holding the four sampled fields with a
  supplied reading's questions reaching the join beside it (754), and the status and reading transitions as a closed table
  (755). Each has its Decision, Scope and Invariant links, a `REQUIREMENT` block, prose, `Pinned by` tests named as they
  stand at HEAD, and its specification line. The doc-28 row of `spec/traceability.md` lists them and a new "diagnostics fold
  (ARCH-130, ADR-QD-196)" table traces each to its source and tests.
- **INV-QD-411 and INV-QD-412** after INV-QD-410 with Source, Implication and Enforcement; INV-QD-314 (the merge is
  `mergeReading`, no questions) and INV-QD-366 (`DiagnosticsOptions` in `Diagnostics.ts`, the sink beside it) carry dated
  `Amended` paragraphs. The Invariant lines of the five behaviours are links to the new anchors.
- **Restated** by `Restated 2026-11-25 (CCR-QD-475)` blockquotes: BEH-QD-323, 617, 637, 639, 640 and 699. BEH-QD-617's line
  that says `Diagnostics.questions` stays is kept and the blockquote says it is the text before the field was removed.
- **Traced**: section 2 rows for INV-QD-411 and INV-QD-412, the INV-QD-314 and INV-QD-366 rows restated, section 4 rows for
  `DiagnosticsFeed.characterisation.test.ts` and `DockModel.reading.test.ts`, and the new ids on the rows of
  `Diagnostics.test.ts`, `Diagnostics.tst.ts`, `DiagnosticsFeed.test.ts` and `surface.tst.ts`.
- **ADR-QD-196** (now 1.1) links its five behaviours and two invariants. The **CCR-QD-475 row** names every revised document at
  its final revision (README 1.405, ADR-QD-196 1.1, 28-devtools-screens 1.73, invariants 1.225, traceability 1.324, overview
  1.145, ADR-QD-173 1.4, 169 1.3, 047 1.23, index.yaml), the non-spec files (AGENTS.md, the two scripts, the changeset, the
  upgrade entry, the README and the website page), the summary of the change, and that no reserved number is left unused.

## Verification

After the third commit: `node scripts/spec-revise.mjs --check` ok; `bash spec/scripts/verify-traceability.sh --strict` PASS 21,
FAIL 0 (also after each of the first two); `node scripts/check-doc-examples.mjs` 119 blocks compile;
`node scripts/check-devtools-claims.mjs` 8 claims; `83-check.mjs` `commit` (each of the three), `scan-ids` and `stale-path`
pass. A script resolved the 28 links to the new BEH and INV anchors against the headings: none broken.

## Commits

- `4620eb61` docs(83-09): BEH-QD-751 to BEH-QD-755, the diagnostics fold, its sink and its transitions
- `121a64d4` docs(83-09): INV-QD-411 and INV-QD-412, and the diagnostics records restated
- `658c5b03` docs(83-09): CCR-QD-475 completed

## Deviations from Plan

None - plan executed exactly as written. BEH-QD-751 to BEH-QD-755 name INV-QD-411 and INV-QD-412 as plain text in the first
commit, as the plan says, and link them in the second.

## Known Stubs

None.

## Self-Check: PASSED

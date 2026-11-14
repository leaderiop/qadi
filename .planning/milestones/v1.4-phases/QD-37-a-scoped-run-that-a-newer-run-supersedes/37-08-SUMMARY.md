---
phase: QD-37-a-scoped-run-that-a-newer-run-supersedes
plan: 08
subsystem: spec
tags: [behaviours, invariants, traceability, ccr, devtools]
plan_head_before: da24b2d9056af736402ab323812067b3b0cdc66a
plan_head_after: 7dc42374382ac2a7ef7ead7bffbab9612997715f
status: complete

requires: ["37-07"]
provides:
  - "BEH-QD-521 to BEH-QD-525 in spec/behaviors/28-devtools-screens.md (Revision 1.21)"
  - "BEH-QD-461 and BEH-QD-322 restated on the superseding run (29-devtools-simulator.md Revision 1.19)"
  - "INV-QD-319 and INV-QD-320 new, INV-QD-313's Source restated (invariants.md Revision 1.118)"
  - "traceability rows for the two invariants and two new test files (Revision 1.166)"
  - "CCR-QD-428 row complete: 18 files, no reserved number unused (README Revision 1.170)"
affects: [37-09]

actuals:
  tokens: 14000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["a behaviour's Pinned-by paragraph cites only test row ids that exist, checked by script"]

key-files:
  created: []
  modified:
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md

key-decisions:
  - "The five behaviours live with the feeds' other run behaviours in 28; 29 restates the two session behaviours and cross-references them"
  - "INV-QD-319 is the property's law (only the current run lands, nothing after close); INV-QD-320 is the re-entrancy law"

requirements-completed: [RUN-03, RUN-04, RUN-05, RUN-07]
requirements-partial: [WX-02]

duration: 16 min
completed: 2026-11-14
---

# Phase 37 Plan 08: Behaviour and invariant records for the superseding run Summary

The module's rules are now specified requirements: five behaviours (BEH-QD-521 to 525) and two invariants (INV-QD-319, INV-QD-320), each pinned by named test rows, with the session behaviours, INV-QD-313 and the CCR-QD-428 row brought into line.

## Revisions reached

| Document | Revision |
|---|---|
| `spec/behaviors/28-devtools-screens.md` | 1.21 |
| `spec/behaviors/29-devtools-simulator.md` | 1.19 |
| `spec/invariants.md` | 1.118 |
| `spec/traceability.md` | 1.166 |
| `spec/README.md` | 1.170 |

## New headings

- BEH-QD-521: A superseded run never lands, and a newer run interrupts it
- BEH-QD-522: Stopping a run is one unconditional rule
- BEH-QD-523: Closing the owner's scope interrupts the run and is never reported
- BEH-QD-524: A restart issued before the run starts leaves the newest run live
- BEH-QD-525: A restart issued from a run's synchronous start leaves the newest run live
- INV-QD-319: Only the current run lands, and nothing starts or lands after close
- INV-QD-320: A newer run is never interrupted by an older run's start

BEH-QD-461 and BEH-QD-322 no longer name the old counter, and BEH-QD-461 no longer names the handle type, outside fences; both cite ADR-QD-150 and the new behaviours. INV-QD-313's Source names `SupersedingRun.ts` and the guarded `accept`, and its Enforcement adds `SupersedingRun.test.ts` (R3, R9). Traceability: row 28 lists BEH-QD-521 to 525 and `SupersedingRun`; two new test-file rows (`SupersedingRun.test.ts`, `SimulationSession.runs.test.ts`); the TimelineFeed and DiagnosticsFeed rows extended; INV-QD-319 and INV-QD-320 rows after INV-QD-318; ADR-QD-150's row lists INV-QD-313, 319 and 320.

## CCR-QD-428 row

Lists 18 files (the 17 under `packages`, `spec`, `AGENTS.md` and `.changeset` that the phase changed, plus `spec/invariants.md`), each spec document with its revision, and ends "No reserved number is unused." Every reserved number is used: ADR-QD-150 (its file), CCR-QD-428 (the row), ARCH-84 (the row), BEH-QD-521 to 525 and INV-QD-319 to 320 (their headings).

## Task commits

| Task | Commit | Message |
|---|---|---|
| 1 | 33baf051 | docs(37-08): BEH-QD-521 to 525, one module owns a run a newer run supersedes |
| 2 | 7dc42374 | docs(37-08): INV-QD-319 and INV-QD-320, INV-QD-313 restated, and the CCR-QD-428 row completed |

## Verification

`node scripts/spec-revise.mjs --check` passes; `pnpm spec:verify:strict` 21 PASS, 0 FAIL, 0 SKIP; `pnpm spec:examples` 113 blocks compile (no new `typescript` or `tsx` fence); `pnpm spec:gates` dod-table passes; `node scripts/check-house-style.mjs` clean. The three plan verify scripts pass: structure and revisions, every cited `R`, `TF`, `F` and `SR` row id resolves to a test title, and the invariant, traceability and CCR-row checks. `node scripts/next-id.mjs` was never run.

## Deviations from Plan

None - plan executed exactly as written. One small adjustment: links from `29-devtools-simulator.md` to the new behaviours use the sibling-file form (`28-devtools-screens.md#...`) that the folder's other links use.

## Known Stubs

None.

## Self-Check: PASSED

- 33baf051 and 7dc42374 are ancestors of HEAD; both messages end with the Co-Authored-By trailer.
- All five edited spec files exist and carry the revisions above.

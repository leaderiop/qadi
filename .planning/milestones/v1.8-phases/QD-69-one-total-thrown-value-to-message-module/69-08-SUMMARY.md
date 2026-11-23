---
phase: QD-69-one-total-thrown-value-to-message-module
plan: 08
subsystem: spec
tags: [invariants, behaviours, traceability, thrown-message, cause-message]
phase_base: 19fe6244bc8b3494823732b1fbf87f3947852fd8
plan_head_before: 74a01755c60ecedcc3adb8a4520f8d211f14bdd5
plan_head_after: 15eb7eac51e8082280d6f254afbc8f9f48444d17
requires: [69-07]
provides:
  - "INV-QD-383 and INV-QD-384, traced"
  - "BEH-QD-681 and 682 (06-services), 683 (32), 684 (34), 685 (29), the BEH-QD-230 amendment, and the stopped-reason amendments of BEH-QD-507, 519 and 637"
  - "every spec document at the Revision the CCR-QD-461 row cites"
affects: [69-09]
actuals:
  tokens: 14000
  tasks: 2
  commits: 3
tech-stack:
  added: []
  patterns: ["each spec document revised once, landing the Revision the CCR row already cited"]
key-files:
  created: []
  modified:
    - spec/invariants.md
    - spec/behaviors/06-services.md
    - spec/behaviors/19-hydration.md
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/behaviors/32-custom-predicates.md
    - spec/behaviors/34-remote-ports.md
    - spec/traceability.md
    - spec/decisions/182-one-total-thrown-value-to-text-rule-exported-by-core.md
key-decisions:
  - "The spec states the rule at every seam with only the reserved ids (BEH-QD-681 to 685, INV-QD-383 and 384); a test is cited in the invariants by its real title, taken from 69-RED-EVIDENCE.md"
  - "PortWire.test.ts already had a combined row with its .tst.ts file; the plan's separate `PortWire.test.ts` row was added as written (the gate's check reads it literally), so the file now has two rows, each true"
requirements-completed: []
status: complete
duration: ~30 min
completed: 2026-11-22
---

# Phase 69 Plan 08: The invariants, the behaviour and the registers Summary

INV-QD-383 and INV-QD-384, BEH-QD-681 to 685, the BEH-QD-230 amendment and the devtools screens' stopped-reason amendments are written and traced, and every spec document ends at the Revision the CCR-QD-461 row cites. (Requirement checkboxes stay untouched on purpose: 69-09 marks THRW-01..05 complete.)

## Final Revisions

| Document | Revision | Was |
| --- | --- | --- |
| `spec/invariants.md` | 1.169 | 1.168 |
| `spec/behaviors/06-services.md` | 1.16 | 1.15 |
| `spec/behaviors/19-hydration.md` | 1.23 | 1.22 |
| `spec/behaviors/28-devtools-screens.md` | 1.39 | 1.38 |
| `spec/behaviors/29-devtools-simulator.md` | 1.22 | 1.21 |
| `spec/behaviors/32-custom-predicates.md` | 1.3 | 1.2 |
| `spec/behaviors/34-remote-ports.md` | 1.8 | 1.7 |
| `spec/traceability.md` | 1.238 | 1.237 |
| `spec/overview.md`, `spec/README.md`, ADR-QD-182 | 1.132, 1.279, 1.0 | unchanged by this plan |

## Results

- verify-traceability strict: `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)`, `all 156 invariant(s) traced`, `139 ADR(s) traced`.
- `node scripts/check-doc-examples.mjs`: `doc-examples: 118 block(s) compile` (BEH-QD-681's `typescript` example included).
- `node scripts/spec-revise.mjs --check`: `every Revision matches its newest Change History entry`.
- `check-dod-table`: `26 step(s) match pnpm check, 154 reference(s) resolve`; `check-devtools-claims`: `8 claim(s) registered across 6 file(s)`; `check-api-surface`: `941 export(s) documented across 9 package(s)`.
- Task 2's verify read each document's Revision and the CCR-QD-461 row's citation of it: all agree (the node check printed no mismatch).

## Task commits

| Task | Commit | What |
| --- | --- | --- |
| 1 (tracer) | 986d41d9 | INV-QD-383, INV-QD-384, BEH-QD-681, BEH-QD-682, the 06 requirement through `causeMessage`, BEH-QD-507/519/637 amended, traceability sections 1 and 2 |
| 2 | d71c87e3 | BEH-QD-683 to 685, BEH-QD-230 amended, traceability rows (ids, ADR-QD-182 links, ThrownMessage and PortWire test rows, fifteen touched test rows) |
| 2 fix | 15eb7eac | ADR-QD-182 names `scripts/check-package-install.mjs` where it said "gate 14" |

Tracer gate: Task 1's verify was re-run end to end after its commit and passed before Task 2 started.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ADR-QD-182 named gate 14 without its command**
- **Found during:** Task 2 verify (`check-dod-table`)
- **Issue:** 69-07's ADR text "gate 14's probes of both in the packed consumer" fails `check-dod-table.mjs`: a gate number must come with the command it means (AGENTS.md section 15).
- **Fix:** reworded to "probes of both in the packed consumer (`scripts/check-package-install.mjs`, gate 14)". The ADR is new in this phase and stays at Revision 1.0, which the CCR row cites.
- **Files modified:** `spec/decisions/182-one-total-thrown-value-to-text-rule-exported-by-core.md`
- **Commit:** 15eb7eac (separate from the task commit, so Task 2's commit holds exactly the five documents its verify requires)

### Verification-only

**2. [Verification] Plan's `<automated>` blocks are one-line `bash -c '...'` scripts**
- Ran them from files extracted verbatim from the plan into the scratchpad (quoting survives); results above.

### Decided autonomously (owner's standing order)

- BEH-QD-685's `Broke` text and BEH-QD-684's wire requirement follow the plan's wording; the prose beneath each states what threw before, taken from `69-RED-EVIDENCE.md` and the code diff.
- Anchors for BEH-QD-507 and BEH-QD-519 are their real headings' (`a-defect-stops-the-poll-visibly-and-a-restart-resumes-it`, `a-defect-stops-the-timeline-visibly-and-a-restart-resumes-it`); the plan did not list them.

## Known Stubs

None.

## Threat Flags

None (documentation only).

## Self-Check: PASSED

- Commits 986d41d9, d71c87e3 and 15eb7eac exist on the branch; both task verifies exit 0.
- Every file listed under key-files modified exists and is committed; `.planning/config.json` was never staged.

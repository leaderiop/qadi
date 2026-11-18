---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 10
subsystem: spec
tags: [adr, behaviours, devtools, gfed-05, wx-02, records]
requires: ["56-09"]
provides:
  - ADR-QD-169 (Rev 1.0), its index entry, and the ADR-QD-047 Rev 1.18 amendment (CCR-QD-447)
  - BEH-QD-616..620 in doc 28 (Rev 1.32), under the titles 56-11 links
  - BEH-QD-323, 465, 506, 507, 583, 584, 585 and BEH-QD-327 (09-react.md Rev 3.9) corrected in place
affects: [56-11, 56-12, 56-13]
actuals:
  tokens: 15000
  tasks: 2
  commits: 2
plan_head_before: aa6fdd8a3d2a378e7ba7239c842e8ad6451755e6
plan_head_after: 819d0e3e8409e424737a10687ac956509fae1905
tech-stack:
  added: []
  patterns: ["a moved test is named by its twin's number in the spec, never by the deleted case"]
key-files:
  created:
    - spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/09-react.md
key-decisions:
  - "ADR-QD-169 records D-01 with its reason (one failure policy for the panel's two host inputs), applies ADR-QD-137, keeps ADR-QD-162 and ADR-QD-150 untouched, and amends ADR-QD-047 by a dated note"
requirements-completed: [GFED-05, WX-02]
duration: 25min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 10: ADR-QD-169 and BEH-QD-616..620

The owner's decision that one feed owns the Questions tab's registry and thunk is now recorded as ADR-QD-169, the five behaviours it makes normative are in doc 28, and every behaviour the move falsified says what the code does.

## Commits

| Task | Commit | What |
| ---- | ------ | ---- |
| 1 | `415bd22e` | ADR-QD-169, its `index.yaml` entry, ADR-QD-047 Rev 1.18 |
| 2 | `819d0e3e` | BEH-QD-616..620; BEH-QD-323, 465, 506, 507, 583, 584, 585 and BEH-QD-327 corrected |

## Records, with their final revisions

- **ADR-QD-169**, Revision 1.0, Status `Accepted — amends ADR-QD-047; applies ADR-QD-137; keeps ADR-QD-162, ADR-QD-150`. Its `## Mutation` carries each file's base and after `(detected/scored)` copied from `56-mutation-base.json` and `56-mutation-after.json`: `DiagnosticsFeed.ts` 90/95 to 86/87, `DiagnosticsStore.ts` 60/60 to 57/57, `DockModel.ts` 145/145 to 114/114, `Gates.ts` 66/66 to 70/70, `GatesFeed.ts` 118/118. It states 122 of 122 static mutants Killed and that `compare` printed `WX-05 holds (D-11)`.
- **ADR-QD-047**, Revision 1.18: a dated CCR-QD-447 amendment, the Status row entry, the index status string. Every earlier amendment line is unchanged (checked against `phase_base`). ADR-QD-162 is not edited.
- **Doc 28**, Revision 1.32; **09-react.md**, Revision 3.9, both through `scripts/spec-revise.mjs`.

## What 56-11 must match

The five headings, exactly, in doc 28 after BEH-QD-615:

- `## BEH-QD-616: One feed owns the gate watch and the questions input` (INV-QD-357)
- `## BEH-QD-617: The questions are a dock input, read on the diagnostics cadence` (INV-QD-357)
- `## BEH-QD-618: A questions input that throws is stated, and the poll keeps running` (INV-QD-358)
- `## BEH-QD-619: The questions store joins three readings, and reads no host code` (INV-QD-357)
- `## BEH-QD-620: The devtools feed hands the questions beside the gates` (INV-QD-357)

The two invariant anchors the BEH entries link, which 56-11's headings must produce:

- `../invariants.md#inv-qd-357-one-feed-owns-the-gate-registry-its-subscription-its-failure-state-and-the-questions-input`
- `../invariants.md#inv-qd-358-the-questions-panels-two-host-inputs-fail-the-same-way-and-neither-stops-the-diagnostics-poll`

BEH-QD-619 records the one dropped read: a diagnostics publish that changes no question no longer re-reads the registry. BEH-QD-583's and BEH-QD-584's Pinned-by paragraphs name the `GatesFeed.test.ts` twins (G cases) and the J cases, and no deleted `DockModel.test.ts` case (M31, M33, M35, M37..M46) appears in doc 28 below its header.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ADR text lacked the literal `QuestionsView.Failed`**
- **Found during:** Task 1 verify
- **Issue:** decision 6 said "`QuestionsView` gains `Failed { reason }`", which the verify's literal check (and a reader grepping the name) did not find.
- **Fix:** reworded to "`QuestionsView.Failed { reason }` is new".
- **Files modified:** `spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md`
- **Commit:** `415bd22e` (fixed before the commit)

**2. [Rule 1 - Bug] "Specified in ADR-QD-169 (CCR-QD-447" wrapped across a line**
- **Found during:** Task 2 verify
- **Issue:** BEH-QD-616 and BEH-QD-620 broke the closing citation across two lines, so it no longer matched on one line.
- **Fix:** moved the line break before "Specified".
- **Commit:** `819d0e3e` (fixed before the commit)

The two known wrong verify patterns did not appear in this plan (its pathspecs are explicit file paths). The verifies were run from scratchpad copies extracted from the plan, unchanged.

**Total deviations:** 2 auto-fixed (both Rule 1, in my own text before commit). **Impact:** none.

## Notes

- `pnpm spec:verify:strict` was not run, as the plan says: it needs 56-11's traceability rows and 56-12's CCR row. `spec-revise --check`, `spec:examples` (116 blocks compile) and `spec:claims` (8 claims) pass.
- No `typescript` or `tsx` fence was added; BEH-QD-616's listing and the corrected listings are `ts` fences.
- GFED-05 [edge, unclassified]: read as the plan flags it, proven by this plan's verifies, 56-12's changeset checks and 56-13's scan. Neither GFED-05 nor WX-02 is marked Complete in REQUIREMENTS.md here (56-13 marks GFED-01..05).
- The plan-level scope held: only the five spec files changed since `plan_head_before`; no source, test, script, AGENTS.md, ADR-QD-162 or overview change.

## Known Stubs

None.

## Self-Check: PASSED

The ADR, both commits and the five spec files exist and are ancestors of HEAD; both task verifies and `spec-revise --check`, `spec:examples` and `spec:claims` exit 0.

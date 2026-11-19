---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 11
subsystem: spec
tags: [invariants, traceability, overview, gfed-05, wx-02, wx-03]
requires: ["56-10"]
provides:
  - INV-QD-357 and INV-QD-358 (invariants.md Rev 1.154), under the headings BEH-QD-616..620 link
  - INV-QD-343 and INV-QD-313 corrected in place to follow the gates feed
  - traceability.md Rev 1.217 rows for the new records and the three new test files
  - overview.md Rev 1.123, four rows restated with gate 13's count unchanged
affects: [56-12, 56-13]
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: 544907eb70f9acbbdbd33ba489eb9cc8cff7b904
plan_head_after: 1a55d9b1c7e6fe1e7d61b87a011fe10835ad2f16
tech-stack:
  added: []
  patterns: ["an invariant moved to a new module is corrected in place, naming the twin tests and (ARCH-103, CCR-QD-447), never the deleted case numbers"]
key-files:
  created: []
  modified:
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
key-decisions:
  - "INV-QD-357 is worded by what the feed owns (registry, subscription, failure state, questions input) and says DockModel keeps its closed flag and last join (D-04 amended)"
  - "INV-QD-358 states both host inputs fail the same way and neither touches the poll"
requirements-completed: [WX-02, WX-03]
duration: 20min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 11: INV-QD-357, INV-QD-358 and the traceability

The two invariants the move makes are written under the headings 56-10's behaviours link, the two it touched say what holds now, every new record and test is traced, and the overview describes the moved fields with the export count unchanged.

## Commits

| Task | Commit | What |
| ---- | ------ | ---- |
| 1 | `cc910f80` | INV-QD-357, INV-QD-358; INV-QD-343 and INV-QD-313 corrected |
| 2 | `1a55d9b1` | traceability rows; the four overview rows |

## Final revisions and gate 13

- `spec/invariants.md` Revision 1.154, `spec/traceability.md` Revision 1.217, `spec/overview.md` Revision 1.123, each through `scripts/spec-revise.mjs`.
- `spec:api`: `api-surface: 935 export(s) documented across 9 package(s)` (the base's count). `spec:examples`: 116 block(s) compile. `spec-revise --check`: every Revision matches its newest Change History entry.
- The overview's diff is the header and the four rows only (lines 8, 13, 584, 909, 920, 923); row count and line count equal the phase base's.

## What changed

- INV-QD-343's statement says the questions input's answer; its Source names `GatesFeed.ts`; its Enforcement names the `GatesFeed.test.ts` twins (G31, G36 to G47, G42 b, GP2) and `DockModel.test.ts` (P2, J1, M36, M47). No deleted M case (M31, M33, M35, M37..M46) remains in the invariant or in any traceability row.
- INV-QD-313 gains the gates feed's paragraph (a replaced cadence or a closed feed runs no host code and publishes nothing), `GatesFeed.ts` in its Source and `GatesFeed.test.ts` in its Enforcement; its traceability row likewise.
- Traceability: doc 28's §1 row gains `BEH-QD-616–620` and `GatesFeed`; §2 rows for INV-QD-357 and INV-QD-358 after INV-QD-356; §3 row for ADR-QD-169 linking the five BEH anchors; §4 rows for `GatesFeed.test.ts`, `QuestionsPanel.thunk.test.tsx` and `QuestionsPanel.feed.characterisation.test.tsx`; the rows of `DockModel.test.ts` (its M31..M47 parenthetical rewritten to the cases that remain plus J1..J8), `DiagnosticsStore.tst.ts`, `DevtoolsFeed.test.tsx`, `DevtoolsFeed.tst.ts`, `dock-wiring.test.tsx`, `Gates.test.ts`, `QuestionsPanel.gates.test.tsx` and `surface.tst.ts` name the new ids.
- Overview: `useDevtoolsFeed` (questions beside gates; `diagnostics` is `extra` plus `layer`), `DiagnosticsOptions` (`layer`, `collector`, `schedule`), `DiagnosticsDockOptions` (`layer`, `collector`, `intervalMillis`), `DevtoolsDock` (ten optional props, `questions` beside `gates`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] INV-QD-358's Source described `joinQuestions`' precedence loosely**
- **Found during:** Task 1
- **Issue:** my first wording listed a failed registry in the questions view's precedence; `joinQuestions` decides the questions view as rows, then a failed read, then unsampled, then absent, and states the two failures independently.
- **Fix:** reworded to that order before the commit.
- **Files modified:** `spec/invariants.md`
- **Commit:** `cc910f80` (fixed before the commit)

**2. [Plan wording vs. code] DiagnosticsStore.test.ts and DiagnosticsFeed.test.ts rows**
- The plan asked to drop any claim that they sample or restart on `questions`; neither row made one, so neither changed. `DiagnosticsFeed.test.ts` does not name the gates feed either: only INV-QD-313's row does.

**Total deviations:** 1 auto-fixed (Rule 1, in my own text before commit), 1 no-op. **Impact:** none.

## Notes

- `spec/scripts/verify-traceability.sh --strict` was run once as a check: 20 PASS and one FAIL, the CCR register coverage, which reports CCR-QD-447 as drift. That is the expected state until 56-12 adds the row.
- The known wrong verify patterns (the `packages/*/src` pathspec and the `as` regex) did not appear in this plan. The verifies were run unchanged from scratchpad copies extracted from the plan.
- GFED-05, WX-02 and WX-03 are not marked Complete in REQUIREMENTS.md here (56-13 marks GFED-01..05; WX-01..WX-07 close with the milestone).
- Only `spec/invariants.md`, `spec/traceability.md` and `spec/overview.md` changed since `plan_head_before`.

## Known Stubs

None.

## Self-Check: PASSED

Both commits are ancestors of HEAD and the three spec files exist; both tasks' verifies, `spec-revise --check`, `spec:api` and `spec:examples` exit 0.

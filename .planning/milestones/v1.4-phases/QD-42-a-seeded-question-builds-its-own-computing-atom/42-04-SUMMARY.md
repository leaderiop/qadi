---
phase: QD-42-a-seeded-question-builds-its-own-computing-atom
plan: 04
subsystem: react-hydration
tags: [spec-records, adr-amendment, traceability, changeset, comment-only]
phase_base: 7e5dafdbf1cc266310586b1a3c5064346e0b8360
plan_head_before: 7f4b901203a0870622cfba067a8419d2a41e4388
plan_head_after: aeb2e93dd35775bd14a18a49f68ca129191d4c05
requires: [42-03]
provides:
  - four source header comments that name SeededQuestion.ts where the seed now lives (code unchanged, proven with the TypeScript printer)
  - ADR-QD-149 (Rev 1.1) and ADR-QD-140 (Rev 1.2) dated amendments pointing at ADR-QD-155
  - INV-QD-028/105/317/318 and BEH-QD-517/518 citing SeededQuestion.ts and its real-runtime tests
  - traceability rows (SeededQuestion.test.ts row new, HydrationEngine.test.ts row cut to the codec ids)
  - the completed CCR-QD-433 row, and the @qadi/react patch changeset
affects: [42-05]
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: [amend a decision record with a dated section instead of rewriting it, records checked against the code they cite]
key-files:
  created:
    - .changeset/react-seeded-question-owns-its-computing-atom.md
  modified:
    - packages/react/src/QuestionBook.ts
    - packages/react/src/SeededDecision.ts
    - packages/react/src/HydrationEvent.ts
    - packages/react/src/Hydration.ts
    - spec/decisions/149-a-seed-is-held-by-its-question.md (Rev 1.1)
    - spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md (Rev 1.2)
    - spec/invariants.md (Rev 1.122)
    - spec/behaviors/19-hydration.md (Rev 1.20)
    - spec/traceability.md (Rev 1.177)
    - spec/README.md (Rev 1.182)
key-decisions:
  - "ADR-QD-140's amendment names both missing QadiAtoms.ts imports (SeededQuestion.ts and SweepScheduler.ts), because its edge list was already stale before this phase"
  - "The unused reserved numbers (BEH-QD-546 to 550, INV-QD-329, INV-QD-330) appear only in the CCR-QD-433 row"
requirements-completed: [SEED-03, SEED-04, WX-02, WX-03, WX-07]
duration: 6 min
completed: 2026-11-14
status: complete
commits: 3
---

# Phase 42 Plan 04: Records Follow the Seeded Question's Move Summary

The four source comments, ADR-QD-149 and ADR-QD-140 (by dated amendment), four invariants, two behaviours, the traceability rows and the CCR-QD-433 row now say the seed lives in `SeededQuestion.ts`, and one non-breaking `@qadi/react` patch changeset describes the phase; no code, export or earlier ADR line changed.

## Accomplishments

- Task 1: `QuestionBook.ts`, `SeededDecision.ts`, `HydrationEvent.ts` and `Hydration.ts` differ from `phase_base` in comments only (identical comment-free TypeScript print). The liveness rule is still stated once, at `QuestionBook.ts:72`.
- Task 2: ADR-QD-149 and ADR-QD-140 each end with `## Amendment (2026-11-14, ADR-QD-155, CCR-QD-433)`; ADR-QD-140's names `SeededQuestion.ts` and `SweepScheduler.ts`. INV-QD-028/105/317/318 and BEH-QD-517/518 give `SeededQuestion.ts` as Source, and the four Enforcement paragraphs name `SeededQuestion.test.ts`.
- Task 3: the INV-QD-028/105/317/318 rows, the behaviour-19 row and the two ADR rows are restated; the `HydrationEngine.test.ts` row cites only the seven codec ids and a `SeededQuestion.test.ts` row (eleven ids) follows it; the `QadiAtoms.test.ts` row cites the seam's ids. The CCR-QD-433 row names all 21 phase files with each spec document's current revision and ends with the Used and Unused lists. `spec/overview.md` is byte-identical to `phase_base`.

## Task Commits

1. **Task 1: comments follow the seed to SeededQuestion.ts** - `acc137a4` (docs, 4 files)
2. **Task 2: ADR-QD-149 and ADR-QD-140 amended, invariants and behaviours cite SeededQuestion.ts** - `69f0b20d` (docs, 4 files)
3. **Task 3: traceability, the CCR-QD-433 row and the changeset** - `aeb2e93d` (docs, 3 files)

Each commit ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Verification (all exit 0)

- Task 1: comment-only printer proof, and sentence/liveness-rule check.
- Task 2: citation, amendment, edge-list and moved-name check; `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict`.
- Task 3: traceability/changeset/CCR-row/overview check; milestone-file citation check (26 citations resolved); `spec-revise --check && pnpm spec:verify:strict && pnpm spec:api` (927 exports documented, overview unchanged).
- Also: `node scripts/check-house-style.mjs` clean (505 files).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Authentication gates: none.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `.changeset/react-seeded-question-owns-its-computing-atom.md` exists; commits `acc137a4`, `69f0b20d` and `aeb2e93d` are ancestors of HEAD; `git rev-list --count 7f4b9012..HEAD` was 3 at the last code commit.

## Next

Ready for 42-05.

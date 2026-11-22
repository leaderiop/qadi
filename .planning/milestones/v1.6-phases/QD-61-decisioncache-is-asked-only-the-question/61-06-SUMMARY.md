---
phase: QD-61-decisioncache-is-asked-only-the-question
plan: 06
subsystem: spec
tags: [adr, behaviours, invariants, traceability, ccr, wx-02, wx-03]
phase_base: 7d2d281d3f395b04ea584cf55ae6be44e1f4aaf3
requires: [61-05]
provides:
  - ADR-QD-174 at spec/decisions/174-a-decision-cache-is-asked-the-question.md (the path 61-05's 0.13 note links)
  - dated amendments of ADR-QD-031 (Rev 1.3) and ADR-QD-132 (Rev 1.2)
  - BEH-QD-641..645 and INV-QD-367..368, BEH-QD-166 and BEH-QD-190 reworded under dated notes
  - traceability rows and the CCR-QD-452 register row
affects: [61-07]
actuals:
  tokens: 78000
  tasks: 3
  commits: 3
plan_head_before: eaccfcc7cf371200abdd0ca5f83fd3df9b4d621c
plan_head_after: b4d07145c5ceceafa892ed1897df4cbdc0222151
requirements-completed: []
completed: 2026-11-19
status: complete
---

# Phase QD-61 Plan 06: The records

**ADR-QD-174, its two amendments, BEH-QD-641..645, INV-QD-367..368, the traceability rows and CCR-QD-452 are in, every reserved id is used (`Unused: none.`), and gate 13 still prints `api-surface: 939 export(s) documented across 9 package(s)`; three `docs(61-06)` commits, no source, test or overview edit.**

## Commits

| Task | SHA | Subject |
| ---- | --- | ------- |
| 1 | 8f798ead | `docs(61-06): ADR-QD-174, a decision cache is asked the question` |
| 2 | a3cba91c | `docs(61-06): BEH-QD-641..645 and INV-QD-367..368` |
| 3 | b4d07145 | `docs(61-06): the traceability and CCR-QD-452` |

Each commit holds exactly the plan's files (4, 3 and 2), and ends with the trailer. Every edit was applied mechanically
from the plan's verbatim fences, each old text found exactly once.

## Verifies

- Task 1: `ADR-QD-174 and its amendments are in, bumped`; `committed 8f798ead`. Revisions 031 1.2 to 1.3, 132 1.1 to 1.2.
- Task 2: `BEH-QD-641..645 and INV-QD-367..368 are in, bumped`; `committed a3cba91c`. Revisions 21-decision-cache 1.9 to
  1.10, 25-inspection 1.39 to 1.40, invariants 1.159 to 1.160. `check-doc-examples.mjs` green.
- Task 3: `traced, and CCR-QD-452 recorded`; `every spec gate green`; `committed b4d07145`. Revisions traceability
  1.222 to 1.223, README 1.254 to 1.255.
- Gate output tails: `api-surface: 939 export(s) documented across 9 package(s)`;
  `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` (`verify-traceability.sh --strict`);
  `dod-table: 25 step(s) match pnpm check, 150 reference(s) resolve` (gate 11).
- Every Enforcement title the new text cites was confirmed to exist on the tree before writing (DecisionCache.test.ts
  four titles, Lifecycle.test.ts, DecisionSink.test.ts, Evaluate.test.ts), and `DecisionCache.tst.ts` carries the
  `@ts-expect-error` on exporting `walk`.

## Deviations from Plan

None - plan executed exactly as written. No file under `packages/*/src` or `packages/*/test` was touched, so the 61-04
mutation evidence (4661c111) stays fresh. `node scripts/next-id.mjs` was not run; `spec/overview.md` is unchanged.

## Next plan must know

- The ADR link in 61-05's `upgrading.md` note now resolves: `spec/decisions/174-a-decision-cache-is-asked-the-question.md` exists.
- 61-07 marks CASK-01..04 complete; this plan flipped nothing in `.planning/REQUIREMENTS.md`.
- Used ids, all reserved in 61-01: ARCH-108, ADR-QD-174, CCR-QD-452, BEH-QD-641..645, INV-QD-367..368.

## Known Stubs

None.

## Self-Check

PASSED. ADR-QD-174 file found; commits 8f798ead, a3cba91c and b4d07145 are ancestors of HEAD.

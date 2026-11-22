---
phase: QD-59-admission-produces-the-one-walk-environment
plan: 08
subsystem: spec
tags: [invariants, behaviours, traceability, wenv]
requires: [59-04, 59-07]
provides:
  - "INV-QD-363 and INV-QD-364, and the INV-QD-037 amendment (spec/invariants.md Rev 1.158)"
  - "BEH-QD-631, 632, 634, 635 (05-evaluator.md Rev 1.17) and BEH-QD-633 (16-predicates.md Rev 1.9), edges stated"
  - "traceability rows for every new id, ADR-QD-172 and the two test files (spec/traceability.md Rev 1.221)"
affects: [59-09, 59-10]
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
plan_head_before: 8271ca40e9d14621849963ed477de4d5cdf1ed05
plan_head_after: 7c57a08e0f1993352566778f7640f75826f8603f
key-files:
  created:
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-08-SUMMARY.md
  modified:
    - spec/invariants.md
    - spec/behaviors/05-evaluator.md
    - spec/behaviors/16-predicates.md
    - spec/traceability.md
key-decisions:
  - "BEH-QD-632 and BEH-QD-633 state the empty and adjacency edges in their REQUIREMENT blocks, so a fail-open supplied contradicts a requirement"
  - "The 05 evaluator traceability row names BEH-QD-631, 632, 634 and 635 one by one, not as ranges, so the verify's literal match and a reader's grep agree"
requirements-completed: [WENV-02, WENV-03, WX-02]
duration: 22min
completed: 2026-11-19
status: complete
---

# Phase QD-59 Plan 08: The walk environment as invariant, behaviour and trace

**INV-QD-363/364, BEH-QD-631..635 and the INV-QD-037 amendment state the one admission-built walk environment with its empty, adjacency and ordering edges explicit, and every new id traces to the two tests that pin it.**

`commits: 3` are the three `docs(59-08)` task commits; the SUMMARY commit is separate. Started 2026-11-19T05:07Z.

## Performance

- **Tasks:** 3
- **Files modified:** 4 spec files (plus this SUMMARY)

## Accomplishments

- INV-QD-363 (both interpreters read the environment admission built) and INV-QD-364 (what a request supplied is a function of its row source and its question), each with Source, Implication, Enforcement and Related.
- INV-QD-037 gained one `Amended in CCR-QD-450 (ADR-QD-172)` paragraph before its Related line; no prior line was removed (checked against the `docs(59-07)` commit).
- BEH-QD-631, 632, 634, 635 after BEH-QD-606 and BEH-QD-633 after BEH-QD-608, each in the house shape.
- Traceability sections 1 to 4 carry every new id, ADR-QD-172's row, the three `amended 2026-11-19 by ADR-QD-172 (CCR-QD-450)` marks, the `Admission.test.ts` and `DecisionCache.test.ts` additions and a new `WalkEnvironment.tst.ts` row.

## Invariants

Commit `78e205cc` (`docs(59-08): INV-QD-363, INV-QD-364 and the INV-QD-037 amendment`), `spec/invariants.md` Rev 1.157 to 1.158 through `scripts/spec-revise.mjs`. The Task 1 verify printed `INV-QD-363, INV-QD-364 and the INV-QD-037 amendment present`.

## Behaviours

Commit `5d7afd85` (`docs(59-08): BEH-QD-631..635 for the walk environment`): `05-evaluator.md` Rev 1.16 to 1.17, `16-predicates.md` Rev 1.8 to 1.9. The Task 2 verify printed `five BEH entries in their homes`.

- Empty edge: BEH-QD-632 says a question with neither supplies neither, and an absent resource MUST NOT be reported as supplied.
- Adjacency edge: BEH-QD-633 says a row is supplied whether or not the question carries a resource.
- Ordering edge: BEH-QD-634 says the parameters are exactly policy, environment, depth, in that order, and a swap MUST NOT compile.
- BEH-QD-634 and the INV text record the walk's own `depth > maxDepth` guard as defence in depth that `evaluate` cannot reach (orchestrator note after 59-06).

## Traceability

Commit `7c57a08e` (`docs(59-08): trace the walk environment`), `spec/traceability.md` Rev 1.220 to 1.221. The Task 3 node verify printed `every new id traced; every anchor resolves`. The strict run (`bash spec/scripts/verify-traceability.sh --strict`) reports `PASS: 20   FAIL: 1`; the one FAIL line is:

`| FAIL | CCR register coverage | drift from KNOWN_GAPS (backfill the register or update the script's list): got [078 ... 137 450], expected [078 ... 137]`

It names 450 only, whose register row arrives in 59-09. `node scripts/spec-revise.mjs --check` passes.

## Task Commits

1. **Task 1: INV-QD-363, INV-QD-364, INV-QD-037 amended** - `78e205cc` (docs)
2. **Task 2: BEH-QD-631..635** - `5d7afd85` (docs)
3. **Task 3: traceability rows** - `7c57a08e` (docs)

## Decisions Made

See key-decisions. The REQUIREMENT wording is the plan's, rewrapped; every MUST clause is kept.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] A REQUIREMENT wrap split a verify phrase**
- **Found during:** Task 2
- **Issue:** BEH-QD-632's `MUST NOT be reported as supplied` wrapped across two lines, so the verify's literal match failed.
- **Fix:** Rewrapped so the phrase sits on one line; no clause changed.
- **Files modified:** spec/behaviors/05-evaluator.md
- **Committed in:** `5d7afd85` (before the commit)

**2. [Rule 3 - Blocking] The 05 traceability row used ranges the verify cannot match**
- **Found during:** Task 3
- **Issue:** The action's `BEH-QD-631–632, BEH-QD-634–635` ranges left `BEH-QD-632` and `BEH-QD-635` absent as literals, so the row check failed.
- **Fix:** The row lists the four ids one by one (`BEH-QD-631, BEH-QD-632, BEH-QD-634, BEH-QD-635`).
- **Files modified:** spec/traceability.md
- **Committed in:** `7c57a08e`

**Total deviations:** 2 auto-fixed (both Rule 3, wording only). **Impact:** none on content or scope.

## Issues Encountered

None. No requirement was marked Complete (WENV-01..04 close in 59-10).

## Known Stubs

None.

## Next Phase Readiness

Ready for 59-09 (CCR-QD-450 and the README change history), which closes the one remaining strict-traceability FAIL.

## Self-Check: PASSED

- `spec/invariants.md`, `spec/behaviors/05-evaluator.md`, `spec/behaviors/16-predicates.md`, `spec/traceability.md` exist and carry the new ids.
- Commits `78e205cc`, `5d7afd85`, `7c57a08e` are ancestors of HEAD; each carries only its named files and the trailer.

---
*Phase: QD-59-admission-produces-the-one-walk-environment*
*Completed: 2026-11-19*

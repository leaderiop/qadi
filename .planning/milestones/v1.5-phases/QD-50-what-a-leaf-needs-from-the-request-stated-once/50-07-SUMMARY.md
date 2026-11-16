---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
plan: 07
subsystem: spec
tags: [adr, spec, traceability, changeset, leaf-needs]
plan_head_before: c59912cc7dcd8b73fb410062327da819339aa4d3
plan_head_after: c7b4ee28
commits: 4
requires: [50-06]
provides:
  - "ADR-QD-163 with the gate's and the after-run's numbers, the order rule, D-08a and the mutation comparison with D-13"
  - "BEH-QD-586..590, INV-QD-345..346, INV-QD-011's Source, the traceability rows and the CCR-QD-441 row"
  - "the @qadi/core patch changeset"
affects: [50-08]
key-files:
  created:
    - spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md
    - .changeset/leaf-needs-stated-once.md
  modified:
    - spec/decisions/index.yaml
    - spec/behaviors/10-actions.md
    - spec/behaviors/05-evaluator.md
    - spec/behaviors/30-port-calls.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "ADR-QD-163 records both measurements from the committed analysis.tsv files, with the after-run's worst row (+9.3%, anyOf First) stated as 0.7 points inside its 10% band"
requirements-completed: []
metrics:
  tasks: 3
  files: 9
actuals:
  tokens: 77600
  tasks: 3
  commits: 4
status: complete
---

# Phase QD-50 Plan 07: The records for what a leaf needs from the request Summary

ADR-QD-163, five behaviour entries, two invariants, the traceability and CCR rows, and a `@qadi/core` patch changeset record the change, using only the reserved ids. No source or test file changed; `pnpm check:pr` is green.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | `05ca43b3` | docs(50-07): ADR-QD-163, what a leaf needs from the request is stated once |
| 2 | `024bc9a6` | docs(50-07): BEH-QD-586..590, INV-QD-345..346 and the traceability rows |
| 3 | `f848d8dd` | docs(50-07): CCR-QD-441 and the @qadi/core patch changeset |
| fix | `c7b4ee28` | docs(50-07): ADR-QD-163 names the script behind gate 13 |

## Files written, with their revisions

| File | Revision |
|------|----------|
| `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` (new, `QADI-ADR-163`) | 1.0 |
| `spec/decisions/index.yaml` | ADR-QD-163 entry appended |
| `spec/behaviors/10-actions.md` (BEH-QD-586, BEH-QD-587; BEH-QD-076 points at both and says its `MissingAction` carries no `expected`) | 1.1 to 1.2 |
| `spec/behaviors/05-evaluator.md` (BEH-QD-589, BEH-QD-590) | 1.10 to 1.11 |
| `spec/behaviors/30-port-calls.md` (BEH-QD-588) | 1.8 to 1.9 |
| `spec/invariants.md` (INV-QD-345, INV-QD-346; INV-QD-011's Source now `LeafNeeds.ts`'s `absenceOf`, its Enforcement and Related extended) | 1.141 to 1.142 |
| `spec/traceability.md` (INV rows, the INV-QD-011 row, the ADR row, behaviour-file rows for 05, 10 and 30, test rows for `LeafNeeds.test.ts` and `LeafMatrix.test.ts`, BEH-QD-587 on `Predicate.test.ts`, INV-QD-346 on `Evaluate.test.ts`) | 1.206 to 1.207 |
| `spec/README.md` (the CCR-QD-441 row, `Used: ARCH-97, ADR-QD-163, CCR-QD-441, BEH-QD-586..590, INV-QD-345..346. Unused: none.`) | 1.226 to 1.227 |
| `.changeset/leaf-needs-stated-once.md` (new, `"@qadi/core": patch`) | n/a |

## The ADR's numbers

Written from the committed `bench/gate/analysis.tsv`, `bench/after/analysis.tsv`, `50-mutation-base.json` and `50-mutation-after.json`; each run's 35-row table is generated from its TSV by script, not typed.

- **Gate (the prototype against the base):** slower 0 of 35, geomean of minima +2.75%, worst +8.7% (`rules FirstApplicable — 8, last applies`). Leaf-heavy rows +6.3% and +6.3%. 1-minute load 2.95 to 4.10.
- **After-run (the shipped source against the base):** slower 0 of 35, geomean +1.87%, worst +9.3% (`anyOf First — 8, last allows`), which the ADR states plainly as 0.7 points inside its 10% band (base spread 2.5%, so the band is the floor); the next worst are +7.7%, +6.8% and +4.6%. Leaf-heavy rows +3.6% (neither input referenced) and +1.5% (both). 1-minute load 1.91 to 2.83. The p50 and mean deltas are in each table beside the deciding statistic.
- **Mutation:** `Walk.ts` 95.05% (307/323) to 94.81% (292/308) with its 16 survivors identical (D-13: leaf-arm detected 64 to 42, outside the arms 243 to 250); `PortAccess.ts` 100% to 100% (47/47); `Predicate.ts` 100% to 100% (293/293); `LeafNeeds.ts` 98.11% (52/53), its one survivor `isActionLeaf`'s predicate, equivalent.

## Spec gates and check:pr

- `pnpm spec:examples`: 116 block(s) compile.
- `pnpm spec:verify:strict`: `PASS: 21 FAIL: 0` after the CCR row (see deviation 1).
- `pnpm check:pr < /dev/null`: **exit 0**, "ran 16 of 17 steps; pnpm mutation was skipped (release PRs run it)", run twice (the first run failed at step 9 `pnpm spec:gates`, deviation 2; the second, after the fix commit, passed all 16). Host load before the second run `3.19 3.46 3.61`; nothing else ran alongside.
- Phase-wide diffs since `phase_base` (`5ab8d0c0`) for `scripts/check-house-style.mjs`, `spec/overview.md`, `AGENTS.md`, every `index.ts` barrel checked (`packages/core/src/index.ts`), `Policy.ts`, `Decision.ts`, `package.json` and `pnpm-lock.yaml`: empty. The only `.changeset` file added since the base is `leaf-needs-stated-once.md`.

## Deviations from Plan

**1. [Rule 3 - Blocking] Task 2's `pnpm spec:verify:strict` cannot pass before Task 3**
- **Found during:** Task 2.
- **Issue:** the strict verifier's `[CCR register coverage]` check reads CCR-QD-441, which the new ADR names, and finds no README row until Task 3 writes it. After Task 2 the run was `PASS: 20 FAIL: 1`, the one failure that check; the INV, ADR and anchor checks all passed. After Task 3 it is `PASS: 21 FAIL: 0`.
- **Fix:** none needed beyond the plan's own Task 3; the commits keep the plan's file split.

**2. [Rule 1 - Bug] ADR-QD-163 named "gate 13" with no command**
- **Found during:** the first `pnpm check:pr`, step 9 `pnpm spec:gates` (`check-dod-table.mjs`: "names gate 13, and the command in this paragraph is step 4").
- **Fix:** the sentence now reads "gate 13 (`check-api-surface.mjs`)". Committed as a separate `docs(50-07)` commit, `c7b4ee28`, rather than rewriting Task 1's commit, so the newest commit touching the ADR is that one-file fix and not Task 1's two-file commit; the plan's Task 1 commit-shape verify is satisfied by `05ca43b3` itself. The ADR's revision stays 1.0 (a new document in the same change, and the README row names Rev 1.0).
- **Files modified:** `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md`.
- **Commit:** `c7b4ee28`.

Nothing else differs from the plan. `requirements.mark-complete` was not run (50-08 ticks the LEAF-* ids, per the orchestrator).

## Known Stubs

None.

## Threat Flags

None. No source, endpoint, `package.json` or lockfile change.

## Self-Check: PASSED

- FOUND: `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md`, `.changeset/leaf-needs-stated-once.md`; the CCR-QD-441 row; `## BEH-QD-586` to `## BEH-QD-590`; `## INV-QD-345`, `## INV-QD-346`.
- FOUND commits `05ca43b3`, `024bc9a6`, `f848d8dd` and `c7b4ee28`, ancestors of HEAD, each ending with the trailer.
- `.planning/config.json` is the only modified tracked file left, as at dispatch.

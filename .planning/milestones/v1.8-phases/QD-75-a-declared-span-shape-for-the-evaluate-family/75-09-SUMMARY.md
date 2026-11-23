---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
plan: 09
subsystem: close
tags: [close, scans, merge-gate, requirements]
phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314
plan_head_before: 44ec969f81a52b7aa5cc8adc6f7e4d32850e93ce
plan_head_after: b957a1555b9d0bcb4a6aeef7824a321bd451d897

requires:
  - phase: QD-75
    provides: "75-01..75-08: the declaration, the writers, the span-key rule, the mutation close, the measured cost and the records"
provides:
  - "The close section of 75-RED-EVIDENCE.md: every close scan, run on the final tree"
  - "pnpm check:pr green on the final tree (17 of 18 steps, mutation skipped)"
  - "ESPN-01 to ESPN-05 marked complete in REQUIREMENTS.md"
affects: []

actuals:
  tokens: 12000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-09-SUMMARY.md
  modified:
    - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-RED-EVIDENCE.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "ESPN-01 to ESPN-05 were marked by hand on the commit check:pr passed on (086a19ba), in one commit that touches ten lines of REQUIREMENTS.md and nothing else; WX-01 to WX-07 stay Pending (no plan marks a WX row)"

requirements-completed: [ESPN-01, ESPN-02, ESPN-03, ESPN-04, ESPN-05]  # marked by hand in b957a155 (the plan forbids requirements.mark-complete); WX-01..07 stay Pending

duration: 4 min
completed: 2026-11-23
status: complete
---

# Phase 75 Plan 09: The close of the evaluate span family Summary

The phase is closed on its final tree: every close scan holds and is recorded, `pnpm check:pr` exits 0 on that tree, and the five
ESPN requirements are marked complete in one commit.

phase_base: c054c2b12fc46fa53fa78e0efa9ff98fd9d60314

## Accomplishments

- **Task 1 (tracer), `086a19ba`:** `## The close on the final tree` in `75-RED-EVIDENCE.md`: span-key counts per file (the four writers and
  `SubjectSet.test.ts`, `GuardHealthCheck.test.ts` 0; `Evaluate.test.ts` 12; `Predicate.test.ts` 3), `qadi.subject_id` spelled once in
  `PortSpanEncode.ts`, the contract's one commit (ecb0256f) and its 33 rows passing in three runs, the barrel, overview, DoD table and
  manifests equal to `phase_base`, api-surface 941, no `packages/` change after the mutation close head (a61a47c4), the forbidden-construct,
  suppression, width and label scans over every added line, the added test titles, house-style, and each earlier evidence section present
  once. It ends `Every scan holds on the final tree.`
- **Task 2, `b957a155`:** `pnpm check:pr < /dev/null` ran alone on `086a19ba` and exited 0; its log ends
  `run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).` The five ESPN checkboxes and table rows were then edited
  by hand to complete; every WX row still reads Pending.

## Task Commits

1. **Task 1 (tracer): every close scan on the final tree, recorded** - `086a19ba` (docs)
2. **Task 2: ESPN-01 to ESPN-05 complete** - `b957a155` (docs)

## Verification

- Task 1 verify (`<S>/verify-09-t1.sh`, the plan's command): before the section existed it failed only at `the evidence does not hold ## The close
  on the final tree exactly once`, having passed every scan before it; after the commit it prints `every close scan holds`, exit 0. The contract
  passed 33 of 33 in each of three runs (`contract-final-1..3.json`).
- Task 2 verify (`<S>/verify-09-t2.sh`): prints `phase closed`, exit 0. `check-pr.status` is 0, `check-pr.head` equals the tree the requirements
  were marked on, and nothing under `packages`, `spec`, `scripts`, the manifests or `.changeset` changed after it.
- Not run: no Stryker, bench or vitest ran beside `check:pr`; no release, publish, push, merge, `changeset version` or `--no-verify`; no
  `requirements.mark-complete`.

## Deviations from Plan

None - plan executed exactly as written. The task 1 verify's check that the contract has one commit uses `git log "$B"..HEAD` rather than a
diff against `phase_base`, so the run-note misfire (the file did not exist on `phase_base`) did not arise.

Note: `qadi.decision` appears in no file under `packages/` outside Markdown, which the verify's second alternative accepts; it is recorded as
such in the evidence.

## Known Stubs

None.

## Threat Flags

None. T-75-19: the requirements were marked only after `check:pr` exited 0, on an unchanged tree, in one commit touching only the ESPN lines.
T-75-20: the changeset is unconsumed and no package version or changelog moved (checked by the verify). T-75-SC: nothing was installed.

## Issues Encountered

None.

## Next Phase Readiness

Phase 75 plans are all complete; ready for phase verification. WX-01 to WX-07 stay Pending by design (they close with the milestone).

## Self-Check: PASSED

- `086a19ba` and `b957a155` are ancestors of HEAD; `git rev-list --count 44ec969f..HEAD` is 2 before this SUMMARY.
- The evidence close section and the REQUIREMENTS.md edit exist; `git status --porcelain -- packages scripts spec .changeset apps AGENTS.md` is empty.

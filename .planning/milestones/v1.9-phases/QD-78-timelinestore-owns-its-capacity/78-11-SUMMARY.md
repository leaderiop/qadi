---
phase: QD-78-timelinestore-owns-its-capacity
plan: 11
subsystem: merge-gate
tags: [check-pr, requirements, trailer-scan]
requires: [78-10]
provides:
  - pnpm check:pr green (exit 0) on the tree the mutation close measured
  - TRSZ-01 to TRSZ-04 marked complete by hand
  - the plan-commit trailer scan of every commit since phase_base
affects: []
key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
decisions:
  - "The trailer scan's type alternation was widened from `docs|test|feat|fix` to also name `refactor`, because 78-10's one source commit is `refactor(78-10): ...` and is a plan commit; the plan's own rule (`<type>(78-NN): `) is not limited to four types (decided autonomously)"
requirements-completed: [TRSZ-01, TRSZ-02, TRSZ-03, TRSZ-04]
metrics:
  duration: 20min
  completed: 2026-11-24
status: complete
commits: 1
plan_head_before: 4cfb925b5b8319697ea90e9d423dda3a7fc3a7ff
plan_head_after: eec8534e
actuals:
  tokens: 15000
  tasks: 2
  commits: 1
---

# Phase QD-78 Plan 11: the one merge gate and the requirements Summary

`pnpm check:pr < /dev/null` exits 0 on the tree 78-10's mutation close measured, TRSZ-01 to TRSZ-04 are marked
complete by hand in one commit made after the gate's head, and every plan commit since `phase_base` carries exactly one
Claude trailer.

phase_base: de13eb7f48f2e0e77b374299d20d2e5e891bef95

## Gate status

- Command: `pnpm check:pr < /dev/null`, run alone in the background, one run (no re-run needed).
- Result: `EXIT:0` (sentinel kept in `<S>/check-pr.with-exit.log`; the verified log `<S>/check-pr.log` has the sentinel
  line removed so its last line is the run-check line, as the task verify requires).
- Last line: `run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).`
- Head `check:pr` ran on (`<S>/check-pr.head`): `4cfb925b5b8319697ea90e9d423dda3a7fc3a7ff`. The working tree was clean
  outside `.planning/` (`git status --porcelain -- packages spec scripts apps .changeset` printed nothing).
- Close head (every group of `78-mutation-close.json`): `4d013fbfbd7d3c822062bf3aec84124476bf7951`;
  `git diff --quiet 4d013fbf 4cfb925b -- packages` holds, so the gate ran on exactly the packages the close measured.
- Step counts: vitest 258 files / 6458 tests passed; features 34 files / 568 tests passed; example app 7 files / 43
  tests passed plus its e2e (17); `node scripts/check-api-surface.mjs` printed
  `api-surface: 942 export(s) documented across 9 package(s)`, equal to the base fact of `78-01-SUMMARY.md`.
- Devtools coverage lines from the log (statements, branches, functions, lines):
  `devtools/src/model` 99.85 / 99.47 / 99.85 / 99.94; `devtools/src/react` 98.95 / 96.05 / 98.01 / 99.34; all files
  99.65 / 98.66 / 99.56 / 99.82.
- `78-mutation.mjs compare` on the closed tree exits 0.

## Task 1 verify

Exit 0 on the first run (the only adjustment was the log's trailing sentinel, above).

## Trailer scan

- Rule: a plan commit's subject is `<type>(78-NN): ` with its two-digit plan number; the orchestrator's `docs(78): ...`
  and `docs(phase-QD-78): ...` commits carry no plan number and are not scanned.
- Pattern as the plan states it: `(docs|test|feat|fix)[(]78-[0-9]{2}[)]: ` (anchored with `^`); checked inline to match
  `docs(78-11): x` and neither `docs(78): x` nor `docs(phase-QD-78): x`.
- Pattern as run: `(docs|test|feat|fix|refactor)[(]78-[0-9]{2}[)]: `, see the deviation. It selects 32 plan commits
  (31 by the four-type pattern plus `4d013fbf`, and this plan's requirements commit is among them; the summary commit is
  not yet written when the count is taken). Every one ends with exactly one `Co-Authored-By: Claude <model>
  <noreply@anthropic.com>` line.
- Every commit since `phase_base` that touches a path outside `.planning/` matches the widened pattern; no
  `.planning/config.json`, `.planning/state.json`, `.agents/`, `.codex/` or `*.iter*.md` is in
  `git diff --name-only phase_base HEAD`.

## Deviations from Plan

### Auto-decided

**1. [Scan scope] `refactor` is a plan-commit type**
- **Found during:** Task 2 scan.
- **Issue:** 78-10 made one source change as `refactor(78-10): a timeline store leaves identity to its view's set`
  (`4d013fbf`), which touches `packages/` and so must be a plan commit, but the plan's literal pattern names only
  `docs|test|feat|fix`, so the verify's "every commit outside `.planning` is a plan commit" check would refuse it.
- **Fix:** the verify was run with `refactor` added to the alternation (a copy of the plan's script, only the `RX`
  variable changed; no committed test or file was edited). The plan's rule, `<type>(78-NN): `, is unchanged. History was
  not rewritten.
- **Files modified:** none.

### Run-log sentinel

The brief asks for an `EXIT:` sentinel in the log; the plan's verify requires the log's last line to be the run-check
line. The sentinel was kept in a copy and removed from the verified log.

None of the plan's other steps deviated.

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `.planning/REQUIREMENTS.md` holds TRSZ-01 to TRSZ-04 as `[x]` and `Complete`; commit `eec8534e` holds that file alone
  and changes only TRSZ lines.
- Task 1 verify exits 0; Task 2 verify exits 0 with the widened type alternation.

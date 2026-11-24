---
phase: QD-78-timelinestore-owns-its-capacity
plan: 01
subsystem: devtools-model-mutation
tags: [mutation-base, stryker, devtools]
requires: []
provides:
  - the mutation floor of Timeline.ts, TimelineStore.ts, TimelineFeed.ts and DockModel.ts at the phase base
  - the base gate lines and the devtools test count
affects: [78-02, 78-03, 78-04, 78-05, 78-06, 78-10, 78-11]
key-files:
  created:
    - .planning/phases/QD-78-timelinestore-owns-its-capacity/78-mutation.mjs
    - .planning/phases/QD-78-timelinestore-owns-its-capacity/78-mutation-base.json
  modified: []
decisions:
  - "The base is recorded as measured: a line or score that differs from the plan-time figure is kept and explained"
requirements-completed: []
metrics:
  duration: 25min
  completed: 2026-11-24
status: complete
commits: 1
plan_head_before: de13eb7f48f2e0e77b374299d20d2e5e891bef95
plan_head_after: 34c0e60d3e5c395528e0cd9056e929172d596370
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
---

# Phase QD-78 Plan 01: the mutation base of the four model files Summary

The phase scorer `78-mutation.mjs` (four groups, no close-only group, `--self-test` ends `self-test: 31 passed`) and the
Stryker record of `Timeline.ts`, `TimelineStore.ts`, `TimelineFeed.ts` and `DockModel.ts`, measured on the untouched phase
base and committed alone before any test or source file of the phase changes.

phase_base: de13eb7f48f2e0e77b374299d20d2e5e891bef95

`phase_base` equals `4caa3427` on every path outside `.planning/` (`git diff --quiet` over `packages spec scripts
features apps examples AGENTS.md stryker.devtools.mjs .changeset package.json pnpm-lock.yaml` holds). The same sha is in
`<S>/phase_base`, with `<S>` = `$(cd "${TMPDIR:-/tmp}" && pwd -P)/qd78`.

## Base facts

```
house-style: 590 file(s) clean (3 declared switch(es), 75 type-test file(s))
api-surface: 942 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 159 reference(s) resolve
doc-examples: 118 block(s) compile
devtools-claims: 8 claim(s) registered across 6 file(s)
website-doc-examples: 73 block(s) compile
Qadi specification verification
| Status | Check                                      | Detail
| ------ | ------------------------------------------ | ------
| PASS   | appendices/index.yaml -> disk              | 1 entr(y|ies) resolve
| PASS   | appendices/ disk -> index.yaml             | no orphans
| PASS   | behaviors/index.yaml -> disk               | 34 entr(y|ies) resolve
| PASS   | behaviors/ disk -> index.yaml              | no orphans
| PASS   | decisions/index.yaml -> disk               | 147 entr(y|ies) resolve
| PASS   | decisions/ disk -> index.yaml              | no orphans
| PASS   | devtools-spec/index.yaml -> disk           | 5 entr(y|ies) resolve
| PASS   | devtools-spec/ disk -> index.yaml          | no orphans
| PASS   | models/index.yaml -> disk                  | 38 entr(y|ies) resolve
| PASS   | models/ disk -> index.yaml                 | no orphans
| PASS   | process/index.yaml -> disk                 | 3 entr(y|ies) resolve
| PASS   | process/ disk -> index.yaml                | no orphans
| PASS   | invariants -> traceability                 | all 172 invariant(s) traced
| PASS   | decisions -> traceability                  | 147 ADR(s) traced
| PASS   | ADR Document ID = file number              | 123 ADR(s) agree
| PASS   | urs -> traceability table                  | 38 requirement(s) traced
| PASS   | features -> traceability                   | all REQ tags defined
| PASS   | relative link integrity                    | 5163 link(s) resolve, none gitignored
| PASS   | §4 test files -> disk                     | 331 file(s) exist
| PASS   | CCR register coverage                      | known, tracked gap unchanged: 078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137
| PASS   | Revision = newest history entry            | every header agrees
PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
reservation-sha256: 6ecf5abaa27f01c2111be0eef954e393e3a176b7d0c611f3a980f506fe904b56
devtools-tests: Tests  1793 passed (1793)
```

No base fact differs from the plan-time evidence (942 exports across 9 packages; 3 declared switches and 75 type-test
files; reservation sha256 `6ecf5aba...`; strict traceability `FAIL: 0`). The reservation file holds `{CCR 472, ADR 193,
BEH 740, INV 406}`, as at plan time.

- differs from plan time: dock base score 70/70, where ADR-QD-168 recorded `DockModel.ts` at `1 (145/145)` (the score is
  still 1; this run's report holds 70 valid mutants under `ignoreStatic: true`, so the count is not the ADR's, and the
  close compares with 70/70, never with 145/145)

## Mutation base

Each group measured alone, stdin closed, by `pnpm exec stryker run stryker.devtools.mjs --mutate <file>` and recorded by
`node 78-mutation.mjs record base <group>`; every group's `head` is `phase_base`. Files are
`packages/devtools/src/model/<name>`.

| Group | File | detected/valid | Survived | No coverage | Ignored |
| ----- | ---- | -------------- | -------- | ----------- | ------- |
| timeline | Timeline.ts | 107/107 | 0 | 0 | 10 |
| store | TimelineStore.ts | 32/33 | 1 | 0 | 1 |
| feed | TimelineFeed.ts | 50/50 | 0 | 0 | 10 |
| dock | DockModel.ts | 70/70 | 0 | 0 | 10 |

dock base score: 70/70

The one open mutant at the base: `TimelineStore.ts:58` `ConditionalExpression -> false` (Survived). The close compares
with it by the removed-mutant rule; a test that kills it only lifts the score.

Ignored mutants, by line (`line:column`), which 78-10 compares the close with:

- `Timeline.ts`: 29:56 StringLiteral, 53:54 StringLiteral, 90:26, 102:25, 111:23, 174:18, 180:24, 186:14, 188:18, 245:15 ArrowFunction (`() => undefined`). The module-scope `bound` is among them.
- `TimelineStore.ts`: 92:36 StringLiteral.
- `TimelineFeed.ts`: 93:45 ArrayDeclaration, 95:17 ArrowFunction, 106:44 ObjectLiteral, 107:14, 108:16, 112:13 ArrowFunction, 116:58 ObjectLiteral, 117:14, 118:16 ArrowFunction, 123:43 StringLiteral. The `bounded` and `idleTimeline` members are among them.
- `DockModel.ts`: 117:24 ObjectLiteral, 118:16, 119:11, 120:13 ArrowFunction, 129:24 ObjectLiteral, 130:15, 131:11, 132:13 ArrowFunction, 180:39 ArrayDeclaration, 183:40 StringLiteral.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 and 2 | $A | `78-mutation.mjs`, `78-mutation-base.json` |

Both tasks' record work is held in the one commit the plan demands (the first after `phase_base`, holding exactly the
scorer and its record); the tracer (the store group end to end) ran before the other three groups, and its verify passed
before they were measured.

## Verification

- Task 1 verify: exit 0 (phase base equals `4caa3427` outside `.planning`; self-test `self-test: 31 passed`; oxlint
  clean; the scorer names the four files and no Phase 77 material or close-only group; the store record at `phase_base`).
- Task 2 verify: exit 0 (four groups at `phase_base`; the house-style and api-surface lines equal a fresh run; strict
  traceability `FAIL: 0`; the reservation sha256 equals the file; the base commit is first after `phase_base` and holds
  exactly the scorer and its record with one trailer; every base fact is in this file; nothing outside `.planning` changed).

## Self-Check: PASSED

Files found: `78-mutation.mjs`, `78-mutation-base.json`; commit `34c0e60d` is an ancestor of HEAD.

## Deviations from Plan

None. The plan executed as written.

## Decisions Made

- The base is recorded as measured, including the one open mutant at `TimelineStore.ts:58` and the dock's 70/70.
- Task 1's tracer ran the store group alone before the other three; the three were then run one at a time by a single
  background script, each Stryker run finishing before the next began and nothing else of this repository running.

## Known Stubs

None.

## Threat Flags

None.

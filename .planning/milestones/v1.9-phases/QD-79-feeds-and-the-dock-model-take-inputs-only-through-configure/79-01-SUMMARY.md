---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 01
subsystem: devtools-model-mutation
tags: [mutation-base, stryker, devtools]
requires: []
provides:
  - the mutation floor of TimelineFeed.ts, DiagnosticsFeed.ts, GatesFeed.ts, ExternalStore.ts and DockModel.ts at the phase base
  - the base gate lines and the devtools test count
affects: [79-02, 79-03, 79-04, 79-05, 79-06, 79-07, 79-08, 79-09, 79-16, 79-17]
key-files:
  created:
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-mutation.mjs
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-mutation-base.json
  modified: []
key-decisions:
  - "The base is recorded as measured: a line or score that differs from the plan-time figure is kept and explained"
requirements-completed: [WX-05, WX-06, WX-07]
metrics:
  duration: 20min
  completed: 2026-11-24
status: complete
commits: 1
plan_head_before: 910cb7838ac562608880f8e3b067fb2cc4c014b3
plan_head_after: 70cb0901055a2954f702c8e9704ddd810fe34ad2
actuals:
  tokens: 8000
  tasks: 2
  commits: 1
coverage:
  - deliverable: "79-mutation.mjs, the phase scorer with five groups and no close-only group, self-test 32 passed"
    verification:
      - kind: command
        ref: "node 79-mutation.mjs --self-test (ends self-test: 32 passed); pnpm exec oxlint 79-mutation.mjs"
        status: pass
    human_judgment: false
  - deliverable: "79-mutation-base.json, the five groups measured on one commit and committed alone, first"
    verification:
      - kind: command
        ref: "the plan's Task 1 and Task 2 verify one-liners"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 01: the mutation base of the five model files Summary

The phase scorer `79-mutation.mjs` (five groups, no close-only group, `--self-test` ends `self-test: 32 passed`) and the
Stryker record of `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `ExternalStore.ts` and `DockModel.ts`,
measured on the untouched phase base and committed alone before any test or source file of the phase changes.

phase_base: 910cb7838ac562608880f8e3b067fb2cc4c014b3

`phase_base` is the orchestrator's planning commit; it equals `775043dd` on every path outside `.planning/` (`git diff
--quiet` over `packages spec scripts features apps examples AGENTS.md stryker.devtools.mjs .changeset package.json
pnpm-lock.yaml` holds). The same sha is in `<S>/phase_base`, with `<S>` = `$(cd "${TMPDIR:-/tmp}" && pwd -P)/qd79`.

## Base facts

```
house-style: 590 file(s) clean (3 declared switch(es), 75 type-test file(s))
api-surface: 942 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 161 reference(s) resolve
doc-examples: 118 block(s) compile
devtools-claims: 8 claim(s) registered across 6 file(s)
website-doc-examples: 74 block(s) compile
Qadi specification verification
| Status | Check                                      | Detail
| ------ | ------------------------------------------ | ------
| PASS   | appendices/index.yaml -> disk              | 1 entr(y|ies) resolve
| PASS   | appendices/ disk -> index.yaml             | no orphans
| PASS   | behaviors/index.yaml -> disk               | 34 entr(y|ies) resolve
| PASS   | behaviors/ disk -> index.yaml              | no orphans
| PASS   | decisions/index.yaml -> disk               | 148 entr(y|ies) resolve
| PASS   | decisions/ disk -> index.yaml              | no orphans
| PASS   | devtools-spec/index.yaml -> disk           | 5 entr(y|ies) resolve
| PASS   | devtools-spec/ disk -> index.yaml          | no orphans
| PASS   | models/index.yaml -> disk                  | 38 entr(y|ies) resolve
| PASS   | models/ disk -> index.yaml                 | no orphans
| PASS   | process/index.yaml -> disk                 | 3 entr(y|ies) resolve
| PASS   | process/ disk -> index.yaml                | no orphans
| PASS   | invariants -> traceability                 | all 174 invariant(s) traced
| PASS   | decisions -> traceability                  | 148 ADR(s) traced
| PASS   | ADR Document ID = file number              | 124 ADR(s) agree
| PASS   | urs -> traceability table                  | 38 requirement(s) traced
| PASS   | features -> traceability                   | all REQ tags defined
| PASS   | relative link integrity                    | 5204 link(s) resolve, none gitignored
| PASS   | §4 test files -> disk                     | 331 file(s) exist
| PASS   | CCR register coverage                      | known, tracked gap unchanged: 078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137
| PASS   | Revision = newest history entry            | every header agrees
PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
reservation-sha256: 6ecf5abaa27f01c2111be0eef954e393e3a176b7d0c611f3a980f506fe904b56
devtools-tests: Tests  1819 passed (1819)
```

The house-style line, the api-surface line and the reservation sha256 equal the plan-time evidence (3 declared
switches and 75 type-test files; 942 exports across 9 packages; `6ecf5aba...`, the file holding `{CCR 472, ADR 193, BEH
740, INV 406}`), and strict traceability reads `FAIL: 0`.

- differs from plan time: the dod-table and website-doc-examples lines read 161 references and 74 blocks, where Phase
  78's close printed 159 and 73 (the plan gave no figure for either; the planning commits since added a reference and a
  compiled block, so the base is what the commands print)

## Mutation base

Each group measured alone, stdin closed, by `pnpm exec stryker run stryker.devtools.mjs --mutate <file>` and recorded by
`node 79-mutation.mjs record base <group>`; every group's `head` is `phase_base`. Files are
`packages/devtools/src/model/<name>`.

| Group | File | detected/valid | Survived | No coverage | Ignored |
| ----- | ---- | -------------- | -------- | ----------- | ------- |
| timeline | TimelineFeed.ts | 41/41 | 0 | 0 | 10 |
| diagnostics | DiagnosticsFeed.ts | 73/73 | 0 | 0 | 13 |
| gates | GatesFeed.ts | 117/117 | 0 | 0 | 3 |
| store | ExternalStore.ts | 77/78 | 1 | 0 | 2 |
| dock | DockModel.ts | 72/72 | 0 | 0 | 10 |

dock base score: 72/72

The one open mutant at the base: `ExternalStore.ts:113` `ConditionalExpression -> false` (Survived). The close compares
with it by the removed-mutant rule; a test that kills it only lifts the score. `TimelineFeed.ts` holds 41/41 and
`DockModel.ts` 72/72, as Phase 78's close left them.

Ignored mutants, by line (`line:column`), which 79-16 compares the close with:

- `TimelineFeed.ts`: 101:45 ArrayDeclaration, 122:44 ObjectLiteral, 123:14, 124:16, 127:11, 129:13 ArrowFunction, 133:58 ObjectLiteral, 134:14, 135:16 ArrowFunction, 140:43 StringLiteral.
- `DiagnosticsFeed.ts`: 70:52 ObjectLiteral, 76:57 ObjectLiteral, 88:24 ObjectLiteral, 89:10, 90:15, 91:11, 92:14 ArrowFunction, 121:14 ArrowFunction, 121:70 ObjectLiteral, 122:14, 123:16, 135:32 ArrowFunction, 139:46 StringLiteral.
- `GatesFeed.ts`: 99:24 StringLiteral, 125:20 ArrowFunction, 128:40 StringLiteral.
- `ExternalStore.ts`: 112:29 ArrowFunction, 166:43 StringLiteral.
- `DockModel.ts`: 135:24 ObjectLiteral, 136:16, 137:11, 138:13 ArrowFunction, 147:24 ObjectLiteral, 148:15, 149:11, 150:13 ArrowFunction, 198:39 ArrayDeclaration, 201:40 StringLiteral.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 and 2 | 70cb0901 | `79-mutation.mjs`, `79-mutation-base.json` |

Both tasks' record work is held in the one commit the plan demands (the first after `phase_base`, holding exactly the
scorer and its record). The tracer (the store group end to end) ran first and its verify passed before the other four
were measured; the four were then run one at a time by a single background script, each Stryker run finishing before
the next began and nothing else of this repository running.

## Verification

- Task 1 verify: exit 0 (phase base equals `775043dd` outside `.planning`; self-test `self-test: 32 passed`; oxlint
  clean; the scorer names the five files, no Phase 78 material and no close-only group; the store record at `phase_base`).
- Task 2 verify: exit 0 (five groups at `phase_base`; the house-style and api-surface lines equal a fresh run; strict
  traceability `FAIL: 0`; the reservation sha256 equals the file; the base commit is first after `phase_base` and holds
  exactly the scorer and its record with one trailer; every base fact is in this file; nothing outside `.planning` changed).

## Deviations from Plan

None. The plan executed as written.

## Decisions Made

- The base is recorded as measured, including the one open mutant at `ExternalStore.ts:113` and the dock's 72/72.
- The base-facts file keeps the traceability table as printed, so a later plan reads a fact with `grep "^api-surface: "`.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Files found: `79-mutation.mjs`, `79-mutation-base.json`; commit `70cb0901` is an ancestor of HEAD.

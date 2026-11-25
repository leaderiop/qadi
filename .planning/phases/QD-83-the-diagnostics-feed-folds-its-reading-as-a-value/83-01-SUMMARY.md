---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
plan: 01
subsystem: testing
tags: [mutation-testing, stryker, check-scripts, devtools, diagnostics]
requires:
  - phase: QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws
    provides: the rename-unaware scorer and the check helper this plan copies
  - phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
    provides: the report guard (a report whose config.mutate is not the record's own file list is refused)
provides:
  - the mutation floor of DiagnosticsFeed.ts, DiagnosticsStore.ts and DockModel.ts measured on the phase base
  - a rename-aware scorer with an absolute bar on the two diagnostics files
  - 83-check.mjs with the no-store, single-fold, stale-path and registers modes, each seen failing
affects: [83-02, 83-03, 83-04, 83-05, 83-06, 83-07, 83-08, 83-09, 83-10, 83-11]
phase_base: bc02e8e625eed08227910dfdfd4544ae66ed23ca
plan_head_before: bc02e8e625eed08227910dfdfd4544ae66ed23ca
plan_head_after: 626faa060ef90dfd4b9a16caab56a3d95c56c6b8
actuals:
  tokens: 24825
  tasks: 3
  commits: 2
tech-stack:
  added: []
  patterns: [rename-aware mutant line mapping through git diff -M -U0, pure judges over text with a thin reader, scratch edits restored by cp]
key-files:
  created:
    - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-mutation.mjs
    - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-mutation-base.json
    - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-check.mjs
    - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-RED-EVIDENCE.md
  modified: []
key-decisions:
  - "The scorer keys a base record by base paths and a close record by close paths (RENAMED maps close to base), so one group measures the module across its rename"
requirements-completed: []
duration: 25min
completed: 2026-11-25
status: complete
---

# Phase 83 Plan 01: The phase base measured and the phase checks committed Summary

Rename-aware Stryker scorer and base record of the three diagnostics model files (182/182 detected, no open mutant), plus
`83-check.mjs` whose ten run modes were each seen failing, with the three structural modes failing on the base for the
reasons the phase removes.

phase_base: bc02e8e625eed08227910dfdfd4544ae66ed23ca

## What was done

- **Task 1 (`38fb5b28`).** `83-mutation.mjs` is `81-mutation.mjs` with its directory read from `import.meta.url`, one group
  `diagnostics`, a `RENAMED` map (close path to base path) with `filesFor(name, group)` feeding the invocation, the dirty-tree
  guard, the report guard and the tally, `compare` diffing `git diff -M -U0 <base head> <close head> -- <base path> <close
  path>` through `judgeGroup`/`diffArgs`, Phase 82's report guard (`reportReasons`, a report whose `config.mutate` is not
  the record's own file list is refused), and `ABSOLUTE` (no open mutant in `DiagnosticsFeed.ts` or `Diagnostics.ts` at the
  close, whatever the base held). The self-test ends `self-test: 44 passed`. Stryker ran alone, stdin closed, with the
  group's exact invocation (214 mutants, 68 s), and `83-mutation-base.json` records it on `phase_base`. It is the first
  commit after `phase_base`, alone.
- **Task 2.** The base facts below were measured, not written: the gate lines match a fresh run, the reservation sha256 is the
  file's own, the devtools suite is green, and the earlier phase checks print the lines the plan expected.
- **Task 3 (`626faa06`).** `83-check.mjs` (self-test `self-test: 177 passed`, oxlint clean) and `83-RED-EVIDENCE.md`. Every
  run mode has a `- check failed: <mode>:` line: `commit`, `unchanged`, `seen-failing`, `scan-ids`, `scan-forbidden`,
  `trailers` (in a scratch repository whose plan commit carries two trailers), `registers` (copy-backed edit of
  `scripts/check-house-style.mjs`, restored with `cp`), and `no-store`, `single-fold`, `stale-path` on the base tree with
  every stderr line each prints. After the restores `git status --porcelain -- packages scripts AGENTS.md` printed nothing.

## Base facts

```
house-style: 610 file(s) clean (3 declared switch(es), 77 type-test file(s))
api-surface: 942 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 171 reference(s) resolve
doc-examples: 119 block(s) compile
devtools-claims: 8 claim(s) registered across 6 file(s)
website-doc-examples: 76 block(s) compile

Qadi specification verification
| Status | Check                                      | Detail
| ------ | ------------------------------------------ | ------
| PASS   | appendices/index.yaml -> disk              | 1 entr(y|ies) resolve
| PASS   | appendices/ disk -> index.yaml             | no orphans
| PASS   | behaviors/index.yaml -> disk               | 34 entr(y|ies) resolve
| PASS   | behaviors/ disk -> index.yaml              | no orphans
| PASS   | decisions/index.yaml -> disk               | 152 entr(y|ies) resolve
| PASS   | decisions/ disk -> index.yaml              | no orphans
| PASS   | devtools-spec/index.yaml -> disk           | 5 entr(y|ies) resolve
| PASS   | devtools-spec/ disk -> index.yaml          | no orphans
| PASS   | models/index.yaml -> disk                  | 38 entr(y|ies) resolve
| PASS   | models/ disk -> index.yaml                 | no orphans
| PASS   | process/index.yaml -> disk                 | 3 entr(y|ies) resolve
| PASS   | process/ disk -> index.yaml                | no orphans
| PASS   | invariants -> traceability                 | all 182 invariant(s) traced
| PASS   | decisions -> traceability                  | 152 ADR(s) traced
| PASS   | ADR Document ID = file number              | 128 ADR(s) agree
| PASS   | urs -> traceability table                  | 38 requirement(s) traced
| PASS   | features -> traceability                   | all REQ tags defined
| PASS   | relative link integrity                    | 5436 link(s) resolve, none gitignored
| PASS   | §4 test files -> disk                     | 350 file(s) exist
| PASS   | CCR register coverage                      | known, tracked gap unchanged: 078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137
| PASS   | Revision = newest history entry            | every header agrees

PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)

reservation-sha256: e9c52607f228412910c66caaacc19c7a5dfb85ac5fa34266c7bd63c250a4d313
devtools-tests: Tests  1941 passed (1941)
81-archived: 79-pinned-check.mjs: exit 1: packages/devtools/test/model/TimelineFeed.test.ts: TF29: an assertion or a line other than a construction changed
81-archived: 79-characterisation-check.mjs: exit 0: characterisation: packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx holds its first commit (cf3186d9)
81-archived: 80-pinned-check.mjs --all-applied: exit 0: pinned: 4 files hold their base text, 4 of 4 declared edits applied
81-archived: 80-characterisation-check.mjs --all-flipped: exit 0: characterisation: packages/react/test/InstrumentToggle.characterisation.test.tsx holds its first commit (2cca1f46), 1 of 1 flips applied
81-archived: 80-characterisation-check.mjs --red-recorded: exit 0: red-recorded: every flip has its red line
81-pinned: pinned: 8 files hold their base text, 4 of 4 declared flips applied
81-single-source: single-source: one collect loop, in callAll
```

- differs from plan time: none (every gate line, the reservation sha256, the archived-check lines with the one expected TF29
  flip, the pinned line and the single-source line are the plan-time evidence; the devtools suite is 88 files, 1941 tests,
  and doc-examples and website-doc-examples were not in the plan-time list)

diagnostics base score: 182/182
base packages/devtools/src/model/DiagnosticsFeed.ts: 60/0/0/14
  ignored: 70 ObjectLiteral, 76 ObjectLiteral, 88 ObjectLiteral, 89 ArrowFunction, 90 ArrowFunction, 91 ArrowFunction, 92 ArrowFunction, 122 ArrowFunction, 122 ObjectLiteral, 123 ArrowFunction, 124 ArrowFunction, 136 ArrowFunction, 148 ArrowFunction, 163 StringLiteral; open: none
base packages/devtools/src/model/DiagnosticsStore.ts: 57/0/0/6
  ignored: 91 ObjectLiteral, 93 ArrayDeclaration, 132 ArrowFunction, 161 ArrowFunction, 238 StringLiteral, 268 StringLiteral; open: none
base packages/devtools/src/model/DockModel.ts: 65/0/0/12
  ignored: 181 ArrowFunction, 209 ArrowFunction, 257 ObjectLiteral, 258 ArrowFunction, 259 ArrowFunction, 260 ArrowFunction, 269 ObjectLiteral, 270 ArrowFunction, 271 ArrowFunction, 272 ArrowFunction, 326 ArrayDeclaration, 335 StringLiteral; open: none

earlier checks: node .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-archived-checks.mjs, node .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-pinned-check.mjs, node .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-check.mjs single-source

## Deviations from Plan

None - plan executed exactly as written. Three implementation choices the plan left open:

- `judge` takes the absolute-file list as a parameter (default `ABSOLUTE`) so the self-test can judge one renamed file with and
  without the bar; `compare` reads each group through a pure `judgeGroup(group, base, close, diffOf)` so the rename mapping
  is driven by the self-test with a planted `-M` diff.
- The `closeOnly` branches of 81's scorer (no group here uses them) and its `judgeNew` cases were kept, as the plan says the
  self-test keeps every 81 case.
- `registers` fails with `the budget holds 0 Diagnostics type-test keys, not one:` when the key is moved out of the
  `Diagnostics*.tst.ts` family (the evidence line), and with a per-register reason pair when it moves inside the family
  (driven by the self-test).

## Known Stubs

None.

## Threat Flags

None. Nothing outside `.planning/` changed; no package was installed.

## Self-Check: PASSED

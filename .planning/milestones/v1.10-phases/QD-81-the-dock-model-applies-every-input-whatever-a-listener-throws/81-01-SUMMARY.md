---
phase: QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws
plan: 01
subsystem: devtools-model-mutation
tags: [mutation-base, stryker, devtools, phase-check, single-source]
requires: []
provides:
  - the mutation floor of the five model files at the phase base, committed alone and first
  - the base gate lines, the devtools test count and the archived v1.9 checks' result on the base
  - 81-check.mjs, the shared commit, unchanged, seen-failing, scan, trailer and single-source check
  - 81-archived-checks.mjs, the runner of the archived Phase 79 and 80 checks from a scratch copy
affects: [81-02, 81-03, 81-04, 81-05, 81-06, 81-07, 81-08, 81-09, 81-10, 81-11]
key-files:
  created:
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-mutation.mjs
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-mutation-base.json
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-archived-checks.mjs
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-check.mjs
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-RED-EVIDENCE.md
  modified: []
key-decisions:
  - "The base is recorded as measured: SimulationSession.ts holds 6 Survived mutants (lines 310, 313 twice, 317, 319 and 402) on the phase base, so its floor is 242/248, not a full score; the compare rule passes a survivor the base already had"
  - "81-characterisation-check.mjs holds no directory constant, so the runner copies it verbatim; only the two pinned checks, 80-check.mjs and 80-characterisation-check.mjs are repointed"
  - "single-source judges the comment-and-string blanked text and adds two reasons beyond the plan's list, a callAll that holds no collect loop and a tree that builds no AggregateError, so the check cannot pass with nothing to read"
requirements-completed: [COLL-03, WX-04, WX-05, WX-06, WX-07]
metrics:
  duration: 15min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: e757ef370731c8388de9924e6ad1744cd6363e89
plan_head_after: a24a403312854717d8fafaef7733958eb02bc004
actuals:
  tokens: 18008
  tasks: 3
  commits: 2
coverage:
  - id: D1
    description: "81-mutation.mjs, the phase scorer over the model group, self-test 28 passed"
    requirement: WX-05
    verification:
      - kind: command
        ref: "node 81-mutation.mjs --self-test (ends self-test: 28 passed); pnpm exec oxlint 81-mutation.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "81-mutation-base.json, the model group measured on phase_base and committed alone, first"
    requirement: WX-06
    verification:
      - kind: command
        ref: "the plan's Task 1 verify one-liner"
        status: pass
    human_judgment: false
  - id: D3
    description: "81-check.mjs with a passing self-test and the single-source mode; 81-RED-EVIDENCE.md holds each run mode failing once"
    requirement: COLL-03
    verification:
      - kind: command
        ref: "the plan's Task 3 verify one-liner"
        status: pass
    human_judgment: false
  - id: D4
    description: "81-archived-checks.mjs runs the five archived checks from a scratch copy; all exit 0 on the base"
    requirement: WX-07
    verification:
      - kind: command
        ref: "node 81-archived-checks.mjs"
        status: pass
    human_judgment: false
---

# Phase QD-81 Plan 01: the mutation base of the five model files and the phase checks Summary

The Stryker record of `ExternalStore.ts`, `DockModel.ts`, `TimelineFeed.ts`, `DiagnosticsFeed.ts` and
`SimulationSession.ts` measured on the untouched phase base by a scorer copied from Phase 80's and committed alone and
first, the base gate lines, a runner for the archived v1.9 checks, and `81-check.mjs`, the shared check every later plan
calls, with each run mode seen failing once and its `single-source` mode failing on the base for the three reasons the
promotion of the collect-and-rethrow rule removes.

phase_base: e757ef370731c8388de9924e6ad1744cd6363e89

## Performance

- **Duration:** about 15 min (2026-11-24)
- **Tasks:** 3 (one tracer, two auto)
- **Files created:** 5, all under `.planning/phases/QD-81-…/`
- **Commits:** `34d1e005` (the base record, first after `phase_base`, alone), `a24a4033` (the check helpers)

## Accomplishments

- `81-mutation.mjs` is `80-mutation.mjs` with its directory read from `import.meta.url`, one `model` group over the five
  files through `stryker.devtools.mjs`, `UNMEASURED` and `EXAMINED` empty; its self-test ends `self-test: 28 passed`.
- `81-mutation-base.json` holds the `model` group measured on `phase_base` (492 detected of 498 valid).
- `81-archived-checks.mjs` copies the archived Phase 79 and 80 check scripts to `<scratch>/v19/` with only their
  directory constants repointed and runs five checks; all exit 0 on the base and the archive is unchanged.
- `81-check.mjs` (self-test `125 passed`) gains `single-source` and a module-scope-string-literal rule in `scan-forbidden`;
  its `branch` mode is dropped. `81-RED-EVIDENCE.md` records every run mode failing once.

## Base facts

```
house-style: 604 file(s) clean (3 declared switch(es), 77 type-test file(s))
api-surface: 942 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 167 reference(s) resolve
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
| PASS   | decisions/index.yaml -> disk               | 150 entr(y|ies) resolve
| PASS   | decisions/ disk -> index.yaml              | no orphans
| PASS   | devtools-spec/index.yaml -> disk           | 5 entr(y|ies) resolve
| PASS   | devtools-spec/ disk -> index.yaml          | no orphans
| PASS   | models/index.yaml -> disk                  | 38 entr(y|ies) resolve
| PASS   | models/ disk -> index.yaml                 | no orphans
| PASS   | process/index.yaml -> disk                 | 3 entr(y|ies) resolve
| PASS   | process/ disk -> index.yaml                | no orphans
| PASS   | invariants -> traceability                 | all 178 invariant(s) traced
| PASS   | decisions -> traceability                  | 150 ADR(s) traced
| PASS   | ADR Document ID = file number              | 126 ADR(s) agree
| PASS   | urs -> traceability table                  | 38 requirement(s) traced
| PASS   | features -> traceability                   | all REQ tags defined
| PASS   | relative link integrity                    | 5307 link(s) resolve, none gitignored
| PASS   | §4 test files -> disk                     | 345 file(s) exist
| PASS   | CCR register coverage                      | known, tracked gap unchanged: 078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137
| PASS   | Revision = newest history entry            | every header agrees

PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)

reservation-sha256: e9c52607f228412910c66caaacc19c7a5dfb85ac5fa34266c7bd63c250a4d313
devtools-tests: Tests  1906 passed (1906)
79-pinned-check.mjs: exit 0: pinned: 15 tests hold their assertions
79-characterisation-check.mjs: exit 0: characterisation: packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx holds its first commit (cf3186d9)
80-pinned-check.mjs --all-applied: exit 0: pinned: 4 files hold their base text, 4 of 4 declared edits applied
80-characterisation-check.mjs --all-flipped: exit 0: characterisation: packages/react/test/InstrumentToggle.characterisation.test.tsx holds its first commit (2cca1f46), 1 of 1 flips applied
80-characterisation-check.mjs --red-recorded: exit 0: red-recorded: every flip has its red line
```

- differs from plan time: none. Every gate line, the reservation sha256, the five archived-check lines and the strict
  traceability result are the plan-time evidence; the devtools suite is 85 files, 1906 tests.

model base score: 492/498
base packages/devtools/src/model/ExternalStore.ts: 88/0/0/3
  ignored: 112 ArrowFunction, 154 ArrowFunction, 182 StringLiteral
base packages/devtools/src/model/DockModel.ts: 69/0/0/12
  ignored: 178 ArrowFunction, 206 ArrowFunction, 251 ObjectLiteral, 252 ArrowFunction, 253 ArrowFunction, 254 ArrowFunction, 263 ObjectLiteral, 264 ArrowFunction, 265 ArrowFunction, 266 ArrowFunction, 314 ArrayDeclaration, 323 StringLiteral
base packages/devtools/src/model/TimelineFeed.ts: 35/0/0/11
  ignored: 109 ArrowFunction, 117 ArrayDeclaration, 138 ObjectLiteral, 139 ArrowFunction, 140 ArrowFunction, 143 ArrowFunction, 145 ArrowFunction, 149 ObjectLiteral, 150 ArrowFunction, 151 ArrowFunction, 161 StringLiteral
base packages/devtools/src/model/DiagnosticsFeed.ts: 58/0/0/14
  ignored: 70 ObjectLiteral, 76 ObjectLiteral, 88 ObjectLiteral, 89 ArrowFunction, 90 ArrowFunction, 91 ArrowFunction, 92 ArrowFunction, 122 ArrowFunction, 122 ObjectLiteral, 123 ArrowFunction, 124 ArrowFunction, 136 ArrowFunction, 148 ArrowFunction, 163 StringLiteral
base packages/devtools/src/model/SimulationSession.ts: 242/6/0/4
  ignored: 244 ObjectLiteral, 244 ObjectLiteral, 244 StringLiteral, 279 StringLiteral
  survived: 310 ConditionalExpression, 313 ConditionalExpression, 313 StringLiteral, 317 ConditionalExpression, 319 ConditionalExpression, 402 ConditionalExpression

archived checks: node .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-archived-checks.mjs

## Deviations from Plan

None - plan executed exactly as written, with two recorded refinements.

- `79-characterisation-check.mjs` holds no directory constant (it reads one commit by sha), so the runner copies it
  unchanged instead of refusing it; the other four scripts are refused unless the constant occurs exactly once.
- `single-source` prints two reasons the plan did not name (`callAll holds N collect loops, not one`, `AggregateError is
  built nowhere`), so a tree with nothing to read cannot pass. On the base it prints exactly the five reasons recorded
  in `81-RED-EVIDENCE.md`; the three the plan requires are among them.

## Issues Encountered

SimulationSession.ts has six Survived mutants on the phase base. They are the floor: the compare rule passes a survivor
the base already had and fails a new one. A later plan that edits the simulation's run keeps them where they are.

## Known Stubs

None.

## Next Phase Readiness

Ready for 81-02 (the listener-matrix regression test, written and seen RED on this base).

## Self-Check: PASSED

All five created files exist, both task commits (`34d1e005`, `a24a4033`) are ancestors of HEAD, the measured commit count is 2, and the three task verifies pass.

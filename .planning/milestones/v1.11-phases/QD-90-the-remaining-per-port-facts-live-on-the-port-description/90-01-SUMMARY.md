---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 01
subsystem: testing
tags: [core, stryker, mutation-base, coverage-base, scorer, ports]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
base_record: 404b1541456dd0bb7ffc50a1caec93b2c856270e
coverage_base: 2d9e1ab4638f26d65ba99b98d84e7378102690e3
plan_head_before: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_after: 2d9e1ab4638f26d65ba99b98d84e7378102690e3

requires:
  - phase: QD-89-one-admission-step-for-a-host-s-audit-batch
    provides: the 89-mutation.mjs scorer (judge, EXAMINED, EQUIVALENT, MAY_BE_ABSENT, the removed-mutant rule) and the path-filtered coverage command
provides:
  - 90-mutation.mjs, the phase scorer for the one core group (base and close over thirteen files with one invocation, the removed-mutant rule, EXAMINED, EQUIVALENT, STATIC_PROVEN, the moved note, coverage and landed modes)
  - 90-mutation-base.json, phase_base and the core base measured on the unchanged tree, committed alone and first
  - 90-coverage-base.json, core coverage totals and the thirteen files' numbers at phase_base
affects: [QD-90 plans 02 to 16, every later compare against the core base]

actuals:
  tokens: 36000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a scorer whose one group is measured at the base and at the close with one and the same invocation, with a static-code allowance that names the title of the row or pin holding the code"
    - "a coverage record whose head is the phase base, so it can be committed after the mutation record without moving its own head"

key-files:
  created:
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-mutation.mjs
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-mutation-base.json
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-coverage-base.json
  modified: []

key-decisions:
  - "The core base holds four open Survived mutants (PortDerivation.ts, CustomPredicate.ts, SignatureHistory.ts, LeafNeeds.ts, one each); they are the base the close is judged against, not entries to hide, and a touched file's score may not fall below it."
  - "The coverage base record's head is phase_base, checked against the tree outside .planning, because HEAD sits on the mutation record's commit by the time coverage is taken."

patterns-established:
  - "A path-filtered coverage run through execFileSync with an argument array (no shell glob), refused when the summary holds no file or misses one of the thirteen"

requirements-completed: []

coverage:
  - id: D1
    description: "90-mutation-base.json holds phase_base and the core base (462 killed, 4 survived, 0 no coverage, 0 timeout, 290 Ignored static over the thirteen files), committed with its scorer as the first plan commit"
    verification:
      - kind: unit
        ref: "node 90-mutation.mjs --self-test (96 passed) and node 90-mutation.mjs landed base"
        status: pass
    human_judgment: false
  - id: D2
    description: "90-coverage-base.json holds 94 core files including all thirteen, totals lines 99.89, functions 99.78, branches 98.33, statements 99.63, committed in its own commit"
    verification:
      - kind: unit
        ref: "node 90-mutation.mjs landed coverage-base"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-11-26
status: complete
---

# Phase 90 Plan 01: Measure the base Summary

**A scorer for the one core group, the core mutation base over thirteen files (462 killed, 4 survived, 290 Ignored static) and the core coverage base (94 files, branches 98.33), each taken on the unchanged tree and committed before any source, test or spec file moved.**

## Performance

- **Duration:** about 20 minutes; **Tasks:** 2 (one tracer, one auto)
- **Files created:** 3 under the phase directory; nothing under `packages/`, `spec/`, `scripts/`, `features/`, `apps/`, `examples/` and no `stryker.config.mjs` change (`git status --porcelain -- packages spec scripts` is empty)
- Scratch lived in `$TMPDIR/qd90` (the coverage summary directory `coverage-base`).

## Accomplishments

- **Tracer (Task 1):** `90-mutation.mjs` is `89-mutation.mjs` regrouped for one `core` group over the thirteen files, with `judgeNew` not ported (no born file), `MAY_BE_ABSENT` covering any of the thirteen (`absent: true`, zero counts), the third allowance `STATIC_PROVEN` (merged with `EXAMINED` in `allowance`, and checked by `proofReasons` against the rows and pins that exist), a `coverage base|close` mode, and `landed base|coverage-base|close|coverage-close` checks. Its self-test drives every judge with planted records and planted allowances (96 cases, none reading the real constants). The base ran on the clean tree with exactly the D-24 invocation: 756 mutants instrumented, 462 Killed, 0 Timeout, 4 Survived, 0 NoCoverage, 290 Ignored (static), Stryker's own score 99.14, the run taking 1 minute 19 seconds.
- **Coverage base (Task 2):** `pnpm exec vitest run packages/core/test --coverage.enabled …` filtered by path: 85 test files and 2797 tests passed, the summary holds 94 files including all thirteen, and the totals are lines 99.89, functions 99.78, branches 98.33, statements 99.63 (each at least 95).

### Base record, per file (commit `404b1541456dd0bb7ffc50a1caec93b2c856270e`)

| File | Killed | Survived | NoCoverage | Ignored |
| ---- | -----: | -------: | ---------: | ------: |
| PortName.ts | 0 | 0 | 0 | 0 (absent: no mutant) |
| Ports.ts | 16 | 0 | 0 | 9 |
| PortMetrics.ts | 0 | 0 | 0 | 28 |
| PortAccess.ts | 43 | 0 | 0 | 17 |
| PortDescription.ts | 16 | 0 | 0 | 11 |
| PortDerivation.ts | 46 | 1 | 0 | 14 |
| AttributeResolver.ts | 22 | 0 | 0 | 35 |
| RelationshipResolver.ts | 29 | 0 | 0 | 38 |
| CustomPredicate.ts | 30 | 1 | 0 | 34 |
| DecisionHistory.ts | 64 | 0 | 0 | 42 |
| SignatureHistory.ts | 109 | 1 | 0 | 37 |
| LeafNeeds.ts | 76 | 1 | 0 | 23 |
| ScopedLeaf.ts | 11 | 0 | 0 | 2 |

The four survivors: `PortDerivation.ts:167` ObjectLiteral to `{}`, `CustomPredicate.ts:277` StringLiteral to `""`, `SignatureHistory.ts:380` ConditionalExpression to `false`, `LeafNeeds.ts:203` ConditionalExpression to `true`. `PortMetrics.ts` holds 0 killed mutants and 28 Ignored: every mutant in it is static, so it has no score and a close must keep it at zero open mutants and no more than 28 Ignored of each kind.

### Coverage base, per file (commit `2d9e1ab4638f26d65ba99b98d84e7378102690e3`)

- `coverage_base:` 94 files; lines 99.89, functions 99.78, branches 98.33, statements 99.63.
- Twelve of the thirteen files are at 100 on all four; `DecisionHistory.ts` branches 87.5 and `LeafNeeds.ts` branches 97.05 are the two below 100 (a close must not fall below these).

## Task Commits

1. Task 1: `404b1541456dd0bb7ffc50a1caec93b2c856270e` `docs(90-01): record the mutation base`
2. Task 2: `2d9e1ab4638f26d65ba99b98d84e7378102690e3` `docs(90-01): record the coverage base`

## Measured, not expected

The research ran no bench and no Stryker and so named no count; what the run gave is the record. The base is not all-killed: four open Survived mutants (one each in four files) are part of the base, and the removed-mutant rule judges a close by them (a survivor the close still holds, mapped through the diff, is not new). Nothing was re-baselined.

## Deviations from Plan

### Plan defects (smallest honest fix)

**1. [Plan defect] The coverage record's `head` could not be HEAD**
- **Found during:** Task 2 design: the plan wants `90-coverage-base.json`'s `head` to equal `phase_base`, but the coverage base is taken after the mutation-base commit, so HEAD is that commit's child.
- **Fix:** `coverage base` writes `head: phase_base` after checking that `git diff --quiet <phase_base> HEAD -- . ':!.planning'` holds (nothing outside `.planning/` moved); `coverage close` writes `head` as HEAD, which is the close commit's parent as `landed coverage-close` checks. Before and after: plan says `head` equals `phase_base`, and `landed coverage-base` checks it; the scorer now satisfies it by that rule.
- **Files:** `90-mutation.mjs`. **Commit:** 404b1541.

**2. [Rule 1 - interpretation] Coverage file count**
- The plan's coverage record holds `files: <count>` of the summary: 94, the whole core source, not only the thirteen; the thirteen are in `thirteen`. The command, as the plan specifies, includes `packages/core/src/**` less the barrel.

### Plan notes

- The self-test is not the seen-failing evidence for each mode; as the plan states, plan 02 Task 3 sees each mode fail on a scratch clone. Here `landed base` was run before the commit and failed (`90-mutation-base.json does not exist` before the record, none after), and `landed coverage-base` was run after the first commit and failed (`the second plan commit after phase_base is undefined`) before passing after the second.
- `pnpm exec oxlint 90-mutation.mjs` printed nothing and exited 0 (the repository's oxlint configuration may not lint `.planning/`; no warning was seen either way).
- **Trailer.** Both commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, the value the plan and the phase's `trailers` check fix; the session's own attribution reminder names a different model and was not used, as the plan allows exactly one trailer line.

### Auth gates

None.

## Known Stubs

None. The scorer's `EQUIVALENT`, `EXAMINED` and `STATIC_PROVEN` are empty by design; plan 13 fills them.

## Threat Flags

None. The scorer reads reports and git state and writes only its two record files and scratch.

## Issues Encountered

None. No `.stryker-tmp/` or `.vitest/` was left behind; `reports/` is ignored.

## Self-Check: PASSED

- FOUND: `90-mutation.mjs`, `90-mutation-base.json`, `90-coverage-base.json`
- FOUND: `404b1541` and `2d9e1ab4` are ancestors of HEAD; `landed base` and `landed coverage-base` exit 0; `git status --porcelain -- packages spec scripts` prints nothing.

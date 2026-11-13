---
phase: 36-carried-spec-debt-and-stale-records
plan: 01
subsystem: testing
tags: [stryker, mutation-baseline, ledger, devtools, react]
phase_base: e018203500839e381f34734c68ad411cbd426c47
plan_head_before: e018203500839e381f34734c68ad411cbd426c47
plan_head_after: 90ad54264d3df678043371fc992bbea2f3841217

requires:
  - phase: 35-the-atom-set-owns-its-eviction-sweep
    provides: closed phase and the four-key mutation baseline shape
provides:
  - 36-mutation-base.json, the baseline 36-14 compares the after-run with
  - 36-LEDGER.md, one row per carried item with base evidence, disposition and closing plan
affects: [36-02, 36-14, verifier]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["four-key mutation baseline: measured, unmeasured, new, deleted"]

key-files:
  created:
    - .planning/phases/36-carried-spec-debt-and-stale-records/36-mutation-base.json
    - .planning/phases/36-carried-spec-debt-and-stale-records/36-LEDGER.md
  modified: []

key-decisions:
  - "react/index.ts is recorded unmeasured with the reason `absent from the report (no mutant)`; Stryker printed no words for it (export-only barrel)"
  - "The devtools react files are measured through the --mutate override (D-19); no stryker config was edited"

requirements-completed: [WX-05, WX-06, DEBT-04]

duration: 25min
completed: 2026-11-12
status: complete
---

# Phase 36 Plan 01: Mutation baseline and carried-item ledger Summary

**Phase 36's mutation baseline (13 measured files, 16 unmeasured, 3 new) committed first and alone, then a 37-row ledger of every carried item re-verified at the phase base.**

## Performance

- **Duration:** about 25 min (two Stryker runs: devtools 3 min 4 s, react 47 s)
- **Completed:** 2026-11-12
- **Tasks:** 2
- **Files modified:** 2 (both new, both under `.planning/`)

## Accomplishments

- Reserved numbers CCR-QD-427, ADR-QD-149, BEH-QD-516..520 and INV-QD-317..318 are free in `spec packages .changeset AGENTS.md apps/website/src examples features`; no `spec/decisions/149-*` exists; `qadi-reserved-ids.json` reads CCR 427, ADR 149, BEH 520, INV 318.
- `36-mutation-base.json` is the phase's first plan commit and carries nothing else.
- `36-LEDGER.md` has the header and exactly one row for each of the 37 keys; the base probe (`git show <phase_base>:<file>`) printed ok, so every row marked fixed still holds at the base.
- No file under `packages/*/src` or `packages/*/test` changed (`git diff --name-only e0182035 HEAD` lists the two `.planning` files only).

## Task Commits

1. **Task 1: reserved numbers and the mutation baseline** - `60c0136` (chore)
2. **Task 2: the ledger, re-verified at the phase base** - `90ad542` (docs)

**Plan metadata:** the docs commit that adds this SUMMARY, STATE.md, ROADMAP.md and REQUIREMENTS.md follows.

`phase_base` is `e018203500839e381f34734c68ad411cbd426c47`, the parent of `60c0136`.

## The baseline

Scores are unrounded ratios (Killed plus Timeout over Killed, Timeout, Survived and NoCoverage); the JSON is the record.

| File | Score |
|------|-------|
| devtools model/TimelineFeed.ts | 1 |
| devtools model/TimelineStore.ts | 0.9697 |
| devtools model/DockModel.ts | 1 |
| devtools model/SimulationSource.ts | 0.9841 |
| devtools model/SimulationSession.ts | 0.9745 |
| devtools model/Replay.ts | 1 |
| devtools react/useTimeline.ts | 0.75 |
| devtools react/useDockModel.ts | 1 |
| devtools react/DevtoolsDock.tsx | 0.5873 |
| devtools react/Simulator.tsx | 0.5449 |
| devtools react/DiagnosticsNotice.tsx | 0.8444 |
| react QadiAtoms.ts | 0.8966 |
| react HydrationEngine.ts | 0.9776 |

Unmeasured: the 15 comment-only files (reason `comment-only; proven by the comment-stripped transpile comparison`) and `packages/devtools/src/react/index.ts` (`absent from the report (no mutant)`). New: `StoppedBox.tsx`, `TimelineNotice.tsx`, `focusRing.ts`. Deleted: empty.

Run totals: devtools 86.11 (break threshold 80), react 96.09; both exits 0. Logs: `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/36-stryker-devtools-base.log` and `…/36-stryker-react-base.log`.

### Survivors (line:mutator)

- DevtoolsDock.tsx: NoCoverage (5) 215:ObjectLiteral 267:ArrowFunction 267:ConditionalExpression 267:ConditionalExpression 267:EqualityOperator. Survived (21) 178:ObjectLiteral 184:ConditionalExpression x2 184:EqualityOperator 185:ConditionalExpression 192:ObjectLiteral 194:ConditionalExpression 194:StringLiteral 215:ArrowFunction 229:BooleanLiteral 247:StringLiteral 247:ObjectLiteral 248:ConditionalExpression x3 248:EqualityOperator 255:ConditionalExpression x2 255:EqualityOperator 256:ConditionalExpression x2 256:EqualityOperator.
- SimulationSession.ts: Survived (9) 361:AssignmentOperator 408:ConditionalExpression 411:ConditionalExpression 411:StringLiteral 415:ConditionalExpression 417:ConditionalExpression 424:ConditionalExpression 466:ConditionalExpression 499:ConditionalExpression.
- SimulationSource.ts: Survived (1) 134:ConditionalExpression.
- TimelineStore.ts: Survived (1) 58:ConditionalExpression.
- DiagnosticsNotice.tsx: Survived (7) 105:ObjectLiteral 113:ConditionalExpression 125:ConditionalExpression 126:ArrayDeclaration 136:ObjectLiteral 153:ObjectLiteral 153:BooleanLiteral.
- Simulator.tsx: Survived (81), all style-object ObjectLiteral and StringLiteral mutants plus conditionals at 92, 126, 160, 161, 232, 234, 305, 417, 485 (with 485:OptionalChaining and EqualityOperator), 489:OptionalChaining, 541, 544, 571:EqualityOperator, 595; full list kept in `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/36-survivors.txt`.
- useTimeline.ts: Survived (5) 58:BlockStatement 59:ConditionalExpression 60:ArrayDeclaration 82:ArrayDeclaration 83:ArrayDeclaration.
- HydrationEngine.ts: Survived (5) 488:ArrayDeclaration 701:ObjectLiteral 746:ConditionalExpression x2 746:EqualityOperator.
- QadiAtoms.ts: Survived (6) 234:ConditionalExpression x4 234:LogicalOperator 288:ConditionalExpression.
- TimelineFeed.ts, DockModel.ts, Replay.ts, useDockModel.ts: none.

## Decisions Made

- `react/index.ts` (an export-only barrel) has no mutant and no Stryker message, so it is unmeasured with the plan's fallback wording; the writer passed because it is absent from the report.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Both Stryker runs exited 0 above the break threshold, so no refusal handling was needed.

## Known Stubs

None. No source file was created or changed.

## Next Phase Readiness

36-02 can start from `phase_base` above. Gate 13 (`spec:api`) goes red from 36-02 by plan until 36-13 Task 2.

## Self-Check: PASSED

- FOUND: `36-mutation-base.json`, `36-LEDGER.md`
- FOUND commits: `60c0136`, `90ad542` (both ancestors of HEAD; the baseline is the first `(36-0` commit and changes one file)

---
*Phase: 36-carried-spec-debt-and-stale-records*
*Completed: 2026-11-12*

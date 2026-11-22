---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 02
subsystem: mutation-baseline
status: complete
tags: [stryker, mutation-base, hygn-01, wx-05]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-mutation.mjs (the scorer) from plan 68-01
provides:
  - "68-mutation-base.json: the per-file mutation base of the six source files the phase edits, both groups on one commit whose packages and features are phase_base's"
affects: [68-12]

actuals:
  tokens: 3000
  tasks: 2
  commits: 1
plan_head_before: 9a224850190c93f67f6273d43b367c4d51f6fa95
plan_head_after: 4813c67c915c6e69d296938034a70ebeff5cef12
commits: 1

tech-stack:
  added: []
  patterns:
    - "each group is measured alone (pgrep for vitest and stryker empty before each run) and recorded by the scorer, which refuses a dirty group or a second group on another commit"

key-files:
  created:
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-mutation-base.json
  modified: []

key-decisions:
  - "The base is measured with the same invocation 68-12 will use at the close; a drop there is closed with a test, never re-baselined (WX-05)"

requirements-completed: []

coverage:
  - id: D1
    description: "devtools group recorded on the base tree: DiagnosticsFeed.ts and TimelineFeed.ts under the planned invocation"
    requirement: "HYGN-01"
    verification:
      - kind: other
        ref: "Task 1 automated verify: Stryker final score line present; group head's packages and features equal phase_base's; invocation and file set exactly as planned"
        status: pass
    human_judgment: false
  - id: D2
    description: "core group recorded on the same commit: Admission.ts, DecisionLog.ts, SinkCodec.ts, UntrustedDecode.ts, committed alone"
    requirement: "HYGN-01"
    verification:
      - kind: other
        ref: "Task 2 automated verify: exactly two groups, same head, planned invocations and files; one docs(68-02) commit at HEAD holding only the record, with the trailer"
        status: pass
    human_judgment: false
---

# Phase 68 Plan 02: Mutation base Summary

The mutation base of all six files Phase 68 edits is recorded on the post-67 tree, before any test or source edit, in one committed `68-mutation-base.json` holding both Stryker groups on commit `9a224850`.

## What was measured

Both groups ran in the foreground, one after the other, with nothing else running (`pgrep -fl "vitest|stryker run"` printed nothing before each). The scorer's `record base <group>` wrote each group; it ran on a clean tree for the files it reads.

| File | detected/valid | ignored | open (Survived/NoCoverage) |
| ---- | -------------- | ------- | -------------------------- |
| `packages/devtools/src/model/DiagnosticsFeed.ts` | 72/73 | 13 | 1: line 165 ConditionalExpression -> false |
| `packages/devtools/src/model/TimelineFeed.ts` | 49/49 | 10 | 0 |
| `packages/core/src/Admission.ts` | 20/20 | 3 | 0 |
| `packages/core/src/DecisionLog.ts` | 66/66 | 2 | 0 |
| `packages/core/src/SinkCodec.ts` | 123/127 | 45 | 4: line 322 EqualityOperator (`stack.length >= 0`), line 324, 387 and 391 ConditionalExpression -> false |
| `packages/core/src/UntrustedDecode.ts` | 44/46 | 5 | 2: line 243 ConditionalExpression -> true and EqualityOperator (`unwalked.size >= 0`) |

Stryker run scores: devtools 99.18 (43 s), core 97.68 (54 s). The devtools counts equal Phase 64's recorded bases (`TimelineFeed.ts` 49/49, `DiagnosticsFeed.ts` 72/73).

Invocations (as the scorer states them):
- `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/DiagnosticsFeed.ts,packages/devtools/src/model/TimelineFeed.ts`
- `pnpm exec stryker run stryker.config.mjs --mutate packages/core/src/Admission.ts,packages/core/src/DecisionLog.ts,packages/core/src/SinkCodec.ts,packages/core/src/UntrustedDecode.ts`

The seven open mutants are the base: 68-12 compares the close against them, and a file may neither drop below its base nor gain an open or Ignored mutant.

## Commit

- `4813c67c` docs(68-02): record the mutation base of the six files the phase edits (only `68-mutation-base.json`)

## Deviations from Plan

None - plan executed exactly as written. (Tracer gate: the Task 1 verify was re-run after the devtools record and passed before the core run started.)

## Known Stubs

None.

## Threat Flags

None. No `packages`, `features` or Stryker config changed; `git diff <phase_base> HEAD -- packages features stryker.config.mjs stryker.devtools.mjs` is empty.

## Self-Check: PASSED

- `68-mutation-base.json` exists with exactly the `core` and `devtools` groups on one `head`.
- Commit `4813c67c` is an ancestor of HEAD, is the only `docs(68-02)` record commit, and carries the trailer.
- Both task verifies passed on HEAD after the commit.

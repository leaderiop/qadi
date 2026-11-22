---
phase: QD-62-type-pins-that-can-fail
plan: 02
subsystem: testing
tags: [tstyche, type-tests, negative-pins, controls]
phase_base: 4cab2e74afd9487e19d9f025dd7a6436e459ba5c
plan_head_before: ba490bfd3112b44fc20112fe4bfeced2a8b384b3
plan_head_after: 6648da58cfa930862e0901eb3a7ec760773bd87d
requires: [62-01]
provides:
  - DecisionLog refusal stated through Parameters<typeof makeDecisionLog>[0], shown failing once
  - a same-subject positive twin for the ten other uncontrolled negative pins
affects: [62-03, 62-04, 62-05, 62-06, 62-08]
tech-stack:
  added: []
  patterns: ["a negative pin on an Effect-returning call is stated on the parameter type, not toBeCallableWith"]
key-files:
  created: []
  modified:
    - packages/core/test/DecisionLog.tst.ts
    - packages/core/test/Explanation.tst.ts
    - packages/core/test/Matcher.tst.ts
    - packages/core/test/Qadi.tst.ts
    - packages/core/test/WalkEnvironment.tst.ts
    - packages/audit/test/AuditPortReply.tst.ts
    - packages/audit/test/AuditWriteOutcome.tst.ts
    - packages/http/test/RequirePermission.tst.ts
decisions:
  - "A control is added beside its negative pin and never edits it; every line present at the first commit is still present, in order"
requirements: [PIN-03, PIN-04, WX-04, WX-06]
metrics:
  duration: ~12min
  completed: 2026-11-20
status: complete
actuals:
  tokens: 1500
  tasks: 3
  commits: 3
---

# Phase QD-62 Plan 02: Reason-stated DecisionLog pin and positive twins Summary

The vacuous `makeDecisionLog` negative pin now reads the options type and fails when `environment` goes optional, and the ten other uncontrolled negative pins each have a single-variable positive twin; the suite is green in both passes.

## RED evidence

Task 1, `packages/core/src/DecisionLog.ts` with `readonly environment?: string;` written transiently under `export const makeDecisionLog = (options: {` (restored byte for byte in a `finally`; `git diff --quiet HEAD -- packages/core/src` holds afterwards):

```
fail ./packages/core/test/DecisionLog.tst.ts
  × makeDecisionLog requires an environment and returns an Effect of a log
Tests:      1 failed, 3 passed, 4 total
Assertions: 1 failed, 8 passed, 9 total
Error: Type '{ readonly capacity: number; }' is assignable to type '{ readonly environment?: string; readonly capacity?: number; }'.
  34 |   expect<{ readonly capacity: number }>().type.not.toBeAssignableTo<Options>();
```

Restored source: green under `tsconfig.tstyche.json` and under `--tsconfig tsconfig.test.json`.

## Controls

Line numbers are the negative pin's, in the tree at 6648da58. The twin sits directly after it (inside the same test body).

| # | Pin (file:line) | Subject | Twin | What varies |
| - | --- | --- | --- | --- |
| 1 | `DecisionLog.tst.ts:34` | `makeDecisionLog` options | `:33` `{ environment: string }` assignable to `Options` | rewritten, control added: required `environment` supplied |
| 2 | `Explanation.tst.ts:35` | `foldExplanationCases` | full cases object | adds the missing `Table` arm |
| 3 | `Explanation.tst.ts:55` | `foldExplanationCases` | `Negated: (_n, part: number) => part` | the part typed as `R`, not an array |
| 4 | `Matcher.tst.ts:33` | `foldMatcherCases` | full cases object | adds the missing `Size` arm |
| 5 | `Matcher.tst.ts:49` | `foldMatcherCases` | `Size: (_n, child: number) => child` | the child typed as `R`, not an array |
| 6 | `Qadi.tst.ts:115` | `enforceProjectedLoaded` | `toBeCallableWith(hasPermission(read), {})` | drops the second resource |
| 7 | `WalkEnvironment.tst.ts:40` | `admit` | `toBeCallableWith(question, "asked")` | supplies the row source |
| 8 | `WalkEnvironment.tst.ts:41` | `admit` | `toBeCallableWith(question, "row")` | corrects `"rows"` to `"row"` |
| 9 | `AuditPortReply.tst.ts:34` | `AuditPortReply.Latch` | `toBeCallableWith({ latch })` | supplies the latch (`declare const latch: Latch.Latch`) |
| 10 | `AuditWriteOutcome.tst.ts:18` | `AuditWriteOutcome.WriteFailed` | `toBeCallableWith({ entry, staging: UnwrittenStaging.Staged() })` | an unwritten staging instead of a committed one |
| 11 | `RequirePermission.tst.ts:63` | `plainEndpoint.annotate` | `toBeCallableWith(RequiredPermission, requiresPermission(...))` | the value `requiresPermission` returns instead of a raw literal |

No twin needed an argument different from the plan's.

Diff review (manual, review concern 8b): `git diff 74ac8d4e..HEAD -- packages` was read after the last commit. It shows 44 added lines in seven files and no removed line, each twin beside the negative it controls; no negative pin was edited or moved, and the `.not.toBeCallableWith` count is unchanged in each file (`DecisionLog.tst.ts` went 1 to 0 in Task 1, as planned).

## Verification

- `npx tstyche`: `Test files: 66 passed, 66 total`, `Assertions: 756 passed, 3 fixme, 759 total`.
- Rule-on pass (`--tsconfig tsconfig.test.json --skip "under the tstyche tsconfig"`): `66 passed`, `753 passed, 6 skipped, 759 total`, so no control sits on a bare Effect or Stream subject.
- `pnpm typecheck`, `pnpm lint`: exit 0.
- `git diff --quiet HEAD -- 'packages/*/src'` holds; no source file changed at any commit of this plan.

## Deviations from Plan

None - plan executed exactly as written.

## Requirements

PIN-03 is satisfied by this plan. PIN-04's controls are done here, but the orchestrator reserved the PIN-* close-out to the 62-08 sweep, so REQUIREMENTS.md is untouched. WX-04 and WX-06 are cross-cutting and also untouched.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: the eight files under key-files.modified
- FOUND commits 74ac8d4e, 494be019, 6648da58 (`test(62-02)`)

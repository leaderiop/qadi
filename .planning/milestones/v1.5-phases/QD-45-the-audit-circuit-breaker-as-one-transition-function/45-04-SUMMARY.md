---
phase: QD-45-the-audit-circuit-breaker-as-one-transition-function
plan: 04
subsystem: audit
tags: [circuit-breaker, validation, typed-error, public-api]
plan_head_before: 93decc02f1634bcbbcf3bba71808b5aac7051699
plan_head_after: 5de80bf0fc239134cf7823dac289e320adc0c293
commits: 3

requires:
  - phase: QD-45 plan 03
    provides: the breaker on step/run
provides:
  - "InvalidAuditSinkOption, a Data.TaggedError over { option, received }, exported and in the overview"
  - "checkFailureThreshold and checkResetTimeoutMs (package-private), run by makeCircuitBreaker before its Ref"
  - "AuditDecisionSinkLive typed Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>"
affects: [45-05, 45-06, 45-07, 45-08]

actuals:
  tokens: 5000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a package-private check answering the decoded value it approved, in boundedPermits' plain-function style"
    - "message getter over a closed Record<option, requirement> so a fourth option is TS2741"

key-files:
  created:
    - packages/audit/src/InvalidAuditSinkOption.ts
    - packages/audit/src/SinkOptionChecks.ts
  modified:
    - packages/audit/src/CircuitBreaker.ts
    - packages/audit/src/AuditDecisionSinkLive.ts
    - packages/audit/src/index.ts
    - packages/audit/test/driveExit.ts
    - packages/audit/test/Agreement.test.ts
    - spec/overview.md

key-decisions:
  - "A bad breaker option is a typed refusal at construction (D-05..D-08): the layer's error channel moves from never to InvalidAuditSinkOption, and received carries the raw input because NaN decodes to a zero duration"
  - "resetTimeoutMs keeps its Ms-suffixed name (rename deferred)"

requirements-completed: [BRKR-03, WX-03, WX-04]

duration: 12min
completed: 2026-11-15
status: complete
---

# Phase 45 Plan 04: Option refusals for the breaker Summary

**`failureThreshold` and `resetTimeoutMs` are refused at construction with a typed, exported `InvalidAuditSinkOption`, through package-private checks that `makeCircuitBreaker` runs before its `Ref`, and the sink's layer type names the error.**

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (tracer) | `79c824be` | `feat(45-04): a failureThreshold that cannot work is refused when the breaker is built (tracer)` |
| 2 | `f9c24e13` | `feat(45-04): InvalidAuditSinkOption is exported, with its overview row` |
| 3 | `5de80bf0` | `feat(45-04): a resetTimeoutMs that cannot work is refused when the breaker is built` |

Each ends with the `Co-Authored-By: Claude Sonnet 5.5` trailer. `plan_head_before` is `93decc02` (the 45-03 docs commit); `git rev-list --count` over it gives 3.

## Verify output

- Task 1: `pnpm typecheck` clean; `CircuitBreakerOptions.test.ts -t failureThreshold`: `Tests  8 passed | 18 skipped (26)`; audit project minus that file: `Test Files 24 passed`, `Tests 438 passed`; `pnpm lint` exit 0 (`house-style: 513 file(s) clean (3 declared switch(es))`); `pnpm circular` no cycle. Structural check: error, check, breaker and layer type present; both Phase 48 lines present once and unedited; the commit carries exactly the six planned files.
- Task 2: typecheck, `pnpm spec:api` (`928 export(s) documented across 9 package(s)`), `spec-revise --check`, `pnpm spec:verify:strict` (`PASS: 21 FAIL: 0 SKIP: 0`), lint pass. Structural check: 16 barrel lines, the new line between `AuditWriteOutcome.ts` and `Retention.ts`, one overview row directly after `AuditDecisionSinkOptions`, Rev 1.110.
- Task 3 (RED first): before the check, `-t resetTimeoutMs` showed `9 failed | 2 passed | 15 skipped`; after, `Tests  11 passed | 15 skipped (26)`, the 8 `failureThreshold` rows still pass, audit minus Options still `438 passed`; typecheck, lint and circular pass; structural check passes (both checks yielded before `Ref.make<State>(`, no `orDie`, unsafe decode or throw).
- `CircuitBreaker.test.ts` blob is still `6f2222f2…`; `CircuitBreakerOptions.test.ts` untouched (its `storeCallTimeout` rows stay RED for 45-05; `pnpm check:fast` not run).

## Deviations from Plan

None - plan executed exactly as written. No further file needed widening beyond `driveExit.ts` and `Agreement.test.ts`; `pnpm typecheck` found no other site.

## Known Stubs

None.

## Threat Flags

None. T-45-07, T-45-08 and T-45-09 are mitigated as planned: a non-positive-whole threshold, and a non-finite, non-positive, fractional or malformed reset, are refused before the `Ref` exists, by an `Option`-based decode with no unsafe path.

## Next Phase Readiness

45-05 adds `checkStoreCallTimeout` and the sink's own refusal, which turns the `storeCallTimeout` rows of `CircuitBreakerOptions.test.ts` green. 45-06/45-07 cite ADR-QD-158 and CCR-QD-436 in the overview and docs.

## Self-Check: PASSED

- FOUND: `packages/audit/src/InvalidAuditSinkOption.ts`, `packages/audit/src/SinkOptionChecks.ts`
- FOUND: `79c824be`, `f9c24e13`, `5de80bf0` (ancestors of HEAD)

---
phase: QD-45-the-audit-circuit-breaker-as-one-transition-function
plan: 05
subsystem: audit
tags: [circuit-breaker, validation, typed-error, tstyche]
plan_head_before: 2aa99ff66edfe136d6b6d8d6273447d1ea9d5909
plan_head_after: 3d2a486be54d74c0c9eb9a940165b7cf3ab40561
commits: 2

requires:
  - phase: QD-45 plan 04
    provides: InvalidAuditSinkOption, the breaker's two checks, the typed layer
provides:
  - "checkStoreCallTimeout (package-private): isPositive-only, so Duration.infinity stays no deadline"
  - "AuditDecisionSinkLive refuses a storeCallTimeout that cannot work when the layer is built"
  - "the 26 CircuitBreakerOptions rows green and asserted against the class"
  - "AuditDecisionSinkLive.tst.ts pinning the layer type and the error's fields"
affects: [45-06, 45-07, 45-08]

actuals:
  tokens: 6000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a decode check testing Duration.isPositive without isFinite, so the documented opt-out passes"

key-files:
  created:
    - packages/audit/test/AuditDecisionSinkLive.tst.ts
  modified:
    - packages/audit/src/SinkOptionChecks.ts
    - packages/audit/src/AuditDecisionSinkLive.ts
    - packages/audit/test/AuditSinkDeadline.test.ts
    - packages/audit/test/CircuitBreakerOptions.test.ts

key-decisions:
  - "storeCallTimeout is checked by the sink after the breaker is built, so a composition with two bad options names the breaker's first (D-07)"
  - "Duration.infinity stays accepted (D-06a, BEH-QD-379); the infinity row is byte-identical to phase_base"

requirements-completed: [BRKR-03, WX-04, WX-06]

duration: 8min
completed: 2026-11-15
status: complete
---

# Phase 45 Plan 05: storeCallTimeout refusal and the class-level option rows Summary

**The sink now refuses a `storeCallTimeout` that is NaN, zero, negative, -Infinity or malformed with `InvalidAuditSinkOption` when its layer is built, `Duration.infinity` still means no deadline, and the 26 option rows assert the class and the layer's type is pinned.**

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | c919cdc2 | feat(45-05): a storeCallTimeout that cannot work is refused when the audit sink is built |
| 2 | 3d2a486b | test(45-05): the option rows name the class, and the sink layer's type is pinned |

## Accomplishments

- `checkStoreCallTimeout(received: Duration.Input)` in `SinkOptionChecks.ts`: `Duration.fromInput` filtered by `Duration.isPositive` only; the raw input is reported (NaN stays NaN, never `0`).
- `AuditDecisionSinkLive` yields it where it used `Duration.fromInputUnsafe`; the three option docs each gained a sentence naming the refusal. Neither Phase 48 line moved.
- `AuditSinkDeadline.test.ts`: the pinned `Duration.zero` row is now `storeCallTimeout: Duration.zero is refused when the layer is built` (layer fails with `InvalidAuditSinkOption`, `attempts()` 0, no outcome). Every other row, `Duration.infinity` included, is unchanged; the file reports 15 tests.
- `CircuitBreakerOptions.test.ts`: `assertRefusal` now uses `Cause.findErrorOption`, `assert.instanceOf`, strict `option` and `Object.is` on `received`; three rows pin the message. Titles equal the RED commit's; 26 tests.
- `AuditDecisionSinkLive.tst.ts` (new): the layer is `Layer.Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>`, `option` is the closed union, `received` is `Duration.Input`, the tag is unprefixed.

## Verification

- `CircuitBreakerOptions` + `AuditSinkDeadline`: `Tests 41 passed (41)`; whole audit project `Tests 464 passed (464)`.
- `pnpm test:tstyche`: `Test files: 54 passed`, `Tests: 278 passed`, `Assertions: 591 passed`.
- `pnpm typecheck`, `pnpm lint` (house-style: 513 files clean), `pnpm circular`: pass.
- `pnpm check:fast`: all 13 fast-tier steps passed (first green since 45-01's RED commit).
- `packages/audit/test/CircuitBreaker.test.ts` blob is still `6f2222f206968b60a418c3f5ca03f54286270272`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan verify bug] Task 1's node verify counts 15 literal `it.effect("…")` titles**
- **Found during:** Task 1 verify
- **Issue:** the regex matches only double-quoted titles; `AuditSinkDeadline.test.ts` has 11 of them (also 11 on `phase_base`) plus a `for` loop of template-literal rows, 15 tests in all as vitest reports. The check could never pass.
- **Fix:** none to the code; every other check in that script was re-run with the count assertion dropped and passed, and vitest's `15 passed` is the real count.
- **Files modified:** none

**Total deviations:** 1 (a verify-script miscount, no code impact).

## Known Stubs

None.

## Threat Flags

None. T-45-10 is mitigated (five refusal rows, the zero row with no store call, the throwing decode gone); T-45-11 is accepted and pinned by the unchanged infinity row.

## Self-Check: PASSED

- FOUND: packages/audit/test/AuditDecisionSinkLive.tst.ts, c919cdc2, 3d2a486b (both on `arch-wave-10`).

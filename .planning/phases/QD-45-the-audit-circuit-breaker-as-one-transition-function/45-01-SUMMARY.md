---
phase: QD-45-the-audit-circuit-breaker-as-one-transition-function
plan: 01
subsystem: testing
tags: [circuit-breaker, characterisation, stryker, effect-vitest, tdd-red]
phase_base: d6f1aff7670285c9465efbaf237b1e377fe205e3
plan_head_before: d6f1aff7670285c9465efbaf237b1e377fe205e3
plan_head_after: 849fb8a8c10f42a684cfa10880113d4493b9af9f
commits: 3

requires:
  - phase: QD-44-the-hydration-seed-s-fields-stated-once
    provides: the per-file Stryker base/after JSON convention and its writer
provides:
  - 45-mutation-base.json, the Stryker baseline of CircuitBreaker.ts and AuditDecisionSinkLive.ts on the untouched base
  - CircuitBreakerTable.test.ts, 16 adapter rows green on the base (BRKR-04)
  - CircuitBreakerOptions.test.ts, 26 option rows, 21 RED on the base (BRKR-03)
affects: [45-02, 45-03, 45-04, 45-05, 45-08]

actuals:
  tokens: 5900
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "adapter-level characterisation: status via breaker.status, generation via Admitted.generation, announcements via Metric.value(transitionsTotal) inside isolatedMetrics"
    - "runtime-only RED: assert a typed refusal by _tag string so the RED commit type-checks without the not-yet-existing class"

key-files:
  created:
    - .planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-mutation-base.json
    - packages/audit/test/CircuitBreakerTable.test.ts
    - packages/audit/test/CircuitBreakerOptions.test.ts
  modified: []

key-decisions:
  - "The adapter table needed no row corrected: every expected generation, status and count matched the base as written from RESEARCH Q3"
  - "The sink option rows use AuditTrailPortTest().layer as the plan says; on the base a healthy synchronous write wins the race against a zero or negative deadline, so those rows end Written, not WriteFailed"

requirements-completed: [BRKR-03, BRKR-04, WX-02, WX-05, WX-06]

duration: 9min
completed: 2026-11-15
status: complete
---

# Phase 45 Plan 01: Evidence on the untouched base Summary

**The mutation baseline, a 16-row adapter transition table (green) and 26 bad-option rows (21 RED) are committed on the untouched base, before any `packages/*/src` edit.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-11-15T06:21Z
- **Completed:** 2026-11-15T06:31Z
- **Tasks:** 3
- **Files created:** 3 (no file modified)

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `203bbbe21aa1830cec37e2da17caa69d82aa04ae` | `chore(45-01): mutation baseline for the circuit breaker and the audit sink` |
| 2 | `64422f42e8bdb338007733c70f8674f19f99a8ae` | `test(45-01): the breaker's transitions through its adapter, green on the base` |
| 3 | `849fb8a8c10f42a684cfa10880113d4493b9af9f` | `test(45-01): a breaker or sink option that cannot work is refused when built (RED)` |

`phase_base` is `d6f1aff7670285c9465efbaf237b1e377fe205e3`, the parent of the `chore(45-01)` commit. Each commit ends with the `Co-Authored-By: Claude Sonnet 5.5` trailer.

## Reserved numbers (WX-02)

`ARCH-92`, `ADR-QD-158`, `CCR-QD-436`, `BEH-QD-561` to `BEH-QD-565`, `INV-QD-335` and `INV-QD-336` were each matched as a whole id (`<id>([^0-9]|$)`) with `git grep` against `phase_base` over `spec packages .changeset AGENTS.md CONTRIBUTING.md features apps/website/src examples scripts`: no hit for any of the ten, and no `spec/decisions/158-*` file. `node scripts/next-id.mjs` was never run.

## Mutation base

Run: `pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/CircuitBreaker.ts,packages/audit/src/AuditDecisionSinkLive.ts'` in the background, 34 seconds, exit 0, 268 mutants. The writer accepted the report (not stale, exactly the two named files, sources equal to disk, config reporting to `reports/mutation-audit/mutation.json`). The earlier estimate of 2 to 5 minutes was high; 34 seconds is the figure for the close (45-08).

Printed JSON:

```json
{"measured":{"packages/audit/src/AuditDecisionSinkLive.ts":1,"packages/audit/src/CircuitBreaker.ts":0.8051282051282052},"unmeasured":{},"new":[],"deleted":{},"moved":{}}
```

| File | Score | (detected/scored) | Ignored (static) |
|------|-------|-------------------|------------------|
| `AuditDecisionSinkLive.ts` | 1 | 58/58 | 1 |
| `CircuitBreaker.ts` | 0.8051282051282052 | 157/195 | 14 |

`CircuitBreaker.ts` has 38 survivors or uncovered mutants. The close must reach at least 0.8051 on this file while the module is restructured; the clusters below are where a new row buys score.

- `:303`, `:324` (the `Open` arms of `recordSuccess`/`recordFailure`, array and boolean literals, arrow body): `NoCoverage` (4) and `Survived` (2). No existing row reaches a success or failure landing on an `Open` state under the matching generation.
- `:258`, `:265`, `:299`, `:327`, `:376` (`generation + 1` to `- 1`, and `:298` the `{}` object literal): five arithmetic survivors and one object-literal survivor. The existing tests never read the generation after a bump, which is what `Admitted.generation` reads in the new table now do.
- `:351`, `:374`, `:375`, `:378` (`claimProbe`/`releaseProbe` guards): `state._tag !== "HalfOpen"` to `false`, `|| `to `&&`, and `reopened` to `true`.
- `:383`, `:387` (`admit`'s claim and re-read conditions): ten survivors on `initialStatus === "HalfOpen"`, `claimed === undefined` and the `"HalfOpen"` literal.
- `:406`, `:412`, `:414`, `:417` (the span name, its annotations and the release finalizer's guard): 13 survivors; the span's attributes are not asserted by any audit test.

```
survivor packages/audit/src/CircuitBreaker.ts:303:62 ArrayDeclaration NoCoverage -> [] on: [false, open]
survivor packages/audit/src/CircuitBreaker.ts:303:63 BooleanLiteral NoCoverage -> true on: false
survivor packages/audit/src/CircuitBreaker.ts:324:62 ArrayDeclaration NoCoverage -> [] on: [false, open]
survivor packages/audit/src/CircuitBreaker.ts:324:63 BooleanLiteral NoCoverage -> true on: false
survivor packages/audit/src/CircuitBreaker.ts:258:31 ArithmeticOperator Survived -> halfOpen.generation - 1 on: halfOpen.generation + 1
survivor packages/audit/src/CircuitBreaker.ts:265:35 ArithmeticOperator Survived -> open.generation - 1 on: open.generation + 1
survivor packages/audit/src/CircuitBreaker.ts:298:37 ObjectLiteral Survived -> {} on: { generation: halfOpen.generation + 1, consecutiveFailures: 0, }
survivor packages/audit/src/CircuitBreaker.ts:299:35 ArithmeticOperator Survived -> halfOpen.generation - 1 on: halfOpen.generation + 1
survivor packages/audit/src/CircuitBreaker.ts:327:49 ArithmeticOperator Survived -> halfOpen.generation - 1 on: halfOpen.generation + 1
survivor packages/audit/src/CircuitBreaker.ts:303:25 ArrowFunction Survived -> () => undefined on: (open): readonly [boolean, State] => [false, open]
survivor packages/audit/src/CircuitBreaker.ts:324:25 ArrowFunction Survived -> () => undefined on: (open): readonly [boolean, State] => [false, open]
survivor packages/audit/src/CircuitBreaker.ts:375:16 BooleanLiteral Survived -> true on: false
survivor packages/audit/src/CircuitBreaker.ts:351:7 ConditionalExpression Survived -> false on: state._tag !== "HalfOpen"
survivor packages/audit/src/CircuitBreaker.ts:374:11 ConditionalExpression Survived -> false on: state._tag !== "HalfOpen" || !state.probeClaimed
survivor packages/audit/src/CircuitBreaker.ts:374:11 LogicalOperator Survived -> state._tag !== "HalfOpen" && !state.probeClaimed on: state._tag !== "HalfOpen" || !state.probeClaimed
survivor packages/audit/src/CircuitBreaker.ts:374:11 ConditionalExpression Survived -> false on: state._tag !== "HalfOpen"
survivor packages/audit/src/CircuitBreaker.ts:378:11 ConditionalExpression Survived -> true on: reopened
survivor packages/audit/src/CircuitBreaker.ts:376:50 ArithmeticOperator Survived -> state.generation - 1 on: state.generation + 1
survivor packages/audit/src/CircuitBreaker.ts:387:39 ConditionalExpression Survived -> true on: claimed === undefined
survivor packages/audit/src/CircuitBreaker.ts:387:39 EqualityOperator Survived -> claimed !== undefined on: claimed === undefined
survivor packages/audit/src/CircuitBreaker.ts:383:21 ConditionalExpression Survived -> true on: initialStatus === "HalfOpen"
survivor packages/audit/src/CircuitBreaker.ts:387:7 ConditionalExpression Survived -> false on: initialStatus === "HalfOpen" && claimed === undefined
survivor packages/audit/src/CircuitBreaker.ts:387:7 ConditionalExpression Survived -> true on: initialStatus === "HalfOpen" && claimed === undefined
survivor packages/audit/src/CircuitBreaker.ts:387:7 LogicalOperator Survived -> initialStatus === "HalfOpen" || claimed === undefined on: initialStatus === "HalfOpen" && claimed === undefined
survivor packages/audit/src/CircuitBreaker.ts:387:7 ConditionalExpression Survived -> true on: initialStatus === "HalfOpen"
survivor packages/audit/src/CircuitBreaker.ts:387:7 EqualityOperator Survived -> initialStatus !== "HalfOpen" on: initialStatus === "HalfOpen"
survivor packages/audit/src/CircuitBreaker.ts:387:25 StringLiteral Survived -> "" on: "HalfOpen"
survivor packages/audit/src/CircuitBreaker.ts:414:31 ConditionalExpression Survived -> true on: permit._tag === "Admitted"
survivor packages/audit/src/CircuitBreaker.ts:412:36 ObjectLiteral Survived -> {} on: { "qadi.audit.permit": permit._tag, "qadi.audit.probe": permit._tag === "Admitted" && permit.probe, 
survivor packages/audit/src/CircuitBreaker.ts:406:32 StringLiteral Survived -> "" on: "qadi.audit.circuitBreaker.withPermit"
survivor packages/audit/src/CircuitBreaker.ts:414:47 StringLiteral Survived -> "" on: "Admitted"
survivor packages/audit/src/CircuitBreaker.ts:414:31 LogicalOperator Survived -> permit._tag === "Admitted" || permit.probe on: permit._tag === "Admitted" && permit.probe
survivor packages/audit/src/CircuitBreaker.ts:414:31 ConditionalExpression Survived -> true on: permit._tag === "Admitted" && permit.probe
survivor packages/audit/src/CircuitBreaker.ts:414:31 ConditionalExpression Survived -> false on: permit._tag === "Admitted" && permit.probe
survivor packages/audit/src/CircuitBreaker.ts:414:31 EqualityOperator Survived -> permit._tag !== "Admitted" on: permit._tag === "Admitted"
survivor packages/audit/src/CircuitBreaker.ts:417:9 LogicalOperator Survived -> permit._tag === "Admitted" || permit.probe on: permit._tag === "Admitted" && permit.probe
survivor packages/audit/src/CircuitBreaker.ts:417:9 ConditionalExpression Survived -> true on: permit._tag === "Admitted" && permit.probe
survivor packages/audit/src/CircuitBreaker.ts:417:9 ConditionalExpression Survived -> true on: permit._tag === "Admitted"
```

`AuditDecisionSinkLive.ts` has no survivor. Several survivors above (the span attributes at `:412` to `:414`, the `:387` re-read conditions) are mutants that live only on the base's admission code; the close judges them against the refactored file, not line by line.

## Table

`CircuitBreakerTable.test.ts` holds 16 `it.effect` rows (O1-O5, S1-S3, F1-F4, C1, C2, R1, R2), each under `isolatedMetrics` with `TestClock`, each asserting the `[Closed, Open, HalfOpen]` announcement counts exactly and that the metric holds no word but the three statuses. Every row held as written from RESEARCH Q3: no expected value was corrected, and no difference from the base is to record. Output: `Tests  16 passed (16)`. Boundary rows pin both sides (O2 at 9999 ms stays Open, O3 at exactly 10 000 ms transitions; O4 against O5 for a claimed window; F4 and R1 for a window restarted from the failure or the release).

Rows that need a stale generation (S1, F1) or a stolen claim (R2) reuse the `settleLater` and `holdPermit` idiom of `CircuitBreaker.test.ts`, which stays byte-identical (blob `6f2222f206968b60a418c3f5ca03f54286270272`).

## RED on the base

`CircuitBreakerOptions.test.ts` holds 26 rows. On the base (`git diff d6f1aff7 -- packages/audit/src` empty):

```
 Test Files  1 failed (1)
      Tests  21 failed | 5 passed (26)
```

The `failureThreshold NaN` row fails with `built a breaker that reads Closed then Closed after 10 consecutive failures`. Each refused row's base behaviour, read from its own failure message (RESEARCH Pitfall 4 predicted these differ):

| Row | Base behaviour |
|-----|----------------|
| `failureThreshold NaN` | never opens: `Closed then Closed` after 10 failures |
| `failureThreshold Infinity` | never opens: `Closed then Closed` |
| `failureThreshold -Infinity` | opens on the first failure: `Open then Open` |
| `failureThreshold 0` | opens on the first failure: `Open then Open` |
| `failureThreshold -1` | opens on the first failure: `Open then Open` |
| `failureThreshold 2.5` | opens on the third failure: `Open then Open` |
| `resetTimeoutMs NaN` | decodes to zero, flaps: `HalfOpen then Open` |
| `resetTimeoutMs Infinity` | never leaves Open: `Open then Open` |
| `resetTimeoutMs -Infinity` | flaps: `HalfOpen then Open` |
| `resetTimeoutMs 0` | flaps: `HalfOpen then Open` |
| `resetTimeoutMs -1` | flaps: `HalfOpen then Open` |
| `resetTimeoutMs 1.5` | accepted as a sub-millisecond-fraction cooldown: `Open then Open` |
| `resetTimeoutMs 1n` (one nanosecond) | accepted: `Open then Open` |
| `resetTimeoutMs '1e3 seconds'` | `makeCircuitBreaker` dies: `expected Error: Invalid Input: 1e3 seconds to have property '_tag'` |
| sink `failureThreshold NaN` | layer builds, first record `Written` |
| sink `resetTimeoutMs NaN` | layer builds, first record `Written` |
| sink `storeCallTimeout NaN`, `-Infinity`, `0`, `-1` | layer builds, first record `Written` |
| sink `storeCallTimeout '1e3 seconds'` | the layer dies: `Invalid Input: 1e3 seconds` |

The five accepted rows (`failureThreshold 1`, `resetTimeoutMs 1`, `resetTimeoutMs 2_000_000n`, `storeCallTimeout 1`, `storeCallTimeout Duration.infinity`) pass on the base. The whole audit project reads `Tests  21 failed | 421 passed (442)`: the 21 are exactly these rows and every other test is green.

One base behaviour differs from RESEARCH Pitfall 4: the sink's zero, negative and `NaN` `storeCallTimeout` rows do not end `WriteFailed` here. The rows run `AuditTrailPortTest().layer`, whose write settles synchronously and wins the race against a zero deadline, so the first record ends `Written`. `WriteFailed` needs a pending store call (the `AuditSinkDeadline.test.ts` zero row uses a `Latch` reply). The row still refuses to pass until construction fails, which is what the RED evidences.

## Deviations from Plan

None - plan executed exactly as written. One edit inside the new options file before its commit: a stray placeholder helper I had left in the first draft was removed; it never reached a commit.

## Verification

- Task 1: the JSON keys and scores check, the first-commit check (`chore(45-01):` alone, its parent `phase_base`) and the ten reserved ids all pass.
- Task 2: `Tests  16 passed`; `packages/audit/src`, `packages/core/src` and `packages/testing/src` equal `phase_base`; the `CircuitBreaker.test.ts` blob is unchanged; `pnpm typecheck` and `pnpm lint` exit 0; the structural check (16 titles each once, committed alone) passes.
- Task 3: `Tests  21 failed | 5 passed` with the never-opening message; the 26 titles in order; the file imports no new error class and holds no `"qadi_` literal; `pnpm typecheck` and `pnpm lint` exit 0; the commit carries only this file.
- No change under `packages/*/src`, `spec`, `scripts`, `.changeset`, `apps` or `AGENTS.md`.

## Known Stubs

None.

## Threat Flags

None. No new network, auth, file or schema surface; only tests and a data file.

## Next Phase Readiness

45-02 can add `step` and convert one event at a time with `CircuitBreakerTable.test.ts` and the 150-run model property as the equivalence oracle. 45-05 tightens the options rows to the class. `CircuitBreakerOptions.test.ts` is RED until then, so a verify that runs the whole audit project before 45-05 sees exactly 21 failures from that one file; earlier verifies in 45-02 and 45-03 that run the project should exclude it by exact path.

## Self-Check: PASSED

- FOUND: `.planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-mutation-base.json`
- FOUND: `packages/audit/test/CircuitBreakerTable.test.ts`
- FOUND: `packages/audit/test/CircuitBreakerOptions.test.ts`
- FOUND: `203bbbe2`, `64422f42`, `849fb8a8` (each an ancestor of HEAD)

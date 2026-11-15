---
phase: QD-45-the-audit-circuit-breaker-as-one-transition-function
verified: 2026-11-15T08:40:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".changeset/audit-options-refused-when-built.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-01-PLAN.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-01-SUMMARY.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-02-PLAN.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-02-SUMMARY.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-03-PLAN.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-03-SUMMARY.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-04-PLAN.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-04-SUMMARY.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-05-PLAN.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-05-SUMMARY.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-06-PLAN.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-06-SUMMARY.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-07-PLAN.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-07-SUMMARY.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-08-PLAN.md"
  - ".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-08-SUMMARY.md"
  - "packages/audit/src/AuditDecisionSinkLive.ts"
  - "packages/audit/src/CircuitBreaker.ts"
  - "packages/audit/src/InvalidAuditSinkOption.ts"
  - "packages/audit/src/SinkOptionChecks.ts"
  - "packages/audit/src/index.ts"
  - "packages/audit/test/AuditDecisionSinkLive.tst.ts"
  - "packages/audit/test/CircuitBreakerOptions.test.ts"
  - "packages/audit/test/CircuitBreakerTable.test.ts"
  - "packages/audit/test/CircuitBreakerTransition.test.ts"
covered_digest: "v4:sha256:a421755c7461d2f5d44e1fab770f65bc21e78f0d28f4d2afb0bc0da55a096f88"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 45: The audit circuit breaker as one transition function Verification Report

**Phase Goal:** Every generation and probe rule of the audit circuit breaker lives in one pure transition function, tested without fibers or a clock, and a breaker whose options cannot work is refused when it is built rather than silently never opening.
**Verified:** 2026-11-15
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `failureThreshold: NaN` is RED on the base; after the phase a non-finite, zero, negative or non-integer threshold or cooldown fails at construction with a typed error, one row per bad value | VERIFIED | `SinkOptionChecks.ts` `checkFailureThreshold` (`Number.isSafeInteger && > 0`) and `checkResetTimeoutMs` (finite, positive, safe-integer ms, raw number must be whole) fail with `InvalidAuditSinkOption` (`Data.TaggedError`, `option` + raw `received`). `makeCircuitBreaker` yields both checks first; `AuditDecisionSinkLive` yields `checkStoreCallTimeout` (layer error type widened to `InvalidAuditSinkOption`). `CircuitBreakerOptions.test.ts` has one `it.effect` row per bad value (NaN, +/-Infinity, 0, -1, 2.5, 1e300, 1.5, 1n, 1e21, 1.0000000001, -0, Duration.zero, and layer-level rows). RED commit `849fb8a8` precedes the feature commits (`79c824be` onward); plan 01 records `21 failed \| 5 passed` and the NaN message. |
| 2 | One pure `(state, event, now) -> (next, announced)` over a closed Observe/Success/Failure/Claim/Release union, each with its generation, holds every generation and probe rule; `generation + 1` is written once | VERIFIED | `step(rules)(state, event, now)` in `CircuitBreaker.ts` (pure, no Clock/Ref). Closed `Event` union of five `Data.TaggedClass`es; stale check is `admittedUnder` (one place); `ENTER` is a `Record<CircuitBreakerStatus, ...>`. `/usr/bin/grep "generation + 1"` in `packages/audit/src`: exactly 1 hit (line 322); base had 8. |
| 3 | The adapter runs exactly one `Ref.modify` per event (INV-QD-052); matchers built once at module scope; `Match.value(state)` no longer rebuilt per call | VERIFIED | `run(event)` is the only `Ref.modify` body (6 textual `Ref.modify` mentions: 1 call plus comments); `observe`, `recordSuccess`, `recordFailure`, `claimProbe`, `releaseProbe` all delegate to `run`. All dispatchers (`observeState`, `successState`, `failureState`, `claimState`, `releaseState`, `decide`, `admittedUnder`) are module-scope `Match.type<...>().pipe(Match.tagsExhaustive)`. `Match.value`, `switch`, `fnUntraced`, `Date.now()` calls: none in code. |
| 4 | Table-driven tests of the transition function cover a stale generation, a release stealing a newer claim, a stale failure reopening a newer window and every legal transition, with no fibers or TestClock | VERIFIED | `CircuitBreakerTransition.test.ts` is plain `it(...)` (no Effect, Fiber or TestClock): rows O1-O5, S1-S4, F1-F5, C1-C3, R1-R4 (S1 stale success, F1 stale failure does not reopen a newer window, R2 release does not steal a newer claim) plus a seeded FastCheck property over event sequences. Adapter table `CircuitBreakerTable.test.ts` (16 rows) is separate. |
| 5 | Existing concurrency regression tests (`CircuitBreaker.test.ts:339, 403, 426, 452`) pass unchanged; metrics and announcements unchanged | VERIFIED | `git diff d6f1aff7 HEAD -- packages/audit/test/CircuitBreaker.test.ts` is empty. `pnpm exec vitest run packages/audit`: 25 files, 478 tests, all passed (run by me). `transitionsTotal` declaration unchanged in role (still `Metric.frequency` with the same id, fed by `announceTransition`). Table rows assert announcements via `Metric.value(transitionsTotal)`. |

**Score:** 5/5 truths verified (0 behavior-unverified)

Behavior-dependent invariants (stale-generation ignore, release-must-not-steal, one-atomic-modify) are exercised by passing named tests (transition table rows S1/F1/R2, adapter table, and the unchanged concurrency tests), so none is left presence-only.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/audit/src/CircuitBreaker.ts` | `step`, event union, adapter `run` | VERIFIED | Substantive and wired: `makeCircuitBreaker` builds `step({failureThreshold, resetTimeoutMillis})` and every operation routes through `run`. |
| `packages/audit/src/SinkOptionChecks.ts` | three checks | VERIFIED | Used by `CircuitBreaker.ts` (two) and `AuditDecisionSinkLive.ts` (`checkStoreCallTimeout`). Package-private, not in barrel. |
| `packages/audit/src/InvalidAuditSinkOption.ts` | typed error | VERIFIED | `Data.TaggedError`, exported from `index.ts`, named in `spec/overview.md`; `api-surface` gate passes. |
| `packages/audit/src/AuditDecisionSinkLive.ts` | layer fails with typed error | VERIFIED | Return type `Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>`; `Duration.fromInputUnsafe` replaced by the check. |
| Three new test files plus `AuditDecisionSinkLive.tst.ts` | table, transition, options, type-level | VERIFIED | Present and green. |
| `45-mutation-base.json`, `45-mutation-after.json` | WX-05 evidence | VERIFIED | Base `CircuitBreaker.ts` 0.805, after 0.853; `AuditDecisionSinkLive.ts` 1 and 1; new files 1. No drop. Base JSON committed first (`203bbbe2`). |
| `.changeset/audit-options-refused-when-built.md`, `upgrading.md` | WX-07 | VERIFIED | `@qadi/audit` minor, text opens with **Breaking**, notes the runtime break (Infinity values) and the way to keep the old effect; upgrade-guide entry added. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `makeCircuitBreaker` | `SinkOptionChecks` | `yield* checkFailureThreshold / checkResetTimeoutMs` | WIRED |
| `AuditDecisionSinkLive` | `checkStoreCallTimeout` | `yield*` at layer build | WIRED |
| each breaker operation | `step` | `run` -> `Ref.modify` -> `transition(before, event, now)` | WIRED |
| `step` result | `transitionsTotal` | `announced` -> `announceTransition` after the modify | WIRED |

### Data-Flow Trace (Level 4)

Not applicable beyond the above: no rendered data; the state flows from `Ref` through `step` to `status`/`Admitted.generation`, and the claim win is derived from `before` vs `next`, not a literal.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Audit package suite | `pnpm exec vitest run packages/audit` | 25 files, 478 passed | PASS |
| House-style gate | `node scripts/check-house-style.mjs` | 513 files clean (3 declared switches, unchanged) | PASS |
| API-surface gate 13 | `node scripts/check-api-surface.mjs` | 928 exports documented | PASS |

The orchestrator's `pnpm check:pr` (exit 0, 5266 unit, 568 BDD) was not re-run by me; the audit subset and the two cheap gates above were.

### Probe Execution

No probes declared by the phase. SKIPPED.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| BRKR-01 one pure step, closed union, `generation + 1` once | SATISFIED | Truth 2 |
| BRKR-02 one `Ref.modify` per event, module-scope matchers | SATISFIED | Truth 3 |
| BRKR-03 options validated at construction, NaN RED on base | SATISFIED | Truth 1 |
| BRKR-04 table-driven tests, no fibers/TestClock | SATISFIED | Truth 4 |
| BRKR-05 concurrency tests unchanged | SATISFIED | Truth 5 |
| WX-01 `check:pr` green | SATISFIED (orchestrator-reported; audit suite and gates 11-13 re-run here) | |
| WX-02 ADR/CCR/BEH/INV/traceability with reserved ids only | SATISFIED | ADR-QD-158 file plus `index.yaml`; CCR-QD-436 row in `spec/README.md`; BEH-QD-561, INV-QD-335 used; BEH-QD-562-565 and INV-QD-336 recorded as Unused in the CCR row; traceability rows present. No evidence `next-id.mjs` was run (no such commit content). |
| WX-03 `spec/overview.md` names added exports | SATISFIED | `InvalidAuditSinkOption` named; gate 13 passes |
| WX-04 nothing forbidden added | SATISFIED | House-style clean; no `switch`, `fnUntraced`, `as`, `any`, `async`, ambient clock/console in the new source |
| WX-05 mutation score does not fall | SATISFIED | 0.805 -> 0.853; others 1 -> 1 |
| WX-06 characterisation/regression tests first | SATISFIED | Table test green on base (`64422f42`), options RED on base (`849fb8a8`), both before any source change (`4576c7e6`) |
| WX-07 Breaking recorded in changeset and `upgrading.md` | SATISFIED | See artifacts; nothing released |

No orphaned requirements: REQUIREMENTS.md maps BRKR-01..05 to Phase 45 and WX-01..07 to all phases; all 12 IDs are claimed by the plans and accounted for.

### Anti-Patterns Found

None. No TBD/FIXME/XXX/TODO/HACK in the changed source or new tests. Decision D-06a (`Duration.infinity` accepted for `storeCallTimeout` only) is honoured by `checkStoreCallTimeout` (no finiteness test) and documented in the changeset.

### Human Verification Required

None.

### Notes (informational, not gaps)

- `.planning/ROADMAP.md` line 373 still shows Phase 45 as `[ ]` in the phase list (the plans list says 8/8 executed, and REQUIREMENTS.md marks BRKR-01..05 Complete). A bookkeeping tick for the orchestrator.
- Three-iteration review (10 findings, 0 open) fixed after execution; the fixes (safe-integer bounds, whole-number raw cooldown) are in HEAD and covered by the rows above.

### Gaps Summary

None. The goal is achieved in the code: the rules are one pure `step`, adapted by a single `Ref.modify` path, tested without effects, and unworkable options are refused with `InvalidAuditSinkOption` at build time.

---

_Verified: 2026-11-15_
_Verifier: Claude (gsd-verifier)_

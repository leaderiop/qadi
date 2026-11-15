---
phase: QD-45-the-audit-circuit-breaker-as-one-transition-function
reviewed: 2026-11-15T08:20:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - .changeset/audit-options-refused-when-built.md
  - apps/website/src/content/docs/docs/packages/audit/capabilities.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - packages/audit/README.md
  - packages/audit/src/AuditDecisionSinkLive.ts
  - packages/audit/src/CircuitBreaker.ts
  - packages/audit/src/InvalidAuditSinkOption.ts
  - packages/audit/src/SinkOptionChecks.ts
  - packages/audit/src/index.ts
  - packages/audit/test/Agreement.test.ts
  - packages/audit/test/AuditDecisionSinkLive.tst.ts
  - packages/audit/test/AuditSinkDeadline.test.ts
  - packages/audit/test/CircuitBreakerOptions.test.ts
  - packages/audit/test/CircuitBreakerTable.test.ts
  - packages/audit/test/CircuitBreakerTransition.test.ts
  - packages/audit/test/driveExit.ts
  - spec/README.md
  - spec/behaviors/33-audit-pipeline.md
  - spec/decisions/126-an-audit-store-call-has-a-deadline.md
  - spec/decisions/158-the-breakers-rules-are-one-transition-function.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase QD-45: Code Review Report

**Reviewed:** 2026-11-15T08:20:00Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

The transition function is correct. I traced every arm of `step` against the base's five `Ref.modify` bodies
(`git show d6f1aff7:packages/audit/src/CircuitBreaker.ts`) and found no behavioural difference:

- The stale-generation check happens before any arm. Observe and Claim carry no generation, as D-02 requires.
- `generation + 1` is written once, in `step`. `ENTER` is a closed record, so a missing status is TS2741.
- A Claim is won exactly when `Equal.equals(before, next)` is false. A claimed HalfOpen, Closed and Open all answer the
  state they were given, so only an unclaimed HalfOpen changes.
- A Release steals nothing, because the generation check runs first.
- Observe's age-out and reset boundaries (`<` against `resetTimeoutMillis`) match the base.
- Each event is exactly one `Ref.modify`. The clock is read once, outside it, as before.

The refusal is a typed failure of the layer, not a defect. The tests use `Cause.findErrorOption`, which only matches
`Fail`, so a defect would fail them. The layer's error type is `InvalidAuditSinkOption`, and the `.tst.ts` pins it.
`received` is the raw input, so `NaN` is reported as `NaN` and not `0 millis`. I confirmed this by running the checks
against NaN, `-0`, bigint, nested objects, a circular object and malformed strings. The `message` getter never throws.
`Duration.infinity` stays accepted for `storeCallTimeout` (D-06a), which is not a finding.

Verification I ran (read-only):

- `node scripts/check-house-style.mjs` is clean.
- `oxlint packages/audit` and `tsc -b packages/audit` are clean.
- `vitest --project audit` on CircuitBreaker*, AuditSinkDeadline and Agreement passes: 6 files, 108 tests.
- No `as`, `!`, `any` or `switch` in the added source.
- Phase 48's lines in `AuditDecisionSinkLive.ts` (:78, :176) are untouched.

No blockers. One validation gap (WR-01) leaves a smaller version of the defect the phase set out to close. The rest is
a doc claim that the code contradicts, two doc gaps and test-coverage nits.

## Warnings

### WR-01: `failureThreshold` and `resetTimeoutMs` still accept values that can never trip or reset, and a non-whole millisecond passes the whole-ms rule

**File:** `packages/audit/src/SinkOptionChecks.ts:13-16`, `:25-33`
**Issue:** The phase's goal is a breaker that cannot silently never open. `Infinity` is refused, but the bound that
makes it unreachable is not.

- `checkFailureThreshold` uses `Number.isInteger`. `failureThreshold: 1e300` (or any value above
  `Number.MAX_SAFE_INTEGER`) passes. `consecutiveFailures` counts by 1 and cannot reach it, so it is the same
  "never opens" breaker as `NaN`/`Infinity`.
- `checkResetTimeoutMs` has the same gap. `resetTimeoutMs: 1e21` (verified: accepted, answers `1e+21`) and
  `10n ** 30n` nanos (accepted, `1e+24`) never leave Open, which is what the ADR measured for `Infinity`. The rule is
  inconsistent: `Infinity` is refused as "not finite" while a number a million years long is accepted.
- The "whole number of milliseconds" test runs on the decoded `Duration`. `Duration.millis` stores a non-integer as
  rounded nanoseconds, so `resetTimeoutMs: 1.0000000001` is accepted and silently becomes 1 ms (verified). `1.5` is
  refused only because the rounding is exact there. The documented rule ("whole number of milliseconds") and the
  implementation disagree at the edges.

**Fix:** bound the integers and test the raw number where the input is a number.
```ts
export const checkFailureThreshold = (received: number): Effect.Effect<number, InvalidAuditSinkOption> =>
  Number.isSafeInteger(received) && received > 0
    ? Effect.succeed(received)
    : Effect.fail(new InvalidAuditSinkOption({ option: "failureThreshold", received }));

// resetTimeoutMs: reject a raw non-integer number before decoding, and cap the decoded value.
const millis = Option.filter(Duration.fromInput(received), (d) => Duration.isFinite(d) && Duration.isPositive(d)).pipe(
  Option.map(Duration.toMillis),
  Option.filter(Number.isSafeInteger),
  Option.filter(() => typeof received !== "number" || Number.isInteger(received)),
);
```
Add table rows for `1e300`, `1.0000000001` and `1e21` in `CircuitBreakerOptions.test.ts`.

## Info

### IN-01: `step`'s doc claims "an event that changes nothing answers the state it was given, reference-equal"; `Success` on a Closed breaker does not

**File:** `packages/audit/src/CircuitBreaker.ts:231`, `:302-304`
**Issue:** `successState`'s `Closed` arm always builds a new `StateClosed`, even when `consecutiveFailures` is already
0. That event changes nothing, yet the answer is an equal but distinct object. This is the common case (every
successful write while Closed). The doc comment promises reference equality. `CircuitBreakerTransition.test.ts` only
asserts `strictEqual` for stale, Open, claimed and similar rows, never for this one, so the claim is untested and false
for the hottest event. It also writes a fresh object into the `Ref` on every healthy write. The base did the same, so
behaviour is unchanged.
**Fix:** answer the state when there is nothing to reset, and add a row that pins it.
```ts
Closed: (closed): Move =>
  closed.consecutiveFailures === 0
    ? closed
    : new StateClosed({ generation: closed.generation, consecutiveFailures: 0 }),
```
Or soften the comment to "equal to".

### IN-02: The upgrade guide and changeset say a valid composition "behaves as before" but give no way to keep an old "never trip" or "never reset" setting

**File:** `apps/website/src/content/docs/docs/reference/upgrading.md:744`, `.changeset/audit-options-refused-when-built.md:6`
**Issue:** `failureThreshold: Infinity` (disable the breaker) and `resetTimeoutMs: Duration.infinity` (hold a tripped
breaker open) were accepted and did what they said (the ADR records `Infinity` "never left Open"). They are now refused.
That is a runtime break for those callers, not only a type-annotation break. The guide's "only a type annotation ...
stops compiling" is accurate only for callers who passed valid values. Nothing says what to pass instead (for example
`Number.MAX_SAFE_INTEGER`, once WR-01 makes that the explicit bound).
**Fix:** add one sentence to the guide and the changeset naming the runtime break and the replacement value.

### IN-03: Option-test gaps that leave accepted and refused rows unpinned

**File:** `packages/audit/test/CircuitBreakerOptions.test.ts:89-97`, `:140-170`
**Issue:**
- `acceptedByBreaker` only checks the status is `Closed`. It does not show the breaker can open, so an over-wide
  acceptance still passes.
- The sink table has one row per bad value for `storeCallTimeout`, but only `NaN` for the other two options.
- There is no row for `storeCallTimeout: "Infinity"` (the string form of the accepted opt-out), for `-0`, or for the
  `Duration` objects `Duration.millis(-1)` and `Duration.zero` as `resetTimeoutMs`. I ran these and they behave
  correctly, but nothing pins them.
**Fix:** drive `acceptedByBreaker` through `failureThreshold` failures and assert `Open`. Add rows for `"Infinity"`,
`-0` and a `Duration.zero` `resetTimeoutMs`.

### IN-04: Lines in the new source exceed the hand-wrapped width the codebase uses

**File:** `packages/audit/src/SinkOptionChecks.ts:13`, `:25-26`, `:43`; `packages/audit/src/CircuitBreaker.ts:231`
**Issue:** several lines run to 110-130 columns. AGENTS.md section 17 settles on hand-wrapping at about ninety, and the
rest of `packages/audit/src` follows it. `oxfmt` is not a gate, so nothing fails; it is a consistency nit.
**Fix:** wrap the signatures and the `Option.filter` chains.

---

_Reviewed: 2026-11-15T08:20:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

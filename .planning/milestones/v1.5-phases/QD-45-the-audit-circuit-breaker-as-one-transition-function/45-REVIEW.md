---
phase: QD-45-the-audit-circuit-breaker-as-one-transition-function
reviewed: 2026-11-15T10:00:00Z
depth: standard
iteration: 3
files_reviewed: 13
files_reviewed_list:
  - .changeset/audit-options-refused-when-built.md
  - apps/website/src/content/docs/docs/packages/audit/capabilities.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - packages/audit/README.md
  - packages/audit/src/AuditDecisionSinkLive.ts
  - packages/audit/src/CircuitBreaker.ts
  - packages/audit/src/InvalidAuditSinkOption.ts
  - packages/audit/src/SinkOptionChecks.ts
  - packages/audit/test/CircuitBreakerOptions.test.ts
  - spec/README.md
  - spec/behaviors/33-audit-pipeline.md
  - spec/decisions/158-the-breakers-rules-are-one-transition-function.md
  - .planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-REVIEW-FIX.iter2.md
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase QD-45: Code Review Report (iteration 3)

**Reviewed:** 2026-11-15T10:00:00Z
**Depth:** standard
**Files Reviewed:** 13 (the fix diff `d3bb6271~1..d3bb6271`, plus every file that states the option rules)
**Status:** issues_found

## Summary

All three iteration-2 findings are resolved in the code and the docs they named. The commit changes no behavior: it
touches message strings, doc comments, one test title and spec revisions, and `vitest` on
`CircuitBreakerOptions.test.ts` passes (39 tests). `InvalidAuditSinkOption`'s `REQUIRED` now agrees with
`SinkOptionChecks.ts` (safe integer; whole milliseconds within the safe integers; positive duration with
`Duration.infinity` allowed for `storeCallTimeout`). The revisions agree with the file headers: BEH-QD-561 sits in
33-audit-pipeline.md Rev 1.21, ADR-QD-158 Rev 1.3, `spec/README.md` Rev 1.192, and the CCR-QD-436 row names all three
with the same numbers. D-06a holds.

The new sentence that fixes iteration-2 IN-01 is wrong about what the code does (WR-01), and one mirror of the
changeset, the `upgrading.md` 0.13 entry, was not brought to the new wording (IN-01). Both are documentation only.

## Warnings

### WR-01: The new qualifier says a string or `Duration` cooldown "rounds to the millisecond"; the check refuses it unless it is already a whole millisecond

**File:** `packages/audit/src/AuditDecisionSinkLive.ts:54-57`, `packages/audit/src/CircuitBreaker.ts:77-81`,
`.changeset/audit-options-refused-when-built.md:5`,
`spec/decisions/158-the-breakers-rules-are-one-transition-function.md:61-63`
**Issue:** Iteration-2 IN-01 was fixed by adding "a string or `Duration` is read as `Duration` reads it, which rounds to
the millisecond" to both option docs, the changeset and ADR-QD-158 point 4. `Duration` rounds to the nanosecond, not the
millisecond, and `checkResetTimeoutMs` then refuses any result that is not a whole safe-integer millisecond count
(`Option.filter(Number.isSafeInteger)` on `Duration.toMillis`). Verified by running the check's pipeline on the installed
`effect`:

| Input | Result |
| ----- | ------ |
| `"1.0000000001 millis"` | accepted as 1 ms (sub-nanosecond noise is dropped) |
| `Duration.millis(1.0000000001)` | accepted as 1 ms |
| `"1.5 millis"`, `Duration.millis(1.5)`, `"1500 micros"` | refused |
| `"1.5 seconds"` | accepted as 1500 ms (whole) |

So a reader of the option doc or the release note would expect `"1.5 millis"` to become 1 or 2 ms, and it fails the
layer. The rule a string or `Duration` follows is "whole milliseconds after `Duration` rounds to the nanosecond", the
same rule as a number except that sub-nanosecond noise is dropped. The doc claims a rounding that does not exist.
**Fix:** say what happens, in the four places:
```
A plain number is tested for being whole. A string or `Duration` is read as `Duration` reads it, to the nearest
nanosecond, and is refused unless that is a whole number of milliseconds (`"1.5 seconds"` is accepted, `"1.5 millis"`
is not).
```
Optionally pin it with two rows in `CircuitBreakerOptions.test.ts`: `"1.5 millis"` refused, `"1.5 seconds"` accepted.

## Info

### IN-01: The 0.13 entry in `upgrading.md` still states the old rule and omits the qualifiers the changeset gained

**File:** `apps/website/src/content/docs/docs/reference/upgrading.md:744`
**Issue:** The fix commit updated the changeset, `README.md` and `capabilities.md` but not the upgrade guide's mirror of
the changeset. Line 744 still reads "a `failureThreshold` that is not a positive whole number" and "a `resetTimeoutMs`
that is not a finite, positive, whole number of milliseconds", while the refusal message says "positive safe integer" and
"... within the safe integers". It is not self-contradictory (a later clause refuses "any value past
`Number.MAX_SAFE_INTEGER`"), but it is the page a user reads when the new error appears, and it disagrees with that
error's wording. It also lacks the `storeCallTimeout`-only `Duration.infinity` sentence and the "no infinite opt-out for
the cooldown" note that the changeset added in the same commit.
**Fix:** copy the changeset's refused-options sentences into line 744 (after correcting WR-01's qualifier).

## Iteration 2 findings

| ID | Result | Evidence |
| -- | ------ | -------- |
| WR-01 | Resolved | `InvalidAuditSinkOption.ts:23-24` reads "a positive safe integer" and "... whole number of milliseconds within the safe integers"; the two pinned message rows in `CircuitBreakerOptions.test.ts` follow and pass. `CircuitBreaker.ts:28-30`, `README.md:98-100`, `capabilities.md:22` and `:76` agree. Residual: `upgrading.md:744` (IN-01 above). |
| IN-01 | Resolved in intent, with a wrong sentence | The qualifier is now in both option docs, the changeset and ADR point 4, and BEH-QD-561 says "a raw number". The wording "rounds to the millisecond" is inaccurate (WR-01 above). |
| IN-02 | Resolved | The changeset scopes "`Duration.infinity` is still accepted" to `storeCallTimeout` and says the cooldown has no infinite opt-out; ADR point 4 states the bound as exactness; the test title reads "the largest count it can hold exactly". |

---

_Reviewed: 2026-11-15T10:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

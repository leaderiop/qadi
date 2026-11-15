---
phase: QD-45-the-audit-circuit-breaker-as-one-transition-function
fixed_at: 2026-11-15T08:35:00Z
review_path: .planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-REVIEW.md
iteration: 3
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 45: Code Review Fix Report (iteration 3, the last)

Earlier iterations: `45-REVIEW-FIX.iter1.md` (5 of 5 fixed) and `45-REVIEW-FIX.iter2.md` (3 of 3 fixed, `d3bb6271`). Both iteration-3 findings are fixed in `4e413439`.

## Fixed Issues

### WR-01: The new qualifier says a string or `Duration` cooldown "rounds to the millisecond"; the check refuses it unless it is already a whole millisecond
`Duration` keeps nanoseconds. Probed on the installed effect: `"1.5 millis"`, `Duration.millis(1.5)` and `"1500 micros"` decode to 1.5 ms and are refused, `"1.5 seconds"` decodes to 1500 ms and is accepted, and `"1.0000000001 millis"` decodes to 1 ms. Both option docs, the changeset and ADR-QD-158 point 4 now say that a string or `Duration` is read to the nanosecond and must come to whole milliseconds.

### IN-01: The 0.13 entry in `upgrading.md` still states the old rule and omits the qualifiers the changeset gained
The entry's prose now carries the changeset's rules word for word: safe integer, safe-integer milliseconds, the number versus string/`Duration` qualifier, `Duration.infinity` for `storeCallTimeout` only, and no infinite opt-out for the cooldown. It keeps its own closing sentence about type annotations.

Revisions: ADR-QD-158 Rev 1.4, `spec/README.md` Rev 1.193, and the CCR-QD-436 row names both.

Checks: `vitest --project audit` 478/478, `pnpm typecheck`, `pnpm lint` (house-style clean), `pnpm spec:verify:strict` 21/0, `pnpm spec:website-examples` 63 blocks.

The loop's cap of 3 iterations is reached, so no fourth review ran. Iteration 3's review and its probe confirmed that the code is unchanged in behaviour since iteration 2. These two fixes are comment and documentation edits only.

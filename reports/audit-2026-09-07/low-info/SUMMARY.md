# Low/Info re-audit — summary

Re-derives the 132 Low + 104 Info findings the 2026-09-06/09-07 audit counted but never
itemized (the per-slice detail was session-scoped and unrecoverable — see
[issue #49](https://github.com/leaderiop/qadi/issues/49)). This is an independent
re-derivation, not a recovery: **104 Low + 87 Info = 191 findings**, close in shape to
the original 236 but not identical, which is expected — a fresh pass over the same
code by different reviewers produces a different (not wrong) list.

Method: 51 parallel agents (one per original DASHBOARD.md slice, minus a 3-way split
adjustment — `ExamplesWebsite` became `ExamplesA`/`ExamplesB` after its true scope
turned out to be 1,382 files once build artifacts were included), each independently
re-reading its assigned scope and writing structured findings to `<slice>.json` in
this directory. Two slices needed no fixed file list (`SecEnforce`, `SecUntrusted`,
`CoreTestsB`) and were bounded instead by an explicit grep-first instruction or file
enumeration, after an initial pass without that bound caused 20/50 agents to stall.

## Escalations

Four findings looked like they exceed Low/Info severity and were flagged rather than
force-fit into this sweep's rubric — each names a real interpreter-agreement or
concurrency concern:

- **MetricsHistory** — a possible race in `DecisionCache.ts`'s waiter-interruption
  logic between the `waiters === 0` snapshot and the actual `Fiber.interrupt` call.
- **PredicateDialects** — `predicate-sql`'s `isSafeValue` doesn't exclude `NaN`,
  and PostgreSQL treats `NaN = NaN` as true while `evaluatePredicate`'s `===`
  does not — an INV-QD-047 divergence for `Eq`/`Neq` specifically.
- **PredicatesSlice** — `Predicate.ts`'s `compare()` lacks the `Number.isFinite`
  guard `Matcher.ts`'s `evaluateMatcher` has for `Gte`/`Lt`, so a non-finite bound
  makes the compiled predicate and the evaluator disagree (INV-QD-018).
- **SecUntrusted** — `FieldPath.ts`'s `projectAt` has no depth guard, unlike every
  sibling recursive walk over untrusted-derived input in this codebase.

These four are candidates for their own dedicated tickets (same shape as H1–H7),
not the themed Low/Info grouping below.

## Findings by slice

Raw counts per slice — see `<slice>.json` for the itemized list. Full 191-item
breakdown and package/theme grouping happens in the wayfinder map
(issue #33) follow-up tickets, not here — this file is the discovery record, not
the disposition plan.

Type: task
Status: resolved
Severity: MED
Source: reports/audit-2026-09-06/dashboard-50-agent.html — Evaluator Core agent

## Question

Fix the following audit finding in `packages/core/src/Evaluate.ts`:

Decision-cache key omits maxDepth, so getOrCompute coalescing can serve one caller's PolicyTooDeep failure to a concurrent caller who asked for a deeper limit

## Done when

- The described defect no longer reproduces (add/adjust a test that pins the corrected behavior where none already covers it).
- The fix follows AGENTS.md conventions (Effect v4 style, `Context.Service`, `Data.TaggedError`, `Match` not `switch`, no `as`/`any`/`!`, etc).
- `pnpm check` (or the narrowest correct subset: typecheck + the affected package's tests) passes.
- Change is committed atomically with a message describing the fix.

## Answer

This is the Evaluate.ts side of the same defect ticket 18 fixes in
`DecisionCache.ts`. `evaluate` built `cacheKey` from `{subject, policy,
resource, action}` only, so two asks differing solely in `options.maxDepth`
produced the identical key — meaning not just concurrent in-flight coalescing
but a plain sequential cache **hit** could serve a generous-limit ask's
successful trace back to a later, shallower-limit ask that should have failed
`PolicyTooDeep`.

`packages/core/src/DecisionCache.ts`'s `DecisionCacheKey` interface (owned by
ticket 18, a parallel change) does not yet declare a `maxDepth` field, and
this task was scoped not to edit that file. Rather than leaving the
Evaluate.ts side undone until that type lands, the fix carries `maxDepth` on
the actual object handed to `getOrCompute` **without** annotating it as
`DecisionCacheKey` — annotating an object literal with a type lacking a
property it has is an excess-property error. `DecisionCache.ts`'s own doc
comment already establishes why this is sufficient rather than a workaround:
Effect's `Equal`/`Hash` compare plain objects *structurally*, over every own
key actually present at runtime, typed or not (confirmed against
`effect@4.0.0-rc.112`'s `Equal.js`/`Hash.js` — `compareObjects`/`structure`
walk the object's actual keys, not a declared type). So carrying `maxDepth`
here already makes two otherwise-identical asks with different limits hash
and compare unequal, and `getOrCompute` cannot coalesce one onto the other —
whether they arrive concurrently (the in-flight `Deferred` path) or
sequentially (the completed-`entries` path this ticket's test exercises).
Passing the now-wider, unannotated object to `getOrCompute(key: DecisionCacheKey,
...)` still type-checks, by ordinary structural widening on a named
variable (not a fresh literal), so no `as`/`any` was needed. The
now-unused `DecisionCacheKey` type import was removed.

**Once ticket 18 adds `maxDepth` to `DecisionCacheKey`, this code needs no
further change** — the object already carries the field; it will simply
become an exact match of the (updated) type instead of a structural superset
of it, and a future editor is free to restore the explicit annotation for the
type-level guarantee.

Pinned by a new test in `packages/core/test/DecisionCache.test.ts`, "maxDepth
is part of the question — a shallower limit is not served the generous
limit's cached answer": a 5-deep `Not`-chain is evaluated once with
`maxDepth: 10` (succeeds) and once with `maxDepth: 2` for the same
subject/policy/resource/action (must fail `PolicyTooDeep`). Verified this
fails before the fix (`Success` returned for both asks — the shallow ask
wrongly served the generous ask's cached trace) and passes after it.

`pnpm --filter @qadi/core typecheck` and `pnpm --filter @qadi/core test` both
pass (805 tests).

**Flag for consolidation:** ticket 18 (owned by a different agent, in
`packages/core/src/DecisionCache.ts`) should add `maxDepth: number` to
`DecisionCacheKey` and thread it through `getOrCompute`'s doc comment /
`EvaluationRequirements`-adjacent types as needed. No merge conflict is
expected — this change touches only `Evaluate.ts` and its test file — but the
type-level guarantee this ticket currently gets only at runtime (via
structural `Equal`/`Hash`) should be restored once that type exists, by
re-adding the explicit `DecisionCacheKey` annotation on `cacheKey` here.

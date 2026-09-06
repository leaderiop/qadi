Type: task
Status: resolved
Severity: MED
Source: reports/audit-2026-09-06/dashboard-50-agent.html — Core Performance agent

## Question

Fix the following audit finding in `packages/core/src/Evaluate.ts`:

matcherContext is rebuilt on every evaluateNode call, but it depends only on (subject, request), which are invariant across the whole recursion; composite tags and permission/role leaves that never read it still pay the allocation. Build it once in evaluate's Effect.suspend next …

## Done when

- The described defect no longer reproduces (add/adjust a test that pins the corrected behavior where none already covers it).
- The fix follows AGENTS.md conventions (Effect v4 style, `Context.Service`, `Data.TaggedError`, `Match` not `switch`, no `as`/`any`/`!`, etc).
- `pnpm check` (or the narrowest correct subset: typecheck + the affected package's tests) passes.
- Change is committed atomically with a message describing the fix.

## Answer

`evaluateNode` rebuilt `matcherContext` (`{ subject: subject.attributes, subjectId,
resource, action }`) at the top of every call — every composite node (`AllOf`,
`AnyOf`, `Rules`, `Not`, `Obliged`, `Labeled`) and every leaf that never reads
it (`HasPermission`, `HasRole`, `HasRelationship`, `HasAction`, `HasActed`,
`HasCustom`, `HasSignature`) paid the allocation, even though the value is
identical for the whole recursive walk: it depends only on `(subject,
request)`, both invariant from the root policy down to the deepest leaf of one
`evaluate` call.

Fixed by building it exactly once, inside `evaluate`'s `Effect.suspend`
(alongside the already-suspended `request` object, for the same
cache-hit-pays-nothing reason that suspend exists), and threading it as an
explicit parameter through `evaluateNode` and its `evaluateAllOf`/
`evaluateAnyOf`/`evaluateRules` helpers — including every recursive call site:
`Not`, `Obliged`, `Labeled`, and both the sequential and concurrent branches of
`AllOf`/`AnyOf`/`Rules`. `evaluateNode` no longer constructs it at all; only
the two leaves that ever read it (`HasAttribute`, `HasResourceAttribute`)
consume the parameter.

This is the `evaluateNode`/`mergeFields` switch AGENTS.md §5a already budgets
for `Evaluate.ts` (`SWITCH_BUDGET` in `scripts/check-house-style.mjs`) — no
switch was added or removed, only its parameter list changed, and
`node scripts/check-house-style.mjs` still reports "4 declared switch(es)".

Threading a required positional parameter through every call site means a
missed one is a compile error, not a silent behavior change — `pnpm
--filter @qadi/core typecheck` is itself a strong regression check here.
Additionally pinned by a new test in `packages/core/test/Evaluate.test.ts`,
"subject, resource and action references all resolve correctly through
Not/Rules/Labeled": one tree exercising every shape the threading has to
survive — two nested `Not`s (each a `depth + 1` recursive call), a `Rules`
table's sequential walk, and `Labeled`'s wrapper — with a leaf under each
comparing against a different one of `subject()`/`resource()`/`action()`,
verifying none of them see stale or wrong data.

`pnpm --filter @qadi/core typecheck` and `pnpm --filter @qadi/core test` both
pass (806 tests); `pnpm --filter @qadi/core exec vitest run --coverage` holds
`Evaluate.ts` at 99.14% statements / 97.87% branches, well above the 95%
package floor; `node scripts/check-house-style.mjs` and `oxlint` on the
changed files are both clean.

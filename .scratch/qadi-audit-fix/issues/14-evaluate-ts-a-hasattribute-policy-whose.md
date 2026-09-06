Type: task
Status: resolved
Severity: MED
Source: reports/audit-2026-09-06/dashboard-50-agent.html — Matcher Engine agent

## Question

Fix the following audit finding in `packages/core/src/Evaluate.ts`:

A HasAttribute policy whose matcher reads the resource silently denies when no resource was supplied — the guard asymmetry is that referencesAction is pre-checked (line 565, INV-QD-011) but there is no resource === undefined && referencesResource(policy.matcher) check, unlike Has…

## Done when

- The described defect no longer reproduces (add/adjust a test that pins the corrected behavior where none already covers it).
- The fix follows AGENTS.md conventions (Effect v4 style, `Context.Service`, `Data.TaggedError`, `Match` not `switch`, no `as`/`any`/`!`, etc).
- `pnpm check` (or the narrowest correct subset: typecheck + the affected package's tests) passes.
- Change is committed atomically with a message describing the fix.

## Answer

`HasAttribute`'s arm in `evaluateNode` already guarded against a matcher
reading the action with no action supplied (`action === undefined &&
referencesAction(policy.matcher)`, INV-QD-011), but had no symmetric guard for
a matcher reading the resource. `Matcher.ts`'s `resolveRef` resolves a
`ResourceRef` through `getByPath(context.resource, ref.path)`, which safely
returns `undefined` for an `undefined` resource rather than throwing —
`evaluateMatcher` is total — so the matcher simply compared against
`undefined`, failed, and the policy denied as if the subject's data had
genuinely not matched. That is indistinguishable from an ordinary denial to a
caller, exactly the confusion `HasResourceAttribute`'s own `MissingResource`
check (and the existing `MissingAction` guard) exist to avoid.

Fixed by adding `if (resource === undefined && referencesResource(policy.matcher))
return Effect.fail(new MissingResource({ attribute: policy.attribute }))`
immediately after the existing action check, importing the already-exported
`referencesResource` from `Matcher.ts` (it mirrors `referencesAction` and was
already used elsewhere, just not here). The failure carries `policy.attribute`
— the subject attribute the policy names — consistent with how
`HasResourceAttribute` reports the resource attribute it names.

Pinned by two new tests in `packages/core/test/Evaluate.test.ts`: "a HasAttribute
matcher referencing the resource fails, rather than denies, without one"
(asserts a typed `MissingResource` failure instead of a `Deny`), and "a
HasAttribute matcher referencing the resource allows once one is supplied"
(the positive half — supplying a resource must let evaluation reach the
match, not merely avoid the failure).

`pnpm --filter @qadi/core typecheck` and `pnpm --filter @qadi/core test` both
pass (804 tests).

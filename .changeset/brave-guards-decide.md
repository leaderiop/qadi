---
"@qadi/core": minor
---

Two fail-open defects fixed. Both were found by auditing `@qadi/http`, and both
live here.

**`guard` now evaluates the policy against the guarded resource.** It passed
`resource` to the handler and evaluated with `options.resource`, which no caller
set — so a resource-scoped policy was checked against nothing.

This failed **open**, not closed. An absent resource does not deny: a
`ResourceRef` resolves to `undefined`, and `neq` against `undefined` is `true`.
A policy written as "the subject's home tenant must differ from the resource's"
allowed a subject whose home tenant was exactly the resource's, and handed the
handler an `Authorized<P>` witness for a check that never ran.

If you use `guardRoute` from `@qadi/http`, its `loadResource` result was reaching
your handler but not your policy.

**Breaking**: a `resource` passed in `options` is now overridden by the
positional one. Two channels for one value is what caused this.

**The decision cache now keys on the whole subject, not `subject.id`.** An id
identifies a subject only if it determines that subject's grants. It doesn't:
a scoped token and a full token for one user share an id and hold different
permissions, so under an application-scoped cache the first verdict won
permanently — in both directions. A downgraded token inherited a full token's
allow; a full token inherited a downgraded token's denial.

**Breaking**: `DecisionCacheKey.subjectId` is now `DecisionCacheKey.subject`.

Two structurally equal subjects still hit, so the cache still caches. What
changes is that staleness is narrower than the docs claimed: a grant revoked in
the **subject** now re-evaluates, while one revoked only in a store the
evaluation consults stays cached. Application scope is safe against token
downgrade and unsafe against backend revocation; per-request scope is safe
against both.

Both defects were defended by a doc comment asserting the exact property that
was missing, which is why neither had been noticed.

See ADR-QD-043, INV-QD-032, INV-QD-033, BEH-QD-055, BEH-QD-168.

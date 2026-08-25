# ADR-QD-043 — A decision is computed from the inputs it claims, not from a proxy for them

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-043                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-23                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-08-23): Initial release (CCR-QD-058) |

---

## Context

Two fail-open defects, found by auditing `@qadi/http` and both living in
`@qadi/core`. They are the same mistake in two places: **an input the decision
depends on never reached the thing that decides.**

Neither could be seen from `@qadi/http`, and neither was caught by any gate.
Both were reproduced end to end before being fixed.

### `guard` evaluated the policy without the resource

`Qadi.ts` passed the guarded resource to the *handler* and evaluated the policy
with `options.resource`, which no caller set:

```ts
enforce(policy, options)(handler(witness, resource))
```

`guardRoute` in `@qadi/http` loads a resource per request and passes it here,
so its central parameter was authorization-inert. The failure is not a denial —
**an absent resource does not deny.** `resolveRef` returns `undefined` for a
`ResourceRef` with no resource, and a matcher comparing against it can succeed:
`neq` on `undefined` is `true`.

Reproduced: a route policy of `hasAttribute("homeTenant", neq(resource("tenant")))`
— "the subject's home tenant must differ from the resource's" — served `200` for
a subject whose home tenant was exactly the resource's. The handler then received
an `Authorized<P>` witness asserting a resource-scoped check that never ran.

It survived because the package's own fixture uses a subject-only policy, where
an empty resource and a correct one are indistinguishable.

### The decision cache keyed on the subject's id, not the subject

`Evaluate.ts` built `{ subjectId: subject.id, policy, resource, action }`.
`DecisionCache.ts` defended this: "not a leak across subjects, since the key
includes the subject."

An id is a proxy for a subject, and it is only a *sound* proxy if an id
determines that subject's grants. It does not. `@qadi/http`'s `SubjectExtractor`
rebuilds an `AuthSubject` per request from a bearer token, so a scoped token and
a full token for one user carry the same id and different permissions.

Reproduced under an application-scoped cache — a configuration `DecisionCache.ts`
documents as supported — in both directions: a scoped token receiving the full
token's allow, and a full token receiving the scoped token's denial. Whichever
was asked first won, for the life of the process.

## Decision

### The guarded resource is the evaluated resource

```ts
enforce(policy, { ...options, resource })(handler(witness, resource))
```

An explicit `options.resource` is **overridden**, not merged. Two channels for
one value is what caused this; after the change the handler, the witness and the
evaluation cannot disagree about which resource was checked
([INV-QD-032](../invariants.md#inv-qd-032-a-guarded-resource-is-the-evaluated-resource)).

This also makes an existing comment true. `@qadi/http`'s `NO_RESOURCE = {}`
described denying a resource-scoped policy checked before any resource is
loaded; because the value never reached evaluation, that policy *failed* with
`MissingResource` instead — a 500 where a 403 belonged. An empty resource now
reaches the evaluator and denies, as the comment always said.

### The cache key carries the whole subject

```ts
export interface DecisionCacheKey {
  readonly subject: AuthSubject;   // was: subjectId: SubjectId
  …
}
```

`AuthSubject` compares structurally, `HashSet` roles and permissions included,
so the key now covers everything a decision can depend on
([INV-QD-033](../invariants.md#inv-qd-033-a-cached-decision-belongs-to-the-grants-that-earned-it)).
Two requests carrying equal subjects still hit — verified, not assumed — so the
cache still caches.

**Breaking**: `DecisionCacheKey` is public. Anything constructing one directly
must pass the subject.

This narrows what staleness means, and the doc comment was corrected to match. A
grant revoked in the **subject** now changes the key, so an application-scoped
cache no longer serves the old allow. A grant revoked only in a **store the
evaluation consults** is still invisible to the key. Application scope is
therefore safe against token downgrade and unsafe against backend revocation;
per-request scope is safe against both.

### Why one decision and not two

They are the same rule: **the decision must be computed from the inputs it
claims to be about.** One passed a proxy where the value belonged (`subject.id`
for the subject); the other passed the value to a bystander and nothing to the
decider. Both were defended by a doc comment asserting the property that was
missing, which is the reason neither was noticed.

That pattern now has three instances, counting
[ADR-QD-042](./042-a-projection-is-not-an-identity.md)'s stringified cache key,
whose comment claimed it "could not collide". A comment asserting a safety
property is not evidence of one.

## Consequences

**Positive**:

- `guardRoute`'s resource parameter does what its name says, so resource-scoped
  HTTP authorization is possible at all.
- Token downgrade cannot be defeated by a shared cache.
- `@qadi/http`'s `RequirePermission` returns 403 rather than 500 for a
  resource-scoped policy, which is both correct and no longer a lie in a comment.

**Negative**:

- **Two breaking changes in one release.** `guard`'s evaluation semantics change
  for any caller who was passing `options.resource` alongside a different
  positional resource — previously the former decided, now the latter does. The
  `DecisionCacheKey` field rename is a compile error for direct constructors.
  Both are 0.x minors, and both are stated in the changeset.
- **Hashing the subject costs more than hashing its id.** The subject is hashed
  once per evaluation, and its permissions may be a large `HashSet`. Unmeasured;
  `pnpm bench` covers dispatch, not this. Called out rather than claimed either
  way — correctness first, and a benchmark can follow if a caller reports it.
- **Cache hit rates fall for any application that rebuilt subjects with
  unstable-but-equivalent grant sets.** That is the fix working: those were
  different questions.

**Trade-off accepted**: a bigger key and a slower hash, for a cache that cannot
answer a question it was not asked. The alternative — keeping the id and telling
callers to scope the cache per request — puts the safety property in
documentation, which is exactly where it was, and where nobody read it.

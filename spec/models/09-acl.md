# 09 — Access Control Lists

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-09                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

An access control list is a per-object list naming the principals that may touch
it and the right each one holds — the access matrix read down a **column**, where
a capability is the same matrix read across a **row**
([MOD-QD-004](./04-capability.md)). POSIX ACLs, S3 bucket ACLs and the "people
with access" panel are the canonical forms.

Qadi expresses one entry as a **relation tuple**: `hasRelationship("reader")`
asks whether an entry exists granting this subject `reader` on this resource.

## Who asks for it

Anything storing grants beside the object rather than deriving them from what the
subject is — file and object stores, wikis, content management systems, shared
drives, repository hosts. It is what one reaches for when access is per-object
and irregular, so no role or attribute predicate describes it.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

Qadi decides list membership today with no core change. The cost is a
`RelationshipResolver` over the caller's table — theirs, because the list is
data about their objects.

## How Qadi expresses it

The request a resolver receives maps onto the columns of a list row almost
exactly. The list itself never enters Qadi — the resolver reads it, matches, and
returns a boolean; the policy names only the right.

```ts
interface RelationshipCheck {
  readonly subjectId: string;         // the principal being tested
  readonly relation: string;          // the right, as named in the list
  readonly resourceId: string;        // the object the list hangs off
  readonly depth: number | undefined; // budget for container inheritance
}
```

### ACL and DAC are not the same thing

The two are routinely conflated. **Discretionary access control is a rule about
who may create a grant; an access control list is a storage shape for grants
that already exist.** There can be lists without discretion — an administrator
writes every entry — and discretion without lists, if grants live in a graph.
Both reach Qadi through the same `RelationshipResolver`, so the wiring in
[MOD-QD-008](./08-dac.md) is the wiring here and is not repeated; that document
adds the owner-as-field shortcut and the administration boundary.

### Group entries

Real lists name groups, not only users — `group:engineering` may read. Two forms
express that, and they are not equivalent:

| Form | Policy | Where membership lives |
| ---- | ------ | ---------------------- |
| Resolve inside the resolver | `hasRelationship("reader")` | The caller's directory, read at decision time |
| Model the group as a role | `anyOf([hasRole("engineering"), hasRelationship("reader")])` | The subject, established at authentication |

The role form is visible in the policy, needs no lookup and short-circuits before
the list is read; its cost is that every group must travel on the subject,
growing the token and making membership as stale as the session carrying it. The
resolver form keeps membership out of the subject — the policy says `reader` and
stays silent about who qualifies — at the price of an expansion the policy text
does not show, on every check. Prefer the first for a small, stable set of groups
authentication already knows; the second when groups are numerous, nested, or
change faster than sessions. Nesting belongs to the resolver either way: Qadi
passes `depth` and interprets nothing ([MOD-QD-003](./03-rebac.md)).

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolver,
  type RelationshipCheck,
  anyOf,
  check,
  currentSubjectLayer,
  hasRelationship,
  hasRole,
  makeSubject,
} from "@qadi/core";

/** One row of the caller's list. `principal` is `user:…` or `group:…`. */
interface AclEntry {
  readonly principal: string;
  readonly right: string;
}

// The caller's stores. Qadi never sees the list — it sees only the answer.
declare const loadAcl: (id: string) => Effect.Effect<ReadonlyArray<AclEntry>>;
declare const groupsOf: (id: string) => Effect.Effect<ReadonlyArray<string>>;

const AclResolver: Layer.Layer<RelationshipResolver> = Layer.succeed(
  RelationshipResolver,
  {
    check: (request: RelationshipCheck) =>
      Effect.gen(function* () {
        const entries = yield* loadAcl(request.resourceId);
        const groups = yield* groupsOf(request.subjectId);
        const principals = new Set([
          `user:${request.subjectId}`,
          ...groups.map((g) => `group:${g}`),
        ]);
        return entries.some(
          (e) => e.right === request.relation && principals.has(e.principal),
        );
      }),
  },
);

// Both group forms side by side. The role branch decides from the subject and
// short-circuits, so a member of `engineering` reads no list at all.
const canRead = anyOf([hasRole("engineering"), hasRelationship("reader")]);

const program = check(canRead, { resource: { id: "doc-1" } }).pipe(
  Effect.provide(currentSubjectLayer(makeSubject({ id: "u-1" }))),
  Effect.provide(
    Layer.mergeAll(AclResolver, AttributeResolverNone, EvaluationIdLive),
  ),
);
```

## What is missing

**Negative entries.** Many list systems carry explicit DENY rows that override
any ALLOW regardless of what else the list says — NTFS and XACML both do.
**An ACL containing deny rows cannot be faithfully expressed in Qadi today.**
`not` buys a *named* exclusion:

```ts
allOf([hasRelationship("reader"), not(hasRelationship("banned"))])
```

That is deny-overrides for one relation, enumerated at authoring time by someone
who already knew the deny row existed. The ACL rule is that *any* deny row beats
*any* allow row without the policy naming either, and expressing that needs an
ordered combining algorithm over the entry set. Qadi has none: `AllOf` and
`AnyOf` are unordered, and their allow/deny rule is hard-coded in the evaluator.
That is enabler **E3** in [the matrix](./00-adoption-matrix.md), marked
**Breaking**, because the honest fix changes what the existing combinators mean.

Two consequences, before anyone ships the `not` workaround. Negation **inverts
the fail-closed default** — an unwired resolver denies `banned`, so
`not(hasRelationship("banned"))` returns *true*, and
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) then protects
only through the positive branch beside it. And a deny row added after the policy
was written has no effect at all, silently: the exact failure mode explicit deny
exists to prevent.

**Ordering** is absent for the same reason — first-applicable,
most-specific-wins and inheritance-with-override are orderings over a list, and
Qadi evaluates a set. **Enumeration**, "who is on this list?", is the transpose
of the question Qadi answers and needs subject-set evaluation, enabler **E6**,
tracked on the [roadmap](../roadmap.md). **Administration** — creating, editing
and revoking entries — is the application's, per [the URS](../urs.md) and
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md), as
[MOD-QD-008](./08-dac.md) says of grants.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature. Adopting it means a resolver in the
caller's codebase and, if a reference adapter is ever shipped, a scenario tagged
with a newly allocated `REQ-QD` identifier plus unit tests over the group
expansion, since that is where the list's meaning is decided.

The mechanics it rests on are already proven: relationship evaluation by
`REQ-QD-005`, role matching by `REQ-QD-003`, the fail-closed default by
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed), and a resolver
outage failing rather than denying by
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial). The
short-circuit claim for the role branch rests on
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation), verified
for attribute resolution only — the caveat [MOD-QD-003](./03-rebac.md) records,
and a prerequisite for this phase in [the matrix](./00-adoption-matrix.md).
Nothing verifies the negative-entry discussion: the capability does not exist.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [03 — Relationship-Based Access Control](./03-rebac.md) · [08 — Discretionary Access Control](./08-dac.md) · [10 — Zanzibar-Style Relationship Stores](./10-zanzibar.md)_

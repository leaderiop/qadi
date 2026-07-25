# 04 — Capability and Permission Tokens

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-04                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-006) |

---

## What it is

A capability names a resource and an action, and holding it *is* the authority.
There is no per-object access list to consult and no rule to interpret — "may
this subject do this?" reduces to "does this subject hold this token?". The
model carries no notion of *why* a token was granted; granting is an
administrative act, and Qadi does not administer.

## Who asks for it

Almost everyone, usually before they know the model has a name. API scopes,
feature gates, admin surfaces and the permission column of a settings screen are
all this model. It is also the substrate beneath role-based access control — a
role is a named bundle of tokens, flattened at subject construction by
[BEH-QD-011](../behaviors/02-roles.md), so evaluation never walks the role graph.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Shipped** |
| Priority | **P0** |
| Enablers required | None |
| Breaking change | No |

Enabler **E1** ([action dimension](./00-adoption-matrix.md#e1--action-dimension))
does *not* apply: a permission's action is a segment of the token the subject
holds, not an input describing what the caller is attempting, and
[INV-QD-001](../invariants.md#inv-qd-001-permission-key-uniqueness) records
keeping the two apart as a compatibility risk against E1.

## How Qadi expresses it

A permission is a hand-written interface with literal type parameters — the
deliberate departure from the Schema-derived rule, because a token is not a
recursive union and its literals are the point.

```ts
export interface Permission<TResource extends string = string, TAction extends string = string> {
  readonly resource: TResource;
  readonly action: TAction;
}

export type PermissionKey<TResource extends string = string, TAction extends string = string> =
  `${TResource}:${TAction}`;

export const permission: <const R extends string, const A extends string>(
  resource: R, action: A,
) => Permission<R, A>;

export const permissionKey: <R extends string, A extends string>(
  self: Permission<R, A>,
) => PermissionKey<R, A>;
```

`Permission<"doc", "read">` and `Permission<"doc", "write">` are therefore
incompatible at compile time, and `InferResource`, `InferAction` and `InferKey`
([BEH-QD-005](../behaviors/01-permissions.md)) read either segment back out as a
literal type.

`permissionKey` is why `:` is forbidden inside a segment: without the
constraint, `{ resource: "a:b", action: "c" }` and
`{ resource: "a", action: "b:c" }` format to the same key and each silently
grants the other — the predecessor's defect, recorded in
[ADR-QD-007](../decisions/007-permission-token-representation.md).
`permission()` stays total, because a literal written in source already has that
guarantee from the type system; validation lives where values arrive from
outside, and one pattern rejects empty segments and colons together:

```ts
export const isValidSegment: (value: string) => boolean; // /^[^:]+$/
export const PermissionSchema: Schema.Struct<{ resource: Schema.String; action: Schema.String }>;
export const hasPermission: (permission: Permission, options?: { fields?: ReadonlyArray<string> }) => Policy;
```

The wire format is that struct rather than a joined string
([BEH-QD-004](../behaviors/01-permissions.md)), so decoding performs no
delimiter parsing and cannot relocate the segment boundary — the predecessor
split on the first colon, the same defect arriving from the other direction.

The check itself is a set read: `AuthSubject.permissions` is a pre-flattened
`ReadonlySet<PermissionKey>`, so `hasPermission` is O(1) and touches no
resolver. Being service-free also makes it the cheapest branch of an
`allOf`/`anyOf` tree, and putting a permission check first is the usual way to
stop a relationship lookup running at all
([INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)).

## Worked example

```typescript
import * as Effect from "effect/Effect";
import { check, fromRoles, hasPermission, isValidSegment, permission, permissionKey, role } from "@qadi/core";
import type { InferKey } from "@qadi/core";
import { qadiTestLayer } from "@qadi/testing";

// Module scope: the token is a value, and holding the value is the authority.
const readDoc = permission("doc", "read");
const writeDoc = permission("doc", "write");

// Literal parameters survive the builder, so the key is known statically.
const readKey: "doc:read" = permissionKey(readDoc);
type WriteKey = InferKey<typeof writeDoc>; // "doc:write"

// A role is a bundle of tokens; the bundle is flattened once, here.
const alice = fromRoles({
  id: "alice",
  roles: [role({ name: "editor", permissions: [readDoc, writeDoc] })],
});

// What the evaluator does, spelled out: one set membership test, no traversal.
const holdsRead: boolean = alice.permissions.has(readKey);

// Rejected at the boundary: as a *resource* this formats to the same key as
// { resource: "doc", action: "read" } and would cross-grant it.
const acceptable: boolean = isValidSegment("doc:read");

const program = check(hasPermission(readDoc)).pipe(Effect.provide(qadiTestLayer(alice))); // → true
```

## What is missing

Nothing, for capability *as an authorization check*. Two adjacent things share
the name and are neither shipped nor planned.

**Object capability (OCap) — P4, Excluded.** True object capability means no
ambient authority: an unforgeable reference *is* the permission, enforced by the
language's reference graph, so a subject cannot name what it was not handed.
Qadi is ambient by construction — a policy names its resource by string and
`CurrentSubject` is read from the environment. That property belongs to a
language runtime, not to a decision function
([§3.4](./00-adoption-matrix.md#34-excluded--p4)). Qadi cannot provide it and
should not offer a weaker thing under its name.

**Bearer-token attenuation — P4, Excluded.** Macaroons, biscuits, UCANs,
SPKI/SDSI and RT let a holder derive a weaker token and pass it on, the chain
verified cryptographically. That is authentication work, not decision work: it
needs key material, caveat semantics and a delegation depth Qadi has nowhere to
hold. [§3.4](./00-adoption-matrix.md#34-excluded--p4) draws one boundary for
every such scheme — verify the chain where the keys live, then present the
result as an `AuthSubject` whose permission set is the attenuated one. Qadi
decides against that subject and asks nothing about its provenance.

## Verification

| Evidence | Location | Covers |
| -------- | -------- | ------ |
| Key formatting, segment rejection, flattening into the subject set | `packages/core/test/Tokens.test.ts` | BEH-QD-001–003, BEH-QD-011, INV-QD-001 |
| Allow, and denial naming the missing key | `packages/core/test/Evaluate.test.ts` | BEH-QD-017 |
| Enforcement and field projection | `packages/core/test/Qadi.test.ts` | BEH-QD-018 |
| Struct wire format, round trip | `packages/core/test/Policy.test.ts` | BEH-QD-004, INV-QD-003 |
| `REQ-QD-001` | `features/features/permissions/permissions.feature` | Grant, denial, denial reason, wrong action |
| `REQ-QD-002` | `features/features/permissions/composition.feature` | `allOf` and `anyOf` over permission checks |

Both tags are recorded in [§5 of the traceability matrix](../traceability.md).
Nothing here is aspirational: every row names a file that exists and a tag the
suite already runs.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [01 — Permission Tokens](../behaviors/01-permissions.md) · [ADR-QD-007](../decisions/007-permission-token-representation.md)_

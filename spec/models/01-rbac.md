# 01 — Role-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-01                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.1 (2026-07-26): RBAC₂ statuses corrected — both separation-of-duty forms ship (CCR-QD-021)<br>1.0 (2026-07-26): Initial release (CCR-QD-006) |

---

## What it is

Role-based access control interposes a named role between a subject and the
permissions it holds: a subject is assigned roles, a role carries permissions,
and authority flows subject → role → permission. That is RBAC₀. RBAC₁ adds a
partial order over roles — a senior role inherits everything its juniors carry —
so `admin` need not restate what `editor` already grants.

## Who asks for it

Applications whose authority vocabulary matches their job titles: SaaS admin
consoles, content management systems, ticketing and back-office tools. The
signal is that assignment is an administrative act against a small fixed list of
role names, not a per-record decision. Where authority depends on *which* record
is in hand, the answer is relationship- or attribute-based, not more roles.

## Status

| Property          | Value   |
| ----------------- | ------- |
| Status            | Shipped |
| Priority          | P0      |
| Enablers required | None    |
| Breaking change   | No      |

RBAC₀ and RBAC₁ are expressible with the shipped ADT and services, and are
covered by unit tests, a JSON round-trip property and acceptance scenarios.

## How Qadi expresses it

Parents are held **by value**, not by name. That decision
([ADR-QD-015](../decisions/015-role-dag-acyclic-by-construction.md)) makes the
inheritance graph a DAG by construction, which is why `role` returns a `Role`
rather than an `Effect` — there is no cycle left to report. Hierarchy is then
resolved **once, when the subject is built**: `fromRoles` stores the transitive
closure of both role names and permission keys, so `HasRole` and `HasPermission`
are set-membership tests at evaluation time rather than graph traversals.

```ts
export const role: <const TName extends string>(config: {
  readonly name: TName;
  readonly permissions?: ReadonlyArray<Permission>;
  readonly inherits?: ReadonlyArray<Role>;
}) => Role<TName>;

export const flattenPermissions: (self: Role) => ReadonlySet<PermissionKey>;
export const roleNames: (self: Role) => ReadonlySet<string>;

export const fromRoles: (config: {
  readonly id: string;
  readonly roles: ReadonlyArray<Role>;
  readonly permissions?: ReadonlyArray<Permission>;
  readonly attributes?: Readonly<Record<string, unknown>>;
}) => AuthSubject;

export const hasRole: (role: string) => Policy;
export const anyOfRoles: (roles: ReadonlyArray<string>) => Policy;
```

`anyOfRoles` is sugar, not a variant — it builds an `AnyOf` of `HasRole`, so
nothing new crosses the wire. A catalogue arriving from configuration names its
parents instead of referencing them, which is the only place a cycle becomes
representable and so the only role API that is effectful. An unknown parent is
tolerated: a partial catalogue is an ordinary deployment state, and failing
would deny every request rather than merely grant less
([BEH-QD-012](../behaviors/02-roles.md)).

```ts
export const resolveRoleGraph: (
  definitions: ReadonlyArray<RoleDefinition>,
) => Effect.Effect<ReadonlyArray<Role>, CircularRoleInheritance>;
```

## Worked example

```typescript
import {
  anyOfRoles,
  check,
  fromRoles,
  hasPermission,
  hasRole,
  permission,
  resolveRoleGraph,
  role,
} from "@qadi/core";
import { qadiTestLayer } from "@qadi/testing";
import * as Effect from "effect/Effect";

const readDoc = permission("doc", "read");
const deleteDoc = permission("doc", "delete");

// RBAC₀ — a role names permissions. RBAC₁ — a role inherits another, by value.
const viewer = role({ name: "viewer", permissions: [readDoc] });
const editor = role({ name: "editor", inherits: [viewer] });
const admin = role({ name: "admin", permissions: [deleteDoc], inherits: [editor] });

// Module scope: a policy built inline would be a fresh object on every call.
const canRead = hasPermission(readDoc);
const isPrivileged = anyOfRoles(["editor", "admin"]);
const alice = fromRoles({ id: "alice", roles: [admin] });

const program = Effect.gen(function* () {
  // Both closures were computed by `fromRoles`; evaluation only tests membership.
  const holdsViewer = yield* check(hasRole("viewer")); // true, two levels up
  const holdsRead = yield* check(canRead); // true, inherited from `viewer`
  const privileged = yield* check(isPrivileged); // true, via `admin`

  // The same catalogue as it arrives from configuration — parents by name.
  const resolved = yield* resolveRoleGraph([
    { name: "viewer", permissions: [readDoc] },
    { name: "editor", inherits: ["viewer"] },
    { name: "admin", permissions: [deleteDoc], inherits: ["editor"] },
  ]);

  return { holdsViewer, holdsRead, privileged, resolvedCount: resolved.length };
}).pipe(Effect.provide(qadiTestLayer(alice)));
```

## What is missing

**RBAC₂ — constrained RBAC** is largely shipped, and is a separate document
([MOD-QD-024](./24-separation-of-duty.md)). Both separation-of-duty forms ship;
what remains excluded is the half that is administration rather than decision.

- *Static separation of duty* — mutually exclusive roles may not both be
  assigned. **Shipped, in part** (`@REQ-QD-017`): nothing additive was ever
  required. *Detecting* a subject who holds a conflicting pair is
  `not(allOf([hasRole(a), hasRole(b)]))` and always was; *preventing* the
  assignment is permanently the caller's, because Qadi has no administrative
  surface and never sees a grant. See [MOD-QD-024](./24-separation-of-duty.md).
- *Dynamic separation of duty* — both roles may be held, but not activated
  together. **Shipped** (`@REQ-QD-012`): it needed ~~E5, the decision history
  port~~, which landed in CCR-QD-016. It also forced a restatement of
  [INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) —
  reproducibility became *given the same history* — and that weakening was made
  explicit in the same change rather than left silent.
- *Cardinality* and *prerequisite roles* — administrative constraints over
  assignment, not decisions; they belong with the surface Qadi does not have.

**RBAC₃** is RBAC₁ plus RBAC₂ and needs no mechanism beyond the two.
**Administrative RBAC** stays excluded — Qadi decides, it does not administer
([00 §3.4](./00-adoption-matrix.md), [the URS](../urs.md)). **Sessions** have no
representation: activating a subset of assigned roles is modelled today by
building a narrower `AuthSubject`, which is adequate for RBAC₀ and RBAC₁. Dynamic
separation of duty no longer waits on sessions — the history port answers it
directly, by asking what the subject has already done rather than what they have
currently activated. Sessions remain unrepresented for other reasons.

## Verification

| Evidence | Where | What it proves |
| -------- | ----- | -------------- |
| Unit — roles and subject | `packages/core/test/Tokens.test.ts` | Transitive names and permissions; a diamond walked once; `resolveRoleGraph` fails with `CircularRoleInheritance` carrying the cycle path and tolerates an unknown parent; `fromRoles` flattens both closures |
| Unit — evaluator | `packages/core/test/Evaluate.test.ts` | `HasRole` matches an inherited role name |
| Unit — constructors | `packages/core/test/Policy.test.ts` | `anyOfRoles` builds an `AnyOf` of `HasRole`; `HasRole` is in the FastCheck generator, so it is covered by the round-trip property |
| Acceptance | `features/features/roles/roles.feature` | `@REQ-QD-003` — held, absent, negated-and-absent, negated-and-held |
| Behaviour | [02 — Roles and Inheritance](../behaviors/02-roles.md) | BEH-QD-009 to BEH-QD-012 |
| Invariant | [INV-QD-002](../invariants.md#inv-qd-002-role-graph-acyclicity) | Role graph acyclicity |

[Traceability](../traceability.md) records `REQ-QD-003` against BEH-QD-011. This
document allocates no identifier — it cites evidence that already exists.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [02 — Roles and Inheritance](../behaviors/02-roles.md) · [ADR-QD-015](../decisions/015-role-dag-acyclic-by-construction.md)_

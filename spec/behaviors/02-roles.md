# 02 — Roles and Inheritance

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-02                                    |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-09-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.2 (2026-11-10): BEH-QD-010 and BEH-QD-011 note that flattening, role names and fromRoles are projections of the role walk; no behaviour change (ADR-QD-128, ARCH-64, CCR-QD-406)<br>1.1 (2026-09-08): BEH-QD-012 — `resolveRoleGraph` signature was missing the `onUnknownParent` options parameter and `DuplicateRoleDefinition` from the error channel; added the duplicate-name REQUIREMENT (CCR-QD-124)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

_Previous: [01 — Permission Tokens](./01-permissions.md)_

---

## BEH-QD-009: Role construction is total

> **Invariant:** [INV-QD-002](../invariants.md#inv-qd-002-role-graph-acyclicity)
> **See:** [ADR-QD-015](../decisions/015-role-dag-acyclic-by-construction.md)

Parents are held **by value**, so a role cannot reference one that does not yet
exist. The graph is a DAG by construction and construction cannot fail.

```ts
export interface Role<TName extends string = string> {
  readonly name: TName;
  readonly permissions: ReadonlyArray<Permission>;
  readonly inherits: ReadonlyArray<Role>;
}

export const role: <const TName extends string>(config: {
  readonly name: TName;
  readonly permissions?: ReadonlyArray<Permission>;
  readonly inherits?: ReadonlyArray<Role>;
}) => Role<TName>;
```

## BEH-QD-010: Permission flattening

```ts
export const flattenPermissions: (self: Role) => ReadonlySet<PermissionKey>;
export const flattenAll: (roles: ReadonlyArray<Role>) => ReadonlySet<PermissionKey>;
```

```
REQUIREMENT: Flattening MUST include permissions inherited transitively, and
             MUST visit each role at most once. A diamond — two parents sharing
             a grandparent — MUST be walked once, not exponentially.
```

Both are projections of the role walk
([BEH-QD-400](./25-inspection.md#beh-qd-400-the-role-walk-visits-each-reachable-role-once),
[ADR-QD-128](../decisions/128-one-walk-of-the-role-graph.md)); `flattenAll` walks
all its roles in one pass.

## BEH-QD-011: Transitive role names

```ts
export const roleNames: (self: Role) => ReadonlySet<string>;
```

```
REQUIREMENT: A subject holding a role MUST satisfy `hasRole` for every ancestor
             of that role. A subject holding `admin`, which inherits `editor`,
             MUST satisfy `hasRole("editor")`.
```

`roleNames` is a projection of the role walk
([BEH-QD-400](./25-inspection.md#beh-qd-400-the-role-walk-visits-each-reachable-role-once),
[ADR-QD-128](../decisions/128-one-walk-of-the-role-graph.md)), and so is
`fromRoles`, which walks all a subject's roles in one pass.

## BEH-QD-012: Resolving a serialized role graph

> **See:** [ADR-QD-015](../decisions/015-role-dag-acyclic-by-construction.md)

Cycles become representable only when parents are named rather than referenced.

```ts
export interface RoleDefinition {
  readonly name: string;
  readonly permissions?: ReadonlyArray<Permission>;
  readonly inherits?: ReadonlyArray<string>;
}

export const resolveRoleGraph: (
  definitions: ReadonlyArray<RoleDefinition>,
  options?: {
    readonly onUnknownParent?: (names: ReadonlyArray<string>) => void;
  },
) => Effect.Effect<ReadonlyArray<Role>, CircularRoleInheritance | DuplicateRoleDefinition>;
```

```
REQUIREMENT: A cycle among named parents MUST fail with
             `CircularRoleInheritance` carrying the cycle path.
```

```
REQUIREMENT: An unknown parent name MUST NOT fail. A partial role catalogue is
             a normal deployment state; failing would deny every request rather
             than merely granting less.
```

```
REQUIREMENT: A repeated definition name MUST fail with
             `DuplicateRoleDefinition` naming every repeated name at once,
             sorted, before any resolution happens. There is no defensible
             "grant less" reading when two definitions disagree about what a
             name means, so this is unlike the unknown-parent case above.
```

---

_Previous: [01 — Permission Tokens](./01-permissions.md) | Next: [03 — Policy ADT](./03-policy-adt.md)_

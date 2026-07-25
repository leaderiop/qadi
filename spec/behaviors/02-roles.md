# 02 — Roles and Inheritance

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-02                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-QD-001) |

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

## BEH-QD-011: Transitive role names

```ts
export const roleNames: (self: Role) => ReadonlySet<string>;
```

```
REQUIREMENT: A subject holding a role MUST satisfy `hasRole` for every ancestor
             of that role. A subject holding `admin`, which inherits `editor`,
             MUST satisfy `hasRole("editor")`.
```

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
) => Effect.Effect<ReadonlyArray<Role>, CircularRoleInheritance>;
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

---

_Previous: [01 — Permission Tokens](./01-permissions.md) | Next: [03 — Policy ADT](./03-policy-adt.md)_

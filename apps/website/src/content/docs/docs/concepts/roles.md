---
title: Roles
description: The role inheritance DAG — construction that cannot fail, and the one place cycles become possible.
---

A `Role` names a set of permissions and may inherit from other roles. Holding a
role means holding every permission it grants directly, plus every permission
granted by anything it inherits, transitively.

```ts
export interface Role<TName extends string = string> {
  readonly name: TName;
  readonly permissions: ReadonlyArray<Permission>;
  readonly inherits: ReadonlyArray<Role>;
}
```

## Construction can't fail

`role()` takes its parents **by value**, not by name:

```ts
import { permission, role } from "@qadi/core";

const readDoc = permission("doc", "read");
const writeDoc = permission("doc", "write");

const viewer = role({ name: "viewer", permissions: [readDoc] });
const editor = role({ name: "editor", permissions: [writeDoc], inherits: [viewer] });
```

Because `editor.inherits` holds the actual `viewer` value, you cannot construct a
role that inherits from a role that doesn't exist yet — which means you cannot
construct a cycle. The inheritance graph is a DAG by construction, and `role()`
is total: there's no error channel to check. This is a deliberate correction of
the predecessor library, which returned a `Result` from role construction to
report cycles that were actually unreachable on that path — the cycle check
existed for a failure mode the by-value API had already ruled out (see
[ADR-QD-015](https://github.com/leaderiop/qadi/blob/main/spec/decisions/015-role-dag-acyclic-by-construction.md)).

## Flattening

`flattenPermissions` walks a role and everything it inherits, returning the full
set of permission keys reachable from it:

```ts
import { flattenPermissions } from "@qadi/core";

flattenPermissions(editor);
// ReadonlySet<PermissionKey> { "doc:write", "doc:read" }
```

The walk keeps a visited set, so a diamond — two parents sharing a grandparent —
is visited once rather than exponentially. `flattenAll` does the same over a list
of roles at once, which is what a subject's permission set is built from.
`roleNames` returns the transitive set of role *names* the same way: a subject
holding `admin`, which inherits `editor`, satisfies `hasRole("editor")` even
though it never named `editor` directly.

## Resolving a serialized role catalogue

Cycles only become representable once parents are named rather than held by
value — which is exactly what happens when a role graph comes back from storage
as data. `resolveRoleGraph` is that reconstruction path, and it's the one place
a cycle is checked for, because it's the one place a cycle can exist:

```ts
import { resolveRoleGraph } from "@qadi/core";
import type { RoleDefinition } from "@qadi/core";

const definitions: ReadonlyArray<RoleDefinition> = [
  { name: "viewer", permissions: [readDoc] },
  { name: "editor", permissions: [writeDoc], inherits: ["viewer"] },
];

const roles = resolveRoleGraph(definitions);
// Effect<ReadonlyArray<Role>, CircularRoleInheritance>
```

A cycle among the named parents fails with `CircularRoleInheritance`, carrying
the cycle path. An **unknown** parent name, by contrast, is tolerated rather than
treated as an error — a partial role catalogue is a normal state for a
deployment to be in, and failing there would deny every request rather than
simply granting less.

For the formal requirements behind flattening and cycle resolution, see
[02 — Roles and Inheritance](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/02-roles.md).

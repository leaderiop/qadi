---
title: Tokens & Permissions
description: What a permission token is, how its lookup key is formatted, and how to build a group of them at once.
---

A `Permission` is a `resource` + `action` pair — nothing more. It names a
capability; it does not itself say who has it or what checking it looks like at
runtime.

```ts
export interface Permission<
  TResource extends string = string,
  TAction extends string = string,
> {
  readonly resource: TResource;
  readonly action: TAction;
}
```

## Building one

`permission()` is total and preserves literal types, so two permissions differing
in either segment are structurally incompatible at compile time:

```ts
import { permission } from "@qadi/core";

const readDoc = permission("doc", "read");
//    ^? Permission<"doc", "read">
```

## The lookup key

A subject doesn't carry a list of `Permission` objects — it carries a
pre-flattened `ReadonlySet` of *keys*, so a `HasPermission` check at evaluation
time is a set-membership test rather than a role-graph walk. `permissionKey`
formats a permission as that key:

```ts
import { permission, permissionKey } from "@qadi/core";

const key = permissionKey(permission("doc", "read"));
//    ^? "doc:read"
```

The key is `` `${resource}:${action}` ``, which is why both segments are
restricted to exclude `:` — without that constraint, `{ resource: "a:b", action: "c" }`
and `{ resource: "a", action: "b:c" }` would format to the same key and silently
grant each other's permissions. `isValidSegment` checks a string against that
rule, and `PermissionSchema` enforces it when a permission is decoded from
untrusted input (a permission written as a literal in source gets its guarantee
from the type system instead, so `permission()` itself performs no check).

Note that the wire format is the struct `{ resource, action }`, never the joined
string — decoding a permission performs no delimiter parsing, so it can't
misplace the segment boundary the way splitting a string on its first `:` can.

## Building several at once

`createPermissionGroup` is ergonomics only: one resource, several actions, each
turned into its own `Permission`, keyed by action name.

```ts
import { createPermissionGroup } from "@qadi/core";

const doc = createPermissionGroup("doc", ["read", "write", "delete"]);
// { read: Permission<"doc","read">, write: Permission<"doc","write">, delete: Permission<"doc","delete"> }

doc.read;
//  ^? Permission<"doc", "read">
```

It's exactly `{ read: permission("doc", "read"), write: permission("doc", "write"), … }`
spelled once instead of once per action — no behavior beyond what `permission`
already gives you.

For the full formal treatment — segment validation, the wire format, and the
uniqueness invariant the key relies on — see
[01 — Permission Tokens](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/01-permissions.md).

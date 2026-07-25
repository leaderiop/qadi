# 01 — Permission Tokens

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | GUARD-BEH-01                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Guard Engineering                              |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-EG-001) |

---

## BEH-EG-001: Permission representation

> **Invariant:** [INV-EG-001](../invariants.md#inv-eg-001-permission-key-uniqueness)
> **See:** [ADR-EG-007](../decisions/007-permission-token-representation.md)

A permission names a `resource` and an `action`. Literal type parameters are
preserved so that two permissions differing in either segment are structurally
incompatible at compile time.

```ts
export type PermissionKey<
  TResource extends string = string,
  TAction extends string = string,
> = `${TResource}:${TAction}`;

export interface Permission<
  TResource extends string = string,
  TAction extends string = string,
> {
  readonly resource: TResource;
  readonly action: TAction;
}

export const permission: <const TResource extends string, const TAction extends string>(
  resource: TResource,
  action: TAction,
) => Permission<TResource, TAction>;
```

```ts
const read = permission("doc", "read");
//    ^? Permission<"doc", "read">
```

## BEH-EG-002: The runtime lookup key

> **Invariant:** [INV-EG-001](../invariants.md#inv-eg-001-permission-key-uniqueness)

A subject carries a pre-flattened `ReadonlySet` of permission keys, so a
permission check is a set membership test rather than a graph walk.

```ts
export const permissionKey: <TResource extends string, TAction extends string>(
  self: Permission<TResource, TAction>,
) => PermissionKey<TResource, TAction>;
```

```
REQUIREMENT: `permissionKey` MUST format a permission as `resource:action`.
             Both segments MUST be non-empty and MUST NOT contain `:`.
             Without that constraint `{resource: "a:b", action: "c"}` and
             `{resource: "a", action: "b:c"}` produce the same key and each
             silently grants the other.
```

## BEH-EG-003: Segment validation at the trust boundary

> **See:** [ADR-EG-007](../decisions/007-permission-token-representation.md)

`permission()` is total — a literal written in source gets its guarantee from
the type system. Validation applies where values arrive from outside:

```ts
export const isValidSegment: (value: string) => boolean;

export const PermissionSchema: Schema.Struct<{
  resource: Schema.String;
  action: Schema.String;
}>;
```

```
REQUIREMENT: Decoding a permission whose resource or action is empty or
             contains `:` MUST fail. The pattern `/^[^:]+$/` enforces both.
```

## BEH-EG-004: Wire format

> **See:** [ADR-EG-007](../decisions/007-permission-token-representation.md)

```
REQUIREMENT: A permission MUST encode as the struct `{ resource, action }`,
             not as a joined string. Decoding therefore performs no delimiter
             parsing and cannot relocate the segment boundary.
```

```json
{ "_tag": "HasPermission", "permission": { "resource": "doc", "action": "read" } }
```

## BEH-EG-005: Type-level inspection

```ts
export type InferResource<P extends Permission> =
  P extends Permission<infer R, string> ? R : never;

export type InferAction<P extends Permission> =
  P extends Permission<string, infer A> ? A : never;

export type InferKey<P extends Permission> =
  P extends Permission<infer R, infer A> ? PermissionKey<R, A> : never;
```

## BEH-EG-006: Worked example

```typescript
import { permission, permissionKey, isValidSegment } from "@guard/core";

const read = permission("doc", "read");

const key: "doc:read" = permissionKey(read);
const resource: "doc" = read.resource;

// Rejected at the trust boundary, because it would collide with
// { resource: "doc", action: "read:all" }.
const ok: boolean = isValidSegment("doc:read");
```

---

_Next: [02 — Roles and Inheritance](./02-roles.md)_

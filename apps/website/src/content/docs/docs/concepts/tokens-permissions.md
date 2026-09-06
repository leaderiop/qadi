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

<svg viewBox="0 0 640 210" width="100%" style="max-width: 640px" role="img" aria-label="Diagram: a Permission struct with resource and action fields is formatted by permissionKey into the string doc:read. Below, two different permissions whose segments themselves contain a colon would both format to the same key a:b:c, which is why a colon inside either segment is forbidden.">
  <defs>
    <marker id="tok-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="20" y="20" width="220" height="70" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="32" y="40" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-accent-high)">Permission</text>
  <text x="32" y="60" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">resource: "doc"</text>
  <text x="32" y="78" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">action: "read"</text>
  <path d="M 240 55 L 296 55" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#tok-arrow)"/>
  <rect x="300" y="35" width="150" height="40" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="375" y="59" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-accent-high)">permissionKey()</text>
  <path d="M 450 55 L 496 55" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#tok-arrow)"/>
  <rect x="500" y="35" width="120" height="40" rx="7" fill="oklch(0.13 0.012 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="560" y="59" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">"doc:read"</text>
  <rect x="20" y="128" width="280" height="28" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline)"/>
  <text x="30" y="146" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-2)">{ resource: "a:b", action: "c" }</text>
  <rect x="20" y="164" width="280" height="28" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline)"/>
  <text x="30" y="182" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-2)">{ resource: "a", action: "b:c" }</text>
  <path d="M 300 142 L 330 158" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#tok-arrow)"/>
  <path d="M 300 178 L 330 162" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#tok-arrow)"/>
  <text x="340" y="150" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">both → "a:b:c"</text>
  <text x="340" y="166" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">forbidden — a ':' inside either</text>
  <text x="340" y="180" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">segment would collide the key</text>
</svg>

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

```typescript
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

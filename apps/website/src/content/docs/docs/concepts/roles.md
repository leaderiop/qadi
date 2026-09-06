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
construct a cycle. The inheritance graph is a DAG (a directed acyclic graph —
a graph whose arrows can't loop back on themselves) by construction, and `role()`
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

### A diamond, walked once

Take a role graph shaped like a diamond — `editor` inherits both `viewer` and
`contributor`, and both of those inherit a shared `base`:

<svg viewBox="0 0 500 260" width="100%" style="max-width: 460px" role="img" aria-label="Diagram: a diamond role inheritance graph. editor inherits viewer and contributor; both viewer and contributor inherit base. Arrows point from a role down to what it inherits.">
  <defs>
    <marker id="role-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="190" y="10" width="120" height="44" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="250" y="28" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-accent-high)">editor</text>
  <text x="250" y="44" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-2)">+ doc:write</text>
  <rect x="40" y="106" width="150" height="44" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="115" y="124" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-accent-high)">viewer</text>
  <text x="115" y="140" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-2)">+ doc:read</text>
  <rect x="310" y="106" width="150" height="44" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="385" y="124" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-accent-high)">contributor</text>
  <text x="385" y="140" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-2)">+ doc:comment</text>
  <rect x="180" y="202" width="140" height="44" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="250" y="220" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-accent-high)">base</text>
  <text x="250" y="236" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-2)">+ doc:list</text>
  <path d="M 225 54 L 140 106" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#role-arrow)"/>
  <path d="M 275 54 L 360 106" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#role-arrow)"/>
  <path d="M 130 150 L 220 202" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#role-arrow)"/>
  <path d="M 370 150 L 280 202" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#role-arrow)"/>
  <text x="250" y="80" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">arrows point to what's inherited</text>
</svg>

`flattenPermissions(editor)` walks depth-first, keeping a visited set of role
names so `base` — reachable through both `viewer` and `contributor` — is only
ever visited once:

| Step | Visits | Adds | Already visited? |
| ---- | ------ | ---- | ----------------- |
| 1 | `editor` | `doc:write` | — |
| 2 | `viewer` (via `editor.inherits`) | `doc:read` | no |
| 3 | `base` (via `viewer.inherits`) | `doc:list` | no — marked visited |
| 4 | `contributor` (via `editor.inherits`) | `doc:comment` | no |
| 5 | `base` (via `contributor.inherits`) | — | **yes** — skipped |

Result: `{ "doc:write", "doc:read", "doc:list", "doc:comment" }` — four keys,
not five, and `base`'s permissions were computed once no matter how many
paths reach it. A role graph shaped like a wide lattice rather than a small
diamond gets the same guarantee: the visited set bounds the walk by the
number of distinct roles, never by the number of paths between them.

## Resolving a serialized role catalogue

Cycles only become representable once parents are named rather than held by
value — which is exactly what happens when a role graph comes back from storage
as data. `resolveRoleGraph` is that reconstruction path, and it's the one place
a cycle is checked for, because it's the one place a cycle can exist:

```typescript
import { permission, resolveRoleGraph } from "@qadi/core";
import type { RoleDefinition } from "@qadi/core";

const readDoc = permission("doc", "read");
const writeDoc = permission("doc", "write");

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

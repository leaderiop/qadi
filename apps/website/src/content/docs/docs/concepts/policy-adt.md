---
title: The Policy ADT
description: Why Policy is one schema-derived definition instead of a hand-written type and a separately maintained codec.
---

A `Policy` is a value — a tagged-union tree describing what must be true for a
subject to be allowed to do something. That's what "ADT" in this page's title
means: an algebraic data type, a value built from a fixed set of tagged
variants, rather than a class or a function. `hasRole`, `hasPermission`,
`allOf`, and the rest of `Policy.ts`'s constructors all build the same kind of
value, which is what lets you compose, store, and re-evaluate a policy without
ever touching a class or a closure.

## Why it's schema, not a hand-written interface

Most domain types in this library — `Permission`, `Role`, `AuthSubject` — are
plain hand-written interfaces, which is the norm this project otherwise follows.
`Policy` is the deliberate exception, because policies cross a trust boundary:
they get persisted as JSON and reloaded, in both directions.

The predecessor library maintained three separate artifacts by hand for this: a
TypeScript union, a serializer, and a deserializer. They drifted — the serializer
never wrote out `fieldStrategy`, so a policy that was stored and reloaded
silently reverted to the default merge strategy, narrowing field visibility with
no error anywhere. That defect is what
[ADR-QD-002](https://github.com/leaderiop/qadi/blob/main/spec/decisions/002-schema-derived-policy-adt.md)
exists to rule out structurally: the type and the JSON codec are built from one
definition, so they cannot independently drift.

Because `Policy` is recursive, the order is inverted from a typical
schema-first type: the self-referential TypeScript type is hand-written first
(`Schema.suspend` needs a named type to close the loop), and the
`Schema.TaggedStruct` variants are then built and type-asserted against it —
`Schema.Codec<Policy, PolicyEncoded>`. The type and the wire format cannot
diverge, because the second is checked against the first at compile time rather
than maintained alongside it.

## The shape

A `Policy` is a tree, not a flat list — `allOf`/`anyOf` are the branch nodes,
everything else (`hasRole`, `hasPermission`, and the rest) is a leaf. Take a
small policy requiring the `editor` role **and** read access to a document,
with only `id`/`title` visible:

<svg viewBox="0 0 500 200" width="100%" style="max-width: 460px" role="img" aria-label="Diagram: a Policy tree. The root is an AllOf node with fieldStrategy Intersection, with two children — a HasRole leaf checking the editor role, and a HasPermission leaf checking doc:read with fields id and title.">
  <defs>
    <marker id="adt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="170" y="10" width="160" height="42" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="250" y="28" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-accent-high)">AllOf</text>
  <text x="250" y="44" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9" fill="var(--sl-color-gray-3)">fieldStrategy: Intersection</text>
  <path d="M 220 52 L 130 108" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#adt-arrow)"/>
  <path d="M 280 52 L 380 108" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#adt-arrow)"/>
  <rect x="30" y="110" width="180" height="54" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="120" y="130" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-white)">HasRole</text>
  <text x="120" y="148" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-2)">role: "editor"</text>
  <rect x="280" y="110" width="200" height="54" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="380" y="130" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-white)">HasPermission</text>
  <text x="380" y="146" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-2)">doc:read</text>
  <text x="380" y="160" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9" fill="var(--sl-color-gray-3)">fields: [id, title]</text>
</svg>

```typescript
import { allOf, hasPermission, hasRole, permission } from "@qadi/core";
import type { Policy } from "@qadi/core";

const readDoc = permission("doc", "read");

const canReadTitle: Policy = allOf([
  hasRole("editor"),
  hasPermission(readDoc, { fields: ["id", "title"] }),
]);
```

`allOf`'s default `fieldStrategy` is `Intersection` — visible above as a field
on the root node itself, not implied — so both children must allow, and the
visible fields are whichever they agree on. Swap it for `anyOf` and the same
two leaves mean "either is enough," with `First` as the default strategy
instead. Either way, evaluating the tree is a straightforward recursive walk:
a leaf answers directly, a branch folds its children's answers according to
its combinator and strategy — no separate interpreter, no special-casing by
depth.

Each variant is a tagged struct, discriminated on `_tag`:

```ts
export type Policy =
  | { readonly _tag: "HasPermission"; readonly permission: Permission; /* … */ }
  | { readonly _tag: "HasRole"; readonly role: RoleName }
  | { readonly _tag: "AllOf"; readonly policies: ReadonlyArray<Policy>; readonly fieldStrategy: FieldStrategy }
  | { readonly _tag: "AnyOf"; readonly policies: ReadonlyArray<Policy>; readonly fieldStrategy: FieldStrategy }
  | { readonly _tag: "Not"; readonly policy: Policy }
  // … and more — HasAttribute, HasResourceAttribute, HasRelationship,
  //   HasAction, HasActed, HasNotActed, Obliged, Labeled, and further leaves
  //   added since (HasCustom, HasSignature)
```

`fieldStrategy` on `AllOf`/`AnyOf` is a **required** field, not optional — an
omitted optional is exactly what went missing in the predecessor's serializer,
so this schema doesn't leave room for it to happen again. Combinators like
`allOf` and `anyOf` also omit unset optional keys entirely rather than writing
them as `undefined`, since `Schema.optional` drops absent keys on decode: writing
`undefined` explicitly would make a freshly constructed policy structurally
different from that same policy after a round trip.

## Crossing the boundary

`toJson`/`fromJson` (and their `*Value` counterparts for an already-parsed JSON
value) are the codec derived from that schema:

```ts
import { fromJson, hasPermission, permission, toJson } from "@qadi/core";
import type { Policy } from "@qadi/core";
import * as Effect from "effect/Effect";
import type { SchemaError } from "effect/Schema";

const policy: Policy = hasPermission(permission("doc", "read"), { fields: ["id"] });

const roundTrip: Effect.Effect<Policy, SchemaError> = toJson(policy).pipe(Effect.flatMap(fromJson));
```

Decoding validates untrusted input for free — an unknown `_tag` or a malformed
permission segment fails rather than silently producing a policy nobody wrote.
A property test in this library's own suite generates arbitrary policy trees and
asserts `fromJson(toJson(p))` equals `p`, which is the guarantee this whole
design exists to buy.

For the full variant table and the wire-format requirements, see
[03 — Policy ADT](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/03-policy-adt.md).

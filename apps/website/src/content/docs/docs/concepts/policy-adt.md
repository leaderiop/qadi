---
title: The Policy ADT
description: Why Policy is one schema-derived definition instead of a hand-written type and a separately maintained codec.
---

A `Policy` is a value — a tagged-union tree describing what must be true for a
subject to be allowed to do something. `hasRole`, `hasPermission`, `allOf`, and
the rest of `Policy.ts`'s constructors all build the same kind of value, which
is what lets you compose, store, and re-evaluate a policy without ever touching
a class or a closure.

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

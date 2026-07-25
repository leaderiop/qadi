# 03 — Policy ADT

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | GUARD-BEH-03                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Guard Engineering                              |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-EG-001) |

_Previous: [02 — Roles and Inheritance](./02-roles.md)_

---

## BEH-EG-017: The policy union

> **Invariant:** [INV-EG-003](../invariants.md#inv-eg-003-codec-type-identity)
> **See:** [ADR-EG-002](../decisions/002-schema-derived-policy-adt.md), [ADR-EG-003](../decisions/003-tag-discriminant.md)

Nine variants, discriminated on `_tag`. The union is defined once as a Schema;
the TypeScript type and the JSON codec are both derived from it.

| `_tag` | Meaning |
| ------ | ------- |
| `HasPermission` | The subject holds a permission |
| `HasRole` | The subject holds a role, directly or by inheritance |
| `HasAttribute` | A subject attribute satisfies a matcher |
| `HasResourceAttribute` | A resource attribute satisfies a matcher |
| `HasRelationship` | The subject has a named relation to the resource |
| `AllOf` | Every child allows |
| `AnyOf` | At least one child allows |
| `Not` | Inverts a decision |
| `Labeled` | Names a policy; surfaced in the trace |

```ts
export const Policy: Schema.Codec<Policy>;
export type Policy = /* the nine-variant union above */;
```

```
REQUIREMENT: The TypeScript type and the JSON codec MUST derive from a single
             definition. Maintaining them separately is what allowed the
             predecessor's serializer to silently drop `fieldStrategy`.
```

## BEH-EG-018: Field visibility strategy

> **Invariant:** [INV-EG-004](../invariants.md#inv-eg-004-field-visibility-lattice)
> **See:** [ADR-EG-006](../decisions/006-field-strategy-always-encoded.md)

```ts
export const FieldStrategy: Schema.Literals<["Intersection", "Union", "First"]>;
export type FieldStrategy = "Intersection" | "Union" | "First";
```

| Strategy | Merge rule |
| -------- | ---------- |
| `Intersection` | Fields visible in **every** allowing child. Least privilege. |
| `Union` | Fields visible in **any** allowing child. Forces full evaluation. |
| `First` | The first allowing child's set. Short-circuits. |

```
REQUIREMENT: `fieldStrategy` MUST be a required field on `AllOf` and `AnyOf`,
             so that it is always encoded and always decoded.
```

```
REQUIREMENT: An absent field set means ALL fields — the top of the lattice, not
             the empty set. Intersecting it with any set S yields S.
```

## BEH-EG-019: Combinators

```ts
export const hasPermission: (permission: Permission, options?: FieldOptions) => Policy;
export const hasRole: (role: string) => Policy;
export const hasAttribute: (attribute: string, matcher: Matcher, options?: FieldOptions) => Policy;
export const hasResourceAttribute: (attribute: string, matcher: Matcher, options?: FieldOptions) => Policy;
export const hasRelationship: (relation: string, options?: FieldOptions & { depth?: number }) => Policy;
export const allOf: (policies: ReadonlyArray<Policy>, options?: CombinatorOptions) => Policy;
export const anyOf: (policies: ReadonlyArray<Policy>, options?: CombinatorOptions) => Policy;
export const not: (policy: Policy) => Policy;
export const labeled: (label: string, policy: Policy) => Policy;
export const anyOfRoles: (roles: ReadonlyArray<string>) => Policy;
```

```
REQUIREMENT: `allOf` MUST default to `Intersection` and `anyOf` to `First`.
             Least privilege is the correct default for a conjunction.
```

```
REQUIREMENT: Combinators MUST OMIT optional keys rather than setting them to
             `undefined`. `Schema.optional` drops absent keys on decode, so
             writing `undefined` would make a constructed policy structurally
             different from the same policy after a round trip.
```

## BEH-EG-020: Worked example

```typescript
import {
  allOf,
  anyOf,
  gte,
  hasAttribute,
  hasPermission,
  hasRole,
  labeled,
  not,
  permission,
  type Policy,
} from "@guard/core";

const readDoc = permission("doc", "read");

// Union visibility: each branch contributes the fields it exposes.
const canView: Policy = anyOf(
  [
    hasPermission(readDoc, { fields: ["id", "title"] }),
    hasRole("auditor"),
  ],
  { fieldStrategy: "Union" },
);

const canEdit: Policy = labeled(
  "edit-document",
  allOf([canView, hasAttribute("clearance", gte(3)), not(hasRole("suspended"))]),
);
```

---

_Previous: [02 — Roles and Inheritance](./02-roles.md) | Next: [04 — Matcher DSL](./04-matchers.md)_

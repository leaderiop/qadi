# 03 — Policy ADT

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-03                                    |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.3 (2026-07-26): `HasActed` and `HasNotActed` (CCR-QD-016)<br>1.2 (2026-07-26): `Obliged` is the eleventh variant (CCR-QD-015)<br>1.1 (2026-07-26): `HasAction` is the tenth variant (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

_Previous: [02 — Roles and Inheritance](./02-roles.md)_

---

## BEH-QD-017: The policy union

> **Invariant:** [INV-QD-003](../invariants.md#inv-qd-003-codectype-identity)
> **See:** [ADR-QD-002](../decisions/002-schema-derived-policy-adt.md), [ADR-QD-003](../decisions/003-tag-discriminant.md)

Thirteen variants, discriminated on `_tag`. The type is hand-written first —
`Policy`/`PolicyEncoded`, a recursive discriminated union — and the
`Schema.Codec` is built and type-asserted against it, so the TypeScript type
and the JSON codec cannot diverge.

| `_tag` | Meaning |
| ------ | ------- |
| `HasPermission` | The subject holds a permission |
| `HasRole` | The subject holds a role, directly or by inheritance |
| `HasAttribute` | A subject attribute satisfies a matcher |
| `HasResourceAttribute` | A resource attribute satisfies a matcher |
| `HasRelationship` | The subject has a named relation to the resource |
| `HasAction` | The call being authorized is the named action |
| `AllOf` | Every child allows |
| `AnyOf` | At least one child allows |
| `Not` | Inverts a decision |
| `HasActed` | The subject has already performed the named event |
| `HasNotActed` | The subject has **not** — and this is not `Not(HasActed)` |
| `Obliged` | Attaches a duty the caller must discharge if the policy allows |
| `Labeled` | Names a policy; surfaced in the trace |

`HasAction` is the odd one out and deliberately so: every other leaf asks about
the subject or the resource, and this one asks about the *request*. See
[10 — The Action Dimension](./10-actions.md).

```ts
export type Policy = /* the fourteen-variant union above, hand-written first */;
export const Policy: Schema.Codec<Policy>; // built and type-asserted against it
```

```
REQUIREMENT: The TypeScript type and the JSON codec MUST derive from a single
             definition. Maintaining them separately is what allowed the
             predecessor's serializer to silently drop `fieldStrategy`.
```

## BEH-QD-018: Field visibility strategy

> **Invariant:** [INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)
> **See:** [ADR-QD-006](../decisions/006-field-strategy-always-encoded.md)

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

## BEH-QD-019: Combinators

```ts
export const hasPermission: (permission: Permission, options?: FieldOptions) => Policy;
export const hasRole: (role: string) => Policy;
export const hasAttribute: (attribute: string, matcher: Matcher, options?: FieldOptions) => Policy;
export const hasResourceAttribute: (attribute: string, matcher: Matcher, options?: FieldOptions) => Policy;
export const hasRelationship: (relation: string, options?: FieldOptions & { depth?: number }) => Policy;
export const allOf: (policies: ReadonlyArray<Policy>, options?: CombinatorOptions) => Policy;
export const anyOf: (policies: ReadonlyArray<Policy>, options?: CombinatorOptions) => Policy;
export const not: (policy: Policy) => Policy;
export const obliged: (obligation: Obligation, policy: Policy) => Policy;
export const hasActed: (event: string, options?: HistoryOptions) => Policy;
export const hasNotActed: (event: string, options?: HistoryOptions) => Policy;
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

## BEH-QD-020: Worked example

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
} from "@qadi/core";

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

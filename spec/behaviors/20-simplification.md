# 20 — Policy Simplification

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-20                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-031) |

_Previous: [19 — Decision Hydration](./19-hydration.md)_

---

## BEH-QD-153: Simplification is opt-in and never automatic

> **See:** [ADR-QD-030](../decisions/030-policy-simplification.md)

```ts
export const simplify: (policy: Policy) => Policy;
```

```
REQUIREMENT: Nothing in the library MAY call `simplify`. Not `evaluate`, not
             `check`, not `toPredicate`, not `explain`.
```

A simplified policy produces a **shallower trace**, and the trace is what a reviewer
reads to see the rule an author wrote. Rewriting it silently would make
[`explain`](./18-explanation.md) describe a policy nobody stored.

## BEH-QD-154: Two rewrites, and both are conditional

> **Invariant:** [INV-QD-024](../invariants.md#inv-qd-024-simplification-changes-the-tree-and-nothing-a-caller-can-observe)

```
REQUIREMENT: A composite with exactly one child MUST be replaced by that child.
```

```
REQUIREMENT: A composite nested inside a composite of the same tag MUST be
             flattened ONLY when both carry the same `fieldStrategy`.
```

The condition is the correctness argument.
`allOf([a, allOf([b, c], { fieldStrategy: "Union" })], { fieldStrategy: "Intersection" })`
reaches the same verdict as its flattened form and exposes a **different field set** —
so an unconditional flatten would be verdict-preserving and *disclosure-changing*,
widening or narrowing what a caller may read while every allow-or-deny assertion
still passed.

```
REQUIREMENT: An empty `allOf` or `anyOf` MUST be left unchanged.
```

They are not redundant: one always allows, the other never does.

```
REQUIREMENT: `labeled` nodes MUST NOT be removed, and a rule table's rows MUST NOT
             be reordered, merged or dropped.
```

A label is the only thing a denial can be attributed to, and a row's index selects
the deciding rule ([BEH-QD-133](./17-concurrency.md)).

## BEH-QD-155: Double negation is NOT eliminated

```
REQUIREMENT: `not(not(p))` MUST be left unchanged.
```

It is not `p`. `Not` carries `visibleFields: undefined` — the top of the lattice,
meaning *all* fields — and no obligations, because knowing a policy did **not** hold
says nothing about which fields are safe to expose.

| Policy | Allows with | Owes |
| ------ | ----------- | ---- |
| `hasPermission(read, { fields: ["id"] })` | `["id"]` | — |
| `not(not(hasPermission(read, { fields: ["id"] })))` | **every field** | — |
| `obliged(audit, p)` | `p`'s fields | `audit` |
| `not(not(obliged(audit, p)))` | every field | **nothing** |

The rewrite was written, and the property in
[INV-QD-024](../invariants.md#inv-qd-024-simplification-changes-the-tree-and-nothing-a-caller-can-observe)
rejected it. Recorded as a requirement rather than an omission so nobody adds it back
as an obvious win.

## BEH-QD-156: Worked example

```typescript
import { allOf, hasPermission, hasRole, permission, simplify } from "@qadi/core";

// What a helper-composed policy looks like: correct, and three nodes deeper than
// the rule it expresses.
const built = allOf([allOf([hasRole("editor")]), allOf([hasPermission(permission("doc", "write"))])]);

// `allOf([hasRole("editor"), hasPermission(...)])` — same verdict, same fields,
// same duties, two fewer nodes.
const flat = simplify(built);

// Idempotent, so applying it twice is safe and cheap.
const same: boolean = JSON.stringify(simplify(flat)) === JSON.stringify(flat);
```

---

_Previous: [19 — Decision Hydration](./19-hydration.md)_

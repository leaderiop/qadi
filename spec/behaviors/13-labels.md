# 13 — The Label Lattice

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-13                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-017) |

_Previous: [12 — Decision History](./12-history.md)_

---

## BEH-QD-097: Labels are runtime data, not policy data

> **See:** [ADR-QD-021](../decisions/021-label-lattice.md)

```ts
export interface SecurityLabel {
  readonly level: number;
  readonly compartments: ReadonlyArray<string>;
}

export const isSecurityLabel: (value: unknown) => value is SecurityLabel;
```

```
REQUIREMENT: A label MUST NOT appear inside a policy. The `Dominates` matcher
             carries a `ValueRef` and no label, so both operands are read at
             evaluation time from subject or resource data.
```

A hand-written interface, which is the ordinary rule — [ADR-QD-002](../decisions/002-schema-derived-policy-adt.md)
makes the *policy ADT* the deliberate exception, not the norm. Nothing about a
label crosses a trust boundary that was not already crossed: what arrives is
whatever the caller put in an attribute, and that was always `unknown`.

```
REQUIREMENT: `compartments` MUST be an array, not a `Set`. Labels arrive as
             JSON, every operation here is subset-based, and a set would cost a
             canonical encoding — two spellings of one label that compare
             unequal is the defect class this library was rewritten to prevent.
```

```
REQUIREMENT: There MUST be no lattice declaration. Dominance on
             `(level, compartments)` is computable from two labels with nothing
             else in scope: no service to provide, no unwired-service denial
             path, and no policy whose meaning depends on its environment.
```

## BEH-QD-098: Four values

> **Invariant:** [INV-QD-015](../invariants.md#inv-qd-015-incomparable-labels-deny-in-both-directions)

```ts
export type LabelOrdering = "Equal" | "Dominates" | "DominatedBy" | "Incomparable";

export const compareLabels: (a: SecurityLabel, b: SecurityLabel) => LabelOrdering;
export const labelDominates: (a: SecurityLabel, b: SecurityLabel) => boolean;
```

```
REQUIREMENT: `compareLabels` MUST distinguish all four cases. Dominance is a
             *partial* order: `(Secret, {CRYPTO})` and `(Secret, {BIO})` are
             incomparable, and `Equal` is distinguishable from `Dominates`.
```

```
REQUIREMENT: `labelDominates` MUST be defined in terms of `compareLabels`, and
             MUST admit only `"Equal"` and `"Dominates"`.
```

The boolean is derived rather than primitive. `Incomparable` collapsing into
`false` is right for a *test* and wrong for an *explanation* — and Qadi's answer
to "why was this denied" is that the information exists rather than has to be
inferred.

Dominance is **reflexive**: a label dominates itself, so acting at your own level
is permitted, which is what Bell–LaPadula requires.

## BEH-QD-099: The matcher

```ts
export const dominates: (ref: ValueRef) => Matcher;
```

The first matcher beyond `eq`/`neq` to take a `ValueRef`, and that is the point:
dominance relates two *live* values, which `gte` and `lt` cannot do because they
take a plain number.

```
REQUIREMENT: Both rules of Bell–LaPadula MUST be expressible as this one
             comparison with the operands exchanged, never by negating it.
```

| Rule | Written as |
| ---- | ---------- |
| No read up | `hasAttribute("clearance", dominates(resource("label")))` |
| No write down | `hasResourceAttribute("label", dominates(subject("clearance")))` |

That the question is asked by swapping rather than negating is why a boolean
matcher is safe here, and why this differs from
[BEH-QD-091](./12-history.md) — where `hasNotActed` had to be its own variant
precisely because negation was the only other route.

```
REQUIREMENT: The matcher MUST deny when either side is not a `SecurityLabel`.
```

This deliberately does **not** follow the `MissingAction` precedent, and the
difference is worth stating because it looks inconsistent.
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one)
makes a missing action an *error* because the action is a caller argument — a
forgotten parameter at the call site. A label is *resolved data*, and absent or
malformed resolved data has always denied: `gte(3)` on `undefined` is false, and
that is the mechanism [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)
relies on.

```
REQUIREMENT: `referencesAction` MUST account for `Dominates`, since it takes a
             `ValueRef` and that reference may be `action()`.
```

## BEH-QD-100: What is not provided

```
REQUIREMENT: There MUST be no `join` or `meet`. A least upper bound answers
             "what class does this combined document belong to", which is
             computing a label rather than deciding an access.
```

Qadi decides. A caller that needs to classify a derived document has the label
type and can compute it, and in doing so is doing data classification — a
different job with a different audit story.

## BEH-QD-101: Worked example

Bell–LaPadula as a single stored policy. Before E1 and E4 this took `n × 2^c`
transcribed rungs whose ordering was itself a trap: the permitted sets *shrink*
as clearance rises, so descending rungs are correct for reads and wrong for
writes.

```typescript
import {
  allOf,
  anyOf,
  dominates,
  hasAction,
  hasAttribute,
  hasResourceAttribute,
  resource,
  subject,
  type Policy,
  type SecurityLabel,
} from "@qadi/core";

const bellLaPadula: Policy = anyOf([
  // no read up
  allOf([hasAction("read"), hasAttribute("clearance", dominates(resource("label")))]),
  // no write down
  allOf([
    hasAction("write"),
    hasResourceAttribute("label", dominates(subject("clearance"))),
  ]),
]);

// A clearance and a classification, as they arrive from JSON.
const clearance: SecurityLabel = { level: 2, compartments: ["CRYPTO"] };
const classification: SecurityLabel = { level: 2, compartments: ["BIO"] };
// `clearance` neither dominates nor is dominated by `classification`: the two
// are incomparable, so both the read and the write are refused. Compared as
// scalars they are both `2`, and each would reach the other.
```

---

_Previous: [12 — Decision History](./12-history.md)_

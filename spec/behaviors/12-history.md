# 12 — Decision History

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-12                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-016) |

_Previous: [11 — Obligations](./11-obligations.md)_

---

## BEH-QD-089: A port, not a store

> **See:** [ADR-QD-020](../decisions/020-decision-history-port.md)

```ts
export type ActedResult = "Acted" | "NotActed" | "Unknown";

export interface ActedQuery {
  readonly subjectId: string;
  readonly event: string;
  readonly resourceId: string | undefined;
}

export interface DecisionHistoryShape {
  readonly hasActed: (
    query: ActedQuery,
  ) => Effect.Effect<ActedResult, DecisionHistoryUnavailable>;
}
```

```
REQUIREMENT: History MUST live in the caller's store, behind this interface.
             Qadi holding accesses itself would make it a system of record,
             which the URS forbids.
```

```
REQUIREMENT: The port MUST be read-only, and MUST have exactly one member. An
             evaluator that writes is not reproducible, and Qadi is called
             speculatively — `filter` evaluates one policy across a list, and
             React's `Can` re-evaluates on render, so a component mounting
             would record accesses that never happened.
```

A write member on an evaluation service is one the evaluator must be trusted
never to call. The way to guarantee that is not to have it.

## BEH-QD-090: Three values, because two cannot fail closed

> **Invariant:** [INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities)

| Port answers | `hasActed` | `hasNotActed` |
| ------------ | ---------- | ------------- |
| `"Acted"` | allow | deny |
| `"NotActed"` | deny | allow |
| `"Unknown"` | **deny** | **deny** |

```
REQUIREMENT: `"Unknown"` MUST satisfy neither polarity. A boolean port cannot
             fail closed under negation: a `false`-answering default grants
             under `hasNotActed`, and a `true`-answering one grants under
             `hasActed`.
```

`RelationshipResolverNever` gets away with a boolean because `hasRelationship`
has only one polarity. Once a policy can ask the negative question, the port
needs a value that answers neither — the same job `undefined` does at the top of
the field-visibility lattice, which is to make a rule total.

## BEH-QD-091: `hasNotActed` is not `not(hasActed)`

```ts
export const hasActed: (event: string, options?: HistoryOptions) => Policy;
export const hasNotActed: (event: string, options?: HistoryOptions) => Policy;
```

```
REQUIREMENT: `HasActed` and `HasNotActed` MUST be distinct variants. `not`
             inverts a decision, so under `"Unknown"` — where `hasActed` denies
             — `not(hasActed(e))` ALLOWS, from an unwired port. `hasNotActed`
             denies.
```

This is the one rule in this document that is a security property rather than a
modelling preference, and it is the one somebody will later try to simplify away.
A comment would not hold it; the schema does.

## BEH-QD-092: Scope

```ts
export const HistoryScope: Schema.Literals<["Resource", "Any"]>;
```

| Scope | Question |
| ----- | -------- |
| `Resource` (default) | this subject, this event, **this resource** |
| `Any` | this subject, this event, **ever** |

```
REQUIREMENT: `scope` MUST be a required field on the encoded policy, for the
             reason `fieldStrategy` is: an omitted optional is what went missing
             in the predecessor, and the difference here is the difference
             between "you approved this invoice" and "you have ever approved
             anything".
```

```
REQUIREMENT: `scope: "Resource"` without `resource.id` MUST fail with
             `MissingResourceId`. It is a wiring error, not a decision — the
             same rule `HasRelationship` already follows, and the same error.
```

## BEH-QD-093: Unknown is a denial; unavailable is a failure

> **Invariant:** [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)

```ts
export class DecisionHistoryUnavailable extends Data.TaggedError(
  "DecisionHistoryUnavailable",
)<{
  readonly event: string;
  readonly cause: unknown;
}> {}
```

```
REQUIREMENT: A wired store that cannot be reached MUST propagate as an error.
             It MUST NOT be collapsed into a denial.
```

The temptation is stronger here than anywhere else in the library, because for a
separation-of-duty check a denial *feels* like the safe answer. It is not: it
makes an outage indistinguishable from "you raised this invoice", and sends an
engineer to audit approvals.

`"Unknown"` is the other thing — nobody is wired to answer — and that *is* a
denial, exactly as `RelationshipResolverNever` answering `false` is.

## BEH-QD-094: Chinese Wall needs nothing further

Brewer–Nash is two questions this port already answers, which is why no
`Engagement` type and no bespoke `withinWall` variant were added.

```typescript
import {
  anyOf,
  hasActed,
  hasNotActed,
  type Policy,
} from "@qadi/core";

// The conflict class names the event; the resource in hand is the company.
const withinWall = (conflictClass: string): Policy =>
  anyOf([
    // a free first access: no engagement anywhere in this class
    hasNotActed(conflictClass, { scope: "Any" }),
    // or an engagement with this very company
    hasActed(conflictClass, { scope: "Resource" }),
  ]);
```

```
REQUIREMENT: The first branch MUST be `hasNotActed`, never `not(hasActed(…))`.
             With no store wired the second grants access to every company in
             the class, which is the whole of what Chinese Wall forbids.
```

## BEH-QD-095: Layers

```ts
export interface ActedEventInput {
  readonly subjectId: string;
  readonly event: string;
  readonly resourceId: string;
}

export const DecisionHistoryUnknown: Layer.Layer<DecisionHistory>;
export const decisionHistoryFromEvents: (
  events: ReadonlyArray<ActedEventInput>,
) => Layer.Layer<DecisionHistory>;
```

```
REQUIREMENT: The default layer MUST answer `"Unknown"`. Unlike every other
             default it needs no polarity argument, which is the point of the
             third value (INV-QD-007).
```

`decisionHistoryFromEvents` is a closed world: anything not listed is
`"NotActed"` rather than `"Unknown"`, because that layer *is* the store and it
does know.

---

_Previous: [11 — Obligations](./11-obligations.md) | Next: [13 — The Label Lattice](./13-labels.md)_

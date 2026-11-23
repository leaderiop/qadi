# 12 — Decision History

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-12                                    |
> | Revision       | 1.6                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.6 (2026-11-23): BEH-QD-093: a member is absent when the request's value is unreadable or not admitted by its schema (code review iteration 2 IN-02, ADR-QD-189, CCR-QD-468)<br>1.5 (2026-11-23): BEH-QD-093: the event is absent whenever its schema refuses the value, and the cause is the store's own when the key admits it (code review WR-02, ADR-QD-189, CCR-QD-468)<br>1.4 (2026-11-23): BEH-QD-093: a row that cannot be read fails typed, and its pinning rows (code review WR-01, ADR-QD-189, CCR-QD-468)<br>1.3 (2026-11-23): BEH-QD-093: the event is optional, and the fixture fails a row or request the key refuses (ARCH-123, ADR-QD-189, CCR-QD-468)<br>1.2 (2026-11-18): BEH-QD-607 (ARCH-101, CCR-QD-445)<br>1.1 (2026-11-10): BEH-QD-092 — HasSignature reads "Any" narrower than history does: signatures on file subject-wide, and a discharge on a resource without a string id is refused (ARCH-59, ADR-QD-117, CCR-QD-395)<br>1.0 (2026-07-26): Initial release (CCR-QD-016) |

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

`HasSignature` reuses the literal with a narrower reading: its `"Any"` means
signatures on file subject-wide, recorded with **no** resource, not "ever, on any
resource" (BEH-QD-326, INV-QD-120, ADR-QD-117). A signature discharged on a resource
without a string `id` is refused rather than recorded subject-wide (BEH-QD-256), so
it never satisfies a signature's `"Any"`.

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
  readonly event?: string | undefined;
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

> **Note (2026-11-23, ADR-QD-189):** the event is absent exactly when the request's
> event is unreadable or is not a string, whether or not the port's key refuses it.
> The cause is `describeKeyRefusal`'s sentence when the key refuses the request, and
> the store's own cause when the key admits it, as an event that is a number is
> ([BEH-QD-410](06-services.md#beh-qd-410-a-request-the-key-refuses-fails-closed)).
> `decisionHistoryFromEvents` keys its rows and its requests through
> `decisionHistoryPort.key`, so a row or a request the key refuses, or that cannot be
> read at all (a `null` row, a getter or a proxy that throws), fails with this error
> and never answers `"NotActed"`, which `hasNotActed` would read as an allow.
> The closed world of [BEH-QD-095](#beh-qd-095-layers) is unchanged for every typed
> row. Pinned by `packages/core/test/DecisionHistory.test.ts`
> ("a subject whose id is a symbol fails as DecisionHistoryUnavailable, never answering NotActed",
> "an event that is a symbol fails with no event and the refusal as its cause, never answering NotActed",
> "a fixture row whose subject id is a symbol fails every read, never answering NotActed",
> "a fixture row whose event cannot be read fails every read, never throwing",
> "a fixture row that cannot be read fails every read, naming the field and what was thrown",
> "a site subject that cannot be read fails the judgement with the leaf's event, naming the site",
> "the error has no event and the cause is the store's own").

## BEH-QD-607: Both acted polarities read one verdict row, and Unknown denies both

> **Invariant:** [INV-QD-354](../invariants.md#inv-qd-354-an-acted-unknown-denies-both-polarities-stated-once)
> **See:** [ADR-QD-167](../decisions/167-each-leafs-answer-becomes-a-verdict-in-one-row.md), [ADR-QD-020](../decisions/020-decision-history-port.md)

```
REQUIREMENT: The wanted answer and the `Unknown` branch of an acted leaf MUST be written once,
             in the row `actedRow` builds for `HasActed` and `HasNotActed`. `Unknown` MUST deny
             `HasActed` and `HasNotActed` under both scopes, in `evaluate` and in
             `toPredicate`.
```

`HasActed` wants `"Acted"` and `HasNotActed` wants `"NotActed"`; `Unknown` is neither, so an unwired port can never
read as an allow under negation, which is why the port is three-valued (ADR-QD-020). Before ARCH-101 the polarity map
and the comparison were written in `Walk.ts` and again in `Predicate.ts`. Pinned by `LeafVerdict.test.ts` and
`LeafNeeds.test.ts`, and by the existing evaluate and `toPredicate` agreement for `scope: "Any"`.

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

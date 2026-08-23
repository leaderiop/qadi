# 06 — Services and Layers

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-06                                    |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-08-23                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.3 (2026-08-23): `RelationshipResolver` is three-valued, for the sentence rather than the verdict; BEH-QD-045 added (ADR-QD-040, INV-QD-029, CCR-QD-055)<br>1.2 (2026-07-26): The sixth service, `DecisionCache`; the optionality that hid it recorded (CCR-QD-034)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## BEH-QD-041: Service declaration form

> **See:** [ADR-QD-010](../decisions/010-context-service-and-layers.md)

```ts
export class AttributeResolver extends Context.Service<
  AttributeResolver,
  AttributeResolverShape
>()("qadi/AttributeResolver") {}
```

```
REQUIREMENT: Services MUST be declared with `Context.Service<Self, Shape>()("ns/Id")`.
             `Effect.Service`, `Context.Tag` and `Context.GenericTag` MUST NOT
             be used.
```

```
REQUIREMENT: Layers MUST be exported top-level constants, not static members.
```

Note that `use` requires its callback to **return an Effect**, so it is a
one-step method accessor. The identity form `static current = X.use((x) => x)`
typechecks only when the Shape is itself an `Effect`, which ours are not.

## BEH-QD-042: The six services, five of them required

| Service | Tag | Purpose |
| ------- | --- | ------- |
| `CurrentSubject` | `qadi/CurrentSubject` | The subject being authorized |
| `AttributeResolver` | `qadi/AttributeResolver` | Attributes not already on the subject |
| `RelationshipResolver` | `qadi/RelationshipResolver` | ReBAC graph questions |
| `DecisionHistory` | `qadi/DecisionHistory` | What this subject has already done |
| `EvaluationId` | `qadi/EvaluationId` | Correlating identifier |
| `DecisionCache` | `qadi/DecisionCache` | **Optional.** What has already been asked, within a scope the caller chooses |

`DecisionHistory` arrived with E5 and is the only one added after the initial
release. Like `RelationshipResolver` it is a **port**, not a store: the record
lives in the caller's system and Qadi never writes to it
([ADR-QD-020](../decisions/020-decision-history-port.md)).

```
REQUIREMENT: `DecisionCache` MUST NOT be a member of `EvaluationServices`, and MUST
             be read through `Effect.serviceOption`, so an application that never
             provides it is unaffected.
```

That optionality is why it is the sixth service and not the sixth *required* one — and
why it went unlisted here for two commits. It is the one service that does not appear
in the type every other service appears in, so nothing about adding it forced this
table to change ([ADR-QD-031](../decisions/031-decision-cache.md)).

*This heading said "four" until CCR-QD-025 and "five" until CCR-QD-034, while
[05 — Evaluator](./05-evaluator.md) had listed five since E5 shipped. Two behaviour
documents disagreeing about how many services exist is the kind of drift a normative
set cannot carry, and the first time it had propagated into §1 of the traceability
matrix. Twice is a pattern, not an oversight, and it is the reason step 9 of the merge
gate now exists — though note what that gate does and does not cover: it checks that
`spec/overview.md` names every **export**, and `DecisionCache` being missing from
**this** table is a different miss that the gate would not have caught.*

## BEH-QD-043: Defaults fail closed

> **Invariant:** [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)

```ts
export const AttributeResolverNone: Layer.Layer<AttributeResolver>;
export const RelationshipResolverNever: Layer.Layer<RelationshipResolver>;
export const DecisionHistoryUnknown: Layer.Layer<DecisionHistory>;
export const CurrentSubjectAnonymous: Layer.Layer<CurrentSubject>;
export const EvaluationIdLive: Layer.Layer<EvaluationId>;
```

```
REQUIREMENT: Every default layer MUST fail closed. An unwired relationship
             resolver MUST deny; an unwired subject MUST hold nothing. A default
             that grants would turn a wiring omission into a silent breach.
```

`DecisionHistoryUnknown` is the hardest case in that list and the reason that port
is three-valued. A boolean has a **polarity**: whichever way an unwired default
answers, it grants under one of `hasActed`/`hasNotActed`. `"Unknown"` denies under
both, which is what makes "fail closed" achievable at all here
([INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities)).

`RelationshipResolverNever` is three-valued too, and for a different reason —
worth separating, because the shapes are identical and the arguments are not:

```ts
export type ActedResult = "Acted" | "NotActed" | "Unknown";
export type RelatedResult = "Related" | "Unrelated" | "Unknown";
```

`hasRelationship` has no negative counterpart, so `false` was always fail-closed
and safety was never at stake. What a boolean could not do was tell the
*evaluator* which of two answers it held, so an unwired resolver denied by
describing a graph that had never been connected. Its third value buys the
sentence, not the verdict
([BEH-QD-045](#beh-qd-045-a-denials-reason-names-only-what-was-consulted), [ADR-QD-040](../decisions/040-an-unwired-port-names-its-absence.md)).

```
REQUIREMENT: `RelationshipResolverNever` MUST answer `"Unknown"`, and
             `relationshipResolverFromEdges` MUST answer `"Unrelated"` for an
             edge it does not hold. A static edge list is the store, and knows.
```

## BEH-QD-045: A denial's reason names only what was consulted

> **Invariant:** [INV-QD-029](../invariants.md#inv-qd-029-a-denial-names-only-what-was-consulted)
> **See:** [ADR-QD-040](../decisions/040-an-unwired-port-names-its-absence.md)

```
REQUIREMENT: A denial's reason MUST NOT assert a fact about a store that was not
             consulted. An unwired port MUST be named as unwired.
```

| Situation | Denial reads |
| --------- | ------------ |
| a wired relationship store holds no such edge | `subject 'u1' has no 'owner' relation to 'doc-1'` |
| no relationship resolver is wired | `no relationship resolver is wired, so no 'owner' relation to 'doc-1' can be confirmed` |
| an attribute is present and compares wrong | `subject attribute 'level' did not match` |
| an attribute is absent or unresolved | `subject attribute 'level' has no value` |

Both relationship rows **deny**, and so do both attribute rows. Nothing here
changes a verdict — [BEH-QD-043](#beh-qd-043-defaults-fail-closed) and
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) are untouched —
which is exactly why it needs stating: no assertion about a verdict can observe
whether this holds.

The first row's sentence used to cover the second, and that was a claim about the
contents of a graph nobody had connected. It reaches an `AccessDenied` handler
([BEH-QD-054](./07-enforcement.md)), a `renderTrace` line
([BEH-QD-144](./18-explanation.md)) and a `Can` fallback
([BEH-QD-072](./09-react.md)). Worse, the unwired state is the one every ReBAC
integration begins in, so it was the first sentence most readers ever saw.

The attribute rows are milder and belong here for the same reason. `did not
match` is *true* of an unresolved attribute — every matcher fails `undefined` —
so nothing was false; the diagnosis was withheld, and `AttributeResolverNone`
produces that case exclusively.

```
REQUIREMENT: The reason MUST NOT contain a resolved attribute's value.
```

The attribute's *name* is already disclosed; its contents are the subject's data,
and a reason travels to logs and into error handlers. "has no value" is chosen
over "is not set" with the same care: an attribute present on the record holding
`undefined` reaches that branch too, and the shorter claim about the record's
shape has not been checked.

## BEH-QD-044: Request scoping

```ts
export const currentSubjectLayer: (subject: AuthSubject) => Layer.Layer<CurrentSubject>;
```

Named `currentSubjectLayer` rather than exposed as a static `of`, because
`Context.Service` already defines `of` as the service constructor.

---

_Previous: [05 — Evaluator](./05-evaluator.md) | Next: [07 — Enforcement](./07-enforcement.md)_

# 06 — Services and Layers

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-06                                    |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.2 (2026-07-26): The sixth service, `DecisionCache`; the optionality that hid it recorded (CCR-QD-034)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

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

`DecisionHistoryUnknown` is the hardest case in that list and the reason the port
is three-valued. A boolean has a **polarity**: whichever way an unwired default
answers, it grants under one of `hasActed`/`hasNotActed`. `"Unknown"` denies under
both, which is what makes "fail closed" achievable at all here
([INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities)).

## BEH-QD-044: Request scoping

```ts
export const currentSubjectLayer: (subject: AuthSubject) => Layer.Layer<CurrentSubject>;
```

Named `currentSubjectLayer` rather than exposed as a static `of`, because
`Context.Service` already defines `of` as the service constructor.

---

_Previous: [05 — Evaluator](./05-evaluator.md) | Next: [07 — Enforcement](./07-enforcement.md)_

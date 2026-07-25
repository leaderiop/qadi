# 06 — Services and Layers

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-06                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-QD-001) |

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

## BEH-QD-042: The four services

| Service | Tag | Purpose |
| ------- | --- | ------- |
| `CurrentSubject` | `qadi/CurrentSubject` | The subject being authorized |
| `AttributeResolver` | `qadi/AttributeResolver` | Attributes not already on the subject |
| `RelationshipResolver` | `qadi/RelationshipResolver` | ReBAC graph questions |
| `EvaluationId` | `qadi/EvaluationId` | Correlating identifier |

## BEH-QD-043: Defaults fail closed

> **Invariant:** [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)

```ts
export const AttributeResolverNone: Layer.Layer<AttributeResolver>;
export const RelationshipResolverNever: Layer.Layer<RelationshipResolver>;
export const CurrentSubjectAnonymous: Layer.Layer<CurrentSubject>;
export const EvaluationIdLive: Layer.Layer<EvaluationId>;
```

```
REQUIREMENT: Every default layer MUST fail closed. An unwired relationship
             resolver MUST deny; an unwired subject MUST hold nothing. A default
             that grants would turn a wiring omission into a silent breach.
```

## BEH-QD-044: Request scoping

```ts
export const currentSubjectLayer: (subject: AuthSubject) => Layer.Layer<CurrentSubject>;
```

Named `currentSubjectLayer` rather than exposed as a static `of`, because
`Context.Service` already defines `of` as the service constructor.

---

_Previous: [05 — Evaluator](./05-evaluator.md) | Next: [07 — Enforcement](./07-enforcement.md)_

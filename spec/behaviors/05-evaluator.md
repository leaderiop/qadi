# 05 — Evaluator

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-05                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## BEH-QD-033: One evaluator

> **Invariant:** [INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)
> **See:** [ADR-QD-004](../decisions/004-single-effect-evaluator.md)

```ts
export const evaluate: (
  policy: Policy,
  options?: EvaluateOptions,
) => Effect.Effect<
  Decision,
  EvaluationError,
  CurrentSubject | AttributeResolver | RelationshipResolver | EvaluationId
>;
```

```
REQUIREMENT: There MUST be exactly one evaluator. A separate synchronous path
             is what rendered the predecessor's asynchronous relationship API
             unreachable.
```

## BEH-QD-034: Lazy attribute resolution

> **See:** [ADR-QD-005](../decisions/005-lazy-attribute-resolution.md)

```
REQUIREMENT: `HasAttribute` MUST read the subject's own attributes first and
             call `AttributeResolver` only on a miss.
```

```
REQUIREMENT: Resolution MUST occur at the node that needs the value, so that a
             branch which is never evaluated triggers no lookup. This is
             verified by counting resolver invocations, not by timing.
```

## BEH-QD-035: Short-circuiting

> **See:** [ADR-QD-013](../decisions/013-short-circuit-default.md)

```
REQUIREMENT: `AllOf` MUST stop at its first denying child.
             `AnyOf` MUST stop at its first allowing child, EXCEPT under
             `fieldStrategy: "Union"`, which must observe every child to merge
             their field sets.
```

```
REQUIREMENT: `AnyOf` MUST honour an explicit `Intersection` strategy. The
             predecessor special-cased only "union" and silently treated every
             other value as short-circuit, so a stated intersection was ignored.
```

## BEH-QD-036: Failure is not denial

> **Invariant:** [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)

```
REQUIREMENT: A failed attribute or relationship lookup MUST propagate as an
             error, never as a denial. Reporting an outage as "not authorized"
             misdirects diagnosis toward permissions.
```

```
REQUIREMENT: A `HasResourceAttribute` or `HasRelationship` policy evaluated
             without the resource it needs MUST fail with `MissingResource` or
             `MissingResourceId`. It is a wiring error, not a decision.
```

## BEH-QD-037: Determinism

> **See:** [ADR-QD-012](../decisions/012-deterministic-time-and-ids.md)

```
REQUIREMENT: Durations MUST come from `Clock` and identifiers from
             `EvaluationId`. Ambient `Date.now()`, `performance.now()` and
             `crypto.randomUUID()` are prohibited, so that a decision is fully
             reproducible under `TestClock`.
```

## BEH-QD-038: Bounded recursion

```
REQUIREMENT: Evaluation MUST reject a policy tree deeper than `maxDepth`
             (default 64) with `PolicyTooDeep`, bounding recursion on decoded
             input.
```

## BEH-QD-039: Decisions and traces

```ts
export type Decision = Allow | Deny;

export interface Trace {
  readonly policyTag: Policy["_tag"];
  readonly label?: string | undefined;
  readonly allowed: boolean;
  readonly reason?: string | undefined;
  readonly children: ReadonlyArray<Trace>;
  readonly visibleFields?: ReadonlyArray<string> | undefined;
}
```

```
REQUIREMENT: Every evaluation MUST produce a full trace tree, so that a denial
             can always answer "why".
```

## BEH-QD-040: Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  currentSubjectLayer,
  evaluate,
  hasPermission,
  isAllowed,
  makeSubject,
  permission,
  type EvaluationError,
} from "@qadi/core";

const readDoc = permission("doc", "read");

const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "u1", permissions: ["doc:read"] })),
  AttributeResolverNone,
  RelationshipResolverNever,
  EvaluationIdLive,
);

// `EvaluationError` remains in the channel: a lookup failure is not a denial,
// so the caller must decide what to do about it.
const program: Effect.Effect<boolean, EvaluationError> = evaluate(
  hasPermission(readDoc),
).pipe(Effect.map(isAllowed), Effect.provide(services));
```

---

_Previous: [04 — Matcher DSL](./04-matchers.md) | Next: [06 — Services and Layers](./06-services.md)_

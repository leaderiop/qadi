# 05 — Evaluator

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-05                                    |
> | Revision       | 1.5                                            |
> | Effective Date | 2026-09-09                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.5 (2026-09-09): BEH-QD-261 — the five bare `yield*` port calls (`AttributeResolver.resolve`, `DecisionHistory.hasActed`, `RelationshipResolver.check`, `CustomPredicate.evaluate`, `SignatureHistory.signaturesFor`) now each convert a defecting implementation into their own typed `EvaluationError`, joining the four `EvaluationError` tags (`MissingAction`, `MissingResource`, `MissingResourceId`, `PolicyTooDeep`) that were already synchronous and so never at risk of dying — so a caller's `Effect.retry` around `evaluate` now sees a retryable failure at all nine tags, not just those four (issue #100, CCR-QD-142)<br>1.4 (2026-09-07): BEH-QD-033's `evaluate` signature corrected — the requirement channel omitted `CustomPredicate`/`SignatureHistory`, both joined by CCR-QD-082/CCR-QD-089 (CCR-QD-110)<br>1.3 (2026-07-26): `DecisionHistory` joins `EvaluationServices` (CCR-QD-016)<br>1.2 (2026-07-26): `Trace.obligations` (CCR-QD-015)<br>1.1 (2026-07-26): Missing-action rule cross-referenced (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

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
  | CurrentSubject
  | AttributeResolver
  | RelationshipResolver
  | DecisionHistory
  | EvaluationId
  | CustomPredicate
  | SignatureHistory
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

The same rule governs a missing action, with one extra step because matchers are
total — see [BEH-QD-076](./10-actions.md) and
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one).

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
  readonly obligations: ReadonlyArray<Obligation>;
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
  CustomPredicateNone,
  SignatureHistoryNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
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
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
  SignatureHistoryNone,
);

// `EvaluationError` remains in the channel: a lookup failure is not a denial,
// so the caller must decide what to do about it.
const program: Effect.Effect<boolean, EvaluationError> = evaluate(
  hasPermission(readDoc),
).pipe(Effect.map(isAllowed), Effect.provide(services));
```

## BEH-QD-261: A defecting port fails typed, not dead

> **Invariant:** [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)
> **See:** [BEH-QD-036](#beh-qd-036-failure-is-not-denial)

```
REQUIREMENT: Each of the five port calls `evaluate` makes — `AttributeResolver.resolve`,
             `DecisionHistory.hasActed`, `RelationshipResolver.check`,
             `CustomPredicate.evaluate`, `SignatureHistory.signaturesFor` —
             MUST convert a defect from the underlying implementation (a
             throw, a rejected promise, an `Effect.die`) into that port's own
             typed `EvaluationError`, exactly as a well-behaved implementation
             failing with that error already does. An already-typed failure,
             and an interruption, MUST pass through unchanged.
```

```
REQUIREMENT: This conversion MUST be visible to a caller's own `Effect.retry`
             wrapped around `evaluate` — `Effect.retry` only ever inspects the
             typed error channel, so a defect that reached it unconverted
             could never be retried, unlike an ordinary `Effect.fail`.
```

BEH-QD-036 already required a *typed* failure not to read as a denial; this
closes the gap one level under it — a port that dies instead of failing is not
`Effect.orDie` (AGENTS.md §4 forbids that explicitly), but reaches the same
place by omission if nothing catches it. `CustomPredicateError` has no `cause`
field, unlike its four siblings; its `reason` renders the defect
(`Cause.pretty`) the same way it already renders an unregistered name as a
sentence, rather than a second shape invented for the defect case.

Each port's `Shape` interface documents this as part of its own contract —
`AttributeResolverShape.resolve`'s doc comment states it first, and the other
four cross-reference it — so an implementer reads the guarantee at the method
they are writing, not only here.

---

_Previous: [04 — Matcher DSL](./04-matchers.md) | Next: [06 — Services and Layers](./06-services.md)_

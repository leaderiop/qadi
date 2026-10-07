# 05 — Evaluator

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-05                                    |
> | Revision       | 1.9                                            |
> | Effective Date | 2026-10-07                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.9 (2026-10-07): BEH-QD-033 — the interpreter is the internal `walk`, `evaluate` the only public path to a decision; BEH-QD-317 added, a readiness probe asks the ports every time (ADR-QD-100, CCR-QD-189)<br>1.8 (2026-10-05): BEH-QD-035 — the stop rule reads the field lattice's `decidedByFirst` law; a strategy outside the union, prototype keys included, never stops early (ADR-QD-092, CCR-QD-174)<br>1.7 (2026-10-04): BEH-QD-038 — nesting depth is judged on the policy before any node is visited, matcher nesting counts, and no `maxDepth` raises a defect (ADR-QD-090, CCR-QD-170)<br>1.6 (2026-10-04): BEH-QD-261 — scope sentence: the conversion lives in `PortAccess.ts` and applies to every port read core makes, `toPredicate`'s included (BEH-QD-264); the requirement text for `evaluate` is unchanged (ADR-QD-077, CCR-QD-153)<br>1.5 (2026-09-09): BEH-QD-261 — the five bare `yield*` port calls (`AttributeResolver.resolve`, `DecisionHistory.hasActed`, `RelationshipResolver.check`, `CustomPredicate.evaluate`, `SignatureHistory.signaturesFor`) now each convert a defecting implementation into their own typed `EvaluationError`, joining the four `EvaluationError` tags (`MissingAction`, `MissingResource`, `MissingResourceId`, `PolicyTooDeep`) that were already synchronous and so never at risk of dying — so a caller's `Effect.retry` around `evaluate` now sees a retryable failure at all nine tags, not just those four (issue #100, CCR-QD-142)<br>1.4 (2026-09-07): BEH-QD-033's `evaluate` signature corrected — the requirement channel omitted `CustomPredicate`/`SignatureHistory`, both joined by CCR-QD-082/CCR-QD-089 (CCR-QD-110)<br>1.3 (2026-07-26): `DecisionHistory` joins `EvaluationServices` (CCR-QD-016)<br>1.2 (2026-07-26): `Trace.obligations` (CCR-QD-015)<br>1.1 (2026-07-26): Missing-action rule cross-referenced (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

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

The interpreter is `walk` (`Walk.ts`, internal, not in the barrel). It decides
without an id, a record or a metric, so `evaluate` is the only public path to a
decision; `evaluate` is the lifecycle around it ([ADR-QD-100](../decisions/100-a-question-is-asked-once.md)).

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
             `AnyOf` MUST stop at its first allowing child only under
             `fieldStrategy: "First"`; under `"Union"` and `"Intersection"` it
             MUST observe every allowing child to merge their field sets.
```

```
REQUIREMENT: `AnyOf` MUST honour an explicit `Intersection` strategy exhaustively,
             the same as `"Union"`. The predecessor special-cased only "union" and
             silently treated every other value as short-circuit, so a stated
             intersection was ignored.
```

The stop rule reads `FieldLattice.ts`'s `decidedByFirst` law through
`ShortCircuit.ts`'s `anyOfStopsAtAllow`, and a value outside the union — a key
`Object.prototype` supplies (`"toString"`, `"__proto__"`) included — never stops
early. The predecessor's defect, "treated every other value as short-circuit",
had come back for exactly those keys through a bare table lookup, and is now
pinned by test ([ADR-QD-092](../decisions/092-field-strategy-meaning-lives-beside-the-lattice.md)).

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

```
REQUIREMENT: A policy deeper than `maxDepth` MUST be rejected regardless of which
             branches evaluation would visit: the check is made on `policyDepth`
             before any node is evaluated, so whether a policy is too deep never
             depends on the subject, the resource or what any port answers.
```

```
REQUIREMENT: A matcher's nesting counts toward `maxDepth`: a `HasAttribute` or
             `HasResourceAttribute` leaf is as deep as its matcher's `matcherDepth`.
```

```
REQUIREMENT: Evaluation MUST NOT raise a defect for any `maxDepth` a caller
             supplies, `Infinity` included. A wrapper node's child is built
             lazily, so building the effect cannot overflow the call stack.
```

Before ADR-QD-090 the depth was only checked per node, so a policy past the bound
could still evaluate when a short-circuit never descended into the deep branch —
"too deep" depended on who was asking — and a deep chain of `not`/`obliged`/
`labeled` under a large `maxDepth` raised a `RangeError` as a defect, a decision
becoming a defect (AGENTS.md §4). The per-node guard in `evaluateNode` remains as
defense in depth.

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
  currentSubjectLayer,
  evaluate,
  EvaluationServicesNone,
  hasPermission,
  isAllowed,
  makeSubject,
  permission,
  type EvaluationError,
} from "@qadi/core";

const readDoc = permission("doc", "read");

const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "u1", permissions: ["doc:read"] })),
  EvaluationServicesNone,
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

**Where it lives.** The conversion is `catchPortDefect` in `PortAccess.ts`, the
module every port read either interpreter makes goes through, and so it applies to
every port read core makes — `toPredicate`'s two reads included
([BEH-QD-264](./16-predicates.md#beh-qd-264-a-defecting-port-fails-translation-typed-not-dead)).
The requirement text above is about `evaluate` and is unchanged.

Each port's `Shape` interface documents this as part of its own contract —
`AttributeResolverShape.resolve`'s doc comment states it first, and the other
four cross-reference it — so an implementer reads the guarantee at the method
they are writing, not only here.

## BEH-QD-317: A readiness probe asks the ports every time

> **Invariant:** [INV-QD-102](../invariants.md#inv-qd-102-a-probes-verdict-on-port-health-is-never-served-from-a-cache)
> **See:** [ADR-QD-100](../decisions/100-a-question-is-asked-once.md)

```
REQUIREMENT: `createGuardHealthCheck` MUST consult the wired ports on every call,
             whatever `DecisionCache` is wired. It MUST NOT emit a `SinkRecord`
             and MUST NOT update `qadi_decisions_total`. It MUST require only
             `CurrentSubject` and the ports.
```

```typescript
import * as Effect from "effect/Effect";
import { createGuardHealthCheck, decisionCacheLayer, hasRole } from "@qadi/core";

// With a cache wired, both probes still reach the ports.
export const probeTwice = Effect.gen(function* () {
  const first = yield* createGuardHealthCheck(hasRole("canary"));
  const second = yield* createGuardHealthCheck(hasRole("canary"));
  return [first.healthy, second.healthy] as const;
}).pipe(Effect.provide(decisionCacheLayer()));
```

A probe answers "do the wired ports answer?", which is not an authorization
decision. Its `qadi.guardHealthCheck` span carries `qadi.healthy` and, when
unhealthy, `qadi.error_tag`.

---

_Previous: [04 — Matcher DSL](./04-matchers.md) | Next: [06 — Services and Layers](./06-services.md)_

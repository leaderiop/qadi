# 17 — Concurrent Evaluation

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-17                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-027) |

_Previous: [16 — Predicate Output](./16-predicates.md)_

---

## BEH-QD-129: Concurrency is an option on the request

> **See:** [ADR-QD-026](../decisions/026-concurrent-evaluation.md)

```ts
export interface EvaluateOptions {
  readonly concurrency?: Concurrency; // number | "unbounded" | "inherit"
}
```

```
REQUIREMENT: `concurrency` MUST default to absent, and an absent value MUST
             evaluate exactly as evaluation did before this option existed.
```

```
REQUIREMENT: Concurrency MUST NOT be configurable through a service or a layer.
             A policy's cost profile must not depend on ambient configuration, or
             the same tree behaves differently in two applications.
```

It is a property of the evaluation, never a value a matcher can read — so it is
absent from `MatcherContext` and no `ValueRef` can reach it.

## BEH-QD-130: Concurrency changes lookups, never decisions

> **Invariant:** [INV-QD-020](../invariants.md#inv-qd-020-concurrency-changes-lookups-never-decisions)

```
REQUIREMENT: For every policy and every request, the `Decision` and its `Trace`
             MUST be identical whether or not `concurrency` is supplied —
             including `Trace.children`.
```

`Trace.children` is the load-bearing half. `Effect.forEach` returns results in
input order, so a naive implementation would preserve the *verdict* while changing
the trace: a concurrent `allOf` over four children would record four where the
sequential one records two.

```
REQUIREMENT: The concurrent path MUST discard the trace of any child evaluated
             after the child that settled the outcome.
```

That work was speculative by construction. Keeping it would make the trace — which
is public, and is what `filter` and the React bindings surface — depend on a
performance switch.

## BEH-QD-131: One fold, driven two ways

```
REQUIREMENT: The rules that combine child traces into a verdict MUST exist in
             exactly one place per composite, and both the sequential and the
             concurrent path MUST drive that same fold in declaration order.
```

The sequential path steps the fold one child at a time and stops evaluating as
soon as a step yields a verdict. The concurrent path evaluates every child, then
steps the same fold over the results, stopping at the same index.

Two implementations asserted to agree was rejected. Unlike
[a predicate](./16-predicates.md), which has an independent reason to exist as a
second interpreter ([ADR-QD-024](../decisions/024-predicate-output.md)), a
schedule has none — so the agreement here is structural rather than tested into
place, and the property test is a check on the structure rather than the guarantee
itself.

## BEH-QD-132: Short-circuiting is forfeited, and only by asking

```
REQUIREMENT: Supplying `concurrency` MUST evaluate every child of a composite,
             performing lookups a sequential evaluation would have skipped.
```

This is the trade, stated as a requirement so it cannot be mistaken for a defect.
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) holds under
the default and is forfeited by an explicit opt-in.

```
REQUIREMENT: Tests MUST assert that a concurrent evaluation performs strictly
             more lookups than a sequential one on a policy with a skippable
             branch.
```

Equality of decisions alone would pass for an option that did nothing.

## BEH-QD-133: The deciding rule is chosen by index

> **Invariant:** [INV-QD-017](../invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden)

```
REQUIREMENT: Under `concurrency`, the deciding rule of a `Rules` node MUST be the
             first applying row of the winning effect **by index**, never the
             first to complete.
```

The deciding rule supplies the decision's field set and obligations
([ADR-QD-023](../decisions/023-combining-algorithms.md)), so selecting by arrival
would make two runs of the same table owe different duties. This is the constraint
that made concurrency undesignable before combining algorithms shipped.

## BEH-QD-134: Failure still is not denial

> **Invariant:** [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)

```
REQUIREMENT: A resolver failure in any concurrently evaluated branch MUST fail the
             evaluation, even when a sibling branch denied.
```

Under the sequential path a denial short-circuits before the failing branch is
reached, so the same tree can fail under concurrency and deny without it. Both are
correct: an error is not a decision, and concurrency surfaces errors a sequential
walk would never have provoked.

## BEH-QD-135: Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  check,
  currentSubjectLayer,
  hasRelationship,
  hasRole,
  makeSubject,
} from "@qadi/core";

// Three independent relationship branches against a remote graph store. Sequential
// evaluation costs three round trips in the worst case; concurrent costs one.
const canAdminister = allOf([
  hasRole("staff"),
  hasRelationship("team-member"),
  hasRelationship("project-lead"),
]);

const program = check(canAdminister, {
  resource: { id: "project-atlas" },
  // Opt in. Absent, this evaluation is exactly what it was.
  concurrency: "unbounded",
}).pipe(
  Effect.provide(
    Layer.mergeAll(
      currentSubjectLayer(makeSubject({ id: "u-1", roles: ["staff"] })),
      AttributeResolverNone,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
    ),
  ),
);

// Denies either way, and with the same trace: `RelationshipResolverNever` refuses
// both edges, so `team-member` settles it and `project-lead` is dropped from the
// trace even though it was evaluated.
```

---

_Previous: [16 — Predicate Output](./16-predicates.md)_

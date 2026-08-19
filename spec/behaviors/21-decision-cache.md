# 21 — Decision Cache

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-21                                    |
> | Revision       | 1.1                                             |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-032). 1.1 (2026-08-20): `decisionCacheLayer` takes an optional `capacity`; BEH-QD-166 added. |

_Previous: [20 — Policy Simplification](./20-simplification.md)_

---

## BEH-QD-161: The cache is optional and absent by default

> **See:** [ADR-QD-031](../decisions/031-decision-cache.md)

```ts
export class DecisionCache extends Context.Service<DecisionCache, DecisionCacheShape>()(
  "qadi/DecisionCache",
) {}

export const decisionCacheLayer: (options?: {
  readonly capacity?: number;
}) => Layer.Layer<DecisionCache>;
```

```
REQUIREMENT: `DecisionCache` MUST NOT be a member of `EvaluationServices`.
             `evaluate` MUST read it with `Effect.serviceOption`, so an application
             that never provides it is unaffected and no existing caller's types
             change.
```

## BEH-QD-162: The trace is cached, never the decision

> **Invariant:** [INV-QD-025](../invariants.md#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity)

```
REQUIREMENT: A cache MUST store the `Trace`. `evaluationId` and `durationMillis`
             MUST be stamped per call, on a hit as well as a miss.
```

Caching a `Decision` whole would hand two evaluations the **same** `evaluationId`, so
two log lines, two spans and two audit records would claim to be one event.
Correlating a decision with the request that made it is the one thing an identifier
is for ([ADR-QD-012](../decisions/012-deterministic-time-and-ids.md)).

```
REQUIREMENT: A hit MUST equal a miss in verdict, visible fields, obligations and
             trace, and MUST differ in `evaluationId`.
```

## BEH-QD-163: The key includes the subject

```
REQUIREMENT: The cache key MUST comprise the subject id, the policy, the resource
             and the action.
```

A cache keyed on the policy alone would serve one subject's allow to another — the
same class of defect as an unbound hydration payload
([BEH-QD-146](./19-hydration.md)). A decision is *about* a subject, so any structure
holding decisions holds the subject too.

```
REQUIREMENT: `concurrency` MUST NOT be part of the key.
```

It cannot change the answer ([INV-QD-020](../invariants.md#inv-qd-020-concurrency-changes-lookups-never-decisions)),
so including it would split one entry into two for no reason.

```
REQUIREMENT: Two structurally equal resources with different property order MAY
             miss. They MUST NOT hit one another wrongly.
```

A miss costs an evaluation; a wrong hit costs an authorization.

## BEH-QD-164: The lifetime is the caller's

```
REQUIREMENT: `decisionCacheLayer` MUST be a function returning a fresh cache, never
             a shared constant.
```

Provided per request the cache dies with the request; provided once at application
scope it lives for the process — not a leak across subjects, since the key includes
the subject, but staleness: a revoked grant stays granted.

```
REQUIREMENT: The cache MUST be provided around the unit of work, not around each
             evaluation.
```

`Effect.provide` builds a layer per execution, so piping it onto a single `evaluate`
yields a fresh empty cache every time — caching nothing while reading like code that
does. A silently-ineffective cache is worse than none, so this is a requirement with
a test rather than a note.

## BEH-QD-165: Worked example

```typescript
import * as Effect from "effect/Effect";
import { decisionCacheLayer, evaluate, hasRole } from "@qadi/core";

const canEdit = hasRole("editor");

// One request, many asks. The cache wraps the request; the evaluations are inside.
const handleRequest = Effect.gen(function* () {
  const first = yield* evaluate(canEdit);
  const second = yield* evaluate(canEdit); // no lookups, fresh evaluationId
  return [first.evaluationId, second.evaluationId] as const;
}).pipe(Effect.provide(decisionCacheLayer()));
```

## BEH-QD-166: `capacity` bounds the cache, validated at construction

> **See:** [ADR-QD-031, capacity addendum](../decisions/031-decision-cache.md#an-optional-capacity-evicted-fifo--not-the-ttl-rejected-below)

```
REQUIREMENT: `decisionCacheLayer`'s `capacity` option, when given, MUST be a
             non-negative integer. Any other value MUST fail the layer at
             construction, before any evaluation runs.
```

A negative `capacity` would make the eviction loop's own exit condition
(`size(entries) > capacity`) unsatisfiable once `entries` empties out — an
infinite loop, not a small cache. A `NaN` capacity would make that same
comparison always `false`, silently turning "bounded" into unbounded instead
of failing loudly. Both are caller misconfiguration, not a runtime condition
to recover from, so this fails as a defect rather than a typed error.

```
REQUIREMENT: Once the number of completed entries exceeds `capacity`, the
             oldest-inserted entry MUST be evicted — never an entry whose
             `compute` is still in flight.
```

Eviction is FIFO (insertion order), not least-recently-used: recording an
access on every hit would cost every lookup something to buy a policy this
cache has no stated need for. `capacity` is unset by default — every behaviour
above this section holds unchanged when it is absent.

---

_Previous: [20 — Policy Simplification](./20-simplification.md)_

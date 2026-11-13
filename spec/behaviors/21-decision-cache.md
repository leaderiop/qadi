# 21 — Decision Cache

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-21                                    |
> | Revision       | 1.9                                            |
> | Effective Date | 2026-10-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.9 (2026-11-12): BEH-QD-491 — a stale answer never re-enters a cleared cache; BEH-QD-439 names the superseded state (ARCH-79, ADR-QD-132, CCR-QD-422)<br>1.8 (2026-11-10): BEH-QD-439 — a shared computation answers everyone still waiting, and nobody else: a claim is joinable only while somebody waits on it, an abandoned computation caches nothing, and the last leaver still waits for a computation parked uninterruptibly (ARCH-68, ADR-QD-132, CCR-QD-410)<br>1.7 (2026-11-10): BEH-QD-166 states why a bad `capacity` is a defect where a port's `…Bounded(permits)` is typed; no behaviour change (ARCH-61, CCR-QD-403)<br>1.6 (2026-10-08): BEH-QD-166 — a completed entry is counted once toward `capacity`; the hit check, the join and the claim are one synchronous step (ARCH-45, CCR-QD-267)<br>1.5 (2026-10-07): BEH-QD-163/168 — `DecisionCacheKey` is replaced by `Question`; the options that are part of the key are the type `QuestionOptions` (ADR-QD-100, CCR-QD-189)<br>1.4 (2026-09-08): BEH-QD-168 corrected twice — `AuthSubject.roles`/`.permissions` are the built-in JS `Set`, not `effect/HashSet` (matching `DecisionCache.ts`'s own corrected doc comment); and the `DecisionCacheKey` listing and BEH-QD-163's requirement gained the `maxDepth` field they omitted, which is in the key for the same reason `action` is (CCR-QD-128)<br>1.3 (2026-08-23): BEH-QD-168 — the key carries the subject, not its id; amends BEH-QD-163 (ADR-QD-043, INV-QD-033, CCR-QD-058)<br>1.2 (2026-08-23): BEH-QD-167 — the key identifies the question structurally; the stringified key could collide (ADR-QD-042, INV-QD-030, CCR-QD-057)<br>1.1 (2026-08-20): `decisionCacheLayer` takes an optional `capacity`; BEH-QD-166 added<br>1.0 (2026-07-26): Initial release (CCR-QD-032) |

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
REQUIREMENT: The cache key MUST comprise the subject id, the policy, the resource,
             the action, and `maxDepth`.
```

> **Restated in CCR-QD-189.** The key is the public `Question` value (ADR-QD-100).
> Which options are in the question is the type `QuestionOptions`; `concurrency` and
> `evaluationId` are not, because they do not change the answer.

> **Extended in CCR-QD-128.** `maxDepth` is in the key for the same reason `action`
> is: it is an `evaluate` option, not part of the `Policy` or the subject, but it
> can still change the answer — the same subject asking the same policy with a
> shallower `maxDepth` can turn an `Allow`/`Deny` into `PolicyTooDeep`. Omitting it
> would let a shallow-limited caller's ask hit an entry a deeper-limited caller
> left behind, the same class of cross-question collision `resource` and `action`
> are already here to prevent. See the `Question` listing under
> [BEH-QD-168](#beh-qd-168-the-key-carries-the-subject-not-the-subjects-id).

> **Amended in CCR-QD-058.** "the subject id" is now **the subject** — see
> [BEH-QD-168](#beh-qd-168-the-key-carries-the-subject-not-the-subjects-id). An
> id identifies a subject only if it determines that subject's grants, which is
> false wherever a subject is rebuilt per request from a token.

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

> **Superseded in CCR-QD-057.** The permission is spent: they now **hit**, per
> [BEH-QD-167](#beh-qd-167-two-different-questions-never-share-an-entry). The
> second clause was the load-bearing one and it was the one that failed — the
> stringified key this permission existed to excuse could collide.

## BEH-QD-164: The lifetime is the caller's

```
REQUIREMENT: `decisionCacheLayer` MUST be a function returning a fresh cache, never
             a shared constant.
```

Provided per request the cache dies with the request; provided once at application
scope it lives for the process — not a leak across subjects, since the key includes
the subject.

> **Narrowed in CCR-QD-058.** "a revoked grant stays granted" is now only half
> true, and the half that matters is which. A grant revoked in the **subject**
> changes the key, so an application-scoped cache re-evaluates rather than
> serving the old allow. A grant revoked only in a **store the evaluation
> consults** stays cached. Application scope is safe against token downgrade and
> unsafe against backend revocation; per-request scope is safe against both
> ([BEH-QD-168](#beh-qd-168-the-key-carries-the-subject-not-the-subjects-id)).

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
to recover from, so this fails as a defect rather than a typed error. That is
unlike a port's `…Bounded(permits)`, whose `InvalidBoundedPermits` is typed: those
wrappers are derived for every port by `PortDerivation.ts`, whose layers already
carry an error channel, so a composition can report it, while the cache's and
the decision log's `capacity` is a constant the caller wrote.

```
REQUIREMENT: Once the number of completed entries exceeds `capacity`, the
             oldest-inserted entry MUST be evicted — never an entry whose
             `compute` is still in flight.
```

```
REQUIREMENT: A completed entry MUST be counted once toward `capacity` however
             many fibers asked for it, and however the run loop interleaves
             them: a fiber that checks for a hit, is preempted, and finds the
             owner finished MUST hit rather than compute the key a second time.
             The hit check, the join and the claim are one synchronous step.
```

A joiner that checked `entries` in a step of its own, missed, and was preempted
while the owner completed found nothing in flight and claimed the key afresh:
the key was computed twice and appended to the insertion order twice, so a later
eviction of the stale copy removed a freshly recomputed entry. It was reproduced
under a lowered `References.MaxOpsBeforeYield` (a public knob) and not at the
default (ARCH-45 I5).

Eviction is FIFO (insertion order), not least-recently-used: recording an
access on every hit would cost every lookup something to buy a policy this
cache has no stated need for. `capacity` is unset by default — every behaviour
above this section holds unchanged when it is absent.

## BEH-QD-167: Two different questions never share an entry

> **Invariant:** [INV-QD-030](../invariants.md#inv-qd-030-cache-key-uniqueness)
> **See:** [ADR-QD-042](../decisions/042-a-projection-is-not-an-identity.md)

```
REQUIREMENT: The key MUST identify the question structurally. Two distinct
             `Question` values MUST NOT resolve to one entry.
```

```
REQUIREMENT: Two equal questions MUST hit regardless of the order their
             properties were written in.
```

The key is the `Question` itself, held in the `HashMap` with no
serialization step. Effect's `Equal`/`Hash` compare plain objects structurally,
nested included, so equality of keys is equality of questions and neither
requirement above needs anything else to hold.

This replaces a `JSON.stringify` key. The first requirement is the one that
matters: `stringify` maps a `Date` onto its ISO string, drops
`undefined`-valued and function-valued properties, and renders `NaN` as `null`,
so `{d: new Date(0)}` and `{d: "1970-01-01T00:00:00.000Z"}` were **one entry for
two questions** — and the second caller was handed the first's verdict.

That is not a cache inefficiency. It breaks
[BEH-QD-162](#beh-qd-162-the-trace-is-cached-never-the-decision)'s premise that
what is cached answers *this* question, and it makes
[INV-QD-025](../invariants.md#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity)
false — a colliding hit differs from a miss in verdict, not only in speed and
identity.

The second requirement was previously a documented **miss**, defended as the
safe direction of a stringified key. It is now a hit, and safely: the comparison
is real structural equality rather than a serialization that happens to agree.

## BEH-QD-168: The key carries the subject, not the subject's id

> **Invariant:** [INV-QD-033](../invariants.md#inv-qd-033-a-cached-decision-belongs-to-the-grants-that-earned-it)
> **See:** [ADR-QD-043](../decisions/043-a-decision-is-computed-from-its-inputs.md)

```ts
export interface DecisionCacheKey {
  readonly subject: AuthSubject;
  readonly policy: Policy;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
  readonly action: string | undefined;
  readonly maxDepth: number;
}
```

```
REQUIREMENT: Two subjects with different grants MUST NOT share an entry,
             whatever their ids.
```

This amends [BEH-QD-163](#beh-qd-163-the-key-includes-the-subject), which
required "the subject id". An id identifies a subject only if it determines that
subject's grants, and in an HTTP application it does not: a `SubjectExtractor`
rebuilds an `AuthSubject` per request from a token, so a scoped token and a full
token for one user share an id and hold different permissions. Under an
application-scoped cache the first verdict won permanently — an allow leaking to
a downgraded token, or a denial trapping a full one.

```
REQUIREMENT: Two structurally equal subjects MUST still hit.
```

Stated because the fix would otherwise be indistinguishable from disabling the
cache. `AuthSubject` compares structurally, built-in `Set` grants included, so a
subject rebuilt per request from the same token is the same key.

> **Corrected in CCR-QD-128.** `AuthSubject.roles`/`.permissions` are
> `ReadonlySet<RoleName>`/`ReadonlySet<PermissionKey>` — the built-in JS `Set`,
> not `effect/HashSet`. That is not a gap: `effect@4.0.0-rc.112`'s
> `Equal.equals`/`Hash.hash` special-case `self instanceof Set` and fold over its
> elements order-independently, so this still holds. See `DecisionCache.ts`'s own
> `Question` doc comment, which records the same correction against a
> prior version of that comment that made the identical mistake, "verified
> empirically against the installed `effect` build, not assumed from the
> `Equal`/`Hash` docs."

Staleness is narrower than BEH-QD-164 implies and the boundary is worth stating:
a grant revoked in the **subject** changes the key and is picked up on the next
request; a grant revoked only in a **store the evaluation consults** is invisible
to the key and stays cached. Application scope is safe against token downgrade
and unsafe against backend revocation; per-request scope is safe against both.

## BEH-QD-439: A shared computation answers everyone still waiting, and nobody else

> **Invariant:** [INV-QD-025](../invariants.md#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity)
> **See:** [ADR-QD-132](../decisions/132-a-shared-computation-is-joinable-only-while-awaited.md)

```
REQUIREMENT: Concurrent asks of one question MUST run its computation once,
             and every one of them MUST receive that computation's exit,
             a failure included.
```

```
REQUIREMENT: A waiter that leaves MUST NOT interrupt the shared computation
             while another fiber still waits on it.
```

```
REQUIREMENT: When the last waiter leaves, the computation MUST be interrupted
             and no later ask may join it. An ask that was never interrupted
             MUST NOT receive an interruption, whether or not a port holds the
             computation in an uninterruptible region.
```

```
REQUIREMENT: A computation every waiter has abandoned, or that a reset
             superseded, MUST write nothing into the cache, whatever its exit.
```

The regime lives in a package-private module, `SharedComputation.ts`, generic
over its key; `DecisionCache` is its one adapter and keeps its three methods.
A claim has one closed standing: Live, Superseded (a reset made its answer
stale, [BEH-QD-491](#beh-qd-491-a-stale-answer-never-re-enters-a-cleared-cache))
or Abandoned (nobody is left waiting). Only a Live claim's exit is remembered.

The third requirement was found red (issue #64 follow-up, ARCH-68). A port can
park the computation in an uninterruptible region: a connection checkout, an
acquire, a finalizer. There the last leaver's interrupt is only recorded until
the region ends. The abandoned claim stayed in flight, so a fresh ask for the
same question joined it and resolved interrupted without ever being cancelled.
Now the step that sees the last waiter leave also removes the claim, so the
fresh ask starts its own computation. The abandoned computation's exit is
dropped rather than cached: a fresh claim may already be computing the same
key, and writing both would append it to the insertion order twice
([BEH-QD-166](#beh-qd-166-capacity-bounds-the-cache-validated-at-construction)).

**The stated cost.** `Fiber.interrupt` waits for its target to exit, so the
last waiter to leave still waits until a computation parked uninterruptibly
leaves that region, exactly as before. Only the fresh ask no longer waits on
it. In that window the question may be computed twice; only the fresh
computation answers or is cached.

**Enforcement**: `packages/core/test/SharedComputation.test.ts` pins the regime
with plain keys and latched computations: one key coalesces and a join still
waiting is counted, a failure settles every waiter, one of two waiters leaving
leaves the computation running, every waiter leaving interrupts it, and the two
"abandon" tests: a fresh ask never joins a computation every waiter has
abandoned, and an abandoned computation writes nothing. Its "stale-last race",
"stale-first race", "two-key race" and "parked-uninterruptible race" pin the
superseded standing the same way.
`packages/core/test/DecisionCache.test.ts`'s "issue #64, uninterruptible
regime" test pins the third requirement through `evaluate`, and its two
"REGRESSION PIN for issue #64" tests the idle, interruptible case.

## BEH-QD-491: A stale answer never re-enters a cleared cache

> **Invariant:** [INV-QD-307](../invariants.md#inv-qd-307-a-superseded-claims-exit-never-settles-and-its-waiters-are-still-answered-exactly-once)
> **See:** [ADR-QD-132](../decisions/132-a-shared-computation-is-joinable-only-while-awaited.md), [BEH-QD-190](./25-inspection.md#beh-qd-190-a-cache-can-be-emptied)

```
REQUIREMENT: A computation in flight when `clear` runs MUST NOT write its
             answer into the cache, whatever its exit and whether it settles
             before or after a computation started after the flush.
```

```
REQUIREMENT: An ask after `clear` MUST compute afresh rather than join a
             computation that was in flight when `clear` ran, and every fiber
             already awaiting such a computation MUST still receive its exit
             exactly once.
```

The rule is `SharedComputation`'s: a reset supersedes every in-flight claim, and
`clear` calls it in the same step that empties the entries.
[BEH-QD-190](./25-inspection.md#beh-qd-190-a-cache-can-be-emptied)'s "MUST NOT
cancel" is why the waiters are answered rather than failed.

**Enforcement**: `packages/core/test/SharedComputation.test.ts`'s
"stale-last race", "stale-first race", "two-key race" and
"parked-uninterruptible race" tests, and its
"PROPERTY: a reset supersedes its claims"
(a model-based property, seed 3101, 300 runs, laws checked after every step).
`packages/core/test/DecisionCache.test.ts`'s
"a clear mid-compute is not undone by that compute finishing last, with the stale answer"
and its third-ask pin, unchanged, through `evaluate`.

---

_Previous: [20 — Policy Simplification](./20-simplification.md)_

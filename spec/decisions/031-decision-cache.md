# ADR-QD-031 — A cache stores the trace, not the decision, and the key is the security boundary

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-031                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-032). 1.1 (2026-08-19): `decisionCacheLayer` takes an optional `capacity`, FIFO-evicted once exceeded. |

---

## Context

A GraphQL request resolving forty fields may ask the same question forty times: same
subject, same policy, same resource. Each ask costs the attribute and relationship
lookups the policy needs, against the caller's own store.

The [roadmap](../roadmap.md) has carried this under *Under consideration* with the
objection stated: *"The hazard is staleness: an attribute that changes mid-request
would be read once and reused, which is a correctness change dressed as an
optimisation. Would need a clearly scoped lifetime."*

Worth saying what is **already** solved, so this does not duplicate it.
`@qadi/react` caches through the atom graph: one evaluation per policy, shared by
every component asking, invalidated explicitly
([ADR-QD-014](./014-react-via-atoms.md)). The case left over is server-side — one
request, many asks, no React.

## Decision

**An optional `DecisionCache` service. Absent by default. It stores the `Trace`, and
its key includes the subject.**

```ts
export class DecisionCache extends Context.Service<DecisionCache, DecisionCacheShape>()(
  "qadi/DecisionCache",
) {}

export const decisionCacheLayer: () => Layer.Layer<DecisionCache>;
```

`evaluate` reads it with `Effect.serviceOption`, so it is genuinely optional: the
service is not in `EvaluationServices`, no existing caller's types change, and an
application that never provides it behaves exactly as it did.

### It caches the `Trace`, not the `Decision`

This is the part that is not obvious, and getting it wrong would break the one thing
an identifier exists for.

A `Decision` carries `evaluationId` and `durationMillis`. Caching it whole would
hand the **same `evaluationId` to two different evaluations** — so two log lines,
two spans, two audit records would claim to be the same event, and correlating a
decision with the request that made it would stop working. `EvaluationId` exists to
make traces testable and correlatable
([ADR-QD-012](./012-deterministic-time-and-ids.md)); a cache that duplicated ids
would quietly undo it.

So the cache stores the `Trace` — the pure result of walking the policy — and
`evaluate` re-stamps a fresh `evaluationId` and a fresh `durationMillis` around it.
A cache hit is therefore **indistinguishable from a fresh evaluation except that it
was faster**, which is the only difference a cache is entitled to make.

### The key includes the subject, and that is a security boundary

```
subjectId + policy + resource + action
```

A cache keyed on the policy alone would serve one subject's allow to another. That is
the same class of defect as the hydration payload
([INV-QD-022](../invariants.md#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it))
and it is worth stating twice: a decision is *about* a subject, so any structure
holding decisions has to hold the subject too.

The key is built by stringifying, which makes two structurally equal resources with
different property order **miss** rather than hit. That is the safe direction — a
miss costs an evaluation, a wrong hit costs an authorization — and it is documented
rather than optimised.

### The lifetime is the caller's, and the hazard lives there

`decisionCacheLayer()` returns a **fresh** cache each call. Provide it per request and
the cache dies with the request. Provide it once at application scope and it lives for
the process — which is not a leak across subjects, because the key includes the
subject, but *is* staleness: a revoked grant stays granted until the process restarts.

Qadi cannot choose this. It has no notion of a request boundary, and inventing one
would be inventing a framework. So the layer is a function rather than a value —
`decisionCacheLayer()` at a call site reads as "make a cache here", where a
`decisionCacheLive` constant would read as "the cache", and the difference is exactly
the mistake this section warns about.

**And there is a sharper trap, found while testing.** `Effect.provide` builds a layer
per *execution*, so

```ts
evaluate(p).pipe(Effect.provide(decisionCacheLayer()))
```

gets a fresh empty cache on every run: it caches nothing, while reading exactly like
code that does. The cache has to be provided around the **unit of work** — the
request — with the evaluations inside it. The test suite asserts the trap as well as
the correct shape, because a silently-ineffective cache is worse than none: it costs
the same lookups and reports success.

### An optional `capacity`, evicted FIFO — not the TTL rejected below

`decisionCacheLayer({ capacity })` bounds how many completed entries `entries` holds;
once exceeded, the **oldest-inserted** entry is evicted. Unset, the cache is unbounded,
exactly as it always was — this is additive, not a change to the existing default.

Worth separating from "A TTL on entries", rejected below, because the two are
different mechanisms answering different questions. A TTL bounds *how long* an entry
may answer for, which is a claim about the caller's tolerance for staleness and needs
a clock — the objection that sank it. A `capacity` bounds *how many* entries a cache
may hold at once, which needs no clock at all: eviction order is insertion order, a
sequence the cache already produces deterministically, not wall-clock time. It says
nothing about staleness and changes nothing about which of two structurally-equal
answers a hit returns — only how long an entry survives before eviction makes it a
miss again. INV-QD-025 (a cached decision agrees with an uncached one) holds
identically whether or not `capacity` is set.

The gap this closes: "provide it once at application scope" (below) was already
documented as a staleness trade-off a caller can choose to accept — it was never
documented as an *unbounded memory growth* trade-off, because until this revision
there was no way to accept one without the other. `capacity` lets a caller running a
long-lived cache take the staleness trade-off without also taking the memory one.

## Alternatives considered

**On by default, with a documented lifetime.** Rejected outright. Every default in
this library is the safe one, and a cache changes *when* data is read — which is a
correctness change however the docs describe it.

**A TTL on entries.** Rejected: a time-bounded cache needs a clock, so it needs a
determinism story against
[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history),
and "stale for at most 5 seconds" is a claim about the caller's tolerance that Qadi
cannot make. A request-scoped cache needs no clock at all, which is why the scope is
the caller's rather than the duration.

**Cache the resolver instead of the decision.** Genuinely attractive — memoising
`AttributeResolver.resolve` would help every policy at once, and it is a smaller
surface. Rejected for now because it would silently repeal
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)'s test strategy:
the suite counts resolver invocations to prove branches were skipped, and a resolver
cache makes that count mean something else. Left as a note rather than done badly.

**Put the cache in `EvaluateOptions`, beside `concurrency`.** Considered, since both
are request-scoped and `concurrency` set the precedent. Rejected: a cache is shared
*mutable* state with a lifetime, which is what a `Layer` models and what an options
record does not. `concurrency` is a number.

## Consequences

INV-QD-025 carries the guarantee: a cached decision equals an uncached one in
verdict, visible fields, obligations and trace, and differs in `evaluationId` — the
last asserted positively, because equality there would be the defect.

The honest limits. A cache helps only when the same question repeats, so it does
nothing for `filter`, which varies the resource per element, and nothing for
`decideSubjects`, which varies the subject. It is for the request that asks one
question many times, and the ADR says so rather than implying a general speedup.

---

_Related: [ADR-QD-012](./012-deterministic-time-and-ids.md) · [ADR-QD-014](./014-react-via-atoms.md) · [INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) · [Roadmap](../roadmap.md)_

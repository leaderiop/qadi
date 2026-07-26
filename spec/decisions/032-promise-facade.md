# ADR-QD-032 — A Promise facade with no evaluator in it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-032                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-033) |

---

## Context

Every entry point returns an `Effect`. For a team already using Effect that is the
feature; for everyone else it is the reason they stop reading.

The [roadmap](../roadmap.md) has carried this under *Under consideration* with the
danger named precisely: *"it would reintroduce exactly the dual-path shape that
produced the predecessor's dead `checkAsync` API
([ADR-QD-004](./004-single-effect-evaluator.md)). If it happens it should be a thin,
separately-packaged wrapper over `ManagedRuntime`, never a second evaluator."*

That predecessor defect is worth restating, because it is the thing to avoid rather
than a piece of history. It had a synchronous `evaluate` and an `evaluateAsync` that
pre-resolved every attribute in the tree before delegating back to the synchronous
one. Short-circuiting was destroyed, the asynchronous relationship API was
unreachable, and the second path rotted because nothing exercised it.

## Decision

**`@qadi/promise`: a separate package, one file, no evaluation logic.**

```ts
export const makeQadi: (layer: QadiLayer) => Qadi;

interface Qadi {
  readonly check: (policy: Policy, options?: EvaluateOptions) => Promise<boolean>;
  readonly decide: (policy: Policy, options?: EvaluateOptions) => Promise<Decision>;
  readonly assert: (policy: Policy, options?: EvaluateOptions) => Promise<void>;
  readonly filter: <A>(items: ReadonlyArray<A>, …) => Promise<ReadonlyArray<A>>;
  readonly dispose: () => Promise<void>;
}
```

Every method is `runtime.runPromise(coreFunction(...))` and nothing else. There is no
branch in this package that decides anything, which is what makes "never a second
evaluator" checkable rather than aspirational: the whole file can be read in a minute
and every line delegates.

### A denial resolves; a failure rejects

This is the boundary's one real design question, and getting it wrong would
undo [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial).

| Outcome | JavaScript |
| ------- | ---------- |
| Allowed | `check` resolves `true`, `decide` resolves an `Allow` |
| **Denied** | `check` resolves **`false`**, `decide` resolves a `Deny` |
| Resolver down, missing action, policy too deep | the promise **rejects** |

A denial is an *answer*, so it is a value. A broken attribute store is not an answer,
so it is a rejection. Collapsing the two — `try { check() } catch { return false }` —
is the shape that turns an outage into a silent lockout, and the reason the core
keeps failure in the error channel rather than returning a boolean.

`assert` is the exception that proves it: there, a denial *is* exceptional, because
the caller has said "proceed only if permitted". It rejects with the same
`AccessDenied` the Effect API fails with.

### The subject travels per call, not in the layer

`CurrentSubject` is excluded from the layer the facade takes, exactly as
`@qadi/react` excludes it ([ADR-QD-014](./014-react-via-atoms.md)). A login must not
rebuild the attribute resolver, and a long-lived runtime holding one subject would be
a per-process subject — which is the wrong shape for a server and a security hazard in
a multi-tenant one.

So each call takes the subject: `check(subject, policy, options)`. Slightly more
typing per call, and impossible to get wrong by construction.

### The runtime is the caller's to close

`ManagedRuntime.make(layer)` builds resources once and reuses them. `dispose()`
releases them, and the facade does not call it — a facade that closed its own runtime
would be guessing at the process lifetime, which is the same mistake
[ADR-QD-031](./031-decision-cache.md) declined to make about the request lifetime.

## Alternatives considered

**A `toPromise` helper in `@qadi/core`.** Smaller, and rejected: it would put a
Promise-shaped API in the package whose whole thesis is one Effect evaluator, and the
first bug report about a floating promise would arrive against `@qadi/core`. A
separate package makes the boundary visible in the dependency graph.

**Re-implement evaluation without Effect, for a zero-dependency build.** This is
literally the predecessor's defect and is rejected without qualification. Two
evaluators means two sets of semantics, and the second is always the one nobody
tests.

**Callbacks or a synchronous API.** Rejected: evaluation performs I/O through the
resolvers, so a synchronous facade could only work for policies that touch no
resolver — an API whose availability depends on the policy's contents.

**Expose the `Effect` too, for gradual migration.** Rejected as unnecessary: the
core package is already that, and a caller migrating imports `@qadi/core` directly.
The facade should have no reason to exist for someone who has adopted Effect.

## Consequences

INV-QD-026 carries the property: for every policy and subject, the facade's answer
equals the core's, and a failure that the core surfaces as an error surfaces here as
a rejection rather than a `false`. It is asserted by running both paths over the same
inputs — the same shape of evidence
[INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)
needed, and appropriate for the same reason: whenever there are two ways to get an
answer, the agreement has to be runnable rather than argued.

The package adds a fifth workspace member and a documented boundary. What it does not
add is any authorization logic, and a review that finds a conditional in it should
treat that as a defect rather than a feature.

---

_Related: [ADR-QD-004](./004-single-effect-evaluator.md) · [ADR-QD-014](./014-react-via-atoms.md) · [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) · [Roadmap](../roadmap.md)_

# ADR-QD-026 — Concurrency changes what is looked up, never what is decided

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-026                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-027) |

---

## Context

Evaluation is sequential and short-circuits: `allOf` stops at the first denying
child, `anyOf` at the first allowing one under `First`. That is
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation), and it exists
because a branch that is never evaluated performs no attribute lookup and no
relationship query — the difference between one round trip and five.

Some callers would rather pay for speculative lookups than for latency. A policy
with four independent relationship branches against a remote graph store costs four
sequential round trips today; concurrently it costs one.

The [roadmap](../roadmap.md) has carried this as *deliberately unbuilt rather than
merely unfinished*, naming two interactions that needed designing: short-circuiting,
which concurrency forfeits, and field-set merging, where the order of allowing
children determines the `First` result. Building E3 added a third
([ADR-QD-023](./023-combining-algorithms.md)): `DenyOverrides` and
`PermitOverrides` are order-independent in the **verdict** but not in the **deciding
rule**, which is the first applying row of the winning effect and supplies the
decision's field set and obligations.

Two ADRs previously stated the option already existed and were corrected
([ADR-QD-005](./005-lazy-attribute-resolution.md),
[ADR-QD-013](./013-short-circuit-default.md)).

## Decision

**`EvaluateOptions.concurrency` is opt-in, and turning it on changes only which
lookups happen and how long they take. The decision and its trace are identical.**

```ts
export interface EvaluateOptions {
  readonly concurrency?: Concurrency; // number | "unbounded" | "inherit"
}
```

Absent, evaluation is exactly what it was. That is the whole safety argument: a
caller who does not ask for concurrency cannot be affected by its existence.

### The decision is identical because the fold is the same code

The obvious implementation evaluates children concurrently and combines whatever
comes back. That is wrong in a way that is hard to see: `Effect.forEach` preserves
input order in its results, so the *verdict* would survive, but the **trace would
not** — a concurrent `allOf` would record five children where the sequential one
records two, and `Trace.children` is public, is what `filter` and the React
bindings surface, and is the thing a reviewer reads to answer "why".

So the combining logic is extracted into a **pure step function** per composite,
and both paths drive it:

| Path | How it drives the fold |
| ---- | ---------------------- |
| Sequential | evaluates one child, steps, stops as soon as the step reports a verdict — no further child is evaluated |
| Concurrent | evaluates every child, then steps over the results **in input order**, stopping at the same index |

The concurrent path therefore *discards* trace nodes for children it evaluated
after the decisive one. That looks wasteful and is the entire point: the work was
already speculative, and keeping it would make the trace depend on a performance
switch.

There is no second copy of the decision rules. Duplicating them and asserting
agreement — the shape [ADR-QD-024](./024-predicate-output.md) needed for predicates
— was rejected here, because unlike a predicate over rows this has no independent
reason to exist as a second interpreter.

### What concurrency applies to

`AllOf`, `AnyOf`, and the condition list of `Rules`. `Not` has one child. Leaves
have none. Nested composites inherit the option, so a tree is as parallel as its
shape allows.

### The deciding rule is still resolved by index

For `Rules` the concurrent path collects every condition result and then selects
the decider exactly as the sequential path does: the first applying row of the
winning effect, by index. Selecting by *arrival* would make two runs of the same
table owe different duties, which is the constraint E3 contributed and the reason
this could not have been built before it.

## Alternatives considered

**Concurrency as a global layer or service.** Rejected: a policy's cost profile
would depend on ambient configuration, and the same tree would behave differently in
two applications. `EvaluateOptions` already carries the request-scoped inputs.

**Concurrent by default, sequential opt-out.** Rejected outright. Short-circuiting
is a *correctness-adjacent* property here: an unevaluated branch performs no
lookup, and INV-QD-005 is what lets a policy put an expensive relationship check
behind a cheap role check and rely on it. Flipping the default would silently
multiply the load every existing caller places on their own store.

**Keeping every evaluated child in the trace.** Simpler, and rejected above: the
trace is public API.

**Bounded fan-out by default when concurrency is `"unbounded"`.** Considered because
`decideSubjects` faces the same fan-out question (CCR-QD-018) and shipped
sequential for exactly this reason. Not adopted: bounding is what
`concurrency: number` is for, and a hidden cap would be a second, undocumented
policy about the caller's store.

## Consequences

INV-QD-005 is **scoped rather than repealed** — it holds under the default and is
forfeited by an explicit opt-in, which is now stated in the invariant itself. A new
invariant, INV-QD-020, carries the property that makes the option safe: concurrency
changes lookups, never decisions. It is enforced by a property test comparing both
paths over generated trees, and by call-counting tests proving that the sequential
path performs *fewer* lookups than the concurrent one on the same policy — because
an equality test alone would pass if concurrency silently did nothing.

The honest cost: a caller who opts in pays for lookups that a sequential run would
have skipped, and those lookups hit their store. That is the trade the option
exists to make, and the reason it is off by default.

---

_Related: [INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) · [ADR-QD-013](./013-short-circuit-default.md) · [ADR-QD-023](./023-combining-algorithms.md) · [Roadmap](../roadmap.md)_

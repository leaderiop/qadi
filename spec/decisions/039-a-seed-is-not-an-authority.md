# ADR-QD-039 — A seed is not an authority, so it lives in its own atom

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-039                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-23                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-08-23): Initial release (CCR-QD-052) |

_Amends: [ADR-QD-028](./028-decision-hydration.md), which decided the payload and
said nothing about what happens to a seed once the client answers._

---

## Context

[ADR-QD-028](./028-decision-hydration.md) seeded a server-rendered decision
straight into the decision atom, through `QadiProviderProps.initialValues`. It
assumed, without saying so, that the client's own evaluation would then replace
it. **For most of the policies this library can express, it did not.**

`AtomRegistry` marks a seeded node `preserveInitialValueOnBuild`. When that node
first builds it runs the read, and then — if the node is still awaiting a value —
keeps the seed and discards what the read returned. An effect that settles
*asynchronously* escapes this, because it publishes on a later turn through
`setSelf`, which clears the flag. An effect that settles **synchronously**
publishes by returning, so its value is the one discarded.

Every policy that needs no resolver settles synchronously: `hasPermission`,
`hasRole`, and every composite built from them. `AttributeResolverNone` is the
shipped default. So the common case was:

- the server sends an allow;
- the client evaluates, decides **deny**, and that denial is thrown away;
- the seed stands for the life of the page.

A subject kept a control they no longer qualified for — a client-side
authorization bypass, reachable with no attacker and no misconfiguration beyond
the server's answer having gone out of date. It is a strictly worse instance of
what [ADR-QD-017](./017-stale-decisions-are-not-decisions.md) exists to prevent:
*a stale allow is invisible, and is a grant nobody authorised.*

`Hydration.test.ts` could not see it. Every test there read the registry on the
tick it was built, which asserts a seed is **present** and can never observe
whether it is ever **superseded**.

Note what ADR-QD-017 did *not* catch, because the distinction matters for the
invariant this ADR adds: the bypassed value is not `waiting`. `currentDecision`
returns it, and every consumer in the package is correct by ADR-QD-017's rule.
**ADR-QD-017 guards the flag; this defect never set the flag.**

## Decision

**The seed lives in its own atom, and the decision a consumer reads is a
derivation over both.**

```ts
const combined = Atom.readable((get): DecisionResult => {
  const result = get(computed);
  if (!AsyncResult.isInitial(result)) return result;
  const seeded = get(seed);
  return seeded === undefined ? result : AsyncResult.success(seeded);
});
```

`Initial` is the only state in which this client has never answered for itself.
The moment it has — allow, deny **or failure** — that answer is authoritative and
the seed is spent.

Three consequences of that gate are deliberate:

- **A failure is not covered by a seed.** An attribute-store outage on the client
  surfaces as a failure, not as the server's stale allow. Masking it would be
  [INV-QD-006](../invariants.md) in reverse.
- **A re-check does not fall back.** After an invalidation the result is
  `Success(previous, waiting: true)` — not `Initial` — so the seed stays spent.
  Falling back there would resurrect something older than the value being
  re-checked.
- **A seed does not survive its own node.** The seed atom is an ordinary state
  atom, so when the last consumer unmounts and the node is collected, a remount
  reads `undefined` and the client simply decides. Nothing re-seeds.

`hydrateDecisions` writes to the seed atom, found through a package-internal
lookup (`HydrationSeed.ts`) that is deliberately out of the barrel: a consumer
able to reach a seed atom could write an authorization decision straight into the
registry, past both the subject check and the evaluator.

## Alternatives considered

**Force the evaluation onto a later turn when a seed is present**, so the
synchronous case takes the asynchronous path and the seed is displayed for
exactly one frame before being replaced. This preserves ADR-QD-028's observable
behaviour completely. Rejected: it buys that fidelity with a scheduler-timing
dependency in the one code path where being wrong is a grant, and it costs a
re-render per hydrated policy. Correctness here should not rest on when an effect
happens to settle — which is precisely the property that failed.

**Clear the seed once consumed.** Unnecessary: the seed atom's lifetime already
does it, and a write during a derivation is a worse thing to own.

**Seed `waiting: true`.** Makes the seed invisible to `currentDecision`, which
deletes the feature ADR-QD-028 exists for, and does not fix the discard.

## Consequences

- (+) The bypass is closed, and closed by construction rather than by timing.
  Precedence between the server's answer and the client's is now written down in
  one expression.
- (+) The rule generalises past hydration: *a seeded value is a first-paint
  cover, never an authority.*
- (–) **This narrows ADR-QD-028's second stated benefit.** BEH-QD-148 required a
  hydrated decision to keep the server's `evaluationId`, "because correlating a
  client-side decision with a server-side log entry is the one thing an
  identifier is for". That still holds of the payload and of the seeded decision,
  but for a synchronously-evaluated policy the client answers on the first read,
  so a consumer never observes the seed and reads its own id. This is the honest
  outcome — the decision on screen is the one this client made, and reporting the
  server's id for it would be a lie — but it is a narrowing, and BEH-QD-148 is
  amended to say where the guarantee applies.
- (–) There are now two atoms per question instead of one. They are created
  together and keyed together, so nothing a consumer touches changes shape.

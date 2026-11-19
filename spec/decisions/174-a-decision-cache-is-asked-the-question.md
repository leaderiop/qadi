# ADR-QD-174 — A decision cache is asked the question, and walks it itself

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-174                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-19                                     |
> | Status         | Accepted — amends ADR-QD-031; reads ADR-QD-132, ADR-QD-100 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-19): Consequences name both parties: an implementer gets TS2345 or TS2322, a caller TS2559 or TS2554 (review WR-03)<br>1.0 (2026-11-19): Initial release (ARCH-108, CCR-QD-452) |

---

## Context

[ADR-QD-031](./031-decision-cache.md) makes the cache key the security boundary: a trace stored under a question must
answer that question. `DecisionCacheShape.getOrCompute(question, compute)` took the question and, separately, the
computation whose result it stored under it. Nothing tied the two together except the one caller: `decideQuestion` in
`Lifecycle.ts` passed the walk of the same question. A second caller, or a change to that one, could have stored any
trace under any key, and the compiler would have accepted it.

`concurrency` is deliberately not part of the key
([ADR-QD-026](./026-concurrent-evaluation.md),
[INV-QD-020](../invariants.md#inv-qd-020-concurrency-changes-lookups-never-decisions)): it changes how many lookups a
walk makes, never the answer. So the cache could not simply be handed the key; how to walk it needed its own route to
the walk.

## The checkpoint

The roadmap made this the owner's decision before any plan (CASK-01). On 2026-11-19 the owner chose to pursue it, with
the question only, and not to seal the service: `DecisionCacheShape` stays public, and a host may still write its own
cache.

## Decision

1. `getOrCompute(question: Question, options?: Pick<EvaluateOptions, "concurrency">)`. The result is unchanged,
   `Effect<CacheLookup, EvaluationError, PortServices>`. The name stays, because the lookup metric's description names
   it and a metric's description is part of its registry key
   ([ADR-QD-123](./123-a-metric-is-declared-once.md)).
2. `decisionCacheLayer` walks the question it is given: its adapter is
   `shared.run(key, walk(key, options?.concurrency))`. `DecisionCache.ts` imports `walk` from `Walk.ts`, and nothing
   `Walk.ts` imports reaches the cache, so no cycle forms.
3. `options` says how the walk runs, never what it answers, so it is not part of the key: one question asked with two
   concurrencies is one entry. A caller that joins a walk already in flight shares it, so its own `concurrency` is
   unused and the claimant's governs. That is safe because `concurrency` cannot change the answer.
4. `decideQuestion` passes its own options object through. It never builds an options value per lookup.
5. `walk` stays out of core's barrel. A host cache wraps `decisionCacheLayer()` and delegates to it; that is the
   documented route.
6. `SharedComputation`'s rules and interface are unchanged
   ([ADR-QD-132](./132-a-shared-computation-is-joinable-only-while-awaited.md)): the adapter still hands it one key and
   one effect.

## Alternatives considered

- **Keep `compute`, and pin the call site.** A test that `Lifecycle.ts` passes the walk of the same question guards
  one caller. The interface would still accept any computation from any other.
- **Seal the service.** Making `DecisionCache` constructible only by core would cover host implementations too. The
  owner declined it at the checkpoint: a host keeps the ability to wrap or replace the cache.
- **Put `concurrency` in the key.** It would split one answer into entries that can never differ, and lower the hit
  rate for nothing.
- **Export `walk`.** A host could then write a separate cache that walks correctly, but the walk would become public
  surface, which [ADR-QD-099](./099-entry-points-are-a-closed-list.md)'s closed list keeps private.
- **A named `WalkOptions` type.** Nothing else needs the name. `Pick<EvaluateOptions, "concurrency">` is derived from
  the option a caller already passes, so it cannot drift from it.

## Consequences

- **Breaking** for `DecisionCacheShape` implementers. An implementation that still takes and runs a `compute` no longer
  type-checks: its second parameter is now the options, so running it as an `Effect` is TS2345, and annotating it as one
  is TS2322 (both probed against `tsc`). A caller who passes a `compute`, or a function returning one, gets TS2559
  (TypeScript's weak-type rule: the options type has only optional properties, and an `Effect` shares none of them),
  and a third argument gets TS2554. The change is a `@qadi/core` minor changeset, and the upgrade guide's 0.13 section shows the delegation route in a compiled example.
  Callers of `evaluate` and of the enforcing entry points see no change.
- The guarantee is about callers: no caller can pair a key with an unrelated computation
  ([INV-QD-367](../invariants.md#inv-qd-367-no-caller-can-pair-a-cache-key-with-a-computation)). A host-written
  implementation must produce its own trace for the question it is given
  ([BEH-QD-645](../behaviors/21-decision-cache.md#beh-qd-645-a-host-written-cache-answers-with-its-own-trace)); it is
  outside the guarantee by the owner's choice.
- The refusal rests on the weak-type rule, so an option added later under a name an `Effect` also carries would weaken
  it. `DecisionCache.tst.ts`'s negatives fail if that happens.
- A lookup does no added work: one `Effect.suspend` per walk, as before, and no options value is built on the hot path.
- `DecisionCache.test.ts`'s I5 race test asks each question alone, through a recording resolver, and asserts that its
  sweep lands on both sides of the owner's completion at every budget.

## Related

- [ADR-QD-031](./031-decision-cache.md): the key is the security boundary; amended here.
- [ADR-QD-132](./132-a-shared-computation-is-joinable-only-while-awaited.md): single flight, unchanged.
- [ADR-QD-100](./100-a-question-is-asked-once.md): the `Question` value.
- [ADR-QD-026](./026-concurrent-evaluation.md): concurrency changes lookups, never answers.
- [BEH-QD-641 to BEH-QD-645](../behaviors/21-decision-cache.md#beh-qd-641-the-cache-is-asked-the-question-and-how-the-walk-runs),
  [INV-QD-367](../invariants.md#inv-qd-367-no-caller-can-pair-a-cache-key-with-a-computation) and
  [INV-QD-368](../invariants.md#inv-qd-368-a-trace-the-cache-settles-under-a-question-is-the-walk-of-that-question).

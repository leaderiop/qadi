# ADR-QD-149 — A seed is held by its question, and a registry holds only a grant to it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-149                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-12                                     |
> | Status         | Accepted — amends ADR-QD-039, ADR-QD-103; reads ADR-QD-148 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-12): Initial (CCR-QD-427)         |

---

## Context

A server's decision reached a client registry only as an initial value on a private seed atom
([ADR-QD-039](./039-a-seed-is-not-an-authority.md)). `AtomRegistry` removes a node that is not
`keepAlive` and that nothing holds one macrotask after it is built, and nothing holds a seed node
until a gate reads its question. So a gate that mounted a macrotask late, a gate under a
hidden-then-shown `<Activity>`, a gate that unmounted and mounted again, and a bare registry read
after one turn all found no seed and rendered `Pending`, with the question still tracked. The
loss failed closed, but it was silent, and it is the symptom [ADR-QD-103](./103-a-question-is-opened-once.md)
had already closed for a garbage collection while allowing a seed to be forgotten only with its
question's row.

The `subject` atom was lost the same way, which is why this decision depends on
BEH-QD-516: with the seed held and the subject gone, a late gate shows the server's allow forever,
because the decision atom can never compute and the seed is never superseded.

Four ways to hold the seed were built and measured against a set of reproductions (a late mount, a
mount 1.5 s late, an Activity, a remount, a bare registry) and three controls (a registry that was
never given a seed reads none, a spent seed is not read again, and an unhydrated question leaves no
node). Each failed one criterion. They are under Alternatives considered.

## Decision

**A question's handle holds its seeds, and a registry holds only a grant to one.**
(CCR-QD-427.)

- **The handle holds the seed.** `makeSeededQuestion` (`HydrationEngine.ts`) keeps a
  `WeakMap<SeedGrant, SeededDecision>` per question, so a seed lives exactly as long as the book
  entry (and any reader still holding the old handle) does. The seed is forgotten with its row,
  as [ADR-QD-103](./103-a-question-is-opened-once.md) says; `QuestionBook`, the sweep
  ([ADR-QD-148](./148-the-atom-set-owns-its-eviction-sweep.md)) and `maxTrackedQuestions` are
  unchanged.
- **The registry holds a grant.** `SeedGrant` is an opaque, package-private class. `hydrate` gives
  a registry one `keepAlive` grant node per verified entry (the pair is `[grantAtom, grant]`, and
  a dropped entry yields no pair), so the registry's idle removal cannot lose it and the
  grant node ends with `registry.dispose()`, as the `subject` node does.
- **A read finds a seed only through a grant that exists.** `seededIn` asks `registry.getNodes()`
  and never `registry.get`, so it creates no node for an unhydrated question, and it reads the
  seed from the node's value without building it. A registry that was never given the grant reads
  nothing, whatever another registry over the same atom set holds.
- **A seed is never read after this registry's client has answered.** The `announced` guard in
  `read` (the per-registry flag `AnnounceState` already kept) makes
  [BEH-QD-151](../behaviors/19-hydration.md) explicit: it held before only because the seed node
  was gone, and a retained seed would otherwise come back after a remount.
- **`AnnounceState.observedSeed` is removed.** It compensated for a registry dropping the value of
  an atom nothing mounted, which no longer happens.

The grant carries no authority and the seed atom is still out of the barrel, so
[ADR-QD-039](./039-a-seed-is-not-an-authority.md)'s requirement that no consumer can reach a seed
holds. The precedence (a live answer beats a seed) is still a property of the derivation.

## Alternatives considered

- **A. The book entry holds the seed itself.** The reproductions went green; the containment
  control went RED. A question's book entry belongs to the atom set, which is module scope on a
  server, so every registry over it read another registry's seed: a registry that was never given
  a seed read one, which is a cross-request leak of one user's decision to another. A seed keyed
  by the `AuthSubject` object was rejected on paper: `subject` can be `undefined` in the very
  window the seed exists to cover. Without the `announced` guard the resurrection control was RED
  too.
- **B. The provider mounts the seed atoms.** The provider cases went green and a bare registry
  (BEH-QD-511's host with no provider) stayed RED, because the only code that sees the registry in
  the window before the removal task is `QadiProvider`. Releasing at the first answer needs a new
  `QadiAtoms` member and a set of releases something must tear down, so the provider would own a
  mount set; without the release it is alternative K with a longer name.
- **C. `Atom.setIdleTTL` on the seed atoms.** A finite TTL arms a real `setTimeout` and reads
  `Date.now()`, which is a timer. A gate mounted 1.5 s after the registry (past the TTL) read
  `Pending`, and the resurrection control was RED without the guard. It is not the CCR-QD-150
  hazard (that was the registry-level `scheduleTask` rerouting dispatch for every node), but it
  fails the no-timer criterion and a late mount past the TTL still loses the seed.
- **K. `Atom.keepAlive` on the seed atom.** Every reproduction went green, and with the guard the
  whole suite passed. Without the guard a spent seed was read back after a remount (INV-QD-028
  broken). It also pins a node per question asked: `read` reads the seed atom for every question,
  hydrated or not, so 50 distinct unhydrated questions left 51 nodes in the registry against 1 on
  the base, which is the unbounded session growth `maxTrackedQuestions` exists to close.

## Consequences

- A seed lasts from registry construction until this client answers the question or the atom set
  drops the question, in a provider, under Activity, across remounts and on a bare registry
  (BEH-QD-517, INV-QD-317).
- A registry reads only the seeds it was given, and holds a node only for a question it was seeded
  for (BEH-QD-518, INV-QD-318). One request's seed is never reachable from another registry, which
  is the safety property alternative A failed.
- A registry holds one small `keepAlive` node per hydrated question until it is disposed. That is
  bounded by the payload, not by the sweep, and it is the smallest pin any design that survives a
  bare registry can hold: the window between registry construction and the removal task contains
  no code of the atom set's, so something must be alive inside the registry. It is not a leak, and
  a later reader should not "fix" it. Seed values, which can carry a whole disclosed trace, stay
  bounded by the book.
- A seed written and never read is still forgotten with its row once the question is cold and past
  `maxTrackedQuestions` ([ADR-QD-103](./103-a-question-is-opened-once.md), unchanged;
  `Hydration.lifetime.test.ts` HL6).
- The seed covers this client's first check, whether or not it is in flight; a re-check after an
  invalidation is `Success(previous, waiting)` and never falls back to it
  ([ADR-QD-039](./039-a-seed-is-not-an-authority.md), restated in BEH-QD-151).
- Depends on the `subject` atom being `keepAlive` (BEH-QD-516). The landing order was load-bearing
  and is pinned by `QadiProvider.seed.test.tsx` SD5.
- `hydrate` records the seed in the atom set, which already opened the question in the book. The
  second element of an `initialValues` pair is now opaque; `InitialValues` keeps its type and no
  `@qadi/react` export changes.
- The design leans on `registry.getNodes()`, `valueOption()` and `Atom.keepAlive`; the registry
  timings it relies on are pinned in `v4-reactivity-smoke.test.ts`, so a change in `effect` that
  moves them fails there.
- ADR-QD-039 and ADR-QD-103 carry dated amendments pointing here; their earlier text is unchanged.

## Related

[ADR-QD-039](./039-a-seed-is-not-an-authority.md),
[ADR-QD-103](./103-a-question-is-opened-once.md),
[ADR-QD-148](./148-the-atom-set-owns-its-eviction-sweep.md),
[INV-QD-028](../invariants.md),
[INV-QD-105](../invariants.md),
BEH-QD-516, BEH-QD-517, BEH-QD-518, INV-QD-317, INV-QD-318, CCR-QD-427.

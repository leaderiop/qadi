# ADR-QD-148 — The atom set owns its eviction sweep

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-148                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-12                                     |
> | Status         | Accepted — amends ADR-QD-014, ADR-QD-103       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-12): Initial (ARCH-83, CCR-QD-426) |

---

## Context

`maxTrackedQuestions` bounded the question book only where a `QadiProvider` forked
`Effect.repeat(atoms.sweepEvictions, Schedule.spaced(sweepIntervalMillis))`. That left three gaps:

- **No provider, no sweep.** A host that reads an atom set through a bare `AtomRegistry`, or from
  outside React, saw the book grow past its bound and stay there.
- **Several providers, several sweepers.** Each provider over one atom set forked its own sweep, so
  the number of sweepers followed the number of mounted providers rather than the number of atom
  sets.
- **An unmount left the book over the bound.** The provider's fiber ended with the provider, so the
  readers that released afterwards were never swept.

[ADR-QD-014](./014-react-via-atoms.md)'s Consequences left idle-atom cleanup open after `scheduleTask`
had dropped a required render (CCR-QD-150): "Revisiting idle-atom GC needs a way to
scope `scheduleTask` to eviction alone, or a different idle-cleanup mechanism entirely." The
provider-owned sweep was that different mechanism, and the three gaps are what it cost.

## Decision

**The atom set sweeps its own book, one deferred, one-shot sweep per pressure episode.** (ARCH-83.)

- **The book signals pressure and does nothing else.** `QuestionBook` takes a package-private
  `signal` and calls it when an admission leaves the book past its capacity, and when a release
  leaves an entry at zero readers while the book is over capacity. The release signal is guarded by
  the entry's own `inBook`: the release of a swept entry whose key a newer entry now owns raises
  none (an unguarded release signalled a sweep that evicted nothing). The book stays free of
  `effect`, and no signal sweeps inside the call that raised it.
- **`SweepScheduler` coalesces the signals.** `packages/react/src/SweepScheduler.ts` holds one pending
  flag in a closure per atom set. The first signal of an episode sets it and forks `Effect.yieldNow`
  followed by the sweep, which clears the flag before it sweeps. Every further signal in that
  episode is a no-op, so many registries, many providers and StrictMode's double effects share one
  sweeper by construction. The module is package-private, out of the barrel, and tests hand an atom
  set a fork through `withSweepFork` without a public option.
- **The provider forks nothing.** `QadiProvider` owns a registry and nothing else; it takes no sweep
  interval. `QadiProviderProps.sweepIntervalMillis` and `QadiAtoms.sweepEvictions` are removed
  (Breaking for `@qadi/react`, recorded in a changeset and the upgrade guide). The atom set sweeps
  through `book.sweep` directly, so a host has no manual sweep to call and none to forget.
- **Why `Effect.yieldNow` first.** `Effect.runFork` runs synchronously to its first yield, so
  without it a sweep would run inside the call that raised the signal: on the render path, or inside
  the registry's synchronous dispose-then-reread window, where a held question momentarily reads as
  zero. The episode therefore begins with the yield and the sweep runs on a fiber that starts after
  the signalling call has returned.

The spike (`35-SPIKE.md` in the phase record, `.planning/phases/35-the-atom-set-owns-its-eviction-sweep/`)
recorded the admission trigger as kept and the `inBook` release guard as kept. It chose this
mechanism as candidate 1.

## Cost

- **An O(n) scan per pressure turn** under sustained all-live pressure: 200 live questions mounted
  one per turn over a bound of 5 ran 195 signals and 195 sweeps (one scan per turn, coalesced), 82 ms
  for the whole loop including the yields, with `asked()` still 200. The spike measured it and left
  the cold-count guard out: a count of cold entries would be a second counter kept in step at two
  places for no measured gain, and the example app's end to end run passed with the scan live.
- **A seed written and never read is forgotten one macrotask after the pressure,** rather than at
  the provider's first sweep after its children rendered. Hydrated questions mounted in one
  synchronous span survive it (three seeds over a bound of 2 all stayed seeded).
- **A render-phase read that commits after a sweep is re-admitted once.** The registry releases an
  uncommitted node after a turn, the sweep may evict the question, and the late subscribe reads it
  again, which re-admits it. The cost is a transient absence from `asked()` at the bound.

## Alternatives considered

- **Candidate 2, a self-terminating book-level fiber** (the same signal seam, then
  `Effect.repeat` on `Schedule.spaced` until no cold entry remained over the bound). It passed every
  criterion, and its interval never ran: after one sweep no cold entry was left over the bound, so
  the repeat stopped after its first iteration and sweeps equalled forks in every case. It added the
  interval option, an `until` read of the book and a flag reset beyond candidate 1, none of which a
  criterion needed. The spike ranked candidate 1 above it by the first rule, no timer or interval.
- **Candidate 3, a layer-scoped periodic fork** (`Atom.runtime(Layer.merge(layer, sweeperLayer))`).
  Failed the one-sweeper criterion: an `Atom.runtime` layer is built once per registry that reads a
  runtime atom, so four registries over one atom set built four sweepers and three providers built
  three. A question opened and never read has no sweeper at all, and when the last reader releases
  the registry removes the runtime node, and the layer scope with it, before the first tick, so the
  bound was not held for the release that matters either.
- **Candidate 1's release-only variant** (no admission signal). Failed the existing eviction suite
  as written, because a question opened and never read raises no release; BEH-QD-198 requires that
  bound.
- **`scheduleTask` and `defaultIdleTTL`.** Excluded, and not re-measured: they reroute dispatch and
  dropped a required render (CCR-QD-150); the test that catches it is the example
  app's end to end run.
- **A synchronous sweep on `open`.** Excluded: `open` is reached on the render path and inside the
  registry's dispose-then-reread window, where a held question reads as zero and a sweep would drop
  it.

## Consequences

- The bound holds wherever the atom set runs: no provider, a bare registry, a non-React host
  (BEH-QD-511).
- One sweeper per atom set, however many registries or providers share it (BEH-QD-512,
  INV-QD-315).
- A sweep runs after the pressure, never on the render path and never inside the dispose-then-reread
  window (BEH-QD-513, INV-QD-316).
- The provider forks none and there is no manual sweep (BEH-QD-514); the book returns to its bound
  after a provider unmounts (BEH-QD-515).
- The registry timings the trigger relies on are pinned in `v4-reactivity-smoke.test.ts`, so a
  change in `effect` that moves them fails there.
- ADR-QD-014 and ADR-QD-103 carry dated amendments pointing here; their earlier text is unchanged.
  AGENTS.md §13's `maxTrackedQuestions` sentence states the outcome, and
  `spec/process/house-rules-evidence.md` §4 carries an addendum.
- `QadiAtoms.sweepEvictions` and `QadiProviderProps.sweepIntervalMillis` were never rows of
  `spec/overview.md`, so the public-surface tables are unchanged.

## Related

[ADR-QD-014](./014-react-via-atoms.md),
[ADR-QD-103](./103-a-question-is-opened-once.md),
[INV-QD-105](../invariants.md),
[INV-QD-315](../invariants.md),
[INV-QD-316](../invariants.md),
[BEH-QD-198](../behaviors/25-inspection.md),
[BEH-QD-065](../behaviors/09-react.md), CCR-QD-150, CCR-QD-426.

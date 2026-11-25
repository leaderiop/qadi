# ADR-QD-199 — A provider's registry lifetime has a React-free owner

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-199                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-25                                     |
> | Status         | Accepted — amends ADR-QD-195                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-25): Initial (ARCH-133, CCR-QD-478) |

---

## Context

[ADR-QD-195](./195-a-providers-registry-has-one-owner-for-its-lifetime.md) gave a provider's registry one owner for its
lifetime and put the half of the rule that decides *when* a recycle runs in `RegistryLease.ts`, a pure state machine with its
own tests and its own entry in the mutation run. The other half, what a construction, a commit and a recycle *do*, stayed in
`QadiProvider.tsx`. That is where the two defects the earlier decision records came from: a second registry built while the
tree was hidden, and a disposed registry met on a reveal.

The component held four refs and four effects for it. One ref held the registry, one the lease, one the atom set last committed
(read to report a swap), one the atoms and subject of the latest commit (read by the recycle), and the recycle body itself,
`reset()` then the subject written back, was a closure the component built for the lease. The atom set lived in two of the
refs, written by two effects, so one datum had two owners. The component renders, so `stryker.react.mjs` never mutated it: a
registry seeded in the wrong order, a recycle that wrote the wrong commit back, or a swap that went unreported would have
survived every mutant, and the only evidence for them was a render test that needs `<Activity>`, a fake clock and a harness
of its own.

Two facts shape the move, both read from the code. A reporter that throws never reaches an effect: `providerSignalReporter`
contains it and raises `ReporterThrew`, so a report made inside a commit cannot abort the rest of it. And the registry already
ignores a write equal to the value a built node holds, which makes the component's `registry.get(atoms.subject) !== subject`
guard before the subject write a check the registry makes itself.

## Decision

1. **One package-private module, `RegistryOwner.ts`, imports no React.** `makeRegistryOwner(seed, defer?)` returns
   `{ registry, commit, hold, release }`. It composes `makeRegistryLease` unchanged: `hold` and `release` are the lease's own,
   forwarded by reference, and the lease's file, its tests and its `mutate` entry are not touched, so the throwing-`defer` and
   throwing-`recycle` properties stay one machine with one test set. The owner is out of the barrel and `QadiProvider.tsx`
   re-exports nothing of it ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)), so no export moves. Its state is closure
   state inside the factory, and it passes neither `scheduleTask` nor `defaultIdleTTL` to `AtomRegistry.make`
   ([ADR-QD-014](./014-react-via-atoms.md), [ADR-QD-148](./148-the-atom-set-owns-its-eviction-sweep.md)), never disposes the
   registry and never calls the sweep (ADR-QD-195 decisions 1 and 6). It is named for what it owns and sorts beside the lease.

2. **Building the owner is inert, and the seed order is fixed.** The factory builds the registry seeded with
   `[[atoms.subject, subject], ...initialValues]` (the host's iterable is spread into an array before `make`, because it is
   consumed once) and builds the lease, and calls nothing else: no `defer`, no subscription, no timer. Only `release` reaches
   `defer`, through the lease. A server render, which runs no effect, and a render React discards therefore leave nothing
   scheduled. The subject is seeded first, so a host's `initialValues` entry for the subject atom still wins at construction,
   and the first commit then writes the prop subject over it.

3. **The recycle is `registry.reset()`, then the latest committed subject.** The body runs `registry.reset()` called through
   the property at recycle time, so a `reset` replaced on the instance is the one reached, then, in a `finally`, writes
   `registry.set(latest.atoms.subject, latest.subject)` from the owner's own record of the latest commit. The provider passes no
   `defer`, so the lease keeps its default, which resolves `setTimeout` from the global when it is called. Neither
   `initialValues` nor a seed is written back, because a seed is not an authority
   ([ADR-QD-039](./039-a-seed-is-not-an-authority.md)) and the client's own answer takes precedence
   ([ADR-QD-017](./017-stale-decisions-are-not-decisions.md)).

4. **A commit is one call, made in one order.** `commit(atoms, subject, onAtomsReplaced)` calls `onAtomsReplaced` when `atoms`
   is not the atom set last committed (the first commit compares with the set the owner was built from), then records `atoms`
   and `subject` as the latest, then writes the subject. The provider makes it from one effect on `[owner, atoms, subject]`,
   declared first, and has three more: the two instrumentation effects, then the one that holds and releases, declared last on
   `[owner]`. Four effects in all. "A commit before the hold, and the hold last" ([ADR-QD-195](./195-a-providers-registry-has-one-owner-for-its-lifetime.md)
   decision 3) holds by declaration order. The merge changes no run condition: the effect that recorded the latest and the one
   that wrote the subject already ran on `[atoms, subject]`, because the registry never changes; the one that reported a swap
   now also runs on a subject change, where the comparison finds the same atom set and reports nothing; and a StrictMode double
   effect and a reveal run every effect whatever its dependencies.

5. **Detection is the owner's, reporting is the component's.** The owner holds the latest atom set, so the second ref that held
   it is gone, and it detects a swap with `latest.atoms !== atoms`. It reports nothing: the provider hands `commit` the callback
   `() => report(providerSignals.atomsReplaced())`, so the owner knows nothing of developer signals, `DeveloperSignals.ts` keeps
   its one row for the signal, and the component holds no `if`. Inside `commit` the order is the one the provider's effects ran
   in before the move: the report, then the latest, then the write. A reporter that throws is contained, so the callback cannot
   abort the commit; a callback that does throw stops the commit before it records or writes anything.

6. **The subject write is unguarded.** The owner writes `registry.set(atoms.subject, subject)` on every commit, with no
   `registry.get(atoms.subject) !== subject` check before it. The subject atom compares with `subjectsEqual`, the structural
   rule, and a built node ignores an equal write: no listener is called, nothing is invalidated and the stored object is kept.
   So a guard that compared by identity decided nothing the registry did not decide, and in the measured owner it would be an
   equivalent mutant. One observable difference is recorded under Consequences. The comment that says why the write is made in
   an effect and never in render, with the render-phase write that was tried and reverted, stays in the provider, at the commit
   effect, where the decision still lives.

7. **The provider forwards.** It builds the owner once, in render, in a ref (`ownerRef.current ??= makeRegistryOwner(…)`), where
   the registry ref was built, so a server render and the first client render hold the subject with no pending frame; it reads
   the registry from the owner for the context and for nothing else; it calls `commit` in the first effect and `hold` and
   `release` in the last. It keeps three refs, the reporter, the owner and the instrumentation latch. It holds no lifetime
   branch, no timer and no registry call of its own. The writer memo and the two instrumentation signals are developer-signal
   concerns and are unchanged.

8. **Every render test stays.** The render suite is already a set of StrictMode, `<Activity>`, server and unmount cases, and
   each holds a half of its property that only React gives (the audit under Consequences). What moves is the spec's proof: the
   owner's rows are the first test each of BEH-QD-747 to BEH-QD-750 names, and the render tests stay as the integration net.

## Alternatives considered

Every alternative ADR-QD-195 rejected is still rejected, for the reason it gave:

- **Rebuild the registry in an effect, or hold it in state.** Rejected: too late; a consumer subscribes to the old registry
  first, and a build in render still has to build the first one.
- **The scoped-hook shape (`useScoped`).** Rejected: it has no registry and no subject in a server render and in the first client
  render, and it discards the state `<Activity>` exists to keep.
- **A registry proxy that forwards to the current one.** Rejected: it forwards every member of a large interface and hides the
  registry's identity from anything that compares it.
- **Dispose only on a true unmount.** Rejected: React gives no sign at cleanup time whether a subtree is hidden or gone.
- **Never release.** Rejected: it retains, past the provider's life, the nodes idle removal never takes.
- **`dispose()` in place of `reset()`.** Rejected: it is terminal, so a straggler or a reveal throws.
- **Re-apply the seeds after a recycle.** Rejected: a seed is not an authority, and the client's answer takes precedence.
- **Write the subject back from the first closure, or in render.** Rejected: the first closure holds a subject the provider has
  replaced, and a render-phase write reaches the registry from a render React may discard.
- **A guard inside the deferred run as well as `cancel`.** Rejected: two cancellations make removing `cancel()` an equivalent
  mutant no test can kill.

And the options this decision weighed and rejected:

- **Three ordered effects over separate record, write and detect calls.** Rejected: it keeps the order of a commit in the
  component, which the mutation run cannot measure, and leaves the owner's methods correct only when they are called in an order
  only a render test can check. One call states the order once, in the module the headless rows drive.
- **Detection in the component.** Rejected: it keeps a second ref holding the datum the owner now holds, and an `if` in the one
  file that is not measured.
- **`commit` returning a boolean for the component to report.** Rejected: it moves the report after the write for no reason and
  leaves a branch in the component.
- **The owner importing the developer signals and the reporter.** Rejected: it makes the lifetime module a second reporter
  path beside the one `DeveloperSignals.ts` states.
- **Keeping the `registry.get(atoms.subject) !== subject` check.** Rejected: a mutant no test can kill in a file held to no
  surviving mutant. An unconditional `registry.get` before the write, kept only for its side effect on the node, is rejected for
  the same reason: its removal would be an equivalent mutant.
- **Folding the commit into the hold effect.** Rejected: it changes the order of the subject write against the hold on a
  reveal, which decision 3 of ADR-QD-195 fixes.
- **Folding the lease into the owner.** Rejected: it merges two concerns with different test seams, and would rename a file the
  mutation run names by path.
- **Amending ADR-QD-195 alone and leaving this decision unwritten.** Rejected: the owner adds rules of its own, the inert
  construction, the one commit, the placement of detection and the dropped guard, and ADR-QD-195 states a decision about the
  lease.

## Consequences

- No export moves, so `scripts/check-api-surface.mjs` (gate 13) and `scripts/check-package-install.mjs` (gate 14) are unmoved.
  Nothing a host renders, receives or calls changes, apart from the one difference below. No upgrade-guide entry.
- **A host `registry.refresh(atoms.subject)` keeps the current subject.** This is one deliberate difference in behaviour. On a
  registry whose seeded `subject` node nothing has read before the first commit, the owner's write leaves the node carrying the
  flag that preserves its initial value on build, so a later `registry.refresh` of the subject atom keeps the subject. The
  component's guard read the node first, which built it and cleared that flag, so the same refresh reset the subject to
  `undefined`. Once anything has read the node the flag is cleared and a refresh resets it whatever the owner does. Nothing in
  this library refreshes the subject atom; the difference is reachable only by a host that calls `registry.refresh` through
  `RegistryContext` before a gate has read the subject. Keeping the subject is the better behaviour, and a row of the owner's
  tests pins it (RO16), seen failing with the guard put back.
- **The order of the provider's effects was read from React 19.3.1.** `commitHookEffectListMount` runs a fiber's whole
  passive-effect list inside one `try`, in declaration order, so a throw in an effect skips the later ones, the hold among them,
  as it did before the move. No rendered test distinguishes "commit then hold" from "hold then commit" while nothing throws: both
  leave the lease held and the subject written. The order is therefore held by the provider's shape, one effect to commit first
  and one to hold last, and by review, and no merge gate checks it. The 19.2.4 peer floor is not exercised.
- `QadiProvider.tsx` stays outside every mutation config. It renders, and it now holds no lifetime branch, so there is nothing in
  it for a mutant to measure; the render suite and the characterisation hold what it forwards.
- `RegistryLease.ts` is held byte for byte, so its header still says the provider holds the lease in its effect and is its one
  caller. The owner is that caller now, and the provider reaches the lease only through it. The file keeps its words because its
  tests and its mutation record are what measure it.
- **The mutation record.** `RegistryOwner.ts` is in `stryker.react.mjs`'s `mutate` list beside `RegistryLease.ts`, and its own
  test file kills every mutant by itself (19 of 19; no Survived, NoCoverage, Ignored or Timeout mutant). A surviving mutant in it
  would mean a registry seeded wrongly, a subject written from the wrong commit, or an atom-set swap that goes unreported.
- **The render-suite audit.** Each lifetime render test, with what the owner's rows now hold and what only a render gives:

| Render test | What the owner's rows hold | What only a render gives, so it stays |
| ----------- | -------------------------- | ------------------------------------- |
| LT1 a hidden-then-shown provider throws nothing | the registry answers after a recycle (RO2, RO14) | React runs every consumer's setup before the provider's, so the first subscription meets the registry, and the boundary above catches nothing |
| LT2 an invalidation after a long hide | the registry answers after a recycle (RO2) | an invalidation reaching a recycled registry through the hooks of a revealed tree |
| LT3 a devtools feed consumer after a long hide | nothing: the owner forks nothing | the feed's own subscription on a reveal |
| LT4 StrictMode, then a long hide | a hold after a release cancels the one recycle, and a later release defers again (RO4) | that React really runs the double effect and the cleanup order, and that one registry is handed out |
| LT5 a hide shorter than a macrotask | the same cancel (RO4) | that two `act` flips run a cleanup then a setup in one tick |
| LT6 a subject changed while hidden | a recycle writes the latest commit before any read (RO5, RO10) | the first-frame read of the reveal, and that a hidden tree renders with new props and runs no effect |
| LT7 a re-render while hidden | one registry object across every operation (RO14) | that the provider's lazy ref survives a render of a hidden tree |
| LT8 an atoms swap while hidden | a swap reported once however often it is committed (RO8) | that a reveal runs the commit once |
| LT9 a seeded allow never answered | a recycle returns no initial value and no seed (RO7) | the gate's `Pending`, then the client's answer |
| LT10 a seeded allow with no subject | the same (RO7) | the gate staying `Pending` until a subject arrives |
| LT11 a long hide with a re-render | the same (RO7) | what is painted, and the one hydration mismatch reported |
| LT12 pressure episodes across a long hide | nothing: the owner passes no `scheduleTask` and calls no sweep | the atom set's sweep across a hide |
| LT13 a reveal committed with a re-render | a recycle writes the latest commit (RO5) | the subject read in the first frame |
| LT14 a read straggling after an unmount | a release then a fired run recycles once, and a seeded host atom reads its default (RO2) | that the read recreates a node nothing holds, which idle removal takes a macrotask later |
| LT15 a host subscription held across a long hide | a recycle detaches a subscription held on the registry (RO13) | the hide that runs the recycle |
| LT16 a subject committed while visible | a recycle writes the latest commit (RO5) | the first-frame read of the reveal |
| LT17 an atom set committed while visible | a recycle writes the latest commit's atom set (RO5, RO8) | the first-frame read of the reveal |
| LT18 a recycle whose reset throws | the subject is still written back and the owner recycles again (RO6, RO12) | the first frame after the reveal, and the timer the lease resolves from the global |
| `edges.test.tsx` releases its registry after it unmounts | a release then a fired run recycles once (RO2) | that an unmount runs the provider's cleanup at all, the only proof the provider wires `release` to React |
| `ServerRender.test.tsx` a seeded decision is in the first HTML | construction seeds the subject first and schedules nothing (RO1, RO11) | that a server pass, which runs no effect, reads the seeded registry out of the context |

Tests removed: 0.

Each keeps a half only React gives: the render tests are the integration net around the owner's rows, so none is redundant and
none is edited.

## What enforces it

- `packages/react/test/RegistryOwner.test.ts`: RO1 to RO16, the owner with no React and a real registry. A built owner defers
  nothing and a commit and a hold defer nothing either (RO1, RO3); a release recycles once and a hold cancels it (RO2, RO4); a
  recycle writes back the latest commit, however its reset or its write fails (RO5, RO6, RO10); it returns neither an initial
  value nor a seed (RO7); a swap is reported once and before the write (RO8, RO9); the subject is seeded first (RO11); the
  recycle reaches a `reset` replaced after construction (RO12); one registry throughout and a recycle that detaches a host's
  subscription (RO13, RO14); a defer that throws leaves the owner usable (RO15); and a host refresh keeps the subject (RO16).
  Every row that recycles nothing has a twin that recycles once.
- `packages/react/test/QadiProvider.owner.characterisation.test.tsx`: C1 to C9, the provider's behaviour written before the
  move and unchanged by it. A seeded subject entry is read in the first render and the prop subject after the commit (C1); a
  server render and a render React discards schedule no timer (C2, C3); a swap is reported before the new set's subject is
  written, and a reporter that throws still leaves it written (C4, C8); an equal subject notifies nobody (C5); no swap is
  reported for a StrictMode double effect or a plain reveal (C6); a subject and an atom set committed together are the ones a
  long hide writes back (C7); the first commit writes the prop subject with nothing reading it (C9).
- `packages/react/test/QadiProvider.lifetime.test.tsx` and `packages/react/test/RegistryLease.test.ts`, held unchanged: the
  render suite above and the lease's own rows.
- The owner's entry in `stryker.react.mjs`'s `mutate` list, held to no surviving, uncovered or ignored mutant, and the merge
  gate by command (`pnpm check`), never by number.
- Review, for the provider's shape: that it builds one owner, forwards a commit first and a hold last, and holds no lifetime
  branch. No merge gate checks it.

## Related

- [ADR-QD-195](./195-a-providers-registry-has-one-owner-for-its-lifetime.md) — the decision this one amends: decisions 2, 3 and 4 extend to the owner
- [ADR-QD-014](./014-react-via-atoms.md), [ADR-QD-148](./148-the-atom-set-owns-its-eviction-sweep.md) and
  [ADR-QD-149](./149-a-seed-is-held-by-its-question.md) — read, not amended: the owner forks nothing, touches no sweep and
  re-applies no seed
- [ADR-QD-017](./017-stale-decisions-are-not-decisions.md) — the client's answer takes precedence over a seed
- [ADR-QD-039](./039-a-seed-is-not-an-authority.md) — a seed is not an authority, so the recycle writes none back
- [ADR-QD-099](./099-entry-points-are-a-closed-list.md) — `RegistryOwner.ts` stays out of the barrel
- [BEH-QD-766](../behaviors/09-react.md#beh-qd-766-a-providers-commit-is-one-transition-reported-then-recorded-then-written-before-the-hold) and
  [BEH-QD-767](../behaviors/09-react.md#beh-qd-767-building-a-providers-registry-schedules-nothing), which state it;
  [BEH-QD-747](../behaviors/09-react.md#beh-qd-747-a-provider-holds-one-registry-for-its-life),
  [BEH-QD-748](../behaviors/09-react.md#beh-qd-748-a-providers-registry-is-released-once-a-macrotask-after-its-last-release-unless-held-first),
  [BEH-QD-749](../behaviors/09-react.md#beh-qd-749-a-recycle-writes-back-the-latest-committed-subject-before-a-consumer-reads-it) and
  [BEH-QD-750](../behaviors/09-react.md#beh-qd-750-a-recycle-re-applies-neither-initialvalues-nor-a-hydration-seed) and
  [BEH-QD-067](../behaviors/09-react.md#beh-qd-067-provider), which it restates
- [INV-QD-417](../invariants.md#inv-qd-417-a-providers-registry-lifetime-rule-lives-in-one-module-that-imports-no-react) and
  [INV-QD-418](../invariants.md#inv-qd-418-the-registry-owner-is-inert-at-construction-and-only-a-release-reaches-defer), the two invariants it adds;
  [INV-QD-409](../invariants.md#inv-qd-409-no-consumer-reaches-an-unusable-registry) and
  [INV-QD-410](../invariants.md#inv-qd-410-a-provider-holds-exactly-one-registry-for-its-life), which it keeps

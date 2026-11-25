# ADR-QD-195 — A provider's registry has one owner for its lifetime

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-195                                   |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-11-25                                     |
> | Status         | Accepted — amends ADR-QD-014, ADR-QD-148 and ADR-QD-149 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.2 (2026-11-25): Related links INV-QD-409 and INV-QD-410 (CCR-QD-474)<br>1.1 (2026-11-25): Related links BEH-QD-746 to BEH-QD-750 (CCR-QD-474)<br>1.0 (2026-11-25): Initial (ARCH-129, CCR-QD-474) |

---

## Context

`QadiProvider` owns one `AtomRegistry`. [ADR-QD-014](./014-react-via-atoms.md) said the registry is a second lifetime to
reason about beside React's, and the provider disposed it from an effect's cleanup after one macrotask, so a development-mode
double mount did not dispose a registry the second mount still used. That deferral assumed a cleanup means the provider is
gone. React 19's `<Activity>` breaks the assumption: hiding a subtree runs every layout and passive cleanup under it, and
showing it again runs every effect's setup again, with the closure the last commit held and no re-render. A provider under a
hidden `<Activity>` is therefore cleaned up and then set up again, and nothing at cleanup time says which of the two a
cleanup is: a StrictMode double effect, a hide, or an unmount.

Two defects came out of that, each seen failing on the code before this decision (the lifetime tests, by title).

- **A reveal after a long hide met a disposed registry.** A hoisted provider hidden for longer than the one macrotask and shown
  again threw `registry is disposed` three times: the gate's `useAtomValue` subscription, the subject probe's subscription,
  and the provider's own subject effect (`registry.get`). The boundary above the subtree caught them and rendered its marker
  in place of the subtree ("LT1 a provider hidden past a macrotask and shown again throws nothing and renders the decision":
  `expected [ …(3) ] to deeply equal []`). An invalidation after the hide (LT2), a devtools feed consumer (LT3) and a
  StrictMode double effect followed by a long hide (LT4) threw the same way.
- **A re-render while hidden built a second registry.** The provider had cleared its ref when it disposed the registry, so a
  re-render between the release and the reveal built a new one with `??=`. It lost every cached decision, re-applied the
  construction seeds, and handed the tree a different registry than the one the first render gave it ("LT7 a re-render while
  hidden past the release keeps one registry": `expected 2 to be 1`).

The order React runs these effects in was observed, with React 19.3.1, from an instrumented run that logged every layout and
passive setup and cleanup of an `Outer` sibling, a child of the provider, and the provider's own effects, inside a toggled
`<Activity>`. On the provider as it was (disposing in a cleanup):

```
ORDER mount: Outer layout setup | child layout setup | PROVIDER layout setup | Outer passive setup | child passive setup | PROVIDER subject effect (registry.get) | PROVIDER passive setup
ORDER short hide and reveal: Outer layout cleanup | PROVIDER layout cleanup | child layout cleanup | Outer passive cleanup | PROVIDER passive cleanup | child passive cleanup | Outer layout setup | child layout setup | PROVIDER layout setup | Outer passive setup | child passive setup | PROVIDER subject effect (registry.get) | PROVIDER passive setup
ORDER long hide and reveal: Outer layout setup | child layout setup | PROVIDER layout setup | Outer passive setup | child passive setup | PROVIDER subject effect (registry.get) | Outer layout cleanup | PROVIDER layout cleanup | child layout cleanup | Outer passive cleanup | child passive cleanup
```

The rule the lines show: setup runs children before the provider, layout effects then passive effects, bottom-up; cleanup runs
the parent before its children, layout then passive, top-down; so the provider's passive setup is the last effect a reveal
runs, after every consumer has subscribed. On a long hide the deferred `registry.dispose()` ran a macrotask after the
cleanups; the reveal's first subscription then threw, React unmounted the tree at once, and the provider's own passive setup,
the last effect of a good reveal, never ran. A consumer revealed after a long hide subscribes to whatever registry the
context holds, and the context cannot hold a registry that is about to be replaced: the subscription is the first thing that
runs.

## Decision

1. **One registry per provider, built in render, kept for the provider's life.** It is built lazily in a ref exactly as
   before, with the subject and `initialValues` as its `initialValues`, so a server render and the first client render have
   the subject with no pending frame. The ref is never cleared and nothing builds a second registry, so the context a
   consumer reads holds one object for as long as the provider lives. The registry is never disposed: `dispose()` is
   terminal, and a straggler or a reveal that reached a disposed registry throws.

2. **`RegistryLease.ts` decides when the registry is recycled, and only that.** `makeRegistryLease(recycle, defer)` is
   package-private, out of the barrel ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)), imports neither React nor the
   provider, and returns `hold()` and `release()`. Its state is a closed union of three, `Unheld`, `Held` and `Releasing`
   (carrying the cancel of the deferred run), and every transition answers for every state, so a repeated hold or release is a
   defined no-op. A release from `Held` defers one recycle by one macrotask (`setTimeout(…, 0)`, injectable); a hold during
   `Releasing` cancels it; a release while one is pending defers nothing more; a release on a lease never held defers
   nothing. The deferred run sets the lease `Unheld` before it calls `recycle`, so a recycle that throws leaves the lease
   usable, and a `defer` that throws leaves it `Held`, because the state is assigned only once `defer` has returned. `cancel`
   is the only cancellation: there is no second guard inside the deferred run.

3. **The provider only holds and releases.** One effect, declared last, calls `lease.hold()` in its setup and returns
   `() => lease.release()`. Because it is the provider's last effect, on a reveal it runs after every consumer has subscribed
   and after the subject effect; because React runs the cleanup on a StrictMode double effect, a hide and an unmount alike, a
   hold in the same tick, or within one macrotask, cancels the recycle and any of the three leaves one registry. The provider
   holds no timer, no flag and no dispose call. The same sequence was observed with the lease, with React 19.3.1:

   ```
   ORDER mount: Outer layout setup | child layout setup | Outer passive setup | child passive setup | PROVIDER subject effect | PROVIDER hold
   ORDER long hide: Outer layout cleanup | child layout cleanup | Outer passive cleanup | PROVIDER release | child passive cleanup | recycle
   ORDER reveal: Outer layout setup | child layout setup | Outer passive setup | child passive setup | PROVIDER subject effect | PROVIDER hold
   ```

   On the reveal every consumer's passive setup runs before the provider's hold. The release is a passive cleanup of the
   hidden tree, after the parent's and before the children's; the recycle runs once, a macrotask after the hide and before
   the reveal, so a consumer subscribes to a registry that is already reset and holds its subject.

4. **The recycle is `registry.reset()`, then the latest committed subject written back.** `reset()` clears every node and runs
   its finalizers, which releases the runtime's layer scope and stops what was running, and the registry stays usable. The
   subject is then written with `registry.set(atoms.subject, subject)`, the same public call the provider's subject effect
   makes, from a ref the provider writes in an effect on `[atoms, subject]`: a render React discards never reaches it, and a
   closure from the first commit is never the one read. The `subject` atom is `keepAlive` (BEH-QD-516), so the write
   survives with no reader. With an `atoms` prop change the ref holds the current atom set's `subject`, and the provider's
   `AtomsReplaced` signal is unchanged.

5. **Neither `initialValues` nor a hydration seed is written back.** In this package `initialValues` is
   `hydrateDecisions`' output, the seed grants of [ADR-QD-149](./149-a-seed-is-held-by-its-question.md), and `initialValues`
   seeds construction only. A seed is not an authority ([ADR-QD-039](./039-a-seed-is-not-an-authority.md)) and the client's
   own answer takes precedence ([ADR-QD-017](./017-stale-decisions-are-not-decisions.md)): re-applying a server's allow after
   a hide would show it again while the client re-evaluates, and if the client had since replaced it with its own denial, a
   superseded allow would render. After a long hide a gate whose question the client had not answered renders `Pending`, then
   the client's own answer. Any other host atom passed in `initialValues` returns to its declared default after a long hide.

6. **The lease never touches the sweep.** It never calls the atom set's sweep, `AtomRegistry`'s `scheduleTask` or
   `defaultIdleTTL`, and never reads the registry's disposed state, which is not on the interface
   ([ADR-QD-148](./148-the-atom-set-owns-its-eviction-sweep.md), CCR-QD-150). It owns infrastructure and decides no
   authorization question.

7. **The lease's matchers are built once per lease, not at module scope.** `afterHold` and `afterRelease` are `Match.type`
   matchers built inside `makeRegistryLease`. A matcher built at module scope runs its arms once, at import, and the mutation
   run's `ignoreStatic` leaves such arms unjudged, so an arm replaced with `() => undefined` would survive unseen; built per
   lease, each arm is a mutant the run judges. The lease is in `stryker.react.mjs`'s `mutate` list, and its own test file
   kills every mutant by itself, though the rendered tests also reach it.

### What changes, and the test that pins it

| Behaviour | Before | After | Test |
| --------- | ------ | ----- | ---- |
| A provider hidden past a macrotask, then shown | three `registry is disposed` errors; the boundary renders its marker | nothing thrown; the gate renders its decision | LT1 |
| An invalidation, a devtools feed consumer, StrictMode, after a long hide | the same errors | nothing thrown | LT2, LT3, LT4 |
| A hide shorter than a macrotask | recycled nothing | recycles nothing | LT5 |
| A re-render while hidden past the release | a second registry, built by `??=` | one registry | LT7, LT13 |
| A subject changed while hidden | answered by the second registry | the revealed provider answers with the new subject | LT6 |
| An `atoms` swap while hidden | a second registry | one registry, reported once | LT8 |
| A seeded allow the client never answers, after a long hide | threw on the reveal | `Pending`, never the superseded allow | LT9 |
| A seeded allow with no subject, after a long hide | threw on the reveal | `Pending` until a subject arrives | LT10 |
| A long hide with a re-render, the client's denial replacing a seeded allow | painted the superseded allow, reported a second hydration mismatch | renders `Pending`, then the denial, reports once | LT11 |
| Pressure episodes across a long hide | the reveal threw | one fork and one sweep per episode | LT12 |
| A read straggling after an unmount | threw `registry is disposed` | recreates a node nothing holds, removed a macrotask later | LT14 |
| A host's own subscription held across a long hide | threw on the first write | detached | LT15 |
| An unmount | disposed the registry after a macrotask | recycles it once after a macrotask | "releases its registry after it unmounts" |

## Alternatives considered

- **Rebuild the registry in an effect, or hold it in state.** Rejected: too late. Children's reveal effects run before the
  provider's, so every consumer would subscribe to the old registry first, and a build in render still has to build the
  first one.
- **The scoped-hook shape (`useScoped`).** Rejected: it builds in a layout effect and renders nothing until it has, so a
  server render and the first client render have no registry and no subject, which breaks server rendering of guarded
  components and the first-render subject. It unmounts the children on a hide, discarding the state `<Activity>` exists to
  keep. The registry must exist during the first render pass; the lesson of the shape is that a value a child reads must never
  be closed, not its mechanism.
- **A registry proxy that forwards to the current one.** Rejected: it forwards every member of a large interface and hides the
  registry's identity from anything that compares it, a host's `useContext(RegistryContext)` among them.
- **Dispose only on a true unmount.** Rejected: React gives no sign at cleanup time whether a subtree is hidden or gone, so a
  rule that depends on the sign has nothing to read. The macrotask is the evidence a lease can use: a cleanup followed by a
  setup within it was a StrictMode double effect or a short hide, and any other is treated as a release, an unmount or a long
  hide alike, which is safe because a recycle leaves the registry usable.
- **Never release.** Rejected, for the reason the research corrected: it does not leak running fibers, because idle removal
  already releases an unsubscribed runtime layer scope. It retains, past the provider's life, the nodes idle removal never
  takes: the `keepAlive` subject, the seed grants of [ADR-QD-149](./149-a-seed-is-held-by-its-question.md), the runtime's layer
  atom and any host `initialValues` atom. Those belong to a provider that is gone, and a registry reachable only from it holds
  them until the garbage collector decides.
- **`dispose()` in place of `reset()`.** Rejected: it is terminal, so a straggler or a reveal throws, which is the defect. A
  scratch variant that disposes fails the whole lifetime file, the unmount test among them.
- **Re-apply the seeds after a recycle.** Rejected: a seed is not an authority and the client's answer takes precedence (decision
  5). It would also make a recycle a source of wrong allows rather than of pending frames.
- **Write the subject back from the first closure, or in render.** Rejected: the first closure holds a subject the provider
  has since replaced, and a render-phase write reaches the registry from a render React may discard. A write of the latest
  committed subject, from an effect, is the one the provider's subject effect already makes.
- **A guard inside the deferred run as well as `cancel`.** Rejected: two cancellations make removing `cancel()` an equivalent
  mutant no test can kill.

## Consequences

- No export moves, so `scripts/check-api-surface.mjs` (gate 13) and `scripts/check-package-install.mjs` (gate 14) are
  unmoved. The release note is a patch for `@qadi/react`: a defect fix, with the seeds not re-applied named in it. No
  upgrade-guide entry.
- After a hide longer than a macrotask, the gates under the provider render `Pending`, then the client's own answer, where
  they threw. After a hide shorter than one, nothing is recycled and nothing is re-evaluated.
- A seeded allow the client had not answered is not shown again after a long hide. A seed whose subject is `undefined`, or whose
  resolver never answers, stays `Pending` after a long hide, fail-closed, until a subject arrives or the resolver answers.
  An answered question never re-reads its seed, so the loss is the unanswered one only.
- `initialValues` seeds construction only. A host `keepAlive` atom passed in it reads its declared default after a recycle.
- A recycle detaches a subscription a host holds directly on the registry (`registry.subscribe`, or `mount`, reached through
  `RegistryContext`): `reset()` clears live listeners. In `<Activity>` order every consumer has unsubscribed before the
  recycle runs, so this package's own hooks lose nothing; a host that holds its own across a hide must subscribe again.
- **The accepted trade.** After a true unmount, a straggling `registry.get` recreates a node instead of throwing
  `registry is disposed`. The node holds nothing alive: it has no subscriber, so idle removal takes it a macrotask later, and
  the registry is unreachable with the provider. Measured, no leak: a straggling read after a recycle re-acquires the runtime's
  layer scope and idle removal releases it again.
- The sweep's bound holds across a long hide. A hidden gate's question may be evicted and re-admitted, and the lifetime test
  asserts one fork and one sweep per pressure episode rather than a step count. The node-level dispose-then-reread window of
  [ADR-QD-148](./148-the-atom-set-owns-its-eviction-sweep.md) is unchanged: the provider disposes nothing now, and the window
  is the registry's own.
- `AtomsReplaced` is unchanged: a changed `atoms` prop keeps the registry and signals once, and the atom set the earlier
  registry holds stays cached until the provider's registry is recycled.
- **The mutation record.** `RegistryLease.ts` is in `stryker.react.mjs`'s `mutate` list with no surviving, no-coverage or
  ignored mutant. `QadiProvider.tsx` stays outside it: it renders, and its lifetime logic is the lease. A surviving mutant in the
  lease would mean a registry released twice, never released, or released while held.
- Hiding a provider for longer than a macrotask costs one reset and a re-evaluation of every decision its subtree reads when
  it is shown again. A host that cannot afford the re-evaluation keeps the subtree visible or shows it before a macrotask passes.

## What enforces it

- `packages/react/test/RegistryLease.test.ts`: RL1 to RL10, the lease's transitions on its own through an injected defer (a
  hold, a release and a hold in one tick; a release recycling once; a second release deferring nothing; a release never held; a
  hold cancelling exactly once; unheld after a recycle; a recycle that throws; a defer that throws; a hold after a second
  release still cancelling the one pending recycle), and the default defer on a real macrotask (RL9).
- `packages/react/test/QadiProvider.lifetime.test.tsx`: LT1 to LT15, the long-hide reveal and its companions: invalidation,
  a devtools feed consumer, StrictMode, the short hide, a subject changed while hidden, a re-render while hidden, an `atoms`
  swap, the seeds not re-applied (LT9 to LT11), the sweep across a long hide, the first frame of a reveal committed with a
  re-render, a straggling read after an unmount and a host subscription held across a hide.
- `packages/react/test/edges.test.tsx`: `releases its registry after it unmounts`, which reads a `keepAlive` host atom seeded
  through `initialValues` after the macrotask: its default after a release, its seed with the release skipped, a throw under
  `dispose()`.
- The lease in `stryker.react.mjs`'s `mutate` list, and the merge gate by command (`pnpm check`), never by number.

## Related

- [ADR-QD-014](./014-react-via-atoms.md) — the registry is a second lifetime; the deferred disposal is replaced by a recycle; amended by this decision
- [ADR-QD-017](./017-stale-decisions-are-not-decisions.md) — the client's answer takes precedence over a seed
- [ADR-QD-039](./039-a-seed-is-not-an-authority.md) — a seed is not an authority, so a recycle does not re-apply one
- [ADR-QD-099](./099-entry-points-are-a-closed-list.md) — `RegistryLease.ts` stays out of the barrel
- [ADR-QD-103](./103-a-question-is-opened-once.md) — read: it states no registry disposal, so it is not amended
- [ADR-QD-148](./148-the-atom-set-owns-its-eviction-sweep.md) — the sweep the lease never touches; amended by this decision
- [ADR-QD-149](./149-a-seed-is-held-by-its-question.md) — a seed grant's node ends with the registry's recycle; amended by this decision
- [BEH-QD-067](../behaviors/09-react.md#beh-qd-067-provider) and
  [BEH-QD-516](../behaviors/09-react.md#beh-qd-516-the-subject-stays-in-the-registry-for-the-providers-lifetime), which the
  decision restates;
  [BEH-QD-746](../behaviors/09-react.md#beh-qd-746-a-provider-hidden-longer-than-a-macrotask-and-shown-again-throws-nothing-and-renders-the-clients-decision),
  [BEH-QD-747](../behaviors/09-react.md#beh-qd-747-a-provider-holds-one-registry-for-its-life),
  [BEH-QD-748](../behaviors/09-react.md#beh-qd-748-a-providers-registry-is-released-once-a-macrotask-after-its-last-release-unless-held-first),
  [BEH-QD-749](../behaviors/09-react.md#beh-qd-749-a-recycle-writes-back-the-latest-committed-subject-before-a-consumer-reads-it) and
  [BEH-QD-750](../behaviors/09-react.md#beh-qd-750-a-recycle-re-applies-neither-initialvalues-nor-a-hydration-seed), which state it;
  [INV-QD-409](../invariants.md#inv-qd-409-no-consumer-reaches-an-unusable-registry) and
  [INV-QD-410](../invariants.md#inv-qd-410-a-provider-holds-exactly-one-registry-for-its-life), the two invariants it keeps

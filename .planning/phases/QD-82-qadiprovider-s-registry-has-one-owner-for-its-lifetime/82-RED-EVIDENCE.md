# Phase 82 RED evidence

Each line below was printed by a run on the phase base (`node <this directory>/82-check.mjs <mode>`), stdin closed, from the
repository root. A scratch edit was made to a copy-backed `packages/react/src/QadiProvider.tsx` and restored with `cp` from a
copy in the scratch directory; `git status --porcelain -- packages` printed nothing afterwards.

## 82-01 the check helper

- check failed: commit: 0 commits since phase_base have the subject: docs(82-01): a subject no commit has
- check failed: unchanged: packages/react/src/QadiProvider.tsx differs from phase_base
- check failed: seen-failing: no failure line in the evidence for: planted
- check failed: scan-ids: packages/react/src/QadiProvider.tsx:320 names a requirement id: // LEASE-01 planted
- check failed: scan-forbidden: packages/react/src/QadiProvider.tsx:321 uses an as cast: const planted = value as Planted;
- check failed: trailers: the message has 2 Co-Authored-By lines, not one

`trailers` is recorded through the judge the self-test drives (`judgeTrailer` on a planted message holding two trailers),
because a failing run needs a plan commit with two trailers, which no commit of this phase may be.

`single-owner` on the phase base, every line it prints (exit 1), the reasons the promotion of the registry's lifetime to
`RegistryLease.ts` removes:

- check failed: single-owner: RegistryLease.ts is missing
- check failed: single-owner: stryker.react.mjs does not mutate RegistryLease.ts
- check failed: single-owner: QadiProvider.tsx holds a timer
- check failed: single-owner: QadiProvider.tsx disposes the registry
- check failed: single-owner: QadiProvider.tsx clears registryRef
- check failed: single-owner: QadiProvider.tsx does not build one lease
- check failed: single-owner: QadiProvider.tsx does not hold and release the lease in one effect

## the long-hide reveal on the base

`pnpm exec vitest run --project react packages/react/test/QadiProvider.lifetime.test.tsx < /dev/null`, from the repository
root, on the phase base (`packages/react/src` equals `phase_base`). The test hides a hoisted provider under an `<Activity>`
past a real 50 ms macrotask, shows it again, and the boundary above it caught the errors below.

- red on the base: LT1 a provider hidden past a macrotask and shown again throws nothing and renders the decision

The assertion line vitest printed (`expect(caught).toEqual([])`, the first assertion after the reveal):

```
AssertionError: expected [ …(3) ] to deeply equal []
 ❯ Object.expectNothingThrown test/QadiProvider.lifetime.test.tsx:158:20
```

Caught errors: 3 (one per consumer subscription, two consumers: the gate and the subject probe, plus the provider's subject
effect). Each message is `Cannot access Atom {"_id":"Atom","keepAlive":<false|true>,"lazy":true,"label":undefined}: registry
is disposed`. Stack heads, as printed by a temporary log of each caught error (removed before the commit):

1. `registry is disposed` at `RegistryImpl.subscribe (AtomRegistry.js:268:23)` <- `subscribe (Hooks.js:63:36)` <-
   `subscribeToStore (react-dom-client.development.js:8626:14)`: the gate's `useAtomValue` subscription (`keepAlive: false`).
2. `registry is disposed` at `RegistryImpl.subscribe (AtomRegistry.js:268:23)` <- `subscribe (Hooks.js:63:36)` <-
   `subscribeToStore (react-dom-client.development.js:8626:14)`: the subject probe's subscription (`keepAlive: true`).
3. `registry is disposed` at `RegistryImpl.get (AtomRegistry.js:242:17)` <- `packages/react/src/QadiProvider.tsx:258:18`: the
   provider's own subject effect (`registry.get(atoms.subject)`).

The order is the one the research run recorded: the consumers' subscriptions first (`@effect/atom-react`'s `Hooks.js:63`),
the provider's subject effect last (`QadiProvider.tsx:258`). After the reveal the boundary renders its marker in place of
the subtree, and `act` does not throw because a boundary is above it.

## the scenario companions on the base

`pnpm exec vitest run --project react --reporter=verbose packages/react/test/QadiProvider.lifetime.test.tsx < /dev/null` on
the phase base: 1 passed (LT5), 7 failed (LT1 and the six below). Each line is the title, then the assertion line vitest
printed and the test file line it points at.

- red on the base: LT2 an invalidation after a long hide re-evaluates without throwing

  `AssertionError: expected [ …(4) ] to deeply equal []` at `expect(caught).toEqual([])`: four `registry is disposed` errors
  (the three of the first reveal and the `useInvalidate` effect's `registry.mount`).

- red on the base: LT3 a devtools feed consumer survives a long hide

  `AssertionError: expected [ …(4) ] to deeply equal []` at `expect(caught).toEqual([])`: four `registry is disposed` errors
  (the feed consumer also calls `useInvalidate`).

- red on the base: LT4 under StrictMode the double effect recycles nothing and a long hide is survived

  `AssertionError: expected [ …(6) ] to deeply equal []` at `expect(caught).toEqual([])`: six `registry is disposed` errors
  (StrictMode runs each reveal effect twice). The assertions before the long hide held on the base: the host atom read
  `seeded` after the double effect and a real macrotask, and one registry was seen.

- red on the base: LT6 a subject changed while hidden is the one the revealed provider answers with

  `AssertionError: expected 2 to be 1 // Object.is equality` at `expect(r.seen.size).toBe(1)`: the re-render while hidden
  past the release built a second registry, and the reveal threw nothing.

- red on the base: LT7 a re-render while hidden past the release keeps one registry

  `AssertionError: expected 2 to be 1 // Object.is equality` at `expect(r.seen.size).toBe(1)`.

- red on the base: LT8 an atoms swap while hidden keeps the registry and is reported once

  `AssertionError: expected 2 to be 1 // Object.is equality` at `expect(r.seen.size).toBe(1)`.

LT5 passes on the base (`✓ ... LT5 a hide shorter than a macrotask recycles nothing`): a hide that ends before the
provider's deferral recycles nothing. A passing control is shown able to fail, under a scratch edit of
`packages/react/src/QadiProvider.tsx` made on a copy-backed file (`cp` to the scratch directory first, `cp` back after,
`git diff --quiet HEAD -- packages/react/src` holding afterwards). The edit: the dispose effect's cleanup disposed the
registry and cleared `registryRef` at once, with no `setTimeout`, instead of in the deferred callback. Run with `-t LT5`:

- failed (scratch): LT5 a hide shorter than a macrotask recycles nothing

  `AssertionError: expected [ …(3) ] to deeply equal []` at `expect(caught).toEqual([])` (`expectNothingThrown`): three
  `registry is disposed` errors, the short hide's reveal meeting the registry the cleanup had just disposed.

## observed commit order on the base

Observed on the phase base with React 19.3.1, from an instrumented run: a copy-backed scratch edit of
`packages/react/src/QadiProvider.tsx` added a `useLayoutEffect` and a `useEffect` at the end of the provider body and a
marker in the subject effect and before the deferred `registry.dispose()`, and a scratch harness rendered, inside a toggled
`<Activity>`, an `Outer` sibling before a hoisted provider whose `child` logged its own layout and passive setups and
cleanups into the same array. Run alone with `pnpm exec vitest run --project react --silent=false` from the repository
root, stdin closed. The provider was restored with `cp` from the scratch directory and the harness deleted;
`git status --porcelain -- packages` printed nothing and `packages/react/src` equals `phase_base` afterwards. Each line is
what the run printed, entries separated by ` | `.

ORDER mount: Outer layout setup | child layout setup | PROVIDER layout setup | Outer passive setup | child passive setup | PROVIDER subject effect (registry.get) | PROVIDER passive setup
ORDER short hide and reveal: Outer layout cleanup | PROVIDER layout cleanup | child layout cleanup | Outer passive cleanup | PROVIDER passive cleanup | child passive cleanup | Outer layout setup | child layout setup | PROVIDER layout setup | Outer passive setup | child passive setup | PROVIDER subject effect (registry.get) | PROVIDER passive setup
ORDER long hide and reveal: Outer layout setup | child layout setup | PROVIDER layout setup | Outer passive setup | child passive setup | PROVIDER subject effect (registry.get) | Outer layout cleanup | PROVIDER layout cleanup | child layout cleanup | Outer passive cleanup | child passive cleanup

The long hide itself, before the reveal, printed: `Outer layout cleanup | PROVIDER layout cleanup | child layout cleanup | Outer
passive cleanup | PROVIDER passive cleanup | child passive cleanup | registry.dispose()`: the cleanups, then the deferred
dispose a macrotask later. The reveal threw an `AggregateError` (no boundary was above in this run).

The rule the lines show: setup runs children before the provider, layout effects then passive effects, bottom-up; cleanup
runs the parent before its children, layout then passive, top-down; the provider's passive setup is the last effect a
reveal runs. The observation matches the research's prototype. One addition: on the base's long-hide reveal the provider's
subject effect throws (`registry.get` on the disposed registry), so React unmounts the tree at once (the cleanups above)
and the provider's passive setup, the last effect of a good reveal, never runs.

## what a recycle restores, on the base

`pnpm exec vitest run --project react packages/react/test/QadiProvider.lifetime.test.tsx -t "LT9 " < /dev/null` from the
repository root, stdin closed, on the phase base (`packages/react/src` equals `phase_base`). The resolver never answers, so
the server's allow is the only thing the gate could read: it rendered `allowed` while mounted (the assertion before the
hide held), and the reveal after a real 50 ms hide met the disposed registry.

- red on the base: LT9 a seeded allow the client never answers is not shown again after a long hide

  `AssertionError: expected [ …(3) ] to deeply equal []` at `expect(caught).toEqual([])` (`expectNothingThrown`, called from
  `test/QadiProvider.lifetime.test.tsx:447`): three `registry is disposed` errors. The frame and `pending` assertions after
  it are the fixed outcome a lease must give: no rendered frame reads the superseded allow.

`pnpm exec vitest run --project react --reporter=verbose packages/react/test/QadiProvider.lifetime.test.tsx -t "LT1[0-3] " < /dev/null`
on the phase base: 4 failed. Each line is the title, then the assertion line vitest printed and the test file line it points at.

- red on the base: LT10 a seeded allow with no subject stays pending after a long hide

  `AssertionError: expected [ …(2) ] to deeply equal []` at `expect(caught).toEqual([])` (`expectNothingThrown`, called from
  `test/QadiProvider.lifetime.test.tsx:490`): two `registry is disposed` errors, the reveal meeting the disposed registry.
  Mounted, the gate rendered `allowed` from the seed alone (the assertion before the hide held).

- red on the base: LT11 a long hide with a re-render shows no superseded allow and reports one mismatch

  `AssertionError: expected [ true, false ] to not include true` at `expect(frames).not.toContain(true)`
  (`test/QadiProvider.lifetime.test.tsx:520`): the reveal committed with the re-render built a second registry, and its
  first frame read the server's allow before the client's deny replaced it. This is the superseded-allow frame, read by a
  probe that records every render, not the settled text.

- red on the base: LT12 across a long hide each pressure episode is one fork and one sweep

  `TestingLibraryElementError: Unable to find an element with the text: allowed` at the `waitFor` after the reveal
  (`test/QadiProvider.lifetime.test.tsx:543`): the reveal threw, the boundary rendered its marker, and the gate never
  rendered again. The fork and sweep assertions after it are the rule a provider must keep across the hide.

- red on the base: LT13 a reveal committed with a re-render reads the subject in its first frame

  `AssertionError: expected 2 to be 1 // Object.is equality` at `expect(r.seen.size).toBe(1)`
  (`test/QadiProvider.lifetime.test.tsx:582`): a second registry was handed to the tree. The reveal threw nothing and no
  frame read `none` on the base; the fixed outcome is both of those held in one registry.

`pnpm exec vitest run --project react --reporter=verbose packages/react/test/QadiProvider.lifetime.test.tsx packages/react/test/edges.test.tsx -t "LT14 |LT15 |releases its registry" < /dev/null`
on the phase base: 3 failed. Each reads a registry the base disposed. The full react project reads `15 failed | 650 passed (665)`
on the base: LT1 to LT4 and LT6 to LT15 and the rewritten edges test.

- red on the base: LT14 a read straggling after an unmount throws nothing and leaves no node

  `AssertionError: expected [Function] to not throw an error but 'Error: Cannot access Atom {…}: registry is disposed' was
  thrown` at `expect(() => registry.get(decision)).not.toThrow()` (`test/QadiProvider.lifetime.test.tsx:603`): the base
  disposes the registry a macrotask after the unmount, so the straggling read throws where the fixed outcome is a node that
  is recreated silently and removed a macrotask later.

- red on the base: LT15 a host subscription held across a long hide is detached by the recycle

  `Error: Cannot access Atom {…}: registry is disposed` at `registry.set(r.host, "after")`
  (`test/QadiProvider.lifetime.test.tsx:642`), the first step after the long hide. The steps before it held on the base: the
  subscription heard `before` and, across a short hide made of two synchronous acts, `short`, so the short-hide control is
  inside the test and passes on the base.

- red on the base: releases its registry after it unmounts

  `Error: Cannot access Atom {…}: registry is disposed` at `expect(registry.get(host)).toBe("default")`
  (`test/edges.test.tsx:282`): the `keepAlive` host atom seeded through `initialValues` read `seeded` while mounted, and a
  real 50 ms macrotask after the unmount the registry was disposed, where a release reads the atom's default. The rewritten
  test replaces `disposes its registry when unmounted`, which only asserted an empty body and passed whatever the provider did.

## LT5 made order-independent (orchestrator, after 82-03)

LT5's short hide was `await hide(); await show();`, two awaited async `act` calls; in a cold run a macrotask could fall between
them, so run alone (`-t "LT5 "`) it failed in 5 of 6 runs (`deferred-items.md`). It now flips the mode in two synchronous `act`
calls (`flip("hidden")`, `flip("visible")`), as LT15's short-hide control does. Still on the phase base:

- passes run alone, 6 of 6 runs: `Tests  1 passed | 14 skipped (15)`
- failed (scratch): LT5 a hide shorter than a macrotask recycles nothing — the same copy-backed scratch edit as above
  (the cleanup disposes at once, no `setTimeout`): `AssertionError: expected [ …(3) ] to deeply equal []`; the file was
  restored with `cp` and `git diff --quiet HEAD -- packages/react/src` held.

## the registry lease, before it exists

`pnpm exec vitest run --project react packages/react/test/RegistryLease.test.ts < /dev/null`, from the repository root, with
`packages/react/src/RegistryLease.ts` absent. The module is the thing under test, so the whole file fails to load and every
test is red for the same stated reason: the lease does not exist yet. The line vitest printed:

```
Error: Failed to resolve import "../src/RegistryLease.ts" from "packages/react/test/RegistryLease.test.ts". Does the file exist?
 Test Files  1 failed (1)
      Tests  no tests
```

- red on the base: RL1 a hold, a release and a hold in one tick recycle nothing
- red on the base: RL2 a release recycles once when its deferred run fires
- red on the base: RL3 a second release while one is pending defers nothing more
- red on the base: RL4 a release on a lease never held defers nothing
- red on the base: RL5 a hold while a release is pending cancels it exactly once
- red on the base: RL6 after a recycle the lease is unheld until it is held again
- red on the base: RL7 a recycle that throws leaves the lease usable
- red on the base: RL8 a defer that throws leaves the lease held
- red on the base: RL9 the default defer recycles after a real macrotask and a hold before it cancels

Semantic assessment: the failure is the missing module, not a fixture or syntax fault; the nine titles are the ones the file
declares, so each is recorded red by that one cause. The tests assert the lease's transitions through a recording `recycle` and
a defer that really cancels, so they can only pass once the module exists and decides as stated.

## the fix's variants

Each variant is a copy-backed scratch edit of the fixed `packages/react/src/QadiProvider.tsx` (commit 8cc55c1e), run with
`pnpm exec vitest run --project react --reporter=verbose packages/react/test/QadiProvider.lifetime.test.tsx packages/react/test/edges.test.tsx < /dev/null`
from the repository root, then restored with `cp`; `git diff --quiet HEAD -- packages/react/src` held after each.

- `skip`: the hold and release effect returns no cleanup, so the release never runs.
- variant skip failed: releases its registry after it unmounts
- variant skip failed: LT9 a seeded allow the client never answers is not shown again after a long hide
- variant skip failed: LT10 a seeded allow with no subject stays pending after a long hide
- variant skip failed: LT15 a host subscription held across a long hide is detached by the recycle

- `dispose`: the recycle calls `registry.dispose()` in place of `registry.reset()`.
- variant dispose failed: releases its registry after it unmounts
- variant dispose failed: LT1 a provider hidden past a macrotask and shown again throws nothing and renders the decision
- variant dispose failed: LT2 an invalidation after a long hide re-evaluates without throwing
- variant dispose failed: LT3 a devtools feed consumer survives a long hide
- variant dispose failed: LT4 under StrictMode the double effect recycles nothing and a long hide is survived
- variant dispose failed: LT6 a subject changed while hidden is the one the revealed provider answers with
- variant dispose failed: LT7 a re-render while hidden past the release keeps one registry
- variant dispose failed: LT8 an atoms swap while hidden keeps the registry and is reported once
- variant dispose failed: LT9 a seeded allow the client never answers is not shown again after a long hide
- variant dispose failed: LT10 a seeded allow with no subject stays pending after a long hide
- variant dispose failed: LT11 a long hide with a re-render shows no superseded allow and reports one mismatch
- variant dispose failed: LT12 across a long hide each pressure episode is one fork and one sweep
- variant dispose failed: LT13 a reveal committed with a re-render reads the subject in its first frame
- variant dispose failed: LT14 a read straggling after an unmount throws nothing and leaves no node
- variant dispose failed: LT15 a host subscription held across a long hide is detached by the recycle

- `noreseed`: the recycle calls `registry.reset()` only, with no write of the latest subject.
- variant noreseed failed: LT13 a reveal committed with a re-render reads the subject in its first frame

Each of the three expected titles named by the plan fails under its variant (skip: the edges unmount test, LT9, LT15; dispose:
LT1, LT14; noreseed: LT13); none is blind, so no test was strengthened. The `skip` variant also fails LT10 and `dispose` fails
most of the file, because a registry that is disposed or never recycled is read by every test that reveals after a hide.

## observed commit order with the lease

Observed with React 19.3.1, from an instrumented run: a copy-backed scratch edit of the fixed provider pushed `PROVIDER hold`
and `PROVIDER release` into an array on `globalThis` from the hold and release effect, `recycle` before the lease's
`registry.reset()`, and `PROVIDER subject effect` from the subject effect; a scratch harness
(`packages/react/test/CommitOrder.scratch.test.tsx`) rendered, inside a toggled `<Activity>`, an `Outer` sibling before a hoisted
provider whose `child` logged its own layout and passive setups and cleanups into the same array. Run alone with
`pnpm exec vitest run --project react --silent=false` from the repository root, stdin closed, the long hide followed by a real
20 ms wait before the reveal; the long hide line is the array after that wait (the harness printed the hide's own cleanups, then
the lone `recycle` the wait added, and the line joins the two in the order the array held them). The provider was restored with `cp` and the harness deleted; `git status --porcelain -- packages`
printed nothing and `git diff --quiet HEAD -- packages/react/src` held afterwards. Each line is what the run printed, entries
separated by ` | `.

ORDER mount: Outer layout setup | child layout setup | Outer passive setup | child passive setup | PROVIDER subject effect | PROVIDER hold
ORDER long hide: Outer layout cleanup | child layout cleanup | Outer passive cleanup | PROVIDER release | child passive cleanup | recycle
ORDER reveal: Outer layout setup | child layout setup | Outer passive setup | child passive setup | PROVIDER subject effect | PROVIDER hold

The rule the lines show: on a reveal every consumer's passive setup (its subscription) runs before the provider's hold, which is
the last effect of the provider; the release is a passive cleanup of the hidden tree, after the parent's and before the
children's; the recycle runs once, a macrotask after the hide and before the reveal, so a consumer subscribes to a registry
that is already reset and holds its subject. The provider's subject effect runs again on the reveal and finds the re-seeded
subject equal, so it writes nothing.

## the lease mutation probe

`pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/RegistryLease.ts --disableBail`, alone, stdin closed, then
`node .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-mutation.mjs probe lease`.

First run, on the lease with RL1 to RL9 (commit 8cc55c1e): 27 of 28 killed, one survivor, and the probe exit 1:

```
Survived packages/react/src/RegistryLease.ts:74 ArrowFunction -> () => undefined
```

The mutant replaces the `Releasing` arm of the release matcher (`(releasing): LeaseState => releasing`) with one that returns
nothing, so a second release while one is pending leaves the lease in no state. RL3 only counted defers after the second
release and fired, so nothing observed the state it left. The rendered tests did not kill it either.

Closed by a lease test, with no `Stryker disable` comment and no change to the module:

- added `RL10 a hold after a second release still cancels the one pending recycle` to `RegistryLease.test.ts`: hold, release,
  release, hold, then one cancel and no recycle on fire, then a release recycles once. Seen red under the mutant by a scratch
  edit of the arm (only RL10 fails, `Tests  1 failed | 9 passed (10)`), the module restored with `cp` and
  `git diff --quiet HEAD -- packages/react/src` held; committed as c9154405.

Second run, after RL10: `Final mutation score of 100.00`, 28 of 28 killed, 0 survived, 0 no coverage, 0 ignored, 0 timeout; the
probe printed `probe lease: the report passes as its close would judge it` and exited 0.

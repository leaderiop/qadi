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

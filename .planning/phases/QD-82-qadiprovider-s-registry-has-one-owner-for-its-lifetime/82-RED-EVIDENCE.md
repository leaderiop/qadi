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

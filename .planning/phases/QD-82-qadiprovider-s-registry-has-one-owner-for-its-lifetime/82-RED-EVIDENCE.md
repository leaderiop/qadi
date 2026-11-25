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

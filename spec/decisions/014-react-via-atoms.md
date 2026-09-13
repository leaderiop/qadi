# ADR-QD-014: React integrates through Effect atoms

> **Status:** Accepted
> **Date:** 2026-07-26
> **Supersedes:** the `ManagedRuntime` integration described in revision 1.0
> **Amended:** 2026-08-24 by [ADR-QD-053](./053-a-gate-can-be-found.md) — a guard
> may record that it exists. Two stale claims in the Consequences below corrected
> at the same time (CCR-QD-073).
> **Amended:** 2026-09-08 — records why `@qadi/react` carries no `stryker.*.mjs`,
> a reason `stryker.config.mjs`'s doc comment had stated only jointly with
> `@qadi/testing`'s, and inaccurately at that (CCR-QD-119).
> **Reversed:** 2026-09-13 — the rejection of `@effect/atom-react` below was
> checked against the wrong package and did not hold up. See the correction
> under Consequences (CCR-QD-150). `@effect/atom-react` is now a dependency of
> `@qadi/react`.

## Context

Evaluation returns an `Effect` (ADR-QD-004), so React cannot call it during
render. Something has to supply the Qadi services, run the effect, hold the
result, and re-run it when the answer could have changed.

The first version of this package did all of that by hand: a `ManagedRuntime`
on a context, `runPromiseExit` in a `useEffect`, and `{ decision, allowed,
loading, error }` in component state. It worked, and it had three problems that
were not going to get better.

**Every component evaluated independently.** A list of fifty rows each asking
`useCan(canEdit)` ran fifty evaluations of one identical rule, each with its own
resolver calls. Nothing connected them, because component state cannot be
shared between components.

**Nothing could invalidate a decision.** Authority changes without the subject
object changing — a role granted, a grant revoked, a document reassigned. The
only way to re-check was to construct a new subject object and hope every hook
noticed.

**There was no vocabulary for staleness.** A boolean `loading` cannot express
"we have last minute's answer and are checking again", which is precisely the
state a cache is in most of the time.

`effect/unstable/reactivity` is a reactive graph for exactly this: `Atom` for a
node of derived state, `AtomRegistry` for the store that computes and disposes
it, `AsyncResult` for the three-state value, and `Reactivity` for keyed
invalidation. Building a private version of it inside a React context was the
alternative, and a worse one.

## Decision

`@qadi/react` is a binding over `effect/unstable/reactivity`. No additional
dependency: the React glue is one `useSyncExternalStore` call in
`QadiProvider.tsx`, so the package depends on `effect` and `react` and nothing
else.

> **Still one call, after ADR-QD-053.** `GateRegistry.ts` is a second external
> store, and it is subscribed to by `@qadi/devtools` rather than here — this
> package exposes `subscribe` and a snapshot and calls `useSyncExternalStore`
> exactly once, in `QadiProvider.tsx`, as it always did.
>
> **No longer true, after CCR-QD-150.** `@effect/atom-react` is now a
> dependency, and its `useAtomValue` — not a hand-rolled `useSyncExternalStore`
> call — is what `QadiProvider.tsx` calls. See the Consequences section's
> reversal of this ADR's `@effect/atom-react` rejection for why.

`makeQadiAtoms(layer)` builds one authorization context: a writable `subject`
atom, an `Atom.family` of decisions keyed by policy, a second family keyed by
policy and resource, and an `invalidate` function atom. `QadiProvider` owns an
`AtomRegistry` and seeds the subject into it at construction. Every hook is a
read of an atom.

Three consequences of that choice are load-bearing enough to state as rules:

**One evaluation per question.** `Atom.family` memoises on the policy, so
components asking the same question share one atom, one evaluation, one set of
resolver calls — however many of them there are.

**No subject means `Initial`, not `Deny`.** The decision atom returns an effect
that never settles while the subject is unknown. A pending decision and a
refused one are different answers, and rendering the second while waiting for
the first tells the user they are forbidden from something they may well be
allowed to do.

**Isolation is structural.** Two calls to `makeQadiAtoms` produce two disjoint
sets of atoms, and each `QadiProvider` owns its own registry. A multi-tenant
application cannot leak a decision between tenants by forgetting to configure
something, which is what replaced the predecessor's cloned hook factory.

## Consequences

**Positive**:

- One evaluation per distinct question, independent of how many components ask.
- Invalidation is a first-class operation, keyed through `Reactivity`.
- `AsyncResult` distinguishes not-yet-known, decided, and could-not-determine,
  so an attribute-backend outage never reads as a denial (INV-QD-006).
- Caching, sharing, and disposal are testable without rendering anything: the
  registry-level suite in `QadiAtoms.test.ts` renders no components at all.
- The clone is gone. Isolated contexts are the same code path as the default.

**Negative**:

- `effect/unstable/reactivity` is unstable by name. Its API may move before 4.0
  is released, and this package moves with it.
- ~~Policies are keyed by reference, so one built inline in render produces a new
  atom on every render (BEH-QD-069).~~ **Wrong on both counts, corrected in
  CCR-QD-073.** `Atom.family` holds a `MutableHashMap` and compares with
  `Equal.equals`, which is **structural** in Effect v4 — so a policy built inline
  and one hoisted to module scope map to the same atom, and inline does not
  defeat sharing. `packages/react/test/v4-reactivity-smoke.test.ts` pins this
  precisely because a change either way would be silent and serious, and
  AGENTS.md §13 has said so since it was written. The citation was wrong too:
  BEH-QD-069 is about **invalidation** and says nothing about keying.

  The real cost is smaller and worth keeping: the structural hash is cached per
  object, so a fresh policy object each render re-walks the tree to hash it.
  Hoist or `useMemo` for that reason, not for sharing.
- The registry is a second lifetime to reason about alongside React's, which is
  why `QadiProvider` defers disposal past a development-mode double mount.
- A guard can be enumerated and located, but only when the host asks for it
  ([ADR-QD-053](./053-a-gate-can-be-found.md)). Off by default, and off means no
  registration and no marker element.

**Trade-off accepted**: depending on an unstable module is worth it. The
alternative was not "no dependency" — it was a private, less-tested
reimplementation of the same graph, which is what the first version already was.

~~**Rejected**: `@effect/atom-react`, the official React binding. It supplies the
same `useSyncExternalStore` glue written here, plus Suspense helpers, hydration
and scoped atoms this package does not use. Fifty lines of binding is not worth
a dependency and a `scheduler` peer.~~ **Reversed, CCR-QD-150.** The premise was
wrong: what was checked was `@effect-atom/atom-react`, a similarly-named
community package pinned to `effect: ^3.22.1` — a genuine reimplementation, and
a real version conflict against this workspace's exact `4.0.0-rc.115` pin. The
actual `@effect/atom-react`, published from the same `Effect-TS/effect`
monorepo as `effect` itself, tracks `effect` version-for-version (its own
`4.0.0-rc.115` release pins `effect: ^4.0.0-rc.115` exactly) and its `Hooks.ts`/
`RegistryContext.ts` import `Atom`, `AtomRegistry`, `AsyncResult` and `AtomRef`
directly from `effect/unstable/reactivity/*` — the same types `QadiAtoms.ts`
already builds on, not a parallel implementation.

Verified on branch `spike/effect-atom-react`, not assumed: swapping
`QadiProvider.tsx`'s hand-rolled `useSyncExternalStore` binding for the
library's `useAtomValue`, and `settled.ts`'s hand-rolled Suspense-race fix for
the library's `useAtomSuspense`, closed one gap this package had hand-rolled
and patched three separate times for the same underlying race — **the
Suspense zero-listener race**. `settled.ts`'s doc comment records three
defects found chasing it on a real Node 20.17.0/20.19.0 binary (COMPAT-01, gap
G-01-1) — a subscribe-after-settle TOCTOU, a zero-listener teardown window
racing React's Suspense retry, and cross-registry-generation starvation.
`useAtomSuspense` solves the same race with a delayed-dispose timer instead of
"never unsubscribe," already keyed per registry. 179 tests were green before
and after this swap; the specific test the doc comment names as flaky
(`edges.test.tsx`, "1/8" without the original fix) ran clean 30/30 times on
Node 20.17.0 — the exact binary that bug was found on — and 25/25 on Node
22.22.0, both after `settled.ts` was deleted entirely (its only remaining
consumer, `Hydration.test.ts`, needed a generic-purpose local replacement, not
the Suspense fix itself). Workspace `typecheck` and `lint` stayed clean.

**A second gap was attempted and reverted: it is not closed, and should not be
claimed as one.** `QadiProvider.tsx`'s `AtomRegistry.make({ initialValues })`
call passes neither `scheduleTask` nor `defaultIdleTTL`, so idle atoms are
never scheduled for cleanup through React's own scheduler — the library's own
`RegistryContext.ts` wires both. Passing them here, matching the library, was
tried on the same spike branch and caused a real, reproducible regression:
`examples/nextjs-newsroom`'s `ssr.spec.ts` "a seeded allow is replaced by this
client's own denial" e2e test — the exact test ticket 34 (§'s render-phase
write regression, recorded above `QadiProvider`'s subject-sync effect) was
originally bisected against — started failing again, not by hanging this
time but by silently skipping the required intermediate render: the recorded
sequence read `"Success,Success"` instead of the specified
`"Success,Initial+waiting,Success"`. `AtomRegistry`'s `scheduleTask` option is
not scoped to idle-atom cleanup: it is threaded into `MixedScheduler`
instances used for **both** the registry's sync and async dispatch, so passing
React's low-priority `unstable_scheduleCallback` there reroutes core
notification dispatch through it, not just idle GC — and a low-priority
callback coalescing two rapid state transitions (pending → denied, under real
network timing) into one flush is exactly what dropped the render. Confirmed
by isolation: reverting only these two options made the e2e test pass 5/5,
restoring it made it fail reproducibly. Neither `packages/react`'s own unit
suite (`happy-dom`, synchronous mocks) nor `Hydration.test.ts`'s direct
registry tests exercise real scheduler timing, so this class of regression is
only visible through `examples/nextjs-newsroom`'s e2e suite — the same reason
ticket 34's original regression needed that suite to be caught at all.
Revisiting idle-atom GC needs a way to scope `scheduleTask` to eviction alone,
or a different idle-cleanup mechanism entirely, not a bare pass-through of the
library's registry options.

**Held to coverage, not mutation, rigor.** `@qadi/react` has no `stryker.*.mjs`.
`stryker.devtools.mjs` draws a render-vs-decide line inside `@qadi/devtools` —
mutation-test the model, skip the render code — and `@qadi/react` has the same
split internally: `QadiAtoms.ts` (atom-family keying and decision staleness,
ADR-QD-017/AGENTS.md §13), `GateRegistry.ts` (ADR-QD-053's guard-existence
registry) and `Hydration.ts`/`HydrationWarning.ts` (ADR-QD-041/052's
mismatch-announcement logic) are non-rendering and invariant-bearing, same as
`@qadi/devtools`'s `src/model/`. The line is not drawn here for a different
reason than devtools's: this package is small enough, and thin enough over
`effect/unstable/reactivity`, that a sixth Stryker config and its own CI leg was
judged not worth its cost against the 90% line-coverage floor already held —
not a claim that a mutant here would be uninteresting. Revisit if the
non-rendering modules grow past what `v4-reactivity-smoke.test.ts` and
`QadiAtoms.test.ts`'s no-DOM suite can keep pinned by inspection.

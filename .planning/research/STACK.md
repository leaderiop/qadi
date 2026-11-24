# Stack Research — v1.10 Arch Wave 15 (Phases 81–84, ARCH-128..131)

**Domain:** internal architecture deepening of an Effect v4 authorization monorepo (devtools model/hooks, `@qadi/react` provider)
**Researched:** 2026-11-24
**Confidence:** HIGH. Every version was read from the installed `node_modules`, and every behavioural claim was either read in installed source or reproduced with a throwaway probe (deleted afterwards; no source or test file was changed).

**Verdict: no stack change. No new dependency, no version bump, no new config.** Everything the four phases need is already installed and already used in the repo. This file records the verified facts the planner needs, the exact APIs to reuse, and the traps found.

## Recommended Stack (installed, verified)

### Core Technologies

| Technology | Installed version | Purpose in Wave 15 | Why / note |
|------------|-------------------|--------------------|------------|
| `effect` | 4.1.2 | `Equal.equals` (83 per-field fold), `Effect.fn`, scopes; `AtomRegistry` (82) lives at `effect/reactivity/AtomRegistry` (the `unstable/` path does not exist in 4.1.2) | Catalog is `latest`; the lock pins 4.1.2. Peer range stays `^4.0.0`. |
| `@effect/atom-react` | 4.1.2 | `RegistryContext`, `useAtomValue`; the registry glue for 82 | Already the declared glue (AGENTS.md §13). Its own `RegistryProvider` has the same dispose-on-cleanup shape as ours (see 82); there is no upstream fix to adopt. |
| `react` / `react-dom` | 19.3.1 | `<Activity>` semantics (82), `useLayoutEffect`/`useRef` (82, 84) | Peer is `>=19.2.4`; `Activity` is stable in this range. |
| `typescript` | 7.0.2 | Generic constraint for 84's `useConfigured<A extends { configure(i: I): void }, I>` | No new compiler feature needed. |

### Supporting Libraries (all already installed, all test-only)

| Library | Installed | Purpose | When to use |
|---------|-----------|---------|-------------|
| `vitest` | 5.1.0 | Phase RED tests, `vi.useFakeTimers` if a test must cross the `setTimeout(0)` | 81 (pure, no DOM), 82 (`happy-dom`), 83/84 (pure + hook tests) |
| `@effect/vitest` | 4.1.2 | `it.effect`, `it.layer`, `TestClock` for the model tests | 81, 83 (the feed's run is an Effect) |
| `happy-dom` | 21.0.4 | `environment: "happy-dom"` in `packages/react/vitest.config.ts` | 82 Activity test; `Activity` hide/reveal works under it (reproduced) |
| `@testing-library/react` | 16.3.3 | `render`, `act` | 82; reveal must be inside `await act(async …)` |
| `fast-check` | 4.10.2 | Property tests of the pure fold | 83: the per-field keep-if-equal function is a natural property (idempotent, identity-preserving) |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `scripts/check-house-style.mjs` | Budgets that new code can trip | 81: the new collect helper must not use `Effect.orDie`/`as`/`any`. 83: deleting `DiagnosticsStore.ts` must keep `spec/overview.md` and `[module-state]`/barrel rules green (the store is package-private, so no export-surface gate fires, but `spec/` ADR-QD-173 prose must be amended). 84: `NOT_CALLABLE_PIN_BUDGET` applies if a `.tst.ts` pin is added for the `Configurable` constraint (use `Params<…>`/twin form per AGENTS.md §6). |
| Stryker (`pnpm mutation`) | Per-phase mutation re-close (house practice) | `DockModel.ts` keeps a mutation score of 1 (ADR-QD-168); 81 adds branches there, so plan the re-close. |

## Verified facts the phases rely on

### 81 — what `ExternalStore.ts` already offers (read at `packages/devtools/src/model/ExternalStore.ts`, 221 lines)

| Member | Exported? | Semantics (verified) | Use in 81/83/84 |
|--------|-----------|----------------------|-----------------|
| `makeExternalStore(initial)` | yes | `set` notifies only on a different reference; `publish` always notifies; `notify` runs every listener, collects throws, rethrows via `throwCollected` | 83 feed value store, 84 `LensSession` |
| `throwCollected(thrown, message)` | **no** (module-private `function`, line 63) | 0 thrown: nothing; 1: the value itself (`undefined`/`null` included); >1: one `AggregateError(thrown, message)`; a thrown `AggregateError` is one value, never flattened (ADR-QD-177) | **81 needs it exported**, or better the loop around it (below) |
| `sameElements` | yes | reference-equal element-wise | 81: skip the second `spread` when the rail did not move |
| `sameFields(a, b)` | yes | own enumerable string-keyed fields, `===` per field, a field on one side only counts as moved | 83/84 per-field identity |
| `sameFieldsOrAbsent(a, b)` | yes | `undefined` equals only `undefined` | `DiagnosticsFeed.configure` already uses it |
| `makeDerivedStore` | yes | key-gated recompute; releases every parent even if one release throws, then `throwCollected` | already the dock's three derived stores |

**Recommendation for 81 (no new dependency):** the "run every step, collect throws, rethrow once" loop now exists twice in this file (`notify`, the derived store's finalizer) and the dock needs a third. Add one package-private export beside `throwCollected`, for example `runCollecting(steps: ReadonlyArray<() => void>, message: string): void`, and make all three call it. The dock's `configure` becomes: validate (`completeDockInputs`, still first and still allowed to throw before anything moves), assign `held`, then `runCollecting([timeline step, catalogue step, ports, gates, diagnostics, shownReading.refresh], "…")`. Keep it out of the devtools barrel (the barrels are named per module, AGENTS.md §9; `ExternalStore.ts` is already barrel-free). This reproduces the ADR-QD-177 rule at one more call site without a second implementation of it, and it fixes "a second throw replaces the first" by construction (`AggregateError` on two).

**Order trap:** step order in `configure` is semantic, not incidental. The comments pin: `held` assigned before the timeline publishes; gates applied before `shownReading.refresh()`; the model's own timeline listener subscribed before any host listener. A collected-steps list must preserve exactly that order (`runCollecting` runs in array order).

**Double-spread trap:** the timeline listener (`DockModel.ts` ≈349–356) already calls `spread()` when `shown` moved; the catalogue branch then spreads again. `spread` is idempotent through the sessions' `sameElements` guards, so today's cost is wasted work, not wrong state. Skip the second spread by comparing the new `rail` with the one the listener produced (`sameElements`), not by adding a flag.

### 82 — React 19.3.1 `<Activity>` semantics (reproduced in `packages/react`, happy-dom)

Probe A: parent state toggles `<Activity mode>`; the child element is a hoisted constant (`stable`), so the child is **not** re-rendered.

```
render 1
layout-up  closureRender=1 ref=ref@render1
passive-up closureRender=1 ref=ref@render1
--- hide
layout-down  passive-down
--- show                      <- no "render N" line
layout-up  closureRender=1 ref=ref@render1
passive-up closureRender=1 ref=ref@render1
```

Probe B (StrictMode, parent re-renders the child with new props while hidden):

```
--- hide                      passive-down
--- tag->b while hidden       render 7, render 8   (hidden Activity still re-renders on prop change)
--- show                      render 9, render 10 (StrictMode double)   passive-up closureRender=10, ref=ref@render1
```

| Question | Answer | Confidence |
|----------|--------|------------|
| Does hiding run effect cleanups (layout and passive)? | Yes, both, immediately; component state and refs are kept. | HIGH (reproduced) |
| Does reveal re-run effects without re-rendering the component? | **Yes**, when the element is stable: both layout and passive effects run again, **dependencies ignored**. | HIGH (reproduced) |
| With which closure? | The **last committed render's** closure (probe B: `closureRender=10` after a hidden re-render; probe A: the only one). Refs/`useState` survive hide/reveal. | HIGH (reproduced; matches the comment already in `useScoped.ts`) |
| Is a hidden subtree re-rendered when its props change? | Yes (probe B). The reveal then commits that render. | HIGH |

**Mechanism of the 82 defect (reproduced against the real `QadiProvider`):** hide > one macrotask → the cleanup's `setTimeout(0)` fires `registry.dispose()` and nulls `registryRef`. Reveal re-runs the effect closure that captured the **disposed** `registry` (no re-render, so no new closure). `dispose()` is terminal.

**Trap found beyond the brief — the provider's own effect is not the only thrower.** With a `<Can>` child under the provider, the reveal throws an `AggregateError` of **two** `registry is disposed` errors: one from `QadiProvider.tsx:258` and one from the child's own atom subscription (`@effect/atom-react` `useAtomValue`, reached through the stale `RegistryContext` value). React runs child effects before parent effects in one commit, and a provider-built replacement cannot reach the child before it re-subscribes (the context value only changes on a re-render, which happens after that commit's effects). So a fix that **rebuilds a registry in the provider's effect or via state** (the `useScoped` shape) still fails: the revealed children subscribe to the old, disposed registry first. The registry a revealed child can still reach must be **usable**.

### 82 — what `AtomRegistry` (effect 4.1.2, `packages/effect/src/reactivity/AtomRegistry.ts`) offers

| API | Behaviour (read at lines 472–750; probed) |
|-----|-------------------------------------------|
| `make({ initialValues, scheduleTask, timeoutResolution, defaultIdleTTL })` | seeds each `[atom, value]` through `ensureNode(target).setInitialValue` in the constructor |
| `dispose()` (line 746) | `disposed = true; reset()`. **Terminal**: `createNode` (line 619) throws `Cannot access Atom …: registry is disposed` on any later `get`/`set`/`subscribe`; an unsubscribe function from before the dispose is still safe to call |
| `reset()` (line 727) | clears timeout buckets and **all nodes** (each `node.remove()` runs its lifetime finalizers, so in-flight fibers are interrupted), but leaves `disposed` false: the registry stays **fully usable**. Seeds are lost (`get` returns the atom default until re-seeded); subscriptions to removed nodes are gone |
| `ensureNode(atom).setInitialValue(v)` | public on the `AtomRegistry` and `Node` interfaces; after a `reset()` it restores a seed (probed: `reset` then `get` → default `0`, then `setInitialValue(7)` → `7`, then `set`/`subscribe` work) |
| `registry.disposed` | a field of `RegistryImpl`, **not** on the `AtomRegistry` interface: do not read it |
| `scheduleTask`, `defaultIdleTTL` | exist; **off limits** per AGENTS.md §13 (they reroute dispatch and dropped a required render; ADR-QD-148) |

`@effect/atom-react`'s own `RegistryProvider` (`src/RegistryContext.ts` lines 79–112) uses the identical pattern (ref-built registry, `setTimeout(500)` dispose in cleanup, cancelled on remount) and therefore has the same hide-then-reveal defect. There is nothing upstream to adopt or wait for.

**Recommendation for 82, opinionated:** one owner for the lifetime means the provider never hands out a registry that a later effect re-run can find dead. With the facts above, the design that satisfies it without new state, a new dependency or a context change:

1. Keep the render-phase, ref-held construction (first render and SSR need the registry and the seeded subject before any effect; AGENTS.md note at `QadiProvider.tsx:214`).
2. In the deferred cleanup call `registry.reset()` **instead of** `registry.dispose()`, and re-apply the seeds in the same callback (`ensureNode(atoms.subject).setInitialValue(subject)` and each `initialValues` entry, read from the latest-committed props via a ref, as `signalRef` already does), so the registry a revealed child reaches is already seeded before any effect runs. Do not null `registryRef`.
3. Delete the `registryRef.current = undefined` line: a nulled ref is the second half of the defect (a later render would build a different registry than the one in the committed context value).
4. Pin it with a test that hides **longer than a macrotask** and reveals with stable children, with a `<Can>` child under the provider (the existing P4 hides and shows in one tick, so it cannot see the defect). Seen RED on the phase base.

The cost of `reset()` over `dispose()`: a straggling read after a true unmount silently recreates a node instead of throwing. That is the accepted trade, because React gives no signal separating "hidden" from "gone", and a registry nothing references is garbage. If the planner prefers keeping a terminal `dispose()` for true unmount, the only React-visible signal is the cleanup of an effect with no later re-run, which does not exist; do not simulate it with a longer timer.

**What not to do for 82:** no `useState` holding the registry (a rebuild lands after the children's effects, proven above, and the first-render/SSR seeding needs it in render); no `useScoped` (returns `undefined` on the first pass, which breaks SSR and the "no pending flash" requirement); no `useSyncExternalStore` or `useState` for decisions (AGENTS.md §13); no `AtomRegistry.make` options beyond today's.

### 83 — what exists for the fold (no new API needed)

| Need | Use | Where |
|------|-----|-------|
| Per-field keep-if-equal | the existing private `keep = (previous, next) => Equal.equals(previous, next) ? previous : next` over `effect/Equal` (already imported in `DiagnosticsStore.ts`) | becomes the body of one pure `foldReading(current, next): Diagnostics` that returns `current` itself when every field kept its reference |
| Holding the value | `makeExternalStore<Diagnostics>` already used by `DiagnosticsFeed`'s `view`; the feed's `show(status)` already publishes status and reading together as one `DiagnosticsSnapshot` | the feed stores `reading` as a plain `let`/value and `view.set({ status, reading })`; `set`'s reference guard replaces the store's own early return |
| `accept` sink | `runSource` takes `Pick<TimelineStore, "accept">`; mirror it as `Pick<…,"accept">`-shaped `(reading: Diagnostics) => void`, or a bare function | `runDiagnostics(accept, options)`; the `marking` wrapper (3 restated members) disappears because the feed passes its own closure |
| Resetting on `off()` | assign `noDiagnostics` (constant, keeps identity) | replaces `store = makeDiagnosticsStore()` |

`Diagnostics.questions` is always `undefined` out of the poll (`runDiagnostics` writes `questions: undefined`) and is only ever filled by the **supplied** `DiagnosticsReading.questions`, read in the dock at `DockModel.ts ≈378` as `held.reading?.questions`, not through the feed. The resolution that needs no new type machinery: drop `questions` from `Diagnostics` (the polled shape) and keep it on `DiagnosticsReading` (the supplied shape) only, with `mergeReading`'s `questions` line deleted. That narrows a public type (`Diagnostics` is exported), hence the "possibly Breaking" tag in the roadmap: confirm with `spec/overview.md`/gate 13 and ship a Breaking changeset plus an upgrade-guide entry if it is exported from the barrel.

### 84 — what already exists

| Change | API to use | Verified |
|--------|-----------|----------|
| `useConfigured` takes a value with `configure` | `<A extends { readonly configure: (inputs: I) => void }, I>(make, inputs)`; `DockModel`, `TimelineFeed`, `DiagnosticsFeed` already expose `configure(inputs)` with matching arity (`DockModel.ts:246`, `TimelineFeed.ts:98`, `DiagnosticsFeed.ts:119`); `GatesFeed.ts:108` too | the three callers' adapters are `(v, i) => v.configure(i)` verbatim |
| `LensSession.move` | `store.set(next)` | `move` is `if (next === store.getSnapshot()) return; store.publish(next)`, which is `set`'s exact definition (`ExternalStore.ts:93–97`). `choose` arms `armed` after its own `next === current` early return, so `store.set(next)` there is equivalent too |
| `useLens` one fact two ways | pass the snapshot `instances` or the store, not both | read-only change in `useLens.ts`/`QuestionsPanel.tsx:114–118` |
| `DockFrame` stop-ledger twice | one local helper in `DevtoolsDock.tsx` | no API |
| `useTimeline` per-render inputs record (`useTimeline.ts:70`) | `useMemo(() => ({ source, capacity }), [source, capacity])` | `useConfigured`'s layout effect depends on `[value, inputs]`, so a fresh record re-runs `configure` every render; it is a no-op today only because `sameFields` absorbs it. `useMemo` is already imported across the package |

## Installation

```bash
# Nothing to install. Verify the lock still resolves what this file read:
pnpm ls effect @effect/atom-react react react-dom vitest happy-dom --depth -1
```

## Alternatives Considered

| Recommended | Alternative | When the alternative is better |
|-------------|-------------|--------------------------------|
| 82: `reset()` + reseed in the deferred cleanup, one ref-held registry | `useScoped`-style state-held registry rebuilt on reveal | Never here: children's effects run first against the stale context (reproduced), and the first pass would be `undefined` (breaks SSR/hydration seeding) |
| 82: `reset()` + reseed | Dispose only on the real unmount | Only if React ever exposes "hidden vs gone"; it does not in 19.3.1 |
| 82: `reset()` + reseed | Drop the registry's disposal entirely (no reset) | If in-flight port reads on a hidden provider are acceptable; they are not (fibers would run for an invisible tree) |
| 81: shared `runCollecting` in `ExternalStore.ts` | A fourth hand-written try/catch loop in `DockModel.ts` | Never: it restates ADR-QD-177's rule a third time, the drift this file's header already warns about |
| 83: fold as a pure function + the feed's existing `view` store | Keep `DiagnosticsStore` and only trim `marking` | Only if an external subscriber of the store appears; none does (ADR-QD-173; only its own test subscribes) |
| 84: `store.set` | Keep `move` | Never: it is `set` restated |

## What NOT to Use

| Avoid | Why | Use instead |
|-------|-----|-------------|
| Any new npm dependency (state libs, `use-effect-event` shims, `immer`, an Activity polyfill) | Nothing in the four phases is missing; the quality gate is "no new dependency unless unavoidable" and none is | The installed set above |
| `registry.dispose()` on a provider cleanup (82) | Terminal; React re-runs effects on reveal against the old closure and children subscribe to the old registry | `reset()` + reseed |
| `registry.disposed`, `dispatcher`, `nodes` (82) | Not on the `AtomRegistry` interface; couples to `RegistryImpl` | `ensureNode`, `reset`, `subscribe` only |
| `AtomRegistry.make` `scheduleTask` / `defaultIdleTTL` (82) | Off limits (AGENTS.md §13, ADR-QD-148): rerouted dispatch dropped a required render | today's `make({ initialValues })` |
| `useState`/`useEffect` for decisions, or for the registry to rebuild it (82) | AGENTS.md §13 and the child-effect ordering above | the ref-held registry |
| `Effect.orDie`, `as`, `any`, `switch (_tag)` in the new collect helper / fold | House rules §4–§6 | `Match.tagsExhaustive`, typed generics |
| `Date.now()`, `new Date()`, `setTimeout` in the model code (81/83) | House rules §6; tests use `TestClock` | `Clock`, `TestClock`; the only `setTimeout` is the existing React cleanup deferral in `QadiProvider.tsx` |
| `catchTags({…})` object form | House-style gate | array-form `Effect.catchTag([...], …)` |
| Exporting `throwCollected`/`runCollecting`, `sameFields`, `DiagnosticsStore` from a barrel | `ExternalStore.ts` is deliberately barrel-free; `exports` map is closed (ADR-QD-099) | named import from `./ExternalStore.ts` inside the package |

## Stack Patterns by Variant

**If a phase's RED test is on a hidden/revealed React tree (82):**
- Render a hoisted constant element inside `<Activity mode>` toggled by parent state, include a `<Can>` consumer, hide, wait **more than one macrotask** (real timers `await new Promise(r => setTimeout(r, 20))` or fake timers advanced), then `await act(async () => setMode("visible"))`.
- Because a stable element gives no re-render on reveal, and an unstable one (re-created each parent render) re-renders and hides the defect. P4 in `QadiProvider.sweep.test.tsx:136` hides and shows in one tick, so it passes on the defective code.

**If a phase touches the dock `configure` (81, then 83):**
- Subscribe a throwing listener on each store (`explorer`, `simulation`, `dock`, `roles`, `questions`, `services`, `diagnostics`) in turn, `configure`, and assert (a) every later step ran, (b) the thrown value reaches the caller (one: itself; two: `AggregateError` in call order), (c) an identical `configure` does not need to heal.
- 83 follows 81 and edits the same block, so land 81's `runCollecting` first (the roadmap's serial order is right, and nothing in this stack argues for relaxing it).

## Version Compatibility

| Package | Compatible with | Notes |
|---------|-----------------|-------|
| `effect@4.1.2` | `@effect/atom-react@4.1.2`, `@effect/vitest@4.1.2` | Same release train; `AtomRegistry` import path is `effect/reactivity/AtomRegistry` |
| `react@19.3.1` | `react-dom@19.3.1`, `@types/react@19.3.0`, `@testing-library/react@16.3.3` | Peer floor `>=19.2.4`; `Activity` effect semantics above verified on 19.3.1 only. The behaviour that matters (cleanup on hide, effect re-run on reveal with the last committed closure) is the documented model of Activity, but is reproduced here only on 19.3.1: re-check if the floor is ever raised or the catalog moves |
| `vitest@5.1.0` | `happy-dom@21.0.4`, `@vitest/coverage-v8@5.1.0` | `packages/react` runs `environment: "happy-dom"`; devtools model tests are DOM-free |
| `typescript@7.0.2` | tstyche `.tst.ts` pins | Phase 84's constraint type is a candidate for a positive type pin; a negative one is budgeted (`NOT_CALLABLE_PIN_BUDGET`) |

## Sources

- `node_modules/effect/src/reactivity/AtomRegistry.ts` lines 133–160, 472–520, 605–630, 727–750 — `make`, `reset`, `dispose`, `createNode` (HIGH, installed 4.1.2)
- `node_modules/@effect/atom-react/src/RegistryContext.ts` lines 47–112 — upstream `RegistryProvider` shares the dispose pattern (HIGH, installed 4.1.2)
- `packages/devtools/src/model/ExternalStore.ts` — full read; `throwCollected` is module-private (HIGH)
- `packages/devtools/src/model/DockModel.ts` 335–431, `DiagnosticsFeed.ts`, `DiagnosticsStore.ts`, `LensSession.ts` 140–180, `react/useConfigured.ts`, `useScoped.ts`, `useDockModel.ts`, `useDiagnostics.ts`, `useTimeline.ts`; `packages/react/src/QadiProvider.tsx` 190–320 (HIGH)
- Probes, throwaway, deleted: (1) plain React Activity hide/reveal logging effect closures, stable and hidden-re-render variants, StrictMode on and off; (2) real `QadiProvider` + `<Can>` hidden past a macrotask then revealed, which yields an `AggregateError` of two disposed-registry errors, one at `QadiProvider.tsx:258`; (3) `AtomRegistry` `reset` then `ensureNode().setInitialValue`, and `dispose` then `get`/`subscribe`/unsubscribe (HIGH, first-hand reproduction)
- `/private/tmp/claude-502/.../scratchpad/wave15-brief.md` — the four candidates and reproductions (HIGH, project-internal)

---
*Stack research for: v1.10 Arch Wave 15 (internal; no stack change)*
*Researched: 2026-11-24*

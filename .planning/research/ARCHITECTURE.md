# Architecture Research: v1.10 Arch Wave 15 (Phases 81-84, ARCH-128..131)

**Domain:** internal architecture deepening of an Effect v4 authorization monorepo (`@qadi/devtools`, `@qadi/react`)
**Researched:** 2026-11-24
**Confidence:** HIGH on code facts (every file:line below was read on `arch-wave-15`), MEDIUM on Phase 82's
recycle semantics until its RED tests run (the throwaway repro was run, the fix was not)

Question answered: how each of Phases 81-84 integrates with the existing architecture, with 2-3 candidate shapes
each, the recommended (most complete, not smallest) shape, what modules change, which spec records move, which
house-style budgets and gates it touches, whether a public export changes, and the build order.

## System Overview (the parts this wave touches)

```
 @qadi/react                                   @qadi/devtools
┌───────────────────────────────┐    ┌──────────────────────────────────────────────────────────┐
│ QadiProvider.tsx   (82)       │    │ react/  (client shell)                                   │
│  registry ref + setTimeout(0) │    │  DevtoolsDock.tsx DockFrame (84)   useLens.ts (84)       │
│  dispose, 3 effects           │    │  useConfigured.ts (84)  useDockModel/useTimeline/        │
│        │                      │    │  useDiagnostics (84)    QuestionsPanel.tsx (84)          │
│  RegistryContext + QadiContext│    ├──────────────────────────────────────────────────────────┤
│        │                      │    │ model/  (headless, Stryker-mutated, DockModel.ts score 1)│
│  hooks.ts, useGate.ts,        │    │  ExternalStore.ts  (81: callAll)                         │
│  DevtoolsFeed.ts (read        │    │  DockModel.ts      (81: configure, rail; 83: merge key)  │
│  registry via context)        │    │  DiagnosticsFeed.ts + DiagnosticsStore.ts (83)           │
└───────────────────────────────┘    │  LensSession.ts (84)   TimelineFeed / GatesFeed (read)   │
                                     └──────────────────────────────────────────────────────────┘
 spec/ (normative): decisions, behaviors, invariants, README CCR rows, overview, traceability
 gates: house-style budgets, 10 verify-traceability, 12 devtools claims, 13 api surface, 14 package install
```

### Component Responsibilities (current, with the line each phase edits)

| Component | Responsibility | Phase | Where |
|-----------|----------------|-------|-------|
| `ExternalStore.ts` | listener set + `notify` (calls every listener, rethrows what threw, ADR-QD-177) and `makeDerivedStore` | 81 | `throwCollected` :63, `notify` :73-83, derived finalizer :204-217 |
| `DockModel.ts` | the dock's stores and the rules between them; one `configure` | 81, 83 | `spread` :342-347, timeline listener :351-356, join key :378, `configure` :403-431 |
| `DiagnosticsFeed.ts` | the poll's run, status and one published snapshot | 83 | `store` :169, `marking` :189-200, `off()` :206-211 |
| `DiagnosticsStore.ts` | reading types, `mergeReading`, options, the store (`accept` :163-189) and `runDiagnostics` (:238-260) | 83 | `questions` :87, `questions: undefined` :252 |
| `QadiProvider.tsx` | the registry's owner: lazy ref :217-223, subject effect :257-261, deferred dispose :285-299 | 82 | |
| `useConfigured.ts` | scoped build plus configure with the latest inputs (ADR-QD-192 d8) | 84 | :22-31; callers `useDockModel.ts:30`, `useTimeline.ts:71`, `useDiagnostics.ts:44` |
| `LensSession.ts` | headless lens session (ADR-QD-193) | 84 | `move` :149-152, `choose` :167-175 |
| `useLens.ts` / `QuestionsPanel.tsx` | document adapter / panel | 84 | `useLens` :39-43, `QuestionsPanel.tsx:117-118` |
| `DevtoolsDock.tsx` `DockFrame` | toolbar + screen; owns the two stop ledgers | 84 | :116-128 |

## Phase 81: the dock's `configure` applies every input whatever a listener throws (ARCH-128, live defect)

**Root cause (read, not assumed).** `configure` guards one call (`timelineFeed.configure`) with `try`; the
`finally` runs `spread` (three sequential calls, :342-347), `roles.setList`, `simulation.setPorts`,
`gatesFeed.configure`, `diagnosticsFeed.configure`, `shownReading.refresh` in plain sequence. Each of those can throw,
but only *from a listener on a publish it has already made*: every store holds the new value before listeners run
(ADR-QD-177 d4). So a throw skips the *remaining* steps and a second throw in a `finally` replaces the first. An
identical `configure` heals nothing because `before.catalogue` now equals `wanted.catalogue` (:416) and the feeds'
`sameFields` rule returns early. The same loop-try-collect-rethrow already exists twice in `ExternalStore.ts`
(`notify` :73-83, the finalizer :204-217) around the private `throwCollected` (:63): `configure` would be the third
copy.

Second, separate smell: the timeline listener (:351-356) and the `finally` (:416-419) both call `spread` when capacity
and catalogue change together, so `catalogueOf` runs twice. `explorer.setSightings` dedupes (`choice.setList` ->
`sameElements`, `ExplorerSession.ts:253-254`), so only compute is wasted, but it is also why the existing repro looks
half-healed in one case.

### Candidate shapes

| | Shape | Trade-off |
|---|-------|-----------|
| 81-A | A per-step guard local to `DockModel.ts` (`const settle = (step) => { try … catch push }`, then `throwCollected`) | Smallest. Writes the "call all, rethrow collected" rule a third time; `spread`'s own three calls still need it; `DockModel.ts` is under the mutation score of 1 (ADR-QD-168), so a hand-written copy needs its own tests. |
| 81-B | One exported `callAll(calls: Iterable<() => void>, message)` in `ExternalStore.ts`; `notify` and the derived finalizer are rewritten on it; `configure` becomes an ordered list of idempotent steps | The contract is stated once (ADR-QD-177 widened from "listeners" to "a run of calls"). `notify` must keep iterating the **live** `Set` (a listener added mid-pass is called in the same pass), so the parameter is an `Iterable`, never a copied array. Leaves `spread` and the double-spread as they are unless also fixed. |
| 81-C (**recommended**) | 81-B, plus the rail (`catalogueOf(shown, catalogue)`) becomes the model's fourth **derived store** (parent: `timeline`; key `{ shown: timeline.getSnapshot(), catalogue: held.catalogue }`; built first, right after the timeline feed), with `explorer.setSightings` and `simulation.setSightings` as its two listeners and `dock.setTimeline` as a separate timeline listener | Fixes the double `spread` by construction (a derived store recomputes only when a key field moved, BEH-QD-696), makes `spread`'s three calls separate listeners that `notify` already protects, deletes the `shown`/`rail` closure variables and the `if (next === shown) return` identity guard, and finishes ADR-QD-185 ("computed stores are derived stores"; INV-QD-390 forbids a last key in `DockModel.ts`). Cost: amends ADR-QD-185 / BEH-QD-699 / INV-QD-390 wording ("three" -> "four" computed stores; the rail is internal, not a `DockModel` member, so BEH-QD-700's list of ten is unchanged). |
| 81-D | Restructure `configure` into data (`steps: ReadonlyArray<Step>` built once) | Same as the step list in 81-B/C; not an alternative, only a presentation. |

### Recommended `configure` after 81-C (shape, not final code)

```ts
const wanted = completeDockInputs(next);      // a refused capacity throws here, before anything moves (M55)
held = wanted;                                // assigned before the timeline publishes: the rail reads held.catalogue
const fed = feedInputsOf(wanted);
callAll(
  [
    () => timelineFeed.configure(fed.timeline),      // publishes the resized timeline -> rail refresh (once)
    () => rail.refresh(),                            // catalogue-only change; a no-op when the step above did it
    () => roles.setList(wanted.catalogue?.roles ?? NO_ROLES),   // idempotent: HeldChoice.setList dedupes
    () => simulation.setPorts(wanted.ports),
    () => gatesFeed.configure(fed.gates),            // before the shown reading refreshes (join reads through it)
    () => diagnosticsFeed.configure(fed.diagnostics),
    () => shownReading.refresh(),
  ],
  "More than one of the dock's inputs threw.",
);
```

`before` and the `wanted.catalogue !== before.catalogue` branch disappear: every step is idempotent, which is what
makes the list safe to run whole. Order is the current order and must stay (gates before the shown reading, ADR-QD-185).

### What changes

| Kind | Module | Change |
|------|--------|--------|
| modified | `packages/devtools/src/model/ExternalStore.ts` | add `callAll` (package-private, not in either barrel); `notify` and the finalizer call it; the two existing messages stay byte-identical (pinned by BEH-QD-656 tests); `throwCollected` may become private to `callAll` |
| modified | `packages/devtools/src/model/DockModel.ts` | rail as derived store; `configure` as above; header comment (:15-20) restated |
| modified | `packages/devtools/test/model/ExternalStore.test.ts`, `DockModel.test.ts` (M56 at :481 stays, as is), `ConfigureRule.test.ts` | RED first (see below) |
| none | feeds, sessions, hooks, barrels | no public type changes |

**RED tests to open the phase (seen failing on the phase base):** one per step (an explorer, simulation, dock, roles,
questions, services and diagnostics listener that throws, each leaves every later input applied); two throwers surface
as one `AggregateError` in step order, not the later one alone; the repro of the brief (`explorer` throws, `configure({capacity:5, catalogue})` leaves `roles` `[]`);
capacity+catalogue together notify the explorer once; M55 and M56 pass unedited.

**Boundary the spec must state, not hide.** ADR-QD-177 d5's window stays out of scope: a throw on the `Starting`
publish inside `diagnosticsFeed.configure` leaves that feed `Starting` with no poll forked, and an identical
`configure` does not start it (only `restart` does). 81 guarantees "every *other* input is applied and what threw is
rethrown once", not "an identical configure heals the feed's own window". Also leave `TimelineFeed.configure`'s
`try/finally` as is: TF29 pins its replacement behaviour inside that window on purpose.

### Spec registers

| Register | Action |
|----------|--------|
| ADR | **new ADR-QD-194** "A configure applies every input whatever a listener throws"; amends ADR-QD-177 (the rule is now "a run of calls", d1-d4 unchanged), ADR-QD-191 d11 (the `try`/`finally` sentence), ADR-QD-192 d3 (same sentence), ADR-QD-185 (fourth derived store, if 81-C) |
| BEH | new BEH-QD-741.. in `spec/behaviors/28-devtools-screens.md` (configure applies every input; the throws surface once; one `spread` per change); amend BEH-QD-656, BEH-QD-699 (and BEH-QD-728's pinned-by line, which names the `finally`) |
| INV | new INV-QD-407 (a dock `configure` leaves no input unapplied); amend INV-QD-373 (source line names `callAll`) and INV-QD-390 (four derived stores) |
| CCR | CCR-QD-473 row in `spec/README.md`; plus `overview.md` / `traceability.md` revision rows |

### Budgets and gates

| Check | Effect |
|-------|--------|
| §5 `UNTRACED_BUDGET` / §5a `SWITCH_BUDGET` / §6 `ANY_BUDGET`, `HAS_CUSTOM`, `PORT_DOUBLE`, `METRIC_ID`, `SPAN_KEY` | none move: `callAll` is a plain function, the new `makeDerivedStore` call sits inside the existing `Effect.fn`, no `switch` |
| `MODULE_STATE_BUDGET` | must not grow: `held`, the rail variables stay function-scoped inside `makeDockModel` |
| `NOT_CALLABLE_PIN_BUDGET` | no new negative pin needed |
| gate 13 (api surface), gate 14 (package install), gate 12 (devtools claims) | unmoved: no export changes; run as usual |
| Stryker devtools (`stryker.devtools.mjs`, `model/**`) | baseline `ExternalStore.ts` and `DockModel.ts` at the phase base (DockModel must stay 1.0 per ADR-QD-168); re-close after review; a drop is answered with a test |

**Public export change:** none. **Changeset:** `@qadi/devtools` **patch** (live defect fix, like
`devtools-every-listener-is-called.md`). **Upgrade guide:** none (patch).

## Phase 82: a provider's registry has one owner for its lifetime (ARCH-129, live defect)

**What the code does.** The registry is built lazily into a ref during render (:217-223). The `[registry]` effect
(:286-299) disposes it from a `setTimeout(0)` in its cleanup and clears the ref; a re-run of the effect only clears
a *pending* timer (:289-292). So hide longer than a macrotask disposes the registry, and the closure's `registry`
stays disposed. If the provider **re-renders** on reveal, the ref is empty and a new registry is built (the repro S2
sees two registries and shows `allowed`). If it does **not** re-render (stable children, parent toggles `Activity`
mode), every effect re-runs against the disposed one.

**Verified by running the existing untracked throwaway `packages/react/test/zzThrowaway82.test.tsx` (read-only):** S1
(stable element, hidden past one tick, shown) records **two** errors, "Cannot access Atom {keepAlive: false}: registry
is disposed" first and "{keepAlive: true}" second. The first is a **child's** decision-atom subscription
(`@effect/atom-react` `useSyncExternalStore` subscribe -> `registry.subscribe` -> `ensureNode` -> `createNode`
throws on a disposed registry, `AtomRegistry.ts:619`); the second is the provider's subject effect at :258.
React runs reveal effects **children first**. This single fact decides the design: **a fix that revives or replaces
the registry inside the provider's own effect is too late**, because the consumers below it have already subscribed to
the disposed one. The brief's `QadiProvider.tsx:258` is only the second throw.

Further facts that constrain the shape: `AtomRegistry.dispose()` is `disposed = true; reset()` (:746-749); `reset()`
alone (:727, on the public `AtomRegistry` interface :88) removes every node, cancels timeouts, runs finalizers, and
leaves a **usable** registry; the `disposed` flag is not on the public interface. The `subject` atom is `keepAlive`
(BEH-QD-067's note, `09-react.md:380-390`), so it survives a reset only if re-seeded. The provider must render with the
registry on the server (`ServerRender.test.tsx`, the subject "seeded at registry construction so the first render
already has it").

### Candidate shapes

| | Shape | Verdict |
|---|-------|---------|
| 82-A | `useScoped`-like: registry built in a layout effect, held in state, cleared on cleanup (devtools' `useScoped.ts:20-46`) | **Rejected.** Renders nothing on the first/server pass (SSR, hydration seeds and the "first render already has the subject" rule die), and still hits the children-first ordering on reveal. `useScoped` fits a dock model that is client-only; a provider is not. |
| 82-B | State-held registry built in render, rebuilt in the provider's effect when found disposed (`useState` + `setRegistry`, or a `useSyncExternalStore` lease that notifies) | **Rejected.** SSR-safe but too late: children's reveal effects run first on the disposed registry and throw (S1's first error). Also changes the context value, so every consumer re-renders and `useDevtoolsFeed`'s `useMemo([atoms, registry])` rebuilds its layer. |
| 82-C | Keep alive while hidden: never dispose on cleanup; rely on GC | **Rejected as the whole answer.** Hide and unmount are the same effect cleanup, so "dispose on unmount only" cannot be written; dropping disposal pins a hung in-flight evaluation (fibers `reset()` interrupts) to a dead registry. |
| 82-D | A registry proxy that revives on first touch | **Rejected.** `RegistryContext` needs the whole ~15-method interface, and subscriptions made on the old nodes are lost on revive. |
| 82-E | Recycle in place, inline: cleanup schedules `registry.reset()` then re-seeds the subject; setup cancels it | Correct, smallest. Lifetime policy stays spread over a ref, a timer and three effects in a 320-line component that Stryker does not mutate (`stryker.react.mjs` lists four files). |
| 82-F (**recommended**) | 82-E behind a pure, package-private **`RegistryLease`** module (`packages/react/src/RegistryLease.ts`), the `SweepScheduler.ts` precedent: injected scheduler, no React, added to `stryker.react.mjs`'s `mutate` list | The registry's identity is stable for the provider's whole life, so `RegistryContext`/`QadiContext` values never change on hide/show, nothing below the provider ever sees an unusable registry (children-first order stops mattering), no re-render and no rebuild. One owner, tested without rendering (AGENTS.md §13 "test the graph, not the DOM"), and mutation-gated. |

### Recommended design (82-F)

```ts
// RegistryLease.ts (sketch)
export interface RegistryLease {
  readonly registry: AtomRegistry;            // built once, in the lease's constructor, usable at render and on the server
  readonly hold: () => () => void;            // effect setup: cancels a pending recycle; the returned release schedules one
}
export const makeRegistryLease = (options: {
  readonly make: () => AtomRegistry;          // seeds subject + initialValues, as today
  readonly reseed: (registry: AtomRegistry) => void;   // what a recycled registry holds: the latest subject, nothing else
  readonly defer?: (run: () => void) => () => void;    // default: setTimeout(0) with clearTimeout; tests inject a manual one
}): RegistryLease
// release -> defer(() => { registry.reset(); reseed(registry); })
```

- **Provider:** `const lease = (leaseRef.current ??= makeRegistryLease({...}))` (a lease is side-effect free, so the
  lazy ref is as safe under StrictMode as today's); `useEffect(() => lease.hold(), [lease])` replaces :285-299; the
  subject effect stays but can never meet a disposed registry; `value`'s memo dependencies are stable. `reseed` reads
  the latest `atoms.subject` and subject from refs written during render, the pattern `signalRef` already uses (:209-210).
- **After a recycle only the subject is seeded.** `initialValues` (the server's hydration seeds) are the first mount's:
  re-seeding them after a hide would resurrect an answer the client may have superseded (ADR-QD-017). Note today's
  *re-render* path (S2) does re-seed them; this is a recorded, intentional change. Decided autonomously (owner
  instruction 2026-11-22: most complete, cleanest option).
- **Unmount** recycles instead of disposing: the registry is then empty and unreachable (reset cancels timers and runs
  finalizers). `dispose()`'s only extra effect, a loud throw on late use, was the defect's symptom. State this in the ADR.
- **What a recycle costs:** decisions cached while visible are re-evaluated after a hide longer than a macrotask, and
  `reset()` fires `onNodeRemoved`, so the atom set's eviction accounting runs: the sweep, if it fires, is forked from
  the timer (never the render path, INV-QD-316). P4 (`QadiProvider.sweep.test.tsx:136`, hide/show inside one tick)
  must pass unedited: a release cancelled by the next hold recycles nothing.

### What changes

| Kind | Module | Change |
|------|--------|--------|
| **new** | `packages/react/src/RegistryLease.ts` | the lease; out of the barrel (AGENTS.md §9) |
| **new** | `packages/react/test/RegistryLease.test.ts` | headless: hold/release/hold in one tick recycles nothing; release past the timer recycles once and re-seeds only the subject; unmount recycles; a throwing `make` is not cached |
| modified | `packages/react/src/QadiProvider.tsx` | :217-223 and :285-299 replaced; header doc gains the lifetime paragraph |
| modified | `packages/react/test/QadiProvider.sweep.test.tsx`, `edges.test.tsx` (:257 "disposes its registry when unmounted" is renamed, it pins only an empty DOM), `QadiProvider.subject.test.tsx` | new provider tests, RED on the base: S1 (stable element, hidden past one tick, shown: no error, `allowed`, one registry identity), the same with a subject changed while hidden (S4), under StrictMode, a `useDevtoolsFeed` consumer under hide/show, bound holds after a long hide (sweeps counted via `withSweepFork`) |
| modified | `stryker.react.mjs` (`mutate`), `spec/process/definitions-of-done.md` row 22 text (names only two of the four files already; update it with the fifth if gate 11 wants the prose in step) | baseline the lease after the phase's first green, then re-close |

### Spec registers

| Register | Action |
|----------|--------|
| ADR | **new ADR-QD-195** "A provider's registry has one owner and is recycled, not disposed, when its effects are cleaned up"; amends ADR-QD-014 (its consequence "defers disposal past a development-mode double mount", :119), ADR-QD-149 (:52, :101 "until it is disposed"), ADR-QD-148 only by citation (sweep untouched) |
| BEH | new BEH-QD-746..; amend **BEH-QD-067** (`09-react.md:334` "MUST NOT dispose it across React's development-mode double mount": add the Activity case) and the SUBJ note (:380-390 "until the provider's registry is disposed") |
| INV | new INV-QD-409 (a registry a consumer can reach is never unusable); `spec/appendices/react-integration.md:140` ("disposes it on unmount") restated |
| CCR | CCR-QD-474 |

### Budgets and gates

`MODULE_STATE_BUDGET` must not grow (the lease's state is closure-local; the one budgeted name stays
`DeveloperSignals.ts`'s latch). No `Effect.fnUntraced`, no `switch`, no `any`. `setTimeout` is not in AGENTS.md §6's
forbidden list and the provider already uses it. §13 holds: the lease owns infrastructure, never a decision, and adds
no dependency. Gate 13: `QadiProvider`'s exported surface is unchanged (`QadiContextValue.registry` is the same
type, its identity is now stable). Gate 14 and gate 12 unmoved. Stryker react gains one file.

**Public export change:** none. **Changeset:** `@qadi/react` **patch** (a hidden provider no longer throws on reveal;
hydration seeds are not re-applied after a re-render that follows a long hide). **Upgrade guide:** none.

## Phase 83: the diagnostics feed holds its reading as a value (ARCH-130)

**What the code does.** `DiagnosticsStore.ts` is an `ExternalStore` plus a per-field keep-if-equal `accept`. After
ADR-QD-173 only `DiagnosticsFeed.ts` uses it (:27-33), and nothing subscribes to it outside its own test. The feed
wraps it in a three-member `marking` (:189-200) so `runDiagnostics` can hand a reading to `accept`; `off()` replaces
the store (:208) instead of resetting a value; and `runDiagnostics(store, options)` (:238-260) takes the whole store
though it calls only `store.accept`, where `runSource` takes `Pick<TimelineStore, "accept">`.

`Diagnostics.questions` (:87) is documented "`undefined` unless a supplied reading carries questions". The poll
writes `questions: undefined` (:252) and the store folds it (:175); `mergeReading` copies a supplied one in (:143);
but nothing in `packages/devtools/src` reads `reading.questions` of the *shown* reading: the dock's join reads the
**host's input** directly (`held.reading?.questions`, `DockModel.ts:378`). One fact, two paths, one of them dead.

### Candidate shapes

For the feed:

| | Shape | Trade-off |
|---|-------|-----------|
| 83-A | Keep the store, delete only `marking` and the unused `subscribe` | Leaves a store whose `getSnapshot` is the feed's second source of truth next to `view`. |
| 83-B (**recommended**) | The feed holds `let reading: Diagnostics` and folds with one pure `foldReading(current, next)` (per-field `Equal.equals` keep, returns `current` itself when no field moved, decided by `sameFields`); `off()` is `reading = noDiagnostics`; `accept` is a closure per run token; `runDiagnostics(sink, options)` takes `{ accept }` | Removes `makeDiagnosticsStore`, the `DiagnosticsStore` type, `marking`, `target`/store replacement and the hand-written 5-way `===` chain. `foldReading` is the mutation-measured home of the rule; `mergeReading` can use the same hold-if-same helper so there is one keep-if-equal rule. A reading is kept across `restart()` and reset only by `Off`, as today (the Stopped panel shows the last reading). |
| 83-C | A bare `(reading) => void` instead of `{ accept }` | Equally small; rejected only for symmetry with `runSource`'s `Pick<…,"accept">` (state this in the ADR). |

For `Diagnostics.questions`:

| | Shape | Trade-off |
|---|-------|-----------|
| Q1 (**recommended**) | Remove `questions` from `Diagnostics`; keep it on `DiagnosticsReading` (what a host may supply), documented as reaching the Questions join, not the shown reading. `noDiagnostics`, the poll, the fold and `mergeReading` handle four fields | Truthful and smallest type surface; no new names. **Breaking** type change for `@qadi/devtools` (a reader of `Diagnostics["questions"]`, or a literal with it). Runtime was always `undefined` for every public consumer (`useDiagnostics`, a built feed). |
| Q2 | Keep the field as is, make the join read it via the shown reading | Non-breaking, but keeps a field the poll never writes in the feed's fold and in `noDiagnostics`; the join key then depends on the merge. |
| Q3 | Split `SampledDiagnostics` (four fields, the feed's) from `Diagnostics` (five, merged) | Most type-precise, but adds a public name and splits `DiagnosticsSnapshot`/`DiagnosticsReadout` (both are shared by feed and dock readouts), for a field that the merged reading has no reader of. |

Module naming: after 83 `DiagnosticsStore.ts` holds no store. Rename it to **`Diagnostics.ts`** (parallels `Catalogue.ts`,
`Hydration.ts`, `Wiring.ts`), rename `test/model/DiagnosticsStore.test.ts` / `.tst.ts` with it. The rename costs
about 20 import lines (src: `DiagnosticsFeed`, `DockModel`, `Gates`, `GatesFeed`, `PortCards`, `index.ts`,
`react/useDiagnostics.ts`, `react/DevtoolsDock.tsx`, `react/index.ts`; tests: ~12 files) and keeps the name honest.

### What changes

| Kind | Module | Change |
|------|--------|--------|
| renamed + modified | `model/DiagnosticsStore.ts` -> `model/Diagnostics.ts` | delete `DiagnosticsStore`, `makeDiagnosticsStore`; add `foldReading`; `runDiagnostics(sink, options)`; drop `questions` from `Diagnostics`/`noDiagnostics`/`mergeReading` |
| modified | `model/DiagnosticsFeed.ts` | value-held reading; `marking`, store replacement and `target` gone |
| modified | `model/DockModel.ts` | `MergeKey`/`mergedOf` import path; the join keeps reading `held.reading?.questions` |
| modified | `src/index.ts`, `src/react/index.ts` | re-export paths only; no name added or removed |
| modified | tests | `DiagnosticsStore.test.ts` splits: the `accept` identity cases become `foldReading` tests, the `subscribe` test goes, `runDiagnostics` tests pass `{ accept }`; `test/surface.tst.ts:244-265` keeps its `@ts-expect-error` rows (`makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics`) and may drop the `DiagnosticsStore` type row (a name that no longer exists in any module) |

**RED to open with:** a characterisation of the feed's observable sequence on the phase base (Off -> Starting -> Live
-> Stopped keeping the reading -> restart keeps it -> `configure(undefined)` resets it; one publish per transition;
an unchanged sample publishes nothing), which must hold across the rewrite; `Diagnostics` has no `questions`
(`.tst.ts`: `expect<Diagnostics>().type.not.toHaveProperty("questions")`, with its positive twin).

### Spec registers, budgets, gates

| Check | Effect |
|-------|--------|
| ADR | **new ADR-QD-196** "The diagnostics feed holds its reading as a value"; amends ADR-QD-173 (the engine-pair paragraph; d2's "modules stay as the feeds' engines"), ADR-QD-169 (the "poll samples none" sentence), ADR-QD-047 by citation |
| BEH / INV | new BEH-QD-751..; amend BEH-QD-323 (merge rule), BEH-QD-639, BEH-QD-699 (key text); INV-QD-314 (shown reading) and INV-QD-366 cite the new file; new INV-QD-411 |
| CCR | CCR-QD-475; `traceability.md` rows 579-580 (the two test files) and `overview.md` rows 916-923 (file path text, and `Diagnostics` without `questions`) |
| **`NOT_CALLABLE_PIN_BUDGET`** | **moves.** `packages/devtools/test/model/DiagnosticsStore.tst.ts` (3 callable pins on `runDiagnostics`, `check-house-style.mjs:771`, AGENTS.md §6 table :566) is renamed with the file: edit both together; the three `Params<typeof runDiagnostics>` pins keep their subject text and their positive twin (`[not-callable-control]`), so the count stays 3 if the pins are rewritten to the sink parameter |
| gate 13 | no name added or removed; prose paths in `overview.md` move. `surface.test.ts` unchanged |
| gate 14 | must run (packs and compiles `makeDiagnosticsFeed`); the consumer never reads `Diagnostics.questions` (checked) |
| gate 12 | `spec/devtools-spec/` has no claim naming the store or `questions` (grep clean); re-run |
| Stryker devtools | baseline `DiagnosticsStore.ts`, `DiagnosticsFeed.ts`, `DockModel.ts` at the base; the new file keeps the old file's score; re-close after review |
| `MODULE_STATE`, `UNTRACED`, `SWITCH` | none move (`noDiagnostics` is a `const`) |

**Public export change:** yes, type-level only: `Diagnostics` loses `questions` (and with Q1 nothing else).
**Breaking `@qadi/devtools` minor changeset** and a `## 0.13: Diagnostics has no questions` section in
`apps/website/src/content/docs/docs/reference/upgrading.md` (read your supplied questions from your own
`DiagnosticsReading`; `mergeReading` no longer carries them). The section is checked by
`check-website-doc-examples.mjs` if it has a fence.

## Phase 84: `useConfigured` and the small finds (ARCH-131)

Five independent items. None changes a public export (`useConfigured`, `useLens`, `LensSession`, `DockFrame` are all
package-private, `surface.tst.ts` pins their absence).

| # | Item | Candidate shapes | Recommendation |
|---|------|------------------|----------------|
| 1 | `useConfigured(make, configure, inputs)` with three identical adapters (`useDockModel.ts:20-26`, `useTimeline.ts:44-46`, `useDiagnostics.ts:19-21`) | (a) constrain the value: `useConfigured<A extends { configure(inputs: I): void }, I>(make, inputs)`; (b) keep the adapter parameter and share one `(v, i) => v.configure(i)` constant (a rename of the problem); (c) fold `configure` back into the constructors (refused by ADR-QD-192 d1) | **(a).** Contravariant `configure` parameters keep `DockModelInputs`, `TimelineFeedInputs` and `DiagnosticsOptions \| undefined` all assignable. Deletes the three adapters; `useConfigured`'s doc and ADR-QD-192 d8 say "a value that has `configure`". Optional negative type pin ("a value without `configure` is refused", plain-return so a bare pin is valid) costs a `NOT_CALLABLE_PIN_BUDGET` row (new `.tst.ts` file: edit `check-house-style.mjs` and AGENTS.md §6 together). |
| 2 | `LensSession.move` (:149-152) and `choose`'s `publish` (:173) restate `ExternalStore.set` | (a) delete `move`, call `store.set(next)`; (b) keep | **(a).** `set` is "notify only when the reference differs", exactly `move`; `choose` keeps its `armed` write before the `set` and its boolean (`next === current` stays the return). Removes an equivalent-mutant host in a mutated file (`LensSession.ts` is in `model/`). BEH-QD-736/INV-QD-405 unchanged. |
| 3 | `useLens(lens, questions, instances)` reads one fact two ways (`QuestionsPanel.tsx:117-118`; the test at `Lens.adapter.test.tsx:53` passes it the same way) | (a) `useLens(lens, questions)` reading `useStoreSnapshot(questions)` inside, panel also reading it: two subscriptions, breaks the pinned "one subscription to the lens and one to the questions store" (traceability row 661); (b) `useLens(lens, instances)` plus a ref for the event handlers: handlers read the last render's guards, not the store's, a small freshness regression; (c) `useLens(lens, questions)` subscribes once and **returns both** snapshots, the panel reads `questions` from the return | **(c).** One path, one subscription each, handlers still read `questions.getSnapshot()` at event time, the draw effect depends on the snapshot the hook itself read. Amends ADR-QD-193's adapter paragraph and BEH-QD-737's pinned-by text. |
| 4 | `DockFrame` writes the stop-ledger ref and memoised notice twice (`DevtoolsDock.tsx:116-128`) | (a) a package-private hook `useStopNotice(status, restart)` next to `StoppedBox.tsx`, with one generic `StoppedNoticeProps<S>` replacing the structurally identical `DiagnosticsNoticeProps`/`TimelineNoticeProps` bodies; (b) leave | **(a).** `useRef(noStops)` + `useMemo([status, restart])`, called twice. The ledger stays owned by the dock frame so it outlives screens, and still records only which stop was announced (AGENTS.md §13). Cover with the existing `DevtoolsDock.test.tsx` stop tests plus one hook test. |
| 5 | `useTimeline.ts:71` builds `{ source, capacity }` every render, so the layout effect in `useConfigured` runs `configure` every render | (a) `useMemo` the record in `useTimeline`; (b) let `useConfigured` compare shallowly (breaks ADR-QD-192 d8 "decides nothing about whether an input moved"); (c) record that per-render handover is by design | **(c), as a recorded rejection** in ADR-QD-192's amendment and the CCR row. The value's own rule makes the call a no-op, and `DevtoolsDock`'s `{ unknownParents, onInvalidate, ...inputs }` (`DevtoolsDock.tsx:86`) and any host's `useDiagnostics({})` build a fresh record per render by construction, so memoising one caller buys nothing and makes the three hooks asymmetric. |

### What changes

| Kind | Module |
|------|--------|
| modified | `react/useConfigured.ts`, `react/useDockModel.ts`, `react/useTimeline.ts`, `react/useDiagnostics.ts` (adapters deleted) |
| modified | `model/LensSession.ts` (-`move`), `react/useLens.ts` (signature and return), `react/QuestionsPanel.tsx`, `test/react/Lens.adapter.test.tsx` |
| **new** | `react/useStopNotice.ts`; `StoppedNoticeProps<S>` in `react/StoppedBox.tsx`; `DevtoolsDock.tsx` `DockFrame` calls the hook twice |

### Spec registers, budgets, gates

ADR: **no new ADR needed**; amend ADR-QD-192 (d8: the hook's signature, the per-render decision) and ADR-QD-193 (the
adapter's signature). Reserve ADR-QD-197 and say it is unused, as ADR-QD-177's neighbours were. BEH: amend BEH-QD-734
and BEH-QD-737; new BEH-QD-756.. only for the hook and the lens-return contract. INV: new INV-QD-413 only if the lens
return needs one. CCR-QD-476. Budgets: `NOT_CALLABLE_PIN_BUDGET` moves only if the optional type pin is added;
`MODULE_STATE`, `UNTRACED`, `SWITCH` do not. Gates 12/13/14 unmoved. Stryker: `LensSession.ts` (model) keeps its score
(an equivalent mutant goes away). **Changeset:** none required (no user-visible change); if the owner wants a record,
a `@qadi/devtools` patch whose text says "no export changes". **Upgrade guide:** none.

## Build Order and Dependencies

```
81 ──► 82 ──► 83 ──► 84        (the owner's order; each arrow is a spec-register and file adjacency, not a code dependency)
```

| Edge | Kind | Why |
|------|------|-----|
| 81 -> 83 | **file** (`DockModel.ts`) and register adjacency | 81 rewrites `configure` and the rail; 83 edits the merge key import and `DiagnosticsFeed`. 83 does not need `callAll`, but both would conflict on `DockModel.ts` if parallel. |
| 82 -> others | **none in code** | `@qadi/react` is independent of devtools; it sits second only to keep both live-defect phases first, as the milestone states. It can swap with 81 safely. |
| 83 -> 84 | **file** | 83 renames the module that `useDiagnostics.ts` and `DevtoolsDock.tsx` import; 84 edits both files. Doing 84 first would just re-touch the import lines. |
| every phase | **register** | every records plan edits `spec/README.md` (CCR), `spec/overview.md`, `spec/traceability.md`, `spec/behaviors/28-devtools-screens.md` or `09-react.md`, `spec/invariants.md`, `decisions/index.yaml`, so the phases cannot run in parallel (`use_worktrees` is false; the Wave 14 rule). |

Each phase opens with its RED test seen failing on the phase base (81: the throw-per-step table and the brief's repro;
82: S1; 83: the feed sequence characterisation; 84: the existing suites must pass unedited, there is no live defect),
measures the Stryker baseline of each touched model file first, and re-closes it after the three-iteration review.

**Numbering (reserve once, never run `node scripts/next-id.mjs` while executing; every call writes a reservation).**
Next free on this branch: ADR-QD-194, CCR-QD-473, BEH-QD-741, INV-QD-407. Suggested block, same shape as Wave 14:

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 81 | 128 | 194 | 473 | 741-745 | 407-408 |
| 82 | 129 | 195 | 474 | 746-750 | 409-410 |
| 83 | 130 | 196 | 475 | 751-755 | 411-412 |
| 84 | 131 | 197 (likely unused) | 476 | 756-760 | 413-414 |

(The shared reservation file `.git/qadi-reserved-ids.json` should then be set to CCR 476, ADR 197, BEH 760, INV 414.
During this research I ran `node scripts/next-id.mjs` once per kind by mistake, which advanced that file by one each,
and I restored it to its prior values CCR 472, ADR 193, BEH 740, INV 406; nothing else was touched.)

## Data and Lifetime Flow Changes

```
81  configure(next) ──► complete (refusal throws, nothing moved) ──► held = wanted
        ──► callAll[ timelineFeed, rail.refresh, roles, ports, gatesFeed, diagnosticsFeed, shownReading.refresh ]
            each step: state applied, THEN its listeners run (ADR-QD-177 d4); thrown values collected,
            rethrown once after the last step: one as itself, several as one AggregateError in step order
        rail (derived, parent: timeline) ──► explorer.setSightings, simulation.setSightings   (two listeners, notify-protected)
        timeline ──► dock.setTimeline                                                           (separate listener, after the rail)

82  QadiProvider render ──► lease.registry (built once, SSR-safe) ──► RegistryContext / QadiContext (stable identity)
        effects cleaned (hide or unmount) ──defer(0)──► registry.reset(); reseed(subject)   (still usable, empty)
        effects re-run (reveal, StrictMode) ──► lease.hold() cancels a pending recycle

83  poll sample ──► accept(token)(next) ──► reading = foldReading(reading, next) ──► show(status): one publish
        off() ──► reading = noDiagnostics        restart() keeps reading        join keeps reading supplied questions from held.reading

84  hook ──► useScoped(build + value.configure(inputs)) ──► layout effect re-configures on a new inputs record (no-op by the value's rule)
```

## Patterns to Follow

- **One rule, stated once, consumed by name (ADR-QD-192/185).** Phase 81 adds `callAll` to the file that already owns
  the listener contract, rather than a third copy; Phase 83 adds `foldReading` beside the reading type.
- **A pure, injected-timer module for a lifetime policy (`SweepScheduler.ts`).** `RegistryLease` follows it, so the
  policy is mutation-tested without React.
- **Idempotent steps.** `configure` is safe to run whole because every step is a no-op when nothing moved
  (`HeldChoice.setList`, `simulation.setPorts`, the feeds' `sameFields`).
- **Derived store for a computed value** (BEH-QD-696..698) instead of a closure variable plus an identity guard.

## Anti-Patterns to Avoid

- **Reviving or replacing a resource in a parent's effect while children have already used it.** React reveal effects
  run children first; Phase 82's registry must never be unusable at any point a consumer can reach it.
- **Building the provider's registry in an effect.** It breaks the server render and the first-render subject.
- **Copying the listener `Set` in `callAll`.** It changes which listeners a pass reaches (ADR-QD-177 alternatives).
- **Flattening or inspecting a thrown value** (`AggregateError` is one value; the decision is by count, ADR-QD-177 d2-d3).
- **Claiming more than the window allows.** An identical `configure` does not heal a feed's `Starting`-publish window;
  say so in ADR-QD-194 and BEH-QD-741.. rather than let the behaviour doc over-promise.
- **Reading `AsyncResult`/decision state in the provider or the lease.** AGENTS.md §13; the lease holds a registry only.
- **A new `Effect.fnUntraced`, `switch`, `any`, module-scope `let`, or `console`** anywhere in these phases; each has an
  exact budget that fails in both directions.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `DockModel` <-> `ExternalStore` | `callAll`, `makeDerivedStore` | `callAll` stays out of both barrels (`index.ts` and `react/index.ts` list names; `devtools-named-barrel` rule). |
| `DockModel` <-> feeds | `configure` per feed | feed contracts unchanged; ADR-QD-177 d5's window is a stated limit. |
| `DiagnosticsFeed` <-> `Diagnostics.ts` | `foldReading`, `runDiagnostics(sink)` | `runDiagnostics` stays unexported from the root (surface pin). |
| `QadiProvider` <-> `RegistryLease` | `registry`, `hold()` | the only caller; `QadiAtoms.ts` and `SweepScheduler.ts` untouched. |
| `useDevtoolsFeed` <-> provider | reads `registry` from context, `useMemo([atoms, registry])` | benefits: the registry no longer changes identity on a re-render after a long hide. Add a hide/show test. |
| `QuestionsPanel` <-> `useLens` | one hook subscribes to the lens and to the questions store | keeps traceability row 661's "one subscription to each". |

### Release and docs

| Item | 81 | 82 | 83 | 84 |
|------|----|----|----|----|
| Public export changes | none | none | `Diagnostics` type loses `questions` | none |
| Changeset | `@qadi/devtools` patch | `@qadi/react` patch | `@qadi/devtools` **Breaking** minor | none (or patch, "no export changes") |
| Upgrade guide (`apps/website/src/content/docs/docs/reference/upgrading.md`, `## 0.13: …`) | none | none | new section | none |
| `spec/overview.md` rows (gate 13) | none | none | path text, `Diagnostics` row | none |

## Scaling Considerations

Not applicable: these are lifetime and ordering fixes inside a debug panel and a provider. The one cost to watch is
Phase 82's recycle after a long hide (decisions re-evaluated at reveal), which is bounded by the number of mounted
guards and is the same work a first mount does.

## Sources

- Code read on `arch-wave-15`: `packages/devtools/src/model/{DockModel,ExternalStore,DiagnosticsFeed,DiagnosticsStore,TimelineFeed,LensSession}.ts`, `packages/devtools/src/react/{useConfigured,useScoped,useDockModel,useTimeline,useDiagnostics,useLens,DevtoolsDock,QuestionsPanel,StoppedBox,TimelineNotice,DiagnosticsNotice}.ts(x)`, `packages/react/src/{QadiProvider.tsx,SweepScheduler.ts}`, `node_modules/effect/src/reactivity/AtomRegistry.ts` (:88, :619, :727, :746; HIGH).
- Throwaway repro `packages/react/test/zzThrowaway82.test.tsx` (not mine; untracked; run read-only, results S1-S6 quoted above; HIGH). **It must be deleted before any commit.**
- Spec: ADR-QD-014, 047, 148, 149, 169, 173, 177, 185, 191, 192, 193; BEH-QD-067, 656, 696-700, 728, 731-737; INV-QD-373, 390, 401-406; `spec/behaviors/09-react.md:334,380-390`; `spec/traceability.md` row 661.
- `AGENTS.md` §5, §5a, §6 (budgets and the `NOT_CALLABLE_PIN_BUDGET` table), §9, §13, §15, §16; `scripts/check-house-style.mjs:771`; `stryker.devtools.mjs`, `stryker.react.mjs`; `.planning/phases/_WAVE14-CONTEXT.md` (the shape to mirror).

---
*Architecture research for: v1.10 Arch Wave 15 (Phases 81-84)*
*Researched: 2026-11-24*

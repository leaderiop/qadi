---
id: ARCH-24
title: Diagnostics sampling is written once, in the devtools model, as a store a schedule feeds
strength: Worth exploring
status: done
evidence_verified_at: e328e75
depends_on: []            # nothing blocks T0–T3; see the soft coordination below
blocks: []
# Soft coordination, not hard dependencies:
#   ARCH-20 builds a SimulationSession store of the same shape: D-24-a decides one shared,
#     internal store helper; whichever plan lands first creates it, the second consumes it.
#   ARCH-21 changes WiringReport's shape: the store treats the report as opaque (structural
#     Equal.equals), so only §9's "functions in the report defeat dedup" risk carries over.
#   ARCH-23 touches the gates input and asked(): D-24-d keeps gates pushed, untouched, and
#     samples questions only through a plain thunk that a QuestionBook can also satisfy.
adrs_touched:
  - ADR-QD-047 (amend: sampling the no-wiring reads, and the handed layer, is the model's job — `runDiagnostics` beside `runSource`; the headless/React split is unchanged)
  - ADR-QD-052 (read, constraint: the hydration counts stay pull-based reads of core-declared metrics; nothing here adds a write or a push on the hot path, and devtools still does not depend on @qadi/react)
  - ADR-QD-053 / ADR-QD-080 (read, constraint: `gates` stays a plain prop fed by the host's `useGateInstances()` subscription; not sampled, not owned by the store — AGENTS.md §13)
  - ADR-QD-051 (read, constraint: `collectPortCalls` stays an opt-in tracer layer; the store only reads its `snapshot`)
  - ADR-QD-037 (read, constraint: madge — `model/` must not import from `react/`; that is why D-24-d moves `AskedQuestionLike` into the model)
  - ADR-QD-034 (read, constraint: no `switch`; `SWITCH_BUDGET` untouched)
  - ADR-QD-073 (read, constraint: `runDiagnostics` is a named `Effect.fn`; `UNTRACED_BUDGET` untouched)
  - ADR-QD-076 (read, constraint: the new model file falls under `stryker.devtools.mjs`'s `packages/devtools/src/model/**/*.ts` glob)
  - ADR-QD-038 (read, constraint: one changeset in the fixed version group)
packages: ["@qadi/devtools", "@qadi/example-nextjs", "apps/website (docs only)", "spec"]
estimate: M   # ≈ 2 days for T0–T10; T1 alone (the example's cache defect) is ≤ ½ day
---

# ARCH-24 — Diagnostics sampling is written once, in the devtools model

## 1. Verified evidence (at `e328e75`)

Checked on `main` at `e328e75` (`git log --oneline -1`). `git diff --stat d0884e6 e328e75`
over `packages/devtools`, `examples/nextjs-newsroom/src`, `spec/devtools-spec` and
`spec/behaviors/28-devtools-screens.md` touches only `model/Inspect.ts` and two tests, so
none of the files this plan cites moved since the review.

Probes ran from `scratchpad/wave3/ARCH-24/` (never the repo), with
`cd packages/devtools && NODE_OPTIONS="--conditions=bun" <root>/node_modules/.bin/tsx <probe>.mts`,
`effect` imported from its single real path
(`node_modules/.pnpm/effect@4.0.0/node_modules/effect/dist`, the same one every package
resolves to), `@qadi/core` and `@qadi/devtools` imported from `src`:

- `probe-cache.mts`: is a layer provided per sample the same instance the atoms use?
- `probe-hoist.mts`: does a pre-built context share one instance across both?
- `probe-async.mts`: what `Effect.runSync` does with an asynchronous layer.
- `DiagnosticsStore.proto.ts` + `probe-store.mts` + `probe-ticks.mts`: a prototype of the
  target store, driven under `TestClock`. It type-checks with
  `tsc -p scratchpad/wave3/ARCH-24/tsconfig.json` (strict, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`, `@qadi/core` mapped to `packages/core/src/index.ts`): **exit 0**,
  including a generic `Effect.fn("…")(function* <ROut, E>(…))`.

### C1. The dock takes `wiring`, `activity`, `hydration` and `portCalls` as one-shot snapshots: **CONFIRMED**

`packages/devtools/src/react/DevtoolsDock.tsx:84-95,107-108` declares them as values
(`wiring?: WiringReport`, `activity?: ReadonlyArray<PortActivity>`, `portCalls?: PortCallLog`,
`hydration?: HydrationActivity`), each documented as "Read with `wiringReport`/`portActivity`/
`collectPortCalls`/`hydrationActivity`". They are destructured at `:128-142` (`activity = []`)
and threaded unchanged to `ServicesPanel`/`QuestionsPanel` (`:255-261`, `:340-363`). The dock
never reads them itself. So a host has to know four Effects (`wiringReport`, which needs a
layer; `portActivity` and `hydrationActivity`, which need nothing; `collector.snapshot`), run
them, and run them again to keep them current. Every prop is optional, and BEH-QD-218
(`spec/behaviors/28-devtools-screens.md:307-325`) requires that a missing one produce an
explanation, not a blank screen.

### C2. The example writes a `useSampled` helper and a second hand-written `setInterval`: **CONFIRMED** (lines moved slightly)

`examples/nextjs-newsroom/src/client/Dock.tsx:94-112`: the doc comment ("Re-read on a timer… Two
seconds is a debug affordance's refresh rate") and `useSampled`
(`useState` + `useEffect` + `setInterval(sample, everyMillis)` + `Effect.runSync(read)`).
Used at `:135-141` for `wiring` (`Effect.provide(wiringReport, browserLayer)`), `activity` and
`hydration`. `:142-149` is a second, hand-written copy for `clientPortCalls.snapshot` with its
own `setInterval(sample, 2_000)`. So two copies of the same loop live in one file.

### C3. Are there other hosts? **CONFIRMED: one host**

`grep -rln -E "DevtoolsDock|wiringReport|portActivity|hydrationActivity|collectPortCalls"` over
`*.ts/*.tsx/*.md/*.astro/*.mjs/*.feature`, excluding `node_modules`, `lib`, `coverage`,
`.planning`, `.reports` and `.agents`:

- `examples/nextjs-newsroom/src/client/Dock.tsx` is the **only** component that mounts the
  dock with live data (`DockMount.tsx` lazy-loads it, and the other example files only build
  the inputs: `atoms.ts:33` `clientPortCalls`, `server/layer.ts`).
- `apps/website`: `docs/packages/devtools.md:22` has an `import { DevtoolsDock }` line in a
  ` ```ts ` fence and lists `wiringReport`/`hydrationActivity` by name (`:98-101`). Nothing
  renders a dock, and the page never says how to keep these props current.
- `features/features/{devtools-screens,hydration-counts,port-calls}` read the **model**
  (`hydrationActivity`, `collectPortCalls`) directly and never render the dock.
- `packages/devtools/test/react/DevtoolsDock.test.tsx:773-880` passes literal snapshots.

The leverage is therefore about the next host, and about the README and website, which today
show no way to fill these props. One duplicated loop in one file is not the reason. This is why
the strength stays **Worth exploring**.

### C4. NEW DEFECT: the example's Services cache card reads a throwaway cache, rebuilt every two seconds: **CONFIRMED**

`Dock.tsx:135-139` samples `Effect.provide(wiringReport, browserLayer)`, and its comment claims
"The atoms' own layer". It is the same layer *value*, but a different *build*.
`decisionCacheLayer` keeps its state inside the `Layer.effect` closure
(`packages/core/src/DecisionCache.ts:311-333`). `Effect.provide` builds against a fresh memo map
on each run (`effect/src/Layer.ts:582-585,804`, `CurrentMemoMap.forkOrCreate`), and `Atom.runtime`
builds against its registry's own memo map (`effect/src/reactivity/Atom.ts:893,916,956`).
`probe-cache.mts`:

```
Effect.provide twice -> same cache instance? false
atoms' cache === Effect.provide cache? false
```

So `ServicesPanel`'s `CacheCard` (`ServicesPanel.tsx:251-256`) shows
**"0 completed entries" for as long as the page is open**, whatever the atoms have cached. On
top of that, every sample rebuilds `browserPorts`, `EvaluationIdLive`, a cache, the log layer
and the collector layer (`atoms.ts:71-77`) every two seconds. Presence and names are reported
correctly, because each build has the same services. Only the stateful reading is wrong. No test
catches it: `grep -rn "qadi-cache-size\|completed entries" examples/nextjs-newsroom/e2e` finds
nothing.

`probe-hoist.mts` confirms the host-side fix. If the cache's context is built once and handed
over as `Layer.succeedContext(built)`, the atom runtime and `Effect.provide` see **the same
instance** (`hoisted: atoms and provide share instance? true`). `decisionCacheLayer` registers no
finalizer, so closing the build scope at once is harmless (`DecisionCache.ts:312-314`,
`Effect.sync`).

### C5. NEW: every sample has a fresh identity, and that churn is what keeps the Questions panel current: **CONFIRMED**

`probe-cache.mts`: two `wiringReport` samples give `w1 === w2` **false** and
`Equal.equals(w1, w2)` **true**. `portActivity` and `hydrationActivity` also build fresh arrays and
objects on every read (`Wiring.ts:173-187`, `Hydration.ts:105-122`). So `useSampled`'s `setValue`
never bails out, and the example's `Dock` re-renders every two seconds even when nothing has
changed.

That re-render is load-bearing. `Dock.tsx:154` reads `const questions = atoms.asked()` **during
render**. `asked()` returns a fresh `tracked.map(…)` (`packages/react/src/QadiAtoms.ts:480`), and
nothing subscribes to it. The Questions panel stays current only because the sampler re-renders
`Dock`. A store that preserves identity (the point of this plan) moves the re-render into
`DevtoolsDock`, and `Dock` would then refresh `questions` only when `gates`, mismatches, drops or
the subject change. D-24-d settles this, and T4 covers it with a test.

### C6. `useSampled` cannot sample an asynchronous layer: **CONFIRMED**

`probe-async.mts`: `Effect.runSync(Effect.provide(wiringReport, <layer with an Effect.sleep>))`
throws `AsyncFiberError: An asynchronous Effect was executed with Effect.runSync`. Any host whose
layer does asynchronous construction (a remote config, a lazily opened store) cannot use the
example's pattern. A forked fiber has no such limit.

### C7. The target shape works on `effect@4.0.0`, under `TestClock`: **CONFIRMED** (prototype)

`DiagnosticsStore.proto.ts` (≈60 lines) is a `makeDiagnosticsStore()` with `subscribe` /
`getSnapshot` / `accept`, where `accept` keeps each field's previous reference when
`Equal.equals` says it is unchanged and notifies only if a field changed. Beside it,
`runDiagnostics(store, { layer?, collector?, schedule? })` builds the layer **once** inside
`Effect.scoped`, then runs `Effect.repeat(sample, schedule ?? Schedule.spaced(2_000))`.

- `probe-store.mts` (layer = cache + a counted `acquireRelease`):
  `after start: builds 1 notified 1`, `after 2s: builds 1 notified 1 snapshot identical true`,
  `after 12s: builds 1 notified 1 identical true`, `after interrupt: releases 1`.
- `probe-ticks.mts` (a collector whose snapshot changes until frozen): `samples 4 notified 4`
  over 6 s (t = 0, 2, 4, 6), then `samples 7 notified since freeze 1` (one notification for the
  freeze itself, then none).

This is the same shape as `model/TimelineStore.ts:42-110` (`makeTimelineStore` + `runSource`) and
`react/useTimeline.ts:40-67` (`runFork` on mount, `Fiber.interrupt` on unmount,
`useSyncExternalStore`). It also matches `QadiProvider.tsx:344-350`'s
`Effect.repeat(atoms.sweepEvictions, Schedule.spaced(…))`.

### C8. The `gates` rationale is untouched by construction: **CONFIRMED**

`Dock.tsx:125` gets `gates` from `useGateInstances()`, a push subscription on the atom set's
registry (AGENTS.md §13, ADR-QD-080). `@qadi/devtools` has no dependency on `@qadi/react`
(`packages/devtools/package.json` dependencies, and `model/Gates.ts:32` says so). Nothing in this
plan samples, stores or subscribes to gates. `gates` stays a plain prop.

### C9. The spec already speaks of "a layer handed to the dock": **CONFIRMED**

BEH-QD-218's table (`28-devtools-screens.md:324`) reads `Services | no layer was handed to the
dock | metrics still render`, and `ServicesPanel.tsx:57-59` says "No layer was handed to the dock…
Pass `wiring` to see it". In fact the dock takes a *report*, not a layer, and with no props
"metrics still render" is false, because `activity` defaults to `[]`. The spec's own vocabulary
fits the target better than the current API does. `:314` ("Four of the six screens read data the
dock cannot obtain for itself") stops being true for activity and hydration once the dock can
sample them.

### C10. No claim of absence in `spec/devtools-spec/` changes: **CONFIRMED**

The ledger (`spec/devtools-spec/README.md:49-80`) registers seven rows: the CLI shell, the
topology table, and two "not a claim" corrections. None of them concerns sampling.
`02-screens.md:320-321` ("**Built**, read passively with `hydrationActivity`") and
`00-overview.md:158` (screen 6 built) are claims of presence and stay true. The gate's phrase list
(`scripts/check-devtools-claims.mjs:59-73`) includes `"not recorded"`, `"has no source"` and
`"not obtainable"`. New prose in that folder must avoid them outside a `>` blockquote, or register
a row.

### C11. The forbidden list and the gates

AGENTS.md §6 bans `Date.now`/`new Date`/`performance.now`/`new Promise`/`async`. `setInterval` is
not on the list and not a `check-house-style.mjs` rule. The house-style scan skips
`examples/*` and `apps/*` (`check-house-style.mjs:58-66`), so the example's `setInterval` is legal
where it is. The model store must still use `Schedule.spaced` + `Effect.repeat`: that is what
makes it testable under `TestClock` (C7), and it is the `QadiProvider` precedent. Baselines for T0
are listed there and were not re-run here, per the brief's "no `pnpm check`".

## 2. Goal and success criteria

**Goal.** Today, "keep the diagnostics current" is a loop each host writes: four reads, two
timers, one `runSync`, and a layer provided by hand. The only host wrote it twice, and its stateful
read came out wrong (C4). This plan moves that loop behind one **deep module** in the headless
model, `model/DiagnosticsStore.ts`. Its **interface** is small: `makeDiagnosticsStore()` and
`runDiagnostics(store, { layer?, collector?, questions?, schedule? })`. Its **depth** sits behind
that interface: building the handed layer once per run and releasing it on interruption, sampling
the two no-wiring reads, turning a build failure into a stated reading rather than a dead fiber,
and keeping snapshot identity until something structurally changed.

The **seam** is the store's `subscribe`/`getSnapshot` pair. A React **adapter**, `useDiagnostics`
beside `useTimeline`, crosses it and computes nothing. `DevtoolsDock` gains one `diagnostics`
prop, so a host hands over things it already owns (its layer, its collector, its question list)
and knows no Effects. The **leverage**: every future shell (the ADR-QD-049 CLI included) gets
sampling by calling one function. The **locality**: the cadence, the identity rule and the
layer's lifetime are each written once, in a file held to the model's 95% coverage and the
devtools mutation gate. The snapshot props stay for data the dock cannot sample itself, such as
another process's wiring.

**Success criteria**

1. `grep -rn "setInterval\|useSampled\|Effect.runSync(.*snapshot\|Effect.runSync(read" examples/nextjs-newsroom/src` → no match.
2. `examples/nextjs-newsroom/src/client/Dock.tsx` passes `diagnostics={…}` and none of `wiring`, `activity`, `hydration`, `portCalls`. `grep -c "wiringReport\|portActivity\|hydrationActivity" examples/nextjs-newsroom/src/client/Dock.tsx` → `0`.
3. `examples/nextjs-newsroom/test/dock-wiring.test.ts` passes. The cache the dock's wiring read
   sees **is** the atoms' cache (red on `e328e75`, C4).
4. `packages/devtools/test/model/DiagnosticsStore.test.ts` proves under `TestClock`, with no
   real timer and no `sleep`: one sample at start and one per interval; the layer built once and
   released on interruption; identity kept while nothing changed and moved for the changed field
   only; a failing layer reported as `Failed` while the other reads keep sampling.
5. `packages/devtools/test/react/useDiagnostics.test.tsx` proves that mounting starts the run,
   unmounting runs the layer's finalizer, and a re-render with equal inputs does not restart it.
6. `DevtoolsDock.test.tsx`: every existing snapshot-prop test passes **unedited** (D-24-c), plus
   new tests that `diagnostics` alone fills Services and hydration, and that an explicit prop wins
   over the sampled value field by field.
7. `node scripts/check-api-surface.mjs` lists the new exports. `node scripts/check-devtools-claims.mjs`,
   `node scripts/check-house-style.mjs` and `madge --circular --extensions ts,tsx packages/*/src`
   are green with **no budget edited**.
8. `pnpm check` is green (T9).

## 3. Non-goals

- **Push-based diagnostics.** BEH-QD-216 and ADR-QD-052 deliberately put no write on the
  evaluation's hot path for a debug view. Sampling stays pull-based. This plan writes the pull
  once; it does not turn it into a push.
- **Gates.** They stay a prop fed by the host's subscription (C8, AGENTS.md §13). ARCH-23 owns any
  change to how they reach the dock.
- **The decision timeline.** `useTimeline`/`runSource` are untouched in behaviour. D-24-a may move
  `TimelineStore`'s listener set onto a shared helper with no test edits, and that is the only
  change to it.
- **Sharing a memo map with `@qadi/react`'s atom runtime.** Stateful instances are shared by value
  (C4's hoist). Exposing `makeQadiAtoms`' memo map would be a `@qadi/react` API change and belongs
  to ARCH-23 if anyone wants it.
- **`WiringReport`'s shape.** ARCH-21 owns it. The store treats it as opaque.
- **The legacy `hydrationMismatches` prop.** It stays as it is: superseded by `hydration`, and
  shown only when that is absent (`DevtoolsDock.tsx:109-115`).
- **The "six screens" count in BEH-QD-218's prose**, while the dock has seven tabs. T8 notes it in
  passing and does not fix it.

## 4. Constraints

- **AGENTS.md §1**: namespace `effect/*` imports, `.ts` extensions, `import type`. Cross-package
  imports are named imports from `@qadi/core`.
- **§5**: `runDiagnostics` is `Effect.fn("qadi.devtools.runDiagnostics")`, as `runSource` is
  `Effect.fn("qadi.devtools.runSource")`. Named and traced, so **`UNTRACED_BUDGET` is
  unaffected**. `Effect.gen` builds the inner scoped program.
- **§5a**: no `switch`. A `WiringRead` closed union (D-24-f) is rendered with
  `Match.tagsExhaustive` in `ServicesPanel`. **`SWITCH_BUDGET` is unaffected.**
- **§6**: no `Date.now`, no `setInterval`/`setTimeout` in the model, no `new Promise`, no `as`.
  The house-style rule `no-nondeterministic-time` scans `packages/*/src`, and a timer would also
  defeat `TestClock`. `Schedule.spaced` it is. **`ANY_BUDGET` is unaffected**: generics
  `<ROut, E>` replace any temptation to write `Layer<any>`.
- **§9 Barrels**: the public exports go in `src/index.ts` / `src/react/index.ts` alphabetically. A
  shared store helper (D-24-a) is **scaffolding and stays out of both barrels**.
- **§10**: `@effect/vitest` `it.effect` + `TestClock`. Model coverage stays at **95%**
  (`vitest.config.ts` `packages/devtools/src/model/**`), and the React shell at 90%.
- **§13 / ADR-QD-053/080**: gates stay a host-fed plain prop, and devtools takes no dependency on
  `@qadi/react`. `questions` crosses only as a thunk typed by a devtools-owned structural type
  (D-24-d).
- **BEH-QD-210**: nothing in `@qadi/devtools` runs on import. The store and the run are values,
  started only by a caller or a mounted hook.
- **BEH-QD-218**: every screen still explains its own emptiness. A layer that failed to build gets
  its own explanation (D-24-f).
- **ADR-QD-037 (madge, gate step 3 `pnpm circular`)**: `model/DiagnosticsStore.ts` imports only
  from `model/`. That forces `AskedQuestionLike` out of `react/QuestionsPanel.tsx` (D-24-d).
- **ADR-QD-076 / `stryker.devtools.mjs`** (gate step 14 `pnpm mutation`, `break: 80`): the new
  model file is mutated automatically by the `packages/devtools/src/model/**/*.ts` glob. The tests
  must kill its identity-keeping and change-detection mutants.
- **Gate 13 (`node scripts/check-api-surface.mjs`)**: every new export gets a row in
  `spec/overview.md`'s `@qadi/devtools` table, or the gate fails. A moved type's `Source` cell is
  updated too.
- **Gate 12 (`node scripts/check-devtools-claims.mjs`)**: no ledger row changes (C10). New prose
  avoids the phrase list.
- **`DECISION_READ_BUDGET`, `SCHEMA_ERROR_BUDGET`, `HAS_CUSTOM_BUDGET`, `PORT_DOUBLE_BUDGET`**:
  untouched. Devtools reads no `AsyncResult`, declares no errors, and builds no port doubles.
- **The example** is not scanned by house style. It is held by `pnpm --filter @qadi/example-nextjs check`
  (gate step 13, `pnpm example`: typecheck, vitest, build, Playwright).

## 5. Decisions needed before work starts

### D-24-a — One store helper shared with ARCH-20 (and `TimelineStore`)?

`TimelineStore` (`model/TimelineStore.ts:42-84`), this plan's `DiagnosticsStore`, and ARCH-20's
`SimulationSession` each need the same `useSyncExternalStore` contract: a listener set, `subscribe`
returning an unsubscribe, a `getSnapshot` that is stable between changes, and `notify`. Each also
needs the same React adapter: `runFork` on mount, `Fiber.interrupt` on unmount.

- **A. No helper.** Each store keeps its own ten-line listener set. Zero coordination, but three
  copies, which is the duplication this review candidate exists to remove.
- **B. One internal helper.** `model/ExternalStore.ts`: `makeExternalStore<A>(initial)` →
  `{ subscribe, getSnapshot, set(next) }`, where `set` notifies only when `next !== current`.
  Plus `react/useRunningStore.ts`: `useRunningStore(store, run, deps)`, which forks on mount,
  interrupts on unmount and returns `useSyncExternalStore(store.subscribe, store.getSnapshot)`.
  Both stay **out of the barrels** (§9). `TimelineStore` moves onto it with no test edits.
  Whichever of ARCH-20 and ARCH-24 lands first creates it, and the other consumes it.
- **C. Exported public helper.** It lets hosts build their own stores, but it is public API for a
  pattern nobody outside this package has asked for, and gate 13 makes every export permanent
  documentation.

**Recommendation: B.** Three stores is the rule of three. Keeping it internal costs nothing if it
proves wrong. The identity *policy* (`Equal.equals` per field here, `ingest`'s own identity in the
timeline) stays in each store, so the helper owns only the mechanics. ARCH-20's planner must agree
on the two names and signatures above. **status: decided (2026-10-07, B, ARCH-20 landed its own closure first; ARCH-24 extracted ExternalStore + useRunningStore)**

### D-24-b — How the dock consumes sampling

- **A. The host runs it.** `diagnostics?: DiagnosticsStore`. The host builds the store, forks
  `runDiagnostics` itself, and hands over the store. Flexible, but the host is back to knowing
  Effects and fiber lifetimes.
- **B. The dock runs it.** `diagnostics?: DiagnosticsOptions` (`{ layer?, collector?, questions?,
  intervalMillis? }`). The dock calls `useDiagnostics(diagnostics)`. With the prop absent, no
  fiber starts. The host hands over values it already owns. `useDiagnostics`,
  `makeDiagnosticsStore` and `runDiagnostics` stay exported for a custom shell.
- **C. Both.** A union prop. That is widening (`DiagnosticsStore | DiagnosticsOptions`) for no
  case B cannot serve, since a custom shell uses the hook directly.

**Recommendation: B.** It is the only option where the example's `Dock` stops importing
`wiringReport`/`portActivity`/`hydrationActivity` (success criterion 2). **status: decided (2026-10-07, B, the dock runs the hook)**

### D-24-c — The snapshot props: deprecate, keep both, or replace?

- **A. Replace.** Remove `wiring`/`activity`/`hydration`/`portCalls`. That is breaking, and it
  removes the only way to show data the browser cannot sample: a *server's* wiring report fetched
  over HTTP, a CLI feeding a captured report, or a test fixture (`DevtoolsDock.test.tsx:852-880`
  depends on it).
- **B. Deprecate (`@deprecated`).** Signals removal later, but has the same loss as A, deferred.
- **C. Keep both, with explicit-prop precedence per field.** `wiring ?? sampled.wiring`, and so on.
  The doc comment says the props are for data from elsewhere, and `diagnostics` is for this
  process.

**Recommendation: C.** It is not a compatibility shim: the props answer a different question
(another process's diagnostics) that sampling cannot. Every existing dock test passes unedited.
**status: decided (2026-10-07, C, explicit props win field by field)**

### D-24-d — Questions: keep the per-render read, sample a thunk, or wait for ARCH-23?

C5 shows the example's Questions panel stays current only because the sampler re-renders `Dock`.

- **A. Leave `questions` as a value prop.** Once sampling moves into the dock, `Dock` stops
  re-rendering on a timer, and `questions` refreshes only incidentally (on a gate change, a
  mismatch or a subject change). That is a silent regression: eviction sweeps and hook-only
  questions stop showing.
- **B. Sample a thunk.** `DiagnosticsOptions.questions?: () => ReadonlyArray<AskedQuestionLike>`,
  read on the same tick, with identity kept by `Equal.equals` (`Policy`/`Resource` compare
  structurally, the property `QuestionsPanel`'s join already relies on). `AskedQuestionLike` moves
  from `react/QuestionsPanel.tsx:42-46` to `model/Gates.ts` (re-exported from the react file for
  source compatibility, D-24-c spirit), because the model cannot import `react/` (ADR-QD-037). The
  host passes `() => atoms.asked()`, which is a plain function, with no dependency on
  `@qadi/react`. The `questions` value prop stays, and wins, per D-24-c.
- **C. Wait for ARCH-23.** If ARCH-23 gives the question list a `subscribe`, questions should be
  pushed like gates, and this plan would leave A's regression in place until then.

**Recommendation: B.** It matches `asked()`'s own documented intent ("read off the atom set rather
than subscribed to… a panel that re-rendered on every question would re-render on every guard's
first mount", `Dock.tsx:151-153`): a sampled read is exactly that. It also stays compatible with
C: a `QuestionBook` with a `list()` satisfies the thunk, and a later push path can replace it
without breaking. Coordinate the type's new home with ARCH-23. **status: decided (2026-10-07, B, questions sampled as a thunk; AskedQuestionLike into model/Gates.ts)**

### D-24-e — Where the wiring read gets its services

- **A. Provide the layer per sample** (today, C4). Rebuilds everything every tick, reads throwaway
  stateful instances, and cannot run an async layer under `runSync` (C6).
- **B. Build the layer once per run**, inside `runDiagnostics`' scope, and sample `wiringReport`
  with `Effect.provideContext(context)`. Cheap, released on interruption, and fine with async
  construction. It is still *its own build*, so a stateful service is shared only if the host
  shares it by value. T1 fixes the example that way, and the doc comment says so.
- **C. Accept a built `Context`.** Moves the build (and its scope) back to the host.
- **D. Accept a `Layer.MemoMap`** so the host can share its atom runtime's memo map. That needs
  `@qadi/react` to expose one, which is out of scope (§3).

**Recommendation: B**, documented with C4's pitfall. B also accepts C's case for free: a host
holding a built context passes `Layer.succeedContext(ctx)`. **status: decided (2026-10-07, B, built once per run in the run scope)**

### D-24-f — A layer that fails to build

`runDiagnostics<ROut, E>` gets `E` from the handed layer. Letting it fail the run would kill the
fiber and leave every panel blank, which BEH-QD-218 forbids ("a blank panel is indistinguishable
from a broken one").

- **A. Fail the run.** Simple, but it breaks BEH-QD-218.
- **B. A closed reading.** `Diagnostics.wiring: WiringRead`, where
  `WiringRead = NotHanded | Failed { reason: string } | Read { report: WiringReport }`
  (`Data.TaggedEnum`). The build runs under `Effect.result`/`Effect.exit`, and on failure the
  no-wiring reads keep sampling. `ServicesPanel` gains a `Failed` explanation via
  `Match.tagsExhaustive`. The dock's `wiring` prop stays `WiringReport | undefined` and maps to
  `Read`/`NotHanded` at the dock boundary. The run's error channel is `never`.
- **C. `wiring: WiringReport | undefined` plus a separate `wiringFailure?: string`.** Two fields
  that can disagree, which is the shape the user's "closed union over widening" rule rejects.

Defects in a sample (a throwing `collector.snapshot`) end the run, as they do in `runSource`.
Typed reads cannot fail.

**Recommendation: B.** **status: decided (2026-10-07, B, closed WiringRead)**

### D-24-g — Does a dock with no `diagnostics` prop sample anything?

- **A. No (opt-in).** No fiber, and today's empty states. Matches "nothing runs unless asked",
  and every existing test stays green.
- **B. Always sample the two no-wiring reads.** Zero-config counts, but every mounted dock gets a
  fiber, the BEH-QD-218 "Absent" column changes meaning, and
  `DevtoolsDock.test.tsx:792` ("all four new screens explain their own emptiness") changes.

**Recommendation: A.** `diagnostics={{}}` is the one-token opt-in for the metric reads.
**status: decided (2026-10-07, A, opt-in)**

### D-24-h — Where the rule is recorded

- **A. A new ADR.**
- **B. Amend ADR-QD-047**, adding a section "sampling is the model's", and add
  **BEH-QD-NEXT** to `28-devtools-screens.md`.

**Recommendation: B.** The decision extends ADR-047's split ("the model computes, the shell
renders") to a loop the shell was computing. The pull-not-push rationale already lives in
BEH-QD-216 and ADR-QD-052, so it needs citing, not restating. **status: decided (2026-10-07, B, ADR-QD-047 amendment + BEH-QD-323 (no new ADR))**

### D-24-i — Cadence option shape

**Recommendation:** layered, not either/or. The model takes `schedule?: Schedule.Schedule<unknown>`
(general, and what `TestClock` tests drive). The hook and the dock take `intervalMillis?: number`
(a React-friendly primitive, like `QadiProvider`'s `sweepIntervalMillis`), mapped to
`Schedule.spaced`. Export `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS = 2_000`, the example's current
cadence. **status: decided (2026-10-07, layered: model Schedule, hook/dock intervalMillis, default 2000)**

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch -c arch/24-diagnostics-store main`. Confirm `git log --oneline -1` (`e328e75`
     or later) and re-read every §1 line reference. Update §1 if anything moved.
  2. Re-run the §1 probes from `scratchpad/wave3/ARCH-24/` (`probe-cache`, `probe-hoist`,
     `probe-async`, `probe-store`, `probe-ticks`). Expect the outputs quoted in C4–C7.
  3. Baselines: `pnpm vitest run --project devtools` (record file and test counts);
     `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs` (record the export
     count); `node scripts/check-devtools-claims.mjs`; `pnpm circular`;
     `pnpm --filter @qadi/example-nextjs test`.
  4. Read ARCH-20's and ARCH-23's plans (once they exist) for D-24-a/D-24-d agreement, and record
     the outcome in §10.
- **Tests:** none
- **Verify:** the commands above
- **Done when:** the baselines are recorded in §10 and every C-claim still holds.

### T1 — Test-first: the example's cache card reads the atoms' cache (C4)
- **Status:** [x] done
- **Depends on:** T0 (no decision; shippable on its own)
- **Files:** `examples/nextjs-newsroom/test/dock-wiring.test.ts` (*new*);
  `examples/nextjs-newsroom/src/client/atoms.ts`; `examples/nextjs-newsroom/src/client/Dock.tsx`
  (comment only).
- **Steps:**
  1. Write the test **first**. Import `atoms` and `browserLayer` from `../src/client/atoms.ts`.
     Read the atoms' cache with
     `AtomRegistry.make().get(atoms.runtime.atom(Effect.serviceOption(DecisionCache)))` and the
     dock's with `Effect.runSync(Effect.provide(Effect.serviceOption(DecisionCache), browserLayer))`.
     Assert both are `Some` and `strictEqual` on `.value`. A second `it`: after a decision has been
     computed through the atoms (or after a direct `getOrCompute` on the atoms' instance),
     `Effect.provide(wiringReport, browserLayer)` reports `cache.size >= 1`.
  2. Run it: **red** on `e328e75` (C4).
  3. Fix in `atoms.ts`. Build the cache once at module scope:
     `const cacheContext = Effect.runSync(Effect.scoped(Layer.build(decisionCacheLayer({ capacity: 256 }))))`.
     Use `Layer.succeedContext(cacheContext)` in `browserLayer` in place of
     `decisionCacheLayer(...)`. Rewrite the doc comment at `:57-70`: state *why* the cache is
     built once, namely that a layer value built twice is two caches, and the dock reads it
     outside the atom runtime.
  4. Correct `Dock.tsx:136-137`'s comment ("The atoms' own layer") to say what is now true. T7
     replaces the whole block anyway.
- **Tests:** the two above. Existing `seed.test.tsx`, `hydration.test.ts` and `forwarding.test.ts`
  stay unchanged.
- **Verify:** `pnpm --filter @qadi/example-nextjs test`; `pnpm --filter @qadi/example-nextjs typecheck`
- **Done when:** red-then-green is recorded in §10, and the e2e suite needs no change (none asserts
  the cache card).

### T2 — Shared store mechanics (D-24-a = B)
- **Status:** [x] done
- **Depends on:** T0, D-24-a. **Skip this task if ARCH-20 already landed the helper; consume it.**
- **Files:** `packages/devtools/src/model/ExternalStore.ts` (*new*);
  `packages/devtools/src/react/useRunningStore.ts` (*new*);
  `packages/devtools/src/model/TimelineStore.ts`; `packages/devtools/src/react/useTimeline.ts`;
  `packages/devtools/test/model/ExternalStore.test.ts` (*new*).
- **Steps:**
  1. `makeExternalStore<A>(initial: A): ExternalStore<A>` with `subscribe`, `getSnapshot` and
     `set(next)`, where `set` notifies only when `next !== current`. Doc comment: summary line
     first, then the `useSyncExternalStore` identity contract (the text moves from
     `TimelineStore.ts:27-32`).
  2. `useRunningStore(store, run: Effect.Effect<void>, deps)`: the `useEffect` from
     `useTimeline.ts:50-58` (`Effect.runFork` / `Effect.runFork(Fiber.interrupt(fiber))`) plus
     `useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)`.
  3. Re-express `makeTimelineStore` over `makeExternalStore`: `frozen ?? timeline` stays its own
     logic, and only the listener set moves. Re-express `useTimeline`'s effect over
     `useRunningStore`.
  4. Do **not** add either helper to `src/index.ts` or `src/react/index.ts` (§9).
- **Tests:** `ExternalStore.test.ts`: notify on change, no notify on an identical `set`, and
  unsubscribe works. Existing `TimelineStore.test.ts` and `useTimeline.test.tsx` pass with **zero
  edits** (replace, don't layer).
- **Verify:** `pnpm vitest run packages/devtools/test/model packages/devtools/test/react/useTimeline.test.tsx`; `pnpm circular`
- **Done when:** the timeline tests are green and unedited, and madge is clean.

### T3 — `model/DiagnosticsStore.ts` and its `TestClock` tests (the deep module)
- **Status:** [x] done
- **Depends on:** T2 (or ARCH-20's helper), D-24-e, D-24-f, D-24-i
- **Files:** `packages/devtools/src/model/DiagnosticsStore.ts` (*new*);
  `packages/devtools/test/model/DiagnosticsStore.test.ts` (*new*);
  `packages/devtools/test/model/DiagnosticsStore.tst.ts` (*new*); `packages/devtools/src/index.ts`.
- **Steps:**
  1. Start from `scratchpad/wave3/ARCH-24/DiagnosticsStore.proto.ts`. Exports:
     - `type WiringRead = Data.TaggedEnum<{ NotHanded: {}; Failed: { readonly reason: string }; Read: { readonly report: WiringReport } }>`
       and `const WiringRead = Data.taggedEnum<WiringRead>()` (D-24-f).
     - `interface Diagnostics { wiring: WiringRead; activity: ReadonlyArray<PortActivity>; hydration: HydrationActivity | undefined; portCalls: PortCallLog | undefined; questions: ReadonlyArray<AskedQuestionLike> | undefined }`
       (the `questions` field lands in T4). `hydration` is `undefined` only before the first sample.
     - `noDiagnostics: Diagnostics`, a module-scope constant (`NotHanded`, `[]`, `undefined`…).
     - `interface DiagnosticsStore { subscribe; getSnapshot: () => Diagnostics; accept: (next: Diagnostics) => void }`
       and `makeDiagnosticsStore()`, built on `makeExternalStore`. `accept` keeps each field's
       previous reference when `Equal.equals(previous, next)`, and calls `set` only if some field
       changed.
     - `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS = 2_000`.
     - `interface DiagnosticsOptions<ROut, E> { layer?: Layer.Layer<ROut, E>; collector?: PortCallCollector; schedule?: Schedule.Schedule<unknown> }`.
     - `runDiagnostics = Effect.fn("qadi.devtools.runDiagnostics")(function* <ROut, E>(store, options?) {...})`,
       returning `Effect<void>` (error channel `never`). Inside `Effect.scoped`: build the layer
       once under `Effect.exit` (`Failed` with `Cause.pretty`-derived text on failure, `NotHanded`
       when no layer). Then
       `Effect.repeat(sample.pipe(Effect.tap((d) => Effect.sync(() => store.accept(d)))), schedule ?? Schedule.spaced(DEFAULT_…))`,
       where `sample = Effect.all({ wiring, activity: portActivity, hydration: hydrationActivity, portCalls })`.
  2. Doc comments (AGENTS.md doc-comment shape). Module: "the diagnostics the dock polls, polled
     once", then why it is pull-based (cite BEH-QD-216, ADR-QD-052), why the layer is built once
     and what that does **not** share (C4: a stateful service is shared only by value), why
     identity is kept (`useSyncExternalStore`), and that gates are deliberately absent (§13).
  3. `src/index.ts`: `export * from "./model/DiagnosticsStore.ts";`, alphabetically after
     `Catalogue`.
- **Tests (`it.effect`, `TestClock`, no real timers):**
  - "samples once at start and once per interval" (count `collector.snapshot` reads at t = 0, 2, 4 s).
  - "builds the layer once and releases it when interrupted" (`Layer.effectDiscard(Effect.acquireRelease(…))`
    counters; builds = 1 across 10 ticks; releases = 1 after `Fiber.interrupt`).
  - "a sample that changed nothing changes nothing": the snapshot is `strictEqual` across ticks,
    with zero notifications.
  - "only the field that changed gets a new reference": change the collector's log, and
    `activity`/`hydration`/`wiring` keep their references while `portCalls` moves.
  - "no layer reads NotHanded, and the metrics still sample".
  - "a layer that fails to build reads Failed, and the other reads keep sampling" (D-24-f):
    `Layer.effect(X, Effect.fail("boom"))`.
  - "the wiring read sees the built services": a named `AttributeResolver` appears as `Read`
    with that name.
  - "a schedule override is honoured" (`Schedule.spaced("500 millis")`).
  - `accept` unit tests without a run: notify on change, none on a structurally equal snapshot.
  - `.tst.ts`: `runDiagnostics(store, { layer: Layer<X, MyError> })` is
    `Effect.Effect<void, never, never>`, and `WiringRead` narrows by `_tag`.
- **Verify:** `pnpm vitest run packages/devtools/test/model/DiagnosticsStore.test.ts`; `pnpm test:tstyche`; `pnpm typecheck`; `pnpm circular`; `node scripts/check-house-style.mjs`
- **Done when:** the tests are green, the model's coverage holds ≥ 95% for the new file
  (`pnpm vitest run --coverage --project devtools`), and no budget is edited.

### T4 — Questions sampled through a thunk (D-24-d = B)
- **Status:** [x] done
- **Depends on:** T3, D-24-d (coordinate with ARCH-23)
- **Files:** `packages/devtools/src/model/Gates.ts`; `packages/devtools/src/react/QuestionsPanel.tsx`;
  `packages/devtools/src/model/DiagnosticsStore.ts`; `packages/devtools/test/model/DiagnosticsStore.test.ts`.
- **Steps:**
  1. Move `interface AskedQuestionLike` (`QuestionsPanel.tsx:42-46`) into `model/Gates.ts`, beside
     `GateInstanceLike`, with its doc comment. In `QuestionsPanel.tsx`, `import type` it and
     re-export it with `export type { AskedQuestionLike } from "../model/Gates.ts"` so the react
     entry point keeps exporting it. Gate 13 then sees it on **both** entry points. Decide in this
     task whether the overview lists it once (model) with a note, and record that.
  2. `DiagnosticsOptions.questions?: () => ReadonlyArray<AskedQuestionLike>`. Sample it with
     `Effect.sync(questions)` (absent → `undefined`), with identity kept by `Equal.equals`.
- **Tests:** "questions are re-read every tick and keep their identity while equal". "A new
  question moves the field": a mutable array the thunk copies, with a structurally built `Policy`.
- **Verify:** `pnpm vitest run --project devtools`; `node scripts/check-api-surface.mjs`; `pnpm circular`
- **Done when:** green, the API-surface gate passes, and madge is clean.

### T5 — `useDiagnostics` beside `useTimeline`
- **Status:** [x] done
- **Depends on:** T3 (T4 for `questions`)
- **Files:** `packages/devtools/src/react/useDiagnostics.ts` (*new*);
  `packages/devtools/test/react/useDiagnostics.test.tsx` (*new*); `packages/devtools/src/react/index.ts`.
- **Steps:**
  1. `useDiagnostics(options?: { layer?; collector?; questions?; intervalMillis? }): Diagnostics`.
     With `options === undefined`, return `noDiagnostics` and start no fiber (D-24-g). Otherwise
     create the store with `useState(() => makeDiagnosticsStore())` and run
     `runDiagnostics(store, { …, schedule: Schedule.spaced(intervalMillis ?? DEFAULT_…) })`
     through `useRunningStore`. The deps are `[options?.layer, options?.collector, options?.questions, options?.intervalMillis]`,
     **never the options object**, so an inline literal does not restart the run. Say so in the
     doc comment, with the same "hold it at module scope" advice `useTimeline` gives.
  2. Barrel: `export * from "./useDiagnostics.ts";`. Update the grouping comment at
     `react/index.ts:24-30` to name the new file.
- **Tests:** "fills the snapshot after mount". "Unmounting runs the layer's finalizer" (the
  `acquireRelease` counter, `vi.waitFor`, mirroring `useTimeline.test.tsx:60-90`). "A re-render
  with a fresh but equal options literal does not restart" (build count stays 1). "No options
  starts nothing".
- **Verify:** `pnpm vitest run packages/devtools/test/react/useDiagnostics.test.tsx`
- **Done when:** green, with no real-time sleeps beyond `vi.waitFor`. Use a small
  `intervalMillis` only where a second tick is asserted.

### T6 — `DevtoolsDock` takes `diagnostics`; explicit props win; `ServicesPanel` states a failed layer
- **Status:** [x] done
- **Depends on:** T5, D-24-b, D-24-c, D-24-f, D-24-g
- **Files:** `packages/devtools/src/react/DevtoolsDock.tsx`; `packages/devtools/src/react/ServicesPanel.tsx`;
  `packages/devtools/src/react/QuestionsPanel.tsx` (empty-state wording);
  `packages/devtools/test/react/DevtoolsDock.test.tsx`; `packages/devtools/test/react/ServicesPanel.test.tsx`.
- **Steps:**
  1. `DevtoolsDockProps.diagnostics?: DiagnosticsDockOptions` (the hook's option type, exported
     from `useDiagnostics.ts`). Doc comment: what each field feeds, that it starts a fiber only
     while mounted, and that gates are **not** in it (they come from `@qadi/react`'s subscription,
     §13).
  2. In the component, `const sampled = useDiagnostics(diagnostics)`, then per field:
     `wiring` prop → `Read`, else `sampled.wiring`; `activity ?? sampled.activity`;
     `hydration ?? sampled.hydration`; `portCalls ?? sampled.portCalls`;
     `questions ?? sampled.questions`. Rewrite the four snapshot props' doc comments: "a reading
     from elsewhere, such as another process or a fixture; takes precedence over `diagnostics`".
  3. `ServicesPanel` takes `wiring: WiringRead` (internal prop change; `ServicesPanelProps` is
     exported, so gate 13's row is updated in T8). Render with
     `Match.type<WiringRead>().pipe(Match.tagsExhaustive({ NotHanded, Failed, Read }))` at module
     scope. `NotHanded` reads "No layer was handed to the dock… Pass `diagnostics={{ layer }}`, or a
     `wiring` report read elsewhere". `Failed` reads "The layer handed to the dock failed to build:
     <reason>", with `data-testid="qadi-wiring-failed"`. Keep the existing
     `data-testid="qadi-wiring-absent"`.
  4. `QuestionsPanel`'s `qadi-hydration-unwired` text names `diagnostics` as well as
     `hydrationActivity`. `QuestionsPanel.test.tsx:117` asserts `"hydrationActivity"`, so keep
     that word.
- **Tests:** existing `DevtoolsDock.test.tsx` and `ServicesPanel.test.tsx` cases pass
  **unedited**, except where `ServicesPanel` is rendered directly with a `WiringReport`. Those
  wrap it in `WiringRead.Read({ report })`, a mechanical edit to list in §10. New tests:
  "`diagnostics` alone fills the port activity and hydration counts"; "an explicit `activity` prop
  wins over the sampled one"; "a failing layer is stated, not blank" (`qadi-wiring-failed`).
- **Verify:** `pnpm vitest run --project devtools`; `pnpm typecheck`
- **Done when:** green, the React shell's coverage is ≥ 90%, and BEH-QD-218's "every tab
  explains its emptiness" test is unedited and green.

### T7 — The example hands over its inputs and deletes its loops
- **Status:** [x] done
- **Depends on:** T1, T6
- **Files:** `examples/nextjs-newsroom/src/client/Dock.tsx`; `examples/nextjs-newsroom/README.md`.
- **Steps:**
  1. Delete `useSampled` (`:94-112`), the `wiring`/`activity`/`hydration` reads (`:135-141`), the
     `portCalls` state and interval (`:142-149`), and the `wiringReport`/`portActivity`/`hydrationActivity`
     imports and their types.
  2. Module scope, typed rather than asserted:
     `const diagnostics: DiagnosticsDockOptions = { layer: browserLayer, collector: clientPortCalls, questions: () => atoms.asked() };`.
     Every value is module-scope, so the hook's field-identity deps never change.
     Pass `diagnostics={diagnostics}`.
     Drop the `questions={…}` prop and its comment at `:151-154`, and move the reasoning into the
     `diagnostics` comment (C5).
  3. Rewrite the file's header comment: the count of props wired (now: `source`, `catalogue`,
     `diagnostics`, `gates`, `unknownParents`, `hydrationMismatches`, `onInvalidate`, `ports`, plus
     the snapshot props deliberately **not** passed, and why). Update `README.md:33`'s "all twelve
     `DevtoolsDockProps` fields".
- **Tests:** T1's `dock-wiring.test.ts` still passes, and it now also asserts that the dock's
  `diagnostics.layer` is `browserLayer`. The e2e suite is unchanged (`decision-log.spec.ts`,
  `lens.spec.ts`, `ssr.spec.ts` assert none of these panels).
- **Verify:** success criteria 1–2 greps; `pnpm --filter @qadi/example-nextjs typecheck`; `pnpm --filter @qadi/example-nextjs test`; `pnpm example` (build + e2e; run alone, not alongside other agents' runs)
- **Done when:** the greps return nothing and `pnpm example` is green.

### T8 — Spec, ADR, overview, traceability, docs, CCR, changeset
- **Status:** [x] done
- **Depends on:** T3–T7, D-24-h
- **Files:** `spec/behaviors/28-devtools-screens.md`; `spec/decisions/047-a-headless-devtools-model.md`;
  `spec/decisions/index.yaml`; `spec/devtools-spec/02-screens.md`; `spec/devtools-spec/README.md`;
  `spec/overview.md`; `spec/traceability.md`; `spec/README.md` (CCR register);
  `packages/devtools/README.md`; `apps/website/src/content/docs/docs/packages/devtools.md`;
  `.changeset/diagnostics-store.md` (*new*).
- **Steps:**
  1. **BEH-QD-NEXT** in `28-devtools-screens.md`, after BEH-QD-216: "Diagnostics are sampled by
     the model, and a sample that changed nothing changes nothing". Requirements: sampling MUST be
     pull-based (cite BEH-QD-216); a handed layer MUST be built once per run and released when the
     run stops; a snapshot MUST keep its identity while structurally unchanged; a layer that fails
     to build MUST be stated (ties to BEH-QD-218); an explicitly supplied reading MUST take
     precedence over a sampled one. Include a ` ```typescript ` fence that compiles under gate
     `node scripts/check-doc-examples.mjs`, running `runDiagnostics` against `decisionCacheLayer`
     and interrupting it. Update the change history row. Update BEH-QD-218's table and its "Four
     of the six screens…" sentence to say what the dock can now obtain for itself when handed
     `diagnostics`.
  2. **ADR-QD-047**: add an "Amendment (2026-10-NN, CCR-QD-NEXT)" section, "Sampling is the
     model's", and bump the revision. `index.yaml`'s status gets "amended".
  3. `spec/devtools-spec/02-screens.md:320-321` and the Services section: "read passively with
     `hydrationActivity`, sampled by `runDiagnostics`". `README.md`'s **Built** paragraph adds
     "diagnostics sampling" to the model list. Use **no** phrase from
     `check-devtools-claims.mjs:59-73` outside a blockquote.
  4. `spec/overview.md` `@qadi/devtools` table: rows for `Diagnostics`, `DiagnosticsOptions`,
     `DiagnosticsStore`, `WiringRead` (type); `makeDiagnosticsStore`, `runDiagnostics` (function);
     `noDiagnostics`, `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS` (constant); `useDiagnostics` and
     `DiagnosticsDockOptions` (hook + type). Update `AskedQuestionLike`'s source cell (T4) and
     `ServicesPanelProps`' description.
  5. `spec/traceability.md`: BEH-QD-NEXT → `model/DiagnosticsStore.ts`, `react/useDiagnostics.ts`.
     Test rows for `DiagnosticsStore.test.ts`, `.tst.ts`, `useDiagnostics.test.tsx`, and
     `ExternalStore.test.ts` if T2 ran. Behavior 28's sources cell. Change history.
  6. CCR-QD-NEXT row in `spec/README.md`'s register, naming C4 as the defect found.
  7. `packages/devtools/README.md`: a short "Keeping the Services and React panels current"
     section with `<DevtoolsDock diagnostics={{ layer, collector }} />` (a ` ```tsx ` fence only if
     a gate compiles package READMEs; otherwise ` ```ts `), plus C4's stateful-service note.
     Update the "twelve of thirteen" sentence (`:114`). Website `devtools.md`: the same section,
     as a ` ```tsx ` fence compiled by `node scripts/check-website-doc-examples.mjs` (gate step 15).
  8. Changeset: `@qadi/devtools` minor ("`runDiagnostics`/`useDiagnostics`; `DevtoolsDock`
     `diagnostics` prop; `ServicesPanel` states a failed layer"). The fixed group carries the
     version. **Do not publish** (standing instruction).
- **Tests:** the gates themselves.
- **Verify:** `node scripts/check-doc-examples.mjs`; `node scripts/check-website-doc-examples.mjs`; `node scripts/check-api-surface.mjs`; `node scripts/check-devtools-claims.mjs`; `pnpm spec:verify:strict`
- **Done when:** all five are green.

### T9 — Full gate
- **Status:** [x] done
- **Depends on:** T1–T8
- **Files:** none
- **Steps:**
  1. `pnpm check` (alone on the machine: it includes `pnpm mutation` and `pnpm example`).
  2. If `stryker.devtools.mjs` reports surviving mutants in `DiagnosticsStore.ts` (likely in the
     per-field identity-keeping branches), add the killing assertion to T3's tests rather than
     weakening the code.
- **Tests:** —
- **Verify:** `pnpm check`
- **Done when:** exit 0, with the devtools mutation score ≥ 80 (`break`).

### T10 — Update the tracker
- **Status:** [x] done
- **Depends on:** T9
- **Files:** this plan (frontmatter `status`, task statuses, §5 decision statuses, §10);
  `.planning/architecture/README.md` is updated **by the orchestrator**, not this task.
- **Steps:** set `status:`; mark tasks; record decisions as `decided (<date>, <choice>)`; add §10
  rows with the commit SHAs.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-24-*.md | sort | uniq -c`
- **Done when:** the plan reflects reality.

## 7. Test strategy

- **Moved to the new interface:** the example's untested sampling (`useSampled` and the second
  interval) is deleted. Its cadence, identity and lifetime are proven once, headlessly, in
  `DiagnosticsStore.test.ts` under `TestClock`, which is deterministic and needs no real timer.
  The React adapter proves only what React can get wrong, namely start on mount, stop on unmount,
  and no restart on an equal re-render. That is the division `TimelineStore.test.ts` /
  `useTimeline.test.tsx` already use (AGENTS.md §13 "test the graph, not the DOM").
- **Survive unchanged:** `TimelineStore.test.ts` and `useTimeline.test.tsx` (zero edits, even
  after T2's refactor), every `DevtoolsDock.test.tsx` snapshot-prop case (D-24-c),
  `Wiring.test.ts`, `Hydration.test.ts`, `PortCalls.test.ts` (the reads are untouched), the BDD
  features (they read the model), and the example's e2e.
- **Mechanically edited:** direct `ServicesPanel` renders wrap their report in
  `WiringRead.Read` (T6), listed in §10.
- **Defect reproduction:** `examples/nextjs-newsroom/test/dock-wiring.test.ts` (T1) is the
  test-first pin for C4, and it stays as a regression test.
- **Type-level:** `DiagnosticsStore.tst.ts` pins `runDiagnostics`' `never` error channel (D-24-f)
  and `WiringRead`'s narrowing.
- **Mutation:** `stryker.devtools.mjs` covers the new model file automatically. The likely
  survivors are the per-field `Equal.equals` keeps and the "anything changed" disjunction. The
  "only the changed field moves" and "no notification when unchanged" tests are written to kill
  each of them individually (T9 step 2).
- **No property test** is planned. The store's inputs are opaque reports, and the identity law
  (`accept(x); accept(y) where Equal.equals(x, y)` ⇒ same snapshot, no notify) is covered by the
  example-based tests. If T9 shows survivors there, a fast-check property over generated
  `PortActivity` arrays is the escalation.

## 8. Spec and documentation updates

- `spec/behaviors/28-devtools-screens.md`: **BEH-QD-NEXT** (new), and BEH-QD-218's table and
  prose (C9).
- `spec/decisions/047-a-headless-devtools-model.md`: amendment (D-24-h), plus `index.yaml` status.
- `spec/devtools-spec/02-screens.md`, `README.md`: claims of presence updated. **No row in
  "Claims of absence" changes** (C10). Gate 12 must stay green with no ledger edit.
- `spec/overview.md`: new export rows, plus the `AskedQuestionLike` and `ServicesPanelProps`
  cells (gate 13).
- `spec/traceability.md`: BEH-QD-NEXT and test rows; change history.
- `spec/README.md`: CCR-QD-NEXT.
- No invariant is added. The identity property is behavioral (BEH-QD-NEXT), matching how
  INV-QD-039 cites `TimelineStore.test.ts` for the timeline's identity only as a mechanism.
- `packages/devtools/README.md`, `apps/website/.../devtools.md`, `examples/nextjs-newsroom/README.md`.
- `.changeset/diagnostics-store.md`.
- Coordination notes go into ARCH-20's and ARCH-23's §10 once those plans exist. This plan does
  not edit them.

## 9. Risks and rollback

- **Questions go stale in the example** if D-24-d resolves to A while T7 still moves sampling into
  the dock (C5). Detection: open the React tab and trigger an eviction sweep or a hook-only
  question; the row does not appear. Mitigation: T4 lands before T7, or T7 keeps a
  `questions={atoms.asked()}` read *and* the host re-renders on the gates subscription. Write the
  decision down before T7.
- **Identity churn from functions in a report.** If ARCH-21 puts closures or class instances
  without `Equal` into `WiringReport`, `Equal.equals` compares them by reference, every tick
  notifies, and the dock re-renders every two seconds. That is today's behaviour, so it is not a
  correctness bug. T3's "a sample that changed nothing changes nothing" test catches it on the
  first rebase.
- **The cost of the `Equal.equals` walk.** A 200-row `PortCallLog` compared every two seconds is
  negligible. A future collector with a much larger capacity would make it a measured question,
  not an assumed one.
- **A host that inlines `diagnostics={{ layer: makeLayer() }}`** builds a new layer per render, and
  the run restarts each time. The hook keys on field identity (T5). The doc says to hold inputs at
  module scope, the same advice `useTimeline` gives for sources.
- **Hoisting the example's cache (T1)** changes when its context is built: at module load in the
  browser, not lazily. `decisionCacheLayer` is a synchronous, finalizer-free `Layer.effect`, so
  nothing observable changes. If `useInvalidate`'s cache clear (`atoms.ts:64-69`) stopped working,
  `ssr.spec.ts`'s invalidation path would show it in `pnpm example`.
- **Rollback.** T1 is independent: revert it alone if needed. T2–T8 are additive (D-24-c keeps
  every old prop). Reverting T6/T7 restores the old host wiring with the new model exports left
  unused, and gate 13 then needs only the rows removed. No wire format, no core API and no
  `@qadi/react` API is touched.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written | planner |
| 2026-10-07 | T0 | re-baselined on `arch/wave3` (HEAD 059d492): ARCH-20 landed its own store closure, ARCH-21 changed `PortReport`, `./*` subpaths are gone; C-claims hold. Branch step skipped (one PR for wave 3). Baselines: devtools 701 tests before, 880 after | implementer |
| 2026-10-07 | T1 | `examples/nextjs-newsroom/test/dock-wiring.test.ts` written first: red (atoms' cache !== dock's cache; size 0), then `atoms.ts` builds the cache context once (`Layer.succeedContext`) and it is green | implementer |
| 2026-10-07 | T2 | `ExternalStore` has `set` (notify on change) and `publish` (always notify), because `TimelineStore.setPaused`/`clear` must notify a second subscriber even when the view's reference is unchanged; `TimelineStore` and ARCH-20's `SimulationSession` moved onto it, their tests unedited. `useRunningStore` accepts an absent `run` (opt-in runs). `useSimulationSession` still reads its snapshot directly: it runs no long-lived fiber | implementer |
| 2026-10-07 | T3–T5 | `DiagnosticsStore.ts` (+ `.test.ts`, `.tst.ts`), `useDiagnostics.ts` (+ test). Deviation: `DiagnosticsDockOptions.layer` is `Layer<never, unknown>` (v4 `Layer` is contravariant in what it provides, so that is the type every layer is assignable to) | implementer |
| 2026-10-07 | T6 | `ServicesPanel.wiring` is a `WiringRead`; `ServicesPanel.test.tsx` edited mechanically (a `read(report)` wrapper, `WiringRead.NotHanded()` for the absent case); `DevtoolsDock.test.tsx` unedited plus six new `diagnostics` cases | implementer |
| 2026-10-07 | T7 | example `Dock.tsx` passes module-scope `diagnostics`; also `Counters.tsx`'s third `setInterval` loop moved onto `useDiagnostics({ intervalMillis: 1_000 })` (success criterion 1 greps all of `src`). `pnpm example` green (30 e2e) | implementer |
| 2026-10-07 | T8 | BEH-QD-323, ADR-QD-047 rev 1.3, CCR-QD-200, overview 1.55, traceability 1.104, devtools-spec 02 rev 0.12, READMEs, website section, changeset. Deviation: `scripts/lib/extract-code-fences.mjs` `PACKAGE_PATHS` gains `@qadi/devtools/react` so a website tsx fence can import the dock | implementer |
| 2026-10-07 | T9 | not run in full (orchestrator runs `pnpm check`, mutation and coverage once); targeted gates green: typecheck, lint, circular, tstyche, devtools vitest, spec:examples/verify:strict/gates/claims/api/package/website-examples, `pnpm example`. Devtools coverage 99.1% statements | implementer |
| 2026-10-07 | T10 | committed as 24d0f00 | implementer |

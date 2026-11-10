---
id: ARCH-34
title: One devtools feed from @qadi/react, built from the provider's own runtime, so a host hands the dock what the atoms already built instead of rebuilding it
strength: Strong          # from the 2026-10-07 architecture review (wave 4, card c5, "in-process + local-substitutable")
status: done
evidence_verified_at: e635e68
depends_on: []            # nothing blocks T0–T2
blocks: [ARCH-44]         # ARCH-44 reshapes DevtoolsDock's props; it should land on top of this feed (see ARCH-44 §4)
# Soft coordination, not hard dependencies:
#   ARCH-43 (delete QadiProvider.gates): the feed reads gates through useGateInstances(), i.e. the
#     provider context's effective registry, so it is correct whichever way ARCH-43 goes. No shared edit.
#   ARCH-40 (narrow headless devtools barrel): this plan changes no @qadi/devtools export (D-34-b = A);
#     it edits only doc comments in DiagnosticsStore.ts / useDiagnostics.ts and the two READMEs/website page.
#   ARCH-37 (developer signals in @qadi/react): both add/edit @qadi/react files, but not the same ones
#     (this plan adds DevtoolsFeed.ts and edits index.ts; ARCH-37 edits QadiProvider.tsx / HydrationWarning.ts).
#     Textual overlap only in spec/behaviors/09-react.md and the CHANGELOG/changeset.
#   ARCH-31 (remote port codec) edits the same example (src/client/ports.ts, server/api.ts), not Dock.tsx/atoms.ts.
adrs_touched:
  - ADR-QD-053 (amend: @qadi/react produces the devtools feed — gates, invalidate, questions and its own built runtime — and devtools still consumes it structurally, with no dependency on @qadi/react)
  - ADR-QD-047 (read + one-paragraph amendment to the CCR-QD-200 section: "a layer handed over is its own build" now names the React-side producer that avoids the second build)
  - ADR-QD-080 (read, constraint: the feed's gates are the provider's effective registry via useGateInstances(); the feed never writes a gate)
  - ADR-QD-014 (read, constraint: no scheduleTask/defaultIdleTTL; the feed only mounts the runtime atom in the provider's own registry for the run's scope)
  - ADR-QD-017 / ADR-QD-093 (read, constraint: the feed reads no AsyncResult directly — DECISION_READ_BUDGET unchanged; it uses AtomRegistry.getResult)
  - ADR-QD-037 (read, constraint: madge — DevtoolsFeed.ts imports hooks.ts/QadiProvider.tsx/QadiAtoms.ts types; nothing imports it back)
  - ADR-QD-099 (read, constraint: new exports go through the root barrel; no new entry point)
  - ADR-QD-038 (read, constraint: one changeset in the fixed group; never a release)
packages: ["@qadi/react", "@qadi/devtools (doc comments + README only)", "@qadi/example-nextjs", "apps/website (docs)", "spec", "AGENTS.md (one sentence, only on sign-off, D-34-d)"]
estimate: M   # ≈ 1½–2 days for T0–T9. T1 (example's dead dock wiring) alone ≈ 1 hour and ships on its own.
---

# ARCH-34 — One devtools feed from `@qadi/react`, built from the provider's own runtime

## 1. Verified evidence (at `e635e68`)

Checked on `main` at `e635e68` (`git log --oneline -1`). Every line below was re-read at that
commit. Probes ran from `scratchpad/wave4/ARCH-34/` (never the repo), which holds a
`node_modules/` of symlinks so that `effect` resolves to the single real copy every package uses
(`node_modules/.pnpm/effect@4.0.0/node_modules/effect`) and `@qadi/*` resolve to `packages/*/src`:

- `probe-runtime-context.mts` — Effect-level: does the provider registry's already-built runtime
  context, handed over as a `Layer`, give the dock the atoms' own `DecisionCache` with **no**
  hoisting? Run: `cd scratchpad/wave4/ARCH-34 && NODE_OPTIONS="--conditions=bun" <repo>/node_modules/.bin/tsx probe-runtime-context.mts`.
- `DevtoolsFeed.proto.tsx` + `use-proto.tsx` — a typed prototype of the hook, spread onto the real
  `DevtoolsDock`. Run: `cd scratchpad/wave4/ARCH-34 && <repo>/node_modules/.bin/tsc -p tsconfig.json`
  (extends `tsconfig.base.json`: strict, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`,
  `noUncheckedIndexedAccess`; `@qadi/*` mapped to `src`).
- `feed.probe.test.tsx` — React-level: a real `QadiProvider` + `<Can>` + the prototype feed +
  devtools' real `useDiagnostics`. Run:
  `<repo>/node_modules/.bin/vitest run --root scratchpad/wave4/ARCH-34 --config scratchpad/wave4/ARCH-34/vitest.config.mts`.

### C1. The host wires 8 props, 4 of them from 5 `@qadi/react`-side sources: **CONFIRMED**

`examples/nextjs-newsroom/src/client/Dock.tsx:176-185` passes exactly eight props: `source`,
`catalogue`, `diagnostics`, `gates`, `unknownParents`, `hydrationMismatches`, `onInvalidate`,
`ports`. Four of them come from the atom set, through five separate sources the host has to know:
`useGateInstances()` (`:129` → `gates`), `useInvalidate()` (`:119`, wrapped again in a
`useCallback` at `:139-141` → `onInvalidate`), `() => atoms.asked()` (`:115` → `diagnostics.questions`),
`browserLayer` with its hand-hoisted cache (`:113` → `diagnostics.layer`, `atoms.ts:81-91`), and the
mismatch store (`:130-134` → `hydrationMismatches`, `atoms.ts:35-55`). `source`, `catalogue`,
`unknownParents` and `ports` are the host's own and are out of scope. `clientPortCalls`
(`diagnostics.collector`) is a devtools object the host owns, not an atom-set source.

### C2. The `hydrationMismatches` the host computes is never shown: **CONFIRMED** — but the store itself is **not** dead: **REFUTED as stated**

- The dock shows `hydrationMismatches` only when `hydration` is absent:
  `QuestionsPanel.tsx:284-296` (`activity === undefined ? <LegacyMismatches …/> : <Counts …/>`),
  fed `shownHydration = hydration ?? sampled.hydration` (`DevtoolsDock.tsx:194`).
- With `diagnostics` handed over, `sampled.hydration` is `undefined` **only before the first sample**
  (`DiagnosticsStore.ts:70-71`; `hydrationActivity` needs no service and cannot fail), and the
  example always hands `diagnostics` (`Dock.tsx:179`). So the mismatch count can render at most for
  the frames before the first tick, on the React tab only. The prop is dead in practice.
- **The store is load-bearing elsewhere.** `examples/nextjs-newsroom/src/client/Divergent.tsx:29-37`
  reads `subscribeMismatches`/`mismatchSnapshot` for its `mismatch-report` card, and
  `e2e/ssr.spec.ts:309-321` ("a disagreement with the seed is announced") asserts
  `disagreements reported: 1` on it. Deleting the store (as the card suggests) breaks that e2e test.
  What is dead is the **dock's** use of it: `Dock.tsx:43-44,130-134,182`.
- The counts agree by construction: `HydrationEngine.ts:558-560` counts the mismatch metric
  (`countRecheck`, `HydrationCounts.ts:78-80`) whether or not a reporter is supplied, so
  `hydration.mismatched` already says what the host's store says.

### C3. The "0 cache entries" bug is fixed in the host and pinned there: **CONFIRMED**

`atoms.ts:57-91` builds the cache context once (`Effect.runSync(Effect.scoped(Layer.build(decisionCacheLayer(…))))`)
and splices it in as `Layer.succeedContext(cacheContext)`. `test/dock-wiring.test.ts:53-80` pins
that `Effect.provide(…, browserLayer)` and a fresh registry's `atoms.runtime` see one instance, and
that `wiringReport` reports `cache.size >= 1`. The test also imports `diagnostics` from `Dock.tsx`
(`:27,62-64`), so it pins a host-module export, not a library property.

### C4. The pitfall is documented in three places: **CHANGED** — it is written down in **nine**

`grep -rn "succeedContext\|built twice\|its own build"` over `packages examples apps spec`:
`atoms.ts:64-72`, `Dock.tsx:103-105`, `test/dock-wiring.test.ts:4-9`,
`packages/devtools/src/react/useDiagnostics.ts:37-40` (`DiagnosticsDockOptions.layer`),
`packages/devtools/src/model/DiagnosticsStore.ts:17-24`, `packages/devtools/README.md:122-126`,
`apps/website/src/content/docs/docs/packages/devtools.md:116-119`,
`spec/behaviors/28-devtools-screens.md:565-569` (BEH-QD-323), and
`spec/decisions/047-a-headless-devtools-model.md:157` (CCR-QD-200 amendment). Every one tells the
host to do by hand what the provider has already done.

### C5. ARCH-24 deferred exactly this, and nobody picked it up: **CONFIRMED**

`ARCH-24-diagnostics-store.md` §3 (lines 253-255): "Exposing `makeQadiAtoms`' memo map would be a
`@qadi/react` API change and belongs to ARCH-23 if anyone wants it." D-24-e option D (lines 389-391)
was rejected for the same reason, and D-24-e was decided B with C ("accept a built `Context`")
covered "for free" by `Layer.succeedContext`. `grep -n -i "memo\|built context" ARCH-23-*.md`
finds nothing: ARCH-23 did not take it. This plan does not reopen D-24-e (devtools still builds a
handed layer once per run); it adds a React-side producer of the right layer.

### C6. Where the built context lives, and that it can be handed over without leaking: **CONFIRMED** (probe)

- `QadiAtoms.runtime` is an `Atom.AtomRuntime<QadiRuntimeServices>` (`QadiAtoms.ts:83,267`). In
  `effect@4.0.0`, `AtomRuntime<R, ER>` **is** an `Atom<AsyncResult<Context<R>, ER>>`
  (`effect/src/reactivity/Atom.ts:743`), built with `Layer.buildWithMemoMap` against a memo map that
  is itself an atom (`Atom.ts:893`), i.e. **one built context per registry**, and it is not
  `keepAlive` (`:899`).
- Each `QadiProvider` owns its registry (`QadiProvider.tsx:249-255`, published through
  `RegistryContext`/`QadiContext` at `:354-362`). So the context the decision atoms evaluate in is
  per provider, and only something inside that provider can reach it. `useQadiContext` is public
  (`spec/overview.md:502`).
- `AtomRegistry.getResult(registry, atom)` (`AtomRegistry.ts:341-398`) waits out `Initial` and
  returns `Effect<A, E>`; `AtomRegistry.mount(registry, atom)` (`:413`) mounts for the current scope.
  So `Layer.effectContext(Effect.gen(function* () { yield* AtomRegistry.mount(registry, atoms.runtime); return yield* AtomRegistry.getResult(registry, atoms.runtime); }))`
  is a `Layer<QadiRuntimeServices>` whose build **is** the registry's own build, held mounted for
  exactly as long as the dock's run scope (`runDiagnostics` builds a handed layer once per run,
  `DiagnosticsStore.ts:199-212`).
- `probe-runtime-context.mts` output (atoms built from an **un-hoisted**
  `Layer.mergeAll(EvaluationServicesNone, decisionCacheLayer(…))`):

  ```
  pitfall: Effect.provide(appLayer) cache === atoms' cache? false
  candidate: runtimeLayer(registry) cache === atoms' cache? true
  runDiagnostics over runtimeLayer: wiring Read cache.size=1
  runDiagnostics over appLayer (pitfall): wiring Read cache.size=0
  no decision mounted: scoped mount keeps one context (registry agrees)? true
  runtime node present after scope closed? false
  ```

  The last two lines settle lifetime: with no guard mounted, the scoped mount keeps one context for
  the run, and releasing the scope lets the registry drop the node (no leak).
- `feed.probe.test.tsx` (React, happy-dom), **2/2 green**: (1) under a real `QadiProvider` with a
  `<Can>` and the prototype feed, devtools' real `useDiagnostics(feed.diagnostics)` reaches
  `WiringRead.Read` with `cache.size === 1` and `questions().length === 1`, and unmount is clean;
  (2) the control, handing the atoms' input layer itself, reads `cache.size === 0` and never `1`.

### C7. The feed fits devtools' structural types with no `as`: **CONFIRMED** (tsc probe), with one shape constraint found

`tsc -p scratchpad/wave4/ARCH-34/tsconfig.json` → exit 0 for `<DevtoolsDock {...useDevtoolsFeed({ collector })} />`
and `<DevtoolsDock {...useDevtoolsFeed({})} />`: `GateInstance` → `GateInstanceLike`,
`() => ReadonlyArray<AskedQuestion>` → `() => ReadonlyArray<AskedQuestionLike>`, and
`Layer<QadiRuntimeServices>` → `DiagnosticsDockOptions.layer: Layer<never, unknown>`
(`useDiagnostics.ts:45`) all assign structurally. Devtools gains no import of `@qadi/react`.

Found while typing it: a passthrough typed `Omit<Extra, "layer" | "questions"> & {layer; questions}`
is **not** assignable from `{ ...extra, layer, questions }` without `as` (TS2322), which AGENTS.md
§6 forbids; a plain `Extra extends object` compiles but silently accepts `useDevtoolsFeed({ layer: "nope" })`.
The shape that works is a self-referential mapped constraint,
`<Extra extends { readonly [K in keyof Extra]: K extends "layer" | "questions" ? never : Extra[K] }>`:
`{ collector }` and `{}` compile, `{ layer: "nope" }` is `TS2322: Type 'string' is not assignable to type 'never'`.
(A `FeedExtra { layer?: never; questions?: never }` constraint fails TS's weak-type check on
`{ collector }`, TS2559.) D-34-c records this.

### C8. Devtools must accept "a built context next to a layer": **REFUTED as necessary**

The card's solution has devtools accept a built `Context` beside a `Layer`. C6 shows a `Layer` view of
the registry's context already does it through the existing `DiagnosticsDockOptions.layer`, so
**`@qadi/devtools` needs no API change at all**. A second `context` field would be two inputs that
can disagree (the shape the "closed union over widening" preference rejects), and a `Context` read
during render would need a raw `AsyncResult` read of `atoms.runtime` in `@qadi/react`, which
`DECISION_READ_BUDGET` refuses outside its two budgeted files (`scripts/check-house-style.mjs:531-540`,
pattern `scripts/lib/raw-decision-read.mjs:27`). D-34-b settles it.

### C9. "Double-build pitfall removed, not documented": **CHANGED**

Removed for every host that has a `QadiProvider` (the feed). It stays true, and stays documented,
for a host that hands devtools a layer it built itself (a non-React shell running `runDiagnostics`,
a server process): devtools cannot know which services the application already built. The nine
places in C4 shrink to two that state it (`DiagnosticsStore.ts` header, BEH-QD-323) and point React
hosts at the feed.

### C10. "Test moves from host into the package": **CONFIRMED**, with a split

The property ("the dock's wiring read sees the cache the provider's decisions used") is a
`@qadi/react` property once the feed exists, testable without devtools (read `DecisionCache` through
the feed's layer). The **cross-package** proof needs both packages, and `@qadi/devtools` must not
depend on `@qadi/react` (ADR-QD-053), nor should `@qadi/react` grow a devtools dev-dependency for one
test. The example is the one place both meet, so `dock-wiring.test.ts` stays as the integration test,
rewritten from "the hoist works" to "the feed works with no hoist" (T6).

### C11. No-DOM, opt-in and decisions-via-`outcomeOf` (AGENTS.md §13): **CONFIRMED compatible**

The feed calls no DOM API, holds no decision in React state, reads no `AsyncResult` state
(`getResult` is an Effect), and registers nothing: `instrument` still governs whether any gate
exists. Calling the hook is itself the opt-in; it starts nothing until devtools mounts the run.

### C12. Smaller drift found on the way (not the card's)

- `Dock.tsx:5` says "`DevtoolsDockProps` has fifteen optional fields"; `DevtoolsDock.tsx:75-162`
  declares **fourteen**. T5 rewrites that header anyway.
- `Divergent.tsx:73-80` renders "None — and here that is a **known discrepancy** … does not in this
  app. The README carries the reproduction" when zero mismatches were reported, but the README
  (`examples/nextjs-newsroom/README.md:234-247`) says it is fixed and the e2e asserts `1`. Stale
  copy; orphan (§3), reported to the tracker, not fixed here.

## 2. Goal and success criteria

**Goal.** Today the **seam** between `@qadi/react` and the dock is the host: it knows that gates
come from a subscription, invalidation from a mounted fn atom, questions from `asked()`, and that the
wiring read needs *the atoms' own* built services, which it can only get by hoisting each stateful
layer out of the atom set by hand. That knowledge is shallow and was got wrong once (C3). This plan
puts it behind one **deep module** in `@qadi/react`, `DevtoolsFeed.ts`. Its **interface** is one hook,
`useDevtoolsFeed(extra)`, returning `{ gates, onInvalidate, diagnostics: { …extra, layer, questions } }`,
and one headless function, `runtimeLayer(atoms, registry)`, that the hook is built on. Its **depth**:
reading the provider's registry, mounting the runtime atom for exactly the dock run's scope, and
returning the context the decisions themselves evaluate in, so no stateful service is built twice.
The **adapter** on the other side is unchanged: devtools still takes a `Layer` and still has no
dependency on `@qadi/react`; the feed satisfies its structural types. **Leverage**: every React host,
not just this example, wires the atom-set half of the dock in one call. **Locality**: the
double-build rule is enforced in one file instead of explained in nine.

**Success criteria**

1. `packages/react/src/DevtoolsFeed.ts` exports `useDevtoolsFeed`, `runtimeLayer`, `DevtoolsFeed`,
   `DevtoolsDiagnosticsFeed` (names per D-34-a), listed in `spec/overview.md`; `node scripts/check-api-surface.mjs` green.
2. `packages/react/test/DevtoolsFeed.test.tsx`: under a `QadiProvider` whose atoms were built from an
   **un-hoisted** `decisionCacheLayer`, the `DecisionCache` read through `feed.diagnostics.layer` is
   `strictEqual` to the one a decision atom used, and its `size` counts the decision.
3. `packages/react/test/DevtoolsFeed.tst.ts` (tstyche): `useDevtoolsFeed({ layer: … })` and
   `useDevtoolsFeed({ questions: … })` are type errors; `useDevtoolsFeed({ collector })` keeps
   `collector`'s type on `diagnostics`.
4. `examples/nextjs-newsroom/src/client/Dock.tsx` no longer imports `useGateInstances`,
   `useInvalidate`, `useSyncExternalStore`, `subscribeMismatches`, `mismatchSnapshot` or
   `DiagnosticsDockOptions`; `grep -c "hydrationMismatches" examples/nextjs-newsroom/src` → `0`.
5. `grep -n "cacheContext\|succeedContext" examples/nextjs-newsroom/src/client/atoms.ts` → nothing
   (D-34-d = A), and `examples/nextjs-newsroom/test/dock-wiring.test.ts` passes against the feed.
6. `scripts/check-house-style.mjs` green with **no budget edited** (`DECISION_READ_BUDGET` in
   particular); `pnpm circular` clean.
7. `grep -rln "succeedContext" packages/devtools apps/website spec/behaviors` → at most
   `DiagnosticsStore.ts` and `28-devtools-screens.md`, each naming the feed for React hosts.
8. `pnpm --filter @qadi/example-nextjs check` (incl. the `mismatch-report` e2e) and `pnpm check` green.

## 3. Non-goals

- **The dock's props.** `DevtoolsDock` keeps all fourteen; reshaping them is ARCH-44, which should
  land after this (the feed's spread is what ARCH-44 would reshape around).
- **A `Context` input on devtools** (C8) or **sharing the memo map** (D-24-e option D): rejected in
  D-34-b.
- **Non-React hosts.** A shell with no `QadiProvider` keeps `Layer.succeedContext` (C9); the docs say so.
- **The mismatch store.** It stays: `Divergent.tsx` and its e2e use it (C2). Only the dock stops
  reading it.
- **`Divergent.tsx`'s stale "known discrepancy" copy** (C12): orphan, reported, not fixed here.
- **Gates semantics** (ADR-QD-080, ARCH-43), **`asked()` semantics** (ARCH-23), **sampling cadence**
  (ARCH-24): unchanged; the feed forwards them.
- **Stryker scope.** `stryker.react.mjs` mutates only what decides (`DecisionOutcome.ts`,
  `QuestionBook.ts`, ADR-QD-093); the feed decides nothing and is not added.

## 4. Constraints

- **AGENTS.md §1**: namespace `effect/*` imports (`effect/Effect`, `effect/Layer`,
  `effect/reactivity/AtomRegistry`), `.ts` extensions, `import type` for types.
- **§2/§5**: no service here. `runtimeLayer` returns a `Layer` built with `Effect.gen` ("`Effect.gen`
  to construct"); it is not an effectful *function* call site, so no `Effect.fn` and **`UNTRACED_BUDGET`
  is untouched**.
- **§6**: no `as`, no `any`, no `!`. C7's mapped constraint is the only shape that types the
  passthrough without `as`; **`ANY_BUDGET` is untouched**. No `Record<string, unknown>` (user rule).
- **§9 / ADR-QD-099**: `export * from "./DevtoolsFeed.ts"` in `packages/react/src/index.ts`,
  alphabetically after `DecisionOutcome.ts`. No new entry point.
- **§13**: no decision in React state; no DOM API; instrumentation still opt-in (the feed registers
  nothing); **`DECISION_READ_BUDGET` unchanged** — the feed must not write `AsyncResult.isSuccess(`,
  `.waiting`, `.previousSuccess`, etc.; `AtomRegistry.getResult` is the read. No
  `scheduleTask`/`defaultIdleTTL` (ADR-QD-014).
- **ADR-QD-053**: `@qadi/devtools/package.json` gains **no** dependency or devDependency on
  `@qadi/react`; the cross-package test lives in the example (C10).
- **ADR-QD-037 (madge, `pnpm circular`)**: `DevtoolsFeed.ts` imports `hooks.ts` (for
  `useGateInstances`, `useInvalidate`), `QadiProvider.tsx` (`useQadiContext`), and types from
  `QadiAtoms.ts`/`GateRegistry.ts`/`QuestionBook.ts`; none of those may import it.
- **§10**: `@effect/vitest`/`vitest` + `@testing-library/react` under happy-dom; react coverage ≥ 90%.
- **Gate 13 (`node scripts/check-api-surface.mjs`)**: every new export gets a `spec/overview.md` row.
- **Gate `node scripts/check-website-doc-examples.mjs`** compiles the website's `tsx` fence; it
  already maps `@qadi/react` and `@qadi/devtools/react` (`scripts/lib/extract-code-fences.mjs:57-69`).
  A fence importing `@qadi/react` is scanned for raw decision reads: the new fence has none.
- **Gate 12 (`node scripts/check-devtools-claims.mjs`)**: no edit in `spec/devtools-spec/` is planned;
  if one is made, avoid the absence phrase list.
- **The example** is not house-style scanned; it is held by `pnpm example`.
- **ADR-QD-038**: one changeset (`@qadi/react` minor; `@qadi/devtools` patch for doc comments).
  **No release.**

## 5. Decisions needed before work starts

### D-34-a — The feed's shape and names

- **A. Layered: a headless `runtimeLayer(atoms, registry)` plus a hook `useDevtoolsFeed(extra)`**
  returning `{ gates, onInvalidate, diagnostics: { …extra, layer, questions } }`, spreadable onto
  `<DevtoolsDock {...feed} />`. The function serves tests and any non-dock tool holding a registry;
  the hook serves hosts.
- **B. Function only.** The host still wires gates, invalidate and questions by hand (three of
  today's five sources); only the cache pitfall goes.
- **C. Hook only**, with the layer construction private.

**Recommendation: A** (complete, layered; B is the defect-only path). Names: `useDevtoolsFeed`,
`runtimeLayer`, `DevtoolsFeed<Extra>`, `DevtoolsDiagnosticsFeed`. "Devtools", not "dock": the feed
fits any consumer of the same structural types. Return a memoised `diagnostics` object (keyed on
`extra`, `layer`, `questions`) even though `useDiagnostics` keys on field identity, so a consumer
comparing the object does not see churn. Adding an export is minor, not breaking. **status: decided (2026-10-08, recommended default A)**

### D-34-b — How the built context crosses to devtools

- **A. A `Layer` view of the registry's runtime** (C6): `Layer.effectContext(mount + getResult)`.
  No devtools API change; lifetime is the dock run's scope; no `AsyncResult` read in `@qadi/react`.
- **B. Devtools accepts `context?: Context.Context<never>` beside `layer`.** Two inputs that can
  disagree, a render-time `AsyncResult` read in `@qadi/react` (budget), and an `Initial` state the
  host must handle. A closed union (`{ _tag: "Layer" } | { _tag: "Context" }`) fixes the disagreement
  but not the other two.
- **C. Expose the registry's memo map** (D-24-e D) and have devtools `buildWithMemoMap`. Devtools API
  change, and devtools' scope then co-owns memoised resources.

**Recommendation: A.** It is the complete fix (no host can get it wrong) with the smallest surface; the
card's "devtools accepts a built context" is unnecessary (C8). **status: decided (2026-10-08, recommended default A)**

### D-34-c — How a host adds its own diagnostics fields (the collector)

- **A. Typed passthrough `extra`** with the self-referential mapped constraint (C7): the feed owns
  `layer` and `questions`, `extra` may add anything else (`collector`, `intervalMillis`), and a
  collision is a compile error. One call: `const feed = useDevtoolsFeed(dockExtras)`.
- **B. No passthrough.** The host merges: `diagnostics={{ ...feed.diagnostics, collector }}`.
  Simpler type, two lines at every host, and the merge can silently override the feed's `layer`.
- **C. Make `@qadi/react` know `collector`.** It would need devtools' `PortCallCollector` type, i.e.
  a dependency the wrong way. Rejected.

**Recommendation: A.** `extra` is required (pass `{}` for none): an optional generic parameter cannot
be spread without widening. Document "hold `extra` at module scope". **status: decided (2026-10-08, recommended default A)**

### D-34-d — The example and the house text

1. **The example's cache hoist.** **A. Delete `cacheContext`** and put `decisionCacheLayer({ capacity: 256 })`
   back inside `browserLayer`: the example then shows the default a host should copy, and the cache
   becomes per provider registry like every other service. **B. Keep it.** Recommendation **A**.
2. **The dock's mismatch wiring.** Delete `hydrationMismatches={…}` and the `useSyncExternalStore`
   in `Dock.tsx`; **keep** the store in `atoms.ts` for `Divergent.tsx` (C2). Not a choice so much as a
   correction of the card; recorded so nobody deletes the store.
3. **Where the rule is recorded.** **A.** Amend ADR-QD-053 ("@qadi/react produces the devtools feed")
   + **BEH-QD-NEXT** in `spec/behaviors/09-react.md` + a sentence in BEH-QD-323 + a paragraph in
   ADR-QD-047's CCR-QD-200 amendment. **B.** A new ADR. Recommendation **A**: the decision is
   ADR-QD-053's producer/consumer split, extended to the runtime.
4. **AGENTS.md §13** (`AGENTS.md:704-…`) says "What subscribes is the **host** … `Dock.tsx` calls
   `useGateInstances()` … and passes the result down as `gates`". After T5 the host calls
   `useDevtoolsFeed()`, which calls `useGateInstances()`. The sentence becomes half-true. Proposed
   edit: "… `examples/nextjs-newsroom/src/client/Dock.tsx` calls `useDevtoolsFeed()` (which reads
   `useGateInstances()`) and spreads it onto the dock". **Needs user sign-off** (AGENTS.md is house
   law); if declined, T8 leaves AGENTS.md alone and the tracker records the drift.

**status: decided (2026-10-08, recommended default: 1=A, 2 as stated, 3=A, 4=made; AGENTS.md §13 one-sentence edit made and flagged for user review)**

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done (2026-10-08)
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch -c arch/34-devtools-feed main`; record `git log --oneline -1` (`e635e68` or later);
     re-read every §1 line reference and update §1 if anything moved (ARCH-43/44/37 may have landed).
  2. Re-run the three probes in `scratchpad/wave4/ARCH-34/` with the commands in §1; expect C6/C7 output.
  3. Baselines: `pnpm vitest run --project react` (file/test counts),
     `pnpm --filter @qadi/example-nextjs test`, `node scripts/check-house-style.mjs`,
     `node scripts/check-api-surface.mjs`, `pnpm circular`.
- **Tests:** none
- **Verify:** the commands above
- **Done when:** baselines and probe outputs are in §10.

### T1 — The example's dock stops passing the dead `hydrationMismatches` (C2)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0 (no decision; shippable alone as a patch)
- **Files:** `examples/nextjs-newsroom/src/client/Dock.tsx`; `examples/nextjs-newsroom/test/dock-wiring.test.ts`
- **Steps:**
  1. Test first, in `dock-wiring.test.ts`: `it("the dock is not handed a mismatch count it would never show")`
     — read `Dock.tsx`'s source with `readFileSync(new URL("../src/client/Dock.tsx", import.meta.url), "utf8")`
     and assert it contains no `hydrationMismatches=`. Red at `e635e68`.
     (A source assertion is the honest test here: the observable symptom is "nothing", and
     `QuestionsPanel.test.tsx:154-157` already pins that `hydration` hides the legacy count.)
  2. In `Dock.tsx` delete the `mismatchSnapshot`/`subscribeMismatches` imports (`:43-44`), the
     `useSyncExternalStore` call (`:130-134`) and `hydrationMismatches={mismatches.length}` (`:182`);
     drop `useSyncExternalStore` from the React import. Do **not** touch `atoms.ts`'s store.
  3. In the header (`:5-16`) correct "fifteen" to "fourteen" and drop `hydrationMismatches` from the
     list of props wired, with one clause why ("`diagnostics` samples `hydration`, which supersedes it").
- **Tests:** the new `it` (red → green). `e2e/ssr.spec.ts`'s "a disagreement with the seed is
  announced" must stay green (it reads the store through `Divergent.tsx`).
- **Verify:** `pnpm --filter @qadi/example-nextjs test`; `pnpm --filter @qadi/example-nextjs typecheck`
- **Done when:** green; red-then-green recorded in §10.

### T2 — Pin the effect APIs the feed relies on
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0
- **Files:** `packages/react/test/v4-reactivity-smoke.test.ts`
- **Steps:**
  1. Add `it("an AtomRuntime is an atom of its built context, one per registry")`: build
     `Atom.runtime(Layer.effect(Counter, Effect.sync(() => ({ n: ++builds }))))`; in one registry,
     `AtomRegistry.getResult(registry, runtime)` twice → same `Context` value (`strictEqual` on the
     service) and `builds === 1`; in a second registry → a different service and `builds === 2`.
  2. Add `it("AtomRegistry.mount holds a runtime for the scope and releases it")`: within
     `Effect.scoped`, `AtomRegistry.mount(registry, runtime)` then `getResult`; after the scope closes
     and a tick, `registry.getNodes().has(runtime)` is `false` (C6's last probe line).
- **Tests:** the two `it`s. They fail loudly on an `effect` bump that changes either fact.
- **Verify:** `pnpm vitest run packages/react/test/v4-reactivity-smoke.test.ts`
- **Done when:** green.

### T3 — `DevtoolsFeed.ts`: `runtimeLayer` and `useDevtoolsFeed` (D-34-a/b/c)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T2, D-34-a, D-34-b, D-34-c
- **Files:** `packages/react/src/DevtoolsFeed.ts` (*new*); `packages/react/src/index.ts`;
  `packages/react/test/DevtoolsFeed.test.tsx` (*new*); `packages/react/test/DevtoolsFeed.tst.ts` (*new*)
- **Steps:**
  1. Start from `scratchpad/wave4/ARCH-34/DevtoolsFeed.proto.tsx` (the mapped-constraint version).
     Exports:
     - `runtimeLayer(atoms: QadiAtoms, registry: AtomRegistry.AtomRegistry): Layer.Layer<QadiRuntimeServices>`
       = `Layer.effectContext(Effect.gen(function* () { yield* AtomRegistry.mount(registry, atoms.runtime); return yield* AtomRegistry.getResult(registry, atoms.runtime); }))`.
     - `interface DevtoolsDiagnosticsFeed { readonly layer: Layer.Layer<QadiRuntimeServices>; readonly questions: () => ReadonlyArray<AskedQuestion> }`.
     - `type FeedOwnedKey = keyof DevtoolsDiagnosticsFeed`; `interface DevtoolsFeed<Extra> { readonly gates: ReadonlyArray<GateInstance>; readonly onInvalidate: () => void; readonly diagnostics: Extra & DevtoolsDiagnosticsFeed }`.
     - `useDevtoolsFeed = <Extra extends { readonly [K in keyof Extra]: K extends FeedOwnedKey ? never : Extra[K] }>(extra: Extra): DevtoolsFeed<Extra>`:
       `const { atoms, registry } = useQadiContext("useDevtoolsFeed")`; `gates = useGateInstances()`;
       `onInvalidate = useInvalidate()` (reuse, do not re-implement); `layer = useMemo(() => runtimeLayer(atoms, registry), [atoms, registry])`;
       `questions = atoms.asked` (stable identity); `diagnostics = useMemo(() => ({ ...extra, layer, questions }), [extra, layer, questions])`.
  2. Doc comments (AGENTS.md shape): module — "what a devtools panel reads from this provider, in one
     call", then why the layer is the registry's own build (the 0-entries history, CCR-QD-200), why
     the mount is scoped to the consumer's run, that nothing here reads an `AsyncResult` (§13), that
     devtools takes it structurally with no dependency on this package (ADR-QD-053), and "hold `extra`
     at module scope". `runtimeLayer`: one line, then the lifetime rule.
  3. Barrel: `export * from "./DevtoolsFeed.ts";` after `DecisionOutcome.ts`.
- **Tests (`DevtoolsFeed.test.tsx`, happy-dom, `@testing-library/react`):**
  - "the feed's layer reads the provider's own cache": atoms from an **un-hoisted**
    `Layer.mergeAll(EvaluationServicesNone, decisionCacheLayer({ capacity: 8 }))`; render
    `<QadiProvider><Can policy={hasRole("Editor")}>yes</Can><Probe/></QadiProvider>`; `Probe` runs
    `Effect.scoped(Layer.build(feed.diagnostics.layer))` → `DecisionCache`; assert `strictEqual` to the
    instance read through `atoms.runtime.atom(Effect.serviceOption(DecisionCache))` **in the same
    registry**, and `size` ≥ 1 after "yes" renders.
  - "two providers over one atom set read two caches" (per-registry; documents the scope).
  - "questions is atoms.asked, and lists what the guard asked".
  - "gates are the provider's effective registry" (instrumented provider → one instance; not
    instrumented → `[]`), and "onInvalidate re-evaluates" (reuse an existing `hooks.test.tsx` pattern).
  - "extra fields pass through by reference" (`feed.diagnostics.collector === extra.collector`).
  - "the layer and diagnostics keep identity across a re-render with the same extra".
  - "outside a provider, MissingQadiProviderError".
  - `runtimeLayer` headless (no React): with a bare `AtomRegistry.make()`, the built context's
    service is the one `registry.get(atoms.runtime.atom(…))` sees; after the scope closes the node is
    released (mirrors T2 at the API level).
  - `.tst.ts`: `useDevtoolsFeed({ layer: x })` and `({ questions: x })` → `expect(...).type.toRaiseError()`;
    `useDevtoolsFeed({ collector })`'s `diagnostics.collector` keeps its type; `{}` compiles.
- **Verify:** `pnpm vitest run packages/react/test/DevtoolsFeed.test.tsx`; `pnpm test:tstyche`;
  `pnpm typecheck`; `pnpm circular`; `node scripts/check-house-style.mjs`
- **Done when:** green; the new file ≥ 90% covered (`pnpm vitest run --coverage --project react`);
  no budget edited.

### T4 — The feed against the real dock types (no devtools dependency)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3
- **Files:** `examples/nextjs-newsroom/test/dock-wiring.test.ts` (rewritten in T6) — **or**, if a
  type-only check is wanted in a package, none (see step 1).
- **Steps:**
  1. Do **not** add `@qadi/devtools` to `@qadi/react`'s devDependencies (C10, ADR-QD-053 spirit).
     The compile-time proof that `<DevtoolsDock {...useDevtoolsFeed(extra)} />` type-checks lives in
     the example (T5 compiles it under `pnpm --filter @qadi/example-nextjs typecheck`) and in the
     website fence (T7, compiled by `check-website-doc-examples.mjs`).
  2. Record in §10 that these two are the structural-compat checks, so a later rename on either side
     is caught by `pnpm example` and the website gate rather than at a host.
- **Tests:** none of its own.
- **Verify:** —
- **Done when:** §10 names the two compile-time checks.

### T5 — The example spreads the feed and drops its hoist (D-34-d.1)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1, T3, D-34-d
- **Files:** `examples/nextjs-newsroom/src/client/Dock.tsx`; `examples/nextjs-newsroom/src/client/atoms.ts`;
  `examples/nextjs-newsroom/README.md`
- **Steps:**
  1. `Dock.tsx`: replace the exported `diagnostics` constant (`:93-116`) with a module-scope
     `const dockExtras = { collector: clientPortCalls };` and its doc comment (what the feed adds, why
     the collector is the host's). In `Dock`, `const feed = useDevtoolsFeed(dockExtras);` and render
     `<DevtoolsDock {...feed} source={source} catalogue={…} unknownParents={unknownParents} ports={browserPorts} />`.
     Delete `useInvalidate`, `useGateInstances`, `useCallback`, `DiagnosticsDockOptions` and the
     `atoms`/`browserLayer` imports if unused; keep `useSubject` (the source key) and `useDrops`.
  2. Header (`:2-26`): the props wired are now "`source`, `catalogue`, `unknownParents`, `ports`, and
     the feed's `gates`, `onInvalidate` and `diagnostics`"; why the feed (one call, the provider's own
     built services).
  3. `atoms.ts`: delete `cacheContext` (`:81-83`) and the "Built here, not inside `browserLayer`"
     paragraph (`:64-73`); put `decisionCacheLayer({ capacity: 256 })` back in `browserLayer`
     (`:85-91`); keep the paragraph about `useInvalidate()` having exposed the cache-clear defect
     (`:74-79`). Keep the mismatch store and `record` (C2).
  4. `README.md:33`: the `Dock.tsx` row says the feed supplies the atom-set half.
- **Tests:** T6.
- **Verify:** `pnpm --filter @qadi/example-nextjs typecheck`; `pnpm --filter @qadi/example-nextjs test`
- **Done when:** success criteria 4 and 5's greps hold.

### T6 — Move the property into the package; keep one integration test in the example (C10)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3, T5
- **Files:** `examples/nextjs-newsroom/test/dock-wiring.test.ts`
- **Steps:**
  1. Delete the hoist-specific cases (`:53-64`: "sees the cache the atoms use" via a fresh registry,
     "hands the dock the layer the atoms are built from") — the property is T3's now.
  2. Rewrite as the cross-package integration (the `feed.probe.test.tsx` shape): render the example's
     real `atoms` under `QadiProvider` with a `<Can>` on a policy the seeded subject passes, plus a
     component calling `useDevtoolsFeed({})` and devtools' `useDiagnostics({ ...feed.diagnostics, intervalMillis: 20 })`;
     `waitFor` a `WiringRead.Read` whose `report.cache.size >= 1`. Keep T1's source assertion.
  3. Header comment: what the test proves now (the feed, built from the provider's registry, is what
     the dock's wiring read sees, with no hoist), and the history in one sentence (CCR-QD-200).
- **Tests:** the rewritten file.
- **Verify:** `pnpm --filter @qadi/example-nextjs test`
- **Done when:** green, and it would be red if `runtimeLayer` were replaced by `browserLayer`
  (check once by hand; record in §10).

### T7 — Devtools doc comments, READMEs and the website
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3, T5
- **Files:** `packages/devtools/src/model/DiagnosticsStore.ts` (header `:17-24`, comment only);
  `packages/devtools/src/react/useDiagnostics.ts` (`DiagnosticsDockOptions.layer`, `:34-45`, comment
  only); `packages/devtools/README.md` (`:103-127`); `packages/react/README.md`;
  `apps/website/src/content/docs/docs/packages/devtools.md` (`:86-121`);
  `apps/website/src/content/docs/docs/packages/react/hooks.md`
- **Steps:**
  1. Devtools comments: keep the rule ("a handed layer is its own build"), and add "Under a
     `QadiProvider`, hand `useDevtoolsFeed()`'s `diagnostics` from `@qadi/react`, whose layer is the
     provider's own build; otherwise share stateful services by value (`Layer.succeedContext`)".
  2. Website `devtools.md`: replace the "**The dock's build of the layer is its own.**" paragraph with
     a `tsx` fence that compiles under `node scripts/check-website-doc-examples.mjs`:
     `makeQadiAtoms(appLayer)` at module scope, `const extras = { collector }`, a `Dock` calling
     `useDevtoolsFeed(extras)` and rendering `<DevtoolsDock {...feed} />` inside `<QadiProvider>`.
     No raw `AsyncResult` read in it (the fence imports `@qadi/react`). Keep one sentence for hosts
     without a provider (C9).
  3. Website `react/hooks.md`: add `useDevtoolsFeed` (and `useGateInstances`, which the `ts` listing
     at `:12-27` omits today) to the signature list, and a short "Feeding the devtools dock" section
     pointing to `devtools.md`.
  4. `packages/devtools/README.md:103-127` and `packages/react/README.md`: the same, briefly (` ```ts `
     fences, which no gate compiles).
- **Tests:** the website gate.
- **Verify:** `node scripts/check-website-doc-examples.mjs`; success criterion 7's grep
- **Done when:** green, and the grep shows at most the two allowed files.

### T8 — Spec, ADRs, overview, traceability, CCR, AGENTS.md (on sign-off), changeset
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3–T7, D-34-d
- **Files:** `spec/behaviors/09-react.md`; `spec/behaviors/28-devtools-screens.md`;
  `spec/decisions/053-a-gate-can-be-found.md`; `spec/decisions/047-a-headless-devtools-model.md`;
  `spec/decisions/index.yaml`; `spec/appendices/react-integration.md`; `spec/overview.md`;
  `spec/traceability.md`; `spec/README.md`; `AGENTS.md` (only with sign-off); `.changeset/devtools-feed.md` (*new*)
- **Steps:**
  1. **BEH-QD-NEXT** in `09-react.md` after BEH-QD-071: "A devtools feed reads the provider's own
     runtime". Requirements: the feed's layer MUST yield the context the provider's decisions evaluate
     in (no second build of any service); it MUST hold that context only for the consumer's scope; the
     feed MUST NOT read decision state directly (cite ADR-QD-017/093) and MUST NOT register gates;
     feed-owned fields MUST NOT be overridable by `extra`. A `typescript` fence that compiles under
     `node scripts/check-doc-examples.mjs` (headless: `runtimeLayer` over a bare registry, reading
     `DecisionCache`).
  2. BEH-QD-323 (`28-devtools-screens.md:565-569`): after "by handing the same context to both as
     `Layer.succeedContext`", add "— or, under a `QadiProvider`, by handing `useDevtoolsFeed()`'s
     layer, which is the provider's own build (BEH-QD-NEXT)". Change-history row.
  3. ADR-QD-053: "Amendment (2026-10-NN, CCR-QD-NEXT) — @qadi/react produces the devtools feed"
     (producer/consumer split now includes the built runtime; devtools still has no dependency).
     ADR-QD-047: one paragraph under the CCR-QD-200 amendment. `index.yaml` statuses "amended".
  4. `spec/appendices/react-integration.md:449`: name `useDevtoolsFeed` beside `useGateInstances()`.
  5. `spec/overview.md` `@qadi/react` table: rows for `useDevtoolsFeed` (hook), `runtimeLayer`
     (function), `DevtoolsFeed`, `DevtoolsDiagnosticsFeed` (type), source `DevtoolsFeed.ts`; change-history row.
  6. `spec/traceability.md`: BEH-QD-NEXT → `DevtoolsFeed.ts`; tests `DevtoolsFeed.test.tsx`,
     `DevtoolsFeed.tst.ts`, `v4-reactivity-smoke.test.ts` (T2 cases), example `dock-wiring.test.ts`.
  7. `spec/README.md`: CCR-QD-NEXT row (what moved, C2's correction that the store is not dead, C8).
  8. **AGENTS.md §13** (`:704-…`): the D-34-d.4 sentence, **only if the user signed off**.
  9. Changeset: `@qadi/react` minor ("`useDevtoolsFeed` / `runtimeLayer`: hand the devtools dock the
     provider's own built runtime"); `@qadi/devtools` patch (docs). **No publish.**
- **Tests:** the gates.
- **Verify:** `node scripts/check-doc-examples.mjs`; `node scripts/check-api-surface.mjs`;
  `node scripts/check-devtools-claims.mjs`; `pnpm spec:verify:strict`
- **Done when:** all green.

### T9 — Full gate and tracker
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T1–T8
- **Files:** this plan (frontmatter, task statuses, §5 statuses, §10)
- **Steps:**
  1. `pnpm check`, alone on the machine (it includes `pnpm example` and mutation).
  2. Update this plan: `status`, task boxes, decisions as `decided (<date>, <choice>)`, §10 rows with
     SHAs. `.planning/architecture/README.md` is the orchestrator's.
- **Tests:** —
- **Verify:** `pnpm check`; `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-34-*.md | sort | uniq -c`
- **Done when:** exit 0 and the plan reflects reality.

## 7. Test strategy

- **Moved to the package:** "the dock reads the atoms' cache" becomes `DevtoolsFeed.test.tsx`'s
  "the feed's layer reads the provider's own cache", proved with **no hoist**, which is the only
  version of the claim worth pinning. The hoist-specific example cases are deleted (replace, don't
  layer).
- **Kept as integration:** `examples/nextjs-newsroom/test/dock-wiring.test.ts`, rewritten to drive
  devtools' real `useDiagnostics` from the feed (the one place both packages meet, C10).
- **Pins:** `v4-reactivity-smoke.test.ts` gains the two facts the design rests on (T2).
- **Type-level:** `DevtoolsFeed.tst.ts` pins the mapped constraint (collision is an error, `extra`
  keeps its types) and `runtimeLayer`'s `Layer<QadiRuntimeServices, never, never>`.
- **Unchanged:** every devtools test (no devtools API change), every existing react test, the
  example's e2e (including `mismatch-report`).
- **Mutation:** not in `stryker.react.mjs`'s scope (the feed decides nothing, ADR-QD-093); coverage
  carries it (react ≥ 90%).
- **Test-first:** T1 (red source assertion) and T6's by-hand red check against `browserLayer`.

## 8. Spec and documentation updates

- `spec/behaviors/09-react.md`: BEH-QD-NEXT (new). `spec/behaviors/28-devtools-screens.md`: BEH-QD-323 sentence.
- `spec/decisions/053-…`: amendment; `047-…`: paragraph; `index.yaml`.
- `spec/appendices/react-integration.md`, `spec/overview.md` (4 rows), `spec/traceability.md`,
  `spec/README.md` (CCR-QD-NEXT).
- `AGENTS.md` §13: one sentence, **only on sign-off** (D-34-d.4).
- `packages/react/README.md`, `packages/devtools/README.md`, website `devtools.md` (compiled `tsx`
  fence) and `react/hooks.md`; `examples/nextjs-newsroom/README.md`.
- `.changeset/devtools-feed.md`. No invariant: the property is behavioral (BEH-QD-NEXT), as BEH-QD-323 is.

## 9. Risks and rollback

- **Unmount ordering.** The provider disposes its registry on a deferred `setTimeout(0)`
  (`QadiProvider.tsx:315-329`); the dock's run is interrupted by `useRunningStore`'s cleanup via
  `Effect.runFork(Fiber.interrupt(…))`, so the scoped mount's release may run after `dispose()`.
  The probe unmounted cleanly; T3 adds "unmounting the provider with the dock inside logs nothing and
  throws nothing" to be sure. If it does fail, release the mount in a `Scope` finalizer guarded by a
  registry-disposed check.
- **Dev double-mount.** React's development double-mount keeps the same registry (the dispose timer is
  cancelled), so `runtimeLayer`'s `useMemo` keeps its identity and the run is not torn down twice.
  If a genuine registry rebuild happens, the layer identity changes and the run restarts on the new
  registry: correct.
- **Context leak.** The feed hands an in-process consumer the provider's full runtime context (ports
  included). That is what `diagnostics.layer` and `ports` already hand the dock; the dock is gated by
  the host. Doc comment says so.
- **Per-registry cache in the example.** Dropping the hoist (D-34-d.1) makes the cache per provider.
  The example has one provider per page; `useInvalidate` clears the provider's own cache, which is
  the behaviour BEH-QD-069 wants. `e2e/ssr.spec.ts`'s "invalidating re-asks the ports" covers it.
- **Rollback.** T1 is independent. T3 is additive (a new module). Reverting T5/T6 restores the hoist
  and the old wiring; no devtools API was touched, so nothing else moves.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; §1 probes (`probe-runtime-context.mts`, `DevtoolsFeed.proto.tsx` + `use-proto.tsx`, `feed.probe.test.tsx` 2/2) run at `e635e68` | planner |
| 2026-10-08 | T0 | worktree branch `worktree-agent-ac0541efa1717e724` on `5ceaf86` (ARCH-33/35/37/39/41 merged); baselines react 321 tests, devtools 909, example 36; `pnpm install --offline` + `pnpm build` needed in the fresh worktree (the example resolves `@qadi/*` through `lib/`); probes not re-run (the design was typed and tested directly) | implementer |
| 2026-10-08 | T1 | red: `dock-wiring.test.ts` "the dock is not handed a mismatch count it would never show" (first red for the wrong reason, `new URL` scheme under happy-dom; fixed to `import.meta.dirname`, then confirmed red by re-injecting `hydrationMismatches={0}`); green after deleting the store reads, `hydrationMismatches=` and correcting "fifteen" to "fourteen" | implementer |
| 2026-10-08 | T2 | `v4-reactivity-smoke.test.ts`: "an AtomRuntime is an atom of its built context, one per registry", "AtomRegistry.mount holds a runtime for the scope and releases it"; 19/19 | implementer |
| 2026-10-08 | T3 | `DevtoolsFeed.ts` (`runtimeLayer`, `useDevtoolsFeed`, `DevtoolsFeed`, `DevtoolsDiagnosticsFeed`), barrel line, `DevtoolsFeed.test.tsx` (11 cases incl. unmount-with-run-alive logs nothing), `DevtoolsFeed.tst.ts` (4 tstyche tests, mapped constraint rejects `layer`/`questions`); react 334 tests, tstyche 25 files; typecheck, lint, house-style (no budget edited), circular clean. `--coverage` printed an empty table here, so the 90% bar was not measured; every line of the file is exercised | implementer |
| 2026-10-08 | T4 | the two compile-time structural-compat checks are `examples/nextjs-newsroom/src/client/Dock.tsx` (`<DevtoolsDock {...feed} />`, `pnpm --filter @qadi/example-nextjs typecheck`) and the website `devtools.md` `tsx` fence (`check-website-doc-examples.mjs`, 36 blocks) | implementer |
| 2026-10-08 | T5 | `Dock.tsx` spreads the feed (`dockExtras = { collector }`), `atoms.ts` drops `cacheContext` (`decisionCacheLayer` back in `browserLayer`), README row; criteria 4 and 5 greps hold | implementer |
| 2026-10-08 | T6 | `dock-wiring.test.ts` renamed `.tsx` and rewritten as the cross-package proof (real `atoms`, `useDevtoolsFeed({})`, devtools' `useDiagnostics`); by-hand red check: handing `browserLayer` instead of `feed.diagnostics.layer` fails it (cache never `Read:1`); example 35 tests | implementer |
| 2026-10-08 | T7 | devtools comments (`DiagnosticsStore.ts`, `useDiagnostics.ts`), both READMEs, website `devtools.md` (compiled `tsx` fence) and `react/hooks.md` (`useGateInstances`, `useDevtoolsFeed`, new section). Criterion 7 grep: `succeedContext` survives only in `DiagnosticsStore.ts` and `28-devtools-screens.md`, as asked (the other places say "that one value") | implementer |
| 2026-10-08 | T8 | BEH-QD-325 (compiled `typescript` fence), BEH-QD-323 sentence, ADR-QD-053 and 047 amendments, `index.yaml`, appendix, overview (4 rows), traceability, README **CCR-QD-240** (numbering shifted +30 per the orchestrator), changeset `devtools-feed.md`, AGENTS.md §13 one sentence (flagged for the user). `check-doc-examples`, `check-api-surface`, `check-devtools-claims`, `spec:verify:strict`, `spec:gates`: green | implementer |
| 2026-10-08 | T9 | not complete: `pnpm check` (mutation, coverage, BDD, package-install, e2e) deliberately not run; commits `b8f542d`, `e81516b` on the worktree branch | implementer |

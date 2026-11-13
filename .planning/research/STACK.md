# Stack Research: v1.3 Arch Wave 8 (Phases 30-36)

**Domain:** architecture deepenings in an existing Effect v4 library (no new features)
**Researched:** 2026-11-12
**Confidence:** HIGH for Phases 30, 31, 32, 34 (read from installed source and the repo); MEDIUM for Phase 35 (APIs verified, mechanism not yet run, which is what its spike is for); HIGH for the madge section (run empirically)

**Bottom line: no new dependency, no version bump.** Every API below ships in the installed `effect@4.1.2` and `@effect/atom-react@4.1.2` (`node_modules/.pnpm/effect@4.1.2`, `@effect+atom-react@4.1.2_effect@4.1.2_react@19.3.1_scheduler@0.28.0`). Paths below are relative to `node_modules/effect/src/` unless they start with `packages/`. Source is the authority (AGENTS.md); no web or Context7 lookup was needed, so the research-plan seam was not used.

## Recommended Stack

### Core Technologies (already installed; nothing to add)

| Technology | Version | Purpose in Wave 8 | Why |
|------------|---------|-------------------|-----|
| `effect/Schema` | 4.1.2 | Phase 30 strict decode: `decodeUnknownResult`, `decodeUnknownEffect`, `decodeUnknownOption`, `decodeUnknownSync`, `fromJsonString`, `SchemaError` | The one decoder family every seam already uses; all take `(schema, options)` and are generic in `S["Type"]`, so a shared helper returns a closed result with no `as` |
| `effect/SchemaAST` (`ParseOptions`) | 4.1.2 | Phase 30 `UNTRUSTED_DECODE_OPTIONS` type | Already imported as a type in `Policy.ts:25` |
| `effect/Deferred`, `Fiber`, `HashMap` | 4.1.2 | Phase 31: what `SharedComputation.ts` already uses; no new primitive is needed | The change is a flag flip over existing state |
| `effect/FiberHandle` | 4.1.2 | Phase 34: diagnostics poll in the dock model's scope | `makeDockModel` already uses it for the source read (`DockModel.ts:117-121`) |
| `effect/Schedule`, `effect/testing/TestClock` | 4.1.2 | Phase 34: poll cadence and model tests | `runDiagnostics` already repeats on `Schedule.spaced`; `DiagnosticsStore.test.ts` already drives it with `TestClock.adjust` |
| `effect/reactivity/Atom`, `AtomRegistry` | 4.1.2 | Phase 35 spike candidates | `AtomContext.mount` / `addFinalizer` give a mount-scoped lifetime without `scheduleTask` or `defaultIdleTTL` |
| `effect/Layer`, `effect/testing/TestClock` | 4.1.2 | Phase 33 sealed layer | Same constructors both copies already use |

### Supporting Libraries

None added. `madge@8.0.0` is the existing cycle gate (see "What `pnpm circular` checks").

## Phase 30: strict decode (`unknown | text` to a closed result)

### What exists today (verified)

| Fact | Where |
|------|-------|
| `UNTRUSTED_DECODE_OPTIONS: SchemaAST.ParseOptions = { onExcessProperty: "error" }`, in the **policy** module | `packages/core/src/Policy.ts:1002` |
| `MAX_DECODE_DEPTH = DEFAULT_MAX_DEPTH * 4` (256), with the stack-cost reason in the comment: `"error"` forces Schema's generic per-node path, so decode overflows near 430 levels | `Policy.ts:983`, comment `949-982` |
| `exceedsJsonDepth(root, maxDepth)`: explicit-stack walk, **a leaf that imports nothing** | `packages/core/src/DecodeDepthGuard.ts:34-53` |
| `Policy.fromJson`: `JSON.parse` in try/catch; on parse failure re-decodes the **string** through `PolicyFromJson` (`Schema.fromJsonString(Policy)`, `Policy.ts:916`) purely to get Schema's own malformed-JSON error; then depth guard; then `decodePolicyUnknown(parsed)` | `Policy.ts:1018-1040` |
| `Policy.fromJsonValue`: guard then `decodePolicyUnknown` | `Policy.ts:1060-1066` |
| `decodeSinkRecord`: guard (`MAX_DECODE_DEPTH`) then version dispatch then `decodeWire` (a `decodeUnknownResult`); `decodeSinkRecordString` uses `Result.try(() => JSON.parse(text))` for `NotJson` | `SinkCodec.ts:423, 502-510, 520-523` |
| `portWire`: `decodeQ`/`decodeA` built with the options; each call guarded with `WIRE_MAX_DEPTH` (which is `MAX_DECODE_DEPTH`) | `PortWireEncode.ts:27, 104-139` |
| `askRemotely`: `decodeReply` built with the options; guarded with `WIRE_MAX_DEPTH` | `PortRemote.ts:123, 151-153` |
| Hydration: three `decodeUnknownOption`s with the options; entry-by-entry guard, plus the workaround `exceedsJsonDepth({ ...payload, entries: [] }, ...)` so the envelope guard skips entries that are guarded one at a time | `packages/react/src/HydrationEngine.ts:198-200, 440-457, 480` |
| Audit: options only, **no guard**: `decodeEnvelope` (`ArchiveEnvelope` has `entries: Schema.Array(Schema.Unknown)`) and `decodeRow` (`record: Schema.Unknown`) | `packages/audit/src/AuditArchive.ts:252`, `AuditEntry.ts:152` |
| Public surface: `UNTRUSTED_DECODE_OPTIONS`, `MAX_DECODE_DEPTH` (listed at `spec/overview.md:116-117`, module `Policy.ts`) and `exceedsJsonDepth` (`:118`, module `DecodeDepthGuard.ts`) are all exported from the barrel (`packages/core/src/index.ts:15` is `export * from "./DecodeDepthGuard.ts"`) | gate 13 |

### The exact installed APIs

| API | Signature (installed) | Location |
|-----|-----------------------|----------|
| `Schema.decodeUnknownResult(schema, options?)` | `(input: unknown, options?) => Result<S["Type"], SchemaError>`; `S extends ConstraintDecoder<unknown>` | `Schema.ts:1736-1741` |
| `Schema.decodeUnknownEffect(schema, options?)` | `(input: unknown, options?) => Effect<S["Type"], SchemaError, S["DecodingServices"]>`; `S extends Constraint` | `Schema.ts:1535-1544` |
| `Schema.decodeUnknownOption` | `=> Option<S["Type"]>` | `Schema.ts:1672-1675` |
| `Schema.decodeUnknownSync` | throws `SchemaError` (via `runSchemaErrorSync`, `Schema.ts:1319-1327`) | `Schema.ts:1883-1888` |
| Option merge rule | creator options and per-call options are **shallow-merged**, per-call wins: `{ ...options, ...overrideOptions }` | `SchemaParser.ts:968-971`, used at `:278-280` |
| `ParseOptions.onExcessProperty` | `"ignore"` (default) or `"error"`; "excess" = enumerable own property not covered by a declared key or index signature; applies to structs, records and structs with rest | `SchemaAST.ts:507-539` |
| `Schema.fromJsonString(schema, options?)` | `JsonString.pipe(decodeTo(schema, SchemaTransformation.fromJsonString(options)))`; parse + decode in one schema | `Schema.ts:9875-9885` |
| `Schema.UnknownFromJsonString` | `@internal`: not usable | `Schema.ts:9886` |
| `Schema.Json` type and codec | `Json = null \| number \| boolean \| string \| JsonArray \| JsonObject` | `Schema.ts:18921, 18955` |
| `Effect.fromResult` | `Result<A, E> => Effect<A, E>` | `Effect.ts:2699` |
| `Data.taggedEnum` | already how `DecodeRefusal` (`SinkWire.ts:78-87`) and `EncodeRefusal` are built | `Data.ts:641` |

### Answers to the phase's questions

1. **Can one decoder take `unknown | string` and return a closed result type without `as`? Yes.** The input is `unknown` (`JSON.parse` returns `any`, which assigns to `unknown` with no cast; `SinkCodec.ts:521` already does `Result.try((): unknown => JSON.parse(text))`). The success type flows from the generic: `<S extends Schema.ConstraintDecoder<unknown>>(schema: S, ...) => (input: unknown) => Result<S["Type"], Refusal>` is exactly what `Schema.decodeUnknownResult` returns, so `S["Type"]` needs no assertion. The closed refusal is a `Data.TaggedEnum` (`NotJson | TooDeep | Malformed`), which is what `DecodeRefusal` already is for the sink.
2. **Use the `Result` variant as the core, adapt at the edges.** Four of the eight seams are synchronous `Result` code (`SinkCodec`, `PortWireEncode`, `PortRemote`, audit), hydration is `Option`, only `Policy.fromJson`/`fromJsonValue` are `Effect`. Wrap with `Effect.fromResult` (`Effect.ts:2699`) in `Policy.ts`; map `Malformed` to hydration's drop reason where the `Option` was. Do not build the shared module on `decodeUnknownEffect`: it would push `Effect` into pure seams.
3. **Defect gotcha (why the guard must precede the decode).** `decodeUnknownResult`/`Option`/`Sync` only convert causes made **entirely of schema issues**; a `RangeError` from stack exhaustion is a defect and **throws** (`SchemaParser.ts:1058-1071`, the Result adapter calls `getSchemaIssueOrThrow(..., "Result adapter can only return schema issues")`; the Option adapter at `:1041-1054` is the same). `decodeUnknownEffect` keeps it as a defect in the cause. So "guard first, decode second" is load-bearing in the new module's single entry point, never optional, and never wrapped in `Result.try`/`Effect.try` (`SinkCodec.ts:495-496` says exactly that).
4. **The new module must be an import-free leaf and take `maxDepth` as a parameter.** `Policy.ts` imports `DecodeDepthGuard.ts` (`Policy.ts:26`); `MAX_DECODE_DEPTH` is computed in `Policy.ts` from `DEFAULT_MAX_DEPTH`. If the strict-decode module imported `Policy.ts` for the depth constant it would close a cycle that madge counts. Extend or sit beside `DecodeDepthGuard.ts` (a leaf), own `UNTRUSTED_DECODE_OPTIONS` there, and let each seam pass its bound (`MAX_DECODE_DEPTH` or `WIRE_MAX_DEPTH`). `Policy.ts` can then re-export the constant by name if the phase keeps the public name (a removal is **Breaking**; `spec/overview.md:117` must change module either way).
5. **Malformed-JSON text path.** Today `Policy.fromJson` hands the raw string to `PolicyFromJson` so Schema reports the parse error. The shared module should report `NotJson` itself from the `try`/`Result.try` around `JSON.parse` and stop using `fromJsonString` for the decode path (it re-parses). `Schema.fromJsonString` stays valid only for **encode** (`toJson = Schema.encodeEffect(PolicyFromJson)`, `Policy.ts:934`).
6. **Two behaviour changes to decide, not discover.**
   - Audit gains the guard. `ArchiveEnvelope.entries` and `decodeRow.record` are `Schema.Unknown`, so Schema never recurses into them; a guard at the envelope would refuse a deep entry as the *envelope's* `TooDeep` where today `readAuditArchive` reports `EntryNotDecodable{ index, refusal: TooDeep }` from `decodeSinkRecord` (`AuditArchive.ts:279-283`). Keep per-entry attribution: guard the envelope **without** entries (hydration's `{ ...payload, entries: [] }` shape) or leave entries to the existing per-entry guard.
   - Port wire reports plain strings today (`"the question nests deeper than the decode bound"`, `PortWireEncode.ts:121`, `PortRemote.ts:152`); the closed refusal must keep those exact strings or the seam's mapping owns them (a `Decoded` that carries `maxDepth` lets the seam render them).
7. **Test shape (testing win).** One property over the shared entry (depth `maxDepth` accepted, `maxDepth + 1` refused `TooDeep`, never a throw, even at 60,000 levels as `DecodeDepthGuard.ts:1-22` records) plus one refusal row per seam. The existing 60,000-level evidence is the reason `Result.try` must not be added.

## Phase 31: `SharedComputation.reset` supersedes its claims

### What `SharedComputation.ts` uses today (read in full)

| Piece | Mechanism | Lines |
|-------|-----------|-------|
| In-flight table | `let inFlight = HashMap.empty<K, InFlightClaim<A, E>>()`, directly reassigned; atomic because Effect only reorders fibers at `yield*` boundaries, not mid-callback. **Not** `Ref`, **not** `MutableHashMap` | `:101` |
| Claim record | `{ claim: Deferred<A,E>; fiber: Fiber \| undefined; waiters: number; abandoned: boolean }` (mutable fields) | `:82-87` |
| Claim creation | `Deferred.makeUnsafe<A, E>()` inside the synchronous claim step | `:276-281` |
| Waiting | `Deferred.await(entry.claim)` + `Effect.onInterrupt` that decrements `waiters`; the last leaver sets `abandoned = true`, calls `forget(key, entry)` and `Fiber.interrupt(entry.fiber)` | `:204-216` |
| Compute fiber | `compute.pipe(Effect.onExit(...), Effect.forkDetach)`; `onExit`: `if (!entry.abandoned) settle(exit)`, then `forget(key, entry)`, then `Deferred.done(entry.claim, exit)` | `:352-363` |
| `forget(key, entry)` | removes the slot **only if it is still this entry (identity check)**, so a stale claim cannot remove a fresh claim at the same key | `:107-112` |
| `reset` | `inFlight = HashMap.empty()`; nothing else | `:371-375` |

### The abandoned path's mechanics (this is what `reset` should reuse)

`abandoned === true` means: **skip the adapter's `settle`** (so nothing is cached from the exit), but **still run `forget` (identity-checked, harmless) and `Deferred.done`** (answers any waiter still attached). That is exactly the contract a superseded claim needs: waiters still get their answer, the cache is not written. Today the flag is only ever set by the last leaver, when no waiter remains.

Change (no new primitive):

- `reset` iterates the table before dropping it, flagging each claim: `for (const entry of HashMap.values(inFlight)) entry.abandoned = true; inFlight = HashMap.empty()`. `HashMap.values` returns `IterableIterator<V>` (`HashMap.ts:963`); `HashMap.forEach` also exists (`:1970`).
- Rename the field to say what it now means (`superseded`, or keep `abandoned` and widen its comment); the decision is the planner's, the mechanics are identical.
- A superseded claim whose waiters later all leave still takes the existing last-leaver path: `forget` is identity-checked, `Fiber.interrupt` still stops a compute nobody wants. No double handling.
- The compute keeps running after `reset` (waiters need the answer), which is why the flag, not an interrupt, is right.
- `DecisionCache.ts` then deletes `generation`, `myGeneration` and the `myGeneration === generation` check (`DecisionCache.ts:231-248, 292-301`), and `clear` reduces to `entries = ∅; insertionOrder = ∅; shared.reset()`. The settle closure no longer needs to capture anything at claim time, so `hooks.claim`'s "adapter reads at claim time" comment (`SharedComputation.ts:288-290`) changes.
- `reset` stays a plain synchronous function (not an `Effect`) so `clear` can keep it inside one `Effect.sync`, as `SharedComputation.ts:60-69` requires.
- Ordering that must keep holding: the flag flip and the table swap happen in one synchronous step, so a claim cannot be made against the old table after the flip (same atomicity argument as `:101`).

New headless test (Phase 31 testing win): `SharedComputation.test.ts` can race `reset` mid-compute with plain keys and a latched effect, asserting the superseded exit answers its waiter but `settle` is never called, with no `evaluate` in sight (today only `DecisionCache.test.ts:749-880` reaches this through the evaluator). Under `it.effect` with `TestClock` or `Deferred` latches; both already used in `SharedComputation.test.ts`.

## Phase 32: options and services stated once, in a leaf

No new Effect API. This is a type-declaration move; the only stack facts are the import graph and the madge rule.

| Fact | Verified how |
|------|--------------|
| `Lifecycle.ts` cannot import `Evaluate.ts` (`Evaluate.ts:17` imports `ask` from `Lifecycle.ts`); that edge is why `LifecycleOptions` exists (`Lifecycle.ts:15-17, 60-65`) | source |
| `Question.ts` imports only `AuthSubject.ts`, `Policy.ts`, `Resource.ts` (all type or leaf) | `madge --json` over `packages/core/src` |
| `Ports.ts` (reach 42 modules), `CurrentSubject.ts` (23) and `EvaluationId.ts` (1) **do not reach `Question.ts`, `Evaluate.ts`, `Lifecycle.ts` or `Walk.ts`** | BFS over the madge graph (scratch run, 2026-11-12) |
| So a leaf holding `EvaluateOptions` and `EvaluationServices` may import `CurrentSubject`, `EvaluationId`, `PortServices` (types) **without a cycle** | same |
| `EvaluateOptions`, `EvaluationServices`, `StandingEvaluationServices` are public; `spec/overview.md:162, 176, 177` list them against module `Evaluate.ts`; the barrel has `export * from "./Evaluate.ts"` and `"./Question.ts"` (`index.ts:18, 44`). Moving the declaration changes the module column (gate 13) | grep |
| Seventeen `packages/*/src` files name one of these types (core, http, react, devtools, promise, testing) | grep |

Recommendation: put them in a **new leaf** (or `Question.ts`) and re-export by name from `Evaluate.ts` so public import paths and the barrel keep one resolution. Putting `EvaluationServices` in `Question.ts` would make a currently light 3-import leaf type-depend on `Ports.ts`' 42-module closure (`Question.ts:5-6` documents it as importing no evaluation code); a dedicated leaf, e.g. `EvaluateOptions.ts`, keeps `Question.ts` as it is. `Lifecycle.tst.ts` (the two-direction pin of `LifecycleOptions`) becomes a plain assertion on the single declaration or is deleted with the type.

## Phase 33: one sealed evaluation layer

No new API. Both copies are `Layer.mergeAll(ports, evaluationIdSequential(prefix), clock, ...)` (`packages/testing/src/QadiReviewLayer.ts:150-165`, `packages/devtools/src/model/Simulation.ts:85-112`).

- **Do not move `TestClock` into core by default.** `packages/*/src` imports `effect/testing/TestClock` in exactly two places, both leaf consumers (`QadiReviewLayer.ts:17`, `Simulation.ts:23`); `@qadi/core` imports none. A sealed layer in core should take the clock as a `Layer` parameter (`Layer.Layer<never>`; `clockLayer` in both files already returns `Layer.empty | TestClock.layer()`, and `QadiReviewLayer.ts:166-175` explains why the type is inferred, not annotated), so core gains no test-only import and the review option name `"test"` versus the simulation name `"deterministic"` stay each package's own vocabulary.
- The shadowing rule is the only real decision: devtools shadows the sink with `Layer.succeed(DecisionSink, { record: () => Effect.void })` and adds a private `decisionCacheLayer()` (`Simulation.ts:97-111`); review does neither. There is no way to remove a service from a context, so "not shadowed" means "writes to the application's real sink and cache". State it in the layer's options as a closed union, not a boolean pair (user preference: closed union over widening).
- `Layer.mergeAll` drops tail layers past ~90 arguments (AGENTS.md §3); irrelevant at 4-6 layers.

## Phase 34: diagnostics as the dock model's seventh store

### Installed `FiberHandle` semantics (the exact facts the phase needs)

| Need | API | Behaviour | Location |
|------|-----|-----------|----------|
| One handle, closed with the scope | `FiberHandle.make<A, E>()` | `acquireRelease`; on scope close sets state `Closed` and `Fiber.interruptAllAs(state.fibers, ...)` | `FiberHandle.ts:152-161` |
| Synchronous fork function (what `configure` needs, since it is a plain function) | `FiberHandle.runtime(handle)<R>()` returns `(effect, options?) => Fiber`; captures the **current services** via `Effect.context<R>()`, forks with `Effect.runForkWith(services)` | `FiberHandle.ts:901-949` |
| Restart-on-input-change | each call to the returned function installs the new fiber and `previous.interruptUnsafe(...)` interrupts the previous one, **synchronously and without awaiting it**; install happens before the interrupt, so a finalizer re-entering the handle is safe | `FiberHandle.ts:395-420` (`setUnsafe`) |
| Stop with no replacement | `FiberHandle.clear(handle)` is an `Effect` (uninterruptible mask, `Fiber.interruptAs(fiber)` then clears) | `FiberHandle.ts:668-681` |
| Fork after the scope closed | returns a constant interrupted fiber, never runs | `FiberHandle.ts:925-929` |
| Completed fiber removes itself | observer deletes it from `fibers` and clears `state.fiber` | `FiberHandle.ts:422-435` |
| Defect in the poll | surfaces through the handle's `deferred` (visible to `FiberHandle.join`), not as a failure of `configure` | `FiberHandle.ts:432-441` |

### How it integrates (all already in the repo)

- `makeDockModel` already does this for the source: `const reads = yield* FiberHandle.make<void>()`, `const forkRead = yield* FiberHandle.runtime(reads)<never>()`, `readSource = (source) => forkRead(runSource(timeline, source ?? NO_SOURCE))` (`packages/devtools/src/model/DockModel.ts:117-121`), re-forked only on identity change (`:147`). The poll is a **second handle**, not the same one: the source read and the poll restart on different inputs.
- The poll body is `runDiagnostics(store, options)` (`DiagnosticsStore.ts`): `Effect.scoped`, builds the host layer once with `Layer.build`, then `Effect.repeat(sample, Schedule.spaced(interval))`; its error channel is `never` and its requirements are `never`, so it fits `FiberHandle.runtime(h)<never>()` directly.
- **"Poll stops when `diagnostics` goes `undefined`"**: `configure` is synchronous, so use the house idiom already in `DockModel.ts` (`NO_SOURCE`, comment `:90-91`, "a source that went away is replaced by an empty one"): fork `Effect.void` (or a `NO_POLL`) through the same function. That interrupts the previous fiber with no `Effect.runFork(FiberHandle.clear(...))` outside a fiber.
- **Restart keys** are the four fields plus presence, today the hand-written deps `[options === undefined, layer, collector, questions, intervalMillis]` with an `eslint-disable` (`useDiagnostics.ts:85-91`, `useRunningStore.ts:36-38`). In the model this becomes the same per-field identity diff `configure` already does (`DockModel.ts:130-148`); the deps list and the lint suppression are deleted.
- **Merging reading + sampled**: keep the pure `mergeReading` (`DiagnosticsStore.ts`) and compute it **when either input changes** (on `store.accept` and when `configure` sees a new `reading` identity), publishing through the model's own `makeExternalStore` (`publish`/`set`, `ExternalStore.ts:30-55`). Do **not** compute it inside `getSnapshot`: `mergeReading` builds a fresh object whenever `supplied` is defined, and `useSyncExternalStore` requires a cached snapshot (infinite re-render otherwise). With `supplied === undefined` it returns `sampled` itself, preserving store identity (`DiagnosticsStore.ts`, doc on `mergeReading`).
- **The `useMemo(mergeReading(...))` in the view disappears** (`DevtoolsDock.tsx:153-154`); `DockFrame` reads the model's merged store through the shared snapshot hook.
- **Public `useDiagnostics` stays** as an adapter (`react/index.ts:21-22` exports it and `DiagnosticsDockOptions`); keep it on `useRunningStore` (`useRunningStore.ts`: `Effect.runFork` on mount, `Effect.runFork(Fiber.interrupt(fiber))` on cleanup). `mergeReading`, `makeDiagnosticsStore`, `noDiagnostics`, `runDiagnostics`, `DiagnosticsReading` are all root-barrel exports (`src/index.ts:27-35`), so none of them may be moved or removed without it being **Breaking**.
- **The three snapshot hooks** (`useDockSnapshot`, `useExplorerSnapshot`, `useHeldChoiceSnapshot`) pass a constant `undefined` run through `useRunningStore` (`useDockSession.ts:14-15`, `useExplorerSession.ts:15-20`). A bare `useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)` replaces all three (that is already the body of `useRunningStore` after its effect, and of `usePaused`, `useDockModel.ts:75-76`). That resolves Phase 26 IN-01; `useRunningStore` keeps its two real users (`useTimeline.ts:52`, `useDiagnostics.ts:85`).

### Testing

Model tests run headless under `TestClock`: `DiagnosticsStore.test.ts` already does `TestClock.adjust("1999 millis")` and the like (`:143-152`), and `DockModel.test.ts` already forks through `FiberHandle.runtime` and advances with `const flush = Effect.andThen(Effect.yieldNow, TestClock.adjust("10 millis"))` (`DockModel.test.ts:100`). `FiberHandle.runtime` captures the **current fiber's services**, which inside `it.effect` include the test clock, so the poll forked from `configure` is steered by `TestClock` with no rendering. Add: (a) a new `diagnostics` input restarts the poll (old layer released, new layer built, one sample immediately); (b) an identical identity does not; (c) `undefined` stops it; (d) a supplied `reading` field wins per field and an omitted one falls through; (e) closing the scope ends the poll.

One behaviour to state in the ADR 047 amendment: `setUnsafe` interrupts the previous fiber **without waiting** for its finalizers, so on restart the old layer's release and the new layer's build can overlap. The current React path is identical (`Effect.runFork(Fiber.interrupt(fiber))` is also not awaited before the next effect), so this is parity, not a regression; if overlap matters, serialise inside the poll effect rather than by awaiting in `configure`.

## Phase 35: the atom set owns its eviction sweep (spike inputs)

### Constraint (restated so the spike has a pass/fail)

AGENTS.md §13 / CCR-QD-150: the bound is enforced by a **qadi-owned** `sweepEvictions` fork, never `AtomRegistry`'s `scheduleTask`/`defaultIdleTTL`, which reroutes the registry's core dispatch (`AtomRegistry.ts:489-490`: both `MixedScheduler`s and the `dispatcher` are built from `scheduleTask`) and dropped a required render. `QuestionBook.sweep` must run on its **own fiber** so it never observes the momentary zero of a recompute (`QuestionBook.ts:20-31`; pinned by `v4-reactivity-smoke.test.ts:247`, "a recompute disposes and re-reads in one synchronous step").

### Findings: what the installed API offers

| Finding | Evidence |
|---------|----------|
| There **is** a mount-scoped lifetime hook with no scheduler involvement: `AtomContext.mount(atom)` and `AtomContext.addFinalizer(f)` | `Atom.ts:184-185` (interface); implementation `AtomRegistry.ts:1152-1157` (`addFinalizer`: runs immediately if already disposed, else pushed to the lifetime's finalizers) and `:1257-1260` (`mount`: `this.addFinalizer(this.node.registry.mount(atom))`) |
| `registry.mount(atom)` is `subscribe(atom, constVoid, { immediate: true })`: it adds a **listener, not a parent/child edge**, so the mounted atom does not become a dependency of the reader and a change to it does not invalidate the reader | `AtomRegistry.ts:577-579, 552-575` |
| A node is removable only when `!keepAlive && listeners.size === 0 && children.size === 0`; removal runs **deferred** through `dispatcher.scheduleTask(..., 0)` and re-checks `canBeRemoved` at run time | `AtomRegistry.ts:644-650, 810-812`. So a mount released and re-taken within one synchronous recompute never removes the node (the deferral outlives the re-read) |
| The provider's registry passes neither option, so `atomHasTtl` is false and an idle node is removed on the deferred tick, not on a TTL | `QadiProvider.tsx:252-257` (no options), `AtomRegistry.ts:581-583` |
| An **Effect-backed atom forks its effect and interrupts it when the node is disposed**: `makeEffect` registers `ctx.addFinalizer(cancel)` where `cancel` does `fiber.interruptUnsafe()` (unless `uninterruptible`); its services carry `Scheduler.Scheduler = ctx.registry.scheduler`, which is the plain `MixedScheduler` (microtask) when no `scheduleTask` was given | `Atom.ts:650-697, 700-726` |
| The default atom is not kept alive and is lazy (`keepAlive = false`, `lazy = true`); `Atom.keepAlive` / `Atom.autoDispose` / `Atom.setIdleTTL` / `Atom.setLazy` exist | `Atom.ts:406-407, 1747-1769, 229-257, 1782-1812` |
| Registry-level hooks `onNodeAdded` / `onNodeRemoved` exist, but the registry belongs to the provider (or the host), not the atom set, so an atom set cannot rely on them | `AtomRegistry.ts:71-100` |
| The qadi side already has a cross-registry liveness signal: `build(question, live)`; each decision atom's reader calls `live()` first thing and hands the release to `get.addFinalizer(live())` | `QadiAtoms.ts:316-318`, `QuestionBook.ts:133-148` (`liveCount`), doc `:20-31` |
| `Effect.runFork` evaluates the fiber **synchronously until its first yield** (`fiber.evaluate(effect)` before returning), so a fork started from `live()`/`release` runs its first step *inside* the caller. Anything that must not observe a recompute's momentary zero has to start with `Effect.yieldNow` | `internal/effect.ts:5746-5771` |
| `@effect/atom-react@4.1.2` offers nothing for this: `Hooks.ts` is `useAtomValue`/`useAtomMount`/... (`Hooks.ts:143-640`), and `RegistryContext.ts` is the file that sets `scheduleTask` + `defaultIdleTTL: 400` (`:42-47, 69-73`), i.e. exactly the thing that is ruled out | read in full |

### Candidate mechanisms for the spike (ranked)

All three stay inside the §13 rule (no `scheduleTask`, no `defaultIdleTTL`). The recommendation is a spike with these as the named options, pass/fail below.

**A. Book-level refcount, one qadi-owned fiber per atom set (recommended first).**
When the book's total live count goes 0 to 1 (in `live()`), start one fiber via `Effect.runFork`: `Effect.repeat(sweep, Schedule.spaced(interval))` or a loop that **ends itself** when a tick finds total live == 0 and nothing over capacity. Do **not** interrupt on the 1 to 0 edge: that edge is exactly the momentary zero of a recompute, and interrupting there would restart the cadence on every `invalidate`; a self-terminating loop checked at tick time avoids both the churn and a timer that keeps a Node process alive after the last unmount. APIs: `Effect.runFork` (`Effect.ts:18578`), `Effect.repeat`/`Effect.sleep`, `Schedule.spaced` (`Schedule.ts:1527`), `Fiber.interruptUnsafe`. Pros: one sweeper per atom set regardless of how many registries or providers exist (fixes "several providers fork several sweeps"), matches the book's own "across every registry sharing the atom set" liveness, works with no React and no registry. Cons: `live()` runs during atom build (possibly during render), so the start must be idempotent (StrictMode double render); a bare `runFork` has no `TestClock`, so graph tests need a small `sweepIntervalMillis` option on `QadiAtomsOptions` or real short timers; fiber leaks only if a release never arrives (`registry.dispose()` runs finalizers, `AtomRegistry.ts` `reset`/`destroyNode`).

**B. Atom-graph: a sweeper atom mounted from `track` (the "Effect-backed atom whose build forks a fiber" idea).**
Define inside the `makeQadiAtoms` closure `const sweeper = Atom.make(Effect.repeat(sweepEvictions, Schedule.spaced(ms)))` (or `Atom.readable` with `get.addFinalizer(() => fiber.interruptUnsafe())`) and extend the existing hook to `track: (get) => { get.addFinalizer(live()); get.mount(sweeper); }` (`QadiAtoms.ts:316-318`). The sweeper's fiber then lives exactly while some decision atom is built in that registry and is interrupted by the node-removal finalizer (`Atom.ts:716-723`); no timer outlives the last unmount; no `scheduleTask`. Pros: lifetime is the atom graph's own, graph tests need only `AtomRegistry.make()` plus mounting a decision (no provider, no render). Cons: **one sweeper per registry**, so several providers still give several sweeps (idempotent, as `QadiProvider.tsx:188-191` already says); a plain `Atom.make(effect)` gets `Context.empty()` services, so `TestClock` cannot be injected without routing through `runtime.atom` and a layer that provides it; the fiber's continuations run on `registry.scheduler`, which is benign here (default `MixedScheduler`) but is the same object the ruled-out option reconfigures, so assert it in the spike.

**C. Timer-less, event-driven deferred sweep.**
`open`/`release` schedule a coalesced one-shot fork (`Effect.runFork(Effect.yieldNow.pipe(Effect.andThen(sweep)))`, guarded by a `pending` flag) only when `order.length > capacity`. The leading `yieldNow` is mandatory (`runFork` is synchronous to the first yield, above) so the sweep never sees a recompute's zero. Pros: no periodic fiber, no timer, no cadence, no process-liveness issue, trivially testable (`Effect.yieldNow` under any runtime). Cons: it replaces the interval model, so `QadiProvider.sweepIntervalMillis` loses its meaning (a prop removal is **Breaking**; keep it as accepted-but-unused or document the amendment to ADR-QD-103/150); and eviction only finds cold entries after a release, which the release trigger covers but the spike must demonstrate.

**D. Conclude "keep it in the provider, state and test the rule".** This remains a valid spike outcome (the context file allows it) if none of A to C can show, with a test, that (1) the limit holds with no provider, (2) `QadiAtoms.test.ts`'s sweep-across-an-invalidation pin still passes, (3) `v4-reactivity-smoke.test.ts:247` and the "required render" e2e (`examples/nextjs-newsroom`) are unaffected, and (4) StrictMode/hidden-`Activity` double builds start no second sweeper.

Spike pass/fail checklist: sweeper starts on the first live question and not before; stops (or ends) after the last release with no timer left; a recompute (`invalidate`) neither stops it nor evicts the recomputing question; two registries or two providers over one atom set yield one sweeper (A, C) or one per registry (B), stated; `maxTrackedQuestions` holds in a bare `AtomRegistry.make()` test with no React.

## Phase 36: spec debt

No stack content. Nothing to install; the gates that will fail if a number or a module name is wrong are `spec:verify:strict` (ADR file number equals Document ID, gate 10) and `spec:api` (gate 13, `spec/overview.md` must name every export).

## What `pnpm circular` (madge) checks

`package.json:30`: `madge --circular --extensions ts,tsx packages/*/src` (`madge@8.0.0`, ADR-QD-037). Run on 2026-11-12: **210 files processed, no cycle, 66 warnings.** What that means in practice:

- **Scope is every package's `src/`, as one graph; tests, `features/` and `apps/` are not in it.**
- **Type-only edges count.** Verified empirically: two files that `import type` each other fail with `Found 1 circular dependency! 1) a.ts > b.ts`. madge's `skipTypeImports` is opt-in (`node_modules/madge/README.md:415-440`) and there is no `.madgerc`. This is the whole reason `LifecycleOptions` exists (`Lifecycle.ts:15-17`), so for Phase 32 `import type { Foo }` is **not** a way around a cycle.
- **Only relative imports are edges.** All 66 "skipped" files are bare specifiers (`effect/*`, `@qadi/core`, `@effect/atom-react/*`). **A cycle across packages is invisible to madge**; the TypeScript project references (`tsconfig.build.json`) are what stop those.
- Relative `.ts`/`.tsx` imports resolve (extension-qualified imports are fine; the count of 210 matches the source tree).
- Practical test for any new leaf in Phase 30/32/33: `madge --json --extensions ts,tsx packages/core/src` and BFS from the new module's imports; it must not reach any importer of the new module. This is how the Phase 32 claim above was checked.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Shared decode return | `Result` over a closed `Data.TaggedEnum` | `Effect`-returning decoder | Four of eight seams are synchronous `Result` code; `Effect.fromResult` adapts the other direction for free |
| Shared decode input | `unknown` (text parsed inside) | A union `string \| unknown` | `string` is already `unknown`; a union adds nothing and invites a type guard |
| JSON parsing | `JSON.parse` in `Result.try`, then guard, then `decodeUnknownResult` | `Schema.fromJsonString` for decode | It re-parses, and it cannot interleave the depth guard between parse and decode; it is correct for **encode** only |
| Reset semantics | flag in-flight claims and reuse the abandoned path | interrupt the compute on `reset` | Waiters still need an answer; interrupting would resolve them `Interrupted` (the defect issue #64 fixed) |
| Poll ownership | second `FiberHandle` in the model's scope | `Fiber` kept in a `let` inside `configure` | Loses scope-close interruption and the closed-handle guard (`FiberHandle.ts:925-929`) |
| Poll stop | replace with `Effect.void` through the same fork | `Effect.runFork(FiberHandle.clear(h))` from sync `configure` | Runs an Effect outside a fiber to do what the fork function already does; the repo's `NO_SOURCE` idiom is the precedent |
| Sweep scheduling | A/B/C above via a spike | `AtomRegistry` `scheduleTask`/`defaultIdleTTL` | Ruled out by AGENTS.md §13 / CCR-QD-150 |
| Sealed layer clock | clock layer passed in by the consumer | `TestClock` imported into `@qadi/core` | Gives core its first `effect/testing` import for a vocabulary difference |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any new dependency (validation, JSON-depth, scheduling libs) | Everything needed is in `effect@4.1.2`; the library's style rules forbid ad hoc parsers | The APIs above |
| `Schema.decodeUnknownEffect(PolicyFromJson)` as the malformed-JSON path | Re-parses the string and hides the stage that failed | Report `NotJson` from the parse step |
| `Effect.try` / `Result.try` around the decode | A throw past the guard is a library defect that must stay visible (`SinkCodec.ts:495-496`) | Guard first; let a defect stay a defect |
| `Effect.orDie` on any decode or poll path | Fail-closed rule (AGENTS.md §4) | Typed refusal values |
| `import type` as a cycle workaround | madge counts type-only edges (verified) | A leaf below both modules |
| `switch (x._tag)`, `as`, `!`, `any` for the new closed refusal | AGENTS.md §5a/§6 | `Match.tagsExhaustive`, generic `S["Type"]` |
| `Effect.fnUntraced`, a new `Schema.TaggedError`, a new `hasCustom` | Each is a budgeted exception (`UNTRACED_BUDGET`/`SCHEMA_ERROR_BUDGET`/`HAS_CUSTOM_BUDGET`); none is needed here | `Data.TaggedEnum` refusals; `Effect.fn` |
| `AtomRegistry.make({ scheduleTask, defaultIdleTTL })` or `RegistryProvider` defaults | The ruled-out mechanism; `RegistryContext.ts:42-47` is its source | Spike options A-C |
| `Date.now`, `setInterval`, `performance.now` in the sweeper or the poll | AGENTS.md §6 | `Schedule.spaced`, `Effect.sleep`, `Clock` |
| Computing `mergeReading` inside `getSnapshot` | Fresh object per call breaks `useSyncExternalStore` | Compute on input change, publish to an `ExternalStore` |

## Stack Patterns by Variant

**If a seam has an embedded second guard** (hydration entries, audit entries): the shared entry takes the value to guard, so the caller passes the envelope minus `entries` and each entry separately; the module has no knowledge of payload shape.

**If the strict-decode phase keeps `UNTRUSTED_DECODE_OPTIONS` public:** re-export it from `Policy.ts` by name so `@qadi/audit` and `@qadi/react` keep importing from `@qadi/core`; only the declaring module and the `spec/overview.md:116-117` module column change. If it is removed or renamed, the changeset says **Breaking**.

**If Phase 35 picks A or C:** the interval option moves to `QadiAtomsOptions` (the atom set owns it); `QadiProvider.sweepIntervalMillis` becomes a pass-through or is retired with a changeset note.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `effect@4.1.2` | `@effect/atom-react@4.1.2`, `@effect/vitest@4.1.2`, `@effect/platform-node@4.1.2` | One lockstep line in `pnpm-lock.yaml`; `effect@3.20.0` also appears in the store but only as a transitive of a tool, not used by packages |
| `effect/reactivity/*` | stability tag `@stability unstable` on `Atom`/`AtomRegistry` | The APIs cited in Phase 35 are marked unstable; the existing `v4-reactivity-smoke.test.ts` is the pin, so add any new reliance (`AtomContext.mount`, effect-atom finalizer interrupt) to it |
| `madge@8.0.0` | `typescript@^7` workspace | Parses imports only, does not type-check (ADR-QD-037) |

## Sources

- `node_modules/effect/src/Schema.ts`, `SchemaParser.ts`, `SchemaAST.ts`, `FiberHandle.ts`, `Effect.ts`, `internal/effect.ts`, `Scheduler.ts`, `HashMap.ts`, `reactivity/Atom.ts`, `reactivity/AtomRegistry.ts` (HIGH, installed source, line-cited above)
- `node_modules/.pnpm/@effect+atom-react@4.1.2_.../src/{Hooks,RegistryContext,ScopedAtom,ReactHydration}.ts` (HIGH)
- `packages/core/src/{Policy,DecodeDepthGuard,SinkCodec,PortWireEncode,PortRemote,SharedComputation,DecisionCache,Lifecycle,Evaluate,Question}.ts`, `packages/react/src/{HydrationEngine,QadiAtoms,QuestionBook,QadiProvider}.ts(x)`, `packages/audit/src/{AuditArchive,AuditEntry}.ts`, `packages/devtools/src/model/{DockModel,DiagnosticsStore,ExternalStore}.ts`, `packages/devtools/src/react/{DevtoolsDock,useDiagnostics,useRunningStore,useDockModel,useDockSession,useExplorerSession}.ts(x)` (HIGH, current tree at `b8b19f6c`)
- madge: `node_modules/madge` README plus two empirical runs (the real tree, and a two-file type-only cycle in the scratchpad) (HIGH)
- `.planning/phases/_WAVE8-CONTEXT.md`, `.planning/PROJECT.md`, `AGENTS.md`, `spec/decisions/037-*.md` (HIGH, project authority)

---
*Stack research for: Qadi v1.3 Arch Wave 8 (Phases 30-36)*
*Researched: 2026-11-12*

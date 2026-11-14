# Stack Research: v1.4 Arch Wave 9 (Phases 37-42)

**Domain:** internal architecture deepenings in an existing Effect v4 library (no new features)
**Researched:** 2026-11-14
**Confidence:** HIGH for every API claim below. Each was read in `node_modules/effect/src` (effect 4.1.2) and the runtime-behaviour claims were run, not inferred (scratch scripts, listed under Sources).

**Bottom line: no new dependency, no new effect API, no version change.** Every phase is expressible in what the repo already imports (`FiberHandle`, `Exit`, `Cause`, `Scope`, `Schema`, `Metric`, `Match`, `Data`, `effect/reactivity/Atom`, `AtomRegistry`). The work is about *where* these are stated, not about new capability. The research value is in the behaviours the existing hand copies rely on without saying so, which a shared module must preserve (Phase 37) and in three type-level facts that make "derive it from one const" work without `as` (Phases 38, 39).

All paths below are relative to `node_modules/effect/src/` unless marked `repo:`.

---

## Phase 37: a scoped run that a newer run supersedes (devtools)

### APIs the module is built from (all already imported by the three stores)

| API | Signature (verbatim from source) | Where |
|-----|----------------------------------|-------|
| `FiberHandle.make` | `<A, E>() => Effect<FiberHandle<A, E>, never, Scope>` (an `acquireRelease`) | `FiberHandle.ts:152` |
| `FiberHandle.runtime` | `(self) => <R>() => Effect<(effect, options?) => Fiber, never, R>`; captures `Effect.context<R>()` once, returns a **synchronous** fork function | `FiberHandle.ts:901` |
| `FiberHandle.makeRuntime` | `<R, E, A>() => Effect<(effect, options?) => Fiber, never, Scope \| R>` = `make` then `runtime`; hides the handle | `FiberHandle.ts:198` |
| `FiberHandle.getUnsafe` | `(self) => Option<Fiber>` ; `None` when closed **or** empty | `FiberHandle.ts:603` |
| `FiberHandle.clear` | `(self) => Effect<void>`: `Fiber.interruptAs` then clears, **awaits** the fiber's exit | `FiberHandle.ts:668` |
| `Cause.hasInterruptsOnly` | `<E>(cause) => boolean` = `reasons.length > 0 && every(isInterrupt)` | `Cause.ts:648`, `internal/effect.ts:247` |
| `Exit.isFailure` | type guard | `Exit.ts:435` |
| `Effect.addFinalizer` | `(exit) => Effect<void, never, R>` ; registers on the **caller's** `Scope` | `internal/effect.ts:4232` |
| `Effect.fn("name")(function*)` | tracing wrapper; opens **no** scope of its own | `Effect.ts:24225` |

### Verified behaviour (run, not assumed)

1. **Fork order: the new fiber's synchronous prefix runs BEFORE the previous fiber is interrupted.** `runtime`'s fork is `const fiber = runFork(effect, options); setUnsafe(self, fiber, options); return fiber` (`FiberHandle.ts:938-940`). `runForkWith` calls `fiber.evaluate(effect)` immediately (`internal/effect.ts:5746-5755`), so the body runs up to its first async boundary, then `setUnsafe` installs it and interrupts `previous`. Run output: `fork B` -> `B prefix` -> `onExit A interrupt` -> `forked B returned`.
2. **Replacing interrupts the previous fiber synchronously, and its finalizers run inside the `fork(...)` call** (up to the first async boundary). `setUnsafe` does `self.state.fiber = fiber; fibers.add(fiber); previous?.interruptUnsafe(internalFiberId)` (`FiberHandle.ts:~415-419`); `interruptUnsafe` evaluates the failure immediately unless the target is currently `_running`, in which case the interrupt is deferred (`internal/effect.ts:592-612`). The old run's `Effect.onExit` therefore sees `mine !== generation` provided the generation was bumped **before** the fork. That is the contract every store already follows ("Bumped synchronously, before any fiber is touched"); the shared module must keep it.
3. **A replaced fiber with a slow (async) finalizer keeps interrupting after `fork` returns**, and a later scope close still waits for it. The handle tracks it in `state.fibers` ("the current one plus replaced fibers that are still interrupting", `FiberHandle.ts:~64`). Run: `fork(stop)` returned with the finalizer not done; `Scope.close` then waited for it.
4. **Stop = `fork(Effect.void)`; it is safe when nothing is running, so the guard in `SimulationSession.ts:462` is not needed.** `Effect.void` completes during `runFork`, the observer in `setUnsafe` clears `state.fiber` at once, and `getUnsafe` is `None` before and after (run output: "after 2nd stop running? false"). With no previous fiber there is nothing to interrupt; the only cost is one throwaway fiber. On a **closed** handle `runtime`'s fork returns `constInterruptedFiber()` and never starts the body (`FiberHandle.ts:934-936`, run: "body ran after close" never logged). So the drift resolves to: **stop is unconditional** (`DiagnosticsFeed`'s form is correct and simpler; `SimulationSession`'s `Option.isSome(getUnsafe)` is an allocation shortcut with no observable effect). Pin it with a test "stop with no run: no throw, handle empty, snapshot untouched".
5. **Scope close order is reverse registration, and finalizers are sequential by default.** `scopeCloseFinalizers` iterates `for (i = arr.length-1; i >= 0; i--)` and `exits.push(yield* exit(runFinalizer(...)))` when `strategy === "sequential"` (`internal/effect.ts:4050-4071`); `scopeMakeUnsafe` defaults to `"sequential"` (`:4149`) as does `Effect.scoped`. So a finalizer added **after** `FiberHandle.make` runs **first**: it bumps the generation and sets `closed`, then the handle's release sets `state = Closed` and `interruptAllAs(state.fibers)` (awaited). Run output: `scope-finalizer gen->6` then `onExit D interrupt current=false`. **Caveat:** if a caller ever passes a `Scope.make("parallel")`, the finalizers are forked concurrently and the ordering guarantee is gone (the three stores share this assumption silently). The module should state it in its doc comment; `Scope.Scope` exposes `readonly strategy` (`Scope.ts:49`) if a test wants to pin it.
6. **`FiberHandle.make`'s release flips `state` to `Closed` BEFORE interrupting** (`FiberHandle.ts:158`: `handle.state = { _tag: "Closed" }` then `Deferred.into(Fiber.interruptAllAs(...))`). `state` is a public field on the `FiberHandle` interface, so a closed check independent of finalizer order is *possible* (`handle.state._tag === "Closed"`), but it reaches into a mutable field. Recommendation: keep the generation bump plus `closed` flag in the module's own finalizer (proven, mutation-covered) and do not read `handle.state`.
7. **Exit/Cause check.** `Cause.hasInterruptsOnly(Cause.empty)` is `false` (needs at least one reason). A cause of interrupt **plus** a defect (a finalizer that died during interruption) is `false`, so it counts as a failure; the `mine === generation` conjunct is what suppresses it for a replaced run. The repeated predicate `mine === generation && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)` should be one function in the module taking the exit and returning the cause or `undefined` (a landed failure). `Exit.hasInterrupts` exists (`Exit.ts:528`) but means "any", not "only"; do not swap.
8. **`Effect.fn` and traces.** `Effect.fn("n")` wraps the body in `provideParentSpan` (`internal/effect.ts:1403`). `FiberHandle.runtime(h)<never>()` calls `Effect.context()` inside that body, so **forked runs inherit the (already ended) constructor span as parent**. This is true of the three stores today. A shared module that is itself an `Effect.fn` adds one more ended parent to each run. Cosmetic only. If it matters, the module should not be `Effect.fn`-named (but house rule says every effectful function is `Effect.fn`, so keep it named and accept the lineage).
9. **`it.scoped` does not exist in `@effect/vitest@4.1.2`.** `it.effect` is `Tester<Scope.Scope>`: it already wraps the test in `Effect.scoped` (`@effect/vitest/src/index.ts:253-266`, `internal.ts:353`). AGENTS.md §10 still says `it.scoped`; the existing `TimelineFeed.test.ts` header uses `it.effect` ("`it.effect` provides one, and a test that needs to end it mid-test makes its own"). A test that closes the scope mid-test builds one with `Scope.makeUnsafe()` and runs the module via `Scope.provide(effect, scope)` then `Scope.close(scope, Exit.void)` (the names the existing test already uses). Correct AGENTS.md §10 when Phase 37 lands, or the planner will write `it.scoped` and get a TypeError.

### A hazard the hand copies have and the module must decide on (verified, RED-testable)

**A run that starts a newer run from inside its own synchronous prefix gets the newer run killed.** Because install happens after `runFork` returns (fact 1), a re-entrant `fork` made from the outer body installs the inner fiber first; the outer then installs and interrupts it. Run (`exp3`): `outer prefix: forking INNER` -> `INNER exit interrupted` -> only OUTER stays in the handle, with a stale generation. Nothing runs and the state looks idle. The stores are exposed to this wherever a body's synchronous prefix can notify a subscriber that calls a command (`TimelineFeed.readSource` -> `timeline.accept` -> subscriber -> `restart`; `SimulationSession`'s own comment "A subscriber notified by that commit may already have superseded this run" is the same race caught only on the *pre-fork* side by `if (mine === generation) fork(...)`).

Options for the module (decide, then pin with a RED test first, per the shared rules):
- (A) Keep the synchronous start; document "the body must not call a command before its first yield" and test that one that does is reported (not silently idle).
- (B) Start with `Effect.yieldNow` as the body's first step so install always precedes user code. Verified mechanism (`yieldNowWith` schedules via the dispatcher, `internal/effect.ts:1070`). Cost: the body no longer runs synchronously, which existing tests pin (`delayed` helper in `TimelineFeed.test.ts` exists to *avoid* this race by yielding once). Not recommended without reading how many store tests depend on a synchronous prefix (the review counts about 34 matching lines across the three test files).
- (C) `FiberHandle.run(handle, effect, { startImmediately: false })` (`FiberHandle.ts:834-856`) installs before start but is an `Effect`, so the stores' synchronous commands would need `Effect.runSyncWith`. Heavier than (B); no gain.

Recommendation: (A) plus the RED test, because it is the smallest change that keeps behaviour, and the module's interface is where the rule gets stated once.

### What the module should look like, in effect terms

One package-private `Effect.fn` in `packages/devtools/src/model/` returning a closure-record (no `Context.Service`, per the phase constraints) over: one `FiberHandle.make<void>()`, one `FiberHandle.runtime(handle)<never>()` (use `makeRuntime` only if `getUnsafe` is truly unneeded, which fact 4 now shows it is), the `generation` and `closed` cells, and one `addFinalizer` registered **after** the handle. Interface: `start(effect)` (bump, capture `mine`, fork, return a `landing`-style predicate `isCurrent()` bound to `mine`), `stop()` (bump, `fork(Effect.void)`), `closed()`, and the single failure check. No `Effect.fnUntraced` (budget stays 3).

### Not needed

`FiberMap`/`FiberSet` (one slot, not keyed or many), `Effect.forkScoped`/`Fiber.interrupt` by hand (loses synchronous replace), `Effect.race`/`raceFirst` (interrupt is asynchronous and does not give the "bump first" ordering), `Ref`/`SynchronizedRef` for the generation (stores publish synchronously from event handlers; a plain `let` in the closure is correct and cheaper), `Semaphore`/`Latch`. `FiberHandle.clear` (an `Effect` that awaits; fact 4's `fork(Effect.void)` exists precisely because the stores are synchronous).

---

## Phase 38: the wire version stated once (core)

### APIs

| API | Fact | Where |
|-----|------|-------|
| `Schema.Literal<L extends LiteralValue>(literal: L): Literal<L>` | `LiteralValue = string \| number \| boolean \| bigint`; the argument's **type** becomes `L` | `Schema.ts:2717, 2743`; `SchemaAST.ts:1729` |
| `Schema.Literals<const L extends ReadonlyArray<LiteralValue>>(literals: L): Literals<L>` | accepts a `readonly [2]` tuple const; `Type` is `L[number]` | `Schema.ts:5007, 5040` |

### Verified (tsc 7.0.2, strict config copied from `tsconfig.base.json`, run in a scratch project)

- `const WIRE_VERSION = 2;` has a **widening** literal type: `Schema.Literal(WIRE_VERSION)` still infers `Literal<2>`, **but** `{ ...record, version: WIRE_VERSION }` types `version` as `number`. That is exactly why the encoder today writes `version: 2 as const`. So the constant must be **non-widening**: `export const WIRE_VERSION = 2 as const;` (the house style allows `as const`; `check-house-style.mjs` `no-type-assertion` excepts it) or `export const WIRE_VERSION: 2 = 2;`. Both typecheck, both give `version: 2` in the spread. Prefer `as const`: it matches `Errors.ts`, `ERROR_CODES`, `enforcementErrorTags`.
- Derivation without a cast:
  ```ts
  export const WIRE_VERSION = 2 as const;                      // the version this build writes
  export const WIRE_VERSIONS = [WIRE_VERSION] as const;        // versions it reads (a full-union edit when it grows)
  export type WireVersion = (typeof WIRE_VERSIONS)[number];    // 2
  ```
  `WIRE_VERSIONS` stays assignable to `ReadonlyArray<WireVersion>` (checked), so `DecodeRefusal.UnsupportedVersion.supported` is unchanged.
- Consumers: schema fields `version: Schema.Literal(WIRE_VERSION)` (`SinkCodec.ts:146, 154`), encoder `version: WIRE_VERSION` (`:224, 226`), decoder `version === WIRE_VERSION` (`:453, :470`, delete the local const). A `.tst.ts` pin (`expect(WIRE_VERSION).type.toBe<2>()`, tstyche is already in the repo, see `HydrationMetrics.tst.ts`) closes the "retyping compiles but the encoder keeps writing 2" hole at the type level; the existing round-trip test closes it at runtime.
- **Wire bytes cannot change** provided the encoder expression keeps the same key order (`omitUndefined({ ...record, version: WIRE_VERSION })`, version after the spread, as today). `Schema.Literal(2)` and `Schema.Literal(WIRE_VERSION)` build the same AST.

### Integration traps

- `SinkWire.ts` and `SinkCodec.ts` are both `export *` from the core barrel (`packages/core/src/index.ts:54-55`), so a new `WIRE_VERSION` export is **public** and gate 13 (`check-api-surface.mjs`) needs a row in `spec/overview.md` (or a "Not listed above" entry with a reason). Cheapest honest option: export it, add the row. Do **not** keep it private and have the codec re-state it; that is the defect being fixed. `SinkWire.ts` is a leaf that `SinkCodec.ts` imports (ADR-QD-037), so the constant must live in `SinkWire.ts`.
- `WIRE_VERSIONS` today is annotated `ReadonlyArray<WireVersion>` (`SinkWire.ts:51`). Retyping it to the `as const` tuple narrows its public type to `readonly [2]`: type-only, source compatible, but record it in the CCR/changeset as a (patch) type change.

### Not needed

`Schema.Enum`, `Schema.tag` (that is for `_tag` fields with constructor defaults), `Schema.Literals` for the current-version field (it must pin ONE version; a union of all supported versions would let a v3 payload decode against v2's field list). Use `Literals(WIRE_VERSIONS)` nowhere on the struct; it is only useful if a future test wants a schema of "any supported version".

---

## Phase 39: hydration drop reasons stated once (core + react)

### The pattern (verified with tsc, no `as` beyond `as const`)

One keyed table, kind as value; unions, the list, and react's groups are read off it:

```ts
const DROP_KIND = {
  ForeignSubject: "dehydration",
  UnencodablePolicy: "dehydration",
  PayloadSubjectMismatch: "payload",
  MalformedEntry: "entry",
  UndecodablePolicy: "entry",
  EntryTooDeep: "entry",
  UnsupportedPayloadVersion: "payload",
  MalformedPayload: "payload",
  PayloadTooDeep: "payload",
} as const;
type DropTable = typeof DROP_KIND;
export type HydrationDropReason = keyof DropTable;
type ReasonOfKind<K extends DropTable[HydrationDropReason]> =
  { [R in HydrationDropReason]: DropTable[R] extends K ? R : never }[HydrationDropReason];
export type DehydrationDropReason = ReasonOfKind<"dehydration">;
export type ClientHydrationDropReason = ReasonOfKind<"payload" | "entry">;
// react: PayloadRefusalReason = ReasonOfKind<"payload">, EntryDropReason = ReasonOfKind<"entry">

const isReason = (word: string): word is HydrationDropReason => Object.hasOwn(DROP_KIND, word);
export const hydrationDropReasons: ReadonlyArray<HydrationDropReason> = Object.keys(DROP_KIND).filter(isReason);
```

Compiled clean under the repo's strict flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`). It is the same shape as `ENFORCEMENT_ERROR_CLASSES` + `EnforcementErrorTagOf<C>` (`repo: packages/core/src/Errors.ts:~493-566`), which is the house precedent: copy its vocabulary and doc style rather than invent. A reason with no kind **cannot exist** (the key *is* the reason), which is stronger than today's `ReadonlyArray<HydrationDropReason>` hand list, where a missing entry compiles. `MEANINGS: { readonly [R in HydrationDropReason]: HydrationDropMeaning }` keeps working unchanged and still makes a missing meaning TS2741.

- `Object.keys(table).filter(isReason)` yields `HydrationDropReason[]` through the type-predicate `filter` overload, no cast. `isReason`'s predicate is a claim, not a check, but it is `Object.hasOwn` on the very table the type comes from, so it cannot lie; it also replaces `isHydrationDropReason`'s `.some` scan (keep that export, same signature `(word: string) => word is HydrationDropReason`, pinned by `HydrationMetrics.tst.ts:25`).
- A per-kind list helper (`ofKind("entry")`) needs a second type predicate whose body is not checked by tsc; compiled, but prefer **not** exporting per-kind value lists unless a consumer needs values. React needs only the **types** (`HydrationEvent` narrows `reason` per tag).
- `Schema.Literals(hydrationDropReasons)` also typechecks with a plain `ReadonlyArray` (the `const L` constraint accepts it) if a schema of the set is ever wanted. Not needed now.

### Metric interaction (verified in `Metric.ts`)

- **The reasons are frequency *words*, not metric attributes/labels.** `Metric.frequency(id, { description, attributes?, preregisteredWords? })` (`Metric.ts:2592`). The registry key is `JSON.stringify([type, id, description, sortedAttributes])` (`makeKey`, `Metric.ts:4394`). **Neither words nor `preregisteredWords` are in the key.** So changing how the reason set is *derived* cannot detach reader from writer and does not touch `[metric-table]` (id, type, file). Only `description` or `attributes` changes would (as the file's own comment says). Do not add `attributes` to the frequency.
- `preregisteredWords` is applied once per registry at first materialisation: `FrequencyMetric.createHooks` seeds `new Map` and `occurrences.set(word, 0)` in **list order** (`Metric.ts:1845-1850`). `updateUnsafe(reason, registry)` accepts any `string` (`FrequencyMetric` is `Metric<string, FrequencyState>`), so **closedness is enforced only by the typed call site** (`repo: packages/react/src/HydrationEvent.ts:155`), not by Effect. Keep that call typed `HydrationDropReason`.
- **Order is observable.** `repo: packages/devtools/src/model/Hydration.ts:114` renders `[...drops.occurrences]` in insertion order ("Insertion order is the order `hydrationDropReasons` declares"), `Hydration.test.ts:103` pins it, and `HydrationMetrics.test.ts:174` pins `deepStrictEqual([...hydrationDropReasons], REASONS)` by hand-written literals (deliberately not the constant; leave it as the independent oracle). `Object.keys` on a string-keyed object literal returns insertion order, so **the table must list the nine keys in exactly today's order**: ForeignSubject, UnencodablePolicy, PayloadSubjectMismatch, MalformedEntry, UndecodablePolicy, EntryTooDeep, UnsupportedPayloadVersion, MalformedPayload, PayloadTooDeep (kinds interleave: dehydration, payload, entry x3, payload x3). Grouping by kind would reorder the panel.
- `Hydration.test.ts:109` `assert.strictEqual(hydrationDropReasons.length, 9)` becomes redundant once completeness is by construction; replace, do not keep as a second oracle.

### Integration traps

- `HydrationMetrics.ts` is `export *`'d (`index.ts:25`). New exports (a kind type, `DROP_KIND` if exported) need `spec/overview.md` rows; keeping the table module-private and exporting only the derived types/list keeps gate 13 quiet. React's `PayloadRefusalReason`/`EntryDropReason` are exported from `HydrationEvent.ts` today: keep the names, redefine from a core-exported kind helper type, or re-derive in react from a core-exported `ReasonOfKind` (one new public type, needs the overview row).
- `METRIC_ID_LITERAL_BUDGET` for `HydrationMetrics.test.ts` is 5 (`check-house-style.mjs:1918`): the reasons are not `qadi_*` ids, so adding or removing reason literals in tests does not move it.

### Not needed

`Schema.Literals` / `Schema.Enum` for the set, `Data.taggedEnum` (a reason is a plain string word, and the metric key is a `string`), `Match` (the file already says why a mapped type beats a `Match` for a constant per key), `Metric` attributes.

---

## Phase 40: core owns describing a decode refusal (core, devtools, audit)

No effect API beyond what is in the repo: `Data.taggedEnum` constructors expose `$is` and `$match` (`Data.ts:365-384`, `$is` already used in `DiagnosticsFeed.ts`); `Match.type<DecodeRefusal>().pipe(Match.tagsExhaustive({...}))` (`Match.ts:1406`) built once at module scope is the house form (ADR-QD-116's `describeEncodeRefusal` is the template to mirror). `Result.isFailure`/`Result.succeed` for the audit single-decode.

- Mirror `describeEncodeRefusal`/`reportEncodeRefusal` exactly; the decode describer takes the closed `DecodeRefusal` (`SinkWire.ts:53-83`) and returns the words; devtools stops owning a 1:1 kebab-case rename (`Source.ts:220-228`).
- `DecodeRefusal.UnsupportedVersion.supported` is `ReadonlyArray<WireVersion>`: **Phase 38 lands before Phase 40**, so the describer reads `WIRE_VERSIONS` through the derived type and needs no change when Phase 38 narrows it.
- Audit single decode: `decodeAuditEntry` decodes `input.record` twice (`AuditEntry.ts:193-209`). To get "the record's JSON form from one decode" without a second `Schema.decode*`, derive it from the decoded `SinkRecord` with the existing encode side (`SinkCodec` owns both directions, ADR-QD-095) rather than re-decoding. That removes the `recordJsonOf` `Schema.decode*` token, so `UNTRUSTED_DECODE_BUDGET` for `packages/audit/src/AuditEntry.ts` drops from 1 to 0 and **AGENTS.md §7a's table row, `check-house-style.mjs` `UNTRUSTED_DECODE_BUDGET` and `[untrusted-decode-table]` must change in the same task** (checked both directions). Do not leave the row at 1 for a file with 0 tokens: the gate fails on a count that silently moves.

---

## Phase 41: one guarded value-to-text function (devtools)

No effect API is involved; this is plain TypeScript. Facts to verify rather than assume (the phase must reproduce RED first):

- `JSON.stringify` throws `TypeError` on a `bigint` and on a circular structure; it returns `undefined` (not a string) for `undefined`, functions and symbols, which `String(JSON.stringify(v))` turns into the text `"undefined"` (`Remedies.ts:574`). Core's `contains(value: unknown)` (`Matcher.ts:284`) admits both a bigint and a circular object, per the review.
- House constraints on the one function: `SimulationForm.ts:95-103` is a `try/catch` today and `Filters.ts:136-146` is guarded another way. Prefer `Result.try` (core already uses it, `SinkCodec.ts:351, 369, 391`; `Result.try({ try, catch })` takes a mapper) over a bare `try/catch`, so the guarded function returns text for every input and the unguarded callers cannot regress. No `as`, no `any` (so no `JSON.stringify` replacer typed loosely); bigint -> `${value}n`, circular -> a stable marker, both via the replacer or a catch fallback.
- `Date.now`, `console.*` stay forbidden; the function is pure.

---

## Phase 42: a seeded question builds its own computing atom (react; behind a human checkpoint)

### How effect's atoms actually build (verified in `reactivity/Atom.ts`, `AtomRegistry.ts`)

| Fact | Where | Why it matters here |
|------|-------|---------------------|
| `runtime.atom(create)` is `readable((get) => { runtimeResult = get(this); if not Success return replacePrevious(...); return read(get, runtimeResult.value) })`. `create(get)` is called **synchronously inside the atom's reader**, after the runtime atom is read, and its returned Effect is then run by `makeEffect` | `Atom.ts:275-289`, `:559-640`, `:648-700` | `get(subject)` and `seededIn(get.registry)` in today's `computedFor` body are synchronous reads in the *outer* reader, not inside the effect. Moving the creation into the question changes nothing about when they run. Only dependencies read through `get` are tracked; `registry.getNodes()` is untracked (this is the "does not re-run when a seed arrives later" property, BEH-QD-186). |
| `AtomContext` carries `registry`, `addFinalizer`, `get`, `once`, `self`, `setSelf`, `subscribe`, `mount`, `refresh` | `Atom.ts:174-212` | The question can build its own atom with only `runtime`, `subject` and what it already holds: `get.registry` supplies the seed lookup, so no `seededIn` callback has to cross the module boundary. `get.addFinalizer(f)` is the liveness hook for the "`live()` first, release in finalizer" rule. |
| `Atom.keepAlive(a)` and `Atom.withEquality(a, eq)` return **new objects**: `Object.assign(Object.create(Object.getPrototypeOf(self)), { ...self, keepAlive: true })` | `Atom.ts:1747-1752`, `:1843-1851` | **Identity trap for the refactor.** The atom a registry keys on is the post-`keepAlive`/`withEquality` copy. `QadiAtoms.ts` builds `subject = Atom.make(...).pipe(Atom.withEquality(...), Atom.keepAlive)` and `grantAtom = Atom.make(...).pipe(Atom.keepAlive)`; whatever is handed to the question must be that final value, never the pre-pipe base. Passing the base compiles and silently reads a different node. |
| `AtomRegistry.getNodes(): ReadonlyMap<Atom \| string, Node>`; `Node.valueOption()` is `None` until initialised; map key is the atom itself unless the atom is `Serializable`, in which case its string key (`atomKey`) | `AtomRegistry.ts:75, :107-110, :469-470, :516` | The existing `seededIn` is correct: `getNodes().get(grantAtom)` then `valueOption()`. The grant atom is not serializable, so it keys by identity. A `get` (not `getNodes`) would create a node for every question, seeded or not (the file's own comment). |
| `runtime.factory.withReactivity(keys)(atom)` is **not** the atom: it returns `transform(atom, reader, { initialValueTarget: atom })`, a second atom that subscribes to the inner one and calls `get.refresh(atom)` on a reactivity-key hit | `Atom.ts:948-962`, `transform` `:2078-2125` | `computed` in `makeSeededQuestion` is already the wrapper. If the question builds its own, it must apply `withReactivity` itself (needs `runtime.factory`), and `initialValueTarget` points at the inner atom, which matters for `setInitialValue`/seed precedence (INV-QD-028 keeps the seed in a *separate* atom for exactly this reason: `preserveInitialValueOnBuild`, `AtomRegistry.ts:782, :875`). |
| `runtime.atom` handles a runtime that is not ready: it returns `AsyncResult.replacePrevious(runtimeResult, previous)` and **does not call `create`** | `Atom.ts:279-283` | A question's own computing atom inherits "no `create` until the runtime is built". The `subject === undefined -> Effect.never` branch is inside `create`, so it still only runs once the runtime exists. |
| An effect atom runs under a fresh `Scope` closed by `ctx.addFinalizer`; a recompute is dispose-then-reread | `Atom.ts:648-700` | Why `get.addFinalizer(live())` must be registered **first** inside the reader (before any `get`), per `QuestionBook.ts` / ADR-QD-148: the release is the reader's finalizer, so a recompute never reads as a drop to zero. The refactor must keep that order. |
| `scheduleNodeRemoval` queues removal via the dispatcher with delay 0 when a node loses its last child/listener and has no TTL | `AtomRegistry.ts:644-649`, `:582` | The "one macrotask later" loss ADR-QD-149 fixed. The grant atom stays `keepAlive`. Do **not** touch `AtomRegistry`'s `scheduleTask`/`defaultIdleTTL` (AGENTS.md §13 keeps them off limits). |

### Integration points for the refactor

- `makeSeededQuestion`'s new input is `runtime` (the `Atom.runtime(layer)` value, `AtomRuntime<R, E>`, which exposes `.atom` and `.factory`) plus the `subject` atom plus `policy`/`resource`/`report`/`track`. The `computedFor`/`seededIn` inversion disappears. `seededIn` stays local to the question and is the same function both the reader (`read`) and the computing atom call, which is what removes the "relationship split across both modules" and one of the three statements of the liveness rule.
- **`DECISION_READ_BUDGET_NAMES` names `makeSeededQuestion` verbatim** (`scripts/check-house-style.mjs:611`, the rename guard) and the budget count for `packages/react/src/HydrationEngine.ts` is 2. If the reads move into a renamed or split function, the budget names and the AGENTS.md §13 text move in the same task, both directions. Keep the name.
- `HydrationEngine.test.ts` currently drives `makeSeededQuestion` with a fake `computedFor`. After the change it must be driven with a real `Atom.runtime(Layer)` and a real subject atom against `AtomRegistry.make()`; use the real registry, not a mock, since `getNodes` and `preserveInitialValueOnBuild` are what is being exercised. `v4-reactivity-smoke.test.ts` pins the keying rule; run it.
- This phase is behind a human checkpoint that may end in "record a rejection ADR". Nothing in effect 4.1.2 blocks the inversion removal or forces it: the reactivity facts above are neutral. Say so in the checkpoint evidence rather than presenting an effect limitation that does not exist.

### Not needed

`Atom.family` (the question book already keys structurally with `MutableHashMap`/`Equal`, ADR-QD-103), `Atom.fn`, `Atom.pull`, `Atom.serializable`/`withServerValue` (hydration is the library's own seed grant, not effect's `reactivity/Hydration.ts`), `@effect/atom-react` additions, `AtomRegistry` construction options (`scheduleTask`, `defaultIdleTTL`, `initialValues`).

---

## Cross-phase: what NOT to add

| Do not add | Why |
|------------|-----|
| Any new npm dependency (`ts-pattern`, `zod`, `fast-check` extras, `remeda`, `xstate`, a state-machine or "supersede" library) | Every phase is a relocation of existing logic. `FiberHandle` already is the "one slot, newer replaces older" primitive. |
| `FiberMap`, `FiberSet`, `Effect.race*`, `Ref`/`SynchronizedRef`, `Semaphore`, `Latch` for Phase 37 | One slot, synchronous commands, plain closure cells. See Phase 37 "Not needed". |
| A new `Effect.fnUntraced` | `UNTRACED_BUDGET` is exact (3, `Walk.ts`); a fourth fails the gate without a benchmark. The Phase 37 module runs per user command, not per policy node. |
| A new `switch` | `SWITCH_BUDGET` is exact (3). Use `Match.type<...>().pipe(Match.tagsExhaustive(...))` at module scope or a keyed table. |
| `Schema.TaggedError` for any new error | `SCHEMA_ERROR_BUDGET` is exact (12). Phase 40's describer returns words, not a new error class. |
| `Record<string, unknown>` as a widened implementation type | Standing user rule. The table derivations above need only `keyof typeof` and a `string -> union` type predicate. |
| `X \| "New"` widening of a union | Standing user rule. A version or reason edit is a full-union edit, which is what the derived constants make a one-place change. |
| `async/await`, `console.*`, `Date.now`, `performance.now` in any new module | AGENTS.md §6. Phase 41's guard is the only place a catch-like construct is tempting; prefer `Result.try`. |
| A change to `AtomRegistry`'s `scheduleTask` or `defaultIdleTTL` | AGENTS.md §13: reroutes dispatch and dropped a required render. |
| Reading `AsyncResult` state (`isSuccess`, `waiting`, `previousSuccess`) outside `DecisionOutcome.ts` / `HydrationEngine.ts` | `DECISION_READ_BUDGET`; Phase 42 must keep the two budgeted reads inside `makeSeededQuestion` or move the budget in the same task. |
| `Effect.catchTags({ ... })` object form | `no-catchtags-object-form`; effect 4.1.2 still ships it, so a stray call compiles. |

## Installation

```bash
# Nothing to install. effect@4.1.2 is already the pinned catalog version (pnpm-lock.yaml).
# Verify before a phase starts:
node -p "require('./node_modules/effect/package.json').version"   # 4.1.2
```

## Alternatives Considered

| Recommended | Alternative | When the alternative would be better |
|-------------|-------------|--------------------------------------|
| Stop is unconditional `fork(Effect.void)` | Guard with `Option.isSome(FiberHandle.getUnsafe(handle))` (SimulationSession today) | Never observable in 4.1.2. Only if a profile shows the throwaway fiber matters on a hot path (it does not: stop is a user command). |
| Generation counter + `closed` flag in the module's own finalizer | Read `handle.state._tag === "Closed"` | Would drop the ordering dependency, at the price of reading a mutable public field of an effect-owned struct that the interface calls out as internal bookkeeping. Revisit if effect documents a stable closed predicate. |
| Synchronous start with a documented/tested re-entrancy rule | `Effect.yieldNow` first in the body | If the re-entrancy RED test shows a real store hitting the race, and the synchronous-prefix tests are few. |
| Keyed `as const` table + `Object.keys().filter(isReason)` (order = key order) | Tuple-first (`const reasons = [...] as const; Record<R, Kind>`) | Equivalent safety, and gives an explicit order. Choose it if the review wants the order visibly separate from the kinds; it needs a second table for kind, so it states the set twice (the thing being removed). |
| `WIRE_VERSION = 2 as const` exported from `SinkWire.ts` | Keep it private in `SinkCodec.ts` | Never: the schema, encoder and decoder are all in `SinkCodec.ts` today, but `DecodeRefusal.supported` (in `SinkWire.ts`) is the fourth statement and cannot import the codec (ADR-QD-037). |

## Version Compatibility

| Package | Version | Notes |
|---------|---------|-------|
| effect | 4.1.2 | Installed; all line numbers above are from this build. `pnpm-lock.yaml` pins it, the dev catalog follows `latest`, so **re-check `FiberHandle.ts:395-435` (install order) and `internal/effect.ts:592-612` (deferred interrupt) if the lock moves**: Phase 37's ordering facts are exactly those lines. |
| @effect/vitest | 4.1.2 | `it.effect` is scoped; `it.scoped` absent. |
| @effect/atom-react | as locked | No API from it is needed by Phase 42. |
| node | 26.13.0 locally (CI matrix includes 22.12.0) | `Object.hasOwn` is fine on both. |

## Confidence

| Area | Level | Notes |
|------|-------|-------|
| FiberHandle / Scope / Cause semantics (Phase 37) | HIGH | Read in source and reproduced in four scratch runs (order, stop, close, slow finalizer, re-entrancy). |
| Schema.Literal/Literals, const derivation (Phases 38, 39) | HIGH | Compiled under the repo's strict flags in a scratch project; found and fixed the widening trap. |
| Metric keying and order (Phase 39) | HIGH | `makeKey`, `FrequencyMetric.createHooks` read directly; order dependence found in devtools `Hydration.ts:114` and two tests. |
| Atom construction (Phase 42) | HIGH for the facts listed; MEDIUM for "no behavioural change" of moving the build into the question | The mechanism was read, not executed. The phase's existing e2e (30/30), the dispose-then-reread smoke and `QadiProvider.test.tsx` render sequences are the proof, and must run before and after. |
| Phase 41 JSON facts | HIGH (language semantics), not yet reproduced in this repo | The phase reproduces it RED first, per `_WAVE9-CONTEXT.md`. |

## Sources

Primary (HIGH), all local to the repo:
- `node_modules/effect/src/FiberHandle.ts` (`make` 152, `makeRuntime` 198, `setUnsafe` 311/395-435, `getUnsafe` 603, `clear` 668, `runImpl` 842, `runtime` 901, `constInterruptedFiber` 684, interface 59).
- `node_modules/effect/src/internal/effect.ts` (`interruptUnsafe` 592, `runLoop` 671, `runForkWith` 5746, `scopeCloseFinalizers` 4050, `scopeMakeUnsafe` 4149, `addFinalizer` 4232, `hasInterruptsOnly` 247, `Effect.fn` span 1403).
- `node_modules/effect/src/Cause.ts:648`, `Exit.ts:435, 528`, `Scope.ts:49`.
- `node_modules/effect/src/Schema.ts:2717-2760` (`Literal`), `:5007-5060` (`Literals`); `SchemaAST.ts:1729`.
- `node_modules/effect/src/Metric.ts:1832-1857` (`FrequencyMetric`), `:2592` (`frequency`), `:1690-1725` (`updateUnsafe`/`hook`), `:4394` (`makeKey`).
- `node_modules/effect/src/reactivity/Atom.ts` (`AtomContext` 174, `readable` 401, `makeRead` 559, `makeEffect` 648, `RuntimeProto.atom` 275, `withReactivity` 948, `keepAlive` 1747, `withEquality` 1843, `transform` 2078) and `AtomRegistry.ts` (`getNodes` 75/516, `Node` 107, `atomKey` 469, `scheduleNodeRemoval` 644, `preserveInitialValueOnBuild` 782/875).
- `node_modules/@effect/vitest/src/index.ts:253-266`, `internal/internal.ts:353`.
- Repo: `packages/devtools/src/model/{TimelineFeed,DiagnosticsFeed,SimulationSession}.ts`, `packages/core/src/{SinkWire,SinkCodec,HydrationMetrics,Errors}.ts`, `packages/react/src/{HydrationEngine,HydrationEvent,QadiAtoms}.ts`, `packages/devtools/src/model/Hydration.ts`, `scripts/check-house-style.mjs` (budgets), `AGENTS.md`.

Reproduction scripts (scratchpad, not in the repo): `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/16926f1e-64de-452f-bf60-d41917101ad8/scratchpad/fh/exp.mts` (order, stop, close), `exp2.mts` (closed handle, re-entrancy), `exp3.mts` (re-entrant supersede kills the newer run), `exp4.mts` (slow finalizer, close waits), `types.mts` (+ `tsconfig.json`; Schema/Metric/table derivations typecheck under the repo's strict flags). Run with `node_modules/.bin/tsx` and `node_modules/.bin/tsc -p`.

No external web source was used: the installed source is authoritative for the exact build, and no claim here rests on documentation or memory.

# Stack Research: v1.9 Arch Wave 14 (Phases 77-80)

**Domain:** internal architecture deepening in an existing Effect v4 monorepo (no new features, no new dependencies)
**Researched:** 2026-11-23
**Confidence:** HIGH. Versions come from `node_modules/*/package.json` and `pnpm-lock.yaml`. The brand behaviour was probed with a throwaway typechecked file (compiled under `tsconfig.base.json` with `@ts-expect-error` on both negative cases, run once with `tsx`, then deleted; `git status packages/audit` shows no leftover). Everything else was read from the files cited.

## Verdict

**Add nothing. Upgrade nothing. Every phase is served by APIs already installed and already used in the repo.** The only decision a roadmapper needs is which brand idiom Phase 77 uses (below); the rest is wiring existing pieces.

## Installed Versions (read, not remembered)

| Package | Version | Source |
|---------|---------|--------|
| `effect` | 4.1.2 | `node_modules/effect/package.json`; `pnpm-lock.yaml` (`effect@4.1.2`); catalog `effect: latest` in `pnpm-workspace.yaml`, peer range `^4.0.0` |
| `@effect/atom-react` | 4.1.2 | `node_modules/@effect/atom-react/package.json`; `@qadi/react` only |
| `react` / `react-dom` | 19.3.1 | `node_modules/react/package.json`, `packages/devtools/node_modules/react/package.json`; catalog pins `19.3.1`; peer range `>=19.2.4` (`packages/devtools/package.json`, `packages/react/package.json`) |
| `@types/react` / `@types/react-dom` | 19.3.0 | `pnpm-workspace.yaml` catalog |
| `typescript` | `^7.0.0` | `pnpm-workspace.yaml` catalog |
| `vitest` / `@effect/vitest` | 5.1.0 / 4.1.2 | `pnpm-workspace.yaml`, `pnpm-lock.yaml` |
| `@testing-library/react` | `^16.3.3` | `pnpm-workspace.yaml` |

`@qadi/devtools` has `react` as a peer only (`packages/devtools/package.json:51`); it does not depend on `@effect/atom-react`. Phase 80 touches `@qadi/react` only to delete a field, so no cross-package dependency changes.

## Recommended Stack per Phase

### Phase 77: `AuditEntry` as a value only its codec makes (`@qadi/audit`)

| API | Where it lives | Purpose | Why |
|-----|----------------|---------|-----|
| `effect/Brand` `Brand.nominal<T>()` and `Brand.Brand<"X">` | `node_modules/effect/dist/Brand.d.ts`; used at `packages/audit/src/SignatureLedger.ts:46-48`, `packages/core/src/Identity.ts:44-51`, `packages/core/src/Qadi.ts:276` | Mint the branded row inside `encodeAuditEntry`/`decodeAuditEntry` | The house idiom for "a value only this module makes" and what `SignatureLedgerKey` already does in the same package. Zero runtime cost: `Brand.nominal` returns its argument unchanged (probe printed the plain object back). No new import style, no new dependency. |
| `effect/Schema` `Schema.brand("AuditEntry")` | `node_modules/effect/dist/Schema.d.ts:4374-4398`; used at `packages/core/src/Policy.ts:155-167` | Only if the row's own struct stays a public schema | Narrows `Type` to `S["Type"] & Brand.Brand<B>`. Adds no runtime check and does not change the encoded side (doc at `Schema.d.ts:4386`). |
| `untrustedDecoder` with `unwalked` | `packages/core/src/UntrustedDecode.ts:154-158, 224-275` | Envelope-first row decode | Already supports exactly what Phase 77 asks (details below). |

**Recommendation: `Brand.nominal`, not `Schema.brand`.** Reasons, in order:

1. The row's decoded `record` is not produced by a schema at all. `decodeAuditEntry` builds `{ record: decoded.success.json, sequenceNumber }` by hand from `decodeSinkRecordWithJson`'s JSON form (`packages/audit/src/AuditEntry.ts:157`), and the envelope schema types `record` as `Schema.Unknown` (`AuditEntry.ts:118`). A `Schema.brand` on that struct would brand a value whose `record` is `unknown`, not the `SinkRecordJson` the type promises. The brand has to be applied where the finished row is assembled, and `Brand.nominal` is the tool for "tag a value you have already built".
2. `Schema.brand` on the exported `AuditEntry` schema would leave `Schema.decodeUnknown(AuditEntry)` as a second, unguarded way to mint a branded row. That is the defect the brand exists to prevent (the doc comment at `AuditEntry.ts:21-24` already warns against reading a row "with this schema alone"). If the roadmap keeps the schema public, it must be the **unbranded** struct, with the brand applied only inside the two codec functions.
3. `AGENTS.md` §6 forbids `as`. `Brand.nominal<AuditEntry>()({...})` is the sanctioned cast-free constructor.

**Verified by probe** (`tsc` clean, `tsx` ran):
- `Row.pipe(Schema.brand("AuditEntry"))` gives `Type = {...} & Brand<"AuditEntry">`; the decode success value is assignable to it; a plain literal `{ record: 1, sequenceNumber: undefined }` is **not** assignable (negative `@ts-expect-error` held).
- `Brand.nominal<Nom>()` accepts an object type (not only primitives): `mk({...})` returns the same object; a bare literal is not assignable to `Nom`.
- `Schema.brand` identifier must be a single string literal (`EnsureSingleBrandKey`, `Schema.d.ts:4353`; same note at `packages/core/src/Policy.ts:149`).

**What the brand does and does not guarantee.** Both brands are compile-time only. `Brand.nominal` is publicly exported, so another module can mint one (`packages/core/src/Qadi.ts:256-270` documents the same forgeability for `Authorized`). Phase 77's claim must be worded "archive, retention and the archive facts trust a row without re-checking it", not "unforgeable". Do not export a `makeAuditEntry` or the brand constructor from the barrel (`packages/audit/src/index.ts:3` is `export * from "./AuditEntry.ts"`, so anything exported from `AuditEntry.ts` is public; keep the minting constructor module-private, or move it to a non-barrel file as `PortDerivation.ts`-style scaffolding is, AGENTS.md §9).

**Envelope-first decode: no new stack, one behavioural difference to settle.**
- `untrustedDecoder(schema, { unknownKeys, unwalked })` already takes `unwalked: ReadonlyArray<UnwalkedKey<A>>`, where a key is allowed only if its `Encoded` type is `unknown` or `ReadonlyArray<unknown>` (`UntrustedDecode.ts:121-130, 154-158`). The audit row already uses it: `Schema.Struct({ record: Schema.Unknown, sequenceNumber })` with `unwalked: ["record"]` (`AuditEntry.ts:117-120`), and the archive envelope does the same with `entries` (`AuditArchive.ts:258`).
- The fixed order inside the decoder is project, guard (skipping unwalked keys), `prepare`, strict decode (`UntrustedDecode.ts:152-153, 248-260`).
- Core's stored-record read is the model: `storedWire = untrustedDecoder(StoredEnvelopeWire, { unknownKeys: "ignore", unwalked: ["record"] })`, then `decodeSinkRecord(read.success.record)` on the already-decoded `record` (`packages/core/src/SinkCodec.ts:589-603, 612-621`).
- **The audit row today runs the opposite order**: `decodeSinkRecordWithJson(input.record)` first, then `decodeRow(input)` (`AuditEntry.ts:152-156`), and it uses `unknownKeys: "refuse"` where core's stored envelope uses `"ignore"` (`AuditEntry.ts:119` vs `SinkCodec.ts:603`). Phase 77 flips the order by calling `decodeRow` first and passing `row.success.record` to `decodeSinkRecordWithJson`. The `Predicate.hasProperty(input, "record")` pre-check at `AuditEntry.ts:152` reads `input.record` before any guard and goes away with the flip (the schema's own `Missing key` refusal replaces it, as the stored read documents at `SinkCodec.ts:618-620`).
- **Decision for the planner, not a stack question:** `refuse` versus `ignore` on the row's top level. `refuse` keeps today's behaviour; `ignore` matches core and the additive-metadata argument at `SinkCodec.ts:594-598` but changes what `decodeAuditEntry` accepts and therefore the writer/reader agreement (`ArchiveFacts.ts:56-57`, ADR-QD-110). Either is expressible with the existing option; the choice is a spec/ADR call.
- If `ignore` is chosen, the schema must be an object or a union of objects with distinct literal tags, or the decoder throws at build time (`UntrustedDecode.ts:149-151`). A plain `Struct` qualifies.
- The shared constant `SequenceNumber = Schema.optional(Schema.Int)` (`AuditEntry.ts:56`) and `ArchiveFacts.ts`'s own `Schema.Int` must stay in agreement (`ArchiveFacts.ts:56-57`); a RED test for the unreadable archive should be written against that pair.

**Budget interactions** (`AGENTS.md` §7a): `UNTRUSTED_DECODE_BUDGET` counts `onExcessProperty`, `exceedsJsonDepth`, `Schema.decode*` and `JSON.parse` tokens in `packages/*/src`. `AuditEntry.ts` is not on that table today (it goes through `untrustedDecoder`), so the flip must introduce none of those tokens; use `untrustedDecoder` only. `Schema.brand` is not a counted token. Test churn: about 36 `sequenceNumber:` / literal-row sites in `packages/audit/test` (16 in `AuditArchive.test.ts`, 8 in `Retention.test.ts`) and one in `features/features/wire-versions/wire-versions.steps.test.ts` will need to build rows through `encodeAuditEntry`/`decodeAuditEntry` (already the pattern at `packages/audit/test/Retention.test.ts:15, 34`) instead of literals; type pins `AuditArchive.tst.ts`, `Retention.tst.ts`, `AuditRefusal.tst.ts`, `AuditWriteOutcome.tst.ts` and `AuditPortReply.tst.ts` mention the type and may need a positive/negative pair (the `NOT_CALLABLE_PIN_BUDGET` rules, `AGENTS.md` §6, apply to any new `not.toBeCallableWith`).

### Phase 78: `TimelineStore` owns capacity via a resize command (`@qadi/devtools`)

| API | Where | Purpose | Why |
|-----|-------|---------|-----|
| `makeExternalStore` (`set`, `publish`) | `packages/devtools/src/model/ExternalStore.ts:76-107` | The store's single view | Already what `makeTimelineStore` uses (`TimelineStore.ts:50`). `publish` notifies without a reference change, which a resize that empties the buffer needs. |
| `emptyTimeline(options)` | `packages/devtools/src/model/Timeline.ts` (imported at `TimelineStore.ts:30`) | Rebuild the buffer at a new capacity | `makeTimelineStore` already calls it for `clear` (`TimelineStore.ts:80-85`); a resize is `clear` with a different `options.capacity`. |

No new API. The change is shape only: `TimelineStore.timeline`/`options` become mutable inside the closure and a command (name is the planner's) replaces `emptyTimeline(options)` with `emptyTimeline({ capacity })`, clears `frozen`, and `publish`es. `TimelineFeed.ts` then deletes `inner`, `view`, `push`, the six-member forwarder `timeline` object and `bounded` (`TimelineFeed.ts:111-146`), returns the one store, and `configure`'s resize branch calls the new command (`TimelineFeed.ts:176-190`).

Things to carry over, because they are behaviour not plumbing:
- A capacity change today **drops** the old inner store without unsubscribing (`TimelineFeed.ts:178-180`) and the pause state goes with it (`frozen` lives in the old store). A resize command that empties the buffer must decide whether it also unfreezes; `clear` does (`TimelineStore.ts:83`). Keep that behaviour unless an ADR amends it (ADR-QD-137 is kept, per `PROJECT.md`).
- The throw-ordering contract on `configure` (`TimelineFeed.ts:97-103`, `175-190`, the `try { push() } finally { readSource(...) }`) rests on `notify` rethrowing after all listeners run (ADR-QD-177, `ExternalStore.ts:21-31`). With one store the publish is `store.resize(...)`; the `try/finally` stays so a throwing timeline listener still cannot prevent the refill read.
- `idleTimeline` (`TimelineFeed.ts:76-83`) is a literal `TimelineStore`; adding a member to the interface adds a no-op member there too, and `useTimelineStore`'s hand-fed store (`useTimeline.ts:92-101`) gets it free from `makeTimelineStore`.
- `TimelineStore` is a public type (`packages/devtools/src/index.ts:134`) and `spec/overview.md` must name every export (gate 13, `AGENTS.md` §15), so a new member of the interface needs its row or the gate fails.

### Phase 79: feeds and the dock model take inputs only through `configure` (`@qadi/devtools`)

| API | Where | Purpose | Why |
|-----|-------|---------|-----|
| `sameFields` (module-private function) | `packages/devtools/src/model/ExternalStore.ts:146-153` | The per-field identity rule | Own enumerable string keys compared with `===`, an extra field counts as a change. It is the exact rule `makeDerivedStore.refresh` uses (`ExternalStore.ts:176-181`). Export it from the file (not the barrel) and have the feeds and `DockModel` call it. |
| `useScoped(make)` | `packages/devtools/src/react/useScoped.ts:20-47` | Scope and build in a layout effect | Already the "scope" half. Built in `useLayoutEffect(..., [])`, closes on cleanup, `setValue(() => built)` so a function value is not taken for an updater, clears state on cleanup for hidden `Activity`. |
| `useLayoutEffect` with a dependency list | `useDockModel.ts:55-59`, `useTimeline.ts:62-64`, `useDiagnostics.ts:42-44` | The "configure" half | Three copies of the same shape today; this is the duplication the new hook removes. |
| `useSyncExternalStore` | `packages/devtools/src/react/useStoreSnapshot.ts:14` | Reads | Unchanged. The one call site stays the one call site. |

**The per-field rule, written down from the code.** Today three different rules exist:
1. `makeDerivedStore`: `sameFields` over the key (`ExternalStore.ts:146-153`).
2. `makeDiagnosticsFeed.configure`: hand-written `next.layer !== before.layer || next.collector !== before.collector || next.intervalMillis !== before.intervalMillis` (`DiagnosticsFeed.ts:187-206`), so a field added to `DiagnosticsOptions` is silently not compared.
3. `makeTimelineFeed.configure`: `next.capacity !== before.capacity`, then `next.source !== before.source` (`TimelineFeed.ts:176-190`); `makeGatesFeed.configure`: `next.gates !== registryNow`, `next.questions !== before.questions || next.intervalMillis !== before.intervalMillis` (`GatesFeed.ts:259-275`).
4. `DockModel.configure`: `next.catalogue !== before.catalogue`, plus feed-by-feed forwarding (`DockModel.ts:275-302`).

`sameFields`' own contract (`ExternalStore.ts:136-145`) is the one to adopt: `===` per own enumerable string-keyed field, fields on one side only count as a change, inherited/non-enumerable/symbol keys are ignored. Phase 72 already established that `makeDerivedStore` requires `K extends object & Required<K>` so the compiler refuses an optional field (`ExternalStore.ts:164-167`); a feed input type with optional members (`TimelineFeedInputs`, `DiagnosticsOptions`, `GatesFeedInputs`) cannot reuse that constraint directly. Two ways to compare an optional-field input: compare the object through `sameFields` (works for any `object`; `sameFields<K extends object>` has no `Required` bound, the bound is on `makeDerivedStore` only), or normalise each input to a `Required` shape with explicit `undefined`s. The first needs no new API. Note `exactOptionalPropertyTypes`: the inputs are declared `?: T | undefined`, which is why an omitted input "reads as `undefined`" (`TimelineFeed.ts:93-95`). `sameFields` treats a missing key and a key holding `undefined` as **different** (`fromB.has(field)`), so every `configure` caller must pass the full key set, or the rule must normalise first. That is precisely the "omitted reads as undefined" contract, so normalisation belongs in the shared rule.

**Constructor inputs go away.** Today each of `makeTimelineFeed(init?)`, `makeDiagnosticsFeed(init?)`, `makeGatesFeed(init?)`, `makeDockModel(init?)` takes the same inputs as `configure` (`TimelineFeed.ts:150-153`, `DiagnosticsFeed.ts:150-153`, `GatesFeed.ts:121-124`, `DockModel.ts:176-179`), and `useDockModel` writes the field list **three times** (`UseDockModelInput`, the `makeDockModel({...})` call, the `configure({...})` call and the dependency array: four counts in `useDockModel.ts:29-59`). The roadmap's "dock's input type is stated once" is satisfied by exporting `DockModelInputs` (already declared at `DockModel.ts:80-98`) and deleting `UseDockModelInput`, which is the same eight fields as `DockModelInputs`.

**The one hook, "scope, then configure".** Shape, using only what is installed:

```ts
// package-private, react/useScoped.ts or a sibling; effect imports as namespaces (AGENTS.md §1)
export const useConfigured = <A extends { readonly configure: (inputs: I) => void }, I>(
  make: () => Effect.Effect<A, never, Scope.Scope>,
  inputs: I,
): A | undefined => {
  const value = useScoped(make);
  useLayoutEffect(() => {
    if (value !== undefined) value.configure(inputs);
  }, [value, inputs]);
  return value;
};
```

Two constraints the existing code already teaches:
- **The dependency list cannot be `[value, inputs]` on an inline object.** `useDockModel` lists each field separately so a fresh literal each render does not re-run the effect; `useDiagnostics`' doc says the run restarts when a field changes "never when the `options` object does" (`useDiagnostics.ts:27-31`). But `configure` itself already diffs per field, so depending on the object only costs one idempotent `configure` call per render, not a restart. A hook that must avoid even that needs `useMemo` on a per-field key or a ref compared with `sameFields`; both are plain React 19.3.1 APIs. Pick one rule and state it, which is exactly the "one per-field identity rule" item.
- **The layout effect runs again on the render the value appears** (`useDockModel.ts:53-54` comment). Keep that: it is what lets a prop changed between `useScoped`'s build and its `setValue` land. The first-render sequence for diagnostics is the thing Phase 79's opening characterisation test must pin (`useDiagnostics.ts:38-45`: `useScoped(() => makeDiagnosticsFeed(options))`, then `configure(options)` immediately on the same pass the feed appears, then `idleDiagnostics(options)` is read on the pass before the feed exists, `Starting` vs `Off` per `DiagnosticsFeed.ts:134-142`). Dropping `init` means the build no longer starts the first poll; the first `configure` does, so the sequence "idle `Starting` -> feed built `Off` -> configured `Starting`" must be checked for a flash of `Off` that `idleDiagnostics` hid.
- **StrictMode / hidden `Activity`:** `useScoped` clears its state in cleanup and rebuilds in the next effect; `configure` must therefore run on every new value, not once per mount. The `[value, ...]` dependency does that.

**Amends ADR-QD-137/173.** `makeTimelineFeed` is exported from the package root (`TimelineFeed.ts:1-11`, ADR-QD-173) and `makeGatesFeed`/`makeDiagnosticsFeed` are probed by gate 14 (`scripts/check-package-install.mjs`, per `PROJECT.md` v1.7 Phase 63), so removing their `init` parameter is a public Breaking change: the packed-install consumer must be updated in the same phase or `pnpm check` fails at gate 14.

### Phase 80: highlight lens as a headless session (`@qadi/devtools` + `@qadi/react`)

| API | Where | Purpose | Why |
|-----|-------|---------|-----|
| `makeExternalStore` / `ReadableStore` | `ExternalStore.ts:60-107` | Session state and its `subscribe`/`getSnapshot` | Same mechanics as `DockSession` (`DockSession.ts:43-47`) and `HeldChoiceStore`. |
| `makeDockSession` pattern | `packages/devtools/src/model/DockSession.ts:63-` | Template for a pure session with commands | Plain closure, no scope needed: `makeDockSession` is not an `Effect`. |
| `useStoreSnapshot` | `react/useStoreSnapshot.ts:13-14` | Read the session | The dock's one `useSyncExternalStore` call. |
| `Lens.ts` (`boxesOf`, `clearLens`, `drawLens`, `gateIdAt`) | `packages/devtools/src/react/Lens.ts` | The DOM adapter | Already pure DOM operations; stays in `react/`. |

The three `useState`s (`highlighted`, `picking`, `picked`) and four commands (`highlight`, `clear`, `togglePicking`, plus the internal `setPicking(false); setHighlighted([]); setPicked(id)` transitions on pick and `Escape`) at `useLens.ts:46-120` become one pure state machine in `model/`: state `{ highlighted, picking, picked }`, commands `highlight(ids)`, `clear()`, `togglePicking()`, `hover(id | undefined)`, `pick(id)`, `cancel()`. The transitions are already written down by the effects (`useLens.ts:63-86, 112-120`), and they are pure.

- **Model owns, React adapts.** What stays in `useLens.ts` (renamed or not) after the move: the effect that draws and clears (`useLens.ts:49-62`, keyed on `[highlighted, instances]`) and the effect that registers `pointermove`/`click`(capture)/`keydown` listeners while `picking` (`useLens.ts:64-98`), each reading `document` inside an effect only. This keeps `AGENTS.md` §13's "no DOM API in `@qadi/react`" and the file's own server-render rule (`useLens.ts:10-12`).
- **Ownership by the dock model.** Add the session as a field of `DockModel` built in `makeDockModel`'s scope next to `dock` and `explorer` (`DockModel.ts:186-197`). It needs **no** `Scope` of its own (no fibers), so use a plain `make…` function, not `Effect.fn`, as `makeDockSession` does. `instances` (`GateInstanceLike`) is DOM-adjacent input read by `useLens`; keep it an argument to the DOM adapter, not session state, because it changes per render from `snapshot.instances` (`QuestionsPanel.tsx:106`) and `gateIdAt` needs it only at event time. If the session needs the registry's instance list, `DockModel` already has it through the gates feed (`GatesFeed.ts` `GatesSnapshot.registry`), but state that need explicitly in the plan rather than copying it into the session.
- **Mutation score.** `DockModel.ts` keeps a mutation score of 1 (ADR-QD-168, per `PROJECT.md` v1.8 Phase 72). Adding a field and a pass-through to `DockModel` adds mutants; a test of the built model that lists its members with `subscribe` and `getSnapshot` fails when one is added (`DockModel.ts:26-30`), so the BEH-QD-700 list and that test change in the same commit.
- **`QadiContextValue.instrument` (`packages/react/src/QadiProvider.tsx:62, 307-308`).** The context value is built `{ atoms, registry, instrument, gates }`. The repo's only readers destructure `atoms`, `registry` and `gates` (`DevtoolsFeed.ts:126`, `hooks.ts:22, 155, 174`); none reads `instrument` from the context. `QadiProvider` itself uses its own `instrument` prop (`QadiProvider.tsx:196-208, 266-286`) for the gate writer and the production signal, so the **prop stays**; only the context member is unread. Removing it is a type-only Breaking change to a public type (`spec/overview.md:570` lists `QadiContextValue`), and `useMemo` dependency `[atoms, registry, instrument, gates]` shrinks. The doc comment at `QadiProvider.tsx:91` ("through `useQadiContext` only for other fields (`atoms`, `instrument`)") also names it and needs editing. The alternative the milestone allows, keeping it and recording why, is only worth it if a downstream (outside this repo) reads it; nothing here shows one.

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `Brand.nominal` minted inside the two codec functions | `Schema.brand("AuditEntry")` on the exported row schema | Leaves `Schema.decodeUnknown(AuditEntry)` as a second, guard-free way to mint a branded row, defeating the point; and the decode of `record` is by hand, not by the schema (`AuditEntry.ts:157`). |
| `Brand.nominal` | `Schema.Class` / `Schema.TaggedClass` | Adds a runtime class and a constructor; `ADR-QD-135` already measured and rejected a `Schema.TaggedClass` on a hot path, and an `AuditEntry` must still `JSON.stringify` to exactly the stored bytes (`AuditEntry.ts:13-20`). A class instance serialises its own prototype members differently. |
| `Brand.nominal` | A `unique symbol` field, as `RunToken` does (`SupersedingRun.ts:42-47`) | A symbol-keyed property would be a real runtime field; `JSON.stringify` skips symbol keys, but `Equal`/spread/structured-clone behaviour then differs between a decoded row and a hand-written one. `Brand` has no runtime footprint. |
| Existing `sameFields` as the one rule | A new `Equal.equals`-based deep compare | `Equal.equals` on a `Layer`, a `Source` or a thunk would compare structurally where identity is wanted; `DiagnosticsStore` already used per-field `Equal.equals` for a different job (`ExternalStore.ts:12-14`). Phase 79's whole point is `===` per field. |
| A plain closure session for the lens | `Effect.Service` / `Context.Service` for the session | No dependency to provide, no scope to hold; every sibling (`DockSession`, `ExplorerSession`, `HeldChoiceStore`) is a plain `make…` function returned through `DockModel`. A service would add a `Layer` with no consumer (`AGENTS.md` §2-3). |
| `useLayoutEffect` for "configure" | `useEffect` | A pass between layout and passive effects would paint with stale inputs. Every existing site is a layout effect, and `useScoped` is one (`useScoped.ts:21-47`); the first paint seeing the right inputs is a stated property (`useScoped.ts:8-10`). |
| `useSyncExternalStore` through `useStoreSnapshot` | `@effect/atom-react` for the lens | `AGENTS.md` §13: that is `@qadi/react`'s binding, and `@qadi/devtools` does not depend on it (`packages/devtools/package.json`). The dock's models are plain external stores. |

## What NOT to Add or Do

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any new dependency (zustand, immer, xstate, ts-brand, type-fest `Tagged`) | Nothing in the four phases needs one; `AGENTS.md` §13 allows exactly one deliberate dependency exception in `@qadi/react` | `effect/Brand`, `effect/Schema`, `makeExternalStore` |
| `as AuditEntry` or `as unknown as AuditEntry` | `AGENTS.md` §6 forbids `as`; it also silently voids the brand | `Brand.nominal<AuditEntry>()(...)` inside the codec only |
| `Schema.brand` on a schema that is still publicly decodable | Second minting path | Keep the public schema unbranded, brand in `encode/decodeAuditEntry` |
| Exporting the brand constructor from `@qadi/audit`'s barrel | `export *` makes it public (`packages/audit/src/index.ts:3`); gate 13 also demands an `overview.md` row | Module-private const, or a non-barrel file (`AGENTS.md` §9) |
| A `switch` on a lens state tag | `AGENTS.md` §5a: `Match`, and `SWITCH_BUDGET` fails any new `switch` | `Match.type<…>().pipe(Match.tagsExhaustive(…))` at module scope if the session is a tagged state |
| `Record<string, unknown>` as a widened input type for the shared identity rule | Rejected in project memory: monomorphise or use a predicate | `sameFields<K extends object>` as written |
| `useState` + `useEffect` holding lens state in `@qadi/react` | `AGENTS.md` §13; Phase 80's whole point is that the model owns it | A model session read through `useStoreSnapshot` |
| A second `useSyncExternalStore` call site | `useStoreSnapshot.ts:5-8` warns a second copy once produced a constant-`undefined` run | `useStoreSnapshot` |
| `console.*`, `Date.now`, `performance.now`, `crypto.randomUUID` in the session | `AGENTS.md` §6; `no-ambient-console` is enforced | Not needed: the lens session is pure |
| New module-scope `let` for a lens "last picked" or a hook latch | `MODULE_STATE_BUDGET` allows exactly one (`DeveloperSignals.ts`) | State in the session closure |
| `Effect.fnUntraced` or a new `Effect.fn` per transition | `UNTRACED_BUDGET` counts exactly three; session transitions are plain functions | Plain functions; `Effect.fn` only where a scope is built (`makeDockModel` is already one) |
| `Schema.TaggedErrorClass` for any new refusal | `AGENTS.md` §4, `SCHEMA_ERROR_BUDGET` | Reuse core's `SinkRecordNotDecodable` (ADR-QD-161); no new error is needed |

## Stack Patterns by Variant

**If Phase 77 keeps `AuditEntry` as an exported schema value:**
- Export the unbranded struct under the existing name and the branded `type AuditEntry`; mint only in `encodeAuditEntry`/`decodeAuditEntry`.
- Because `export type AuditEntry = typeof AuditEntry.Type` is the current pairing (`AuditEntry.ts:84`) and a type/const pair of one name cannot differ in brand without a second declaration. If that proves awkward, rename the struct (for example `AuditRow`) and record it in `spec/overview.md`, which is allowed to change in a Breaking phase.

**If Phase 77 chooses `unknownKeys: "ignore"` on the row:**
- Use `untrustedDecoder(…, { unknownKeys: "ignore", unwalked: ["record"] })` exactly as `storedWire` does.
- Because that is the one rule core already states for an envelope with a nested record (`SinkCodec.ts:589-603`), and the `ignore` projection reads only declared keys (INV-QD-306/377).

**If Phase 79's shared rule must also cover `K` with optional fields:**
- Normalise inputs to explicit-`undefined` objects before `sameFields`, or compare fields through the input type's own key list.
- Because `sameFields` distinguishes a missing key from a key holding `undefined` (`ExternalStore.ts:146-153`), and `exactOptionalPropertyTypes` plus the `?: T | undefined` convention means callers may pass either.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `effect@4.1.2` | `Brand.nominal`, `Schema.brand`, `Schema.optional(Schema.Int)`, `Result`, `Effect.fn`, `Match` | All used in `packages/` today; `Schema.brand` still requires one string-literal key (`Schema.d.ts:4353`). `packages/core/test/v4-api-smoke.test.ts` pins the v4 APIs the repo depends on; add a pin there only if Phase 77 adopts an API not already covered. |
| `react@19.3.1` | `useSyncExternalStore`, `useLayoutEffect`, `useState` updater form | Peer range `>=19.2.4`; no React 19.3-only API is needed. Keep `setValue(() => built)` (`useScoped.ts:36-37`). |
| `typescript@^7` | `Brand.nominal<T>()` on an object intersection | Probe compiled clean under `tsconfig.base.json`; negative assignment errors held. |
| `@qadi/audit` -> `@qadi/core` | `untrustedDecoder`, `decodeSinkRecordWithJson`, `SinkRecordJson`, `decodeRefusalOf`, `DecodeRefusal`, `SinkRecordNotDecodable` | All already imported at `AuditEntry.ts:38-46`; no `@qadi/core` change is required for Phase 77. |
| `@qadi/devtools` | `@qadi/core` (`causeMessage`, `StoredRecord`) | `workspace:^`; no change. |

## Gates a Stack Change Would Trip (none are triggered if the above is followed)

- Gate 13, `scripts/check-api-surface.mjs`: any new or renamed export (the lens session's factory if exported from the root, the `TimelineStore` resize member, `DockModelInputs`) needs a `spec/overview.md` row or a "Not listed above" reason (`AGENTS.md` §15).
- Gate 14, `scripts/check-package-install.mjs`: removing the `init` parameter from an exported `make*Feed` is observable through the packed `exports` map; the consumer fixture must be updated (`PROJECT.md` v1.7 Phase 63).
- `UNTRUSTED_DECODE_BUDGET`: no `Schema.decode*`, `JSON.parse`, `onExcessProperty` or `exceedsJsonDepth` token may appear in `packages/audit/src/AuditEntry.ts`; go through `untrustedDecoder`.
- `NOT_CALLABLE_PIN_BUDGET` and `[not-callable-control]`: a new negative type pin ("a literal is not an `AuditEntry`" is better written as `expect<AuditEntry>().type.not.toBeAssignableTo…` / `toBeAssignableFrom`-style on a plain value, not `not.toBeCallableWith` on an Effect-returning function) needs its positive twin in the same file.
- `SWITCH_BUDGET`, `UNTRACED_BUDGET`, `ANY_BUDGET`, `MODULE_STATE_BUDGET`, `HAS_CUSTOM_BUDGET`: no change expected.

## Sources

- `node_modules/effect/package.json` (4.1.2); `pnpm-lock.yaml` (`effect@4.1.2`, `@effect/atom-react@4.1.2`, `react@19.3.1`, `vitest@5.1.0`) — HIGH
- `pnpm-workspace.yaml` catalogs — HIGH
- `node_modules/effect/dist/Schema.d.ts:4353-4421` (`brand`, `fromBrand`, `EnsureSingleBrandKey`) and `node_modules/effect/dist/Brand.d.ts` — HIGH (installed declarations)
- Throwaway probe in `packages/audit` (typecheck under `tsconfig.base.json` plus one `tsx` run; deleted) — HIGH for the behaviours stated
- `packages/audit/src/AuditEntry.ts`, `AuditArchive.ts`, `SignatureLedger.ts`, `index.ts`; `packages/core/src/UntrustedDecode.ts`, `SinkCodec.ts:312-318, 556-640`, `Policy.ts:125-198`, `Identity.ts`, `Qadi.ts:245-285` — HIGH (read)
- `packages/devtools/src/model/ExternalStore.ts`, `TimelineStore.ts`, `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `DockModel.ts`, `DockSession.ts`, `SupersedingRun.ts`; `react/useScoped.ts`, `useDockModel.ts`, `useTimeline.ts`, `useDiagnostics.ts`, `useStoreSnapshot.ts`, `useLens.ts` — HIGH (read)
- `packages/react/src/QadiProvider.tsx:40-100, 190-310`; grep of `useQadiContext` readers across `packages/*/src` and `packages/*/test` — HIGH
- `AGENTS.md` (house rules §1-§17) and `.planning/PROJECT.md` (v1.9 scope) — HIGH
- Not consulted: Context7 and web search. Every API in scope is already vendored in `node_modules` and was read there, which outranks documentation for the pinned build.

**Unverified:** (1) whether `Brand.nominal`'s `Constructor` type interacts badly with `readonly` fields under `exactOptionalPropertyTypes` for the exact `AuditEntry` shape (the probe used `number | undefined`, matching `Schema.optional(Schema.Int)`'s type; it passed, but the real row has `record: SinkRecordJson`); (2) the exact line numbers of `Timeline.ts`'s `emptyTimeline` options type; (3) whether `packages/audit/test/_probe.test.ts` (untracked, predates this research) is an intended file; it uses `encodeAuditEntry` and is not mine.

---
*Stack research for: Qadi v1.9 Arch Wave 14 (Phases 77-80)*
*Researched: 2026-11-23*

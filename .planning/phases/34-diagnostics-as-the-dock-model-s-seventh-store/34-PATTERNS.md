# Phase 34: Diagnostics as the dock model's seventh store - Pattern Map

**Mapped:** 2026-11-12
**Files analyzed:** 27 (new and modified, src, tests, consumers, records)
**Analogs found:** 25 / 27 (all analog paths are git-tracked source under `packages/`, `spec/`, `.changeset/`, `apps/website/src`)

Line numbers are exact where given as `N-M`; `~N` means located by anchor, not by a numbered read. Re-grep the anchor before quoting.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/devtools/src/model/DiagnosticsFeed.ts` (new) | scoped model/feed | event-driven (poll fiber -> store) | `model/DockModel.ts` (FiberHandle + configure) + `model/DiagnosticsStore.ts` (store, `runDiagnostics`) | exact (composite) |
| `packages/devtools/src/model/TimelineFeed.ts` (new, name at planner's discretion, D-15) | scoped model/feed | streaming (source -> store) | `model/DockModel.ts` `readSource` + `TimelineStore.ts` `runSource` | exact |
| `packages/devtools/src/model/DockModel.ts` (mod) | model | event-driven | itself (six stores today) | exact |
| `packages/devtools/src/react/DiagnosticsNotice.tsx` (new) | component | request-response (render) | `ServicesPanel.tsx` `wiringView` (Match.tagsExhaustive, testids, `colors.error`) | role-match |
| `packages/devtools/src/react/useStoreSnapshot.ts` (new) | hook | pub-sub read | `useRunningStore.ts:41` (the `useSyncExternalStore` line) + `useSimulationSession.ts:34` | exact |
| `packages/devtools/src/react/useDiagnostics.ts` (mod) | hook/adapter | pub-sub | `useDockModel.ts` (`useScoped` + layout-effect `configure`) | exact |
| `packages/devtools/src/react/useTimeline.ts` (mod) | hook/adapter | streaming | `useDockModel.ts` | exact |
| `packages/devtools/src/react/useRunningStore.ts` (delete) | hook | - | - | - |
| `useDockSession.ts`, `useExplorerSession.ts` (mod) | hook | pub-sub | themselves | exact |
| `react/useDockModel.ts` (mod: `usePaused`, pass `diagnostics`/`reading`) | hook | pub-sub | itself | exact |
| `react/DevtoolsDock.tsx` (mod) | component | request-response | itself (~153-154 and the `Screen` table ~288-312) | exact |
| `react/ServicesPanel.tsx`, `react/QuestionsPanel.tsx` (mod) | component | request-response | themselves | exact |
| `react/index.ts` (mod) | barrel | - | itself (named exports) | exact |
| `test/model/DiagnosticsFeed.test.ts` (new) | test | event-driven | `test/model/DiagnosticsStore.test.ts` + `test/model/DockModel.test.ts` | exact |
| `test/helpers.ts` (mod: `settleTurns`) | test util | - | `packages/core/test/SharedComputation.test.ts:20-22` | exact |
| `test/react/useDiagnostics.test.tsx`, `useTimeline.test.tsx` (mod) | test | - | themselves | exact |
| `test/react/useSimulationSession.test.tsx:137-169` (Activity) | test | - | itself (rebuild-on-Activity analog) | exact |
| `test/surface.test.ts` / `surface.tst.ts` (mod) | test | - | `surface.test.ts` `REACT_VALUES` ~line 69-76 | exact |
| `examples/nextjs-newsroom/src/client/Counters.tsx:34`, `test/dock-wiring.test.tsx:36` (mod) | consumer | - | themselves | exact |
| spec/records, changeset, upgrading, website | docs | - | phase 33 commits (see below) | exact |

## Pattern Assignments

### `model/DiagnosticsFeed.ts` (scoped feed: store + FiberHandle + configure + restart)

**Analog A: `model/DockModel.ts`** (FiberHandle + synchronous fork from a command, per-field configure).

Imports/idiom (header ~lines 24-40; `Scope` is type-only):
```ts
import * as Effect from "effect/Effect";
import * as FiberHandle from "effect/FiberHandle";
import type * as Scope from "effect/Scope";
import { makeExternalStore } from "./ExternalStore.ts";
```
Fork pattern (end of `makeDockModel`, ~lines 104-110):
```ts
const reads = yield* FiberHandle.make<void>();
const forkRead = yield* FiberHandle.runtime(reads)<never>();
// A replacement interrupts the read before it; a source that went away is replaced by an empty one.
const readSource = (source: Source | undefined) => forkRead(runSource(timeline, source ?? NO_SOURCE));
readSource(inputs.source);
```
Per-field configure (~lines 125-146): `const before = inputs; inputs = next; ... if (next.x !== before.x) ...`. Copy that shape for `layer`/`collector`/`questions`/`intervalMillis` and the `diagnostics` defined/undefined flip (D-09).

Builder signature to copy: `Effect.fn("qadi.devtools.makeDockModel")(function* (init?: DockModelInputs): Effect.fn.Return<DockModel, never, Scope.Scope> { ... })`. Name the feed span `qadi.devtools.makeDiagnosticsFeed`.

Doc-comment shape (module header of DockModel.ts): one-line summary, then bold-led paragraphs, then "Package-private (ADR-QD-099)".

**Analog B: `model/DiagnosticsStore.ts`** (reuse, do not copy): `makeDiagnosticsStore()` (accept keeps per-field identity), `runDiagnostics(store, {layer, collector, questions, schedule})` (error channel `never`, a defect ends the run), `mergeReading(sampled, supplied)` (returns `sampled` itself when `supplied === undefined`), `noDiagnostics` constant, `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`.

Run description to move out of `useDiagnostics.ts` (today lines ~66-77):
```ts
runDiagnostics(store, {
  ...(layer === undefined ? {} : { layer }),
  ...(collector === undefined ? {} : { collector }),
  ...(questions === undefined ? {} : { questions }),
  schedule: Schedule.spaced(intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS),
})
```
(`exactOptionalPropertyTypes` is why the conditional spreads exist; keep them.)

Closed status (copy `WiringRead` shape, `DiagnosticsStore.ts` ~lines 47-60):
```ts
export type WiringRead = Data.TaggedEnum<{
  NotHanded: {};
  Failed: { readonly reason: string };
  Read: { readonly report: WiringReport };
}>;
export const WiringRead = Data.taggedEnum<WiringRead>();
```
So: `DiagnosticsStatus = Data.TaggedEnum<{ Off: {}; Starting: {}; Live: {}; Stopped: { readonly reason: string; readonly sampled: boolean } }>`; `export const DiagnosticsStatus = Data.taggedEnum<DiagnosticsStatus>()`. Dispatch only with `Match.tagsExhaustive`. Reason text: `Cause.pretty(cause)` (same call `wiringReader` uses, `DiagnosticsStore.ts` ~line 250: `WiringRead.Failed({ reason: Cause.pretty(built.cause) })`).

Observing the fiber's exit (no existing analog; derive): fork `runDiagnostics(...)` wrapped so an `Effect.onExit`/`Effect.exit` publishes `Stopped` only when `Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)` (D-03: interruption never `Stopped`). `sampled` = whether the status was `Live` when the exit arrived. `Live` is set by the store's first `accept` (subscribe to the store, or wrap `accept`). Use `Exit.isFailure` per house style (see `wiringReader`), no `Effect.either`.

Snapshot store: `makeExternalStore<{status, reading}>` (`ExternalStore.ts`: `set` notifies only on a new reference, `publish` always). Compute `mergeReading(feed.reading, inputs.reading)` when the feed publishes or `reading` changes identity, never in `getSnapshot` (D-11). Keep the previous snapshot reference when status and merged reading are both identical, else `useSyncExternalStore` re-renders.

`restart()`: re-fork through the same `FiberHandle.runtime` (replacement interrupts the old fiber, per the comment in DockModel), set `Starting` first (D-04).

Forbidden here: no `async`, no `as`, no `switch`, no `Effect.orDie`, no `console`. Relative imports use `.ts`.

### `model/TimelineFeed.ts` (scoped timeline feed for `useTimeline`, D-15)

**Analog:** `DockModel.ts` `readSource` (above) and `TimelineStore.ts` `runSource` (lines 92-105):
```ts
export const runSource = Effect.fn("qadi.devtools.runSource")(function* (store: TimelineStore, source: Source) {
  yield* Effect.scoped(Effect.gen(function* () {
    const { backlog, live } = yield* source.read;
    if (backlog !== undefined) { for (const record of backlog) store.accept(record); }
    yield* Stream.runForEach(live, (record) => Effect.sync(() => store.accept(record)));
  }));
});
```
Feed = `makeTimelineStore({ capacity })` + `FiberHandle` + `configure({ source, capacity })` that re-forks on a new source or capacity. Keep `useTimeline`'s signature `(source, options?) => UseTimeline` unchanged; `store` in the return must stay the timeline store (stable per capacity). Simplest reuse: the timeline feed may be nothing more than the `reads`/`readSource` + `bounded()` portion of DockModel extracted; check madge acyclicity (DockModel -> feed, never the reverse).

### `react/useDiagnostics.ts` and `react/useTimeline.ts` (thin adapters)

**Analog:** `react/useDockModel.ts` lines ~28-50 (whole body):
```ts
const model = useScoped(() => makeDockModel({ source, capacity, catalogue, ports }));
useLayoutEffect(() => {
  if (model !== undefined) model.configure({ source, capacity, catalogue, ports });
}, [model, source, capacity, catalogue, ports]);
return model;
```
For `useDiagnostics(options?)`: `const feed = useScoped(() => makeDiagnosticsFeed(optionsFields))`, `useLayoutEffect(() => feed?.configure(fields), [feed, layer, collector, questions, intervalMillis, options === undefined])`, then `useStoreSnapshot(feed.store)`. Problem to resolve in plan: `useScoped` returns `undefined` on the first pass, so the hook must return a constant `{ status: DiagnosticsStatus.Off() or Starting, reading: noDiagnostics }` for that pass (a module-scope constant keeps identity). Hook rules: `useStoreSnapshot` cannot be called conditionally, so give it a `store | undefined` overload or hold a module-scope `idleStore` (analog for the undefined-store case: `useSimulationSession.ts:39-43` `useSnapshotOf` with `noSubscription`).
Keep the doc comment's "restarts when one of the four fields changes identity, never when the `options` object does" paragraph (today lines ~48-60 of `useDiagnostics.ts`) and move `DiagnosticsDockOptions` (today lines ~24-46) to the model beside the feed (D-12); `react/index.ts` re-exports it under the same name.

`useTimeline` today (`useTimeline.ts` ~44-55): `useMemo(makeTimelineStore)` + `useRunningStore(store, runSource(store, source), [store, source])` + `useSyncExternalStore(store.subscribe, store.isPaused, ...)`. Rebuild on the timeline feed via `useScoped`; `useTimelineStore` (hand-fed, `useState`) stays and moves to `useStoreSnapshot` for its snapshot read (lines ~71-72). The three React tests (start on mount, stop on unmount, no restart on unchanged re-render) must pass unchanged.

### `react/useStoreSnapshot.ts` (one snapshot hook, D-14)

**Analog:** `useRunningStore.ts:41` and `useSimulationSession.ts:34`:
```ts
return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
```
Signature to copy from `useRunningStore`'s param type: `store: { readonly subscribe: (listener: () => void) => () => void; readonly getSnapshot: () => A }`. Header: `"use client";`, module comment with a one-line summary, "Internal scaffolding, kept out of the barrel (AGENTS.md §9)", "Package-private (ADR-QD-099)".

**The `useSyncExternalStore` call sites in `packages/devtools/src` (src only):**

| File:line | Reads | Disposition |
|---|---|---|
| `react/useRunningStore.ts:41` | any store | file deleted; call moves to `useStoreSnapshot` |
| `react/useDockModel.ts:52` | `timeline.isPaused` via `subscribe` (`usePaused`) | non-snapshot accessor: keep as the one raw read, state why in doc comment, unless expressible as a store snapshot |
| `react/useSimulationSession.ts:34` | `session.getSnapshot` | `useStoreSnapshot` |
| `react/useSimulationSession.ts:43` | `session?.getSnapshot()` with `noSubscription` | stays (undefined-session read), or `useStoreSnapshot` overload |
| `react/useTimeline.ts:53` | `store.isPaused` | same decision as `usePaused` |
| `react/useTimeline.ts:71` | `store.getSnapshot` (`useTimelineStore`) | `useStoreSnapshot` |
| `react/useTimeline.ts:72` | `store.isPaused` | same decision as `usePaused` |

The remaining `useSyncExternalStore` hits are comments (`model/SimulationSession.ts:8`, `ExplorerSession.ts:10`, `DiagnosticsStore.ts:29`, `ExternalStore.ts:3,13`, `TimelineStore.ts:4,31`, `useDiagnostics.ts:6`, `useTimeline.ts:5`, `useRunningStore.ts:7`). The orientation said 12 call sites; the code has 7 real calls plus 3 indirect `useRunningStore` readers (`useDockSession.ts:15`, `useExplorerSession.ts:16,20`) and the `useTimeline.ts:52` run. Re-verify before the plan quotes a number.

`useRunningStore(x, undefined, [x])` call sites to collapse (D-14):
```ts
// useDockSession.ts:14-15
export const useDockSnapshot = (session: DockSession): DockSnapshot =>
  useRunningStore(session, undefined, [session]);
// useExplorerSession.ts:15-16, 19-20: useExplorerSnapshot, useHeldChoiceSnapshot
```
Delete the wrappers or make them one-line `useStoreSnapshot(session)` aliases; planner picks (fewer names wins).

### `react/DiagnosticsNotice.tsx` (notice, `diagnosticsRootProps`, `isUnsampled`)

**Analog:** `react/ServicesPanel.tsx` `wiringView` (lines ~57-97), module-scope `Match.type`:
```tsx
const wiringView: (self: WiringRead) => (shown: Shown) => ReactNode = Match.type<WiringRead>().pipe(
  Match.tagsExhaustive({
    NotHanded: () => () => (<p style={muted} data-testid="qadi-wiring-absent">...</p>),
    Failed: ({ reason }) => () => (<p style={{ ...muted, color: colors.error }} data-testid="qadi-wiring-failed">...</p>),
    Read: ({ report }) => ({ activity, portCalls }: Shown) => (<>...</>),
  }),
);
```
Annotate the const (`: (self: X) => Y`) per AGENTS.md §5a. Copy for `DiagnosticsStatus` with arms `Off`, `Starting`, `Live`, `Stopped`.

Theme tokens (`react/theme.ts`): `colors.error` (the dock's amber `#e3a008`), `withAlpha(hex, alpha)` at line 55, `button(active: boolean)` at line 102, `muted` at 126, `panel` at 140, `font.sizeSmall`. Existing uses: `Inspector.tsx:174-175` (`<section style={{ ...panel, borderColor: colors.error }}>` + heading in `colors.error`), `Simulator.tsx:107-108, 358-359`, `DecisionLog.tsx:113` (`withAlpha(colors.accent, 0.06)`). No existing `role="alert"`/`role="status"` in `src/react` (grep found none): this phase introduces them, so UI-SPEC lines ~217-291 are the only authority; do not look for an analog.

Testids/props: UI-SPEC lines 126-127, 134-160, 339-344. Props `DiagnosticsNoticeProps = { status, onRestart, announced }`; `diagnosticsRootProps(status)` returns `{ "data-diagnostics-status": status._tag, tabIndex: -1, style: { padding: 12, outline: "none" } }`; `isUnsampled(status)` true for `Starting` or `Stopped` with `sampled: false`. The `announced` mode is decided once per mount with `useState(() => announced.current !== status)` and recorded in a `useLayoutEffect` (UI-SPEC 278-282).

### `react/ServicesPanel.tsx` and `react/QuestionsPanel.tsx` (host the notice)

Roots to change: `ServicesPanel` root `<div style={{ padding: 12 }} data-testid="qadi-services">` (~line 100) becomes `<div {...diagnosticsRootProps(diagnostics.status)} data-testid="qadi-services">` with `<DiagnosticsNotice {...diagnostics} />` first. Add `diagnostics: DiagnosticsNoticeProps` to `ServicesPanelProps` (line 32) and `QuestionsPanelProps` (line 44). Suppressed copy per UI-SPEC 187-193: `qadi-wiring-absent` omitted when `wiring._tag === "NotHanded" && isUnsampled(status)`; `qadi-questions-absent` and `qadi-hydration-unwired` likewise, the latter replaced by `qadi-hydration-pending` ("no counts read yet.").

### `react/DevtoolsDock.tsx` (modified)

Delete (today ~lines 153-154):
```tsx
const sampled = useDiagnostics(diagnostics);
const shown = useMemo(() => mergeReading(sampled, reading), [sampled, reading]);
```
and the `useDiagnostics`/`mergeReading`/`useMemo` imports. `useDockModel({ source, capacity, catalogue, ports, diagnostics, reading })`; `DockFrame` (declared `FC<{ model; shown; host }>`) reads `useStoreSnapshot(model.diagnostics)` and owns `announced = useRef<DiagnosticsStatus | undefined>(undefined)`; `shown` prop becomes `view.reading` plus the notice binding built in `useMemo`. `Screen` table entries `services:` (~line 296) and `questions:` (~line 304) pass `diagnostics={...}`. `DockFrame` already uses `useDockSnapshot(dock)` and `usePaused(timeline)` (~lines 175-176): swap to `useStoreSnapshot`.

### `model/DockModel.ts` (seventh store)

Header comment says "six stores" (line 1 and in the doc): update to seven. Extend `DockModelInputs` (interface at ~line 44) with `diagnostics?: DiagnosticsDockOptions | undefined` and `reading?: DiagnosticsReading | undefined`; add `readonly diagnostics: DiagnosticsFeedStore` (subscribe/getSnapshot/restart) to `DockModel`; build the feed with `yield* makeDiagnosticsFeed(...)` after `readSource(inputs.source)`; forward `configure`. Existing M10 test (c) ("configuring with every field identical notifies no store", `DockModel.test.ts` ~line 380) must keep passing: an inline `diagnostics` literal must not notify.

## Tests

### `test/model/DiagnosticsFeed.test.ts`

**Analog:** `test/model/DiagnosticsStore.test.ts` lines ~140-150:
```ts
const fiber = yield* start(makeDiagnosticsStore(), { collector });
assert.strictEqual(state.reads, 1);
yield* TestClock.adjust("1999 millis");
assert.strictEqual(state.reads, 1);
yield* TestClock.adjust("1 millis");
assert.strictEqual(state.reads, 2);
```
Style: `it.effect(...)` with `Effect.gen`, imports `assert, describe, it` from `@effect/vitest`, `import * as TestClock from "effect/testing/TestClock"`. Helper `scriptedCollector()` and `start(...)` are local to that file; if the feed test needs them, move them to `test/helpers.ts` rather than copying twice. A throwing source: `questions: () => { throw new Error("boom") }` (a defect in `Effect.sync(questionsThunk)`, which `runDiagnostics`'s doc says ends the run).

**Analog:** `test/model/DockModel.test.ts`: model built in the `it.effect` scope; a test that needs to end the scope mid-test makes its own (header lines ~13-16; imports `Scope`, `Exit`). Use that for the "close and rebuild" pin (D-06), and its test-title convention `M10 (a): ...`.

`settleTurns` (copy verbatim to `test/helpers.ts` from `packages/core/test/SharedComputation.test.ts:20-22`):
```ts
const settleTurns = Effect.gen(function* () {
  for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
});
```
(Export it; `helpers.ts` currently has no Effect import: add `import * as Effect from "effect/Effect"`.) Call it before each `TestClock.adjust` (D-05). Required cases: `Off` -> `Starting` -> `Live`; throwing source -> `Stopped { sampled }` for both from-`Starting` (false) and from-`Live` (true); last reading kept; restart by field change and by `restart()` (passes through `Starting`); interruption (restart, `undefined`, scope close) never `Stopped`; `undefined` and back; merge precedence and identity (`mergeReading` returns the sampled reading when nothing supplied).

### `test/react/useDiagnostics.test.tsx`, `useTimeline.test.tsx`

Existing: `useDiagnostics.test.tsx:14,33` imports `useDiagnostics, type DiagnosticsDockOptions` from `../../src/react/useDiagnostics.ts` and does `const diagnostics = useDiagnostics(options)`: update the destructuring to `{ status, reading }`; the "start on mount, stop on unmount, no restart on re-render" cases stay. `useTimeline.test.tsx` stays unchanged (D-15).

### `test/react/useSimulationSession.test.tsx:137-169` (Activity)

Copy the shape for a diagnostics rebuild test: `<Activity mode="visible"|"hidden">` around an owner that calls `useDockModel`, `view.rerender(...)` hidden then visible, assert `notStrictEqual(owned, first)` and the rebuilt model's `diagnostics` status is `Starting`.

### `test/surface.test.ts` (and `surface.tst.ts`)

`REACT_VALUES` at ~lines 69-76 is the sorted list of public React values; `DiagnosticsStatus` is a value if exported (it is a `Data.taggedEnum`). Decision for the plan: whether `DiagnosticsStatus` is public (needed by a standalone host that reads `useDiagnostics().status`; D-13 says it returns it, so a host must name the type: export it). That means a line in `REACT_VALUES` (value) and the `surface.tst.ts` type line, a named re-export in `react/index.ts` (the `devtools-named-barrel` rule refuses `export *`), and an `spec/overview.md` row.

## Shared Patterns

### House rules for every new `src` file
`import * as X from "effect/X"`, `.ts` relative extensions, `import type` for types, `Effect.fn("qadi.devtools....")(function* ...)` for effectful functions (not `fnUntraced`; `UNTRACED_BUDGET` fails otherwise), `Match.tagsExhaustive` instead of `switch` (`SWITCH_BUDGET`), no `as`/`!`/`any`, no `async`, no `console`, `Data.TaggedError` default (this phase adds no error class). Doc comment: one-line summary first, ADR citations after, no plan or `D-NN` ids.

### Package-private model (ADR-QD-099)
`src/model` files are not in `src/index.ts` unless listed; do not add `makeDiagnosticsFeed` to a barrel. `react/index.ts` names exports explicitly (current shape, lines 17-31): `export { useDiagnostics } from ...; export type { DiagnosticsDockOptions } from ...`. Change the `DiagnosticsDockOptions` source path to the model (`../model/DiagnosticsFeed.ts`) and add `DiagnosticsStatus`.

### Mutation (`stryker.devtools.mjs`)
`mutate: ["packages/devtools/src/model/**/*.ts"]` (line ~48): `model/DiagnosticsFeed.ts` and any `model/TimelineFeed.ts` are covered automatically; nothing to edit. `src/react/` is not mutated, so `DiagnosticsNotice.tsx` carries no mutation bar. Thresholds `break: 80`, `coverageAnalysis: "perTest"`, `ignoreStatic: true`. Phase 33's `33-mutation-base.json` is not an analog: it is `{ "measured": [], "unmeasured": {path: reason}, "new": [path] }` for `stryker.config.mjs` (core), and `33-mutation-after.json` is a flat `{ path: score }` map. For `34-mutation-base.json` run `stryker.devtools.mjs`, read `reports/mutation-devtools/mutation.json`, and write a flat `{ "packages/devtools/src/model/DockModel.ts": 100, "packages/devtools/src/model/DiagnosticsStore.ts": <score> }` map; list new files under `new`. Verify with the planner/gate script that reads these (not located here).

## Records, changeset, docs (phase 33 as the model)

Phase 33 commits to copy the shape of (`git show <sha> -- <path>`):
- `3e7a8b3e` (docs(33-04)): INV-QD-311/312 added, BEH-QD-501..505, an ADR amended, devtools-spec prose. Model for INV-QD-313..314, BEH-QD-506..510.
- `d8468f19` (docs(33-04)): ADR-QD-146. ADR-QD-147 stays Unused unless the amendment cannot carry it.
- `258c6e7a` (docs(33-05)): `spec/overview.md`, `spec/traceability.md` (BEH/INV rows plus four new test-file rows plus restated rows), `spec/README.md` register row CCR-QD-424 (line ~361 is the table row; CCR-QD-425 goes after it).
- `53b5f14a` (docs(33-05)): changesets and `upgrading.md`.

Header/revision shape: the ADR-QD-047 header table has `| Revision | 1.12 |` (line 8) and a `Change History` row starting at line 13 (`1.12 (2026-11-11): amendment — the dock is one model: ...`). The new row is `1.13 (2026-11-12): amendment — diagnostics are the dock model's seventh store ...` prepended, and Revision becomes 1.13. The ADR-QD-047 Change History row also begins `1.161 (2026-11-12): CCR-QD-424` in `spec/overview.md`/`traceability.md` style: those two files have their own `Change History` counters (overview 1.98 today, traceability 1.157): bump each by one. Note: those counters are a separate revision series per file.

Behaviors to restate (both in `spec/behaviors/28-devtools-screens.md`; its Change History is at line 13, current Revision row top is `1.17`, so the new row is `1.18`):
- **BEH-QD-465: The dock is one model** (heading at line 827). Its ts block lists `DockModelInputs` (4 fields) and `DockModel` (timeline, dock, explorer, roles, simulation, sightings, configure) and says six stores: add `diagnostics`/`reading` to the inputs and the `diagnostics` store to the model, "seven".
- **BEH-QD-323: Diagnostics are sampled by the model, and a sample that changed nothing changes nothing** (heading at line 572; ts block lists `runDiagnostics`, `makeDiagnosticsStore`, `DiagnosticsReading`, `mergeReading` and the two dock props). Restate for the feed and its status, and the `useDiagnostics` return.
- Other mentions to check: `spec/behaviors/28-devtools-screens.md:367` (links BEH-QD-323), `:773` (links BEH-QD-465), `spec/behaviors/09-react.md:664`, `spec/decisions/047-a-headless-devtools-model.md:154` (says `useDiagnostics` is the adapter), `:192` (names `react/useRunningStore.ts` as scaffolding: must be rewritten since the file is deleted), `spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md:86` (mentions `useRunningStore`; history, likely exempt, verify against gate rules), `spec/overview.md:905` (the `useDiagnostics`, `DiagnosticsDockOptions` row: "mounts `runDiagnostics` and reads its store" becomes the feed; add `DiagnosticsStatus`) and `:934` (entry-point table row), `spec/traceability.md:70, 327, 423` (the `dock-wiring` and `useDiagnostics.test.tsx` rows, new `DiagnosticsFeed.test.ts` row).
- Fences: TypeScript blocks in `spec/behaviors/*.md` marked ` ```ts ` are signature listings (not compiled); ` ```typescript ` ones compile (AGENTS.md §12). The BEH-QD-465 and BEH-QD-323 blocks above are `ts`, so no compile risk, but check any `typescript` fence naming `useDiagnostics` (grep found none in `spec/`).

Changeset shape (`.changeset/sealed-evaluation-environment-devtools.md`, 7 lines): frontmatter `"@qadi/devtools": minor`, then a paragraph that leads with `**Breaking.**` Name it e.g. `.changeset/diagnostics-feed.md`. Existing unrelated `.changeset/diagnostics-store.md` is history; do not edit. CHANGELOG files are not edited.

`apps/website/src/content/docs/docs/reference/upgrading.md`: sections are `## 0.12: <title>` (last heading at line 461 `## 0.12: one clock vocabulary, \`EvaluationClock\``), each with prose then "Before:" and "After:" fenced `ts` examples. Add `## 0.12: useDiagnostics returns { status, reading }` with the `Counters.tsx` shape as the Before/After (`const { hydration } = useDiagnostics(x)` becomes `const { reading } = useDiagnostics(x); reading.hydration`). Website devtools page: `apps/website/src/content/docs/docs/packages/devtools.md:190` ("React half of each (`useTimeline`, `useSimulationSession`, `useDiagnostics`)") and add the Starting/Stopped notice and restart. (`apps/website/dist/**` is build output: ignore.)

## Consumers broken by the `useDiagnostics` return-shape change

Full grep of `examples apps spec packages/*/src packages/*/test packages/*/README.md .changeset` (excluding CHANGELOG, node_modules, dist):

| Location | Hit | Action |
|---|---|---|
| `examples/nextjs-newsroom/src/client/Counters.tsx:12,34` | `const { hydration: activity } = useDiagnostics(sampling);` | `const { reading } = useDiagnostics(sampling); const activity = reading.hydration;` (line 8 doc mention fine) |
| `examples/nextjs-newsroom/test/dock-wiring.test.tsx:22,36` | `const diagnostics = useDiagnostics({ ...feed.diagnostics, intervalMillis: 20 });` | reads `.hydration`/etc. off the result: use `.reading` (read lines 36-60 to fix every access) |
| `packages/react/src/DevtoolsFeed.ts:100` | doc only: "`useDiagnostics` keys its run on field identity" | reword if the claim moves to the feed; no code change |
| `packages/devtools/src/react/DevtoolsDock.tsx:36,153` | the dock's own use | removed (see above) |
| `packages/devtools/src/react/index.ts:13,21,22` | barrel | edit |
| `packages/devtools/test/react/useDiagnostics.test.tsx:14,33,42` | own test | update |
| `packages/devtools/test/surface.test.ts:71` | `"useDiagnostics"` in `REACT_VALUES` | stays; add `"DiagnosticsStatus"` if public |
| `packages/devtools/test/model/DiagnosticsStore.test.ts:6` | comment only | none |
| `packages/devtools/README.md:31` | prose list | add the seventh store note if the README lists stores |
| `apps/website/src/content/docs/docs/packages/devtools.md:190`; `.../reference/upgrading.md:181` | prose naming the hook (181 is an older 0.12 section listing exports; history, leave) | devtools.md: edit; upgrading.md:181: leave |
| `spec/overview.md:905,934`; `spec/traceability.md:327,423`; `spec/README.md:381` | register/rows | edit overview and traceability; README:381 is CCR-QD-200 history, leave |
| `spec/decisions/047-...md:154,192`, `137-...md:86` | prose | 047: edit; 137: history, verify |
| `useRunningStore` mentions | `useDockSession.ts:11,15`; `useExplorerSession.ts:12,16,20`; `useTimeline.ts:20,52`; `useScoped.ts:44` (comment: "as `useRunningStore.ts` says of its `run`", must be reworded); `047:192`; `137:86` | all removed or reworded |

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Exit-observing fork (status `Stopped`) inside `DiagnosticsFeed.ts` | model | event-driven | No existing code converts a forked fiber's defect exit into store state; use RESEARCH.md's pattern and `Cause.hasInterruptsOnly`/`Exit.isFailure` from `effect` v4 (confirm names against `node_modules/effect`, AGENTS.md says it is a checkout). |
| `role="alert"` / `role="status"` markup, `announced` ref | component | request-response | None exist in `packages/devtools/src/react`; follow UI-SPEC 217-291. |

## Metadata

**Analog search scope:** `packages/devtools/{src,test}`, `packages/core/test/SharedComputation.test.ts`, `examples/nextjs-newsroom`, `apps/website/src/content`, `spec/`, `.changeset/`, `.planning/phases/33-*`, `stryker.devtools.mjs`.
**Pattern extraction date:** 2026-11-12
**Not verified:** exact line numbers marked `~`; UI-SPEC was read by grep only (lines cited), not end to end; `RESEARCH.md` was not read by this pass; the `33-mutation-base.json` consumer script was not located.

# Phase 72: A derived store behind the dock model's stores - Pattern Map

**Mapped:** 2026-11-22
**Files analyzed:** 14 (all paths relative to repo root)
**Analogs found:** 13 / 14 (spec-vs-code list test has no exact analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/devtools/src/model/ExternalStore.ts` (add `ReadableStore`, `DerivedStore`, `makeDerivedStore`, `sameFields`) | store/service | event-driven (parent notify -> recompute) | itself (`makeExternalStore`, `sameElements`) + `GatesFeed.ts:128` (scoped ctor) | exact |
| `packages/devtools/src/model/DockModel.ts` | model | event-driven | itself (`:206-288`, `:325`) | exact |
| `packages/devtools/src/react/ServicesPanel.tsx:21,36`, `QuestionsPanel.tsx:30,61`, `useStoreSnapshot.ts:10,13` | component/hook | type-only rename | n/a | exact |
| `packages/devtools/test/model/ExternalStore.test.ts` | test | event-driven | itself (`describe("makeExternalStore")`) | exact |
| `packages/devtools/test/model/ExternalStore.tst.ts` (new, D-03 pin) | type test | n/a | `test/model/DiagnosticsStore.tst.ts` | exact |
| `packages/devtools/test/model/DockModel.test.ts` (trim + store-list test) | test | event-driven | itself (M36 `:1099`, `heardOf` `:1495`) | exact |
| `packages/devtools/test/model/DockModel.characterisation.test.ts` (new) | test | characterisation | `test/react/QuestionsPanel.characterisation.test.tsx` | role-match |
| `72-mutation.mjs` | script | batch | `.planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-mutation.mjs` | exact |
| `spec/decisions/185-*.md` | ADR | doc | `spec/decisions/184-*.md` | exact |
| `spec/behaviors/28-devtools-screens.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md` | spec | doc | Phase 71 edits, via `scripts/spec-revise.mjs` | exact |
| BEH-QD-700 store-list test | test | pin object keys | none in `packages/*/test` | no analog |

## Pattern Assignments

### `ExternalStore.ts` additions

**Scoped constructor analog** `packages/devtools/src/model/GatesFeed.ts:127-141` (same shape in `DiagnosticsFeed.ts:139-141`, `SupersedingRun.ts:76`):
```ts
/** Builds the feed in the caller's scope; closing it releases the subscription and interrupts the cadence. */
export const makeGatesFeed = Effect.fn("qadi.devtools.makeGatesFeed")(function* (
  init?: GatesFeedInputs,
): Effect.fn.Return<GatesFeed, never, Scope.Scope> {
  ...
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => { const held = release; release = () => {}; try { held(); } catch { /* nowhere to state it */ } }),
  );
```
Imports there: `import * as Effect from "effect/Effect"; import type * as Scope from "effect/Scope";`. Return type is written as `Effect.fn.Return<X, never, Scope.Scope>`. Generic `Effect.fn` precedent (from CONTEXT): `Handover.ts:110`, `CircuitBreaker.ts:487`, `EncodeRefusalReport.ts:25`. Registering the unsubscribe-from-parents finalizer: note finalizers on close run in reverse registration order.

**Base to build on** `ExternalStore.ts:43-79`: `makeExternalStore` holds `notify` (the ADR-QD-177 loop, `:47-59`) and `set` (`:69-73`, `if (next === current) return;`). Derived = `makeExternalStore(compute(key()))` underneath, parents subscribed with a refresh, `set(value)` after committing the key. Header doc (`:1-28`) says out of barrel; keep. Doc comment for the derived store must point at `:19-27` rather than restate it.

**sameFields analog (typed `for…in`, no cast)** `packages/core/src/SinkCodec.ts:197`:
```ts
const omitUndefined = <A extends object>(fresh: A): A => {
  for (const key in fresh) {
    if (fresh[key] === undefined) delete fresh[key];
  }
```
`for…in` over `A extends object` types `key` as `Extract<keyof A, string>`. No `Required<`/`Record<string, unknown>` helper exists in `packages/*/src` (grep for `Required<` found nothing), so D-03's `K extends object & Required<K>` has no codebase precedent; the type pin is its only evidence. Place `sameFields` beside `sameElements` (`ExternalStore.ts:88-89`, identity per element, doc says why identity not deep).

### `DockModel.ts` (the code to replace, HEAD)

- Header `:1-2`, `:25-36` (store count) -> points at BEH-QD-700.
- `JoinKey` `:145-149`, `joinInputOf` `:157-166` stay (compute side).
- `shownReading` `:206-220`: `let fed`, `let supplied`, `mergedOf` (inside `makeDockModel`; hoist to module scope), `remerge` with `next === fed && inputs.reading === supplied`, `diagnosticsFeed.subscribe(remerge)`. Becomes parents `[diagnosticsFeed]`, key `{ fed: diagnosticsFeed.getSnapshot(), supplied: inputs.reading }`.
- `questions` `:230-253` (`let closed`, `keyNow`, `lastJoin`, `rejoin`); key reader body = `keyNow` (`feed: gatesFeed.getSnapshot(), supplied: inputs.reading?.questions, unsampled: suppliedNow === undefined && isUnsampled(shownReading.getSnapshot().status)`). Parents `[gatesFeed, shownReading]`.
- `services` `:255-279`: `servicesKeyNow(): ServicesInput` reads `{wiring, activity, portCalls, unsampled: isUnsampled(status)}` from `shownReading.getSnapshot()`; compute `portCards`. Parents `[shownReading]`.
- Wiring `:280-288` (3 subscribes, `closed` finalizer) deleted. Build order shownReading, questions, services keeps listener order `[questions, services]`.
- `configure` `:316-325`: the comment names `remerge`; replace with `shownReading.refresh()`, after `gatesFeed.configure` and `diagnosticsFeed.configure`. `inputs = next` at `:308` precedes feeds (why `key` is a thunk).
- Return object `:290-310` builds `{ subscribe, getSnapshot }` pairs by hand for `questions`/`services`; the derived store can be returned directly (it is a `ReadableStore`) or keep the pair so `refresh` is not exposed: keep the pair.
- Type sites `:111,113`: `Pick<ExternalStore<QuestionsSnapshot>, "subscribe" | "getSnapshot">` -> `ReadableStore<QuestionsSnapshot>`; import line `:58` `{ makeExternalStore, type ExternalStore }` changes.
- Timeline fan-out `:179-202` (`let shown`/`let rail`/`spread`) untouched.

### Rename sites for `ReadableStore<A>` (type-only), exact
`DockModel.ts:111,113`; `react/ServicesPanel.tsx:21,36`; `react/QuestionsPanel.tsx:30,61`; `react/useStoreSnapshot.ts:10,13`. `makeExternalStore` users (unchanged): `TimelineFeed`, `SimulationSession`, `ExplorerSession`, `DiagnosticsFeed`, `DockSession`, `DiagnosticsStore`, `HeldChoice` (also `sameElements`), `GatesFeed`, `TimelineStore`. Close grep: `/usr/bin/grep -rn "Pick<ExternalStore<" packages/devtools` empty.

### Tests

**`ExternalStore.test.ts`** (266 lines): imports `assert, describe, it` from `@effect/vitest`, `thrownBy` from `../helpers.ts`; one `describe("makeExternalStore")` of plain `it(...)` with titles that describe the input and expected result (`"calls every later listener when an earlier one throws"` `:59`, `"rethrows two thrown values as one AggregateError holding both in call order, with the fixed message"` `:71`, `"decides by how many threw, not by what"` `:109`). Copy the listener-throw cases at `:59-123` for the derived store's "every listener runs, rethrow one value or an AggregateError". New `describe("makeDerivedStore")` uses `it.effect` with `Effect.gen`; to test close, make a scope as `DockModel.test.ts:1099` does:
```ts
const scope = yield* Scope.make();
const model = yield* Scope.provide(makeDockModel({...}), scope);
yield* Scope.close(scope, Exit.void);
```

**`DockModel.test.ts`** (1639 lines): header `:1-18` states the eight/nine stores (reword stale count, history exempt); titles carry local ids (`M36: ...`; keep existing, new ones carry none). `heardOf` `:1495-1500` is the per-store listener counter:
```ts
const heardOf = (model: DockModel) => {
  const heard = { calls: 0 };
  model.services.subscribe(() => { heard.calls += 1; });
  return heard;
};
```
M36 comment at `:1107` "a changed reading that reaches `rejoin` through the diagnostics store" is reworded, expected values untouched. `helpers.ts`: `settleTurns` `:174`, `thrownBy` `:179`; doubles `gateRegistryDouble.ts:55`, `collectorDouble.ts:19`.

**Characterisation file**: copy header style of `test/react/QuestionsPanel.characterisation.test.tsx:1-11` (what it pins, why needed, "written on the phase base", whole-value comparison). D-10 says no phase-relative wording, so keep the "what it pins and why" and drop the "written on the phase base" sentence. Sibling: `ServicesPanel.characterisation.test.tsx`.

**Type pin `ExternalStore.tst.ts`**: copy `test/model/DiagnosticsStore.tst.ts:1-50`: `import { expect, test } from "tstyche"`, a local `type Params<F> = F extends (...args: infer A) => unknown ? (...args: A) => void : never;` (with its doc comment on `floatingEffect`), `declare` fixtures, then a positive test ("a valid call passes the parameter check, so the refusals below can fail") followed by negative pins via `expect<Params<typeof makeDerivedStore>>().type.not.toBeCallableWith(...)`. Any negative `toBeCallableWith` pin means: add a row to AGENTS.md section 6's table and `NOT_CALLABLE_PIN_BUDGET` in `scripts/check-house-style.mjs` together (`[not-callable-control]` needs the same-subject positive twin; no `.skip/.only`). Alternative `// @ts-expect-error` avoids the budget. The `Required<K>` guard also affects `ExternalStore.tst.ts` only (tstyche files are selected by `tstyche --listFiles`).

**Store-list test (D-13)**: no analog reads a behavior doc in `packages/*/test`; only comments mention `spec/behaviors` (`http.test.ts:610`, `facade.test.ts:341`); `scripts/check-house-style.mjs` is the gate that does read spec. Fall back to the in-test list: build a model, `Object.keys(model).filter(k => has subscribe and getSnapshot)`, assert the sorted exact array. Note `diagnostics`, `timelineStatus`, `timeline`, `roles`, `simulation`, `explorer`, `dock`, `questions`, `services` have the pair; `sightings`, `configure` do not. Avoid `as`: use `Object.entries` plus `typeof value.subscribe === "function"` via `Predicate.hasProperty`.

### `72-mutation.mjs`
Copy `71-mutation.mjs` (366 lines). Change: `D` path (`:21`), `GROUPS` (`:23-29`) to two groups:
```js
const M = "packages/devtools/src/model/";
const GROUPS = {
  model: { config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json", files: [`${M}DockModel.ts`] },
  store: { config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json", files: [`${M}ExternalStore.ts`] },
};
```
`invocation` (`:30`) already builds `pnpm exec stryker run <config> --mutate <files>`. Keep `dirtyReasons`, `hunks`, `mapLine`, `tally`, `judge`, `heldFor` (`--restart` only on close), `EXAMINED` (`:76`, start empty), `selfTest` (`:243`), `MODES` (`:346`), and the `usage` string (`:351`, update group names). `stryker.devtools.mjs`: `mutate: ["packages/devtools/src/model/**/*.ts"]` (`:47`, narrowed by `--mutate`), `ignoreStatic: true` (`:45`), report `reports/mutation-devtools/mutation.json` (`:41`), vitest `packages/devtools/vitest.config.ts`.

### Spec records
- ADR shape: `spec/decisions/184-*.md` sections `## Context`, `## Decision`, `## Alternatives considered`, `## Consequences` (split "What the compiler refuses, each with a type pin ..." / "What it does not, and what pins each instead"), `## Related`; header is a Document Control blockquote (ID `QADI-ADR-185`, Revision, Effective Date 2026-11-22, Status "Accepted - extends ADR-QD-168 ...").
- CCR: Phase 71 added `CCR-QD-463` row and `spec/README.md` Change History entries ("1.286 (2026-11-22): CCR-QD-463 (ARCH-118)" then one entry per later revision citing it). Use `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-22`; never `next-id.mjs`.
- Behaviors: add BEH-QD-696..700 in `spec/behaviors/28-devtools-screens.md` (BEH-QD-465 `:934`, BEH-QD-615 `:2270`, BEH-QD-616 `:2298`, BEH-QD-656 `:2621`); INV-QD-389/390 in `spec/invariants.md` (store-count text `:4160`, INV-QD-357 `:4182`); `spec/traceability.md` rows `:158,187,189,573`.
- Changeset: devtools changesets exist (e.g. `.changeset/devtools-capacity-change-reads.md`: `"@qadi/devtools": patch` + one paragraph), but D-15 says none; the CCR row states why (no export change, D-07 unreachable through `DevtoolsDock`).

## Shared Patterns

- Imports: `import * as Effect from "effect/Effect"`, `import type * as Scope from "effect/Scope"`, relative `.ts` extensions, `import type` for types (AGENTS.md section 1).
- `Effect.fn("qadi.devtools.<name>")(function* ... ): Effect.fn.Return<T, never, Scope.Scope>` for every scoped constructor; `Effect.addFinalizer(() => Effect.sync(...))` for cleanup.
- No `as`, `!`, `any`, `switch`, `Record<string, unknown>`; ~90-column hand wrapping; doc comments one-line summary first.
- Mutation: nothing static newly hoisted in `DockModel.ts` (Ignored mutants fail the scorer).

## No Analog Found

| File | Role | Reason |
|---|---|---|
| store-list test against BEH-QD-700 | test | no test reads a spec doc; use an in-test exact list |
| `K extends object & Required<K>` constraint | type | no `Required<` in `packages/*/src`; only the tstyche pin proves it |

## Metadata

**Search scope:** `packages/devtools/src,test`, `packages/core/src`, `stryker.devtools.mjs`, Phase 71 dir, `spec/decisions`, `.changeset`
**Pattern extraction date:** 2026-11-22

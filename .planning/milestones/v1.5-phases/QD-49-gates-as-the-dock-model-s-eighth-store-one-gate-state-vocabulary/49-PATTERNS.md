# Phase 49: Gates as the dock model's eighth store, one gate-state vocabulary - Pattern Map

**Mapped:** 2026-11-16
**Files analyzed:** 27 (new and modified)
**Analogs found:** 27 / 27 (all analogs are git-tracked; no mirror paths)

Line numbers are the phase base's (`packages/*/src` unchanged since Phase 48). RESEARCH.md Code Examples 1-5 are the compiled designs; this file points each file at its real analog and gives the excerpts to copy.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/GateState.ts` (new) | config/vocabulary table | transform | `packages/core/src/HydrationMetrics.ts` :82-110, :214, :268-281 | exact |
| `packages/core/src/index.ts` | barrel | n/a | its own `export *` lines (alphabetical) | exact |
| `packages/core/test/GateState.test.ts` (new) | test | transform | `packages/core/test/HydrationMetrics.test.ts` | role-match |
| `packages/core/test/GateState.tst.ts` (new) | type test | transform | `packages/core/test/HydrationMetrics.tst.ts` | exact |
| `packages/react/src/GateWriter.ts` | model/type | transform | its own :55 (`DecisionOutcome["_tag"]`) -> `GateState`; derivation analog `HydrationDropReasonOf` use in react | exact |
| `packages/react/src/DevtoolsFeed.ts` | hook/feed | request-response | itself (:84, :115) | exact |
| `packages/react/test/DecisionOutcome.tst.ts` | type test | transform | itself :40-41 | exact |
| `packages/react/test/DevtoolsFeed.test.tsx` | test | request-response | itself :176, :188 | exact |
| `packages/devtools/src/model/Gates.ts` | model/service | transform | itself (:70-114) + `HydrationMetrics` derivation | exact |
| `packages/devtools/src/model/DockModel.ts` | model (store host) | event-driven | itself: `diagnostics` store :125-145, `configure` :149-161 | exact |
| `packages/devtools/src/react/useDockModel.ts` | hook | event-driven | itself | exact |
| `packages/devtools/src/react/DevtoolsDock.tsx` | component | request-response | itself :101-124, :140, :160, :336-344 | exact |
| `packages/devtools/src/react/QuestionsPanel.tsx` | component | request-response | `ServicesPanel.tsx` (post Phase 47) reading a store; `useStoreSnapshot.ts` | role-match |
| `packages/devtools/src/index.ts` | barrel | n/a | its line 46 `export type {...}` | exact |
| `packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx` (new, FIRST commit) | test | request-response | `packages/devtools/test/react/ServicesPanel.reading.test.tsx` | exact |
| `packages/devtools/test/react/QuestionsPanel.gates.test.tsx`, `QuestionsPanel.test.tsx`, `VerdictTreatment.test.tsx`, `DevtoolsDock.test.tsx`, `DiagnosticsScreens.test.tsx` | test | request-response | themselves (harness change only) | exact |
| `packages/devtools/test/model/DockModel.test.ts` | test | event-driven | itself (M-cases, `it.effect`, `flush`) | exact |
| `packages/devtools/test/model/Gates.test.ts` | test | transform | itself :220-235 | exact |
| `packages/devtools/test/surface.tst.ts` | type test | n/a | itself :36-50, :134 | exact |
| `.changeset/gate-states-stated-once.md`, `react-devtools-feed-gates-is-registry.md`, `devtools-gates-is-a-registry.md` (new) | changeset | n/a | `.changeset/audit-refusal-is-cores.md`, `hydration-drop-reasons-stated-once.md` | exact |
| `spec/decisions/162-*.md`, `index.yaml`, `spec/README.md` CCR-QD-440, `behaviors/28-devtools-screens.md`, `invariants.md`, `traceability.md`, `overview.md` | spec record | n/a | `spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md`, CCR-QD-439 row | exact |
| `apps/website/.../reference/upgrading.md` | docs | n/a | the `## 0.13:` entries at :794, :829 | exact |
| `examples/nextjs-newsroom/src/client/Dock.tsx` | example call site | n/a | itself :117, :163 (spread of `feed` keeps compiling under D-18) | exact |
| website `devtools.md`, `react/hooks.md`; `packages/devtools/README.md`, `packages/react/README.md` | docs | n/a | themselves | exact |
| `.planning/phases/QD-49-*/49-mutation-base.json`, `49-mutation-after.json` | evidence | batch | `.planning/phases/QD-48-*/48-mutation-base.json`, `48-mutation-after.json` | exact |

## Pattern Assignments

### `packages/core/src/GateState.ts` (vocabulary table, transform)

**Analog:** `packages/core/src/HydrationMetrics.ts` (table :82, type :214, guard and list :268-281).

Copy the shape: a module-private table declared `as const satisfies`, type read off its keys, own-key guard, ordered list built with `.filter(guard)` and no cast, declared after the guard.

```typescript
// HydrationMetrics.ts:214, 268-281
export type HydrationDropReason = keyof typeof HYDRATION_DROP_TABLE;

export const isHydrationDropReason = (word: string): word is HydrationDropReason =>
  Object.hasOwn(HYDRATION_DROP_TABLE, word);

export const hydrationDropReasons: ReadonlyArray<HydrationDropReason> = Object.keys(
  HYDRATION_DROP_TABLE,
).filter(isHydrationDropReason);
```

Apply as RESEARCH Pattern 1 (empty `GateStateRow`, order Failed, Denied, Rechecking, Pending, Allowed). Doc comments: one-line summary first, the why after (AGENTS.md header rule); say why rows are empty (D-02), why `gateStates` follows the guard (HydrationMetrics.ts:274-278 note), and that the order is worst-news-first. Imports: none (no `effect` needed). Barrel: add `export * from "./GateState.ts";` alphabetically in `packages/core/src/index.ts` (RESEARCH says near :23-24).

### `packages/core/test/GateState.test.ts` and `GateState.tst.ts` (new)

**Analog:** `packages/core/test/HydrationMetrics.test.ts` (header comment, `assert, describe, it` from `@effect/vitest`, relative `.ts` imports) and `HydrationMetrics.tst.ts`.

```typescript
// HydrationMetrics.tst.ts:12-22, 33-36 (tstyche)
import { expect, test } from "tstyche";
import { hydrationDropMeaning, isHydrationDropReason } from "../src/HydrationMetrics.ts";
test("isHydrationDropReason narrows a string to the union", () => {
  expect(isHydrationDropReason).type.toBe<(word: string) => word is HydrationDropReason>();
});
test("each reason union, written out", () => {
  expect<HydrationDropReason>().type.toBe< | "ForeignSubject" | ... >();
});
```

Write the five-word union out by hand, pin `isGateState`'s signature, pin `gateStates` as `ReadonlyArray<GateState>`. Runtime test: words, order, `isGateState("toString")` and `"__proto__"` false.

### `packages/react/src/GateWriter.ts`, `DecisionOutcome.tst.ts`

Change `GateWriter.ts:55` `export type GateRenderState = DecisionOutcome["_tag"];` to `export type GateRenderState = GateState;` with `import type { GateState } from "@qadi/core";` (named import from the package root, AGENTS.md §1). Rewrite the doc paragraph at :44-54 ("Derived from DecisionOutcome's tag ... a sixth outcome is a sixth state").

Pin to update, `packages/react/test/DecisionOutcome.tst.ts:40-41`, plus add the reverse:

```typescript
test("a gate's render state is the outcome's tag, not a restatement of it", () => {
  expect<GateRenderState>().type.toBe<DecisionOutcome["_tag"]>();
});
```

becomes two assertions: `GateRenderState` is `GateState`, and `DecisionOutcome["_tag"]` is `GateState` (both ways; a sixth in either place fails to compile). Keep the five-literal pin at :34-38.

### `packages/react/src/DevtoolsFeed.ts` (D-18)

**Analog:** itself. Change `:84` `readonly gates: ReadonlyArray<GateInstance>;` to `GateRegistry`, and in `useDevtoolsFeed` (:115) replace `const gates = useGateInstances();` with taking the registry from the context already read on :114:

```typescript
const { atoms, registry } = useQadiContext("useDevtoolsFeed");
const gates = useGateInstances();   // -> drop; read `gates` from the same context (QadiProvider.tsx:62, effective registry = gatesProp ?? atoms.gates, :196)
```

RESEARCH Q7 probed this (Option A): `useQadiContext` exposes `gates`. The two feed assertions at `packages/react/test/DevtoolsFeed.test.tsx:176` (`.gates).toHaveLength(1)`) and `:188` (`.gates).toEqual([])`) change to `gates.instances()` reads; nothing else in react's suite changes.

### `packages/devtools/src/model/Gates.ts`

**Analog:** itself, lines 77-114. Replace the private `GateRenderState` union with core's, keep `GATE_DISPLAY` private.

```typescript
// current :77-114 -> after (RESEARCH Code Example 1)
import { gateStates, isGateState } from "@qadi/core";
import type { GateState, Policy, Resource } from "@qadi/core";

const GATE_DISPLAY: { readonly [K in GateState]: DisplayState } = { Failed: "Error", Denied: "Deny", Rechecking: "Rechecking", Pending: "Pending", Allowed: "Allow" };
export const GATE_STATES: ReadonlyArray<string> = gateStates;
export const displayOfGateState = (state: string): DisplayState =>
  isGateState(state) ? GATE_DISPLAY[state] : "Unrecognised";
```

Add `GateRegistryLike`, `QuestionRow`, `GatesView`, `QuestionsView`, `QuestionsSnapshot`, `JoinInput`, `joinQuestions` (RESEARCH Code Example 2). View unions are `Data.TaggedEnum`-style closed unions, matched with `Match.tagsExhaustive` (AGENTS.md §5a). Mirror `GateInstanceLike`'s doc style (:54-69) for `GateRegistryLike`: structural, not imported from react, ADR-QD-053/080. Update the comment at :52 ("A host passes `useGateInstances()`..."). `gateGroups` stays unexported from the barrel (D-07, `surface.tst.ts:134`).

### `packages/devtools/src/model/DockModel.ts` (eighth store, event-driven)

**Analog:** itself: the `diagnostics` store (inputs :52-62, store build :125-145, return :147+, `configure` :149-161) and the scope-owned subscription idiom of `makeTimelineFeed` / `makeDiagnosticsFeed` (ADR-QD-137).

Store build and dispatch idiom to copy:

```typescript
// DockModel.ts:125-145 (diagnostics) and :158-160 (configure)
const shownReading = makeExternalStore<DiagnosticsSnapshot>(mergedOf(fed, supplied));
const remerge = () => {
  const next = diagnosticsFeed.getSnapshot();
  if (next === fed && inputs.reading === supplied) return;
  fed = next; supplied = inputs.reading;
  shownReading.set(mergedOf(fed, supplied));
};
diagnosticsFeed.subscribe(remerge);
...
diagnosticsFeed.configure(next.diagnostics);
remerge();
```

Add to `DockModelInputs`: `readonly gates?: GateRegistryLike | undefined;` with the identity-compared doc. Add `readonly questions: ExternalStore-like readout` to `DockModel` (expose only `subscribe`/`getSnapshot`, as `diagnostics` does). Build per RESEARCH Code Example 3 (`joinKeyNow`, three-reference guard, `watchGates`, finalizer via `Effect.addFinalizer(() => Effect.sync(...))`, `configure` swaps the subscription only when `next.gates !== gatesNow`, then `rejoin()`). `isUnsampled` is already used by the panel (`QuestionsPanel.tsx`, `diagnostics.status`); import it from where the panel gets it. Fix the header recount (:2, :20-24): seven stores plus `questions` as the eighth, `sightings` a thunk (D-11, D-19). No `as`/`!`, no `Effect.orDie`.

Pitfalls to honour (RESEARCH 2, 3, 5, 6): never reuse a stale instances list on a poll publish; snapshot `instances` is the registry's reference, not a copy; subscribe inside the scope, not at render.

### `packages/devtools/src/react/useDockModel.ts`

**Analog:** itself. Add `readonly gates?: GateRegistryLike | undefined;` to `UseDockModelInput`, destructure it, and pass it in both places the other inputs go (the `makeDockModel({...})` call and the `configure({...})` call and its dependency array):

```typescript
const model = useScoped(() => makeDockModel({ source, capacity, catalogue, ports, diagnostics, reading }));
useLayoutEffect(() => {
  if (model !== undefined) model.configure({ source, capacity, catalogue, ports, diagnostics, reading });
}, [model, source, capacity, catalogue, ports, diagnostics, reading]);
```

Update the header sentence that lists the inputs.

### `packages/devtools/src/react/DevtoolsDock.tsx`

**Analog:** itself. Edits: the `gates` prop (:119-124) becomes `readonly gates?: GateRegistryLike;` with a rewritten doc ("usually `atoms.gates`"); the `diagnostics` doc :101-102 ("Gates are not in it ... stay the plain `gates` prop") is corrected; `HostProps` (:140) loses `gates`; `useDockModel` call (:160) gains `gates: props.gates`; the QuestionsPanel wiring (:336-344) drops `gates={props.host.gates}`:

```tsx
questions: () => (
  <QuestionsPanel
    questions={props.shown.questions}
    gates={props.host.gates}   // removed: panel reads props.model.questions
    hydration={props.shown.hydration}
    onInvalidate={props.host.onInvalidate}
    diagnostics={notice}
  />
),
```

The panel now needs the model's `questions` store (pass `store={props.model.questions}` or the model) and no longer takes `questions` from `shown` (confirm in the plan whether `props.shown.questions` stays for other screens).

### `packages/devtools/src/react/QuestionsPanel.tsx`

**Analog for reading a model store:** `packages/devtools/src/react/ServicesPanel.tsx` (Phase 47) and `useStoreSnapshot.ts`:

```typescript
export const useStoreSnapshot = <A>(store: Pick<ExternalStore<A>, "subscribe" | "getSnapshot">): A =>
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
```

The panel reads one `QuestionsSnapshot` through it. Remove `gateGroups`/`instancesAsking` (:96-97, :169) and the `useMemo`s; the lens reads `snapshot.instances` (`useLens(instances)`, same reference as the registry's). Dispatch the three gate views and question views with hoisted `Match.type<...>().pipe(Match.tagsExhaustive({...}))` (RESEARCH Code Example 4; AGENTS.md §5a, no `switch`). Keep every string and testid byte-identical (UI-SPEC) except D-12a:

```tsx
// current :114-122 absent/empty message
{gates === undefined
  ? "No live guards were handed to the dock. Pass gates — usually useGateInstances(), or atoms.gates.instances() — to list who is asking."
  : "No guard is registered. Pass instrument to QadiProvider to let them say that they exist."}
```

D-12a replaces only the first sentence's advice with `Pass gates — usually atoms.gates, from @qadi/react — to list who is asking.` (take the exact string from UI-SPEC). Pitfall 4: the style constant `row` (:73) is shadowed by a prop named `row`; name the row prop differently. `QuestionsPanel` is not exported from the barrel, so its props are package-private.

### `packages/devtools/src/index.ts`

Add `GateRegistryLike` to line 46: `export type { AskedQuestionLike, GateInstanceLike } from "./model/Gates.ts";` (named, per-module, `devtools-named-barrel` rule). Add it to the import list in `packages/devtools/test/surface.tst.ts` (:36-50, beside `GateInstanceLike`), and keep the `@ts-expect-error` `gateGroups` pin at :134.

### `packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx` (new; first commit, before any `packages/*/src` edit)

**Analog:** `packages/devtools/test/react/ServicesPanel.reading.test.tsx`. Copy its header intent, imports and `liveNotice` use:

```tsx
import { assert, describe, it } from "@effect/vitest";
import { render, screen, within } from "@testing-library/react";
import { liveNotice } from "../helpers.ts";
// header: "Written on the phase base ... needed because X.tsx is outside the devtools mutation glob ... Every reading is compared whole, never by substring, and this file names nothing the base lacks, so it stays unchanged through the move."
```

It renders the public `QuestionsPanel` with the current `gates` array prop on the base, so the golden comes from the base code, not the code under change (Pitfall 1). Because the prop changes in plan 2, Pitfall 8 applies: route the input through one `gatesProp(...)` helper (RESEARCH Code Example 5) so the cell list never changes and only the helper does. Cells: absent and empty gates; one row per guard; Deny vs Failure; asked but unmounted; unknown state shown as `Unrecognised` (with `"toString"`, see `Gates.test.ts:220-235`). Existing `QuestionsPanel.gates.test.tsx` builds `gate({id, ...})` and markers like this:

```tsx
const gate = (fields: Partial<GateInstanceLike> & { readonly id: string }): GateInstanceLike =>
  ({ kind: "Can", policy: canRead, state: "Allowed", ...fields });
```

The one D-12a assertion is `QuestionsPanel.gates.test.tsx:44-49` (`assert.include(... "useGateInstances()")`), updated in the same commit as the copy edit.

### `packages/devtools/test/model/DockModel.test.ts` (headless join property, M30-M32, P2)

**Analog:** itself: `it.effect("M..: ...")` cases with a stable label, `makeDockModel` in the provided scope, and `const flush = Effect.andThen(Effect.yieldNow, TestClock.adjust("10 millis"));` (:104). Imports already present: `FastCheck`, `TestClock`, `Scope`, `Exit`. Also check `DiagnosticsFeed.test.ts` for the fast-check idiom. Add a registry double (`{subscribe, instances}` with a mutable list and a listener set), then:
- P2: interleave registry changes and poll ticks under `TestClock`; every snapshot's rows equal an independently computed join from one moment.
- Cases that kill the nine survivors in RESEARCH Q8 (quiet tick keeps reference; `Unsampled` vs `Absent`; `configure` after scope close subscribes nothing; registry swap vs unchanged; `configure` of only `gates` re-joins at once).
Update the stale header (:4-6 "eight readouts").

### Mutation base and after JSON (WX-05)

**Analog:** `.planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-mutation-base.json` and `48-mutation-after.json`; follow the 48-01 and 48-08 plans for how they are recorded and compared per file. Commands (RESEARCH Q8):
`pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/DockModel.ts,packages/devtools/src/model/Gates.ts'` (base 100.00 / 100.00), `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/GateWriter.ts'` (97.96, one pre-existing survivor at :178). `GateState.ts` recorded as `new` (static, 0 mutants); `QuestionsPanel.tsx` and `DevtoolsDock.tsx` recorded as not instrumentable.

### Changesets

**Analog:** `.changeset/audit-refusal-is-cores.md` (frontmatter, bold **Breaking.** lead, behaviour unchanged line, closing line `See the 0.13 section of the upgrade guide, \`/docs/reference/upgrading/\`.`) and `.changeset/hydration-drop-reasons-stated-once.md` for the core minor. Three files: core minor (three exports), react minor **Breaking** (`DevtoolsFeed.gates` is the registry; supersedes D-17's patch), devtools minor **Breaking** (`gates` prop type, `GateRegistryLike` exported).

### Spec records

**Analog:** ADR `spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md` (title, Document Control blockquote, Context, Decision numbered, Consequences with a bold **Breaking** line, Related) and its `spec/decisions/index.yaml` entry (:493-497):

```yaml
  - id: "ADR-QD-161"
    file: "161-audit-reports-cores-refusal-and-decides-lost-once.md"
    title: "..."
    status: "Accepted — amends ADR-QD-056, ADR-QD-095"
```

New: ADR-QD-162 (amends ADR-QD-047 store set, applies ADR-QD-152, keeps ADR-QD-053/080; cite ADR-QD-137; names D-12a and the recount, D-19). Lineage ADR files: `spec/decisions/047-a-headless-devtools-model.md`, `137-a-devtools-session-owns-its-runs-through-a-scope.md`. CCR-QD-440 row after `spec/README.md:376` (CCR-QD-439). BEH-QD-581..585 in `spec/behaviors/28-devtools-screens.md` (BEH-QD-506 is the model of this shape); INV-QD-343/344 after INV-QD-342 in `spec/invariants.md` (template INV-QD-314 at :3726-3745); `spec/traceability.md` rows (§1 :39, §2 :78, §3 beside :329, §4 :332-; extend existing :493 `DockModel.test.ts` row). Revise every touched document with `node scripts/spec-revise.mjs <doc> "<change>"`; reserve ids with `scripts/next-id.mjs` (no placeholders). `spec/overview.md` rows for `GateState`, `isGateState`, `gateStates` (model on the `HydrationMetrics.ts` rows :323-325), plus lines :585 and :901.

### Upgrade entry, docs, example

**Analog:** the last `## 0.13:` entries in `apps/website/src/content/docs/docs/reference/upgrading.md` (:794, :829): heading, paragraph, `Before:` ` ```ts ` fence, `After:` ` ```typescript ` fence (compiled by `pnpm spec:website-examples`), closing ADR link. New heading: `## 0.13: the dock takes the gate registry, not its instances`. Docs to edit are in RESEARCH Q7's table (devtools README :140-146, react README :78-92, website `devtools.md` :120-160, `react/hooks.md` :28, :112-113, `spec/behaviors/09-react.md:640`). History blocks (`28-devtools-screens.md:379-381`, `upgrading.md:191`, CHANGELOGs) are not rewritten. `examples/nextjs-newsroom/src/client/Dock.tsx` needs no edit under D-18 (`<DevtoolsDock {...feed} />` keeps compiling); verify by typecheck.

## Shared Patterns

### Scope-owned resources (ADR-QD-137)
**Source:** `packages/devtools/src/model/DockModel.ts`, `TimelineFeed.ts`, `DiagnosticsStore.ts`. A model is built in a `Scope`, has no `dispose`; subscriptions and forks are released by finalizers (`Effect.addFinalizer(() => Effect.sync(...))`). **Apply to:** the registry subscription in `DockModel.ts`.

### External store contract
**Source:** `packages/devtools/src/model/ExternalStore.ts:40-55`. `makeExternalStore` gives `subscribe`/`getSnapshot`/`set` (no-op on identical reference) /`publish`. Panels read through `useStoreSnapshot`. **Apply to:** the `questions` store and the panel.

### Closed unions and dispatch
**Source:** AGENTS.md §5a. `Match.type<T>().pipe(Match.tagsExhaustive({...}))` built once at module scope, const annotated `(x: T) => R`. No `switch`, no `as`, no `!`, no `any`. **Apply to:** `GatesView`/`QuestionsView` in `Gates.ts` and the panel.

### Imports
**Source:** AGENTS.md §1. `import * as Effect from "effect/Effect"`; cross-package named imports from `@qadi/core` root; relative imports carry `.ts`; `import type` for types. Devtools imports only `@qadi/core`, never `@qadi/react`.

### Structural `...Like` types
**Source:** `AskedQuestionLike`/`GateInstanceLike` in `packages/devtools/src/model/Gates.ts:40-69`. Devtools restates react's shape structurally. **Apply to:** `GateRegistryLike` (D-08); `state`/`kind` stay `string` (D-05, D-06).

### Test shape
**Source:** `@effect/vitest` `it.effect`, `TestClock`, fast-check (`DockModel.test.ts`), tstyche for `.tst.ts`, case labels in titles. Coverage floors: core 95%, others 90%.

## No Analog Found

None. The nearest-to-novel piece, a fast-check property over a registry double joined with poll ticks, is composed from `DockModel.test.ts` cases and `DiagnosticsFeed.test.ts`, with the oracle and double specified in RESEARCH Q6 and Code Example 5.

## Metadata

**Analog search scope:** `packages/core/{src,test}`, `packages/devtools/{src/model,src/react,test}`, `packages/react/{src,test}`, `.changeset`, `spec/decisions`, `.planning/phases/QD-48-*`, `examples/nextjs-newsroom`.
**Files scanned:** about 40 (targeted reads and greps; large files read by range).
**Pattern extraction date:** 2026-11-16

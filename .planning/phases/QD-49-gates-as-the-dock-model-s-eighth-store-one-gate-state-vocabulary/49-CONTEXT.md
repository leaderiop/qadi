# Phase 49: Gates as the dock model's eighth store, one gate-state vocabulary - Context

**Gathered:** 2026-11-16
**Status:** Ready for planning

<domain>
## Phase Boundary

ARCH-96, requirements GATE-01..05 and WX-01..07.

Two changes, one phase:

1. **One gate-state vocabulary.** The five gate-state words (`Failed`, `Denied`, `Rechecking`, `Pending`, `Allowed`) are stated once, in `@qadi/core`. React's `GateRenderState` and devtools' `GATE_DISPLAY` derive from that statement. Today devtools restates the union privately (`packages/devtools/src/model/Gates.ts:77`), and react derives its own from `DecisionOutcome["_tag"]` (`packages/react/src/GateWriter.ts:55`). No test ties the two.
2. **Gates as a dock-model store.** The gate registry becomes a `makeDockModel` store. The model produces the joined question × instance rows, and `QuestionsPanel` renders one snapshot. Today `DevtoolsDock` passes a plain `gates` array prop straight to the panel (`react/DevtoolsDock.tsx:118-124, 336-339`), bypassing the model. The panel then joins it in the view (`QuestionsPanel.tsx:96-97, 169`, `instancesAsking` per row) with questions polled through `DiagnosticsStore.ts:200`.

**Out of scope:**
- Tying `GateInstanceLike.kind` to react's `GateKind` (deferred).
- Turning `sightings` into a store.
- Any change to browser behaviour (Activity hide/show, focus, lens, pick). If one turns out to be unavoidable, it is named in the ADR.
</domain>

<decisions>
## Implementation Decisions

### The vocabulary in core (GATE-01)
- **D-01:** Follow the ADR-QD-152 pattern (`packages/core/src/HydrationMetrics.ts`).
  - A new core module `GateState.ts` holds a module-private keyed table.
  - `GateState` is read off its keys. Core exports an `isGateState` guard (`Object.hasOwn`) and `gateStates` in declaration order (no cast).
  - The table itself is not exported.
  - It reaches the barrel through `export *` and gets `spec/overview.md` rows (gate 13).
- **D-02:** The table's declaration order is "worst news first": Failed, Denied, Rechecking, Pending, Allowed (today's `GATE_DISPLAY` key order).
  - Display words (`"Error"`, `"Deny"`, `"Allow"`) are devtools vocabulary and stay in devtools. Core does not carry them.
  - Each row carries only what is state-generic. If research finds nothing state-generic beyond the order, an empty row is acceptable; ADR-152 rows carry meaning, and this table may carry less.
- **D-03:** React: `GateRenderState = GateState` (derived from core).
  - React's `DecisionOutcome` stays its own `Data.TaggedEnum`.
  - A tstyche test pins `DecisionOutcome["_tag"]` equal to core's `GateState` both ways, so a sixth outcome in either place fails to compile.
  - `packages/react/test/DecisionOutcome.tst.ts:40-41` is updated accordingly.
- **D-04:** Devtools:
  - `GATE_DISPLAY` is typed `{ readonly [K in GateState]: DisplayState }`, so a new core state is a devtools compile error.
  - `GATE_STATES` and `displayOfGateState` read core's `gateStates`/`isGateState`.
  - Devtools takes no dependency on `@qadi/react` (ADR-QD-053/080); it reads only `@qadi/core`.

### What devtools accepts, unknown states (GATE-02)
- **D-05:** `GateInstanceLike.state` stays `string`.
  - A devtools build may be paired with a newer react, so an unknown state is shown as `Unrecognised`, never dropped and never as an answer.
  - The existing unknown-state rows stay, including `"toString"` (`packages/devtools/test/model/Gates.test.ts:220-235`).
- **D-06:** `GateInstanceLike.kind` stays `string`. Tying it to `GateKind` is deferred.
- **D-07:** `GATE_DISPLAY` stays private. `GATE_STATES` keeps its exports and order. `gateGroups` stays unexported (`packages/devtools/test/surface.tst.ts:134`).

### The gate store and the dock's prop (GATE-03)
- **D-08:** `DockModelInputs` gains `gates?: GateRegistryLike`, a structural `{ subscribe, instances }`.
  - React's `GateRegistry` (`packages/react/src/GateWriter.ts:115-120`) satisfies it without devtools importing react.
  - The model subscribes to it, within the model's scope (ADR-QD-137).
- **D-09:** `DevtoolsDock`'s public `gates` prop becomes `GateRegistryLike` only, replacing `ReadonlyArray<GateInstanceLike>`.
  - This is **Breaking** for `@qadi/devtools` (minor, marked Breaking).
  - The 0.13 `upgrading.md` entry says: pass the registry (`atoms.gates`, or the provider's registry) instead of `useGateInstances()`'s array.
  - Closed input over widening: there is no array-or-registry union.
- **D-10:** The model gains a `questions` store. Its one snapshot holds:
  - the polled questions, joined with the gate instances, each row with its instances;
  - whether gates are absent or empty.

  It is recomputed when either the diagnostics poll publishes or the registry notifies, and keeps the same reference until something changes. The join moves out of the view and into `model/Gates.ts`/the model; `instancesAsking`/`gateGroups` become model-side.
- **D-11:** Counting. The ADR and `DockModel.ts`'s header recount precisely: gates is the eighth store, and `sightings` stays a thunk. This fixes the header's current "eight readouts" arithmetic (`DockModel.ts:2, 20-24`).

### The panel, tests and evidence (GATE-03..05, WX-05/06)
- **D-12:** `QuestionsPanel` renders the model's one `questions` snapshot.
  - No `gates` prop, and no `gateGroups`/`instancesAsking` call in the view.
  - It keeps the absent-versus-empty messages (`QuestionsPanel.tsx:115-117`) and the lens, pick and Activity behaviour exactly as today.
- **D-13:** Characterisation first. A byte-exact test of the panel's current rows on the phase base is committed before any `packages/*/src` edit. It covers:
  - absent and empty gates;
  - one row per guard;
  - Deny vs Failure;
  - asked but unmounted;
  - an unknown state shown as `Unrecognised`.

  Existing panel tests that pass a `gates` array change only their input to a registry double; every expected value stays unchanged.
- **D-14:** A headless join test in `packages/devtools/test/model/DockModel.test.ts`. It is a fast-check property that interleaves registry changes and poll ticks under `TestClock`. Every snapshot's rows equal the join of questions and instances from one moment, with no render (the ARCH-74/82 store pattern).
- **D-15:** The mutation base uses the existing configs with `--mutate` and never edits them:
  - devtools `model/DockModel.ts` and `model/Gates.ts` (`stryker.devtools.mjs`);
  - react `GateWriter.ts` (`stryker.react.mjs`, if `--mutate` reaches it);
  - the new core `GateState.ts`, recorded as `new`.

  `QuestionsPanel.tsx` and `DevtoolsDock.tsx` are recorded as not instrumentable (the devtools config mutates `src/model/**` only), as `ServicesPanel.tsx` was in Phase 47. `ignoreStatic` means the tables themselves are not mutated (ADR-076). No touched file's score may drop.
- **D-16:** Instrumentation off (§13). With no registry, nothing is registered or rendered, and the panel shows today's "absent" message. The react suite passes untouched, apart from the tstyche pin in D-03.

### Records
- **D-17:**
  - **ADR-QD-162:** amends the dock model's store set (the ARCH-74/82 lineage), applies the ADR-QD-152 pattern to the gate vocabulary, and keeps ADR-QD-053/080.
  - **Spec ids:** CCR-QD-440, BEH-QD-581..585, INV-QD-343..344.
  - **Changesets:**
    - `@qadi/core` minor: the vocabulary.
    - `@qadi/react` patch: `GateRenderState` derives from core.
    - `@qadi/devtools` minor, **Breaking**: the `gates` prop's type.
  - **Docs:** `spec/overview.md` rows (core's new exports; devtools' `GateInstanceLike` row unchanged or updated; line 585's statement about react's `GateRenderState`), the devtools and react docs that show `gates={useGateInstances()}`, and the 0.13 upgrade entry.

### Claude's Discretion
- The structural registry type's exact name (`GateRegistryLike`, following the `…Like` convention, AGENTS.md §8) and where it lives in devtools (`model/Gates.ts`).
- The store's snapshot shape (a closed tagged union for absent versus present is preferred over a boolean).
- How `useDockModel` receives the registry, and the order of plans within the RED-first shape.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/src/HydrationMetrics.ts`: the ADR-QD-152 keyed-table pattern (private table, `keyof typeof`, `Object.hasOwn` guard, declaration-order list), with tests `HydrationMetrics.test.ts` and `HydrationMetrics.tst.ts`.
- `packages/devtools/src/model/ExternalStore.ts`: `makeExternalStore`, the `subscribe`/`getSnapshot`/`set`/`publish` contract every dock-model store uses.
- `packages/devtools/src/model/DockModel.ts`: `makeDockModel`. Stores are built in the generator, added to `DockModel` and the return object, and dispatched in `configure` (149-161). `DockModelInputs` is at 52-62. `diagnostics` (125, 141-145) is the closest analog.
- `packages/devtools/src/model/Gates.ts`: `displayOfGateState`, `gateGroups`, `instancesAsking`, `locatableIds`, `isLocatable`.
- `packages/react/src/GateRegistry.ts:67`: `makeGateRegistry`, a lazily rebuilt snapshot that keeps the same reference until a change.

### Established Patterns
- Headless store tests: `packages/devtools/test/model/DockModel.test.ts`, `DiagnosticsFeed.test.ts` and `TimelineFeed.test.ts` (`it.effect` with a scope, fast-check).
- Devtools stays structural over react (`AskedQuestionLike`, `GateInstanceLike`). The exports are named per module in its two barrels (ARCH-40, the `devtools-named-barrel` rule).
- `DisplayState` (`model/Verdict.ts:47-59`) includes `"Unrecognised"`.

### Integration Points
- `packages/devtools/src/react/DevtoolsDock.tsx`: `HostProps` (140), the props doc (101-102: gates "stay the plain `gates` prop"; this changes), `useDockModel` (160).
- `packages/devtools/src/react/QuestionsPanel.tsx`: the `gates` prop at 59-66.
- `packages/react/src/hooks.ts:173-177`: `useGateInstances`.
- `QadiProvider`: `instrument` (146, 191) and the `gates?: GateRegistry` override (158, 196).
- Tests that pin rows: `packages/devtools/test/react/QuestionsPanel.gates.test.tsx`, `QuestionsPanel.test.tsx`, `DevtoolsDock.test.tsx` and `DiagnosticsScreens.test.tsx`.
- `spec/overview.md:585` and `:901`.
</code_context>

<specifics>
## Specific Ideas
- The shape follows `HydrationMetrics.ts` exactly. Downstream derives its union off core the way react derives `HydrationDropReasonOf<"payload">`.
- "One moment" means each snapshot's questions and instances are read together, at the publish that produced it. A test asserts this, not a comment.
</specifics>

<deferred>
## Deferred Ideas
- State the gate kinds (`GateKind`) once in core, and type devtools' `GateInstanceLike.kind` from it.
- Make `sightings` a dock-model store.
</deferred>

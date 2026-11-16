---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
reviewed: 2026-11-16T08:40:00Z
depth: standard
files_reviewed: 45
files_reviewed_list:
  - .changeset/devtools-feed-hands-the-gate-registry.md
  - .changeset/dock-takes-the-gate-registry.md
  - .changeset/gate-states-stated-once.md
  - apps/website/src/content/docs/docs/packages/devtools.md
  - apps/website/src/content/docs/docs/packages/react/hooks.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - examples/nextjs-newsroom/test/dock-wiring.test.tsx
  - packages/core/src/GateState.ts
  - packages/core/src/index.ts
  - packages/core/test/GateState.test.ts
  - packages/core/test/GateState.tst.ts
  - packages/devtools/README.md
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/Gates.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/useDockModel.ts
  - packages/devtools/test/gateRegistryDouble.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/Gates.test.ts
  - packages/devtools/test/react/DevtoolsDock.test.tsx
  - packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx
  - packages/devtools/test/react/QuestionsPanel.gates.test.tsx
  - packages/devtools/test/react/QuestionsPanel.test.tsx
  - packages/devtools/test/react/VerdictTreatment.test.tsx
  - packages/devtools/test/react/gatesProp.ts
  - packages/devtools/test/react/questionsPanelInput.ts
  - packages/devtools/test/surface.tst.ts
  - packages/react/README.md
  - packages/react/src/DecisionOutcome.ts
  - packages/react/src/DevtoolsFeed.ts
  - packages/react/src/GateWriter.ts
  - packages/react/test/DecisionOutcome.tst.ts
  - packages/react/test/DevtoolsFeed.test.tsx
  - spec/README.md
  - spec/behaviors/09-react.md
  - spec/behaviors/28-devtools-screens.md
  - spec/decisions/047-a-headless-devtools-model.md
  - spec/decisions/053-a-gate-can-be-found.md
  - spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase QD-49: Code Review Report

**Reviewed:** 2026-11-16T08:40:00Z
**Depth:** standard
**Files Reviewed:** 45
**Status:** issues_found

## Summary

The eighth store is sound on the points the brief asked about. I traced each one against the source, and the 196 tests in the touched devtools files pass.

- **One moment.** `rejoin` reads `shownReading.getSnapshot()` and `gatesNow.instances()` in one synchronous call and compares by reference. A quiet poll tick keeps the snapshot, because `DiagnosticsStore` keeps the questions reference for equal content. The registry's own array is what reaches `useLens`.
- **Subscription lifetime.**
  - It is released by the scope finalizer.
  - The same registry passed again does not resubscribe.
  - A swap to or from `undefined` unsubscribes and subscribes correctly.
  - `closed` blocks a subscription from `configure` after close.
  - StrictMode and `Activity` rebuild the model, and with it the subscription (M33, M35 and the dock tests pin this).
- **Panel markup.** Testids and strings are unchanged except the D-12a sentence. `gatesBlock` and `questionsBlock` reproduce the old branches: `Absent` and `Empty` replace the `instances.length === 0` split, and `Unsampled` replaces `questions === undefined && unsampled`.
- **`GateState.ts`.** The own-key guard is correct and `gateStates` is in declaration order with no cast. Nothing reads a verdict into the store. The snapshot holds guards and questions only, so ADR-QD-053/080 and `DECISION_READ_BUDGET` are not touched.
- **React side.**
  - `GateRenderState = GateState` is pinned both ways.
  - `useDevtoolsFeed` takes the effective registry from the context (`gatesProp ?? atoms.gates`).

The findings are one robustness gap, one false claim in ADR-QD-162's rationale, one stale spec appendix and a few quality items.

## Warnings

### WR-01: A throwing registry stops the model's updates silently, and ADR-QD-162 §5's rationale does not hold for `@qadi/react`'s own registry

**File:** `packages/devtools/src/model/DockModel.ts:148-182, 208-215` (also `spec/decisions/162-*.md` Decision 5, `spec/behaviors/28-devtools-screens.md` BEH-QD-584)
**Issue:** ADR-QD-162 §5 leaves `instances()` uncaught on the argument that "a caught error would show an empty panel with nothing said, which is worse than the host seeing its own throw". In production the host does not see the throw on the paths that matter. Four paths:

1. **Registry notification.** `@qadi/react`'s `makeGateRegistry.changed()` wraps every listener in `try { listener() } catch {}` (`packages/react/src/GateRegistry.ts:81-90`), so a throw in `rejoin` is swallowed. The questions store freezes on its last snapshot with nothing said, which is the outcome the ADR calls worse. The test double deliberately does not swallow (`gateRegistryDouble.ts` header), so no test sees this.
2. **Poll tick.** The chain is `accept` → `diagnosticsFeed` view `set` → `remerge` → `shownReading.set` → `rejoin` → `instances()` throws.
   - The throw happens inside the poll fiber's `Effect.sync(() => store.accept(...))`. It becomes a defect that ends the poll.
   - `onFailure` then calls `show(Stopped)`, which re-enters `rejoin` and throws again, from inside `Effect.onExit`'s `Effect.sync`.
   - `rejoin` is subscribed first on `shownReading`, and `ExternalStore.notify` has no per-listener isolation. So the dock's own host listeners on `shownReading` (the diagnostics notice, the hydration block) are skipped for that notification. I did not run this path. It follows from `ExternalStore.notify`, `SupersedingRun.fork` and `runDiagnostics` as read.
3. **Initial build.** `let lastKey = joinKeyNow()` runs during `makeDockModel`. `useScoped` rethrows from a layout effect, so the whole host tree unmounts unless the host has an error boundary. A devtools panel taking the app down is the failure the brief asks about.
4. **`configure`.** A throw in the `rejoin()` call at line 215 happens after `inputs = next` and after the swap, so the model is left half-applied (new `gatesNow`, old snapshot). It propagates out of a `useLayoutEffect`.

A custom registry is the only way to hit this, because react's `instances()` cannot throw. The cost of making it safe is small and the failure modes above are all silent or app-wide, so I rate it a warning rather than accepting it as designed.
**Fix:** Keep the "host's defect" stance but stop it from corrupting unrelated state. In `rejoin`, read the key inside a try/catch. On a throw, keep `lastKey` and the current snapshot, and report the error through the existing channel (for example `Effect.runFork(Effect.logError(...))` or a rethrow deferred with `queueMicrotask`), so `shownReading`'s other listeners still run. `joinKeyNow` at build time and in `configure` should use the same guarded path, falling back to `gates: undefined`. If the decision stays as is, change the ADR/BEH text. The claim "the host sees its own throw" is false for the registry path (1) and the poll path (2), so it should say that a throwing registry silently stops the panel's updates. Add a test with a registry whose `instances()` throws after the first call (the double must swallow listener errors the way react's registry does, to match production).

### WR-02: `spec/appendices/react-integration.md` still says `useDevtoolsFeed()` returns the list

**File:** `spec/appendices/react-integration.md:449`
**Issue:** The sentence reads "`useDevtoolsFeed()` returns the same list with the rest of what a devtools panel reads from the atom set (BEH-QD-327)". After this phase `feed.gates` is the registry (`GateRegistry`), not a list. The phase updated BEH-QD-327, ADR-QD-053, the overview row, the READMEs and the website, but missed this normative appendix. `spec/` is normative (AGENTS.md §11), and the same sentence also sits in the change-history sweep the phase did elsewhere.
**Fix:** Replace it with "`useDevtoolsFeed()` returns the registry itself as `gates` (read it with `gates.instances()`), with the rest of what a devtools panel reads from the atom set (BEH-QD-327, BEH-QD-585)."

## Info

### IN-01: INV-QD-343/344 cite phase SUMMARY negative controls as enforcement

**File:** `spec/invariants.md:3971, 3981`
**Issue:** INV-QD-343's Enforcement ends with "the torn-join negative control in 49-04's SUMMARY", and INV-QD-344's Implication cites "the 49-03 negative control". Neither is a repo test or gate, so the invariant's enforcement depends on a planning artifact. Nothing else in `spec/` or `packages/*` cites a `NN-NN` SUMMARY (my search found only this one occurrence). P2 does catch a "poll-only cache" mutant, but that is only claimed, not recorded in a test.
**Fix:** Drop the SUMMARY citation and keep the test names. Or record the mutant as a named case (for example a comment on P2 saying which mutation it kills).

### IN-02: `configure` after close still polls the new registry

**File:** `packages/devtools/src/model/DockModel.ts:208-215`
**Issue:** After close, `watchGates` correctly refuses to subscribe, but `gatesNow = next.gates` and `rejoin()` still run. `rejoin()` calls `next.gates.instances()` and `questions.set(...)` on a closed model. BEH-QD-584's "nothing MUST be delivered to the model after close" is met, but a closed model still executes host code. M35 only asserts the subscription counts.
**Fix:** Guard the tail of `configure` with `if (closed) return;` (after the diagnostics call), and add the `instances()` call count to M35.

### IN-03: `GatesView.Listed` carries `instances`, which duplicates `QuestionsSnapshot.instances`

**File:** `packages/devtools/src/model/Gates.ts:277-282, 332-336`
**Issue:** `Listed: { instances }` is built by `joinQuestions` and asserted in two tests. The panel never reads it (`Listed: () => (lens) => <PickButton .../>`), and `snapshot.instances` already holds the same array. Two sources for one fact, with a test pinning both to be identical.
**Fix:** Make `Listed` a payload-free state (`Listed: {}`), as `Absent` and `Empty` are. Update BEH-QD-583's listing and the two assertions.

### IN-04: Panel tests build their input with the code under change

**File:** `packages/devtools/test/react/questionsPanelInput.ts:19-23`
**Issue:** `panelInput` builds every `QuestionsPanel` snapshot through `joinQuestions`, and `QuestionsPanel.test.tsx`, `QuestionsPanel.gates.test.tsx` and `VerdictTreatment.test.tsx` all use it. A defect in the join would flow into the panel assertions as input rather than failing them. The file header says the characterisation, not these tests, is the independent check. The characterisation is independent (it goes through the dock with literal HTML), and `Gates.test.ts` pins `joinQuestions` directly, so the exposure is limited. I note it because the expectations in those three files are no longer independent of the join.
**Fix:** Either state the dependency in the three files' headers, or build the snapshots in `panelInput` by hand for the few cases the tests need (about eight `GatesView`/`QuestionsView` shapes).

---

_Reviewed: 2026-11-16T08:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

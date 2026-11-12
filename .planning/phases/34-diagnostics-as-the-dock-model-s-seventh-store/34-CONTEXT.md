# Phase 34: Diagnostics as the dock model's seventh store - Context

**Gathered:** 2026-11-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Today the dock's diagnostics poll is forked from a React effect. `DevtoolsDock` calls `useDiagnostics(diagnostics)`, which goes through `useRunningStore`. `useRunningStore` relies on a hand-written deps list with an `eslint-disable`, and the dock then merges in the supplied `reading` with `useMemo(mergeReading(...))`. ARCH-74's rule is "one owned-model hook, and it forks nothing". The diagnostics poll is the one place where the dock still breaks that rule.

This phase moves the poll and the merge into the headless model:
- One scoped diagnostics feed, forked on its own `FiberHandle` in the model's scope. It has a closed status, so a poll defect is visible instead of a silently frozen panel.
- The merged reading becomes a model store, the dock model's seventh.
- Public `useDiagnostics` becomes a thin adapter over the same feed.
- `useRunningStore`, the effect-fork helper, is removed from the package.

Requirements: DIAG-01..06 and WX-01..07. Records: ARCH-82, an amendment to ADR-QD-047 (Rev 1.13), CCR-QD-425, BEH-QD-506..510, INV-QD-313..314, and a changeset for `@qadi/devtools`. ADR-QD-147 is expected to stay Unused.

</domain>

<decisions>
## Implementation Decisions

The user's direction for every area: "the most clean solution, the most complete, not the simplest. We don't care about complexity." The decisions below take the complete option in each area.

### The feed and its closed status (DIAG-05)
- **D-01 One scoped diagnostics feed.** A new package-private model, `makeDiagnosticsFeed`, built in a `Scope`, holds:
  - the diagnostics store;
  - one `FiberHandle` for the poll (`runDiagnostics`);
  - a `configure(options | undefined)` command, compared per field.

  The dock model and `useDiagnostics` both use it, so there is exactly one poll implementation.
- **D-02 The feed's snapshot is `{ status, reading }`, with a closed `DiagnosticsStatus`:**
  - `Off`: no diagnostics options were given, so nothing runs.
  - `Starting`: the poll is forked and no sample has been accepted yet.
  - `Live`: at least one sample has been accepted.
  - `Stopped { reason }`: the poll ended on a defect. The reason is `Cause.pretty` of the defect.

  It is a `Data.TaggedEnum` and is dispatched with `Match.tagsExhaustive`. The status belongs to the feed and not to a reading, so `Diagnostics` and `mergeReading` keep their shapes.
- **D-03 A defect stops the poll visibly and keeps the last good reading.**
  - A sample that dies (for example a throwing `questions`) ends the poll fiber. The feed observes the fiber's exit and sets `Stopped { reason }`. The last accepted reading stays on screen.
  - An interruption (a restart, an input going `undefined`, or the scope closing) is not a defect and never produces `Stopped`.
  - A layer that fails to build stays `WiringRead.Failed` while the other reads continue (BEH-QD-218). That case is not a stop.
- **D-04 Restart.** A stopped poll restarts when an options field changes identity, and through an explicit `restart()` command on the feed. The Services panel's stopped notice offers that command as a button, so a reviewer can resume without editing props. Every restart passes through `Starting` again.
- **D-05 Tested with a throwing source under `TestClock`, with no render.** The tests cover:
  - the transition to `Stopped`;
  - the kept reading;
  - restart by a field change;
  - restart by `restart()`;
  - interruption never reported as a stop.

  Model tests run inside `it.effect` with `settleTurns` before each `adjust`, following the roadmap's planning note.

### Lifetime across `<Activity>` and `undefined` (DIAG-05)
- **D-06 Hidden `<Activity>`: the reading does not survive, and the gap is stated.** The model is rebuilt on hide and show (ADR-QD-137), as pause and the backlog already are. The feed belongs to the model, so a rebuilt model starts at `Starting` and becomes `Live` on the first sample, which is taken immediately. The panel renders `Starting` as an explicit "waiting for the first sample" state, never as a blank.
  - Holding the reading above the scoped model is rejected, because it would give the dock a second owner and a second lifetime.
  - The behaviour is stated in the ADR-QD-047 amendment and pinned in a test that closes and rebuilds the model.
  - It is confirmed once in a real browser as a recorded human check, as in the v1.2 audit.
- **D-07 `diagnostics` going `undefined` and back.**
  - `undefined` interrupts the poll, resets the reading to the `noDiagnostics` constant and sets the status to `Off`. A stale reading never passes for a live one.
  - When the options are defined again, the poll forks, the status goes to `Starting`, and then to `Live`.
  - Both directions are pinned in model tests.

### Where the poll starts and what restarts it (DIAG-01)
- **D-08 Start from init, forked.** `DockModelInputs` gains `diagnostics` and `reading`. `makeDockModel` forks the poll from its init inputs while it is built, through the feed's `FiberHandle` runtime.
  - The fork never blocks `useScoped`'s `Effect.runSync`.
  - The host layer builds inside the forked fiber, so an asynchronous layer works.
  - The poll starts in the same commit that today's effect did, so the roadmap's one-render delay never appears and nothing has to work around it.
- **D-09 Per-field comparison.** `configure` restarts the poll only when one of these changes identity, so an inline options literal never restarts it:
  - `layer`, `collector`, `questions` or `intervalMillis`;
  - `diagnostics` changing between defined and `undefined`.

  A change to `reading` alone recomputes the merge and never restarts the poll.
- **D-10 Nothing forks from a React effect.**
  - The hand-written deps list and its `eslint-disable` are deleted with `useRunningStore`.
  - `useDockModel` passes `diagnostics` and `reading` through the `configure` call it already makes.

### The merged reading as a model store (DIAG-02, DIAG-03)
- **D-11 The seventh store.** The dock model exposes a `diagnostics` store whose snapshot is `{ status, reading: mergeReading(feed.reading, inputs.reading) }`.
  - The merge is computed when the feed publishes or when `reading` changes identity, and never inside `getSnapshot`.
  - With nothing supplied, `mergeReading` returns the sampled reading itself, so the identity rule still holds.
  - `DevtoolsDock` renders the store and merges nothing.
- **D-12 `DiagnosticsDockOptions` is declared in the model** (beside the feed) and re-exported from `@qadi/devtools/react` under the same name, so the import path is unchanged.
- **D-13 Public `useDiagnostics` is a thin adapter over the same feed.** It is built as `useScoped(makeDiagnosticsFeed)`, plus `configure` in the layout effect, plus the one store-snapshot hook.
  - It returns the feed snapshot `{ status, reading }`, so a standalone host sees a stopped poll too.
  - This is a **Breaking** change to its return type, recorded in the changeset and in `upgrading.md`.
  - The example `examples/nextjs-newsroom/src/client/Counters.tsx` (`const { hydration } = useDiagnostics(...)`) and the website devtools page move with it.

### One store-snapshot hook (DIAG-04)
- **D-14 One `useStoreSnapshot(store)` hook.** It replaces the dock's snapshot hooks:
  - `useDockSnapshot`;
  - the explorer hooks;
  - `useRunningStore(store, undefined, …)` used as a plain read;
  - the diagnostics read.

  No constant-`undefined` run remains (v1.2 Phase 26 IN-01). `usePaused` reads through the same hook if it can be expressed as a store snapshot without a second subscription; otherwise it stays as the one `useSyncExternalStore` read of a non-snapshot accessor, and the reason is stated in its doc comment.
- **D-15 `useRunningStore` is deleted.** Public `useTimeline`, its last caller, is rebuilt the same way `useDiagnostics` is: a scoped timeline feed held by `useScoped`, with its source passed through `configure`.
  - Its public signature is unchanged.
  - After this, nothing in `@qadi/devtools`' React layer forks a fiber from an effect.
  - Its existing React tests (start on mount, stop on unmount, no restart on an unchanged re-render) must stay green unchanged.

### Proof and records (DIAG-06; WX-01..07)
- **D-16 Characterisation first, then records:**
  - The phase's first commit records the mutation base, measured by `stryker.devtools.mjs`, for the touched devtools files that carry mutants. `DockModel.ts` has a base of 100, and `DiagnosticsStore.ts` and any other touched file are measured the same way.
  - Pins of today's behaviour come before any `src` change and must be green on the base: the merge's per-field precedence, the identity rule, and the poll's start, stop and no-restart-on-rerender.
  - New and moved files must keep the bar: no touched file falls below its base, and a drop is closed with a test, never by re-baselining.
  - Model tests cover start, restart, stop, merge, the four statuses, `undefined` and back, and rebuild, all under `TestClock` with no render.
  - Records:
    - ADR-QD-047 amended (Rev 1.13), with ADR-QD-147 named Unused unless the amendment cannot carry the decision;
    - BEH-QD-465 restated (seven stores) and BEH-QD-323 restated;
    - BEH-QD-506..510 for the new behaviours, any unused number named Unused;
    - INV-QD-313..314, any unused number named Unused;
    - CCR-QD-425 with ARCH-82;
    - traceability rows;
    - the overview's export tables, for the new `DiagnosticsStatus` and the changed `useDiagnostics` return;
    - the changeset (`@qadi/devtools` `minor`, with `**Breaking.**` for `useDiagnostics`);
    - an `upgrading.md` section;
    - the website devtools page.
  - CHANGELOG files are history and are not edited.

### Claude's Discretion
- The plan and wave split, provided D-16's characterisation commit comes first.
- Whether the feed lives in `DiagnosticsStore.ts` or a new `DiagnosticsFeed.ts`. Pick the one that keeps madge acyclic and each module's mutation score measurable.
- The exact type and file of the scoped timeline feed in D-15.
- The exact wording and layout of the `Starting` and `Stopped` notices. They follow the existing Services panel styles, and the UI contract (UI-SPEC) governs them.
- The exact wording of doc comments: a one-line summary first, ADR citations only in the paragraphs after it, and no plan or `D-NN` ids.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/devtools/src/model/DockModel.ts` already holds the patterns the feed needs:
  - a `FiberHandle` with `FiberHandle.runtime(...)` for forking from a synchronous command (`readSource`);
  - per-field `configure`;
  - `makeExternalStore` for a store that outlives an inner one.
- `packages/devtools/src/model/DiagnosticsStore.ts` provides `makeDiagnosticsStore` (the identity-keeping `accept`), `runDiagnostics` (error channel `never`, so a defect ends the run), `mergeReading`, `noDiagnostics` and `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`.
- `packages/devtools/src/react/useScoped.ts` builds a scoped value in a layout effect under `Effect.runSync` and clears it on cleanup, which is the hidden-`<Activity>` behaviour (ADR-QD-137).
- `packages/devtools/src/react/useDockModel.ts` holds `useScoped(makeDockModel)` plus `configure` in a layout effect; it extends naturally to `diagnostics` and `reading`.

### Established Patterns
- **Package-private model:** the model is package-private (ADR-QD-099), the React adapters decide nothing, and the model is tested without rendering.
- **Named barrels:** `devtools-named-barrel`. Public React exports come from `packages/devtools/src/react/index.ts` (`useDiagnostics`, `DiagnosticsDockOptions`).
- **House rules:** `Match`, not `switch`. No `as`, `!`, `any` or async/await. `console` stays out.

### Integration Points
- **The dock today:** `DevtoolsDock.tsx:153-154` holds `useDiagnostics` and the `useMemo(mergeReading)`. `DockFrame` takes `shown: Diagnostics`, and the Services panel receives `wiring`, `activity`, `portCalls`, `questions` and `hydration`.
- **Hooks to collapse:** `useDockSession.ts:14` and `useExplorerSession.ts:16,20` (`useRunningStore(x, undefined, [x])`), plus `useTimeline.ts:52`.
- **`useDiagnostics` callers that change with D-13:**
  - `@qadi/react`'s `DevtoolsFeed.ts:100`, a doc mention of `useDiagnostics`' field keying;
  - `examples/nextjs-newsroom/src/client/Counters.tsx` and `Dock.tsx`;
  - the example's `test/dock-wiring.test.tsx`;
  - `apps/website/src/content/docs/docs/packages/devtools.md`.
- **Existing tests:** `packages/devtools/test/react/useDiagnostics.test.tsx`, `packages/devtools/test/react/useTimeline.test.tsx`, `packages/devtools/test/model/DiagnosticsStore.test.ts`, the DockModel tests, `packages/devtools/test/surface.test.ts`.
- **Mutation:** `stryker.devtools.mjs`.

</code_context>

<specifics>
## Specific Ideas

- The architecture review (`/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261112-022336.html`) is the source of this candidate: diagnostics as the dock model's seventh store.
- The roadmap's four opening decisions are settled here: the Activity behaviour (D-06), `undefined` and back (D-07), the defect state (D-02..D-05), and the start timing (D-08).
- UI hint: the `Starting` and `Stopped` notices and the restart button are the visible change. The UI gate (UI-SPEC) runs before planning.
- Phase 36 has a hard edge on this phase, because carried debt lands there.

</specifics>

<deferred>
## Deferred Ideas

None. Rebuilding `useTimeline` on a scoped feed (D-15) is in scope because it deletes `useRunningStore` and completes ARCH-74's rule across the package.

</deferred>

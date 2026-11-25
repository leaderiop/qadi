# Project Research Summary

**Project:** Qadi (Effect-native authorization library), milestone v1.10 "Arch Wave 15"
**Domain:** Internal architecture deepening of an Effect v4 monorepo (`@qadi/devtools`, `@qadi/react`); two live defects, two refactors; no new features, no new dependency
**Researched:** 2026-11-24 (start commit `911aa37f`, branch `arch-wave-15`, source identical to `902d2128`)
**Confidence:** HIGH on current behaviour (read at file:line, both defects reproduced with throwaway tests that are now deleted); MEDIUM on the shape of Phase 82's fix until its RED test runs

Reserved ids (already in the reservation file; nobody runs `scripts/next-id.mjs`): ADR-QD-194..197, CCR-QD-473..476, BEH-QD-741..760, INV-QD-407..414. Per phase: 81 ADR 194 / CCR 473 / BEH 741-745 / INV 407-408; 82 ADR 195 / CCR 474 / BEH 746-750 / INV 409-410; 83 ADR 196 / CCR 475 / BEH 751-755 / INV 411-412; 84 ADR 197 (likely unused) / CCR 476 / BEH 756-760 / INV 413-414.

## Executive Summary

Wave 15 is four strictly serial phases (81-84, ARCH-128..131). Two are live defects. In Phase 81 the dock model's `configure` guards one step, so a throwing listener on any store leaves the later inputs unapplied (roles `[]`, simulation and explorer sightings differ, diagnostics `Off`), a second throw replaces the first, and an identical second `configure` cannot heal. The same unguarded fan-out (`spread`) sits under the record path, where a throwing explorer listener leaves the dock with 0 rows. In Phase 82 a `QadiProvider` inside `<Activity>` hidden longer than a macrotask and revealed with stable children throws `registry is disposed`, from the provider's subject effect and, first, from every child's atom subscription. Phases 83 and 84 are refactors: the diagnostics feed holds its reading as a value folded by a pure per-field rule (the store goes), and `useConfigured` takes a value that has `configure`, plus four small finds. Nothing in STACK changes: `effect` 4.1.2, `@effect/atom-react` 4.1.2, `react` 19.3.1 and the test tooling are installed and sufficient.

The recommended approach is the repo's own: state each rule once, in the module that owns it, and consume it by name. 81 states "run every step, collect throws, rethrow once" once in `ExternalStore.ts` (ADR-QD-177's rule, widened from listeners to a run of calls), and uses it for `notify`, the derived-store release loop and `configure`. 82 gives the registry one owner behind a pure, package-private lease module, `reset()` instead of `dispose()`, so no consumer can ever reach an unusable registry. 83 deletes `DiagnosticsStore`'s store machinery and removes the dead `Diagnostics.questions` (Breaking devtools minor, 0.13 upgrade-guide entry). 84 deletes three identical adapters and a restated `set`.

The key risks: (1) guarding `configure` the same incomplete way again, leaving `spread` and the diagnostics `Starting`-publish window unguarded, or collecting the capacity refusal, which must stay outside the collector (M55); (2) fixing Phase 82 in the provider's own effect, which is too late because React runs children's reveal effects first, or copying `useScoped`, which breaks SSR and the first-render subject; (3) checks that cannot fail: the P4 sweep test hides and shows in one tick, `edges.test.tsx:257` ("disposes its registry when unmounted") is vacuous, and a bare negative pin on an `Effect` passes whatever its arguments; (4) the mutation gate (`DockModel.ts` at score 1, 12 ignored) re-closed after review, and the archived v1.9 record scripts that hard-code old phase paths.

## Key Findings

### Recommended Stack (STACK.md)

**Verdict: no stack change, no install, no version bump.** All facts verified in installed source or by probe.

- `effect` 4.1.2: `Equal.equals` (83 fold), `AtomRegistry` at `effect/reactivity/AtomRegistry` (the `unstable/` path does not exist). `registry.reset()` clears all nodes and runs finalizers but leaves the registry usable; `dispose()` is `disposed = true; reset()` and is terminal. `ensureNode(atom).setInitialValue(v)` restores a seed after a reset (probed). `registry.disposed` is not on the interface: do not read it.
- `@effect/atom-react` 4.1.2: its own `RegistryProvider` has the same dispose-on-cleanup shape, so there is nothing upstream to adopt.
- `react` 19.3.1: on `<Activity>` hide both effect kinds clean up immediately, state and refs are kept; on reveal both re-run **with dependencies ignored and the last committed render's closure**; a hidden Activity still re-renders on prop change. Reproduced on 19.3.1 only; re-check if the floor (`>=19.2.4`) moves.
- `AtomRegistry.make` `scheduleTask` and `defaultIdleTTL` stay off limits (AGENTS.md §13, ADR-QD-148).
- `ExternalStore.ts` already offers `sameElements`, `sameFields`, `sameFieldsOrAbsent`, `makeDerivedStore`; `throwCollected` is module-private (line 63).
- Test tooling already installed: `vitest` 5.1.0, `@effect/vitest`, `happy-dom` 21, `@testing-library/react` 16.3.3, `fast-check` 4.10.2 (a natural property for the 83 fold).

### Expected Features (FEATURES.md, each phase's observable done-state)

**Must have (definition of done per phase):**
- **81:** past the capacity check `configure` applies every step whatever any listener throws; one throw rethrows as itself (`undefined`/`null` included), two or more as one `AggregateError` in step order, never flattened; `spread` is total on both the configure and the record path; first configure leaves the model complete and an identical second one reaches no host code; one `spread` per change; M55 and M56 and the characterisation "a throwing questions listener lets services and diagnostics move, then escapes" pass unedited.
- **82:** hide longer than a macrotask then reveal with stable children throws nothing from the provider or any consumer; gates settle, `useSubject()` reads the prop, `useInvalidate()` works; unmount still releases the registry; subject seeded at construction (SSR, first render), `AtomsReplaced` keeps the registry, sweep tests P1-P5 untouched.
- **83:** the feed holds `reading` as a value updated by one pure keep-if-equal function (returns the previous value itself when no field moved); `DiagnosticsStore`/`makeDiagnosticsStore`/`marking` gone; `runDiagnostics` takes an accept sink as `runSource` does; every transition unchanged (F1-F32 unedited); `Diagnostics`' field list stated once; `Diagnostics.questions` resolved.
- **84:** `useConfigured(make, inputs)` with `A extends { configure(inputs: I): void }`, three adapters deleted; `LensSession` uses `ExternalStore.set`; `useLens` has one source of the guard list and one subscription; `DockFrame`'s two ledger/notice pairs from one helper.

**Should have (cheap, in scope):** a ten-store throw matrix test so a new store is a failing row; a fast-check property for the fold; a type test that the poll's reading has no `questions` (positive twin).

**Defer / out:** closing the `Starting`-publish window is not required by FEATURES (see Disagreements); a mutation baseline for `QadiProvider.tsx` beyond whatever module 82 extracts; flatten, swallow or log of listener throws, rollback of inputs, reordering steps or touching `lens` (rejected by ADR-QD-177/191/INV-QD-390); unmounting children while hidden (the `useScoped` shape); rebuilding the registry on an `atoms` change.

### Architecture Approach (ARCHITECTURE.md)

Each phase edits one or two model/hook modules plus the same spec registers (ADR, BEH, INV, CCR row, `overview.md`, `traceability.md`, `spec-revise`), which is why execution is serial (`use_worktrees` false).

**Major components and what changes:**
1. `ExternalStore.ts` (devtools model): gains the one package-private collect-and-rethrow primitive; `notify` and the derived finalizer call it; barrel-free.
2. `DockModel.ts`: `configure` becomes an ordered list of idempotent steps run under the collector; `spread` made total (by listeners or by a derived rail store); step order is behaviour and stays.
3. `QadiProvider.tsx` plus a new pure `RegistryLease.ts` (the `SweepScheduler.ts` precedent: injected scheduler, no React, added to `stryker.react.mjs`'s `mutate` list): the registry's identity is stable for the provider's whole life; cleanup schedules `reset()` + re-seed, setup cancels it.
4. `DiagnosticsStore.ts` / `DiagnosticsFeed.ts`: store and `marking` deleted, pure `foldReading`, `off()` assigns `noDiagnostics`.
5. `useConfigured.ts` and callers, `LensSession.ts`, `useLens.ts`/`QuestionsPanel.tsx`, `DevtoolsDock.tsx` `DockFrame`: package-private edits, no export changes.

**Patterns to follow:** one rule stated once and consumed by name; a pure injected-timer module for a lifetime policy; idempotent steps (`HeldChoice.setList`, `sameFields`); derived stores for computed values (BEH-QD-696..698).

### Critical Pitfalls (PITFALLS.md, top five of the set; A-H per phase plus X-1..X-7)

1. **81-A/D/H: the collector must reach `spread`, must stay below the capacity check, and must keep step order.** A bigger `try` in `configure` fixes the brief's repro while `simulation.sightings !== explorer.sightings` persists on the timeline-listener path. `completeDockInputs` stays first and outside the collector (M55); step order (timeline, catalogue/roles, ports, gates, diagnostics, refresh) is observable in `AggregateError.errors`.
2. **81-C/E/F: error identity, reentrancy, healing.** Decide by the count of collected values, never by what was thrown; a nested `AggregateError` is one value. A listener that calls `configure` again must not be overwritten by the outer call's stale entry-time locals: steps read `held` when they run. There is no "dirty" flag; idempotent steps are the heal.
3. **82-A/B/C: the fix must make a disposed registry unreachable by any child at the moment its effects re-run.** The RED test needs a stable provider element, a hide longer than a macrotask, and a real consumer below; P4 passes on the defective code. Do not copy `useScoped` (SSR, first-render subject, Activity's state preservation).
4. **83-C/D: `Diagnostics.questions` is a public type change and a join-timing question; the store file and its tests are cited in three gate places.** The dock join must keep reading `held.reading?.questions`; re-pointing it at the shown reading changes when the join sees new questions. `NOT_CALLABLE_PIN_BUDGET` row, AGENTS.md §6 table and `traceability.md:579-580` move together.
5. **X-1/X-6: mutation re-close and archived record scripts.** Record the base before any edit; re-close after each review-fix round; keep new literals inside function scope (a module-scope literal adds an `Ignored` mutant); do not reformat measured files. `79-pinned-check.mjs` and `80-pinned-check.mjs` crash with ENOENT today because they hard-code `.planning/phases/QD-79-...`; run them from a scratch copy with `DIR` pointed at `.planning/milestones/v1.9-phases/`, never edit the archive, and write the invocations into `_WAVE15-CONTEXT.md`.

Others worth a plan row: 81-G (a did-spread flag skips heals and corrupts under nesting), 82-D/E (one timer per registry; never call the sweep, `scheduleTask` or `defaultIdleTTL`; assert sweeps with `makeSweepCounter`), 82-F (rebuild from the latest committed subject, not the first closure), 83-A (token guard before the fold, `Live` marked on an unchanged sample), 84-C (`choose` keeps its early return and arm-before-publish), 84-D (handlers read the store at event time), X-4 (`spec-revise.mjs` per document, README last, no `|` in entries), X-7 (executors marking requirements complete early; `String.replace` with `$` text; `grep` aliased to `ugrep`).

## Disagreements and Contested Points (each names the decision a phase's discuss step must make)

### Phase 81

| Point | Positions | Recommendation |
|-------|-----------|----------------|
| Where the collect-and-rethrow helper lives | STACK: new `runCollecting(steps: ReadonlyArray<() => void>, message)`. ARCHITECTURE: `callAll(calls: Iterable<() => void>, message)`, with `throwCollected` private to it; `notify` must keep iterating the **live** `Set` (a listener added mid-pass is called in the same pass), so never a copied array. PITFALLS: export `throwCollected` and reuse it. FEATURES: export the primitive, share it across `notify`, the finalizer and `configure`. | One package-private export in `ExternalStore.ts`, taking an `Iterable` of thunks (ARCHITECTURE's shape, STACK's intent), used by all three call sites, `throwCollected` kept private to it. Name is the discuss step's: `callAll` vs `runCollecting`; it must not be in either barrel. The two existing messages stay byte-identical (BEH-QD-656) and `configure` gets a dock-specific message asserted exactly. |
| Does `spread` become total, or does the rail become a fourth derived store | PITFALLS/FEATURES: make `spread` total (one collector used by both `spread` and `configure`). ARCHITECTURE 81-C: the rail (`catalogueOf(shown, catalogue)`) becomes the model's fourth derived store (parent: `timeline`), with `explorer.setSightings` and `simulation.setSightings` as its two listeners and `dock.setTimeline` a separate timeline listener, so the double spread disappears by construction and the `shown`/`rail` closures go. | Derived rail (81-C): it removes the double spread by construction and makes the three setters separate `notify`-protected listeners. Cost the discuss step must accept: ADR-QD-185 / BEH-QD-699 / INV-QD-390 wording moves from "three" to "four" computed stores (the rail is internal; BEH-QD-700's list of ten is unchanged), and the order "dock after the rail" must be pinned. If it rejects 81-C, `spread` must still be total on both paths and the double spread must be removed without a flag (81-G). |
| Is the double `spread` a real notification cost? | ARCHITECTURE/PITFALLS: the second spread is idempotent and publishes nothing (guards via `sameElements`). FEATURES, measured: explorer heard **2** on one capacity+catalogue configure, because `catalogueOf` builds fresh sighting objects each call, so `sameElements` never matches; CR22's explorer/simulation 3/3 would become 2/2. | Trust FEATURES' measurement over the reading; the discuss step restates BEH-QD-735's counts ("2, 2, 3, 3, 0, 1, 0, 2, 1 and 0") and CR22 with the code, and the RED test counts publishes first. The post-fix 2/2 is unmeasured (LOW until run). |
| The diagnostics `Starting`-publish window (ADR-QD-177 d5) | FEATURES: anti-feature, leave it, note in the ADR. ARCHITECTURE: out of scope, state the limit in ADR-QD-194 and the BEH. PITFALLS 81-B: decide in writing in discuss, either close it (`try { show(Starting) } finally { fork }`, the shape `TimelineFeed.configure` uses, then amend d5) in 81, or in 83 which rewrites that function, or declare it staying. Matrix rows for `diagnostics`, `services`, `questions` listeners end stuck `Starting` today and an identical configure does not heal. | The discuss step must pick one of three: close in 81, close in 83, or record as staying. Recommendation: **record as staying in 81** (state it in ADR-QD-194 / BEH-QD-741..), and make 83 the home if the owner wants it closed, since 83 rewrites that function. Either way the 81 matrix gives the three rows an explicit expected status; never let a row fail forever or pass by accident. Do not over-promise "every input applied" for those three positions. |
| Reentrancy (a listener calling `configure`) | Only PITFALLS raises it (MEDIUM, not yet seen RED). ARCHITECTURE's sketch closes over `wanted`/`fed`, which is exactly the stale-tail shape. | Steps read `held` (and `feedInputsOf(held)`) at the time each step runs, not entry-time locals. Add one row: a first-publish listener calls `configure(second)` once; the end state equals a plain `configure(second)` on a fresh model. Check `TimelineFeed.configure`'s `readSource(wanted.source)` too; fix only if its row is RED. |
| The record path (no `configure`) | FEATURES (run) and PITFALLS 81-A: a throwing explorer listener on plain `timeline.accept` leaves `dock` rows 0 and simulation sightings 0. ARCHITECTURE covers it only implicitly via the rail. | Explicit RED row on the record path in 81, whichever shape is chosen. |

### Phase 82

| Point | Positions | Recommendation |
|-------|-----------|----------------|
| Registry design | STACK and ARCHITECTURE converge: keep the render-phase, ref-held registry (SSR and first render need it), `reset()` plus re-seed in the deferred cleanup instead of `dispose()`, never null `registryRef`. ARCHITECTURE puts it in a pure package-private `RegistryLease.ts` (82-F) with `hold()`/release and an injected `defer`, added to `stryker.react.mjs`; STACK describes it inline in the provider (82-E in ARCHITECTURE's terms). FEATURES lists three candidates (liveness-gated dispose, reset, rebuild-and-rerender) and needs a spike. PITFALLS leans to "rebuild-before-reveal or never-dispose-while-hidden" and warns against skipping disposal. | **82-F `RegistryLease.ts` with `reset()` + re-seed.** It is the only shape consistent with the reproduced child-first order and is mutation-testable without React. Rejected with reasons: `useScoped`/state-held registry (SSR, first-render subject, too late on reveal), a registry proxy, dispose-only-on-unmount (React gives no hidden-vs-gone signal), never disposing. The discuss step records the accepted trade: a straggling read after a true unmount silently recreates a node instead of throwing. |
| Are hydration seeds re-applied after a recycle? | STACK: re-apply the subject **and** each `initialValues` entry. ARCHITECTURE: only the subject; re-applying server seeds after a hide could resurrect an answer the client superseded (ADR-QD-017); today's re-render path (S2) does re-seed, so this is a recorded intentional change. PITFALLS 82-F: seed from the **latest** subject, not the first closure. | Subject only, from a ref written in an effect (never in render), as ARCHITECTURE says. The discuss step must make this explicit in ADR-QD-195 and BEH-QD-067 because it changes S2's behaviour. |
| Effect-time rebuild | Rejected unanimously: children's effects run before the provider's on reveal, so a provider-built replacement cannot reach the child before it re-subscribes (reproduced: `AggregateError` of two disposed errors, the child's first). `useScoped` unusable (returns `undefined` on first pass; SSR). | Recorded as a rejected alternative with the reproduction. |
| Strengthen `edges.test.tsx:257` | FEATURES/PITFALLS: it asserts only empty body text, true after any unmount; a never-dispose fix would pass it. ARCHITECTURE: rename it. | Replace the assertion: after unmount plus a turn, a probe's registry is empty (reset ran). Under the lease design there is no `dispose()` to count, so PITFALLS' "dispose counter" becomes a reset counter on the lease's injected hooks. |

### Phase 83

| Point | Positions | Recommendation |
|-------|-----------|----------------|
| Remove `Diagnostics.questions` or keep it | STACK, FEATURES, ARCHITECTURE (Q1): remove (poll never writes it; the join reads `held.reading?.questions`; `DiagnosticsReading.questions` stays as the supplied half). PITFALLS 83-C: choose deliberately; removal keeps one path, keeping it and routing through `shownReading` changes join timing and needs a RED publish-count row first. | **Remove (Q1)**, Breaking `@qadi/devtools` minor, `## 0.13` upgrade-guide entry, amend ADR-QD-169 d10, ADR-QD-173, BEH-QD-617/323, `overview.md:916-919`. The join keeps `held.reading?.questions`. Note the owner's standing preference for the complete design and that `Diagnostics` is exported. |
| Rename `DiagnosticsStore.ts` to `Diagnostics.ts` | ARCHITECTURE: rename (the file holds no store; about 20 import lines, ~12 test files; `NOT_CALLABLE_PIN_BUDGET` row, AGENTS.md §6 line ~566, `check-house-style.mjs:771`, `traceability.md:579-580` move together; `callable: 3` holds if the three `Params<typeof runDiagnostics>` pins are rewritten to the sink parameter). PITFALLS: keep the file name, "not in this wave", delete only the store, because the file also holds the public types, `mergeReading` and `runDiagnostics`, and a missing cited test file fails `spec:verify:strict`. | The discuss step decides. Recommendation: rename, done as a pure rename commit first (green on its own), with the budget row, AGENTS.md table and traceability rows in the same commit, because a file named Store with no store is the drift this wave exists to remove. If the discuss step declines, record "kept name" in ADR-QD-196. |
| `runDiagnostics` sink shape | ARCHITECTURE: `{ accept }` for symmetry with `runSource`'s `Pick<…,"accept">` (state in the ADR); bare `(reading) => void` equally small. | `{ accept }`-shaped, matching `runSource`. Keep the span `qadi.devtools.runDiagnostics`. |
| `Starting` window | See Phase 81 row. 83 rewrites `start()`, so it is the other defensible home. | Follows the 81 decision. |

Constraints that are findings, not choices: the sink built by the feed keeps the `runs.isCurrent(token)` guard before the fold, `sampled`, and the `Live` mark on an unchanged sample (83-A); the fold returns the previous reading object itself when nothing moved (83-B); F1-F32 and the held `ConfigureFirstRender` characterisation pass unedited (83-E); change `builtFeeds.ts`'s `diagnosticsFeedOf`, not ~33 sites.

### Phase 84

| Point | Positions | Recommendation |
|-------|-----------|----------------|
| `useLens` inputs | ARCHITECTURE (c): `useLens(lens, questions)` subscribes once and **returns both** snapshots; the panel reads from the return. STACK: pass the snapshot or the store, not both. PITFALLS 84-D: same as (c); never write a ref during render. FEATURES: keep one subscription (`Lens.adapter.test.tsx:160`) and the event-time read of the store in handlers. Rejected: two subscriptions; `instances` only plus a ref (stale handlers, listener churn). | `useLens(lens, questions)` subscribing once (ARCHITECTURE (c)); handlers still read `questions.getSnapshot()` at event time. Amend ADR-QD-193's adapter paragraph and BEH-QD-737; edit `traceability.md` row 661 in the same commit. |
| `useTimeline` per-render inputs record | STACK and FEATURES: `useMemo` on `[source, capacity]` (low value). PITFALLS 84-B: memoise only `useTimeline`, never the dock's or the gates' records (G43: any configure retries a failed watch). ARCHITECTURE (c): record it as a rejection in ADR-QD-192's amendment, because the value's own rule makes it a no-op, `DevtoolsDock`'s rest spread is fresh per render by construction, and memoising one of three hooks makes them asymmetric. | Recorded rejection (ADR-QD-192 d8 amendment, CCR-QD-476 row), unless the discuss step values the fewer calls. If it memoises, only `useTimeline`, and its comment "a record rebuilt every render configures nothing" is rewritten. |
| `choose` and `move` | All agree: delete `move`, call `store.set`; `choose` keeps its `next === current` early return, its boolean and **arms before publishing**. | Mutation-check that the `LensSession.test.ts:304/378` pin fails if `armed` is set after `publish`. |
| Optional type pin for the `Configurable` constraint | STACK/ARCHITECTURE: a negative pin costs a `NOT_CALLABLE_PIN_BUDGET` row (new file; edit `check-house-style.mjs` and AGENTS.md §6 together). | Use **positive** pins only (no budget row): `DockModel`, `TimelineFeed`, `DiagnosticsFeed` assignable. Add a negative one only if the owner wants it, with its twin. |
| ADR-QD-197 | ARCHITECTURE: no new ADR; amend ADR-QD-192 d8 and ADR-QD-193; leave 197 unused and say so. | Name it unused in the CCR row; do not renumber. |

## Implications for Roadmap

Four phases, strictly serial (81 -> 82 -> 83 -> 84), exactly the owner's order. The edges are file and register adjacency, not code dependency: 81 and 83 both edit the `configure` block in `DockModel.ts`, 83 renames or edits modules that `useDiagnostics.ts` and `DevtoolsDock.tsx` import and that 84 also edits, and 82 is independent in code but stays second to keep both live defects first (it can swap with 81 safely). Every phase edits the same registers, so no parallelism.

### Phase 81: The dock's `configure` applies every input whatever a listener throws (ARCH-128, devtools, LIVE DEFECT)
**Rationale:** First: it is a live defect and 83 edits the same block. 
**Delivers:** the shared collect-and-rethrow in `ExternalStore.ts`; `configure` as ordered idempotent steps under it, reading `held` per step; total `spread` / derived rail (81-C) and one spread per change; the capacity refusal still first and uncollected.
**Features:** 81-R1..R6. **Avoids:** 81-A, C, D, E, F, G, H; decides 81-B.
**Opens with (RED on `911aa37f`):** `M57` after M56 (`DockModel.test.ts:481`): for each of `explorer`, `simulation`, `roles`, `questions`, one throwing listener, one `configure`, assert roles, `simulation.sightings === explorer.sightings`, dock rows after the resize, diagnostics not `Off`, thrown value `=== boom`; two distinct throwers give an `AggregateError` with both in step order (RED: only the last escapes); the record path (RED: 0 rows); capacity+catalogue notifies explorer once (RED: 2); a nested `configure` from a listener equals a plain `configure`; an identical second configure leaves every snapshot equal.
**Spec:** ADR-QD-194 (amends 177, 191 d11, 192 d3, 185 if 81-C); BEH-QD-741..745 (amend 465, 656, 699, 728's pinned-by, 735's counts); INV-QD-407-408 (amend 373, 390); CCR-QD-473; `CR22` counts restated with the code. Changeset `@qadi/devtools` patch; no upgrade guide.
**Gates and mutation:** `DockModel.ts` score 1 (69 killed, 12 ignored at v1.9 close) and `ExternalStore.ts` baselined before any edit; no new `Effect.fnUntraced`, `switch`, `any`, module-scope `let`; no public export change.
**Setup in its first plan:** record how the archived `79-`/`80-pinned-check.mjs` run (scratch copy, repo root) and write it, with the id table, into `_WAVE15-CONTEXT.md`.

### Phase 82: A provider's registry has one owner for its lifetime (ARCH-129, react, LIVE DEFECT)
**Rationale:** Second live defect; independent of devtools code.
**Delivers:** `packages/react/src/RegistryLease.ts` (pure, injected `defer`, `hold()`/release), `QadiProvider.tsx` lines ~217-223 and ~285-299 replaced, `stryker.react.mjs` `mutate` gains the file; the lifetime paragraph in the provider header.
**Features:** 82-R1..R4. **Avoids:** 82-A..H.
**Opens with (RED on the phase base, which is 81's close commit):** `packages/react/test/QadiProvider.lifetime.test.tsx`: a parent with `mode` state, a hoisted/`useMemo`'d `<QadiProvider><Can/></QadiProvider>` under `<Activity mode>`, an error boundary; render, settle, hide, wait a real macrotask, show; assert no captured message, `allowed` rendered, a `useSubject` probe reads the prop (observed failure: two errors, body `caught`). Companions: hidden-then-shown `useInvalidate`, a `useDevtoolsFeed` consumer under hide/show, StrictMode (one registry), hide-short control (S1b), subject changed while hidden (S4), long-hide sweep expectations from ADR-QD-148 via `makeSweepCounter`/`withSweepFork` (not from P4), headless lease tests (hold/release/hold in one tick recycles nothing; release past the timer recycles once and re-seeds only the subject; unmount recycles). Strengthen `edges.test.tsx:257`. Write the ADR's claim about React's commit order from the RED/GREEN observation, not from reasoning.
**Spec:** ADR-QD-195 (amends 014's consequence, 149, cites 148); BEH-QD-746..750 (amend BEH-QD-067 `09-react.md:334` and the SUBJ note :380-390, BEH-QD-516); INV-QD-409-410; `appendices/react-integration.md:140`; CCR-QD-474. Changeset `@qadi/react` patch (note that hydration seeds are no longer re-applied after a long hide); no upgrade guide.
**Gates and mutation:** `MODULE_STATE_BUDGET` must not grow; §13 holds (the lease owns infrastructure, never a decision); the lease is new and close-only against an absolute bar of no open mutant; `QadiProvider.tsx` stays `unmeasured` in the record.

### Phase 83: The diagnostics feed holds its reading as a value (ARCH-130, devtools, possibly Breaking)
**Rationale:** After 81 because both edit `configure`'s tail; before 84 because 84 edits the importers.
**Delivers:** pure `foldReading`; `DiagnosticsFeed` holds the reading, `off()` assigns `noDiagnostics`; `runDiagnostics(sink, options)`; `marking`, store, `subscribe` deleted; `Diagnostics.questions` removed; field list stated once.
**Features:** 83-R1..R5. **Avoids:** 83-A..E.
**Opens with:** a characterisation green on the base and kept green (build, configure, first sample, unchanged sample, one-field-changed sample, defect, restart-after-stop, `configure(undefined)`: status tag, per-field identity, publish count), then a RED type pin that `Diagnostics` has no `questions` with its positive twin, and a RED `mergeReading` test; late sample after supersede, restart keeps the reading, off resets, `Live` on an unchanged sample, N identical samples publish nothing after the first.
**Spec:** ADR-QD-196 (amends 173, 169 d10); BEH-QD-751..755 (amend 323, 617, 637, 639, 640, 699); INV-QD-411-412 (amend 314, 366); CCR-QD-475; `traceability.md:579-580`, `overview.md:916-923`, `surface.tst.ts:244-265`. **Breaking `@qadi/devtools` minor** changeset plus `## 0.13` entry in `apps/website/src/content/docs/docs/reference/upgrading.md` (fences are compiled; the `0.12`/`0.13` sections that read `reading.hydration` must keep compiling).
**Gates and mutation:** `NOT_CALLABLE_PIN_BUDGET` row + AGENTS.md §6 + `check-house-style.mjs:771` edited together if the file is renamed; gate 14 run once at the phase close (it compiles `makeDiagnosticsFeed`); gate 12 clean (no new "no longer" prose outside a `>` blockquote); mutation base for `DiagnosticsFeed.ts`, `DiagnosticsStore.ts` (60/60 at ADR-QD-169) and `DockModel.ts`, new file keeps the old score.

### Phase 84: `useConfigured` takes a value that has `configure`, plus four small finds (ARCH-131, devtools)
**Rationale:** Last: smallest, no live defect, and it edits files 83 touches.
**Delivers:** the three adapters deleted; `LensSession.move` deleted; `useLens(lens, questions)`; one `DockFrame` stop-notice helper (`useStopNotice` with one generic `StoppedNoticeProps<S>`, each use with its own `useRef`, memo deps `[status, model]`); the `useTimeline` record decision recorded.
**Features:** 84-R1..R5. **Avoids:** 84-A..F.
**Opens with:** characterisations green on the base before any edit: `useConfigured.test.tsx` U1-U4 re-expressed over an object double with `configure` (its double passes a function today), `LensSession.test.ts:304/378` mutation-checked, `Lens.adapter.test.tsx:160` one-subscription pin; `ConfigureFirstRender` and `Lens.dock` characterisations stay unedited. No RED (no defect).
**Spec:** amend ADR-QD-192 (d8) and ADR-QD-193; BEH-QD-756..760 only for the hook and lens-return contract (amend 734, 737, 736's pinned-by lists); INV-QD-413-414 only if the lens return needs one; ADR-QD-197 named unused; CCR-QD-476. Changeset: none, or a `@qadi/devtools` patch stating "no export changes".
**Gates and mutation:** `LensSession.ts` re-measured (52/52, no open mutant); `src/react` hooks are outside the devtools Stryker config, so list them `unmeasured`; positive pins avoid a budget row.

### Phase Ordering Rationale

- 81 before 83: same `configure` block; 83 must not re-introduce an unguarded step.
- 82 anywhere in code terms; second by the owner's order so both live defects land first.
- 83 before 84: 83 changes the module that `useDiagnostics.ts` and `DevtoolsDock.tsx` import, and 84 edits both; doing 84 first re-touches the import lines and churns `useConfigured.test.tsx` twice.
- Every phase's last plan edits the same spec registers, so no phase runs in parallel.
- Each defect phase opens with a RED test seen failing on the phase base for the named reason, with the output saved (`NN-RED-EVIDENCE.md`); each measured file gets a Stryker base before any edit and a re-close after the review rounds.

### Research Flags

- **Phase 81: discuss-phase decisions, no external research.** Decide: helper name and shape (`callAll` vs `runCollecting`, `Iterable`, live `Set`), derived rail vs total `spread`, the `Starting` window (close in 81, close in 83, or stays), reentrancy (steps read `held`), and the restated BEH-QD-735/CR22 counts. Open the plan with a ten-store matrix plus the record path.
- **Phase 82: needs `/gsd-plan-phase --research-phase 82` or a spike.** The RED test must be seen failing first on the phase base, and the ADR's claims about React's commit order must come from that observation. Open questions the spike answers: does `reset()` + subject re-seed hold under StrictMode, two providers on one atom set, and the sweep (pressure-episode forks) after a long hide; does `reset()` leave the `Atom.runtime` layer scope released at a true unmount.
- **Phase 83: standard patterns** (mirrors 81/`runSource`), but its discuss step makes the three decisions in the table (questions removal, rename, `Starting` window) and confirms the Breaking changeset.
- **Phase 84: standard patterns.** The discuss step decides `useLens` return shape and the `useTimeline` record; check type inference of `useConfigured<A, I>` with positive pins.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every version read from installed `node_modules`; `AtomRegistry` `reset`/`dispose`/`setInitialValue` and Activity semantics probed on 19.3.1 (Activity semantics reproduced on that version only). |
| Features | HIGH / MEDIUM | Current behaviour read at file:line and reproduced (ten-store matrix, six Activity scenarios). MEDIUM on post-fix counts: 81's 2/2, 82's `reset()` as owner, and the StrictMode registry-leak case were not run. |
| Architecture | MEDIUM-HIGH | Code facts HIGH; candidate shapes are reasoned, not built. 82-F is MEDIUM until the RED test runs. |
| Pitfalls | HIGH / MEDIUM | Repo mechanics, budgets and prior-wave failures HIGH; reentrancy (81-E) and the child-consumer-throws-first claim (82-A) are code-derived there, but 82-A was reproduced in STACK and ARCHITECTURE. |

**Overall confidence:** HIGH for 81, 83, 84; MEDIUM for 82's design until RED/GREEN.

### Gaps to Address

- **Double-spread notification cost:** FEATURES' measurement (explorer heard 2) contradicts ARCHITECTURE/PITFALLS' reading (second spread publishes nothing). Count publishes first in 81's RED.
- **`Starting`-window disposition:** unresolved across the researchers; the 81 discuss step decides (see table), and three matrix rows depend on it.
- **Reentrancy:** not yet seen RED; confirm during 81.
- **82's accepted trade and S2 behaviour change:** a late read after unmount recreates a node silently; hydration seeds not re-applied after a long hide. Both need explicit ADR text and a changeset note; owner has not seen them.
- **`QadiProvider.tsx` mutation:** not measured; only the lease module will be.
- **Archived record scripts:** `79-pinned-check.mjs`/`80-pinned-check.mjs` hard-code old paths (ENOENT today); `79-`/`80-characterisation-check.mjs` pass. A scratch-copy invocation must be decided in 81's first plan; new wave scripts must take their directory from `import.meta.url`.
- **Unrun in research:** any fix, the `reset()` owner in the real provider, `useConfigured` inference with positive pins, gate 14 after the 83 type change.
- **Hygiene:** the untracked throwaway `packages/react/test/zzThrowaway82.test.tsx` that ARCHITECTURE cites is not present now (verified); no throwaway file may exist when a mutation base is recorded or at any commit.

## Sources

### Primary (HIGH confidence)
- `node_modules/effect/src/reactivity/AtomRegistry.ts` (`make`, `reset`, `dispose`, `createNode`), `node_modules/@effect/atom-react/src/RegistryContext.ts` (installed 4.1.2).
- `packages/devtools/src/model/{DockModel,ExternalStore,TimelineFeed,GatesFeed,DiagnosticsFeed,DiagnosticsStore,LensSession,Catalogue}.ts`, `src/react/{useConfigured,useScoped,useDockModel,useDiagnostics,useTimeline,useLens}.ts`, `DevtoolsDock.tsx`, `QuestionsPanel.tsx`; `packages/react/src/{QadiProvider.tsx,SweepScheduler.ts}`; the existing tests M55/M56, CR22, P4, `edges.test.tsx:257`, `Lens.adapter.test.tsx:160`.
- Spec: ADR-QD-014, 047, 148, 149, 169, 173, 177, 185, 191, 192, 193; BEH-QD-067, 323, 465, 516, 617, 637, 640, 656, 696-700, 728, 731-737; INV-QD-314, 366, 373, 390, 401-406; `AGENTS.md` §4-§6, §9, §13, §15-§17.
- Throwaway runs (deleted): ten-store throw matrix, record path, two-throw and double-spread probes (81); six Activity scenarios S1-S6 and two React probes (82); `AtomRegistry` reset/dispose probe.

### Secondary (MEDIUM confidence)
- Prior-wave records for process pitfalls: `.planning/RETROSPECTIVE.md` (v1.8, v1.9), `.planning/milestones/v1.9-MILESTONE-AUDIT.md`, v1.9 phase record scripts and `80-mutation-close.json`, `.planning/phases/_WAVE14-CONTEXT.md`, `_SHARED-CONTEXT.md`.
- `/private/tmp/claude-502/.../scratchpad/wave15-brief.md` (the four candidates; project-internal).

### Tertiary (LOW confidence)
- Post-fix notification counts (81), `reset()` as owner in the real provider (82), StrictMode registry leak (unmeasured).

---
*Research completed: 2026-11-24*

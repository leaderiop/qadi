# Pitfalls Research

**Domain:** Effect v4 authorization monorepo, internal architecture wave. v1.10 Arch Wave 15, Phases 81-84 (ARCH-128..131), strictly serial 81 -> 82 -> 83 -> 84.
**Researched:** 2026-11-24
**Confidence:** HIGH for repo-specific mechanics (read from source, scripts and prior-wave records; the throw matrix below was run on this tree). MEDIUM for the Phase 82 child-consumer claim and for reentrancy (derived from code reading, not yet seen RED; each says so).

Evidence labels: **[run]** = observed on this tree today; **[read]** = read from source/spec at the cited location; **[prior]** = a v1.8/v1.9 record (`RETROSPECTIVE.md`, `v1.9-MILESTONE-AUDIT.md`, phase dirs under `.planning/milestones/v1.9-phases/`).

---

## Critical Pitfalls

### Pitfall 81-A: Guarding `configure` the same incomplete way again (the collector must reach `spread` itself)

**What goes wrong:** The fix wraps a bigger `try`/`finally` in `DockModel.configure` (`packages/devtools/src/model/DockModel.ts` ~403-431) and still leaves the fan-out unguarded. `spread()` (~341-346) is `explorer.setSightings; simulation.setSightings; dock.setTimeline` in plain sequence, and the dock's own timeline listener (~349-356) calls it. A throwing explorer listener therefore skips `simulation.setSightings` and `dock.setTimeline` on an ordinary `timeline.accept` as well, not only inside `configure`.
**Why it happens:** The defect was reported as "configure skips steps", so the fix is shaped like configure. The same unguarded sequence is one level down.
**Consequences:** The repro passes (roles apply) while simulation sightings still differ from explorer sightings after a capacity change, because that path goes timeline listener -> `spread` -> explorer throws.
**Prevention:** One collecting runner (an ordered list of thunks, each in its own `try`, thrown values pushed, one rethrow at the end) used by both `spread` and `configure`. Put the step list in one place so Phases 83 and 84, which add or remove a step, edit one list.
**Warning signs:** RED test only configures; no RED row throws from the explorer subscriber during a plain `timeline.accept`.
**Phase:** 81.
**Evidence:** [run] A ten-store throw matrix (one throwing listener per store, `configure({capacity:5, catalogue, diagnostics:{}, questions, reading})`, then the identical `configure` again), run today before the throwaway files were deleted: explorer -> roles `[]`, `simulation.sightings !== explorer.sightings`, still unhealed on the second call; simulation -> roles `[]`, diagnostics `Off`; roles, questions -> diagnostics `Off` after the first call. [read] ADR-QD-191 decision 11 (`spec/decisions/191-...md:94`).

### Pitfall 81-B: The diagnostics `Starting` window makes "apply every input" false for three listener positions

**What goes wrong:** Even with perfect collection, a throw on the `Starting` status the diagnostics feed publishes leaves the poll unforked and stuck `Starting`, and the identical `configure` does not heal it (`held = wanted` is assigned first; the next call hits the `sameFieldsOrAbsent` early return). `DiagnosticsFeed.ts` `start()` publishes `show(Starting)` before `runs.fork(...)`, and `configure` sets `held` before `start`. [read]
**Why it happens:** ADR-QD-177 decision 5 explicitly left the `begin()`-to-`fork()` window out of scope. It is reachable from far more listeners than "a diagnostics subscriber": the `services` and `questions` derived stores follow `shownReading`, which follows the diagnostics feed, so their listeners also throw inside that publish.
**Consequences:** Phase 81's own success statement ("every input applied whatever a listener throws") is false for diagnostics, services and questions listeners; a RED matrix written over all ten stores will either fail forever or have to special-case three rows.
**Prevention:** Decide in Phase 81's discuss step, in writing: either close the window (`try { show(Starting) } finally { fork }`, the shape `TimelineFeed.configure` already uses, then amend ADR-QD-177 decision 5) or declare the three rows out of scope and say so in the BEH. Do not discover it in review. Phase 83 rewrites this exact function, so closing it there is the other defensible home; if so, Phase 81's matrix must mark the rows and Phase 83 must flip them.
**Warning signs:** After the first configure `diagnostics.getSnapshot().status._tag === "Starting"` and stays so after `await settle`.
**Phase:** 81 (decide), 83 (if closed there).
**Evidence:** [run] matrix rows: `diagnostics` listener -> status `Starting` after both calls; `services` -> `Starting` after both; `questions` -> second `configure` throws again and status ends `Starting`.

### Pitfall 81-C: Error identity: single throw vs AggregateError, and the collector's copy of the convention

**What goes wrong:** (a) The collector wraps one throw in an `AggregateError`, or rethrows `errors[0]` of two; (b) it tests `thrown instanceof Error` or `thrown !== undefined` to decide "did something throw" (a listener may throw `undefined` or `null`); (c) it flattens a nested `AggregateError` (the timeline step's own throw may already be one from `notify`); (d) it re-implements `throwCollected` locally, giving a second copy of a contract ADR-QD-177 states once.
**Why it happens:** `throwCollected` is module-private in `ExternalStore.ts` (line ~63), so the cheap route is a local copy.
**Consequences:** `assert.strictEqual(run.thrown, boom)` in M56 (`DockModel.test.ts:481`) breaks for the one-throw case; hosts see different shapes from `notify` and from `configure`; the exact message literal drifts.
**Prevention:** Decide by the count of collected values, never by what was thrown (ADR-QD-177 decisions 2-3): none -> return, one -> that value itself (`undefined`/`null` included), two or more -> one `AggregateError` with `errors` in step order, never flattened. Export `throwCollected` from `ExternalStore.ts` (the module is already package-private, `sameFields` is exported the same way) and reuse it with a dock-specific message that the test asserts exactly. Record the message in the BEH and the ADR amendment. A nested `AggregateError` from one step is one value: assert the tree shape (`errors[i]` is itself an `AggregateError`).
**Warning signs:** A diff that adds a second function with `new AggregateError` in `DockModel.ts`.
**Phase:** 81.

### Pitfall 81-D: Collecting the capacity refusal (the one throw that must NOT be collected)

**What goes wrong:** The collector wraps the whole `configure` body including `completeDockInputs(next)`, so `emptyTimeline`'s refusal of `-1`/`NaN`/`2.5` is collected, the rest of the inputs are applied, and the refusal is rethrown last. That contradicts ADR-QD-191 decision 11: "A refused capacity throws with the dock's inputs ... untouched" and "The dock tells a refusal from a listener's throw by position, never by reading the error."
**Prevention:** The check stays above the collector, before `held = wanted`. M55 (`DockModel.test.ts`, "refused ... changes nothing") must pass unedited; Phase 79's `79-pinned-check.mjs` pins M55 and M56 by label.
**Warning signs:** M55 needs an edit; `seen.calls` becomes non-zero in it.
**Phase:** 81.

### Pitfall 81-E: Reentrancy: a listener that calls `configure` again, while the outer call still holds captured values

**What goes wrong:** `configure` captures `wanted`, `before` and `fed = feedInputsOf(wanted)` once and then runs steps from those locals. A listener (host code) that calls `model.configure(second)` during the outer publish runs a complete nested configure; the outer then continues with its stale locals (`simulation.setPorts(wanted.ports)`, `gatesFeed.configure(fed.gates)`, `diagnosticsFeed.configure(fed.diagnostics)`) and overwrites the nested call's inputs. The dock's `held` says "second" while the stores show "first". `before` is stale too, so the `wanted.catalogue !== before.catalogue` test decides from the wrong baseline. The same shape exists one level down: `TimelineFeed.configure` ends in `finally { readSource(wanted.source) }`, a stale `wanted` after a nested call. [read; MEDIUM until seen RED]
**Why it happens:** With the old early-exit behaviour a throwing listener hid the problem; collecting makes the outer always continue, so the stale tail now always runs.
**Prevention:** Steps read `held` (and `feedInputsOf(held)`) at the time each step runs, never the entry-time locals; or apply in a drain loop until `held` is stable. Add one RED/GREEN row: a listener on the first publish calls `configure(second)` exactly once, and the end state must equal a plain `configure(second)` on a fresh model (compare every store snapshot). Bound the recursion by relying on the per-field no-op rule (an identical nested call changes nothing), and say in the BEH that a listener that changes inputs on every notification does not terminate, as with any store.
**Warning signs:** Any step in the new runner that closes over `wanted` or `fed`.
**Phase:** 81 (also read `TimelineFeed.ts` `readSource(wanted.source)`; fix there only if the nested row is RED, with its own pin).

### Pitfall 81-F: "Held inputs assigned before publishing" misread as a healing mechanism

**What goes wrong:** `held = wanted` before the timeline step is load-bearing (the dock's own timeline listener reads `held.catalogue` in `spread`). Two wrong conclusions follow: (1) moving the assignment after the steps "to make failure atomic" breaks the rail on a capacity+catalogue change; (2) keeping step gates like `if (wanted.catalogue !== before.catalogue)` means that after any step skipped, an identical `configure` is a no-op for that step (`before` is already `wanted`). That is the "does not heal" half of the defect.
**Prevention:** Once every step runs under the collector nothing is skipped, so there is nothing to heal; do not add a "dirty" flag. Make each step idempotent through the guard the target store already has (`ExplorerSession.setSightings` via `choice.setList`, `SimulationSession.setSightings` via `withSightings`, `DockSession.setTimeline` via `next === timeline`, `roles.setList` via `sameElements`), and call the catalogue steps unconditionally, or key them on `held` rather than `before`. Pin: after a throwing configure, an identical configure leaves every snapshot equal.
**Phase:** 81.

### Pitfall 81-G: "Fixing" the double `spread` with a did-spread flag

**What goes wrong:** On a capacity+catalogue change the timeline listener spreads and the finally spreads again. A flag ("the listener already spread") looks like the fix, but if the listener's spread threw partway, the flag says done and the heal is skipped; the flag also becomes state that a nested configure (81-E) corrupts.
**Why it is lower value than it looks:** each target is guarded, so the second spread publishes nothing; the cost is a second `catalogueOf` computation. [read: `ExplorerSession.ts:253`, `SimulationSession.ts:501`, `DockSession.ts:98`]
**Prevention:** Count publishes in a RED test first. If the second spread publishes nothing, either leave it (idempotent) and record that, or compute the rail once and call the three setters once from `configure` only when the timeline did not spread. Never gate on "entered", only on "completed without throwing", and prefer not to gate at all.
**Phase:** 81.

### Pitfall 81-H: Reordering steps changes what listeners see and what tests pin

**What goes wrong:** Order is behaviour: the gates apply before `shownReading.refresh()` so one `configure` publishes one join and reads no registry the host just handed away; the dock's timeline subscription is created first "so the rail moves first". A runner that reorders (for example all store setters first) silently changes the join's publish count and which snapshot a host listener sees mid-configure. The `AggregateError.errors` order is the step order, so it is also contract.
**Prevention:** Keep today's order exactly: timeline step, catalogue (`spread`, `roles.setList`), `simulation.setPorts`, `gatesFeed.configure`, `diagnosticsFeed.configure`, `shownReading.refresh`. State the order in the BEH and pin it with a two-throwers row asserting `errors` order.
**Phase:** 81 (and 83/84 must not reorder when they edit the list).

---

### Pitfall 82-A: Fixing only the throwing line; child consumers throw on the same disposed registry

**What goes wrong:** `QadiProvider.tsx` line ~258 (`registry.get(atoms.subject)` in the subject effect) is where the reproduction throws, but a guard or rebuild there is not enough. Every consumer reads the same registry through `RegistryContext`, and `@effect/atom-react`'s hooks use `useSyncExternalStore(store.subscribe, ...)` whose subscribe calls `registry.subscribe(atom, ...)`, and `useEffect(() => registry.mount(atom), [atom, registry])`. On reveal React re-runs effects children-first, so a `Can`/`useDecision` below the provider subscribes to the disposed registry before the provider's own effect runs, and `AtomRegistry`'s node lookup throws `Cannot access Atom ...: registry is disposed` (`AtomRegistry.js:330`). [read; MEDIUM: not run]
**Prevention:** The RED test mounts a real consumer (`Can`) inside the hidden-then-shown provider and asserts nothing throws anywhere, not only that the provider's effect survives. A fix must make a disposed registry unreachable by any child at the moment its effects re-run (rebuild before reveal and hand children the new one, or never dispose while a hide is still possible).
**Phase:** 82.

### Pitfall 82-B: P4 passes because it re-renders the provider; the RED test must keep the provider element stable and hide longer than a macrotask

**What goes wrong:** `QadiProvider.sweep.test.tsx` P4 (line 136) calls `rerender(ui("hidden")); rerender(ui("visible"))` with a fresh `QadiProvider` element each time and in one tick, so the dispose timer (`setTimeout(0)`) is cancelled by the effect re-run, and where it is not, the re-render's `registryRef.current ??=` rebuilds. Neither condition reproduces the defect.
**Prevention:** The RED test: a parent component with state toggles `<Activity mode>`; the provider element is created once (hoisted, or `useMemo`) so React bails out of re-rendering it; wait at least one real macrotask while hidden (`await settle()` is 20 `Effect.yieldNow` turns, which is plenty); then show. Assert the disposed-registry error is the failure on the phase base (Phase 81's close commit, since the wave is stacked), not an unrelated `act` warning. Add the matrix: plain unmount, StrictMode, hide-short, hide-long, hide-long under StrictMode, two providers sharing one atom set.
**Phase:** 82.

### Pitfall 82-C: Moving the registry into an effect/state (the `useScoped` shape) breaks SSR and the first-frame subject

**What goes wrong:** `useScoped` (`packages/devtools/src/react/useScoped.ts`) is the repo's reference for Activity-safe lifetimes, and it works by building in a layout effect and clearing state on cleanup so children unmount. Copying it to `QadiProvider` means (a) no registry on the server or on the first render, so server rendering and hydration of guarded components render nothing; (b) the documented rule that the subject is seeded at registry construction "so the first render already has it ... Writing it afterwards would show every guarded control in its pending state for one frame" is violated; (c) unmounting children on hide discards the very state `Activity` exists to preserve; (d) the provider-level `"use client"` rule in `spec/behaviors/09-react.md` (a Client Component is still rendered to HTML) is breached. Devtools could take that trade because it is a client-only dev panel.
**Prevention:** The registry must still exist during the first render pass. Build it in render (lazily, as today) and move only disposal and revival under effect control, or stop disposing on hide. Take the Activity lesson from `useScoped` (the value a child reads must never be a closed one), not its mechanism.
**Phase:** 82.

### Pitfall 82-D: A leaked or double-owned registry from the disposal bookkeeping

> **Corrected:** 2026-11-25 — never releasing does not leak the runtime layer scope: on effect 4.1.2 idle removal already releases an unsubscribed `Atom.runtime` layer. It retains the `keepAlive` nodes (the subject, the seed grants, the runtime's layer atom and host `initialValues` atoms) past the provider's life, and the recycle (`registry.reset()`, one macrotask after the last release) replaces the disposal bookkeeping below (ADR-QD-195).

**What goes wrong:** Today one `disposeTimer` ref serves every registry. If the fix ever changes the registry identity while an old one is pending disposal, the new effect's `clearTimeout(disposeTimer.current)` cancels the old registry's timer and it is never disposed (its `Atom.runtime` layer scope, with a `DecisionCache` or sink, leaks). Conversely, disposing in a timer and also rebuilding eagerly can dispose the registry a child already adopted. There is no public `disposed` getter on `AtomRegistry` (it is a field of the implementation class, absent from `AtomRegistry.d.ts`), so "is it disposed?" by try/catch on the error text is brittle and a render-time check cannot be made.
**Why it happens:** A render-phase `??=` also creates a registry in every discarded render (Suspense, interrupted concurrent render); `AtomRegistry.make` allocates no timer or fiber until a node is read, so that leak is harmless, but a registry that was read in a render that never commits is not.
**Prevention:** One owner per registry, one timer per registry (a closure over that registry, not a shared ref), an own `disposed` flag set where `dispose()` is called, disposal idempotent, and a test that asserts disposal observably. The existing test "disposes its registry when unmounted" (`edges.test.tsx:257-267`) asserts only that the document is empty, which is true whether or not `dispose()` ran: replace the assertion with a spy/counter on `dispose` or an `atoms` read that must throw. Do not skip disposal to dodge the bug; it leaks the runtime layer scope on a true unmount.
**Phase:** 82.

### Pitfall 82-E: Interplay with the sweep scheduler (ADR-QD-148, INV-QD-315/316)

**What goes wrong:** `registry.dispose()` resets every node, which releases readers and fires the question book's "release to zero while over the bound" signal inside the dispose call stack. The scheduler defers the sweep with `Effect.yieldNow` precisely because "a registry disposes and re-reads in one synchronous stack" (`SweepScheduler.ts` header). A fix that disposes and rebuilds synchronously, reads in the same stack, or calls `book.sweep()` / `atoms` helpers directly puts a sweep inside that window and a held question reads as zero. Also: a hidden provider's readers are released, so under pressure its gate's question is cold and may be evicted during the hide and re-admitted once on reveal (ADR-QD-148 "a render-phase read that commits after a sweep is re-admitted once"). P4's assertion "keeps its gate's question" holds for a one-tick hide and is false in general for a long hide.
**Prevention:** (1) Never call the sweep, `scheduleTask` or `defaultIdleTTL` (ADR-QD-148, CCR-QD-150; they dropped a required render). (2) Write the long-hide expectations from the ADR, not from P4: assert forks and sweeps with `makeSweepCounter`/`withSweepFork` (`support/sweepCounter.ts`) at the three read points the file header names, and assert "one fork per pressure episode" survives a dispose plus rebuild. (3) `v4-reactivity-smoke.test.ts` pins the registry timings the trigger relies on; run it after any change to disposal timing. (4) `settle()` is a fixed 20 turns because `TestClock` does not control `Effect.runFork`: do not switch these tests to fake timers.
**Phase:** 82.

### Pitfall 82-F: Rebuild seeds a stale subject, or silently changes the `atoms`-replaced contract

**What goes wrong:** `initialValues` is read once from the first render's props (`registryRef.current ??= AtomRegistry.make({ initialValues: [[atoms.subject, subject], ...] })`). A rebuild after a long hide that reuses the first closure seeds an out-of-date subject (a revoked user's verdicts re-appear until the effect corrects them: a security-visible flash). Separately, the existing `AtomsReplaced` signal documents that the registry is "built once at mount and never rebuilt for a later `atoms` prop"; a rebuild path that picks up the current `atoms` changes what that warning means.
**Prevention:** Build from the latest committed props (a ref updated in an effect, never written in render) and keep `atomsIdentityRef`'s semantics; update the signal's doc and `spec/behaviors/09-react.md` BEH if the meaning changes. Re-run `DeveloperSignalReporters.test.tsx`.
**Phase:** 82.

### Pitfall 82-G: AGENTS.md section 13 and the budgets the fix can trip

**What goes wrong:** (a) A module-scope `let` to share "the latest registry" trips `MODULE_STATE_BUDGET` (`scripts/check-house-style.mjs`; the one allowed row is `DeveloperSignals.ts`, count 1). (b) Holding a decision in `useState` violates section 13. A registry is not a decision, but state that stores a verdict or its `AsyncResult` does. (c) `DECISION_READ_BUDGET` refuses `isSuccess`/`waiting`/`previousSuccess` reads outside two files. (d) `console` or `process.env` for diagnostics trips `no-ambient-console`. (e) `@effect/atom-react` stays the only glue; no new dependency.
**Phase:** 82.

### Pitfall 82-H: The provider is outside the mutation gate

**What goes wrong:** `stryker.react.mjs` mutates only `DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts`, `SweepScheduler.ts`; Phase 80's record lists `QadiProvider.tsx` under `unmeasured` ("held by its tests, the type pin and the coverage threshold"). A lifecycle rule left inline in the component is therefore checked by nothing but tests.
**Prevention:** If the revive/dispose rule is non-trivial, extract it as a headless module (the `LensSession` precedent: new file, close-only, absolute bar "no open mutant") and add it to `stryker.react.mjs`'s `mutate` list; otherwise write `unmeasured` into the phase's mutation record with the reason. Note `pnpm mutation` (all seven configs) runs only in full `pnpm check`, not `check:pr`.
**Phase:** 82.

---

### Pitfall 83-A: Deleting the store but breaking the late-sample and continuity rules

**What goes wrong:** The feed today holds a replaceable `store` and wraps it in `marking` (`DiagnosticsFeed.ts` `start()`), whose `accept` checks `runs.isCurrent(token)` before `target.accept`, then sets `sampled = true` and marks `Live` itself ("`accept` returns early on an unchanged reading, so Live is marked here, not by its notify"). `off()` replaces the store and clears `sampled`; a restart or changed field keeps the last reading and `sampled`. A value-folding rewrite that (a) folds before the `isCurrent(token)` check lets a superseded run's late sample overwrite the newer run's reading; (b) resets the reading on every `start` (a flash of `noDiagnostics`, and `Stopped.sampled` lies); (c) forgets that `Live` must be set even when the reading is unchanged.
**Prevention:** The `accept` sink handed to `runDiagnostics` (as `runSource` takes `Pick<TimelineStore,"accept">`) is built by the feed and keeps the token guard, the `sampled` flag and the `Live` mark; the pure fold is only `(held, next) => held'` keep-if-equal per field. Keep `DiagnosticsFeed.test.ts` rows for stop-keeps-reading, restart-keeps-reading, off-resets and late-sample-after-supersede passing unedited.
**Phase:** 83.

### Pitfall 83-B: The per-field fold's equality and identity semantics

**What goes wrong:** `makeDiagnosticsStore.accept` keeps each field's previous reference when `Equal.equals(previous, next)` and publishes only if some field moved; `shownReading`'s derived store compares by `sameFields` over `{fed, supplied}`, so identity of the feed's snapshot is the contract (INV-QD-314: "keeps its identity"). A fold that rebuilds `{status, reading}` each tick, or returns a fresh `reading` object when no field moved, republishes every two seconds and re-renders every panel. `portCalls` is a log: `Equal.equals` over it is O(n) per tick (existing cost; do not add a second pass).
**Prevention:** Return the previous reading object itself when every field kept its reference; one test counts publishes over N identical samples. Keep `mergeReading` returning `sampled` itself when nothing is supplied.
**Phase:** 83.

### Pitfall 83-C: "Resolve `Diagnostics.questions`" is a public type change and a join-timing change

**What goes wrong:** `Diagnostics` and `DiagnosticsReading` are public (`src/index.ts:37-40`; `spec/overview.md` rows ~916-919). `runDiagnostics` always writes `questions: undefined`; the field is live only when a host *supplies* `reading.questions` (merged by `mergeReading`). The dock join reads `held.reading?.questions` (`DockModel.ts` ~378), a deliberate second path: it reads `held` at key time, while `shownReading` is refreshed last in `configure`. Re-pointing the join at `shownReading.getSnapshot().reading.questions` moves when the join sees new supplied questions: the gates feed's publish would join with the old questions and the later `shownReading.refresh()` would join again, breaking "one `configure` publishes one join" and "no snapshot pairs a question from one moment with a guard from another" (comment ~371-373).
**Prevention:** Choose deliberately: (1) remove `questions` from `Diagnostics` and keep the join reading `held.reading?.questions` (Breaking type change, one path stays); or (2) keep the field and route through `shownReading` (join timing changes; needs a RED publish-count test first). Either way: `surface.tst.ts`, `ConfigureInputs.tst.ts`, the README compiled fence (`packages/devtools/README.md` ~218-220), website `devtools.md`, `spec/overview.md` rows, `check-package-install.mjs` consumer (line ~698 dock props), a Breaking changeset and an upgrade-guide section (v1.9 had one per Breaking minor, `upgrading.md`). Amends ADR-QD-173; INV-QD-314 and INV-QD-366 `Source` lines name these functions.
**Phase:** 83.

### Pitfall 83-D: Silent, three-place breaks when `DiagnosticsStore.ts` or its tests move

**What goes wrong:** `DiagnosticsStore.ts` is not just the store: it holds the public `Diagnostics`, `DiagnosticsOptions`, `DiagnosticsReading`, `WiringRead`, `mergeReading`, `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS` and `runDiagnostics`. Deleting the interface/`makeDiagnosticsStore` is fine; renaming or deleting the file or its two test files is not free. `spec/traceability.md:579-580` cites `packages/devtools/test/model/DiagnosticsStore.test.ts` and `.tst.ts` (check #6 of `spec:verify:strict` fails if a cited test file is missing); `AGENTS.md:566` and `scripts/check-house-style.mjs:771` carry the `DiagnosticsStore.tst.ts` row (`callable: 3`) for `NOT_CALLABLE_PIN_BUDGET`, checked in both directions (`[not-callable-pin-table]`); `surface.tst.ts:244-265` pins `makeDiagnosticsStore`, `runDiagnostics`, `DiagnosticsStore`, `noDiagnostics` as not exported; ~8 test files and 7 spec documents import or name the file. `ConfigureRule.test.ts` and `builtFeeds.ts` import `DiagnosticsOptions` from it.
**Prevention:** Keep the file name and the public types in place; delete only the store. If `runDiagnostics`'s first parameter changes to an accept sink, keep the three negative pins through `Params<typeof runDiagnostics>` (a bare negative pin on an Effect-returning function passes vacuously, section 6 "A negative type pin can fail") each with its positive twin; keep `callable: 3` or edit AGENTS.md table, the budget and the traceability row in one commit. The devtools barrels refuse `export *` and must stay alphabetical (`[devtools-named-barrel]`).
**Phase:** 83.

### Pitfall 83-E: The `ConfigureRule` sweep and the first-render characterisation

**What goes wrong:** `ConfigureRule.test.ts` is keyed by a complete record per input type (a new field fails to compile until it has a row), and `ConfigureFirstRender.characterisation.test.tsx` is held byte-for-byte to its first commit (`cf3186d9`) by `79-characterisation-check.mjs`. A change to how the feed holds its reading changes the first render's `Off -> Starting` sequence only if the feed's idle stand-ins or `idleDiagnostics` change; if a pin has to follow the change, the phase has changed behaviour it was not meant to.
**Prevention:** Run the held characterisation unedited at every plan; any needed flip is declared in a record as v1.9 Phase 80 did (`80-characterisation-check.mjs`: "4 of 4 flips applied"), never an edit of the held file. ~33 `DiagnosticsFeed.test.ts` sites go through `diagnosticsFeedOf` (`builtFeeds.ts`): change the helper, not the sites.
**Phase:** 83.

---

### Pitfall 84-A: `useConfigured(make, inputs)` inference and the call frequency it keeps

**What goes wrong:** With `A extends { configure(inputs: I): void }`, `I` is inferred from two sites. `DiagnosticsFeed.configure` takes `DiagnosticsOptions | undefined`; `useDiagnostics(options?)` passes an optional; `TimelineFeedInputs` fields are `| undefined` under `exactOptionalPropertyTypes`. A wrong inference widens silently, or method bivariance accepts a mismatched input. `useConfigured` still calls `configure` in two places (inside the scoped build and in the layout effect keyed `[value, inputs]`); removing either regresses the first render (a commit that reads a dock model before it was handed its gates says it was handed none).
**Prevention:** Add positive and negative type pins (`.tst.ts`; the hooks return plain values, so bare negative pins are legitimate, but each is a counted row in `NOT_CALLABLE_PIN_BUDGET`: update AGENTS.md table and the budget together) and keep `useConfigured.test.tsx`. `79-characterisation-check.mjs` must still pass with the held file unedited. Update `useConfigured`'s doc ("takes a `configure` adapter" wording, and `useDockModel.ts`/`useDiagnostics.ts`/`useTimeline.ts` comments) in the same plan.
**Phase:** 84.

### Pitfall 84-B: Memoising `useTimeline`'s inputs changes when `configure` runs

**What goes wrong:** `useTimeline.ts:44` builds `{ source, capacity }` each render, so `useConfigured`'s layout effect runs `feed.configure` after every render (a no-op by `sameFields`). Memoising by `[source, capacity]` stops those calls. For the timeline feed that is invisible, but (a) its comment "a record rebuilt every render configures nothing" must be rewritten, and (b) the gates feed's documented exception (`GatesFeed.ts` `configure`: "a failed watch is retried by any configure", pinned by G43) shows that "a configure with the same inputs does nothing" is not universal. Do not extend the memoisation to the dock's or gates' inputs, where the extra calls are the retry mechanism.
**Prevention:** Memoise only `useTimeline`; leave `useDockModel`/`useDiagnostics` records alone; keep G43 unedited (pinned by `79-pinned-check.mjs`).
**Phase:** 84.

### Pitfall 84-C: `LensSession.move`/`choose` "restating `ExternalStore.set`" is not fully a restatement

**What goes wrong:** `move` (`LensSession.ts:149-152`) is `if (next === snapshot) return; store.publish(next)`, which equals `store.set(next)`; replace it with `set`. `choose` (170-173) needs its own `next === current` compare because it returns a boolean ("consumed"), and it sets `armed` before publishing so a listener told of the pick can take its reveal. Collapsing it to `store.set(next)` then returning `true` unconditionally changes the consumed answer; moving the `armed` assignment after the publish breaks the one-shot reveal. `LensSession.ts` is under the mutation gate at 52/52 (v1.9 Phase 80 close; absolute bar: no open mutant), and the first close there found two survivors on `move`'s unread boolean.
**Prevention:** Keep `choose`'s early return and the arm-before-publish order; delete only `move`'s body. Re-measure `LensSession.ts` after the edit and again after review (see X-1). The `Lens.dock.characterisation.test.tsx` (held, 4 flips) and `LensSession.test.ts` stay unedited.
**Phase:** 84.

### Pitfall 84-D: Collapsing `useLens`'s two inputs breaks listener stability or adds a second subscription

**What goes wrong:** `useLens(lens, questions, instances)` reads `instances` three ways: the draw effect (`[highlighted, instances]`), and the pick handlers read `questions.getSnapshot().instances` at event time. That event-time read is deliberate: the handler effect is keyed `[picking, lens, questions]` so "a guard that registers while picking adds no listener" (the defect v1.9 removed). Passing only `instances` makes the handlers stale or forces them into the dependency list, which tears down and re-adds the capture-phase click listener on every change (a click can land in the gap). Passing only `questions` and subscribing inside `useLens` adds a second subscription the header says to avoid (one subscription; `QuestionsPanel.tsx:114-118` reads the same store).
**Prevention:** Make one path: the hook takes the store and returns what it read (`snapshot.instances` for the draw effect via a single `useStoreSnapshot`), handlers keep reading the store at event time. Never write a ref during render (purity); if a ref is used it is assigned in an effect. The spec row `spec/traceability.md` ("one subscription to the lens and one to the questions store", CCR-QD-472) quotes this arrangement: edit it in the same commit.
**Phase:** 84.

### Pitfall 84-E: `DockFrame`'s two ledger+notice blocks share a ref per instance, not one

**What goes wrong:** Extracting a hook for "stop-ledger ref + memoised notice" is right, but each use needs its own `useRef` (diagnostics vs timeline ledgers are independent), and the memo deps must include the model/readout (`[status, model]`): a notice memoised on `status` alone keeps a closed model's `restart` after a hidden `Activity` rebuild. A ref holds only which stops were announced, never what a status says (AGENTS.md section 13).
**Phase:** 84.

### Pitfall 84-F: `src/react` is outside the devtools mutation gate

`stryker.devtools.mjs` mutates `packages/devtools/src/model/**` only. Edits to `useConfigured.ts`, `useLens.ts`, `useTimeline.ts`, `DevtoolsDock.tsx` and `QuestionsPanel.tsx` are measured by tests, the held characterisations and the 90% coverage threshold alone. List them under `unmeasured` in the record, as Phase 80 did; do not claim a mutation score for them.
**Phase:** 84.

---

## Cross-cutting pitfalls

### X-1: The mutation gate (Stryker, per-file records, re-closed after review)

**What goes wrong:** (a) The base is recorded after editing, or from a dirty tree: the phase's `NN-mutation.mjs` `record` refuses a tree where a measured file differs from HEAD, and a base can never be restarted. (b) New literals or constants at module scope are "static" under `ignoreStatic: true` (`stryker.devtools.mjs`), so their mutants are `Ignored`; the compare rule fails on any new `Ignored` mutant as it does on a new `Survived`/`NoCoverage`. `DockModel.ts` closed at 69 killed / 0 open / 12 ignored (`80-mutation-close.json`), so a module-scope message string or step table adds an Ignored mutant and also leaves its content unmeasured: keep such values inside the function body. (c) Mutants are located by line number carried through `git diff -U0 <base> <close>`: reformatting or reflowing a measured file changes locations and can read as new open mutants; the repo hand-wraps at ~90 columns and `oxfmt` is not a gate, so do not run `pnpm format` over measured files. (d) The close is measured before review; review fixes add lines that were never measured. v1.8 Phase 76's re-close found 12 survivors on review-written lines; v1.9 re-closed every phase after review. (e) Equivalent-looking boundary mutants (`length === 1`, `=== 0`, array-order mutants) die only to exact assertions: assert the single-throw identity, the two-throw `errors` order and the exact message. (f) The runs need the repo root, a clean tree, stdin closed and nothing else running (the record scripts' own header); the report is `reports/mutation-devtools/mutation.json`; timeout 20000 ms.
**Prevention:** Per phase: base record at the phase base before any edit, close after the last plan, re-close with `record close <group> --restart` after each review-fix round, `compare` fails closed. Files by phase: 81 `DockModel.ts` (+ `ExternalStore.ts` if `throwCollected` moves); 83 `DiagnosticsFeed.ts`, `DiagnosticsStore.ts`, `DockModel.ts`; 84 `LensSession.ts`, `ExternalStore.ts` if touched; 82 none unless a headless module is added (82-H). Milestone close re-measures files that later phases edited again (v1.9 audit: Phase 78's compare "does not measure Phase 79/80's later edits").
**Warning signs:** `compare` passes only against a record made at the same commit it checks; the record lists a file but no `unmeasured` entry for edited-but-unreached files.
**Phase:** 81, 83, 84 (and the 85-less milestone close).

### X-2: House-style budgets that fail silently or only in the full gate

**What goes wrong:** Budgets are exact counts checked in both directions (`scripts/check-house-style.mjs`), so a count that moves without its table row fails, but a test file renamed or removed can leave a row naming nothing. Applicable here: `NOT_CALLABLE_PIN_BUDGET` + AGENTS.md table (83, 84), `MODULE_STATE_BUDGET` (82), `devtools-named-barrel` (83), `[no-numbering-placeholder]` (any phase writing `ADR-QD-NEXT` and friends in source, a test title or a scenario), `no-ambient-console`/`Date.now`/`as`/`!`/`any` bans (the throwaway tests used `console.log`; they are gone, do not recreate them as committed tests), `Effect.fnUntraced` and `switch` budgets (no new call sites; dispatch with `Match`), `Schema.TaggedError` budget (no new tagged errors; the collector throws raw values and an `AggregateError`). Spec-fence compile: a `typescript` fence in an ADR/BEH is compiled by `check-doc-examples.mjs`; a `ts` fence is not.
**Prevention:** After every plan that touches a test file or a type test, run the house-style script (not only vitest) and read its `[rule]` tags; `check:fast`/`check:pr` runs it.
**Phase:** all.

### X-3: Gates 12, 13, 14 and the claims table

**What goes wrong:** Gate 12 (`pnpm spec:claims`, `check-devtools-claims.mjs`): any sentence in `spec/devtools-spec/` that says something is absent ("not built", "no longer", and the PHRASES list) must be a row in that folder's `README.md` "Claims of absence" table, both directions. New prose such as "the feed no longer holds a store" is the failure. Quote it as a `>` blockquote under a correction (exempt) or add the row. Gate 13 (`pnpm spec:api`): `spec/overview.md` names every export; a changed public type (83) needs the row text updated, and a new export needs a row or a "Not listed above" entry with a reason. Gate 14 (`pnpm spec:package`): packs every public package into a sandbox consumer; the devtools consumer (`check-package-install.mjs` ~640-720) calls each `make*Feed` bare, builds the ten-field dock props literal and fails if a feed export is left unprobed. It runs inside `check:pr` and is slow, so it is easy to skip per plan and discover at the phase close. Any new public name needs a probe, an overview row and a `surface.tst.ts` line.
**Prevention:** Prefer package-private additions (the wave needs none public). Run gates 12/13 after each spec edit and gate 14 once per phase at the close, not at the end of the milestone.
**Phase:** 83 (public type), 81/84 (spec prose).

### X-4: Spec register edits through `scripts/spec-revise.mjs`

**What goes wrong:** (a) Hand-editing a Document Control table (the script writes `Revision` and the newest `Change History` entry together, and `--check`, run by `spec:verify`, fails when they differ). (b) Omitting `--date`: it defaults to the UTC date of the run, which can differ from the date the work belongs to. (c) A `|` in the entry text breaks the table cell; the script does not escape. (d) One call = one revision: editing the same document across five plans produces five bumps, and a CCR row that quotes "`spec/README.md` Rev N (this row)" goes stale if README is bumped again afterwards, so bump README last. (e) The script refuses a document already out of step; reconcile first. (f) ADR Document ID must equal its file number (gate 10); an ADR amendment keeps its earlier text and adds a dated section, and the provenance sentence that a decision was taken autonomously under the owner's standing instruction must survive review tidy-ups (v1.8 lesson, restored by the security audit). (g) Spec text that quotes a test by title or label (M56, "TF4") goes stale when review renames the test: rename both in one commit (v1.9 lesson 2). (h) A new BEH/INV needs its `spec/traceability.md` row, test citation and `spec/decisions/index.yaml` entry; `spec:verify:strict` reported 21/0 at v1.9's close and the CCR register gap list is tracked, so do not "close" gaps by renumbering.
**Prevention:** `node scripts/spec-revise.mjs <doc> "<entry without pipes>" --date 2026-11-24` (or the day of the edit), documents in the order ADR, BEH, invariants, traceability, overview, README. Run `node scripts/spec-revise.mjs --check` and `pnpm spec:verify:strict` per plan.
**Phase:** all (81-84 records plans).

### X-5: Never run `node scripts/next-id.mjs` during execution

**What goes wrong:** Each call writes a reservation to `$(git rev-parse --git-common-dir)/qadi-reserved-ids.json` before printing, shared by every worktree, and is not idempotent: a "just checking" call burns a number. That file currently holds CCR 472, ADR 193, BEH 740, INV 406 (v1.9's block, [run]); no wave-15 block is reserved yet and `.planning/phases/_WAVE15-CONTEXT.md` does not exist. If nothing is reserved up front, executors will either call the script mid-phase (burning numbers, possibly unused, and the register tolerates gaps but they are tracked) or invent numbers that collide with disk.
**Prevention:** Before Phase 81 starts, the orchestrator reserves the whole block once, records it in `_WAVE15-CONTEXT.md` as v1.9 did, and states "never run next-id during execution; name an unused reservation in that phase's CCR row". Proposed block, one ADR/CCR and five BEH/two INV per phase as in wave 14: 81 = ARCH-128, ADR-QD-194, CCR-QD-473, BEH-QD-741-745, INV-QD-407-408; 82 = ARCH-129, ADR-195, CCR-474, BEH 746-750, INV 409-410; 83 = ARCH-130, ADR-196, CCR-475, BEH 751-755, INV 411-412; 84 = ARCH-131, ADR-197, CCR-476, BEH 756-760, INV 413-414 (next free on disk: ADR 194, CCR 473, BEH 741, INV 407; highest ARCH in use 127). A phase that needs no new ADR (an amendment suffices: 81 amends 191/177, 83 amends 173, 84 amends 192/137) leaves its ADR unused and says so. Because numbers are known from the start, nothing needs a placeholder, which also keeps `[no-numbering-placeholder]` quiet.
**Warning signs:** `next-id` in any plan's `<action>`/verify text; a spec edit with a number not in the context table.
**Phase:** before 81 (orchestrator), enforced in every phase's plans.

### X-6: Earlier phases' record scripts are archived and some no longer run from their recorded path

**What goes wrong:** The v1.8 and v1.9 lesson is to re-run every earlier phase's record scripts at each phase close, because a later phase can break a guard without failing `check:pr`. But v1.9's phases were archived to `.planning/milestones/v1.9-phases/`, and the pinned-check scripts hard-code `.planning/phases/QD-79-.../` and `.../QD-80-.../` as `DIR`. Run today [run]: `79-characterisation-check.mjs` and `80-characterisation-check.mjs` pass (they read git history, not the directory); `79-pinned-check.mjs` and `80-pinned-check.mjs` crash with `ENOENT ... .planning/phases/QD-79-.../79-01-SUMMARY.md`; `80-check.mjs` needs a subcommand. Wave 15 touches exactly what they guard: M55/M56 (`DockModel.test.ts`), G43, `ConfigureFirstRender.characterisation.test.tsx`, `Lens.dock.characterisation.test.tsx`.
**Prevention:** In Phase 81's first plan, decide how these are run (a scratch copy with `DIR` pointed at the archive, executed from the repo root; do not edit the archived scripts in place) and write the invocations into `_WAVE15-CONTEXT.md`. Run them at the close of every phase. Wave 15's own new record scripts must take their directory from `import.meta.url`, not a literal, and say "from the repository root" in their header (v1.9: scripts that resolve paths from the repo root failed when run from the phase directory and read as failures in two hand-backs).
**Phase:** 81 (setup), then 82, 83, 84 closes.

### X-7: Recurring process failure modes from the last two waves that apply here

- Executor marks requirements complete early (`requirements.mark-complete`): v1.9 marked LENS-01/04 before the plans landed. Forbid it in the brief; `requirements-completed` in each SUMMARY is what the audit cross-checks.
- `String.replace(str, text)` with arbitrary replacement text interprets `` $` ``, `$&`, `$'`: use a function replacement (v1.9 duplicated a plan head).
- Review rounds widen scope (v1.8 Phase 76 grew over three iterations, each needing its own mutation re-close): hold the scope to the four candidates; log the rest.
- A reachability claim in an ADR must be checked against React's real commit order before it is written (v1.9 iteration-3 correction). Phase 82's ADR will claim what React runs on hide/show: write it from a RED/GREEN observation under Activity, not from reasoning.
- A fix report must keep the shape the disposition ledger parses (frontmatter, `## Fixed Issues`, `###` headings) from iteration 1.
- The executor's interactive shell is zsh with `grep` aliased to `ugrep`: run verifies under `bash -c` or use `/usr/bin/grep`, quote globs, `grep -F` for `$`/`{`/`}` (`_SHARED-CONTEXT.md`; confirmed during this research, where plain `grep` printed ugrep warnings).
- Untracked leftovers: throwaway repro files (`zzThrowaway81*.test.ts`) were in the tree at the start of this research and are gone now. Any such file must be deleted, never committed, and never present when a mutation record is made.
- A RED test is seen RED on the phase base (Phase 82's base is Phase 81's close commit, since the wave is stacked, `arch-wave-15` off `arch-wave-14` at `902d2128`); save the failing output in `NN-RED-EVIDENCE.md`, and check it fails for the reason named.
- No merge, no release, no push; Breaking changes need a Breaking changeset plus upgrade-guide entry (owner standing instruction, 2026-11-22). Phases 81 and 82 are defects (patch changesets); 83 is possibly Breaking; 84 is patch.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Local copy of `throwCollected` in `DockModel.ts` | No export change | Second copy of an ADR-pinned contract; message drift | Never; export it from `ExternalStore.ts` |
| A did-spread flag to remove the double `spread` | Looks like a fix for the review's second finding | Skips heals after a partial spread; breaks under nested configure | Never; count publishes first, the second spread is idempotent |
| Wrapping the capacity refusal in the collector | Simpler single `try` | Violates ADR-QD-191 decision 11, M55 | Never |
| Guarding only `QadiProvider`'s subject effect | One-line RED-to-GREEN | Child consumers still throw on reveal | Never |
| Effect-built registry (`useScoped` shape) | Tidy lifecycle | Breaks SSR, first-frame subject, Activity state preservation | Never for `QadiProvider` |
| Skipping `dispose()` while hidden | Fixes the throw | Leaks the runtime layer scope on a true unmount | Only with a replacement owner that disposes at real unmount |
| Renaming `DiagnosticsStore.ts` | Matches "the store goes" | 3 coordinated gate edits plus ~30 references | Not in this wave |
| Memoising every hook's input record | Fewer calls | Removes the gates feed's retry-on-any-configure | Only `useTimeline` |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `@effect/atom-react` | Assuming only the provider touches the registry | Every hook subscribes/mounts through `RegistryContext`; a disposed registry throws for all of them |
| `AtomRegistry` | Detecting disposal by error text; no public `disposed` flag | Track your own flag at the call to `dispose()` |
| `effect` `ExternalStore` listener contract | Treating a listener's throw as the caller's failure | The value is held first; only the rethrow shape is the contract (ADR-QD-177) |
| Stryker devtools config | Expecting `src/react` to be measured | Only `src/model/**`; state `unmeasured` |
| Archived phase scripts | Running them from the repo root unchanged | Path-fix in a scratch copy (X-6) |

## "Looks Done But Isn't" Checklist

- [ ] **81:** matrix rows for all ten stores PLUS a throw during a plain `timeline.accept`; diagnostics/services/questions rows have an explicit expected status (stuck `Starting` or healed).
- [ ] **81:** one-throw returns the thrown value itself (`===`), two throws return `AggregateError` with `errors` in step order and the exact message; a nested `AggregateError` is not flattened.
- [ ] **81:** M55 and M56 pass unedited; a nested `configure` from a listener ends equal to a plain `configure`.
- [ ] **81:** identical `configure` after a throwing one leaves every snapshot equal (no heal flag exists).
- [ ] **82:** RED test holds the provider element stable, hides longer than a macrotask, has a real consumer below, and fails on `registry is disposed` on the phase base.
- [ ] **82:** a disposal counter proves exactly one `dispose()` per registry across unmount, StrictMode, long hide, and two providers on one atom set; the weak "disposes its registry when unmounted" test now asserts disposal.
- [ ] **82:** forks == sweeps == 1 per pressure episode still holds (P1-P5 untouched), plus the long-hide expectations from ADR-QD-148, not P4.
- [ ] **83:** a superseded run's late sample cannot change the reading; restart keeps the last reading; off resets; `Live` marked on an unchanged sample.
- [ ] **83:** publish count over N identical samples is 0 after the first; `traceability.md:579-580`, AGENTS.md:566 and `check-house-style.mjs:771` agree with the files on disk.
- [ ] **84:** `ConfigureFirstRender` and `Lens.dock` characterisations unedited and passing; handlers still read the questions store at event time; `choose` still returns the consumed boolean.
- [ ] **All:** record scripts of the earlier phases run at each close (X-6); `pnpm check:pr` exit 0 at each phase end; mutation base and re-close per measured file; no new `Ignored` mutants.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| New `Ignored`/survivor after review fix | LOW | `record close <group> --restart` at the fix commit; add exact-assertion rows; move literals into function scope |
| Burned id from a stray `next-id` call | LOW | Name it unused in the CCR row; do not renumber |
| Gate edit forgotten (AGENTS.md vs budget vs traceability) | LOW | Run house-style and `spec:verify:strict`; fix all three in one commit |
| Phase 82 fix leaves child consumers throwing | MEDIUM | Re-open with the consumer RED row; choose rebuild-before-reveal or never-dispose-while-hidden |
| Held characterisation edited to "follow" a change | HIGH | Revert the file to its first commit, declare the flip in a record script, re-verify the phase |
| Earlier phase made stale | MEDIUM | Re-verify at the close (v1.8: six of eight went stale); update the dated section and `covered_digest` |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 81-A collector reaches `spread` | 81 | RED rows for explorer/simulation/dock/roles throwers, GREEN after |
| 81-B diagnostics `Starting` window | 81 decides, 83 may close | Matrix row status; ADR-QD-177 decision 5 amended or restated |
| 81-C error identity | 81 | `===` single throw; two-thrower `errors` order; exact message |
| 81-D refusal stays outside | 81 | M55 unedited |
| 81-E reentrancy | 81 | Nested-configure row equals plain configure |
| 81-F/G/H healing, double spread, order | 81 | Idempotence row; publish counts; order pin |
| 82-A..H registry lifetime | 82 | Activity matrix with real consumer; dispose counter; sweep counter; mutation `unmeasured`/new file listed |
| 83-A..E feed value fold | 83 | Late-sample, restart, off rows; publish count; three-place edit; held 79 characterisation |
| 84-A..F hook and lens finds | 84 | Type pins; held characterisations; `LensSession` re-closed |
| X-1 mutation | 81, 83, 84 each | `compare` after review, per phase |
| X-2/X-3 budgets and gates 12/13/14 | all | house-style, claims, api-surface, package install at close |
| X-4 spec register | all | `spec-revise --check`, `spec:verify:strict` |
| X-5 ids | before 81 | `_WAVE15-CONTEXT.md` table matches the reservation file |
| X-6 record scripts | 81 setup, every close | Invocations recorded and exit 0 |

## Sources

- `packages/devtools/src/model/DockModel.ts` (`configure`, `spread`, timeline listener, join key), `ExternalStore.ts` (`throwCollected`, listener contract, `sameFields`), `DiagnosticsFeed.ts`, `DiagnosticsStore.ts`, `TimelineFeed.ts`, `GatesFeed.ts`, `LensSession.ts`, `src/react/useConfigured.ts`, `useScoped.ts`, `useLens.ts`, `useTimeline.ts`, `DevtoolsDock.tsx`, `QuestionsPanel.tsx`; `packages/react/src/QadiProvider.tsx`, `SweepScheduler.ts`, `QadiAtoms.ts`; `packages/react/test/QadiProvider.sweep.test.tsx`, `edges.test.tsx`, `support/settle.ts`. (HIGH)
- `effect@4.1.2` `AtomRegistry.js` (disposed checks, no public flag) and `@effect/atom-react` `Hooks.js` (`useSyncExternalStore` and `registry.subscribe`/`mount`). (HIGH for what they do; MEDIUM that the reveal order throws in a child first, not yet run)
- Spec: ADR-QD-148, 177, 191 (decision 11), 192, 173; `spec/behaviors/09-react.md`; `spec/traceability.md:579-580`; `AGENTS.md` sections 4-6, 13, 15-17; `scripts/check-house-style.mjs:771`; `scripts/check-devtools-claims.mjs`; `scripts/check-package-install.mjs` ~640-720; `scripts/spec-revise.mjs`; `scripts/next-id.mjs`. (HIGH)
- Prior waves: `.planning/RETROSPECTIVE.md` (v1.8, v1.9 sections), `.planning/milestones/v1.9-MILESTONE-AUDIT.md`, `.planning/milestones/v1.9-phases/QD-79-*/79-characterisation-check.mjs`, `79-pinned-check.mjs`, `QD-80-*/80-mutation.mjs`, `80-mutation-close.json`, `.planning/phases/_WAVE14-CONTEXT.md`, `_SHARED-CONTEXT.md`. (HIGH)
- Run today on this tree: ten-store throw matrix (files since deleted); v1.9 record scripts executed from the repo root; `qadi-reserved-ids.json` read. (HIGH)

---
*Pitfalls research for: Qadi v1.10 Arch Wave 15 (Phases 81-84)*
*Researched: 2026-11-24*

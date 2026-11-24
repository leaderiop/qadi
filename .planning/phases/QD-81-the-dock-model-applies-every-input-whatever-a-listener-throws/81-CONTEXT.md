# Phase 81: The dock model applies every input whatever a listener throws - Context

**Gathered:** 2026-11-24 (smart discuss, autonomous mode; every decision below was decided autonomously on 2026-11-24 under the owner's standing instruction of 2026-11-22: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest")
**Status:** Ready for planning

<domain>
## Phase Boundary

Today one throwing listener can leave the dock model half-applied, and nothing repairs it.

1. **`configure` guards one step.** `packages/devtools/src/model/DockModel.ts:403-431`: only `timelineFeed.configure` is in the `try`; the `finally` runs `spread()` (`:342-347`: `explorer.setSightings`, `simulation.setSightings`, `dock.setTimeline`), `roles.setList`, `simulation.setPorts`, `gatesFeed.configure`, `diagnosticsFeed.configure` and `shownReading.refresh` in a plain sequence. Each publishes, so a host listener that throws on any of them skips every later step, and a second throw replaces the first.
2. **It does not heal.** The catalogue step is gated on `wanted.catalogue !== before.catalogue` (`:416`), and `held = wanted` is assigned first (`:409`), so an identical second `configure` skips the step the first one never reached. Reproduced on 2026-11-24 (throwaway test, deleted): an explorer listener that throws leaves roles `[]`, explorer and simulation on different sightings, the dock on a stale row and diagnostics `Off`, after both calls.
3. **The record path is the same defect without `configure`.** The dock's own timeline listener (`:351-356`) calls the same unguarded `spread()`. Reproduced: an always-throwing explorer listener left the timeline at 2 entries, the dock at 0 rows and the simulation at 0 sightings.
4. **The rail is spread twice** when one `configure` changes capacity and catalogue (the timeline listener, then the `finally`); `catalogueOf` builds fresh sightings each call (`Catalogue.ts:155-189`), so the explorer and simulation publish twice (measured: explorer heard 2), which CR22 (`ConfigureRule.test.ts:895`) and BEH-QD-735's counts encode.
5. **The begin-to-fork window.** ADR-QD-177 decision 5 left it out of scope: a feed publishes a status and only then forks its work, so a listener that throws on that status leaves the work unstarted. It exists at three sites in `src/model/**`: `TimelineFeed.readSource` (`status.set(READING)` before `reads.fork`, `TimelineFeed.ts:173-185`), `DiagnosticsFeed.start` (`show(Starting)` before `runs.fork`, `DiagnosticsFeed.ts:183-203`) and the simulation's run (`commit()` of `Running` before `runs.fork`, `SimulationSession.ts:444-450`). `GatesFeed.configure` publishes after its fork (`GatesFeed.ts:282-297`) and has no window. Reproduced for diagnostics: a throwing diagnostics, services or questions listener leaves the poll stuck `Starting`; TF29 (`TimelineFeed.test.ts:621`) pins the timeline's version on purpose.
6. **The rule exists twice already.** `ExternalStore.ts`'s `notify` (`:73-83`) and the derived store's release loop (`:204-217`) each run every call, collect what was thrown and rethrow through the module-private `throwCollected` (`:63-67`). A fix in `DockModel.ts` would be the third copy.

After this phase:
- One package-private `callAll(calls, message)` in `ExternalStore.ts` states ADR-QD-177's rule once ("run every call, then rethrow what they threw: one value as itself, several as one `AggregateError`"); `notify`, the derived release and every multi-step command in the model use it.
- `configure` is an ordered list of idempotent steps run by `callAll`, each reading the held inputs when it runs.
- The sightings rail is the model's fourth derived store, so the record path is total by the listener contract and the rail moves once per change.
- Every begin-to-fork window is closed: the work starts whatever a listener throws on the status that announces it, and the throw is rethrown after.
- A throwing listener on any of the ten stores leaves every other input applied, and the throw reaches the caller once.

ARCH-128. Package: `@qadi/devtools` (patch changeset: a defect fix, no export moves). ADR-QD-194 is new; it amends ADR-QD-177 (decision 5), ADR-QD-185, ADR-QD-191 (decision 11) and ADR-QD-192 (decision 3).

Evidence: the code at `558c89bf` (source identical to `902d2128`), `.planning/research/` (SUMMARY, ARCHITECTURE §81, PITFALLS 81-A..H, FEATURES §81) and `.planning/phases/_WAVE15-CONTEXT.md`.
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE15-CONTEXT.md`, ROADMAP, REQUIREMENTS)
- **D-01:** Branch `arch-wave-15` only. Phases run strictly one at a time, on the main tree (`use_worktrees` is false). No merge, push, tag, release, publish or `changeset version`.
- **D-02:** Only the reserved records are used: ADR-QD-194; CCR-QD-473; BEH-QD-741..745; INV-QD-407..408. `node scripts/next-id.mjs` is never run. A reserved number left unused is named "Unused" in the CCR row. Spec edits go through `node scripts/spec-revise.mjs --date 2026-11-24` (or the real date of the edit).
- **D-03:** Tests first. Every behaviour change is preceded by a regression test written on the phase base and seen RED there for the stated reason (output saved in `81-RED-EVIDENCE.md`), or by a characterisation test that is green there and stays green. Every new check is shown failing once. A mutation survivor is closed with a test, never by re-baselining. No D-number, plan-local id or phase number enters shipped source, a test title or a BDD scenario.

### Area 1 — One collect-and-rethrow rule (COLL-03)
- **D-04 — `callAll(calls: Iterable<() => void>, message: string): void` in `ExternalStore.ts`.**
  - Exported from the module only, never from either barrel, as `sameFields` is (ADR-QD-099). `throwCollected` stays module-private and is reached only through `callAll`.
  - It calls each thunk in iteration order inside its own `try`, keeps every thrown value, and then decides by how many threw, never by what was thrown (ADR-QD-177 decisions 2-3): none returns; one rethrows that value itself (`undefined` and `null` included); more than one throws one `AggregateError` whose `errors` are the values in call order, never flattened.
  - `notify` becomes `callAll(listeners, "More than one of the store's listeners threw.")`, passing the live `Set` itself, so a listener removed before its turn is not called and one added during the pass is called in it (BEH-QD-656). Never a copied array.
  - The derived store's release loop becomes `callAll(releases, "More than one of the store's parent releases threw.")`.
  - Both existing messages stay byte-identical (pinned by the BEH-QD-656 and BEH-QD-698 tests).
  - **Rejected:** exporting `throwCollected` and keeping the loops (the loop is the rule; three loops is the drift); a local copy in `DockModel.ts`.
- **D-05 — the dock's message is exactly "More than one step of the dock's configure threw."**, asserted exactly by a test and quoted in BEH and ADR-QD-194.

### Area 2 — `configure` as steps, and the rail as a derived store (COLL-01, COLL-02, COLL-04)
- **D-06 — the sightings rail becomes the model's fourth derived store.**
  - Parent: `timeline`; key `{ shown: timeline.getSnapshot(), catalogue: held.catalogue }`; compute `catalogueOf(key.shown, key.catalogue)`. Built immediately after the timeline feed and before every other subscription, so it moves first (BEH-QD-697).
  - `explorer.setSightings` and `simulation.setSightings` are two listeners on the rail, in that order; `dock.setTimeline` is a listener on the timeline subscribed after the rail. The listener contract therefore covers the record path: a throwing explorer listener no longer stops the simulation or the dock, and its throw reaches whatever published (`timeline.accept`, a resize).
  - The `shown`/`rail` closure variables, the `spread` function and the `if (next === shown) return` guard are deleted; a pause toggle republishes the same timeline, so the rail's key does not move (BEH-QD-696) and `dock.setTimeline` keeps its own identity guard.
  - The rail is internal: not a `DockModel` member, so BEH-QD-700's list of ten stores is unchanged. `sightings` stays a thunk, reading the rail's snapshot.
  - The double spread disappears by construction: a capacity-and-catalogue `configure` recomputes the rail once, in the timeline step; the later `rail.refresh()` step finds its key unchanged.
  - **Rejected:** keeping `spread` and wrapping its three calls in `callAll` (it keeps the closure state and the double spread, and is the third shape of the same rule); a did-spread flag (PITFALLS 81-G: a partial throw marks it done and a nested `configure` corrupts it).
- **D-07 — `configure` runs its steps through `callAll` in today's order, which is behaviour and is pinned.**
  - `completeDockInputs(next)` runs first and outside the collector, so a refused capacity throws before anything moves (M55, ADR-QD-191 decision 11 "by position, never by reading the error"). Then `held = wanted`, before the timeline publishes, because the rail's key reads `held.catalogue`.
  - Steps, in order: timeline feed `configure`; `rail.refresh()`; `roles.setList(held.catalogue?.roles ?? NO_ROLES)`; `simulation.setPorts(held.ports)`; gates feed `configure`; diagnostics feed `configure`; `shownReading.refresh()` (gates before the shown reading, so one `configure` publishes one join and reads no registry the host handed away, ADR-QD-185).
  - Every step is idempotent through the guard its target already has (`TimelineFeed`/`DiagnosticsFeed` per-field rule, `HeldChoice.setList`'s `sameElements`, `SimulationSession.setPorts`'s identity, the derived stores' key), so every step runs on every `configure` and the `before`/`wanted.catalogue !== before.catalogue` gate goes. An identical `configure` after a throwing one leaves every snapshot equal (pinned).
  - A two-throwers row asserts `AggregateError.errors` in step order and the D-05 message; a one-thrower row asserts the value itself; M55 and M56 pass unedited.
- **D-08 — each step reads `held` when it runs (reentrancy, COLL-05).**
  - A listener that calls `configure(second)` inside a step runs a whole nested `configure`; the outer call's remaining steps then read the nested inputs, so the end state equals a plain `configure(second)` on a fresh model. Pinned by comparing every store snapshot.
  - The step list is built from `held` and `feedInputsOf(held)` per step, never from entry-time locals. The same rule holds inside `TimelineFeed.configure` (its read step reads the held source), checked by a nested row there.
  - A listener that changes the inputs on every notification does not terminate, as with any store; BEH states it.

### Area 3 — The begin-to-fork window, closed at every site (COLL-05)
- **D-09 — the work a status announces starts whatever a listener throws on that status, and the throw is rethrown after it started.**
  - `DiagnosticsFeed.start`: `callAll([() => show(Starting), () => runs.fork(...)], ...)`, keeping the publish before the fork (the fork's synchronous prefix may already reach `Live` or `Stopped`, `DiagnosticsFeed.ts:186`).
  - `TimelineFeed.readSource`: the same for `status.set(READING)` and `reads.fork(...)`. `TimelineFeed.configure`'s `try { resize } finally { readSource }` becomes `callAll([resize, read], ...)`, so a timeline listener's throw and a status listener's throw are both kept, in that order.
  - `SimulationSession`'s run: the same for `commit()` of `Running` and `runs.fork(...)`; `fork` still refuses a token a subscriber superseded (the comment at `:448-449` holds).
  - `GatesFeed` publishes after its fork already; a test pins that its window is closed too.
  - **Recorded flip:** TF29 changes from "the status listener's throw replaces the timeline listener's and no read is started" to "both throws are rethrown as one `AggregateError` in that order and the read is started". Before/after goes in `81-RED-EVIDENCE.md` and an ADR-QD-194 row; the test is retitled for what it now holds.
  - ADR-QD-177 decision 5 is amended (dated): the window is closed. The feeds' doc comments that say a throw there "escapes before the new read or poll is forked" are restated. This retires the v1.7 carried item "guard the publish-between-`begin()`-and-`fork()` window".
  - **Rejected:** recording the window as staying (the phase's own claim, "every input applied whatever a listener throws", would be false for the diagnostics, services, questions and timeline-status listeners); closing it only for diagnostics (one rule, stated as closed, with two sites still open).

### Area 4 — Records, counts and measurement (COLL-04, COLL-06)
- **D-10 — the notification counts are measured, then restated.** The RED test counts each store's publishes on a capacity-and-catalogue `configure` before any change; CR22 (`ConfigureRule.test.ts:895`) and BEH-QD-735's "2, 2, 3, 3, 0, 1, 0, 2, 1 and 0" are restated with the code, from the measurement after it.
- **D-11 — records.**
  - ADR-QD-194 (new): "A run of calls applies every call whatever one throws": `callAll`, the dock's step list, the rail as a derived store, the closed window, the TF29 flip, the rejected alternatives. Amends ADR-QD-177 (rule stated once as `callAll`; decision 5 closed), ADR-QD-185 (four derived stores), ADR-QD-191 decision 11 and ADR-QD-192 decision 3 (the `try`/`finally` sentences).
  - BEH-QD-741..745 new in `spec/behaviors/28-devtools-screens.md` (the step list applies every input; the throws surface once, in step order, with the message; the record path; the closed window; reentrancy). Amend BEH-QD-656, BEH-QD-699 ("three" becomes "four" computed stores), BEH-QD-728's pinned-by line, BEH-QD-735's counts, and the feed BEHs whose text describes the window.
  - INV-QD-407 (a `configure` leaves no input unapplied whatever a listener throws), INV-QD-408 (work a status announces is started whatever a listener throws on it). Amend INV-QD-373 (names `callAll`) and INV-QD-390 (four derived stores).
  - CCR-QD-473; `spec/traceability.md` and `spec/overview.md` revision rows as the gates need. The `DockModel.ts` file header (`:13-20`, `:29-34`) is restated.
  - `@qadi/devtools` **patch** changeset. No export changes, so gates 13 and 14 are unmoved; no upgrade-guide entry.
- **D-12 — mutation.** Baselines for `ExternalStore.ts`, `DockModel.ts` (69 killed, 0 survived, 12 ignored at the v1.9 close; ADR-QD-168's score of 1), `TimelineFeed.ts`, `DiagnosticsFeed.ts` and `SimulationSession.ts` are taken on the phase base with the recorded invocation (`81-mutation-base.json`) before any source edit, and re-closed after the review. New literals stay inside function bodies (a module-scope literal adds an `Ignored` mutant, which fails the compare).
- **D-13 — the archived v1.9 record scripts.** `79-pinned-check.mjs` and `80-pinned-check.mjs` hard-code `.planning/phases/QD-79…`/`QD-80…`; run them from a scratch copy with the directory pointed at `.planning/milestones/v1.9-phases/`, never editing the archive, and record the invocation and result in the phase's evidence. TF29, M56 and CR22 are among the tests this phase changes on purpose; a held check that names them is re-recorded in this phase's evidence, not in the archive.

### Claude's Discretion
- The exact `callAll` parameter name, the internal names of the rail store and the step thunks, and how the step list is laid out in `configure` (an array literal or a named local), within D-04..D-08.
- Whether `TimelineFeed`'s and `DiagnosticsFeed`'s collected throws use their own messages or `callAll`'s caller-supplied one: each message is asserted exactly by a test.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExternalStore.ts`: `makeExternalStore` (`set`/`publish`/`notify`), `throwCollected`, `sameElements`, `sameFields`, `sameFieldsOrAbsent`, `makeDerivedStore` (key/compute/parents, `refresh`, BEH-QD-696..698).
- `DockModel.ts`: `completeDockInputs` (the capacity check), `feedInputsOf` (the one mapping), the three existing derived stores (`shownReading`, `questions`, `services`) as the pattern for the rail.
- Tests: `DockModel.test.ts` M55/M56 (`:454-504`) as the RED pattern, `thrownBy` in `test/helpers.ts`, `dockModelOf` in `test/builtFeeds.ts`, `ConfigureRule.test.ts` (CR22 at `:895`), `TimelineFeed.test.ts` TF29 (`:621`).

### Established Patterns
- ADR-QD-177's listener contract and its pinned messages; ADR-QD-185's derived stores built before host listeners so they move first; ADR-QD-191 decision 11 (refusal by position); ADR-QD-192 (one per-field rule, inputs only through `configure`).
- Records go through `scripts/spec-revise.mjs`; budgets change only with their AGENTS.md tables (none should move here: no `switch`, `Effect.fnUntraced`, `any`, module-scope `let`).

### Integration Points
- `useDockModel`/`useConfigured` call `configure` on every commit with a fresh record (ADR-QD-192 d8): every step must stay a no-op on unchanged inputs.
- `DevtoolsDock.tsx` reads `sightings()` and the ten stores; no prop or export changes.
- The source read calls `timeline.accept` inside its forked run; a throw from the record path now reaches that run after every follower moved, as any timeline listener's throw does today.
</code_context>

<specifics>
## Specific Ideas

- The RED matrix covers every store a host can subscribe to on a built model (the ten of BEH-QD-700: timeline, dock, lens, explorer, roles, simulation, diagnostics, timelineStatus, questions, services): for each, one throwing listener, one `configure({ capacity, catalogue, diagnostics: {}, questions, reading })`, then the assertions that every other input applied and the throw is the value itself; then the identical `configure` again leaves every snapshot equal. A store added later is a failing row.
- Plus: two throwers (one `AggregateError`, step order, exact message); the record path (always-throwing explorer listener, two `timeline.accept`s: dock rows and simulation sightings follow the timeline); the single-spread count; the nested `configure`; the diagnostics/timeline/simulation windows (the work starts).
</specifics>

<deferred>
## Deferred Ideas

- `@qadi/react`'s gate registry swallowing listener errors (carried from v1.7): another package's contract; stays a Future Requirement.
- Structural (deep) identity for feed inputs: carried from v1.9.
</deferred>
